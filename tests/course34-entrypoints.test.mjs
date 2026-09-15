import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(root, relative), 'utf8');

test('repository root delegates to the Course 34 landing page', async () => {
  const rootEntry = await read('index.html');
  assert.match(rootEntry, /term-tests\/webtest-34\/index\.html/);
  assert.match(rootEntry, /location\.hash/);
});

test('Course 34 landing page links to a fresh Test 1 navigation', async () => {
  const landing = await read('term-tests/webtest-34/index.html');
  assert.match(landing, /testLink\.addEventListener\('click'/);
  assert.match(landing, /searchParams\.set\('v', Date\.now\(\)\.toString\(\)\)/);
});


test('Course 34 Test 1 entry point delegates to the canonical demo renderer', async () => {
  const entry = await read('term-tests/webtest-34/test-1/index.html');
  assert.match(entry, /\.\.\/\.\.\/webtest-34-demo\/index\.html/);
  assert.match(entry, /rendererUrl\.searchParams\.set\('v', navigationVersion\)/);
  assert.match(entry, /location\.hash/);
});

test('Course 34 frontend does not call the legacy webtest API', async () => {
  const index = await read('term-tests/webtest-34-demo/index.html');
  assert.doesNotMatch(index, /\/api\/webtest-34\//);
});
