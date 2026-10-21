import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentSelfProctoringPath, examModeLockReason, incidentCellText, selfProctoringLockReason, selfProctoringRequestBody } from '../term-tests/teacher-dashboard/app.js';

test('assignmentSelfProctoringPath dùng endpoint giáo viên theo lớp', () => {
  assert.equal(
    assignmentSelfProctoringPath('101', '11111111-1111-4111-8111-111111111111'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/self-proctoring'
  );
});

test('bật Tự giám sát bắt buộc nhập Giới hạn thoát là số nguyên ≥ 0', () => {
  assert.deepEqual(selfProctoringRequestBody(true, '3'), { exitLimit: 3 });
  assert.deepEqual(selfProctoringRequestBody(true, '0'), { exitLimit: 0 });
  for (const raw of ['', '  ', '-1', '1.5', 'abc']) {
    assert.throws(() => selfProctoringRequestBody(true, raw), /Giới hạn thoát/, JSON.stringify(raw));
  }
});

test('tắt Tự giám sát gửi exitLimit null', () => {
  assert.deepEqual(selfProctoringRequestBody(false, ''), { exitLimit: null });
});

test('ô sự cố hiện X/N và nhãn tự nộp khi bài Tự giám sát', () => {
  assert.equal(incidentCellText({ attemptId: 'a', incidentCount: 1, exitLimit: 2, autoSubmitted: false }), '1/2');
  assert.equal(incidentCellText({ attemptId: 'a', incidentCount: 3, exitLimit: 2, autoSubmitted: true }), '3/2 · Tự nộp do vượt giới hạn');
  assert.equal(incidentCellText({ attemptId: 'a', incidentCount: 2, exitLimit: null }), '2');
  assert.equal(incidentCellText({ attemptId: null, incidentCount: 0, exitLimit: 2 }), '—');
});

test('Exam Mode bị khoá khi bài đang bật Tự giám sát: nêu lý do cho giáo viên', () => {
  assert.equal(examModeLockReason({ exitLimit: null }), '');
  assert.equal(examModeLockReason({}), '');
  assert.match(examModeLockReason({ exitLimit: 2 }), /Tự giám sát/);
  assert.match(examModeLockReason({ exitLimit: 0 }), /không bật được Exam Mode/);
});

test('Tự giám sát bị khoá khi bài đang bật Exam Mode hoặc đã chuyển từ phiên thi: nêu lý do', () => {
  assert.equal(selfProctoringLockReason({ examMode: false }), '');
  assert.match(selfProctoringLockReason({ examMode: true }), /tắt Exam Mode/);
  assert.match(selfProctoringLockReason({ examMode: false, examSession: { status: 'ended' } }), /đã chuyển từ Exam Mode/);
});
