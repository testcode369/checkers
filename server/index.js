import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import { handleRequest } from './router.js';

export class Room {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response('Room Durable Object responding');
  }
}

export class Sync {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response('Sync Durable Object responding');
  }
}

export class Spectator {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    return new Response('Spectator Durable Object responding');
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ✅ Handle WebSocket upgrade
    if (url.pathname === "/ws" && request.headers.get("Upgrade") === "websocket") {
      const [client, server] = Object.values(new WebSocketPair());

      // Optional: store client in Durable Object or handle messages here
      server.accept();

      server.addEventListener("message", (event) => {
        server.send(`Echo: ${event.data}`);
      });

      return new Response(null, {
        status: 101,
        webSocket: server
      });
    }

    // ✅ Try static assets
    try {
      const asset = await getAssetFromKV(
        { request, waitUntil: ctx.waitUntil },
        { ASSET_NAMESPACE: env.__STATIC_CONTENT }
      );
      return asset;
    } catch (err) {
      // ✅ Fall back to app router
      return handleRequest(request, env, ctx);
    }
  },

  Room,
  Sync,
  Spectator
};
