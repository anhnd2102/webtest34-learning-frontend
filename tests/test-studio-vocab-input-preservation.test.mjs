import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  reorderBlockItem
} from '../term-tests/teacher-dashboard/app.js';

test('Issue 30: Typing target word into .input-vocab-raw preserves value during drag, drop, and render without reverting to "answer"', async () => {
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

  const rawWordInputMock = {
    value: 'outgoing',
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '0';
      return null;
    }
  };

  const handle1Mock = {
    classList: { contains: (cls) => cls === 'item-drag-handle' },
    addEventListener: () => {}
  };

  const card1Mock = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '0';
      if (name === 'data-item-id') return 'v-item-1';
      if (name === 'data-exercise-id') return 'ex-1';
      return null;
    },
    setAttribute: () => {},
    querySelector: (sel) => {
      if (sel === '.input-vocab-raw') return rawWordInputMock;
      if (sel === '.item-drag-handle') return handle1Mock;
      if (sel === '.select-vocab-correct-dropdown') return { value: 'opt_1' };
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.template-vocab-pair .variant-chip') return []; // no chips generated yet!
      if (sel === '.vocab-meaning-input') return [];
      return [];
    },
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    getBoundingClientRect: () => ({ top: 100, height: 80 }),
    addEventListener: (evt, fn) => {
      if (evt === 'dragstart') card1Mock.dragstartListener = fn;
    }
  };

  const card2Mock = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '1';
      if (name === 'data-item-id') return 'v-item-2';
      if (name === 'data-exercise-id') return 'ex-1';
      return null;
    },
    setAttribute: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    getBoundingClientRect: () => ({ top: 200, height: 80 }),
    addEventListener: (evt, fn) => {
      if (evt === 'drop') card2Mock.dropListener = fn;
    }
  };

  const bCardMock = {
    getAttribute: (name) => {
      if (name === 'data-index') return '0';
      return null;
    },
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.builder-item-card') return [card1Mock, card2Mock];
      if (sel === '.builder-exercise-card') return [];
      return [];
    }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-save-draft') return btnSaveDraft;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.builder-block-card') return [bCardMock];
      if (sel === '.builder-item-card') return [card1Mock, card2Mock];
      if (sel === '.exercise-items-list') return [];
      return [];
    }
  };

  const mockForm = {
    id: 'form-vocab-preserve',
    formVersionId: 'form-vocab-preserve',
    version: 1,
    status: 'draft',
    title: 'Vocab Preserve Test',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: 'form-vocab-preserve',
      title: 'Vocab Preserve Test',
      blocks: [
        {
          blockId: 'b-1',
          checkpoint: 1,
          exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1' }],
          items: [
            {
              itemFamilyId: 'f-1',
              itemVersionId: 'v-item-1',
              position: 1,
              prompt: 'Từ vựng câu 1',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              exerciseId: 'ex-1',
              options: [
                { id: 'opt_1', label: 'hòa đồng, cởi mở' },
                { id: 'opt_2', label: 'nhút nhát' }
              ]
            },
            {
              itemFamilyId: 'f-2',
              itemVersionId: 'v-item-2',
              position: 2,
              prompt: 'Từ vựng câu 2',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              exerciseId: 'ex-1',
              options: [
                { id: 'opt_1', label: 'thông minh' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'v-item-1': {
          graderType: 'accepted_text_exact_option',
          accepted: ['answer'], // Legacy placeholder before teacher typed
          expectedOptionId: 'opt_1'
        },
        'v-item-2': {
          graderType: 'accepted_text_exact_option',
          accepted: ['smart'],
          expectedOptionId: 'opt_1'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm, {
    onSaveDraft: async (payload) => {
      savedPayload = payload;
      return { ok: true, version: 1 };
    }
  });

  // Verify renderItemCard does NOT render placeholder 'answer' when rendering initial HTML
  assert.ok(!container.innerHTML.includes('value="answer"'), 'HTML must NEVER render value="answer" in input fields');

  // Trigger dragstart on card 1 (which calls syncInputs)
  assert.ok(card1Mock.dragstartListener, 'dragstart listener must be registered');
  card1Mock.dragstartListener({
    target: handle1Mock,
    dataTransfer: { effectAllowed: '', dropEffect: '', setData: () => {} },
    preventDefault: () => {}
  });

  // Verify save draft captures 'outgoing', not 'answer'
  await saveClickListener();
  assert.ok(savedPayload);
  const key1 = savedPayload.gradingKey.items['v-item-1'];
  assert.ok(key1);
  assert.deepEqual(key1.accepted, ['outgoing'], 'accepted variants must contain user typed word "outgoing"');
  assert.ok(!key1.accepted.includes('answer'), 'accepted variants must NEVER contain "answer"');

  const item1 = savedPayload.blocks[0].items.find(it => it.itemVersionId === 'v-item-1');
  assert.ok(item1);
  assert.equal(item1.targetWord, 'outgoing', 'item.targetWord must be preserved as "outgoing"');
});

test('Issue 30: Reordering items preserves typed vocab word and re-renders it without placeholder "answer"', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: 'form-vocab-reorder',
    formVersionId: 'form-vocab-reorder',
    version: 1,
    status: 'draft',
    title: 'Vocab Reorder Preservation',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: 'form-vocab-reorder',
      title: 'Vocab Reorder Preservation',
      blocks: [
        {
          blockId: 'b-1',
          checkpoint: 1,
          exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1' }],
          items: [
            {
              itemFamilyId: 'f-1',
              itemVersionId: 'v-item-1',
              position: 1,
              prompt: 'outgoing',
              targetWord: 'outgoing',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              exerciseId: 'ex-1',
              options: [
                { id: 'opt_1', label: 'hòa đồng' }
              ]
            },
            {
              itemFamilyId: 'f-2',
              itemVersionId: 'v-item-2',
              position: 2,
              prompt: 'Từ vựng câu 2',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              exerciseId: 'ex-1',
              options: [
                { id: 'opt_1', label: 'thông minh' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'v-item-1': {
          graderType: 'accepted_text_exact_option',
          accepted: ['outgoing'],
          expectedOptionId: 'opt_1'
        },
        'v-item-2': {
          graderType: 'accepted_text_exact_option',
          accepted: ['answer'], // legacy placeholder on item 2
          expectedOptionId: 'opt_1'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Check initial HTML
  assert.ok(container.innerHTML.includes('value="outgoing"'), 'Must render value="outgoing"');
  assert.ok(!container.innerHTML.includes('value="answer"'), 'Must never render value="answer"');

  // Perform reorder: move item 0 (v-item-1) below item 1 (v-item-2)
  const draftState = {
    blocks: mockForm.publicDefinition.blocks,
    gradingKey: mockForm.gradingKey
  };
  reorderBlockItem(draftState, 0, 0, 0, 1, false, 'ex-1');

  // Verify item order in draftState
  assert.equal(draftState.blocks[0].items[0].itemVersionId, 'v-item-2');
  assert.equal(draftState.blocks[0].items[1].itemVersionId, 'v-item-1');
  assert.equal(draftState.blocks[0].items[1].targetWord, 'outgoing');

  // Re-render and verify HTML preserves outgoing and no answer placeholder
  renderTestBuilderView(container, {
    ...mockForm,
    publicDefinition: {
      ...mockForm.publicDefinition,
      blocks: draftState.blocks
    },
    gradingKey: draftState.gradingKey
  });

  assert.ok(container.innerHTML.includes('value="outgoing"'), 'Must still render value="outgoing" after reorder');
  assert.ok(!container.innerHTML.includes('value="answer"'), 'Must never render value="answer" after reorder');
});
