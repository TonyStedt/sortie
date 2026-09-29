import {
  BOMB,
  FUEL,
  GAME_OVER_FRAMES,
  LASER,
  PLAYER,
  PLAYFIELD_BOTTOM,
  WORLD,
} from './core/config';
import type { Input } from './core/input';
import { Rng } from './core/rng';
import { drawTextAt } from './gfx/font';
import { PAL } from './gfx/palette';
import { SHIP_BOMB_BAY, SHIP_NOSE, sprites } from './gfx/sprites';
import { Starfield } from './gfx/starfield';
import { drawTerrain } from './gfx/terrain';
import { Player } from './entities/player';
import { Bomb, Shot } from './entities/weapons';
import { drawHud, type HudState } from './ui/hud';
import { spriteHitsTerrain } from './world/collision';
import { MISSION } from './world/stages';
import { World } from './world/world';

/**
 * playing:  normal play.
 * dying:    the ship has exploded; the world is frozen until respawn.
 * gameOver: out of lives; shows GAME OVER, then starts a new game.
 */
type State = 'playing' | 'dying' | 'gameOver';

/**
 * Top-level game state. Phase 2: scrolling stage 1 terrain, terrain collision,
 * laser, bombs, and fuel. No enemies or scoring yet.
 */
export class Game {
  private readonly rng = new Rng();
  private readonly starfield = new Starfield(this.rng);
  private readonly world = new World(MISSION);
  private readonly player = new Player();
  private shots: Shot[] = [];
  private bombs: Bomb[] = [];

  /** World x of screen column 0. */
  private scroll = 0;
  /** Frames of flight left in the tank. */
  private fuel: number = FUEL.fullFrames;
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
    this.startLife(0);
  }

  /** Put a fresh ship at the start of the given section. */
  private startLife(section: number): void {
    this.scroll = this.world.sectionStarts[section];
    this.checkpoint = section;
    this.hud.section = section;
    this.fuel = FUEL.fullFrames;
    this.player.reset();
    this.shots = [];
    this.bombs = [];
    this.state = 'playing';
  }

  private updatePlaying(): void {
    const { player, input, world } = this;
    this.scroll += WORLD.scrollSpeed;
    player.update(input);

    if (player.mode === 'flying') {
      this.fuel = Math.max(0, this.fuel - 1);
      if (this.fuel === 0) player.startFalling();
    }

    if (player.mode === 'flying') {
      if (input.pressed('fire') && this.shots.length < LASER.maxOnScreen) {
        this.shots.push(new Shot(player.x + SHIP_NOSE.x, player.y + SHIP_NOSE.y));
      }
      if (input.pressed('bomb') && this.bombs.length < BOMB.maxOnScreen) {
        this.bombs.push(new Bomb(player.x + SHIP_BOMB_BAY.x, player.y + SHIP_BOMB_BAY.y));
      }
    }

    this.shots = this.shots.filter((s) => s.update(world, this.scroll));
    this.bombs = this.bombs.filter((b) => b.update(world, this.scroll));

    // The section is wherever the ship is; it becomes the restart point.
    const section = world.section(this.scroll + player.x);
    this.hud.section = section;
    this.checkpoint = section;

    if (
      spriteHitsTerrain(world, this.scroll, sprites().ship, player.x, player.y) ||
      player.y >= PLAYFIELD_BOTTOM
    ) {
      this.die();
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
