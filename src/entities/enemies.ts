import { PLAYFIELD_TOP, ROCKET } from '../core/config';
import type { Rng } from '../core/rng';
import { SCORES } from '../core/scores';
import { drawSprite, type Sprite } from '../gfx/sprite';
import { sprites } from '../gfx/sprites';
import { spriteHitsTerrain } from '../world/collision';
import type { World } from '../world/world';

/** What enemies can see of the game each frame. */
export interface EnemyEnv {
  world: World;
  scroll: number;
  /** Ship's screen x (left edge). */
  playerX: number;
}

/** Frames per rocket-exhaust animation step. */
const ROCKET_FLAME_FRAMES = 3;

/**
 * Anything that can be shot or bombed, and that kills the ship on contact.
 * Positions are world x (left edge) and screen y (top edge), so objects
 * scroll with the terrain.
 */
export abstract class Enemy {
  dead = false;
  protected frame = 0;

  constructor(
    public wx: number,
    public y: number,
  ) {}

  /** Current frame, used for both drawing and collision. */
  abstract get sprite(): Sprite;

  /** Points for destroying it now. */
  abstract points(rng: Rng): number;

  screenX(scroll: number): number {
    return this.wx - scroll;
  }

  /** Centre, in world x / screen y, for spawning its explosion. */
  center(): { wx: number; y: number } {
    const s = this.sprite;
    return { wx: this.wx + s.w / 2, y: this.y + s.h / 2 };
  }

  update(env: EnemyEnv): void {
    this.frame++;
    // Gone once it has scrolled off the left edge.
    if (this.screenX(env.scroll) + this.sprite.w < 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, scroll: number): void {
    drawSprite(ctx, this.sprite, this.screenX(scroll), this.y);
  }
}

/** A ground rocket. Some stay on the pad; the rest launch straight up as the ship nears. */
export class Rocket extends Enemy {
  private flying = false;
  private vy = 0;
  private readonly willLaunch: boolean;
  private readonly trigger: number;

  constructor(wx: number, y: number, rng: Rng) {
    super(wx, y);
    this.willLaunch = rng.next() < ROCKET.launchChance;
    this.trigger = rng.range(ROCKET.triggerMin, ROCKET.triggerMax);
  }

  get sprite(): Sprite {
    return sprites().rocket;
  }

  points(): number {
    return this.flying ? SCORES.rocketFlying : SCORES.rocketGrounded;
  }

  update(env: EnemyEnv): void {
    super.update(env);
    if (!this.flying) {
      if (this.willLaunch && this.screenX(env.scroll) - env.playerX <= this.trigger) {
        this.flying = true;
        this.vy = ROCKET.startSpeed;
      }
      return;
    }
    this.vy = Math.min(ROCKET.maxSpeed, this.vy + ROCKET.accel);
    this.y -= this.vy;
    if (this.y + this.sprite.h < PLAYFIELD_TOP) this.dead = true;
    // A rocket flying into a ceiling is simply destroyed (no points).
    else if (spriteHitsTerrain(env.world, env.scroll, this.sprite, this.screenX(env.scroll), this.y)) {
      this.dead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D, scroll: number): void {
    if (this.flying) {
      const s = sprites();
      const flame =
        Math.floor(this.frame / ROCKET_FLAME_FRAMES) % 2 === 0 ? s.rocketFlameA : s.rocketFlameB;
      drawSprite(ctx, flame, this.screenX(scroll), this.y + this.sprite.h);
    }
    super.draw(ctx, scroll);
  }
}

export class FuelTank extends Enemy {
  get sprite(): Sprite {
    return sprites().fuelTank;
  }

  points(): number {
    return SCORES.fuelTank;
  }
}

export class MysteryTarget extends Enemy {
  get sprite(): Sprite {
    return sprites().mystery;
  }

  points(rng: Rng): number {
    return rng.pick(SCORES.mystery);
  }
}
