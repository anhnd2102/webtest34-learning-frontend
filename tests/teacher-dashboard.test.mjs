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

test('assignmentResultsPath serializes search, filter, sort, and pagination query options', () => {
  const path = assignmentResultsPath('101', '11111111-1111-4111-8111-111111111111', {
    q: 'nguyễn',
    status: 'review_required',
    minScore: '50',
    maxScore: '80',
    skill: 'reading',
    sortBy: 'score',
    sortDir: 'desc',
    page: 2
  });
  const url = new URL(`http://localhost${path}`);
  assert.equal(url.pathname, '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/results');
  assert.equal(url.searchParams.get('q'), 'nguyễn');
  assert.equal(url.searchParams.get('status'), 'review_required');
  assert.equal(url.searchParams.get('minScore'), '50');
  assert.equal(url.searchParams.get('maxScore'), '80');
  assert.equal(url.searchParams.get('skill'), 'reading');
  assert.equal(url.searchParams.get('sortBy'), 'score');
  assert.equal(url.searchParams.get('sortDir'), 'desc');
  assert.equal(url.searchParams.get('page'), '2');
});

test('dashboard URL state management retains search, filter, sort, and pagination across reload', () => {
  const initial = assignmentUrl('https://example.test/term-tests/teacher-dashboard/', {
    classId: '101',
    assignmentId: '11111111-1111-4111-8111-111111111111',
    q: 'an',
    status: 'complete',
    minScore: '60',
    maxScore: '100',
    sortBy: 'name',
    sortDir: 'asc',
    page: 3
  });
  const parsed = readDashboardState(initial);
  assert.deepEqual(parsed, {
    classId: '101',
    assignmentId: '11111111-1111-4111-8111-111111111111',
    q: 'an',
    status: 'complete',
    minScore: '60',
    maxScore: '100',
    sortBy: 'name',
    sortDir: 'asc',
    page: 3
  });
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
  assert.match(html, /id="search-input"/);
  assert.match(html, /id="status-filter"/);
  assert.match(html, /id="min-score-input"/);
  assert.match(html, /id="max-score-input"/);
  assert.match(html, /id="sort-by-select"/);
  assert.match(html, /id="sort-dir-select"/);
  assert.match(html, /id="refresh-btn"/);
  assert.match(html, /id="last-updated"/);
  assert.match(html, /id="pagination-bar"/);
  assert.match(html, /id="prev-page-btn"/);
  assert.match(html, /id="next-page-btn"/);
});

