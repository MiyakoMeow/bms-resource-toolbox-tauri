/**
 * 命令注册表
 *
 * 包含所有 Tauri 命令的完整元数据定义
 * 每个命令都有其参数、描述、返回类型等信息
 */

import type { CategoryMetadata, CommandDefinition } from '../types/commands';
import { CommandCategory, ParameterType } from '../types/enums';
import { BMSEvent, BmsFolderSetNameType, RemoveMediaPreset, ReplacePreset } from '../types/enums';
import { GENERATED_COMMAND_REGISTRY } from './commandRegistry.generated';

/**
 * 分类元数据
 */
export const CATEGORY_METADATA: Record<CommandCategory, CategoryMetadata> = {
  [CommandCategory.BMS]: {
    id: CommandCategory.BMS,
    name: 'BMS 操作',
    icon: '🎵',
    description: 'BMS 文件解析和目录检查',
    color: 'from-purple-500 to-pink-500',
  },
  [CommandCategory.FS]: {
    id: CommandCategory.FS,
    name: '文件系统',
    icon: '📁',
    description: '文件系统操作和比较',
    color: 'from-blue-500 to-cyan-500',
  },
  [CommandCategory.Work]: {
    id: CommandCategory.Work,
    name: '工作目录',
    icon: '📂',
    description: '工作目录重命名和管理',
    color: 'from-green-500 to-emerald-500',
  },
  [CommandCategory.Root]: {
    id: CommandCategory.Root,
    name: '根目录',
    icon: '🏠',
    description: '根目录批量操作',
    color: 'from-orange-500 to-amber-500',
  },
  [CommandCategory.BigPack]: {
    id: CommandCategory.BigPack,
    name: '大包管理',
    icon: '📦',
    description: '大型包的拆分和合并',
    color: 'from-red-500 to-rose-500',
  },
  [CommandCategory.Pack]: {
    id: CommandCategory.Pack,
    name: '包转换',
    icon: '🔄',
    description: '包格式转换（Raw/HQ/LQ）',
    color: 'from-indigo-500 to-violet-500',
  },
  [CommandCategory.Rawpack]: {
    id: CommandCategory.Rawpack,
    name: '原始包',
    icon: '📜',
    description: '原始压缩包解压',
    color: 'from-teal-500 to-cyan-500',
  },
  [CommandCategory.RootEvent]: {
    id: CommandCategory.RootEvent,
    name: '活动管理',
    icon: '🎉',
    description: 'BMS 活动目录管理',
    color: 'from-yellow-500 to-orange-500',
  },
  [CommandCategory.BMSEvent]: {
    id: CommandCategory.BMSEvent,
    name: 'BMS 活动',
    icon: '🎊',
    description: 'BMS 活动相关操作',
    color: 'from-fuchsia-500 to-pink-500',
  },
  [CommandCategory.Media]: {
    id: CommandCategory.Media,
    name: '媒体处理',
    icon: '🎬',
    description: '音视频文件处理和探测',
    color: 'from-violet-500 to-purple-500',
  },
  [CommandCategory.Wasted]: {
    id: CommandCategory.Wasted,
    name: 'Wasted',
    icon: '🧩',
    description: '特殊工具集',
    color: 'from-slate-500 to-gray-500',
  },
};

/**
 * 枚举选项映射
 * 为命令参数的枚举类型提供中文标签
 */
const ENUM_OPTIONS_MAP: Record<string, Array<{ value: unknown; label: string }>> = {
  BmsFolderSetNameType: [
    {
      value: BmsFolderSetNameType.ReplaceTitleArtist,
      label: '替换为 "Title [Artist]"',
    },
    {
      value: BmsFolderSetNameType.AppendTitleArtist,
      label: '追加 " Title [Artist]"',
    },
    { value: BmsFolderSetNameType.AppendArtist, label: '追加 " [Artist]"' },
  ],
  ReplacePreset: [
    { value: ReplacePreset.Default, label: '默认' },
    { value: ReplacePreset.UpdatePack, label: '更新包' },
  ],
  BMSEvent: [
    { value: BMSEvent.BOFNT, label: 'BOFNT' },
    { value: BMSEvent.BOFTT, label: 'BOFTT' },
    { value: BMSEvent.LetsBMSEdit, label: 'LetsBMSEdit' },
    { value: BMSEvent.LetsBMSEdit2, label: 'LetsBMSEdit2' },
    { value: BMSEvent.LetsBMSEdit3, label: 'LetsBMSEdit3' },
    { value: BMSEvent.LetsBMSEdit4, label: 'LetsBMSEdit4' },
  ],
  RemoveMediaPreset: [
    {
      value: RemoveMediaPreset.Oraja,
      label: '完整预设（推荐用于 beatoraja/Qwilight）',
    },
    { value: RemoveMediaPreset.WavFillFlac, label: '简单预设：wav -> flac' },
    { value: RemoveMediaPreset.MpgFillWmv, label: '简单预设：mpg -> wmv' },
  ],
};

/**
 * 扩展自动生成的命令注册表，添加手动元数据
 */
const COMMAND_REGISTRY_WITH_EXTRAS: CommandDefinition[] = GENERATED_COMMAND_REGISTRY.map((cmd) => {
  // 为枚举参数添加选项
  const enhancedParameters = cmd.parameters.map((param) => {
    // 检查参数类型是否为枚举
    if (param.type === ParameterType.Enum) {
      // 尝试从映射中获取选项
      for (const [key, options] of Object.entries(ENUM_OPTIONS_MAP)) {
        // 检查参数类型字符串是否包含枚举名称
        if (param.typeString && param.typeString.includes(key)) {
          return {
            ...param,
            enumOptions: options,
          };
        }
      }
    }

    return param;
  });

  return {
    ...cmd,
    parameters: enhancedParameters,
  };
});

/**
 * 命令注册表
 */
export const COMMAND_REGISTRY: CommandDefinition[] = COMMAND_REGISTRY_WITH_EXTRAS;

/**
 * 根据 ID 获取命令
 */
export function getCommandById(id: string): CommandDefinition | undefined {
  return COMMAND_REGISTRY.find((cmd) => cmd.id === id);
}

/**
 * 根据分类获取命令列表
 */
export function getCommandsByCategory(category: CommandCategory): CommandDefinition[] {
  return COMMAND_REGISTRY.filter((cmd) => cmd.category === category);
}

/**
 * 搜索命令
 */
export function searchCommands(query: string): CommandDefinition[] {
  const lowerQuery = query.toLowerCase();
  return COMMAND_REGISTRY.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery) ||
      cmd.id.toLowerCase().includes(lowerQuery)
  );
}
