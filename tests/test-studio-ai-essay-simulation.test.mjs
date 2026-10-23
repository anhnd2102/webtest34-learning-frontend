import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Issue 56: Candidate Simulation captures AI-graded essay responses and computes simulation score', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            if (evt === 'click') handler();
          }
        };
      }
      return null;
    }
  };

  const listeners = {};
  let toggledClass = null;
  let toggledState = null;
  const mockNavBtn = {
    getAttribute: (attr) => (attr === 'data-item-id' ? 'item_essay_1' : null),
    hasAttribute: (attr) => attr === 'data-item-id',
    classList: {
      add: () => {},
      remove: () => {},
      toggle: (cls, state) => {
        toggledClass = cls;
        toggledState = state;
      }
    },
    addEventListener: () => {}
  };

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    querySelector: (sel) => {
      if (sel === '#btn-submit-simulation') {
        return {
          addEventListener: (evt, handler) => {
            listeners['submit'] = handler;
          }
        };
      }
      if (sel === '#simulation-results-modal') {
        return { style: {} };
      }
      if (sel === '#sim-results-body') {
        return {
          set innerHTML(val) {
            mockModal._resultsHtml = val;
          },
          get innerHTML() {
            return mockModal._resultsHtml || '';
          }
        };
      }
      if (typeof sel === 'string' && sel.includes('.candidate-open-textarea[data-item-id="item_essay_1"]')) {
        return mockModal._textarea;
      }
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.btn-qnav') {
        return [mockNavBtn];
      }
      if (sel === '.btn-qnav.answered') {
        return toggledState ? [mockNavBtn] : [];
      }
      if (sel === '.candidate-open-textarea') {
        return mockModal._textarea ? [mockModal._textarea] : [];
      }
      return [];
    },
    addEventListener: (evt, handler) => {
      listeners[evt] = handler;
    }
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000056',
    version: 1,
    status: 'draft',
    title: 'AI Essay Simulation Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000056',
      title: 'AI Essay Simulation Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Writing Section',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1: Essay Writing',
              instructions: 'Write an essay of at least 150 words.',
              itemIds: ['item_essay_1']
            }
          ],
          items: [
            {
              itemFamilyId: 'f_essay_1',
              itemVersionId: 'item_essay_1',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'Discuss the advantages and disadvantages of online learning.',
              interactionType: 'short_text',
              graderType: 'rubric_async',
              maxScore: 4
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_essay_1: {
          graderType: 'rubric_async',
          maxScore: 4,
          rubric: {
            scoringVersion: 'rubric-translation-v1',
            maxScore: 4,
            criteria: [
              { id: 'meaning', label: 'Ý nghĩa', maxScore: 2 },
              { id: 'grammar', label: 'Ngữ pháp', maxScore: 2 }
            ]
          }
        }
      }
    }
  };

  const originalQuerySelector = globalThis.document?.querySelector;
  const originalCreateElement = globalThis.document?.createElement;
  const originalBodyAppend = globalThis.document?.body?.appendChild;

  if (!globalThis.document) globalThis.document = {};
  if (!globalThis.document.body) globalThis.document.body = {};

  globalThis.document.querySelector = (sel) => {
    if (sel === '#candidate-simulation-modal') return mockModal;
    return null;
  };
  globalThis.document.createElement = () => mockModal;
  globalThis.document.body.appendChild = (el) => el;

  try {
    renderTestBuilderView(container, mockForm);

    // Verify modal HTML contains data-item-id for candidate open textarea
    assert.match(
      mockModal.innerHTML,
      /class="[^"]*candidate-open-textarea[^"]*"\s+data-item-id="item_essay_1"/,
      'Candidate simulation textarea must have data-item-id="item_essay_1"'
    );

    // Simulate candidate typing an essay
    const candidateEssayText = 'Online learning provides immense flexibility for self-paced students.';
    mockModal._textarea = {
      value: candidateEssayText,
      getAttribute: (attr) => (attr === 'data-item-id' ? 'item_essay_1' : null),
      closest: () => ({ querySelector: () => ({ textContent: '' }) }),
      addEventListener: () => {}
    };

    // Test updateAnsweredState on input event
    assert.equal(typeof listeners['input'], 'function', 'Input listener must be registered on modal');
    listeners['input']();
    assert.equal(toggledClass, 'answered', 'Toggle class must be answered');
    assert.equal(toggledState, true, 'Question must be marked answered when essay has text');

    // If textarea is cleared, question state becomes unanswered
    mockModal._textarea.value = '';
    listeners['input']();
    assert.equal(toggledState, false, 'Question must be marked unanswered when textarea is empty');

    // Reset textarea value for submission test
    mockModal._textarea.value = candidateEssayText;

    // Trigger simulation submit
    assert.equal(typeof listeners['submit'], 'function', 'Submit listener must be registered');
    listeners['submit']();

    // Verify results HTML displays candidate answer and does NOT display (Chưa trả lời)
    assert.ok(mockModal._resultsHtml, 'Results HTML should be rendered');
    assert.match(
      mockModal._resultsHtml,
      new RegExp(candidateEssayText),
      'Simulation results table must display the candidate essay answer'
    );
    assert.doesNotMatch(
      mockModal._resultsHtml,
      /\(Chưa trả lời\)/,
      'Simulation results table must not report (Chưa trả lời) when essay is answered'
    );
    assert.match(
      mockModal._resultsHtml,
      /4\/4/,
      'Provisional simulation score for answered essay should award full marks'
    );
  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});
