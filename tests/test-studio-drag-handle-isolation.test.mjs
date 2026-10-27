import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Issue 29: Builder item cards are rendered with draggable="false" by default', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: 'form-iso-1',
    formVersionId: 'form-iso-1',
    version: 1,
    status: 'draft',
    title: 'Handle Isolation Test',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: 'form-iso-1',
      title: 'Handle Isolation Test',
      blocks: [
        {
          blockId: 'b-1',
          checkpoint: 1,
          exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1' }],
          items: [
            { itemVersionId: 'item-1', position: 1, prompt: 'Câu 1: outgoing', exerciseId: 'ex-1', interactionType: 'short_text' }
          ]
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);

  const html = container.innerHTML;
  assert.ok(html.includes('class="builder-item-card" draggable="false"'), 'Item cards must default to draggable="false"');
  assert.ok(html.includes('item-drag-handle'), 'Item cards must have .item-drag-handle');
});

test('Issue 29: Drag is prevented when initiating outside drag-handle, but allowed when mousedown on drag-handle', () => {
  const listeners = {};
  const handleListeners = {};
  const classes = new Set();
  let draggableAttr = 'false';

  const handleMock = {
    classList: {
      contains: (cls) => cls === 'item-drag-handle'
    },
    addEventListener: (evt, fn) => {
      handleListeners[evt] = fn;
    }
  };

  const cardMock = {
    getAttribute: (name) => {
      if (name === 'data-block-idx') return '0';
      if (name === 'data-item-idx') return '0';
      if (name === 'data-item-id') return 'item-1';
      if (name === 'data-exercise-id') return 'ex-1';
      if (name === 'draggable') return draggableAttr;
      return null;
    },
    setAttribute: (name, val) => {
      if (name === 'draggable') draggableAttr = String(val);
    },
    querySelector: (sel) => {
      if (sel === '.item-drag-handle') return handleMock;
      return null;
    },
    classList: {
      add: (cls) => classes.add(cls),
      remove: (cls) => classes.delete(cls),
      contains: (cls) => classes.has(cls)
    },
    getBoundingClientRect: () => ({ top: 100, height: 80 }),
    addEventListener: (evt, fn) => {
      listeners[evt] = fn;
    }
  };

  const container = {
    innerHTML: '',
    querySelector: () => null,
    querySelectorAll: (sel) => {
      if (sel === '.builder-item-card') return [cardMock];
      if (sel === '.exercise-items-list') return [];
      return [];
    }
  };

  const mockForm = {
    id: 'form-iso-2',
    formVersionId: 'form-iso-2',
    version: 1,
    status: 'draft',
    title: 'Handle Isolation Test 2',
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: 'form-iso-2',
      title: 'Handle Isolation Test 2',
      blocks: [
        {
          blockId: 'b-1',
          checkpoint: 1,
          exercises: [{ exerciseId: 'ex-1', title: 'Exercise 1' }],
          items: [
            { itemVersionId: 'item-1', position: 1, prompt: 'Câu 1: outgoing', exerciseId: 'ex-1', interactionType: 'short_text' }
          ]
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);

  assert.ok(typeof listeners.dragstart === 'function', 'dragstart listener must be registered on card');
  assert.ok(typeof handleListeners.mousedown === 'function', 'mousedown listener must be registered on drag-handle');

  // Scenario 1: User tries to drag from card body/text selection without clicking handle
  let prevented = false;
  const mockDataTransfer = { effectAllowed: '', dropEffect: '', setData: () => {} };
  listeners.dragstart({
    target: { tagName: 'DIV', closest: () => null },
    dataTransfer: mockDataTransfer,
    preventDefault: () => { prevented = true; }
  });

  assert.equal(prevented, true, 'dragstart outside handle must be cancelled via preventDefault()');
  assert.equal(classes.has('dragging'), false, 'Card must NOT gain .dragging class when drag is cancelled');
  assert.equal(draggableAttr, 'false', 'Card must remain draggable="false"');

  // Scenario 2: User presses mousedown on .item-drag-handle
  handleListeners.mousedown({ target: handleMock });
  assert.equal(draggableAttr, 'true', 'Card draggable must become "true" after mousedown on handle');

  // Scenario 3: Now user initiates drag
  prevented = false;
  listeners.dragstart({
    target: handleMock,
    dataTransfer: mockDataTransfer,
    preventDefault: () => { prevented = true; }
  });

  assert.equal(prevented, false, 'dragstart initiated from handle must NOT be cancelled');
  assert.equal(classes.has('dragging'), true, 'Card MUST gain .dragging class on valid dragstart');

  // Scenario 4: Drag ends
  assert.ok(typeof listeners.dragend === 'function', 'dragend listener must be registered');
  listeners.dragend();
  assert.equal(classes.has('dragging'), false, 'Card must lose .dragging class on dragend');
  assert.equal(draggableAttr, 'false', 'Card must reset to draggable="false" on dragend');
});
