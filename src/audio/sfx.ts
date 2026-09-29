import { melody, noise, tone, type Sequence, type Voice } from './synth';

/**
 * Every sound effect, as a recipe of synth calls. All original designs.
 * Volumes are relative (the master volume is applied on top); tune them here.
 */
export type SoundName =
  | 'laser'
  | 'bomb'
  | 'bombHit'
  | 'smallExplosion'
  | 'bigExplosion'
  | 'rocketLaunch'
  | 'fuelLow'
  | 'stageJingle'
  | 'missionComplete'
  | 'playerDeath'
  | 'extraLife';

// Melodies: [MIDI note, beats]. 60 = C4, 72 = C5.
const STAGE_JINGLE: Sequence = [[67, 1], [72, 1], [76, 1], [74, 1], [79, 2]];
const EXTRA_LIFE: Sequence = [[72, 1], [76, 1], [79, 1], [84, 1], [79, 1], [84, 1], [88, 3]];
const MISSION_COMPLETE: Sequence = [
  [72, 1], [72, 1], [79, 2], [76, 1], [79, 1], [84, 4], [null, 1], [83, 1], [84, 4],
];

export const SFX: Record<SoundName, (v: Voice) => void> = {
  // Short downward zap.
  laser: (v) => {
    tone(v, { type: 'square', from: 1760, to: 220, dur: 0.09, vol: 0.12 });
  },

  // Falling whistle as the bomb drops away.
  bomb: (v) => {
    tone(v, { type: 'triangle', from: 1400, to: 450, dur: 0.6, vol: 0.12, attack: 0.02 });
  },

  // Bomb hitting bare ground: a dull thud.
  bombHit: (v) => {
    noise(v, { dur: 0.18, vol: 0.25, filter: 'lowpass', from: 900, to: 120 });
    tone(v, { type: 'sine', from: 110, to: 40, dur: 0.15, vol: 0.3 });
  },

  // Target destroyed.
  smallExplosion: (v) => {
    noise(v, { dur: 0.4, vol: 0.45, filter: 'lowpass', from: 3500, to: 150 });
    tone(v, { type: 'sine', from: 140, to: 40, dur: 0.25, vol: 0.35 });
  },

  // Base destroyed: long rumbling blast with crackle.
  bigExplosion: (v) => {
    noise(v, { dur: 1.6, vol: 0.6, filter: 'lowpass', from: 2000, to: 60 });
    noise(v, { dur: 0.9, vol: 0.2, filter: 'bandpass', from: 3000, to: 400, q: 4, at: 0.05 });
    tone(v, { type: 'sine', from: 90, to: 28, dur: 1.0, vol: 0.5 });
  },

  // Rocket leaving its pad: rising whoosh.
  rocketLaunch: (v) => {
    noise(v, { dur: 0.55, vol: 0.4, filter: 'bandpass', from: 300, to: 2400, q: 2, attack: 0.05 });
    tone(v, { type: 'sawtooth', from: 90, to: 260, dur: 0.5, vol: 0.08, attack: 0.05 });
  },

  // Low-fuel alarm, called repeatedly while fuel is low.
  fuelLow: (v) => {
    tone(v, { type: 'square', from: 988, dur: 0.07, vol: 0.16 });
    tone(v, { type: 'square', from: 740, dur: 0.07, vol: 0.16, at: 0.09 });
  },

  // Entering a new section.
  stageJingle: (v) => {
    melody(v, STAGE_JINGLE, { type: 'square', beat: 0.07, vol: 0.09 });
    melody(v, STAGE_JINGLE.map(([n, b]) => [n === null ? null : n - 12, b] as const), {
      type: 'triangle',
      beat: 0.07,
      vol: 0.12,
    });
  },

  // Base destroyed: a short fanfare (plays over the big explosion).
  missionComplete: (v) => {
    melody(v, MISSION_COMPLETE, { type: 'square', beat: 0.09, vol: 0.1, at: 0.4 });
    melody(v, MISSION_COMPLETE.map(([n, b]) => [n === null ? null : n - 12, b] as const), {
      type: 'triangle',
      beat: 0.09,
      vol: 0.12,
      at: 0.4,
    });
  },

  // Ship destroyed: explosion, then a wobbling tone falling away.
  playerDeath: (v) => {
    noise(v, { dur: 0.9, vol: 0.5, filter: 'lowpass', from: 3000, to: 80 });
    tone(v, {
      type: 'square',
      from: 900,
      to: 55,
      dur: 1.3,
      vol: 0.1,
      at: 0.1,
      vibrato: { rate: 14, depth: 40 },
    });
  },

  // Extra ship awarded: bright rising arpeggio.
  extraLife: (v) => {
    melody(v, EXTRA_LIFE, { type: 'square', beat: 0.06, vol: 0.18 });
  },
};

/**
 * The ship's engine: two slightly detuned low buzzes through a filter that
 * throbs. Runs continuously once audio starts; only its volume changes.
 */
export class EngineDrone {
  private readonly gain: GainNode;
  private readonly ctx: BaseAudioContext;

  constructor(ctx: BaseAudioContext, out: AudioNode) {
    this.ctx = ctx;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    filter.Q.value = 3;

    // Throb: sweep the filter a little, 9 times a second.
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 9;
    lfoDepth.gain.value = 140;
    lfo.connect(lfoDepth).connect(filter.frequency);
    lfo.start();

    for (const [type, freq] of [
      ['sawtooth', 55],
      ['square', 55.8],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
    }
    filter.connect(this.gain).connect(out);
  }

  /** Fade the drone in or out. */
  set(on: boolean): void {
    this.gain.gain.setTargetAtTime(on ? DRONE_VOLUME : 0, this.ctx.currentTime, 0.05);
  }
}

const DRONE_VOLUME = 0.05;
