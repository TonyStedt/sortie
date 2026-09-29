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
  /**
   * Per column: y of the topmost / bottommost opaque pixel, or -1 if the column
   * is empty. Terrain is solid above the ceiling and below the floor, so these
   * extents give an exact pixel-level terrain test.
   */
  readonly colTop: Int16Array;
  readonly colBottom: Int16Array;
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

  const colTop = new Int16Array(w).fill(-1);
  const colBottom = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (!mask[y * w + x]) continue;
      if (colTop[x] < 0) colTop[x] = y;
      colBottom[x] = y;
    }
  }

  return { w, h, image, mask, colTop, colBottom };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
): void {
  ctx.drawImage(sprite.image, Math.floor(x), Math.floor(y));
}
