/**
 * 枚举类型定义
 *
 * 定义了所有后端 Rust 枚举对应的 TypeScript 枚举类型
 */

/**
 * BMS 文件夹命名类型
 * 对应 Rust: BmsFolderSetNameType
 */
export enum BmsFolderSetNameType {
  /** 替换为 "Title [Artist]" */
  ReplaceTitleArtist = 0,
  /** 追加 " Title [Artist]" */
  AppendTitleArtist = 1,
  /** 追加 " [Artist]" */
  AppendArtist = 2,
}

/**
 * 替换预设
 * 对应 Rust: ReplacePreset
 */
export enum ReplacePreset {
  /** 默认行为 */
  Default = 0,
  /** 更新包行为 */
  UpdatePack = 1,
}

/**
 * BMS 活动类型
 * 对应 Rust: BMSEvent
 */
export enum BMSEvent {
  BOFNT = 19,
  BOFTT = 20,
  LetsBMSEdit = 101,
  LetsBMSEdit2 = 102,
  LetsBMSEdit3 = 103,
  LetsBMSEdit4 = 104,
}

/**
 * 媒体删除预设
 * 对应 Rust: RemoveMediaPreset
 */
export enum RemoveMediaPreset {
  /** 完整预设（推荐用于 beatoraja/Qwilight） */
  Oraja = 0,
  /** 简单预设：wav -> flac */
  WavFillFlac = 1,
  /** 简单预设：mpg -> wmv */
  MpgFillWmv = 2,
}

/**
 * 参数类型
 * 用于前端动态渲染不同类型的输入控件
 */
export enum ParameterType {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Enum = 'enum',
  File = 'file',
  Directory = 'directory',
  StringArray = 'string[]',
  NumberArray = 'number[]',
}

/**
 * 命令执行状态
 */
export enum CommandStatus {
  Idle = 'idle',
  Validating = 'validating',
  Executing = 'executing',
  Success = 'success',
  Error = 'error',
}

/**
 * 命令分类
 * 对应后端的命令分组
 */
export enum CommandCategory {
  /** BMS 操作 - BMS 文件解析和目录检查 */
  BMS = 'bms',
  /** 文件系统 - 文件系统操作和比较 */
  FS = 'fs',
  /** 工作目录 - 工作目录重命名和管理 */
  Work = 'work',
  /** 根目录 - 根目录批量操作 */
  Root = 'root',
  /** 大包管理 - 大型包的拆分和合并 */
  BigPack = 'bigpack',
  /** 包转换 - 包格式转换（Raw/HQ/LQ） */
  Pack = 'pack',
  /** 原始包 - 原始压缩包解压 */
  Rawpack = 'rawpack',
  /** 活动管理 - BMS 活动目录管理 */
  RootEvent = 'root_event',
  /** BMS 活动 - BMS 活动相关操作 */
  BMSEvent = 'bms_event',
}
