// server/index.js
import { handleRequest } from './router.js';

// Add dummy Durable Object classes to satisfy Wrangler
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

// Default Worker export
export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
  // Required Durable Object exports
  Room,
  Sync,
  Spectator
};
