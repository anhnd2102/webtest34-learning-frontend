import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatOptionDisplayLetter } from '../term-tests/teacher-dashboard/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsPath = path.resolve(__dirname, '../term-tests/teacher-dashboard/app.js');
const stylesCssPath = path.resolve(__dirname, '../term-tests/teacher-dashboard/styles.css');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');
const stylesCssContent = fs.readFileSync(stylesCssPath, 'utf8');

test('Issue 51: formatOptionDisplayLetter helper formats internal IDs to academic letters A, B, C, D', () => {
  assert.equal(formatOptionDisplayLetter('opt_a', 0), 'A');
  assert.equal(formatOptionDisplayLetter('opt_b', 1), 'B');
  assert.equal(formatOptionDisplayLetter('opt_c', 2), 'C');
  assert.equal(formatOptionDisplayLetter('opt_d', 3), 'D');
  assert.equal(formatOptionDisplayLetter('opt_1', 0), 'A');
  assert.equal(formatOptionDisplayLetter('opt_2', 1), 'B');
  assert.equal(formatOptionDisplayLetter('A', 0), 'A');
  assert.equal(formatOptionDisplayLetter('B', 1), 'B');
  assert.equal(formatOptionDisplayLetter('', 2), 'C');
  assert.equal(formatOptionDisplayLetter(null, 3), 'D');
});

test('Issue 51: Test Studio builder provides 1-column layout option and displays clean letter badges', () => {
  // Check layout selector includes 1 column (grid_1)
  assert.ok(
    appJsContent.includes('value="grid_1"'),
    'Single choice layout select must include grid_1 for 1-column stacked layout'
  );

  // Check builder-options-grid supports grid-cols-1
  assert.ok(
    stylesCssContent.includes('.builder-options-grid.grid-cols-1'),
    'styles.css must define .builder-options-grid.grid-cols-1'
  );

  assert.ok(
    stylesCssContent.includes('.candidate-options-grid.grid-cols-1'),
    'styles.css must define .candidate-options-grid.grid-cols-1'
  );
});

test('Issue 51: styles.css resets candidate radio/checkbox buttons so they do not stretch horizontally', () => {
  // Must reset candidate choice inputs so width is auto and does not push to the center
  const hasRadioReset = /candidate-choice-label\s+input\[type=["']?radio["']?[\s\S]*?width:\s*auto\s*!important/i.test(stylesCssContent)
    || /\.candidate-choice-label\s+input\s*\{[\s\S]*?width:\s*auto\s*!important/i.test(stylesCssContent);
  assert.ok(hasRadioReset, 'styles.css must reset candidate-choice-label input to width: auto !important');
});

test('Issue 51: Candidate Simulation preview renders clean A, B, C, D letter badges in .choice-key', () => {
  // Check that candidate choice label uses formatOptionDisplayLetter for .choice-key
  assert.ok(
    appJsContent.includes('formatOptionDisplayLetter(opt.id'),
    'Candidate simulation preview must format opt.id to A, B, C, D for .choice-key'
  );
});
