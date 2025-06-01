// crypto.js
export function encodeInviteToken(playerId, env) {
  const encoder = new TextEncoder();
  const secret = encoder.encode(env.SECRET_KEY); // Add SECRET_KEY to env vars

  const data = `${playerId}:${Date.now()}`;
  const keyPromise = crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return keyPromise.then(key => 
    crypto.subtle.sign('HMAC', key, encoder.encode(data))
      .then(sig => {
        const signature = Buffer.from(sig).toString('base64');
        return btoa(`${data}:${signature}`);
      })
  );
}

export function decodeInviteToken(token, env) {
  // optionally verify token integrity here
  const decoded = atob(token);
  return decoded.split(':')[0]; // returns playerId
}