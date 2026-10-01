-- SORTIE's rules. Safe to re-run after editing (it replaces the row).
-- Initials use the entry screen's charset (src/ui/entry.ts); every score is a
-- multiple of 10 (src/core/scores.ts).
INSERT OR REPLACE INTO games (id, origins, table_size, max_score, score_step, initials)
VALUES (
  'sortie',
  'https://tonystedt.github.io,http://localhost:5173',
  10,
  9999990,
  10,
  '^[A-Z.\- ]{3}$'
);
