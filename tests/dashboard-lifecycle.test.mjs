import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mountDashboard } from '../term-tests/teacher-dashboard/shell/dashboard.js';
import { registerUnsavedChangesGuard, unregisterUnsavedChangesGuard } from '../term-tests/teacher-dashboard/app.js';

function fixture() {
  class Element extends EventTarget {
    value = '';
    hidden = false;
    style = {};
    dataset = {};
    classList = { add() {}, remove() {}, toggle() {} };
    elements = { apiBase: { value: '' }, actorId: { value: '' } };
    setAttribute() {}
    removeAttribute() {}
    replaceChildren() {}
    querySelector() { return null; }
    querySelectorAll() { return []; }
  }
  const elements = new Map();
  const document = new Element();
  document.body = new Element();
  document.hidden = false;
  document.querySelector = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  document.defaultView = new EventTarget();
  document.defaultView.location = new URL('http://localhost/?classId=101&assignmentId=fixture-assignment#dashboard');
  document.defaultView.history = { replaceState() {} };
  return { document, get: selector => document.querySelector(selector) };
}

test('importing dashboard interfaces does not start the browser application even when document exists', () => {
  const app = new URL('../term-tests/teacher-dashboard/app.js', import.meta.url).href;
  const shell = new URL('../term-tests/teacher-dashboard/shell/dashboard.js', import.meta.url).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '--eval', `
    globalThis.document = new Proxy({}, { get() { throw new Error('Unexpected DOM access during import'); } });
    for (const name of ['fetch', 'setTimeout', 'setInterval']) {
      globalThis[name] = () => { throw new Error('Unexpected browser side effect: ' + name); };
    }
    await import(${JSON.stringify(app)});
    await import(${JSON.stringify(shell)});
  `], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
});

test('pending shell search debounce is cancelled on disposal', t => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const requests = t.mock.method(globalThis, 'fetch', () => new Promise(() => {}));
  const { document, get } = fixture();
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  get('#search-input').value = 'first';
  get('#search-input').dispatchEvent(new Event('input'));
  t.mock.timers.tick(300);
  assert.equal(requests.mock.callCount(), 1);
  get('#search-input').value = 'pending';
  get('#search-input').dispatchEvent(new Event('input'));
  handle.dispose();
  t.mock.timers.tick(300);
  assert.equal(requests.mock.callCount(), 1);
});

test('dashboard mount is idempotent per root; dispose removes only its shell handlers across ten remounts', t => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const { document, get } = fixture();
  const guard = () => true;
  registerUnsavedChangesGuard(guard);
  t.after(() => unregisterUnsavedChangesGuard(guard));
  let unrelatedClicks = 0;
  get('#toggle-fixture-btn').addEventListener('click', () => unrelatedClicks++);
  const beforeunload = () => new Event('beforeunload', { cancelable: true });
  for (let i = 0; i < 10; i++) {
    const handle = mountDashboard(document);
    t.after(() => handle.dispose());
    assert.equal(mountDashboard(document), handle, 'same root returns same active handle');
    const before = get('#identity-form').hidden;
    get('#toggle-fixture-btn').dispatchEvent(new Event('click'));
    assert.equal(get('#identity-form').hidden, !before, 'one click toggles once');
    const activeEvent = beforeunload();
    document.defaultView.dispatchEvent(activeEvent);
    assert.equal(activeEvent.defaultPrevented, true, 'active dashboard protects dirty content');
    handle.dispose();
    handle.dispose();
    const after = get('#identity-form').hidden;
    get('#toggle-fixture-btn').dispatchEvent(new Event('click'));
    assert.equal(get('#identity-form').hidden, after, 'disposed shell no longer reacts');
    const disposedEvent = beforeunload();
    document.defaultView.dispatchEvent(disposedEvent);
    assert.equal(disposedEvent.defaultPrevented, false, 'beforeunload handler is removed');
  }
  assert.equal(unrelatedClicks, 20, 'cleanup preserves another owner’s listener');
});

test('polling keeps its thirty-second visibility/scope policy and stops at disposal', t => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const requests = t.mock.method(globalThis, 'fetch', () => new Promise(() => {}));
  const { document } = fixture();
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  assert.equal(requests.mock.callCount(), 0);
  assert.equal(mountDashboard(document), handle);
  t.mock.timers.tick(29999);
  assert.equal(requests.mock.callCount(), 0);
  t.mock.timers.tick(1);
  assert.equal(requests.mock.callCount(), 1);
  document.hidden = true;
  t.mock.timers.tick(30000);
  assert.equal(requests.mock.callCount(), 1);
  document.hidden = false;
  handle.dispose();
  t.mock.timers.tick(60000);
  assert.equal(requests.mock.callCount(), 1);
  const next = mountDashboard(document);
  t.after(() => next.dispose());
  assert.notEqual(next, handle);
  t.mock.timers.tick(30000);
  assert.equal(requests.mock.callCount(), 2);
});
