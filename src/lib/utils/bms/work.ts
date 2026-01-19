/**
 * BMS 工作名称提取模块
 * 从 Python 代码迁移：legacy/bms/work.py
 */

/**
 * 括号对定义
 */
const BRACKET_PAIRS: [string, string][] = [
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['（', '）'],
  ['［', '］'],
  ['｛', '｝'],
  ['【', '】'],
];

/**
 * 从多个 BMS 标题中提取共同的作品名（改进版）
 *
 * @param titles - 包含多个 BMS 标题的列表
 * @param removeUnlosedPair - 是否移除未闭合括号及其后续内容
 * @param removeTailingSignList - 要移除的尾部符号列表
 * @returns 提取出的共同作品名（经过后处理）
 *
 * @command
 * @category bms
 * @dangerous false
 * @name 提取作品名称
 * @description 从多个 BMS 标题中提取共同的作品名
 * @frontend true
 */
export function extractWorkName(
  titles: string[],
  removeUnlosedPair: boolean = true,
  removeTailingSignList?: string[]
): string {
  if (titles.length === 0) {
    return '';
  }

  // 统计所有可能前缀的出现次数
  const prefixCounts = new Map<string, number>();

  for (const title of titles) {
    for (let i = 1; i <= title.length; i++) {
      const prefix = title.substring(0, i);
      const count = prefixCounts.get(prefix) || 0;
      prefixCounts.set(prefix, count + 1);
    }
  }

  if (prefixCounts.size === 0) {
    return '';
  }

  // 当只有一个标题时，没有共同前缀，直接返回空字符串
  if (titles.length <= 1) {
    return '';
  }

  // 找到最大出现次数
  const maxCount = Math.max(...prefixCounts.values());

  // 筛选出超过 2/3 次数的前缀
  const threshold = maxCount * 0.67;
  const candidates: [string, number][] = [];
  for (const [prefix, count] of prefixCounts.entries()) {
    if (count >= threshold) {
      candidates.push([prefix, count]);
    }
  }

  if (candidates.length === 0) {
    return '';
  }

  // 排序规则：优先长度降序，其次次数降序，最后字典序升序
  candidates.sort((a, b) => {
    if (a[0].length !== b[0].length) {
      return b[0].length - a[0].length; // 长度降序
    }
    if (a[1] !== b[1]) {
      return b[1] - a[1]; // 次数降序
    }
    return a[0].localeCompare(b[0]); // 字典序升序
  });

  // 提取最优候选
  const bestCandidate = candidates[0][0];

  // 后处理：移除未闭合括号及其后续内容
  return extractWorkNamePostProcess(bestCandidate, removeUnlosedPair, removeTailingSignList);
}

/**
 * 后处理函数：移除未闭合括号及其后续内容
 *
 * @param s - 原始字符串
 * @param removeUnlosedPair - 是否移除未闭合括号
 * @param removeTailingSignList - 要移除的尾部符号列表
 * @returns 处理后的字符串
 */
function extractWorkNamePostProcess(
  s: string,
  removeUnlosedPair: boolean,
  removeTailingSignList?: string[]
): string {
  // 清除前后空格
  let result = s.trim();

  if (removeTailingSignList === undefined) {
    removeTailingSignList = [];
  }

  while (true) {
    let triggered = false;

    if (removeUnlosedPair) {
      // 使用栈记录括号状态
      const stack: Array<[string, number]> = [];

      // 遍历字符串记录括号状态
      for (let i = 0; i < result.length; i++) {
        const c = result[i];

        for (const [open, close] of BRACKET_PAIRS) {
          if (c === open) {
            stack.push([open, i]); // 记录括号类型和位置
          } else if (c === close && stack.length > 0 && stack[stack.length - 1][0] === open) {
            stack.pop();
          }
        }
      }

      // 如果存在未闭合括号
      if (stack.length > 0) {
        const lastUnmatchedPos = stack[stack.length - 1][1];
        result = result.substring(0, lastUnmatchedPos).trimRight(); // 截断并移除末尾空格
        triggered = true;
      }
    }

    // 移除指定的尾部符号
    for (const sign of removeTailingSignList) {
      if (result.endsWith(sign)) {
        result = result.substring(0, result.length - sign.length).trimRight();
        triggered = true;
      }
    }

    // 没触发？退出循环
    if (!triggered) {
      break;
    }
  }

  return result;
}
