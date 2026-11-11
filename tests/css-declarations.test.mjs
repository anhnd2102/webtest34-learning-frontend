import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanDeclarations, applyDeclarationEdits, ruleCount } from '../scripts/css-declarations.mjs';

function withStyles(files, run) {
  const dir = mkdtempSync(join(tmpdir(), 'css-declarations-'));
  try {
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const sample = [
  '/* header ; { } */',
  '.a, .b {',
  '  color: red !important; /* trailing ; comment */',
  '  background: url("data:image/svg+xml;utf8,<svg/>") no-repeat;',
  '  margin : 0   !  important ;',
  '  content: "a;b{c}";',
  '  color: blue;',
  '}',
  '@media (max-width: 600px) {',
  '  .c:nth-child(even) { padding: 1px 2px!important }',
  '}',
  '@keyframes spin {',
  '  from { transform: rotate(0deg) !important; }',
  '  to { transform: rotate(360deg); }',
  '}',
  '.d { top: 0; }',
  ''
].join('\n');

test('scanDeclarations counts the same rules as the rule-map and ignores @keyframes bodies', () => {
  withStyles({ '01-a.css': sample }, dir => {
    const declarations = scanDeclarations(dir);
    const selectors = [...new Set(declarations.map(d => d.selector))];
    assert.deepEqual(selectors, ['.a, .b', '.c:nth-child(2n)', '.d']);
    assert.equal(ruleCount(dir), 3);
    assert.deepEqual([...new Set(declarations.map(d => d.order))], [0, 1, 2]);
  });
});

test('scanDeclarations reads values, priorities and keys even with comments, strings and url(;)', () => {
  withStyles({ '01-a.css': sample }, dir => {
    const byKey = new Map(scanDeclarations(dir).map(d => [d.key, d]));
    assert.equal(byKey.get('01-a.css#0#color#0').important, true);
    assert.equal(byKey.get('01-a.css#0#color#0').value, 'red');
    assert.equal(byKey.get('01-a.css#0#color#1').important, false);
    assert.equal(byKey.get('01-a.css#0#color#1').value, 'blue');
    assert.match(byKey.get('01-a.css#0#background#0').value, /^url\("data:image\/svg\+xml;utf8,<svg\/>"\) no-repeat$/);
    assert.equal(byKey.get('01-a.css#0#margin#0').important, true);
    assert.equal(byKey.get('01-a.css#0#content#0').value, '"a;b{c}"');
    assert.equal(byKey.get('01-a.css#1#padding#0').important, true);
    assert.deepEqual(byKey.get('01-a.css#1#padding#0').conditions, ['(max-width: 600px)']);
    assert.equal(byKey.get('01-a.css#2#top#0').line, 16);
  });
});

test('apply strips only the !important token and keeps the rest of the declaration byte for byte', () => {
  withStyles({ '01-a.css': sample }, dir => {
    const stats = applyDeclarationEdits([
      { key: '01-a.css#0#color#0', action: 'strip-important' },
      { key: '01-a.css#0#margin#0', action: 'strip-important' },
      { key: '01-a.css#1#padding#0', action: 'strip-important' }
    ], { stylesDir: dir });
    assert.equal(stats.stripped, 3);
    const after = readFileSync(join(dir, '01-a.css'), 'utf8');
    assert.match(after, /  color: red; \/\* trailing ; comment \*\//);
    assert.match(after, /  margin : 0 ;/);
    assert.match(after, /\.c:nth-child\(even\) \{ padding: 1px 2px \}/);
    assert.match(after, /from \{ transform: rotate\(0deg\) !important; \}/, '@keyframes content is untouched');
    assert.equal(scanDeclarations(dir).filter(d => d.important).length, 0);
  });
});

test('apply deletes whole-line declarations, reports emptied rules and preserves CRLF', () => {
  const crlf = '.x {\r\n  top: 0;\r\n}\r\n.y {\r\n  left: 0;\r\n  right: 0;\r\n}\r\n';
  withStyles({ '01-a.css': crlf }, dir => {
    const stats = applyDeclarationEdits([
      { key: '01-a.css#0#top#0', action: 'delete' },
      { key: '01-a.css#1#left#0', action: 'delete' }
    ], { stylesDir: dir });
    assert.equal(stats.deleted, 2);
    assert.deepEqual(stats.emptiedRules, ['01-a.css: .x']);
    assert.equal(readFileSync(join(dir, '01-a.css'), 'utf8'), '.x {\r\n}\r\n.y {\r\n  right: 0;\r\n}\r\n');
  });
});

test('apply rejects unknown keys, duplicate edits and stripping a declaration without !important', () => {
  withStyles({ '01-a.css': sample }, dir => {
    assert.throws(() => applyDeclarationEdits([{ key: '01-a.css#9#color#0', action: 'delete' }], { stylesDir: dir }), /unknown declaration key/);
    assert.throws(() => applyDeclarationEdits([{ key: '01-a.css#2#top#0', action: 'delete' }, { key: '01-a.css#2#top#0', action: 'delete' }], { stylesDir: dir }), /duplicate edit/);
    assert.throws(() => applyDeclarationEdits([{ key: '01-a.css#2#top#0', action: 'strip-important' }], { stylesDir: dir }), /no !important/);
  });
});

test('the real fragments: rule count equals rule-map.json and every rule has declarations', () => {
  const ruleMap = JSON.parse(readFileSync(new URL('../term-tests/teacher-dashboard/styles/rule-map.json', import.meta.url), 'utf8'));
  assert.equal(ruleCount(), ruleMap.length);
  const orders = new Set(scanDeclarations().map(d => d.order));
  assert.equal(orders.size, ruleMap.length);
});
