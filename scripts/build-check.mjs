// Kiểm tra các file .js sinh từ .ts khớp với bản đã commit (không ghi vào repo). Dùng: npm run build:check
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { emit, root } from './build-lib.mjs';

const normalize = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const out = mkdtempSync(path.join(tmpdir(), 'build-check-'));
try {
  const stale = emit(out).filter(rel => {
    const committed = path.join(root, 'term-tests', rel);
    return !existsSync(committed) || normalize(committed) !== normalize(path.join(out, rel));
  });
  if (stale.length) { console.error(`File .js lệch nguồn .ts, chạy \`npm run build\`: ${stale.join(', ')}`); process.exit(1); }
  console.log('build:check ok');
} catch (error) {
  console.error(error.message);
  process.exit(1);
} finally {
  rmSync(out, { recursive: true, force: true });
}
