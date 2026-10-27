import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCorrectionScore,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('computeCorrectionScore awards full points when both error and correction match', () => {
  const gradingKey = {
    graderType: 'correction_pair',
    expectedErrors: ['she'],
    expectedCorrections: ['her'],
    scoringRule: 'split_points',
    maxScore: 1
  };

  const result = computeCorrectionScore({ error: 'She ', correction: ' HER' }, gradingKey);
  assert.equal(result.score, 1);
  assert.equal(result.isErrorCorrect, true);
  assert.equal(result.isCorrectionCorrect, true);
});

test('computeCorrectionScore handles split_points vs all_or_nothing scoring rules', () => {
  const splitKey = {
    graderType: 'correction_pair',
    expectedErrors: ['we'],
    expectedCorrections: ['us'],
    scoringRule: 'split_points',
    maxScore: 1
  };

  const partialAnswer = { error: 'we', correction: 'our' }; // Error correct, correction wrong
  const splitResult = computeCorrectionScore(partialAnswer, splitKey);
  assert.equal(splitResult.score, 0.5);
  assert.equal(splitResult.isErrorCorrect, true);
  assert.equal(splitResult.isCorrectionCorrect, false);

  const allOrNothingKey = {
    ...splitKey,
    scoringRule: 'all_or_nothing'
  };
  const aonResult = computeCorrectionScore(partialAnswer, allOrNothingKey);
  assert.equal(aonResult.score, 0);
  assert.equal(aonResult.isErrorCorrect, true);
  assert.equal(aonResult.isCorrectionCorrect, false);
});

test('computeCorrectionScore handles empty or invalid answers gracefully', () => {
  const key = {
    graderType: 'correction_pair',
    expectedErrors: ['them'],
    expectedCorrections: ['their'],
    scoringRule: 'split_points',
    maxScore: 1
  };

  assert.equal(computeCorrectionScore(null, key).score, 0);
  assert.equal(computeCorrectionScore({}, key).score, 0);
  assert.equal(computeCorrectionScore({ error: '', correction: '' }, key).score, 0);
});

test('renderTestBuilderView provides button to add error correction template and renders editor controls', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '11010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Error Correction Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '11010000-0000-4000-8000-000000000001',
      title: 'Error Correction Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1101',
          checkpoint: 1,
          title: 'Grammar · Tìm và sửa lỗi sai',
          instructions: 'Each sentence has one mistake. Find the mistake and correct it.',
          items: [
            {
              itemFamilyId: 'f1101',
              itemVersionId: 'i1101',
              position: 1,
              prompt: 'She sister is a good student.',
              helpText: '',
              interactionType: 'correction_pair',
              pedagogicalTypeCode: 'error_correction',
              layoutType: 'dual_input',
              graderType: 'correction_pair',
              maxScore: 1,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1101: {
          graderType: 'correction_pair',
          expectedErrors: ['she'],
          expectedCorrections: ['her'],
          scoringRule: 'split_points',
          maxScore: 1
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-error-correction'), 'Provides button to add error correction template');
  assert.ok(container.innerHTML.includes('template-error-correction'), 'Renders template-error-correction section');
  assert.ok(container.innerHTML.includes('input-error-token'), 'Renders identified error input field');
  assert.ok(container.innerHTML.includes('input-correction-token'), 'Renders corrected text input field');
  assert.ok(container.innerHTML.includes('select-scoring-rule'), 'Renders scoring rule selector');
  assert.ok(container.innerHTML.includes('btn-generate-error-variants'), 'Renders button to generate error variants');
  assert.ok(container.innerHTML.includes('btn-generate-correction-variants'), 'Renders button to generate correction variants');
  assert.ok(container.innerHTML.includes('dual-box error-box'), 'Renders error-box with distinctive visual cues');
  assert.ok(container.innerHTML.includes('dual-box correction-box'), 'Renders correction-box with distinctive visual cues');
});

test('computeCorrectionScore handles multiple expected variants and case insensitivity', () => {
  const key = {
    graderType: 'correction_pair',
    expectedErrors: ['she', 'She', 'sHe'],
    expectedCorrections: ['her', 'Her', 'herself'],
    scoringRule: 'split_points',
    maxScore: 2
  };

  const res1 = computeCorrectionScore({ error: 'SHE', correction: 'herself' }, key);
  assert.equal(res1.score, 2);
  assert.equal(res1.isErrorCorrect, true);
  assert.equal(res1.isCorrectionCorrect, true);

  const res2 = computeCorrectionScore({ error: 'they', correction: 'Her' }, key);
  assert.equal(res2.score, 1);
  assert.equal(res2.isErrorCorrect, false);
  assert.equal(res2.isCorrectionCorrect, true);
});

test('renderTestBuilderView wires preview button and simulation modal can render error correction dual-input layout', () => {
  const domContainer = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            domContainer._previewHandler = handler;
          }
        };
      }
      return null;
    },
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '11010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Simulation Test for Error Correction',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '11010000-0000-4000-8000-000000000002',
      title: 'Simulation Test for Error Correction',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1102',
          checkpoint: 1,
          title: 'Error Correction Section',
          instructions: 'Find and fix the error in each item.',
          items: [
            {
              itemFamilyId: 'f1102',
              itemVersionId: 'i1102',
              position: 1,
              prompt: 'They was very excited about the trip.',
              interactionType: 'correction_pair',
              pedagogicalTypeCode: 'error_correction',
              layoutType: 'default',
              graderType: 'correction_pair',
              maxScore: 1
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1102: {
          graderType: 'correction_pair',
          expectedErrors: ['was'],
          expectedCorrections: ['were'],
          scoringRule: 'split_points',
          maxScore: 1
        }
      }
    }
  };

  // Mock document.body and modal creation
  let createdModal = null;
  globalThis.document = {
    querySelector: (sel) => (sel === '#candidate-simulation-modal' ? createdModal : null),
    createElement: (tag) => {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        querySelector: () => null,
        querySelectorAll: () => []
      };
      return el;
    },
    body: {
      appendChild: (node) => {
        createdModal = node;
      }
    }
  };

  renderTestBuilderView(domContainer, mockForm);
  assert.ok(typeof domContainer._previewHandler === 'function', 'Preview button event handler was bound');

  // Trigger preview handler to open simulation modal
  domContainer._previewHandler();
  assert.ok(createdModal, 'Candidate simulation modal was created in DOM');
  assert.ok(createdModal.innerHTML.includes('candidate-error-correction-grid'), 'Simulation renders candidate-error-correction-grid');
  assert.ok(createdModal.innerHTML.includes('candidate-error-input'), 'Simulation renders candidate-error-input');
  assert.ok(createdModal.innerHTML.includes('candidate-correction-input'), 'Simulation renders candidate-correction-input');
  assert.ok(createdModal.innerHTML.includes('Tìm và sửa lỗi'), 'Simulation renders badge for error correction');
});

