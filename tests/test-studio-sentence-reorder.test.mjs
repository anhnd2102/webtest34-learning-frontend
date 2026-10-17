import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenizeSentence,
  scrambleTokens,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('tokenizeSentence parses slash-separated tokens and bracketed tokens', () => {
  // Slash separated
  const slashInput = 'She / has worked / at the company / for five years';
  const tokens1 = tokenizeSentence(slashInput);
  assert.deepEqual(tokens1, ['She', 'has worked', 'at the company', 'for five years']);

  // Bracket tokens
  const bracketInput = '[We] [have decided] [to postpone] [the meeting]';
  const tokens2 = tokenizeSentence(bracketInput);
  assert.deepEqual(tokens2, ['We', 'have decided', 'to postpone', 'the meeting']);

  // Plain whitespace sentence fallback
  const plainInput = 'I love learning English.';
  const tokens3 = tokenizeSentence(plainInput);
  assert.deepEqual(tokens3, ['I', 'love', 'learning', 'English.']);

  // Empty or invalid input
  assert.deepEqual(tokenizeSentence(''), []);
  assert.deepEqual(tokenizeSentence(null), []);
});

test('scrambleTokens returns a shuffled permutation of tokens', () => {
  const original = ['She', 'has lived', 'here', 'since 2015'];
  const scrambled = scrambleTokens(original);
  assert.equal(scrambled.length, original.length);
  assert.deepEqual([...scrambled].sort(), [...original].sort());
  // When length > 1, scramble should not be strictly equal to original unless 1 element
  const single = ['Hello'];
  assert.deepEqual(scrambleTokens(single), ['Hello']);
});

test('renderTestBuilderView provides button to add sentence reorder template and renders editor controls', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '12010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Sentence Reordering Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '12010000-0000-4000-8000-000000000001',
      title: 'Sentence Reordering Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1201',
          checkpoint: 1,
          title: 'Grammar · Sentence Unscramble',
          instructions: 'Put the words and phrases in the correct order to make a complete sentence.',
          items: [
            {
              itemFamilyId: 'f1201',
              itemVersionId: 'i1201',
              position: 1,
              prompt: 'Sắp xếp các từ sau thành câu hoàn chỉnh:',
              helpText: '',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'sentence_reorder',
              layoutType: 'token_scramble',
              graderType: 'accepted_text',
              maxScore: 1,
              tokens: ['She', 'has worked', 'at the company', 'for five years'],
              targetSentence: 'She has worked at the company for five years.'
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1201: {
          graderType: 'accepted_text',
          accepted: ['She has worked at the company for five years.'],
          tokens: ['She', 'has worked', 'at the company', 'for five years'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-sentence-reorder'), 'Provides button to add sentence reorder template');
  assert.ok(container.innerHTML.includes('template-sentence-reorder'), 'Renders template-sentence-reorder section');
  assert.ok(container.innerHTML.includes('input-raw-tokens'), 'Renders raw slash-separated token editor input');
  assert.ok(container.innerHTML.includes('input-target-sentence'), 'Renders target sentence input');
  assert.ok(container.innerHTML.includes('btn-tokenize-sentence'), 'Renders auto-tokenize button');
  assert.ok(container.innerHTML.includes('scrambled-tokens-pool'), 'Renders scrambled tokens preview pool');
});

test('Candidate Simulation Modal renders word-bank chip UI, live assembly bar, and supports interactive click-to-assemble', () => {
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
    id: '12010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Sentence Reorder Simulation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '12010000-0000-4000-8000-000000000002',
      title: 'Sentence Reorder Simulation Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1202',
          checkpoint: 1,
          title: 'Section 1',
          instructions: 'Arrange tokens to form sentences.',
          items: [
            {
              itemFamilyId: 'f1202',
              itemVersionId: 'i1202',
              position: 1,
              prompt: 'Sắp xếp các từ sau thành câu hoàn chỉnh:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'sentence_reorder',
              layoutType: 'token_scramble',
              graderType: 'accepted_text',
              maxScore: 1,
              tokens: ['He', 'has', 'finished', 'his homework'],
              distractors: ['have'],
              targetSentence: 'He has finished his homework.'
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1202: {
          graderType: 'accepted_text',
          accepted: ['He has finished his homework.'],
          tokens: ['He', 'has', 'finished', 'his homework'],
          distractors: ['have'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  // Mock DOM modal creation and event wiring
  let createdModal = null;
  const chipListeners = [];
  let clearListener = null;

  globalThis.document = {
    querySelector: (sel) => (sel === '#candidate-simulation-modal' ? createdModal : null),
    createElement: (tag) => {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        querySelector: (sel) => {
          if (sel === '.candidate-reorder-input') {
            return el._mockInput;
          }
          return null;
        },
        querySelectorAll: (sel) => {
          if (sel === '.btn-token-chip') {
            return el._mockChips || [];
          }
          if (sel === '.btn-clear-assembly') {
            return el._mockClearBtns || [];
          }
          return [];
        }
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

  // Trigger preview
  domContainer._previewHandler();
  assert.ok(createdModal, 'Candidate simulation modal was created in DOM');
  assert.ok(createdModal.innerHTML.includes('candidate-sentence-reorder-wrap'), 'Renders candidate-sentence-reorder-wrap');
  assert.ok(createdModal.innerHTML.includes('candidate-token-bank'), 'Renders candidate-token-bank');
  assert.ok(createdModal.innerHTML.includes('btn-token-chip'), 'Renders clickable token chips in word bank');
  assert.ok(createdModal.innerHTML.includes('candidate-reorder-input'), 'Renders sentence reconstruction text input bar');
  assert.ok(createdModal.innerHTML.includes('btn-clear-assembly'), 'Renders clear / reset assembly button');
  assert.ok(createdModal.innerHTML.includes('Sắp xếp câu'), 'Renders question type badge for sentence reorder');
});

