// Kiểm kê và sửa CSS ở mức khai báo cho các fragment của Teacher Dashboard.
//
//   node scripts/css-declarations.mjs summary
//   node scripts/css-declarations.mjs list [--important] [--source 05-simulation-questions.css]
//   node scripts/css-declarations.mjs apply <edits.json> [--dry-run]
//
// Mỗi khai báo có khóa ổn định `${source}#${order}#${property}#${nth}`:
//   order    = thứ tự rule trong rule-map.json (cùng cách đếm với buildRuleMap: chỉ rule thường và rule trong @media,
//              bỏ qua mọi thứ trong at-rule khác như @keyframes);
//   property = tên thuộc tính đúng như viết trong file (không bung shorthand);
//   nth      = thứ tự lần xuất hiện của thuộc tính đó trong cùng rule (0-based).
// Mọi chỉnh sửa CSS hàng loạt nên đi qua `apply` để không phải sửa tay bằng regex.
//
// Hành động của edits.json: [{ "key": "...", "action": "strip-important" | "delete" }]
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultStylesDir = fileURLToPath(new URL('../term-tests/teacher-dashboard/styles/', import.meta.url));

function fragmentNames(stylesDir) {
  return readdirSync(stylesDir).filter(name => /^\d\d-.*\.css$/.test(name)).sort();
}

// Bỏ qua chuỗi và url(...) khi tìm dấu phân tách; trả về chỉ số ký tự cuối của comment/chuỗi.
function skipComment(text, index) {
  const end = text.indexOf('*/', index + 2);
  return end < 0 ? text.length - 1 : end + 1;
}
function skipString(text, index) {
  const quote = text[index];
  for (let i = index + 1; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === quote) return i;
  }
  return text.length - 1;
}

// Tìm dấu } đóng của thân rule bắt đầu sau `open` (chỉ số của dấu {).
function findBodyEnd(text, open) {
  for (let i = open + 1; i < text.length; i++) {
    const char = text[i];
    if (char === '/' && text[i + 1] === '*') i = skipComment(text, i);
    else if (char === '"' || char === "'") i = skipString(text, i);
    else if (char === '{') throw new Error(`nested block inside a rule body at offset ${i}: CSS nesting is not supported by this tool`);
    else if (char === '}') return i;
  }
  throw new Error(`unterminated rule body from offset ${open}`);
}

export function parseDeclarations(text, bodyStart, bodyEnd) {
  const declarations = [];
  let pieceStart = bodyStart;
  let depth = 0;
  const flush = (pieceEnd, hasSemicolon) => {
    const raw = text.slice(pieceStart, pieceEnd);
    const withoutComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    const colon = withoutComments.indexOf(':');
    if (colon > 0 && withoutComments.trim()) {
      const property = withoutComments.slice(0, colon).trim();
      let value = withoutComments.slice(colon + 1).trim();
      const importantMatch = value.match(/\s*!\s*important\s*$/i);
      if (importantMatch) value = value.slice(0, importantMatch.index).trim();
      // Tìm vị trí token !important trong chuỗi gốc (có thể có comment xen kẽ ở nơi khác).
      const tokens = [...raw.matchAll(/!\s*important/gi)];
      const token = importantMatch && tokens.length ? tokens[tokens.length - 1] : null;
      declarations.push({
        property,
        value,
        important: Boolean(importantMatch),
        start: pieceStart,
        end: pieceEnd + (hasSemicolon ? 1 : 0),
        importantStart: token ? pieceStart + token.index : -1,
        importantEnd: token ? pieceStart + token.index + token[0].length : -1
      });
    }
  };
  for (let i = bodyStart; i < bodyEnd; i++) {
    const char = text[i];
    if (char === '/' && text[i + 1] === '*') i = skipComment(text, i);
    else if (char === '"' || char === "'") i = skipString(text, i);
    else if (char === '(') depth++;
    else if (char === ')') depth = Math.max(0, depth - 1);
    else if (char === ';' && depth === 0) { flush(i, true); pieceStart = i + 1; }
  }
  flush(bodyEnd, false);
  return declarations;
}

// Duyệt một fragment và gọi onRule({selector, conditions, bodyStart, bodyEnd}) cho từng rule được rule-map đếm.
function walkRules(text, onRule) {
  const stack = [];
  let head = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '/' && text[i + 1] === '*') { i = skipComment(text, i); continue; }
    if (char === '"' || char === "'") { const end = skipString(text, i); head += text.slice(i, end + 1); i = end; continue; }
    if (char === '{') {
      const selector = head.trim().replace(/\s+/g, ' ').replace(/:nth-child\(even\)/g, ':nth-child(2n)');
      head = '';
      if (selector.startsWith('@media')) stack.push({ kind: 'media', condition: selector.slice(6).trim() });
      else if (selector.startsWith('@') || stack.some(entry => entry.kind === 'skip')) stack.push({ kind: 'skip' });
      else {
        const bodyEnd = findBodyEnd(text, i);
        onRule({ selector, conditions: stack.filter(entry => entry.kind === 'media').map(entry => entry.condition), bodyStart: i + 1, bodyEnd });
        i = bodyEnd;
        head = '';
        continue;
      }
      // Thân của at-rule bỏ qua (@keyframes ...): vẫn duyệt để cân dấu ngoặc.
      continue;
    }
    if (char === '}') { stack.pop(); head = ''; continue; }
    if (char === ';' && (!stack.length || stack.at(-1).kind !== 'rule')) { head = ''; continue; }
    head += char;
  }
}

export function scanDeclarations(stylesDir = defaultStylesDir) {
  const result = [];
  let order = 0;
  for (const source of fragmentNames(stylesDir)) {
    const text = readFileSync(join(stylesDir, source), 'utf8');
    const lineStarts = [0];
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
    const lineOf = offset => { let lo = 0, hi = lineStarts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= offset) lo = mid; else hi = mid - 1; } return lo + 1; };
    walkRules(text, rule => {
      const counts = new Map();
      for (const declaration of parseDeclarations(text, rule.bodyStart, rule.bodyEnd)) {
        const nth = counts.get(declaration.property) || 0;
        counts.set(declaration.property, nth + 1);
        result.push({ key: `${source}#${order}#${declaration.property}#${nth}`, source, order, selector: rule.selector, conditions: rule.conditions, line: lineOf(declaration.start), ...declaration });
      }
      order++;
    });
  }
  return result;
}

export function ruleCount(stylesDir = defaultStylesDir) {
  let count = 0;
  for (const source of fragmentNames(stylesDir)) walkRules(readFileSync(join(stylesDir, source), 'utf8'), () => { count++; });
  return count;
}

// Áp dụng danh sách chỉnh sửa. Trả về thống kê; chỉ ghi file khi dryRun = false.
export function applyDeclarationEdits(edits, { stylesDir = defaultStylesDir, dryRun = false } = {}) {
  const all = scanDeclarations(stylesDir);
  const byKey = new Map(all.map(declaration => [declaration.key, declaration]));
  const perSource = new Map();
  const seen = new Set();
  for (const edit of edits) {
    if (seen.has(edit.key)) throw new Error(`duplicate edit for ${edit.key}`);
    seen.add(edit.key);
    const declaration = byKey.get(edit.key);
    if (!declaration) throw new Error(`unknown declaration key: ${edit.key}`);
    if (edit.action === 'strip-important' && !declaration.important) throw new Error(`${edit.key} has no !important to strip`);
    if (edit.action !== 'strip-important' && edit.action !== 'delete') throw new Error(`unknown action ${edit.action} for ${edit.key}`);
    if (!perSource.has(declaration.source)) perSource.set(declaration.source, []);
    perSource.get(declaration.source).push({ declaration, action: edit.action });
  }
  const stats = { stripped: 0, deleted: 0, emptiedRules: [] };
  for (const [source, list] of perSource) {
    const path = join(stylesDir, source);
    let text = readFileSync(path, 'utf8');
    // Sửa từ cuối file về đầu để các offset phía trước không bị lệch.
    list.sort((a, b) => b.declaration.start - a.declaration.start);
    for (const { declaration, action } of list) {
      if (action === 'strip-important') {
        // Bỏ token !important và khoảng trắng đứng ngay trước nó.
        let from = declaration.importantStart;
        while (from > declaration.start && /[ \t]/.test(text[from - 1])) from--;
        text = text.slice(0, from) + text.slice(declaration.importantEnd);
        stats.stripped++;
      } else {
        let from = declaration.start;
        let to = declaration.end;
        // Nếu khai báo chiếm trọn dòng (chỉ có khoảng trắng hai bên), xóa luôn cả dòng.
        let lineStart = from; while (lineStart > 0 && /[ \t]/.test(text[lineStart - 1])) lineStart--;
        let lineEnd = to; while (lineEnd < text.length && /[ \t]/.test(text[lineEnd])) lineEnd++;
        const startsLine = lineStart === 0 || text[lineStart - 1] === '\n';
        const endsLine = lineEnd >= text.length || text[lineEnd] === '\n' || text[lineEnd] === '\r';
        if (startsLine && endsLine) {
          from = lineStart;
          to = lineEnd;
          if (text[to] === '\r') to++;
          if (text[to] === '\n') to++;
        }
        text = text.slice(0, from) + text.slice(to);
        stats.deleted++;
      }
    }
    if (!dryRun) writeFileSync(path, text);
  }
  if (!dryRun) {
    // Báo cáo rule bị rỗng sau khi xóa (người dùng quyết định có xóa rule hay không).
    const after = scanDeclarations(stylesDir);
    const remaining = new Map();
    for (const declaration of after) remaining.set(`${declaration.source}#${declaration.selector}`, true);
    for (const edit of edits) {
      if (edit.action !== 'delete') continue;
      const declaration = byKey.get(edit.key);
      if (!remaining.has(`${declaration.source}#${declaration.selector}`)) stats.emptiedRules.push(`${declaration.source}: ${declaration.selector}`);
    }
  }
  return stats;
}

function option(args, name) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function main([command, ...args]) {
  if (command === 'summary') {
    const declarations = scanDeclarations();
    const bySource = {};
    for (const declaration of declarations) {
      bySource[declaration.source] ||= { declarations: 0, important: 0 };
      bySource[declaration.source].declarations++;
      if (declaration.important) bySource[declaration.source].important++;
    }
    console.log(JSON.stringify({ rules: ruleCount(), declarations: declarations.length, important: declarations.filter(d => d.important).length, bySource }, null, 2));
  } else if (command === 'list') {
    const source = option(args, 'source');
    for (const d of scanDeclarations()) {
      if (args.includes('--important') && !d.important) continue;
      if (source && d.source !== source) continue;
      console.log(`${d.key}\t${d.source}:${d.line}\t${d.conditions.join(' & ') || '-'}\t${d.selector}\t${d.property}: ${d.value}${d.important ? ' !important' : ''}`);
    }
  } else if (command === 'apply') {
    const file = args[0];
    if (!file || !existsSync(file)) throw new Error('usage: apply <edits.json> [--dry-run]');
    const stats = applyDeclarationEdits(JSON.parse(readFileSync(file, 'utf8')), { dryRun: args.includes('--dry-run') });
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.error('commands: summary | list [--important] [--source <file>] | apply <edits.json> [--dry-run]');
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
