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

test('Test Studio: error correction batch import initializes correct graderType correction_pair', () => {
  const file = findFile('term-tests/teacher-dashboard/app.js');
  const code = readFileSync(file, 'utf8');

  assert.ok(
    code.includes("graderType: 'correction_pair',\r\n                  required: true,\r\n                  maxScore: 1,\r\n                  targetWord: parsed.targetWord") ||
    code.includes("graderType: 'correction_pair',\n                  required: true,\n                  maxScore: 1,\n                  targetWord: parsed.targetWord"),
    'Error correction batch import must set graderType correction_pair in public definition'
  );

  assert.ok(
    code.includes("graderType: 'correction_pair',\r\n                  expectedErrors:") ||
    code.includes("graderType: 'correction_pair',\n                  expectedErrors:"),
    'Error correction batch import must set graderType correction_pair in draft grading key'
  );
});

