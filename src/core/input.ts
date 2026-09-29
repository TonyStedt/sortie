export type Action =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'fire'
  | 'bomb'
  | 'start'
  | 'coin'
  | 'pause';

/** Keyboard bindings, by KeyboardEvent.code. */
const KEYMAP: Record<string, Action> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'fire',
  KeyZ: 'fire',
  KeyJ: 'fire',
  KeyX: 'bomb',
  KeyK: 'bomb',
  Enter: 'start',
  Digit1: 'start',
  Digit5: 'coin',
  KeyC: 'coin',
  KeyP: 'pause',
  Escape: 'pause',
};

/** Standard-mapping gamepad buttons. */
const PAD_BUTTONS: Partial<Record<number, Action>> = {
  0: 'fire', // A / Cross
  1: 'bomb', // B / Circle
  2: 'bomb', // X / Square
  3: 'fire', // Y / Triangle
  8: 'coin', // Back / Select
  9: 'start', // Start
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};
const PAD_DEADZONE = 0.5;

/**
 * Collects keyboard and gamepad state. Call poll() once per simulation frame;
 * down()/pressed() then describe that frame.
 */
export class Input {
  private readonly keys = new Set<Action>();
  private current = new Set<Action>();
  private previous = new Set<Action>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      this.keys.add(action);
    });
    target.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault();
      this.keys.delete(action);
    });
    target.addEventListener('blur', () => this.keys.clear());
  }

  poll(): void {
    const next = new Set(this.keys);
    this.pollGamepads(next);
    this.previous = this.current;
    this.current = next;
  }

  /** Held this frame. */
  down(action: Action): boolean {
    return this.current.has(action);
  }

  /** Went from released to held this frame. */
  pressed(action: Action): boolean {
    return this.current.has(action) && !this.previous.has(action);
  }

  /** Horizontal/vertical direction as -1, 0 or 1. */
  axis(): { x: number; y: number } {
    return {
      x: (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0),
      y: (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0),
    };
  }

  private pollGamepads(into: Set<Action>): void {
    if (!navigator.getGamepads) return;
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => {
        const action = PAD_BUTTONS[i];
        if (action && b.pressed) into.add(action);
      });
      const [ax = 0, ay = 0] = pad.axes;
      if (ax < -PAD_DEADZONE) into.add('left');
      if (ax > PAD_DEADZONE) into.add('right');
      if (ay < -PAD_DEADZONE) into.add('up');
      if (ay > PAD_DEADZONE) into.add('down');
    }
  }
}
