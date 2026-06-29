import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 构建配置（支持 @ 路径别名）
const buildConfig = {
  entryPoints: [join(__dirname, 'src/index.js')],
  bundle: true,
  minify: false,
  format: 'esm',
  target: ['es2022'],
  platform: 'neutral',
  outfile: join(__dirname, 'dist', 'index.js'),
  define: {
    'process.env.NODE_ENV': '"development"'
  },
  alias: {
    '@': path.resolve(__dirname, 'src')
  },
  external: ['cloudflare:workers'],
  logLevel: 'info'
};

async function startDev() {
  console.log('=== Cloudflare Worker Development Server ===');
  console.log('Supporting @ alias (resolves to ./src)\n');

  // 首次构建
  console.log('[Dev] Building with @ alias support...');
  await esbuild.build(buildConfig);
  console.log('[Dev] Build successful.\n');

  // 启动 wrangler dev 使用预构建文件
  console.log('[Dev] Starting wrangler dev...');
  const wrangler = spawn('npx', ['wrangler', 'dev', '--port', '8787', '--config', 'wrangler.dev.jsonc'], {
    shell: true,
    stdio: 'inherit'
  });

  wrangler.on('error', (err) => {
    console.error('[Dev] Failed to start wrangler:', err);
  });

  // 处理退出信号
  process.on('SIGINT', () => {
    wrangler.kill();
    process.exit(0);
  });
}

startDev().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});