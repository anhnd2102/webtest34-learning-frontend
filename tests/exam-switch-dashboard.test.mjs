import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  assignmentExamModePath,
  examSwitchErrorView,
  examSwitchRequestBody,
  examSwitchSuccessText,
  examSwitchView,
  formatExamDeadline,
  incidentCellText
} from '../term-tests/teacher-dashboard/app.js';

const running = (deadlineAt = '2026-10-21T04:30:00.000Z') => ({
  examMode: true, exitLimit: null, examSession: { status: 'running', startedAt: '2026-10-21T02:00:00.000Z', deadlineAt }
});

test('yêu cầu chuyển là một PATCH exam-mode duy nhất, N nguyên ≥ 0 bắt buộc và không có mặc định', () => {
  assert.equal(assignmentExamModePath('101', 'a'), '/api/teacher/classes/101/assignments/a/exam-mode');
  assert.deepEqual(examSwitchRequestBody('3'), { enabled: false, switchTo: 'self-proctoring', exitLimit: 3 });
  assert.deepEqual(examSwitchRequestBody(' 0 '), { enabled: false, switchTo: 'self-proctoring', exitLimit: 0 });
  for (const raw of ['', '  ', undefined, null, '-1', '1.5', 'abc', '2e1']) {
    assert.throws(() => examSwitchRequestBody(raw), /Giới hạn thoát/, String(raw));
  }
});

test('khối chuyển chỉ hiện khi Exam Mode đã có phiên đang chạy/đã kết thúc theo dữ liệu server', () => {
  assert.equal(examSwitchView({ examMode: true, examSession: { status: 'waiting' } }).visible, false);
  assert.equal(examSwitchView({ examMode: true, examSession: null }).visible, false);
  assert.equal(examSwitchView({ examMode: false, exitLimit: 2, examSession: { status: 'ended' } }).visible, false, 'đã chuyển rồi');
  assert.equal(examSwitchView({ examMode: false, exitLimit: null, examSession: null }).visible, false);
  assert.equal(examSwitchView(running()).visible, true);
  assert.equal(examSwitchView({ examMode: true, examSession: { status: 'ended', deadlineAt: '2026-10-21T04:30:00.000Z' } }).visible, true);
});

test('lời giải thích dùng deadline và serverNow do server trả, hiển thị giờ Việt Nam, không dùng đồng hồ trình duyệt', () => {
  assert.equal(formatExamDeadline('2026-10-21T04:30:00.000Z'), '11:30 21/10/2026 (giờ Việt Nam, UTC+7)');
  assert.equal(formatExamDeadline(null), 'chưa xác định');
  const before = examSwitchView(running(), { serverNow: '2026-10-21T04:29:59.999Z' });
  assert.match(before.hint, /đang diễn ra.*11:30 21\/10\/2026/);
  const after = examSwitchView(running(), { serverNow: '2026-10-21T04:30:00.000Z' });
  assert.match(after.hint, /đã quá hạn nộp.*11:30 21\/10\/2026/);
  // Không có serverNow thì không tự suy ra là hết giờ.
  assert.match(examSwitchView(running()).hint, /đang diễn ra/);
  assert.match(examSwitchView(running(null)).hint, /Chưa xác định được hạn nộp/);
});

test('mỗi lỗi từ server có thông báo rõ và biết có nên thử lại', () => {
  const still = examSwitchErrorView({ code: 'EXAM_SESSION_STILL_RUNNING', details: { deadlineAt: '2026-10-21T04:45:00.000Z' } });
  assert.match(still.text, /chưa kết thúc.*11:45 21\/10\/2026/);
  assert.equal(still.retryable, false);
  const pending = examSwitchErrorView({ code: 'EXAM_SETTLEMENT_PENDING' });
  assert.equal(pending.retryable, true);
  assert.match(pending.text, /Chưa có gì bị thay đổi/);
  assert.match(examSwitchErrorView({ code: 'INVALID_EXAM_DEADLINE' }).text, /Không xác định được hạn nộp/);
  assert.match(examSwitchErrorView({ code: 'SELF_PROCTORING_LOCKED' }).text, /không thể đổi/);
  assert.equal(examSwitchErrorView({ code: 'TEACHER_CLASS_FORBIDDEN', message: 'Bạn không có quyền truy cập lớp này.' }).text, 'Bạn không có quyền truy cập lớp này.');
});

test('thông báo thành công nói rõ lượt mới, lịch sử và quyền làm lại', () => {
  const text = examSwitchSuccessText({ exitLimit: 2, switched: true });
  assert.match(text, /Đã chuyển sang Tự giám sát: thoát quá 2 lần/);
  assert.match(text, /chỉ áp dụng cho lượt làm bắt đầu từ bây giờ/);
  assert.match(text, /quyền làm lại được giữ nguyên/);
  assert.match(examSwitchSuccessText({ exitLimit: 2, switched: false }), /^Bài đã ở Tự giám sát/);
});

test('lượt Exam Mode cũ không hiện N hay nhãn tự nộp của cấu hình mới', () => {
  assert.equal(incidentCellText({ attemptId: 'a', incidentCount: 2, exitLimit: null, autoSubmitted: false, proctoringMode: 'exam' }), '2');
  assert.equal(incidentCellText({ attemptId: 'b', incidentCount: 2, exitLimit: 1, autoSubmitted: true, proctoringMode: 'self' }), '2/1 · Tự nộp do vượt giới hạn');
});

test('dashboard nối thao tác chuyển, đọc lại từ server, và vẫn mở được phòng thi sau khi chuyển', async () => {
  const app = (await fs.readFile(new URL('../term-tests/teacher-dashboard/app.js', import.meta.url), 'utf8')) + '\n' + (await fs.readFile(new URL('../term-tests/teacher-dashboard/shell/dashboard.js', import.meta.url), 'utf8'));
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  for (const id of ['exam-switch-controls', 'exam-switch-limit', 'exam-switch-btn', 'exam-switch-hint', 'exam-switch-message']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  // Một request duy nhất rồi loadAssignments để đọc lại; không gọi tắt hai request.
  assert.ok(app.includes('examSwitchRequestBody(examSwitchLimit.value)'));
  assert.match(app, /await loadAssignments\(state\.classId, target\.assignmentId\);\s*setExamSwitchMessage\(examSwitchSuccessText\(payload\), 'success'\)/);
  assert.ok(app.includes('examRoomOpenButton.hidden = !(assignment.examMode || assignment.examSession)'));
  // Không dùng đồng hồ trình duyệt hay 150 phút cứng để quyết định chuyển.
  const block = app.slice(app.indexOf('export function examSwitchView'), app.indexOf('export function examSwitchErrorView'));
  assert.doesNotMatch(block, /Date\.now|new Date\(\)|150/);
});

test('học viên Learning trực tiếp lấy chế độ từ chính lượt do server trả, không giữ Exam Mode cũ trong trình duyệt', async () => {
  const page = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.ok(page.includes('exam: result.attempt.exam || null,'));
  assert.ok(!page.includes('result.attempt.exam || state.learning?.exam'));
  assert.ok(page.includes('selfProctoring: result.attempt.selfProctoring || null'));
  const preview = await fs.readFile(new URL('../term-tests/webtest-34-demo/content-preview.mjs', import.meta.url), 'utf8');
  assert.ok(preview.includes('learningState.exam = startRes.attempt.exam || null;'));
  assert.ok(preview.includes('learningState.selfProctoring = startRes.attempt.selfProctoring || null;'));
});
