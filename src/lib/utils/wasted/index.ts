/**
 * Wasted 模块
 * 导出所有公共 API
 */

import { AeryFix } from './aery_fix';

export * from './aery_fix';

export const fix = AeryFix.fix.bind(AeryFix);
