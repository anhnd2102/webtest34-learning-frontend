import assert from 'node:assert/strict';
import test from 'node:test';
import { bindItemActions } from '../term-tests/teacher-dashboard/studio/item-actions.js';

// Sự kiện change của prompt (xảy ra khi ô mất focus, tức giữa mousedown và mouseup của một nút khác)
// chỉ được dựng lại builder khi tập ô trống của bài điền từ thật sự đổi; nếu không, nút vừa nhấn bị thay thế
// trước khi click phát sinh và cú nhấp bị nuốt.
function setup(prompt) {
  const el = {
    listeners: {},
    value: prompt,
    attrs: { 'data-block-idx': '0', 'data-item-idx': '0' },
    getAttribute(name) { return this.attrs[name]; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    closest: () => null
  };
  const container = { querySelectorAll: s => (s === '.item-prompt-input' ? [el] : []), querySelector: () => null };
  const item = { itemVersionId: 'c1', prompt, layoutType: 'inline_cloze', pedagogicalTypeCode: 'inline_cloze' };
  const draftState = { blocks: [{ items: [item] }], gradingKey: { items: {} } };
  const calls = [];
  bindItemActions({
    container, draftState, markAsDirty: () => calls.push('dirty'), isBuilderDisposed: () => false, addCleanup: () => {},
    resequenceItemPositions: () => calls.push('resequence'), render: () => calls.push('render'), syncInputs: () => calls.push('sync')
  });
  const type = text => { el.value = text; el.listeners.input(); };
  return { el, calls, type, item };
}

test('change không dựng lại khi tập ô trống không đổi (chỉ sửa chữ xung quanh)', () => {
  const { el, calls, type } = setup('He (1) ____ to school and (2) ____ home.');
  type('She (1) ____ to work and (2) ____ back.');
  calls.length = 0;
  el.listeners.change();
  assert.deepEqual(calls, ['sync'], 'chỉ đồng bộ ô nhập, không resequence/render');
});

test('change dựng lại khi thêm hoặc bớt ô trống', () => {
  const added = setup('He (1) ____ to school.');
  added.type('He (1) ____ to school and (2) ____ home.');
  added.calls.length = 0;
  added.el.listeners.change();
  assert.deepEqual(added.calls, ['sync', 'resequence', 'render']);
  const removed = setup('He (1) ____ to school and (2) ____ home.');
  removed.type('He (1) ____ to school.');
  removed.calls.length = 0;
  removed.el.listeners.change();
  assert.deepEqual(removed.calls, ['sync', 'resequence', 'render']);
});

test('change dựng lại khi đổi số của ô trống', () => {
  const { el, calls, type } = setup('He (1) ____ to school.');
  type('He (3) ____ to school.');
  calls.length = 0;
  el.listeners.change();
  assert.deepEqual(calls, ['sync', 'resequence', 'render']);
});

test('sau một lần dựng lại, các thay đổi tiếp theo so với trạng thái đã dựng', () => {
  const { el, calls, type } = setup('He (1) ____ to school.');
  type('He (1) ____ to school and (2) ____ home.');
  el.listeners.change();
  calls.length = 0;
  type('He (1) ____ to school and (2) ____ home today.');
  el.listeners.change();
  assert.deepEqual(calls.filter(c => c !== 'dirty'), ['sync'], 'cùng tập ô trống với lần dựng lại gần nhất');
});
