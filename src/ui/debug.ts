import { PLAYFIELD_TOP, SCREEN_W, TILE } from '../core/config';
import { drawText } from '../gfx/font';
import { PAL } from '../gfx/palette';
import type { Sprite } from '../gfx/sprite';
import { sprites } from '../gfx/sprites';
import type { Play } from '../play';

/** Commands the overlay's keys produce; Game carries them out. */
export type DebugCommand = 'invincible' | 'fuel' | 'prevStage' | 'nextStage';

/** What Game shows in the panel. */
export interface DebugInfo {
  stageLabel: string;
  stageX: number;
  scroll: number;
  enemies: number;
  fuel: number;
  missions: number;
  rocketChance: number;
  waveInterval: number;
  enemySpeed: number;
  fuelDrain: number;
  invincible: boolean;
  infiniteFuel: boolean;
}

const HITBOX_COLORS = {
  ship: PAL.green,
  enemy: PAL.red,
  /** Can't be shot (fireballs). */
  solid: PAL.orange,
  weapon: PAL.yellow,
} as const;

/**
 * Developer overlay (dev builds only):
 *   F1  panel: FPS, updates/s, position, enemies, fuel, difficulty
 *   F2  invincibility          F3  infinite fuel
 *   F4  hitboxes (each object's collision mask, tinted, plus its bounds)
 *   [ ] previous / next stage (while the panel is open)
 */
export class DebugOverlay {
  panel = false;
  hitboxes = false;
  private readonly queue: DebugCommand[] = [];

  // Rate counters: renders and updates per wall-clock second.
  private windowStart = performance.now();
  private renders = 0;
  private updates = 0;
  private fps = 0;
  private ups = 0;

  private readonly silhouettes = new Map<string, WeakMap<Sprite, HTMLCanvasElement>>();

  constructor() {
    window.addEventListener('keydown', (e) => {
      const handled = this.onKey(e.code);
      // Stop the browser's own F1 (help) and F3 (find) etc.
      if (handled) e.preventDefault();
    });
  }

  /** Commands since the last call. */
  takeCommands(): DebugCommand[] {
    return this.queue.splice(0);
  }

  noteUpdate(): void {
    this.updates++;
  }

  /** Tint every collision mask in play. */
  drawHitboxes(ctx: CanvasRenderingContext2D, play: Play): void {
    const { scroll } = play;
    for (const e of play.enemies) {
      this.drawHitbox(ctx, e.sprite, e.screenX(scroll), e.y, e.shootable ? 'enemy' : 'solid');
    }
    for (const s of play.shots) this.drawHitbox(ctx, sprites().shot, s.x, s.y, 'weapon');
    for (const b of play.bombs) this.drawHitbox(ctx, b.sprite, b.left, b.top, 'weapon');
    if (play.player.mode !== 'exploding' && play.state !== 'lost') {
      this.drawHitbox(ctx, sprites().ship, play.player.x, play.player.y, 'ship');
    }
  }

  drawPanel(ctx: CanvasRenderingContext2D, info: DebugInfo | null): void {
    this.countRender();
    const onOff = (on: boolean) => (on ? 'ON' : 'OFF');
    const lines: [string, string][] = [[`FPS ${this.fps}  UPS ${this.ups}`, PAL.green]];
    if (info) {
      lines.push(
        [`STAGE ${info.stageLabel}  X ${info.stageX}`, PAL.white],
        [`SCROLL ${info.scroll}  ENEMIES ${info.enemies}`, PAL.white],
        [`FUEL ${Math.round(info.fuel * 100)}%  MISSIONS ${info.missions}`, PAL.white],
        [`ROCKET ${info.rocketChance.toFixed(2)} WAVE ${info.waveInterval.toFixed(2)}`, PAL.cyan],
        [`SPEED ${info.enemySpeed.toFixed(2)} BURN ${info.fuelDrain.toFixed(2)}`, PAL.cyan],
      );
    }
    lines.push(
      [`F2 INVINCIBLE ${onOff(info?.invincible ?? false)}`, PAL.yellow],
      [`F3 FUEL       ${onOff(info?.infiniteFuel ?? false)}`, PAL.yellow],
      [`F4 HITBOXES   ${onOff(this.hitboxes)}`, PAL.yellow],
      ['[ ] STAGE     F1 CLOSE', PAL.yellow],
    );

    const top = PLAYFIELD_TOP + 2;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = PAL.black;
    ctx.fillRect(0, top - 2, SCREEN_W, lines.length * TILE + 4);
    ctx.globalAlpha = 1;
    lines.forEach(([text, color], i) => drawText(ctx, text, 4, top + i * TILE, color));
  }

  private onKey(code: string): boolean {
    switch (code) {
      case 'F1':
        this.panel = !this.panel;
        return true;
      case 'F2':
        this.queue.push('invincible');
        return true;
      case 'F3':
        this.queue.push('fuel');
        return true;
      case 'F4':
        this.hitboxes = !this.hitboxes;
        return true;
      case 'BracketLeft':
      case 'BracketRight':
        if (!this.panel) return false;
        this.queue.push(code === 'BracketLeft' ? 'prevStage' : 'nextStage');
        return true;
      default:
        return false;
    }
  }

  /** Count a rendered frame; roll the FPS / UPS figures over each second. */
  private countRender(): void {
    this.renders++;
    const now = performance.now();
    const elapsed = now - this.windowStart;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.renders * 1000) / elapsed);
      this.ups = Math.round((this.updates * 1000) / elapsed);
      this.renders = 0;
      this.updates = 0;
      this.windowStart = now;
    }
  }

  private drawHitbox(
    ctx: CanvasRenderingContext2D,
    sprite: Sprite,
    x: number,
    y: number,
    kind: keyof typeof HITBOX_COLORS,
  ): void {
    const color = HITBOX_COLORS[kind];
    const px = Math.floor(x);
    const py = Math.floor(y);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(this.silhouette(sprite, color), px, py);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 0.5, py - 0.5, sprite.w + 1, sprite.h + 1);
  }

  /** The sprite's collision mask as a solid-colour image, cached per colour. */
  private silhouette(sprite: Sprite, color: string): HTMLCanvasElement {
    let byColor = this.silhouettes.get(color);
    if (!byColor) this.silhouettes.set(color, (byColor = new WeakMap()));
    let img = byColor.get(sprite);
    if (!img) {
      img = document.createElement('canvas');
      img.width = sprite.w;
      img.height = sprite.h;
      const c = img.getContext('2d');
      if (!c) throw new Error('Canvas 2D not supported');
      c.fillStyle = color;
      for (let i = 0; i < sprite.mask.length; i++) {
        if (sprite.mask[i]) c.fillRect(i % sprite.w, Math.floor(i / sprite.w), 1, 1);
      }
      byColor.set(sprite, img);
    }
    return img;
  }
}
