# Arcade score server

A Cloudflare Worker with a D1 (SQLite) database that keeps shared high-score
tables for any number of games. Each game has a row in the `games` table with
its own rules (allowed origins, table size, maximum score, score step,
initials pattern), so adding a game doesn't need a redeploy.

```
GET  /scores/<game>   the top N as [{ "initials": "ACE", "score": 9000 }, ...]
POST /scores/<game>   add { "initials": "ACE", "score": 9000 }
```

Without it (no `VITE_SCORES_URL`), SORTIE keeps high scores in each player's
browser.

All commands below run from this folder after `npm install`.

## One-time setup

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up.
   D1 is part of it, so there's nothing else to sign up for.
2. Log in, then create the database:

   ```bash
   npx wrangler login
   npm run db:create
   ```

   Copy the `database_id` it prints into `wrangler.toml`.
3. Create the tables and add SORTIE:

   ```bash
   npm run db:migrate
   npm run game:add -- games/sortie.sql
   ```

4. Deploy:

   ```bash
   npm run deploy
   ```

   This prints the Worker's URL, e.g. `https://arcade-scores.<you>.workers.dev`.
   SORTIE's endpoint is that URL plus `/scores/sortie`.
5. In the GitHub repo, go to Settings → Secrets and variables → Actions →
   Variables, and add `SCORES_URL` set to that endpoint. The next push to
   `main` builds the game with it.

## Adding another game

Copy `games/sortie.sql` to `games/<game>.sql` and set that game's id and
rules. List every origin the game is served from, then run:

```bash
npm run game:add -- games/<game>.sql
```

The game then uses `https://arcade-scores.<you>.workers.dev/scores/<game>`.
SORTIE's `src/core/scoreserver.ts` and `src/core/highscores.ts` are a
ready-made client (background sync, offline queue).

To change a game's rules, edit its file and run the same command again.

## Local development

You don't need an account for this:

```bash
npm run db:migrate:local
npm run game:add:local -- games/sortie.sql
npm run dev
```

The Worker runs at `http://localhost:8787`. To point the game at it, put
`VITE_SCORES_URL=http://localhost:8787/scores/sortie` in the repo root's
`.env.local`, then run `npm run dev` there.

## Looking after the tables

Browse or edit the data in the Cloudflare dashboard (Storage & Databases →
D1 → arcade-scores → Console), or from here:

```bash
npx wrangler d1 execute arcade-scores --remote --command "SELECT * FROM scores WHERE game = 'sortie' ORDER BY score DESC LIMIT 20"
npx wrangler d1 execute arcade-scores --remote --command "DELETE FROM scores WHERE id = 123"
```

Schema changes go in a new file in `migrations/` (e.g. `0002_...sql`). Apply
it with `npm run db:migrate`.

## Limits

- **Free plan:** D1 allows 5 million rows read and 100,000 rows written per
  day. A table fetch reads about 11 rows and a new score writes 1, so
  that's far more than enough. If a limit is ever hit, queries fail until
  00:00 UTC. The game then keeps using its cached table and queues new
  scores.
- **Scores aren't proof of play.** The Worker only checks that an entry
  follows the game's rules. It also allows at most 5 submissions a minute
  per IP. Someone determined can still post a fake but plausible score;
  delete it as shown above.
