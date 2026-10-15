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
  applyExamConnection,
  applyExamIncident,
  formatExamConnectionStatus,
  formatExamProgress
} from '../term-tests/teacher-dashboard/app.js';

test('exam room status formatter covers all participation states', () => {
  assert.equal(formatExamRoomStatus('not_entered'), 'Chưa vào');
  assert.equal(formatExamRoomStatus('entered'), 'Đã vào');
  assert.equal(formatExamRoomStatus('ready'), 'Sẵn sàng');
  assert.equal(formatExamRoomStatus('in_progress'), 'Đang làm');
  assert.equal(formatExamRoomStatus('submitted'), 'Đã nộp');
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

test('exam connection updates only the matching student and formats both states', () => {
  const room = { students: [{ studentRef: 's1', connectionStatus: 'connected' }, { studentRef: 's2' }] };
  const updated = applyExamConnection(room, { studentRef: 's2', status: 'disconnected' });
  assert.equal(updated.students[0].connectionStatus, 'connected');
  assert.equal(updated.students[1].connectionStatus, 'disconnected');
  assert.equal(formatExamConnectionStatus('connected'), 'Đang kết nối');
  assert.equal(formatExamConnectionStatus('disconnected'), 'Mất kết nối');
  assert.equal(applyExamConnection(room, { studentRef: 's2', status: 'unknown' }), room);
});

test('exam room controls use the teacher API routes for snapshot, start, and extension', () => {
  assert.equal(assignmentExamRoomPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/room');
  assert.equal(assignmentExamStartPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/start');
  assert.equal(assignmentExamExtendPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/extend');
  assert.equal(assignmentExamEventsPath('101', 'assignment/id'), '/api/teacher/classes/101/assignments/assignment%2Fid/exam/events');
});

test('incident events keep the per-student incident count and open incidents up to date', () => {
  const room = { status: 'running', students: [
    { studentRef: 'a', incidentCount: 0, openIncidents: [] },
    { studentRef: 'b', incidentCount: 2, openIncidents: [] }
  ] };
  const incident = { incidentId: 'i1', type: 'left_exam', status: 'open', startedAt: '2026-10-15T01:00:00.000Z', endedAt: null };
  const opened = applyExamIncident(room, { studentRef: 'a', incident, incidentCount: 1 });
  assert.equal(opened.students[0].incidentCount, 1);
  assert.deepEqual(opened.students[0].openIncidents.map(item => item.incidentId), ['i1']);
  assert.equal(opened.students[1].incidentCount, 2);

  const closed = applyExamIncident(opened, { studentRef: 'a', incident: { ...incident, status: 'closed', endedAt: '2026-10-15T01:00:05.000Z' }, incidentCount: 1 });
  assert.equal(closed.students[0].incidentCount, 1);
  assert.deepEqual(closed.students[0].openIncidents, []);
  assert.equal(applyExamIncident(room, { studentRef: 'zzz', incident, incidentCount: 1 }), room);
});
