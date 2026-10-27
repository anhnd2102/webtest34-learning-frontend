import assert from 'node:assert/strict';
import '../term-tests/webtest-34-demo/exam-guard.js';
import test from 'node:test';

const notice = globalThis.selfProctoringNotice;

test('trước khi thoát lần nào: hiện luật', () => {
  assert.deepEqual(notice({ exitLimit: 2, exitCount: 0 }), {
    level: 'info', text: 'Bài này tự giám sát: thoát quá 2 lần, bài sẽ tự động nộp.'
  });
});

test('đã thoát trong giới hạn: hiện X/N và số lần còn lại', () => {
  assert.deepEqual(notice({ exitLimit: 3, exitCount: 1 }), { level: 'info', text: 'Bạn đã thoát 1/3 lần, còn 2 lần.' });
});

test('hết lượt thoát: cảnh báo đỏ', () => {
  assert.deepEqual(notice({ exitLimit: 2, exitCount: 2 }), {
    level: 'danger', text: 'Bạn đã thoát 2/2 lần. Thoát thêm một lần nữa bài sẽ bị nộp tự động.'
  });
  assert.equal(notice({ exitLimit: 0, exitCount: 0 }).level, 'danger');
});

test('đã tự nộp: thông báo lý do', () => {
  assert.deepEqual(notice({ exitLimit: 1, exitCount: 2, autoSubmitted: true }), {
    level: 'submitted', text: 'Bài đã được tự động nộp vì bạn thoát quá 1 lần.'
  });
});
