import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {
  formatIncidentDuration,
  formatIncidentTimeline,
  incidentTypeLabel
} from '../term-tests/teacher-dashboard/app.js';

test('incident type labels use teacher-facing Vietnamese copy', () => {
  assert.equal(incidentTypeLabel('left_exam'), 'Rời khỏi bài thi');
  assert.equal(incidentTypeLabel('device_switch'), 'Đổi thiết bị');
  assert.equal(incidentTypeLabel('other_event'), 'other_event');
});

test('incident durations format seconds, minutes, and hours', () => {
  assert.equal(formatIncidentDuration(0), '0 giây');
  assert.equal(formatIncidentDuration(61), '1 phút 1 giây');
  assert.equal(formatIncidentDuration(3661), '1 giờ 1 phút 1 giây');
  assert.equal(formatIncidentDuration(null), '—');
});

test('timeline formatter includes localized timestamps and open incidents', () => {
  assert.deepEqual(formatIncidentTimeline([
    { incidentId: 'closed', type: 'left_exam', startedAt: '2026-10-15T01:02:03Z', endedAt: '2026-10-15T01:03:03Z', durationSeconds: 60 },
    { incidentId: 'open', type: 'left_exam', startedAt: '2026-10-15T02:00:00Z', endedAt: null, durationSeconds: null }
  ]), [
    { incidentId: 'closed', typeLabel: 'Rời khỏi bài thi', startedAt: '08:02:03 15/10/2026', endedAt: '08:03:03 15/10/2026', duration: '1 phút' },
    { incidentId: 'open', typeLabel: 'Rời khỏi bài thi', startedAt: '09:00:00 15/10/2026', endedAt: 'Đang diễn ra', duration: '—' }
  ]);
});

test('incident details stay in the teacher dashboard, outside the student renderer', async () => {
  const teacherApp = await fs.readFile(new URL('../term-tests/teacher-dashboard/app.js', import.meta.url), 'utf8');
  const teacherPage = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  const studentPage = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(teacherApp, /student\.incidentCount/);
  assert.match(teacherApp, /fillIncidentTimeline\(detailIncidents, payload\.incidents\)/);
  assert.match(teacherPage, /id="detail-incidents"/);
  assert.doesNotMatch(studentPage, /incidentCount|detail-incidents/);
  const studentRenderer = await fs.readFile(new URL('../term-tests/webtest-34-demo/content-preview.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(studentRenderer, /incidentCount|detail-incidents/);
});
