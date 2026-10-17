import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

test('Test Studio: styles.css enforces full-width textarea reset and button proportions', () => {
  const cssPath = path.join(frontendDir, 'term-tests', 'teacher-dashboard', 'styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Verify textarea reset width 100% and box-sizing
  assert.ok(
    cssContent.includes('textarea') && cssContent.includes('box-sizing: border-box'),
    'styles.css must include textarea in box-sizing and width reset'
  );

  // Verify block textarea styling
  assert.ok(
    cssContent.includes('.block-instructions-input') || cssContent.includes('.block-reading-input'),
    'styles.css must style .block-instructions-input or .block-reading-input'
  );

  // Verify button proportions & white-space nowrap
  assert.ok(
    cssContent.includes('.builder-actions-group') || cssContent.includes('#btn-preview-test'),
    'styles.css must define top-bar button styling'
  );

  assert.ok(
    cssContent.includes('white-space: nowrap') || cssContent.includes('white-space: nowrap !important'),
    'styles.css must enforce white-space: nowrap on action buttons'
  );

  // Verify Candidate Simulation scrolling constraints (min-height: 0)
  assert.ok(
    cssContent.includes('candidate-simulation-shell') && cssContent.includes('min-height: 0'),
    'candidate-simulation-shell must have min-height: 0 for proper flex scrolling'
  );

  assert.ok(
    cssContent.includes('.exam-layout') && cssContent.includes('overflow-y: auto'),
    'exam-layout must enable vertical scrolling'
  );
});

test('Test Studio: index.html bumps cache buster for styles.css', () => {
  const htmlPath = path.join(frontendDir, 'term-tests', 'teacher-dashboard', 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(
    htmlContent.includes('styles.css?rev=20261018-layout-v3'),
    'index.html must reference styles.css?rev=20261018-layout-v3 to bust cache'
  );
});

test('Test Studio: app.js wraps top-bar buttons in .builder-actions-group and provides prompt textarea', () => {
  const appJsPath = path.join(frontendDir, 'term-tests', 'teacher-dashboard', 'app.js');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');

  assert.ok(
    appJsContent.includes('builder-actions-group'),
    'app.js must wrap top-bar buttons in .builder-actions-group'
  );

  assert.ok(
    appJsContent.includes('Đề bài / Nội dung câu hỏi') || appJsContent.includes('item-prompt-input'),
    'app.js must provide clear prompt label and item-prompt-input textarea'
  );

  assert.ok(
    appJsContent.includes('block-reading-input'),
    'app.js must render block-reading-input'
  );
});
