import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio Item Resequencing: item controls provide move up/down and prompt resequencing', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const mockForm = {
    id: '04020000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Resequencing Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04020000-0000-4000-8000-000000000001',
      title: 'Resequencing Test',
      blocks: [
        {
          blockId: '04020000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Phần 1: Multiple Choice',
          items: [
            {
              itemFamilyId: '04020000-0000-4000-8000-0000000000f1',
              itemVersionId: '04020000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Câu hỏi 1:',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Option A' },
                { id: 'B', label: 'Option B' }
              ]
            },
            {
              itemFamilyId: '04020000-0000-4000-8000-0000000000f2',
              itemVersionId: '04020000-0000-4000-8000-0000000000i2',
              position: 2,
              prompt: 'Câu hỏi 2:',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
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
        '04020000-0000-4000-8000-0000000000i1': { graderType: 'exact_option', expectedOptionId: 'A' },
        '04020000-0000-4000-8000-0000000000i2': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Check presence of item move up and move down buttons
  assert.ok(
    container.innerHTML.includes('btn-move-item-up'),
    'Test Studio item cards must provide button to move question up'
  );
  assert.ok(
    container.innerHTML.includes('btn-move-item-down'),
    'Test Studio item cards must provide button to move question down'
  );
  assert.ok(
    container.innerHTML.includes('Câu 1') && container.innerHTML.includes('Câu 2'),
    'Initial render shows sequential numbers Câu 1 and Câu 2'
  );
});

test('Test Studio Item Resequencing: deleting first item resequences remaining items to start at Câu 1', () => {
  // Simulate DOM container with event listeners
  const elements = {};
  const listeners = {};

  const fakeContainer = {
    innerHTML: '',
    querySelector: (selector) => null,
    querySelectorAll: (selector) => {
      if (selector === '.btn-delete-item') {
        return [
          {
            getAttribute: (attr) => attr === 'data-block-idx' ? '0' : '0',
            addEventListener: (event, handler) => { listeners['delete-0'] = handler; }
          },
          {
            getAttribute: (attr) => attr === 'data-block-idx' ? '0' : '1',
            addEventListener: (event, handler) => { listeners['delete-1'] = handler; }
          }
        ];
      }
      return [];
    }
  };

  const formWithTwoItems = {
    id: '04020000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Delete Question 1 Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04020000-0000-4000-8000-000000000002',
      title: 'Delete Question 1 Test',
      blocks: [
        {
          blockId: '04020000-0000-4000-8000-0000000000b2',
          checkpoint: 1,
          title: 'Phần 1',
          items: [
            {
              itemFamilyId: '04020000-0000-4000-8000-0000000000f1',
              itemVersionId: '04020000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Câu hỏi 1:',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [{ id: 'A', label: 'A' }]
            },
            {
              itemFamilyId: '04020000-0000-4000-8000-0000000000f2',
              itemVersionId: '04020000-0000-4000-8000-0000000000i2',
              position: 2,
              prompt: 'Câu hỏi 2:',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [{ id: 'A', label: 'A' }]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '04020000-0000-4000-8000-0000000000i1': { graderType: 'exact_option', expectedOptionId: 'A' },
        '04020000-0000-4000-8000-0000000000i2': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(fakeContainer, formWithTwoItems);

  // Trigger delete on question 1 (index 0)
  assert.ok(typeof listeners['delete-0'] === 'function', 'Delete listener for item 0 registered');
  listeners['delete-0']();

  // After deletion of question 1, the remaining question must be Câu 1
  assert.ok(
    fakeContainer.innerHTML.includes('Câu 1'),
    'After deleting question 1, remaining question is renumbered to Câu 1'
  );
  assert.ok(
    fakeContainer.innerHTML.includes('Câu hỏi 1:'),
    'After deleting question 1, prompt is automatically updated to Câu hỏi 1:'
  );
  assert.ok(
    !fakeContainer.innerHTML.includes('Câu hỏi 2:'),
    'Old Câu hỏi 2: is no longer present'
  );
});
