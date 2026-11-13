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

