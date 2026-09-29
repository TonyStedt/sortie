import { BOMB, LASER, PLAYFIELD_BOTTOM, SCREEN_W } from '../core/config';
import { drawSprite, type Sprite } from '../gfx/sprite';
import { sprites } from '../gfx/sprites';
import { spriteHitsTerrain } from '../world/collision';
import type { World } from '../world/world';

/** Player laser shot. Position is the sprite's top-left, in screen space. */
export class Shot {
  constructor(
    public x: number,
    public y: number,
  ) {}

  /** Returns false once the shot has hit terrain or left the screen. */
  update(world: World, scroll: number): boolean {
    const w = sprites().shot.w;
    // Step one pixel at a time so thin terrain can't be skipped over.
    for (let i = 0; i < LASER.speed; i++) {
      this.x++;
      if (this.x >= SCREEN_W) return false;
      if (world.solidAt(scroll, this.x + w - 1, this.y)) return false;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawSprite(ctx, sprites().shot, this.x, this.y);
  }
}

/** Player bomb. Position is the centre of the sprite, in screen space. */
export class Bomb {
  private vx: number = BOMB.startVX;
  private vy: number = BOMB.startVY;

  constructor(
    public x: number,
    public y: number,
  ) {}

  get sprite(): Sprite {
    const s = sprites();
    // Pick the frame closest to the direction of travel.
    const angle = Math.atan2(this.vy, this.vx);
    if (angle < Math.PI / 6) return s.bombLevel;
    if (angle < Math.PI / 3) return s.bombAngled;
    return s.bombDive;
  }

  /** Move one frame. Returns false once the bomb has left the playfield. */
  update(): boolean {
    this.vx = Math.max(BOMB.minVX, this.vx - BOMB.dragVX);
    this.vy = Math.min(BOMB.maxVY, this.vy + BOMB.gravity);
    this.x += this.vx;
    this.y += this.vy;
    return this.x < SCREEN_W && this.y < PLAYFIELD_BOTTOM;
  }

  hitsTerrain(world: World, scroll: number): boolean {
    return spriteHitsTerrain(world, scroll, this.sprite, this.left, this.top);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawSprite(ctx, this.sprite, this.left, this.top);
  }

  /** Top-left of the current frame, screen space. */
  get left(): number {
    return this.x - Math.floor(this.sprite.w / 2);
  }

  get top(): number {
    return this.y - Math.floor(this.sprite.h / 2);
  }
}
