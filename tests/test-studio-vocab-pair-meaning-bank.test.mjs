import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio Vocab Pair: renders bulk paste button, copy from previous, and sync to block buttons', () => {
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
              prompt: 'environment',
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
          accepted: ['environment'],
          expectedOptionId: 'opt_2',
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Check presence of bulk paste controls
  assert.ok(
    container.innerHTML.includes('btn-bulk-paste-vocab-options'),
    'must render a button to open bulk paste meaning bank'
  );
  assert.ok(
    container.innerHTML.includes('vocab-bulk-paste-panel'),
    'must render bulk paste panel'
  );
  assert.ok(
    container.innerHTML.includes('input-bulk-vocab-options'),
    'must render multi-line textarea for bulk pasting meanings'
  );
  assert.ok(
    container.innerHTML.includes('btn-apply-bulk-vocab-options'),
    'must render button to apply bulk meanings'
  );

  // Check presence of copy from previous question button on the 2nd item
  assert.ok(
    container.innerHTML.includes('btn-copy-prev-vocab-options'),
    'must render button to copy options from previous question'
  );

  // Check presence of sync to all items in block button
  assert.ok(
    container.innerHTML.includes('btn-sync-vocab-options-to-block'),
    'must render button to sync meaning pool across the whole block'
  );
});
