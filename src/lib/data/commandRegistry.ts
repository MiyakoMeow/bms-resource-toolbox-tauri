/**
 * 命令注册表
 *
 * 包含所有 Tauri 命令的完整元数据定义
 * 每个命令都有其参数、描述、返回类型等信息
 */

import type { CommandDefinition, CategoryMetadata } from '$lib/types/commands.js';
import { CommandCategory, ParameterType } from '$lib/types/enums.js';
import { BmsFolderSetNameType, ReplacePreset, BMSEvent } from '$lib/types/enums.js';

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
};

/**
 * 命令注册表
 *
 * 注意：这是一个包含示例命令的版本
 * 完整版本需要包含所有 33 个命令
 */
export const COMMAND_REGISTRY: CommandDefinition[] = [
  // ========== BMS 组（示例：3个）==========
  {
    id: 'parse_bms_file',
    name: '解析 BMS 文件',
    category: CommandCategory.BMS,
    description: '解析单个 BMS 文件，提取元数据信息（标题、艺术家等）',
    parameters: [
      {
        name: 'file',
        type: ParameterType.File,
        required: true,
        description: 'BMS 文件路径（.bms/.bme/.bml 等）',
      },
    ],
    returnType: 'BMSOutput',
    dangerous: false,
  },

  {
    id: 'is_work_dir',
    name: '检查工作目录',
    category: CommandCategory.BMS,
    description: '检查指定目录是否为有效的 BMS 工作目录',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: '要检查的目录路径',
      },
    ],
    returnType: 'boolean',
    dangerous: false,
  },

  {
    id: 'get_dir_bms_info',
    name: '获取目录 BMS 信息',
    category: CommandCategory.BMS,
    description: '从目录的 info.toml 文件读取 BMS 摘要信息',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: 'BMS 工作目录路径',
      },
    ],
    returnType: 'Option<Bms>',
    dangerous: false,
  },

  // ========== FS 组（示例：2个）==========
  {
    id: 'is_file_same_content',
    name: '比较文件内容',
    category: CommandCategory.FS,
    description: '检查两个文件的内容是否相同',
    parameters: [
      {
        name: 'file1',
        type: ParameterType.File,
        required: true,
        description: '第一个文件路径',
      },
      {
        name: 'file2',
        type: ParameterType.File,
        required: true,
        description: '第二个文件路径',
      },
    ],
    returnType: 'boolean',
    dangerous: false,
  },

  {
    id: 'remove_empty_folders',
    name: '删除空文件夹',
    category: CommandCategory.FS,
    description: '递归删除指定目录下的所有空文件夹',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: '要清理的目录路径',
      },
      {
        name: 'dry_run',
        type: ParameterType.Boolean,
        required: false,
        description: '模拟运行（不实际删除）',
        defaultValue: true,
      },
    ],
    returnType: 'void',
    dangerous: true,
  },

  // ========== Work 组（示例：1个）==========
  {
    id: 'work_set_name_by_bms',
    name: '按 BMS 重命名工作目录',
    category: CommandCategory.Work,
    description: '根据 BMS 文件信息重命名工作目录',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: '工作目录路径',
      },
      {
        name: 'set_type',
        type: ParameterType.Enum,
        required: true,
        description: '命名方式',
        defaultValue: BmsFolderSetNameType.AppendTitleArtist,
        enumOptions: [
          {
            value: BmsFolderSetNameType.ReplaceTitleArtist,
            label: '替换为 "Title [Artist]"',
          },
          {
            value: BmsFolderSetNameType.AppendTitleArtist,
            label: '追加 " Title [Artist]"',
          },
          {
            value: BmsFolderSetNameType.AppendArtist,
            label: '追加 " [Artist]"',
          },
        ],
      },
      {
        name: 'dry_run',
        type: ParameterType.Boolean,
        required: false,
        description: '模拟运行（不实际执行）',
        defaultValue: true,
      },
      {
        name: 'replace',
        type: ParameterType.Enum,
        required: true,
        description: '文件替换策略',
        defaultValue: ReplacePreset.Default,
        enumOptions: [
          {
            value: ReplacePreset.Default,
            label: '默认',
          },
          {
            value: ReplacePreset.UpdatePack,
            label: '更新包',
          },
        ],
      },
      {
        name: 'skip_already_formatted',
        type: ParameterType.Boolean,
        required: false,
        description: '跳过已格式化的目录',
        defaultValue: false,
      },
    ],
    returnType: 'void',
    dangerous: true,
  },

  // ========== Root 组（示例：1个）==========
  {
    id: 'root_scan_folder_similar_folders',
    name: '扫描相似文件夹',
    category: CommandCategory.Root,
    description: '扫描目录，找出相似度超过阈值的文件夹对',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: '要扫描的目录路径',
      },
      {
        name: 'similarity',
        type: ParameterType.Number,
        required: true,
        description: '相似度阈值（0.0-1.0）',
        defaultValue: 0.85,
      },
    ],
    returnType: 'Vec<(String, String, f64)>',
    dangerous: false,
  },

  // ========== Big Pack 组（示例：1个）==========
  {
    id: 'root_split_folders_with_first_char',
    name: '按首字符拆分文件夹',
    category: CommandCategory.BigPack,
    description: '将根目录下的工作文件夹按首字符规则拆分到不同的分类文件夹',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: '根目录路径',
      },
      {
        name: 'dry_run',
        type: ParameterType.Boolean,
        required: false,
        description: '模拟运行（不实际执行）',
        defaultValue: true,
      },
    ],
    returnType: 'void',
    dangerous: true,
  },

  // ========== Pack 组（示例：1个）==========
  {
    id: 'pack_raw_to_hq',
    name: 'Raw 包转 HQ 包',
    category: CommandCategory.Pack,
    description: '将原始音频（WAV）转换为高质量格式（FLAC），适用于 beatoraja/Qwilight',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: '根目录路径',
      },
    ],
    returnType: 'void',
    dangerous: true,
  },

  // ========== Rawpack 组（示例：1个）==========
  {
    id: 'rawpack_unzip_numeric_to_bms_folder',
    name: '解压数字编号压缩包',
    category: CommandCategory.Rawpack,
    description: '解压数字编号的压缩包到对应的 BMS 文件夹',
    parameters: [
      {
        name: 'pack_dir',
        type: ParameterType.Directory,
        required: true,
        description: '压缩包目录路径',
      },
      {
        name: 'cache_dir',
        type: ParameterType.Directory,
        required: true,
        description: '缓存目录路径',
      },
      {
        name: 'root_dir',
        type: ParameterType.Directory,
        required: true,
        description: '输出目录路径',
      },
      {
        name: 'confirm',
        type: ParameterType.Boolean,
        required: false,
        description: '确认操作',
        defaultValue: false,
      },
      {
        name: 'replace',
        type: ParameterType.Enum,
        required: true,
        description: '文件替换策略',
        defaultValue: ReplacePreset.Default,
        enumOptions: [
          {
            value: ReplacePreset.Default,
            label: '默认',
          },
          {
            value: ReplacePreset.UpdatePack,
            label: '更新包',
          },
        ],
      },
    ],
    returnType: 'void',
    dangerous: true,
  },

  // ========== Root Event 组（示例：1个）==========
  {
    id: 'root_event_check_num_folder',
    name: '检查数字文件夹',
    category: CommandCategory.RootEvent,
    description: '检查从 1 到 max 的数字编号文件夹哪些不存在',
    parameters: [
      {
        name: 'dir',
        type: ParameterType.Directory,
        required: true,
        description: '目录路径',
      },
      {
        name: 'max',
        type: ParameterType.Number,
        required: true,
        description: '最大编号',
      },
    ],
    returnType: 'Vec<PathBuf>',
    dangerous: false,
  },

  // ========== BMS Event 组（示例：2个）==========
  {
    id: 'bms_event_open_list',
    name: '打开 BMS 活动列表',
    category: CommandCategory.BMSEvent,
    description: '在浏览器中打开 BMS 活动列表页面',
    parameters: [
      {
        name: 'event',
        type: ParameterType.Enum,
        required: true,
        description: 'BMS 活动',
        enumOptions: [
          {
            value: BMSEvent.BOFNT,
            label: 'BOFNT',
          },
          {
            value: BMSEvent.BOFTT,
            label: 'BOFTT',
          },
          {
            value: BMSEvent.LetsBMSEdit,
            label: 'LetsBMSEdit',
          },
          {
            value: BMSEvent.LetsBMSEdit2,
            label: 'LetsBMSEdit2',
          },
          {
            value: BMSEvent.LetsBMSEdit3,
            label: 'LetsBMSEdit3',
          },
          {
            value: BMSEvent.LetsBMSEdit4,
            label: 'LetsBMSEdit4',
          },
        ],
      },
    ],
    returnType: 'void',
    dangerous: false,
  },

  {
    id: 'bms_event_open_event_works',
    name: '打开 BMS 活动作品页面',
    category: CommandCategory.BMSEvent,
    description: '批量打开指定 BMS 活动中的多个作品详情页面',
    parameters: [
      {
        name: 'event',
        type: ParameterType.Enum,
        required: true,
        description: 'BMS 活动',
        enumOptions: [
          {
            value: BMSEvent.BOFNT,
            label: 'BOFNT',
          },
          {
            value: BMSEvent.BOFTT,
            label: 'BOFTT',
          },
          {
            value: BMSEvent.LetsBMSEdit,
            label: 'LetsBMSEdit',
          },
          {
            value: BMSEvent.LetsBMSEdit2,
            label: 'LetsBMSEdit2',
          },
          {
            value: BMSEvent.LetsBMSEdit3,
            label: 'LetsBMSEdit3',
          },
          {
            value: BMSEvent.LetsBMSEdit4,
            label: 'LetsBMSEdit4',
          },
        ],
      },
      {
        name: 'work_ids',
        type: ParameterType.NumberArray,
        required: true,
        description: '作品 ID 列表',
      },
    ],
    returnType: 'void',
    dangerous: false,
  },
];

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
