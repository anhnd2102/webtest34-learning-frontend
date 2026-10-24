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

test('Candidate UI: Inline cloze preserves question instructions ("không bị mất đề bài") and wraps text inside card borders ("không bị tràn")', async () => {
  const { renderQuestionCard, renderInlineCloze } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const css = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-test.css'), 'utf8');

  // 1. Question card must prevent clipping and wrap words
  assert.match(css, /\.cbt-question-card[^}]*overflow:\s*visible\s*!important/i, 'Card must have overflow: visible to prevent clipping words');
  assert.match(css, /\.cbt-question-card[^}]*word-break:\s*break-word\s*!important/i, 'Card must have word-break: break-word');
  assert.match(css, /\.cbt-cloze-content[^}]*overflow-wrap:\s*break-word\s*!important/i, 'Cloze must have overflow-wrap: break-word');
  assert.match(css, /\.cbt-blank-input[^}]*width:\s*85px\s*!important/i, 'Blank input must have compact 85px width');

  // 2. Cloze item with item.instructions must render instructions prompt
  const clozeItemWithInstructions = {
    itemVersionId: 'cloze-item-1',
    position: 48,
    layoutType: 'inline_cloze',
    pedagogicalTypeCode: 'inline_cloze',
    instructions: 'Complete each sentence below with ONE word.',
    prompt: '11. The study lacks solid (48) __________ to support its conclusion that radiation caused the problem.'
  };

  const cardHtml1 = renderQuestionCard(clozeItemWithInstructions, {});
  assert.ok(cardHtml1.includes('Complete each sentence below with ONE word.'), 'Should render item.instructions in question card prompt');
  assert.ok(cardHtml1.includes('candidate-question-prompt'), 'Should render candidate-question-prompt container');

  // 3. Cloze item inheriting block.instructions
  const clozeItemInheritingBlock = {
    itemVersionId: 'cloze-item-2',
    position: 48,
    layoutType: 'inline_cloze',
    pedagogicalTypeCode: 'inline_cloze',
    prompt: '11. The study lacks solid (48) __________ to support its conclusion that radiation caused the problem.'
  };
  const mockBlock = {
    instructions: 'III. Complete the collocations in the sentences below. Write ONE WORD only for each blank.'
  };

  const cardHtml2 = renderQuestionCard(clozeItemInheritingBlock, {}, mockBlock);
  assert.ok(cardHtml2.includes('III. Complete the collocations in the sentences below. Write ONE WORD only for each blank.'), 'Should inherit block.instructions when item has no instructions');

  // 4. Cloze item without any instructions must render clear fallback prompt
  const cardHtml3 = renderQuestionCard(clozeItemInheritingBlock, {});
  assert.ok(cardHtml3.includes('Điền từ thích hợp vào chỗ trống'), 'Should render fallback cloze prompt instead of empty prompt');

  // 5. renderInlineCloze cleans non-breaking spaces and applies word-wrap styling in cbt-cloze-line
  const renderedCloze = renderInlineCloze(clozeItemWithInstructions);
  assert.ok(renderedCloze.includes('cbt-cloze-line'), 'Rendered cloze markup must have cbt-cloze-line');
  assert.ok(renderedCloze.includes('cbt-blank-pill'), 'Rendered cloze markup must have cbt-blank-pill');
  assert.ok(renderedCloze.includes('white-space:normal'), 'Rendered cloze must have normal white-space to wrap lines naturally');
});

test('Candidate UI: Audio Dock removes play count badge ("xoá lượt phát đi") and enforces single listen', async () => {
  const { renderAudioDockHtml } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const css = await fs.readFile(resolve(FRONTEND_DIR, 'term-tests/webtest-34-demo/dynamic-test.css'), 'utf8');

  // Badge must be hidden in CSS
  assert.match(css, /\.sim-audio-badge\s*\{[^}]*display:\s*none\s*!important/i, 'sim-audio-badge must be hidden in CSS');

  // Rendered audio dock must NOT render listen badge markup
  const dockHtml = renderAudioDockHtml('assets/34/test-1/listening.mp3', 'Bài nghe: LISTENING', 1);
  assert.equal(dockHtml.includes('data-listen-badge'), false, 'Should not render data-listen-badge in audio dock');
  assert.equal(dockHtml.includes('Lượt'), false, 'Should not have "Lượt" play count badge');
  assert.ok(dockHtml.includes('data-max-listens="1"'), 'Must configure data-max-listens to 1');
  assert.ok(dockHtml.includes('btn-sim-audio-play'), 'Must include audio play button');
  assert.ok(dockHtml.includes('preload="auto"'), 'Must include preload auto for seamless playback');
});


