import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseClozeBlanks,
  renderInlineClozeMarkup,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('parseClozeBlanks detects (n)____ tokens and extracts positions', () => {
  const sample = `
Type: One-week cruise
Departure: Miami, Florida
Places to visit: six (1) __________ Caribbean islands
On-board activities:
- A wide range of food for breakfast, (2) __________, and dinner.
- Children can also play (3) __________, go swimming, or join classes
- Parents can relax on the ship's deck in (4) __________
  `;

  const blanks = parseClozeBlanks(sample);
  assert.equal(blanks.length, 4, 'Should detect 4 blanks');
  assert.equal(blanks[0].number, 1);
  assert.equal(blanks[1].number, 2);
  assert.equal(blanks[2].number, 3);
  assert.equal(blanks[3].number, 4);
});

test('parseClozeBlanks also supports {{n}} curly bracket tokens', () => {
  const sample = 'We visited six {{1}} islands and had {{2}} for lunch.';
  const blanks = parseClozeBlanks(sample);
  assert.equal(blanks.length, 2);
  assert.equal(blanks[0].number, 1);
  assert.equal(blanks[1].number, 2);
});

test('renderInlineClozeMarkup replaces tokens with input widgets embedded in text', () => {
  const sample = 'Departure from (1) __________ and visit (2) __________ islands.';
  const items = [
    { itemVersionId: 'item-1', position: 1, prompt: 'Chỗ trống (1)' },
    { itemVersionId: 'item-2', position: 2, prompt: 'Chỗ trống (2)' }
  ];

  const html = renderInlineClozeMarkup(sample, items);
  assert.ok(html.includes('class="inline-blank-wrapper"'), 'Renders inline blank wrapper');
  assert.ok(html.includes('data-item-id="item-1"'), 'Maps item 1 version ID');
  assert.ok(html.includes('data-item-id="item-2"'), 'Maps item 2 version ID');
  assert.ok(html.includes('(1)'), 'Renders blank badge (1)');
  assert.ok(html.includes('(2)'), 'Renders blank badge (2)');
});

test('renderTestBuilderView renders inline cloze question template with text area and blank configurations', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '07010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Inline Cloze Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '07010000-0000-4000-8000-000000000001',
      title: 'Inline Cloze Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b0701',
          checkpoint: 1,
          title: 'Listening · Điền bảng',
          instructions: 'Listen and complete the table below',
          items: [
            {
              itemFamilyId: 'f0701',
              itemVersionId: 'i0701',
              position: 1,
              prompt: 'Chỗ trống (1)',
              helpText: 'Places to visit',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'table_completion',
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
        i0701: {
          graderType: 'accepted_text',
          accepted: ['different']
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-inline-cloze'), 'Provides button to add inline cloze template');
  assert.ok(container.innerHTML.includes('template-inline-cloze'), 'Renders template-inline-cloze section');
  assert.ok(container.innerHTML.includes('btn-insert-blank-token'), 'Renders insert blank token action');
  assert.ok(container.innerHTML.includes('cloze-live-preview-box'), 'Renders cloze live preview box');
  assert.ok(container.innerHTML.includes('btn-generate-variants'), 'Renders auto variant generator');
});

test('renderInlineClozeMarkup preserves existing student responses in input values', () => {
  const sample = 'We booked (1) __________ tickets for (2) __________ passengers.';
  const items = [
    { itemVersionId: 'item-101', position: 1 },
    { itemVersionId: 'item-102', position: 2 }
  ];
  const responses = {
    'item-101': 'economy',
    'item-102': 'four'
  };

  const html = renderInlineClozeMarkup(sample, items, responses);
  assert.ok(html.includes('value="economy"'), 'Populates value for blank 1');
  assert.ok(html.includes('value="four"'), 'Populates value for blank 2');
});

test('renderInlineClozeMarkup renders table fill-in-the-blank rows correctly', () => {
  const tableText = `| Departure | Time | Activity |
| Miami | 08:00 | (1) __________ |
| Nassau | 14:00 | (2) __________ |`;
  const items = [
    { itemVersionId: 'it-1', position: 1 },
    { itemVersionId: 'it-2', position: 2 }
  ];

  const html = renderInlineClozeMarkup(tableText, items);
  assert.ok(html.includes('Miami'), 'Preserves preceding table text');
  assert.ok(html.includes('data-item-id="it-1"'), 'Embeds input widget for item 1 in row');
  assert.ok(html.includes('data-item-id="it-2"'), 'Embeds input widget for item 2 in row');
});

