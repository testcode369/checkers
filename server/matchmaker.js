import { signToken, verifyToken, generateToken } from './utils.js';

export class Matchmaker {
  constructor(env) {
    this.env = env; // Environment variables, including SECRET
    this.rooms = new Map(); // In-memory room tracking (for demo)
    this.playerRooms = new Map(); // playerId => roomId map
  }

  // Simple automatch: pair waiting players or create new room
  async automatch(playerId) {
    // Find a waiting player
    for (const [otherId, roomId] of this.playerRooms.entries()) {
      if (otherId !== playerId) {
        // Pair players
        this.playerRooms.set(playerId, roomId);
        return { room: roomId, opponent: otherId };
      }
    }

    // No waiting player, create new room
    const roomId = `room-${generateToken(8)}`;
    this.rooms.set(roomId, [playerId]);
    this.playerRooms.set(playerId, roomId);
    return { room: roomId, opponent: null };
  }

  // Generate an invite link with signed token
  async createInvite(playerId) {
    const data = {
      playerId,
      nonce: generateToken(8),
      issuedAt: Date.now(),
    };

    const token = await signToken(data, this.env.SECRET);

    // Example invite link format, adjust domain accordingly
    const inviteLink = `https://yourdomain.example.com/join?invite=${encodeURIComponent(token)}`;

    return { inviteLink };
  }

  // Accept invite link by verifying token and returning room info
  async acceptInvite(token) {
    const data = await verifyToken(token, this.env.SECRET);
    if (!data) {
      throw new Error('Invalid or tampered invite token');
    }

    const { playerId: inviterId, issuedAt } = data;

    // Optional: check expiry (e.g., 1 hour)
    const maxAgeMs = 60 * 60 * 1000;
    if (Date.now() - issuedAt > maxAgeMs) {
      throw new Error('Invite token expired');
    }

    // Create or join a room for inviter and new player
    const roomId = this.playerRooms.get(inviterId) || `room-${generateToken(8)}`;
    this.rooms.set(roomId, [inviterId]);
    this.playerRooms.set(inviterId, roomId);

    // For the acceptor, assign same room
    this.playerRooms.set(data.acceptorId, roomId);

    return { room: roomId, opponent: inviterId };
  }
}