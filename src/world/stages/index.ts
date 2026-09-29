import { STAGE_1 } from './stage1';
import { STAGE_2 } from './stage2';
import { STAGE_3 } from './stage3';
import { STAGE_4 } from './stage4';
import { STAGE_5 } from './stage5';
import { STAGE_6 } from './stage6';
import type { StageDef } from './types';

/** The mission, in order. After the base it loops back to stage 1. */
export const MISSION: readonly StageDef[] = [STAGE_1, STAGE_2, STAGE_3, STAGE_4, STAGE_5, STAGE_6];
