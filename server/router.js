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

  try {
    return await getAssetFromKV(
      { request, waitUntil: ctx.waitUntil },
      { ASSET_NAMESPACE: env.__STATIC_CONTENT }
    );
  } catch (err) {

    const url = new URL(request.url);
    url.pathname = './client/index.html';
    
   // return new Response('Not Found 2', { status: 404 });
    return await getAssetFromKV(
      { request, waitUntil: ctx.waitUntil },
      { ASSET_NAMESPACE: env.__STATIC_CONTENT }
    );
  }


}
