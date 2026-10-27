import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getItemSpanCount,
  updatePromptPosition,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('getItemSpanCount correctly computes spanCount for inline cloze, listening order, and standard items', () => {
  // Standard items
  assert.equal(getItemSpanCount({ interactionType: 'single_choice' }), 1);
  assert.equal(getItemSpanCount({ interactionType: 'text_select_pair' }), 1);
  assert.equal(getItemSpanCount({ interactionType: 'short_text' }), 1);

  // Listening Order item
  const listeningOrder = {
    interactionType: 'short_text',
    pedagogicalTypeCode: 'listening_order',
    layoutType: 'timeline_sequence',
    events: [
      { label: 'A', rank: 1, text: 'Event A' },
      { label: 'B', rank: 2, text: 'Event B' },
      { label: 'C', rank: 3, text: 'Event C' },
      { label: 'D', rank: 4, text: 'Event D' },
      { label: 'E', rank: 5, text: 'Event E' }
    ]
  };
  assert.equal(getItemSpanCount(listeningOrder), 5);

  // Inline Cloze with 5 blanks
  const cloze5 = {
    interactionType: 'short_text',
    layoutType: 'inline_cloze',
    prompt: `My favorite teacher - Mr. Lambert\n(1)____ short legs\n(2)___ English\n(3)____ wastebasket\n(4)____ excited\n(5)_____ angry`
  };
  assert.equal(getItemSpanCount(cloze5), 5);

  // Inline Cloze with 0 detected blanks defaults to minimum 1
  const clozeEmpty = {
    interactionType: 'short_text',
    layoutType: 'inline_cloze',
    prompt: 'Short cloze prompt without any blanks yet.'
  };
  assert.equal(getItemSpanCount(clozeEmpty), 1);
});

test('renderTestBuilderView displays span-formatted header pills for multi-item cards and Câu X for single-item cards', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Span Header Pill Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000001',
      title: 'Span Header Pill Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b-01',
          checkpoint: 1,
          title: 'Listening & Reading',
          items: [
            {
              itemFamilyId: 'f-01',
              itemVersionId: 'i-01',
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
            },
            {
              itemFamilyId: 'f-02',
              itemVersionId: 'i-02',
              position: 56,
              prompt: 'Đoạn văn điền từ: (1)____ text (2)___ text (3)____ text (4)____ text (5)_____ text',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 5
            },
            {
              itemFamilyId: 'f-03',
              itemVersionId: 'i-03',
              position: 61,
              prompt: 'Câu 61: Chọn đáp án đúng',
              interactionType: 'single_choice',
              options: [
                { id: 'A', label: 'Option A' },
                { id: 'B', label: 'Option B' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'i-01': { graderType: 'ordered_sequence', expectedSequence: ['A', 'B', 'C', 'D', 'E'] },
        'i-02': { graderType: 'accepted_text', accepted: ['answer'] },
        'i-03': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(
    container.innerHTML.includes('Câu 51 – 55 (5 bước sự kiện)'),
    'Displays "Câu 51 – 55 (5 bước sự kiện)" for 5-event listening order card'
  );
  assert.ok(
    container.innerHTML.includes('Câu 56 – 60 (5 chỗ trống)'),
    'Displays "Câu 56 – 60 (5 chỗ trống)" for 5-blank inline cloze card'
  );
  assert.ok(
    container.innerHTML.includes('<span class="item-pos-pill">Câu 61</span>') ||
    container.innerHTML.includes('Câu 61'),
    'Displays "Câu 61" for single-item card'
  );
});

test('resequenceItemPositions allocates spans and ensures subsequent items start at X + Span', () => {
  const listeners = {};
  const queryMap = {};

  const container = {
    innerHTML: '',
    querySelector: (sel) => queryMap[sel] || null,
    querySelectorAll: (sel) => {
      if (sel === '.btn-move-item-down') {
        return [{
          getAttribute: (attr) => attr === 'data-block-idx' ? '0' : '0',
          addEventListener: (evt, cb) => { listeners['move-down-0'] = cb; }
        }];
      }
      return [];
    }
  };

  const mockForm = {
    id: '04030000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Resequencing Continuous Spans Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000002',
      title: 'Resequencing Continuous Spans Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b-02',
          checkpoint: 1,
          title: 'Block 1',
          items: [
            {
              itemFamilyId: 'f-11',
              itemVersionId: 'i-11',
              position: 1,
              prompt: 'Câu 1: Câu hỏi mở đầu',
              interactionType: 'single_choice',
              options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
            },
            {
              itemFamilyId: 'f-12',
              itemVersionId: 'i-12',
              position: 2,
              prompt: 'Nghe và sắp xếp thứ tự:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'ordered_sequence',
              maxScore: 5,
              events: [
                { label: 'A', rank: 1, text: 'A' },
                { label: 'B', rank: 2, text: 'B' },
                { label: 'C', rank: 3, text: 'C' },
                { label: 'D', rank: 4, text: 'D' },
                { label: 'E', rank: 5, text: 'E' }
              ]
            },
            {
              itemFamilyId: 'f-13',
              itemVersionId: 'i-13',
              position: 3, // intentionally wrong initial position
              prompt: 'Đoạn văn điền từ: (1)____ text (2)___ text (3)____ text (4)____ text (5)_____ text',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 5
            },
            {
              itemFamilyId: 'f-14',
              itemVersionId: 'i-14',
              position: 4, // intentionally wrong initial position
              prompt: 'Câu hỏi sau cloze',
              interactionType: 'single_choice',
              options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'i-11': { graderType: 'exact_option', expectedOptionId: 'A' },
        'i-12': { graderType: 'ordered_sequence', expectedSequence: ['A', 'B', 'C', 'D', 'E'] },
        'i-13': { graderType: 'accepted_text', accepted: ['answer'] },
        'i-14': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Trigger move down on item 0 (swapping Item 1 with Item 2)
  if (listeners['move-down-0']) {
    listeners['move-down-0']();

    // Now:
    // Item 1 is Listening Order (span 5) -> starts at pos 1 -> Câu 1 – 5
    // Item 2 is Single Choice (span 1) -> starts at pos 6 (1 + 5) -> Câu 6
    // Item 3 is Cloze (span 5) -> starts at pos 7 (6 + 1) -> Câu 7 – 11
    // Item 4 is Single Choice (span 1) -> starts at pos 12 (7 + 5) -> Câu 12
    assert.ok(container.innerHTML.includes('Câu 1 – 5 (5 bước sự kiện)'), 'Listening order starts at Câu 1 – 5');
    assert.ok(container.innerHTML.includes('Câu 6'), 'Single choice follows at Câu 6');
    assert.ok(container.innerHTML.includes('Câu 7 – 11 (5 chỗ trống)'), 'Inline cloze follows at Câu 7 – 11');
    assert.ok(container.innerHTML.includes('Câu 12'), 'Last single choice follows at Câu 12');
  }
});

test('Total exam question count reflects the sum of all item spans', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000003',
    version: 1,
    status: 'draft',
    title: 'Total Questions Count Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000003',
      title: 'Total Questions Count Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b-03',
          checkpoint: 1,
          title: 'Block 1',
          items: [
            {
              itemFamilyId: 'f-21',
              itemVersionId: 'i-21',
              position: 1,
              prompt: 'Câu 1:',
              interactionType: 'single_choice',
              options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
            },
            {
              itemFamilyId: 'f-22',
              itemVersionId: 'i-22',
              position: 2,
              prompt: 'Nghe và sắp xếp thứ tự:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'ordered_sequence',
              maxScore: 5,
              events: [
                { label: 'A', rank: 1, text: 'A' },
                { label: 'B', rank: 2, text: 'B' },
                { label: 'C', rank: 3, text: 'C' },
                { label: 'D', rank: 4, text: 'D' },
                { label: 'E', rank: 5, text: 'E' }
              ]
            },
            {
              itemFamilyId: 'f-23',
              itemVersionId: 'i-23',
              position: 7,
              prompt: 'Đoạn văn điền từ: (1)____ text (2)___ text (3)____ text (4)____ text (5)_____ text',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 5
            },
            {
              itemFamilyId: 'f-24',
              itemVersionId: 'i-24',
              position: 12,
              prompt: 'Câu hỏi sau cloze',
              interactionType: 'single_choice',
              options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'i-21': { graderType: 'exact_option', expectedOptionId: 'A' },
        'i-22': { graderType: 'ordered_sequence', expectedSequence: ['A', 'B', 'C', 'D', 'E'] },
        'i-23': { graderType: 'accepted_text', accepted: ['answer'] },
        'i-24': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Total questions is 1 (single) + 5 (listening order) + 5 (inline cloze) + 1 (single) = 12 câu hỏi
  assert.ok(
    container.innerHTML.includes('12 câu hỏi') || container.innerHTML.includes('12 câu'),
    'Displays total of 12 questions in summary'
  );
});

test('Adding a blank token or deleting an event dynamically updates question spans and shifts all subsequent questions', () => {
  const listeners = {};
  const queryMap = {};

  const container = {
    innerHTML: '',
    querySelector: (sel) => queryMap[sel] || null,
    querySelectorAll: (sel) => {
      if (sel === '.btn-insert-blank-token') {
        return [{
          getAttribute: (attr) => (attr === 'data-block-idx' ? '0' : '1'),
          addEventListener: (evt, cb) => { listeners['insert-blank-1'] = cb; }
        }];
      }
      if (sel === '.btn-del-event') {
        return [{
          getAttribute: (attr) => (attr === 'data-block-idx' ? '0' : attr === 'data-item-idx' ? '0' : '0'),
          addEventListener: (evt, cb) => { listeners['del-event-0'] = cb; }
        }];
      }
      return [];
    }
  };

  const mockForm = {
    id: '04030000-0000-4000-8000-000000000004',
    version: 1,
    status: 'draft',
    title: 'Dynamic Blank & Event Shift Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000004',
      title: 'Dynamic Blank & Event Shift Test',
      durationMinutes: 40,
      blocks: [
        {
          blockId: 'b-04',
          checkpoint: 1,
          title: 'Block 1',
          items: [
            {
              itemFamilyId: 'f-31',
              itemVersionId: 'i-31',
              position: 51,
              prompt: 'Sắp xếp thứ tự:',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'listening_order',
              layoutType: 'timeline_sequence',
              graderType: 'ordered_sequence',
              maxScore: 5,
              events: [
                { label: 'A', rank: 1, text: 'A' },
                { label: 'B', rank: 2, text: 'B' },
                { label: 'C', rank: 3, text: 'C' },
                { label: 'D', rank: 4, text: 'D' },
                { label: 'E', rank: 5, text: 'E' }
              ]
            },
            {
              itemFamilyId: 'f-32',
              itemVersionId: 'i-32',
              position: 56,
              prompt: 'Điền vào chỗ trống: (1)____ text (2)___ text',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 2
            },
            {
              itemFamilyId: 'f-33',
              itemVersionId: 'i-33',
              position: 58,
              prompt: 'Câu hỏi sau cùng',
              interactionType: 'single_choice',
              options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'i-31': { graderType: 'ordered_sequence', expectedSequence: ['A', 'B', 'C', 'D', 'E'] },
        'i-32': { graderType: 'accepted_text', accepted: ['answer'] },
        'i-33': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Initial render:
  // Item 0: Listening Order span 5 -> Câu 51 – 55
  // Item 1: Cloze span 2 -> Câu 56 – 57
  // Item 2: Single Choice -> Câu 58
  assert.ok(container.innerHTML.includes('Câu 51 – 55 (5 bước sự kiện)'), 'Initial listening order is 51-55');
  assert.ok(container.innerHTML.includes('Câu 56 – 57 (2 chỗ trống)'), 'Initial cloze is 56-57');
  assert.ok(container.innerHTML.includes('Câu 58'), 'Initial last question is Câu 58');

  // Trigger insert blank token into Item 1 (Cloze) -> adds (3) __________
  if (listeners['insert-blank-1']) {
    listeners['insert-blank-1']();

    // Now:
    // Item 0: Listening Order span 5 -> Câu 51 – 55
    // Item 1: Cloze span 3 -> Câu 56 – 58 (3 chỗ trống)
    // Item 2: Single Choice -> Câu 59 (shifted by +1)
    assert.ok(container.innerHTML.includes('Câu 56 – 58 (3 chỗ trống)'), 'Cloze updated to 3 blanks: Câu 56 – 58');
    assert.ok(container.innerHTML.includes('Câu 59'), 'Subsequent question automatically shifted to Câu 59');
  }

  // Trigger delete event from Item 0 (Listening Order) -> reduces from 5 to 4 events
  if (listeners['del-event-0']) {
    listeners['del-event-0']();

    // Now:
    // Item 0: Listening Order span 4 -> Câu 51 – 54
    // Item 1: Cloze span 3 -> Câu 55 – 57 (3 chỗ trống) (shifted back by 1)
    // Item 2: Single Choice -> Câu 58 (shifted back to 58)
    assert.ok(container.innerHTML.includes('Câu 51 – 54 (4 bước sự kiện)'), 'Listening order reduced to 4 events: Câu 51 – 54');
    assert.ok(container.innerHTML.includes('Câu 55 – 57 (3 chỗ trống)'), 'Cloze shifted back to start at Câu 55');
    assert.ok(container.innerHTML.includes('Câu 58'), 'Last question shifted back to Câu 58');
  }
});
