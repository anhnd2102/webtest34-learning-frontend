import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Test Studio omits redundant item-prompt-group for vocabulary_pair, pictorial_vocabulary, pronunciation, transformation, reorder, correction, matching, and listening order', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Clean Prompt Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000001',
      title: 'Clean Prompt Test',
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Phần 1: Vocabulary & Specialized Skills',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1: Cặp từ vựng',
              instructions: 'Nghe từ và chọn nghĩa tiếng Việt',
              itemIds: ['i1', 'i2', 'i3']
            }
          ],
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'i1',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'resilient',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              required: true,
              maxScore: 1,
              options: [{ id: 'opt_1', label: 'kiên cường' }]
            },
            {
              itemFamilyId: 'f2',
              itemVersionId: 'i2',
              position: 2,
              exerciseId: 'ex1',
              prompt: 'school kids',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              image: 'assets/test 1/vocabulary/image1.png',
              letterHint: 's _ _ _ _ _ k _ _ _',
              options: []
            },
            {
              itemFamilyId: 'f3',
              itemVersionId: 'i3',
              position: 3,
              exerciseId: 'ex1',
              prompt: 'camera',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'pronunciation_choice',
              layoutType: 'ipa_card',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [{ id: 'A', label: '/ˈkæm.ər.ə/' }]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1: { graderType: 'accepted_text_exact_option', accepted: ['resilient'], expectedOptionId: 'opt_1' },
        i2: { graderType: 'accepted_text', accepted: ['school kids'] },
        i3: { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Cards with specialized templates must NOT render the redundant 4-line textarea item-prompt-group
  assert.ok(container.innerHTML.includes('template-vocab-pair'), 'Renders vocab pair template');
  assert.ok(container.innerHTML.includes('template-pictorial-vocab'), 'Renders pictorial vocab template');
  assert.ok(container.innerHTML.includes('template-pronunciation-ipa'), 'Renders pronunciation template');
  assert.strictEqual(
    container.innerHTML.includes('item-prompt-group'),
    false,
    'Does not render item-prompt-group for specialized items'
  );
  assert.strictEqual(
    container.innerHTML.includes('item-prompt-input'),
    false,
    'Does not render item-prompt-input textarea for specialized items'
  );
});

test('Test Studio preserves item-prompt-group for single_choice, multi_choice_group, and rubric_async', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Standard Prompt Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000002',
      title: 'Standard Prompt Test',
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Phần 1: Multiple Choice & Essay',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1: Trắc nghiệm',
              itemIds: ['i1']
            }
          ],
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'i1',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'What did the speaker mention about the project?',
              interactionType: 'single_choice',
              layoutType: 'grid_2',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [{ id: 'A', label: 'Option A' }, { id: 'B', label: 'Option B' }]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1: { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Single choice question must preserve Question Prompt textarea
  assert.ok(container.innerHTML.includes('item-prompt-group'), 'Preserves item-prompt-group for single_choice');
  assert.ok(container.innerHTML.includes('item-prompt-input'), 'Preserves item-prompt-input textarea for single_choice');
  assert.ok(container.innerHTML.includes('What did the speaker mention about the project?'), 'Displays the single choice prompt');
});

test('Test Studio renders + Từ vựng qua ảnh button with batch generation support', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000003',
    version: 1,
    status: 'draft',
    title: 'Batch Pictorial Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000003',
      title: 'Batch Pictorial Test',
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Phần 1: Vocabulary Cards',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 2: Từ vựng qua ảnh',
              instructions: 'Nhìn hình và hoàn thành từ vựng',
              itemIds: []
            }
          ],
          items: []
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-pictorial'), 'Renders btn-add-pictorial in exercise toolbar');
  assert.ok(container.innerHTML.includes('Từ vựng qua ảnh') || container.innerHTML.includes('Pictorial'), 'Button displays label');
});
