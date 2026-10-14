import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSseChunk } from '../term-tests/teacher-dashboard/exam-room-sse.js';

test('SSE parser waits for a complete event across chunk boundaries', () => {
  const first = parseSseChunk('', 'event: snapshot\ndata: {"room":{"status":');
  assert.deepEqual(first.events, []);
  const second = parseSseChunk(first.buffer, '"waiting"}}\n\n');
  assert.deepEqual(second.events, [{ event: 'snapshot', data: { room: { status: 'waiting' } } }]);
  assert.equal(second.buffer, '');
});

test('SSE parser handles CRLF, comments, and multi-line data', () => {
  const result = parseSseChunk('', ': heartbeat\r\nevent: incident.opened\r\ndata: {"attemptId":\r\ndata: "a1"}\r\n\r\n');
  assert.deepEqual(result.events, [{ event: 'incident.opened', data: { attemptId: 'a1' } }]);
});
