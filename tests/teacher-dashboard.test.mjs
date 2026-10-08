import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentResultsPath,
  assignmentUrl,
  fixtureHeaders,
  formatDashboardScore,
  formatAssignmentWindow,
  resultStatusLabel,
  readDashboardState
} from '../term-tests/teacher-dashboard/app.js';

test('dashboard URL preserves class and assignment selection', () => {
  const url = assignmentUrl('https://example.test/term-tests/teacher-dashboard/?classId=101', {
    classId: '202',
    assignmentId: '22222222-2222-4222-8222-222222222222'
  });
  assert.equal(url.searchParams.get('classId'), '202');
  assert.equal(url.searchParams.get('assignmentId'), '22222222-2222-4222-8222-222222222222');
  assert.deepEqual(readDashboardState(url), {
    classId: '202',
    assignmentId: '22222222-2222-4222-8222-222222222222'
  });
});

test('fixture request sends only the identity key and never caller-declared authorization', () => {
  assert.deepEqual(fixtureHeaders({ actorId: 'lead@izone.test' }), {
    'X-Teacher-Fixture-Id': 'lead@izone.test'
  });
});

test('assignment time display handles open-ended windows', () => {
  assert.equal(formatAssignmentWindow(null, null), 'Không giới hạn thời gian');
  assert.match(formatAssignmentWindow('2026-10-01T00:00:00.000Z', '2026-10-08T00:00:00.000Z', 'vi-VN', 'UTC'), /01\/10\/2026.*08\/10\/2026.*UTC/);
});

test('result score display distinguishes missing, pending, provisional, and final scores', () => {
  assert.equal(formatDashboardScore(null), '—');
  assert.equal(formatDashboardScore({ earned: 0, maximum: 3, status: 'pending' }), 'Chờ chấm');
  assert.equal(formatDashboardScore({ earned: 1, maximum: 9, status: 'provisional' }), '1/9 · Tạm tính');
  assert.equal(formatDashboardScore({ earned: 5, maximum: 9, status: 'final' }), '5/9');
});

test('result view requests the selected assignment and labels roster statuses', () => {
  assert.equal(
    assignmentResultsPath('101', '11111111-1111-4111-8111-111111111111'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/results'
  );
  assert.equal(resultStatusLabel('not_started'), 'Chưa bắt đầu');
  assert.equal(resultStatusLabel('review_required'), 'Cần duyệt');
  assert.equal(resultStatusLabel('complete'), 'Hoàn tất');
});

test('teacher dashboard index.html provides required controls and result containers', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="identity-form"/);
  assert.match(html, /id="class-select"/);
  assert.match(html, /id="assignments"/);
  assert.match(html, /id="status"/);
  assert.match(html, /id="results"/);
  assert.match(html, /id="results-content"/);
});

