import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Test Studio: onSaveDraft sanitizes empty, whitespace, and missing prompts to fallback', async () => {
  let savedPayload = null;
  let saveClickListener = null;

  const saveBtnMock = {
    id: 'btn-save-draft',
    disabled: false,
    innerHTML: '',
    addEventListener: (evt, fn) => {
      if (evt === 'click') saveClickListener = fn;
    }
  };

  const statusMsgMock = {
    className: '',
    innerHTML: ''
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-save-draft') return saveBtnMock;
      if (sel === '#builder-status-msg') return statusMsgMock;
      return null;
    },
    querySelectorAll: (sel) => {
      return [];
    }
  };

  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    formVersionId: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Test Form with Empty Prompts',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Test Form with Empty Prompts',
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
              prompt: '', // Empty string prompt
              interactionType: 'text_input',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              maxScore: 1
            },
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f2',
              itemVersionId: '04010000-0000-4000-8000-0000000000i2',
              position: 2,
              prompt: '   ', // Whitespace-only prompt
              interactionType: 'text_input',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              maxScore: 1
            },
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f3',
              itemVersionId: '04010000-0000-4000-8000-0000000000i3',
              position: 3,
              prompt: 'Valid prompt text',
              interactionType: 'text_input',
              pedagogicalTypeCode: 'short_answer',
              layoutType: 'default',
              maxScore: 1
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '04010000-0000-4000-8000-0000000000i1': { graderType: 'accepted_text', accepted: ['hello'] },
        '04010000-0000-4000-8000-0000000000i2': { graderType: 'accepted_text', accepted: ['world'] },
        '04010000-0000-4000-8000-0000000000i3': { graderType: 'accepted_text', accepted: ['test'] }
      }
    }
  };

  renderTestBuilderView(container, mockForm, {
    onSaveDraft: async (payload) => {
      savedPayload = payload;
      return { ok: true, version: 1 };
    }
  });

  assert.ok(typeof saveClickListener === 'function', 'Save draft click listener was registered');

  // Trigger draft save
  await saveClickListener();

  assert.ok(savedPayload, 'onSaveDraft was called with payload');
  const items = savedPayload.blocks[0].items;
  assert.equal(items.length, 3, 'All 3 items are present');

  // Item 1 had empty string prompt -> sanitized to 'Câu 1'
  assert.equal(items[0].prompt, 'Câu 1', 'Empty string prompt should be sanitized to Câu 1');

  // Item 2 had whitespace-only prompt -> sanitized to 'Câu 2'
  assert.equal(items[1].prompt, 'Câu 2', 'Whitespace prompt should be sanitized to Câu 2');

  // Item 3 had valid prompt -> preserved
  assert.equal(items[2].prompt, 'Valid prompt text', 'Valid prompt text should be preserved');
});

test('Test Studio: syncInputs falls back to Câu {position} when prompt input has whitespace or is empty', async () => {
  let savedPayload = null;
  let saveClickListener = null;

  const promptInput1 = { value: '   ' }; // User left input as spaces
  const promptInput2 = { value: 'Meaningful question text' };

  const itemCard1 = {
    querySelector: (sel) => {
      if (sel === '.item-prompt-input') return promptInput1;
      return null;
    }
  };
  const itemCard2 = {
    querySelector: (sel) => {
      if (sel === '.item-prompt-input') return promptInput2;
      return null;
    }
  };

  const blockCard = {
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.builder-item-card') return [itemCard1, itemCard2];
      return [];
    }
  };

  const saveBtnMock = {
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
      if (sel === '#btn-save-draft') return saveBtnMock;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.builder-block-card') return [blockCard];
      return [];
    }
  };

  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    formVersionId: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Test Form',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Test Form',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Block 1',
          items: [
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f1',
              itemVersionId: '04010000-0000-4000-8000-0000000000i1',
              position: 5,
              prompt: 'Prior prompt',
              interactionType: 'text_input',
              maxScore: 1
            },
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f2',
              itemVersionId: '04010000-0000-4000-8000-0000000000i2',
              position: 6,
              prompt: 'Prior prompt 2',
              interactionType: 'text_input',
              maxScore: 1
            }
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

  await saveClickListener();

  assert.ok(savedPayload);
  const items = savedPayload.blocks[0].items;
  assert.equal(items[0].prompt, 'Câu 5', 'Whitespace prompt in DOM input must fall back to Câu 5');
  assert.equal(items[1].prompt, 'Meaningful question text', 'Non-empty prompt must be updated from DOM input');
});

