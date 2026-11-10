// Công cụ tái tạo metadata CSS của Teacher Dashboard thay cho sửa tay.
//
//   node scripts/css-metadata.mjs rule-map [--write]
//   node scripts/css-metadata.mjs manifest --rev <yyyymmdd-label> --baseline <commit>
//   node scripts/css-metadata.mjs inventory [--write --baseline <commit> --revision <label> --note <text>]
//   node scripts/css-metadata.mjs check
//
// rule-map   : thứ tự rule theo từng fragment trong styles/ (không phải CSS parser đầy đủ).
// manifest   : băm/khoảng dòng các fragment, ghi lại styles.css và rev trong index.html.
// inventory  : kiểm kê lexical inline style trong JS của dashboard (không gồm vendor).
// check      : thoát mã 1 nếu rule-map.json không khớp với styles/*.css.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dashboardDir = fileURLToPath(new URL('../term-tests/teacher-dashboard/', import.meta.url));
const frontendRoot = fileURLToPath(new URL('../', import.meta.url));
const inventoryPath = join(frontendRoot, 'doc/CSS_INLINE_STYLE_INVENTORY.json');

const sha256 = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const lineCount = text => text.replaceAll('\r\n', '\n').replace(/\n$/, '').split('\n').length;

// Giữ kiểu xuống dòng của file đang có (working tree dùng CRLF, Git chuẩn hóa).
function writeLike(path, text) {
  const crlf = existsSync(path) && readFileSync(path, 'utf8').includes('\r\n');
  writeFileSync(path, crlf ? text.replace(/\r?\n/g, '\r\n') : text);
}

export function buildRuleMap(stylesDir = join(dashboardDir, 'styles')) {
  const files = readdirSync(stylesDir).filter(name => /^\d\d-.*\.css$/.test(name)).sort();
  const rules = [];
  for (const source of files) {
    const css = readFileSync(join(stylesDir, source), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const stack = [];
    let buffer = '';
    for (let i = 0; i < css.length; i++) {
      const char = css[i];
      if (char === '"' || char === "'") {
        const end = css.indexOf(char, i + 1);
        buffer += css.slice(i, end + 1);
        i = end;
      } else if (char === '{') {
        // Chuẩn hóa :nth-child(even) thành 2n như CSSOM để khớp rule map đã chụp từ trình duyệt.
        const head = buffer.trim().replace(/\s+/g, ' ').replace(/:nth-child\(even\)/g, ':nth-child(2n)');
        buffer = '';
        if (head.startsWith('@media')) stack.push({ kind: 'media', condition: head.slice(6).trim() });
        else if (head.startsWith('@') || stack.some(entry => entry.kind === 'skip')) stack.push({ kind: 'skip' });
        else {
          rules.push({ order: rules.length, source, conditions: stack.filter(entry => entry.kind === 'media').map(entry => entry.condition), selector: head });
          stack.push({ kind: 'rule' });
        }
      } else if (char === '}') {
        stack.pop();
        buffer = '';
      } else if (char === ';' && (!stack.length || stack.at(-1).kind !== 'rule')) buffer = '';
      else buffer += char;
    }
  }
  return rules;
}

export function scanInlineStyles(root = dashboardDir) {
  const files = [];
  (function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'vendor') walk(path); }
      else if (name.endsWith('.js')) files.push(path);
    }
  })(root);
  const prefix = 'term-tests/teacher-dashboard/';
  const entries = [];
  for (const path of files.sort((a, b) => a.replaceAll('\\', '/').localeCompare(b.replaceAll('\\', '/')))) {
    const file = prefix + path.replaceAll('\\', '/').slice(root.replaceAll('\\', '/').length).replace(/^\//, '');
    readFileSync(path, 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (/style=["'$]/.test(line)) entries.push({ file, line: index + 1, kind: 'attribute' });
      if (/\.style\.|\.style\[|cssText/.test(line)) entries.push({ file, line: index + 1, kind: 'property' });
    });
  }
  return entries;
}

function updateManifest({ rev, baseline }) {
  const manifestPath = join(dashboardDir, 'styles/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  let next = 1;
  let all = '';
  for (const fragment of manifest.fragments) {
    const file = fragment.href.split('?')[0];
    const source = readFileSync(join(dashboardDir, file), 'utf8');
    const count = lineCount(source);
    Object.assign(fragment, { href: `${file}?rev=${rev}`, startLine: next, endLine: next + count - 1, sha256: sha256(source) });
    next += count;
    all += source;
  }
  writeLike(join(dashboardDir, 'styles.css'), manifest.fragments.map(fragment => `@import url("${fragment.href}");`).join('\n') + '\n');
  const htmlPath = join(dashboardDir, 'index.html');
  const html = readFileSync(htmlPath, 'utf8');
  if (!/styles\.css\?rev=[^"]+"/.test(html)) throw new Error('index.html has no styles.css?rev= link');
  writeLike(htmlPath, html.replace(/styles\.css\?rev=[^"]+"/, `styles.css?rev=${rev}"`));
  Object.assign(manifest, { baseline, sourceSha256: sha256(all), sourceLines: next - 1, revision: rev.replace(/^\d{8}-/, '') });
  writeLike(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

function option(args, name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function main([command, ...args]) {
  const ruleMapPath = join(dashboardDir, 'styles/rule-map.json');
  if (command === 'rule-map') {
    const rules = buildRuleMap();
    if (args.includes('--write')) { writeLike(ruleMapPath, JSON.stringify(rules, null, 2) + '\n'); console.log(`written ${rules.length} rules`); }
    else console.log(`${rules.length} rules, matches committed: ${JSON.stringify(rules) === JSON.stringify(JSON.parse(readFileSync(ruleMapPath, 'utf8')))}`);
  } else if (command === 'manifest') {
    const rev = option(args, 'rev');
    const baseline = option(args, 'baseline');
    if (!/^\d{8}-[a-z0-9-]+$/.test(rev || '') || !baseline) throw new Error('usage: manifest --rev <yyyymmdd-label> --baseline <commit>');
    const manifest = updateManifest({ rev, baseline });
    console.log(`lines ${manifest.sourceLines} sha ${manifest.sourceSha256}`);
  } else if (command === 'inventory') {
    const entries = scanInlineStyles();
    const committed = JSON.parse(readFileSync(inventoryPath, 'utf8'));
    const key = entry => `${entry.file}:${entry.line}:${entry.kind}`;
    const known = new Set(committed.entries.map(key));
    const scanned = new Set(entries.map(key));
    console.log(`committed ${committed.entries.length}, scanned ${entries.length}`);
    console.log('only in committed:', [...known].filter(item => !scanned.has(item)));
    console.log('only in scan:', [...scanned].filter(item => !known.has(item)));
    if (args.includes('--write')) {
      const baseline = option(args, 'baseline');
      const revision = option(args, 'revision');
      const note = option(args, 'note');
      if (!baseline || !revision || !note) throw new Error('usage: inventory --write --baseline <commit> --revision <label> --note <text>');
      writeLike(inventoryPath, JSON.stringify({ baseline, revision, note, entries }, null, 2) + '\n');
      console.log(`written ${entries.length} entries`);
    }
  } else if (command === 'check') {
    const matches = JSON.stringify(buildRuleMap()) === JSON.stringify(JSON.parse(readFileSync(ruleMapPath, 'utf8')));
    console.log(matches ? 'rule-map.json matches styles/*.css' : 'rule-map.json is stale: run rule-map --write');
    if (!matches) process.exitCode = 1;
  } else {
    console.error('commands: rule-map [--write] | manifest --rev --baseline | inventory [--write ...] | check');
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
