import test from 'node:test';
import assert from 'node:assert/strict';
import { mountDashboard } from '../term-tests/teacher-dashboard/shell/dashboard.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flushReads = () => new Promise(resolve => setImmediate(resolve));
const jsonResponse = payload => ({ ok: true, status: 200, json: async () => payload });

test('Read concurrency: closing the drawer silences a late detail error', async t => {
  const { document, get } = createDOMFixture(t);
  document.defaultView.location.search = '?classId=101&assignmentId=assign-1&attemptId=att-late';
  const detail = deferred();
  let detailRequests = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    const path = new URL(String(url)).pathname;
    if (path.includes('/attempts/att-late')) { detailRequests++; return detail.promise; }
    if (path.endsWith('/classes')) return jsonResponse({ classes: [{ classId: '101', name: 'Synthetic class' }] });
    if (path.endsWith('/assignments')) return jsonResponse({ assignments: [{ assignmentId: 'assign-1', title: 'Synthetic assignment' }] });
    return jsonResponse({ assignment: { assignmentId: 'assign-1' }, students: [], skills: [] });
  });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  get('#identity-form').dispatchEvent(new Event('submit'));
  await flushReads();
  assert.equal(detailRequests, 1);
  get('#close-attempt-detail-btn').dispatchEvent(new Event('click'));
  await flushReads();
  const currentStatus = get('#status').textContent;
  detail.reject(new Error('stale drawer failure'));
  await flushReads();
  assert.equal(get('#status').textContent, currentStatus);
  assert.equal(get('#attempt-detail').hidden, true);
});

test('Read concurrency: disposed session restoration cannot render a profile', async t => {
  const { document, get } = createDOMFixture(t);
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  globalThis.sessionStorage = { getItem: key => key === 'izone_teacher_token' ? 'synthetic-token' : null };
  t.after(() => {
    if (savedStorage) Object.defineProperty(globalThis, 'sessionStorage', savedStorage);
    else delete globalThis.sessionStorage;
  });
  const profile = deferred();
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests++; return profile.promise; });
  const handle = mountDashboard(document);
  assert.equal(requests, 1);
  const before = get('#teacher-profile-name').textContent;
  handle.dispose();
  profile.resolve(jsonResponse({ teacher: { name: 'Stale teacher', role: 'teacher' } }));
  await flushReads();
  assert.equal(get('#teacher-profile-name').textContent, before);
  assert.equal(requests, 1);
});

test('Read concurrency: a superseded unauthorized response does not end the current session', async t => {
  const { document, get } = createDOMFixture(t);
  const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  let removed = 0;
  globalThis.sessionStorage = { getItem: key => key === 'izone_teacher_token' ? 'synthetic-token' : null, removeItem: () => { removed++; } };
  t.after(() => {
    if (savedStorage) Object.defineProperty(globalThis, 'sessionStorage', savedStorage);
    else delete globalThis.sessionStorage;
  });
  const expired = deferred();
  let reads = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/results')) { reads++; return expired.promise; }
    if (String(url).includes('/auth/me')) return jsonResponse({ teacher: { name: 'Synthetic teacher', role: 'teacher' } });
    return jsonResponse({ classes: [], assignments: [] });
  });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  await flushReads();
  // Select a results scope explicitly after session restoration.
  get('#class-select').value = '101';
  get('#class-select').dispatchEvent(new Event('change'));
  await flushReads();
  get('#assignment-select').value = 'assign-1';
  get('#assignment-select').dispatchEvent(new Event('change'));
  assert.equal(reads, 1);
  get('#search-input').value = 'fresh';
  get('#search-input').dispatchEvent(new Event('input'));
  expired.resolve({ ok: false, status: 401, json: async () => ({ message: 'expired old request' }) });
  await flushReads();
  assert.equal(removed, 0);
});

test('Read concurrency: changing class silences a late results error', async t => {
  const { document, get } = createDOMFixture(t);
  const oldResults = deferred();
  let resultRequests = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/results')) { resultRequests++; return oldResults.promise; }
    return jsonResponse({ assignments: [] });
  });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  get('#status-filter').dispatchEvent(new Event('change'));
  assert.equal(resultRequests, 1);
  get('#class-select').value = '102';
  get('#class-select').dispatchEvent(new Event('change'));
  await flushReads();
  const currentStatus = get('#status').textContent;
  oldResults.reject(new Error('stale results failure'));
  await flushReads();
  assert.equal(get('#status').textContent, currentStatus);
});

test('Read concurrency: typing invalidates results before the search debounce fires', async t => {
  const { document, get } = createDOMFixture(t);
  const oldResults = deferred();
  let resultRequests = 0;
  t.mock.method(globalThis, 'fetch', async () => { resultRequests++; return oldResults.promise; });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  get('#status-filter').dispatchEvent(new Event('change'));
  assert.equal(resultRequests, 1);
  get('#search-input').value = 'new query';
  get('#search-input').dispatchEvent(new Event('input'));
  const statusBeforeResponse = get('#status').textContent;
  oldResults.reject(new Error('old search failure'));
  await flushReads();
  assert.equal(get('#status').textContent, statusBeforeResponse);
});

test('Read concurrency: leaving Studio invalidates an in-flight catalog error', async t => {
  const { document, get } = createDOMFixture(t);
  const catalog = deferred();
  let catalogRequests = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/course-test-catalog')) { catalogRequests++; return catalog.promise; }
    if (String(url).endsWith('/classes')) return jsonResponse({ actor: { role: 'lead' }, classes: [] });
    return jsonResponse({ assignments: [] });
  });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  get('#identity-form').dispatchEvent(new Event('submit'));
  await flushReads();
  document.defaultView.location.hash = '#exams';
  document.defaultView.dispatchEvent(new Event('hashchange'));
  assert.equal(catalogRequests, 1);
  document.defaultView.location.hash = '#dashboard';
  document.defaultView.dispatchEvent(new Event('hashchange'));
  const content = get('#test-studio-container').innerHTML;
  catalog.reject(new Error('stale catalog failure'));
  await flushReads();
  assert.equal(get('#test-studio-container').innerHTML, content);
});

function createDOMFixture(t) {
  class Element extends EventTarget {
    value = '';
    textContent = '';
    innerHTML = '';
    hidden = false;
    disabled = false;
    style = {};
    dataset = {};
    classList = {
      _classes: new Set(),
      add(...cls) { for (const c of cls) this._classes.add(c); },
      remove(...cls) { for (const c of cls) this._classes.delete(c); },
      toggle(c, force) {
        if (force === true) this._classes.add(c);
        else if (force === false) this._classes.delete(c);
        else if (this._classes.has(c)) this._classes.delete(c);
        else this._classes.add(c);
      },
      contains(c) { return this._classes.has(c); }
    };
    elements = { apiBase: { value: '' }, actorId: { value: '' } };
    options = [];
    selectedOptions = [];
    setAttribute() {}
    removeAttribute() {}
    getAttribute() { return ''; }
    replaceChildren(...children) {
      this.textContent = '';
      this.innerHTML = '';
      this._children = children;
    }
    append(...children) {
      this._children = (this._children || []).concat(children);
    }
    querySelector(selector) {
      if (!this._queried) this._queried = new Map();
      if (!this._queried.has(selector)) this._queried.set(selector, new Element());
      return this._queried.get(selector);
    }
    querySelectorAll() { return []; }
    add(opt) { this.options.push(opt); }
  }

  const elements = new Map();
  const document = new Element();
  document.body = new Element();
  document.hidden = false;
  document.createElement = () => new Element();
  document.querySelector = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  document.querySelectorAll = () => [];
  document.defaultView = new EventTarget();
  document.defaultView.location = new URL('http://localhost/?classId=101&assignmentId=assign-1#dashboard');
  document.defaultView.history = { replaceState() {} };

  const saved = ['document', 'Option'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.document = document;
  globalThis.Option = class extends Element {
    constructor(text, value) { super(); this.textContent = text; this.value = value; }
  };
  t.after(() => {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return { document, get: selector => document.querySelector(selector) };
}

test('Read concurrency: A/B out-of-order queries only commit latest query', async t => {
  const { document, get } = createDOMFixture(t);
  const d1 = deferred();
  const d2 = deferred();
  let callCount = 0;

  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    callCount++;
    const urlStr = String(url);
    if (urlStr.includes('q=first')) {
      return d1.promise;
    }
    if (urlStr.includes('q=second')) {
      return d2.promise;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [], total: 0, page: 1, limit: 10 })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  t.after(() => handle.dispose());

  // Trigger first query
  const searchInput = get('#search-input');
  searchInput.value = 'first';
  searchInput.dispatchEvent(new Event('input'));
  // Trigger filter change directly
  get('#status-filter').dispatchEvent(new Event('change'));

  // Trigger second query
  searchInput.value = 'second';
  searchInput.dispatchEvent(new Event('input'));
  get('#status-filter').dispatchEvent(new Event('change'));

  // Second resolves first
  d2.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 'student-second', name: 'Student Second', totalScore: 90, maxScore: 100 }],
      total: 1,
      page: 1,
      limit: 10
    })
  });

  await new Promise(r => setTimeout(r, 20));
  const statusEl = get('#status');
  assert.equal(statusEl.textContent, 'Đã cập nhật bảng kết quả');

  // First resolves late
  d1.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 'student-first', name: 'Student First', totalScore: 50, maxScore: 100 }],
      total: 1,
      page: 1,
      limit: 10
    })
  });

  await new Promise(r => setTimeout(r, 20));
  // Outdated first response must not overwrite
  assert.equal(statusEl.textContent, 'Đã cập nhật bảng kết quả');
});

test('Read concurrency: late error after fresh result does not overwrite status or DOM', async t => {
  const { document, get } = createDOMFixture(t);
  const dFail = deferred();
  const dSuccess = deferred();

  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('q=will-fail')) {
      return dFail.promise;
    }
    if (urlStr.includes('q=will-succeed')) {
      return dSuccess.promise;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [], total: 0, page: 1, limit: 10 })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  t.after(() => handle.dispose());

  const searchInput = get('#search-input');

  // Query 1 starts
  searchInput.value = 'will-fail';
  searchInput.dispatchEvent(new Event('input'));
  get('#status-filter').dispatchEvent(new Event('change'));

  // Query 2 starts
  searchInput.value = 'will-succeed';
  searchInput.dispatchEvent(new Event('input'));
  get('#status-filter').dispatchEvent(new Event('change'));

  // Query 2 succeeds
  dSuccess.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 's1', name: 'Valid Student', totalScore: 80, maxScore: 100 }],
      total: 1,
      page: 1,
      limit: 10
    })
  });
  await new Promise(r => setTimeout(r, 20));
  const statusEl = get('#status');
  assert.equal(statusEl.textContent, 'Đã cập nhật bảng kết quả');

  // Query 1 fails late
  dFail.reject(new Error('Network timeout from outdated query 1'));
  await new Promise(r => setTimeout(r, 20));

  // Status must remain successful, error from query 1 must be ignored
  assert.equal(statusEl.textContent, 'Đã cập nhật bảng kết quả');
});

test('Read concurrency: same assignment page changes discard the previous page', async t => {
  const { document, get } = createDOMFixture(t);
  const first = deferred();
  const second = deferred();
  const pages = [];
  t.mock.method(globalThis, 'fetch', async url => {
    const page = new URL(String(url)).searchParams.get('page') || '1';
    pages.push(page);
    return page === '2' ? second.promise : first.promise;
  });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  get('#status-filter').dispatchEvent(new Event('change'));
  get('#next-page-btn').dispatchEvent(new Event('click'));
  assert.deepEqual(pages, ['1', '2']);
  const payload = (name, page) => ({
    assignment: { assignmentId: 'assign-1', title: 'Synthetic assignment' },
    skills: [], students: [{ studentId: name, name }],
    pagination: { page, totalPages: 2, totalItems: 2, pageSize: 1 }
  });
  second.resolve(jsonResponse(payload('Current student', 2)));
  await flushReads();
  const currentRows = get('#results-content')._children;
  const pagination = get('#pagination-info').textContent;
  first.resolve(jsonResponse(payload('Stale student', 1)));
  await flushReads();
  assert.equal(get('#results-content')._children, currentRows);
  assert.equal(get('#pagination-info').textContent, pagination);
  assert.ok(pagination.includes('2 / 2'));
});

test('Read concurrency: disposal silences in-flight query; remount starts fresh generation', async t => {
  const { document, get } = createDOMFixture(t);
  const dInFlight = deferred();

  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('q=inflight')) {
      return dInFlight.promise;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [], total: 0, page: 1, limit: 10 })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  get('#search-input').value = 'inflight';
  get('#status-filter').dispatchEvent(new Event('change'));

  // Dispose while query is pending
  handle.dispose();

  // Resolve after disposal
  dInFlight.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 'late', name: 'Late Student', totalScore: 100, maxScore: 100 }],
      total: 1,
      page: 1,
      limit: 10
    })
  });
  await new Promise(r => setTimeout(r, 20));

  // Remount
  const handle2 = mountDashboard(document);
  t.after(() => handle2.dispose());
  assert.notEqual(handle2, handle);
});

test('Read concurrency: query generation protects state even when fetch ignores abort signal', async t => {
  const { document, get } = createDOMFixture(t);
  const dOld = deferred();
  const dNew = deferred();

  const originalFetch = globalThis.fetch;
  // Custom fetch that explicitly ignores options.signal
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.ok(options.signal, 'signal was passed by coordinator');
    const urlStr = String(url);
    if (urlStr.includes('q=old-query')) {
      // Ignore options.signal.aborted and wait for deferred
      return dOld.promise;
    }
    if (urlStr.includes('q=new-query')) {
      return dNew.promise;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [], total: 0, page: 1, limit: 10 })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  t.after(() => handle.dispose());

  // Query 1
  get('#search-input').value = 'old-query';
  get('#status-filter').dispatchEvent(new Event('change'));

  // Query 2
  get('#search-input').value = 'new-query';
  get('#status-filter').dispatchEvent(new Event('change'));

  // Resolve new first
  dNew.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 'new', name: 'New Result', totalScore: 99, maxScore: 100 }],
      total: 1,
      page: 1,
      limit: 10
    })
  });
  await new Promise(r => setTimeout(r, 20));

  // Resolve old second
  dOld.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 'old', name: 'Old Stale Result', totalScore: 10, maxScore: 100 }],
      total: 1,
      page: 1,
      limit: 10
    })
  });
  await new Promise(r => setTimeout(r, 20));

  // Generation check alone must have rejected the old response
  assert.equal(get('#status').textContent, 'Đã cập nhật bảng kết quả');
});

test('Read concurrency: reloading Studio catalog discards the previous catalog', async t => {
  const { document, get } = createDOMFixture(t);
  const oldCatalog = deferred();
  const newCatalog = deferred();
  let catalogRequests = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).includes('/course-test-catalog')) {
      catalogRequests++;
      return catalogRequests === 1 ? oldCatalog.promise : newCatalog.promise;
    }
    if (String(url).endsWith('/classes')) return jsonResponse({ actor: { role: 'lead' }, classes: [] });
    return jsonResponse({ assignments: [] });
  });
  const handle = mountDashboard(document);
  t.after(() => handle.dispose());
  get('#identity-form').dispatchEvent(new Event('submit'));
  await flushReads();
  document.defaultView.location.hash = '#exams';
  document.defaultView.dispatchEvent(new Event('hashchange'));
  document.defaultView.dispatchEvent(new Event('hashchange'));
  assert.equal(catalogRequests, 2);
  newCatalog.resolve(jsonResponse({ catalog: [{ testKey: 'current', title: 'Current catalog', status: 'draft', formVersionId: 'fv-current' }] }));
  await flushReads();
  const container = get('#test-studio-container');
  assert.ok(container.innerHTML.includes('Current catalog'));
  const currentContent = container.innerHTML;
  oldCatalog.resolve(jsonResponse({ catalog: [{ testKey: 'stale', title: 'Stale catalog', status: 'draft', formVersionId: 'fv-stale' }] }));
  await flushReads();
  assert.equal(container.innerHTML, currentContent);
});

test('Read concurrency: switching attempts rapidly only renders latest attempt detail', async t => {
  const { document, get } = createDOMFixture(t);
  const dAtt1 = deferred();
  const dAtt2 = deferred();

  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/attempts/att-first')) {
      return dAtt1.promise;
    }
    if (urlStr.includes('/attempts/att-second')) {
      return dAtt2.promise;
    }
    if (urlStr.includes('/assignments/assign-1/results') || urlStr.includes('assign-1')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          assignment: { assignmentId: 'assign-1', title: 'Test 1' },
          skills: [],
          students: [
            { studentId: 's1', name: 'Student 1', attemptId: 'att-first' },
            { studentId: 's2', name: 'Student 2', attemptId: 'att-second' }
          ],
          pagination: { page: 1, totalPages: 1, totalItems: 2, pageSize: 25 }
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [], total: 0, page: 1, limit: 10 })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  t.after(() => handle.dispose());

  get('#status-filter').dispatchEvent(new Event('change'));
  // Wait for initial results load
  await new Promise(r => setTimeout(r, 30));

  // Find the view buttons rendered in the results content
  const resultsContent = get('#results-content');
  const scrollDiv = resultsContent._children?.[0];
  const table = scrollDiv?._children?.[0];
  const tbody = table?._children?.[1];
  const rows = tbody?._children || [];
  assert.equal(rows.length, 2, 'Rendered 2 student rows');

  const actionCell1 = rows[0]._children?.[ rows[0]._children.length - 1 ];
  const actionsGroup1 = actionCell1?._children?.[0];
  const viewBtn1 = actionsGroup1?._children?.[0];

  const actionCell2 = rows[1]._children?.[ rows[1]._children.length - 1 ];
  const actionsGroup2 = actionCell2?._children?.[0];
  const viewBtn2 = actionsGroup2?._children?.[0];

  assert.ok(viewBtn1, 'viewBtn1 exists');
  assert.ok(viewBtn2, 'viewBtn2 exists');

  // Rapidly click viewBtn1 then viewBtn2
  viewBtn1.dispatchEvent(new Event('click'));
  viewBtn2.dispatchEvent(new Event('click'));

  // Attempt 2 resolves first
  dAtt2.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      class: { name: 'Class 101', courseCode: '34' },
      assignment: { title: 'Test 1' },
      student: { name: 'Second Student', email: 'second@test.com' },
      attempt: { status: 'submitted', formVersion: '1' },
      scores: { total: { earned: 80, maximum: 100 } },
      skills: [],
      items: []
    })
  });
  await new Promise(r => setTimeout(r, 20));

  assert.equal(get('#detail-heading').textContent, 'Second Student · second@test.com');

  // Attempt 1 resolves second
  dAtt1.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      class: { name: 'Class 101', courseCode: '34' },
      assignment: { title: 'Test 1' },
      student: { name: 'First Stale Student', email: 'first@test.com' },
      attempt: { status: 'submitted', formVersion: '1' },
      scores: { total: { earned: 40, maximum: 100 } },
      skills: [],
      items: []
    })
  });
  await new Promise(r => setTimeout(r, 20));

  // Stale attempt 1 must not overwrite heading
  assert.equal(get('#detail-heading').textContent, 'Second Student · second@test.com');
});

test('Read concurrency: out-of-order exam room timeline requests discard stale incident responses', async t => {
  const { document, get } = createDOMFixture(t);
  const dStudent1 = deferred();
  const dStudent2 = deferred();

  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/attempts/att-1')) {
      return dStudent1.promise;
    }
    if (urlStr.includes('/attempts/att-2')) {
      return dStudent2.promise;
    }
    if (urlStr.includes('/assignments/assign-1/exam/room')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          room: {
            status: 'running',
            students: [
              { studentId: 's1', name: 'Student 1', attemptId: 'att-1', status: 'taking' },
              { studentId: 's2', name: 'Student 2', attemptId: 'att-2', status: 'taking' }
            ]
          }
        })
      };
    }
    if (urlStr.includes('/assignments')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [{ assignmentId: 'assign-1', title: 'Test 1', examMode: true, examSession: { id: 'sess-1' } }]
        })
      };
    }
    if (urlStr.includes('/classes')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          actor: { role: 'teacher', name: 'Teacher', classIds: ['101'] },
          classes: [{ classId: '101', name: 'Class 101' }]
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [], students: [], skills: [], total: 0, page: 1, limit: 10 })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  t.after(() => handle.dispose());

  get('#identity-form').dispatchEvent(new Event('submit'));
  // Wait for initial mount to resolve classes and assignments
  await new Promise(r => setTimeout(r, 30));

  // Open exam room
  get('#exam-room-open').dispatchEvent(new Event('click'));
  await new Promise(r => setTimeout(r, 30));

  // The room rendered 2 students in #exam-room-students
  const rows = get('#exam-room-students')._children || [];
  assert.equal(rows.length, 2, get('#exam-room-message').textContent);

  // Click student 1 then student 2 rapidly
  rows[0].dispatchEvent(new Event('click'));
  rows[1].dispatchEvent(new Event('click'));

  // Student 2 resolves first
  dStudent2.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      incidents: [{ type: 'fullscreen_exit', startedAt: '2026-10-28T09:00:00Z', endedAt: '2026-10-28T09:01:00Z' }]
    })
  });
  await new Promise(r => setTimeout(r, 20));

  const timelinePanel = get('#exam-room-timeline');
  const h3 = timelinePanel.querySelector('h3');
  assert.equal(h3.textContent, 'Timeline sự cố · Student 2');

  // Student 1 resolves late
  dStudent1.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      incidents: [{ type: 'tab_switch', startedAt: '2026-10-28T08:00:00Z', endedAt: '2026-10-28T08:05:00Z' }]
    })
  });
  await new Promise(r => setTimeout(r, 20));

  // Timeline must still show Student 2, not overwritten by Student 1
  assert.equal(h3.textContent, 'Timeline sự cố · Student 2');
});


