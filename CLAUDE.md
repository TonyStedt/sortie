# SORTIE

A faithful tribute to a classic 1981 horizontal-scrolling arcade shooter (referred to below as
"the original"). The full spec is in [SPEC.md](SPEC.md); read it before any phase of work. This file summarizes the conventions that apply to every change.

## Commands

- `npm run dev` starts the Vite dev server.
- `npm run typecheck` runs `tsc` with no emit.
- `npm run build` runs typecheck plus the production build into `dist/`.

## Legal / originality (non-negotiable)

- All art, fonts, and audio are **original**, in an early-80s arcade style. Never use or trace ROM
  graphics, sprite rips, or original sound samples.
- The game's name is **SORTIE** (final, not a placeholder). Never use the original game's name,
  its publisher's name, or their logos anywhere we author: in-game text, page title, package
  name, code, comments, or docs. Call it "the original" instead. SPEC.md is the user's own
  document and is the only exception.
- No external asset files. Sprites, font, and SFX are all defined in code.

## Tech

- TypeScript (strict), HTML5 Canvas 2D, Web Audio API, Vite. **No game framework, no runtime deps.**
- Input: keyboard plus the optional Gamepad API, abstracted as `Action`s in `src/core/input.ts`.

## Screen

- Logical resolution is **224×256, portrait** (Galaxian-derived hardware: a 256×224 raster on a
  90°-rotated monitor). That is a 28×32 grid of 8×8 tiles. The world scrolls right to left.
- Everything draws into a 224×256 offscreen buffer (`Display.ctx`). That buffer is blitted to
  the visible canvas at the largest **integer** scale in device pixels, nearest-neighbor only.
  Never draw at fractional positions: floor coordinates when drawing.
- Screen regions live in `src/core/config.ts`. The HUD owns tile rows 0–3 (scores, section
  progress) and rows 30–31 (fuel, lives, flags). The playfield is y 32–239.

## Timing

- Fixed **60 Hz** simulation (`src/core/loop.ts`), decoupled from rendering.
- All speeds are in **pixels per frame**, and all timers are in **frames**. Never use wall-clock
  time or `dt` in game logic.
- Screen-space entities (player, shots, bombs) use screen pixels. Terrain is indexed by world x;
  `scroll` is the world x of screen column 0, so screen x maps to world x as `scroll + x`.
- Enemies and explosions are world-anchored: world x plus screen y, so they scroll with the terrain.
  Convert with `screenX(scroll)` for drawing and collision.
- `Input.poll()` runs once per simulation frame. Use `pressed()` for edges and `down()` for held
  actions.

## Randomness

- Game logic uses the seeded `Rng` (`src/core/rng.ts`), **never `Math.random`**, so runs and
  attract-mode demos are reproducible.

## Architecture

```
src/core/      loop, fixed timestep, input, scaling (Display), seeded RNG, config constants
src/gfx/       palette, sprite builder, sprite defs (as code), bitmap font, starfield
src/audio/     procedural Web Audio SFX (oscillators, noise, envelopes). No samples
src/world/     terrain, scrolling, stage progression
src/world/stages/*.ts   stage data only (terrain, placements, tuning), no engine logic
src/entities/  player, shots, bombs, rockets, UFOs, fireballs, fuel tanks, mystery, base, explosions
src/ui/        HUD, attract mode, title, high-score entry
src/game.ts    top-level state machine wiring it together
```

## Audio

- All sound is synthesized in `src/audio/`, with no sample files. `synth.ts` has the primitives
  (`tone`, `noise`, `melody`), `sfx.ts` has every effect recipe plus the engine drone (volumes
  are tuned there), and `audio.ts` has the `AudioEngine`.
- The game only talks to the `Sounds` interface (`play(name)`, `setEngine(on)`, `toggleMute()`).
  Trigger sounds from game events and never import Web Audio into game logic.
- Audio starts on the first key press or click (browser autoplay rules), is suspended while the tab
  is hidden, and M toggles mute (saved in localStorage).
- Melodies are original. Write them as `[MIDI note, beats]` sequences.
- Effect recipes schedule onto any `BaseAudioContext`, so they can be checked by rendering with an
  `OfflineAudioContext` (peak, RMS, length) without speakers.

## Art rules

- Colours only come from `PAL` in `src/gfx/palette.ts`.
- Sprites are defined in `src/gfx/sprites.ts` as character rows: `.` is transparent and
  `1`/`2`/`3` index the sprite's colours. **At most 3 colours plus transparent.** The ship
  is roughly 16×16 class; small enemies are 8–16 px.
- `buildSprite` also produces a per-pixel `mask`. Collision is pixel-accurate against those masks
  and terrain columns, not bounding boxes.
- Text uses the original 8×8 bitmap font (`src/gfx/font.ts`). Add glyphs there as needed.
- Terrain is a solid fill with a distinct outline colour, and its colours change per stage.

## Data vs. logic

- Tunables live in data, not buried in code. Stage lengths, terrain profiles, enemy placements,
  and densities go in `src/world/stages/*.ts`, with comments documenting tuning values.
- Terrain is authored as `[run, height]` knots (see `src/world/stages/types.ts`). To match the
  original's tile-built look, heights and runs are multiples of 8 and slopes are flat or 45°.
  Every stage starts and ends at a height that joins its neighbours seamlessly.
- Airborne enemies (UFOs, fireballs) aren't placed: each stage lists `waves` (see `WaveDef`),
  released while the ship and the screen's right edge are both in that stage.
- Stages with a ceiling must keep the passage passable, and should open the ceiling to 0 at both
  ends so stages join.
- For blocky stages, use the builders in `src/world/stages/build.ts`: `skyline` (flat-topped
  blocks with rooftop objects, e.g. the city) and `tunnel` (floor plus passage height, e.g. the
  maze and base). They centre objects on flat spans and throw if something doesn't fit.
- In dev builds, `validateMission` (`src/world/validate.ts`) runs at startup and warns in the
  console about seams between stages and any spot the ship can't get past. Keep the console clean
  after editing stage data.
- The mission order is `MISSION` in `src/world/stages/index.ts`.
- All score values go in **one** table, `SCORES` in `src/core/scores.ts`, which defaults to the
  original's values. The extra-life threshold (`EXTRA_LIFE_AT`) lives there too.
- Ground objects are placed per stage in `targets` (see `Placement` in `src/world/stages/types.ts`).
  The spawner stands them on the ground and warns in dev if the ground under one isn't flat.
- Player, weapon, fuel, and scroll tuning live in `src/core/config.ts` (`PLAYER`, `LASER`, `BOMB`,
  `FUEL`, `WORLD`, `ROCKET`, `UFO`, `FIREBALL`).
- Enemies that can't be destroyed set `shootable = false`, and shots and bombs pass through them.
- Difficulty per completed mission (base destroyed) is set by `DIFFICULTY` in `src/core/config.ts`,
  applied through `difficultyFor()` (`src/core/difficulty.ts`). It affects rocket launch chance,
  wave frequency, enemy speed and fuel burn.
- Missing the base works as in the original: the base stage's end (`baseLoop` on the stage) comes
  round again, base included, until the base is destroyed. The stretch has no fuel tanks, so each
  miss costs fuel. The view jumps back invisibly because the terrain after the stretch matches its
  start; the dev check verifies this. Only destroying the base earns the flag and continues to
  stage 1.

## Build order

Work one phase at a time, then **stop so the user can test**. Don't start the next phase unasked.

1. ✅ Loop, scaling, input, starfield, player ship movement, HUD skeleton.
2. ✅ Terrain scrolling engine plus stage 1 terrain, collision, laser, bombs, fuel.
3. ✅ Stage 1 entities: rockets, fuel tanks, mystery targets, explosions, scoring.
4. ✅ Stages 2–3 (ceiling, UFOs, fireballs).
5. ✅ Stages 4–6 (city, maze, base), plus the mission loop and difficulty scaling.
6. ✅ Audio.
7. Attract mode, 2-player, high scores (localStorage), polish.
8. Debug overlay (F1): hitboxes, FPS, stage/section select, invincibility.

## Debugging and test mode

- In dev builds, `window.game` exposes the `Game` instance in the browser console.
- Test mode, dev builds only, uses URL options that can be combined. It shows TEST in the HUD.
  - `?stage=N` starts at stage N (1–6); game over restarts there too.
  - `?invincible` means nothing destroys the ship. Falling out of the playfield still does.
  - `?fuel` means fuel never runs out.
  - Example: `http://localhost:5173/?stage=5&invincible&fuel`.

## Controls (current)

Arrows or WASD to move · Space/Z/J to fire · X/K to bomb · Enter/1 to start · 5/C for coin ·
P/Esc to pause · M to mute.
