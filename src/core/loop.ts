import { FRAME_MS } from './config';

export interface LoopHandlers {
  /** Advance the simulation by exactly one 60 Hz frame. */
  update(): void;
  /** Draw the current state. Called once per animation frame. */
  render(): void;
}

/** Longest real-time gap we will try to catch up on (e.g. after a tab switch). */
const MAX_CATCHUP_MS = 250;
/** Deltas within this distance of a whole number of frames snap to it (vsync jitter). */
const SNAP_MS = 1;

/**
 * Fixed-timestep loop: the simulation always steps at 60 Hz regardless of the
 * display refresh rate; rendering happens once per requestAnimationFrame.
 */
export function startLoop(handlers: LoopHandlers): () => void {
  let acc = 0;
  let last = -1;
  let raf = 0;

  const tick = (now: number) => {
    if (last < 0) last = now;
    let delta = Math.min(now - last, MAX_CATCHUP_MS);
    last = now;

    // Snap near-multiples of the frame time so a 60 Hz display gets exactly
    // one update per refresh instead of an occasional 0 or 2.
    const frames = Math.round(delta / FRAME_MS);
    if (frames > 0 && Math.abs(delta - frames * FRAME_MS) < SNAP_MS) {
      delta = frames * FRAME_MS;
    }

    acc += delta;
    while (acc >= FRAME_MS) {
      handlers.update();
      acc -= FRAME_MS;
    }
    handlers.render();
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
