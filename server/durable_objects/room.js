import { SyncManager } from './sync.js';
import { SpectatorManager } from './spectator.js';

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;

    this.players = {}; // playerId => { ws, name, rematch? }
    this.sockets = new Map(); // ws => playerId
    this.sync = new SyncManager();
    this.spectators = new SpectatorManager();

    this.matchId = crypto.randomUUID();
    this.active = false;

    this.pingInterval = null;
    this.persistInterval = null;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/init') {
      if (Object.keys(this.players).length > 0) {
        return new Response('Already initialized', { status: 400 });
      }

      const { playerA, playerB } = await request.json();
      this.players = {
        [playerA.id]: { name: playerA.name, ws: null },
        [playerB.id]: { name: playerB.name, ws: null },
      };

      // Insert players into DB (ignore if already exists)
      await this.env.DB.batch([
        this.env.DB.prepare(`INSERT OR IGNORE INTO players (id, name) VALUES (?, ?)`).bind(playerA.id, playerA.name),
        this.env.DB.prepare(`INSERT OR IGNORE INTO players (id, name) VALUES (?, ?)`).bind(playerB.id, playerB.name),
      ]);

      // Persist roomId mapping to player for spectator access
      await Promise.all([
        this.env.KV.put(`player:${playerA.id}:room`, this.state.id.toString()),
        this.env.KV.put(`player:${playerB.id}:room`, this.state.id.toString()),
      ]);

      return new Response('Room initialized');
    }

    if (url.pathname === '/debug-state') {
      return new Response(JSON.stringify({
        matchId: this.matchId,
        active: this.active,
        players: Object.fromEntries(
          Object.entries(this.players).map(([id, p]) => [id, { name: p.name, connected: !!p.ws }])
        ),
        spectatorCount: this.spectators.spectators.size,
        syncState: this.sync.getFullState(),
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const urlParams = url.searchParams;
      const role = urlParams.get('role');
      const playerId = urlParams.get('id');

      const [client, server] = Object.values(new WebSocketPair());
      await this.state.acceptWebSocket(server);
      server.accept();

      server.addEventListener('message', (e) => this.webSocketMessage(server, e.data));
      server.addEventListener('close', () => this.webSocketClose(server));
      server.addEventListener('error', () => this.webSocketClose(server));

      if (role === 'spectator') {
        const sid = crypto.randomUUID();
        this.spectators.addSpectator(sid, server);
        const snapshot = this.sync.getFullState();
        server.send(JSON.stringify({ type: 'sync', full: true, state: snapshot }));
      } else if (this.players[playerId]) {
        this.players[playerId].ws = server;
        this.sockets.set(server, playerId);
        this.checkStartGame();
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  checkStartGame() {
    const playerSockets = Object.values(this.players).map(p => p.ws);
    if (!this.active && playerSockets.every(ws => ws)) {
      this.active = true;

      const startMsg = JSON.stringify({
        type: 'start',
        players: Object.entries(this.players).map(([id, p]) => ({ id, name: p.name })),
      });

      for (const { ws } of Object.values(this.players)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(startMsg);
        }
      }

      this.startPing();
      this.startPersistLoop();
    }
  }

  async webSocketMessage(ws, msg) {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    const senderId = this.sockets.get(ws);

    switch (data.type) {
      case 'move': {
        if (!this.active || !this.players[senderId]) return;

        const timestamp = Date.now();
        const moveRecord = {
          match_id: this.matchId,
          player_id: senderId,
          move_data: JSON.stringify({ ...data.move, timestamp }),
        };

        await this.env.DB.prepare(`
          INSERT INTO moves (match_id, player_id, move_data) 
          VALUES (?, ?, ?)
        `).bind(moveRecord.match_id, moveRecord.player_id, moveRecord.move_data).run();

        const enriched = { ...data, move: { ...data.move, timestamp } };
        const messageStr = JSON.stringify(enriched);

        for (const { ws: otherWs } of Object.values(this.players)) {
          if (otherWs !== ws && otherWs.readyState === WebSocket.OPEN) {
            otherWs.send(messageStr);
          }
        }

        this.sync.updateState({ lastMove: enriched.move });
        this.spectators.broadcast(enriched);

        if (this.sync.shouldSync()) {
          const delta = this.sync.getDelta();
          this.spectators.broadcast({ type: 'sync', delta });
          this.sync.synced();
        }

        break;
      }

      case 'rematch_request': {
        this.players[senderId].rematch = true;
        this.checkRematch();
        break;
      }

      case 'rematch_decline': {
        await this.endGame();
        break;
      }

      case 'game_over': {
        const { winnerId } = data;
        this.active = false;

        await this.env.DB.prepare(`
          INSERT INTO matches (id, player1_id, player2_id, winner_id)
          VALUES (?, ?, ?, ?)
        `).bind(this.matchId, ...Object.keys(this.players), winnerId).run();

        const gameOverMsg = JSON.stringify({ type: 'game_over', winnerId });

        for (const { ws } of Object.values(this.players)) {
          if (ws.readyState === WebSocket.OPEN) ws.send(gameOverMsg);
        }

        this.spectators.broadcast({ type: 'game_over', winnerId });
        break;
      }

      case 'pong': {
        ws.isAlive = true;
        break;
      }

      default: {
        console.warn(`Unknown message type: ${data.type}`);
        break;
      }
    }
  }

  checkRematch() {
    const ready = Object.values(this.players).every(p => p.rematch);
    if (ready) {
      this.matchId = crypto.randomUUID();
      this.sync = new SyncManager();

      for (const p of Object.values(this.players)) {
        p.rematch = false;
      }

      for (const { ws } of Object.values(this.players)) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'rematch_start' }));
        }
      }

      this.active = true;
    }
  }

  async endGame() {
    this.active = false;

    await this.env.DB.prepare(`
      UPDATE matches SET ended_at = CURRENT_TIMESTAMP 
      WHERE id = ?;
    `).bind(this.matchId).run();

    const endMsg = JSON.stringify({ type: 'end_game' });

    for (const { ws } of Object.values(this.players)) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(endMsg);
        ws.close();
      }
    }

    this.spectators.broadcast({ type: 'end_game' });

    // 🔁 Final state save before cleanup
    await this.state.storage.put('room', {
      players: this.players,
      matchId: this.matchId,
      syncState: this.sync.serialize(),
    });

    this.cleanup();
  }

  webSocketClose(ws) {
    const playerId = this.sockets.get(ws);
    if (playerId) {
      delete this.players[playerId];
      this.sockets.delete(ws);

      if (this.active) {
        for (const { ws: otherWs } of Object.values(this.players)) {
          if (otherWs && otherWs.readyState === WebSocket.OPEN) {
            otherWs.send(JSON.stringify({ type: 'opponent_disconnected' }));
            otherWs.close();
          }
        }
        this.endGame();
      }
    }
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      for (const { ws } of Object.values(this.players)) {
        if (!ws || ws.readyState !== WebSocket.OPEN) continue;

        if (!ws.isAlive) {
          ws.close();
        } else {
          ws.isAlive = false;
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }
    }, 30000);
  }

  startPersistLoop() {
    this.persistInterval = setInterval(() => {
      this.state.storage.put('room', {
        players: this.players,
        matchId: this.matchId,
        syncState: this.sync.serialize(),
      });
    }, 60000);
  }

  cleanup() {
    clearInterval(this.pingInterval);
    clearInterval(this.persistInterval);
    this.pingInterval = null;
    this.persistInterval = null;

    this.spectators = new SpectatorManager();
    this.players = {};
    this.sockets.clear();
  }
}

export { Room as Room };
