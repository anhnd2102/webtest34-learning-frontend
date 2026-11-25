import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreviewToken, fetchPreviewDefinition, blockedPreviewRequest, previewBannerHtml, PREVIEW_BANNER_TEXT } from '../term-tests/webtest-34-demo/candidate/preview-mode.js';
import { previewPageUrl, openExamPreview } from '../term-tests/teacher-dashboard/shell/preview-link.js';

test('readPreviewToken: chỉ đọc từ fragment dạng #preview=<token>', () => {
  assert.equal(readPreviewToken('#preview=abc.def'), 'abc.def');
  assert.equal(readPreviewToken('preview=abc.def&x=1'), 'abc.def');
  assert.equal(readPreviewToken('#test=33333333-3333-4333-8333-333333333333'), '');
  assert.equal(readPreviewToken('#abc.def'), '');
  assert.equal(readPreviewToken(''), '');
});

test('previewPageUrl: token chỉ nằm trong fragment, không vào query', () => {
  const url = new URL(previewPageUrl({ pageUrl: 'https://x.github.io/app/term-tests/teacher-dashboard/index.html?classId=1#test-studio', token: 'a.b-c_d', apiBase: 'https://webtest.izoneacademic.com' }));
  assert.equal(url.pathname, '/app/term-tests/webtest-34-demo/index.html');
  assert.equal(url.hash, '#preview=a.b-c_d');
  assert.ok(!url.search.includes('a.b-c_d'));
  assert.equal(url.searchParams.get('prod'), '1');
  assert.equal(url.searchParams.get('classId'), null, 'không mang query của Dashboard');
});

test('fetchPreviewDefinition: chỉ GET với Bearer token; 401 báo hết hạn', async () => {
  const calls = [];
  const okFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ definition: { title: 'T' }, expiresAt: 'x' }) }; };
  const res = await fetchPreviewDefinition('https://api', 'tok', okFetch);
  assert.equal(res.definition.title, 'T');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api/api/learning/preview/definition');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer tok');
  assert.equal(calls[0].init.body, undefined);
  const expired = async () => ({ ok: false, status: 401, json: async () => ({}) });
  await assert.rejects(() => fetchPreviewDefinition('https://api', 'tok', expired), /hết hạn/);
});

test('blockedPreviewRequest: luồng học viên không gửi được gì', async () => {
  await assert.rejects(() => blockedPreviewRequest(), /không gửi dữ liệu/);
});

test('previewBannerHtml: có biểu ngữ cố định', () => {
  assert.match(previewBannerHtml(), new RegExp(PREVIEW_BANNER_TEXT));
});

test('openExamPreview: mở tab ngay, cấp token rồi chuyển tab; lỗi thì đóng tab và báo', async () => {
  const opened = [];
  const tab = { location: { href: '' }, closed: false, close() { this.closed = true; } };
  const win = { open: (url) => { opened.push(url); return tab; } };
  const requests = [];
  await openExamPreview({
    formVersionId: 'fv-1', win, pageUrl: 'https://h/term-tests/teacher-dashboard/index.html',
    request: async (path, options) => { requests.push({ path, options }); return { token: 'tkn' }; },
    onError: () => assert.fail('không được lỗi')
  });
  assert.deepEqual(opened, ['about:blank']);
  assert.equal(requests[0].path, '/api/teacher/forms/fv-1/preview-token');
  assert.equal(requests[0].options.method, 'POST');
  assert.match(tab.location.href, /webtest-34-demo\/index\.html#preview=tkn$/);

  const failTab = { location: { href: '' }, closed: false, close() { this.closed = true; } };
  const errors = [];
  await openExamPreview({
    formVersionId: 'fv-1', win: { open: () => failTab }, pageUrl: 'https://h/term-tests/teacher-dashboard/index.html',
    request: async () => { throw new Error('Không có quyền'); }, onError: m => errors.push(m)
  });
  assert.equal(failTab.closed, true);
  assert.deepEqual(errors, ['Không có quyền']);

  const noId = [];
  await openExamPreview({ formVersionId: '', win, pageUrl: 'https://h/x/index.html', request: async () => ({}), onError: m => noId.push(m) });
  assert.equal(noId.length, 1);
});
