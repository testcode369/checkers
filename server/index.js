import { Router } from 'itty-router';
import { nanoid } from 'nanoid';
import { encodeInviteToken } from './crypto.js';
import { Room } from './durable_objects/room.js';
import { SyncManager } from './durable_objects/sync.js';
import { SpectatorManager } from './durable_objects/spectator.js';

const router = Router();

router.post('/join', async (req, env) => {
  const { name } = await req.json();
  const playerId = nanoid();

  await env.DB.prepare(`INSERT INTO players (id, name) VALUES (?, ?)`)
    .bind(playerId, name).run();

  return new Response(JSON.stringify({ playerId }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.post('/automatch', async (req, env) => {
  const { playerId } = await req.json();
  const waiting = await env.KV.get('waiting_player');

  if (waiting && waiting !== playerId) {
    await env.KV.delete('waiting_player');

    const roomId = `room-${nanoid()}`;
    const stub = env.ROOM.get(env.ROOM.idFromName(roomId));

    await stub.fetch('https://init', {
      method: 'POST',
      body: JSON.stringify({
        playerA: { id: waiting, name: `Player-${waiting.slice(0, 4)}` },
        playerB: { id: playerId, name: `Player-${playerId.slice(0, 4)}` },
      }),
    });

    return new Response(JSON.stringify({ matched: true, roomId }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await env.KV.put('waiting_player', playerId, { expirationTtl: 60 });
  return new Response(JSON.stringify({ matched: false }));
});

router.post('/invite', async (req, env) => {
  const { inviterId } = await req.json();
  const token = encodeInviteToken(inviterId, env);
  const expiresAt = new Date(Date.now() + 3600_000).toISOString();

  await env.DB.prepare(`
    INSERT INTO invites (token, inviter_id, expires_at) VALUES (?, ?, ?)
  `).bind(token, inviterId, expiresAt).run();

  await env.INVITES.put(token, inviterId, { expirationTtl: 3600 });

  return new Response(JSON.stringify({ inviteLink: `/accept/${token}` }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.get('/accept/:token', async ({ params }, env) => {
  const { token } = params;
  const inviterId = await env.INVITES.get(token);

  if (!inviterId) {
    return new Response('Invalid or expired invite.', { status: 400 });
  }

  const acceptorId = nanoid();
  await env.DB.prepare(`INSERT INTO players (id, name) VALUES (?, ?)`)
    .bind(acceptorId, `Friend-${acceptorId.slice(0, 5)}`).run();

  const roomId = `room-${nanoid()}`;
  const stub = env.ROOM.get(env.ROOM.idFromName(roomId));

  await stub.fetch('https://init', {
    method: 'POST',
    body: JSON.stringify({
      playerA: { id: inviterId, name: `Player-${inviterId.slice(0, 4)}` },
      playerB: { id: acceptorId, name: `Friend-${acceptorId.slice(0, 5)}` },
    }),
  });

  await env.DB.prepare(`
    UPDATE invites SET accepted_by = ?, accepted_at = CURRENT_TIMESTAMP WHERE token = ?
  `).bind(acceptorId, token).run();

  return new Response(JSON.stringify({ roomId, inviterId, acceptorId }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.get('/spectate/:playerId', async ({ params }, env) => {
  const roomId = await env.KV.get(`player:${params.playerId}:room`);
  if (!roomId) {
    return new Response(JSON.stringify({ error: 'Room not found for player' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = `wss://multiplayercheckers.online/room/${roomId}?role=spectator`;

  return new Response(JSON.stringify({ spectatorUrl: url }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

router.post('/end', async (req, env) => {
  const { playerId, roomId, winnerId } = await req.json();

  if (winnerId) {
    await env.DB.prepare(`
      UPDATE matches SET ended_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?
    `).bind(winnerId, roomId).run();
  }

  const stub = env.ROOM.get(env.ROOM.idFromName(roomId));
  await stub.fetch('https://end', {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });

  return new Response('Game ended', { status: 200 });
});

router.all('*', () => new Response('Not Found', { status: 404 }));


export {
    Room,
    SyncManager,
    SpectatorManager
  }; 

export default {
  fetch: (req, env, ctx) => router.handle(req, env, ctx),

};
