import test from 'node:test';
import assert from 'node:assert/strict';
import {
  insertItemsIntoBlockExercise,
  updatePromptPosition,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio: updatePromptPosition correctly updates various question prompt formats', () => {
  assert.equal(updatePromptPosition('Câu hỏi 51: Trọng âm chính ở đâu?', 25), 'Câu hỏi 25: Trọng âm chính ở đâu?');
  assert.equal(updatePromptPosition('Câu 51: Chọn đáp án đúng', 25), 'Câu 25: Chọn đáp án đúng');
  assert.equal(updatePromptPosition('Câu 51. Chọn đáp án đúng', 25), 'Câu 25. Chọn đáp án đúng');
  assert.equal(updatePromptPosition('Câu 51', 25), 'Câu 25');
  assert.equal(updatePromptPosition('Question 51: Fill in the blank', 25), 'Question 25: Fill in the blank');
  assert.equal(updatePromptPosition('Điền vào ô trống câu 51:', 25), 'Điền vào ô trống câu 25:');
  assert.equal(updatePromptPosition('Từ vựng câu 51', 25), 'Từ vựng câu 25');
  assert.equal(updatePromptPosition('Từ vựng qua ảnh 51', 25), 'Từ vựng qua ảnh 25');
  assert.equal(updatePromptPosition('The cruise departs from Miami and visits (51) __________ Caribbean islands.', 25), 'The cruise departs from Miami and visits (25) __________ Caribbean islands.');
});

test('Test Studio: insertItemsIntoBlockExercise inserts replacement item at the end of Exercise 1 without pushing to end of Block', () => {
  const ex1 = { exerciseId: 'ex-01', exerciseNumber: 1, title: 'Exercise 1' };
  const ex2 = { exerciseId: 'ex-02', exerciseNumber: 2, title: 'Exercise 2' };

  // Block starts with 25 items in Ex1, 25 items in Ex2 (50 items total)
  const items = [];
  for (let i = 1; i <= 25; i++) {
    items.push({ itemVersionId: `item-${i}`, exerciseId: 'ex-01', position: i, prompt: `Từ vựng câu ${i}` });
  }
  for (let i = 26; i <= 50; i++) {
    items.push({ itemVersionId: `item-${i}`, exerciseId: 'ex-02', position: i, prompt: `Từ vựng câu ${i}` });
  }

  const block = {
    exercises: [ex1, ex2],
    items
  };

  // Simulate user deleting item 3 (index 2) in Exercise 1
  block.items.splice(2, 1);
  assert.equal(block.items.length, 49);
  assert.equal(block.items.filter(it => it.exerciseId === 'ex-01').length, 24);
  assert.equal(block.items.filter(it => it.exerciseId === 'ex-02').length, 25);

  // User adds replacement item to Exercise 1
  const replacementItem = {
    itemVersionId: 'item-new',
    prompt: 'Từ vựng câu 50'
  };

  insertItemsIntoBlockExercise(block, ex1, replacementItem);

  // Total items should now be 50
  assert.equal(block.items.length, 50);

  // The replacement item must be at index 24 (the 25th item in block.items, right at the end of Ex1)
  assert.equal(block.items[24].itemVersionId, 'item-new');
  assert.equal(block.items[24].exerciseId, 'ex-01');

  // Items from index 25 onwards must all belong to Exercise 2
  for (let i = 25; i < 50; i++) {
    assert.equal(block.items[i].exerciseId, 'ex-02', `Item at index ${i} must belong to Exercise 2`);
  }
});

test('Test Studio: insertItemsIntoBlockExercise handles empty Exercise 1 when Exercise 2 already has items', () => {
  const ex1 = { exerciseId: 'ex-01', exerciseNumber: 1, title: 'Exercise 1' };
  const ex2 = { exerciseId: 'ex-02', exerciseNumber: 2, title: 'Exercise 2' };

  const block = {
    exercises: [ex1, ex2],
    items: [
      { itemVersionId: 'item-ex2-1', exerciseId: 'ex-02', position: 1 },
      { itemVersionId: 'item-ex2-2', exerciseId: 'ex-02', position: 2 }
    ]
  };

  const newItemEx1 = { itemVersionId: 'item-ex1-1' };
  insertItemsIntoBlockExercise(block, ex1, newItemEx1);

  // Item for Ex1 must be inserted at index 0 (before Ex2 items)
  assert.equal(block.items.length, 3);
  assert.equal(block.items[0].itemVersionId, 'item-ex1-1');
  assert.equal(block.items[0].exerciseId, 'ex-01');
  assert.equal(block.items[1].exerciseId, 'ex-02');
});

test('Test Studio: interactive button click on Exercise 1 inserts item into Exercise 1 and resequences properly', async () => {
  const ex1Id = '04010000-0000-4000-8000-0000000000e1';
  const ex2Id = '04010000-0000-4000-8000-0000000000e2';

  // 25 items for Ex1, 25 items for Ex2
  const items = [];
  const gradingKeyItems = {};

  for (let i = 1; i <= 25; i++) {
    const id = `04010000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    items.push({
      itemFamilyId: id,
      itemVersionId: id,
      position: i,
      exerciseId: ex1Id,
      exerciseTitle: 'Exercise 1',
      prompt: `Từ vựng câu ${i}`,
      interactionType: 'text_select_pair',
      pedagogicalTypeCode: 'vocabulary_pair',
      layoutType: 'default',
      graderType: 'accepted_text_exact_option',
      options: [{ id: 'opt_1', label: 'Nghĩa 1' }]
    });
    gradingKeyItems[id] = { graderType: 'accepted_text_exact_option', accepted: [`word${i}`], expectedOptionId: 'opt_1' };
  }

  for (let i = 26; i <= 50; i++) {
    const id = `04010000-0000-4000-8000-${String(i).padStart(12, '0')}`;
    items.push({
      itemFamilyId: id,
      itemVersionId: id,
      position: i,
      exerciseId: ex2Id,
      exerciseTitle: 'Exercise 2',
      prompt: `Từ vựng câu ${i}`,
      interactionType: 'text_select_pair',
      pedagogicalTypeCode: 'vocabulary_pair',
      layoutType: 'default',
      graderType: 'accepted_text_exact_option',
      options: [{ id: 'opt_1', label: 'Nghĩa 1' }]
    });
    gradingKeyItems[id] = { graderType: 'accepted_text_exact_option', accepted: [`word${i}`], expectedOptionId: 'opt_1' };
  }

  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    formVersionId: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: '50-Item Vocab Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: '50-Item Vocab Test',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Block 1',
          exercises: [
            { exerciseId: ex1Id, exerciseNumber: 1, title: 'Exercise 1', itemIds: items.slice(0, 25).map(it => it.itemVersionId) },
            { exerciseId: ex2Id, exerciseNumber: 2, title: 'Exercise 2', itemIds: items.slice(25, 50).map(it => it.itemVersionId) }
          ],
          items
        }
      ]
    },
    gradingKey: { items: gradingKeyItems }
  };

  let deleteBtn3Handler = null;
  let addScBtnEx1Handler = null;
  let savedPayload = null;
  let saveDraftHandler = null;

  const btnDelete3 = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '2'; // Item 3
      return null;
    },
    addEventListener: (evt, fn) => {
      if (evt === 'click') deleteBtn3Handler = fn;
    }
  };

  const btnAddScEx1 = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-exercise-idx') return '0';
      if (name === 'data-exercise-id') return ex1Id;
      return null;
    },
    addEventListener: (evt, fn) => {
      if (evt === 'click') addScBtnEx1Handler = fn;
    }
  };

  const btnSaveDraft = {
    id: 'btn-save-draft',
    disabled: false,
    innerHTML: '',
    addEventListener: (evt, fn) => {
      if (evt === 'click') saveDraftHandler = fn;
    }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-save-draft') return btnSaveDraft;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.btn-delete-item') return [btnDelete3];
      if (sel === '.btn-add-single-choice') return [btnAddScEx1];
      return [];
    }
  };

  renderTestBuilderView(container, mockForm, {
    onSaveDraft: async (payload) => {
      savedPayload = payload;
      return { ok: true, version: 1 };
    }
  });

  // Step 1: Teacher accidentally deletes question 3 in Exercise 1
  assert.ok(typeof deleteBtn3Handler === 'function', 'Delete button handler must be bound');
  deleteBtn3Handler();

  // Step 2: Teacher clicks "+ Trắc nghiệm" on Exercise 1 to re-add question 25
  assert.ok(typeof addScBtnEx1Handler === 'function', 'Add single choice button handler must be bound');
  addScBtnEx1Handler();

  // Step 3: Trigger draft save
  assert.ok(typeof saveDraftHandler === 'function', 'Save draft handler must be bound');
  await saveDraftHandler();

  assert.ok(savedPayload, 'Payload must be saved');
  const savedBlock = savedPayload.blocks[0];
  const savedItems = savedBlock.items;

  // Verify total count is restored to 50
  assert.equal(savedItems.length, 50, 'Total items must be 50');

  // Verify Exercise 1 has 25 items (positions 1..25)
  const ex1Items = savedItems.filter(it => it.exerciseId === ex1Id);
  assert.equal(ex1Items.length, 25, 'Exercise 1 must contain exactly 25 items');
  for (let i = 0; i < 25; i++) {
    assert.equal(ex1Items[i].position, i + 1, `Ex1 item ${i} must have position ${i + 1}`);
  }

  // The 25th item in Exercise 1 is the newly added single choice question
  const newQuestion = ex1Items[24];
  assert.equal(newQuestion.position, 25, 'New question must be at position 25, NOT position 51');
  assert.equal(newQuestion.prompt, 'Câu hỏi 25:', 'New question prompt must be resequenced to Câu hỏi 25:');

  // Verify Exercise 2 has 25 items (positions 26..50)
  const ex2Items = savedItems.filter(it => it.exerciseId === ex2Id);
  assert.equal(ex2Items.length, 25, 'Exercise 2 must contain exactly 25 items');
  for (let i = 0; i < 25; i++) {
    assert.equal(ex2Items[i].position, 26 + i, `Ex2 item ${i} must have position ${26 + i}`);
  }
  assert.equal(ex2Items[0].position, 26, 'First question of Exercise 2 must start at position 26');
});
