import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

test('Clicking + Cặp từ vựng (Vocabulary Pair) resolves target exercise and renders vocab pair item', () => {
  const listeners = {};
  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: (selector) => {
      if (selector === '.btn-add-vocab-pair') {
        return [
          {
            getAttribute: (attr) => {
              if (attr === 'data-block-idx') return '0';
              if (attr === 'data-exercise-idx') return '0';
              if (attr === 'data-exercise-id') return 'ex_1';
              return null;
            },
            addEventListener: (event, handler) => {
              listeners['add-vocab-pair'] = handler;
            }
          }
        ];
      }
      return [];
    }
  };

  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Vocab Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Vocab Test',
      blocks: [
        {
          blockId: 'block_1',
          checkpoint: 1,
          title: 'Phần 1: Vocabulary',
          exercises: [
            {
              exerciseId: 'ex_1',
              exerciseNumber: 1,
              title: 'Exercise 1: Cặp từ vựng',
              instructions: 'Nối từ tiếng Anh với nghĩa tiếng Việt',
              itemIds: []
            }
          ],
          items: []
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
  };

  renderTestBuilderView(mockContainer, mockForm);

  // Initial render: exercise card exists with template button
  assert.ok(mockContainer.innerHTML.includes('btn-add-vocab-pair'), 'Template picker renders btn-add-vocab-pair');
  assert.ok(!mockContainer.innerHTML.includes('template-vocab-pair'), 'Initially no vocab pair item is rendered');

  // Trigger click listener
  assert.ok(typeof listeners['add-vocab-pair'] === 'function', 'Listener registered for btn-add-vocab-pair');
  listeners['add-vocab-pair']();

  // After click: vocab pair item must be rendered inside exercise
  assert.ok(mockContainer.innerHTML.includes('template-vocab-pair'), 'Renders template-vocab-pair after click');
  assert.ok(mockContainer.innerHTML.includes('Cặp từ vựng (Vocabulary Pair - 50/50 Partial)'), 'Shows correct item kind badge');
  assert.ok(mockContainer.innerHTML.includes('input-vocab-raw'), 'Shows English input field');
  assert.ok(mockContainer.innerHTML.includes('vocab-meaning-grid'), 'Shows Vietnamese meaning grid');
  assert.ok(mockContainer.innerHTML.includes('btn-add-vocab-option'), 'Shows + Thêm nghĩa button');
  assert.ok(mockContainer.innerHTML.includes('btn-bulk-paste-vocab-options'), 'Shows bulk paste button');
  assert.ok(mockContainer.innerHTML.includes('Câu 1'), 'Shows sequential question position Câu 1');
});
