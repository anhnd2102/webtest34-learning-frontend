import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateHangmanHint,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('generateHangmanHint converts words into first letter preserved underscore sequences', () => {
  assert.equal(generateHangmanHint('relax'), 'r _ _ _ _');
  assert.equal(generateHangmanHint('school kids'), 's _ _ _ _ _ k _ _ _');
  assert.equal(generateHangmanHint('ice-cream'), 'i _ _ - c _ _ _ _');
  assert.equal(generateHangmanHint(''), '');
  assert.equal(generateHangmanHint(null), '');
});

test('renderTestBuilderView provides button to add pictorial vocabulary cards', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '08010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Pictorial Vocabulary Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '08010000-0000-4000-8000-000000000001',
      title: 'Pictorial Vocabulary Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b0801',
          checkpoint: 1,
          title: 'Vocabulary · Thẻ từ vựng qua ảnh',
          items: [
            {
              itemFamilyId: 'f0801',
              itemVersionId: 'i0801',
              position: 21,
              prompt: 'Nhìn hình và hoàn thành từ vựng:',
              helpText: '',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              maxScore: 1,
              image: 'assets/test 1/vocabulary/image3.png',
              captionHint: '(độ tuổi đi học)',
              letterHint: 's _ _ _ _ _ k _ _ _',
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i0801: {
          graderType: 'accepted_text',
          accepted: ['school kids']
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-pictorial'), 'Provides button to add pictorial card template');
  assert.ok(container.innerHTML.includes('template-pictorial-vocab'), 'Renders template-pictorial-vocab section');
  assert.ok(container.innerHTML.includes('input-pictorial-image'), 'Renders image URL/path input');
  assert.ok(container.innerHTML.includes('btn-generate-hangman'), 'Renders button to auto-generate hangman letter hint');
  assert.ok(container.innerHTML.includes('input-pictorial-caption'), 'Renders Vietnamese meaning caption input');
  assert.ok(container.innerHTML.includes('input-pictorial-letter-hint'), 'Renders letter hint input field');
  assert.ok(container.innerHTML.includes('pictorial-thumb-preview'), 'Renders thumbnail preview when image is supplied');
});

test('generateHangmanHint handles single letters, numbers, and uppercase characters gracefully', () => {
  assert.equal(generateHangmanHint('I have 2 books'), 'I h _ _ _ 2 b _ _ _ _');
  assert.equal(generateHangmanHint('United States'), 'U _ _ _ _ _ S _ _ _ _ _');
});

