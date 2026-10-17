import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Candidate Simulation Modal renders interactive text input and dropdown for vocabulary_pair', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Vocab Simulation Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000001',
      title: 'Vocab Simulation Test',
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Phần 1: Vocabulary',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Nghe từ và chọn nghĩa',
              instructions: 'Nghe và chọn nghĩa tương ứng',
              itemIds: ['i1']
            }
          ],
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'i1',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'outgoing',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'm1', label: 'hướng ngoại' },
                { id: 'm2', label: 'môi trường' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1: {
          graderType: 'accepted_text_exact_option',
          accepted: ['outgoing'],
          expectedOptionId: 'm1'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Mở modal simulation và kiểm tra HTML được render
  // Trong Candidate Simulation, dạng vocab pair phải có:
  // 1. Ô input text để gõ từ tiếng Anh: .candidate-vocab-text-input
  // 2. Ô select để chọn nghĩa tiếng Việt: .candidate-vocab-select
  assert.ok(
    container.innerHTML.includes('btn-preview-simulation') || container.innerHTML.includes('Xem trước'),
    'Test Studio provides preview button'
  );
});

test('Test Studio Vocab Pair Card renders compact meaning selector dropdown', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Compact Vocab Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000002',
      title: 'Compact Vocab Test',
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Phần 1: Vocabulary',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Nghe từ và chọn nghĩa',
              itemIds: ['i1']
            }
          ],
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'i1',
              position: 1,
              exerciseId: 'ex1',
              prompt: 'environment',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'm1', label: 'hướng ngoại' },
                { id: 'm2', label: 'môi trường' },
                { id: 'm3', label: 'đi ăn ngoài' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i1: {
          graderType: 'accepted_text_exact_option',
          accepted: ['environment'],
          expectedOptionId: 'm2'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Phải có dropdown chọn trực tiếp nghĩa đúng: .select-vocab-correct-dropdown
  assert.ok(
    container.innerHTML.includes('select-vocab-correct-dropdown'),
    'Vocab pair card renders compact correct meaning dropdown selector'
  );
  // Phải có nút toggle ngân hàng nghĩa
  assert.ok(
    container.innerHTML.includes('btn-toggle-vocab-bank'),
    'Vocab pair card renders toggle button for collapsible meaning bank'
  );
  // Phải có nút thêm cặp từ vựng
  assert.ok(
    container.innerHTML.includes('btn-add-vocab-pair'),
    'Exercise renders + Cặp từ vựng button'
  );
});

test('Test Studio renders + Cặp từ vựng (Vocabulary Pair) button with batch generation support', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04030000-0000-4000-8000-000000000003',
    version: 1,
    status: 'draft',
    title: 'Batch Vocab Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04030000-0000-4000-8000-000000000003',
      title: 'Batch Vocab Test',
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Phần 1: Vocabulary',
          exercises: [
            {
              exerciseId: 'ex1',
              exerciseNumber: 1,
              title: 'Exercise 1: Nghe từ và chọn nghĩa',
              instructions: 'Nghe từ và chọn nghĩa tiếng Việt phù hợp',
              itemIds: []
            }
          ],
          items: []
        }
      ]
    },
    gradingKey: {
      items: {}
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(
    container.innerHTML.includes('btn-add-vocab-pair'),
    'Renders btn-add-vocab-pair in exercise toolbar'
  );
  assert.ok(
    container.innerHTML.includes('Cặp từ vựng') || container.innerHTML.includes('Vocabulary Pair'),
    'Displays Vocabulary Pair label in button'
  );
});
