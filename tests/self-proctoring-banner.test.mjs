import assert from 'node:assert/strict';
import test from 'node:test';
import '../term-tests/webtest-34-demo/exam-guard.js';
import { selfProctoringBannerHtml } from '../term-tests/webtest-34-demo/content-preview.mjs';

test('không có Tự giám sát thì không có banner', () => {
  assert.equal(selfProctoringBannerHtml(null), '');
});

test('banner hiện luật, bộ đếm và mức cảnh báo', () => {
  const html = selfProctoringBannerHtml({ exitLimit: 2, exitCount: 2 });
  assert.match(html, /id="selfProctoringBanner"/);
  assert.match(html, /danger/);
  assert.match(html, /2\/2/);
  assert.match(selfProctoringBannerHtml({ exitLimit: 2, exitCount: 0 }), /thoát quá 2 lần/);
});
