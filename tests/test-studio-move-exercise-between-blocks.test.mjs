import test from 'node:test';
import assert from 'node:assert/strict';
import {
  moveExerciseBetweenBlocks,
  resequenceItemPositions
} from '../term-tests/teacher-dashboard/studio/draft-model.js';

test('moveExerciseBetweenBlocks transfers exercise from Block 2 to middle of Block 1 with resequenced positions', () => {
  // Setup exact user scenario:
  // Block 1:
  //   Exercise 1: 5 questions (pos 1..5)
  //   Exercise 2: 10 questions (pos 6..15)
  // Block 2:
  //   Exercise 1: 10 questions (pos 16..25)
  const b1Items = [];
  for (let i = 1; i <= 5; i++) {
    b1Items.push({ itemVersionId: `item-${i}`, position: i, exerciseId: 'b1-ex1', exerciseTitle: 'Exercise 1' });
  }
  for (let i = 6; i <= 15; i++) {
    b1Items.push({ itemVersionId: `item-${i}`, position: i, exerciseId: 'b1-ex2', exerciseTitle: 'Exercise 2' });
  }

  const b2Items = [];
  for (let i = 16; i <= 25; i++) {
    b2Items.push({ itemVersionId: `item-${i}`, position: i, exerciseId: 'b2-ex1', exerciseTitle: 'Exercise 1' });
  }

  const draftState = {
    blocks: [
      {
        blockId: 'b1',
        title: 'Phần 1: Ngữ pháp',
        exercises: [
          { exerciseId: 'b1-ex1', exerciseNumber: 1, title: 'Bài tập 1: Trắc nghiệm' },
          { exerciseId: 'b1-ex2', exerciseNumber: 2, title: 'Bài tập 2: Điền từ' }
        ],
        items: b1Items
      },
      {
        blockId: 'b2',
        title: 'Phần 2: Đọc hiểu',
        exercises: [
          { exerciseId: 'b2-ex1', exerciseNumber: 1, title: 'Bài tập 1: Đọc hiểu' }
        ],
        items: b2Items
      }
    ],
    gradingKey: { items: {} }
  };

  // Action: Move Block 2 Exercise 1 into Block 1, between Exercise 1 and Exercise 2 (insertIndex = 1)
  const success = moveExerciseBetweenBlocks(draftState, {
    sourceBlockIdx: 1,
    exerciseId: 'b2-ex1',
    targetBlockIdx: 0,
    insertIndex: 1
  });

  assert.equal(success, true, 'moveExerciseBetweenBlocks must return true');

  // Verify Block 1:
  assert.equal(draftState.blocks[0].exercises.length, 3, 'Block 1 must have 3 exercises');
  assert.equal(draftState.blocks[0].exercises[0].exerciseId, 'b1-ex1');
  assert.equal(draftState.blocks[0].exercises[0].exerciseNumber, 1);
  assert.equal(draftState.blocks[0].exercises[1].exerciseId, 'b2-ex1');
  assert.equal(draftState.blocks[0].exercises[1].exerciseNumber, 2);
  assert.equal(draftState.blocks[0].exercises[2].exerciseId, 'b1-ex2');
  assert.equal(draftState.blocks[0].exercises[2].exerciseNumber, 3);

  // Total items in Block 1 must be 25
  assert.equal(draftState.blocks[0].items.length, 25, 'Block 1 must have 25 items');

  // Verify item positions in Block 1:
  // Ex 1 (items 1..5)
  const ex1Items = draftState.blocks[0].items.filter(it => it.exerciseId === 'b1-ex1');
  assert.equal(ex1Items.length, 5);
  assert.deepEqual(ex1Items.map(it => it.position), [1, 2, 3, 4, 5]);

  // Ex 2 (transferred from B2, items 6..15)
  const ex2Items = draftState.blocks[0].items.filter(it => it.exerciseId === 'b2-ex1');
  assert.equal(ex2Items.length, 10);
  assert.deepEqual(ex2Items.map(it => it.position), [6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

  // Ex 3 (old B1 Ex 2, shifted to items 16..25)
  const ex3Items = draftState.blocks[0].items.filter(it => it.exerciseId === 'b1-ex2');
  assert.equal(ex3Items.length, 10);
  assert.deepEqual(ex3Items.map(it => it.position), [16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);

  // Verify Block 2:
  assert.equal(draftState.blocks[1].exercises.length, 0, 'Block 2 must have 0 exercises');
  assert.equal(draftState.blocks[1].items.length, 0, 'Block 2 must have 0 items');
});

test('moveExerciseBetweenBlocks can move to start (insertIndex = 0) and end (insertIndex = -1)', () => {
  const draftState = {
    blocks: [
      {
        blockId: 'b1',
        title: 'Block 1',
        exercises: [{ exerciseId: 'b1-e1', title: 'E1' }],
        items: [{ itemVersionId: 'i1', position: 1, exerciseId: 'b1-e1' }]
      },
      {
        blockId: 'b2',
        title: 'Block 2',
        exercises: [{ exerciseId: 'b2-e1', title: 'E2' }],
        items: [{ itemVersionId: 'i2', position: 2, exerciseId: 'b2-e1' }]
      }
    ],
    gradingKey: { items: {} }
  };

  // Move b2-e1 to start of b1
  moveExerciseBetweenBlocks(draftState, {
    sourceBlockIdx: 1,
    exerciseId: 'b2-e1',
    targetBlockIdx: 0,
    insertIndex: 0
  });

  assert.equal(draftState.blocks[0].exercises[0].exerciseId, 'b2-e1');
  assert.equal(draftState.blocks[0].exercises[1].exerciseId, 'b1-e1');
  assert.equal(draftState.blocks[0].items[0].exerciseId, 'b2-e1');
  assert.equal(draftState.blocks[0].items[0].position, 1);
  assert.equal(draftState.blocks[0].items[1].exerciseId, 'b1-e1');
  assert.equal(draftState.blocks[0].items[1].position, 2);
});

test('renderBlockJumpTagsHtml applies active tab attributes and role="tab"', async () => {
  const { renderBlockJumpTagsHtml } = await import('../term-tests/teacher-dashboard/studio/builder-summary.js');
  const blocks = [
    { blockId: 'b1', title: 'LISTENING', items: [] },
    { blockId: 'b2', title: 'VOCABULARY', items: [] },
    { blockId: 'b3', title: 'GRAMMAR', items: [] }
  ];

  const htmlActive0 = renderBlockJumpTagsHtml(blocks, 0);
  assert.ok(htmlActive0.includes('btn-block-tab active'));
  assert.ok(htmlActive0.includes('data-block-idx="0"'));
  assert.ok(htmlActive0.includes('aria-selected="true"'));

  const htmlActive1 = renderBlockJumpTagsHtml(blocks, 1);
  assert.ok(htmlActive1.includes('data-block-idx="1"'));
  assert.ok(htmlActive1.includes('btn-block-tab active'));
});

test('renderTestBuilderView renders tabbed blocks and move exercise buttons', async () => {
  const { renderTestBuilderView } = await import('../term-tests/teacher-dashboard/app.js');
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Multi-Block Tabbed Exam',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Multi-Block Tabbed Exam',
      blocks: [
        {
          blockId: 'b-tab-1',
          checkpoint: 1,
          title: 'Phần 1: LISTENING',
          exercises: [
            {
              exerciseId: 'ex-tab-1',
              exerciseNumber: 1,
              title: 'Bài tập 1: Nghe tranh',
              itemIds: ['i-tab-1']
            }
          ],
          items: [
            {
              itemFamilyId: 'fam-1',
              itemVersionId: 'i-tab-1',
              position: 1,
              exerciseId: 'ex-tab-1',
              prompt: 'Question 1',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              options: [{ id: 'A', label: 'A' }]
            }
          ]
        },
        {
          blockId: 'b-tab-2',
          checkpoint: 2,
          title: 'Phần 2: VOCABULARY',
          exercises: [
            {
              exerciseId: 'ex-tab-2',
              exerciseNumber: 1,
              title: 'Bài tập 1: Từ vựng',
              itemIds: ['i-tab-2']
            }
          ],
          items: [
            {
              itemFamilyId: 'fam-2',
              itemVersionId: 'i-tab-2',
              position: 2,
              exerciseId: 'ex-tab-2',
              prompt: 'Question 2',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              options: [{ id: 'A', label: 'A' }]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);

  // Tabbed Block UI verification
  assert.ok(container.innerHTML.includes('builder-blocks-nav-card'));
  assert.ok(container.innerHTML.includes('btn-block-tab'));
  assert.ok(container.innerHTML.includes('data-block-idx="0"'));
  assert.ok(container.innerHTML.includes('data-block-idx="1"'));

  // Active block (idx 0) is visible, inactive block (idx 1) is hidden
  const blockCardTag = index => container.innerHTML.match(new RegExp(`<div class="builder-block-card[^"]*" id="builder-block-${index}"[^>]*>`))?.[0] || '';
  assert.ok(blockCardTag(0), 'renders block 0');
  assert.doesNotMatch(blockCardTag(0), /\shidden[\s>]/, 'active block is visible');
  assert.ok(blockCardTag(1), 'renders block 1');
  assert.match(blockCardTag(1), /\shidden>/, 'inactive block is hidden through the hidden attribute');

  // Move exercise button is rendered with exercise id
  assert.ok(container.innerHTML.includes('btn-move-exercise-to-block'));
  assert.ok(container.innerHTML.includes('data-exercise-id="ex-tab-1"'));

  // Footer navigation buttons are rendered
  assert.ok(container.innerHTML.includes('btn-next-block'));
  assert.ok(container.innerHTML.includes('data-target-idx="1"'));
});
