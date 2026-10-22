import test from 'node:test';
import assert from 'node:assert/strict';
import { openGenericBatchModal } from '../term-tests/teacher-dashboard/app.js';

function createMockEnvironment() {
  const elements = new Map();
  const windowListeners = new Map();

  function makeElement(tag = 'div') {
    const listeners = new Map();
    const children = [];
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      style: {},
      children,
      parentNode: null,
      value: '',
      textContent: '',
      _innerHTML: '',
      get innerHTML() {
        return this._innerHTML;
      },
      set innerHTML(html) {
        this._innerHTML = html;
        this._parseMockChildren(html);
      },
      _mockInputs: {},
      _mockButtons: {},
      _parseMockChildren(html) {
        // Parse classes and IDs from innerHTML to create interactive queryable children
        const classRegex = /class="([^"]+)"/g;
        let match;
        while ((match = classRegex.exec(html)) !== null) {
          const classes = match[1].split(/\s+/);
          for (const cls of classes) {
            if (!this._mockInputs[cls] && (cls.startsWith('btn-') || cls.startsWith('input-') || cls.includes('batch'))) {
              const childEl = makeElement(cls.startsWith('input') ? 'input' : 'button');
              childEl.className = cls;
              if (cls.startsWith('input')) {
                // Extract value and min/max if present
                const valMatch = html.match(/value="([^"]+)"/);
                childEl.value = valMatch ? valMatch[1] : '5';
              }
              if (cls === 'btn-batch-confirm') {
                const textMatch = html.match(/class="[^"]*btn-batch-confirm[^"]*"[^>]*>([^<]+)<\/button>/);
                childEl.textContent = textMatch ? textMatch[1].trim() : '⚡ Tạo 5 câu hỏi';
              }
              this._mockInputs[cls] = childEl;
            }
          }
        }
      },
      addEventListener(event, fn) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(fn);
      },
      removeEventListener(event, fn) {
        if (listeners.has(event)) {
          listeners.set(event, listeners.get(event).filter(cb => cb !== fn));
        }
      },
      dispatchEvent(evt) {
        const fns = listeners.get(evt.type) || [];
        for (const fn of fns) fn(evt);
      },
      click() {
        this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
      },
      focus() { this._focused = true; },
      select() { this._selected = true; },
      querySelector(selector) {
        if (selector.startsWith('.')) {
          const cls = selector.slice(1);
          return this._mockInputs[cls] || null;
        }
        if (selector.startsWith('#')) {
          const id = selector.slice(1);
          return elements.get(id) || null;
        }
        return null;
      },
      querySelectorAll(selector) {
        const item = this.querySelector(selector);
        return item ? [item] : [];
      }
    };
    return el;
  }

  const mockBody = makeElement('body');
  mockBody.appendChild = (child) => {
    mockBody.children.push(child);
    child.parentNode = mockBody;
    if (child.id) elements.set(child.id, child);
    return child;
  };
  mockBody.removeChild = (child) => {
    const idx = mockBody.children.indexOf(child);
    if (idx !== -1) mockBody.children.splice(idx, 1);
    child.parentNode = null;
    if (child.id) elements.delete(child.id);
    return child;
  };

  const mockDoc = {
    body: mockBody,
    createElement: (tag) => makeElement(tag),
    querySelector: (selector) => {
      if (selector.startsWith('#')) {
        return elements.get(selector.slice(1)) || null;
      }
      return null;
    }
  };

  const mockWindow = {
    addEventListener(event, fn) {
      if (!windowListeners.has(event)) windowListeners.set(event, []);
      windowListeners.get(event).push(fn);
    },
    removeEventListener(event, fn) {
      if (windowListeners.has(event)) {
        windowListeners.set(event, windowListeners.get(event).filter(cb => cb !== fn));
      }
    },
    dispatchKeydown(key) {
      const fns = windowListeners.get('keydown') || [];
      for (const fn of fns) {
        fn({ key, preventDefault: () => {} });
      }
    }
  };

  return { mockDoc, mockWindow, elements };
}

test('openGenericBatchModal renders modal with title, defaultCount, stepper buttons, and buttons', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    let confirmedCount = null;
    let singleCalled = false;

    const modal = openGenericBatchModal({
      title: 'Thêm câu hỏi Tìm và sửa lỗi',
      subtitle: 'Tạo nhanh 8 câu Tìm và sửa lỗi',
      defaultCount: 8,
      minCount: 1,
      maxCount: 50,
      onConfirm: ({ count }) => { confirmedCount = count; },
      onSingle: () => { singleCalled = true; }
    });

    assert.ok(modal, 'Modal element was returned');
    assert.equal(modal.style.display, 'flex');
    assert.match(modal.innerHTML, /Thêm câu hỏi Tìm và sửa lỗi/);
    assert.match(modal.innerHTML, /Tạo nhanh 8 câu Tìm và sửa lỗi/);
    assert.match(modal.innerHTML, /input-batch-count/);
    assert.match(modal.innerHTML, /btn-batch-step-down/);
    assert.match(modal.innerHTML, /btn-batch-step-up/);
    assert.match(modal.innerHTML, /btn-batch-single/);
    assert.match(modal.innerHTML, /btn-batch-confirm/);
    assert.match(modal.innerHTML, /btn-close-batch-modal/);

    const countInput = modal.querySelector('.input-batch-count');
    assert.equal(countInput.value, '8');

    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    assert.match(confirmBtn.textContent, /8 câu hỏi/);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('openGenericBatchModal stepper buttons increase and decrease count dynamically', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    let confirmedCount = null;

    const modal = openGenericBatchModal({
      title: 'Sắp xếp câu',
      defaultCount: 5,
      minCount: 1,
      maxCount: 20,
      onConfirm: ({ count }) => { confirmedCount = count; }
    });

    const countInput = modal.querySelector('.input-batch-count');
    const stepUp = modal.querySelector('.btn-batch-step-up');
    const stepDown = modal.querySelector('.btn-batch-step-down');
    const confirmBtn = modal.querySelector('.btn-batch-confirm');

    assert.equal(countInput.value, '5');

    // Click step up (+1)
    stepUp.click();
    assert.equal(countInput.value, 6);
    assert.match(confirmBtn.textContent, /6 câu hỏi/);

    // Click step up (+1)
    stepUp.click();
    assert.equal(countInput.value, 7);
    assert.match(confirmBtn.textContent, /7 câu hỏi/);

    // Click step down (-1)
    stepDown.click();
    assert.equal(countInput.value, 6);
    assert.match(confirmBtn.textContent, /6 câu hỏi/);

    // Click confirm
    confirmBtn.click();
    assert.equal(confirmedCount, 6);
    assert.equal(modal.style.display, 'none');
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('openGenericBatchModal handles Enter key inside input and Escape key on window', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    let confirmed = null;
    let singleCalled = false;

    // 1. Enter key confirms
    const modal1 = openGenericBatchModal({
      title: 'Biến đổi câu',
      defaultCount: 5,
      onConfirm: ({ count }) => { confirmed = count; },
      onSingle: () => { singleCalled = true; }
    });

    const countInput = modal1.querySelector('.input-batch-count');
    countInput.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault: () => {} });
    assert.equal(confirmed, 5, 'Enter key inside input triggers confirmation');
    assert.equal(modal1.style.display, 'none');

    // 2. Escape key closes without callback
    confirmed = null;
    singleCalled = false;

    const modal2 = openGenericBatchModal({
      title: 'Phát âm & Ký hiệu',
      defaultCount: 5,
      onConfirm: ({ count }) => { confirmed = count; },
      onSingle: () => { singleCalled = true; }
    });

    mockWindow.dispatchKeydown('Escape');
    assert.equal(confirmed, null, 'Escape does not trigger confirm');
    assert.equal(singleCalled, false, 'Escape does not trigger single');
    assert.equal(modal2.style.display, 'none');
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('openGenericBatchModal single button calls onSingle and close button closes', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    let confirmed = null;
    let singleCalled = false;

    const modal = openGenericBatchModal({
      title: 'Điền ô trống',
      defaultCount: 5,
      onConfirm: ({ count }) => { confirmed = count; },
      onSingle: () => { singleCalled = true; }
    });

    const singleBtn = modal.querySelector('.btn-batch-single');
    singleBtn.click();
    assert.equal(singleCalled, true, 'Single button calls onSingle callback');
    assert.equal(confirmed, null, 'Confirm callback was not called');
    assert.equal(modal.style.display, 'none');
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('openGenericBatchModal supports extraConfigHtml for custom options', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    const extraHtml = `
      <div class="custom-radio-group">
        <label><input type="radio" name="optCount" value="2"> 2 phương án</label>
        <label><input type="radio" name="optCount" value="4" checked> 4 phương án</label>
      </div>
    `;

    const modal = openGenericBatchModal({
      title: 'Trắc nghiệm Single Choice',
      defaultCount: 5,
      extraConfigHtml: extraHtml
    });

    assert.ok(modal.innerHTML.includes('custom-radio-group'));
    assert.ok(modal.innerHTML.includes('2 phương án'));
    assert.ok(modal.innerHTML.includes('4 phương án'));
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('openGenericBatchModal clamps count between minCount and maxCount', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    const modal = openGenericBatchModal({
      title: 'Clamping test',
      defaultCount: 1,
      minCount: 1,
      maxCount: 3
    });

    const countInput = modal.querySelector('.input-batch-count');
    const stepUp = modal.querySelector('.btn-batch-step-up');
    const stepDown = modal.querySelector('.btn-batch-step-down');

    // Step down at minCount=1 should stay 1
    stepDown.click();
    assert.equal(countInput.value, 1);

    // Step up to maxCount=3
    stepUp.click();
    assert.equal(countInput.value, 2);
    stepUp.click();
    assert.equal(countInput.value, 3);
    // Step up at maxCount=3 should clamp to 3
    stepUp.click();
    assert.equal(countInput.value, 3);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('openGenericBatchModal close button and backdrop click close modal without callback', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    let confirmed = false;

    // 1. Close button click
    const modal1 = openGenericBatchModal({
      title: 'Close Button Test',
      defaultCount: 5,
      onConfirm: () => { confirmed = true; }
    });
    const closeBtn = modal1.querySelector('.btn-close-batch-modal');
    closeBtn.click();
    assert.equal(modal1.style.display, 'none');
    assert.equal(confirmed, false);

    // 2. Backdrop click
    const modal2 = openGenericBatchModal({
      title: 'Backdrop Click Test',
      defaultCount: 5,
      onConfirm: () => { confirmed = true; }
    });
    modal2.click(); // Clicking overlay itself
    assert.equal(modal2.style.display, 'none');
    assert.equal(confirmed, false);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});

test('openGenericBatchModal supports 2-tab layout with CSV and Stepper panels when csvConfig is provided', () => {
  const { mockDoc, mockWindow } = createMockEnvironment();
  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWindow;

  try {
    const modal = openGenericBatchModal({
      title: 'Tạo câu hỏi Trắc nghiệm đơn',
      defaultCount: 6,
      csvConfig: {
        placeholder: 'Dán CSV trắc nghiệm...',
        columnsHint: 'Cột: Đề bài, A, B, C, D, Đáp án đúng',
        getTemplateCsv: () => 'prompt,a,b,c,d,correct\n',
        parseCsv: () => ({ items: [] }),
        onImport: () => {}
      }
    });

    assert.ok(modal, 'Modal rendered');
    assert.match(modal.innerHTML, /modal-batch-tabs/);
    assert.match(modal.innerHTML, /data-tab="csv"/);
    assert.match(modal.innerHTML, /data-tab="stepper"/);
    assert.match(modal.innerHTML, /data-panel="csv"/);
    assert.match(modal.innerHTML, /data-panel="stepper"/);
    assert.match(modal.innerHTML, /Nhập từ CSV \/ Excel/);
    assert.match(modal.innerHTML, /Tạo nhanh câu trống/);
  } finally {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
  }
});


