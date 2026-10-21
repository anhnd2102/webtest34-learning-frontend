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

