import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  reorderBlockItem,
  moveItemToExercise
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio Drag-and-Drop: Item cards render draggable attribute, drag handle, and move buttons', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    formVersionId: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Drag Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Drag Test',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Block 1',
          items: [
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f1',
              itemVersionId: '04010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Question 1',
              interactionType: 'single_choice',
              options: [{ id: 'A', label: 'Opt A' }]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);

  const html = container.innerHTML;
  assert.ok(html.includes('draggable="false"'), 'Item cards must have draggable="false" attribute by default');
  assert.ok(html.includes('item-drag-handle'), 'Item cards must have .item-drag-handle element');
  assert.ok(html.includes('⋮⋮'), 'Drag handle must display ⋮⋮ icon');
  assert.ok(html.includes('btn-move-item-up'), 'Move Up button (↑) must remain present');
  assert.ok(html.includes('btn-move-item-down'), 'Move Down button (↓) must remain present');
});

test('Test Studio Drag-and-Drop: Intra-exercise reorder moves item position correctly', () => {
  const draftState = {
    blocks: [
      {
        blockId: 'b1',
        items: [
          { itemVersionId: 'i1', position: 1, prompt: 'Câu 1: A', exerciseId: 'ex1' },
          { itemVersionId: 'i2', position: 2, prompt: 'Câu 2: B', exerciseId: 'ex1' },
          { itemVersionId: 'i3', position: 3, prompt: 'Câu 3: C', exerciseId: 'ex1' }
        ],
        exercises: [{ exerciseId: 'ex1', title: 'Exercise 1' }]
      }
    ]
  };

  // Drag item 1 (index 0) and drop below item 2 (index 1, positionAbove = false)
  const moved = reorderBlockItem(draftState, 0, 0, 0, 1, false, 'ex1');
  assert.ok(moved);
  assert.equal(moved.itemVersionId, 'i1');

  // Verify new order is i2, i1, i3
  const items = draftState.blocks[0].items;
  assert.equal(items[0].itemVersionId, 'i2');
  assert.equal(items[1].itemVersionId, 'i1');
  assert.equal(items[2].itemVersionId, 'i3');

  // Drag item 3 (index 2) and drop above item 2 (index 0, positionAbove = true)
  reorderBlockItem(draftState, 0, 2, 0, 0, true, 'ex1');
  // New order: i3, i2, i1
  assert.equal(items[0].itemVersionId, 'i3');
  assert.equal(items[1].itemVersionId, 'i2');
  assert.equal(items[2].itemVersionId, 'i1');
});

test('Test Studio Drag-and-Drop: Inter-exercise transfer reassigns exerciseId and updates exercise title', () => {
  const ex1 = { exerciseId: 'ex-1', title: 'Exercise 1' };
  const ex2 = { exerciseId: 'ex-2', title: 'Exercise 2' };

  const items = [];
  for (let i = 1; i <= 25; i++) {
    items.push({ itemVersionId: `item-${i}`, position: i, prompt: `Câu ${i}`, exerciseId: 'ex-1', exerciseTitle: 'Exercise 1' });
  }
  for (let i = 26; i <= 50; i++) {
    items.push({ itemVersionId: `item-${i}`, position: i, prompt: `Câu ${i}`, exerciseId: 'ex-2', exerciseTitle: 'Exercise 2' });
  }

  const draftState = {
    blocks: [
      {
        blockId: 'b1',
        items,
        exercises: [ex1, ex2]
      }
    ]
  };

  // Drag item 10 (index 9) from Exercise 1 and drop above item 30 (index 29) in Exercise 2
  const moved = reorderBlockItem(draftState, 0, 9, 0, 29, true, 'ex-2');
  assert.ok(moved);
  assert.equal(moved.itemVersionId, 'item-10');
  assert.equal(moved.exerciseId, 'ex-2', 'Transferred item must receive target exerciseId');
  assert.equal(moved.exerciseTitle, 'Exercise 2', 'Transferred item must receive target exerciseTitle');

  const blockItems = draftState.blocks[0].items;
  assert.equal(blockItems.length, 50, 'Total items remain 50');

  // Count items per exercise
  const ex1Items = blockItems.filter(it => it.exerciseId === 'ex-1');
  const ex2Items = blockItems.filter(it => it.exerciseId === 'ex-2');

  assert.equal(ex1Items.length, 24, 'Exercise 1 now has 24 items');
  assert.equal(ex2Items.length, 26, 'Exercise 2 now has 26 items');
});

test('Test Studio Drag-and-Drop: moveItemToExercise drops item into empty exercise container', () => {
  const ex1 = { exerciseId: 'ex-1', title: 'Exercise 1' };
  const ex2 = { exerciseId: 'ex-2', title: 'Exercise 2' };

  const draftState = {
    blocks: [
      {
        blockId: 'b1',
        items: [
          { itemVersionId: 'item-1', position: 1, prompt: 'Câu 1', exerciseId: 'ex-1', exerciseTitle: 'Exercise 1' },
          { itemVersionId: 'item-2', position: 2, prompt: 'Câu 2', exerciseId: 'ex-1', exerciseTitle: 'Exercise 1' }
        ],
        exercises: [ex1, ex2]
      }
    ]
  };

  // Move item-2 to empty Exercise 2
  const moved = moveItemToExercise(draftState, 0, 1, 0, 'ex-2');
  assert.ok(moved);
  assert.equal(moved.itemVersionId, 'item-2');
  assert.equal(moved.exerciseId, 'ex-2');
  assert.equal(moved.exerciseTitle, 'Exercise 2');

  const blockItems = draftState.blocks[0].items;
  assert.equal(blockItems.length, 2);
  assert.equal(blockItems[0].exerciseId, 'ex-1');
  assert.equal(blockItems[1].exerciseId, 'ex-2');
});

test('Test Studio Drag-and-Drop: DOM event simulation executes dragstart, drop-indicator classes and drop reorder', async () => {
  const listeners1 = {};
  const listeners2 = {};
  const classes1 = new Set();
  const classes2 = new Set();

  const handleListeners1 = {};
  const handle1Mock = {
    classList: {
      contains: (cls) => cls === 'item-drag-handle'
    },
    addEventListener: (evt, fn) => {
      handleListeners1[evt] = fn;
    }
  };

  const card1Mock = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '0';
      if (name === 'data-item-id') return 'item-1';
      if (name === 'data-exercise-id') return 'ex-1';
      return null;
    },
    setAttribute: () => {},
    querySelector: (sel) => {
      if (sel === '.item-drag-handle') return handle1Mock;
      return null;
    },
    classList: {
      add: (cls) => classes1.add(cls),
      remove: (cls) => classes1.delete(cls),
      contains: (cls) => classes1.has(cls)
    },
    getBoundingClientRect: () => ({ top: 100, height: 80 }),
    addEventListener: (evt, fn) => {
      listeners1[evt] = fn;
    }
  };

  const card2Mock = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '1';
      if (name === 'data-item-id') return 'item-2';
      if (name === 'data-exercise-id') return 'ex-1';
      return null;
    },
    setAttribute: () => {},
    querySelector: () => null,
    classList: {
      add: (cls) => classes2.add(cls),
      remove: (cls) => classes2.delete(cls),
      contains: (cls) => classes2.has(cls)
    },
    getBoundingClientRect: () => ({ top: 200, height: 80 }),
    addEventListener: (evt, fn) => {
      listeners2[evt] = fn;
    }
  };

  let savedPayload = null;
  let saveClickListener = null;

  const btnSaveDraft = {
    id: 'btn-save-draft',
    disabled: false,
    innerHTML: '',
    addEventListener: (evt, fn) => {
      if (evt === 'click') saveClickListener = fn;
    }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-save-draft') return btnSaveDraft;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.builder-item-card') return [card1Mock, card2Mock];
      if (sel === '.exercise-items-list') return [];
      return [];
    }
  };

  const mockForm = {
    id: 'form-1',
    formVersionId: 'form-1',
    version: 1,
    status: 'draft',
    title: 'Drag DOM Test',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: 'form-1',
      title: 'Drag DOM Test',
      blocks: [
        {
          blockId: 'b-1',
          checkpoint: 1,
          exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1' }],
          items: [
            { itemVersionId: 'item-1', position: 1, prompt: 'Câu 1', exerciseId: 'ex-1', interactionType: 'short_text' },
            { itemVersionId: 'item-2', position: 2, prompt: 'Câu 2', exerciseId: 'ex-1', interactionType: 'short_text' }
          ]
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm, {
    onSaveDraft: async (payload) => {
      savedPayload = payload;
      return { ok: true, version: 1 };
    }
  });

  // Step 1: User mousedowns on handle, then starts dragging Card 1
  assert.ok(typeof listeners1.dragstart === 'function', 'dragstart listener must be registered on card1');
  assert.ok(typeof handleListeners1.mousedown === 'function', 'mousedown listener must be registered on handle1');
  handleListeners1.mousedown();
  const mockDataTransfer = {
    effectAllowed: '',
    dropEffect: '',
    setData: () => {}
  };
  listeners1.dragstart({ target: handle1Mock, dataTransfer: mockDataTransfer, preventDefault: () => {} });
  assert.ok(classes1.has('dragging'), 'Card 1 must have .dragging class on dragstart');

  // Step 2: User drags over bottom half of Card 2 (clientY = 260, top = 200, height = 80 => relative Y = 60 > 40)
  assert.ok(typeof listeners2.dragover === 'function', 'dragover listener must be registered on card2');
  listeners2.dragover({ clientY: 260, dataTransfer: mockDataTransfer, preventDefault: () => {} });
  assert.ok(classes2.has('drop-target-below'), 'Card 2 must show drop-target-below class when hovering lower half');

  // Step 3: User drops onto Card 2
  assert.ok(typeof listeners2.drop === 'function', 'drop listener must be registered on card2');
  listeners2.drop({ clientY: 260, preventDefault: () => {}, stopPropagation: () => {} });

  // Step 4: Save draft and verify reordered payload
  await saveClickListener();
  assert.ok(savedPayload);
  const items = savedPayload.blocks[0].items;
  assert.equal(items.length, 2);
  assert.equal(items[0].itemVersionId, 'item-2', 'Item 2 should now be first');
  assert.equal(items[0].position, 1);
  assert.equal(items[1].itemVersionId, 'item-1', 'Item 1 should now be second');
  assert.equal(items[1].position, 2);
});

