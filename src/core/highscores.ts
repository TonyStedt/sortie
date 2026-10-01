import type { ScoreServer } from './scoreserver';

/** One line of the high-score table. */
export interface ScoreEntry {
  initials: string;
  score: number;
}

/** The table as last seen (the whole table when there's no score server). */
const STORAGE_KEY = 'sortie.highscores';
/** Entries the score server hasn't taken yet, kept until it does. */
const PENDING_KEY = 'sortie.highscores.pending';
const SIZE = 10;

/** Table for a fresh install. The top score is what the HUD shows until beaten. */
const DEFAULTS: readonly ScoreEntry[] = [
  { initials: 'SRT', score: 10000 },
  { initials: 'ACE', score: 9000 },
  { initials: 'JET', score: 8000 },
  { initials: 'VEX', score: 7000 },
  { initials: 'ZIP', score: 6000 },
  { initials: 'ORB', score: 5000 },
  { initials: 'NAV', score: 4000 },
  { initials: 'KIT', score: 3000 },
  { initials: 'BOB', score: 2000 },
  { initials: 'RAY', score: 1000 },
];

/**
 * The top-10 table, saved in localStorage (falls back to memory if unavailable).
 *
 * With a score server the table is shared: it's fetched in the background by
 * `refresh()`, and new entries are sent in the background too, queued in
 * localStorage until the server takes them. The game never waits on the
 * network; offline, the last table seen is used. Defaults fill any empty rows.
 */
export class HighScores {
  private list: ScoreEntry[];
  private pending: ScoreEntry[];
  /** Counts inserts, so a fetch that started before one doesn't overwrite it. */
  private inserts = 0;
  private sending = false;

  constructor(private readonly server: ScoreServer | null = null) {
    this.list = load(STORAGE_KEY) ?? DEFAULTS.map((e) => ({ ...e }));
    this.pending = server ? (load(PENDING_KEY) ?? []) : [];
    this.refresh();
  }

  get entries(): readonly ScoreEntry[] {
    return this.list;
  }

  top(): number {
    return this.list[0]?.score ?? 0;
  }

  qualifies(score: number): boolean {
    return score > 0 && (this.list.length < SIZE || score > this.list[this.list.length - 1].score);
  }

  /** Add an entry; returns its rank (0-based), or -1 if it didn't make the table. */
  insert(initials: string, score: number): number {
    if (!this.qualifies(score)) return -1;
    let rank = this.list.findIndex((e) => score > e.score);
    if (rank < 0) rank = this.list.length;
    this.list.splice(rank, 0, { initials, score });
    this.list.length = Math.min(this.list.length, SIZE);
    save(STORAGE_KEY, this.list);
    if (this.server) {
      this.inserts++;
      this.pending.push({ initials, score });
      save(PENDING_KEY, this.pending);
      void this.send();
    }
    return rank;
  }

  /**
   * Send any queued entries, then fetch the shared table. Runs in the
   * background. Call it when the table may be stale and isn't on screen
   * (a rank highlight would point at the wrong row if the table changed).
   */
  refresh(): void {
    void this.fetchTable();
  }

  private async fetchTable(): Promise<void> {
    if (!this.server) return;
    await this.send();
    const inserts = this.inserts;
    try {
      const shared = await this.server.top();
      // An entry went in while this was in flight; the next refresh picks it up.
      if (inserts !== this.inserts) return;
      this.list = [...shared, ...this.pending, ...DEFAULTS]
        .sort((a, b) => b.score - a.score)
        .slice(0, SIZE)
        .map((e) => ({ ...e }));
      save(STORAGE_KEY, this.list);
    } catch {
      // Offline or server down: keep the table we have.
    }
  }

  /** Send queued entries in order, stopping at the first failure (retried on the next refresh). */
  private async send(): Promise<void> {
    if (!this.server || this.sending) return;
    this.sending = true;
    try {
      while (this.pending.length > 0) {
        await this.server.submit(this.pending[0]);
        this.pending.shift();
        save(PENDING_KEY, this.pending);
      }
    } catch {
      // Keep the rest queued.
    } finally {
      this.sending = false;
    }
  }
}

/** Valid entries from untrusted JSON (localStorage or the score server). */
export function parseEntries(data: unknown): ScoreEntry[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (e): e is ScoreEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as ScoreEntry).initials === 'string' &&
        Number.isInteger((e as ScoreEntry).score),
    )
    .map((e) => ({ initials: e.initials, score: e.score }))
    .slice(0, SIZE);
}

function load(key: string): ScoreEntry[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const list = parseEntries(JSON.parse(raw));
    return list.length > 0 ? list : null;
  } catch {
    return null;
  }
}

function save(key: string, list: readonly ScoreEntry[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage unavailable: scores last until the page is closed.
  }
}
