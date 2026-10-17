import assert from 'node:assert/strict';
import test from 'node:test';
import { examPhase, learningRequestBody } from '../term-tests/webtest-34-demo/content-preview.mjs';

const deviceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

test('attempt requests carry the tab device id so Exam Mode can start', () => {
  assert.deepEqual(
    learningRequestBody('/attempts/start', { studentRef: 's1' }, deviceId),
    { studentRef: 's1', deviceId }
  );
  assert.deepEqual(
    learningRequestBody('/test-access/resolve', { courseCode: 'IC2293' }, deviceId),
    { courseCode: 'IC2293' }
  );
});

test('/attempts/review không mang deviceId (schema backend strict)', () => {
  const body = { testToken: 't', courseCode: 'IC1', studentRef: 's1' };
  assert.deepEqual(learningRequestBody('/attempts/review', body, deviceId), body);
});

test('examPhase sends waiting students to the lobby and guards running or retake attempts', () => {
  assert.equal(examPhase({ status: 'active' }), 'off');
  assert.equal(examPhase({ status: 'active', exam: { enabled: true, status: 'waiting' } }), 'waiting');
  assert.equal(examPhase({ status: 'active', exam: { enabled: true, status: 'running' } }), 'running');
  assert.equal(examPhase({ status: 'active', exam: { enabled: true, status: 'running', retake: true } }), 'running');
  assert.equal(examPhase({ status: 'submitted', exam: { enabled: true, status: 'running' } }), 'off');
});
