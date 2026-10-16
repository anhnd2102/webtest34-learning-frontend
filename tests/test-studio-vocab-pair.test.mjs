import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('renderTestBuilderView renders vocabulary pair template with English text, variant generator and Vietnamese meaning selector', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Vocabulary Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Vocabulary Test',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Vocabulary Section',
          items: [
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f1',
              itemVersionId: '04010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'resilient',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'opt_1', label: 'kiên cường, có khả năng phục hồi' },
                { id: 'opt_2', label: 'dễ bị tổn thương' },
                { id: 'opt_3', label: 'bướng bỉnh' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '04010000-0000-4000-8000-0000000000i1': {
          graderType: 'accepted_text_exact_option',
          accepted: ['resilient'],
          expectedOptionId: 'opt_1',
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Checks for Authoring Card elements
  assert.ok(container.innerHTML.includes('template-vocab-pair'), 'contains vocab pair template container');
  assert.ok(container.innerHTML.includes('Cặp từ vựng (Vocabulary Pair - 50/50 Partial)'), 'contains type badge');
  assert.ok(container.innerHTML.includes('Từ tiếng Anh chuẩn (50% điểm)'), 'contains English prompt section');
  assert.ok(container.innerHTML.includes('resilient'), 'displays the target English word');
  assert.ok(container.innerHTML.includes('btn-generate-vocab-variants'), 'provides variant generator button');
  assert.ok(container.innerHTML.includes('Danh sách nghĩa tiếng Việt (50% điểm - Tích tròn nghĩa đúng)'), 'contains Vietnamese definition section');
  assert.ok(container.innerHTML.includes('kiên cường, có khả năng phục hồi'), 'displays option 1 label');
  assert.ok(container.innerHTML.includes('dễ bị tổn thương'), 'displays option 2 label');
  assert.ok(container.innerHTML.includes('radio-vocab-correct'), 'provides radio selector for correct definition');
  assert.ok(container.innerHTML.includes('data-correct="opt_1"'), 'marks opt_1 as correct');
  assert.ok(container.innerHTML.includes('btn-add-vocab-pair'), 'provides button to add new vocabulary pair');
});
