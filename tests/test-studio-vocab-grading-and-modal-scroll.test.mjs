import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Issue 55: Candidate Simulation grades vocabulary pair questions and captures candidate answers accurately', () => {
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
        return { innerHTML: '' };
      }
      return null;
    },
    querySelectorAll: (sel) => {
      return [];
    },
    addEventListener: (evt, handler) => {
      listeners[evt] = handler;
    }
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000055',
    version: 1,
    status: 'draft',
    title: 'Vocab Grading Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000055',
      title: 'Vocab Grading Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Vocabulary Section',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1: Cặp từ vựng',
              instructions: 'Nghe đoạn ghi âm và điền từ thích hợp',
              itemIds: ['item_11', 'item_12']
            }
          ],
          items: [
            {
              itemFamilyId: 'f11',
              itemVersionId: 'item_11',
              position: 11,
              exerciseId: 'ex1',
              prompt: 'Nghe đoạn ghi âm...',
              interactionType: 'text_select_pair',
              targetWord: 'February',
              options: [
                { id: 'opt_1', label: 'tháng Hai' },
                { id: 'opt_2', label: 'tháng Ba' }
              ]
            },
            {
              itemFamilyId: 'f12',
              itemVersionId: 'item_12',
              position: 12,
              exerciseId: 'ex1',
              prompt: 'Nghe đoạn ghi âm...',
              interactionType: 'text_select_pair',
              targetWord: 'See you later!',
              options: [
                { id: 'opt_3', label: 'Hẹn gặp lại!' },
                { id: 'opt_4', label: 'Tạm biệt!' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_11: {
          graderType: 'accepted_text_exact_option',
          accepted: ['February'],
          expectedOptionId: 'opt_1',
          maxScore: 1
        },
        item_12: {
          graderType: 'accepted_text_exact_option',
          accepted: ['See you later!'],
          expectedOptionId: 'opt_3',
          maxScore: 1
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

    // Mock DOM elements inside modal after open
    const input11 = { value: 'February', dataset: { itemId: 'item_11' }, getAttribute: () => 'item_11' };
    const select11 = { value: 'opt_1', dataset: { itemId: 'item_11' }, getAttribute: () => 'item_11' };
    const input12 = { value: 'See you later!', dataset: { itemId: 'item_12' }, getAttribute: () => 'item_12' };
    const select12 = { value: '', dataset: { itemId: 'item_12' }, getAttribute: () => 'item_12' }; // unselected option

    const btn11 = {
      getAttribute: (attr) => attr === 'data-pos' ? '11' : (attr === 'data-item-id' ? 'item_11' : null),
      hasAttribute: () => false,
      classList: { add: () => {}, remove: () => {}, toggle: () => {} }
    };
    const btn12 = {
      getAttribute: (attr) => attr === 'data-pos' ? '12' : (attr === 'data-item-id' ? 'item_12' : null),
      hasAttribute: () => false,
      classList: { add: () => {}, remove: () => {}, toggle: () => {} }
    };

    const resultsBodyMock = { innerHTML: '' };
    const resultsModalMock = { style: {} };

    mockModal.querySelector = (sel) => {
      if (sel.includes('.candidate-vocab-text-input[data-item-id="item_11"]')) return input11;
      if (sel.includes('.candidate-vocab-select[data-item-id="item_11"]')) return select11;
      if (sel.includes('.candidate-vocab-text-input[data-item-id="item_12"]')) return input12;
      if (sel.includes('.candidate-vocab-select[data-item-id="item_12"]')) return select12;
      if (sel === '#simulation-results-modal') return resultsModalMock;
      if (sel === '#sim-results-body') return resultsBodyMock;
      return null;
    };

    mockModal.querySelectorAll = (sel) => {
      if (sel === '.btn-qnav') return [btn11, btn12];
      return [];
    };

    // Trigger simulation submit
    assert.ok(listeners['submit'], 'Must register submit simulation listener');
    listeners['submit']();

    const resultsHtml = resultsBodyMock.innerHTML;

    // 1. Dạng câu phải là "Cặp từ vựng", KHÔNG phải "Điền khuyết"
    assert.match(resultsHtml, /Cặp từ vựng/, 'Must label question type as Cặp từ vựng');
    assert.doesNotMatch(resultsHtml, /Điền khuyết/, 'Must NOT fall back to Điền khuyết for vocabulary pair');

    // 2. Bài làm của câu 11 phải ghi nhận từ "February" và nghĩa "tháng Hai", KHÔNG được là "(Chưa trả lời)"
    assert.match(resultsHtml, /February/, 'Must record candidate answer February for question 11');
    assert.doesNotMatch(resultsHtml, />\(Chưa trả lời\)<\/td>[\s\S]*?February/, 'Question 11 must NOT be marked (Chưa trả lời)');

    // 3. Câu 11 cả từ và nghĩa đều đúng -> 1/1đ và Đánh giá "Đúng"
    assert.match(resultsHtml, /1\/1đ/, 'Question 11 must receive full 1/1 score');

    // 4. Câu 12 nhập đúng từ nhưng chưa chọn nghĩa -> Được 50% điểm (0.5/1đ) hoặc Đánh giá Đúng 50%
    assert.match(resultsHtml, /0\.5\/1đ/, 'Question 12 must receive partial 0.5/1 score for typing English word correctly');

  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});

test('Issue 55: styles.css enables scrolling in simulation results modal and fixes table header', () => {
  const cssPath = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1'), '../term-tests/teacher-dashboard/styles.css');
  const css = readFileSync(cssPath, 'utf8');

  // 1. .sim-results-body must have flex: 1 1 auto (or flex: 1) and min-height: 0 so flexbox allows it to shrink and scroll
  assert.match(css, /\.sim-results-body\s*\{[^}]*min-height:\s*0/s, 'styles.css .sim-results-body must specify min-height: 0');
  assert.match(css, /\.sim-results-body\s*\{[^}]*overflow-y:\s*auto/s, 'styles.css .sim-results-body must specify overflow-y: auto');

  // 2. Table header should be sticky for seamless scrolling through long lists
  assert.match(css, /\.sim-breakdown-table\s+(?:thead\s+)?th\s*\{[^}]*position:\s*sticky/s, 'styles.css .sim-breakdown-table th must have position: sticky');
});
