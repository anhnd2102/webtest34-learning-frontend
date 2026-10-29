import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const src = await fs.readFile(new URL('../term-tests/webtest-34-demo/content-preview.mjs', import.meta.url), 'utf8');
const flow = src.match(/async function openReview\(\) \{[\s\S]*?\r?\n    \}\r?\n/)?.[0] ?? '';

test('intro có nút Xem kết quả, bật cùng nút Bắt đầu khi chọn tên', () => {
  assert.match(src, /id="viewResultBtn" disabled/);
  assert.match(src, /viewBtn\.disabled = !studentSelect\.value/);
  assert.match(src, /addEventListener\('click', openReview\)/);
});

test('openReview gọi /attempts/review, không start, không kiểm tra âm thanh/toàn màn hình', () => {
  assert.match(flow, /apiRequest\('\/attempts\/review'/);
  assert.doesNotMatch(flow, /\/attempts\/start|requestFullscreen|mountExamGuard/);
});

test('review-module nạp động có rev, dùng reviewViewModel + reviewHtml, nhóm theo result.definition trước', () => {
  assert.match(src, /import\(`\.\.\/34-shared\/review-module\.mjs\?rev=/);
  assert.match(src, /reviewApi\.reviewViewModel\(\{ meta, \.\.\.input \}\)/);
  assert.match(src, /vm\.kind === 'ready'\s*\? studentReviewHtml\(/);
  assert.match(src, /: reviewApi\.reviewHtml\(vm\)/);
  assert.match(src, /res\.definition \|\| learningState\.definition/);
  assert.match(src, /data-review-retry/);
  assert.match(src, /data-review-section/);
});
