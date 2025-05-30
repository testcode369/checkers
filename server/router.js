import { handleJoin, handleAutomatch, handleInvite, handleAcceptInvite } from './matchmaker.js';
import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

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
  if (request.method === 'POST' && pathname === '/') {
    //return handleAcceptInvite(request, env);
    let url = new URL(request.url);
          if (url.pathname === "/" || !url.pathname.includes('.')) {
            url.pathname = "/index.html";
          }
          return new Request(url.toString(), request);
  }
   
    return new Response('Not Found', { status: 404 });
  





}
