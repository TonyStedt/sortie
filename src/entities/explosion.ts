import { drawText } from '../gfx/font';
import { PAL } from '../gfx/palette';
import { drawSprite, type Sprite } from '../gfx/sprite';
import { sprites } from '../gfx/sprites';

/** Frames per explosion animation step. */
const STEP_FRAMES = 6;
/** How long a score label stays up after the blast, in frames. */
const LABEL_FRAMES = 60;

/**
 * A one-shot animation anchored in the world (it scrolls with the terrain),
 * optionally followed by a score label, e.g. a mystery target's value.
 */
export class Explosion {
  private frame = 0;

  private constructor(
    private readonly wx: number,
    private readonly y: number,
    private readonly frames: readonly Sprite[],
    private readonly label?: string,
  ) {}

  /** Target / enemy destroyed. (wx, y) is the centre of the blast. */
  static big(wx: number, y: number, label?: string): Explosion {
    const s = sprites();
    return new Explosion(wx, y, [s.boomA, s.boomB, s.boomC], label);
  }

  /** Bomb hitting the ground. (wx, y) is the impact point. */
  static puff(wx: number, y: number): Explosion {
    const s = sprites();
    return new Explosion(wx, y - 2, [s.puffA, s.puffB]);
  }

  /** Returns false when finished. */
  update(): boolean {
    this.frame++;
    const total = this.frames.length * STEP_FRAMES + (this.label ? LABEL_FRAMES : 0);
    return this.frame < total;
  }

  draw(ctx: CanvasRenderingContext2D, scroll: number): void {
    const step = Math.floor(this.frame / STEP_FRAMES);
    const sprite = this.frames[step];
    const x = this.wx - scroll;
    if (sprite) {
      drawSprite(ctx, sprite, x - Math.floor(sprite.w / 2), this.y - Math.floor(sprite.h / 2));
    } else if (this.label) {
      const w = this.label.length * 8;
      drawText(ctx, this.label, Math.floor(x - w / 2), Math.floor(this.y - 4), PAL.white);
    }
  }
}
