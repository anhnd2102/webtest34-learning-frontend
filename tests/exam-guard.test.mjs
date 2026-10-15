import assert from 'node:assert/strict';
import '../term-tests/webtest-34-demo/exam-guard.js';
import test from 'node:test';

const reduce = globalThis.examGuardReducer;
const withDeviceId = globalThis.examDeviceRequestBody;
const initial = { running: true, fullscreenSupported: true };

test('combines tab and fullscreen exits within two seconds into one incident', () => {
  let result = reduce(initial, { type: 'left_exam', reason: 'hidden', at: 1000, incidentId: 'incident-1' });
  result = reduce(result.state, { type: 'left_exam', reason: 'fullscreen', at: 2999, incidentId: 'incident-2' });

  assert.equal(result.state.incidentId, 'incident-1');
  assert.equal(result.commands.filter(command => command.type === 'open_incident').length, 0);
});

test('a new incident after the two-second threshold is not folded into the prior event', () => {
  const first = reduce(initial, { type: 'left_exam', reason: 'hidden', at: 1000, incidentId: 'incident-1' });
  const next = reduce(first.state, { type: 'left_exam', reason: 'fullscreen', at: 3001, incidentId: 'incident-2' });

  assert.equal(next.state.incidentId, 'incident-2');
  assert.ok(next.commands.some(command => command.type === 'open_incident' && command.incidentId === 'incident-2'));
});

test('ignores leave events before the exam is running', () => {
  const result = reduce({ ...initial, running: false }, { type: 'left_exam', reason: 'hidden', at: 1000, incidentId: 'incident-1' });

  assert.deepEqual(result.commands, []);
  assert.equal(result.state.incidentId, undefined);
});

test('uses a return prompt without fullscreen when fullscreen is unsupported', () => {
  const left = reduce({ ...initial, fullscreenSupported: false }, { type: 'left_exam', reason: 'blur', at: 1000, incidentId: 'incident-1' });
  const returned = reduce(left.state, { type: 'return_click', at: 2000 });

  assert.equal(left.state.prompt, true);
  assert.ok(left.commands.some(command => command.type === 'pause_audio'));
  assert.ok(returned.commands.some(command => command.type === 'resume_audio'));
  assert.ok(!returned.commands.some(command => command.type === 'request_fullscreen'));
});

test('opens an incident while running and closes the same incident from the return action', () => {
  const left = reduce(initial, { type: 'left_exam', reason: 'blur', at: 1000, incidentId: 'incident-1' });
  const returned = reduce(left.state, { type: 'return_click', at: 1500 });

  assert.ok(left.commands.some(command => command.type === 'open_incident' && command.incidentId === 'incident-1'));
  assert.ok(returned.commands.some(command => command.type === 'close_incident' && command.incidentId === 'incident-1'));
  assert.ok(returned.commands.some(command => command.type === 'request_fullscreen'));
});

test('a superseded tab is locked and cannot resume the attempt', () => {
  const result = reduce(initial, { type: 'device_superseded' });
  const returned = reduce(result.state, { type: 'return_click', at: 2000 });

  assert.equal(result.state.superseded, true);
  assert.equal(result.state.prompt, true);
  assert.deepEqual(result.commands, [{ type: 'pause_audio' }]);
  assert.deepEqual(returned.commands, []);
});

test('attempt request bodies carry the tab device id without dropping existing fields', () => {
  assert.deepEqual(withDeviceId({attemptToken: 'attempt-1', revision: 3}, 'device-b'), {
    attemptToken: 'attempt-1', revision: 3, deviceId: 'device-b'
  });
});
