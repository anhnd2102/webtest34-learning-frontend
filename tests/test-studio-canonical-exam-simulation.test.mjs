import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Top bar action buttons have standardized sizing and white-space nowrap', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000020',
    version: 1,
    status: 'draft',
    title: 'Button Size Standardization Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000020',
      title: 'Button Size Standardization Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Part 1',
          items: []
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
  };

  renderTestBuilderView(container, mockForm);
  const html = container.innerHTML;

  // Verify all 3 action buttons exist in builder-top-right
  assert.match(html, /id="btn-preview-test"/);
  assert.match(html, /id="btn-save-draft"/);
  assert.match(html, /id="btn-publish-test"/);

  // Check CSS file for standardized button styling rules
  const cssPath = resolve('term-tests/teacher-dashboard/styles.css');
  const css = readFileSync(cssPath, 'utf8');

  // Must enforce white-space nowrap and fixed height or min-height 38px
  assert.ok(
    css.includes('white-space: nowrap') || css.includes('white-space:nowrap'),
    'Should enforce white-space: nowrap for buttons'
  );
  assert.ok(
    css.includes('38px'),
    'Should define 38px button height or padding token'
  );
  assert.ok(
    css.includes('.builder-top-right'),
    'Should style .builder-top-right toolbar container'
  );
});

test('Candidate Simulation Modal renders canonical IZONE exam layout with brand mark, 2 columns, and side panel', () => {
  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    style: {},
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  };

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

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000021',
    version: 1,
    status: 'draft',
    title: 'Khóa 34 · Phase 1 · Test 3',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000021',
      title: 'Khóa 34 · Phase 1 · Test 3',
      durationMinutes: 45,
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Vocabulary',
          instructions: 'Listen and note down words',
          audioUrl: 'https://example.com/audio.mp3',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f1',
              itemVersionId: '03010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Nghe từ và chọn nghĩa',
              interactionType: 'text_select_pair',
              options: [{ id: 'opt_1', label: 'Nghĩa A' }]
            }
          ]
        },
        {
          blockId: '03010000-0000-4000-8000-0000000000b2',
          checkpoint: 2,
          title: 'Listening',
          items: []
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

    const modalHtml = mockModal.innerHTML;

    // 1. Brand Logo Mark: Red box with white IZ
    assert.match(modalHtml, /brand-mark[^>]*>IZ<\/div>/i, 'Should render canonical red IZ brand mark');

    // 2. Section navigation bar
    assert.match(modalHtml, /section-nav/, 'Should render horizontal section navigation');
    assert.match(modalHtml, /section-tab/, 'Should render section tabs');

    // 3. True 2-Column layout: Main column + Side panel
    assert.match(modalHtml, /exam-layout/, 'Should render .exam-layout grid');
    assert.match(modalHtml, /main-column/, 'Should render .main-column');
    assert.match(modalHtml, /side-panel/, 'Should render .side-panel');

    // 4. Side panel cards: Tiến độ làm bài & Lưu ý khi làm bài
    assert.match(modalHtml, /Tiến độ làm bài/, 'Should render Tiến độ làm bài card in side panel');
    assert.match(modalHtml, /Lưu ý khi làm bài/, 'Should render Lưu ý khi làm bài card in side panel');

    // 5. Strict Audio dock with start button
    assert.match(modalHtml, /Bắt đầu nghe/, 'Should render strict audio start button');

    // 6. Question numbers with .qnum badge
    assert.match(modalHtml, /qnum/, 'Should render .qnum badge');
  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});
