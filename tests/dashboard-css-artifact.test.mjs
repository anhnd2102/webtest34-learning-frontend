import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readDashboardCss } from './helpers/dashboard-css.mjs';

const root = new URL('../term-tests/teacher-dashboard/', import.meta.url);
const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');

test('CSS entry and fragments match the current stylesheet manifest and cascade order', () => {
  const manifest = JSON.parse(readFileSync(new URL('styles/manifest.json', root), 'utf8'));
  const entry = readFileSync(new URL('styles.css', root), 'utf8');
  assert.equal(hash(readDashboardCss()), manifest.sourceSha256);
  assert.deepEqual([...entry.matchAll(/@import url\("([^"\n]+)"\);/g)].map(match => match[1]), manifest.fragments.map(fragment => fragment.href));
  assert.equal(entry.replace(/@import url\("[^"\n]+"\);\s*/g, ''), '', 'entry has no rules interleaved with imports');
  let nextLine = 1;
  for (const fragment of manifest.fragments) {
    const source = readFileSync(new URL(fragment.href, root), 'utf8');
    assert.equal(fragment.startLine, nextLine);
    nextLine = fragment.endLine + 1;
    assert.equal(hash(source), fragment.sha256);
    assert.ok(fragment.endLine - fragment.startLine < 2000);
    assert.ok(!/@import\b/.test(source), 'fragment imports do not add another waterfall');
  }
  assert.equal(nextLine - 1, manifest.sourceLines);
});
