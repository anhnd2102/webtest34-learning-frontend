// Sinh .js cạnh nguồn .ts (emit tại chỗ, file .js được commit). Dùng: npm run build
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { emit, root } from './build-lib.mjs';

const out = mkdtempSync(path.join(tmpdir(), 'build-'));
try {
  for (const rel of emit(out)) copyFileSync(path.join(out, rel), path.join(root, 'term-tests', rel));
  console.log('build ok');
} finally {
  rmSync(out, { recursive: true, force: true });
}
