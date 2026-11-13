// Dựng thư mục `_site/` là artifact Pages: chỉ những gì trang cần chạy (index.html, term-tests/, .nojekyll).
// Loại tài liệu, test, script, công cụ và mọi nguồn .ts và khai báo .d.mts; .js sinh từ .ts đã được commit và vẫn có trong artifact.
// Chạy sau `npm run build:check` để đảm bảo .js khớp .ts. Dùng: npm run stage:pages
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const site = path.join(root, '_site');
// Thư mục gốc không phục vụ: công cụ, tài liệu, test. Không file nào của site tham chiếu tới chúng (đã grep).
const excludedTopLevel = new Set(['node_modules', '.git', '.github', '_site', 'doc', 'docs', 'scripts', 'test', 'tests']);

// File ở gốc repo được phục vụ (còn lại như package.json, AGENTS.md, serve.mjs, tsconfig không thuộc site).
const rootFiles = new Set(['index.html', '.nojekyll']);
// Tự duyệt cây thay cho cpSync (cpSync từ chối chép thư mục vào thư mục con của chính nó).
function copyTree(from, to, depth = 0) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      if (!(depth === 0 && excludedTopLevel.has(entry.name))) copyTree(source, target, depth + 1);
    } else if (entry.isFile() && !/\.m?ts$/.test(entry.name) && (depth > 0 || rootFiles.has(entry.name))) {
      copyFileSync(source, target);
    }
  }
}

rmSync(site, { recursive: true, force: true });
copyTree(root, site);

const walk = dir => readdirSync(dir).flatMap(name => {
  const p = path.join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const staged = walk(site);
const leaked = staged.filter(file => /\.m?ts$/.test(file));
if (leaked.length) throw new Error(`Artifact còn file .ts: ${leaked.join(', ')}`);
for (const required of ['index.html', 'term-tests/webtest-34-demo/candidate/learning-api.js', 'term-tests/webtest-34-demo/candidate/text-utils.js']) {
  if (!existsSync(path.join(site, required))) throw new Error(`Artifact thiếu ${required}`);
}
console.log(`stage:pages ok (${staged.length} file)`);
