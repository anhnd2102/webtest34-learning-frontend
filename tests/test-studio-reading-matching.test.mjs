import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractParagraphLabels,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('extractParagraphLabels detects paragraph labels [A], [B], Paragraph A, etc. in passage text', () => {
  const passage1 = `
    Paragraph A: Technology is getting more sophisticated.
    Paragraph B: Britain is reported to have more than 4 million cameras.
    Paragraph C: Professor Mike Press said that design can reduce crime.
  `;
  assert.deepEqual(extractParagraphLabels(passage1), ['A', 'B', 'C']);

  const passage2 = `
    [A] The first stage of development.
    [B] Later enhancements in the 19th century.
    [C] Modern era applications.
    [D] Future projections.
  `;
  assert.deepEqual(extractParagraphLabels(passage2), ['A', 'B', 'C', 'D']);

  assert.deepEqual(extractParagraphLabels(''), []);
  assert.deepEqual(extractParagraphLabels(null), []);
});

test('renderTestBuilderView provides button to add reading split-pane and matching template', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '10010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Reading Matching Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '10010000-0000-4000-8000-000000000001',
      title: 'Reading Matching Test',
      durationMinutes: 60,
      blocks: [
        {
          blockId: 'b1001',
          checkpoint: 1,
          title: 'Reading · Matching Headings',
          instructions: 'Choose the most suitable headings for paragraphs B-E from the list of headings.',
          readingPassage: 'Paragraph A: Intro...\nParagraph B: Details...\nParagraph C: Evidence...\nParagraph D: Conclusion...',
          layoutType: 'split_pane_matching',
          items: [
            {
              itemFamilyId: 'f1001',
              itemVersionId: 'i1001',
              position: 28,
              prompt: 'Paragraph B',
              helpText: '',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'reading_matching',
              layoutType: 'split_pane_matching',
              graderType: 'exact_option',
              maxScore: 1,
              options: [
                { id: 'i', label: 'i. The spy in the sky' },
                { id: 'ii', label: 'ii. The spread of technology' },
                { id: 'iii', label: 'iii. The limitations of cameras' },
                { id: 'iv', label: 'iv. The cost of cameras' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1001: {
          graderType: 'exact_option',
          expectedOptionId: 'iii'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-reading-matching'), 'Provides button to add reading matching template');
  assert.ok(container.innerHTML.includes('template-reading-matching'), 'Renders template-reading-matching section');
  assert.ok(container.innerHTML.includes('input-reading-passage'), 'Renders rich reading passage textarea');
  assert.ok(container.innerHTML.includes('btn-extract-paragraphs'), 'Renders button to auto-detect paragraph labels');
  assert.ok(container.innerHTML.includes('matching-headings-pool'), 'Renders list of common matching headings/options');
  assert.ok(container.innerHTML.includes('split-pane-preview-badge'), 'Renders split-pane layout badge');
});

test('Candidate Simulation Modal renders split-pane layout and matching questions', () => {
  let modalCreated = null;
  globalThis.document = {
    body: {
      appendChild: (el) => { modalCreated = el; }
    },
    querySelector: (sel) => {
      if (sel === '#candidate-simulation-modal') return modalCreated;
      return null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => {
      const el = {
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        querySelector: () => null,
        querySelectorAll: () => []
      };
      return el;
    }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            if (evt === 'click') handler();
          }
        };
      }
      return null;
    },
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '10010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Split Pane Simulation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '10010000-0000-4000-8000-000000000002',
      title: 'Split Pane Simulation Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Reading Split-Pane Block',
          readingPassage: 'Paragraph A: The introduction.\nParagraph B: The findings.',
          layoutType: 'split_pane_matching',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'i1',
              position: 1,
              prompt: 'Paragraph A',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'reading_matching',
              layoutType: 'split_pane_matching',
              graderType: 'exact_option',
              maxScore: 1,
              options: [
                { id: 'i', label: 'i. Heading 1' },
                { id: 'ii', label: 'ii. Heading 2' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1: { graderType: 'exact_option', expectedOptionId: 'i' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(modalCreated, 'Simulation modal is created');
  assert.ok(modalCreated.innerHTML.includes('split-pane-reading'), 'Contains split-pane-reading container');
  assert.ok(modalCreated.innerHTML.includes('reading-passage-column'), 'Contains reading-passage-column');
  assert.ok(modalCreated.innerHTML.includes('matching-questions-column'), 'Contains matching-questions-column');
  assert.ok(modalCreated.innerHTML.includes('matching-select'), 'Contains matching-select dropdown');
  assert.ok(modalCreated.innerHTML.includes('split-pane-mobile-toggle'), 'Contains mobile responsive switcher');

  delete globalThis.document;
});
