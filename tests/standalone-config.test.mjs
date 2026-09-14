import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(root, relative), 'utf8');

test('Webtest 34 points to the generic Learning platform API', async () => {
  const config = await read('term-tests/webtest-34-demo/config.js');
  assert.match(config, /https:\/\/webtest\.ducanhn\.autos/);
  assert.doesNotMatch(config, /ducizone\.ddns\.net\/mapping-api/);
});

test('Webtest 34 calls the stable Learning access contract', async () => {
  const index = await read('term-tests/webtest-34-demo/index.html');
  assert.match(index, /\/api\/learning\$\{path\}/);
  assert.match(index, /learningRequest\('\/test-access\/resolve'/);
});
