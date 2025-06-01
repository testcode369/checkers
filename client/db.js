// db.js
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.2/+esm';

export const db = new Dexie('CheckersGame');
db.version(1).stores({
  moves: '++id,timestamp,data'
});