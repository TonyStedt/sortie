import { SCREEN_W } from '../core/config';
import { sprites, type SpriteName } from '../gfx/sprites';
import { TARGET_WIDTH, type TargetKind } from './stages/types';
import type { World } from './world';

/** A ground object with its absolute position worked out. */
export interface Spawn {
  kind: TargetKind;
  /** Left edge, world x. */
  wx: number;
  /** Top edge, screen y: standing on the ground. */
  y: number;
}

const SPRITE_OF: Record<TargetKind, SpriteName> = {
  rocket: 'rocket',
  fuel: 'fuelTank',
  mystery: 'mystery',
  base: 'base',
};

/** A placement resolved against the terrain, for one loop of the mission. */
interface Entry {
  kind: TargetKind;
  /** Left edge, world x within [0, world.length). */
  x: number;
  y: number;
}

/** Objects are created this many pixels before they scroll into view. */
const LOOKAHEAD = 8;

/**
 * Hands out a stage's ground objects as they come into view. World x keeps
 * growing as the mission loops, so the spawner tracks which loop it is on.
 */
export class Spawner {
  /** One loop of the mission, sorted by x. */
  private readonly all: readonly Entry[];
  private index = 0;
  /** World x where the current loop starts. */
  private base = 0;

  constructor(private readonly world: World) {
    const list: Entry[] = [];
    world.stages.forEach((stage, i) => {
      const start = world.sectionStarts[i];
      for (const p of stage.targets ?? []) {
        const x = start + p.x;
        const y = groundTop(world, x, p.kind);
        if (import.meta.env.DEV && y === null) {
          console.warn(`${stage.label}: ${p.kind} at x ${p.x} is not on flat ground`);
        }
        list.push({ kind: p.kind, x, y: y ?? minTop(world, x, p.kind) });
      }
    });
    list.sort((a, b) => a.x - b.x);
    if (import.meta.env.DEV) {
      for (const kind of Object.keys(SPRITE_OF) as TargetKind[]) {
        if (sprites()[SPRITE_OF[kind]].w !== TARGET_WIDTH[kind]) {
          console.warn(`TARGET_WIDTH.${kind} doesn't match its sprite width`);
        }
      }
    }
    this.all = list;
  }

  /** Forget everything spawned; objects at or after worldX will spawn again. */
  reset(worldX: number): void {
    const L = this.world.length;
    this.base = Math.floor(worldX / L) * L;
    const local = worldX - this.base;
    this.index = this.all.findIndex((p) => p.x >= local);
    if (this.index < 0) {
      this.index = 0;
      this.base += L;
    }
  }

  /**
   * Carry on from the current view without re-issuing anything already in
   * it: only objects beyond the lookahead edge will spawn.
   */
  resume(scroll: number): void {
    this.reset(scroll + SCREEN_W + LOOKAHEAD + 1);
  }

  /** Objects that have come within LOOKAHEAD of the right edge since the last call. */
  *take(scroll: number): Generator<Spawn> {
    if (this.all.length === 0) return;
    const edge = scroll + SCREEN_W + LOOKAHEAD;
    for (;;) {
      const p = this.all[this.index];
      const wx = this.base + p.x;
      if (wx > edge) return;
      yield { kind: p.kind, wx, y: p.y };
      if (++this.index >= this.all.length) {
        this.index = 0;
        this.base += this.world.length;
      }
    }
  }
}

/** Top-edge screen y that stands the object on flat ground, or null if the ground isn't flat. */
function groundTop(world: World, x: number, kind: TargetKind): number | null {
  const sprite = sprites()[SPRITE_OF[kind]];
  const f = world.floorY(x);
  for (let c = 1; c < sprite.w; c++) {
    if (world.floorY(x + c) !== f) return null;
  }
  return f - sprite.h;
}

/** Fallback for uneven ground: rest on the highest point under the object. */
function minTop(world: World, x: number, kind: TargetKind): number {
  const sprite = sprites()[SPRITE_OF[kind]];
  let top = Infinity;
  for (let c = 0; c < sprite.w; c++) top = Math.min(top, world.floorY(x + c));
  return top - sprite.h;
}
