import { parseEntries, type ScoreEntry } from './highscores';

/** Give up on a request after this long, ms. */
const TIMEOUT_MS = 8000;

/**
 * Client for the shared high-score table: the score server in worker/
 * (a Cloudflare Worker with a D1 database). Only built when VITE_SCORES_URL is set.
 */
export class ScoreServer {
  constructor(private readonly url: string) {}

  static fromEnv(): ScoreServer | null {
    const url = import.meta.env.VITE_SCORES_URL;
    return url ? new ScoreServer(url) : null;
  }

  /** The shared top 10, best first. Throws if the server can't be reached. */
  async top(): Promise<ScoreEntry[]> {
    const res = await fetch(this.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Score server: HTTP ${res.status}`);
    return parseEntries(await res.json());
  }

  /**
   * Send one entry. Resolves once the server has either taken it or rejected
   * it as invalid (so it shouldn't be sent again). Throws if it should be retried.
   */
  async submit(entry: ScoreEntry): Promise<void> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok || res.status === 400) return;
    throw new Error(`Score server: HTTP ${res.status}`);
  }
}
