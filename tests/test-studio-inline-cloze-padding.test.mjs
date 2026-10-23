import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTestBuilderView } from '../term-tests/teacher-dashboard/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylesCssPath = path.resolve(__dirname, '../term-tests/teacher-dashboard/styles.css');

test('Issue 59: styles.css defines compact padding and line-height for candidate-inline-cloze-wrap', () => {
  const css = fs.readFileSync(stylesCssPath, 'utf8');

  assert.ok(css.includes('.candidate-inline-cloze-wrap'), 'styles.css must include .candidate-inline-cloze-wrap');
  assert.ok(css.includes('.candidate-short-qa-container'), 'styles.css must preserve .candidate-short-qa-container');

  // Verify compact line-height and padding
  const clozeWrapMatch = css.match(/\.candidate-inline-cloze-wrap\s*\{([^}]+)\}/);
  assert.ok(clozeWrapMatch, 'Must find .candidate-inline-cloze-wrap rule in styles.css');
  const clozeStyles = clozeWrapMatch[1];
  assert.ok(/line-height:\s*1\.[78]/i.test(clozeStyles), 'Must set line-height to 1.7-1.8 in .candidate-inline-cloze-wrap');
});

test('Issue 59: Candidate Simulation modal eliminates accidental leading tab indentation and extra newlines in inline cloze', () => {
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

  const samplePrompt = "I'm busy right now. I'm filling in (fill in) an application form for a new job.\nJohn (1) _____ (not/study) very hard.";

  const mockForm = {
    id: '03010000-0000-4000-8000-000000000059',
    version: 1,
    status: 'draft',
    title: 'Inline Cloze Test',
    durationMinutes: 45,
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000059',
      title: 'Inline Cloze Test',
      durationMinutes: 45,
      blocks: [
        {
          blockId: 'block_grammar',
          title: 'Grammar',
          exercises: [
            {
              exerciseId: 'ex_cloze_1',
              exerciseNumber: 1,
              title: 'Exercise 1',
              instructions: 'Fill in the blanks'
            }
          ],
          items: [
            {
              itemFamilyId: 'fam_cloze1',
              itemVersionId: 'item_cloze1',
              exerciseId: 'ex_cloze_1',
              position: 1,
              prompt: samplePrompt,
              interactionType: 'short_text',
              layoutType: 'inline_cloze',
              pedagogicalTypeCode: 'inline_cloze',
              graderType: 'accepted_text',
              maxScore: 1
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        item_cloze1: { graderType: 'accepted_text', accepted: ['studies'] }
      }
    }
  };

  try {
    globalThis.document = {
      querySelector: (sel) => {
        if (sel === '#candidate-simulation-modal') return mockModal;
        return null;
      },
      createElement: () => mockModal,
      body: { appendChild: () => {} }
    };

    renderTestBuilderView(container, mockForm, { teacherRole: 'teacher' });
    previewHandler();

    // Verify candidate-inline-cloze-wrap does NOT start with newline and leading whitespace
    assert.ok(
      !/<div class="candidate-inline-cloze-wrap"[^>]*>\s*\n\s+I'm busy/i.test(modalHtml),
      'candidate-inline-cloze-wrap must not contain accidental newline or whitespace indentation before the first word'
    );

    // Verify candidate-inline-cloze-wrap directly precedes the first word or has no artificial tab
    assert.ok(
      /<div class="candidate-inline-cloze-wrap"[^>]*>I(&#039;|')m busy/i.test(modalHtml),
      'candidate-inline-cloze-wrap must start directly with content without leading template literal spaces'
    );

    // Verify candidate-question-prompt does not contain newline and spaces before the text
    assert.ok(
      !/<div class="candidate-question-prompt">\s*\n\s+Điền từ/i.test(modalHtml),
      'candidate-question-prompt must not contain newline and 16 spaces before text'
    );
  } finally {
    // cleanup
  }
});
