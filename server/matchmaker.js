// matchmaker.js

import { signToken, verifyToken, generateToken } from './utils.js';

export class Matchmaker {
  constructor(env) {
    this.env = env; // Contains secrets and bindings
    this.rooms = new Map(); // In-memory room tracking
    this.playerRooms = new Map(); // playerId => roomId
  }

  // Pair two players or create a new room
  async automatch(playerId) {
    for (const [otherId, roomId] of this.playerRooms.entries()) {
      if (otherId !== playerId) {
        this.playerRooms.set(playerId, roomId);
        return { room: roomId, opponent: otherId };
      }
    }

    const roomId = `room-${generateToken(8)}`;
    this.rooms.set(roomId, [playerId]);
    this.playerRooms.set(playerId, roomId);
    return { room: roomId, opponent: null };
  }

  // Create an invite token and return the invite URL
  async createInvite(playerId) {
    const data = {
      playerId,
      nonce: generateToken(8),
      issuedAt: Date.now(),
    };

    const token = await signToken(data, this.env.SECRET);

    const inviteLink = `https://yourdomain.example.com/join?invite=${encodeURIComponent(token)}`;
    return { inviteLink };
  }

  // Accept an invite token, validate it, and assign room
  async acceptInvite(token, acceptorId) {
    const data = await verifyToken(token, this.env.SECRET);
    if (!data) {
      throw new Error('Invalid or tampered invite token');
    }

    const { playerId: inviterId, issuedAt } = data;
    const maxAgeMs = 60 * 60 * 1000; // 1 hour
    if (Date.now() - issuedAt > maxAgeMs) {
      throw new Error('Invite token expired');
    }

    const roomId = this.playerRooms.get(inviterId) || `room-${generateToken(8)}`;
    this.rooms.set(roomId, [inviterId]);
    this.playerRooms.set(inviterId, roomId);
    this.playerRooms.set(acceptorId, roomId);

    return { room: roomId, opponent: inviterId };
  }
}

// --- HANDLERS for router.js ---

export async function handleJoin(request, env) {
  const { playerId } = await request.json();
  if (!playerId) return new Response('Missing playerId', { status: 400 });

  return new Response(JSON.stringify({ message: 'Joined successfully' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleAutomatch(request, env) {
  const { playerId } = await request.json();
  if (!playerId) return new Response('Missing playerId', { status: 400 });

  const mm = new Matchmaker(env);
  const result = await mm.automatch(playerId);
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleInvite(request, env) {
  const { playerId } = await request.json();
  if (!playerId) return new Response('Missing playerId', { status: 400 });

  const mm = new Matchmaker(env);
  const result = await mm.createInvite(playerId);
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function handleAcceptInvite(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('invite');
  const acceptorId = url.searchParams.get('playerId');

  if (!token || !acceptorId) {
    return new Response('Missing token or playerId', { status: 400 });
  }

  try {
    const mm = new Matchmaker(env);
    const result = await mm.acceptInvite(token, acceptorId);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(err.message, { status: 400 });
  }
}
