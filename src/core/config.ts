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

/**
 * UFOs (stage 2) weave through the cave: they follow the middle of the
 * passage, swinging up and down on a sine wave, and drift left.
 */
export const UFO = {
  /** Leftward speed relative to the terrain (px/frame); on screen it adds the scroll speed. */
  speed: 0.5,
  /** Swing, px either side of the passage centre (shrunk to fit narrow passages). */
  amplitude: 24,
  /** Frames per full up-and-down swing. */
  period: 72,
  /** Minimum gap kept between a UFO and the rock. */
  margin: 4,
} as const;

/** Fireballs (stage 3) streak straight left and cannot be destroyed. */
export const FIREBALL = {
  /** Leftward speed relative to the terrain (px/frame). */
  speed: 2.5,
  /** Fireballs spawn no higher than this below the top of the playfield... */
  topMargin: 8,
  /** ...and at least this far above the highest ground on screen. */
  groundMargin: 8,
} as const;

/** Fuel is counted in frames of flight. */
export const FUEL = {
  /** A full tank lasts 36 s. */
  fullFrames: 36 * FPS,
  /** At or below this fraction the gauge turns red and blinks. */
  lowFraction: 0.25,
  /** Shooting or bombing a fuel tank adds this much (9 s), capped at full. */
  tankRefillFrames: 9 * FPS,
} as const;

/** Ground rockets. */
export const ROCKET = {
  /**
   * Chance that a given rocket launches at all (decided when it spawns).
   * The rest stay on their pads as bombing targets.
   */
  launchChance: 0.5,
  /**
   * A rocket that will launch does so once it is this close ahead of the
   * ship (px, rocket x minus ship x), picked at random per rocket.
   */
  triggerMin: 24,
  triggerMax: 96,
  /** Climb: starts at startSpeed, accelerates to maxSpeed (px/frame). */
  startSpeed: 0.5,
  accel: 0.04,
  maxSpeed: 2,
} as const;

/** Game flow and attract-mode timing (frames). */
export const FLOW = {
  /** No coins needed: START begins a game. Set false to require coins (5 / C). */
  freePlay: true,
  titleFrames: 6 * FPS,
  scoreTableFrames: 6 * FPS,
  highScoresFrames: 6 * FPS,
  /** The demo ends at this length, or sooner if the demo ship is lost. */
  demoMaxFrames: 30 * FPS,
  /** PLAYER n shown before a turn starts. */
  readyFrames: 2 * FPS,
  gameOverFrames: 3 * FPS,
  /** Initials entry accepts what's there after this long. */
  entryFrames: 30 * FPS,
} as const;

/**
 * Difficulty rises with each completed mission (base destroyed). Values are
 * per completed mission, each capped.
 */
export const DIFFICULTY = {
  /** Added to ROCKET.launchChance... */
  rocketLaunchChance: 0.15,
  rocketLaunchChanceMax: 0.95,
  /** Air-wave intervals are multiplied by this (shorter = more enemies)... */
  waveInterval: 0.85,
  waveIntervalMin: 0.5,
  /** Enemy speeds (rockets, UFOs, fireballs) are multiplied by 1 + this... */
  enemySpeed: 0.1,
  enemySpeedMax: 1.5,
  /** Fuel burns 1 + this per frame... */
  fuelDrain: 0.2,
  fuelDrainMax: 2,
} as const;
