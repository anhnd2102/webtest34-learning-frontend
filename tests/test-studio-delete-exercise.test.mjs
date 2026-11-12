import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deleteExerciseFromBlock,
  resequenceItemPositions
} from '../term-tests/teacher-dashboard/studio/draft-model.js';

test('deleteExerciseFromBlock deletes exercise and all its child questions instead of reassigning them', () => {
  // Scenario matching user description:
  // Exercise 1 has 10 items (pos 1..10)
  // Exercise 2 has 5 items (pos 11..15)
  const ex1Items = [];
  const gradingKeyItems = {};
  for (let i = 1; i <= 10; i++) {
    const id = `ver-ex1-q${i}`;
    ex1Items.push({
      itemVersionId: id,
      position: i,
      exerciseId: 'ex-1',
      exerciseTitle: 'Exercise 1',
      prompt: `Exercise 1 Question ${i}`
    });
    gradingKeyItems[id] = { correct: `ans-${i}` };
  }

  const ex2Items = [];
  for (let i = 1; i <= 5; i++) {
    const id = `ver-ex2-q${i}`;
    ex2Items.push({
      itemVersionId: id,
      position: 10 + i,
      exerciseId: 'ex-2',
      exerciseTitle: 'Exercise 2',
      prompt: `Exercise 2 Question ${i}`
    });
    gradingKeyItems[id] = { correct: `ans-${10 + i}` };
  }

  const draftState = {
    blocks: [
      {
        blockId: 'block-1',
        title: 'Phần 1: Ngữ pháp & Từ vựng',
        exercises: [
          {
            exerciseId: 'ex-1',
            exerciseNumber: 1,
            title: 'Bài tập 1: Điền từ',
            itemIds: ex1Items.map(it => it.itemVersionId)
          },
          {
            exerciseId: 'ex-2',
            exerciseNumber: 2,
            title: 'Bài tập 2: Trắc nghiệm',
            itemIds: ex2Items.map(it => it.itemVersionId)
          }
        ],
        items: [...ex1Items, ...ex2Items]
      }
    ],
    gradingKey: {
      items: gradingKeyItems
    }
  };

  assert.equal(draftState.blocks[0].items.length, 15, 'Initial item count must be 15');
  assert.equal(Object.keys(draftState.gradingKey.items).length, 15, 'Initial grading key count must be 15');

  // Action: Delete Exercise 1 (idx = 0)
  const success = deleteExerciseFromBlock(draftState, { blockIdx: 0, exerciseIdx: 0 });
  assert.equal(success, true, 'deleteExerciseFromBlock must succeed');

  // Verify Exercise level:
  const remainingExercises = draftState.blocks[0].exercises;
  assert.equal(remainingExercises.length, 1, 'Only 1 exercise should remain');
  assert.equal(remainingExercises[0].exerciseId, 'ex-2', 'Remaining exercise must be ex-2');
  assert.equal(remainingExercises[0].exerciseNumber, 1, 'Remaining exercise must be renumbered to 1');

  // Verify Items level:
  const remainingItems = draftState.blocks[0].items;
  assert.equal(remainingItems.length, 5, 'Block must now have exactly 5 items (Ex1 items deleted, NOT transferred to Ex2)');
  remainingItems.forEach(it => {
    assert.equal(it.exerciseId, 'ex-2', 'All remaining items must belong to ex-2');
  });

  // Verify Positions resequencing:
  assert.deepEqual(remainingItems.map(it => it.position), [1, 2, 3, 4, 5], 'Positions must be resequenced to 1..5');

  // Verify Grading Keys cleanup:
  assert.equal(Object.keys(draftState.gradingKey.items).length, 5, 'Grading keys must be pruned down to 5');
  for (let i = 1; i <= 10; i++) {
    assert.equal(draftState.gradingKey.items[`ver-ex1-q${i}`], undefined, `Grading key for ver-ex1-q${i} must be deleted`);
  }
  for (let i = 1; i <= 5; i++) {
    assert.notEqual(draftState.gradingKey.items[`ver-ex2-q${i}`], undefined, `Grading key for ver-ex2-q${i} must be preserved`);
  }

  // Verify itemIds array on surviving exercise matches remaining items
  assert.deepEqual(
    remainingExercises[0].itemIds,
    remainingItems.map(it => it.itemVersionId),
    'Remaining exercise itemIds must match surviving items'
  );
});

test('deleteExerciseFromBlock returns false and prevents deleting the only exercise in a block', () => {
  const draftState = {
    blocks: [
      {
        blockId: 'block-single',
        exercises: [{ exerciseId: 'only-ex', exerciseNumber: 1, title: 'Only Ex' }],
        items: [{ itemVersionId: 'q-1', exerciseId: 'only-ex', position: 1 }]
      }
    ],
    gradingKey: { items: { 'q-1': {} } }
  };

  const res = deleteExerciseFromBlock(draftState, { blockIdx: 0, exerciseIdx: 0 });
  assert.equal(res, false, 'Must not allow deleting the sole exercise of a block');
  assert.equal(draftState.blocks[0].exercises.length, 1);
  assert.equal(draftState.blocks[0].items.length, 1);
});
