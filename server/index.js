// server/index.js
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

    // Try to serve static files first
    try {
      const asset = await getAssetFromKV({ request, waitUntil: ctx.waitUntil }, { ASSET_NAMESPACE: env.__STATIC_CONTENT });
      return asset;
    } catch (err) {
      // If static asset not found, fallback to router
      return handleRequest(request, env, ctx);
    }
  },

  Room,
  Sync,
  Spectator
};
