import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreTransformationAnswer,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('scoreTransformationAnswer grades both blank-only input and full reconstructed sentence', () => {
  const gradingKey = {
    graderType: 'accepted_text',
    keyword: 'PREVENTED',
    framePrefix: 'His bad health',
    frameSuffix: 'from attending the meeting.',
    accepted: ['prevented him', 'prevented him from'],
    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true },
    maxScore: 1
  };

  // Case 1: Student filled only the blank
  const res1 = scoreTransformationAnswer('prevented him', gradingKey);
  assert.equal(res1.score, 1);
  assert.equal(res1.isCorrect, true);

  // Case 2: Case insensitivity and whitespace trimming
  const res2 = scoreTransformationAnswer('  PREVENTED HIM  ', gradingKey);
  assert.equal(res2.score, 1);
  assert.equal(res2.isCorrect, true);

  // Case 3: Student entered full sentence including prefix and suffix
  const res3 = scoreTransformationAnswer('His bad health prevented him from attending the meeting.', gradingKey);
  assert.equal(res3.score, 1);
  assert.equal(res3.isCorrect, true);

  // Case 4: Incorrect answer
  const res4 = scoreTransformationAnswer('stopped him', gradingKey);
  assert.equal(res4.score, 0);
  assert.equal(res4.isCorrect, false);

  // Case 5: Empty answer
  const res5 = scoreTransformationAnswer('', gradingKey);
  assert.equal(res5.score, 0);
  assert.equal(res5.isCorrect, false);
});

test('renderTestBuilderView provides button to add sentence transformation template and renders editor controls', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '13010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Sentence Transformation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '13010000-0000-4000-8000-000000000001',
      title: 'Sentence Transformation Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1301',
          checkpoint: 1,
          title: 'Grammar · Sentence Transformation',
          instructions: 'Complete the second sentence so that it has a similar meaning to the first sentence, using the word given. Do not change the word given.',
          items: [
            {
              itemFamilyId: 'f1301',
              itemVersionId: 'i1301',
              position: 1,
              prompt: 'He could not go to the conference because he was severely ill.',
              helpText: '',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'sentence_rewrite',
              layoutType: 'keyword_transformation',
              graderType: 'accepted_text',
              maxScore: 1,
              keyword: 'PREVENTED',
              framePrefix: 'His severe illness',
              frameSuffix: 'from going to the conference.',
              targetAnswer: 'prevented him'
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1301: {
          graderType: 'accepted_text',
          keyword: 'PREVENTED',
          framePrefix: 'His severe illness',
          frameSuffix: 'from going to the conference.',
          accepted: ['prevented him'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(!container.innerHTML.includes('btn-add-sentence-transformation'), 'Creation button for sentence transformation is deprecated and removed from toolbar');
  assert.ok(container.innerHTML.includes('template-sentence-transformation'), 'Renders template-sentence-transformation section for legacy items');
  assert.ok(container.innerHTML.includes('input-transformation-keyword'), 'Renders mandatory keyword input field');
  assert.ok(container.innerHTML.includes('input-frame-prefix'), 'Renders frame prefix input');
  assert.ok(container.innerHTML.includes('input-frame-suffix'), 'Renders frame suffix input');
  assert.ok(container.innerHTML.includes('input-transformation-answer'), 'Renders target blank answer input');
  assert.ok(container.innerHTML.includes('transformation-frame-preview'), 'Renders framed inline live preview');
  assert.ok(container.innerHTML.includes('btn-generate-transformation-variants'), 'Renders button to generate transformation variants');
});

test('Candidate Simulation Modal renders framed inline blank, original sentence, and mandatory keyword badge', () => {
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
    id: '13010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Simulation Test for Transformation',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '13010000-0000-4000-8000-000000000002',
      title: 'Simulation Test for Transformation',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1302',
          checkpoint: 1,
          title: 'Section 1',
          items: [
            {
              itemFamilyId: 'f1302',
              itemVersionId: 'i1302',
              position: 1,
              prompt: 'It was too cold for us to go swimming.',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'sentence_rewrite',
              layoutType: 'keyword_transformation',
              graderType: 'accepted_text',
              maxScore: 1,
              keyword: 'WARM',
              framePrefix: 'It was not',
              frameSuffix: 'for us to go swimming.',
              targetAnswer: 'warm enough'
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1302: {
          graderType: 'accepted_text',
          keyword: 'WARM',
          framePrefix: 'It was not',
          frameSuffix: 'for us to go swimming.',
          accepted: ['warm enough'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  let createdModal = null;
  globalThis.document = {
    querySelector: (sel) => (sel === '#candidate-simulation-modal' ? createdModal : null),
    createElement: (tag) => ({
      tagName: tag,
      id: '',
      className: '',
      innerHTML: '',
      style: {},
      querySelector: () => null,
      querySelectorAll: () => []
    }),
    body: {
      appendChild: (node) => {
        createdModal = node;
      }
    }
  };

  renderTestBuilderView(domContainer, mockForm);
  domContainer._previewHandler();

  assert.ok(createdModal, 'Candidate simulation modal created');
  assert.ok(createdModal.innerHTML.includes('candidate-transformation-wrap'), 'Renders candidate-transformation-wrap');
  assert.ok(createdModal.innerHTML.includes('keyword-badge-pill'), 'Renders uppercase keyword badge pill');
  assert.ok(createdModal.innerHTML.includes('WARM'), 'Displays the keyword in caps');
  assert.ok(createdModal.innerHTML.includes('candidate-transformation-input'), 'Renders framed inline input');
  assert.ok(createdModal.innerHTML.includes('frame-prefix-text'), 'Renders frame prefix text in simulation');
  assert.ok(createdModal.innerHTML.includes('frame-suffix-text'), 'Renders frame suffix text in simulation');
  assert.ok(createdModal.innerHTML.includes('Biến đổi câu'), 'Renders question type badge for sentence transformation');
});
