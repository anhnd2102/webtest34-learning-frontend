import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

for (const course of ['03', '45']) {
  test(`course ${course} Version 2 entry keeps the test token in the fragment`, async () => {
    const html = await fs.readFile(new URL(`../term-tests/webtest-${course}/test-1/index.html`, import.meta.url), 'utf8');
    assert.match(html, /data-version="2"/);
    assert.match(html, /new URL\(/);
    assert.match(html, new RegExp(`demoCourse', '${course}'`));
    assert.match(html, /target\.hash = location\.hash/);
    assert.doesNotMatch(html, /[?&]test=/);
    assert.doesNotMatch(html, /[0-9a-f]{8}-[0-9a-f-]{27,}/i);
  });
}
