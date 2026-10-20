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

test('Test Studio: Listening order card displays correct pedagogical badge and event-based maxScore', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '09010000-0000-4000-8000-000000000003',
    version: 1,
    status: 'draft',
    title: 'Listening Order Badge Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '09010000-0000-4000-8000-000000000003',
      title: 'Listening Order Badge Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b0903',
          checkpoint: 1,
          title: 'Listening',
          items: [
            {
              itemFamilyId: 'f0903',
              itemVersionId: 'i0903',
              position: 51,
              prompt: 'Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'ordered_sequence',
              maxScore: 5,
              events: [
                { label: 'A', rank: 1, text: 'Event A' },
                { label: 'B', rank: 2, text: 'Event B' },
                { label: 'C', rank: 3, text: 'Event C' },
                { label: 'D', rank: 4, text: 'Event D' },
                { label: 'E', rank: 5, text: 'Event E' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i0903: {
          graderType: 'ordered_sequence',
          expectedSequence: ['A', 'B', 'C', 'D', 'E']
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(
    container.innerHTML.includes('<span class="item-kind-pill listening_order">Sắp xếp thứ tự nghe (Listening Order)</span>'),
    'Displays "Sắp xếp thứ tự nghe (Listening Order)" badge in card header'
  );
  assert.ok(
    container.innerHTML.includes('value="5"'),
    'Initializes maxScore input to 5 matching 5 events'
  );
});

test('Test Studio: Adding or deleting listening events automatically recalculates maxScore', () => {
  const listeners = {};
  const queryMap = {};

  const container = {
    innerHTML: '',
    querySelector: (sel) => queryMap[sel] || null,
    querySelectorAll: (sel) => {
      if (sel === '.btn-add-listening-event') {
        return [{
          getAttribute: (attr) => (attr === 'data-block-idx' ? '0' : '0'),
          addEventListener: (evt, cb) => { listeners['addEvent'] = cb; }
        }];
      }
      if (sel === '.btn-del-event') {
        return [{
          getAttribute: (attr) => (attr === 'data-block-idx' ? '0' : attr === 'data-item-idx' ? '0' : '0'),
          addEventListener: (evt, cb) => { listeners['delEvent'] = cb; }
        }];
      }
      return [];
    }
  };

  const mockForm = {
    id: '09010000-0000-4000-8000-000000000004',
    version: 1,
    status: 'draft',
    title: 'Event Score Recalculation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '09010000-0000-4000-8000-000000000004',
      title: 'Event Score Recalculation Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b0904',
          checkpoint: 1,
          title: 'Listening',
          items: [
            {
              itemFamilyId: 'f0904',
              itemVersionId: 'i0904',
              position: 51,
              prompt: 'Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'ordered_sequence',
              maxScore: 5,
              events: [
                { label: 'A', rank: 1, text: 'Event A' },
                { label: 'B', rank: 2, text: 'Event B' },
                { label: 'C', rank: 3, text: 'Event C' },
                { label: 'D', rank: 4, text: 'Event D' },
                { label: 'E', rank: 5, text: 'Event E' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i0904: {
          graderType: 'ordered_sequence',
          expectedSequence: ['A', 'B', 'C', 'D', 'E']
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('value="5"'), 'Initial score is 5');

  // Trigger add event button
  if (listeners['addEvent']) {
    listeners['addEvent']();
    assert.ok(container.innerHTML.includes('value="6"'), 'maxScore input updated to 6');
    assert.ok(container.innerHTML.includes('Sự kiện F'), 'Added event F');
  }

  // Trigger delete event button
  if (listeners['delEvent']) {
    listeners['delEvent']();
    assert.ok(container.innerHTML.includes('value="5"'), 'maxScore input decreased back to 5');
  }
});


