# Project: SORTIE, a classic horizontal scroller (early-80s arcade tribute)

## Goal
Build a faithful tribute to a classic 1981 horizontal-scrolling arcade shooter
(referred to below as "the original"). It should look and play as close to the
original as possible: same stage structure, same mechanics, same pacing and
difficulty feel. All art and audio must be ORIGINAL creations in the authentic
early-80s arcade style. Do not use or trace ROM graphics, sprite rips, original
sound samples, or the original game's or publisher's name or logo.
Title: "SORTIE".

## Tech stack
- TypeScript, HTML5 Canvas 2D, Web Audio API, Vite. No game framework.
- Fixed logical resolution matching the original hardware (Galaxian-derived,
  approx. 224x256 native — research and confirm the correct displayed
  orientation/aspect for the original before starting), rendered to an offscreen
  canvas and integer-scaled with nearest-neighbor to fit the window.
- Fixed 60 Hz simulation timestep, decoupled from rendering.
  All speeds defined in pixels-per-frame, like the original.
- Keyboard input. Optional gamepad (Gamepad API).

## Architecture
- src/core/     game loop, fixed timestep, input, scaling, RNG (seeded)
- src/gfx/      renderer, sprite definitions as code (pixel arrays + palette),
                bitmap font, starfield
- src/audio/    procedural SFX synthesized with Web Audio (oscillators, noise,
                envelopes); no sample files
- src/world/    terrain/stage data, scrolling, stage progression
- src/entities/ player, bullets, bombs, rockets, UFOs, fireballs, fuel tanks,
                mystery targets, base, explosions
- src/ui/       HUD, attract mode, title, high score entry
- Stage/terrain data lives in plain data files (e.g. src/world/stages/*.ts),
  separate from engine code, so levels can be tuned without touching logic.
- Pixel-accurate collision using per-sprite masks against terrain columns.

## Visual style
- Black background with a slowly scrolling, twinkling multicolor starfield.
- Limited palette consistent with early-80s arcade hardware; each sprite
  uses at most 3 colors + transparent.
- Terrain drawn as solid filled ground (and ceiling where applicable) with a
  distinct outline color; terrain colors change per stage.
- Original sprite designs at original-scale sizes (player ship ~16x16 px class,
  small enemies 8–16 px), chunky and readable.
- Bitmap font in the classic arcade style (original glyph design).

## HUD
- Top: 1UP score, HIGH SCORE, 2UP score.
- Stage progress indicator showing the six sections
  (1ST, 2ND, 3RD, 4TH, 5TH, BASE), with the current section highlighted.
- Bottom: FUEL gauge bar, remaining lives as ship icons,
  loop/flag counter for completed missions.

## Player mechanics
- Ship moves up/down freely and left/right within a limited band on the
  left portion of the screen. The world scrolls at constant speed.
- Button 1: forward laser (horizontal shots, limited number on screen).
- Button 2: bombs that drop in a forward arc (limited number on screen).
- Fuel drains continuously. Destroying a fuel tank refills a portion.
  Empty fuel = ship falls and crashes.
- Contact with terrain, enemies, or enemy shots = lose a life. Respawn
  at the start of the current section.
- Extra life at a score threshold (make it configurable).

## Stage structure (in order, then loop with increased difficulty)
1. Mountains: rolling hilly ground, no ceiling. Ground rockets that launch
   upward as the player approaches, plus fuel tanks and mystery targets
   (random bonus score).
2. UFO cave: ceiling appears. UFOs fly in sine-wave patterns in waves.
3. Fireballs (meteors): flat-ish terrain; fireballs streak right-to-left in
   bursts and cannot be destroyed, only dodged. Few ground targets.
4. City: tall rectangular building columns rising from the ground at varying
   heights, requiring vertical weaving. Rockets and fuel tanks on rooftops.
5. Maze: tight tunnel with ceiling and floor; narrow twisting passages.
   Precision flying, fuel tanks scarce.
6. Base: final approach with the base target on the ground. Destroying it
   completes the mission (flag counter +1) and restarts at stage 1, harder.
Each stage's length, terrain profile, enemy placements and density should
be tuned to match the original's pacing. Document tuning values in the
stage data files.

## Scoring (make all values configurable in one table)
Points for rockets (more if hit in flight), UFOs, fuel tanks, mystery
targets (random value), and the base. Research the original values and
use them as defaults.

## Audio (procedural)
Engine drone, laser zap, bomb whistle/drop, small explosion, large
explosion, rocket launch, fuel-low warning, stage transition jingle,
player death, extra life. Original short melodies only.

## Game flow
Attract mode (demo play + score table) → insert coin/press start →
1 or 2 players alternating → game over → high score initials entry.
Scores persist with localStorage.

## Build order (stop and let me test after each phase)
1. Loop, scaling, input, starfield, player ship movement, HUD skeleton.
2. Terrain scrolling engine + stage 1 terrain, collision, laser, bombs, fuel.
3. Stage 1 entities: rockets, fuel tanks, mystery targets, explosions, scoring.
4. Stages 2–3 (ceiling, UFOs, fireballs).
5. Stages 4–6 (city, maze, base) + mission loop and difficulty scaling.
6. Audio.
7. Attract mode, 2-player, high scores, polish.
8. A debug overlay (F1): hitboxes, FPS, stage/section select, invincibility.

## Definition of done
Runs with `npm run dev`. Smooth 60 fps. Pixel-crisp at any window size.
All six sections playable and looping. No external asset files required.