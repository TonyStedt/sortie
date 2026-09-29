import { PLAYER } from '../core/config';
import type { Input } from '../core/input';
import { drawSprite } from '../gfx/sprite';
import { SHIP_FLAME_OFFSET, sprites } from '../gfx/sprites';

/** Frames per exhaust-flame animation step. */
const FLAME_FRAMES = 3;

export class Player {
  /** Top-left of the ship sprite, sub-pixel; drawn at the floored position. */
  x: number = PLAYER.startX;
  y: number = PLAYER.startY;
  private frame = 0;

  reset(): void {
    this.x = PLAYER.startX;
    this.y = PLAYER.startY;
  }

  update(input: Input): void {
    this.frame++;
    const { x, y } = input.axis();
    this.x = clamp(this.x + x * PLAYER.speedX, PLAYER.minX, PLAYER.maxX);
    this.y = clamp(this.y + y * PLAYER.speedY, PLAYER.minY, PLAYER.maxY);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = sprites();
    const flame = Math.floor(this.frame / FLAME_FRAMES) % 2 === 0 ? s.flameA : s.flameB;
    drawSprite(ctx, flame, this.x + SHIP_FLAME_OFFSET.x, this.y + SHIP_FLAME_OFFSET.y);
    drawSprite(ctx, s.ship, this.x, this.y);
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}
