/**
 * Sprites are defined in code as rows of characters:
 *   '.'          transparent
 *   '1' '2' '3'  colours[0], colours[1], colours[2]
 * At most 3 colours + transparent, like the original hardware.
 */
export interface SpriteDef {
  rows: readonly string[];
  colors: readonly [string] | readonly [string, string] | readonly [string, string, string];
}

export interface Sprite {
  readonly w: number;
  readonly h: number;
  /** Pre-rendered image, drawn with drawImage at integer positions. */
  readonly image: HTMLCanvasElement;
  /** 1 where the pixel is opaque, row-major (index = y * w + x). For collision. */
  readonly mask: Uint8Array;
}

export function buildSprite(def: SpriteDef): Sprite {
  const h = def.rows.length;
  const w = def.rows[0]?.length ?? 0;
  const image = document.createElement('canvas');
  image.width = w;
  image.height = h;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');
  const mask = new Uint8Array(w * h);

  def.rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Sprite row ${y} is ${row.length} wide, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = def.colors[Number(ch) - 1];
      if (!color) throw new Error(`Sprite uses colour '${ch}' which is not defined`);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
      mask[y * w + x] = 1;
    }
  });

  return { w, h, image, mask };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
): void {
  ctx.drawImage(sprite.image, Math.floor(x), Math.floor(y));
}
