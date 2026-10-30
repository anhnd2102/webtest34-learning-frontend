import test from 'node:test';
import assert from 'node:assert/strict';
import { mountDashboard } from '../term-tests/teacher-dashboard/shell/dashboard.js';
import { createDOMFixture } from './helpers/dashboard-fixture.mjs';

const flush = () => new Promise(resolve => setImmediate(resolve));
const json = payload => ({ ok: true, status: 200, json: async () => payload });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fakeStream() {
  let pending;
  const queue = [];
  const stats = { cancelled: 0, released: 0 };
  const reader = {
    read() {
      if (queue.length) return Promise.resolve(queue.shift());
      pending = deferred();
      return pending.promise;
    },
    // Deliberately ignores cancellation so a late read can still complete.
    cancel() { stats.cancelled++; return Promise.resolve(); },
    releaseLock() { stats.released++; }
  };
  const deliver = value => {
    if (pending) { const waiter = pending; pending = null; waiter.resolve(value); }
    else queue.push(value);
  };
  return {
    stats,
    response: { ok: true, status: 200, body: { getReader: () => reader } },
    send(event, data) { deliver({ done: false, value: new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) }); },
    sendBatch(events) { deliver({ done: false, value: new TextEncoder().encode(events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('')) }); },
    fail(error) { const waiter = pending; pending = null; waiter.reject(error); },
    end() { deliver({ done: true }); }
  };
}
const room = name => ({ status: 'running', readyCount: 1, totalCount: 1, students: [{ studentRef: 's1', name, status: 'in_progress', progress: { answered: 0, total: 2 } }] });

async function harness(t, { roomRead, streamRead, logoutRead } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { document, get } = createDOMFixture(t);
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  globalThis.sessionStorage = { getItem: key => key === 'izone_teacher_token' ? 'synthetic-room-token' : null, removeItem() {} };
  t.after(() => {
    if (saved) Object.defineProperty(globalThis, 'sessionStorage', saved);
    else delete globalThis.sessionStorage;
  });
  const streams = [];
  const signals = [];
  let roomReads = 0;
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/auth/me')) return json({ teacher: { name: 'Synthetic teacher', role: 'teacher' } });
    if (path.endsWith('/auth/logout')) return logoutRead ? logoutRead() : json({});
    if (path.endsWith('/classes')) return json({ classes: [{ classId: '101', name: 'Synthetic class' }, { classId: '102', name: 'New class' }] });
    if (path.endsWith('/assignments')) return json({ assignments: [{ assignmentId: 'assign-1', title: 'Synthetic assignment', examMode: true }, { assignmentId: 'assign-2', title: 'New assignment', examMode: true }] });
    if (path.endsWith('/results')) return json({ assignment: { assignmentId: 'assign-1' }, skills: [], students: [] });
    if (path.endsWith('/exam/room')) {
      roomReads++;
      return roomRead ? roomRead(roomReads, path) : json({ room: room('REST student') });
    }
    if (path.endsWith('/exam/events')) {
      const stream = fakeStream();
      streams.push(stream);
      signals.push(options.signal);
      assert.equal(options.headers.Accept, 'text/event-stream');
      assert.ok(options.headers.Authorization.startsWith('Bearer '));
      return streamRead ? streamRead(stream, streams.length) : stream.response;
    }
    throw new Error(`Unexpected fixture request ${path}`);
  });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  await flush();
  return {
    document, get, handle, streams, signals,
    get roomReads() { return roomReads; },
    async open() { get('#exam-room-open').dispatchEvent(new Event('click')); await flush(); },
    close() { get('#exam-room-close').dispatchEvent(new Event('click')); },
    studentName() { return get('#exam-room-students')._children?.[0]?._children?.[0]?.textContent; }
  };
}

test('room owner: close while initial REST is pending never starts a stream', async t => {
  const initial = deferred();
  const h = await harness(t, { roomRead: () => initial.promise });
  await h.open();
  h.close();
  initial.resolve(json({ room: room('late initial') }));
  await flush();
  assert.equal(h.streams.length, 0);
  assert.equal(h.get('#exam-room').hidden, true);
});

test('room owner: logout stops the stream before its HTTP request completes', async t => {
  const logout = deferred();
  const h = await harness(t, { logoutRead: () => logout.promise });
  await h.open();
  h.get('#logout-btn').dispatchEvent(new Event('click'));
  assert.equal(h.signals[0].aborted, true);
  assert.equal(h.streams[0].stats.cancelled, 1);
  logout.resolve(json({}));
  await flush();
});

for (const stop of ['close', 'class', 'assignment', 'logout', 'dispose']) {
  test(`room owner: ${stop} cancels reader and ignores late snapshot without reconnect`, async t => {
    const h = await harness(t);
    await h.open();
    assert.equal(h.streams.length, 1);
    h.streams[0].send('snapshot', { room: room('current snapshot') });
    await flush();
    assert.equal(h.studentName(), 'current snapshot');
    if (stop === 'close') h.close();
    if (stop === 'dispose') h.handle.dispose();
    if (stop === 'class') { h.get('#class-select').value = '102'; h.get('#class-select').dispatchEvent(new Event('change')); }
    if (stop === 'assignment') { h.get('#assignment-select').value = 'assign-2'; h.get('#assignment-select').dispatchEvent(new Event('change')); }
    if (stop === 'logout') { h.get('#logout-btn').dispatchEvent(new Event('click')); await flush(); }
    assert.equal(h.signals[0].aborted, true);
    assert.equal(h.streams[0].stats.cancelled, 1);
    const name = h.studentName();
    h.streams[0].send('snapshot', { room: room('stale snapshot') });
    await flush();
    t.mock.timers.tick(5000);
    await flush();
    assert.equal(h.studentName(), name);
    assert.equal(h.streams.length, 1);
    assert.equal(h.streams[0].stats.released, 1);
  });
}

test('room owner: ten close/reopen cycles keep only the newest stream active', async t => {
  const h = await harness(t);
  for (let i = 0; i < 10; i++) {
    await h.open();
    assert.equal(h.streams.length, i + 1);
    const stream = h.streams[i];
    stream.send('snapshot', { room: room(`current ${i}`) });
    await flush();
    assert.equal(h.studentName(), `current ${i}`);
    stream.send('exam.progress.updated', { studentRef: 's1', progress: { answered: 1, total: 2 } });
    await flush();
    assert.equal(h.get('#exam-room-students')._children[0]._children[2].textContent, '1/2');
    h.close();
    assert.equal(h.signals[i].aborted, true);
    stream.send('snapshot', { room: room('stale closed room') });
    await flush();
    assert.equal(h.studentName(), `current ${i}`);
    t.mock.timers.tick(1000);
    await flush();
    assert.equal(h.streams.length, i + 1);
  }
  await h.open();
  h.streams[10].send('snapshot', { room: room('newest room') });
  await flush();
  assert.equal(h.studentName(), 'newest room');
});

test('room owner: reconnect waits 1000ms, releases reader, and close cancels the delay', async t => {
  const h = await harness(t);
  await h.open();
  h.streams[0].end();
  await flush();
  assert.equal(h.roomReads, 2, 'EOF refreshes the room through REST');
  assert.equal(h.streams[0].stats.released, 1);
  t.mock.timers.tick(999);
  await flush();
  assert.equal(h.streams.length, 1);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(h.streams.length, 2);
  h.streams[1].send('snapshot', { room: room('reconnected snapshot') });
  await flush();
  assert.equal(h.studentName(), 'reconnected snapshot');
  h.streams[1].end();
  await flush();
  h.close();
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(h.streams.length, 2);
});

test('room owner: stream read failure refreshes through REST and reconnects to a working stream', async t => {
  const h = await harness(t);
  await h.open();
  h.streams[0].fail(new Error('Synthetic connection interruption'));
  await flush();
  assert.equal(h.roomReads, 2);
  assert.equal(h.streams[0].stats.cancelled, 1);
  assert.equal(h.streams[0].stats.released, 1);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(h.streams.length, 2);
  h.streams[1].send('snapshot', { room: room('recovered student') });
  await flush();
  assert.equal(h.studentName(), 'recovered student');
});

test('room owner: a previous reader cannot update a reopened room', async t => {
  const h = await harness(t);
  await h.open();
  h.close();
  await h.open();
  h.streams[1].send('snapshot', { room: room('new owner') });
  await flush();
  h.streams[0].send('snapshot', { room: room('old owner') });
  await flush();
  assert.equal(h.studentName(), 'new owner');
  assert.equal(h.signals[1].aborted, false);
});

test('room owner: late reconnect fallback cannot overwrite a newly opened room', async t => {
  const fallback = deferred();
  const h = await harness(t, { roomRead: count => count === 2 ? fallback.promise : json({ room: room('new REST') }) });
  await h.open();
  h.streams[0].end();
  await flush();
  assert.equal(h.roomReads, 2);
  h.close();
  await h.open();
  h.streams[1].send('snapshot', { room: room('new stream') });
  await flush();
  fallback.resolve(json({ room: room('stale fallback') }));
  await flush();
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(h.studentName(), 'new stream');
  assert.equal(h.streams.length, 2);
});

test('room owner: stopped fetch that ignores abort closes its late body, never logs out or retries', async t => {
  const connection = deferred();
  const h = await harness(t, { streamRead: () => connection.promise });
  await h.open();
  h.close();
  connection.resolve({ ...h.streams[0].response, status: 401, ok: false });
  await flush();
  assert.equal(h.streams[0].stats.cancelled, 1);
  assert.equal(h.streams[0].stats.released, 1);
  assert.equal(h.get('#teacher-profile').hidden, false, 'stale 401 must not log out');
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(h.streams.length, 1);
});

test('room owner: a current 401 retains logout semantics and never reconnects', async t => {
  const h = await harness(t, { streamRead: () => ({ ok: false, status: 401 }) });
  await h.open();
  assert.equal(h.get('#teacher-profile').hidden, true);
  assert.equal(h.signals[0].aborted, true);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(h.streams.length, 1);
});

for (const stop of ['close', 'class', 'dispose']) {
  test(`room owner: ${stop} cancels reconnect delay without cancelling unrelated timers`, async t => {
    const h = await harness(t);
    await h.open();
    h.streams[0].end();
    await flush();
    let unrelated = 0;
    setTimeout(() => unrelated++, 1200);
    if (stop === 'close') h.close();
    if (stop === 'dispose') h.handle.dispose();
    if (stop === 'class') { h.get('#class-select').value = '102'; h.get('#class-select').dispatchEvent(new Event('change')); }
    t.mock.timers.tick(1500);
    await flush();
    assert.equal(h.streams.length, 1);
    assert.equal(unrelated, 1);
  });
}

test('room owner: stopping during a decoded batch ignores the remaining events and late fallback error', async t => {
  const fallback = deferred();
  const h = await harness(t, { roomRead: count => count === 2 ? fallback.promise : json({ room: room('current REST') }) });
  await h.open();
  h.streams[0].sendBatch([
    ['unknown-refresh-event', {}],
    ['snapshot', { room: room('stale decoded snapshot') }]
  ]);
  await flush();
  assert.equal(h.roomReads, 2);
  h.close();
  await h.open();
  h.streams[1].send('snapshot', { room: room('fresh stream') });
  await flush();
  fallback.reject(new Error('stale fallback error'));
  await flush();
  assert.equal(h.studentName(), 'fresh stream');
  assert.equal(h.get('#exam-room-message').textContent, '');
  assert.equal(h.streams[0].stats.released, 1);
  t.mock.timers.tick(1000);
  await flush();
  assert.equal(h.streams.length, 2);
});

test('room owner: incident and connection events preserve their existing rendering semantics', async t => {
  const h = await harness(t);
  await h.open();
  const stream = h.streams[0];
  stream.send('snapshot', { room: room('current student') });
  stream.send('exam.incident.opened', { studentRef: 's1', incidentCount: 1, incident: { incidentId: 'incident-1', type: 'tab_switch' } });
  stream.send('exam.connection.changed', { studentRef: 's1', status: 'disconnected' });
  await flush();
  const cells = h.get('#exam-room-students')._children[0]._children;
  assert.ok(cells[4].textContent.startsWith('1'));
  assert.equal(cells[3].textContent, 'Mất kết nối');
});

for (const status of [401, 503]) {
  test(`room owner: HTTP ${status} closes the unused response body`, async t => {
    const h = await harness(t, { streamRead: stream => ({ ...stream.response, ok: false, status }) });
    await h.open();
    assert.equal(h.streams[0].stats.cancelled, 1);
    assert.equal(h.streams[0].stats.released, 1);
    if (status === 503) assert.equal(h.roomReads, 2);
  });
}
