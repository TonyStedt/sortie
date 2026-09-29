/**
 * Small synthesis toolkit: enveloped tones, filtered noise and note
 * sequences. Everything schedules onto a BaseAudioContext, so effects can
 * also be rendered offline (for checking them without speakers).
 */

/** Where and when a sound plays. */
export interface Voice {
  ctx: BaseAudioContext;
  out: AudioNode;
  /** Start time, in ctx seconds. */
  t: number;
}

/** MIDI note number to Hz (69 = A4 = 440 Hz). */
export function mtof(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** Smallest gain used for exponential ramps (they can't reach 0). */
const SILENT = 0.0001;

export interface ToneOptions {
  type: OscillatorType;
  /** Start and (optional) end frequency, Hz. */
  from: number;
  to?: number;
  /** Duration including release, s. */
  dur: number;
  /** Peak gain. */
  vol: number;
  /** Delay after the voice's start time, s. */
  at?: number;
  attack?: number;
  /** Vibrato: rate (Hz) and depth (Hz). */
  vibrato?: { rate: number; depth: number };
}

export function tone(v: Voice, o: ToneOptions): void {
  const { ctx } = v;
  const t = v.t + (o.at ?? 0);
  const end = t + o.dur;
  const osc = ctx.createOscillator();
  osc.type = o.type;
  osc.frequency.setValueAtTime(o.from, t);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, end);

  if (o.vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = o.vibrato.rate;
    depth.gain.value = o.vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(end);
  }

  const gain = envelope(ctx, t, end, o.vol, o.attack ?? 0.005);
  osc.connect(gain).connect(v.out);
  osc.start(t);
  osc.stop(end + 0.02);
}

export interface NoiseOptions {
  dur: number;
  vol: number;
  filter: BiquadFilterType;
  /** Filter frequency at start and (optional) end, Hz. */
  from: number;
  to?: number;
  q?: number;
  at?: number;
  attack?: number;
}

export function noise(v: Voice, o: NoiseOptions): void {
  const { ctx } = v;
  const t = v.t + (o.at ?? 0);
  const end = t + o.dur;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = o.filter;
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.from, t);
  if (o.to !== undefined) filter.frequency.exponentialRampToValueAtTime(o.to, end);

  const gain = envelope(ctx, t, end, o.vol, o.attack ?? 0.002);
  src.connect(filter).connect(gain).connect(v.out);
  src.start(t);
  src.stop(end + 0.02);
}

/** A melody: [MIDI note or null for a rest, length in beats]. */
export type Sequence = readonly (readonly [note: number | null, beats: number])[];

export function melody(
  v: Voice,
  seq: Sequence,
  o: { type: OscillatorType; beat: number; vol: number; at?: number },
): void {
  let at = o.at ?? 0;
  for (const [note, beats] of seq) {
    const dur = beats * o.beat;
    // Slightly detached notes, like a sound chip.
    if (note !== null) tone(v, { type: o.type, from: mtof(note), dur: dur * 0.9, vol: o.vol, at });
    at += dur;
  }
}

/** Quick attack, then an exponential decay to silence at `end`. */
function envelope(
  ctx: BaseAudioContext,
  t: number,
  end: number,
  vol: number,
  attack: number,
): GainNode {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(SILENT, end);
  return gain;
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** One second of white noise per context, generated once and looped. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = noiseBuffers.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Fixed-seed LCG so the noise is identical every run.
    let seed = 1981;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    noiseBuffers.set(ctx, buf);
  }
  return buf;
}
