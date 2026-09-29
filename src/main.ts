import { Input } from './core/input';
import { startLoop } from './core/loop';
import { Display } from './core/scaling';
import { Game } from './game';

const canvas = document.querySelector<HTMLCanvasElement>('#screen');
if (!canvas) throw new Error('Missing #screen canvas');

const display = new Display(canvas);
const game = new Game(new Input());

startLoop({
  update: () => game.update(),
  render: () => {
    game.render(display.ctx);
    display.present();
  },
});

// Dev builds only: expose the game for inspection from the browser console.
if (import.meta.env.DEV) Object.assign(window, { game });
