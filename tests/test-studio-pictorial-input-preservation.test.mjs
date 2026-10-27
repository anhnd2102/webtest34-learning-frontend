import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  reorderBlockItem
} from '../term-tests/teacher-dashboard/app.js';

test('Pictorial Vocab: Typing target word into .input-pictorial-target preserves value during drag, drop, and render without reverting to "answer"', async () => {
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

  const pictorialInputMock = {
    value: 'school kids',
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
      if (name === 'data-item-id') return 'pic-item-1';
      if (name === 'data-exercise-id') return 'ex-1';
      return null;
    },
    setAttribute: () => {},
    querySelector: (sel) => {
      if (sel === '.input-fitb-raw, .input-pictorial-target' || sel === '.input-pictorial-target' || sel === '.input-fitb-raw') return pictorialInputMock;
      if (sel === '.item-drag-handle') return handle1Mock;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.variant-chip') return []; // no chips generated yet!
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
      if (name === 'data-item-id') return 'pic-item-2';
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
    getAttribute: () => '0',
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.builder-item-card') return [card1Mock, card2Mock];
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
      return [];
    }
  };

  const mockForm = {
    id: 'form-pictorial-preserve',
    formVersionId: 'form-pictorial-preserve',
    version: 1,
    status: 'draft',
    title: 'Pictorial Preserve Test',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: 'form-pictorial-preserve',
      title: 'Pictorial Preserve Test',
      blocks: [
        {
          blockId: 'b-1',
          checkpoint: 1,
          exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1' }],
          items: [
            {
              itemFamilyId: 'f-1',
              itemVersionId: 'pic-item-1',
              position: 1,
              prompt: 'Từ vựng qua ảnh 1',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              exerciseId: 'ex-1'
            },
            {
              itemFamilyId: 'f-2',
              itemVersionId: 'pic-item-2',
              position: 2,
              prompt: 'Từ vựng qua ảnh 2',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              exerciseId: 'ex-1'
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'pic-item-1': {
          graderType: 'accepted_text',
          accepted: ['answer'] // Legacy placeholder before teacher typed
        },
        'pic-item-2': {
          graderType: 'accepted_text',
          accepted: ['teacher']
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

  // Verify save draft captures 'school kids', not 'answer'
  await saveClickListener();
  assert.ok(savedPayload);
  const key1 = savedPayload.gradingKey.items['pic-item-1'];
  assert.ok(key1);
  assert.deepEqual(key1.accepted, ['school kids'], 'accepted variants must contain user typed word "school kids"');
  assert.ok(!key1.accepted.includes('answer'), 'accepted variants must NEVER contain "answer"');

  const item1 = savedPayload.blocks[0].items.find(it => it.itemVersionId === 'pic-item-1');
  assert.ok(item1);
  assert.equal(item1.targetWord, 'school kids', 'item.targetWord must be preserved as "school kids"');
});

test('Pictorial Vocab: Reordering items preserves typed pictorial word and re-renders it without placeholder "answer"', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: 'form-pic-reorder',
    formVersionId: 'form-pic-reorder',
    version: 1,
    status: 'draft',
    title: 'Pictorial Reorder Preservation',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: 'form-pic-reorder',
      title: 'Pictorial Reorder Preservation',
      blocks: [
        {
          blockId: 'b-1',
          checkpoint: 1,
          exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1' }],
          items: [
            {
              itemFamilyId: 'f-1',
              itemVersionId: 'pic-item-1',
              position: 1,
              prompt: 'school kids',
              targetWord: 'school kids',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              exerciseId: 'ex-1'
            },
            {
              itemFamilyId: 'f-2',
              itemVersionId: 'pic-item-2',
              position: 2,
              prompt: 'Từ vựng qua ảnh 2',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              exerciseId: 'ex-1'
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'pic-item-1': {
          graderType: 'accepted_text',
          accepted: ['school kids']
        },
        'pic-item-2': {
          graderType: 'accepted_text',
          accepted: ['answer'] // legacy placeholder on item 2
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Check initial HTML
  assert.ok(container.innerHTML.includes('value="school kids"'), 'Must render value="school kids"');
  assert.ok(!container.innerHTML.includes('value="answer"'), 'Must never render value="answer"');

  // Perform reorder: move item 0 (pic-item-1) below item 1 (pic-item-2)
  const draftState = {
    blocks: mockForm.publicDefinition.blocks,
    gradingKey: mockForm.gradingKey
  };
  reorderBlockItem(draftState, 0, 0, 0, 1, false, 'ex-1');

  // Verify item order in draftState
  assert.equal(draftState.blocks[0].items[0].itemVersionId, 'pic-item-2');
  assert.equal(draftState.blocks[0].items[1].itemVersionId, 'pic-item-1');
  assert.equal(draftState.blocks[0].items[1].targetWord, 'school kids');

  // Re-render and verify HTML preserves school kids and no answer placeholder
  renderTestBuilderView(container, {
    ...mockForm,
    publicDefinition: {
      ...mockForm.publicDefinition,
      blocks: draftState.blocks
    },
    gradingKey: draftState.gradingKey
  });

  assert.ok(container.innerHTML.includes('value="school kids"'), 'Must still render value="school kids" after reorder');
  assert.ok(!container.innerHTML.includes('value="answer"'), 'Must never render value="answer" after reorder');
});
