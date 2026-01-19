import type { CommandDefinition } from '../types/commands';
import { ParameterType } from '../types/enums';

/**
 * 参数类型到中文标签的映射
 */
const PARAM_TYPE_LABELS: Record<ParameterType, string> = {
  [ParameterType.String]: '字符串',
  [ParameterType.Number]: '数字',
  [ParameterType.Boolean]: '布尔值',
  [ParameterType.Enum]: '枚举',
  [ParameterType.File]: '文件路径',
  [ParameterType.Directory]: '目录路径',
  [ParameterType.StringArray]: '多个字符串',
  [ParameterType.NumberArray]: '多个数字',
};

/**
 * 统计命令的参数类型并返回格式化的字符串
 *
 * @param command - 命令定义
 * @returns 格式化的参数类型统计字符串，例如："字符串: 2, 数字: 1, 文件路径: 1"
 *
 * @example
 * ```ts
 * // 对于有3个字符串参数和1个数字参数的命令
 * formatParameterTypes(command); // "字符串: 3, 数字: 1"
 *
 * // 对于没有参数的命令
 * formatParameterTypes(command); // "无参数"
 * ```
 */
export function formatParameterTypes(command: CommandDefinition): string {
  const typeCounts = new Map<ParameterType, number>();

  // 统计每种类型的数量
  for (const param of command.parameters) {
    const count = typeCounts.get(param.type) || 0;
    typeCounts.set(param.type, count + 1);
  }

  // 如果没有参数，返回默认文本
  if (typeCounts.size === 0) {
    return '无参数';
  }

  // 转换为格式化的字符串
  const parts = Array.from(typeCounts.entries())
    .map(([type, count]) => `${PARAM_TYPE_LABELS[type]}: ${count}`)
    .join(', ');

  return parts;
}
