import assert from 'node:assert/strict';
import test from 'node:test';
import { bindChoiceVariantActions } from '../term-tests/teacher-dashboard/studio/authoring/choice-variant-actions.js';
import { bindVocabularyActions } from '../term-tests/teacher-dashboard/studio/authoring/vocabulary-actions.js';
import { bindRubricActions } from '../term-tests/teacher-dashboard/studio/authoring/rubric-actions.js';

// Mọi thao tác chỉnh nội dung câu hỏi (thêm/xóa phương án, tiêu chí, nghĩa từ vựng, đổi rubric)
// phải bật cờ dirty trước khi dựng lại, để cảnh báo "thay đổi chưa lưu" hiện đúng.
function element(attrs = {}, extra = {}) {
  return { listeners: {}, attrs, value: '', getAttribute(name) { return this.attrs[name]; }, addEventListener(type, fn) { this.listeners[type] = fn; }, closest: () => null, ...extra };
}
function run(binder, selector, el, draftState) {
  const calls = [];
  const container = { querySelectorAll: s => (s === selector ? [el] : []), querySelector: () => null };
  binder({ container, draftState, markAsDirty: () => calls.push('dirty'), render: () => calls.push('render'), syncInputs: () => {}, options: {} });
  return { calls, fire: (type = 'click') => el.listeners[type]() };
}
const pos = { 'data-block-idx': '0', 'data-item-idx': '0' };
const choiceDraft = () => ({
  blocks: [{ items: [{ itemVersionId: 'i1', options: [{ id: 'A', label: 'a' }, { id: 'B', label: 'b' }, { id: 'C', label: 'c' }] }] }],
  gradingKey: { items: { i1: { graderType: 'accepted_text', accepted: ['x', 'y'] } } }
});
const rubricDraft = () => ({
  blocks: [{ items: [{ itemVersionId: 'i1', maxScore: 2 }] }],
  gradingKey: { items: { i1: { rubric: { maxScore: 2, criteria: [{ id: 'c1', maxScore: 1 }, { id: 'c2', maxScore: 1 }] } } } }
});

test('thêm phương án lựa chọn bật dirty rồi dựng lại', () => {
  const draft = choiceDraft();
  const { calls, fire } = run(bindChoiceVariantActions, '.btn-add-option', element(pos), draft);
  fire();
  assert.equal(draft.blocks[0].items[0].options.length, 4);
  assert.deepEqual(calls, ['dirty', 'render']);
});

test('xóa phương án lựa chọn bật dirty; không xóa được khi chỉ còn hai phương án', () => {
  const draft = choiceDraft();
  const { calls, fire } = run(bindChoiceVariantActions, '.btn-del-option', element({ ...pos, 'data-option-id': 'C' }), draft);
  fire();
  assert.deepEqual(draft.blocks[0].items[0].options.map(o => o.id), ['A', 'B']);
  assert.deepEqual(calls, ['dirty', 'render']);
  globalThis.alert = () => {};
  calls.length = 0;
  fire();
  assert.deepEqual(calls, [], 'chỉ còn hai phương án thì không đổi gì');
});

test('xóa biến thể (chip) đáp án bật dirty', () => {
  const draft = choiceDraft();
  const { calls, fire } = run(bindChoiceVariantActions, '.btn-remove-chip', element({ ...pos, 'data-variant': 'x' }), draft);
  fire();
  assert.deepEqual(draft.gradingKey.items.i1.accepted, ['y']);
  assert.deepEqual(calls, ['dirty', 'render']);
});

test('thêm và xóa nghĩa của cặp từ vựng bật dirty', () => {
  const draft = { blocks: [{ items: [{ itemVersionId: 'i1', options: [{ id: 'opt_1' }, { id: 'opt_2' }, { id: 'opt_3' }] }] }], gradingKey: { items: { i1: { expectedOptionId: 'opt_1' } } } };
  const add = run(bindVocabularyActions, '.btn-add-vocab-option', element(pos), draft);
  add.fire();
  assert.equal(draft.blocks[0].items[0].options.length, 4);
  assert.deepEqual(add.calls, ['dirty', 'render']);
  const del = run(bindVocabularyActions, '.btn-del-vocab-option', element({ ...pos, 'data-option-id': 'opt_4' }), draft);
  del.fire();
  assert.equal(draft.blocks[0].items[0].options.length, 3);
  assert.deepEqual(del.calls, ['dirty', 'render']);
});

test('thêm và xóa tiêu chí rubric bật dirty và tính lại điểm tối đa', () => {
  const draft = rubricDraft();
  const add = run(bindRubricActions, '.btn-add-criterion', element(pos), draft);
  add.fire();
  assert.equal(draft.gradingKey.items.i1.rubric.criteria.length, 3);
  assert.equal(draft.blocks[0].items[0].maxScore, 3);
  assert.deepEqual(add.calls, ['dirty', 'render']);
  const del = run(bindRubricActions, '.btn-del-criterion', element({ ...pos, 'data-criterion-idx': '2' }), draft);
  del.fire();
  assert.equal(draft.blocks[0].items[0].maxScore, 2);
  assert.deepEqual(del.calls, ['dirty', 'render']);
});

test('đổi mẫu rubric bật dirty', () => {
  const draft = rubricDraft();
  const sel = element(pos, { value: 'comprehension' });
  const { calls, fire } = run(bindRubricActions, '.select-rubric-preset', sel, draft);
  fire('change');
  assert.deepEqual(calls, ['dirty', 'render']);
});
