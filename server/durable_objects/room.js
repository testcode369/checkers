export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.players = {};
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/init') {
      const { playerA, playerB } = await request.json();
      this.players = { playerA, playerB };
      return new Response('OK');
    }

    if (request.headers.get('Upgrade') === 'websocket') {
      const [client, server] = Object.values(new WebSocketPair());
      this.state.acceptWebSocket(server);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response('Not found', { status: 404 });
  }

  async webSocketMessage(ws, msg) {
    const data = JSON.parse(msg);
    if (data.type === 'move') {
      for (const socket of this.state.getWebSockets()) {
        if (socket !== ws) socket.send(msg);
      }
    }
  }
}