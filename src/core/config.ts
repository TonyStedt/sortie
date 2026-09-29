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
  /** Out of fuel: the ship drops with this gravity (px/frame^2) up to fallMaxSpeed. */
  fallGravity: 0.05,
  fallMaxSpeed: 2,
  /** Frames from the moment of death until the next ship appears. */
  respawnDelay: 120,
} as const;

/** Terrain scroll, px/frame. The original scrolls one pixel per frame. */
export const WORLD = {
  scrollSpeed: 1,
} as const;

/** Forward laser. */
export const LASER = {
  /** px/frame. Terrain is checked at every pixel travelled, so it cannot tunnel. */
  speed: 6,
  maxOnScreen: 4,
} as const;

/** Bombs drop in a forward arc: they start moving forward and curve down. */
export const BOMB = {
  maxOnScreen: 2,
  /** Initial forward speed relative to the screen (px/frame)... */
  startVX: 1.5,
  /** ...which bleeds off by this much per frame, down to minVX. */
  dragVX: 0.02,
  minVX: 0.25,
  /** Falling: starts at startVY and accelerates by gravity up to maxVY. */
  startVY: 0.25,
  gravity: 0.06,
  maxVY: 2.5,
} as const;

/** Fuel is counted in frames of flight. */
export const FUEL = {
  /** A full tank lasts 36 s. */
  fullFrames: 36 * FPS,
  /** At or below this fraction the gauge turns red and blinks. */
  lowFraction: 0.25,
} as const;

/** How long GAME OVER stays up before a new game starts (until attract mode exists). */
export const GAME_OVER_FRAMES = 240;
