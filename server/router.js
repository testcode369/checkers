// server/router.js
import { handleJoin, handleMove, handleSpectate } from './handlers.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/join' && request.method === 'POST') {
      return handleJoin(request, env, ctx);
    }
    if (url.pathname === '/move' && request.method === 'POST') {
      return handleMove(request, env, ctx);
    }
    if (url.pathname === '/spectate' && request.method === 'POST') {
      return handleSpectate(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  }
};
