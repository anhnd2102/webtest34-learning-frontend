import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_DIR = resolve(__dirname, '..');

test('Candidate UI: Removal of AI text across candidate/student views', async () => {
  const dynamicExamRenderer = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-exam-renderer.mjs'), 'utf8');
  const contentPreview = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/content-preview.mjs'), 'utf8');
  const candidateIndexHtml = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/index.html'), 'utf8');

  // Verify dynamic-exam-renderer.mjs
  assert.equal(dynamicExamRenderer.includes('Tự luận (Chấm AI)'), false, 'Should not have "Tự luận (Chấm AI)" in dynamic-exam-renderer');
  assert.equal(dynamicExamRenderer.includes('(Chấm AI)'), false, 'Should not have "(Chấm AI)" in dynamic-exam-renderer');
  assert.equal(dynamicExamRenderer.includes('chấm bằng AI'), false, 'Should not have "chấm bằng AI" in dynamic-exam-renderer');
  assert.equal(dynamicExamRenderer.includes('AI chấm'), false, 'Should not have "AI chấm" in dynamic-exam-renderer');

  // Verify content-preview.mjs
  assert.equal(contentPreview.includes('hệ thống và AI chấm điểm'), false, 'Should not have "hệ thống và AI chấm điểm" banner');
  assert.equal(contentPreview.includes('đánh giá của AI'), false, 'Should not have "đánh giá của AI"');
  assert.equal(contentPreview.includes('Hệ thống AI đã hoàn tất chấm'), false, 'Should not have "Hệ thống AI đã hoàn tất chấm"');
  assert.equal(contentPreview.includes('bằng AI trong vòng'), false, 'Should not have "bằng AI trong vòng"');

  // Verify index.html student strings
  assert.equal(candidateIndexHtml.includes('AI đang chấm bài'), false, 'Should not have "AI đang chấm bài" in index.html');
  assert.equal(candidateIndexHtml.includes('Đang chờ chấm AI'), false, 'Should not have "Đang chờ chấm AI" in index.html');
});

test('Candidate UI: Audio Dock and Timer background complies with DESIGN_SYSTEM.md (No black background)', async () => {
  const css = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-test.css'), 'utf8');

  // Strict audio dock must not have black gradient #0f172a
  assert.equal(css.includes('.strict-audio-dock {\n  background: linear-gradient(135deg, #0f172a'), false, 'Audio dock must not have dark gradient');
  assert.match(css, /\.strict-audio-dock\s*\{[^}]*background:\s*#ffffff/i, 'Audio dock must have white background');
  assert.match(css, /\.strict-audio-dock\s*\{[^}]*border-left:\s*5px solid var\(--izone-primary/i, 'Audio dock must have ruby-red accent border');

  // Timer container must not have black background
  assert.match(css, /\.cbt-timer-container\s*\{[^}]*background:\s*#ffffff/i, 'Timer container must have white background');
});

test('Candidate UI: Question badges and prompt row prevent line wrapping ("Các câu 5 câu 7... không bị xuống dòng")', async () => {
  const css = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-test.css'), 'utf8');

  // Badges must have white-space: nowrap !important and flex-shrink: 0 !important
  assert.match(css, /\.candidate-short-qnum[^}]*white-space:\s*nowrap\s*!important/i, 'candidate-short-qnum must not wrap');
  assert.match(css, /\.candidate-short-qnum[^}]*flex-shrink:\s*0\s*!important/i, 'candidate-short-qnum must not shrink');
  assert.match(css, /\.question-num-badge[^}]*min-width:\s*max-content\s*!important/i, 'Badge must expand to fit text width');
  assert.match(css, /\.question-num-badge[^}]*padding:\s*4px 14px\s*!important/i, 'Badge must have generous padding');

  // Short QA prompt row must be flex baseline
  assert.match(css, /\.candidate-short-prompt-row\s*\{[^}]*display:\s*flex\s*!important/i, 'candidate-short-prompt-row must be flex');
  assert.match(css, /\.candidate-short-prompt-row\s*\{[^}]*align-items:\s*baseline\s*!important/i, 'candidate-short-prompt-row must align baseline');
  assert.match(css, /\.candidate-short-prompt-text\s*\{[^}]*flex:\s*1\s*!important/i, 'candidate-short-prompt-text must have flex: 1');

  // Verify legacy index.html style does not force fixed width:30px;height:30px on .qnum
  const indexHtml = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/index.html'), 'utf8');
  assert.equal(indexHtml.includes('.qnum{width:30px;height:30px;'), false, 'index.html must not force 30px square on .qnum');
});

test('Candidate UI: Pictorial vocabulary cards and Intro screen are styled cleanly', async () => {
  const css = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-test.css'), 'utf8');

  // Pictorial grid and image constraints
  assert.match(css, /\.candidate-pictorial-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/i, 'Pictorial grid must be 2 columns');
  assert.match(css, /\.candidate-pictorial-thumb\s*\{[^}]*max-height:\s*180px/i, 'Thumb must constrain height');
  assert.match(css, /\.candidate-pictorial-thumb img\s*\{[^}]*object-fit:\s*contain/i, 'Image must object-fit contain');
  assert.match(css, /\.candidate-pictorial-card-header\s*\{[^}]*justify-content:\s*space-between/i, 'Header must justify space-between');

  // Intro and soundcheck box
  assert.match(css, /\.cbt-intro-card\s*\{[^}]*background:\s*#ffffff/i, 'Intro card must have white background');
  assert.match(css, /\.cbt-soundcheck-box\s*\{[^}]*background:\s*#f8fafc/i, 'Soundcheck box must have light background');
  assert.match(css, /\.btn-start-exam\s*\{[^}]*background:\s*var\(--izone-primary-gradient/i, 'Start button must use primary gradient');
});

test('Candidate UI: Side Panel increases vertical size without internal scrollbar', async () => {
  const css = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-test.css'), 'utf8');

  // .side-panel must have max-height: none !important and overflow: visible !important
  assert.match(css, /\.side-panel[^}]*max-height:\s*none\s*!important/i, 'side-panel must not be clamped by max-height');
  assert.match(css, /\.side-panel[^}]*overflow:\s*visible\s*!important/i, 'side-panel must not have scrollbar');

  // .question-navigator-grid must not have max-height: 280px overflow-y: auto
  assert.match(css, /\.question-navigator-grid[^}]*max-height:\s*none\s*!important/i, 'grid must not have inner max-height');
  assert.match(css, /\.question-navigator-grid[^}]*overflow:\s*visible\s*!important/i, 'grid must not have inner scrollbar');
});

