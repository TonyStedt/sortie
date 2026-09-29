import { AudioEngine } from './audio/audio';
import { Input } from './core/input';
import { startLoop } from './core/loop';
import { Display } from './core/scaling';
import { readTestMode } from './core/testmode';
import { Game } from './game';
import { MISSION } from './world/stages';
import { validateMission } from './world/validate';
import { World } from './world/world';

const canvas = document.querySelector<HTMLCanvasElement>('#screen');
if (!canvas) throw new Error('Missing #screen canvas');

const display = new Display(canvas);
const game = new Game(new Input(), readTestMode(MISSION.length), new AudioEngine());

startLoop({
  update: () => game.update(),
  render: () => {
    game.render(display.ctx);
    display.present();
  },
});

if (import.meta.env.DEV) {
  // Expose the game for inspection from the browser console.
  Object.assign(window, { game });
  // Report terrain problems (seams, impassable spots) in the console.
  for (const problem of validateMission(new World(MISSION))) console.warn(problem);
}
