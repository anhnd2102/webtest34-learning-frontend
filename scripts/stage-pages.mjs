// Dựng thư mục `_site/` là artifact Pages: toàn bộ repo như trước đây, trừ file không được phục vụ
// (node_modules, .git, .github, _site và mọi nguồn .ts; .js sinh từ .ts đã được commit và vẫn có trong artifact).
// Chạy sau `npm run build:check` để đảm bảo .js khớp .ts. Dùng: npm run stage:pages
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const site = path.join(root, '_site');
const excludedDirs = new Set(['node_modules', '.git', '.github', '_site']);

// Tự duyệt cây thay cho cpSync (cpSync từ chối chép thư mục vào thư mục con của chính nó).
function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) copyTree(source, target);
    } else if (entry.isFile() && !entry.name.endsWith('.ts')) {
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
const leaked = staged.filter(file => file.endsWith('.ts'));
if (leaked.length) throw new Error(`Artifact còn file .ts: ${leaked.join(', ')}`);
for (const required of ['index.html', 'term-tests/webtest-34-demo/candidate/learning-api.js', 'term-tests/webtest-34-demo/candidate/text-utils.js']) {
  if (!existsSync(path.join(site, required))) throw new Error(`Artifact thiếu ${required}`);
}
console.log(`stage:pages ok (${staged.length} file)`);
