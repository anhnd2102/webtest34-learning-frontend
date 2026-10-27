import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  renderTestBuilderView
} from '../term-tests/teacher-dashboard/app.js';

test('Test Studio prompt textarea has rows="4" for spacious question prompt editing', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000001',
    version: 1,
    status: 'draft',
    title: 'Prompt Layout Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000001',
      title: 'Prompt Layout Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b1',
          checkpoint: 1,
          title: 'Part 1',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f1',
              itemVersionId: '03010000-0000-4000-8000-0000000000i1',
              position: 1,
              prompt: 'A very detailed multi-sentence IELTS prompt that needs wide reading space...',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_2',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Option A' },
                { id: 'B', label: 'Option B' }
              ]
            }
          ]
        }
      ]
    },
    gradingKey: {
      items: {
        '03010000-0000-4000-8000-0000000000i1': { expectedOptionId: 'A' }
      },
      groups: {}
    }
  };

  renderTestBuilderView(container, mockForm);
  const html = container.innerHTML;

  // Verify prompt input has rows="4" (not rows="2")
  assert.match(html, /class="[^"]*item-prompt-input[^"]*"[^>]*rows="4"/);
});

test('Test Studio item card supports accordion toggle button and collapsible state', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000002',
    version: 1,
    status: 'draft',
    title: 'Accordion Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000002',
      title: 'Accordion Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b2',
          checkpoint: 1,
          title: 'Section 1',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f2',
              itemVersionId: '03010000-0000-4000-8000-0000000000i2',
              position: 1,
              prompt: 'Sample Question',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_2',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [{ id: 'A', label: 'Alpha' }]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
  };

  renderTestBuilderView(container, mockForm);
  const html = container.innerHTML;

  // Item card header should contain a collapse/expand toggle button
  assert.match(html, /btn-toggle-item-collapse/);
});

test('Test Studio reading passage textarea has rows="8" for long-text editing', () => {
  const container = { innerHTML: '' };
  const mockForm = {
    id: '03010000-0000-4000-8000-000000000003',
    version: 1,
    status: 'draft',
    title: 'Reading Test',
    submissionCount: 0,
    publicDefinition: {
      schemaVersion: 'FormDefinitionV1',
      formVersionId: '03010000-0000-4000-8000-000000000003',
      title: 'Reading Test',
      blocks: [
        {
          blockId: '03010000-0000-4000-8000-0000000000b3',
          checkpoint: 1,
          title: 'Reading Section',
          items: [
            {
              itemFamilyId: '03010000-0000-4000-8000-0000000000f3',
              itemVersionId: '03010000-0000-4000-8000-0000000000i3',
              position: 1,
              prompt: 'Choose matching heading',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'reading_matching',
              layoutType: 'split_pane_matching',
              graderType: 'exact_option',
              readingPassage: 'Paragraph A: Climate change is real...',
              options: [{ id: 'i', label: 'Heading 1' }]
            }
          ]
        }
      ]
    },
    gradingKey: { items: {}, groups: {} }
  };

  renderTestBuilderView(container, mockForm);
  const html = container.innerHTML;

  // Passage textarea should be expanded to rows="8"
  assert.match(html, /class="[^"]*input-reading-passage[^"]*"[^>]*rows="8"/);
});

test('teacher dashboard styles.css provides Test Studio UI/UX refresh design tokens and layout rules', () => {
  const cssPath = resolve('term-tests/teacher-dashboard/styles.css');
  const css = readFileSync(cssPath, 'utf8');

  // Verify brand token aligned with Webtest
  assert.ok(css.includes('--studio-primary') || css.includes('#db0829'), 'Should include IZONE Webtest brand color');
  // Verify item prompt input styling
  assert.ok(css.includes('.item-prompt-input'), 'Should include .item-prompt-input styling');
  // Verify card accordion styles
  assert.ok(css.includes('.builder-item-card.is-collapsed'), 'Should include collapsed state styling for builder item card');
  // Verify ghost icon button styles
  assert.ok(css.includes('.btn-ghost-subtle') || css.includes('.btn-delete-item'), 'Should include subtle delete/close button styling');
});
