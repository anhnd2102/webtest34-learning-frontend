import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const renderer = await fs.readFile(new URL('../term-tests/webtest-34-demo/content-preview.mjs', import.meta.url), 'utf8');

test('the canonical renderer tells the reducer why the student appears to have left', () => {
  assert.match(renderer, /window\.addEventListener\('blur', \(\) => leave\('blur'\)\)/);
  assert.match(renderer, /visibilityState === 'hidden'\) leave\('hidden'\)/);
  assert.match(renderer, /supportsFullscreen\(\)\) leave\('fullscreen'\)/);
  assert.match(renderer, /dispatchExamGuard\(\{ type: 'left_exam', reason, at: Date\.now\(\), incidentId: createUuid\(\) \}\)/);
});

test('the canonical renderer turns off focus signals and fullscreen on iOS/iPadOS', () => {
  assert.match(renderer, /fullscreenSupported: supportsFullscreen\(\), ignoreFocusSignals \}/);
  assert.match(renderer, /supportsFullscreen = \(\) => !ignoreFocusSignals && /);
});

test('incident requests survive the page moving to the background', () => {
  const apiRequest = renderer.match(/async function apiRequest\(path, body\) \{[\s\S]*?\n {2}\}/)?.[0] ?? '';
  assert.match(apiRequest, /keepalive: path\.startsWith\('\/attempts\/exam\/incidents\/'\)/);
});

test('a page being reloaded or closed is not reported as leaving, and detection resumes when bfcache restores it', () => {
  assert.match(renderer, /window\.addEventListener\('pagehide', \(\) => \{ pageUnloading = true; \}\)/);
  assert.match(renderer, /window\.addEventListener\('pageshow', \(\) => \{ pageUnloading = false; \}\)/);
  assert.match(renderer, /const leave = reason => \{\s*if \(pageUnloading\) return;/);
});
