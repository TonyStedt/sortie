import { STAGE_1 } from './stage1';
import { STAGE_2 } from './stage2';
import { STAGE_3 } from './stage3';
import type { StageDef } from './types';

/**
 * The mission, in order. Stages 4-6 are not built yet; until they are, the
 * mission loops after stage 3.
 */
export const MISSION: readonly StageDef[] = [STAGE_1, STAGE_2, STAGE_3];
