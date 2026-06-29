// 自定义构建脚本，使用 ESBuild 和移除 console 插件
import { build } from 'esbuild';
import removeConsolePlugin from './remove-console-plugin.js';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// 构建配置
const config = {
  entryPoints: ['./src/index.js'],
  bundle: true,
  minify: true,
  outfile: './dist/index.js',
  plugins: [
    removeConsolePlugin
  ],
  format: 'esm', // 使用 ES 模块格式以支持顶层 await
  target: ['es2022'], // 设置目标环境以支持顶层 await
  // 定义环境变量
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  alias: {
    '@': path.resolve('./src')
  }
};

// 执行构建
build(config).then(() => {
  // 构建完成后，再次处理生成的文件以确保移除所有 console 语句
  console.log('Build completed. Post-processing to remove any remaining console statements...');
  
  // 读取生成的文件
  let contents = readFileSync('./dist/index.js', 'utf8');
  
  // 移除所有 console.log, console.info, console.warn, console.error 语句
  contents = contents.replace(/console\.(log|info|warn|error)\s*\([^;]*;/g, '');
  
  // 写回文件
  writeFileSync('./dist/index.js', contents);
  
  console.log('Post-processing completed. All console statements removed.');
}).catch(() => process.exit(1));
