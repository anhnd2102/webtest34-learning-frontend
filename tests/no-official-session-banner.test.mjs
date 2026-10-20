import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Renderer chạy trên DOM nên kiểm ở mức nguồn: dòng thông báo đã bị gỡ khỏi mọi bài.
test('renderer bài test không còn dòng "Phiên thi chính thức"', async () => {
  const source = await readFile(new URL('../term-tests/webtest-34-demo/content-preview.mjs', import.meta.url), 'utf8');
  assert.equal(source.includes('Phiên thi chính thức'), false);
});
