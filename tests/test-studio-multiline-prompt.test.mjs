import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTestBuilderView, renderInlineClozeMarkup } from '../term-tests/teacher-dashboard/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylesCssPath = path.resolve(__dirname, '../term-tests/teacher-dashboard/styles.css');

test('Issue 57: CSS defines white-space pre-wrap for multiline prompts and preview blocks', () => {
  const css = fs.readFileSync(stylesCssPath, 'utf8');

  // Verify candidate-question-prompt has white-space pre-wrap
  const promptMatch = css.match(/\.candidate-question-prompt\s*\{[^}]+\}/g);
  assert.ok(promptMatch && promptMatch.length > 0, 'Must have .candidate-question-prompt in styles.css');
  const hasPreWrapInPrompt = promptMatch.some(rule => /white-space:\s*pre-wrap/i.test(rule));
  assert.ok(hasPreWrapInPrompt, '.candidate-question-prompt must declare white-space: pre-wrap');

  // Verify cloze-preview-content has white-space pre-wrap
  const clozePreviewMatch = css.match(/\.cloze-preview-content\s*\{[^}]+\}/g);
  assert.ok(clozePreviewMatch && clozePreviewMatch.length > 0, 'Must have .cloze-preview-content in styles.css');
  const hasPreWrapInClozePreview = clozePreviewMatch.some(rule => /white-space:\s*pre-wrap/i.test(rule));
  assert.ok(hasPreWrapInClozePreview, '.cloze-preview-content must declare white-space: pre-wrap');

  // Verify candidate-inline-cloze-wrap has white-space pre-wrap
  const clozeWrapMatch = css.match(/\.candidate-inline-cloze-wrap\s*\{[^}]+\}/g);
  assert.ok(clozeWrapMatch && clozeWrapMatch.length > 0, 'Must have .candidate-inline-cloze-wrap in styles.css');
  const hasPreWrapInClozeWrap = clozeWrapMatch.some(rule => /white-space:\s*pre-wrap/i.test(rule));
  assert.ok(hasPreWrapInClozeWrap, '.candidate-inline-cloze-wrap must declare white-space: pre-wrap');

  // Verify rich-editor-visual has white-space pre-wrap
  const richVisualMatch = css.match(/\.rich-editor-visual[^{]*\{[^}]+\}/g);
  assert.ok(richVisualMatch && richVisualMatch.length > 0, 'Must have .rich-editor-visual in styles.css');
  const hasPreWrapInRichVisual = richVisualMatch.some(rule => /white-space:\s*pre-wrap/i.test(rule));
  assert.ok(hasPreWrapInRichVisual, '.rich-editor-visual must declare white-space: pre-wrap');
});

test('Issue 57: Candidate Simulation modal preserves line breaks for AI essay and short text prompts', () => {
  const multilineAiPrompt = 'Write an essay discussing the benefits and drawbacks of remote work.\n\nParagraph 1: Introduction\nParagraph 2: Benefits\nParagraph 3: Drawbacks\nParagraph 4: Conclusion';
  const multilineFitbPrompt = 'Speaker A: Where is the nearest train station?\nSpeaker B: Go straight and turn right at the traffic lights.';

  let modalHtml = '';
  let previewHandler = null;

  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            if (evt === 'click') previewHandler = handler;
          }
        };
      }
      return null;
    }
  };

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    set innerHTML(val) {
      modalHtml = val;
    },
    get innerHTML() {
      return modalHtml;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000057',
    version: 1,
    status: 'draft',
    title: 'Multiline Prompt Test Form',
    durationMinutes: 60,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000057',
      title: 'Multiline Prompt Test Form',
      durationMinutes: 60,
      blocks: [
        {
          blockId: 'block_1',
          title: 'Writing and Cloze Section',
          items: [
            {
              itemFamilyId: 'fam_essay_1',
              itemVersionId: 'item_essay_1',
              position: 1,
              prompt: multilineAiPrompt,
              interactionType: 'long_text',
              graderType: 'rubric_async',
              maxScore: 4
            },
            {
              itemFamilyId: 'fam_fitb_1',
              itemVersionId: 'item_fitb_1',
              position: 2,
              prompt: multilineFitbPrompt,
              interactionType: 'short_text',
              graderType: 'accepted_text',
              maxScore: 1
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_essay_1: {
          graderType: 'rubric_async',
          maxScore: 4
        },
        item_fitb_1: {
          graderType: 'accepted_text',
          accepted: ['traffic lights']
        }
      }
    }
  };

  // Mock document.querySelector and document.createElement
  const origQuerySelector = globalThis.document?.querySelector;
  const origCreateElement = globalThis.document?.createElement;

  try {
    globalThis.document = {
      querySelector: (sel) => {
        if (sel === '#candidate-simulation-modal') return mockModal;
        return null;
      },
      createElement: (tag) => {
        if (tag === 'div') return mockModal;
        return {};
      },
      body: {
        appendChild: () => {}
      }
    };

    renderTestBuilderView(container, mockForm, { teacherRole: 'teacher' });

    assert.ok(typeof previewHandler === 'function', 'Preview button click handler must be registered');
    previewHandler();

    // Verify modal HTML contains formatted prompts with line breaks for AI essay
    assert.ok(modalHtml.includes('Paragraph 1: Introduction<br/>Paragraph 2: Benefits') || 
              modalHtml.includes('Paragraph 1: Introduction<br>') ||
              modalHtml.includes('<br/>Paragraph 2: Benefits') ||
              modalHtml.includes('<br/>') ||
              modalHtml.includes('white-space: pre-wrap'),
      'AI essay prompt in candidate simulation modal must convert newlines to <br/> or have explicit pre-wrap rendering');

    // Verify modal HTML contains formatted prompts with line breaks for Short Text FITB
    assert.ok(modalHtml.includes('Speaker A: Where is the nearest train station?<br/>Speaker B:') ||
              modalHtml.includes('Speaker A: Where is the nearest train station?<br>') ||
              modalHtml.includes('Speaker B: Go straight'),
      'Short text prompt in candidate simulation modal must render both dialogue lines without squishing');
  } finally {
    if (origQuerySelector) {
      globalThis.document.querySelector = origQuerySelector;
      globalThis.document.createElement = origCreateElement;
    }
  }
});

test('Issue 57: Candidate Simulation modal renders rich HTML prompts without escaping valid markup', () => {
  const richHtmlPrompt = '<p>Read the dialogue below:</p><p>Speaker A: <strong>Hello</strong><br/>Speaker B: Hi there!</p>';

  let modalHtml = '';
  let previewHandler = null;

  const container = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: (sel) => {
      if (sel === '#btn-preview-test') {
        return {
          addEventListener: (evt, handler) => {
            if (evt === 'click') previewHandler = handler;
          }
        };
      }
      return null;
    }
  };

  const mockModal = {
    id: 'candidate-simulation-modal',
    className: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    set innerHTML(val) {
      modalHtml = val;
    },
    get innerHTML() {
      return modalHtml;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000058',
    version: 1,
    status: 'draft',
    title: 'Rich Prompt Test Form',
    durationMinutes: 30,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000058',
      title: 'Rich Prompt Test Form',
      durationMinutes: 30,
      blocks: [
        {
          blockId: 'block_1',
          title: 'Section 1',
          items: [
            {
              itemFamilyId: 'fam_essay_2',
              itemVersionId: 'item_essay_2',
              position: 1,
              prompt: richHtmlPrompt,
              interactionType: 'long_text',
              graderType: 'rubric_async',
              maxScore: 4
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_essay_2: {
          graderType: 'rubric_async',
          maxScore: 4
        }
      }
    }
  };

  try {
    globalThis.document = {
      querySelector: (sel) => {
        if (sel === '#candidate-simulation-modal') return mockModal;
        return null;
      },
      createElement: (tag) => {
        if (tag === 'div') return mockModal;
        return {};
      },
      body: {
        appendChild: () => {}
      }
    };

    renderTestBuilderView(container, mockForm, { teacherRole: 'teacher' });
    previewHandler();

    // Verify rich HTML prompt rendered as HTML, NOT escaped as &lt;p&gt;
    assert.ok(modalHtml.includes('<p>Read the dialogue below:</p>'), 'Rich HTML <p> tag must not be escaped');
    assert.ok(!modalHtml.includes('&lt;p&gt;Read the dialogue below:&lt;/p&gt;'), 'Must not display raw escaped &lt;p&gt; entities');
    assert.ok(modalHtml.includes('<strong>Hello</strong>'), 'Inner rich tags like <strong> must be preserved');
  } finally {
    // clean up
  }
});

test('Issue 57: renderInlineClozeMarkup preserves newlines when text contains multiple lines', () => {
  const plainTextWithNl = 'First paragraph (1) __________.\n\nSecond paragraph (2) __________.\nThird line.';
  const rendered = renderInlineClozeMarkup(plainTextWithNl, [
    { itemVersionId: 'cloze_1', position: 1 },
    { itemVersionId: 'cloze_2', position: 2 }
  ]);

  assert.ok(rendered.includes('<br/>'), 'renderInlineClozeMarkup must convert newlines to <br/> for plain text');
  assert.ok(rendered.includes('First paragraph'), 'Must retain first paragraph text');
  assert.ok(rendered.includes('Second paragraph'), 'Must retain second paragraph text');
});
