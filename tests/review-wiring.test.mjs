import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

const html = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');

test('Xem kết quả gọi /attempts/review, không qua kiểm tra âm thanh và không gọi /attempts/start', () => {
  assert.match(html, /id="viewResult"/);
  const flow = html.match(/async function openReview\(\)\{[\s\S]*?\n  \}\n  \$\('#viewResult'\)/)?.[0] ?? '';
  assert.match(flow, /learningRequest\('\/attempts\/review'/);
  assert.doesNotMatch(flow, /\/attempts\/start|audioCheckScreen'\)\.classList\.remove/);
  assert.match(html, /\$\('#viewResult'\)\.addEventListener\('click', openReview\)/);
});

test('request review không mang trường thiết bị (schema backend strict)', () => {
  assert.match(html, /path === '\/attempts\/review' \? body : path\.startsWith/);
});

test('màn hình xem kết quả dùng module chung, nạp sau learning-result.js và pedagogical-types.js', () => {
  assert.ok(html.indexOf('pedagogical-types.js') < html.indexOf('review-module.mjs'));
  assert.ok(html.indexOf('learning-result.js') < html.indexOf('review-module.mjs'));
  assert.match(html, /reviewApi\.reviewHtml\(reviewApi\.reviewViewModel\(/);
});

test('lỗi tải kết quả hiện trong khu vực kết quả với nút Thử lại hoạt động, không vào #studentError', () => {
  assert.match(html, /showResultError\(error, \(\) => \{ showResultLoading\(\); startLearningResultPolling\(\{refetch: true\}\); \}\)/);
  assert.doesNotMatch(html, /setError\('studentError', `Không tải được kết quả/);
  assert.match(html, /closest\('\[data-review-retry\]'\)\) reviewRetry\?\.\(\)/);
  assert.match(html, /closest\('\[data-review-section\]'\)/);
});

test('chế độ xem ẩn đồng hồ/nút nộp và không ghi đè localStorage', () => {
  assert.match(html, /\.review-mode #timer[^}]*display:none/);
  assert.match(html, /function persist\(\)\{\s*if\(reviewMode\) return;/);
  assert.match(html, /\.review-section-toggle\{/);
  assert.match(html, /\.review-screen\{/);
});

test('bài chế độ thi đã nộp không vào phòng chờ', () => {
  assert.match(html, /exam\.status === 'waiting' && result\.attempt\.status !== 'submitted'/);
});
