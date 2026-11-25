// Dựng thư mục `_site/` là artifact Pages: chỉ những gì trang cần chạy (index.html, term-tests/, .nojekyll).
// Loại tài liệu, test, script, công cụ và mọi nguồn .ts/.mts và khai báo .d.ts/.d.mts; .js sinh từ .ts đã được commit và vẫn có trong artifact.
// Chạy sau `npm run build:check` để đảm bảo .js khớp .ts. Dùng: npm run stage:pages
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

// Phục vụ trực tiếp ở địa chỉ ngắn (không chuyển hướng, thanh địa chỉ giữ nguyên): `/` là Teacher Dashboard và `/exam/` là renderer học viên.
// Đây là bản sinh ra lúc dựng artifact từ đúng hai trang canonical (không thêm tệp vào kho mã, không phải renderer thứ hai): chỉ viết lại
// các đường dẫn tương đối trong HTML cho khớp vị trí mới. Đường dẫn gốc `/term-tests/...` vẫn được giữ nguyên cho các link đã phát.
const shortEntries = [
  { from: 'term-tests/teacher-dashboard/index.html', to: 'index.html' },
  { from: 'term-tests/webtest-34-demo/index.html', to: 'exam/index.html' }
];
const isExternal = value => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(value);
function retarget(value, fromDir, toDir, selfSource) {
  if (!value || isExternal(value)) return value;
  const suffixAt = value.search(/[?#]/);
  const pathPart = suffixAt < 0 ? value : value.slice(0, suffixAt);
  const suffix = suffixAt < 0 ? '' : value.slice(suffixAt);
  const resolved = path.posix.normalize(path.posix.join(fromDir, pathPart));
  // Liên kết về chính trang (vd. logo "./index.html") trỏ về địa chỉ ngắn thay vì trang canonical dài.
  if (resolved === selfSource) return `./${suffix}`;
  const relative = path.posix.relative(toDir || '.', resolved);
  return `${relative.startsWith('.') ? relative : relative}${suffix}`;
}
function rewriteHtml(html, source, target) {
  const fromDir = path.posix.dirname(source);
  const toDir = path.posix.dirname(target) === '.' ? '' : path.posix.dirname(target);
  return html
    .replace(/(\b(?:href|src)=)(["'])([^"']*)\2/g, (all, attr, quote, value) => `${attr}${quote}${retarget(value, fromDir, toDir, source)}${quote}`)
    .replace(/(\bimport\(\s*)(["'`])(\.{1,2}\/[^"'`]+)\2/g, (all, head, quote, value) => `${head}${quote}${retarget(value, fromDir, toDir, source)}${quote}`);
}
for (const { from, to } of shortEntries) {
  const out = path.join(site, to);
  mkdirSync(path.dirname(out), { recursive: true });
  const html = rewriteHtml(readFileSync(path.join(root, from), 'utf8'), from, to);
  writeFileSync(out, html);
  // Mọi tài nguyên cục bộ sau khi viết lại phải tồn tại trong artifact (bắt lỗi đường dẫn gãy ngay lúc dựng).
  const pageDir = path.posix.dirname(to) === '.' ? '' : path.posix.dirname(to);
  const refs = [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']|\bimport\(\s*["'`]([^"'`]+)["'`]/g)].map(m => m[1] || m[2]);
  for (const ref of refs) {
    if (!ref || isExternal(ref) || /^\.\/?$/.test(ref)) continue;
    const file = path.posix.normalize(path.posix.join(pageDir, ref.replace(/[?#].*$/, '')));
    if (file && !existsSync(path.join(site, file))) throw new Error(`${to} tham chiếu ${ref} nhưng artifact thiếu ${file}`);
  }
}

const walk = dir => readdirSync(dir).flatMap(name => {
  const p = path.join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const staged = walk(site);
const leaked = staged.filter(file => /\.m?ts$/.test(file));
if (leaked.length) throw new Error(`Artifact còn file .ts: ${leaked.join(', ')}`);
for (const required of ['index.html', 'exam/index.html', 'term-tests/teacher-dashboard/index.html', 'term-tests/webtest-34-demo/index.html', 'term-tests/webtest-34-demo/candidate/learning-api.js', 'term-tests/webtest-34-demo/candidate/text-utils.js']) {
  if (!existsSync(path.join(site, required))) throw new Error(`Artifact thiếu ${required}`);
}
console.log(`stage:pages ok (${staged.length} file)`);
