import { SCREEN_H, SCREEN_W } from './config';

/**
 * Owns the low-res offscreen framebuffer and blits it to the visible canvas at
 * the largest integer scale (in device pixels) that fits the window.
 */
export class Display {
  /** Draw everything here, in logical 224x256 pixels. */
  readonly ctx: CanvasRenderingContext2D;
  private readonly buffer: HTMLCanvasElement;
  private readonly screenCtx: CanvasRenderingContext2D;

  constructor(private readonly screen: HTMLCanvasElement) {
    this.buffer = document.createElement('canvas');
    this.buffer.width = SCREEN_W;
    this.buffer.height = SCREEN_H;
    this.ctx = get2d(this.buffer);
    this.screenCtx = get2d(screen);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Fires when the window moves to a monitor with a different pixel ratio.
    matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener(
      'change',
      () => this.resize(),
    );
  }

  present(): void {
    const { screenCtx, screen } = this;
    screenCtx.imageSmoothingEnabled = false;
    screenCtx.drawImage(this.buffer, 0, 0, screen.width, screen.height);
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.max(
      1,
      Math.floor(Math.min((innerWidth * dpr) / SCREEN_W, (innerHeight * dpr) / SCREEN_H)),
    );
    this.screen.width = SCREEN_W * scale;
    this.screen.height = SCREEN_H * scale;
    // CSS size maps each canvas pixel to exactly one device pixel.
    this.screen.style.width = `${this.screen.width / dpr}px`;
    this.screen.style.height = `${this.screen.height / dpr}px`;
  }
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D not supported');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}
