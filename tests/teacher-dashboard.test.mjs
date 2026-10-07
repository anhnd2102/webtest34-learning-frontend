import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentUrl,
  fixtureHeaders,
  formatAssignmentWindow,
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

test('fixture headers encode only the selected role scope', () => {
  assert.deepEqual(fixtureHeaders({ actorId: 'lead@izone.test', role: 'lead', scope: '34' }), {
    'X-Teacher-Fixture-Id': 'lead@izone.test',
    'X-Teacher-Fixture-Role': 'lead',
    'X-Teacher-Fixture-Course-Codes': '34'
  });
  assert.deepEqual(fixtureHeaders({ actorId: 'teacher@izone.test', role: 'teacher', scope: '101, 202' }), {
    'X-Teacher-Fixture-Id': 'teacher@izone.test',
    'X-Teacher-Fixture-Role': 'teacher',
    'X-Teacher-Fixture-Class-Ids': '101,202'
  });
});

test('assignment time display handles open-ended windows', () => {
  assert.equal(formatAssignmentWindow(null, null), 'Không giới hạn thời gian');
  assert.match(formatAssignmentWindow('2026-10-01T00:00:00.000Z', '2026-10-08T00:00:00.000Z', 'vi-VN', 'UTC'), /01\/10\/2026.*08\/10\/2026/);
});
