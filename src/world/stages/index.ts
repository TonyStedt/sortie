import { STAGE_1 } from './stage1';
import type { StageDef } from './types';

/**
 * The mission, in order. Only stage 1 exists so far; until stages 2-6 are
 * built the mission is just stage 1, looping.
 */
export const MISSION: readonly StageDef[] = [STAGE_1];
