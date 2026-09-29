import { FUEL, SCREEN_H, SCREEN_W, TILE } from '../core/config';
import { drawText, drawTextAt, drawTextRight } from '../gfx/font';
import { PAL } from '../gfx/palette';
import { drawSprite } from '../gfx/sprite';
import { sprites } from '../gfx/sprites';

export const SECTION_LABELS = ['1ST', '2ND', '3RD', '4TH', '5TH', 'BASE'] as const;

export interface HudState {
  frame: number;
  scores: [number, number];
  highScore: number;
  /** 0 or 1. */
  activePlayer: number;
  twoPlayerGame: boolean;
  /** Current section, 0..5. */
  section: number;
  /** Fuel remaining, 0..1. */
  fuel: number;
  /** Reserve ships (not counting the one in play). */
  reserveLives: number;
  /** Completed missions. */
  flags: number;
}

/** Layout, in tile rows / pixels. */
const ROW_LABELS = 0;
const ROW_SCORES = 1;
const PROGRESS_LABEL_Y = 2 * TILE;
const PROGRESS_BAR_Y = 3 * TILE + 1;
const PROGRESS_BAR_H = 4;
const PROGRESS_MARGIN = 4;
const FUEL_Y = SCREEN_H - 2 * TILE;
const FUEL_BAR_X = 6 * TILE;
const FUEL_BAR_W = 16 * TILE;
const FUEL_BAR_H = 6;
const LIVES_Y = SCREEN_H - TILE;

/** Blink on/off every 16 frames (arcade-standard attention blink). */
const blink = (frame: number) => Math.floor(frame / 16) % 2 === 0;

export function drawHud(ctx: CanvasRenderingContext2D, s: HudState): void {
  drawScores(ctx, s);
  drawProgress(ctx, s);
  drawFuel(ctx, s);
  drawLivesAndFlags(ctx, s);
}

function drawScores(ctx: CanvasRenderingContext2D, s: HudState): void {
  // The active player's label blinks.
  if (s.activePlayer !== 0 || blink(s.frame)) drawTextAt(ctx, '1UP', 3, ROW_LABELS, PAL.red);
  drawTextAt(ctx, 'HIGH SCORE', 9, ROW_LABELS, PAL.red);
  if (s.twoPlayerGame && (s.activePlayer !== 1 || blink(s.frame))) {
    drawTextAt(ctx, '2UP', 22, ROW_LABELS, PAL.red);
  }

  drawTextRight(ctx, formatScore(s.scores[0]), 7 * TILE, ROW_SCORES * TILE, PAL.white);
  drawTextRight(ctx, formatScore(s.highScore), 17 * TILE, ROW_SCORES * TILE, PAL.white);
  if (s.twoPlayerGame) {
    drawTextRight(ctx, formatScore(s.scores[1]), 26 * TILE, ROW_SCORES * TILE, PAL.white);
  }
}

/** Arcade convention: scores always show at least two digits ("00"). */
function formatScore(n: number): string {
  return String(n).padStart(2, '0');
}

function drawProgress(ctx: CanvasRenderingContext2D, s: HudState): void {
  const cellW = Math.floor((SCREEN_W - PROGRESS_MARGIN * 2) / SECTION_LABELS.length);
  SECTION_LABELS.forEach((label, i) => {
    const x = PROGRESS_MARGIN + i * cellW;
    const current = i === s.section;
    const labelX = x + Math.floor((cellW - label.length * TILE) / 2);
    drawText(ctx, label, labelX, PROGRESS_LABEL_Y, current ? PAL.yellow : PAL.blue);

    // Passed sections are filled solid; the current one blinks.
    const lit = i < s.section || (current && blink(s.frame));
    ctx.fillStyle = lit ? (current ? PAL.yellow : PAL.magenta) : PAL.darkBlue;
    ctx.fillRect(x + 1, PROGRESS_BAR_Y, cellW - 2, PROGRESS_BAR_H);
  });
}

function drawFuel(ctx: CanvasRenderingContext2D, s: HudState): void {
  const low = s.fuel <= FUEL.lowFraction;
  drawText(ctx, 'FUEL', TILE, FUEL_Y, low && !blink(s.frame) ? PAL.black : PAL.yellow);
  ctx.fillStyle = PAL.darkRed;
  ctx.fillRect(FUEL_BAR_X, FUEL_Y + 1, FUEL_BAR_W, FUEL_BAR_H);
  ctx.fillStyle = low ? PAL.red : PAL.orange;
  ctx.fillRect(FUEL_BAR_X, FUEL_Y + 1, Math.round(FUEL_BAR_W * clamp01(s.fuel)), FUEL_BAR_H);
}

function drawLivesAndFlags(ctx: CanvasRenderingContext2D, s: HudState): void {
  const { lifeIcon, flag } = sprites();
  for (let i = 0; i < s.reserveLives; i++) {
    drawSprite(ctx, lifeIcon, TILE + i * (lifeIcon.w + 2), LIVES_Y + 2);
  }
  for (let i = 0; i < s.flags; i++) {
    drawSprite(ctx, flag, SCREEN_W - TILE - (i + 1) * flag.w, LIVES_Y);
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
