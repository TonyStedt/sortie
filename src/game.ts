import { PLAYER } from './core/config';
import type { Input } from './core/input';
import { Rng } from './core/rng';
import { PAL } from './gfx/palette';
import { Starfield } from './gfx/starfield';
import { drawTextAt } from './gfx/font';
import { Player } from './entities/player';
import { drawHud, type HudState } from './ui/hud';

/**
 * Top-level game state. Phase 1: free flight over the starfield with the HUD
 * skeleton; no terrain, enemies or fuel drain yet.
 */
export class Game {
  private readonly rng = new Rng();
  private readonly starfield = new Starfield(this.rng);
  private readonly player = new Player();
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

  constructor(private readonly input: Input) {}

  update(): void {
    this.input.poll();
    if (this.input.pressed('pause')) this.paused = !this.paused;
    if (this.paused) return;

    this.hud.frame++;
    this.starfield.update();
    this.player.update(this.input);
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PAL.black;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.starfield.draw(ctx);
    this.player.draw(ctx);
    drawHud(ctx, this.hud);
    if (this.paused) drawTextAt(ctx, 'PAUSE', 11, 16, PAL.white);
  }
}
