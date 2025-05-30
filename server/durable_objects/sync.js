// sync.js - sync logic every 5-10s using delta updates

export class SyncManager {
  constructor() {
    this.lastSyncTimestamp = Date.now();
    this.dirty = false;
    this.state = {}; // Store game state snapshot or diff here
  }

  markDirty() {
    this.dirty = true;
  }

  updateState(newState) {
    // Update internal state with newState diff
    Object.assign(this.state, newState);
    this.markDirty();
  }

  shouldSync() {
    const now = Date.now();
    return this.dirty && (now - this.lastSyncTimestamp) >= 5000;
  }

  getDelta() {
    // Return the delta (diff) to sync, here simplified as full state
    return this.state;
  }

  synced() {
    this.lastSyncTimestamp = Date.now();
    this.dirty = false;
  }
}