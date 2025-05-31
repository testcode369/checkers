export class SyncManager {
  constructor(state = {}, changes = {}) {
    this.lastSyncTimestamp = Date.now();
    this.dirty = false;

    this.state = state;   // Full game state (e.g., board, move history)
    this.changes = changes; // Deltas (only modified keys since last sync)
  }

  markDirty() {
    this.dirty = true;
  }

  updateState(newState) {
    for (const key in newState) {
      if (this.state[key] !== newState[key]) {
        this.state[key] = newState[key];
        this.changes[key] = newState[key];
        this.markDirty();
      }
    }
  }

  shouldSync() {
    const now = Date.now();
    return this.dirty && (now - this.lastSyncTimestamp >= 5000);
  }

  getDelta() {
    return { ...this.changes };
  }

  getFullState() {
    return { ...this.state };
  }

  synced() {
    this.lastSyncTimestamp = Date.now();
    this.dirty = false;
    this.changes = {};
  }

  // 🆕 Serialize full state and changes
  serialize() {
    return {
      state: this.state,
      changes: this.changes,
    };
  }

  // 🆕 Static method to restore from persisted data
  static fromSerialized(data) {
    return new SyncManager(data.state, data.changes);
  }
}
