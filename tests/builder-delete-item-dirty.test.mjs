import assert from 'node:assert/strict';
import test from 'node:test';
import { bindItemActions } from '../term-tests/teacher-dashboard/studio/item-actions.js';

// Xóa câu hỏi là thay đổi chưa lưu: phải bật cờ dirty để cảnh báo rời trang hiện đúng.
function setup() {
  const deleteBtn = {
    listeners: {},
    attrs: { 'data-block-idx': '0', 'data-item-idx': '0' },
    getAttribute(name) { return this.attrs[name]; },
    addEventListener(type, fn) { this.listeners[type] = fn; }
  };
  const container = {
    querySelectorAll: selector => (selector === '.btn-delete-item' ? [deleteBtn] : []),
    querySelector: () => null
  };
  const draftState = {
    blocks: [{ items: [{ itemVersionId: 'i1' }, { itemVersionId: 'i2' }] }],
    gradingKey: { items: { i1: {}, i2: {} } }
  };
  const calls = [];
  bindItemActions({
    container, draftState,
    markAsDirty: () => calls.push('dirty'),
    isBuilderDisposed: () => false,
    addCleanup: () => {},
    resequenceItemPositions: () => calls.push('resequence'),
    render: () => calls.push('render'),
    syncInputs: () => calls.push('sync')
  });
  return { deleteBtn, draftState, calls };
}

test('xóa câu hỏi bật cờ dirty, xóa đáp án khỏi gradingKey và dựng lại một lần', () => {
  const { deleteBtn, draftState, calls } = setup();
  deleteBtn.listeners.click();
  assert.deepEqual(draftState.blocks[0].items.map(item => item.itemVersionId), ['i2']);
  assert.equal('i1' in draftState.gradingKey.items, false);
  assert.equal(calls.filter(call => call === 'dirty').length, 1);
  assert.equal(calls.filter(call => call === 'render').length, 1);
});

test('xóa câu hỏi không tồn tại không bật dirty và không dựng lại', () => {
  const { deleteBtn, calls } = setup();
  deleteBtn.attrs['data-block-idx'] = '5';
  deleteBtn.listeners.click();
  assert.equal(calls.includes('dirty'), false);
  assert.equal(calls.includes('render'), false);
});
