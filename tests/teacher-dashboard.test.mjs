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
  assignmentPublishAllPath,
  formatPublicationStatus,
  assignmentRosterPath,
  eligibleStudentsPath,
  studentTransferPath,
  grantRetakePath,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authHeaders,
  teacherRoleLabel,
  defaultApiBase,
  extractAttemptSkills,
  formatCompactPrompt,
  resolveStudentAnswerDisplay,
  resolveExpectedAnswerDisplay,
  getScoreTier,
  computeClassSkillSummary,
  formatCompactScore,
  formatSubmissionTimestamp
} from '../term-tests/teacher-dashboard/app.js';

test('defaultApiBase resolves local or production origin based on location', () => {
  assert.equal(defaultApiBase({ hostname: 'localhost' }), 'http://localhost:8788');
  assert.equal(defaultApiBase({ hostname: '127.0.0.1' }), 'http://localhost:8788');
  assert.equal(defaultApiBase({ hostname: 'anhnd2102.github.io' }), 'https://webtest.ducanhn.autos');
  assert.equal(defaultApiBase(null), 'https://webtest.ducanhn.autos');
});

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
  assert.equal(
    assignmentPublishAllPath('101', '11111111-1111-4111-8111-111111111111'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/publish'
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
  assert.match(html, /id="publish-all-btn"/);
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

test('grantRetakePath builds canonical endpoint and labels retake statuses', () => {
  const classId = '101';
  const asgId = '11111111-1111-4111-8111-111111111111';
  const sRef = '44444444-4444-4444-8444-444444444441';
  assert.equal(
    grantRetakePath(classId, asgId, sRef),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/students/44444444-4444-4444-8444-444444444441/retake'
  );
  assert.equal(resultStatusLabel('retake_granted'), 'Được phép làm lại');
  assert.equal(resultStatusLabel('retaking'), 'Đang làm lại');
  assert.equal(resultStatusLabel('retake_expired'), 'Quyền làm lại đã hết hạn');
  assert.equal(attemptStatusLabel('superseded'), 'Bị thay thế');
  assert.equal(attemptStatusLabel('expired'), 'Hết hạn');
});

test('teacher dashboard index.html provides grant retake modal and status filter options', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="grant-retake-modal"/);
  assert.match(html, /id="grant-retake-btn"/);
  assert.match(html, /id="retake-reason-input"/);
  assert.match(html, /id="retake-expires-at-input"/);
  assert.match(html, /value="retake_granted"/);
  assert.match(html, /value="retaking"/);
  assert.match(html, /value="retake_expired"/);
});

test('teacher dashboard styles.css and student runner provide retake expiry and preflight notices', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.result-status\.retake_expired/);

  const demoHtml = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(demoHtml, /id="studentNotice"/);
  assert.match(demoHtml, /Quy\u1ec1n l\u00e0m l\u1ea1i \u0111\u00e3 h\u1ebft h\u1ea1n/);
  assert.match(demoHtml, /Th\u1eddi gian l\u00e0m b\u00e0i th\u1ef1c t\u1ebf l\u00e0/);
});

test('teacher dashboard auth endpoints and headers use canonical authorization', () => {
  assert.equal(authLoginPath(), '/api/teacher/auth/login');
  assert.equal(authLogoutPath(), '/api/teacher/auth/logout');
  assert.equal(authMePath(), '/api/teacher/auth/me');

  assert.deepEqual(authHeaders({ token: 'sess_abc123' }), {
    Authorization: 'Bearer sess_abc123'
  });
  assert.deepEqual(authHeaders({ actorId: 'teacher@izone.edu.vn' }), {
    'X-Teacher-Fixture-Id': 'teacher@izone.edu.vn'
  });
  assert.deepEqual(authHeaders({ token: 'sess_abc123', actorId: 'ignored@izone.edu.vn' }), {
    Authorization: 'Bearer sess_abc123'
  });
  assert.deepEqual(authHeaders({}), {});
});

test('teacherRoleLabel formats friendly labels per teacher role and course codes', () => {
  assert.equal(teacherRoleLabel('admin'), 'Quản trị viên (Toàn quyền)');
  assert.equal(teacherRoleLabel('lead', ['IELTS34', 'IELTS45']), 'Trưởng bộ môn (Khối IELTS34, IELTS45)');
  assert.equal(teacherRoleLabel('lead', []), 'Trưởng bộ môn (Khối Khối)');
  assert.equal(teacherRoleLabel('qm'), 'Quản lý chất lượng');
  assert.equal(teacherRoleLabel('teacher'), 'Giáo viên phụ trách lớp');
});

test('teacher dashboard index.html and styles.css provide database login and teacher profile elements', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="auth-panel"/);
  assert.match(html, /id="login-form"/);
  assert.match(html, /id="login-email"/);
  assert.match(html, /id="login-phone"/);
  assert.match(html, /id="login-error"/);
  assert.match(html, /id="teacher-profile"/);
  assert.match(html, /id="teacher-profile-name"/);
  assert.match(html, /id="teacher-role-badge"/);
  assert.match(html, /id="logout-btn"/);

  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');
  assert.match(css, /#teacher-profile/);
  assert.match(css, /\.role-badge\.admin/);
  assert.match(css, /\.role-badge\.lead/);
  assert.match(css, /\.role-badge\.teacher/);
});

test('multi-course grading presentation invariants across Course 03, Course 34, and Course 45', () => {
  // Course 03 (Scale 100): must be earned/max, never %
  const c03Score = formatDashboardScore({ earned: 87.5, maximum: 100, status: 'final' });
  assert.equal(c03Score, '87.5/100');
  assert.doesNotMatch(c03Score, /%/);

  // Course 45 (Speaking rubric scale 9 or 10): must be earned/max, never %
  const c45Score = formatDashboardScore({ earned: 6.5, maximum: 9, status: 'final' });
  assert.equal(c45Score, '6.5/9');
  assert.doesNotMatch(c45Score, /%/);

  // Course 34 (Scale 25): must be earned/max, never %
  const c34Score = formatDashboardScore({ earned: 18, maximum: 25, status: 'final' });
  assert.equal(c34Score, '18/25');
  assert.doesNotMatch(c34Score, /%/);

  // Provisional total score: distinct from final, never %
  const provisional = formatDashboardScore({ earned: 18, maximum: 25, status: 'provisional' });
  assert.equal(provisional, '18/25 · Tạm tính');
  assert.doesNotMatch(provisional, /%/);

  // Missing or untested skill: display "—", never 0 or 0%
  assert.equal(formatDashboardScore(null), '—');
});

test('dashboard URL preserves class and assignment isolation across multiple classes', () => {
  const c34AUrl = assignmentUrl('https://example.test/term-tests/teacher-dashboard/', {
    classId: 'class-c34-a',
    assignmentId: 'assign-c34-a-1'
  });
  assert.deepEqual(readDashboardState(c34AUrl), {
    classId: 'class-c34-a',
    assignmentId: 'assign-c34-a-1'
  });

  const c34BUrl = assignmentUrl(c34AUrl.toString(), {
    classId: 'class-c34-b',
    assignmentId: 'assign-c34-b-2'
  });
  assert.deepEqual(readDashboardState(c34BUrl), {
    classId: 'class-c34-b',
    assignmentId: 'assign-c34-b-2'
  });
});

test('teacher dashboard index.html and styles.css provide conflict alert element and styles', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="conflict-alert"/);
  assert.match(html, /class="conflict-alert"/);

  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.conflict-alert/);
});

test('teacher dashboard index.html and styles.css provide student test link bar and copy button', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="assignment-link-bar"/);
  assert.match(html, /id="assignment-student-url"/);
  assert.match(html, /id="copy-student-link-btn"/);
  assert.match(html, /id="open-student-link-btn"/);

  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.assignment-link-bar/);
  assert.match(css, /\.student-url-input/);
  assert.match(css, /\.card-copy-btn/);
});

test('extractAttemptSkills groups items by primary skill and aggregates scores & review counts', () => {
  const items = [
    { itemVersionId: 'v1', position: 1, primarySkill: 'vocabulary', scoreEarned: 0.5, maxScore: 0.5, needsReview: false, canGrade: false },
    { itemVersionId: 'v2', position: 2, primarySkill: 'vocabulary', scoreEarned: 0, maxScore: 0.5, needsReview: false, canGrade: false },
    { itemVersionId: 'v3', position: 3, primarySkill: 'writing', scoreEarned: 1.0, maxScore: 2.0, needsReview: true, canGrade: true },
    { itemVersionId: 'v4', position: 4, primarySkill: 'speaking', scoreEarned: 0, maxScore: 2.0, needsReview: true, canGrade: true }
  ];

  const result = extractAttemptSkills(items);
  assert.equal(result.skills.length, 3);
  assert.deepEqual(result.skills.map(s => s.code), ['vocabulary', 'writing', 'speaking']);

  const allSummary = result.summary['all'];
  assert.equal(allSummary.totalItems, 4);
  assert.equal(allSummary.needsReviewCount, 2);
  assert.equal(allSummary.scoreEarned, 1.5);
  assert.equal(allSummary.maxScore, 5.0);

  const vocabSummary = result.summary['vocabulary'];
  assert.equal(vocabSummary.totalItems, 2);
  assert.equal(vocabSummary.needsReviewCount, 0);
  assert.equal(vocabSummary.scoreEarned, 0.5);
  assert.equal(vocabSummary.maxScore, 1.0);

  const writingSummary = result.summary['writing'];
  assert.equal(writingSummary.totalItems, 1);
  assert.equal(writingSummary.needsReviewCount, 1);
});

test('formatCompactPrompt produces concise prompt without dumping massive option lists for text_select_pair', () => {
  const item = {
    position: 1,
    interactionType: 'text_select_pair',
    prompt: '1. Từ/cụm từ nghe được',
    options: Array.from({ length: 15 }, (_, i) => ({ id: `meaning-${i + 1}`, label: `Định nghĩa số ${i + 1}` }))
  };

  const compact = formatCompactPrompt(item);
  assert.equal(compact.text, '1. Từ/cụm từ nghe được');
  assert.equal(compact.optionsCount, 15);
  assert.equal(compact.hasExtensiveOptions, true);
});

test('resolveStudentAnswerDisplay resolves option labels and formats scalar/array answers', () => {
  const itemWithOpt = {
    interactionType: 'text_select_pair',
    studentAnswer: 'meaning-02',
    options: [
      { id: 'meaning-01', label: 'bạn cùng lớp' },
      { id: 'meaning-02', label: 'bảo thủ' }
    ]
  };
  assert.equal(resolveStudentAnswerDisplay(itemWithOpt), 'bảo thủ (meaning-02)');

  const itemArray = {
    studentAnswer: ['A', 'C'],
    options: [
      { id: 'A', label: 'Lựa chọn A' },
      { id: 'B', label: 'Lựa chọn B' },
      { id: 'C', label: 'Lựa chọn C' }
    ]
  };
  assert.equal(resolveStudentAnswerDisplay(itemArray), 'Lựa chọn A, Lựa chọn C');

  const itemNull = { studentAnswer: null };
  assert.equal(resolveStudentAnswerDisplay(itemNull), '(Chưa trả lời)');
});

test('resolveExpectedAnswerDisplay formats expected answers cleanly', () => {
  const item = {
    expectedAnswer: 'meaning-02',
    options: [
      { id: 'meaning-01', label: 'bạn cùng lớp' },
      { id: 'meaning-02', label: 'bảo thủ' }
    ]
  };
  assert.equal(resolveExpectedAnswerDisplay(item), 'bảo thủ (meaning-02)');

  const itemNoExp = { expectedAnswer: null, graderType: 'rubric_async' };
  assert.equal(resolveExpectedAnswerDisplay(itemNoExp), '(Chấm theo rubric)');
});

test('teacher dashboard index.html provides table grading view containers and context modal', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');

  assert.match(html, /id="attempt-skill-tabs"/);
  assert.match(html, /id="skill-summary-card"/);
  assert.match(html, /id="detail-items-table"/);
  assert.match(html, /id="item-context-modal"/);
  assert.match(html, /id="close-item-modal-btn"/);
});

test('teacher dashboard styles.css provides table grading and skill tab styles', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.grading-table/);
  assert.match(css, /\.skill-tabs/);
  assert.match(css, /\.skill-tab-btn/);
  assert.match(css, /\.skill-summary-card/);
  assert.match(css, /\.item-context-modal/);
});

test('extractAttemptSkills groups sections with accurate titles, scores, and correct counts matching student view', () => {
  const items = [
    {
      itemVersionId: 'v1',
      position: 1,
      sectionId: 'sec-1',
      sectionTitle: 'Vocabulary · Nghe từ và chọn nghĩa',
      primarySkill: 'vocabulary',
      scoreEarned: 0.5,
      maxScore: 0.5,
      verdict: 'correct',
      needsReview: false
    },
    {
      itemVersionId: 'v2',
      position: 2,
      sectionId: 'sec-1',
      sectionTitle: 'Vocabulary · Nghe từ và chọn nghĩa',
      primarySkill: 'vocabulary',
      scoreEarned: 0,
      maxScore: 0.5,
      verdict: 'incorrect',
      needsReview: false
    },
    {
      itemVersionId: 'v3',
      position: 3,
      sectionId: 'sec-2',
      sectionTitle: 'Listening · Đúng/Sai',
      primarySkill: 'listening',
      scoreEarned: 1.0,
      maxScore: 1.0,
      verdict: 'correct',
      needsReview: false
    }
  ];

  const result = extractAttemptSkills(items);
  assert.equal(result.skills.length, 2);
  assert.deepEqual(result.skills.map(s => s.code), ['vocabulary', 'listening']);
  assert.equal(result.skills[0].label, 'Vocabulary');
  assert.equal(result.skills[1].label, 'Listening');

  // Verify sections grouping in result
  assert.ok(Array.isArray(result.sections));
  assert.equal(result.sections.length, 2);

  const sec1 = result.sections[0];
  assert.equal(sec1.title, 'Vocabulary · Nghe từ và chọn nghĩa');
  assert.equal(sec1.skillCode, 'vocabulary');
  assert.equal(sec1.totalItems, 2);
  assert.equal(sec1.correctCount, 1);
  assert.equal(sec1.scoreEarned, 0.5);
  assert.equal(sec1.maxScore, 1.0);

  const sec2 = result.sections[1];
  assert.equal(sec2.title, 'Listening · Đúng/Sai');
  assert.equal(sec2.skillCode, 'listening');
  assert.equal(sec2.totalItems, 1);
  assert.equal(sec2.correctCount, 1);
  assert.equal(sec2.scoreEarned, 1.0);
  assert.equal(sec2.maxScore, 1.0);
});

test('styles.css enforces table-layout fixed, white-space normal, and section header styling to prevent text collision', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');

  // Ensure table-layout: fixed is configured on grading-table
  assert.match(css, /\.grading-table\s*\{[^}]*table-layout:\s*fixed/);
  // Ensure white-space: normal and word wrapping on grading-table td
  assert.match(css, /\.grading-table\s+(?:th,\s*\.grading-table\s+)?td\s*\{[^}]*white-space:\s*normal/);
  // Ensure section-header-row styling exists
  assert.match(css, /\.section-header-row/);
});

test('getScoreTier classifies scores into yellow (>=60%), red (45-59.9%), and gray (<45%) tiers', () => {
  assert.equal(getScoreTier(75, 100), 'tier-yellow');
  assert.equal(getScoreTier(60, 100), 'tier-yellow');
  assert.equal(getScoreTier(59.9, 100), 'tier-red');
  assert.equal(getScoreTier(45, 100), 'tier-red');
  assert.equal(getScoreTier(44.9, 100), 'tier-gray');
  assert.equal(getScoreTier(0, 100), 'tier-gray');

  // Multi-skill tests with different maximum scores
  assert.equal(getScoreTier(15, 25), 'tier-yellow'); // 60%
  assert.equal(getScoreTier(12, 25), 'tier-red');    // 48%
  assert.equal(getScoreTier(10, 25), 'tier-gray');   // 40%

  // Edge cases
  assert.equal(getScoreTier(null, 100), null);
  assert.equal(getScoreTier(50, 0), null);
});

test('computeClassSkillSummary calculates class average and per-skill breakdown', () => {
  const payload = {
    skills: [
      { code: 'vocabulary', maximum: 25 },
      { code: 'listening', maximum: 25 }
    ],
    students: [
      {
        name: 'Student A',
        status: 'complete',
        attemptId: 'att-1',
        total: { earned: 80, maximum: 100, status: 'final' },
        skills: {
          vocabulary: { earned: 20, maximum: 25, status: 'final' },
          listening: { earned: 20, maximum: 25, status: 'final' }
        }
      },
      {
        name: 'Student B',
        status: 'complete',
        attemptId: 'att-2',
        total: { earned: 50, maximum: 100, status: 'final' },
        skills: {
          vocabulary: { earned: 10, maximum: 25, status: 'final' },
          listening: { earned: 15, maximum: 25, status: 'final' }
        }
      },
      {
        name: 'Student C',
        status: 'not_started',
        attemptId: null,
        total: null,
        skills: {
          vocabulary: null,
          listening: null
        }
      }
    ]
  };

  const summary = computeClassSkillSummary(payload);
  assert.equal(summary.totalStudents, 3);
  assert.equal(summary.submittedCount, 2);
  assert.ok(summary.totalAverage);
  assert.equal(summary.totalAverage.earned, 65); // (80 + 50) / 2
  assert.equal(summary.totalAverage.maximum, 100);
  assert.equal(summary.totalAverage.tier, 'tier-yellow');

  assert.equal(summary.skills.length, 2);
  assert.equal(summary.skills[0].code, 'vocabulary');
  assert.equal(summary.skills[0].earned, 15); // (20 + 10) / 2
  assert.equal(summary.skills[0].maximum, 25);
  assert.equal(summary.skills[0].tier, 'tier-yellow'); // 15/25 = 60%

  assert.equal(summary.skills[1].code, 'listening');
  assert.equal(summary.skills[1].earned, 17.5); // (20 + 15) / 2
  assert.equal(summary.skills[1].maximum, 25);
  assert.equal(summary.skills[1].tier, 'tier-yellow'); // 17.5/25 = 70%
});

test('teacher dashboard index.html removes % symbols from filters and provides class skill summary container', async () => {
  const fs = await import('node:fs/promises');
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');

  // Must not have % in score filter labels or placeholders
  assert.equal(html.includes('Từ (%)'), false);
  assert.equal(html.includes('Đến (%)'), false);
  assert.equal(html.includes('placeholder="0%"'), false);
  assert.equal(html.includes('placeholder="100%"'), false);

  // Must provide proper filter labels and container
  assert.match(html, /<span>Từ điểm<\/span>/);
  assert.match(html, /<span>Đến điểm<\/span>/);
  assert.match(html, /id="class-skill-summary"/);
});

test('teacher dashboard styles.css provides class summary cards and tier colors without inline-block on td', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.tier-yellow/);
  assert.match(css, /\.tier-red/);
  assert.match(css, /\.tier-gray/);
  assert.match(css, /\.class-skill-summary/);
  assert.match(css, /\.class-summary-card/);
  assert.match(css, /\.status-cell-wrap/);
});

test('formatCompactScore formats score as a clean number without repeating max score', () => {
  assert.equal(formatCompactScore({ earned: 19.5, maximum: 25, status: 'final' }), '19.5');
  assert.equal(formatCompactScore({ earned: 14, maximum: 15, status: 'final' }), '14');
  assert.equal(formatCompactScore({ earned: 87.7, maximum: 100, status: 'final' }), '87.7');
  assert.equal(formatCompactScore({ earned: 50, maximum: 100, status: 'provisional' }), '50 (Tạm tính)');
  assert.equal(formatCompactScore({ status: 'pending' }), 'Chờ chấm');
  assert.equal(formatCompactScore(null), '—');
});

test('formatSubmissionTimestamp formats valid timestamps into separate time and date components', () => {
  const formatted = formatSubmissionTimestamp('2026-10-12T14:11:00.000Z');
  assert.ok(formatted);
  assert.match(formatted.time, /^\d{2}:\d{2}$/);
  assert.match(formatted.date, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(formatSubmissionTimestamp(null), null);
  assert.equal(formatSubmissionTimestamp('invalid-date'), null);
});

test('teacher dashboard styles.css provides .score-total, .score-skill, and .time-stamp-wrap styles', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.score-total/);
  assert.match(css, /\.score-total\.tier-yellow/);
  assert.match(css, /\.score-total\.tier-red/);
  assert.match(css, /\.score-total\.tier-gray/);
  assert.match(css, /\.score-skill/);
  assert.match(css, /\.time-stamp-wrap/);
  assert.match(css, /\.time-part/);
  assert.match(css, /\.date-part/);
});

test('teacher dashboard styles.css provides .th-score, .th-score-wrap, and table container fit styles', async () => {
  const fs = await import('node:fs/promises');
  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.th-score/);
  assert.match(css, /\.th-score-wrap/);
  assert.match(css, /\.th-score-label/);
  assert.match(css, /\.th-score-max/);
  assert.match(css, /\.results-scroll/);
});








