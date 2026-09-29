import { FIREBALL, PLAYFIELD_TOP, ROCKET, SCREEN_W, UFO } from '../core/config';
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
  /** False for things that shots and bombs pass straight through. */
  readonly shootable: boolean = true;
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

/** Frames per UFO light-chase step. */
const UFO_ANIM_FRAMES = 6;

/**
 * UFO: drifts left along the middle of the cave passage, swinging up and down
 * on a sine wave. The swing shrinks where the passage is too narrow for it.
 */
export class Ufo extends Enemy {
  /** Enters at the right edge of the screen, on the passage centre line. */
  static spawn(world: World, scroll: number): Ufo {
    const wx = scroll + SCREEN_W;
    const ufo = new Ufo(wx, 0);
    ufo.y = ufo.pathY(world);
    return ufo;
  }

  get sprite(): Sprite {
    const s = sprites();
    return [s.ufoA, s.ufoB, s.ufoC][Math.floor(this.frame / UFO_ANIM_FRAMES) % 3];
  }

  points(): number {
    return SCORES.ufo;
  }

  update(env: EnemyEnv): void {
    super.update(env);
    this.wx -= UFO.speed;
    this.y = this.pathY(env.world);
  }

  /** Top-edge y for the current position on the path. */
  private pathY(world: World): number {
    const h = this.sprite.h;
    const cx = this.wx + this.sprite.w / 2;
    const ceil = world.ceilY(cx);
    const floor = world.floorY(cx);
    const room = (floor - ceil - h) / 2 - UFO.margin;
    const amp = Math.max(0, Math.min(UFO.amplitude, room));
    const mid = (ceil + floor) / 2;
    const swing = Math.sin((this.frame / UFO.period) * Math.PI * 2);
    return Math.round(mid + amp * swing - h / 2);
  }
}

/** Frames per fireball flicker step. */
const FIREBALL_ANIM_FRAMES = 4;

/** Fireball: streaks straight left. Cannot be destroyed, only dodged. */
export class Fireball extends Enemy {
  readonly shootable = false;

  /** Enters at the right edge at a random height in the open sky. */
  static spawn(world: World, scroll: number, rng: Rng): Fireball {
    const h = sprites().fireballA.h;
    // Keep clear of the highest ground currently on screen.
    let ground = Infinity;
    for (let x = 0; x < SCREEN_W; x++) ground = Math.min(ground, world.floorY(scroll + x));
    const top = PLAYFIELD_TOP + FIREBALL.topMargin;
    const bottom = Math.max(top, ground - FIREBALL.groundMargin - h);
    return new Fireball(scroll + SCREEN_W, rng.range(top, bottom));
  }

  get sprite(): Sprite {
    const s = sprites();
    return Math.floor(this.frame / FIREBALL_ANIM_FRAMES) % 2 === 0 ? s.fireballA : s.fireballB;
  }

  points(): number {
    return 0;
  }

  update(env: EnemyEnv): void {
    super.update(env);
    this.wx -= FIREBALL.speed;
    // Fizzles out if it meets rising ground.
    if (spriteHitsTerrain(env.world, env.scroll, this.sprite, this.screenX(env.scroll), this.y)) {
      this.dead = true;
    }
  }
}
