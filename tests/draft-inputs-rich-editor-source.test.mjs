import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftInputSync } from '../term-tests/teacher-dashboard/studio/draft-inputs.js';

// syncInputs chọn nguồn lưu theo editor đang hiển thị (thuộc tính hidden):
//  - chế độ trực quan: nội dung trực quan được chép (đã làm sạch) vào ô mã;
//  - chế độ mã HTML: ô mã là nguồn sự thật, không được ghi đè bằng nội dung trực quan cũ.
function runSync({ visualHidden }) {
  const visual = { hidden: visualHidden, innerHTML: '<p>VISUAL CONTENT</p>' };
  const code = { value: '<p>CODE CONTENT</p>' };
  const wrap = {
    querySelector: selector => {
      if (selector === '.rich-editor-visual') return visual;
      if (selector === '.rich-editor-code, textarea') return code;
      return null;
    }
  };
  const container = {
    querySelector: () => null,
    querySelectorAll: selector => (selector === '.rich-html-editor-wrap' ? [wrap] : [])
  };
  const draftState = { blocks: [], gradingKey: { items: {}, groups: {} } };
  const syncInputs = createDraftInputSync({ container, draftState, updateScoreBreakdownBar: () => {}, hasUnsavedChanges: () => false });
  syncInputs();
  return code.value;
}

test('syncInputs copies the visual editor into the code field while the visual editor is visible', () => {
  assert.equal(runSync({ visualHidden: false }), '<p>VISUAL CONTENT</p>');
});

test('syncInputs keeps the code field untouched while the visual editor is hidden (code mode)', () => {
  assert.equal(runSync({ visualHidden: true }), '<p>CODE CONTENT</p>');
});
