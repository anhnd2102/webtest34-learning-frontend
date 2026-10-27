import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Issue 53: Candidate Simulation renders vocabulary pair questions in a unified compact table', () => {
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

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    innerHTML: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {}
    },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000053',
    version: 1,
    status: 'draft',
    title: 'Vocab Compact Table Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000053',
      title: 'Vocab Compact Table Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Vocabulary Section',
          instructions: 'Listen and note down words',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1: Cặp từ vựng',
              instructions: 'Nghe đoạn ghi âm và hoàn thành bảng từ vựng bên dưới.',
              itemIds: ['item_1', 'item_2', 'item_3']
            }
          ],
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'item_1',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:',
              interactionType: 'text_select_pair',
              targetWord: 'conservative',
              options: [
                { id: 'opt_1', label: 'bảo thủ' },
                { id: 'opt_2', label: 'tiến bộ' }
              ]
            },
            {
              itemFamilyId: 'f2',
              itemVersionId: 'item_2',
              position: 2,
              exerciseId: 'ex1',
              prompt: 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:',
              interactionType: 'text_select_pair',
              targetWord: 'classmate',
              options: [
                { id: 'opt_1', label: 'bảo thủ' },
                { id: 'opt_3', label: 'bạn cùng lớp' }
              ]
            },
            {
              itemFamilyId: 'f3',
              itemVersionId: 'item_3',
              position: 3,
              exerciseId: 'ex1',
              prompt: 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:',
              interactionType: 'text_select_pair',
              targetWord: 'satisfying',
              options: [
                { id: 'opt_1', label: 'bảo thủ' },
                { id: 'opt_4', label: 'thỏa mãn' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
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
    const html = mockModal.innerHTML;

    // 1. Phải gom nhóm thành đúng 1 container bảng .candidate-vocab-table-container
    assert.match(html, /candidate-vocab-table-container/, 'Must render .candidate-vocab-table-container');

    // 2. Phải có thanh tiêu đề bảng với 2 cột tỷ lệ điểm (50% điểm)
    assert.match(html, /Từ tiếng Anh nghe được \(50% điểm\)/, 'Must display English word 50% points header');
    assert.match(html, /Nghĩa tiếng Việt tương ứng \(50% điểm\)/, 'Must display Vietnamese meaning 50% points header');

    // 3. Đề bài chỉ xuất hiện 1 lần duy nhất trong toàn bộ khối bảng
    const promptMatches = html.match(/Nghe đoạn ghi âm, nhập từ\/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:/g) || [];
    assert.equal(promptMatches.length, 1, 'Prompt should only appear ONCE in the entire vocabulary table group, not repeated for each question');

    // 4. Có 3 dòng câu hỏi tương ứng với 3 items
    const rowMatches = html.match(/candidate-vocab-table-row/g) || [];
    assert.equal(rowMatches.length, 3, 'Must render exactly 3 rows in the compact table');

    // 5. Mỗi dòng chứa badge số câu và các ô input/select
    assert.match(html, /Câu 1<\/span>/, 'Must render row badge Câu 1');
    assert.match(html, /Câu 2<\/span>/, 'Must render row badge Câu 2');
    assert.match(html, /Câu 3<\/span>/, 'Must render row badge Câu 3');
    assert.match(html, /candidate-vocab-text-input/, 'Must render .candidate-vocab-text-input');
    assert.match(html, /candidate-vocab-select/, 'Must render .candidate-vocab-select');

    // 6. Từng dòng KHÔNG lặp lại nhãn "(50% điểm)"
    // Nhãn 50% chỉ được xuất hiện ở header (2 lần: 1 cho tiếng Anh, 1 cho tiếng Việt)
    const scoreSplitMatches = html.match(/50% điểm/g) || [];
    assert.equal(scoreSplitMatches.length, 2, '50% điểm label should only appear in the column headers (2 occurrences), never in individual rows');

  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});

test('Issue 53: styles.css contains compact table styles and responsive layout for vocabulary pairs', () => {
  const cssPath = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1'), '../term-tests/teacher-dashboard/styles.css');
  const css = readFileSync(cssPath, 'utf8');

  assert.match(css, /\.candidate-vocab-table-container/, 'styles.css must style .candidate-vocab-table-container');
  assert.match(css, /\.candidate-vocab-table-row/, 'styles.css must style .candidate-vocab-table-row');
  assert.match(css, /\.candidate-vocab-table-head/, 'styles.css must style .candidate-vocab-table-head');
});

test('Issue 53: Mixed questions exercise groups vocabulary pairs into table while keeping standard cards for other question types', () => {
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

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000054',
    version: 1,
    status: 'draft',
    title: 'Mixed Exercise Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000054',
      title: 'Mixed Exercise Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Section 1',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1',
              itemIds: ['item_mcq', 'item_v1', 'item_v2', 'item_short']
            }
          ],
          items: [
            {
              itemFamilyId: 'f_mcq',
              itemVersionId: 'item_mcq',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'Choose the correct option:',
              interactionType: 'single_choice',
              options: [
                { id: 'opt_A', label: 'Option A' },
                { id: 'opt_B', label: 'Option B' }
              ]
            },
            {
              itemFamilyId: 'f_v1',
              itemVersionId: 'item_v1',
              position: 2,
              exerciseId: 'ex1',
              prompt: 'Nghe từ và chọn nghĩa:',
              interactionType: 'text_select_pair',
              targetWord: 'ambitious',
              options: [{ id: 'opt_1', label: 'tham vọng' }]
            },
            {
              itemFamilyId: 'f_v2',
              itemVersionId: 'item_v2',
              position: 3,
              exerciseId: 'ex1',
              prompt: 'Nghe từ và chọn nghĩa:',
              interactionType: 'text_select_pair',
              targetWord: 'reliable',
              options: [{ id: 'opt_2', label: 'đáng tin cậy' }]
            },
            {
              itemFamilyId: 'f_short',
              itemVersionId: 'item_short',
              position: 4,
              exerciseId: 'ex1',
              prompt: 'Write a short answer:',
              interactionType: 'short_text'
            }
          ]
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
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
    const html = mockModal.innerHTML;

    // 1. Phải có 1 table container cho cặp từ vựng
    const tableMatches = html.match(/candidate-vocab-table-container/g) || [];
    assert.equal(tableMatches.length, 1, 'Should have exactly 1 vocab table container for consecutive vocab items');

    // 2. Table chứa 2 rows cho câu 2 và câu 3
    const rowMatches = html.match(/candidate-vocab-table-row/g) || [];
    assert.equal(rowMatches.length, 2, 'Should have 2 rows inside the vocab table');

    // 3. Các câu khác (single_choice, short_text) vẫn render thẻ card chuẩn .candidate-question-card
    assert.match(html, /Choose the correct option:/, 'Renders single choice question prompt');
    assert.match(html, /Write a short answer:/, 'Renders short text question prompt');

  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});

test('Issue 53: When item.prompt equals target word (e.g. February), table header prompt falls back to instruction and NEVER leaks the target word', () => {
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

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000055',
    version: 1,
    status: 'draft',
    title: 'February Target Word Test',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000055',
      title: 'February Target Word Test',
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Section 1',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1: Bài tập 1: Phần 2',
              itemIds: ['item_11', 'item_12']
            }
          ],
          items: [
            {
              itemFamilyId: 'f11',
              itemVersionId: 'item_11',
              position: 11,
              exerciseId: 'ex1',
              prompt: 'February', // When syncInputs copies targetWord into prompt
              targetWord: 'February',
              interactionType: 'text_select_pair',
              options: [{ id: 'opt_1', label: 'tháng 2' }]
            },
            {
              itemFamilyId: 'f12',
              itemVersionId: 'item_12',
              position: 12,
              exerciseId: 'ex1',
              prompt: 'March',
              targetWord: 'March',
              interactionType: 'text_select_pair',
              options: [{ id: 'opt_2', label: 'tháng 3' }]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_11: { graderType: 'accepted_text_exact_option', accepted: ['February'], expectedOptionId: 'opt_1' },
        item_12: { graderType: 'accepted_text_exact_option', accepted: ['March'], expectedOptionId: 'opt_2' }
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
    const html = mockModal.innerHTML;

    // 1. Phải render table container
    assert.match(html, /candidate-vocab-table-container/, 'Renders vocab table container');

    // 2. Chữ 'February' KHÔNG ĐƯỢC xuất hiện trong .candidate-vocab-table-prompt (không lộ đáp án lên đầu đề bài)
    assert.doesNotMatch(
      html,
      /<div class="candidate-vocab-table-prompt">\s*February\s*<\/div>/i,
      'Target word February must NOT be rendered as the prompt of the table'
    );

    // 3. Thay vào đó, đề bài bảng phải là hướng dẫn chuẩn
    assert.match(
      html,
      /Nghe đoạn ghi âm, nhập từ\/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:/,
      'Falls back to default instruction prompt when item.prompt is the target word'
    );

  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});
