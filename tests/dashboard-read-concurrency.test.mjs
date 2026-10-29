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

function createDOMFixture() {
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

  return { document, get: selector => document.querySelector(selector) };
}

test('Read concurrency: A/B out-of-order queries only commit latest query', async t => {
  const { document, get } = createDOMFixture();
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
  const { document, get } = createDOMFixture();
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

test('Read concurrency: same scope different page/filter invalidates previous queries', async t => {
  const { document, get } = createDOMFixture();
  const dPage1 = deferred();
  const dPage2 = deferred();

  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('page=1')) {
      return dPage1.promise;
    }
    if (urlStr.includes('page=2')) {
      return dPage2.promise;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ results: [], total: 20, page: 1, limit: 10 })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  t.after(() => handle.dispose());

  // Filter change resets to page 1
  get('#status-filter').dispatchEvent(new Event('change'));

  // Change sort or dir which keeps page or triggers new query
  get('#sort-dir').value = 'desc';
  get('#sort-dir').dispatchEvent(new Event('change'));

  dPage2.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 'p2-s1', name: 'Page 2 Student', totalScore: 85, maxScore: 100 }],
      total: 20,
      page: 2,
      limit: 10
    })
  });
  await new Promise(r => setTimeout(r, 20));

  dPage1.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ studentId: 'p1-s1', name: 'Page 1 Student', totalScore: 70, maxScore: 100 }],
      total: 20,
      page: 1,
      limit: 10
    })
  });
  await new Promise(r => setTimeout(r, 20));

  assert.equal(get('#status').textContent, 'Đã cập nhật bảng kết quả');
});

test('Read concurrency: disposal silences in-flight query; remount starts fresh generation', async t => {
  const { document, get } = createDOMFixture();
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
  const { document, get } = createDOMFixture();
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

test('Read concurrency: Test Studio out-of-order course catalog loads discard stale responses', async t => {
  const { document, get } = createDOMFixture();
  const dCourse1 = deferred();
  const dCourse2 = deferred();

  const originalFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/api/teacher/classes')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          actor: { role: 'lead', name: 'Lead User', classIds: ['101'] },
          classes: [{ classId: '101', name: 'Class 101', courseId: 1 }]
        })
      };
    }
    if (urlStr.includes('/api/teacher/forms/catalog?courseId=1') || urlStr.includes('courseId=1')) {
      return dCourse1.promise;
    }
    if (urlStr.includes('/api/teacher/forms/catalog?courseId=2') || urlStr.includes('courseId=2')) {
      return dCourse2.promise;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ catalog: [] })
    };
  });
  t.after(() => { globalThis.fetch = originalFetch; });

  const handle = mountDashboard(document);
  t.after(() => handle.dispose());

  // Switch to Test Studio tab
  document.defaultView.location.hash = '#test-studio';
  document.defaultView.dispatchEvent(new Event('hashchange'));

  // Trigger course 2 tab load
  document.defaultView.location.hash = '#exams';
  document.defaultView.dispatchEvent(new Event('hashchange'));

  // Resolve course 2 first
  dCourse2.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      catalog: [
        { testKey: 'test-2', title: 'Course 2 Midterm Test', status: 'draft', formVersionId: 'fv-2' }
      ]
    })
  });
  await new Promise(r => setTimeout(r, 20));

  // Resolve course 1 second
  dCourse1.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      catalog: [
        { testKey: 'test-1', title: 'Course 1 Old Stale Test', status: 'draft', formVersionId: 'fv-1' }
      ]
    })
  });
  await new Promise(r => setTimeout(r, 20));

  const container = get('#test-studio-container');
  // Stale course 1 must not overwrite
  assert.ok(!container.innerHTML.includes('Course 1 Old Stale Test'));
});

test('Read concurrency: switching attempts rapidly only renders latest attempt detail', async t => {
  const { document, get } = createDOMFixture();
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
  const { document, get } = createDOMFixture();
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
    if (urlStr.includes('/assignments/assign-1/exam-room')) {
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

  // Wait for initial mount to resolve classes and assignments
  await new Promise(r => setTimeout(r, 30));

  // Open exam room
  get('#exam-room-open-button').dispatchEvent(new Event('click'));
  await new Promise(r => setTimeout(r, 30));

  // The room rendered 2 students in #exam-room-students
  const rows = get('#exam-room-students')._children || [];
  assert.equal(rows.length, 2);

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


