import { PLAYER } from '../core/config';
import type { Input } from '../core/input';
import { drawSprite } from '../gfx/sprite';
import { SHIP_BOOM_OFFSET, SHIP_FLAME_OFFSET, sprites } from '../gfx/sprites';

/** Frames per exhaust-flame animation step. */
const FLAME_FRAMES = 3;
/** Frames per explosion animation step; the last step is followed by nothing. */
const BOOM_FRAMES = 8;
const BOOM_SEQUENCE = ['shipBoomA', 'shipBoomB', 'shipBoomC', 'shipBoomB', 'shipBoomC'] as const;

/**
 * flying:    under player control.
 * falling:   out of fuel, dropping with no control.
 * exploding: hit something; plays the explosion, then disappears.
 */
export type PlayerMode = 'flying' | 'falling' | 'exploding';

export class Player {
  /** Top-left of the ship sprite, sub-pixel; drawn at the floored position. */
  x: number = PLAYER.startX;
  y: number = PLAYER.startY;
  mode: PlayerMode = 'flying';
  private vy = 0;
  private frame = 0;
  private boomFrame = 0;

  reset(): void {
    this.x = PLAYER.startX;
    this.y = PLAYER.startY;
    this.mode = 'flying';
    this.vy = 0;
  }

  startFalling(): void {
    if (this.mode !== 'flying') return;
    this.mode = 'falling';
    this.vy = 0;
  }

  explode(): void {
    this.mode = 'exploding';
    this.boomFrame = 0;
  }

  update(input: Input): void {
    this.frame++;
    switch (this.mode) {
      case 'flying': {
        const { x, y } = input.axis();
        this.x = clamp(this.x + x * PLAYER.speedX, PLAYER.minX, PLAYER.maxX);
        this.y = clamp(this.y + y * PLAYER.speedY, PLAYER.minY, PLAYER.maxY);
        break;
      }
      case 'falling':
        this.vy = Math.min(PLAYER.fallMaxSpeed, this.vy + PLAYER.fallGravity);
        this.y += this.vy;
        break;
      case 'exploding':
        this.boomFrame++;
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = sprites();
    if (this.mode === 'exploding') {
      const step = Math.floor(this.boomFrame / BOOM_FRAMES);
      const name = BOOM_SEQUENCE[step];
      if (name) drawSprite(ctx, s[name], this.x + SHIP_BOOM_OFFSET.x, this.y + SHIP_BOOM_OFFSET.y);
      return;
    }
    // No exhaust once the tank is dry.
    if (this.mode === 'flying') {
      const flame = Math.floor(this.frame / FLAME_FRAMES) % 2 === 0 ? s.flameA : s.flameB;
      drawSprite(ctx, flame, this.x + SHIP_FLAME_OFFSET.x, this.y + SHIP_FLAME_OFFSET.y);
    }
    drawSprite(ctx, s.ship, this.x, this.y);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
