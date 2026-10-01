-- One row per game, with the rules its scores must follow.
CREATE TABLE games (
  id         TEXT PRIMARY KEY,               -- URL slug: /scores/<id>
  origins    TEXT NOT NULL,                  -- comma-separated origins allowed to call
  table_size INTEGER NOT NULL DEFAULT 10,    -- rows returned by GET
  max_score  INTEGER NOT NULL,               -- higher scores are rejected as implausible
  score_step INTEGER NOT NULL DEFAULT 1,     -- every score is a multiple of this
  initials   TEXT NOT NULL DEFAULT '^[A-Z]{3}$' -- regex the initials must match
);

-- Every accepted entry. Rows are never pruned, so deleting a fake score lets
-- the next one up rejoin the table.
CREATE TABLE scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  game       TEXT NOT NULL REFERENCES games (id),
  initials   TEXT NOT NULL,
  score      INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Serves the top-N query by reading only the rows it returns.
CREATE INDEX scores_by_game ON scores (game, score DESC, id);
