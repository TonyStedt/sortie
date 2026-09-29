import { EngineDrone, SFX, type SoundName } from './sfx';

export type { SoundName } from './sfx';

/** What the game needs from the audio system. */
export interface Sounds {
  play(name: SoundName): void;
  /** Engine drone on while the ship is flying. */
  setEngine(on: boolean): void;
  /** Toggle mute; returns true if now muted. */
  toggleMute(): boolean;
}

/** Overall volume, 0-1. */
const MASTER_VOLUME = 0.5;
/** The same effect won't retrigger faster than this (s), so bursts don't stack up. */
const MIN_RETRIGGER = 0.03;
const MUTE_KEY = 'sortie.muted';

/**
 * Web Audio output. Browsers only allow audio after a user gesture, so the
 * AudioContext is created on the first key press or click. Until then, and
 * while muted or the tab is hidden, sounds are silently skipped.
 */
export class AudioEngine implements Sounds {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drone: EngineDrone | null = null;
  private muted = loadMuted();
  private engineOn = false;
  private readonly lastPlayed = new Map<SoundName, number>();

  constructor() {
    const unlock = () => this.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    // Silence everything while the tab is hidden (the game is paused then too).
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - (this.lastPlayed.get(name) ?? -1) < MIN_RETRIGGER) return;
    this.lastPlayed.set(name, now);
    SFX[name]({ ctx, out: this.master, t: now });
  }

  setEngine(on: boolean): void {
    if (on === this.engineOn) return;
    this.engineOn = on;
    this.drone?.set(on && !this.muted);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    saveMuted(this.muted);
    this.drone?.set(this.engineOn && !this.muted);
    return this.muted;
  }

  private unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
      this.drone = new EngineDrone(this.ctx, this.master);
      this.drone.set(this.engineOn && !this.muted);
    }
    if (this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume();
  }
}

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage unavailable (private mode etc.): mute just won't be remembered.
  }
}
