/**
 * Hardware-level constants.
 *
 * The original runs on Galaxian-derived hardware: a 256x224 raster on a monitor
 * rotated 90 degrees, so the player sees a portrait 224x256 screen made of
 * 28x32 tiles of 8x8 pixels. The world scrolls horizontally (right to left)
 * across that portrait screen.
 */
export const SCREEN_W = 224;
export const SCREEN_H = 256;
export const TILE = 8;

/** Fixed simulation rate. All speeds in the game are pixels per frame. */
export const FPS = 60;
export const FRAME_MS = 1000 / FPS;

/** Screen regions (in pixels). The HUD owns the top 4 and bottom 2 tile rows. */
export const PLAYFIELD_TOP = 4 * TILE; // 32
export const PLAYFIELD_BOTTOM = SCREEN_H - 2 * TILE; // 240

/** Player tuning. Positions are the sprite's top-left corner. */
export const PLAYER = {
  startX: 24,
  startY: 112,
  /** Horizontal band the ship is confined to (left part of the screen). */
  minX: 8,
  maxX: 88,
  minY: PLAYFIELD_TOP + 4,
  maxY: PLAYFIELD_BOTTOM - 12,
  /** Pixels per frame. */
  speedX: 1,
  speedY: 1.5,
  startLives: 3,
} as const;
