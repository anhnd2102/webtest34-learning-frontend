// Phân tích tĩnh các khai báo !important của fragment Teacher Dashboard (Tier A).
//
//   node scripts/css-important-audit.mjs static [--out <file.json>]
//   node scripts/css-important-audit.mjs merge --out <classification.json> [--edits <edits.json>] [--min-states <n>] <audit-*.json ...>
//
// `merge` gộp kết quả đo thực nghiệm (tests/browser/helpers/important-audit.mjs, chạy trong các fixture) với phân tích tĩnh
// và phân loại từng khai báo; --edits ghi danh sách strip-important cho css-declarations.mjs apply (chỉ lớp an toàn).
//
// Một !important là "inert" (vô tác dụng) khi không có đối thủ nào cho nhóm longhand của nó:
//   - không khai báo nào khác trong mọi fragment có longhand trùng (shorthand/longhand được bung bằng CSSOM của Chrome);
//   - không inline style (template JS, index.html) hay ghi style bằng JS đụng cùng longhand;
//   - không @keyframes nào animate cùng longhand (animation thắng khai báo thường nhưng thua !important);
//   - không nằm trong danh sách loại trừ cứng (ví dụ [hidden] { display: none !important }).
// Kết quả: danh sách khóa khai báo (xem css-declarations.mjs) kèm lý do; chưa sửa file nào.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scanDeclarations } from './css-declarations.mjs';

const dashboardDir = fileURLToPath(new URL('../term-tests/teacher-dashboard/', import.meta.url));
const stylesDir = join(dashboardDir, 'styles');
const studentDir = fileURLToPath(new URL('../term-tests/webtest-34-demo/', import.meta.url));

// Hồ sơ phân tích: mặc định là Teacher Dashboard; `student` là dynamic-test.css của giao diện học viên.
// codeDir: nơi tìm lệnh ghi style (JS/HTML); cssDir + cssFilter: file CSS được quét; skipDirs: thư mục bỏ qua.
export const PROFILES = {
  dashboard: { codeDir: dashboardDir, cssDir: stylesDir, cssFilter: undefined, skipDirs: ['vendor', 'styles'], hardExclusions: undefined },
  student: { codeDir: studentDir, cssDir: studentDir, cssFilter: /^dynamic-test\.css$/, skipDirs: ['vendor', 'assets', 'demo-content'], hardExclusions: [] }
};

// Loại trừ cứng: khai báo mà vai trò là thắng inline/JS hoặc mô hình ẩn/hiện.
export const HARD_EXCLUSIONS = [
  { source: '01-foundation.css', selector: '[hidden]', property: 'display', reason: 'mô hình ẩn/hiện: [hidden] phải thắng mọi display khác' }
];

function kebab(name) {
  return name.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
}

function walkFiles(dir, extensions, skipDirs, found = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (!skipDirs.includes(name)) walkFiles(path, extensions, skipDirs, found); }
    else if (extensions.some(extension => name.endsWith(extension))) found.push(path);
  }
  return found;
}

// Thuộc tính bị inline/JS ghi: trả về Map(property kebab-case -> ['file:line', ...]).
export function collectInlineWrites(profile = PROFILES.dashboard) {
  const writes = new Map();
  const add = (property, where) => {
    const name = property.trim().toLowerCase();
    if (!name || !/^-?[a-z][a-z0-9-]*$/.test(name)) return;
    if (!writes.has(name)) writes.set(name, []);
    writes.get(name).push(where);
  };
  for (const file of walkFiles(profile.codeDir, ['.js', '.mjs', '.html'], profile.skipDirs)) {
    const where = relative(profile.codeDir, file).replaceAll('\\', '/');
    readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
      const location = `${where}:${index + 1}`;
      for (const match of line.matchAll(/\.style\.([a-zA-Z]+)\s*=/g)) add(kebab(match[1]), location);
      for (const match of line.matchAll(/\.style\[['"]([a-zA-Z-]+)['"]\]\s*=/g)) add(kebab(match[1]), location);
      for (const match of line.matchAll(/style\.(?:setProperty|removeProperty)\(\s*['"]([a-zA-Z-]+)['"]/g)) add(match[1], location);
      for (const match of line.matchAll(/style=\s*["'`]([^"'`]*)["'`]/g)) for (const piece of match[1].split(';')) add(piece.split(':')[0], location);
      for (const match of line.matchAll(/cssText\s*[+]?=\s*['"`]([^'"`]*)['"`]/g)) for (const piece of match[1].split(';')) add(piece.split(':')[0], location);
    });
    // Ghi inline qua template nhiều dòng: style="..." chứa ${...}; đã phủ ở trên theo từng dòng. Báo thêm cssText động.
    if (/cssText\s*[+]?=\s*[^'"`\s]/.test(readFileSync(file, 'utf8'))) add('__dynamic-cssText__', where);
  }
  return writes;
}

// Longhand bị @keyframes trong các fragment animate.
export function collectKeyframeProperties(profile = PROFILES.dashboard) {
  const properties = new Set();
  for (const file of readdirSync(profile.cssDir).filter(name => (profile.cssFilter || /\.css$/).test(name))) {
    const text = readFileSync(join(profile.cssDir, file), 'utf8');
    for (const match of text.matchAll(/@keyframes\s+[\w-]+\s*\{/g)) {
      let depth = 1;
      let index = match.index + match[0].length;
      const start = index;
      while (index < text.length && depth > 0) { if (text[index] === '{') depth++; else if (text[index] === '}') depth--; index++; }
      for (const declaration of text.slice(start, index - 1).matchAll(/([a-z-]+)\s*:/g)) properties.add(declaration[1]);
    }
  }
  return properties;
}

async function expansions(properties) {
  const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
  const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    return await page.evaluate(pairs => {
      const probe = document.createElement('div');
      const result = {};
      for (const [property, samples] of pairs) {
        let longhands = null;
        for (const sample of samples) {
          probe.style.cssText = '';
          probe.style.setProperty(property, sample);
          if (probe.style.length) { longhands = [...probe.style]; break; }
        }
        result[property] = longhands;
      }
      return result;
    }, properties);
  } finally { await browser.close(); }
}

export async function runStaticAudit(profile = PROFILES.dashboard) {
  const declarations = profile === PROFILES.dashboard ? scanDeclarations() : scanDeclarations(profile.cssDir, { filter: profile.cssFilter });
  const samples = new Map();
  for (const declaration of declarations) {
    if (!samples.has(declaration.property)) samples.set(declaration.property, []);
    const list = samples.get(declaration.property);
    if (list.length < 6 && !list.includes(declaration.value)) list.push(declaration.value);
  }
  const inline = collectInlineWrites(profile);
  const keyframes = collectKeyframeProperties(profile);
  for (const property of [...inline.keys(), ...keyframes]) if (!samples.has(property)) samples.set(property, ['inherit', '0', '1', 'none', 'auto']);
  const expanded = await expansions([...samples.entries()]);
  const longhandsOf = property => expanded[property] || (property.startsWith('--') ? [property] : null);

  // Chỉ mục: longhand -> các khai báo (khóa) có chứa longhand đó.
  const byLonghand = new Map();
  const unresolved = new Set();
  for (const declaration of declarations) {
    const longhands = longhandsOf(declaration.property);
    if (!longhands) { unresolved.add(declaration.property); continue; }
    for (const name of longhands) {
      if (!byLonghand.has(name)) byLonghand.set(name, new Set());
      byLonghand.get(name).add(declaration.key);
    }
  }
  const touchedByInline = new Map();
  for (const [property, where] of inline) for (const name of longhandsOf(property) || [property]) {
    if (!touchedByInline.has(name)) touchedByInline.set(name, []);
    touchedByInline.get(name).push(...where.slice(0, 2));
  }
  const keyframeLonghands = new Set();
  for (const property of keyframes) for (const name of longhandsOf(property) || [property]) keyframeLonghands.add(name);

  const classified = [];
  for (const declaration of declarations.filter(item => item.important)) {
    const exclusion = (profile.hardExclusions || HARD_EXCLUSIONS).find(item => item.source === declaration.source && item.selector === declaration.selector && item.property === declaration.property);
    const longhands = longhandsOf(declaration.property);
    const entry = { key: declaration.key, source: declaration.source, line: declaration.line, selector: declaration.selector, conditions: declaration.conditions, property: declaration.property, value: declaration.value };
    if (exclusion) { classified.push({ ...entry, class: 'hard-excluded', reason: exclusion.reason }); continue; }
    if (!longhands) { classified.push({ ...entry, class: 'unresolved', reason: 'CSSOM không bung được thuộc tính/giá trị' }); continue; }
    const competitors = new Set();
    for (const name of longhands) for (const key of byLonghand.get(name) || []) if (key !== declaration.key) competitors.add(key);
    const inlineHits = [...new Set(longhands.flatMap(name => touchedByInline.get(name) || []))];
    const animated = longhands.filter(name => keyframeLonghands.has(name));
    if (inlineHits.length) classified.push({ ...entry, class: 'beats-inline-or-js', reason: inlineHits.slice(0, 3).join(', ') });
    else if (animated.length) classified.push({ ...entry, class: 'animated', reason: `@keyframes animates ${animated.join(', ')}` });
    else if (competitors.size) classified.push({ ...entry, class: 'has-competitors', competitors: competitors.size });
    else classified.push({ ...entry, class: 'inert-static', reason: 'không khai báo/inline/animation nào khác đụng cùng longhand' });
  }
  return { totals: { declarations: declarations.length, important: classified.length, unresolvedProperties: [...unresolved] }, dynamicCssText: inline.get('__dynamic-cssText__') || [], classified };
}

const PROTECTED_LAYER = new Set(['beats-inline-or-js', 'animated', 'hard-excluded', 'unresolved']);

export async function mergeAudit(auditFiles, { minStates = 3, profile = PROFILES.dashboard } = {}) {
  const staticReport = await runStaticAudit(profile);
  const observed = new Map();
  for (const file of auditFiles) {
    for (const entry of JSON.parse(readFileSync(file, 'utf8'))) {
      const total = observed.get(entry.key) || { matched: 0, changed: 0, inline: 0, hidden: 0, written: 0, statesMatched: 0, statesChanged: [], skipped: {} };
      total.matched += entry.matched;
      total.changed += entry.changed;
      total.inline += entry.inline;
      total.hidden += entry.hidden;
      total.written += entry.written || 0;
      total.statesMatched += entry.statesMatched;
      for (const label of entry.statesChanged) if (total.statesChanged.length < 4 && !total.statesChanged.includes(label)) total.statesChanged.push(label);
      for (const [reason, count] of Object.entries(entry.skipped)) total.skipped[reason] = (total.skipped[reason] || 0) + count;
      observed.set(entry.key, total);
    }
  }
  // Khai báo trùng thuộc tính trong cùng một rule: phép đo bỏ priority của cả hai, nên không kết luận được từng cái.
  const perRuleProperty = new Map();
  for (const entry of staticReport.classified) {
    const id = entry.key.split('#').slice(0, 3).join('#');
    perRuleProperty.set(id, (perRuleProperty.get(id) || 0) + 1);
  }
  const classified = staticReport.classified.map(entry => {
    const data = observed.get(entry.key) || { matched: 0, changed: 0, inline: 0, hidden: 0, written: 0, statesMatched: 0, statesChanged: [], skipped: {} };
    const result = { ...entry, staticClass: entry.class, matched: data.matched, changed: data.changed, inline: data.inline, hidden: data.hidden, written: data.written, statesMatched: data.statesMatched, statesChanged: data.statesChanged, skipped: data.skipped };
    const duplicates = perRuleProperty.get(entry.key.split('#').slice(0, 3).join('#')) > 1;
    if (entry.class === 'hard-excluded') result.final = 'keep:hard-excluded';
    else if (entry.class === 'inert-static') result.final = 'strip:inert-static';
    else if (data.hidden > 0 && data.changed > 0) result.final = 'review:beats-hidden';
    else if (data.changed > 0) result.final = 'keep:load-bearing';
    else if (data.inline > 0) result.final = 'keep:beats-inline';
    else if (entry.class === 'animated') result.final = 'keep:animated';
    else if (entry.class === 'beats-inline-or-js') {
      // Bảo vệ theo phần tử: nếu trong mọi trạng thái đã đo không có phần tử khớp selector nào từng bị ghi inline cùng longhand
      // (đo bằng MutationObserver suốt vòng đời trang), khai báo là ứng viên gỡ; vẫn cần lưới computed trước/sau để xác nhận.
      if (!data.matched) result.final = 'keep:unobserved';
      else if (data.written > 0) result.final = 'keep:written-inline';
      else if (data.statesMatched < minStates) result.final = 'keep:weak-evidence';
      else result.final = 'candidate:protected-no-writes';
    }
    else if (entry.class === 'unresolved') result.final = 'keep:unresolved';
    else if (duplicates) result.final = 'keep:duplicate-in-rule';
    else if (!data.matched) result.final = 'keep:unobserved';
    else if (data.statesMatched < minStates) result.final = 'keep:weak-evidence';
    else result.final = 'strip:inert-observed';
    return result;
  });
  return { totals: staticReport.totals, minStates, classified };
}

async function main([command, ...args]) {
  if (command === 'merge') {
    const outIndex = args.indexOf('--out');
    const editsIndex = args.indexOf('--edits');
    const minIndex = args.indexOf('--min-states');
    const profileArg = args.indexOf('--profile');
    const skip = new Set([outIndex, outIndex + 1, editsIndex, editsIndex + 1, minIndex, minIndex + 1, profileArg, profileArg + 1].filter(index => index >= 0));
    const files = args.filter((arg, index) => !skip.has(index) && arg.endsWith('.json'));
    const profileIndex = args.indexOf('--profile');
    const profile = profileIndex >= 0 ? PROFILES[args[profileIndex + 1]] : PROFILES.dashboard;
    if (!profile) throw new Error('profile phải là dashboard hoặc student');
    const report = await mergeAudit(files, { minStates: minIndex >= 0 ? Number(args[minIndex + 1]) : 3, profile });
    const counts = {};
    for (const entry of report.classified) counts[entry.final] = (counts[entry.final] || 0) + 1;
    console.log(JSON.stringify({ files: files.length, counts }, null, 2));
    if (outIndex >= 0) writeFileSync(args[outIndex + 1], JSON.stringify(report, null, 2) + '\n');
    if (editsIndex >= 0) {
      const includeCandidates = args.includes('--include-candidates');
      const edits = report.classified.filter(entry => entry.final.startsWith('strip:') || (includeCandidates && entry.final.startsWith('candidate:'))).map(entry => ({ key: entry.key, action: 'strip-important' }));
      writeFileSync(args[editsIndex + 1], JSON.stringify(edits, null, 2) + '\n');
      console.log(`edits: ${edits.length}`);
    }
    return;
  }
  if (command !== 'static') { console.error('commands: static [--out <file>] | merge --out <file> [--edits <file>] [--min-states <n>] <audit.json ...>'); process.exitCode = 2; return; }
  const report = await runStaticAudit();
  const counts = {};
  for (const entry of report.classified) counts[entry.class] = (counts[entry.class] || 0) + 1;
  console.log(JSON.stringify({ totals: report.totals, counts, dynamicCssText: report.dynamicCssText }, null, 2));
  const outIndex = args.indexOf('--out');
  if (outIndex >= 0) { writeFileSync(args[outIndex + 1], JSON.stringify(report, null, 2) + '\n'); console.log(`written ${args[outIndex + 1]}`); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
