import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerUnsavedChangesGuard,
  unregisterUnsavedChangesGuard,
  hasActiveUnsavedChanges,
  clearActiveUnsavedChanges,
  openUnsavedChangesModal,
  renderTestBuilderView,
  mountBuilder
} from '../term-tests/teacher-dashboard/app.js';

function createMockForm(id = 'test-form-alpha') {
  return {
    id,
    formVersionId: id,
    version: 1,
    status: 'draft',
    title: 'Test Form ' + id,
    durationMinutes: 45,
    submissionCount: 0,
    blocks: [
      {
        blockId: 'b1',
        checkpoint: 1,
        title: 'Phần 1: Ngữ pháp',
        exercises: [
          {
            exerciseId: 'ex1',
            exerciseNumber: 1,
            title: 'Exercise 1',
            instructions: 'Chọn đáp án đúng',
            itemIds: ['itm1']
          }
        ],
        items: [
          {
            itemVersionId: 'itm1',
            exerciseId: 'ex1',
            prompt: 'Question 1',
            interactionType: 'single_choice',
            graderType: 'exact_option',
            options: [{ id: 'A', label: 'Opt A' }, { id: 'B', label: 'Opt B' }],
            maxScore: 1
          }
        ]
      }
    ],
    gradingKey: {
      items: { itm1: { correctOptionId: 'A' } }
    }
  };
}

function createMockContainer() {
  let html = '';
  const listeners = new Map();
  const children = new Map();

  const container = {
    get innerHTML() { return html; },
    set innerHTML(val) {
      html = val;
    },
    scrollTop: 0,
    addEventListener(evt, fn, opts) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    },
    removeEventListener(evt, fn) {
      if (listeners.has(evt)) {
        listeners.set(evt, listeners.get(evt).filter(f => f !== fn));
      }
    },
    dispatchEvent(evt) {
      const fns = listeners.get(evt.type) || [];
      for (const fn of fns) fn(evt);
    },
    querySelector(selector) {
      if (!children.has(selector)) {
        const elListeners = new Map();
        children.set(selector, {
          id: selector.replace(/^[#.]/, ''),
          className: selector.startsWith('.') ? selector.slice(1) : '',
          innerHTML: '',
          textContent: '',
          value: '',
          disabled: false,
          style: {},
          getAttribute() { return null; },
          setAttribute() {},
          querySelector() { return null; },
          querySelectorAll() { return []; },
          classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
          },
          addEventListener(e, fn) {
            if (!elListeners.has(e)) elListeners.set(e, []);
            elListeners.get(e).push(fn);
          },
          removeEventListener(e, fn) {
            if (elListeners.has(e)) {
              elListeners.set(e, elListeners.get(e).filter(f => f !== fn));
            }
          },
          dispatchEvent(e) {
            const list = elListeners.get(e.type) || [];
            for (const f of list) f(e);
          },
          click() {
            this.dispatchEvent({ type: 'click', target: this, preventDefault() {} });
          },
          focus() { this.focused = true; }
        });
      }
      return children.get(selector);
    },
    querySelectorAll() { return []; }
  };
  return container;
}

test('mountBuilder returns lifecycle handle with dispose, hasUnsavedChanges, and is idempotent per root', () => {
  const container = createMockContainer();
  const form = createMockForm('alpha-1');

  const handle = mountBuilder(container, form);
  assert.ok(handle, 'mountBuilder returns a handle');
  assert.equal(typeof handle.dispose, 'function');
  assert.equal(typeof handle.hasUnsavedChanges, 'function');
  assert.equal(handle.hasUnsavedChanges(), false, 'initial builder is not dirty');

  // Idempotent: same root and same form returns same handle without remounting
  const handle2 = mountBuilder(container, form);
  assert.equal(handle2, handle, 'consecutive mount on same container returns active handle');

  // Dispose is idempotent
  handle.dispose();
  handle.dispose();
  assert.equal(hasActiveUnsavedChanges(), false);

  // Remount creates a fresh handle
  const handle3 = mountBuilder(container, form);
  assert.notEqual(handle3, handle, 'remounting creates a fresh handle');
  handle3.dispose();
});

test('renderTestBuilderView delegates to mountBuilder and remains backward compatible', () => {
  const container = createMockContainer();
  const form = createMockForm('beta-1');

  const handle = renderTestBuilderView(container, form);
  assert.ok(handle, 'renderTestBuilderView returns the lifecycle handle');
  assert.equal(typeof handle.dispose, 'function');
  assert.equal(typeof handle.hasUnsavedChanges, 'function');
  assert.equal(handle.hasUnsavedChanges(), false);
  handle.dispose();
});

test('guard owner identity: late cleanup from disposed builder does not clear new builder guard', () => {
  clearActiveUnsavedChanges();

  const container1 = createMockContainer();
  const form1 = createMockForm('owner-1');
  const handle1 = mountBuilder(container1, form1);

  // Simulate edit on builder 1
  container1.dispatchEvent({ type: 'input', target: {} });
  assert.equal(handle1.hasUnsavedChanges(), true);
  assert.equal(hasActiveUnsavedChanges(), true);

  // Mount builder 2 on separate container
  const container2 = createMockContainer();
  const form2 = createMockForm('owner-2');
  const handle2 = mountBuilder(container2, form2);
  container2.dispatchEvent({ type: 'input', target: {} });
  assert.equal(handle2.hasUnsavedChanges(), true);

  // Dispose builder 1
  handle1.dispose();

  // Builder 2 guard must remain active and protected!
  assert.equal(handle2.hasUnsavedChanges(), true);
  assert.equal(hasActiveUnsavedChanges(), true, 'Builder 2 guard is preserved after Builder 1 disposal');

  handle2.dispose();
  assert.equal(hasActiveUnsavedChanges(), false);
});

test('openUnsavedChangesModal prevents duplicate stacked dialogs when confirmation is pending', () => {
  const originalDoc = globalThis.document;
  let modalInstance = null;
  let modalAppends = 0;

  const mockModal = {
    id: 'modal-unsaved-changes',
    parentNode: null,
    setAttribute() {},
    querySelector(sel) {
      if (sel === '#btn-stay-editing') return this.btnStay;
      if (sel === '#btn-discard-and-leave') return this.btnDiscard;
      return null;
    },
    addEventListener() {},
    btnStay: {
      listeners: {},
      addEventListener(e, fn) { this.listeners[e] = fn; },
      focus() { this.focused = true; }
    },
    btnDiscard: {
      listeners: {},
      addEventListener(e, fn) { this.listeners[e] = fn; }
    }
  };

  globalThis.document = {
    querySelector(sel) {
      if (sel === '#modal-unsaved-changes') return modalInstance;
      return null;
    },
    createElement(tag) {
      if (tag === 'div') return mockModal;
      return {};
    },
    body: {
      appendChild(el) {
        modalAppends++;
        modalInstance = el;
        el.parentNode = this;
      },
      removeChild(el) {
        if (modalInstance === el) {
          modalInstance = null;
          el.parentNode = null;
        }
      }
    }
  };

  try {
    let discardCount = 0;
    openUnsavedChangesModal({ onDiscard: () => { discardCount++; } });
    assert.equal(modalAppends, 1);
    assert.ok(modalInstance);

    // Call again while modal is still pending - must NOT stack or replace
    openUnsavedChangesModal({ onDiscard: () => { discardCount++; } });
    assert.equal(modalAppends, 1, 'Does not append a second modal while one is open');
    assert.equal(mockModal.btnStay.focused, true, 'Re-focuses stay button');

    // Discard closes modal
    mockModal.btnDiscard.listeners.click();
    assert.equal(discardCount, 1);
    assert.equal(modalInstance, null, 'Modal removed on discard');
  } finally {
    globalThis.document = originalDoc;
  }
});

test('late resolution of save draft after builder disposal does not mutate state or clear newly mounted builder', async () => {
  clearActiveUnsavedChanges();
  let resolveSavePromise;
  const savePromise = new Promise(resolve => { resolveSavePromise = resolve; });

  const container = createMockContainer();
  const form1 = createMockForm('save-test-1');
  let saveCalls = 0;

  const handle1 = mountBuilder(container, form1, {
    onSaveDraft: async () => {
      saveCalls++;
      return await savePromise;
    }
  });

  // Make builder 1 dirty
  container.dispatchEvent({ type: 'input', target: {} });
  assert.equal(handle1.hasUnsavedChanges(), true);

  // Trigger save
  const saveBtn = container.querySelector('#btn-save-draft');
  assert.ok(saveBtn);
  saveBtn.click();
  assert.equal(saveCalls, 1);

  // Dispose builder 1 while save is still in flight
  handle1.dispose();

  // Mount builder 2 on same container and make it dirty
  const form2 = createMockForm('save-test-2');
  const handle2 = mountBuilder(container, form2);
  container.dispatchEvent({ type: 'input', target: {} });
  assert.equal(handle2.hasUnsavedChanges(), true);
  assert.equal(hasActiveUnsavedChanges(), true);

  // Now resolve the late save from builder 1
  resolveSavePromise({ ok: true, version: 2 });
  await new Promise(r => setTimeout(r, 10));

  // Builder 2 must STILL be dirty and its guard intact!
  assert.equal(handle2.hasUnsavedChanges(), true, 'Builder 2 remains dirty after late save from builder 1');
  assert.equal(hasActiveUnsavedChanges(), true);

  handle2.dispose();
});

test('ten mount/dirty/dispose cycles clean up completely without leaving lingering state', () => {
  clearActiveUnsavedChanges();
  const container = createMockContainer();

  for (let cycle = 0; cycle < 10; cycle++) {
    const form = createMockForm(`cycle-${cycle}`);
    const handle = mountBuilder(container, form);
    assert.equal(handle.hasUnsavedChanges(), false);

    // Make dirty
    container.dispatchEvent({ type: 'input', target: {} });
    assert.equal(handle.hasUnsavedChanges(), true);
    assert.equal(hasActiveUnsavedChanges(), true);

    // Dispose
    handle.dispose();
    assert.equal(hasActiveUnsavedChanges(), false, `cycle ${cycle} cleaned guard on dispose`);
  }
});
