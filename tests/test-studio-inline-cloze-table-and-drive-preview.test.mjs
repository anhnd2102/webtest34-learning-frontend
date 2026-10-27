import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderInlineClozeMarkup,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('renderInlineClozeMarkup preserves HTML table structure and embeds inputs inside td cells', () => {
  const tableHtml = `
    <table class="cloze-table">
      <thead>
        <tr>
          <th>Loại</th>
          <th>Chi tiết</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Places to visit</td>
          <td>six (1) __________ Caribbean islands</td>
        </tr>
        <tr>
          <td>On-board activities</td>
          <td>A wide range of food, (2) __________ and dinner</td>
        </tr>
      </tbody>
    </table>
  `;

  const items = [
    { itemVersionId: 'item-1', position: 1 },
    { itemVersionId: 'item-2', position: 2 }
  ];

  const responses = {
    'item-1': 'fantastic',
    'item-2': 'lunch'
  };

  const output = renderInlineClozeMarkup(tableHtml, items, responses);

  // Must preserve table elements
  assert.ok(output.includes('<table class="cloze-table">'), 'Preserves table element');
  assert.ok(output.includes('<th>Loại</th>'), 'Preserves thead and th');
  assert.ok(output.includes('<td>Places to visit</td>'), 'Preserves td content');

  // Must embed input element inside td
  assert.ok(output.includes('six <span class="inline-blank-wrapper" data-item-id="item-1">'), 'Embeds blank wrapper inside td');
  assert.ok(output.includes('value="fantastic"'), 'Fills in candidate response fantastic');
  assert.ok(output.includes('value="lunch"'), 'Fills in candidate response lunch');
  assert.ok(!output.includes('&lt;table'), 'Does NOT escape HTML table into raw text');
});

test('Pictorial Vocabulary: pasting Google Drive URL into .input-pictorial-image normalizes to thumbnail URL and updates preview', () => {
  const listeners = {};
  let previewImgSrc = '';

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.input-pictorial-image') {
        return [
          {
            getAttribute: (attr) => {
              if (attr === 'data-block-idx') return '0';
              if (attr === 'data-item-idx') return '0';
              return null;
            },
            value: 'assets/test1/image1.png',
            addEventListener: (evt, handler) => {
              listeners[evt] = handler;
            }
          }
        ];
      }
      return [];
    }
  };

  const mockForm = {
    id: '44010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Pictorial Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '44010000-0000-4000-8000-000000000001',
      title: 'Pictorial Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Vocabulary',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'it-pic-1',
              position: 1,
              prompt: 'Từ vựng qua ảnh 1',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              maxScore: 1,
              image: 'assets/test1/image1.png',
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'it-pic-1': {
          graderType: 'accepted_text',
          accepted: ['camera']
        }
      }
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  // Initial render has preview and input
  assert.ok(mockContainer.innerHTML.includes('input-pictorial-image'), 'Renders image input');
  assert.ok(mockContainer.innerHTML.includes('pictorial-preview-img') || mockContainer.innerHTML.includes('pictorial-preview-wrap'), 'Renders image preview area');
  assert.ok(mockContainer.innerHTML.includes('btn-preview-drive-image'), 'Renders button to preview / test image link');
});

test('Pictorial Vocabulary: input listener converts Google Drive sharing link to thumbnail CDN URL', () => {
  let capturedInputHandler = null;
  const mockInput = {
    value: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing',
    getAttribute: (attr) => {
      if (attr === 'data-block-idx') return '0';
      if (attr === 'data-item-idx') return '0';
      return null;
    },
    addEventListener: (evt, handler) => {
      if (evt === 'input') capturedInputHandler = handler;
    },
    closest: () => mockCard
  };

  const mockImg = {
    src: '',
    style: {}
  };
  const mockErr = {
    style: {}
  };

  const mockCard = {
    querySelector: (sel) => {
      if (sel === '.pictorial-preview-img') return mockImg;
      if (sel === '.pictorial-preview-error') return mockErr;
      return null;
    }
  };

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.input-pictorial-image') return [mockInput];
      return [];
    }
  };

  const mockForm = {
    id: '44010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Pictorial Test 2',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '44010000-0000-4000-8000-000000000002',
      title: 'Pictorial Test 2',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'it-pic-2',
              position: 1,
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              image: '',
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'it-pic-2': { graderType: 'accepted_text', accepted: ['car'] }
      }
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  assert.ok(typeof capturedInputHandler === 'function', 'Registers input event listener on image input');

  // Trigger input
  capturedInputHandler();

  assert.equal(
    mockInput.value,
    'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs&sz=w1600',
    'Normalizes Google Drive URL on input'
  );
  assert.equal(
    mockImg.src,
    'https://drive.google.com/thumbnail?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs&sz=w1600',
    'Updates image preview src'
  );
  assert.equal(mockImg.style.display, 'inline-block', 'Makes image preview visible');
});

test('Inline Cloze: deduplicates editor toolbar by removing redundant .cloze-editor-box', () => {
  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '46010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Inline Cloze Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '46010000-0000-4000-8000-000000000001',
      title: 'Inline Cloze Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'it-cloze-dedup',
              position: 75,
              prompt: 'The cruise departs from Miami and visits (75) __________ Caribbean islands.',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              graderType: 'accepted_text',
              maxScore: 1,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'it-cloze-dedup': { graderType: 'accepted_text', accepted: ['six'] }
      }
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  // Must have rich editor toolbar with blank insert button
  assert.ok(mockContainer.innerHTML.includes('btn-insert-blank-token'), 'Has blank insert button in rich toolbar');
  assert.ok(mockContainer.innerHTML.includes('cloze-live-preview-box'), 'Has live preview box');
  
  // Must NOT have duplicate cloze-editor-box with redundant label
  assert.ok(!mockContainer.innerHTML.includes('cloze-editor-box'), 'Removes redundant cloze-editor-box');
  assert.ok(!mockContainer.innerHTML.includes('Nhập câu hoặc đoạn văn bản chứa token định dạng'), 'Removes redundant helper text');
});

test('Inline Cloze: input or table insertion into rich editor triggers real-time live preview update', () => {
  let visualInputListener = null;

  const mockPreviewEl = {
    innerHTML: ''
  };

  const mockVisualEl = {
    innerHTML: '<p>Initial</p>',
    style: { display: 'block' },
    addEventListener: (evt, handler) => {
      if (evt === 'input') visualInputListener = handler;
    }
  };

  const mockCodeEl = {
    value: '<p>Initial</p>',
    style: { display: 'none' },
    addEventListener: () => {}
  };

  const mockWrap = {
    getAttribute: (attr) => {
      if (attr === 'data-block-idx') return '0';
      if (attr === 'data-item-idx') return '0';
      return null;
    },
    querySelector: (sel) => {
      if (sel === '.rich-editor-visual') return mockVisualEl;
      if (sel === '.rich-editor-code, textarea') return mockCodeEl;
      if (sel === '.btn-toggle-html-mode') return { addEventListener: () => {} };
      if (sel === '.btn-rich-insert-table') return { addEventListener: () => {} };
      if (sel === '.btn-rich-insert-image') return { addEventListener: () => {} };
      return null;
    },
    querySelectorAll: () => [],
    closest: (sel) => {
      if (sel === '.builder-item-card') {
        return {
          querySelector: (sub) => {
            if (sub === '.cloze-preview-content') return mockPreviewEl;
            return null;
          }
        };
      }
      return null;
    }
  };

  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.rich-html-editor-wrap') return [mockWrap];
      return [];
    }
  };

  const mockForm = {
    id: '46010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Realtime Cloze Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '46010000-0000-4000-8000-000000000002',
      title: 'Realtime Cloze Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'it-realtime-cloze',
              position: 75,
              prompt: 'Initial text (75) __________',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              graderType: 'accepted_text',
              maxScore: 1,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'it-realtime-cloze': { graderType: 'accepted_text', accepted: ['val'] }
      }
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  assert.ok(typeof visualInputListener === 'function', 'Attaches input listener to visual contenteditable');

  // Simulate user inserting a table with blanks
  const tableWithBlanks = `
    <table class="cloze-table">
      <thead><tr><th>Mục</th><th>Thông tin</th></tr></thead>
      <tbody>
        <tr><td>Places to visit</td><td>six (75) __________ Caribbean islands</td></tr>
        <tr><td>On-board activities</td><td>Food and (76) __________ dinner</td></tr>
      </tbody>
    </table>
  `;

  mockVisualEl.innerHTML = tableWithBlanks;
  visualInputListener();

  // Verify preview was re-rendered with the table
  assert.ok(mockPreviewEl.innerHTML.includes('<table class="cloze-table">'), 'Live preview contains table markup');
  assert.ok(mockPreviewEl.innerHTML.includes('inline-fill-input'), 'Live preview contains embedded input fields');
  assert.ok(mockPreviewEl.innerHTML.includes('Places to visit'), 'Live preview contains table cells');
});


