// server/durable_objects/room.js
export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/join') {
      const { playerId } = await request.json();
      await this.state.storage.put(`player-${playerId}`, true);

      return new Response(JSON.stringify({
        message: 'Player joined!',
        playerId
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/move') {
      const { playerId, move } = await request.json();

      let moves = await this.state.storage.get('moves') || [];
      moves.push({ playerId, move });

      await this.state.storage.put('moves', moves);

      return new Response(JSON.stringify({
        message: 'Move recorded!',
        moves
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/spectate') {
      const players = await this.state.storage.list({ prefix: 'player-' });
      const moves = await this.state.storage.get('moves') || [];

      return new Response(JSON.stringify({
        message: 'Spectator data',
        players: Array.from(players.keys()),
        moves
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found in Room', { status: 404 });
  }
}
