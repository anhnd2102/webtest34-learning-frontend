import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  openGenericBatchModal
} from '../term-tests/teacher-dashboard/app.js';

function createMockForm() {
  return {
    id: '42010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Single Choice Batch Integration Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '42010000-0000-4000-8000-000000000001',
      title: 'Single Choice Batch Integration Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'block_sc_batch',
          checkpoint: 1,
          title: 'Phần 1: Single Choice Batch',
          exercises: [
            {
              exerciseId: 'ex_sc_1',
              exerciseNumber: 1,
              title: 'Exercise 1: Trắc nghiệm',
              instructions: 'Choose the correct option',
              itemIds: []
            }
          ],
          items: []
        }
      ]
    },
    gradingKey: {
      items: {},
      groups: {}
    }
  };
}

function createMockDomEnvironment() {
  const elements = new Map();
  const windowListeners = new Map();

  function makeMockElement(tag = 'div') {
    const elListeners = new Map();
    const children = [];
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      name: '',
      type: '',
      checked: false,
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
      _mockRadios: [],
      _parseMockChildren(html) {
        // Parse classes
        const classRegex = /class="([^"]+)"/g;
        let match;
        while ((match = classRegex.exec(html)) !== null) {
          const classes = match[1].split(/\s+/);
          for (const cls of classes) {
            if (!this._mockInputs[cls] && (cls.startsWith('btn-') || cls.startsWith('input-') || cls.includes('batch') || cls.includes('radio') || cls.includes('select'))) {
              const childEl = makeMockElement(cls.startsWith('input') ? 'input' : 'button');
              childEl.className = cls;
              if (cls.startsWith('input')) {
                const specificTag = html.match(new RegExp(`<input[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`));
                const valMatch = specificTag ? specificTag[0].match(/value="([^"]+)"/) : html.match(/value="([^"]+)"/);
                childEl.value = valMatch ? valMatch[1] : '5';
              }
              if (cls === 'btn-batch-confirm') {
                const textMatch = html.match(/class="[^"]*btn-batch-confirm[^"]*"[^>]*>([^<]+)<\/button>/);
                childEl.textContent = textMatch ? textMatch[1].trim() : '⚡ Xác nhận';
              }
              this._mockInputs[cls] = childEl;
            }
          }
        }

        // Parse radio inputs specifically (e.g. name="batch-single-choice-options" or class="radio-batch-options")
        const radioRegex = /<input[^>]+type="radio"[^>]*>/g;
        let radioMatch;
        while ((radioMatch = radioRegex.exec(html)) !== null) {
          const tagHtml = radioMatch[0];
          const valMatch = tagHtml.match(/value="([^"]+)"/);
          const nameMatch = tagHtml.match(/name="([^"]+)"/);
          const isChecked = tagHtml.includes('checked');
          const radioEl = makeMockElement('input');
          radioEl.type = 'radio';
          radioEl.name = nameMatch ? nameMatch[1] : 'batch-single-choice-options';
          radioEl.value = valMatch ? valMatch[1] : '4';
          radioEl.checked = isChecked;
          radioEl.className = 'radio-batch-options';
          this._mockRadios.push(radioEl);
          this.children.push(radioEl);
        }
      },
      addEventListener(event, fn) {
        if (!elListeners.has(event)) elListeners.set(event, []);
        elListeners.get(event).push(fn);
      },
      removeEventListener(event, fn) {
        if (elListeners.has(event)) {
          elListeners.set(event, elListeners.get(event).filter(f => f !== fn));
        }
      },
      dispatchEvent(evt) {
        const fns = elListeners.get(evt.type) || [];
        for (const fn of fns) fn(evt);
        return true;
      },
      click() {
        if (this.type === 'radio' && this.name) {
          // Uncheck all other radios with same name
          for (const r of mockBody.querySelectorAll('input[type="radio"]')) {
            if (r.name === this.name) r.checked = false;
          }
          this.checked = true;
        }
        this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
      },
      focus() {},
      select() {},
      querySelector(selector) {
        if (selector === 'input[name="batch-single-choice-options"]:checked' || selector === '.radio-batch-options:checked') {
          return this.querySelectorAll('input[type="radio"]').find(r => r.checked) || null;
        }
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
        if (selector === 'input[type="radio"]' || selector.includes('radio')) {
          const radios = [...this._mockRadios];
          for (const ch of this.children) {
            if (ch.type === 'radio') radios.push(ch);
            if (ch._mockRadios) radios.push(...ch._mockRadios);
          }
          return Array.from(new Set(radios));
        }
        const item = this.querySelector(selector);
        return item ? [item] : [];
      }
    };
    return el;
  }

  const mockBody = makeMockElement('body');
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
    createElement: (tag) => makeMockElement(tag),
    querySelector: (selector) => {
      if (selector.startsWith('#')) {
        return elements.get(selector.slice(1)) || null;
      }
      return null;
    }
  };

  const mockWin = {
    addEventListener(event, fn) {
      if (!windowListeners.has(event)) windowListeners.set(event, []);
      windowListeners.get(event).push(fn);
    },
    removeEventListener(event, fn) {
      if (windowListeners.has(event)) {
        windowListeners.set(event, windowListeners.get(event).filter(f => f !== fn));
      }
    }
  };

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  globalThis.document = mockDoc;
  globalThis.window = mockWin;

  return {
    doc: mockDoc,
    cleanup() {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
    }
  };
}

function setupBuilderHarness() {
  const registeredHandlers = {};
  let saveClickListener = null;

  function makeButton(type, attrMap = {}) {
    return {
      getAttribute: (attr) => attrMap[attr] ?? null,
      addEventListener: (event, handler) => {
        if (event === 'click') {
          registeredHandlers[type] = handler;
        }
      }
    };
  }

  const defaultAttrs = {
    'data-block-idx': '0',
    'data-exercise-idx': '0',
    'data-exercise-id': 'ex_sc_1'
  };

  const container = {
    innerHTML: '',
    querySelector: (selector) => {
      if (selector === '#btn-save-draft') {
        return {
          id: 'btn-save-draft',
          disabled: false,
          addEventListener: (evt, cb) => {
            if (evt === 'click') saveClickListener = cb;
          }
        };
      }
      return null;
    },
    querySelectorAll: (selector) => {
      if (selector.includes('btn-add-single-choice')) {
        return [makeButton('btn-add-single-choice', defaultAttrs)];
      }
      return [];
    }
  };

  return {
    container,
    triggerButton: (name) => {
      if (typeof registeredHandlers[name] === 'function') {
        registeredHandlers[name]();
      } else {
        throw new Error(`Handler not registered for ${name}`);
      }
    },
    triggerSave: async () => {
      if (typeof saveClickListener === 'function') {
        await saveClickListener();
      } else {
        throw new Error('Save handler not registered');
      }
    }
  };
}

test('Issue 42: Clicking .btn-add-single-choice opens generic batch modal with default count 5 and 4 options by default', async () => {
  const { doc, cleanup } = createMockDomEnvironment();
  try {
    let savedPayload = null;
    const harness = setupBuilderHarness();
    const mockForm = createMockForm();

    renderTestBuilderView(harness.container, mockForm, {
      onSaveDraft: async (payload) => {
        savedPayload = payload;
        return { ok: true };
      }
    });

    harness.triggerButton('btn-add-single-choice');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened on clicking .btn-add-single-choice');

    const inputCount = modal.querySelector('.input-batch-count');
    assert.equal(inputCount.value, '5', 'Default count is 5 for single choice batch');

    // Confirm batch creation with default 4 options
    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 5, 'Created 5 single choice items');

    block.items.forEach((item, idx) => {
      assert.equal(item.pedagogicalTypeCode, 'multiple_choice');
      assert.equal(item.interactionType, 'single_choice');
      assert.equal(item.layoutType, 'grid_4');
      assert.equal(item.graderType, 'exact_option');
      assert.equal(item.options.length, 4, 'Has 4 options A, B, C, D');
      assert.deepEqual(item.options.map(o => o.id), ['A', 'B', 'C', 'D']);
      assert.equal(item.position, idx + 1);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key, `Grading key exists for item ${item.itemVersionId}`);
      assert.equal(key.expectedOptionId, 'A');
    });
  } finally {
    cleanup();
  }
});

test('Issue 42: Selecting 2 options creates items with layoutType grid_2 and options A, B', async () => {
  const { doc, cleanup } = createMockDomEnvironment();
  try {
    let savedPayload = null;
    const harness = setupBuilderHarness();
    const mockForm = createMockForm();

    renderTestBuilderView(harness.container, mockForm, {
      onSaveDraft: async (payload) => {
        savedPayload = payload;
        return { ok: true };
      }
    });

    harness.triggerButton('btn-add-single-choice');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');

    // Select 2 options
    const radios = modal.querySelectorAll('input[type="radio"]');
    const radio2 = radios.find(r => r.value === '2');
    assert.ok(radio2, 'Radio button for 2 options exists');
    radio2.click();

    // Confirm batch creation
    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 5, 'Created 5 items');

    block.items.forEach((item, idx) => {
      assert.equal(item.pedagogicalTypeCode, 'multiple_choice');
      assert.equal(item.interactionType, 'single_choice');
      assert.equal(item.layoutType, 'grid_2', 'layoutType is grid_2 for 2 options');
      assert.equal(item.options.length, 2, 'Has exactly 2 options');
      assert.deepEqual(item.options.map(o => o.id), ['A', 'B']);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key);
      assert.equal(key.expectedOptionId, 'A');
    });
  } finally {
    cleanup();
  }
});

test('Issue 42: Selecting 3 options creates items with layoutType grid_3 and options A, B, C', async () => {
  const { doc, cleanup } = createMockDomEnvironment();
  try {
    let savedPayload = null;
    const harness = setupBuilderHarness();
    const mockForm = createMockForm();

    renderTestBuilderView(harness.container, mockForm, {
      onSaveDraft: async (payload) => {
        savedPayload = payload;
        return { ok: true };
      }
    });

    harness.triggerButton('btn-add-single-choice');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');

    // Select 3 options
    const radios = modal.querySelectorAll('input[type="radio"]');
    const radio3 = radios.find(r => r.value === '3');
    assert.ok(radio3, 'Radio button for 3 options exists');
    radio3.click();

    // Confirm batch creation
    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 5, 'Created 5 items');

    block.items.forEach((item) => {
      assert.equal(item.layoutType, 'grid_3', 'layoutType is grid_3 for 3 options');
      assert.equal(item.options.length, 3, 'Has exactly 3 options');
      assert.deepEqual(item.options.map(o => o.id), ['A', 'B', 'C']);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key);
      assert.equal(key.expectedOptionId, 'A');
    });
  } finally {
    cleanup();
  }
});

test('Issue 42: Single button "+ Tạo 1 câu lẻ" creates exactly 1 question with chosen option count', async () => {
  const { doc, cleanup } = createMockDomEnvironment();
  try {
    let savedPayload = null;
    const harness = setupBuilderHarness();
    const mockForm = createMockForm();

    renderTestBuilderView(harness.container, mockForm, {
      onSaveDraft: async (payload) => {
        savedPayload = payload;
        return { ok: true };
      }
    });

    harness.triggerButton('btn-add-single-choice');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');

    // Select 3 options before clicking single
    const radios = modal.querySelectorAll('input[type="radio"]');
    const radio3 = radios.find(r => r.value === '3');
    if (radio3) radio3.click();

    const singleBtn = modal.querySelector('.btn-batch-single');
    singleBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 1, 'Exactly 1 item created on single button click');
    assert.equal(block.items[0].options.length, 3, 'Created single item with 3 options');
    assert.equal(block.items[0].layoutType, 'grid_3');
  } finally {
    cleanup();
  }
});
