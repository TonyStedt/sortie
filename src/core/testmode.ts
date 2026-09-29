/**
 * Test mode, for reaching and trying out any stage quickly. Read from URL
 * options in dev builds only (production builds ignore them):
 *
 *   ?stage=4            start (and restart after game over) at stage 4 (1-6)
 *   ?invincible         nothing can destroy the ship
 *   ?fuel               fuel never runs out
 *
 * Options combine, e.g. http://localhost:5173/?stage=5&invincible&fuel
 */
export interface TestMode {
  /** Stage index to start at, 0-based. */
  startStage: number;
  invincible: boolean;
  infiniteFuel: boolean;
  /** True if any option is set, so the HUD can show TEST. */
  active: boolean;
}

export function readTestMode(stageCount: number): TestMode {
  const off: TestMode = { startStage: 0, invincible: false, infiniteFuel: false, active: false };
  if (!import.meta.env.DEV) return off;

  const params = new URLSearchParams(location.search);
  const stage = Number(params.get('stage') ?? 1);
  const startStage = Number.isInteger(stage) ? Math.min(Math.max(stage, 1), stageCount) - 1 : 0;
  const invincible = params.has('invincible');
  const infiniteFuel = params.has('fuel');
  return {
    startStage,
    invincible,
    infiniteFuel,
    active: startStage > 0 || invincible || infiniteFuel,
  };
}
