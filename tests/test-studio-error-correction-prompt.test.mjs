import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio renders question prompt field for Error Correction items and displays sentence in simulation', () => {
  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#builder-test-title') return { value: 'Error Correction Test' };
      if (sel === '#builder-test-duration') return { value: '45' };
      return null;
    },
    querySelectorAll: (sel) => []
  };

  const mockForm = {
    id: '08010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Error Correction Spec Test',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '08010000-0000-4000-8000-000000000001',
      title: 'Error Correction Spec Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b-01',
          checkpoint: 1,
          title: 'Phần 1: Ngữ pháp',
          exercises: [
            {
              exerciseId: 'ex-01',
              exerciseNumber: 1,
              title: 'Tìm và sửa lỗi sai',
              itemIds: ['item-ec-01']
            }
          ],
          items: [
            {
              itemFamilyId: 'fam-ec-01',
              itemVersionId: 'item-ec-01',
              position: 1,
              exerciseId: 'ex-01',
              prompt: 'There are much people in the meeting room.',
              interactionType: 'correction_pair',
              pedagogicalTypeCode: 'error_correction',
              layoutType: 'default',
              graderType: 'correction_pair',
              maxScore: 1,
              scoringRule: 'split_points'
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'item-ec-01': {
          graderType: 'correction_pair',
          expectedErrors: ['much'],
          expectedCorrections: ['many'],
          scoringRule: 'split_points'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // 1. Assert prompt field is NOT hidden by hasRedundantPrompt
  assert.ok(
    container.innerHTML.includes('item-prompt-input'),
    'Error correction card must render .item-prompt-input textarea'
  );
  assert.ok(
    container.innerHTML.includes('Câu văn gốc chứa lỗi sai') || container.innerHTML.includes('Original Sentence with Error'),
    'Error correction prompt label must clearly indicate original sentence with error'
  );
  assert.ok(
    container.innerHTML.includes('There are much people in the meeting room.'),
    'Prompt textarea must contain the item prompt value'
  );

  // 2. Open preview / Candidate Simulation Modal to verify student view displays the prompt sentence
  const previewModal = globalThis.document?.body?.querySelector?.('#candidate-sim-modal');
  if (previewModal) {
    assert.ok(
      previewModal.innerHTML.includes('There are much people in the meeting room.'),
      'Candidate simulation must display the error correction sentence in the prompt'
    );
  }
});

test('Test Studio syncInputs updates item.prompt for Error Correction when prompt textarea is edited', () => {
  let promptChangeHandler = null;
  const mockPromptInput = {
    value: 'The children plays in the garden every afternoon.',
    getAttribute: (k) => {
      if (k === 'data-block-idx') return '0';
      if (k === 'data-item-idx') return '0';
      return null;
    },
    addEventListener: (ev, h) => {
      if (ev === 'change' || ev === 'input') promptChangeHandler = h;
    }
  };

  const mockItemCard = {
    querySelector: (sel) => {
      if (sel === '.item-prompt-input') return mockPromptInput;
      return null;
    },
    querySelectorAll: (sel) => []
  };

  const mockBlockCard = {
    querySelector: (sel) => null,
    querySelectorAll: (sel) => {
      if (sel === '.builder-item-card') return [mockItemCard];
      return [];
    }
  };

  let savedPayload = null;
  let saveClickListener = null;

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-save-draft') {
        return {
          addEventListener: (ev, h) => {
            if (ev === 'click') saveClickListener = h;
          }
        };
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.builder-block-card') return [mockBlockCard];
      if (sel === '.item-prompt-input') return [mockPromptInput];
      return [];
    }
  };

  const mockForm = {
    id: '08010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    publicDefinition: {
      blocks: [
        {
          blockId: 'b-01',
          items: [
            {
              itemFamilyId: 'fam-01',
              itemVersionId: 'item-01',
              position: 1,
              prompt: 'Initial sentence placeholder',
              interactionType: 'correction_pair',
              pedagogicalTypeCode: 'error_correction',
              layoutType: 'default',
              graderType: 'correction_pair'
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

  // Trigger prompt edit
  if (promptChangeHandler) promptChangeHandler();

  // Trigger save
  assert.ok(saveClickListener, 'save draft button listener registered');
  saveClickListener();

  // Assert saved payload reflects the edited sentence
  assert.ok(savedPayload, 'savedPayload must be captured');
  assert.equal(
    savedPayload.blocks[0].items[0].prompt,
    'The children plays in the garden every afternoon.',
    'item.prompt must update to the new value'
  );
});


