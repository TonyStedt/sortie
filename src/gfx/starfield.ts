import { PLAYFIELD_BOTTOM, PLAYFIELD_TOP, SCREEN_W } from '../core/config';
import type { Rng } from '../core/rng';
import { STAR_COLORS } from './palette';

/** Tuning for the background starfield. */
const STARFIELD = {
  count: 72,
  /** Pixels per frame, right to left. Slower than the terrain for depth. */
  speed: 0.25,
  /** Stars are split into this many blink groups... */
  groups: 4,
  /** ...and the lit/unlit pattern advances every this many frames. */
  blinkFrames: 16,
} as const;

interface Star {
  x: number;
  y: number;
  color: string;
  group: number;
}

/**
 * Sparse multicolour stars that drift left and twinkle in groups, like the
 * star generator on Galaxian-family boards.
 */
export class Starfield {
  private readonly stars: Star[] = [];
  private frame = 0;

  constructor(rng: Rng) {
    for (let i = 0; i < STARFIELD.count; i++) {
      this.stars.push({
        x: rng.int(SCREEN_W),
        y: rng.range(PLAYFIELD_TOP, PLAYFIELD_BOTTOM - 1),
        color: rng.pick(STAR_COLORS),
        group: rng.int(STARFIELD.groups),
      });
    }
  }

  update(): void {
    this.frame++;
    for (const s of this.stars) {
      s.x -= STARFIELD.speed;
      if (s.x < 0) s.x += SCREEN_W;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Each group is dark for one quarter of the blink cycle, staggered.
    const phase = Math.floor(this.frame / STARFIELD.blinkFrames) % STARFIELD.groups;
    for (const s of this.stars) {
      if (s.group === phase) continue;
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.floor(s.x), s.y, 1, 1);
    }
  }
}
