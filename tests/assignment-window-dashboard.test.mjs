import test from 'node:test';
import assert from 'node:assert/strict';
import { assignmentWindowPath, assignmentWindowRequestBody, isoToVnInputValue } from '../term-tests/teacher-dashboard/app.js';

test('assignmentWindowPath dùng endpoint giáo viên theo lớp', () => {
  assert.equal(
    assignmentWindowPath('101', '11111111-1111-4111-8111-111111111111'),
    '/api/teacher/classes/101/assignments/11111111-1111-4111-8111-111111111111/window'
  );
});

test('giờ nhập được hiểu theo múi giờ Việt Nam (UTC+7)', () => {
  assert.deepEqual(
    assignmentWindowRequestBody('2026-10-13T13:57', '2026-10-20T17:00'),
    { opensAt: '2026-10-13T06:57:00.000Z', closesAt: '2026-10-20T10:00:00.000Z' }
  );
});

test('ô trống nghĩa là không giới hạn (null)', () => {
  assert.deepEqual(assignmentWindowRequestBody('2026-10-13T13:57', ''), { opensAt: '2026-10-13T06:57:00.000Z', closesAt: null });
  assert.deepEqual(assignmentWindowRequestBody('', ''), { opensAt: null, closesAt: null });
});

test('ISO được đổi lại thành giá trị ô nhập theo giờ Việt Nam', () => {
  assert.equal(isoToVnInputValue('2027-04-12T06:57:00.000Z'), '2027-04-12T13:57');
  assert.equal(isoToVnInputValue(null), '');
});
