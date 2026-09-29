import {
  BOMB,
  FPS,
  FUEL,
  GAME_OVER_FRAMES,
  LASER,
  PLAYER,
  PLAYFIELD_BOTTOM,
  WORLD,
} from './core/config';
import type { Input } from './core/input';
import { Rng } from './core/rng';
import { EXTRA_LIFE_AT, SCORES } from './core/scores';
import { drawTextAt } from './gfx/font';
import { PAL } from './gfx/palette';
import { SHIP_BOMB_BAY, SHIP_NOSE, sprites } from './gfx/sprites';
import { Starfield } from './gfx/starfield';
import { drawTerrain } from './gfx/terrain';
import { Enemy, FuelTank, MysteryTarget, Rocket } from './entities/enemies';
import { Explosion } from './entities/explosion';
import { Player } from './entities/player';
import { Bomb, Shot } from './entities/weapons';
import { drawHud, type HudState } from './ui/hud';
import { spriteHitsRect, spriteHitsTerrain, spritesOverlap } from './world/collision';
import { Spawner, type Spawn } from './world/spawner';
import { MISSION } from './world/stages';
import { World } from './world/world';

/**
 * playing:  normal play.
 * dying:    the ship has exploded; the world is frozen until respawn.
 * gameOver: out of lives; shows GAME OVER, then starts a new game.
 */
type State = 'playing' | 'dying' | 'gameOver';

/**
 * Top-level game state. Phase 3: stage 1 with rockets, fuel tanks, mystery
 * targets, explosions and scoring.
 */
export class Game {
  private readonly rng = new Rng();
  private readonly starfield = new Starfield(this.rng);
  private readonly world = new World(MISSION);
  private readonly spawner = new Spawner(this.world);
  private readonly player = new Player();
  private shots: Shot[] = [];
  private bombs: Bomb[] = [];
  private enemies: Enemy[] = [];
  private explosions: Explosion[] = [];

  /** World x of screen column 0. */
  private scroll = 0;
  /** Frames of flight left in the tank. */
  private fuel: number = FUEL.fullFrames;
  /** Counts flying frames towards the next flight bonus. */
  private flightFrames = 0;
  private extraLifeGiven = false;
  private state: State = 'playing';
  private stateTimer = 0;
  /** Section to restart from after losing a life. */
  private checkpoint = 0;
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

  constructor(private readonly input: Input) {
    this.newGame();
  }

  update(): void {
    this.input.poll();
    if (this.input.pressed('pause')) this.paused = !this.paused;
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
    if (this.state === 'gameOver') drawTextAt(ctx, 'GAME OVER', 9, 16, PAL.red);
    if (this.paused) drawTextAt(ctx, 'PAUSE', 11, 18, PAL.white);
  }

  private newGame(): void {
    this.hud.scores = [0, 0];
    this.hud.reserveLives = PLAYER.startLives - 1;
    this.hud.flags = 0;
    this.extraLifeGiven = false;
    this.startLife(0);
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
    this.state = 'playing';
  }

  private updatePlaying(): void {
    const { player, input, world } = this;
    this.scroll += WORLD.scrollSpeed;
    for (const spawn of this.spawner.take(this.scroll)) this.enemies.push(this.createEnemy(spawn));

    player.update(input);

    if (player.mode === 'flying') {
      this.fuel = Math.max(0, this.fuel - 1);
      if (this.fuel === 0) player.startFalling();
      if (++this.flightFrames >= FPS) {
        this.flightFrames = 0;
        this.addScore(SCORES.flightPerSecond);
      }
    }

    if (player.mode === 'flying') {
      if (input.pressed('fire') && this.shots.length < LASER.maxOnScreen) {
        this.shots.push(new Shot(player.x + SHIP_NOSE.x, player.y + SHIP_NOSE.y));
      }
      if (input.pressed('bomb') && this.bombs.length < BOMB.maxOnScreen) {
        this.bombs.push(new Bomb(player.x + SHIP_BOMB_BAY.x, player.y + SHIP_BOMB_BAY.y));
      }
    }

    const env = { world, scroll: this.scroll, playerX: player.x };
    for (const e of this.enemies) e.update(env);

    this.updateShots();
    this.updateBombs();
    this.enemies = this.enemies.filter((e) => !e.dead);

    // The section is wherever the ship is; it becomes the restart point.
    const section = world.section(this.scroll + player.x);
    this.hud.section = section;
    this.checkpoint = section;

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
        (e) => !e.dead && spriteHitsRect(e.sprite, e.screenX(this.scroll), e.y, x0, shot.y, pathW, 1),
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
          spritesOverlap(bomb.sprite, bomb.left, bomb.top, e.sprite, e.screenX(this.scroll), e.y),
      );
      if (target) {
        this.destroy(target);
        return false;
      }
      if (bomb.hitsTerrain(this.world, this.scroll)) {
        this.explosions.push(Explosion.puff(this.scroll + bomb.x, bomb.y));
        return false;
      }
      return true;
    });
  }

  private playerCollides(): boolean {
    const { player, scroll } = this;
    const ship = sprites().ship;
    if (player.y >= PLAYFIELD_BOTTOM) return true;
    if (spriteHitsTerrain(this.world, scroll, ship, player.x, player.y)) return true;
    return this.enemies.some(
      (e) => !e.dead && spritesOverlap(ship, player.x, player.y, e.sprite, e.screenX(scroll), e.y),
    );
  }

  private createEnemy(spawn: Spawn): Enemy {
    switch (spawn.kind) {
      case 'rocket':
        return new Rocket(spawn.wx, spawn.y, this.rng);
      case 'fuel':
        return new FuelTank(spawn.wx, spawn.y);
      case 'mystery':
        return new MysteryTarget(spawn.wx, spawn.y);
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
    // Only mystery targets show their value, since it is a surprise.
    const label = enemy instanceof MysteryTarget ? String(points) : undefined;
    this.explosions.push(Explosion.big(wx, y, label));
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
    }
  }

  private die(): void {
    this.player.explode();
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
