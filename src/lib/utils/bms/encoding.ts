/**
 * BMS 编码处理模块
 * 从 Python 代码迁移：legacy/bms/encoding.py
 */

/**
 * 支持的编码列表（优先级从高到低）
 */
export const ENCODINGS = [
  'shift-jis',
  'shift-jis-2004',
  'gb2312',
  'utf-8',
  'gb18030',
  'shift-jisx0213',
] as const;

/**
 * BOFTT ID 特定编码表
 * 某些作品 ID 使用特定的编码
 */
export const BOFTT_ID_SPECIFIC_ENCODING_TABLE: Record<string, string> = {
  '134': 'utf-8',
  '191': 'gbk',
  '435': 'gbk',
  '439': 'gbk',
  // 注意：159 bms 文件本身有编码问题
};

/**
 * 编码优先级解码器
 * 按照编码优先级逐字符解码字节数据
 */
export class PriorityDecoder {
  private encodingPriority: string[];
  private codecs: Map<string, TextDecoder>;
  private final: string;

  /**
   * 初始化优先级解码器
   *
   * @param encodingPriority - 编码优先级列表，靠前的编码优先级更高
   * @param final - 最终备选编码（默认 utf-8）
   */
  constructor(encodingPriority: string[], final: string = 'utf-8') {
    this.encodingPriority = encodingPriority;
    this.codecs = new Map();
    // 预加载所有编码的 TextDecoder
    for (const enc of encodingPriority) {
      try {
        this.codecs.set(enc, new TextDecoder(enc));
      } catch (error) {
        console.warn(`Failed to create TextDecoder for encoding: ${enc}`, error);
      }
    }
    this.final = final;
  }

  /**
   * 尝试用所有编码解码字节序列，返回第一个成功的解码结果和消耗的字节数
   *
   * @param byteData - 要解码的字节数据
   * @param start - 开始解码的位置
   * @returns (解码后的字符, 消耗的字节数)
   */
  private decodeByteSequence(byteData: Uint8Array, start: number): [string | null, number] {
    for (const enc of this.encodingPriority) {
      const decoder = this.codecs.get(enc);
      if (!decoder) {
        continue;
      }

      try {
        // 尝试解码 1-4 个字节（日文编码通常不超过 4 字节）
        const maxLength = Math.min(5, byteData.length - start);
        for (let length = 1; length < maxLength; length++) {
          try {
            const char = decoder.decode(byteData.slice(start, start + length), {
              stream: true,
            });
            return [char, length];
          } catch {
            // 解码失败，继续尝试下一个长度
            continue;
          }
        }
      } catch {
        // 编码器错误，继续尝试下一个编码
        continue;
      }
    }
    // 所有编码都失败，默认消耗 1 个字节
    return [null, 1];
  }

  /**
   * 按照编码优先级逐字符解码字节数据
   *
   * @param byteData - 要解码的字节数据
   * @param errors - 错误处理方式 ('strict' | 'ignore' | 'replace')
   * @returns 解码后的字符串
   */
  decode(byteData: Uint8Array, errors: 'strict' | 'ignore' | 'replace' = 'strict'): string {
    const result: string[] = [];
    let position = 0;
    const totalLength = byteData.length;

    while (position < totalLength) {
      const [char, consumed] = this.decodeByteSequence(byteData, position);

      if (char !== null) {
        result.push(char);
      } else {
        // 处理解码失败的字节
        if (errors === 'strict') {
          throw new UnicodeDecodeError(
            'priority_decode',
            byteData,
            position,
            position + 1,
            `无法用任何编码解码字节: ${Array.from(byteData.slice(position, position + 1))
              .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
              .join(' ')}`
          );
        } else if (errors === 'replace') {
          result.push('�');
        }
        // ignore 模式不做任何操作
      }

      position += consumed;
    }

    return result.join('');
  }
}

/**
 * Unicode 解码错误
 */
export class UnicodeDecodeError extends Error {
  constructor(encoding: string, byteData: Uint8Array, start: number, end: number, reason?: string) {
    super(reason || `Unicode decode error: ${encoding}`);
    this.name = 'UnicodeDecodeError';
  }
}

/**
 * 获取 BMS 文件字符串
 * 按照编码优先级解码文件内容
 *
 * @param fileBytes - 文件字节数据
 * @param encoding - 特定编码（可选）
 * @returns 解码后的字符串
 */
export function getBmsFileStr(fileBytes: Uint8Array, encoding?: string): string {
  let fileStr = '';
  const encodingPriority: string[] = [...ENCODINGS];

  if (encoding) {
    // 将指定编码放在优先级列表的最前面
    encodingPriority.unshift(encoding);
  }

  const decoder = new PriorityDecoder(encodingPriority);

  try {
    fileStr = decoder.decode(fileBytes, 'strict');
  } catch (error) {
    // 严格模式失败，使用 utf-8 忽略错误
    if (error instanceof Error) {
      console.warn(`Failed to decode with priority encoder: ${error.message}`);
    }
    fileStr = new TextDecoder('utf-8', { ignoreBOM: true, fatal: false })
      .decode(fileBytes)
      .replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, '');
  }

  return fileStr;
}

/**
 * 从文件路径读取 BMS 文件字符串
 *
 * @param filePath - 文件路径
 * @param encoding - 特定编码（可选）
 * @returns 解码后的字符串
 */
export async function readBmsFile(filePath: string, encoding?: string): Promise<string> {
  const { readFile } = await import('@tauri-apps/plugin-fs');
  const fileBytes = await readFile(filePath);
  return getBmsFileStr(new Uint8Array(fileBytes as ArrayBuffer), encoding);
}
