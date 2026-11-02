import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

test('detail items table header renders "Thao tác" and dedicated column classes', async () => {
  const html = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');

  assert.match(html, /<th class="col-action">Thao tác<\/th>/);
  assert.match(html, /<th class="col-score">Điểm số<\/th>/);
  assert.match(html, /<th class="col-verdict">Trạng thái<\/th>/);
  assert.match(html, /<col style="width:\s*85px;">/);
  assert.match(html, /<col style="width:\s*110px;">/);
});

test('CSS enforces nowrap on table score, action, verdict, and badge-manual-override', async () => {
  const css = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');

  assert.match(css, /\.grading-table th\.col-action[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.grading-table th\.col-score[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.btn-inspect-item[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.badge-manual-override[^}]*white-space:\s*nowrap/);
  assert.match(css, /\.grading-table\s*\{[^}]*min-width:\s*980px/);
});

test('dashboard logic supports inline editing, manual override badge, and modal score adjustment', async () => {
  const js = await fs.readFile(new URL('../term-tests/teacher-dashboard/shell/dashboard.js', import.meta.url), 'utf8');

  assert.match(js, /btn-edit-score-inline/);
  assert.match(js, /btn-cancel-edit-inline/);
  assert.match(js, /badge-manual-override/);
  assert.match(js, /modal-override-block/);
  assert.match(js, /modal-override-score-input/);
  assert.match(js, /btn-modal-save-grade/);
  assert.match(js, /btn-modal-reset-grade/);
  assert.match(js, /_resetOverride/);
});
