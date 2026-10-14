import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('student waiting room consumes exam SSE and uses the server deadline for the timer', async () => {
  const page = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(page, /\/api\/learning\/attempts\/events/);
  assert.match(page, /Authorization:\s*`Bearer \$\{state\.learning\.attemptToken\}`/);
  assert.match(page, /event === 'snapshot' \|\| event === 'exam\.started'/);
  assert.match(page, /expiresAt:\s*deadlineAt \? Date\.parse\(deadlineAt\) : null/);
  assert.match(page, /state\.learning\?\.expiresAt/);
  assert.match(page, /connectExamEvents\(\)/);
});
