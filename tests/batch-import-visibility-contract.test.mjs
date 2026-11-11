import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Hợp đồng ẩn/hiện của modal nhập hàng loạt (kiểm trên mã nguồn vì modal tải CSV theo Phần cần DOM thật):
// phần tử ẩn bằng thuộc tính hidden trong template, JS đảo bằng .hidden, và CSS không còn tự ẩn bằng display:none
// (nếu còn thì hidden = false chỉ gỡ thuộc tính và phần tử không bao giờ hiện lại).
const dashboard = new URL('../term-tests/teacher-dashboard/', import.meta.url);
const source = readFileSync(new URL('studio/batch-import.js', dashboard), 'utf8');
const publishingCss = readFileSync(new URL('styles/06-publishing.css', dashboard), 'utf8');
const overridesCss = readFileSync(new URL('styles/10-studio-overrides.css', dashboard), 'utf8');

const declarations = (css, selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `rule exists: ${selector}`);
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
};

test('batch-import toggles visibility only through hidden', () => {
  assert.equal(source.includes('.style.display'), false);
});

test('block CSV upload preview and error boxes start hidden through the hidden attribute', () => {
  assert.ok(source.includes('<div class="block-csv-preview-box csv-layout-preview" hidden></div>'));
  assert.ok(source.includes('<div class="block-csv-error-box csv-layout-error" hidden></div>'));
});

test('CSS rules no longer hide the batch import elements by themselves', () => {
  assert.doesNotMatch(declarations(publishingCss, '#generic-batch-modal .generic-layout-preview'), /display\s*:/);
  assert.doesNotMatch(declarations(publishingCss, ':is(#modal-csv-quick-guide, #modal-block-csv-upload) .csv-layout-preview'), /display\s*:/);
  assert.doesNotMatch(declarations(publishingCss, ':is(#modal-csv-quick-guide, #modal-block-csv-upload) .csv-layout-error'), /display\s*:/);
  assert.equal(overridesCss.includes('.modal-batch-tab-panel'), false, 'tab panels are shown and hidden through the hidden attribute only');
});
