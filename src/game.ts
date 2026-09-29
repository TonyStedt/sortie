import type { Sounds } from './audio/audio';
import { FLOW } from './core/config';
import { HighScores } from './core/highscores';
import type { Input } from './core/input';
import { Rng } from './core/rng';
import type { TestMode } from './core/testmode';
import { drawTextAt, drawTextCentered } from './gfx/font';
import { PAL } from './gfx/palette';
import { Starfield } from './gfx/starfield';
import { NO_TEST, Play, SILENT, newPlayerStats, type PlayerStats } from './play';
import { Autopilot } from './ui/autopilot';
import type { DebugCommand, DebugInfo, DebugOverlay } from './ui/debug';
import { InitialsEntry } from './ui/entry';
import { drawHud, type HudState } from './ui/hud';
import { drawHighScores, drawScoreTable, drawTitle } from './ui/screens';
import { MISSION } from './world/stages';
import { World } from './world/world';

/** Attract-mode screens, shown in this order, then round again. */
const ATTRACT_ORDER = ['title', 'scoreTable', 'highScores', 'demo'] as const;
type AttractScreen = (typeof ATTRACT_ORDER)[number];

/**
 * attract:  title / score table / high scores / demo, cycling until START.
 * ready:    "PLAYER n" over the frozen playfield before a turn.
 * play:     a player's turn.
 * gameOver: GAME OVER for the player who just ran out of ships.
 * entry:    that player enters initials for the high-score table.
 */
type Mode =
  | { kind: 'attract'; screen: AttractScreen; timer: number }
  | { kind: 'ready'; timer: number }
  | { kind: 'play' }
  | { kind: 'gameOver'; timer: number }
  | { kind: 'entry'; entry: InitialsEntry };

/** How long SOUND ON / SOUND OFF shows after pressing M, frames. */
const SOUND_MESSAGE_FRAMES = 90;

/**
 * The arcade machine: attract mode, credits, one or two players taking
 * turns, game over and high-score entry. Each turn runs in `Play`.
 */
export class Game {
  private readonly rng = new Rng();
  private readonly starfield = new Starfield(this.rng);
  private readonly world = new World(MISSION);
  private readonly play = new Play(this.world, this.rng);
  private readonly autopilot = new Autopilot();
  private readonly highScores = new HighScores();

  private mode: Mode = { kind: 'attract', screen: 'title', timer: FLOW.titleFrames };
  /** Players of the current (or last) game; also what the HUD shows between games. */
  private players: PlayerStats[] = [newPlayerStats(0), newPlayerStats(0)];
  private twoPlayer = false;
  private active = 0;
  private credits = 0;
  /** Rank of the latest high-score entry, highlighted on the table. */
  private newRank = -1;
  private frame = 0;
  private paused = false;
  private muted = false;
  private soundMessage = 0;

  constructor(
    private readonly input: Input,
    private readonly test: TestMode,
    private readonly sounds: Sounds,
    /** Dev builds only; null in production. */
    private readonly debug: DebugOverlay | null = null,
  ) {
    // Test mode skips attract mode and goes straight into a game.
    if (test.active) this.startGame(1);
  }

  update(): void {
    this.input.poll();
    if (this.debug) {
      this.debug.noteUpdate();
      for (const cmd of this.debug.takeCommands()) this.runDebugCommand(cmd);
    }
    if (this.input.pressed('mute')) {
      this.muted = this.sounds.toggleMute();
      this.soundMessage = SOUND_MESSAGE_FRAMES;
    }
    if (this.soundMessage > 0) this.soundMessage--;

    const inGame = this.mode.kind === 'play' || this.mode.kind === 'ready';
    if (inGame && this.input.pressed('pause')) this.paused = !this.paused;
    if (!inGame) this.paused = false;
    this.sounds.setEngine(
      !this.paused &&
        this.mode.kind === 'play' &&
        this.play.state === 'playing' &&
        this.play.player.mode === 'flying',
    );
    if (this.paused) return;

    this.frame++;
    this.starfield.update();

    switch (this.mode.kind) {
      case 'attract':
        this.updateAttract(this.mode);
        break;
      case 'ready':
        if (--this.mode.timer <= 0) this.mode = { kind: 'play' };
        break;
      case 'play':
        this.play.update(this.input);
        if (this.play.state === 'lost') this.turnLost();
        break;
      case 'gameOver':
        if (--this.mode.timer <= 0) this.afterGameOver();
        break;
      case 'entry':
        this.mode.entry.update(this.input);
        if (this.mode.entry.done) this.finishEntry(this.mode.entry);
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = PAL.black;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.starfield.draw(ctx);

    const m = this.mode;
    const showsPlayfield =
      m.kind === 'ready' || m.kind === 'play' || m.kind === 'gameOver' ||
      (m.kind === 'attract' && m.screen === 'demo');
    if (showsPlayfield) this.play.render(ctx);
    if (showsPlayfield && this.debug?.hitboxes) this.debug.drawHitboxes(ctx, this.play);

    switch (m.kind) {
      case 'attract':
        if (m.screen === 'title') drawTitle(ctx, this.frame, this.creditText(), this.canStart(1));
        if (m.screen === 'scoreTable') drawScoreTable(ctx);
        if (m.screen === 'highScores') {
          drawHighScores(ctx, this.highScores.entries, this.frame, this.newRank);
        }
        if (m.screen === 'demo' && Math.floor(this.frame / 16) % 2 === 0) {
          drawTextCentered(ctx, 'PUSH START', 6, PAL.white);
        }
        break;
      case 'ready':
        drawTextCentered(ctx, `PLAYER ${this.active + 1}`, 14, PAL.cyan);
        drawTextCentered(ctx, 'READY', 16, PAL.white);
        break;
      case 'gameOver':
        if (this.twoPlayer) drawTextCentered(ctx, `PLAYER ${this.active + 1}`, 14, PAL.cyan);
        drawTextCentered(ctx, 'GAME OVER', 16, PAL.red);
        break;
      case 'entry':
        m.entry.draw(ctx, this.frame);
        break;
      case 'play':
        break;
    }

    drawHud(ctx, this.hudState(showsPlayfield));
    if (this.test.active) drawTextAt(ctx, 'TEST', 23, 30, PAL.magenta);
    if (this.paused) drawTextCentered(ctx, 'PAUSE', 18, PAL.white);
    if (this.soundMessage > 0) {
      drawTextCentered(ctx, this.muted ? 'SOUND OFF' : 'SOUND ON', 20, PAL.yellow);
    }
    if (this.debug?.panel) this.debug.drawPanel(ctx, this.debugInfo(showsPlayfield));
  }

  // --- Debug overlay (dev builds) -----------------------------------------

  private runDebugCommand(cmd: DebugCommand): void {
    const t = this.test;
    switch (cmd) {
      case 'invincible':
        t.invincible = !t.invincible;
        break;
      case 'fuel':
        t.infiniteFuel = !t.infiniteFuel;
        break;
      case 'prevStage':
      case 'nextStage': {
        const n = this.world.stages.length;
        const inGame = this.mode.kind === 'ready' || this.mode.kind === 'play';
        const from = inGame ? this.play.section : t.startStage;
        const to = (from + (cmd === 'nextStage' ? 1 : -1) + n) % n;
        // New games (and restarts after game over) start there too.
        t.startStage = to;
        if (inGame) {
          this.players[this.active].checkpoint = to;
          this.paused = false;
          this.beginTurn(false);
        } else {
          this.startGame(1);
        }
        break;
      }
    }
    t.active = true;
  }

  private debugInfo(showsPlayfield: boolean): DebugInfo | null {
    if (!showsPlayfield) return null;
    const { play, world } = this;
    const L = world.length;
    const wx = (((play.scroll + play.player.x) % L) + L) % L;
    const section = world.section(wx);
    const d = play.difficulty;
    return {
      stageLabel: world.stages[section].label,
      stageX: Math.floor(wx - world.sectionStarts[section]),
      scroll: play.scroll,
      enemies: play.enemies.length,
      fuel: play.fuelFraction,
      missions: play.stats.missions,
      rocketChance: d.rocketLaunchChance,
      waveInterval: d.waveInterval,
      enemySpeed: d.enemySpeed,
      fuelDrain: d.fuelDrain,
      invincible: this.test.invincible,
      infiniteFuel: this.test.infiniteFuel,
    };
  }

  // --- Attract mode -------------------------------------------------------

  private updateAttract(m: Extract<Mode, { kind: 'attract' }>): void {
    if (this.input.pressed('coin') && !FLOW.freePlay) this.credits = Math.min(this.credits + 1, 9);
    if (this.input.pressed('start') && this.canStart(1)) return this.startGame(1);
    if (this.input.pressed('start2') && this.canStart(2)) return this.startGame(2);

    if (m.screen === 'demo') {
      this.autopilot.think(this.play);
      this.play.update(this.autopilot);
      if (this.play.state === 'lost' || --m.timer <= 0) this.nextAttractScreen(m.screen);
      return;
    }
    if (--m.timer <= 0) this.nextAttractScreen(m.screen);
  }

  private nextAttractScreen(current: AttractScreen): void {
    const next = ATTRACT_ORDER[(ATTRACT_ORDER.indexOf(current) + 1) % ATTRACT_ORDER.length];
    this.showAttract(next);
  }

  private showAttract(screen: AttractScreen): void {
    const frames: Record<AttractScreen, number> = {
      title: FLOW.titleFrames,
      scoreTable: FLOW.scoreTableFrames,
      highScores: FLOW.highScoresFrames,
      demo: FLOW.demoMaxFrames,
    };
    if (screen === 'demo') {
      // One silent ship from the start, flown by the autopilot.
      const demo = newPlayerStats(0);
      demo.reserveLives = 0;
      this.autopilot.reset();
      this.play.begin(demo, SILENT, NO_TEST);
    }
    if (screen === 'title') this.newRank = -1;
    this.mode = { kind: 'attract', screen, timer: frames[screen] };
  }

  private canStart(players: number): boolean {
    return FLOW.freePlay || this.credits >= players;
  }

  private creditText(): string {
    return FLOW.freePlay ? 'FREE PLAY' : `CREDIT ${this.credits}`;
  }

  // --- A game -------------------------------------------------------------

  private startGame(players: 1 | 2): void {
    if (!FLOW.freePlay) this.credits -= players;
    this.twoPlayer = players === 2;
    this.players = [newPlayerStats(this.test.startStage), newPlayerStats(this.test.startStage)];
    this.active = 0;
    this.newRank = -1;
    this.beginTurn(true);
  }

  /** Put the active player's next ship in play, optionally after "PLAYER n / READY". */
  private beginTurn(showReady: boolean): void {
    this.play.begin(this.players[this.active], this.sounds, this.test);
    this.mode = showReady ? { kind: 'ready', timer: FLOW.readyFrames } : { kind: 'play' };
  }

  /** The active player's ship is gone (explosion finished). */
  private turnLost(): void {
    const p = this.players[this.active];
    if (p.reserveLives === 0) {
      p.out = true;
      this.mode = { kind: 'gameOver', timer: FLOW.gameOverFrames };
      return;
    }
    p.reserveLives--;
    const other = 1 - this.active;
    if (this.twoPlayer && !this.players[other].out) {
      this.active = other;
      this.beginTurn(true);
    } else {
      this.beginTurn(false);
    }
  }

  private afterGameOver(): void {
    const p = this.players[this.active];
    if (!this.test.active && this.highScores.qualifies(p.score)) {
      this.mode = { kind: 'entry', entry: new InitialsEntry(this.active, p.score) };
      return;
    }
    this.nextPlayerOrEnd();
  }

  private finishEntry(entry: InitialsEntry): void {
    this.newRank = this.highScores.insert(entry.initials, entry.score);
    this.nextPlayerOrEnd();
  }

  private nextPlayerOrEnd(): void {
    const other = 1 - this.active;
    if (this.twoPlayer && !this.players[other].out) {
      this.active = other;
      this.beginTurn(true);
    } else if (this.test.active) {
      this.startGame(1);
    } else {
      this.showAttract('highScores');
    }
  }

  // --- HUD ----------------------------------------------------------------

  private hudState(full: boolean): HudState {
    const scores: [number, number] = [this.players[0].score, this.players[1].score];
    const inGame = this.mode.kind !== 'attract' && this.mode.kind !== 'entry';
    const shownPlayer = this.players[this.active];
    return {
      frame: this.frame,
      mode: full ? 'full' : 'scores',
      scores,
      highScore: Math.max(this.highScores.top(), ...scores),
      activePlayer: this.active,
      blinkActive: inGame,
      section: this.play.section,
      fuel: this.play.fuelFraction,
      reserveLives: inGame ? shownPlayer.reserveLives : 0,
      flags: inGame ? shownPlayer.missions : 0,
    };
  }
}
