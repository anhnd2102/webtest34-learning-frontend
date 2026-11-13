import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

// Markup ở content-preview.mjs, logic màn kết quả ở candidate/review-screen.js (tách từ content-preview.mjs).
const readSource = name => fs.readFile(new URL(`../term-tests/webtest-34-demo/${name}`, import.meta.url), 'utf8');
const source = (await readSource('content-preview.mjs')) + '\n' + (await readSource('candidate/review-screen.js'));

test('introMain trỏ đúng thẻ <main> chứa nút Xem kết quả, để openReview không ném lỗi null', () => {
  const selector = source.match(/const introMain = document\.querySelector\('main\.([\w-]+)/)?.[1];
  assert.ok(selector, 'không tìm thấy selector của introMain');
  const beforeButton = source.slice(0, source.indexOf('id="viewResultBtn"'));
  const mainTag = beforeButton.slice(beforeButton.lastIndexOf('<main'), beforeButton.length).match(/^<main[^>]*>/)?.[0] ?? '';
  assert.match(mainTag, new RegExp(`class="[^"]*\\b${selector}\\b`));
});
