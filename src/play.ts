import type { Sounds } from './audio/audio';
import { BOMB, FPS, FUEL, LASER, PLAYER, PLAYFIELD_BOTTOM, SCREEN_W, WORLD } from './core/config';
import type { Controls } from './core/controls';
import { difficultyFor } from './core/difficulty';
import type { Rng } from './core/rng';
import { EXTRA_LIFE_AT, SCORES } from './core/scores';
import type { TestMode } from './core/testmode';
import { SHIP_BOMB_BAY, SHIP_NOSE, sprites } from './gfx/sprites';
import { drawTerrain } from './gfx/terrain';
import { Base, Enemy, Fireball, FuelTank, MysteryTarget, Rocket, Ufo } from './entities/enemies';
import { Explosion } from './entities/explosion';
import { Player } from './entities/player';
import { Bomb, Shot } from './entities/weapons';
import { spriteHitsRect, spriteHitsTerrain, spritesOverlap } from './world/collision';
import { Spawner, type Spawn } from './world/spawner';
import type { AirKind } from './world/stages/types';
import { Waves } from './world/waves';
import type { World } from './world/world';

/** Everything that belongs to one player and survives between turns. */
export interface PlayerStats {
  score: number;
  /** Ships left besides the one in play. */
  reserveLives: number;
  /** Completed missions (flags); sets the difficulty. */
  missions: number;
  extraLifeGiven: boolean;
  /** Section the next ship starts at. */
  checkpoint: number;
  /** Out of ships. */
  out: boolean;
}

export function newPlayerStats(startSection: number): PlayerStats {
  return {
    score: 0,
    reserveLives: PLAYER.startLives - 1,
    missions: 0,
    extraLifeGiven: false,
    checkpoint: startSection,
    out: false,
  };
}

/**
 * playing: the ship is in play.
 * dying:   the ship has exploded; the world is frozen for the respawn delay.
 * lost:    the delay is over; Game decides what happens next.
 */
export type PlayState = 'playing' | 'dying' | 'lost';

/** Low-fuel alarm repeat interval, frames. */
const FUEL_ALARM_FRAMES = 30;

/** Extra blasts around the base when it goes up (offsets from its centre). */
const BASE_BLAST: readonly (readonly [number, number])[] = [
  [-14, -6], [14, -6], [-8, 8], [8, 8], [0, -14],
];

/**
 * One player's turn at the mission: the scrolling world, the ship, enemies,
 * weapons, fuel and scoring. Game owns the flow around it (attract mode,
 * players taking turns, game over).
 */
export class Play {
  state: PlayState = 'lost';
  readonly player = new Player();
  /** World x of screen column 0. */
  scroll = 0;
  enemies: Enemy[] = [];

  private readonly spawner: Spawner;
  private readonly waves: Waves;
  private shots: Shot[] = [];
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
  /** Frames of flight left in the tank. */
  private fuel: number = FUEL.fullFrames;
  private difficulty = difficultyFor(0);
  /** Counts flying frames towards the next flight bonus. */
  private flightFrames = 0;
  private stateTimer = 0;
  private frame = 0;
  /** The base stage's repeating stretch, in world x of the first loop (if any). */
  private readonly baseLoop: { stage: number; from: number; to: number } | null;
  /** The base has been destroyed and the ship hasn't left the base stage yet. */
  private baseDestroyed = false;
  /** Section the ship was in last frame, to notice stage changes. */
  private lastSection = 0;

  private stats: PlayerStats = newPlayerStats(0);
  private sounds: Sounds = SILENT;
  private test: TestMode = NO_TEST;

  constructor(
    readonly world: World,
    private readonly rng: Rng,
  ) {
    this.spawner = new Spawner(world);
    this.waves = new Waves(world.stages);
    this.baseLoop = findBaseLoop(world);
  }

  /** Current section (stage index) for the HUD. */
  get section(): number {
    return this.lastSection;
  }

  /** Fuel remaining, 0..1, for the HUD. */
  get fuelFraction(): number {
    return this.fuel / FUEL.fullFrames;
  }

  /** Start a ship for this player at their checkpoint, with the section's targets restored. */
  begin(stats: PlayerStats, sounds: Sounds, test: TestMode): void {
    this.stats = stats;
    this.sounds = sounds;
    this.test = test;
    this.difficulty = difficultyFor(stats.missions);

    const section = stats.checkpoint;
    this.scroll = this.world.sectionStarts[section];
    this.fuel = FUEL.fullFrames;
    this.flightFrames = 0;
    this.player.reset();
    this.shots = [];
    this.bombs = [];
    this.enemies = [];
    this.explosions = [];
    this.spawner.reset(this.scroll);
    this.waves.reset();
    this.baseDestroyed = false;
    this.lastSection = section;
    this.state = 'playing';
  }

  update(controls: Controls): void {
    this.frame++;
    this.explosions = this.explosions.filter((e) => e.update());
    if (this.state === 'playing') this.updatePlaying(controls);
    else if (this.state === 'dying') {
      this.player.update(controls);
      if (--this.stateTimer <= 0) this.state = 'lost';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    drawTerrain(ctx, this.world, this.scroll);
    for (const e of this.enemies) e.draw(ctx, this.scroll);
    for (const x of this.explosions) x.draw(ctx, this.scroll);
    for (const b of this.bombs) b.draw(ctx);
    for (const s of this.shots) s.draw(ctx);
    if (this.state !== 'lost') this.player.draw(ctx);
  }

  private updatePlaying(controls: Controls): void {
    const { player, world } = this;
    this.scroll += WORLD.scrollSpeed;
    this.repeatBaseIfMissed();
    for (const spawn of this.spawner.take(this.scroll)) this.enemies.push(this.createEnemy(spawn));
    // Air waves run while the ship and the screen's right edge share a stage.
    const shipStage = world.section(this.scroll + player.x);
    const edgeStage = world.section(this.scroll + SCREEN_W - 1);
    const activeStage = shipStage === edgeStage ? shipStage : -1;
    for (const kind of this.waves.update(activeStage, this.difficulty.waveInterval)) {
      this.enemies.push(this.createAirEnemy(kind));
    }

    player.update(controls);

    if (player.mode === 'flying') {
      if (!this.test.infiniteFuel) {
        this.fuel = Math.max(0, this.fuel - this.difficulty.fuelDrain);
      }
      if (this.fuel <= 0) player.startFalling();
      const low = this.fuel / FUEL.fullFrames <= FUEL.lowFraction;
      if (low && this.fuel > 0 && this.frame % FUEL_ALARM_FRAMES === 0) {
        this.sounds.play('fuelLow');
      }
      if (++this.flightFrames >= FPS) {
        this.flightFrames = 0;
        this.addScore(SCORES.flightPerSecond);
      }
    }

    if (player.mode === 'flying') {
      if (controls.pressed('fire') && this.shots.length < LASER.maxOnScreen) {
        this.shots.push(new Shot(player.x + SHIP_NOSE.x, player.y + SHIP_NOSE.y));
        this.sounds.play('laser');
      }
      if (controls.pressed('bomb') && this.bombs.length < BOMB.maxOnScreen) {
        this.bombs.push(new Bomb(player.x + SHIP_BOMB_BAY.x, player.y + SHIP_BOMB_BAY.y));
        this.sounds.play('bomb');
      }
    }

    const env = {
      world,
      scroll: this.scroll,
      playerX: player.x,
      onRocketLaunch: () => this.sounds.play('rocketLaunch'),
    };
    for (const e of this.enemies) e.update(env);

    this.updateShots();
    this.updateBombs();
    for (const e of this.enemies) {
      if (!e.crashed) continue;
      this.explosions.push(Explosion.big(e.center().wx, e.center().y));
      this.sounds.play('smallExplosion');
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // The section is wherever the ship is; it becomes the restart point.
    // Once the base is destroyed, a death before stage 1 restarts at stage 1.
    const section = world.section(this.scroll + player.x);
    if (section !== this.lastSection) this.sounds.play('stageJingle');
    this.lastSection = section;
    if (this.baseLoop && section !== this.baseLoop.stage) this.baseDestroyed = false;
    this.stats.checkpoint =
      this.baseDestroyed && this.baseLoop ? (this.baseLoop.stage + 1) % world.stages.length : section;

    if (this.playerCollides()) this.die();
  }

  private updateShots(): void {
    const w = sprites().shot.w;
    this.shots = this.shots.filter((shot) => {
      const x0 = shot.x;
      const alive = shot.update(this.world, this.scroll);
      // Everything the shot passed through this frame, up to where it stopped.
      const pathW = shot.x + w - x0;
      const target = this.enemies.find(
        (e) =>
          !e.dead &&
          e.shootable &&
          spriteHitsRect(e.sprite, e.screenX(this.scroll), e.y, x0, shot.y, pathW, 1),
      );
      if (target) {
        this.destroy(target);
        return false;
      }
      return alive;
    });
  }

  private updateBombs(): void {
    this.bombs = this.bombs.filter((bomb) => {
      if (!bomb.update()) return false;
      const target = this.enemies.find(
        (e) =>
          !e.dead &&
          e.shootable &&
          spritesOverlap(bomb.sprite, bomb.left, bomb.top, e.sprite, e.screenX(this.scroll), e.y),
      );
      if (target) {
        this.destroy(target);
        return false;
      }
      if (bomb.hitsTerrain(this.world, this.scroll)) {
        this.explosions.push(Explosion.puff(this.scroll + bomb.x, bomb.y));
        this.sounds.play('bombHit');
        return false;
      }
      return true;
    });
  }

  private playerCollides(): boolean {
    const { player, scroll } = this;
    const ship = sprites().ship;
    // Falling out of the playfield (out of fuel) ends the life even in test mode.
    if (player.y >= PLAYFIELD_BOTTOM) return true;
    if (this.test.invincible) return false;
    if (spriteHitsTerrain(this.world, scroll, ship, player.x, player.y)) return true;
    return this.enemies.some(
      (e) => !e.dead && spritesOverlap(ship, player.x, player.y, e.sprite, e.screenX(scroll), e.y),
    );
  }

  private createEnemy(spawn: Spawn): Enemy {
    switch (spawn.kind) {
      case 'rocket':
        return new Rocket(spawn.wx, spawn.y, this.rng, this.difficulty);
      case 'fuel':
        return new FuelTank(spawn.wx, spawn.y);
      case 'mystery':
        return new MysteryTarget(spawn.wx, spawn.y);
      case 'base':
        return new Base(spawn.wx, spawn.y);
    }
  }

  private createAirEnemy(kind: AirKind): Enemy {
    switch (kind) {
      case 'ufo':
        return Ufo.spawn(this.world, this.scroll, this.difficulty);
      case 'fireball':
        return Fireball.spawn(this.world, this.scroll, this.rng, this.difficulty);
    }
  }

  /** An enemy was shot or bombed. */
  private destroy(enemy: Enemy): void {
    enemy.dead = true;
    const points = enemy.points(this.rng);
    this.addScore(points);
    if (enemy instanceof FuelTank) {
      this.fuel = Math.min(FUEL.fullFrames, this.fuel + FUEL.tankRefillFrames);
    }
    const { wx, y } = enemy.center();
    // Mystery targets show their surprise value; the base shows its bonus.
    const showValue = enemy instanceof MysteryTarget || enemy instanceof Base;
    this.explosions.push(Explosion.big(wx, y, showValue ? String(points) : undefined));
    if (enemy instanceof Base) this.missionComplete(wx, y);
    else this.sounds.play('smallExplosion');
  }

  /**
   * The base is destroyed: a flag is awarded and every later loop is harder.
   * Play carries straight on into stage 1.
   */
  private missionComplete(wx: number, y: number): void {
    for (const [dx, dy] of BASE_BLAST) this.explosions.push(Explosion.big(wx + dx, y + dy));
    this.stats.missions++;
    this.difficulty = difficultyFor(this.stats.missions);
    this.baseDestroyed = true;
    this.sounds.play('bigExplosion');
    this.sounds.play('missionComplete');
  }

  /**
   * The base was missed: when the screen's left edge reaches the end of the
   * base stretch, jump the view back to its start (the terrain there is
   * identical, so the jump can't be seen). The base and its guards come round
   * again; fuel doesn't.
   */
  private repeatBaseIfMissed(): void {
    const loop = this.baseLoop;
    if (!loop || this.baseDestroyed) return;
    const L = this.world.length;
    const local = ((this.scroll % L) + L) % L;
    if (local < loop.to || local >= loop.to + WORLD.scrollSpeed) return;
    const back = loop.to - loop.from;
    this.scroll -= back;
    for (const e of this.enemies) e.wx -= back;
    for (const x of this.explosions) x.shift(-back);
    this.spawner.resume(this.scroll);
  }

  private addScore(points: number): void {
    const s = this.stats;
    const before = s.score;
    s.score += points;
    if (EXTRA_LIFE_AT > 0 && !s.extraLifeGiven && before < EXTRA_LIFE_AT && s.score >= EXTRA_LIFE_AT) {
      s.extraLifeGiven = true;
      s.reserveLives++;
      this.sounds.play('extraLife');
    }
  }

  private die(): void {
    this.player.explode();
    this.sounds.play('playerDeath');
    this.shots = [];
    this.bombs = [];
    this.state = 'dying';
    this.stateTimer = PLAYER.respawnDelay;
  }
}

/** Resolve the (single) stage with a baseLoop to world coordinates. */
function findBaseLoop(world: World): { stage: number; from: number; to: number } | null {
  const stage = world.stages.findIndex((s) => s.baseLoop);
  const loop = world.stages[stage]?.baseLoop;
  if (!loop) return null;
  const start = world.sectionStarts[stage];
  return { stage, from: start + loop.from, to: start + loop.to };
}

/** No sound: used for the attract-mode demo. */
export const SILENT: Sounds = {
  play: () => {},
  setEngine: () => {},
  toggleMute: () => false,
};

/** Test mode off. */
export const NO_TEST: TestMode = {
  startStage: 0,
  invincible: false,
  infiniteFuel: false,
  active: false,
};
