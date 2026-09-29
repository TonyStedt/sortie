import type { AirKind, StageDef, WaveDef } from './stages/types';

interface WaveState {
  def: WaveDef;
  /** Frames until the next burst starts. */
  untilBurst: number;
  /** Enemies still to release in the current burst. */
  left: number;
  /** Frames until the next enemy of the burst. */
  untilNext: number;
}

/**
 * Releases each stage's airborne waves (see WaveDef) while that stage is
 * active. Timers restart whenever the active stage changes.
 */
export class Waves {
  private active = -1;
  private states: WaveState[] = [];

  constructor(private readonly stages: readonly StageDef[]) {}

  reset(): void {
    this.active = -1;
    this.states = [];
  }

  /**
   * Advance one frame. `stage` is the active stage index, or -1 for none.
   * Yields the kinds to spawn this frame; iterate it fully every frame.
   */
  *update(stage: number): Generator<AirKind> {
    if (stage !== this.active) {
      this.active = stage;
      const defs = stage >= 0 ? (this.stages[stage].waves ?? []) : [];
      this.states = defs.map((def) => ({ def, untilBurst: def.delay, left: 0, untilNext: 0 }));
    }
    for (const s of this.states) {
      if (--s.untilBurst <= 0) {
        s.untilBurst = s.def.every;
        s.left = s.def.burst;
        s.untilNext = 0;
      }
      if (s.left > 0 && --s.untilNext <= 0) {
        s.left--;
        s.untilNext = s.def.gap;
        yield s.def.kind;
      }
    }
  }
}
