import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandSentenceVariants,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

// Chi tiết quy tắc sinh biến thể (spec #54) nằm ở tests/answer-variants.test.mjs; ở đây giữ kiểm tra lối gọi cũ qua app.
test('expandSentenceVariants (lối gọi cũ) vẫn sinh rút gọn, tùy chọn (s)/(the), đơn vị, số, viết tắt, chính tả', () => {
  const variants = expandSentenceVariants(["I'm a big fan of nature."]);
  assert.ok(variants.includes("I'm a big fan of nature."));
  assert.ok(variants.includes("I am a big fan of nature."));
  assert.ok(variants.length <= 12, 'tối đa 12 biến thể');
  assert.ok(expandSentenceVariants(["don't, stop"]).includes('do not stop'));

  assert.equal(expandSentenceVariants(['hospital']).includes('the hospital'), false);
  assert.ok(expandSentenceVariants(['car(s)']).includes('cars'));
  assert.ok(expandSentenceVariants(['(the) hospital']).includes('the hospital'));
  assert.ok(expandSentenceVariants(['help sb with sth']).some(v => v.includes('help somebody with something')));
  assert.ok(expandSentenceVariants(['5 km and 2 hrs']).some(v => v.includes('5 kilometres')));
  assert.ok(expandSentenceVariants(['approx. 20 dept.']).some(v => v.includes('approximately')));
  assert.ok(expandSentenceVariants(['well-being and timetable']).some(v => v.includes('wellbeing')));
  assert.ok(expandSentenceVariants(['1st floor, 3 books']).some(v => v.includes('first floor')));
  assert.ok(expandSentenceVariants(['colour and theatre']).some(v => v.includes('color')));
});

test('expandSentenceVariants không còn nối dấu gạch cho cụm 2 từ, không sinh biến thể khoảng cách quanh dấu -, nháy cong hay tước hiệu', () => {
  assert.deepEqual(expandSentenceVariants(['New York']), ['New York']);
  assert.deepEqual(expandSentenceVariants(['non-governmental']), ['non-governmental']);
  assert.deepEqual(expandSentenceVariants(['Mr.A']), ['Mr.A']);
  assert.deepEqual(expandSentenceVariants(['I was so tired']), ['I was so tired']);
});

test('renderTestBuilderView renders single choice template with responsive grid and answer key selector', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Single Choice Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000001',
      title: 'Single Choice Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Part 1',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f1',
              itemVersionId: '03010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Choose the correct color',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_3',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Blue' },
                { id: 'B', label: 'Red' },
                { id: 'C', label: 'Green' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '03010000-0000-4000-8000-0000000000i1': {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('Choose the correct color'));
  assert.ok(container.innerHTML.includes('grid-cols-3') || container.innerHTML.includes('grid_3'));
  assert.ok(container.innerHTML.includes('Blue'));
  assert.ok(container.innerHTML.includes('Red'));
  assert.ok(container.innerHTML.includes('Green'));
  assert.ok(container.innerHTML.includes('checked') || container.innerHTML.includes('data-correct="A"'));
});

test('renderTestBuilderView renders multi-select group template with unordered_group_slot', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Multi-Select Group Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000002',
      title: 'Multi-Select Group Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b2',
          checkpoint: 1,
          title: 'Part 2',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f2',
              itemVersionId: '03010000-0000-4000-8000-0000000000i2',
              position: 2,
              prompt: 'Select TWO sports (Slot 1)',
              interactionType: 'multi_choice_group',
              pedagogicalTypeCode: 'multiple_choice_group',
              layoutType: 'grid_2',
              graderType: 'unordered_group_slot',
              groupId: 'group_sports_1',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Football' },
                { id: 'B', label: 'Swimming' },
                { id: 'C', label: 'Running' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      groups: {
        'group_sports_1': {
          graderType: 'unordered_group_slot',
          expectedOptionIds: ['A', 'C']
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('Select TWO sports'));
  assert.ok(container.innerHTML.includes('unordered_group_slot') || container.innerHTML.includes('Nhóm'));
  assert.ok(container.innerHTML.includes('group_sports_1'));
  assert.ok(container.innerHTML.includes('Football'));
});

test('renderTestBuilderView renders fill-in-the-blank with accepted-answer chip previews', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000003',
    version: 1,
    status: 'draft',
    title: 'Fill In The Blank Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000003',
      title: 'Fill In The Blank Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b3',
          checkpoint: 1,
          title: 'Part 3',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f3',
              itemVersionId: '03010000-0000-4000-8000-0000000000i3',
              position: 3,
              prompt: 'Fill in the blank: He is interested in _______',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'fill_in_the_blank',
              layoutType: 'default',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '03010000-0000-4000-8000-0000000000i3': {
          graderType: 'accepted_text',
          accepted: ['reading books', 'reading book'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('He is interested in _______'));
  assert.ok(container.innerHTML.includes('reading books'));
  assert.ok(container.innerHTML.includes('variant-chip') || container.innerHTML.includes('accepted-chip'));
});

test('btn-generate-variants (Tạo lại biến thể) thay danh sách theo quy tắc mới, hỏi trước khi làm mất biến thể tự thêm, và nâng câu lên v2', () => {
  let generateClickListener = null;
  const confirms = [];
  globalThis.window = { ...(globalThis.window || {}), confirm: message => { confirms.push(message); return confirmAnswer; }, scrollTo: undefined };
  let confirmAnswer = false;

  const rawInputMock = {
    value: '(the) hospital',
    getAttribute: () => null
  };

  const cardMock = {
    querySelector: (sel) => {
      if (sel === '.input-fitb-raw') return rawInputMock;
      return null;
    },
    closest: () => null
  };

  const genBtnMock = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '0';
      if (name === 'data-blank-num') return null;
      return null;
    },
    closest: (sel) => {
      if (sel === '.builder-item-card') return cardMock;
      return null;
    },
    addEventListener: (evt, fn) => {
      if (evt === 'click') generateClickListener = fn;
    }
  };

  const container = {
    innerHTML: '',
    querySelectorAll: (sel) => {
      if (sel === '.btn-generate-variants') return [genBtnMock];
      return [];
    },
    querySelector: () => null
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000004',
    version: 1,
    status: 'draft',
    title: 'Variant Preservation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000004',
      title: 'Variant Preservation Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b4',
          checkpoint: 1,
          title: 'Part 1',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f4',
              itemVersionId: '03010000-0000-4000-8000-0000000000i4',
              position: 1,
              prompt: 'Fill word',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'fill_in_the_blank',
              layoutType: 'default',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '03010000-0000-4000-8000-0000000000i4': {
          graderType: 'accepted_text',
          accepted: ['custom_teacher_variant_123', '(the) hospital'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Before clicking generate, custom variant is present
  assert.ok(container.innerHTML.includes('custom_teacher_variant_123'));
  assert.ok(typeof generateClickListener === 'function', 'Listener should be bound');

  // Giáo viên từ chối: không có gì đổi, vẫn hỏi và nêu biến thể sẽ mất.
  generateClickListener();
  assert.equal(confirms.length, 1);
  assert.match(confirms[0], /custom_teacher_variant_123/);
  assert.ok(container.innerHTML.includes('custom_teacher_variant_123'), 'từ chối thì giữ nguyên');

  // Giáo viên đồng ý: danh sách được thay bằng bộ sinh mới; câu được nâng lên v2.
  confirmAnswer = true;
  generateClickListener();
  assert.equal(confirms.length, 2);
  assert.equal(container.innerHTML.includes('custom_teacher_variant_123'), false, 'biến thể tự thêm bị thay');
  assert.ok(container.innerHTML.includes('the hospital'), 'biến thể sinh theo quy tắc mới có mặt');
  delete globalThis.window;
});
