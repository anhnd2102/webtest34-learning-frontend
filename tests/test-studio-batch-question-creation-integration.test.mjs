import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView,
  openGenericBatchModal
} from '../term-tests/teacher-dashboard/app.js';

function createMockForm() {
  return {
    id: '41010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Batch Integration Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '41010000-0000-4000-8000-000000000001',
      title: 'Batch Integration Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'block_batch',
          checkpoint: 1,
          title: 'Phần 1: Batch Testing Block',
          exercises: [
            {
              exerciseId: 'ex_batch_1',
              exerciseNumber: 1,
              title: 'Exercise 1: Batch Testing Exercise',
              instructions: 'Test instructions',
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
      _parseMockChildren(html) {
        const classRegex = /class="([^"]+)"/g;
        let match;
        while ((match = classRegex.exec(html)) !== null) {
          const classes = match[1].split(/\s+/);
          for (const cls of classes) {
            if (!this._mockInputs[cls] && (cls.startsWith('btn-') || cls.startsWith('input-') || cls.includes('batch'))) {
              const childEl = makeMockElement(cls.startsWith('input') ? 'input' : 'button');
              childEl.className = cls;
              if (cls.startsWith('input')) {
                const valMatch = html.match(/value="([^"]+)"/);
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
        this.dispatchEvent({ type: 'click', target: this, preventDefault: () => {} });
      },
      focus() {},
      select() {},
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

function setupBuilderHarness(onSaveDraft) {
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
    'data-exercise-id': 'ex_batch_1'
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
      if (selector.includes('btn-add-error-correction')) {
        return [makeButton('btn-add-error-correction', defaultAttrs)];
      }
      if (selector.includes('btn-add-sentence-reorder')) {
        return [makeButton('btn-add-sentence-reorder', defaultAttrs)];
      }
      if (selector.includes('btn-add-sentence-transformation')) {
        return [makeButton('btn-add-sentence-transformation', defaultAttrs)];
      }
      if ((selector.includes('btn-add-pronunciation-choice') || selector.includes('btn-add-pronunciation')) && !selector.includes('option')) {
        return [makeButton('btn-add-pronunciation', defaultAttrs)];
      }
      if (selector.includes('btn-add-fitb') || selector.includes('btn-add-short-text')) {
        return [makeButton('btn-add-fitb', defaultAttrs)];
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

test('Issue 41: Template buttons render and include expected class selectors', () => {
  const container = { innerHTML: '', querySelectorAll: () => [] };
  const mockForm = createMockForm();

  renderTestBuilderView(container, mockForm);

  assert.ok(container.innerHTML.includes('btn-add-error-correction'), 'Renders .btn-add-error-correction');
  assert.ok(container.innerHTML.includes('btn-add-sentence-reorder'), 'Renders .btn-add-sentence-reorder');
  assert.ok(container.innerHTML.includes('btn-add-sentence-transformation'), 'Renders .btn-add-sentence-transformation');
  assert.ok(container.innerHTML.includes('btn-add-pronunciation'), 'Renders .btn-add-pronunciation');
  assert.ok(container.innerHTML.includes('btn-add-short-text') && container.innerHTML.includes('btn-add-fitb'), 'Renders .btn-add-fitb / .btn-add-short-text');
});

test('Issue 41: Error Correction button triggers batch modal with default count 8 and creates 8 questions on confirm', async () => {
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

    harness.triggerButton('btn-add-error-correction');

    // Check modal opened with defaultCount 8
    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');
    const inputCount = modal.querySelector('.input-batch-count');
    assert.equal(inputCount.value, '8', 'Default count is 8 for Error Correction');

    // Confirm batch creation
    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved with updated items');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 8, '8 error correction items created');
    const exercise = block.exercises[0];
    assert.equal(exercise.itemIds.length, 8, 'Exercise contains 8 item IDs');

    block.items.forEach((item, idx) => {
      assert.equal(item.pedagogicalTypeCode, 'error_correction');
      assert.equal(item.interactionType, 'correction_pair');
      assert.equal(item.graderType, 'correction_pair');
      assert.equal(item.position, idx + 1);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key, `Grading key exists for item ${item.itemVersionId}`);
      assert.deepEqual(key.expectedErrors, ['']);
      assert.deepEqual(key.expectedCorrections, ['']);
    });
  } finally {
    cleanup();
  }
});

test('Issue 41: Sentence Reorder button triggers batch modal with default count 5 and creates 5 questions on confirm', async () => {
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

    harness.triggerButton('btn-add-sentence-reorder');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');
    const inputCount = modal.querySelector('.input-batch-count');
    assert.equal(inputCount.value, '5', 'Default count is 5 for Sentence Reorder');

    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved with updated items');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 5, '5 sentence reorder items created');

    block.items.forEach((item, idx) => {
      assert.equal(item.pedagogicalTypeCode, 'sentence_reorder');
      assert.equal(item.interactionType, 'short_text');
      assert.equal(item.layoutType, 'token_scramble');
      assert.equal(item.graderType, 'accepted_text');
      assert.equal(item.position, idx + 1);
      assert.ok(Array.isArray(item.tokens) && item.tokens.length > 0);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key, `Grading key exists for item ${item.itemVersionId}`);
      assert.equal(key.graderType, 'accepted_text');
      assert.ok(Array.isArray(key.accepted) && key.accepted.length > 0);
    });
  } finally {
    cleanup();
  }
});

test('Issue 41: Sentence Transformation button triggers batch modal with default count 5 and creates 5 questions on confirm', async () => {
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

    harness.triggerButton('btn-add-sentence-transformation');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');
    const inputCount = modal.querySelector('.input-batch-count');
    assert.equal(inputCount.value, '5', 'Default count is 5 for Sentence Transformation');

    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved with updated items');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 5, '5 sentence transformation items created');

    block.items.forEach((item, idx) => {
      assert.equal(item.pedagogicalTypeCode, 'sentence_rewrite');
      assert.equal(item.layoutType, 'keyword_transformation');
      assert.equal(item.graderType, 'accepted_text');
      assert.equal(item.keyword, 'PREVENTED');
      assert.equal(item.position, idx + 1);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key, `Grading key exists for item ${item.itemVersionId}`);
      assert.equal(key.graderType, 'accepted_text');
      assert.equal(key.keyword, 'PREVENTED');
      assert.deepEqual(key.accepted, ['prevented him']);
    });
  } finally {
    cleanup();
  }
});

test('Issue 41: Pronunciation button triggers batch modal with default count 5 and creates 5 questions on confirm', async () => {
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

    harness.triggerButton('btn-add-pronunciation');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');
    const inputCount = modal.querySelector('.input-batch-count');
    assert.equal(inputCount.value, '5', 'Default count is 5 for Pronunciation');

    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved with updated items');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 5, '5 pronunciation items created');

    block.items.forEach((item, idx) => {
      assert.equal(item.pedagogicalTypeCode, 'pronunciation_choice');
      assert.equal(item.layoutType, 'ipa_card');
      assert.equal(item.graderType, 'exact_option');
      assert.equal(item.targetWord, 'camera');
      assert.equal(item.ipaTranscription, '/ˈkæm.ər.ə/');
      assert.equal(item.position, idx + 1);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key, `Grading key exists for item ${item.itemVersionId}`);
      assert.equal(key.expectedOptionId, 'A');
    });
  } finally {
    cleanup();
  }
});

test('Issue 41: Fill in the blank (short text) button triggers batch modal with default count 5 and creates 5 questions on confirm', async () => {
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

    harness.triggerButton('btn-add-fitb');

    const modal = doc.querySelector('#generic-batch-modal');
    assert.ok(modal, 'Modal opened');
    const inputCount = modal.querySelector('.input-batch-count');
    assert.equal(inputCount.value, '5', 'Default count is 5 for FITB');

    const confirmBtn = modal.querySelector('.btn-batch-confirm');
    confirmBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved with updated items');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 5, '5 FITB items created');

    block.items.forEach((item, idx) => {
      assert.equal(item.pedagogicalTypeCode, 'fill_in_the_blank');
      assert.equal(item.interactionType, 'short_text');
      assert.equal(item.graderType, 'accepted_text');
      assert.equal(item.position, idx + 1);
      assert.equal(item.prompt, `Điền vào ô trống câu ${idx + 1}:`);

      const key = savedPayload.gradingKey.items[item.itemVersionId];
      assert.ok(key, `Grading key exists for item ${item.itemVersionId}`);
      assert.deepEqual(key.accepted, ['answer']);
    });
  } finally {
    cleanup();
  }
});

test('Issue 41: Single button "+ Tạo 1 câu lẻ" creates exactly 1 question', async () => {
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

    harness.triggerButton('btn-add-error-correction');

    const modal = doc.querySelector('#generic-batch-modal');
    const singleBtn = modal.querySelector('.btn-batch-single');
    singleBtn.click();

    await harness.triggerSave();
    assert.ok(savedPayload, 'Draft was saved');

    const block = savedPayload.blocks[0];
    assert.equal(block.items.length, 1, 'Exactly 1 item created on single button click');
  } finally {
    cleanup();
  }
});
