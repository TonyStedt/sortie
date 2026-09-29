import type { Action } from './input';

/**
 * What drives the ship: the keyboard/gamepad (Input) during play, or the
 * Autopilot during the attract-mode demo.
 */
export interface Controls {
  /** Held this frame. */
  down(action: Action): boolean;
  /** Went from released to held this frame. */
  pressed(action: Action): boolean;
  /** Horizontal/vertical direction as -1, 0 or 1. */
  axis(): { x: number; y: number };
}
