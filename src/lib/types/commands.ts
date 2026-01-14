/**
 * 命令类型定义
 *
 * 定义了命令系统的核心接口和类型
 */

import type { ParameterType, CommandCategory } from './enums.js';

/**
 * 命令参数定义
 */
export interface CommandParameter {
  /** 参数名（对应 Rust 函数参数名） */
  name: string;
  /** 参数类型 */
  type: ParameterType;
  /** 是否必需 */
  required: boolean;
  /** 参数描述 */
  description: string;
  /** 默认值 */
  defaultValue?: unknown;
  /** 枚举选项（当 type=enum 时使用） */
  enumOptions?: Array<{
    value: unknown;
    label: string;
  }>;
  /** 验证函数（可选） */
  validation?: (value: unknown) => boolean | string;
}

/**
 * 命令定义
 * 描述一个 Tauri 命令的完整元数据
 */
export interface CommandDefinition {
  /** 命令 ID（对应 Rust 中的 Tauri 命令名） */
  id: string;
  /** 显示名称（中文） */
  name: string;
  /** 所属分类 */
  category: CommandCategory;
  /** 命令描述 */
  description: string;
  /** 参数列表 */
  parameters: CommandParameter[];
  /** 返回值类型描述 */
  returnType: string;
  /** 是否为危险操作（会修改文件系统） */
  dangerous: boolean;
  /** 使用示例（可选） */
  example?: string;
}

/**
 * 命令执行结果
 * 记录一次命令执行的完整信息
 */
export interface CommandExecution {
  /** 执行 ID（时间戳） */
  id: string;
  /** 命令 ID */
  commandId: string;
  /** 命令名称 */
  commandName: string;
  /** 执行时间戳 */
  timestamp: number;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 是否成功 */
  success: boolean;
  /** 返回结果 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 使用的参数 */
  params: Record<string, unknown>;
}

/**
 * 分类元数据
 */
export interface CategoryMetadata {
  id: CommandCategory;
  name: string;
  icon: string;
  description: string;
  color: string;
}
