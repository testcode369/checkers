export class SpectatorManager {
  constructor() {
    this.spectators = new Map();
    this.expiryTimeout = 10 * 60 * 1000;

    this.queuedMessages = [];
    this.flushInterval = setInterval(() => this.flush(), 1000); // flush every 1s
  }

  addSpectator(connectionId, connection, invitedBy = null) {
    this.spectators.set(connectionId, {
      connection,
      lastActive: Date.now(),
      invitedBy
    });
  }

  removeSpectator(connectionId) {
    const spec = this.spectators.get(connectionId);
    if (spec) {
      try {
        spec.connection.close();
      } catch {}
      this.spectators.delete(connectionId);
    }
  }

  removeSpectatorsByInviter(playerId) {
    for (const [id, spec] of this.spectators.entries()) {
      if (spec.invitedBy === playerId) {
        this.removeSpectator(id);
      }
    }
  }

  refreshSpectator(connectionId) {
    const spec = this.spectators.get(connectionId);
    if (spec) {
      spec.lastActive = Date.now();
    }
  }

  // 🔁 Throttled broadcast queue
  queueBroadcast(data) {
    this.queuedMessages.push(data);
  }

  flush() {
    if (this.queuedMessages.length === 0) return;

    const batched = this.queuedMessages;
    this.queuedMessages = [];

    for (const [id, spec] of this.spectators.entries()) {
      if (Date.now() - spec.lastActive > this.expiryTimeout) {
        this.removeSpectator(id);
        continue;
      }
      try {
        for (const msg of batched) {
          spec.connection.send(JSON.stringify(msg));
        }
      } catch {
        this.removeSpectator(id);
      }
    }
  }

  broadcast(data) {
    for (const [id, spec] of this.spectators.entries()) {
      if (Date.now() - spec.lastActive > this.expiryTimeout) {
        this.removeSpectator(id);
        continue;
      }
      try {
        spec.connection.send(JSON.stringify(data));
      } catch {
        this.removeSpectator(id);
      }
    }
  }

  closeAll() {
    clearInterval(this.flushInterval);
    for (const id of this.spectators.keys()) {
      this.removeSpectator(id);
    }
  }
}

export { SpectatorManager };
