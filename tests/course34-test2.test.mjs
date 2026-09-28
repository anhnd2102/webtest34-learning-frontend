import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(root, relative), 'utf8');

test('Test 2 config keeps audio separate and switches only in Test 2 mode', async () => {
  const config = await read('term-tests/webtest-34-demo/config.test2.js');
  assert.match(config, /WEBTEST_34_TEST2_AUDIO/);
  assert.match(config, /get\('test'\) === '2'/);
  assert.match(config, /AUDIO: window\.WEBTEST_34_TEST2_AUDIO/);
});

test('Test 2 public student data contains assets and prompts but no grading key fields', async () => {
  const content = await read('term-tests/webtest-34-demo/test2-public.js');
  assert.match(content, /assets\/test 2\/vocabulary\/image\$\{index \+ 1\}\.png/);
  assert.match(content, /listening:/);
  assert.match(content, /translation:/);
  assert.match(content, /speaking:/);
  assert.doesNotMatch(content, /expectedOptionId|rubricCode|accepted\s*:/u);
});

test('Test 2 renderer selects test-specific public data without changing the Test 1 default', async () => {
  const index = await read('term-tests/webtest-34-demo/index.html');
  assert.match(index, /get\('test'\) === '2'/);
  assert.match(index, /testMode === 'test2'/);
  assert.match(index, /test2Content\.listening\.part3/);
  assert.match(index, /assets\/test 1\/vocabulary\/image\$\{i\+1\}\.png/);
});
