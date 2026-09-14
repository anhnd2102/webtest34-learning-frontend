import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(root, relative), 'utf8');

test('Course 34 landing page links to the Test 1 entry point', async () => {
  const landing = await read('term-tests/webtest-34/index.html');
  assert.match(landing, /test-1\//);
});

test('Course 34 Test 1 entry point delegates to the canonical demo renderer', async () => {
  const entry = await read('term-tests/webtest-34/test-1/index.html');
  assert.match(entry, /\.\.\/\.\.\/webtest-34-demo\/index\.html/);
  assert.match(entry, /location\.hash/);
});

test('Course 34 frontend does not call the legacy webtest API', async () => {
  const index = await read('term-tests/webtest-34-demo/index.html');
  assert.doesNotMatch(index, /\/api\/webtest-34\//);
});
