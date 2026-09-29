import { FLOW, TILE } from '../core/config';
import type { Controls } from '../core/controls';
import { drawText, drawTextCentered } from '../gfx/font';
import { PAL } from '../gfx/palette';

/** Letters available for initials, in cycling order. */
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.- ';
/** Holding up/down repeats after this many frames, then every REPEAT_EVERY. */
const REPEAT_DELAY = 20;
const REPEAT_EVERY = 6;

/**
 * High-score initials entry. Up/down picks a letter, fire (or right) moves
 * on, bomb (or left) goes back, START finishes early. Accepts whatever is
 * there when time runs out.
 */
export class InitialsEntry {
  private readonly letters = [0, 0, 0];
  private cursor = 0;
  private timer: number = FLOW.entryFrames;
  private held = 0;
  done = false;

  constructor(
    readonly player: number,
    readonly score: number,
  ) {}

  get initials(): string {
    return this.letters.map((i) => CHARSET[i]).join('');
  }

  update(c: Controls): void {
    if (this.done) return;
    if (--this.timer <= 0) {
      this.done = true;
      return;
    }
    const dir = c.axis().y;
    this.held = dir === 0 ? 0 : this.held + 1;
    const step =
      this.held === 1 || (this.held > REPEAT_DELAY && (this.held - REPEAT_DELAY) % REPEAT_EVERY === 0);
    if (dir !== 0 && step) {
      // Up goes forward through the alphabet.
      const n = CHARSET.length;
      this.letters[this.cursor] = (this.letters[this.cursor] - dir + n) % n;
    }
    if (c.pressed('fire') || c.pressed('right')) {
      if (++this.cursor >= this.letters.length) this.done = true;
    }
    if ((c.pressed('bomb') || c.pressed('left')) && this.cursor > 0) this.cursor--;
    if (c.pressed('start')) this.done = true;
  }

  draw(ctx: CanvasRenderingContext2D, frame: number): void {
    drawTextCentered(ctx, `PLAYER ${this.player + 1}`, 6, PAL.cyan);
    drawTextCentered(ctx, 'YOU HAVE A HIGH SCORE', 9, PAL.yellow);
    drawTextCentered(ctx, String(this.score), 11, PAL.white);
    drawTextCentered(ctx, 'ENTER YOUR INITIALS', 14, PAL.yellow);

    const x0 = Math.floor((28 - 5) / 2) * TILE;
    this.letters.forEach((l, i) => {
      const x = x0 + i * 2 * TILE;
      const current = i === this.cursor;
      if (!current || Math.floor(frame / 8) % 2 === 0) {
        drawText(ctx, CHARSET[l], x, 17 * TILE, current ? PAL.white : PAL.cyan);
      }
      ctx.fillStyle = current ? PAL.white : PAL.blue;
      ctx.fillRect(x, 18 * TILE + 1, TILE - 1, 1);
    });

    const help = [['UP/DOWN', 'CHOOSE'], ['FIRE', 'NEXT'], ['BOMB', 'BACK'], ['START', 'DONE']];
    help.forEach(([key, what], i) => {
      drawTextCentered(ctx, key.padEnd(9) + what.padEnd(6), 20 + i, PAL.blue);
    });
    drawTextCentered(ctx, `TIME ${Math.ceil(this.timer / 60)}`, 26, PAL.red);
  }
}
