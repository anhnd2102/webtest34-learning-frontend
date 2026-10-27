import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio preserves collapsed accordion state and restores scroll position across re-renders', () => {
  let scrollToCalledWith = null;
  globalThis.window = {
    scrollY: 450,
    scrollTo: (opts) => {
      scrollToCalledWith = opts;
    }
  };

  let itemToggleHandler = null;
  let genVariantsHandler = null;

  const mockItemCard = {
    classList: {
      _classes: new Set(),
      toggle: (c) => {
        if (mockItemCard.classList._classes.has(c)) {
          mockItemCard.classList._classes.delete(c);
          return false;
        }
        mockItemCard.classList._classes.add(c);
        return true;
      },
      add: (c) => mockItemCard.classList._classes.add(c),
      remove: (c) => mockItemCard.classList._classes.delete(c),
      contains: (c) => mockItemCard.classList._classes.has(c)
    }
  };

  const mockItemToggleBtn = {
    textContent: '▾',
    attributes: {},
    setAttribute: (k, v) => { mockItemToggleBtn.attributes[k] = v; },
    getAttribute: (k) => {
      if (k === 'data-block-idx') return '0';
      if (k === 'data-item-idx') return '0';
      return null;
    },
    closest: (sel) => (sel === '.builder-item-card' ? mockItemCard : null),
    addEventListener: (ev, h) => {
      if (ev === 'click') itemToggleHandler = h;
    }
  };

  const mockGenVariantsBtn = {
    getAttribute: (k) => {
      if (k === 'data-block-idx') return '0';
      if (k === 'data-item-idx') return '0';
      if (k === 'data-blank-num') return '1';
      return null;
    },
    closest: (sel) => {
      if (sel === '.cloze-blank-config-card') {
        return {
          querySelector: (s) => (s === '.input-cloze-blank-target' ? { value: 'apple' } : null)
        };
      }
      return null;
    },
    addEventListener: (ev, h) => {
      if (ev === 'click') genVariantsHandler = h;
    }
  };

  const container = {
    innerHTML: '',
    scrollTop: 220,
    querySelector: (sel) => {
      if (sel === '#builder-test-title') return { value: 'Preserve Test' };
      if (sel === '#builder-test-duration') return { value: '45' };
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.btn-toggle-item-collapse') return [mockItemToggleBtn];
      if (sel === '.btn-generate-variants') return [mockGenVariantsBtn];
      return [];
    }
  };

  const mockForm = {
    id: '07010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Accordion & Scroll Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '07010000-0000-4000-8000-000000000001',
      title: 'Accordion & Scroll Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'b-01',
          checkpoint: 1,
          title: 'Phần 1: Khởi động',
          exercises: [
            {
              exerciseId: 'ex-01',
              exerciseNumber: 1,
              title: 'Bài tập 1',
              itemIds: ['item-01', 'item-02']
            }
          ],
          items: [
            {
              itemFamilyId: 'fam-01',
              itemVersionId: 'item-01',
              position: 1,
              exerciseId: 'ex-01',
              prompt: 'Điền từ câu 1: (1) __________',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'inline_cloze',
              layoutType: 'inline_cloze',
              maxScore: 1
            },
            {
              itemFamilyId: 'fam-02',
              itemVersionId: 'item-02',
              position: 2,
              exerciseId: 'ex-01',
              prompt: 'Câu hỏi 2: Lựa chọn đúng',
              interactionType: 'single_choice',
              options: [
                { id: 'A', label: 'Option A' },
                { id: 'B', label: 'Option B' }
              ],
              maxScore: 1
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        'item-01': { graderType: 'accepted_text', accepted: ['sample'] },
        'item-02': { graderType: 'exact_option', expectedOptionId: 'A' }
      }
    }
  };

  renderTestBuilderView(container, mockForm);

  // 1. Initial render does NOT collapse item-01
  assert.ok(!container.innerHTML.includes('builder-item-card is-collapsed'), 'Item-01 starts uncollapsed');

  // 2. Toggle collapse on item-01
  assert.ok(itemToggleHandler, 'Item collapse handler must be registered');
  itemToggleHandler();

  // 3. Trigger generate variants which causes render()
  assert.ok(genVariantsHandler, 'Generate variants handler must be registered');
  globalThis.window.scrollY = 450;
  container.scrollTop = 220;
  genVariantsHandler();

  // 4. Assert item-01 is still rendered with is-collapsed class
  assert.ok(
    container.innerHTML.includes('builder-item-card is-collapsed" draggable="false" data-block-idx="0" data-item-idx="0"') ||
    container.innerHTML.includes('data-item-id="item-01" data-exercise-id="ex-01" class="builder-item-card is-collapsed"') ||
    (container.innerHTML.includes('data-item-id="item-01"') && container.innerHTML.includes('is-collapsed')),
    'Item-01 must remain collapsed after re-rendering triggered by variant generation'
  );

  // 5. Assert window.scrollTo was called restoring scrollY
  assert.ok(scrollToCalledWith, 'window.scrollTo must be invoked during re-render');
  assert.equal(scrollToCalledWith.top, 450, 'Scroll position must be restored to 450');
  assert.equal(container.scrollTop, 220, 'container.scrollTop must be preserved');
});

test('Test Studio preserves block and exercise collapse states across re-render and supports bulk collapse/expand', () => {
  let blockToggleHandler = null;
  let exToggleHandler = null;
  let collapseAllHandler = null;
  let expandAllHandler = null;
  let addExerciseHandler = null;

  const mockBlockCard = {
    classList: {
      _classes: new Set(),
      toggle: (c) => {
        if (mockBlockCard.classList._classes.has(c)) {
          mockBlockCard.classList._classes.delete(c);
          return false;
        }
        mockBlockCard.classList._classes.add(c);
        return true;
      },
      add: (c) => mockBlockCard.classList._classes.add(c),
      remove: (c) => mockBlockCard.classList._classes.delete(c),
      contains: (c) => mockBlockCard.classList._classes.has(c)
    }
  };

  const mockExCard = {
    classList: {
      _classes: new Set(),
      toggle: (c) => {
        if (mockExCard.classList._classes.has(c)) {
          mockExCard.classList._classes.delete(c);
          return false;
        }
        mockExCard.classList._classes.add(c);
        return true;
      },
      add: (c) => mockExCard.classList._classes.add(c),
      remove: (c) => mockExCard.classList._classes.delete(c),
      contains: (c) => mockExCard.classList._classes.has(c)
    }
  };

  const mockBlockToggleBtn = {
    textContent: '▾',
    attributes: {},
    setAttribute: (k, v) => { mockBlockToggleBtn.attributes[k] = v; },
    getAttribute: (k) => (k === 'data-index' ? '0' : null),
    closest: (sel) => (sel === '.builder-block-card' ? mockBlockCard : null),
    addEventListener: (ev, h) => { if (ev === 'click') blockToggleHandler = h; }
  };

  const mockExToggleBtn = {
    textContent: '▾',
    attributes: {},
    setAttribute: (k, v) => { mockExToggleBtn.attributes[k] = v; },
    getAttribute: (k) => {
      if (k === 'data-block-idx') return '0';
      if (k === 'data-exercise-idx') return '0';
      return null;
    },
    closest: (sel) => (sel === '.builder-exercise-card' ? mockExCard : null),
    addEventListener: (ev, h) => { if (ev === 'click') exToggleHandler = h; }
  };

  const mockAddExBtn = {
    getAttribute: (k) => (k === 'data-block-idx' ? '0' : null),
    addEventListener: (ev, h) => { if (ev === 'click') addExerciseHandler = h; }
  };

  const mockCollapseAllBtn = {
    addEventListener: (ev, h) => { if (ev === 'click') collapseAllHandler = h; }
  };

  const mockExpandAllBtn = {
    addEventListener: (ev, h) => { if (ev === 'click') expandAllHandler = h; }
  };

  const container = {
    innerHTML: '',
    scrollTop: 100,
    querySelector: (sel) => {
      if (sel === '#btn-collapse-all') return mockCollapseAllBtn;
      if (sel === '#btn-expand-all') return mockExpandAllBtn;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.btn-toggle-block-collapse') return [mockBlockToggleBtn];
      if (sel === '.btn-toggle-exercise-collapse') return [mockExToggleBtn];
      if (sel === '.btn-add-exercise') return [mockAddExBtn];
      return [];
    }
  };

  const mockForm = {
    id: 'form-02',
    version: 1,
    status: 'draft',
    publicDefinition: {
      blocks: [
        {
          blockId: 'b-01',
          checkpoint: 1,
          exercises: [
            { exerciseId: 'ex-01', exerciseNumber: 1, title: 'Ex 1', itemIds: [] }
          ],
          items: []
        }
      ]
    }
  };

  renderTestBuilderView(container, mockForm);

  // Toggle block collapse
  assert.ok(blockToggleHandler, 'Block toggle handler registered');
  blockToggleHandler();

  // Toggle exercise collapse
  assert.ok(exToggleHandler, 'Exercise toggle handler registered');
  exToggleHandler();

  // Add exercise causes render()
  assert.ok(addExerciseHandler, 'Add exercise handler registered');
  addExerciseHandler();

  // Verify block & exercise remain collapsed
  assert.ok(container.innerHTML.includes('builder-block-card is-collapsed'), 'Block card remains collapsed');
  assert.ok(container.innerHTML.includes('builder-exercise-card is-collapsed'), 'Exercise card remains collapsed');

  // Trigger Expand All
  assert.ok(expandAllHandler, 'Expand all handler registered');
  expandAllHandler();

  // Trigger another re-render
  addExerciseHandler();

  // Verify no cards are collapsed
  assert.ok(!container.innerHTML.includes('builder-block-card is-collapsed'), 'Block card is expanded after expand-all');
});

