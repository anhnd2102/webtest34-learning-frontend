import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentResultsPath,
  attemptDetailPath,
  assignmentUrl,
  fixtureHeaders,
  formatDashboardScore,
  formatAssignmentWindow,
  resultStatusLabel,
  attemptStatusLabel,
  verdictLabel,
  readDashboardState,
  manualGradingDraftPath,
  manualGradingCompletePath,
  validateManualGradingScores,
  attemptPublishPath,
  formatPublicationStatus,
  assignmentRosterPath,
  eligibleStudentsPath,
  studentTransferPath
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
  assert.match(html, /id="attempt-detail"/);
  assert.match(html, /id="close-attempt-detail-btn"/);
  assert.match(html, /id="detail-heading"/);
  assert.match(html, /id="detail-meta"/);
  assert.match(html, /id="detail-scores"/);
  assert.match(html, /id="detail-items"/);
  assert.match(html, /id="detail-grading-history"/);
  assert.match(html, /id="detail-attempt-history"/);
});

test('attemptDetailPath builds canonical endpoint path', () => {
  assert.equal(
    attemptDetailPath('101', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/attempts/33333333-3333-4333-8333-333333333333'
  );
});

test('attemptStatusLabel and verdictLabel return Vietnamese domain terminology', () => {
  assert.equal(attemptStatusLabel('active'), 'Đang làm');
  assert.equal(attemptStatusLabel('submitted'), 'Đã nộp');
  assert.equal(attemptStatusLabel('superseded'), 'Bị thay thế');

  assert.equal(verdictLabel('correct'), 'Đúng');
  assert.equal(verdictLabel('incorrect'), 'Sai');
  assert.equal(verdictLabel('partial'), 'Đúng một phần');
  assert.equal(verdictLabel('pending'), 'Chờ chấm');
  assert.equal(verdictLabel('manual_review'), 'Cần duyệt');
  assert.equal(verdictLabel('ungraded'), 'Chưa chấm');
  assert.equal(verdictLabel('not_submitted'), 'Chưa nộp');
});

test('dashboard URL state management retains attemptId across navigation', () => {
  const url = assignmentUrl('https://example.test/term-tests/teacher-dashboard/', {
    classId: '101',
    assignmentId: '11111111-1111-4111-8111-111111111111',
    attemptId: '33333333-3333-4333-8333-333333333333'
  });
  assert.equal(url.searchParams.get('attemptId'), '33333333-3333-4333-8333-333333333333');
  const parsed = readDashboardState(url);
  assert.equal(parsed.attemptId, '33333333-3333-4333-8333-333333333333');
});

test('manualGradingDraftPath and manualGradingCompletePath build canonical endpoints', () => {
  assert.equal(
    manualGradingDraftPath('101', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/attempts/33333333-3333-4333-8333-333333333333/manual-grading/draft'
  );
  assert.equal(
    manualGradingCompletePath('101', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/attempts/33333333-3333-4333-8333-333333333333/manual-grading/complete'
  );
});

test('teacher dashboard index.html provides manual grading controls and conflict alert container', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="save-draft-btn"/);
  assert.match(html, /id="complete-grading-btn"/);
  assert.match(html, /id="draft-status-msg"/);
  assert.match(html, /id="conflict-alert"/);
});

test('validateManualGradingScores checks missing review scores and out-of-range scores', () => {
  const items = [
    { itemVersionId: 'item-1', needsReview: true, canGrade: true, maxScore: 3 },
    { itemVersionId: 'item-2', needsReview: false, canGrade: false, maxScore: 2 }
  ];

  // Missing score for review item
  const emptyScores = {};
  const resMissing = validateManualGradingScores(items, emptyScores);
  assert.equal(resMissing.valid, false);
  assert.match(resMissing.message, /còn câu cần duyệt/i);

  // Score exceeds maxScore
  const overScores = { 'item-1': 4 };
  const resOver = validateManualGradingScores(items, overScores);
  assert.equal(resOver.valid, false);
  assert.match(resOver.message, /không hợp lệ/i);

  // Negative score
  const negScores = { 'item-1': -1 };
  const resNeg = validateManualGradingScores(items, negScores);
  assert.equal(resNeg.valid, false);

  // Valid score
  const validScores = { 'item-1': 2.5 };
  const resValid = validateManualGradingScores(items, validScores);
  assert.equal(resValid.valid, true);
  assert.equal(resValid.message, '');
});

test('attemptPublishPath builds canonical endpoint', () => {
  assert.equal(
    attemptPublishPath('101', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/attempts/33333333-3333-4333-8333-333333333333/publish'
  );
});

test('formatPublicationStatus returns correct labels and metadata', () => {
  assert.equal(formatPublicationStatus(null), 'Chưa công bố');
  assert.equal(formatPublicationStatus({ published: false }), 'Chưa công bố');
  assert.equal(formatPublicationStatus({ published: true }), 'Đã công bố');
});

test('teacher dashboard index.html provides publication button', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="publish-result-btn"/);
});

test('assignmentRosterPath, eligibleStudentsPath, and studentTransferPath build canonical endpoints', () => {
  const asgId = '11111111-1111-4111-8111-111111111111';
  const sRef = '44444444-4444-4444-8444-444444444441';
  assert.equal(
    assignmentRosterPath('101', asgId),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/roster'
  );
  assert.equal(
    eligibleStudentsPath('101', asgId),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/eligible-students'
  );
  assert.equal(
    studentTransferPath('101', sRef),
    '/api/teacher/classes/101/students/44444444-4444-4444-8444-444444444441/transfer'
  );
});

test('teacher dashboard index.html provides add student controls and modal', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="add-student-btn"/);
  assert.match(html, /id="add-student-modal"/);
});
