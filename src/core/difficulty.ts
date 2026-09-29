import { DIFFICULTY, ROCKET } from './config';

/** Difficulty settings in force for a mission loop. */
export interface Difficulty {
  /** Chance a ground rocket launches. */
  rocketLaunchChance: number;
  /** Multiplier on air-wave burst intervals. */
  waveInterval: number;
  /** Multiplier on enemy speeds. */
  enemySpeed: number;
  /** Fuel frames burned per frame. */
  fuelDrain: number;
}

/** Difficulty after `missions` completed missions (0 = first time round). */
export function difficultyFor(missions: number): Difficulty {
  const d = DIFFICULTY;
  return {
    rocketLaunchChance: Math.min(
      d.rocketLaunchChanceMax,
      ROCKET.launchChance + d.rocketLaunchChance * missions,
    ),
    waveInterval: Math.max(d.waveIntervalMin, d.waveInterval ** missions),
    enemySpeed: Math.min(d.enemySpeedMax, 1 + d.enemySpeed * missions),
    fuelDrain: Math.min(d.fuelDrainMax, 1 + d.fuelDrain * missions),
  };
}
