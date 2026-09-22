import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import { resultDetailsHtml, resultViewModel } from '../term-tests/webtest-34-demo/content-preview.mjs';

test('labels pending scores as provisional and reports remaining AI items', () => {
  assert.deepEqual(resultViewModel({
    gradingStatus: 'pending',
    summary: { scoreEarned: 12, maxScore: 20, scoreFinal: false, pendingItemCount: 6 }
  }), {
    tone: 'pending', title: 'AI đang chấm bài', scoreFinal: false, pendingItemCount: 6,
    scoreLabel: 'Điểm tạm tính', score: '12 / 20'
  });
});

test('distinguishes complete and manual-review results', () => {
  assert.equal(resultViewModel({ gradingStatus: 'complete', summary: { scoreEarned: 20, maxScore: 20, scoreFinal: true, pendingItemCount: 0 } }).scoreLabel, 'Điểm chính thức');
  assert.equal(resultViewModel({ gradingStatus: 'manual_review', summary: { scoreEarned: 12, maxScore: 20, scoreFinal: false, pendingItemCount: 0 } }).tone, 'manual_review');
});

test('canonical renderer uses the asynchronous result view model', async () => {
  const html = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(html, /resultViewModel\(result\)/);
  assert.match(html, /Điểm tạm tính/);
});

test('course 03 and 45 result details use the Course 34 section layout', () => {
  const html = resultDetailsHtml({ items: [
    { itemVersionId: 'item-1', position: 1, verdict: 'correct', scoreEarned: 1, maxScore: 1, rawAnswer: 'A' },
    { itemVersionId: 'item-2', position: 2, verdict: 'pending', scoreEarned: 0, maxScore: 1, rawAnswer: 'B' }
  ] }, { blocks: [{ blockId: 'block-1', title: 'Listening · Part 1', items: [{ itemVersionId: 'item-1' }, { itemVersionId: 'item-2' }] }] });
  assert.match(html, /learning-result-section/);
  assert.match(html, /learning-result-exercise/);
  assert.match(html, /learning-result-verdict correct/);
  assert.match(html, /learning-result-verdict pending/);
  assert.match(html, /1 \/ 2 điểm/);
});
