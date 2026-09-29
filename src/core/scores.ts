/**
 * Every score value in one table. Defaults follow the original's published
 * scoring.
 */
export const SCORES = {
  /** Awarded for every second (60 frames) the ship stays in the air. */
  flightPerSecond: 10,
  /** Rocket destroyed while still on the ground. */
  rocketGrounded: 50,
  /** Rocket destroyed after it has launched. */
  rocketFlying: 80,
  ufo: 100,
  fuelTank: 150,
  /** A mystery target is worth one of these, picked at random when hit. */
  mystery: [100, 200, 300],
  base: 800,
} as const;

/** One extra ship when a player's score first reaches this. 0 disables it. */
export const EXTRA_LIFE_AT = 10000;
