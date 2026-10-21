// Chạy với Playwright có sẵn qua NODE_PATH (xem tests/exam-switch-dashboard.browser.mjs):
//   NODE_PATH=<thư mục node_modules có playwright> node --test tests/portal-sync-dashboard.browser.mjs
// Trình duyệt thật + API/Portal giả có trạng thái, chỉ dữ liệu giả lập (không chạm backend thật).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium, expect } = createRequire(import.meta.url)('playwright/test');
const root = fileURLToPath(new URL('..', import.meta.url));
const classId = '101';
const assignmentId = '11111111-1111-4111-8111-111111111111';
const teacher = { name: 'Test Teacher', email: 'teacher@example.test', role: 'admin', courseCodes: ['34'] };
const ref = n => `00000000-0000-4000-8000-00000000000${n}`;
const FP = 'a'.repeat(64);

async function startStaticServer() {
  const port = 18000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.stdout.on('data', chunk => { if (String(chunk).includes(String(port))) resolve(); });
    setTimeout(resolve, 1500);
  });
  return { port, stop: () => child.kill() };
}

function fakeApi({ mode }) {
  const api = { mode, linked: false, syncBodies: [], linkBodies: [], failB: true, syncDone: false, batches: 0, testsFail: false, syncStale: false, syncDelay: 0, previewCalls: 0 };
  const rows = () => [
    { studentRef: ref(1), name: 'HV Một', status: api.syncDone ? 'matched' : 'ready', webtestEarned: 17, webtestMaximum: 20, convertedScore: 8.5, portalScore: api.syncDone ? 8.5 : null },
    { studentRef: ref(2), name: 'HV Hai', status: api.b2synced ? 'matched' : 'ready', webtestEarned: 10, webtestMaximum: 20, convertedScore: 5, portalScore: api.b2synced ? 5 : null },
    { studentRef: ref(3), name: 'HV Ba', status: 'matched', webtestEarned: 20, webtestMaximum: 20, convertedScore: 10, portalScore: 10 },
    { studentRef: ref(4), name: 'HV Bốn', status: 'mismatch', webtestEarned: 12, webtestMaximum: 20, convertedScore: 6, portalScore: 7 },
    { studentRef: ref(5), name: 'HV Năm', status: 'blocked', reason: 'score_not_final' }
  ];
  api.handle = async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(body) });
    const err = (status, error, message) => reply(status, { ok: false, error, message });
    if (request.method() === 'OPTIONS') return reply(204, {});
    if (path.endsWith('/auth/me')) return reply(200, { teacher });
    if (path.endsWith('/auth/login')) return reply(200, { token: 'synthetic-session', teacher });
    if (path === '/api/teacher/classes') return reply(200, { classes: [{ classId, name: 'IC34-A', courseCode: '34', status: 'on_going', isTeaching: true, assignmentCount: 1 }] });
    if (path === `/api/teacher/classes/${classId}/assignments`) {
      return reply(200, { class: { classId, name: 'IC34-A', courseCode: '34' }, serverNow: '2026-10-21T04:00:00.000Z', assignments: [{ assignmentId, classId, title: 'Test 1', courseCode: '34', phase: 1, status: 'published', examMode: false }] });
    }
    if (path.endsWith('/results')) {
      return reply(200, { assignment: { assignmentId, classId, className: 'IC34-A', courseCode: '34', title: 'Test 1', formVersionId: 'v', formVersion: 1 }, skills: [], students: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 1 } });
    }
    if (!path.includes('portal')) return reply(200, {});
    if (api.mode === 'off') return err(503, 'PORTAL_SYNC_DISABLED', 'Đồng bộ điểm Portal đang tắt.');
    if (path.endsWith('/portal-tests')) {
      if (api.testsFail) return err(500, 'INTERNAL', 'Lỗi máy chủ tạm thời');
      return reply(200, { ok: true, portalTests: [
        { portalClassTestId: 7, portalCourseTestId: 70, name: 'Test 1 Portal', maxScore: 10, linkedAssignmentId: api.linked ? assignmentId : null },
        { portalClassTestId: 8, portalCourseTestId: 80, name: 'Test 2 Portal', maxScore: 10, linkedAssignmentId: 'other' }
      ] });
    }
    if (path.endsWith('/portal-link') && request.method() === 'POST') { api.linkBodies.push(request.postDataJSON()); api.linked = true; return reply(201, { ok: true, portalLink: {} }); }
    if (path.endsWith('/portal-link') && request.method() === 'DELETE') { api.linked = false; return reply(200, { ok: true, unlinked: true }); }
    if (path.endsWith('/portal-sync/preview')) api.previewCalls += 1;
    if (path.endsWith('/portal-sync/preview')) return reply(200, { ok: true, preview: { assignmentId, mode: api.mode, scaleWarning: api.scaleWarning || null, rows: rows(), summary: {}, fingerprint: FP } });
    if (path.endsWith('/portal-sync/status')) {
      return reply(200, { ok: true, sync: api.batches ? { batchId: 'b', actorEmail: teacher.email, startedAt: '2026-10-21T04:05:00.000Z', rows: [] } : null });
    }
    if (path.endsWith('/portal-sync') && request.method() === 'POST') {
      if (api.mode !== 'write') return err(403, 'PORTAL_SYNC_WRITE_DISABLED', 'x');
      const body = request.postDataJSON();
      api.syncBodies.push(body);
      if (api.syncDelay) await new Promise(resolve => setTimeout(resolve, api.syncDelay));
      if (api.syncStale) { api.syncStale = false; return err(409, 'PORTAL_PREVIEW_STALE', 'x'); }
      api.batches += 1;
      api.syncDone = true;
      const failNow = api.failB;
      const out = body.studentRefs.map(r => (r === ref(2) && failNow
        ? { studentRef: r, status: 'failed', errorCode: 'PORTAL_READBACK_MISMATCH' }
        : { studentRef: r, status: 'synced' }));
      if (body.studentRefs.includes(ref(2))) { api.failB = false; api.b2synced = !failNow; }  // chỉ lần ghi đầu của HV Hai bị lỗi; thử lại thì thành công
      const summary = {};
      for (const r of out) summary[r.status] = (summary[r.status] || 0) + 1;
      return reply(200, { ok: true, sync: { batchId: 'b', rows: out, summary, stopped: null } });
    }
    return reply(200, {});
  };
  return api;
}

const press = (page, selector) => page.locator(selector).click();

async function open(t, mode, setup) {
  const server = await startStaticServer();
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true });
  t.after(async () => { await browser.close(); server.stop(); });
  const api = fakeApi({ mode });
  setup?.(api);
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/teacher/**', route => api.handle(route));
  await page.goto(`http://127.0.0.1:${server.port}/term-tests/teacher-dashboard/index.html`);
  if (await page.locator('#login-form').isVisible()) {
    await page.locator('#login-email').fill(teacher.email);
    await page.locator('#login-phone').fill('0000000000');
    await page.locator('#login-btn').click();
  }
  await expect(page.locator('#class-select')).toBeEnabled();
  await page.locator('#class-select').selectOption(classId);
  await expect(page.locator('#assignment-select')).toBeEnabled();
  await page.locator('#assignment-select').selectOption(assignmentId);
  await page.getByRole('button', { name: 'Vào chấm điểm & Đánh giá' }).click();
  return { api, page, errors };
}

test('chế độ tắt: báo rõ chưa bật, không có nút điều khiển', async t => {
  const { page, errors } = await open(t, 'off');
  await expect(page.locator('#portal-sync')).toBeVisible();
  await expect(page.locator('#portal-sync-message')).toContainText('chưa được bật');
  await expect(page.locator('#portal-link-btn')).toBeHidden();
  await expect(page.locator('#portal-preview')).toBeHidden();
  assert.deepEqual(errors, []);
});

test('chế độ chỉ xem trước: xem được bảng nhưng không ghi được', async t => {
  const { page, api } = await open(t, 'preview');
  await page.locator('#portal-test-select').selectOption('7');
  await page.locator('#portal-link-btn').click();
  await expect(page.locator('#portal-preview-rows tr')).toHaveCount(5);
  await expect(page.locator('#portal-sync-message')).toContainText('chỉ xem trước');
  await expect(page.locator('#portal-sync-btn')).toBeDisabled();
  assert.equal(api.syncBodies.length, 0);
});

test('gắn, xem trước, đồng bộ, lỗi đọc lại, thử lại, gỡ gắn', async t => {
  const { page, api, errors } = await open(t, 'write');
  await expect(page.locator('#portal-sync-message')).toContainText('Chưa gắn');
  // Bài test đã gắn với đợt khác không chọn được.
  await expect(page.locator('#portal-test-select option[value="8"]')).toHaveJSProperty('disabled', true);
  await page.locator('#portal-test-select').selectOption('7');
  await page.locator('#portal-link-btn').click();
  assert.deepEqual(api.linkBodies, [{ portalClassTestId: 7 }]);
  await expect(page.locator('#portal-linked-name')).toContainText('Test 1 Portal');

  const rows = page.locator('#portal-preview-rows tr');
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(0)).toContainText('Điền được');
  await expect(rows.nth(0)).toContainText('17/20 → 8.5');
  await expect(rows.nth(0)).toContainText('Trống');
  await expect(rows.nth(2)).toContainText('Đã khớp');
  await expect(rows.nth(3)).toContainText('Điểm lệch');
  await expect(rows.nth(4)).toContainText('Bị chặn: Điểm chưa chung cuộc');
  // Chỉ dòng điền được có checkbox bật.
  await expect(page.locator('.portal-pick:enabled')).toHaveCount(2);
  await expect(page.locator('#portal-sync-btn')).toHaveText('Đồng bộ điểm Portal (2)');

  // Bỏ chọn một học viên rồi chọn lại; hộp xác nhận nêu đúng số học viên; Hủy thì không gửi gì.
  await page.locator('.portal-pick').nth(1).uncheck();
  await expect(page.locator('#portal-sync-btn')).toHaveText('Đồng bộ điểm Portal (1)');
  await page.locator('.portal-pick').nth(1).check();
  await press(page, '#portal-sync-btn');
  await expect(page.locator('#portal-sync-confirm-text')).toContainText('2 học viên');
  await page.locator('#portal-sync-cancel').click();
  assert.equal(api.syncBodies.length, 0);

  await press(page, '#portal-sync-btn');
  await page.locator('#portal-sync-confirm-btn').click();
  await expect(page.locator('#portal-sync-message')).toContainText('Đã đồng bộ 1 · Lỗi 1');
  assert.deepEqual(api.syncBodies, [{ fingerprint: FP, studentRefs: [ref(1), ref(2)], confirm: true }]);
  await expect(rows.nth(0)).toContainText('Đã đồng bộ');
  await expect(rows.nth(1)).toContainText('Lỗi: Đọc lại Portal không thấy đúng điểm');
  await expect(page.locator('#portal-last-sync')).toContainText(teacher.email);

  // Thử lại chỉ dòng lỗi.
  await press(page, '#portal-retry-btn');
  await expect(page.locator('#portal-sync-confirm-text')).toContainText('1 học viên');
  await page.locator('#portal-sync-confirm-btn').click();
  await expect(page.locator('#portal-sync-message')).toContainText('Đã đồng bộ 1');
  assert.deepEqual(api.syncBodies[1], { fingerprint: FP, studentRefs: [ref(2)], confirm: true });
  await expect(rows.nth(1)).toContainText('Đã đồng bộ');

  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#portal-unlink-btn').click();
  await expect(page.locator('#portal-unlink-btn')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#portal-unlink-btn').click();
  await expect(page.locator('#portal-link-btn')).toBeVisible();
  await expect(page.locator('#portal-preview')).toBeHidden();
  assert.deepEqual(errors, []);
});

test('cảnh báo đổi thang điểm hiện gần bản xem trước', async t => {
  const { page } = await open(t, 'write', a => { a.scaleWarning = { linkedMaxScore: 10, currentMaxScore: 100 }; a.linked = true; });
  await expect(page.locator('#portal-scale-warning')).toContainText('thang cũ');
});

test('select-all phản ánh lựa chọn từng dòng', async t => {
  const { page } = await open(t, 'write');
  await page.locator('#portal-test-select').selectOption('7');
  await page.locator('#portal-link-btn').click();
  const all = page.locator('#portal-select-all');
  await expect(all).toBeChecked();
  await page.locator('.portal-pick').nth(1).uncheck();
  await expect(all).not.toBeChecked();
  assert.equal(await all.evaluate(el => el.indeterminate), true);
  await page.locator('.portal-pick').nth(0).uncheck();
  assert.equal(await all.evaluate(el => el.indeterminate), false);
});

test('POST đồng bộ báo vân tay cũ: tải lại bản xem trước, nút không bị kẹt', async t => {
  const { page, api } = await open(t, 'write');
  await page.locator('#portal-test-select').selectOption('7');
  await page.locator('#portal-link-btn').click();
  await expect(page.locator('#portal-preview-rows tr')).toHaveCount(5);
  api.syncStale = true;
  const before = api.previewCalls;
  await press(page, '#portal-sync-btn');
  await page.locator('#portal-sync-confirm-btn').click();
  await expect(page.locator('#portal-sync-message')).toContainText('Hãy xem trước lại');
  assert.ok(api.previewCalls > before);
  await expect(page.locator('#portal-sync-btn')).toBeEnabled();
});

test('portal-tests lỗi tạm thời: có nút tải lại và phục hồi được', async t => {
  const { page, api } = await open(t, 'write', a => { a.testsFail = true; });
  await expect(page.locator('#portal-reload-btn')).toBeVisible();
  api.testsFail = false;
  await page.locator('#portal-reload-btn').click();
  await expect(page.locator('#portal-reload-btn')).toBeHidden();
  await expect(page.locator('#portal-link-btn')).toBeVisible();
});

test('đang đồng bộ: nút bị khóa, bấm đôi chỉ gửi một POST', async t => {
  const { page, api } = await open(t, 'write');
  await page.locator('#portal-test-select').selectOption('7');
  await page.locator('#portal-link-btn').click();
  await expect(page.locator('#portal-preview-rows tr')).toHaveCount(5);
  api.syncDelay = 600;
  await press(page, '#portal-sync-btn');
  await page.locator('#portal-sync-confirm-btn').click();
  await expect(page.locator('#portal-preview-btn')).toBeDisabled();
  await expect(page.locator('#portal-unlink-btn')).toBeDisabled();
  await expect(page.locator('#portal-sync-btn')).toBeDisabled();
  await expect(page.locator('#portal-sync-message')).toContainText('Đã đồng bộ');
  assert.equal(api.syncBodies.length, 1);
  await expect(page.locator('#portal-preview-btn')).toBeEnabled();
});
