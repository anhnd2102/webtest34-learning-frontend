import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  formPublishPath
} from '../term-tests/teacher-dashboard/app.js';

test('formPublishPath returns canonical endpoint', () => {
  assert.equal(formPublishPath(), '/api/teacher/forms/publish');
  assert.equal(formPublishPath('https://api.test'), 'https://api.test/api/teacher/forms/publish');
  assert.equal(formPublishPath('https://api.test/'), 'https://api.test/api/teacher/forms/publish');
});

test('renderTestBuilderView renders Preview and Publish action buttons in top bar', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '06010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Candidate Simulation & Publishing Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '06010000-0000-4000-8000-000000000001',
      title: 'Candidate Simulation & Publishing Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: '06010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Phần 1: Nghe hiểu',
          audioUrl: 'assets/test.mp3',
          readingPassage: 'This is a sample passage.',
          items: [
            {
              itemFamilyId: '06010000-0000-4000-8000-0000000000f1',
              itemVersionId: '06010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Sample Question',
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
        '06010000-0000-4000-8000-0000000000i1': {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        }
      }
    }
  };

  renderTestBuilderView(container, mockForm, {
    classes: [
      { classId: '201', name: '34.01 - Sáng Thứ 2-4', courseCode: 'course-34' },
      { classId: '202', name: '34.02 - Tối Thứ 3-5', courseCode: 'course-34' }
    ]
  });

  // Verify Preview Button exists
  assert.ok(container.innerHTML.includes('id="btn-preview-test"'), 'Must have btn-preview-test button');
  assert.ok(container.innerHTML.includes('Xem trước bài thi'), 'Button text includes Xem trước bài thi');

  // Verify Publish Button exists
  assert.ok(container.innerHTML.includes('id="btn-publish-test"'), 'Must have btn-publish-test button');
  assert.ok(container.innerHTML.includes('Công bố đề thi'), 'Button text includes Công bố đề thi');

  // Verify status tags and title
  assert.ok(container.innerHTML.includes('v1'), 'Displays form version v1');
  assert.ok(container.innerHTML.includes('Bản nháp'), 'Displays draft badge');
  assert.ok(container.innerHTML.includes('Candidate Simulation &amp; Publishing Test') || container.innerHTML.includes('Candidate Simulation & Publishing Test'), 'Displays test title');
});

test('renderTestBuilderView supports multi-interaction types for candidate simulation', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '06020000-0000-4000-8000-000000000001',
    version: 2,
    status: 'draft',
    title: 'Full Test Simulation',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '06020000-0000-4000-8000-000000000001',
      title: 'Full Test Simulation',
      durationMinutes: 60,
      blocks: [
        {
          blockId: 'b1',
          checkpoint: 1,
          title: 'Section 1',
          items: [
            {
              itemFamilyId: 'f1',
              itemVersionId: 'i1',
              position: 1,
              prompt: 'Question 1',
              interactionType: 'multi_choice_group',
              pedagogicalTypeCode: 'multiple_choice_group',
              layoutType: 'grid_3',
              graderType: 'unordered_group_slot',
              groupId: 'grp_1',
              maxScore: 2,
              options: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]
            },
            {
              itemFamilyId: 'f2',
              itemVersionId: 'i2',
              position: 2,
              prompt: 'Question 2',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'fill_in_the_blank',
              graderType: 'accepted_text',
              maxScore: 1,
              options: []
            },
            {
              itemFamilyId: 'f3',
              itemVersionId: 'i3',
              position: 3,
              prompt: 'Vocab Word',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              graderType: 'accepted_text_exact_option',
              maxScore: 1,
              options: [{ id: 'opt_1', label: 'Meaning 1' }]
            },
            {
              itemFamilyId: 'f4',
              itemVersionId: 'i4',
              position: 4,
              prompt: 'AI Essay Prompt',
              interactionType: 'long_text',
              pedagogicalTypeCode: 'writing',
              graderType: 'rubric_async',
              maxScore: 4,
              options: []
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        i2: { graderType: 'accepted_text', accepted: ['answer'] },
        i3: { graderType: 'accepted_text_exact_option', accepted: ['Vocab Word'], expectedOptionId: 'opt_1' },
        i4: { graderType: 'rubric_async', rubricCode: 'r1', rubricVersion: 1, rubric: { criteria: [] } }
      },
      groups: {
        grp_1: { graderType: 'unordered_group_slot', expectedOptionIds: ['A', 'B'] }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('unordered_group_slot'), 'Renders multi-choice group');
  assert.ok(container.innerHTML.includes('short_text') || container.innerHTML.includes('short-text'), 'Renders short text item');
  assert.ok(container.innerHTML.includes('text_select_pair') || container.innerHTML.includes('vocabulary_pair'), 'Renders vocab pair item');
  assert.ok(container.innerHTML.includes('template-rubric-async'), 'Renders AI rubric item');
});
