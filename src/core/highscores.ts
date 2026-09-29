/** One line of the high-score table. */
export interface ScoreEntry {
  initials: string;
  score: number;
}

const STORAGE_KEY = 'sortie.highscores';
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

/** The top-10 table, saved in localStorage (falls back to memory if unavailable). */
export class HighScores {
  private list: ScoreEntry[];

  constructor() {
    this.list = load() ?? DEFAULTS.map((e) => ({ ...e }));
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
    save(this.list);
    return rank;
  }
}

function load(): ScoreEntry[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    const list = data.filter(
      (e): e is ScoreEntry =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as ScoreEntry).initials === 'string' &&
        Number.isInteger((e as ScoreEntry).score),
    );
    return list.length > 0 ? list.slice(0, SIZE) : null;
  } catch {
    return null;
  }
}

function save(list: readonly ScoreEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Storage unavailable: scores last until the page is closed.
  }
}
