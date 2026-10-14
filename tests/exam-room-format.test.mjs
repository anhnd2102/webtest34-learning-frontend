import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignmentExamExtendPath,
  assignmentExamEventsPath,
  assignmentExamRoomPath,
  assignmentExamStartPath,
  formatExamRoomStatus,
  formatExamReadyCount,
  applyExamProgress,
  formatExamProgress
} from '../term-tests/teacher-dashboard/app.js';

test('exam room status formatter covers all participation states', () => {
  assert.equal(formatExamRoomStatus('not_entered'), 'Chưa vào');
  assert.equal(formatExamRoomStatus('entered'), 'Đã vào');
  assert.equal(formatExamRoomStatus('ready'), 'Sẵn sàng');
});

test('exam room ready count formatter includes ready and roster totals', () => {
  assert.equal(formatExamReadyCount({ readyCount: 2, totalCount: 4 }), '2/4 sẵn sàng');
});

test('exam progress updates only the matching student and formats answered over total', () => {
  const room = { students: [{ studentRef: 's1' }, { studentRef: 's2' }] };
  const updated = applyExamProgress(room, { studentRef: 's2', progress: { answered: 3, total: 8 } });
  assert.deepEqual(updated.students, [
    { studentRef: 's1' },
    { studentRef: 's2', progress: { answered: 3, total: 8 } }
  ]);
  assert.equal(formatExamProgress(updated.students[1].progress), '3/8');
  assert.equal(formatExamProgress(undefined), '—');
});

test('exam progress ignores malformed counts and unknown students', () => {
  const room = { students: [{ studentRef: 's1' }] };
  assert.equal(applyExamProgress(room, { studentRef: 'missing', progress: { answered: 1, total: 2 } }), room);
  assert.equal(applyExamProgress(room, { studentRef: 's1', progress: { answered: 3, total: 2 } }), room);
});

test('exam room controls use the teacher API routes for snapshot, start, and extension', () => {
  assert.equal(assignmentExamRoomPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/room');
  assert.equal(assignmentExamStartPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/start');
  assert.equal(assignmentExamExtendPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/extend');
  assert.equal(assignmentExamEventsPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/events');
});
