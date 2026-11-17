import test from 'node:test';
import assert from 'node:assert/strict';
import { renderStepTwo } from '../term-tests/teacher-dashboard/studio/rubric-wizard.js';
import { createWizardState, effectiveContext, sharedContextFromBlock } from '../term-tests/teacher-dashboard/studio/rubric-wizard-model.js';

// Nhập bài đọc một lần ở Phần, mọi câu "trả lời theo ý" trong Phần dùng chung (spec #40, kế hoạch UX ngữ cảnh dùng chung).
const reading = () => createWizardState({ variant: 'reading_comprehension', courseId: 34 });
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

test('lấy ngữ cảnh dùng chung từ bài đọc của Phần: ưu tiên bài đọc hiện cho học viên, bỏ thẻ HTML, rỗng thì không có', () => {
  assert.equal(sharedContextFromBlock({ readingPassage: '<p>Cities are <b>growing</b>.</p>' }), 'Cities are growing.');
  assert.equal(sharedContextFromBlock({ stimulusReadingPassage: 'Passage B', referenceContext: 'Ref' }), 'Passage B');
  assert.equal(sharedContextFromBlock({ referenceContext: 'Ref only' }), 'Ref only');
  assert.equal(sharedContextFromBlock({ readingPassage: '  ' }), '');
  assert.equal(sharedContextFromBlock(null), '');
});

test('có bài đọc của Phần: bước 2 báo đang dùng chung, không bắt dán lại, có nút đổi sang ngữ cảnh riêng', () => {
  const html = renderStepTwo(reading(), '', 'Cities are growing quickly.');
  assert.match(text(html), /bài đọc của Phần/i);
  assert.match(text(html), /Cities are growing quickly\./);
  assert.match(html, /data-rw-action="use-own-context"/);
  assert.doesNotMatch(html, /data-rw="context"/);
});

test('chọn ngữ cảnh riêng: hiện ô nhập và nút quay lại bài đọc của Phần', () => {
  const state = reading();
  state.useOwnContext = true;
  const html = renderStepTwo(state, '', 'Cities are growing quickly.');
  assert.match(html, /data-rw="context"/);
  assert.match(html, /data-rw-action="use-shared-context"/);
});

test('Phần chưa có bài đọc: giữ ô dán như cũ và nhắc có thể nhập ở Phần để dùng chung', () => {
  const html = renderStepTwo(reading(), '', '');
  assert.match(html, /data-rw="context"/);
  assert.match(text(html), /ô Bài đọc của Phần/i);
  assert.doesNotMatch(html, /use-own-context/);
});

test('dạng không dùng ngữ cảnh (Dịch) không hiện gì về bài đọc dùng chung', () => {
  const html = renderStepTwo(createWizardState({ variant: 'translation', courseId: 34 }), '', 'Passage');
  assert.doesNotMatch(html, /data-rw="context"|use-own-context/);
});

test('ngữ cảnh dùng để chấm thử/lưu: riêng thì lấy ô nhập, ngược lại lấy của Phần, thiếu thì rỗng', () => {
  const state = reading();
  state.context = 'Own text';
  assert.equal(effectiveContext(state, 'Block text'), 'Block text');
  state.useOwnContext = true;
  assert.equal(effectiveContext(state, 'Block text'), 'Own text');
  assert.equal(effectiveContext(reading(), ''), '');
  const noShared = reading();
  noShared.context = 'Pasted';
  assert.equal(effectiveContext(noShared, ''), 'Pasted', 'Phần không có bài đọc thì dùng ô dán');
});
