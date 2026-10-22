import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio Accordion UI: renders collapse/expand buttons for blocks, exercises and bulk toolbar', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Test Studio Collapsible Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Test Studio Collapsible Test',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Phần 1: Nghe hiểu',
          instructions: 'Hướng dẫn phần nghe...',
          exercises: [
            {
              exerciseId: '04010000-0000-4000-8000-0000000000e1',
              exerciseNumber: 1,
              title: 'Bài tập 1: Chọn từ đúng',
              instructions: 'Nghe đoạn hội thoại và chọn từ...',
              itemIds: ['04010000-0000-4000-8000-0000000000i1']
            }
          ],
          items: [
            {
              itemFamilyId: '04010000-0000-4000-8000-0000000000f1',
              itemVersionId: '04010000-0000-4000-8000-0000000000i1',
              position: 1,
              exerciseId: '04010000-0000-4000-8000-0000000000e1',
              prompt: 'Question 1',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              options: [{ id: 'opt1', label: 'A' }]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);
  const html = container.innerHTML;

  // 1. Bulk action controls
  assert.ok(
    html.includes('id="btn-collapse-all"') || html.includes('btn-collapse-all'),
    'Test Studio must render "Thu gọn tất cả" (#btn-collapse-all) button'
  );
  assert.ok(
    html.includes('id="btn-expand-all"') || html.includes('btn-expand-all'),
    'Test Studio must render "Mở rộng tất cả" (#btn-expand-all) button'
  );

  // 2. Block-level collapse button
  assert.ok(
    html.includes('btn-toggle-block-collapse'),
    'Block cards must render a toggle collapse button (.btn-toggle-block-collapse)'
  );

  // 3. Exercise-level collapse button
  assert.ok(
    html.includes('btn-toggle-exercise-collapse'),
    'Exercise cards must render a toggle collapse button (.btn-toggle-exercise-collapse)'
  );
});

test('Test Studio Accordion UI: CSS contains collapse rules for blocks and exercises', () => {
  const cssPath = resolve('term-tests/teacher-dashboard/styles.css');
  const css = readFileSync(cssPath, 'utf8');

  // Verify CSS rules exist for hiding collapsed block and exercise bodies
  assert.match(
    css,
    /\.builder-block-card\.is-collapsed\s+\.builder-block-body\s*\{[^}]*display:\s*none/,
    'styles.css must hide .builder-block-body when .builder-block-card has .is-collapsed'
  );

  assert.match(
    css,
    /\.builder-exercise-card\.is-collapsed\s+\.builder-exercise-body\s*\{[^}]*display:\s*none/,
    'styles.css must hide .builder-exercise-body when .builder-exercise-card has .is-collapsed'
  );
});

test('Test Studio Accordion UI: Block and Exercise toggle events update classes and attributes', () => {
  let blockToggleHandler = null;
  let exToggleHandler = null;
  let collapseAllHandler = null;
  let expandAllHandler = null;

  const mockBlockClasses = new Set();
  const mockBlockCard = {
    classList: {
      toggle: (cls) => {
        if (mockBlockClasses.has(cls)) {
          mockBlockClasses.delete(cls);
          return false;
        }
        mockBlockClasses.add(cls);
        return true;
      },
      add: (cls) => mockBlockClasses.add(cls),
      remove: (cls) => mockBlockClasses.delete(cls),
      contains: (cls) => mockBlockClasses.has(cls)
    }
  };

  const mockBlockBtn = {
    textContent: '▾',
    innerHTML: '',
    attributes: {},
    setAttribute: (k, v) => { mockBlockBtn.attributes[k] = v; },
    closest: (sel) => sel === '.builder-block-card' ? mockBlockCard : null,
    addEventListener: (ev, h) => { if (ev === 'click') blockToggleHandler = h; }
  };

  const mockExClasses = new Set();
  const mockExCard = {
    classList: {
      toggle: (cls) => {
        if (mockExClasses.has(cls)) {
          mockExClasses.delete(cls);
          return false;
        }
        mockExClasses.add(cls);
        return true;
      },
      add: (cls) => mockExClasses.add(cls),
      remove: (cls) => mockExClasses.delete(cls),
      contains: (cls) => mockExClasses.has(cls)
    }
  };

  const mockExBtn = {
    textContent: '▾',
    innerHTML: '',
    attributes: {},
    setAttribute: (k, v) => { mockExBtn.attributes[k] = v; },
    closest: (sel) => sel === '.builder-exercise-card' ? mockExCard : null,
    addEventListener: (ev, h) => { if (ev === 'click') exToggleHandler = h; }
  };

  const mockCollapseAllBtn = {
    addEventListener: (ev, h) => { if (ev === 'click') collapseAllHandler = h; }
  };

  const mockExpandAllBtn = {
    addEventListener: (ev, h) => { if (ev === 'click') expandAllHandler = h; }
  };

  const container = {
    innerHTML: '',
    querySelector: (sel) => {
      if (sel === '#btn-collapse-all') return mockCollapseAllBtn;
      if (sel === '#btn-expand-all') return mockExpandAllBtn;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.btn-toggle-block-collapse') return [mockBlockBtn];
      if (sel === '.btn-toggle-exercise-collapse') return [mockExBtn];
      if (sel === '.builder-block-card') return [mockBlockCard];
      if (sel === '.builder-exercise-card') return [mockExCard];
      return [];
    }
  };

  const mockForm = {
    id: '04010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Test Studio Collapsible Events',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '04010000-0000-4000-8000-000000000001',
      title: 'Test Studio Collapsible Events',
      blocks: [
        {
          blockId: '04010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Phần 1',
          exercises: [{ exerciseId: '04010000-0000-4000-8000-0000000000e1', exerciseNumber: 1, title: 'Ex 1', itemIds: [] }],
          items: []
        }
      ]
    },
    gradingKey: { items: {} }
  };

  renderTestBuilderView(container, mockForm);

  // 1. Test clicking block toggle
  assert.ok(blockToggleHandler, 'block toggle click handler registered');
  blockToggleHandler();
  assert.ok(mockBlockClasses.has('is-collapsed'), 'Block card gains .is-collapsed');
  assert.ok(mockBlockBtn.innerHTML.includes('<svg') || mockBlockBtn.textContent === '▸', 'Block toggle changed to collapsed icon');
  assert.equal(mockBlockBtn.attributes['aria-expanded'], 'false', 'aria-expanded set to false');

  blockToggleHandler();
  assert.ok(!mockBlockClasses.has('is-collapsed'), 'Block card loses .is-collapsed on second click');
  assert.ok(mockBlockBtn.innerHTML.includes('<svg') || mockBlockBtn.textContent === '▾', 'Block toggle restored to expanded icon');
  assert.equal(mockBlockBtn.attributes['aria-expanded'], 'true', 'aria-expanded set to true');

  // 2. Test clicking exercise toggle
  assert.ok(exToggleHandler, 'exercise toggle click handler registered');
  exToggleHandler();
  assert.ok(mockExClasses.has('is-collapsed'), 'Exercise card gains .is-collapsed');
  assert.ok(mockExBtn.innerHTML.includes('<svg') || mockExBtn.textContent === '▸', 'Exercise toggle changed to collapsed icon');
  assert.equal(mockExBtn.attributes['aria-expanded'], 'false', 'aria-expanded set to false');

  // 3. Test bulk collapse all
  assert.ok(collapseAllHandler, 'collapse all handler registered');
  collapseAllHandler();
  assert.ok(mockBlockClasses.has('is-collapsed'), 'Bulk collapse adds .is-collapsed to block');
  assert.ok(mockExClasses.has('is-collapsed'), 'Bulk collapse adds .is-collapsed to exercise');
  assert.ok(mockBlockBtn.innerHTML.includes('<svg') || mockBlockBtn.textContent === '▸');
  assert.ok(mockExBtn.innerHTML.includes('<svg') || mockExBtn.textContent === '▸');

  // 4. Test bulk expand all
  assert.ok(expandAllHandler, 'expand all handler registered');
  expandAllHandler();
  assert.ok(!mockBlockClasses.has('is-collapsed'), 'Bulk expand removes .is-collapsed from block');
  assert.ok(!mockExClasses.has('is-collapsed'), 'Bulk expand removes .is-collapsed from exercise');
  assert.ok(mockBlockBtn.innerHTML.includes('<svg') || mockBlockBtn.textContent === '▾');
  assert.ok(mockExBtn.innerHTML.includes('<svg') || mockExBtn.textContent === '▾');
});
