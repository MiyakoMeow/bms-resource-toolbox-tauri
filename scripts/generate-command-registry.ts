/**
 * 命令注册表代码生成器
 *
 * 使用 TypeScript Compiler API 在编译时自动提取命令元数据
 */

import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 命令元数据
 */
interface CommandMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  parameters: ParameterMetadata[];
  returnType: string;
  dangerous: boolean;
  isFrontendCommand: boolean;
  filePath: string;
  functionName: string;
}

/**
 * 参数元数据
 */
interface ParameterMetadata {
  name: string;
  type: string;
  typeString: string;
  required: boolean;
  description: string;
  defaultValue?: unknown;
}

/**
 * 代码生成器类
 */
class CommandGenerator {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private commands: CommandMetadata[] = [];
  private readonly projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;

    // 查找 tsconfig.json
    const configPath = ts.findConfigFile(projectPath, ts.sys.fileExists, 'tsconfig.json');

    if (!configPath) {
      throw new Error('Could not find tsconfig.json');
    }

    // 读取配置文件
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const compilerOptions = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );

    // 创建程序
    this.program = ts.createProgram({
      rootNames: compilerOptions.fileNames,
      options: compilerOptions.options,
    });

    this.checker = this.program.getTypeChecker();
  }

  /**
   * 生成命令注册表和路由
   */
  public generate(): void {
    console.log('Scanning source files...');
    const sourceFiles = this.program.getSourceFiles();

    for (const sourceFile of sourceFiles) {
      // 只处理 src/lib/utils 目录下的文件
      if (!sourceFile.fileName.includes('src/lib/utils')) {
        continue;
      }

      // 跳过生成的文件和 node_modules
      if (
        sourceFile.fileName.includes('node_modules') ||
        sourceFile.fileName.includes('.generated.ts')
      ) {
        continue;
      }

      this.visitNode(sourceFile);
    }

    console.log(`Found ${this.commands.length} commands`);

    this.outputRegistry();
    this.outputFrontendRouter();

    console.log('Generation complete!');
  }

  /**
   * 递归访问 AST 节点
   */
  private visitNode(node: ts.Node): void {
    if (ts.isFunctionDeclaration(node)) {
      this.processFunction(node);
    } else if (ts.isClassDeclaration(node)) {
      this.processClass(node);
    }

    ts.forEachChild(node, (child) => this.visitNode(child));
  }

  /**
   * 处理函数声明
   */
  private processFunction(functionNode: ts.FunctionDeclaration): void {
    const jsDocs = ts.getJSDocTags(functionNode);
    const commandTag = jsDocs.find((tag) => tag.tagName.text === 'command');

    if (!commandTag) {
      return; // 不是命令函数
    }

    const metadata = this.extractMetadata(functionNode, jsDocs);
    this.commands.push(metadata);
  }

  /**
   * 处理类声明（静态方法）
   */
  private processClass(classNode: ts.ClassDeclaration): void {
    if (!classNode.members) {
      return;
    }

    for (const member of classNode.members) {
      if (
        (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) &&
        ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static
      ) {
        const jsDocs = ts.getJSDocTags(member);
        const commandTag = jsDocs.find((tag) => tag.tagName.text === 'command');

        if (commandTag) {
          const metadata = this.extractMetadata(member, jsDocs);
          this.commands.push(metadata);
        }
      }
    }
  }

  /**
   * 提取函数元数据
   */
  private extractMetadata(
    node: ts.FunctionDeclaration | ts.MethodDeclaration,
    jsDocs: ts.JSDocTag[]
  ): CommandMetadata {
    const signature = this.checker.getSignatureFromDeclaration(node);
    if (!signature) {
      throw new Error(`Could not get signature for function: ${node.name?.getText()}`);
    }

    // 提取基本信息
    const functionName = node.name?.getText() || 'unknown';
    const category = this.extractTag(jsDocs, 'category') || 'misc';
    const dangerous = this.extractTag(jsDocs, 'dangerous') === 'true';
    const name = this.extractTag(jsDocs, 'name') || functionName;
    const description = this.extractTag(jsDocs, 'description') || this.extractDescription(node);
    const isFrontendCommand = this.extractTag(jsDocs, 'frontend') === 'true';

    // 生成命令 ID (从函数名转换)
    const id = this.functionToCommandId(functionName, node.getSourceFile().fileName);

    // 提取参数
    const parameters = this.extractParameters(node.parameters);

    // 提取返回类型
    const returnType = this.extractReturnType(signature);

    return {
      id,
      name,
      category,
      description,
      parameters,
      returnType,
      dangerous,
      isFrontendCommand,
      filePath: node.getSourceFile().fileName,
      functionName,
    };
  }

  /**
   * 提取 JSDoc 标签内容
   */
  private extractTag(jsDocs: ts.JSDocTag[], tagName: string): string | undefined {
    const tag = jsDocs.find((t) => t.tagName.text === tagName);
    if (!tag) {
      return undefined;
    }

    // 处理不同类型的标签
    if (ts.isJSDocUnknownTag(tag)) {
      return tag.comment?.toString().trim();
    }

    return undefined;
  }

  /**
   * 提取函数描述
   */
  private extractDescription(node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
    const jsDoc = ts.getJSDocComments(node);
    if (!jsDoc) {
      return '';
    }

    // 提取所有非标签的注释
    const comments: string[] = [];

    jsDoc.forEach((comment) => {
      if (comment.kind === ts.SyntaxKind.JSDocComment) {
        const jsDocComment = comment as ts.JSDoc;
        jsDocComment.tags?.forEach((tag) => {
          if (tag.tagName.text === 'description') {
            comments.push(tag.comment?.toString() || '');
          }
        });
      }
    });

    return comments.join('\n').trim() || 'No description';
  }

  /**
   * 提取参数信息
   */
  private extractParameters(
    parameters: ts.NodeArray<ts.ParameterDeclaration>
  ): ParameterMetadata[] {
    return parameters.map((param) => {
      const paramJsDocs = ts.getJSDocTags(param);
      const description = this.extractParamDescription(paramJsDocs);
      const type = this.checker.getTypeAtLocation(param);
      const fullTypeString = this.checker.typeToString(type);
      const paramName = param.name.getText();

      // 检查是否是枚举类型
      let enumName: string | undefined;

      // 尝试从类型符号获取枚举名称
      const symbol = type.getSymbol();
      if (symbol) {
        // 检查符号的声明
        if (symbol.declarations) {
          for (const decl of symbol.declarations) {
            if (ts.isEnumDeclaration(decl)) {
              enumName = decl.name.getText();
              break;
            }
          }
        }

        // 如果没找到，尝试从符号名称获取
        if (!enumName && symbol.escapedName) {
          const escapedName = symbol.escapedName.toString();
          // 检查是否是枚举类型（首字母大写，不是基本类型）
          if (
            /^[A-Z]/.test(escapedName) &&
            ![
              'string',
              'number',
              'boolean',
              'undefined',
              'null',
              'void',
              'Promise',
              'Array',
            ].includes(escapedName)
          ) {
            enumName = escapedName;
          }
        }
      }

      // 对于联合类型（枚举值），尝试从父类型获取枚举名称
      if (!enumName && type.isUnion()) {
        // 检查是否是数字联合类型（枚举的典型特征）
        const isNumberUnion = type.types.every(
          (t) => t.flags === ts.TypeFlags.NumberLiteral || t.flags === ts.TypeFlags.Number
        );

        if (isNumberUnion && type.types.length > 1) {
          // 尝试从联合类型的符号获取枚举名称
          const unionSymbol = (type as any).symbol;
          if (unionSymbol) {
            // TypeScript 将枚举类型存储为联合类型时，符号名可能包含枚举名
            const escapedName = unionSymbol.escapedName?.toString();
            if (escapedName && /^[A-Z]/.test(escapedName)) {
              enumName = escapedName;
            }
          }
        }
      }

      // 使用枚举名称或简化后的类型字符串
      const finalTypeString = enumName || this.simplifyType(fullTypeString);

      // 提取默认值
      let defaultValue: unknown;
      const defaultTag = paramJsDocs.find((t) => t.tagName.text === 'default');

      if (defaultTag && ts.isJSDocUnknownTag(defaultTag) && defaultTag.comment) {
        const defaultStr = defaultTag.comment.toString().trim();

        // 解析默认值
        if (defaultStr.startsWith('RemoveMediaPreset.')) {
          const enumValue = defaultStr.split('.')[1];
          defaultValue = `RemoveMediaPreset.${enumValue}`;
        } else if (defaultStr.startsWith('ReplacePreset.')) {
          const enumValue = defaultStr.split('.')[1];
          defaultValue = `ReplacePreset.${enumValue}`;
        } else if (defaultStr.startsWith('BmsFolderSetNameType.')) {
          const enumValue = defaultStr.split('.')[1];
          defaultValue = `BmsFolderSetNameType.${enumValue}`;
        } else if (!isNaN(Number(defaultStr))) {
          defaultValue = Number(defaultStr);
        } else if (defaultStr === 'true') {
          defaultValue = true;
        } else if (defaultStr === 'false') {
          defaultValue = false;
        } else {
          defaultValue = defaultStr;
        }
      } else {
        // 自动推断：dryRun/dry_run 默认为 true
        if ((paramName === 'dryRun' || paramName === 'dry_run') && finalTypeString === 'boolean') {
          defaultValue = true;
        }
        // 自动推断：preset 参数使用推荐的默认值
        if (paramName === 'preset' && finalTypeString === 'RemoveMediaPreset') {
          defaultValue = 'RemoveMediaPreset.Oraja';
        }
        // 自动推断：replacePreset 默认为 Default
        if (paramName === 'replacePreset' && finalTypeString === 'ReplacePreset') {
          defaultValue = 'ReplacePreset.Default';
        }
      }

      return {
        name: paramName,
        type: fullTypeString,
        typeString: finalTypeString,
        required: !param.questionToken && !param.initializer,
        description,
        defaultValue,
      };
    });
  }

  /**
   * 提取参数描述
   */
  private extractParamDescription(jsDocs: ts.JSDocTag[]): string {
    const paramTag = jsDocs.find((t) => t.tagName.text === 'param');
    if (!paramTag) {
      return '';
    }

    if (ts.isJSDocParameterTag(paramTag) && paramTag.comment) {
      return paramTag.comment.toString().trim();
    }

    return '';
  }

  /**
   * 简化类型表示
   */
  private simplifyType(typeString: string): string {
    return typeString
      .replace(/Promise<(.+)>/, '$1')
      .replace(/Array<(.+)>/, '$1[]')
      .replace(/undefined \| /, '')
      .replace(/ \| undefined/, '')
      .trim();
  }

  /**
   * 提取返回类型
   */
  private extractReturnType(signature: ts.Signature): string {
    const returnType = signature.getReturnType();
    const returnTypeString = this.checker.typeToString(returnType);
    return this.simplifyType(returnTypeString);
  }

  /**
   * 从函数名生成命令 ID
   */
  private functionToCommandId(functionName: string, filePath: string): string {
    // 根据文件路径确定前缀
    let prefix = '';
    if (filePath.includes('\\work\\') || filePath.includes('/work/')) {
      prefix = 'work_';
    } else if (filePath.includes('\\root\\') || filePath.includes('/root/')) {
      prefix = 'root_';
    } else if (filePath.includes('\\bms\\') || filePath.includes('/bms/')) {
      prefix = ''; // BMS 命令不需要前缀
    } else if (filePath.includes('\\media\\') || filePath.includes('/media/')) {
      prefix = 'work_'; // 媒体命令归类到 work
    } else if (filePath.includes('\\fs\\') || filePath.includes('/fs/')) {
      prefix = ''; // FS 命令不需要前缀
    } else if (filePath.includes('\\event\\') || filePath.includes('/event/')) {
      prefix = 'root_event_';
    } else if (filePath.includes('\\rawpack\\') || filePath.includes('/rawpack/')) {
      prefix = 'rawpack_';
    } else if (filePath.includes('\\pack\\') || filePath.includes('/pack/')) {
      prefix = 'pack_';
    } else if (filePath.includes('\\bigpack\\') || filePath.includes('/bigpack/')) {
      prefix = 'root_';
    }

    // 驼峰转下划线
    const snakeCase = functionName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    return prefix + (snakeCase.startsWith('_') ? snakeCase.slice(1) : snakeCase);
  }

  /**
   * 生成 commandRegistry.generated.ts
   */
  private outputRegistry(): void {
    const content = this.generateRegistryContent();
    const outputPath = path.join(this.projectPath, 'src/lib/data/commandRegistry.generated.ts');

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`Generated: ${outputPath}`);
  }

  /**
   * 生成注册表内容
   */
  private generateRegistryContent(): string {
    const registry = this.generateRegistryArray();

    return `/**
 * 自动生成的命令注册表
 *
 * @generated
 * DO NOT EDIT THIS FILE MANUALLY
 */

import type { CommandDefinition } from '$lib/types/commands.js';
import { CommandCategory, ParameterType } from '$lib/types/enums.js';

/**
 * 自动生成的命令注册表
 */
export const GENERATED_COMMAND_REGISTRY: CommandDefinition[] = [
${registry}
];

/**
 * 获取命令总数
 */
export const COMMAND_COUNT = ${this.commands.length};
`;
  }

  /**
   * 生成注册表数组
   */
  private generateRegistryArray(): string {
    return this.commands
      .map((cmd) => {
        const parameters = this.formatParameters(cmd.parameters);
        // 特殊处理：将小写分类名转换为正确的枚举值
        const formattedCategory = this.formatCategoryName(cmd.category);

        return `  {
    id: '${cmd.id}',
    name: '${cmd.name.replace(/'/g, "\\'")}',
    category: CommandCategory.${formattedCategory},
    description: \`${cmd.description
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$')
      .replace(/\n/g, '\\n')}\`,
    parameters: [
${parameters}
    ],
    returnType: '${cmd.returnType}',
    dangerous: ${cmd.dangerous},
    isFrontendCommand: ${cmd.isFrontendCommand}
  }`;
      })
      .join(',\n');
  }

  /**
   * 格式化参数列表
   */
  private formatParameters(parameters: ParameterMetadata[]): string {
    return parameters
      .map(
        (param) => `      {
        name: '${param.name}',
        type: ${this.mapTypeToParameterType(param.typeString)},
        typeString: '${param.typeString}',
        required: ${param.required},
        description: \`${param.description.replace(/`/g, '\\`')}\`${
          param.defaultValue !== undefined
            ? `,
        defaultValue: ${JSON.stringify(param.defaultValue)}`
            : ''
        }
      }`
      )
      .join(',\n');
  }

  /**
   * 映射 TypeScript 类型到 ParameterType 枚举
   */
  private mapTypeToParameterType(typeString: string): string {
    // 移除空格和换行，但保持大小写
    const cleanType = typeString.replace(/\s+/g, '');

    // 首先检查是否是枚举类型（以大写字母开头的类型）
    // 必须在小写转换之前检查
    if (/^[A-Z]/.test(cleanType)) {
      return 'ParameterType.Enum';
    }

    // 转换为小写用于基本类型匹配
    const lowerType = cleanType.toLowerCase();

    // 基本类型映射
    const typeMap: Record<string, string> = {
      string: 'ParameterType.String',
      number: 'ParameterType.Number',
      boolean: 'ParameterType.Boolean',
      'number[]': 'ParameterType.NumberArray',
    };

    // 检查是否匹配基本类型
    if (typeMap[lowerType]) {
      return typeMap[lowerType];
    }

    // 默认为字符串
    return 'ParameterType.String';
  }

  /**
   * 生成前端命令路由
   */
  private outputFrontendRouter(): void {
    const content = this.generateRouterContent();
    const outputPath = path.join(this.projectPath, 'src/lib/utils/bmsEventHelper.generated.ts');

    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`Generated: ${outputPath}`);
  }

  /**
   * 生成路由内容
   */
  private generateRouterContent(): string {
    const frontendCommands = this.commands.filter((c) => c.isFrontendCommand);
    const routerCases = this.generateRouterCases(frontendCommands);
    const commandIds = frontendCommands.map((c) => `  '${c.id}'`).join(',\n');

    // 收集需要导入的类型
    const typeImports = new Set<string>();
    frontendCommands.forEach((cmd) => {
      cmd.parameters.forEach((param) => {
        // 检查是否是枚举类型
        if (
          param.typeString &&
          /^[A-Z]/.test(param.typeString) &&
          !param.typeString.includes('|')
        ) {
          typeImports.add(param.typeString);
        }
      });
    });

    const typeImportsStr = Array.from(typeImports).sort().join(', ');

    return `/**
 * 自动生成的前端命令路由
 *
 * @generated
 * DO NOT EDIT THIS FILE MANUALLY
 */

import type { CommandResult } from '$lib/types/api.js';
${typeImportsStr ? `import type { ${typeImportsStr} } from '$lib/types/enums.js';` : ''}

/**
 * 自动生成的前端命令执行函数
 */
export async function executeGeneratedFrontendCommand(
  commandId: string,
  params: Record<string, unknown>
): Promise<CommandResult> {
  try {
${routerCases}

    return {
      success: false,
      error: '未知的前端命令'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 获取所有前端命令 ID
 */
export const FRONTEND_COMMAND_IDS: string[] = [
${commandIds}
];
`;
  }

  /**
   * 生成路由 case 语句
   */
  private generateRouterCases(commands: CommandMetadata[]): string {
    return commands
      .map((cmd) => {
        const importPath = this.getImportPath(cmd.filePath);
        const args = this.generateCallArguments(cmd.parameters);

        return `    if (commandId === '${cmd.id}') {
      const { ${cmd.functionName} } = await import('${importPath}');
      const result = await ${cmd.functionName}(${args});
      ${
        cmd.returnType === 'void' || cmd.returnType === 'void | undefined'
          ? 'return { success: true, data: undefined };'
          : 'return { success: true, data: result };'
      }
    }`;
      })
      .join('\n\n');
  }

  /**
   * 生成函数调用参数
   */
  private generateCallArguments(parameters: ParameterMetadata[]): string {
    return parameters.map((param) => `params.${param.name} as ${param.typeString}`).join(', ');
  }

  /**
   * 格式化分类名称，将小写转换为正确的枚举值
   */
  private formatCategoryName(category: string): string {
    // 特殊处理全大写缩写词
    const uppercaseAcronyms: Record<string, string> = {
      bms: 'BMS',
      fs: 'FS',
      bmsevent: 'BMSEvent',
      rootevent: 'RootEvent',
    };

    const lowerCategory = category.toLowerCase();

    // 检查是否是特殊缩写词
    if (uppercaseAcronyms[lowerCategory]) {
      return uppercaseAcronyms[lowerCategory];
    }

    // 默认：首字母大写，其余字母小写
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  }

  /**
   * 获取导入路径
   */
  private getImportPath(filePath: string): string {
    const relativePath = path
      .relative(path.join(this.projectPath, 'src/lib/utils'), filePath)
      .replace(/\\/g, '/'); // 统一使用正斜杠
    return `$lib/utils/${relativePath.replace(/\.ts$/, '.js')}`;
  }
}

// 执行生成器
const generator = new CommandGenerator(process.cwd());
generator.generate();
