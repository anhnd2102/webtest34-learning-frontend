import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylesCssPath = path.resolve(__dirname, '../term-tests/teacher-dashboard/styles.css');

test('Issue 58: CSS defines styles for candidate-short-qa-container and compact input', () => {
  const css = fs.readFileSync(stylesCssPath, 'utf8');

  assert.ok(css.includes('.candidate-short-qa-container'), 'styles.css must include .candidate-short-qa-container');
  assert.ok(css.includes('.candidate-short-qa-item'), 'styles.css must include .candidate-short-qa-item');
  assert.ok(css.includes('.candidate-short-input') && /max-width:\s*380px/i.test(css),
    'styles.css must limit .candidate-short-input max-width to 380px');
});

test('Issue 58: Candidate Simulation groups short answer questions into unified QA container without bulky badges', () => {
  let modalHtml = '';
  let previewHandler = null;

  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            if (evt === 'click') previewHandler = handler;
          }
        };
      }
      return null;
    }
  };

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    set innerHTML(val) {
      modalHtml = val;
    },
    get innerHTML() {
      return modalHtml;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000058',
    version: 1,
    status: 'draft',
    title: 'Short Answer Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000058',
      title: 'Short Answer Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'block_listening',
          title: 'Listening',
          exercises: [
            {
              exerciseId: 'ex_short_1',
              exerciseNumber: 1,
              title: 'Exercise 1: Short Answer Questions',
              instructions: 'Answer the questions in no more than 2 words'
            }
          ],
          items: [
            {
              itemFamilyId: 'fam_q33',
              itemVersionId: 'item_q33',
              exerciseId: 'ex_short_1',
              position: 33,
              prompt: 'On what date would Katherine like to celebrate the party?',
              interactionType: 'short_text',
              graderType: 'accepted_text',
              maxScore: 1
            },
            {
              itemFamilyId: 'fam_q34',
              itemVersionId: 'item_q34',
              exerciseId: 'ex_short_1',
              position: 34,
              prompt: 'What day of the week will the party be held?',
              interactionType: 'short_text',
              graderType: 'accepted_text',
              maxScore: 1
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_q33: { graderType: 'accepted_text', accepted: ['15th September'] },
        item_q34: { graderType: 'accepted_text', accepted: ['Saturday'] }
      }
    }
  };

  try {
    globalThis.document = {
      querySelector: (sel) => {
        if (sel === '#candidate-simulation-modal') return mockModal;
        return null;
      },
      createElement: () => mockModal,
      body: { appendChild: () => {} }
    };

    renderTestBuilderView(container, mockForm, { teacherRole: 'teacher' });
    previewHandler();

    // Verify unified container is rendered
    assert.ok(modalHtml.includes('candidate-short-qa-container'), 'Must render candidate-short-qa-container');
    assert.ok(modalHtml.includes('data-item-id="item_q33"'), 'Must render item_q33 input with data-item-id');
    assert.ok(modalHtml.includes('data-item-id="item_q34"'), 'Must render item_q34 input with data-item-id');
    assert.ok(modalHtml.includes('On what date would Katherine like to celebrate the party?'), 'Must render prompt text');
    assert.ok(modalHtml.includes('What day of the week will the party be held?'), 'Must render prompt text');

    // Verify it doesn't wrap each short text in bulky candidate-question-card with question-type-badge
    assert.ok(!modalHtml.includes('<span class="question-type-badge">Điền từ</span>'),
      'Must eliminate bulky [Điền từ] badge in grouped short QA container');
  } finally {
    // cleanup
  }
});

test('Issue 58: Sidebar Question Navigator filters buttons strictly by active skill/section', () => {
  let modalHtml = '';
  let previewHandler = null;

  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            if (evt === 'click') previewHandler = handler;
          }
        };
      }
      return null;
    }
  };

  const qnavSummaryMock = { textContent: '0 câu', style: {} };
  const mockButtons = [
    {
      listeners: {},
      getAttribute: (attr) => (attr === 'data-section-target' ? 'sim-block-0' : (attr === 'data-pos' ? '1' : null)),
      style: { display: '' },
      addEventListener: function(evt, fn) { this.listeners[evt] = fn; }
    },
    {
      listeners: {},
      getAttribute: (attr) => (attr === 'data-section-target' ? 'sim-block-0' : (attr === 'data-pos' ? '2' : null)),
      style: { display: '' },
      addEventListener: function(evt, fn) { this.listeners[evt] = fn; }
    },
    {
      listeners: {},
      getAttribute: (attr) => (attr === 'data-section-target' ? 'sim-block-1' : (attr === 'data-pos' ? '3' : null)),
      style: { display: '' },
      addEventListener: function(evt, fn) { this.listeners[evt] = fn; }
    }
  ];

  const tabListeners = [];
  const mockTabs = [
    {
      getAttribute: (attr) => (attr === 'data-section-target' ? 'sim-block-0' : null),
      classList: { toggle: () => {} },
      addEventListener: (evt, fn) => { tabListeners.push({ target: 'sim-block-0', fn }); }
    },
    {
      getAttribute: (attr) => (attr === 'data-section-target' ? 'sim-block-1' : null),
      classList: { toggle: () => {} },
      addEventListener: (evt, fn) => { tabListeners.push({ target: 'sim-block-1', fn }); }
    }
  ];

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    set innerHTML(val) {
      modalHtml = val;
    },
    get innerHTML() {
      return modalHtml;
    },
    querySelector: (sel) => {
      if (sel === '#qnav-summary') return qnavSummaryMock;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.btn-qnav') return mockButtons;
      if (sel === '.section-tab, .simulation-nav-pill, .side-section-btn') return mockTabs;
      return [];
    },
    addEventListener: () => {}
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000059',
    version: 1,
    status: 'draft',
    title: 'Multi-Skill Test',
    durationMinutes: 60,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000059',
      title: 'Multi-Skill Test',
      durationMinutes: 60,
      blocks: [
        {
          blockId: 'block_grammar',
          title: 'Grammar',
          items: [
            { itemFamilyId: 'f1', itemVersionId: 'q1', position: 1, prompt: 'Q1', interactionType: 'single_choice', graderType: 'exact_option', options: [{ id: 'A', label: 'A' }] },
            { itemFamilyId: 'f2', itemVersionId: 'q2', position: 2, prompt: 'Q2', interactionType: 'single_choice', graderType: 'exact_option', options: [{ id: 'A', label: 'A' }] }
          ]
        },
        {
          blockId: 'block_listening',
          title: 'Listening',
          items: [
            { itemFamilyId: 'f3', itemVersionId: 'q3', position: 3, prompt: 'Q3', interactionType: 'short_text', graderType: 'accepted_text' }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        q1: { graderType: 'exact_option', expectedOptionId: 'A' },
        q2: { graderType: 'exact_option', expectedOptionId: 'A' },
        q3: { graderType: 'accepted_text', accepted: ['ans'] }
      }
    }
  };

  try {
    globalThis.document = {
      querySelector: (sel) => {
        if (sel === '#candidate-simulation-modal') return mockModal;
        return null;
      },
      createElement: () => mockModal,
      body: { appendChild: () => {} }
    };

    renderTestBuilderView(container, mockForm, { teacherRole: 'teacher' });
    previewHandler();

    // Verify navigator buttons include section identifiers to enable filtering
    assert.ok(modalHtml.includes('data-section-target="sim-block-0"'), 'Navigator buttons must have data-section-target for block 0');
    assert.ok(modalHtml.includes('data-section-target="sim-block-1"'), 'Navigator buttons must have data-section-target for block 1');

    // Verify initial filter on block 0 (Grammar has 2 questions)
    assert.equal(mockButtons[0].style.display, 'inline-flex', 'Button 1 should be visible for block 0');
    assert.equal(mockButtons[1].style.display, 'inline-flex', 'Button 2 should be visible for block 0');
    assert.equal(mockButtons[2].style.display, 'none', 'Button 3 should be hidden for block 0');
    assert.equal(qnavSummaryMock.textContent, '2 câu', 'Summary should show 2 câu for block 0');

    // Simulate clicking block 1 tab (Listening has 1 question)
    const block1TabListener = tabListeners.find(t => t.target === 'sim-block-1');
    assert.ok(block1TabListener, 'Tab click listener for block 1 must be registered');
    block1TabListener.fn();

    // Verify filtering switched to block 1
    assert.equal(mockButtons[0].style.display, 'none', 'Button 1 should be hidden for block 1');
    assert.equal(mockButtons[1].style.display, 'none', 'Button 2 should be hidden for block 1');
    assert.equal(mockButtons[2].style.display, 'inline-flex', 'Button 3 should be visible for block 1');
    assert.equal(qnavSummaryMock.textContent, '1 câu', 'Summary should show 1 câu for block 1');
  } finally {
    // cleanup
  }
});
