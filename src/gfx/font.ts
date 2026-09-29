import { SCREEN_W, TILE } from '../core/config';

/**
 * Original arcade-style bitmap font: 7x7 glyphs in 8x8 cells, so text lines up
 * with the 28x32 tile grid. '#' = lit pixel.
 */
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['.#####.', '##...##', '##..###', '##.#.##', '###..##', '##...##', '.#####.'],
  '1': ['...##..', '..###..', '...##..', '...##..', '...##..', '...##..', '.######'],
  '2': ['.#####.', '##...##', '.....##', '..####.', '.##....', '##.....', '#######'],
  '3': ['#######', '....##.', '...##..', '..####.', '.....##', '##...##', '.#####.'],
  '4': ['...###.', '..####.', '.##.##.', '##..##.', '#######', '....##.', '....##.'],
  '5': ['######.', '##.....', '######.', '.....##', '.....##', '##...##', '.#####.'],
  '6': ['..####.', '.##....', '##.....', '######.', '##...##', '##...##', '.#####.'],
  '7': ['#######', '##...##', '....##.', '...##..', '..##...', '..##...', '..##...'],
  '8': ['.####..', '##..##.', '###.##.', '.####..', '##.####', '##...##', '.#####.'],
  '9': ['.#####.', '##...##', '##...##', '.######', '.....##', '....##.', '.####..'],
  A: ['..###..', '.##.##.', '##...##', '##...##', '#######', '##...##', '##...##'],
  B: ['######.', '##...##', '##...##', '######.', '##...##', '##...##', '######.'],
  C: ['..####.', '.##..##', '##.....', '##.....', '##.....', '.##..##', '..####.'],
  D: ['#####..', '##..##.', '##...##', '##...##', '##...##', '##..##.', '#####..'],
  E: ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '#######'],
  F: ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '##.....'],
  G: ['..#####', '.##....', '##.....', '##..###', '##...##', '.##..##', '..#####'],
  H: ['##...##', '##...##', '##...##', '#######', '##...##', '##...##', '##...##'],
  I: ['.######', '...##..', '...##..', '...##..', '...##..', '...##..', '.######'],
  J: ['....###', '.....##', '.....##', '.....##', '##...##', '##...##', '.#####.'],
  K: ['##...##', '##..##.', '##.##..', '####...', '#####..', '##.###.', '##..###'],
  L: ['##.....', '##.....', '##.....', '##.....', '##.....', '##.....', '#######'],
  M: ['##...##', '###.###', '#######', '#######', '##.#.##', '##...##', '##...##'],
  N: ['##...##', '###..##', '####.##', '#######', '##.####', '##..###', '##...##'],
  O: ['.#####.', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  P: ['######.', '##...##', '##...##', '##...##', '######.', '##.....', '##.....'],
  Q: ['.#####.', '##...##', '##...##', '##...##', '##.####', '##..##.', '.####.#'],
  R: ['######.', '##...##', '##...##', '##..###', '#####..', '##.###.', '##..###'],
  S: ['.####..', '##..##.', '##.....', '.#####.', '.....##', '##...##', '.#####.'],
  T: ['######.', '..##...', '..##...', '..##...', '..##...', '..##...', '..##...'],
  U: ['##...##', '##...##', '##...##', '##...##', '##...##', '##...##', '.#####.'],
  V: ['##...##', '##...##', '##...##', '###.###', '.#####.', '..###..', '...#...'],
  W: ['##...##', '##...##', '##.#.##', '#######', '#######', '###.###', '##...##'],
  X: ['##...##', '###.###', '.#####.', '..###..', '.#####.', '###.###', '##...##'],
  Y: ['##..##.', '##..##.', '##..##.', '.####..', '..##...', '..##...', '..##...'],
  Z: ['#######', '....###', '...###.', '..###..', '.###...', '###....', '#######'],
  '-': ['.......', '.......', '.......', '.#####.', '.......', '.......', '.......'],
  '.': ['.......', '.......', '.......', '.......', '.......', '..##...', '..##...'],
  '!': ['..##...', '..##...', '..##...', '..##...', '.......', '..##...', '..##...'],
  ':': ['.......', '..##...', '..##...', '.......', '..##...', '..##...', '.......'],
  '/': ['.....##', '....##.', '...##..', '..##...', '.##....', '##.....', '.......'],
  '?': ['.#####.', '##...##', '....##.', '...##..', '...##..', '.......', '...##..'],
  ' ': ['.......', '.......', '.......', '.......', '.......', '.......', '.......'],
};

const CHARS = Object.keys(GLYPHS);
const INDEX = new Map(CHARS.map((c, i) => [c, i]));

/** One horizontal strip of every glyph, per colour, built lazily. */
const sheets = new Map<string, HTMLCanvasElement>();

function sheet(color: string): HTMLCanvasElement {
  let canvas = sheets.get(color);
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.width = CHARS.length * TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');
  ctx.fillStyle = color;
  CHARS.forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '#') ctx.fillRect(i * TILE + x, y, 1, 1);
      }
    });
  });
  sheets.set(color, canvas);
  return canvas;
}

/** Draw text with its top-left at (x, y). Unknown characters render as blanks. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  const img = sheet(color);
  for (let i = 0; i < text.length; i++) {
    const idx = INDEX.get(text[i].toUpperCase());
    if (idx === undefined) continue;
    ctx.drawImage(img, idx * TILE, 0, TILE, TILE, x + i * TILE, y, TILE, TILE);
  }
}

/** Draw text so that its last character ends at x (exclusive). */
export function drawTextRight(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  drawText(ctx, text, x - text.length * TILE, y, color);
}

/** Draw text at tile coordinates (col 0..27, row 0..31). */
export function drawTextAt(
  ctx: CanvasRenderingContext2D,
  text: string,
  col: number,
  row: number,
  color: string,
): void {
  drawText(ctx, text, col * TILE, row * TILE, color);
}

/** Draw text horizontally centred on the screen, at tile row `row`. */
export function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  row: number,
  color: string,
): void {
  drawText(ctx, text, Math.floor((SCREEN_W - text.length * TILE) / 2), row * TILE, color);
}

/** Draw text at an integer scale (e.g. 2 for a title), top-left at (x, y). */
export function drawTextScaled(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
  color: string,
): void {
  const img = sheet(color);
  const size = TILE * scale;
  for (let i = 0; i < text.length; i++) {
    const idx = INDEX.get(text[i].toUpperCase());
    if (idx === undefined) continue;
    ctx.drawImage(img, idx * TILE, 0, TILE, TILE, x + i * size, y, size, size);
  }
}
