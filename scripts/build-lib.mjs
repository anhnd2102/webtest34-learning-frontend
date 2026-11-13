// Emit các file .ts theo tsconfig.build.json và thêm `?rev=` vào import nội bộ.
// Nguồn .ts viết import `./x.js` (tsc không phân giải được chuỗi cache-bust); rev lấy từ chính
// content-preview.mjs để quy trình nâng rev bằng sed hiện có vẫn đúng.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

export function currentRev() {
  const source = readFileSync(path.join(root, 'term-tests/webtest-34-demo/content-preview.mjs'), 'utf8');
  const match = source.match(/candidate\/text-utils\.js\?rev=([\w.-]+)/);
  if (!match) throw new Error('Không tìm thấy rev trong content-preview.mjs');
  return match[1];
}

const walk = dir => readdirSync(dir).flatMap(name => {
  const p = path.join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

/** Emit vào outDir; trả về danh sách đường dẫn tương đối (so với term-tests) đã sinh. */
export function emit(outDir) {
  const run = spawnSync(process.execPath, [tsc, '-p', 'tsconfig.build.json', '--outDir', outDir], { cwd: root, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stdout || run.stderr);
  const rev = currentRev();
  // Chỉ file .js có nguồn .ts cạnh nó; file .js thuần được .ts import (allowJs) chỉ phục vụ kiểm kiểu, không được ghi đè.
  const files = walk(outDir).filter(file => file.endsWith('.js') && existsSync(path.join(root, 'term-tests', path.relative(outDir, file).replace(/\.js$/, '.ts'))));
  for (const file of files) {
    const code = readFileSync(file, 'utf8');
    const rewritten = code.replace(/(\bfrom\s+')(\.{1,2}\/[^'?]+\.m?js)(')/g, `$1$2?rev=${rev}$3`);
    if (rewritten !== code) writeFileSync(file, rewritten);
  }
  return files.map(file => path.relative(outDir, file));
}
