/**
 * Vite 插件：自动生成命令注册表
 *
 * 在构建和开发时自动扫描带有 @command 标签的函数，
 * 生成命令注册表和前端命令路由
 */

import { type Plugin } from 'vite';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface GenerateCommandsPluginOptions {
  /**
   * 是否在开发模式下监听文件变化
   * @default true
   */
  watch?: boolean;

  /**
   * 是否在启动时生成
   * @default true
   */
  generateOnStartup?: boolean;
}

/**
 * 创建命令生成插件
 */
export function generateCommandsPlugin(options: GenerateCommandsPluginOptions = {}): Plugin {
  const { watch = true, generateOnStartup = true } = options;

  let generateTimer: NodeJS.Timeout | undefined;

  /**
   * 运行代码生成器
   */
  async function runGenerator(): Promise<void> {
    try {
      console.log('📝 Generating command registry...');
      const startTime = Date.now();

      // 使用 Deno 运行代码生成器
      await execAsync(
        'deno run --allow-read --allow-write --allow-env --node-modules-dir scripts/generate-command-registry.ts',
        {
          cwd: process.cwd(),
        }
      );

      const duration = Date.now() - startTime;
      console.log(`✅ Command registry generated in ${duration}ms`);
    } catch (error) {
      console.error('❌ Failed to generate commands:', error);
    }
  }

  /**
   * 防抖执行生成器
   */
  function scheduleGeneration() {
    if (generateTimer) {
      clearTimeout(generateTimer);
    }
    generateTimer = setTimeout(() => {
      runGenerator();
    }, 500); // 500ms 防抖
  }

  return {
    name: 'vite-plugin-generate-commands',

    // 构建开始时生成
    async buildStart() {
      if (generateOnStartup) {
        await runGenerator();
      }
    },

    // 配置开发服务器
    configureServer(server) {
      if (!watch) return;

      // 监听 src/lib/utils 目录下的文件变化
      server.watcher.on('all', (event, filePath) => {
        if (filePath.includes('src\\lib\\utils') || filePath.includes('src/lib/utils')) {
          if (
            filePath.endsWith('.ts') &&
            !filePath.includes('.generated.ts') &&
            !filePath.includes('node_modules')
          ) {
            console.log(`📄 [${event}] ${path.relative(process.cwd(), filePath)}`);
            scheduleGeneration();
          }
        }
      });

      console.log('👀 Watching for changes in src/lib/utils...');
    },

    // 处理热更新
    handleHotUpdate({ file }) {
      if (file.includes('src\\lib\\utils') || file.includes('src/lib/utils')) {
        if (
          file.endsWith('.ts') &&
          !file.includes('.generated.ts') &&
          !file.includes('node_modules')
        ) {
          console.log(`🔥 [HMR] ${path.relative(process.cwd(), file)}`);
          scheduleGeneration();
        }
      }
    },
  };
}

export default generateCommandsPlugin;
