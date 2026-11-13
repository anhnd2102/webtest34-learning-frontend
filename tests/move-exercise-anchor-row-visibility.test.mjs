import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Hợp đồng ẩn/hiện của hàng "bài tập mốc" trong modal chuyển bài tập (kiểm trên mã nguồn, không dựng DOM):
// hàng ẩn bằng thuộc tính hidden ngay trong template, JS đảo bằng .hidden, và CSS không còn tự ẩn bằng display:none
// (nếu còn thì hàng sẽ không bao giờ hiện lại vì hidden=false chỉ gỡ thuộc tính).
const dashboard = new URL('../term-tests/teacher-dashboard/', import.meta.url);
const source = readFileSync(new URL('studio/move-exercise-modal.js', dashboard), 'utf8');
const css = readFileSync(new URL('styles/06-publishing.css', dashboard), 'utf8');

test('move-exercise anchor row starts hidden through the hidden attribute', () => {
  assert.match(source, /class="form-group target-exercise-row move-layout-anchor-field" hidden>/);
});

test('move-exercise modal toggles the anchor row through hidden, not inline display', () => {
  assert.doesNotMatch(source, /targetExRow\.style/);
  assert.equal((source.match(/targetExRow\.hidden = true/g) || []).length, 3);
  assert.equal((source.match(/targetExRow\.hidden = false/g) || []).length, 2);
});

test('the anchor row CSS rule no longer hides the row by itself', () => {
  const rule = css.match(/#modal-move-exercise \.move-layout-anchor-field \{([^}]*)\}/);
  assert.ok(rule, 'rule exists');
  assert.doesNotMatch(rule[1], /display\s*:/);
});
