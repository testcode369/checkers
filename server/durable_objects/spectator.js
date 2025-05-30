// spectator.js - manages spectator streams and expiry logic

export class SpectatorManager {
  constructor() {
    this.spectators = new Map(); // Map<connectionId, { connection, lastActive }>
    this.expiryTimeout = 10 * 60 * 1000; // 10 minutes inactivity expiry
  }

  addSpectator(connectionId, connection) {
    this.spectators.set(connectionId, { connection, lastActive: Date.now() });
  }

  removeSpectator(connectionId) {
    this.spectators.delete(connectionId);
  }

  refreshSpectator(connectionId) {
    const spec = this.spectators.get(connectionId);
    if (spec) {
      spec.lastActive = Date.now();
    }
  }

  broadcast(data) {
    const now = Date.now();
    for (const [id, spec] of this.spectators.entries()) {
      if (now - spec.lastActive > this.expiryTimeout) {
        // Remove inactive spectators
        this.spectators.delete(id);
        spec.connection.close();
        continue;
      }
      spec.connection.send(JSON.stringify(data));
    }
  }
}