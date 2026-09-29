import { SCREEN_W, TILE } from '../core/config';
import type { ScoreEntry } from '../core/highscores';
import { SCORES } from '../core/scores';
import { drawText, drawTextCentered, drawTextRight, drawTextScaled } from '../gfx/font';
import { PAL } from '../gfx/palette';
import { drawSprite, type Sprite } from '../gfx/sprite';
import { sprites } from '../gfx/sprites';

/** Blink on/off every 16 frames. */
const blink = (frame: number) => Math.floor(frame / 16) % 2 === 0;

const TITLE = 'SORTIE';
const TITLE_SCALE = 2;

/** `credit` is the bottom line (FREE PLAY / CREDIT n); `canStart` picks PUSH START vs INSERT COIN. */
export function drawTitle(
  ctx: CanvasRenderingContext2D,
  frame: number,
  credit: string,
  canStart: boolean,
): void {
  const w = TITLE.length * TILE * TITLE_SCALE;
  const x = Math.floor((SCREEN_W - w) / 2);
  const y = 7 * TILE;
  drawTextScaled(ctx, TITLE, x + 2, y + 2, TITLE_SCALE, PAL.red);
  drawTextScaled(ctx, TITLE, x, y, TITLE_SCALE, PAL.yellow);

  // A ship sweeps across under the title.
  const s = sprites();
  const shipX = (frame % (SCREEN_W + 40)) - 20;
  drawSprite(ctx, Math.floor(frame / 3) % 2 === 0 ? s.flameA : s.flameB, shipX - 4, 12 * TILE + 4);
  drawSprite(ctx, s.ship, shipX, 12 * TILE);

  if (blink(frame)) drawTextCentered(ctx, canStart ? 'PUSH START' : 'INSERT COIN', 15, PAL.white);
  // Two-column tables: equal-length lines keep the columns aligned when centred.
  const table = (rows: readonly (readonly [string, string])[], keyW: number, first: number, color: string) =>
    rows.forEach(([key, what], i) => {
      drawTextCentered(ctx, key.padEnd(keyW) + what.padEnd(9), first + i, color);
    });
  table([['1 OR ENTER', '1 PLAYER'], ['2', '2 PLAYERS']], 12, 18, PAL.cyan);
  table(
    [['ARROWS/WASD', 'MOVE'], ['SPACE', 'FIRE'], ['X', 'BOMB'], ['P', 'PAUSE'], ['M', 'SOUND']],
    12,
    21,
    PAL.blue,
  );
  drawTextCentered(ctx, credit, 27, PAL.yellow);
}

export function drawScoreTable(ctx: CanvasRenderingContext2D): void {
  drawTextCentered(ctx, '- SCORE TABLE -', 5, PAL.yellow);
  const s = sprites();
  const rows: [Sprite, string][] = [
    [s.rocket, `${SCORES.rocketGrounded} / ${SCORES.rocketFlying} PTS`],
    [s.ufoA, `${SCORES.ufo} PTS`],
    [s.fuelTank, `${SCORES.fuelTank} PTS`],
    [s.mystery, `${SCORES.mystery.join('/')} PTS`],
    [s.base, `${SCORES.base} PTS`],
    [s.fireballA, 'DODGE IT!'],
  ];
  rows.forEach(([sprite, text], i) => {
    const row = 8 + i * 3;
    const cy = row * TILE + 4;
    drawSprite(ctx, sprite, 6 * TILE - Math.floor(sprite.w / 2), cy - Math.floor(sprite.h / 2));
    drawText(ctx, text, 9 * TILE, row * TILE, PAL.white);
  });
  drawTextCentered(ctx, `${SCORES.flightPerSecond} PTS PER SECOND FLOWN`, 26, PAL.cyan);
}

const ORDINALS = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];

/** The top-10 table; `highlight` (a rank) blinks, e.g. a newly entered score. */
export function drawHighScores(
  ctx: CanvasRenderingContext2D,
  entries: readonly ScoreEntry[],
  frame: number,
  highlight = -1,
): void {
  drawTextCentered(ctx, '- HIGH SCORES -', 5, PAL.yellow);
  entries.forEach((e, i) => {
    if (i === highlight && !blink(frame)) return;
    const y = (8 + i * 2) * TILE;
    const color = i === highlight ? PAL.white : i === 0 ? PAL.yellow : PAL.cyan;
    drawText(ctx, ORDINALS[i], 4 * TILE, y, color);
    drawTextRight(ctx, String(e.score), 17 * TILE, y, color);
    drawText(ctx, e.initials, 20 * TILE, y, color);
  });
}
