import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Issue 54: Candidate Simulation renders pictorial vocabulary questions in a 2-column grid layout', () => {
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
    id: '08010000-0000-4000-8000-000000000054',
    version: 1,
    status: 'draft',
    title: 'Pictorial Grid Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '08010000-0000-4000-8000-000000000054',
      title: 'Pictorial Grid Test',
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
              title: 'Exercise 2: Từ vựng qua ảnh',
              instructions: 'Dựa vào hình ảnh và gợi ý, hãy hoàn thành từ/cụm từ tương ứng.',
              itemIds: ['item_1', 'item_2', 'item_3', 'item_4']
            }
          ],
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'item_1',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'school kids',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              maxScore: 1,
              image: 'assets/test 1/vocabulary/image1.png',
              captionHint: '(độ tuổi đi học)',
              letterHint: 's _ _ _ _ _ k _ _ _',
              options: []
            },
            {
              itemFamilyId: 'f2',
              itemVersionId: 'item_2',
              position: 2,
              exerciseId: 'ex1',
              prompt: 'traffic jam',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              maxScore: 1,
              image: 'assets/test 1/vocabulary/image2.png',
              captionHint: '(ùn tắc giao thông)',
              letterHint: 't _ _ _ _ _ _ j _ _',
              options: []
            },
            {
              itemFamilyId: 'f3',
              itemVersionId: 'item_3',
              position: 3,
              exerciseId: 'ex1',
              prompt: 'solar panel',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              maxScore: 1,
              image: 'assets/test 1/vocabulary/image3.png',
              captionHint: '(pin năng lượng mặt trời)',
              letterHint: 's _ _ _ _ p _ _ _ _',
              options: []
            },
            {
              itemFamilyId: 'f4',
              itemVersionId: 'item_4',
              position: 4,
              exerciseId: 'ex1',
              prompt: 'greenhouse',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              maxScore: 1,
              image: 'assets/test 1/vocabulary/image4.png',
              captionHint: '(nhà kính)',
              letterHint: 'g _ _ _ _ _ _ _ _ _',
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_1: { graderType: 'accepted_text', accepted: ['school kids'] },
        item_2: { graderType: 'accepted_text', accepted: ['traffic jam'] },
        item_3: { graderType: 'accepted_text', accepted: ['solar panel'] },
        item_4: { graderType: 'accepted_text', accepted: ['greenhouse'] }
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

    // 1. Phải gom nhóm thành đúng 1 container .candidate-pictorial-group-container
    assert.match(html, /candidate-pictorial-group-container/, 'Must render .candidate-pictorial-group-container');

    // 2. Chứa lưới 2 cột .candidate-pictorial-grid
    assert.match(html, /candidate-pictorial-grid/, 'Must render .candidate-pictorial-grid');

    // 3. Đề bài chỉ xuất hiện 1 lần duy nhất ở đầu nhóm (trong .candidate-pictorial-group-prompt)
    assert.match(html, /candidate-pictorial-group-prompt/, 'Must render .candidate-pictorial-group-prompt');
    const promptHeaderMatches = html.match(/candidate-pictorial-group-prompt/g) || [];
    assert.equal(promptHeaderMatches.length, 1, 'Group prompt header must appear exactly once');

    // 4. Có 4 thẻ con tương ứng với 4 câu hỏi
    const cardMatches = html.match(/<div class="candidate-pictorial-card"/g) || [];
    assert.equal(cardMatches.length, 4, 'Must render exactly 4 pictorial cards inside the grid');

    // 5. Mỗi thẻ con chứa badge số câu, khung ảnh, gợi ý, ô nhập
    assert.match(html, /Câu 1<\/span>/, 'Must render badge Câu 1');
    assert.match(html, /Câu 2<\/span>/, 'Must render badge Câu 2');
    assert.match(html, /Câu 3<\/span>/, 'Must render badge Câu 3');
    assert.match(html, /Câu 4<\/span>/, 'Must render badge Câu 4');
    assert.match(html, /assets\/test 1\/vocabulary\/image1\.png/, 'Must render image 1');
    assert.match(html, /s _ _ _ _ _ k _ _ _/, 'Must render letter hint 1');
    assert.match(html, /\(độ tuổi đi học\)/, 'Must render caption hint 1');
    assert.match(html, /candidate-pictorial-input/, 'Must render input.candidate-pictorial-input');

    // 6. Đề bài KHÔNG lặp lại ở từng thẻ con
    // Không có .candidate-question-prompt bên trong nhóm pictorial
    assert.equal(
      html.includes('Nhìn hình và hoàn thành từ vựng:') && (html.match(/Nhìn hình và hoàn thành từ vựng:/g) || []).length > 1,
      false,
      'Prompt must not be repeated inside each individual pictorial card'
    );

  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});

test('Issue 54: Mixed questions exercise groups pictorial questions into 2-column grid while keeping standard cards for other question types', () => {
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
    id: '08010000-0000-4000-8000-000000000055',
    version: 1,
    status: 'draft',
    title: 'Mixed Questions Test',
    durationMinutes: 30,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '08010000-0000-4000-8000-000000000055',
      title: 'Mixed Questions Test',
      durationMinutes: 30,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Mixed Section',
          exercises: [
            {
              exerciseId: 'ex_mixed',
              exerciseNumber: 1,
              title: 'Exercise Mixed',
              itemIds: ['mc_1', 'pic_1', 'pic_2', 'vp_1']
            }
          ],
          items: [
            {
              itemFamilyId: 'f_mc',
              itemVersionId: 'mc_1',
              position: 1,
              exerciseId: 'ex_mixed',
              prompt: 'Which word means happy?',
              interactionType: 'single_choice',
              options: [{ id: 'opt_a', label: 'Joyful' }, { id: 'opt_b', label: 'Sad' }]
            },
            {
              itemFamilyId: 'f_pic1',
              itemVersionId: 'pic_1',
              position: 2,
              exerciseId: 'ex_mixed',
              prompt: 'bicycle',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              image: 'assets/bicycle.png',
              letterHint: 'b _ _ _ _ _ _',
              captionHint: '(xe đạp)',
              options: []
            },
            {
              itemFamilyId: 'f_pic2',
              itemVersionId: 'pic_2',
              position: 3,
              exerciseId: 'ex_mixed',
              prompt: 'airplane',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              image: 'assets/airplane.png',
              letterHint: 'a _ _ _ _ _ _ _',
              captionHint: '(máy bay)',
              options: []
            },
            {
              itemFamilyId: 'f_vp',
              itemVersionId: 'vp_1',
              position: 4,
              exerciseId: 'ex_mixed',
              prompt: 'Nghe đoạn ghi âm, nhập từ...',
              interactionType: 'text_select_pair',
              targetWord: 'guitar',
              options: [{ id: 'o1', label: 'đàn ghi ta' }]
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

    // 1. Single choice question renders standard candidate-question-card
    assert.match(html, /Which word means happy\?/, 'Must render single choice prompt');
    assert.match(html, /Joyful/, 'Must render single choice option Joyful');

    // 2. Pictorial items are grouped into candidate-pictorial-group-container
    assert.match(html, /candidate-pictorial-group-container/, 'Must render pictorial group container');
    assert.match(html, /assets\/bicycle\.png/, 'Must render pictorial 1');
    assert.match(html, /assets\/airplane\.png/, 'Must render pictorial 2');

    // 3. Vocab pair renders candidate-vocab-table-container
    assert.match(html, /candidate-vocab-table-container/, 'Must render vocab table container');

  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});

test('Issue 54: styles.css contains 2-column grid styles and responsive layout for pictorial vocabulary', () => {
  const cssPath = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1'), '../term-tests/teacher-dashboard/styles.css');
  const css = readFileSync(cssPath, 'utf8');

  assert.match(css, /\.candidate-pictorial-group-container/, 'styles.css must style .candidate-pictorial-group-container');
  assert.match(css, /\.candidate-pictorial-grid/, 'styles.css must style .candidate-pictorial-grid');
  assert.match(css, /repeat\(2,\s*minmax\(0,\s*1fr\)\)/, 'styles.css must configure 2-column grid repeat(2, minmax(0, 1fr))');
});
