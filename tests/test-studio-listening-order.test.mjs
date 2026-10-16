import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateListeningOrderUniqueness,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('validateListeningOrderUniqueness detects valid sequential assignments without duplicates', () => {
  const validEvents = [
    { label: 'A', rank: 3, text: 'American families are changing' },
    { label: 'B', rank: 4, text: 'Many marriages end in divorce' },
    { label: 'C', rank: 1, text: 'The changing family types' },
    { label: 'D', rank: 5, text: 'Decrease in traditional families' },
    { label: 'E', rank: 2, text: 'Families are smaller' }
  ];

  const result = validateListeningOrderUniqueness(validEvents);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.duplicates, []);
  assert.deepEqual(result.missingRanks, []);
});

test('validateListeningOrderUniqueness detects duplicate ranks and missing ranks', () => {
  const invalidEvents = [
    { label: 'A', rank: 1, text: 'Event A' },
    { label: 'B', rank: 1, text: 'Event B' }, // Duplicate rank 1
    { label: 'C', rank: 2, text: 'Event C' },
    { label: 'D', rank: 4, text: 'Event D' },
    { label: 'E', rank: 5, text: 'Event E' }  // Missing rank 3
  ];

  const result = validateListeningOrderUniqueness(invalidEvents);
  assert.equal(result.isValid, false);
  assert.deepEqual(result.duplicates, [1]);
  assert.deepEqual(result.missingRanks, [3]);
});

test('validateListeningOrderUniqueness handles empty or single event gracefully', () => {
  assert.equal(validateListeningOrderUniqueness([]).isValid, false);
  assert.equal(validateListeningOrderUniqueness(null).isValid, false);
  assert.equal(validateListeningOrderUniqueness([{ label: 'A', rank: 1 }]).isValid, false);
});

test('renderTestBuilderView provides button to add listening order template and renders editor controls', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '09010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Listening Order Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '09010000-0000-4000-8000-000000000001',
      title: 'Listening Order Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b0901',
          checkpoint: 1,
          title: 'Listening · Sắp xếp thứ tự sự kiện',
          instructions: 'Listen and order the sentences from A to E.',
          audioUrl: 'assets/34/test-1/listening.mp3',
          items: [
            {
              itemFamilyId: 'f0901',
              itemVersionId: 'i0901',
              position: 1,
              prompt: 'Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:',
              helpText: '',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'exact_option',
              maxScore: 5,
              audioUrl: 'assets/34/test-1/listening.mp3',
              events: [
                { label: 'A', rank: 3, text: 'American families are changing' },
                { label: 'B', rank: 4, text: 'Many marriages end in divorce' },
                { label: 'C', rank: 1, text: 'The changing family types' },
                { label: 'D', rank: 5, text: 'Decrease in traditional families' },
                { label: 'E', rank: 2, text: 'Families are smaller' }
              ],
              options: [
                { id: 'A', label: 'Sự kiện A' },
                { id: 'B', label: 'Sự kiện B' },
                { id: 'C', label: 'Sự kiện C' },
                { id: 'D', label: 'Sự kiện D' },
                { id: 'E', label: 'Sự kiện E' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i0901: {
          graderType: 'ordered_sequence',
          expectedSequence: ['C', 'E', 'A', 'B', 'D']
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-listening-order'), 'Provides button to add listening order template');
  assert.ok(container.innerHTML.includes('template-listening-order'), 'Renders template-listening-order section');
  assert.ok(container.innerHTML.includes('input-listening-audio'), 'Renders audio track input');
  assert.ok(container.innerHTML.includes('listening-event-row'), 'Renders event rows for ordering');
  assert.ok(container.innerHTML.includes('select-event-rank'), 'Renders rank selector for each event');
  assert.ok(container.innerHTML.includes('timeline-preview-bar'), 'Renders timeline sequence preview');
  assert.ok(container.innerHTML.includes('Thứ tự hợp lệ (5 bước)'), 'Displays validation badge when ranks are unique');
});

test('renderTestBuilderView displays warning status when listening order ranks are duplicated', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '09010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Duplicate Rank Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '09010000-0000-4000-8000-000000000002',
      title: 'Duplicate Rank Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b0902',
          checkpoint: 1,
          title: 'Listening · Trùng thứ tự',
          items: [
            {
              itemFamilyId: 'f0902',
              itemVersionId: 'i0902',
              position: 1,
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              maxScore: 5,
              events: [
                { label: 'A', rank: 1, text: 'Event A' },
                { label: 'B', rank: 1, text: 'Event B' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('Trùng hoặc thiếu thứ tự'), 'Shows warning for duplicate ranks');
  assert.ok(container.innerHTML.includes('Trùng [#1]'), 'Identifies duplicated rank 1');
});
