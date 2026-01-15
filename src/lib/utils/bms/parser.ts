/**
 * BMS 文件解析器
 * 支持 BMS (.bms, .bme, .bml, .pms) 和 BMSON (.bmson) 格式
 */

import type { Bms, BmsOutput, BmsWarning, BmsMusicInfo, BmsWav, BmsBmp, Bmson } from './types.js';
import { BmsWarningType, PlayingError, PlayingWarning } from './types.js';

/**
 * BMS 解析器类
 */
export class BmsParser {
  /**
   * 从文本内容解析 BMS 文件
   */
  static parse(content: string): BmsOutput {
    const bms: Bms = this.createEmptyBms();
    const warnings: BmsWarning[] = [];

    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 跳过空行和非命令行
      if (!trimmedLine.startsWith('#')) {
        continue;
      }

      // 提取命令和参数
      const commandPart = trimmedLine.substring(1);
      const firstSpaceIndex = commandPart.indexOf(' ');

      let command: string;
      let args: string[];

      if (firstSpaceIndex === -1) {
        command = commandPart;
        args = [];
      } else {
        command = commandPart.substring(0, firstSpaceIndex);
        args = [commandPart.substring(firstSpaceIndex + 1)];
      }

      // 解析各种命令
      this.parseCommand(bms, command, args, warnings);
    }

    return { bms, warnings };
  }

  /**
   * 从 JSON 内容解析 BMSON 文件
   */
  static parseBmson(jsonContent: string): BmsOutput {
    try {
      const bmson: Bmson = JSON.parse(jsonContent);

      const bms: Bms = {
        musicInfo: {
          title: bmson.info?.title,
          artist: bmson.info?.artist,
          genre: bmson.info?.genre,
        },
        wav: {},
        bmp: {},
        bpms: bmson.bpm || {},
      };

      // 转换 WAV
      if (bmson.sound) {
        for (const sound of bmson.sound) {
          if (sound.name) {
            bms.wav[sound.name] = {
              name: sound.name,
              path: sound.file,
            };
          }
        }
      }

      // 转换 BMP
      if (bmson.bmp) {
        for (const bmp of bmson.bmp) {
          if (bmp.name) {
            bms.bmp[bmp.name] = {
              name: bmp.name,
              path: bmp.file,
            };
          }
        }
      }

      const warnings: BmsWarning[] = [];

      return { bms, warnings };
    } catch (error) {
      // JSON 解析失败
      const bms: Bms = this.createEmptyBms();
      const warnings: BmsWarning[] = [
        {
          type: BmsWarningType.PlayingError,
          error: PlayingError.NoNotes,
        },
      ];
      return { bms, warnings };
    }
  }

  /**
   * 创建空的 BMS 对象
   */
  private static createEmptyBms(): Bms {
    return {
      musicInfo: {},
      wav: {},
      bmp: {},
      bpms: {},
    };
  }

  /**
   * 解析单个 BMS 命令
   */
  private static parseCommand(
    bms: Bms,
    command: string,
    args: string[],
    warnings: BmsWarning[]
  ): void {
    const upperCommand = command.toUpperCase();

    switch (upperCommand) {
      case 'TITLE':
        if (args[0]) {
          bms.musicInfo.title = args[0];
        }
        break;

      case 'ARTIST':
        if (args[0]) {
          bms.musicInfo.artist = args[0];
        }
        break;

      case 'GENRE':
        if (args[0]) {
          bms.musicInfo.genre = args[0];
        }
        break;

      case 'BPM':
        if (args[0]) {
          const bpm = parseFloat(args[0]);
          if (!isNaN(bpm)) {
            bms.bpms['main'] = bpm;
          }
        }
        break;

      case 'WAV':
        if (args.length >= 2) {
          this.parseWav(bms, args[0], args[1]);
        }
        break;

      case 'BMP':
        if (args.length >= 2) {
          this.parseBmp(bms, args[0], args[1]);
        }
        break;

      default:
        // 忽略其他命令
        break;
    }
  }

  /**
   * 解析 WAV 命令
   */
  private static parseWav(bms: Bms, key: string, value: string): void {
    bms.wav[key] = {
      name: value,
    };
  }

  /**
   * 解析 BMP 命令
   */
  private static parseBmp(bms: Bms, key: string, value: string): void {
    bms.bmp[key] = {
      name: value,
    };
  }
}
