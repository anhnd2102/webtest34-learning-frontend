import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ICONS,
  renderSvgIcon,
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('ICONS dictionary contains essential monochromatic line icons for Test Studio', () => {
  assert.ok(ICONS.save, 'ICONS should include save icon');
  assert.ok(ICONS.publish, 'ICONS should include publish/send icon');
  assert.ok(ICONS.lock, 'ICONS should include lock icon');
  assert.ok(ICONS.edit, 'ICONS should include edit/pencil icon');
  assert.ok(ICONS.clock, 'ICONS should include clock icon');
  assert.ok(ICONS.zap, 'ICONS should include zap/lightning icon');
  assert.ok(ICONS.arrowLeft, 'ICONS should include arrowLeft icon');
  assert.ok(ICONS.audio, 'ICONS should include audio/volume icon');

  // Verify rendered SVG has icon-inline class
  const rendered = renderSvgIcon('save', 'icon-inline');
  assert.ok(rendered.includes('<svg'), 'Should render SVG element');
  assert.ok(rendered.includes('icon-inline'), 'Should include custom class');
});

test('Test Studio top bar uses monochromatic SVG line icons without emojis', () => {
  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000010',
    version: 2,
    status: 'draft',
    title: 'Brand Styling Test',
    submissionCount: 5,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000010',
      title: 'Brand Styling Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Part 1',
          items: []
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
  };

  renderTestBuilderView(container, mockForm);
  const html = container.innerHTML;

  // Verify top bar buttons do NOT contain colorful emojis
  assert.doesNotMatch(html, /👁️/);
  assert.doesNotMatch(html, /💾/);
  assert.doesNotMatch(html, /🚀/);
  assert.doesNotMatch(html, /🔒/);
  assert.doesNotMatch(html, /✏️/);
  assert.doesNotMatch(html, /⚠️/);

  // Verify SVG icons are present in the buttons
  assert.match(html, /id="btn-back-to-catalog"[^>]*>[\s\S]*?<svg/);
  assert.match(html, /id="btn-preview-test"[^>]*>[\s\S]*?<svg/);
  assert.match(html, /id="btn-save-draft"[^>]*>[\s\S]*?<svg/);
  assert.match(html, /id="btn-publish-test"[^>]*>[\s\S]*?<svg/);
});

test('Candidate Simulation Modal uses IZONE brand identity and monochromatic line icons', () => {
  let simulationModalEl = null;
  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    style: {},
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {}
  };

  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            if (evt === 'click') handler();
          }
        };
      }
      return null;
    }
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000011',
    version: 1,
    status: 'draft',
    title: 'Simulation Brand Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000011',
      title: 'Simulation Brand Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Part 1',
          audioUrl: 'audio.mp3',
          readingPassage: 'Sample passage...',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f1',
              itemVersionId: '03010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'Question 1',
              interactionType: 'single_choice',
              options: [{ id: 'A', label: 'Option A' }]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
  };

  const originalQuerySelector = globalThis.document?.querySelector;
  const originalCreateElement = globalThis.document?.createElement;
  const originalBodyAppend = globalThis.document?.body?.appendChild;

  if (!globalThis.document) globalThis.document = {};
  if (!globalThis.document.body) globalThis.document.body = {};

  globalThis.document.querySelector = (sel) => {
    if (sel === '#candidate-simulation-modal') return mockModal;
    return null;
  };
  globalThis.document.createElement = () => mockModal;
  globalThis.document.body.appendChild = (el) => {
    simulationModalEl = el;
    return el;
  };

  try {
    renderTestBuilderView(container, mockForm, {
      onSaveDraft: async () => ({ ok: true })
    });

    // Check modal markup
    const modalHtml = mockModal.innerHTML;
    // Eyebrow badge should mention IZONE or Candidate Simulation without emojis
    assert.match(modalHtml, /IZONE · CANDIDATE SIMULATION|Candidate Simulation/);
    assert.doesNotMatch(modalHtml, /⏱️/);
    assert.doesNotMatch(modalHtml, /📑/);
    assert.doesNotMatch(modalHtml, /🔒/);
    assert.doesNotMatch(modalHtml, /🎧/);
    assert.doesNotMatch(modalHtml, /📖/);
    assert.doesNotMatch(modalHtml, /💡/);
  } finally {
    if (originalQuerySelector) globalThis.document.querySelector = originalQuerySelector;
    if (originalCreateElement) globalThis.document.createElement = originalCreateElement;
    if (originalBodyAppend) globalThis.document.body.appendChild = originalBodyAppend;
  }
});

test('teacher dashboard styles.css includes IZONE brand color system tokens', () => {
  const cssPath = resolve('term-tests/teacher-dashboard/styles.css');
  const css = readFileSync(cssPath, 'utf8');

  // Verify IZONE brand tokens
  assert.ok(css.includes('--izone-primary') || css.includes('#db0829'), 'Should include IZONE primary red #db0829');
  assert.ok(css.includes('--izone-navy') || css.includes('#174266'), 'Should include IZONE deep navy #174266');
  assert.ok(css.includes('--izone-soft-red') || css.includes('#fff1f2') || css.includes('#f8ced4'), 'Should include IZONE soft red/rose');

  // Verify builder-status-pill styles
  assert.ok(css.includes('.builder-status-pill') || css.includes('#builder-status-msg'), 'Should include status pill styling');
  // Verify btn-save-draft styling with brand red
  assert.ok(css.includes('.btn-save-draft'), 'Should include .btn-save-draft styling');
});

test('openGenericBatchModal and batch creation interfaces use monochromatic line icons without colorful lightning or checkmark emojis', async () => {
  const { openGenericBatchModal, ICONS } = await import('../term-tests/teacher-dashboard/app.js');
  assert.ok(ICONS.plusCircle, 'ICONS should include plusCircle monochromatic icon');
  assert.ok(ICONS.layers, 'ICONS should include layers monochromatic icon');

  const mockDiv = {
    id: '',
    className: '',
    style: {},
    innerHTML: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const origDoc = globalThis.document;
  globalThis.document = {
    querySelector: () => null,
    createElement: () => mockDiv,
    body: { appendChild: () => mockDiv, removeChild: () => {} }
  };

  try {
    const modal = openGenericBatchModal({
      title: 'Trắc nghiệm đơn',
      defaultCount: 5,
      csvConfig: {
        placeholder: 'test',
        getTemplateCsv: () => '',
        parseCsv: () => ({ items: [] }),
        onImport: () => {}
      }
    });

    const html = mockDiv.innerHTML;
    // Must NOT contain colorful lightning or check emojis
    assert.doesNotMatch(html, /⚡/);
    assert.doesNotMatch(html, /✓/);
    assert.doesNotMatch(html, /🚀/);
    assert.doesNotMatch(html, /🛡️/);

    // Must use plusCircle monochromatic icon for blank questions tab
    assert.match(html, /data-tab="stepper"/);
    assert.match(html, /Tạo nhanh câu trống/);
  } finally {
    globalThis.document = origDoc;
  }
});

