import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('student waiting room consumes exam SSE and uses the server deadline for the timer', async () => {
  const page = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(page, /\/api\/learning\/attempts\/events/);
  assert.match(page, /Authorization:\s*`Bearer \$\{state\.learning\.attemptToken\}`/);
  assert.ok(page.includes("event === 'snapshot' && data"));
  assert.ok(page.includes("event === 'exam.started' && data"));
  assert.match(page, /expiresAt:\s*deadlineAt \? Date\.parse\(deadlineAt\) : null/);
  assert.match(page, /state\.learning\?\.expiresAt/);
  assert.match(page, /connectExamEvents\(\)/);
});

test('student exam stream stays connected while running and applies extension deadlines from SSE', async () => {
  const page = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.ok(page.includes("event === 'exam.extended'"));
  assert.ok(page.includes('applyExamExtended(JSON.parse(data))'));
  assert.ok(page.includes("['waiting', 'running'].includes(state.learning?.exam?.status)"));
  assert.ok(page.includes('state.learning.expiresAt = Date.parse(deadlineAt)'));
});
