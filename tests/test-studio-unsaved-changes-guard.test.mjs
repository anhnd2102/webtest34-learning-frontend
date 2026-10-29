import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerUnsavedChangesGuard,
  unregisterUnsavedChangesGuard,
  hasActiveUnsavedChanges,
  clearActiveUnsavedChanges,
  openUnsavedChangesModal,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Unsaved Changes Guard: registration and global status', () => {
  clearActiveUnsavedChanges();
  assert.equal(hasActiveUnsavedChanges(), false, 'Should initially have no unsaved changes');

  let dirty = false;
  const guard = () => dirty;
  registerUnsavedChangesGuard(guard);

  assert.equal(hasActiveUnsavedChanges(), false, 'Should be false when guard returns false');

  dirty = true;
  assert.equal(hasActiveUnsavedChanges(), true, 'Should be true when guard returns true');

  unregisterUnsavedChangesGuard(guard);
  assert.equal(hasActiveUnsavedChanges(), false, 'Should be false after unregistering guard');

  registerUnsavedChangesGuard(() => true);
  assert.equal(hasActiveUnsavedChanges(), true);
  clearActiveUnsavedChanges();
  assert.equal(hasActiveUnsavedChanges(), false, 'Should be false after clearing guard');
});

test('openUnsavedChangesModal: headless environment confirmation fallback', () => {
  let discardCalled = false;
  let stayCalled = false;

  openUnsavedChangesModal({
    onDiscard: () => { discardCalled = true; },
    onStay: () => { stayCalled = true; }
  });

  assert.equal(discardCalled, true, 'Default headless confirm executes onDiscard');
  assert.equal(stayCalled, false);
});

test('openUnsavedChangesModal: mock DOM interaction', () => {
  let appendedModal = null;
  const originalDocument = globalThis.document;

  const mockModal = {
    id: '',
    className: '',
    attributes: {},
    innerHTML: '',
    parentNode: null,
    setAttribute(k, v) { this.attributes[k] = v; },
    querySelector(selector) {
      if (selector === '#btn-stay-editing') return this.btnStay;
      if (selector === '#btn-discard-and-leave') return this.btnDiscard;
      if (selector === '#btn-close-unsaved-modal') return this.btnClose;
      return null;
    },
    addEventListener(evt, fn) {
      this.listeners = this.listeners || {};
      this.listeners[evt] = fn;
    },
    btnStay: {
      listeners: {},
      addEventListener(evt, fn) { this.listeners[evt] = fn; },
      focus() { this.focused = true; }
    },
    btnDiscard: {
      listeners: {},
      addEventListener(evt, fn) { this.listeners[evt] = fn; }
    },
    btnClose: {
      listeners: {},
      addEventListener(evt, fn) { this.listeners[evt] = fn; }
    }
  };

  globalThis.document = {
    querySelector(sel) {
      if (sel === '#modal-unsaved-changes') return appendedModal;
      return null;
    },
    createElement(tag) {
      if (tag === 'div') return mockModal;
      return {};
    },
    body: {
      appendChild(el) {
        appendedModal = el;
        el.parentNode = this;
      },
      removeChild(el) {
        if (appendedModal === el) {
          appendedModal = null;
          el.parentNode = null;
        }
      }
    }
  };

  try {
    let discardTriggered = false;
    let stayTriggered = false;

    openUnsavedChangesModal({
      title: 'Các thay đổi chưa được lưu',
      subtitle: 'Bạn có các chỉnh sửa chưa lưu trong bài thi này',
      message: 'Nếu bạn thoát ra hoặc chuyển sang trang khác, tất cả các thay đổi vừa chỉnh sửa sẽ bị mất hoàn toàn.',
      onDiscard: () => { discardTriggered = true; },
      onStay: () => { stayTriggered = true; }
    });

    assert.ok(appendedModal, 'Modal should be appended to document.body');
    assert.equal(appendedModal.id, 'modal-unsaved-changes');
    assert.match(appendedModal.innerHTML, /modal-warning-dialog/);
    assert.match(appendedModal.innerHTML, /Các thay đổi chưa được lưu/);
    assert.match(appendedModal.innerHTML, /Ở lại chỉnh sửa/);
    assert.match(appendedModal.innerHTML, /Rời khỏi không lưu/);
    assert.equal(mockModal.btnStay.focused, true, 'Stay button should be focused for safety');

    // Test stay click
    mockModal.btnStay.listeners.click();
    assert.equal(stayTriggered, true, 'Clicking stay button calls onStay');
    assert.equal(appendedModal, null, 'Modal should be closed and removed');

    // Test discard click
    openUnsavedChangesModal({
      onDiscard: () => { discardTriggered = true; },
      onStay: () => { stayTriggered = true; }
    });
    assert.ok(appendedModal);
    mockModal.btnDiscard.listeners.click();
    assert.equal(discardTriggered, true, 'Clicking discard button calls onDiscard');
    assert.equal(appendedModal, null, 'Modal should be removed after discard');
  } finally {
    globalThis.document = originalDocument;
  }
});

test('renderTestBuilderView: marks dirty on edit and intercepts back button', async () => {
  clearActiveUnsavedChanges();

  let htmlContent = '';
  const mockListeners = {};

  const mockStatusMsg = {
    className: '',
    innerHTML: '',
    classList: {
      contains(cls) { return mockStatusMsg.className.includes(cls); }
    }
  };

  const mockBackBtn = {
    listeners: {},
    addEventListener(evt, fn) { this.listeners[evt] = fn; }
  };

  const mockSaveBtn = {
    listeners: {},
    addEventListener(evt, fn) { this.listeners[evt] = fn; }
  };

  const mockContainer = {
    get innerHTML() { return htmlContent; },
    set innerHTML(val) { htmlContent = val; },
    scrollTop: 0,
    addEventListener(evt, fn) {
      mockListeners[evt] = fn;
    },
    querySelector(selector) {
      if (selector === '#builder-status-msg') return mockStatusMsg;
      if (selector === '#btn-back-to-catalog') return mockBackBtn;
      if (selector === '#btn-save-draft') return mockSaveBtn;
      return null;
    },
    querySelectorAll() { return []; }
  };

  let backCalled = false;
  let saveDraftCalled = false;

  renderTestBuilderView(mockContainer, {
    id: 'test-form-1',
    title: 'Đề thi kiểm tra',
    blocks: [
      {
        blockId: 'b1',
        title: 'Phần 1',
        items: [
          {
            itemVersionId: 'itm1',
            prompt: 'Câu hỏi 1:',
            interactionType: 'single_choice',
            graderType: 'exact_option',
            options: [{ id: 'A', label: 'Opt A' }, { id: 'B', label: 'Opt B' }],
            maxScore: 1
          }
        ]
      }
    ]
  }, {
    onBack: () => { backCalled = true; },
    onSaveDraft: async () => {
      saveDraftCalled = true;
      return { ok: true, version: 1 };
    }
  });

  // Initially not dirty
  assert.equal(hasActiveUnsavedChanges(), false, 'Initial state should not be dirty');

  // Trigger input event inside container to simulate editing
  assert.ok(mockListeners.input, 'Input event listener should be registered on container');
  mockListeners.input({ target: {} });

  // Now dirty!
  assert.equal(hasActiveUnsavedChanges(), true, 'Should be dirty after input event');
  assert.match(mockStatusMsg.className, /unsaved/);
  assert.match(mockStatusMsg.innerHTML, /Có thay đổi chưa lưu/);

  // Click Save Draft
  assert.ok(mockSaveBtn.listeners.click, 'Save draft listener should be wired');
  await mockSaveBtn.listeners.click();

  assert.equal(saveDraftCalled, true);
  assert.equal(hasActiveUnsavedChanges(), false, 'isDirty should be reset to false after saving draft');
  assert.match(mockStatusMsg.className, /success/);

  // Test back button when clean
  mockBackBtn.listeners.click({ preventDefault() {} });
  assert.equal(backCalled, true, 'Back should immediately execute when clean');
  assert.equal(hasActiveUnsavedChanges(), false);
});
