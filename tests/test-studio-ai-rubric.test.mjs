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
