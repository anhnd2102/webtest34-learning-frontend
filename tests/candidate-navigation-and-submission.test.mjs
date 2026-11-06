import { readDashboardSource } from './helpers/dashboard-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function findFile(rel) {
  const p1 = resolve(rel);
  if (existsSync(p1)) return p1;
  const p2 = resolve('webtest34-learning-frontend', rel);
  if (existsSync(p2)) return p2;
  const p3 = resolve(import.meta.dirname, '..', rel);
  if (existsSync(p3)) return p3;
  return p1;
}

test('Candidate Exam: prev/next navigation does not double-bind in dynamic exam mode', () => {
  const file = findFile('term-tests/webtest-34-demo/content-preview.mjs');
  const code = readFileSync(file, 'utf8');

  // Kiểm tra logic showSection và click listeners cho demo-prev / demo-next chỉ được gắn khi !isDynamic
  assert.ok(code.includes('if (!isDynamic) {'), 'Navigation listeners must be guarded with if (!isDynamic)');
  assert.ok(
    code.includes('dynamicExamControls.activateSection'),
    'Dynamic exam must delegate section activation to dynamicExamControls'
  );
});

test('Dynamic Renderer: section cards use data-block-id instead of conflicting legacy data-demo-page', () => {
  const file = findFile('term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const code = readFileSync(file, 'utf8');

  assert.ok(
    !code.includes('data-demo-page="${escape(sectionName)}"'),
    'Dynamic section cards must not emit legacy data-demo-page which conflicts with legacy showSection'
  );
  assert.ok(
    code.includes('data-block-id='),
    'Dynamic section cards must emit data-block-id'
  );
});

test('Dynamic Renderer: navigation uses currentActiveBlockIdx, onclick handlers, and window.scrollTo', () => {
  const file = findFile('term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const code = readFileSync(file, 'utf8');

  assert.ok(
    code.includes('let currentActiveBlockIdx = 0;'),
    'Dynamic exam renderer must track currentActiveBlockIdx internally'
  );
  assert.ok(
    code.includes("window.scrollTo({ top: 0, behavior: 'smooth' });"),
    'Must smoothly scroll to top of exam section on section switch'
  );
  assert.ok(
    code.includes('prevBtn.onclick = () => {') && code.includes('nextBtn.onclick = () => {'),
    'Prev/Next navigation buttons must use .onclick to prevent event double-binding'
  );
});

test('Test Studio: error correction batch import initializes correct graderType correction_pair', () => {
  const code = readDashboardSource();

  assert.ok(
    code.includes("graderType: 'correction_pair'") && code.includes("targetWord: parsed.targetWord"),
    'Error correction batch import must set graderType correction_pair in public definition'
  );
});

test('Test Studio: Block CSV import handles vocabulary_pair and inline_cloze with proper grading keys', () => {
  const code = readDashboardSource();

  assert.ok(
    code.includes("graderType: 'accepted_text_exact_option'"),
    'Must handle vocabulary_pair with graderType accepted_text_exact_option in gradingKey'
  );
  assert.ok(
    code.includes("graderType: 'inline_cloze'"),
    'Must handle inline_cloze with graderType inline_cloze and blanks in gradingKey'
  );
  assert.ok(
    code.includes("modal.style.position = 'fixed';"),
    'Block CSV and guide modals must have fixed position to guarantee popup modal overlay display'
  );
});
