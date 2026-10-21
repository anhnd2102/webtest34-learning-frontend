import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVocabPairCsv,
  generateVocabPairTemplateCsv,
  batchGenerateExerciseVocabVariants,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('parseVocabPairCsv correctly parses comma-separated and tab-separated pairs, handling UTF-8 BOM and headers', () => {
  // Comma-separated with UTF-8 BOM and header
  const csvWithBom = '\uFEFFEnglish,Vietnamese\r\n' +
    'destination,điểm đến\r\n' +
    'itinerary,lịch trình chuyến đi\r\n' +
    'resilient,kiên cường';

  const res1 = parseVocabPairCsv(csvWithBom);
  assert.equal(res1.validRows.length, 3, 'Extracts 3 valid rows');
  assert.equal(res1.validRows[0].english, 'destination');
  assert.equal(res1.validRows[0].vietnamese, 'điểm đến');
  assert.equal(res1.validRows[1].english, 'itinerary');
  assert.equal(res1.validRows[1].vietnamese, 'lịch trình chuyến đi');
  assert.equal(res1.invalidRows.length, 0, 'No invalid rows');

  // Tab-separated text (copy-pasted from Excel)
  const tabPasted = 'sustainable\tbền vững\n' +
    'environment\tmôi trường\n' +
    'invalid_row_without_tab\n' +
    '   \n' +
    'community\tcộng đồng';

  const res2 = parseVocabPairCsv(tabPasted);
  assert.equal(res2.validRows.length, 3, 'Extracts 3 valid tab-separated rows');
  assert.equal(res2.validRows[0].english, 'sustainable');
  assert.equal(res2.validRows[0].vietnamese, 'bền vững');
  assert.equal(res2.validRows[2].english, 'community');
  assert.equal(res2.validRows[2].vietnamese, 'cộng đồng');
  assert.equal(res2.invalidRows.length, 1, 'Catches row missing second column');
  assert.equal(res2.invalidRows[0].raw, 'invalid_row_without_tab');
});

test('generateVocabPairTemplateCsv returns a valid CSV with UTF-8 BOM and sample English-Vietnamese rows', () => {
  const template = generateVocabPairTemplateCsv();
  assert.ok(template.startsWith('\uFEFF'), 'Starts with UTF-8 BOM');
  assert.ok(template.includes('English,Vietnamese') || template.includes('Từ tiếng Anh,Nghĩa tiếng Việt'), 'Contains header row');
  assert.ok(template.includes('destination,điểm đến') || template.includes('itinerary,'), 'Contains sample vocabulary rows');
});

test('batchGenerateExerciseVocabVariants generates and merges variants across all vocabulary items in an exercise', () => {
  const mockBlock = {
    blockId: 'b1',
    items: [
      {
        itemVersionId: 'it-vocab-1',
        exerciseId: 'ex-1',
        interactionType: 'text_select_pair',
        targetWord: 'cant',
        options: [{ id: 'opt_1', label: 'không thể' }]
      },
      {
        itemVersionId: 'it-vocab-2',
        exerciseId: 'ex-1',
        interactionType: 'text_select_pair',
        targetWord: 'destination',
        options: [{ id: 'opt_1', label: 'điểm đến' }]
      },
      {
        itemVersionId: 'it-other',
        exerciseId: 'ex-1',
        interactionType: 'single_choice',
        options: []
      }
    ]
  };

  const mockTargetEx = {
    exerciseId: 'ex-1',
    title: 'Vocabulary Exercise 1'
  };

  const mockDraftState = {
    gradingKey: {
      items: {
        'it-vocab-1': {
          graderType: 'accepted_text_exact_option',
          accepted: ['custom_manual_variant', 'cant'],
          expectedOptionId: 'opt_1'
        },
        'it-vocab-2': {
          graderType: 'accepted_text_exact_option',
          accepted: [],
          expectedOptionId: 'opt_1'
        }
      }
    }
  };

  const count = batchGenerateExerciseVocabVariants(mockBlock, mockTargetEx, mockDraftState);
  assert.equal(count, 2, 'Generated variants for exactly 2 vocabulary pair items');

  const key1 = mockDraftState.gradingKey.items['it-vocab-1'];
  assert.ok(key1.accepted.includes('custom_manual_variant'), 'Preserves existing manual variant');
  assert.ok(key1.accepted.includes('can’t') || key1.accepted.includes("can't") || key1.accepted.includes('cannot'), 'Expands contractions');

  const key2 = mockDraftState.gradingKey.items['it-vocab-2'];
  assert.ok(key2.accepted.includes('destination'), 'Includes target word');
});

test('renderTestBuilderView renders CSV upload button and batch generate variants button with monochromatic line icons', () => {
  const mockContainer = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const mockForm = {
    id: '47010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'CSV Vocab Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '47010000-0000-4000-8000-000000000001',
      title: 'CSV Vocab Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Vocabulary Section',
          exercises: [
            {
              exerciseId: 'ex-vocab-1',
              exerciseNumber: 1,
              title: 'Exercise 1: Vocabulary Pairs'
            }
          ],
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'it-vp-1',
              exerciseId: 'ex-vocab-1',
              position: 1,
              prompt: 'destination',
              targetWord: 'destination',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              maxScore: 1,
              options: [
                { id: 'opt_1', label: 'điểm đến' },
                { id: 'opt_2', label: 'lịch trình' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'it-vp-1': {
          graderType: 'accepted_text_exact_option',
          accepted: ['destination'],
          expectedOptionId: 'opt_1'
        }
      }
    }
  };

  renderTestBuilderView(mockContainer, mockForm);

  // Must render CSV Upload button on Exercise actions
  assert.ok(mockContainer.innerHTML.includes('btn-upload-vocab-csv'), 'Renders Nhập CSV button');

  // Must render Batch Generate Variants button on Exercise actions
  assert.ok(mockContainer.innerHTML.includes('btn-batch-generate-exercise-variants'), 'Renders Sinh biến thể cả bài button');

  // Must use monochromatic SVG icons and not colorful emojis
  assert.ok(!mockContainer.innerHTML.includes('⚡ Sinh biến thể cả bài'), 'Does not use emoji ⚡ in button text');
  assert.ok(!mockContainer.innerHTML.includes('📥 Nhập CSV'), 'Does not use emoji 📥 in button text');
  assert.ok(mockContainer.innerHTML.includes('icon-inline'), 'Uses monochromatic SVG line icons');
});
