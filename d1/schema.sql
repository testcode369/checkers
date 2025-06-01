-- Players
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,             -- UUID or assigned by server
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,             -- Match (room) ID
  player1_id TEXT NOT NULL,
  player2_id TEXT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  winner_id TEXT,
  FOREIGN KEY(player1_id) REFERENCES players(id),
  FOREIGN KEY(player2_id) REFERENCES players(id)
);

-- Moves (historical or real-time sync)
CREATE TABLE IF NOT EXISTS moves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  move_data TEXT NOT NULL,         -- JSON-encoded: cell, timestamp, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(match_id) REFERENCES matches(id),
  FOREIGN KEY(player_id) REFERENCES players(id)
);

-- Invites (optional mirror of KV for auditing/debugging)
CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  inviter_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  accepted_by TEXT,
  accepted_at TIMESTAMP,
  FOREIGN KEY(inviter_id) REFERENCES players(id),
  FOREIGN KEY(accepted_by) REFERENCES players(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_moves_match ON moves(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON invites(expires_at);