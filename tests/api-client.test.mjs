import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiRequest } from '../term-tests/teacher-dashboard/api/client.js';

function setup({ responses = [], session = true, disposed = false } = {}) {
  const calls = [];
  const unauthorized = [];
  const queue = [...responses];
  const request = createApiRequest({
    apiBase: () => 'https://api.test',
    authHeader: () => ({ Authorization: 'Bearer tok' }),
    hasSession: () => session,
    onUnauthorized: () => unauthorized.push(true),
    isDisposed: () => disposed,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const next = queue.shift() ?? { status: 200, body: {} };
      return { status: next.status, ok: next.status >= 200 && next.status < 300, json: async () => { if (next.body === undefined) throw new Error('not json'); return next.body; } };
    }
  });
  return { request, calls, unauthorized };
}

test('gắn Authorization, ghép base, giữ headers của nơi gọi và không gửi errorMessage xuống fetch', async () => {
  const { request, calls } = setup({ responses: [{ status: 200, body: { ok: 1 } }] });
  const payload = await request('/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', errorMessage: 'dự phòng' });
  assert.deepEqual(payload, { ok: 1 });
  assert.equal(calls[0].url, 'https://api.test/x');
  assert.deepEqual(calls[0].options.headers, { Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
  assert.equal('errorMessage' in calls[0].options, false);
  assert.equal(calls.length, 1, 'không tự thử lại');
});

test('anonymous không gắn auth và 401 không kết thúc phiên', async () => {
  const { request, calls, unauthorized } = setup({ responses: [{ status: 401, body: { message: 'Sai mật khẩu' } }] });
  await assert.rejects(request('/login', { method: 'POST', anonymous: true, errorMessage: 'dự phòng' }), error => error.message === 'Sai mật khẩu' && error.status === 401);
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(unauthorized, []);
});

test('401 khi đang có phiên gọi onUnauthorized một lần và ném lỗi', async () => {
  const { request, unauthorized } = setup({ responses: [{ status: 401, body: { message: 'Hết hạn' } }] });
  await assert.rejects(request('/x'), /Hết hạn/);
  assert.equal(unauthorized.length, 1);
});

test('401 không có phiên hoặc handleUnauthorized=false trả lỗi HTTP bình thường', async () => {
  const noSession = setup({ session: false, responses: [{ status: 401, body: {} }] });
  await assert.rejects(noSession.request('/x'), error => error.status === 401);
  assert.deepEqual(noSession.unauthorized, []);
  const manual = setup({ responses: [{ status: 401, body: {} }] });
  await assert.rejects(manual.request('/x', { handleUnauthorized: false }), error => error.status === 401);
  assert.deepEqual(manual.unauthorized, []);
});

test('lỗi HTTP mang status, code, details, apiMessage và dùng errorMessage khi máy chủ không có message', async () => {
  const { request } = setup({ responses: [{ status: 409, body: { message: 'Xung đột', error: 'conflict', details: { a: 1 } } }, { status: 500, body: {} }, { status: 502, body: undefined }] });
  await assert.rejects(request('/x'), error => error.message === 'Xung đột' && error.code === 'conflict' && error.details.a === 1 && error.apiMessage === 'Xung đột' && error.status === 409);
  await assert.rejects(request('/x', { errorMessage: 'Không thể lưu.' }), error => error.message === 'Không thể lưu.' && error.apiMessage === undefined);
  await assert.rejects(request('/x'), error => error.message === 'Không tải được dữ liệu.' && error.status === 502, 'phản hồi không phải JSON');
});

test('đã hủy hoặc dashboard đã dispose thì ném AbortError, kể cả khi phản hồi thành công', async () => {
  const controller = new AbortController();
  controller.abort();
  const aborted = setup({ responses: [{ status: 200, body: {} }] });
  await assert.rejects(aborted.request('/x', { signal: controller.signal }), error => error.name === 'AbortError');
  const disposed = setup({ disposed: true, responses: [{ status: 200, body: {} }] });
  await assert.rejects(disposed.request('/x'), error => error.name === 'AbortError');
});
