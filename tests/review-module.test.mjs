import assert from 'node:assert/strict';
import test from 'node:test';

// Hai script dùng chung của Course 34 là IIFE gắn vào window; nạp chúng như trình duyệt.
globalThis.window = globalThis;
await import('../term-tests/34-shared/pedagogical-types.js');
await import('../term-tests/34-shared/learning-result.js');
const { reviewViewModel, reviewHtml } = await import('../term-tests/34-shared/review-module.mjs');

const definition = { blocks: [
  { blockId: 'b1', title: 'Vocabulary', items: [{ itemVersionId: 'i1' }, { itemVersionId: 'i2' }] },
  { blockId: 'b2', title: 'Writing / Speaking', items: [{ itemVersionId: 'i3' }] }
] };
const item = (id, position, verdict, scoreEarned, maxScore, extra = {}) => ({ itemVersionId: id, position, verdict, scoreEarned, maxScore, rawAnswer: 'ans', ...extra });
const meta = { testTitle: 'Test 1', studentName: 'An', className: 'L1', submittedAt: '2026-10-01T03:00:00Z' };
const ready = (items, summary = {}, gradingStatus = 'complete') => ({
  state: 'ready', meta, definition,
  result: { gradingStatus, summary: { scoreFinal: gradingStatus === 'complete', pendingItemCount: 0, ...summary }, items }
});

test('điểm tạm tính loại câu đang chờ khỏi mẫu số và ghi rõ số câu còn chấm', () => {
  const vm = reviewViewModel(ready([item('i1', 1, 'correct', 1, 1), item('i2', 2, 'pending', 0, 1), item('i3', 3, 'manual_review', 0, 2)], {}, 'pending'));
  assert.equal(vm.kind, 'ready');
  assert.equal(vm.score, '1 / 1');
  assert.equal(vm.provisionalLabel, 'Chưa chốt, còn 2 câu đang chấm');
  assert.equal(vm.sections[0].scoreText, '1 / 1 điểm tạm tính');
  assert.equal(vm.sections[0].correctText, '1/2 câu đúng');
});

test('điểm chính thức không có nhãn tạm tính', () => {
  const vm = reviewViewModel(ready([item('i1', 1, 'correct', 1, 1), item('i2', 2, 'incorrect', 0, 1), item('i3', 3, 'correct', 2, 2)]));
  assert.equal(vm.score, '3 / 4');
  assert.equal(vm.provisionalLabel, '');
});

test('đáp án đúng chỉ hiện khi có expectedAnswer', () => {
  const html = reviewHtml(reviewViewModel(ready([item('i1', 1, 'incorrect', 0, 1, { expectedAnswer: ['cat', 'dog'] }), item('i2', 2, 'incorrect', 0, 1), item('i3', 3, 'correct', 1, 1)])));
  assert.match(html, /Đáp án:<\/strong> cat, dog/);
  assert.equal(html.match(/Đáp án chưa được mở/g).length, 2);
});

test('nhãn từng câu và nhận xét Structure/Accuracy của câu tự luận', () => {
  const feedback = { structureScore: 1, structureMaxScore: 2, accuracyScore: 2, accuracyMaxScore: 2, errors: [{ message: 'Sai thì' }] };
  const html = reviewHtml(reviewViewModel(ready([item('i1', 1, 'partial', 0.5, 1), item('i2', 2, 'manual_review', 0, 1), item('i3', 3, 'incorrect', 1, 4, { feedback })])));
  assert.match(html, /Một phần/);
  assert.match(html, /Cần giảng viên/);
  assert.match(html, /Structure 1 \/ 2 · Accuracy 2 \/ 2/);
  assert.match(html, /Sai thì/);
  assert.match(reviewHtml(reviewViewModel(ready([item('i1', 1, 'weird', 0, 1)]))), /Chưa chấm/);
});

test('không ghép được câu với cấu trúc đề thì báo chưa đầy đủ và không hiện tổng điểm', () => {
  const vm = reviewViewModel(ready([item('i1', 1, 'correct', 1, 1), item('zzz', 9, 'correct', 1, 1)]));
  assert.equal(vm.kind, 'incomplete');
  assert.equal(vm.score, undefined);
  const html = reviewHtml(vm);
  assert.match(html, /kết quả chưa đầy đủ/i);
  assert.doesNotMatch(html, /\d+ \/ \d+/);
});

test('các trạng thái riêng', () => {
  const nr = reviewHtml(reviewViewModel({ state: 'not_released', meta }));
  assert.match(nr, /chưa được công bố/); assert.match(nr, /Đã ghi nhận bài nộp/); assert.match(nr, /2026/);
  const err = reviewHtml(reviewViewModel({ state: 'error', error: { status: 429 } }));
  assert.match(err, /data-review-retry/); assert.match(err, /Thử lại/);
  assert.match(reviewHtml(reviewViewModel({ state: 'no_submission' })), /chưa có bài nộp/i);
  assert.match(reviewHtml(reviewViewModel({ state: 'locked' })), /máy khác/);
  assert.match(reviewHtml(reviewViewModel({ state: 'loading' })), /Đang tải kết quả…/);
});

test('trạng thái chưa công bố không để lộ điểm', () => {
  const html = reviewHtml(reviewViewModel({ ...ready([item('i1', 1, 'correct', 1, 1)]), state: 'not_released' }));
  assert.doesNotMatch(html, /1 \/ 1/);
});

test('mọi chuỗi từ dữ liệu đều được escape và có CSS in, không nút PDF', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const html = reviewHtml(reviewViewModel({
    ...ready([item('i1', 1, 'incorrect', 0, 1, { rawAnswer: evil, expectedAnswer: evil, feedback: { errors: [{ message: evil }] } })]),
    meta: { testTitle: evil, studentName: evil, className: evil, submittedAt: evil },
    definition: { blocks: [{ blockId: 'b"1', title: evil, items: [{ itemVersionId: 'i1' }] }] }
  }));
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /@media print/);
  assert.doesNotMatch(html, /PDF/i);
});

test('điểm essay null coi là chưa chấm, không hiện 0 / 2', () => {
  const html = reviewHtml(reviewViewModel(ready([item('i1', 1, 'pending', 0, 2, { feedback: { structureScore: null, accuracyScore: null } }), item('i2', 2, 'correct', 1, 1), item('i3', 3, 'correct', 1, 1)], {}, 'pending')));
  assert.doesNotMatch(html, /Structure 0 \/ 2/);
  assert.match(html, /Structure chưa chấm/);
});

test('tất cả câu đang chờ: tổng và phần cùng dùng cách ghi điểm tạm tính, không hiện 0 / 0', () => {
  const vm = reviewViewModel(ready([item('i1', 1, 'pending', 0, 1), item('i2', 2, 'pending', 0, 1), item('i3', 3, 'manual_review', 0, 2)], {}, 'pending'));
  assert.equal(vm.score, 'Chưa có điểm');
  assert.doesNotMatch(vm.sections[0].scoreText, /\/ 2 điểm$/);
  assert.match(vm.sections[0].scoreText, /tạm tính/);
});

test('HTML: không lồng main, không h3 trong button, id phần duy nhất, role=status không bọc nút Thử lại', () => {
  const dup = { blocks: [{ blockId: 'x', title: 'Same', items: [{ itemVersionId: 'i1' }] }, { blockId: 'x', title: 'Same', items: [{ itemVersionId: 'i2' }] }] };
  const html = reviewHtml(reviewViewModel({ ...ready([item('i1', 1, 'correct', 1, 1), item('i2', 2, 'correct', 1, 1)]), definition: dup }));
  assert.doesNotMatch(html, /<main/);
  assert.doesNotMatch(html, /<button[^>]*><h3/);
  const ids = [...html.matchAll(/ id="(review-[^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 2);
  const err = reviewHtml(reviewViewModel({ state: 'error', error: { status: 500 } }));
  assert.doesNotMatch(err, /role="status"[^>]*>[\s\S]*data-review-retry/);
  assert.match(err, /data-review-retry/);
});

test('trạng thái lỗi/đang tải không cần WEBTEST34_LEARNING_RESULT', () => {
  const saved = globalThis.WEBTEST34_LEARNING_RESULT;
  delete globalThis.WEBTEST34_LEARNING_RESULT;
  try { assert.equal(reviewViewModel({ state: 'error' }).kind, 'error'); } finally { globalThis.WEBTEST34_LEARNING_RESULT = saved; }
});

test('loại câu lạ (listening_mcq) vẫn dựng được kết quả, không ném lỗi', () => {
  const vm = reviewViewModel(ready([item('i1', 1, 'correct', 1, 1, { pedagogicalTypeCode: 'listening_mcq' }), item('i2', 2, 'correct', 1, 1), item('i3', 3, 'correct', 1, 1)]));
  assert.equal(vm.kind, 'ready');
  assert.equal(vm.score, '3 / 3');
});
