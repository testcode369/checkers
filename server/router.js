import { handleJoin, handleAutomatch, handleInvite, handleAcceptInvite } from './matchmaker.js';
import indexHtml from './client/index.html';

export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const pathname = url.pathname;

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
  if (pathname === '/' && request.method === 'GET') {
    return new Response(indexHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  }


  return new Response('Not found', { status: 404 });
}
