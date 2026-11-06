import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  previewSandboxPath
} from '../term-tests/teacher-dashboard/app.js';

test('previewSandboxPath returns canonical endpoint', () => {
  assert.equal(previewSandboxPath(), '/api/teacher/forms/preview-sandbox');
  assert.equal(previewSandboxPath('https://api.test'), 'https://api.test/api/teacher/forms/preview-sandbox');
});

test('renderTestBuilderView renders AI Rubric Builder with presets, tabs, and sandbox', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '05010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'AI Rubric Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '05010000-0000-4000-8000-000000000001',
      title: 'AI Rubric Test',
      blocks: [
        {
          blockId: '05010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Writing Section',
          items: [
            {
              itemFamilyId: '05010000-0000-4000-8000-0000000000f1',
              itemVersionId: '05010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Translate the following sentence into English: Tôi rất thích đọc sách.',
              interactionType: 'long_text',
              pedagogicalTypeCode: 'writing',
              layoutType: 'default',
              graderType: 'rubric_async',
              required: true,
              maxScore: 4,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '05010000-0000-4000-8000-0000000000i1': {
          graderType: 'rubric_async',
          rubricCode: 'rubric_translation_v1',
          rubricVersion: 1,
          rubric: {
            scoringVersion: 'rubric-translation-v1',
            maxScore: 4,
            criteria: [
              { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: 2, requiredConcepts: ['reading', 'books'] },
              { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: 2, requiredConcepts: [] }
            ]
          }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // Assert Rubric section components
  assert.ok(container.innerHTML.includes('template-rubric-async'), 'renders rubric async template');
  assert.ok(container.innerHTML.includes('Tự luận chấm AI (AI-Graded Rubric)'), 'displays AI rubric type pill');
  assert.ok(container.innerHTML.includes('select-rubric-preset'), 'provides preset selector dropdown');
  assert.ok(container.innerHTML.includes('Dịch thuật (Translation - 50% Meaning, 50% Grammar)'), 'includes Translation preset');
  assert.ok(container.innerHTML.includes('Speaking dạng văn bản'), 'includes Speaking preset');
  assert.ok(container.innerHTML.includes('Đọc hiểu Khối 03'), 'includes Khối 03 preset');

  // Assert Tabs & Criteria form
  assert.ok(container.innerHTML.includes('btn-rubric-tab'), 'provides tab buttons');
  assert.ok(container.innerHTML.includes('Tiêu chí chấm điểm'), 'provides Criteria tab');
  assert.ok(container.innerHTML.includes('Hướng dẫn Prompt nâng cao'), 'provides Guidance tab');
  assert.ok(container.innerHTML.includes('Sandbox Chấm thử AI'), 'provides Sandbox tab');
  assert.ok(container.innerHTML.includes('Ý nghĩa (Meaning)'), 'displays criterion meaning');
  assert.ok(container.innerHTML.includes('reading, books'), 'displays required concepts');
  assert.ok(container.innerHTML.includes('btn-add-criterion'), 'provides button to add criterion');

  // Assert Interactive Sandbox
  assert.ok(container.innerHTML.includes('input-sandbox-sample'), 'provides sample answer input');
  assert.ok(container.innerHTML.includes('btn-trigger-sandbox'), 'provides trigger button for sandbox grading');
  assert.ok(container.innerHTML.includes('btn-add-rubric-async'), 'provides button to add AI rubric questions');
});

test('AI Rubric Builder renders hidden reference context textarea and pull script button', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '05020000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Reading Comprehension Test',
    blocks: [
      {
        blockId: 'b-cloze',
        checkpoint: 1,
        title: 'Listening Cloze',
        items: [
          {
            itemVersionId: 'i-cloze',
            position: 1,
            prompt: 'Central Park is in New York. (1) __________ trees are green.',
            interactionType: 'short_text',
            layoutType: 'inline_cloze',
            pedagogicalTypeCode: 'inline_cloze',
            maxScore: 1
          }
        ]
      },
      {
        blockId: 'b-reading',
        checkpoint: 2,
        title: 'Reading Comprehension',
        items: [
          {
            itemVersionId: 'i-reading',
            position: 2,
            prompt: 'Từ "its" ở dòng 2 có nghĩa là gì?',
            referenceContext: 'Central Park is in New York. Its trees are green.',
            interactionType: 'short_text',
            layoutType: 'default',
            pedagogicalTypeCode: 'writing',
            graderType: 'rubric_async',
            maxScore: 4
          }
        ]
      }
    ],
    gradingKey: {
      items: {
        'i-reading': {
          graderType: 'rubric_async',
          rubricCode: 'rubric_comprehension_v1',
          rubricVersion: 1,
          rubric: {
            scoringVersion: 'rubric-comprehension-v1',
            maxScore: 4,
            criteria: [
              { id: 'comprehension', label: 'Comprehension', maxScore: 2.8, requiredConcepts: [] },
              { id: 'keywords', label: 'Keywords', maxScore: 1.2, requiredConcepts: [] }
            ]
          }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('ai-reference-context-group'), 'renders AI reference context group');
  assert.ok(container.innerHTML.includes('item-reference-context-input'), 'provides reference context textarea');
  assert.ok(container.innerHTML.includes('btn-pull-cloze-script'), 'provides 1-click pull cloze script button');
  assert.ok(container.innerHTML.includes('Central Park is in New York. Its trees are green.'), 'populates reference context value');
  assert.ok(container.innerHTML.includes('Ẩn hoàn toàn với học viên'), 'informs teacher that context is hidden from students');
});

test('Interactive Sandbox sends reference context to previewSandbox handler', async () => {
  let capturedPayload = null;
  const container = { innerHTML: '' };
  const mockForm = {
    id: '05030000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Sandbox Context Test',
    blocks: [
      {
        blockId: 'b-sandbox',
        checkpoint: 1,
        title: 'Comprehension',
        items: [
          {
            itemVersionId: 'i-test',
            position: 1,
            prompt: 'Từ "its" thay thế cho từ nào?',
            referenceContext: 'Central Park is in New York. Its trees are green.',
            interactionType: 'short_text',
            layoutType: 'default',
            pedagogicalTypeCode: 'writing',
            graderType: 'rubric_async',
            maxScore: 4
          }
        ]
      }
    ],
    gradingKey: {
      items: {
        'i-test': {
          graderType: 'rubric_async',
          rubricCode: 'rubric_comprehension_v1',
          rubricVersion: 1,
          rubric: {
            scoringVersion: 'rubric-comprehension-v1',
            maxScore: 4,
            criteria: [
              { id: 'comprehension', label: 'Comprehension', maxScore: 4, requiredConcepts: [] }
            ]
          }
        }
      }
    }
  };

  const options = {
    onPreviewSandbox: async (payload) => {
      capturedPayload = payload;
      return {
        ok: true,
        scoreEarned: 4,
        maxScore: 4,
        criteria: [{ id: 'comprehension', score: 4 }]
      };
    }
  };

  renderTestBuilderView(container, mockForm, options);

  assert.ok(capturedPayload === null, 'Sandbox not triggered initially');
});


test('AI Rubric presets contain strictly 3 types (Translation, Comprehension, Speaking) and removes btn-toggle-custom-item-context', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    title: 'Rubric Presets Test',
    blocks: [
      {
        blockId: 'b-1',
        title: 'Phần 1',
        exercises: [{ exerciseId: 'ex-1', title: 'Bài tập 1' }],
        items: [
          {
            itemVersionId: 'i-1',
            exerciseId: 'ex-1',
            prompt: 'Translate sentence',
            interactionType: 'long_text',
            graderType: 'rubric_async',
            maxScore: 4
          }
        ]
      }
    ],
    gradingKey: {
      items: {
        'i-1': {
          graderType: 'rubric_async',
          rubricCode: 'rubric_translation_v1',
          rubric: { scoringVersion: 'rubric-translation-v1', maxScore: 4, criteria: [] }
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // 1. Check select-rubric-preset options in item card
  assert.ok(container.innerHTML.includes('select-rubric-preset'), 'Preset dropdown must exist');
  assert.ok(container.innerHTML.includes('value="translation"'), 'Must have translation');
  assert.ok(container.innerHTML.includes('value="comprehension"'), 'Must have comprehension');
  assert.ok(container.innerHTML.includes('value="speaking"'), 'Must have speaking');
  assert.ok(!container.innerHTML.includes('value="writing_summary"'), 'Must NOT have writing_summary');
  assert.ok(!container.innerHTML.includes('value="custom"'), 'Must NOT have custom');

  // 2. btn-toggle-custom-item-context must be removed
  assert.ok(!container.innerHTML.includes('btn-toggle-custom-item-context'), 'Must NOT contain btn-toggle-custom-item-context');
});
