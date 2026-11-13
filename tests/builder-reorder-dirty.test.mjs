import assert from 'node:assert/strict';
import test from 'node:test';
import { bindItemActions } from '../term-tests/teacher-dashboard/studio/item-actions.js';
import { bindExerciseActions } from '../term-tests/teacher-dashboard/studio/exercise-actions.js';

// Thêm bài tập, di chuyển bài tập và di chuyển câu hỏi đều là thay đổi chưa lưu: phải bật cờ dirty.
function button(attrs) {
  return { listeners: {}, attrs, getAttribute(name) { return this.attrs[name]; }, addEventListener(type, fn) { this.listeners[type] = fn; } };
}
function draft() {
  return {
    blocks: [{
      blockId: 'b1',
      exercises: [{ exerciseId: 'e1', exerciseNumber: 1, itemIds: ['i1', 'i2'] }, { exerciseId: 'e2', exerciseNumber: 2, itemIds: ['i3'] }],
      items: [
        { itemVersionId: 'i1', exerciseId: 'e1', position: 1 },
        { itemVersionId: 'i2', exerciseId: 'e1', position: 2 },
        { itemVersionId: 'i3', exerciseId: 'e2', position: 3 }
      ]
    }],
    gradingKey: { items: {} }
  };
}
function harness(selectorToButton) {
  const container = { querySelectorAll: selector => selectorToButton[selector] || [], querySelector: () => null };
  const calls = [];
  const common = {
    container, draftState: draft(), markAsDirty: () => calls.push('dirty'),
    isBuilderDisposed: () => false, addCleanup: () => {}, setActiveBlockIdx: () => {},
    resolveTargetExercise: () => null, resequenceItemPositions: () => {},
    render: () => calls.push('render'), syncInputs: () => {}
  };
  return { common, calls };
}
const attrs = { 'data-block-idx': '0', 'data-item-idx': '0', 'data-exercise-idx': '0' };

test('di chuyển câu hỏi xuống bật dirty trước khi dựng lại', () => {
  const btn = button({ ...attrs });
  const { common, calls } = harness({ '.btn-move-item-down': [btn] });
  bindItemActions(common);
  btn.listeners.click();
  assert.deepEqual(common.draftState.blocks[0].items.map(item => item.itemVersionId), ['i2', 'i1', 'i3']);
  assert.deepEqual(calls, ['dirty', 'render']);
});

test('di chuyển câu hỏi lên bật dirty trước khi dựng lại', () => {
  const btn = button({ ...attrs, 'data-item-idx': '1' });
  const { common, calls } = harness({ '.btn-move-item-up': [btn] });
  bindItemActions(common);
  btn.listeners.click();
  assert.deepEqual(common.draftState.blocks[0].items.map(item => item.itemVersionId), ['i2', 'i1', 'i3']);
  assert.deepEqual(calls, ['dirty', 'render']);
});

test('di chuyển bài tập xuống bật dirty trước khi dựng lại', () => {
  const btn = button({ ...attrs });
  const { common, calls } = harness({ '.btn-move-exercise-down': [btn] });
  bindExerciseActions(common);
  btn.listeners.click();
  assert.deepEqual(common.draftState.blocks[0].exercises.map(ex => ex.exerciseId), ['e2', 'e1']);
  assert.deepEqual(calls, ['dirty', 'render']);
});

test('di chuyển bài tập lên bật dirty trước khi dựng lại', () => {
  const btn = button({ ...attrs, 'data-exercise-idx': '1' });
  const { common, calls } = harness({ '.btn-move-exercise-up': [btn] });
  bindExerciseActions(common);
  btn.listeners.click();
  assert.deepEqual(common.draftState.blocks[0].exercises.map(ex => ex.exerciseId), ['e2', 'e1']);
  assert.deepEqual(calls, ['dirty', 'render']);
});

test('thêm bài tập bật dirty trước khi dựng lại', () => {
  const btn = button({ ...attrs });
  const { common, calls } = harness({ '.btn-add-exercise': [btn] });
  bindExerciseActions(common);
  btn.listeners.click();
  assert.equal(common.draftState.blocks[0].exercises.length, 3);
  assert.deepEqual(calls, ['dirty', 'render']);
});

test('thao tác không có hiệu lực (câu đầu tiên đi lên, bài tập cuối đi xuống) không bật dirty', () => {
  const up = button({ ...attrs });
  const down = button({ ...attrs, 'data-exercise-idx': '1' });
  const { common, calls } = harness({ '.btn-move-item-up': [up], '.btn-move-exercise-down': [down] });
  bindItemActions(common);
  bindExerciseActions(common);
  up.listeners.click();
  down.listeners.click();
  assert.deepEqual(calls, []);
});
