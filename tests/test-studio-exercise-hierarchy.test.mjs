import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio 3-Level Hierarchy: renders exercises within blocks and supports + Thêm bài tập (Exercise)', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Multi-Exercise Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Multi-Exercise Test',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Phần 1: Vocabulary',
          instructions: 'Hướng dẫn chung phần Vocabulary...',
          exercises: [
            {
              exerciseId: '04010000-0000-4000-8000-0000000000e1',
              exerciseNumber: 1,
              title: 'Nghe từ và chọn nghĩa',
              instructions: 'Listen and note down the words/phrases you hear...',
              audioUrl: 'assets/34/test-3/vocabulary.mp3',
              itemIds: ['04010000-0000-4000-8000-0000000000i1']
            },
            {
              exerciseId: '04010000-0000-4000-8000-0000000000e2',
              exerciseNumber: 2,
              title: 'Từ vựng qua ảnh',
              instructions: 'Dựa vào hình ảnh và ngữ cảnh gợi ý...',
              itemIds: ['04010000-0000-4000-8000-0000000000i2']
            }
          ],
          items: [
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f1',
              itemVersionId: '04010000-0000-4000-8000-0000000000i1',
              position: 1,
              exerciseId: '04010000-0000-4000-8000-0000000000e1',
              prompt: 'outgoing',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'opt_1', label: 'hướng ngoại' },
                { id: 'opt_2', label: 'môi trường' }
              ]
            },
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f2',
              itemVersionId: '04010000-0000-4000-8000-0000000000i2',
              position: 2,
              exerciseId: '04010000-0000-4000-8000-0000000000e2',
              prompt: 'resilient',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'opt_1', label: 'kiên cường' },
                { id: 'opt_2', label: 'bướng bỉnh' }
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
          accepted: ['outgoing'],
          expectedOptionId: 'opt_1',
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        },
        '04010000-0000-4000-8000-0000000000i2': {
          graderType: 'accepted_text_exact_option',
          accepted: ['resilient'],
          expectedOptionId: 'opt_1',
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Check presence of Exercise level elements in Test Studio
  assert.ok(
    container.innerHTML.includes('btn-add-exercise') || container.innerHTML.includes('Thêm bài tập (Exercise)'),
    'Test Studio must provide button to add an Exercise to a block'
  );

  assert.ok(
    container.innerHTML.includes('builder-exercise-card') || container.innerHTML.includes('exercise-title-input'),
    'Test Studio must render exercise container and title input'
  );

  assert.ok(
    container.innerHTML.includes('Nghe từ và chọn nghĩa'),
    'renders exercise 1 title'
  );

  assert.ok(
    container.innerHTML.includes('Từ vựng qua ảnh'),
    'renders exercise 2 title'
  );

  assert.ok(
    container.innerHTML.includes('exercise-instructions-input'),
    'renders exercise instructions input'
  );
});

test('Test Studio 3-Level Hierarchy: backward compatibility for legacy forms without exercises', () => {
  const container = { innerHTML: '' };
  const legacyForm = {
    id: '04010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Legacy Single Block Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000002',
      title: 'Legacy Single Block Test',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b2',
          checkpoint: 1,
          title: 'Phần 1: Grammar',
          instructions: 'Chọn đáp án đúng',
          items: [
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f3',
              itemVersionId: '04010000-0000-4000-8000-0000000000i3',
              position: 1,
              prompt: 'He ___ to school every day.',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'goes' },
                { id: 'B', label: 'go' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '04010000-0000-4000-8000-0000000000i3': {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        }
      }
    }
  };

  renderTestBuilderView(container, legacyForm);

  assert.ok(
    container.innerHTML.includes('builder-exercise-card'),
    'Legacy block automatically normalizes into an exercise card'
  );
  assert.ok(
    container.innerHTML.includes('btn-add-exercise'),
    'Allows adding second exercise to legacy block'
  );
});
