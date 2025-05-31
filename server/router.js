// server/router.js

import {
  handleJoin,
  handleAutomatch,
  handleInvite,
  handleAcceptInvite
} from './matchmaker.js';

export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Matchmaking endpoints
  if (request.method === 'POST' && pathname === '/api/join') {
    return handleJoin(request, env);
  }

  if (request.method === 'POST' && pathname === '/api/automatch') {
    return handleAutomatch(request, env);
  }

  if (request.method === 'POST' && pathname === '/api/invite') {
    return handleInvite(request, env);
  }

  if (request.method === 'GET' && pathname === '/api/accept-invite') {
    return handleAcceptInvite(request, env);
  }

  // Optional debug endpoint for room state
  if (request.method === 'GET' && pathname.startsWith('/api/room-state/')) {
    const parts = pathname.split('/');
    const roomId = parts[parts.length - 1];
    const id = env.ROOM_DO.idFromName(roomId);
    const stub = env.ROOM_DO.get(id);

    return stub.fetch('https://room/debug-state');
  }

  // Serve static files or fallback
  if (request.method === 'POST' && pathname === '/') {
    let fallbackUrl = new URL(request.url);
    if (fallbackUrl.pathname === '/' || !fallbackUrl.pathname.includes('.')) {
      fallbackUrl.pathname = '/';
    }
    return new Request(fallbackUrl.toString(), request);
  }

  return new Response('Not Found', { status: 404 });
}
