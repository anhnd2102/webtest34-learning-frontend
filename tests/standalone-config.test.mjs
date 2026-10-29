import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(root, relative), 'utf8');

test('API configuration isolates loopback and file previews from production', async () => {
  const source=await read('term-tests/webtest-34-demo/config.js');
  for(const hostname of ['localhost','127.0.0.1','[::1]']) {
    const window={location:{hostname,protocol:'http:'}};
    vm.runInNewContext(source,{window});
    assert.equal(window.WEBTEST_34_PREVIEW_CONFIG.LEARNING_API_BASE_URL,'http://127.0.0.1:8788');
  }
  const window={location:{hostname:'anhnd2102.github.io',protocol:'https:'}};
  vm.runInNewContext(source,{window});
  assert.equal(window.WEBTEST_34_PREVIEW_CONFIG.LEARNING_API_BASE_URL,'https://webtest.ducanhdev.com');
  const fileWindow={location:{hostname:'',protocol:'file:'}};
  vm.runInNewContext(source,{window:fileWindow});
  assert.equal(fileWindow.WEBTEST_34_PREVIEW_CONFIG.LEARNING_API_BASE_URL,'http://127.0.0.1:8788');
});

test('Webtest 34 points to the generic Learning platform API', async () => {
  const config = await read('term-tests/webtest-34-demo/config.js');
  assert.match(config, /https:\/\/webtest\.ducanhdev\.com/);
  assert.doesNotMatch(config, /ducizone\.ddns\.net\/mapping-api/);
});

test('Webtest 34 calls the stable Learning access contract', async () => {
  const index = await read('term-tests/webtest-34-demo/index.html');
  assert.match(index, /\/api\/learning\$\{path\}/);
  assert.match(index, /learningRequest\('\/test-access\/resolve'/);
});

test('Webtest 34 reads a clean test token even when the shared link has trailing junk', async () => {
  const index = await read('term-tests/webtest-34-demo/index.html');
  const learningConfig = index.match(/function learningConfig\(\)\{[\s\S]*?\r?\n  \}\r?\n/)[0];
  const token = '34010000-0000-4000-8000-000000000002';
  for (const hash of [`#test=${token}`, `#test=${token}\\`, `#test=${token}%5C`, `#test=${token}%20`]) {
    const window = { location: { hash }, WEBTEST_34_PREVIEW_CONFIG: { LEARNING_API_BASE_URL: 'https://webtest.ducanhdev.com' } };
    const config = vm.runInNewContext(`${learningConfig}; learningConfig()`, { window, URLSearchParams });
    assert.equal(config.testToken, token, hash);
  }
});
