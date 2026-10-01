/**
 * Arcade score server: a Cloudflare Worker with a D1 (SQLite) database,
 * shared by any number of games. Each game is a row in `games` with its own
 * rules, so adding one needs no redeploy (see README.md).
 *
 *   GET  /scores/:game  -> [{ initials, score }, ...]  the top N, best first
 *   POST /scores/:game  <- { initials, score }        add one entry
 */

/** The parts of the D1 binding this Worker uses. */
interface D1Database {
  prepare(sql: string): D1Statement;
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

interface Env {
  DB: D1Database;
  /** Optional rate-limit binding (see wrangler.toml), applied to POSTs. */
  SUBMIT_LIMIT?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

/** A row of `games` (migrations/0001_create_tables.sql). */
interface Game {
  id: string;
  origins: string;
  table_size: number;
  max_score: number;
  score_step: number;
  initials: string;
}

interface ScoreEntry {
  initials: string;
  score: number;
}

const ROUTE = /^\/scores\/([a-z0-9-]+)$/;
/** Largest POST body accepted, bytes. */
const MAX_BODY = 200;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const match = ROUTE.exec(new URL(request.url).pathname);
    if (!match) return text('Not found', 404, null);
    try {
      const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(match[1]).first<Game>();
      if (!game) return text('Unknown game', 404, null);
      const origin = request.headers.get('Origin');
      const allowed = game.origins.split(',').map((s) => s.trim());
      const cors = origin && allowed.includes(origin) ? corsHeaders(origin) : null;

      switch (request.method) {
        case 'OPTIONS':
          return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} });
        case 'GET':
          return json(await topScores(env.DB, game), 200, cors);
        case 'POST': {
          // Browsers always send Origin on a cross-site POST; this keeps other sites out.
          if (!cors) return text('Forbidden', 403, null);
          if (env.SUBMIT_LIMIT) {
            const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
            if (!(await env.SUBMIT_LIMIT.limit({ key: ip })).success) return text('Too many requests', 429, cors);
          }
          const entry = parseEntry(await request.text(), game);
          if (!entry) return text('Invalid entry', 400, cors);
          await env.DB.prepare('INSERT INTO scores (game, initials, score) VALUES (?, ?, ?)')
            .bind(game.id, entry.initials, entry.score)
            .run();
          return text('OK', 201, cors);
        }
        default:
          return text('Method not allowed', 405, cors);
      }
    } catch (err) {
      console.error(err);
      return text('Server error', 500, null);
    }
  },
};

/** Best first; equal scores keep the order they were set in. */
async function topScores(db: D1Database, game: Game): Promise<ScoreEntry[]> {
  const { results } = await db
    .prepare('SELECT initials, score FROM scores WHERE game = ? ORDER BY score DESC, id LIMIT ?')
    .bind(game.id, game.table_size)
    .all<ScoreEntry>();
  return results;
}

/** The entry in a POST body, if it follows the game's rules. */
function parseEntry(body: string, game: Game): ScoreEntry | null {
  if (body.length > MAX_BODY) return null;
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const { initials, score } = data as Record<string, unknown>;
  if (typeof initials !== 'string' || !new RegExp(game.initials).test(initials)) return null;
  if (typeof score !== 'number' || !Number.isInteger(score)) return null;
  if (score <= 0 || score > game.max_score || score % game.score_step !== 0) return null;
  return { initials, score };
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, cors: Record<string, string> | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function text(body: string, status: number, cors: Record<string, string> | null): Response {
  return new Response(body, { status, headers: { ...cors, 'Content-Type': 'text/plain' } });
}
