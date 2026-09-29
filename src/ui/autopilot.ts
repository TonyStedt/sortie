import { PLAYER, PLAYFIELD_TOP } from '../core/config';
import type { Controls } from '../core/controls';
import type { Action } from '../core/input';
import { Fireball, Rocket, Ufo } from '../entities/enemies';
import { sprites } from '../gfx/sprites';
import type { Play } from '../play';

/** How far ahead of the ship's nose the autopilot reads the terrain, px. */
const LOOKAHEAD = 40;
/** Height kept above the ground in open sky, px. */
const CLEARANCE = 22;
/** Threats this far ahead (px) are steered around. */
const THREAT_RANGE = 80;
/** Cruising x position. */
const CRUISE_X = 36;

/**
 * Flies the attract-mode demo: follows the terrain, steers around moving
 * threats, fires at anything level with its nose and bombs ground targets.
 * It is a showcase, not a champion; it can and does crash.
 */
export class Autopilot implements Controls {
  private held = new Set<Action>();
  private prev = new Set<Action>();
  private frame = 0;

  reset(): void {
    this.held.clear();
    this.prev.clear();
    this.frame = 0;
  }

  /** Decide this frame's inputs. Call once per frame before Play.update. */
  think(play: Play): void {
    this.prev = this.held;
    this.held = new Set();
    this.frame++;
    const { world, scroll, player, enemies } = play;
    if (player.mode !== 'flying') return;
    const ship = sprites().ship;

    // The open band just ahead: lowest ceiling edge and highest ground or object.
    let floor = Infinity;
    let ceil = -Infinity;
    for (let dx = 0; dx < ship.w + LOOKAHEAD; dx++) {
      const wx = scroll + player.x + dx;
      floor = Math.min(floor, world.floorY(wx));
      ceil = Math.max(ceil, world.ceilY(wx));
    }
    for (const e of enemies) {
      const ex = e.screenX(scroll);
      const grounded = !(e instanceof Ufo || e instanceof Fireball || (e instanceof Rocket && e.isFlying));
      if (grounded && ex + e.sprite.w > player.x && ex < player.x + ship.w + LOOKAHEAD) {
        floor = Math.min(floor, e.y);
      }
    }
    const top = Math.max(PLAYER.minY, ceil + 3);
    const bottom = floor - ship.h - 3;
    let target = ceil > PLAYFIELD_TOP ? (top + bottom) / 2 : bottom - CLEARANCE;

    // Steer around the nearest moving threat whose path crosses ours.
    for (const e of enemies) {
      const moving = e instanceof Ufo || e instanceof Fireball || (e instanceof Rocket && e.isFlying);
      const ex = e.screenX(scroll);
      if (!moving || ex < player.x - 8 || ex > player.x + THREAT_RANGE) continue;
      const eTop = e.y - 4;
      const eBottom = e.y + e.sprite.h + 4;
      if (target + ship.h < eTop || target > eBottom) continue;
      const above = eTop - ship.h;
      const below = eBottom;
      // A launched rocket is climbing: duck under it and let it pass.
      if (e instanceof Rocket) target = below <= bottom ? below : above;
      else target = above >= top && (below > bottom || target - above < below - target) ? above : below;
      break;
    }
    target = Math.min(Math.max(target, top), Math.max(top, bottom));

    if (target < player.y - 1) this.held.add('up');
    else if (target > player.y + 1) this.held.add('down');
    if (player.x < CRUISE_X - 4) this.held.add('right');
    else if (player.x > CRUISE_X + 4) this.held.add('left');

    // Fire: rapidly when a target is level with the nose, otherwise now and then.
    const noseY = player.y + 5;
    const lined = enemies.some((e) => {
      const ex = e.screenX(scroll);
      return e.shootable && ex > player.x && noseY >= e.y - 1 && noseY <= e.y + e.sprite.h;
    });
    if (this.frame % (lined ? 6 : 18) === 0) this.held.add('fire');

    // Bomb ground targets coming up beneath the ship.
    const below = enemies.some((e) => {
      const dx = e.screenX(scroll) - player.x;
      return e.shootable && e.y > player.y + ship.h && dx > 16 && dx < 64;
    });
    if (below && this.frame % 12 === 0) this.held.add('bomb');
  }

  down(action: Action): boolean {
    return this.held.has(action);
  }

  pressed(action: Action): boolean {
    return this.held.has(action) && !this.prev.has(action);
  }

  axis(): { x: number; y: number } {
    return {
      x: (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0),
      y: (this.held.has('down') ? 1 : 0) - (this.held.has('up') ? 1 : 0),
    };
  }
}
