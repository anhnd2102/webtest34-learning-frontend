import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS as dashboardIcons, renderSvgIcon } from '../term-tests/teacher-dashboard/ui/icons.js';
import { ICONS as candidateIcons } from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';

const frontend = fileURLToPath(new URL('../', import.meta.url));

function sourceFiles(dir, extensions) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) { if (name !== 'vendor' && name !== 'node_modules') files.push(...sourceFiles(path, extensions)); }
    else if (extensions.some(extension => name.endsWith(extension))) files.push(path);
  }
  return files;
}

const label = path => relative(frontend, path).replaceAll('\\', '/');

test('every literal renderSvgIcon name in the dashboard exists (a missing name silently renders no icon)', () => {
  const missing = [];
  for (const file of sourceFiles(join(frontend, 'term-tests/teacher-dashboard'), ['.js'])) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/renderSvgIcon\(\s*['"]([^'"]+)['"]/g)) {
      if (!renderSvgIcon(match[1])) missing.push(`${label(file)}: ${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every ICONS.<name> used by dashboard modules exists (an undefined icon renders the text "undefined")', () => {
  const missing = [];
  for (const file of sourceFiles(join(frontend, 'term-tests/teacher-dashboard'), ['.js'])) {
    const text = readFileSync(file, 'utf8');
    if (!/import\s*\{[^}]*\bICONS\b[^}]*\}\s*from\s*['"][^'"]*ui\/icons\.js['"]/.test(text)) continue;
    for (const match of text.matchAll(/\bICONS\.(\w+)/g)) {
      if (!Object.hasOwn(dashboardIcons, match[1])) missing.push(`${label(file)}: ICONS.${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every ICONS.<name> used by the candidate renderer exists', () => {
  const missing = [];
  for (const file of sourceFiles(join(frontend, 'term-tests/webtest-34-demo'), ['.mjs'])) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bICONS\.(\w+)/g)) {
      if (!Object.hasOwn(candidateIcons, match[1])) missing.push(`${label(file)}: ICONS.${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('dashboard icons use the Design System line weight and decorative accessibility attributes', () => {
  for (const name of ['play', 'pause', 'volume', 'move', 'info', 'eye', 'refresh']) {
    const icon = dashboardIcons[name];
    assert.ok(icon, `${name} exists`);
    assert.match(icon, /stroke="currentColor"/);
    assert.match(icon, /stroke-width="1\.8"/);
    assert.match(icon, /aria-hidden="true"/);
  }
});

test('rotate spinner path stays inside the 24-unit viewBox', () => {
  assert.ok(!dashboardIcons.rotate.includes('l5.67-5.67'), 'clipped path was replaced');
  assert.ok(dashboardIcons.rotate.includes('<polyline points="23 4 23 10 17 10"/>'));
});
