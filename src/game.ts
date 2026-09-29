import {
  BOMB,
  FPS,
  FUEL,
  GAME_OVER_FRAMES,
  LASER,
  PLAYER,
  PLAYFIELD_BOTTOM,
  SCREEN_W,
  WORLD,
} from './core/config';
import type { Sounds } from './audio/audio';
import { difficultyFor } from './core/difficulty';
import type { Input } from './core/input';
import { Rng } from './core/rng';
import { EXTRA_LIFE_AT, SCORES } from './core/scores';
import type { TestMode } from './core/testmode';
import { drawTextAt } from './gfx/font';
import { PAL } from './gfx/palette';
import { SHIP_BOMB_BAY, SHIP_NOSE, sprites } from './gfx/sprites';
import { Starfield } from './gfx/starfield';
import { drawTerrain } from './gfx/terrain';
import { Base, Enemy, Fireball, FuelTank, MysteryTarget, Rocket, Ufo } from './entities/enemies';
import { Explosion } from './entities/explosion';
import { Player } from './entities/player';
import { Bomb, Shot } from './entities/weapons';
import { drawHud, type HudState } from './ui/hud';
import { spriteHitsRect, spriteHitsTerrain, spritesOverlap } from './world/collision';
import { Spawner, type Spawn } from './world/spawner';
import { MISSION } from './world/stages';
import type { AirKind } from './world/stages/types';
import { Waves } from './world/waves';
import { World } from './world/world';

/**
 * playing:  normal play.
 * dying:    the ship has exploded; the world is frozen until respawn.
 * gameOver: out of lives; shows GAME OVER, then starts a new game.
 */
type State = 'playing' | 'dying' | 'gameOver';

/** Low-fuel alarm repeat interval, frames. */
const FUEL_ALARM_FRAMES = 30;
/** How long SOUND ON / SOUND OFF shows after pressing M, frames. */
const SOUND_MESSAGE_FRAMES = 90;

/** Resolve the (single) stage with a baseLoop to world coordinates. */
function findBaseLoop(world: World): { stage: number; from: number; to: number } | null {
  const stage = world.stages.findIndex((s) => s.baseLoop);
  const loop = world.stages[stage]?.baseLoop;
  if (!loop) return null;
  const start = world.sectionStarts[stage];
  return { stage, from: start + loop.from, to: start + loop.to };
}

/** Extra blasts around the base when it goes up (offsets from its centre). */
const BASE_BLAST: readonly (readonly [number, number])[] = [
  [-14, -6], [14, -6], [-8, 8], [8, 8], [0, -14],
];

/**
 * Top-level game state: the full six-stage mission, looping, with
 * difficulty rising each time the base is destroyed.
 */
export class Game {
  private readonly rng = new Rng();
  private readonly starfield = new Starfield(this.rng);
  private readonly world = new World(MISSION);
  private readonly spawner = new Spawner(this.world);
  private readonly waves = new Waves(MISSION);
  private readonly player = new Player();
  private shots: Shot[] = [];
  private bombs: Bomb[] = [];
  private enemies: Enemy[] = [];
  private explosions: Explosion[] = [];

  /** World x of screen column 0. */
  private scroll = 0;
  /** Frames of flight left in the tank. */
  private fuel: number = FUEL.fullFrames;
  /** Rises each time the base is destroyed. */
  private difficulty = difficultyFor(0);
  /** Counts flying frames towards the next flight bonus. */
  private flightFrames = 0;
  private extraLifeGiven = false;
  private state: State = 'playing';
  private stateTimer = 0;
  /** Section to restart from after losing a life. */
  private checkpoint = 0;
  /** The base stage's repeating stretch, in world x of the first loop (if any). */
  private readonly baseLoop = findBaseLoop(this.world);
  /** The base has been destroyed and the ship hasn't left the base stage yet. */
  private baseDestroyed = false;
  /** Section the ship was in last frame, to notice stage changes. */
  private lastSection = 0;
  /** Frames left to show the SOUND ON / SOUND OFF message. */
  private soundMessage = 0;
  private muted = false;
  private paused = false;

  private readonly hud: HudState = {
    frame: 0,
    scores: [0, 0],
    highScore: 10000,
    activePlayer: 0,
    twoPlayerGame: false,
    section: 0,
    fuel: 1,
    reserveLives: PLAYER.startLives - 1,
    flags: 0,
  };

  constructor(
    private readonly input: Input,
    private readonly test: TestMode,
    private readonly sounds: Sounds,
  ) {
    this.newGame();
  }

  update(): void {
    this.input.poll();
    if (this.input.pressed('mute')) {
      this.muted = this.sounds.toggleMute();
      this.soundMessage = SOUND_MESSAGE_FRAMES;
    }
    if (this.soundMessage > 0) this.soundMessage--;
    if (this.input.pressed('pause')) this.paused = !this.paused;
    this.sounds.setEngine(!this.paused && this.state === 'playing' && this.player.mode === 'flying');
    if (this.paused) return;

    this.hud.frame++;
    this.starfield.update();
    this.explosions = this.explosions.filter((e) => e.update());

    switch (this.state) {
      case 'playing':
        this.updatePlaying();
        break;
      case 'dying':
        this.player.update(this.input);
        if (--this.stateTimer <= 0) this.afterDeath();
        break;
      case 'gameOver':
        if (--this.stateTimer <= 0) this.newGame();
        break;
    }

    this.hud.fuel = this.fuel / FUEL.fullFrames;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PAL.black;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.starfield.draw(ctx);
    drawTerrain(ctx, this.world, this.scroll);
    for (const e of this.enemies) e.draw(ctx, this.scroll);
    for (const x of this.explosions) x.draw(ctx, this.scroll);
    for (const b of this.bombs) b.draw(ctx);
    for (const s of this.shots) s.draw(ctx);
    if (this.state !== 'gameOver') this.player.draw(ctx);
    drawHud(ctx, this.hud);
    if (this.test.active) drawTextAt(ctx, 'TEST', 23, 30, PAL.magenta);
    if (this.state === 'gameOver') drawTextAt(ctx, 'GAME OVER', 9, 16, PAL.red);
    if (this.paused) drawTextAt(ctx, 'PAUSE', 11, 18, PAL.white);
    if (this.soundMessage > 0) {
      drawTextAt(ctx, this.muted ? 'SOUND OFF' : 'SOUND ON', 9, 20, PAL.yellow);
    }
  }

  private newGame(): void {
    this.hud.scores = [0, 0];
    this.hud.reserveLives = PLAYER.startLives - 1;
    this.hud.flags = 0;
    this.difficulty = difficultyFor(0);
    this.extraLifeGiven = false;
    this.startLife(this.test.startStage);
  }

  /** Put a fresh ship at the start of the given section, with its targets restored. */
  private startLife(section: number): void {
    this.scroll = this.world.sectionStarts[section];
    this.checkpoint = section;
    this.hud.section = section;
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

  private updatePlaying(): void {
    const { player, input, world } = this;
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

    player.update(input);

    if (player.mode === 'flying') {
      if (!this.test.infiniteFuel) {
        this.fuel = Math.max(0, this.fuel - this.difficulty.fuelDrain);
      }
      if (this.fuel <= 0) player.startFalling();
      const low = this.fuel / FUEL.fullFrames <= FUEL.lowFraction;
      if (low && this.fuel > 0 && this.hud.frame % FUEL_ALARM_FRAMES === 0) {
        this.sounds.play('fuelLow');
      }
      if (++this.flightFrames >= FPS) {
        this.flightFrames = 0;
        this.addScore(SCORES.flightPerSecond);
      }
    }

    if (player.mode === 'flying') {
      if (input.pressed('fire') && this.shots.length < LASER.maxOnScreen) {
        this.shots.push(new Shot(player.x + SHIP_NOSE.x, player.y + SHIP_NOSE.y));
        this.sounds.play('laser');
      }
      if (input.pressed('bomb') && this.bombs.length < BOMB.maxOnScreen) {
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
    this.hud.section = section;
    if (section !== this.lastSection) this.sounds.play('stageJingle');
    this.lastSection = section;
    if (this.baseLoop && section !== this.baseLoop.stage) this.baseDestroyed = false;
    this.checkpoint =
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
    this.hud.flags++;
    this.difficulty = difficultyFor(this.hud.flags);
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
    const p = this.hud.activePlayer;
    const before = this.hud.scores[p];
    const after = before + points;
    this.hud.scores[p] = after;
    if (after > this.hud.highScore) this.hud.highScore = after;
    if (EXTRA_LIFE_AT > 0 && !this.extraLifeGiven && before < EXTRA_LIFE_AT && after >= EXTRA_LIFE_AT) {
      this.extraLifeGiven = true;
      this.hud.reserveLives++;
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

  private afterDeath(): void {
    if (this.hud.reserveLives > 0) {
      this.hud.reserveLives--;
      this.startLife(this.checkpoint);
    } else {
      this.state = 'gameOver';
      this.stateTimer = GAME_OVER_FRAMES;
    }
  }
}
