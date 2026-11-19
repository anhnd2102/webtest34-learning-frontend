import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSimShortQaGroup, renderAudioDockHtml } from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';

const item = (position, prompt) => ({ itemVersionId: `it-${position}`, position, prompt });

test('câu trả lời ngắn: đề bài ngắn chia 2 cột, đề bài dài chiếm trọn một hàng', () => {
  const longPrompt = 'Đọc đoạn văn rồi trả lời. '.repeat(8);
  const html = renderSimShortQaGroup([item(66, 'Short one'), item(67, 'Short two'), item(68, longPrompt)]);
  assert.match(html, /short-qa-2col/);
  const cards = html.split('cbt-short-qa-card').slice(1);
  assert.equal(cards.length, 3);
  assert.ok(!cards[0].startsWith(' short-qa-wide') && !cards[1].startsWith(' short-qa-wide'));
  assert.ok(cards[2].startsWith(' short-qa-wide'), 'đề bài dài phải chiếm cả hàng');
});

test('câu trả lời ngắn: toàn đề dài thì không chia cột', () => {
  const longPrompt = 'Đọc đoạn văn rồi trả lời. '.repeat(8);
  const html = renderSimShortQaGroup([item(66, longPrompt), item(67, longPrompt)]);
  assert.doesNotMatch(html, /short-qa-2col/);
});

test('bài nghe: không có nút tạm dừng', () => {
  const html = renderAudioDockHtml('https://example.com/a.mp3');
  assert.doesNotMatch(html, /Tạm dừng/);
});
