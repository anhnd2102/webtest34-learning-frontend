import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formDraftPath,
  formDetailPath,
  generateUuid,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('formDraftPath and formDetailPath construct canonical endpoints', () => {
  assert.equal(formDraftPath(), '/api/teacher/forms/draft');
  assert.equal(formDraftPath('11111111-1111-4111-8111-111111111111'), '/api/teacher/forms/draft/11111111-1111-4111-8111-111111111111');
  assert.equal(formDraftPath('http://localhost:3000'), 'http://localhost:3000/api/teacher/forms/draft');
  assert.equal(formDraftPath('http://localhost:3000', '11111111-1111-4111-8111-111111111111'), 'http://localhost:3000/api/teacher/forms/draft/11111111-1111-4111-8111-111111111111');

  assert.equal(formDetailPath('22222222-2222-4222-8222-222222222222'), '/api/teacher/forms/22222222-2222-4222-8222-222222222222');
  assert.equal(formDetailPath('https://api.izone.edu.vn', '22222222-2222-4222-8222-222222222222'), 'https://api.izone.edu.vn/api/teacher/forms/22222222-2222-4222-8222-222222222222');
});

test('generateUuid returns valid RFC4122 v4 UUID format', () => {
  const uuid = generateUuid();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.ok(uuidRegex.test(uuid), `Generated UUID "${uuid}" does not match UUID regex`);
});

test('renderTestBuilderView renders test details, block structure and immutability notice', () => {
  const container = { innerHTML: '' };

  const mockFormVersion = {
    id: '03010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'IZONE · Khối 03 · Test 1',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000001',
      title: 'IZONE · Khối 03 · Test 1',
      durationMinutes: 45,
      answerReleasePolicy: 'teacher_release',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Listening Part 1',
          instructions: 'Nghe và trả lời',
          audioUrl: 'assets/34/test-1/listening.mp3',
          readingPassage: null,
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f1',
              itemVersionId: '03010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Question 1',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'general_text',
              layoutType: 'default',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              options: [],
              skillCodes: []
            }
          ]
        }
      ]
    }
  };

  renderTestBuilderView(container, mockFormVersion);

  assert.ok(container.innerHTML.includes('IZONE · Khối 03 · Test 1'));
  assert.ok(container.innerHTML.includes('Listening Part 1'));
  assert.ok(container.innerHTML.includes('assets/34/test-1/listening.mp3'));
  assert.ok(container.innerHTML.includes('Nghe và trả lời'));
  assert.ok(container.innerHTML.includes('v1'));
  assert.ok(container.innerHTML.includes('Chưa có bài nộp'));

  // Test immutability notice when submissionCount > 0
  const immutableFormVersion = {
    ...mockFormVersion,
    submissionCount: 12
  };
  renderTestBuilderView(container, immutableFormVersion);
  assert.ok(container.innerHTML.includes('Đã có 12 bài nộp'));
  assert.ok(container.innerHTML.includes('Bảo toàn tính bất biến'));
  assert.ok(container.innerHTML.includes('v2'));
});
