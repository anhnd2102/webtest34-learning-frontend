import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTableHtml,
  renderRichHtmlEditor,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('generateTableHtml creates valid table markup with thead, tbody, th, and td', () => {
  const table2x2 = generateTableHtml(2, 2);
  assert.ok(table2x2.includes('<table class="cloze-table">'), 'Has cloze-table class');
  assert.ok(table2x2.includes('<thead>'), 'Contains thead');
  assert.ok(table2x2.includes('<tbody>'), 'Contains tbody');
  assert.ok(table2x2.includes('<th>Cột 1</th>'), 'Contains default th headers');
  assert.ok(table2x2.includes('<td>Nội dung 1-1</td>'), 'Contains td cells');

  // IELTS preset: itinerary
  const itineraryTable = generateTableHtml(null, null, 'itinerary');
  assert.ok(itineraryTable.includes('The Family Caribbean Cruise') || itineraryTable.includes('Hành trình / Mục'), 'Contains itinerary header');
  assert.ok(itineraryTable.includes('Places to visit'), 'Contains Places to visit row');
  assert.ok(itineraryTable.includes('(1) __________'), 'Contains sample cloze token in preset');

  // IELTS preset: notes
  const notesTable = generateTableHtml(null, null, 'notes');
  assert.ok(notesTable.includes('IELTS Note Completion') || notesTable.includes('Ghi chú bài nghe'), 'Contains notes table');

  // IELTS preset: vocabulary
  const vocabTable = generateTableHtml(null, null, 'vocabulary');
  assert.ok(vocabTable.includes('Từ vựng'), 'Contains vocabulary header');
  assert.ok(vocabTable.includes('Phiên âm'), 'Contains IPA column');
});

test('renderRichHtmlEditor mounts toolbar with Table, Image, and HTML toggle buttons', () => {
  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '.rich-editor-visual') return visualEl;
      if (sel === '.rich-editor-code') return codeEl;
      if (sel === '.btn-toggle-html-mode') return toggleBtn;
      return null;
    },
    querySelectorAll: () => []
  };

  const visualEl = {
    innerHTML: '<p>Initial content</p>',
    style: { display: 'block' },
    addEventListener: () => {}
  };
  const codeEl = {
    value: '<p>Initial content</p>',
    style: { display: 'none' },
    addEventListener: () => {}
  };
  const toggleBtn = {
    classList: {
      contains: () => false,
      add: () => {},
      remove: () => {}
    },
    textContent: '</> Mã HTML',
    addEventListener: () => {}
  };

  let updatedValue = '';
  const editor = renderRichHtmlEditor(container, {
    value: '<p>Initial content</p>',
    onChange: (val) => { updatedValue = val; }
  });

  assert.ok(container.innerHTML.includes('rich-html-editor-wrap'), 'Wraps in rich editor class');
  assert.ok(container.innerHTML.includes('btn-rich-insert-table'), 'Renders Insert Table button');
  assert.ok(container.innerHTML.includes('btn-rich-insert-image'), 'Renders Insert Image button');
  assert.ok(container.innerHTML.includes('btn-toggle-html-mode'), 'Renders Mode Toggle button');
  assert.ok(container.innerHTML.includes('rich-editor-visual'), 'Renders visual contenteditable area');
  assert.ok(container.innerHTML.includes('rich-editor-code'), 'Renders code textarea');
});

test('renderRichHtmlEditor blocks base64 images and sanitizes insecure scripts', () => {
  const mockContainer = {
    innerHTML: '',
    querySelector: () => ({ style: {}, addEventListener: () => {} }),
    querySelectorAll: () => []
  };

  const dirtyInput = '<p>Test</p><script>alert("hack")</script><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />';
  
  let resultVal = '';
  const editor = renderRichHtmlEditor(mockContainer, {
    value: dirtyInput,
    onChange: (val) => { resultVal = val; }
  });

  // When sanitized, script and data: URLs are completely removed
  assert.ok(!mockContainer.innerHTML.includes('<script>'), 'Strips malicious script tags');
  assert.ok(!mockContainer.innerHTML.includes('data:image/'), 'Strips base64 image data');
});

test('Test Studio: inline_cloze and reading_matching mount Rich HTML Editor toolbar in builder view', () => {
  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '45010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Rich Editor Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '45010000-0000-4000-8000-000000000001',
      title: 'Rich Editor Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Inline Cloze Section',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'it-cloze-1',
              position: 1,
              prompt: 'The cruise departs from Miami. Places to visit: (1) __________ Caribbean islands.',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              graderType: 'accepted_text',
              maxScore: 1,
              options: []
            }
          ]
        },
        {
          blockId: 'b2',
          checkpoint: 2,
          title: 'Reading Matching Section',
          readingPassage: 'Paragraph A: Climate change is accelerating.',
          layoutType: 'split_pane_matching',
          items: [
            {
              itemFamilyId: 'f2',
              itemVersionId: 'it-match-1',
              position: 2,
              prompt: 'Đoạn A',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'reading_matching',
              layoutType: 'split_pane_matching',
              graderType: 'exact_option',
              maxScore: 1,
              options: [
                { id: 'heading_1', label: 'Global Warming Effects' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'it-cloze-1': { graderType: 'accepted_text', accepted: ['six'] },
        'it-match-1': { graderType: 'exact_option', expectedOptionId: 'heading_1' }
      }
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  // Must mount Rich Editor for inline cloze
  assert.ok(mockContainer.innerHTML.includes('btn-rich-insert-table'), 'Mounts Insert Table button');
  assert.ok(mockContainer.innerHTML.includes('btn-rich-insert-image'), 'Mounts Insert Image button');
  assert.ok(mockContainer.innerHTML.includes('btn-toggle-html-mode'), 'Mounts Mode Toggle button');
  assert.ok(mockContainer.innerHTML.includes('rich-editor-visual'), 'Mounts visual contenteditable area');
});

