// Chạy với Playwright có sẵn qua NODE_PATH:
//   NODE_PATH=$(npm root -g) node --test tests/exam-switch-dashboard.browser.mjs
// Trình duyệt thật + API giả có trạng thái (không chạm backend/production, không dùng dữ liệu học viên).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { chromium, expect } = createRequire(import.meta.url)('playwright/test');
const root = fileURLToPath(new URL('..', import.meta.url));
const classId = '101';
const assignmentId = '11111111-1111-4111-8111-111111111111';
const deadlineAt = '2026-10-21T04:30:00.000Z';
const teacher = { name: 'Test Teacher', email: 'teacher@example.test', role: 'admin', courseCodes: ['34'] };

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

// API giả có trạng thái: server quyết định cho chuyển hay không bằng serverNow so với deadline.
function fakeApi() {
  const api = {
    serverNow: '2026-10-21T04:29:59.999Z', patches: [], failNextWith: null, assignmentReads: 0,
    assignment: {
      assignmentId, classId, title: 'Test 1', courseCode: '34', phase: 1, opensAt: null, closesAt: null, status: 'published',
      publicToken: null, studentUrl: null, examMode: true, exitLimit: null,
      examSession: { status: 'running', startedAt: '2026-10-21T02:00:00.000Z', deadlineAt }
    }
  };
  api.handle = async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' }, body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return reply(204, {});
    if (path.endsWith('/auth/me')) return reply(200, { teacher });
    if (path.endsWith('/auth/login')) return reply(200, { token: 'synthetic-session', teacher });
    if (path === '/api/teacher/classes') return reply(200, { classes: [{ classId, name: 'IC34-A', courseCode: '34', status: 'on_going', isTeaching: true, assignmentCount: 1 }] });
    if (path === `/api/teacher/classes/${classId}/assignments`) {
      api.assignmentReads += 1;
      return reply(200, { class: { classId, name: 'IC34-A', courseCode: '34' }, serverNow: api.serverNow, assignments: [api.assignment] });
    }
    if (path.endsWith('/results')) {
      return reply(200, { assignment: { assignmentId, classId, className: 'IC34-A', courseCode: '34', title: 'Test 1', formVersionId: 'v', formVersion: 1 }, skills: [], students: [], pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 1 } });
    }
    if (path.endsWith('/exam-mode') && request.method() === 'PATCH') {
      const body = request.postDataJSON();
      api.patches.push(body);
      if (api.failNextWith) { const failure = api.failNextWith; api.failNextWith = null; return reply(failure.status, failure.body); }
      if (Date.parse(api.serverNow) < Date.parse(deadlineAt)) {
        return reply(409, { ok: false, error: 'EXAM_SESSION_STILL_RUNNING', message: 'Phiên thi chưa kết thúc, chưa thể chuyển sang Tự giám sát.', details: { deadlineAt, serverNow: api.serverNow } });
      }
      api.assignment = { ...api.assignment, examMode: false, exitLimit: body.exitLimit, examSession: { ...api.assignment.examSession, status: 'ended' } };
      return reply(200, { ok: true, examMode: false, exitLimit: body.exitLimit, status: 'ended', startedAt: api.assignment.examSession.startedAt, deadlineAt, switched: true, settledCount: 0 });
    }
    return reply(200, {});
  };
  return api;
}

test('giáo viên thấy deadline, bị chặn khi còn thi, chuyển sau hạn, reload vẫn là Tự giám sát và còn xem được phòng thi', async t => {
  const server = await startStaticServer();
  const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true });
  t.after(async () => { await browser.close(); server.stop(); });
  const api = fakeApi();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/teacher/**', route => api.handle(route));
  const open = async () => {
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
  };
  await open();

  const panel = page.locator('#exam-switch-controls');
  await expect(panel).toBeVisible();
  await expect(page.locator('#exam-switch-hint')).toContainText('11:30 21/10/2026');
  await expect(page.locator('#exam-switch-hint')).toContainText('đang diễn ra');
  await expect(page.locator('#exam-switch-limit')).toHaveValue('', 'N không có giá trị mặc định');
  await expect(page.locator('#exam-room-open')).toBeVisible();

  // N bắt buộc: bỏ trống thì không gửi request nào.
  await page.locator('#exam-switch-btn').click();
  await expect(page.locator('#exam-switch-message')).toContainText('Giới hạn thoát');
  assert.equal(api.patches.length, 0);

  // Còn thi: server từ chối, UI nêu rõ deadline và giữ nguyên trạng thái, không báo thành công.
  await page.locator('#exam-switch-limit').fill('2');
  await page.locator('#exam-switch-btn').click();
  await expect(page.locator('#exam-switch-message')).toContainText('Phiên thi chưa kết thúc');
  await expect(page.locator('#exam-switch-message')).toContainText('11:30 21/10/2026');
  await expect(panel).toBeVisible();
  await expect(page.locator('#exam-switch-limit')).toHaveValue('2');
  assert.deepEqual(api.patches, [{ enabled: false, switchTo: 'self-proctoring', exitLimit: 2 }]);
  await expect(page.locator('#exam-mode-toggle')).toBeChecked();

  // Lỗi tạm thời (chưa chốt xong bài cũ) → có thể Thử lại, giá trị N được giữ.
  api.serverNow = '2026-10-21T04:30:00.000Z';
  api.failNextWith = { status: 409, body: { ok: false, error: 'EXAM_SETTLEMENT_PENDING', message: 'x', details: { retryable: true } } };
  await page.locator('#exam-switch-btn').click();
  await expect(page.locator('#exam-switch-message')).toContainText('Chưa có gì bị thay đổi');
  await expect(page.locator('#exam-switch-btn')).toHaveText('Thử lại');
  await expect(page.locator('#exam-switch-limit')).toHaveValue('2');

  // Đúng hạn theo server: chuyển; bấm đúp chỉ gửi một request; UI đọc lại từ server.
  const readsBefore = api.assignmentReads;
  await page.locator('#exam-switch-btn').dblclick();
  await expect(page.locator('#exam-switch-message')).toContainText('Đã chuyển sang Tự giám sát: thoát quá 2 lần');
  await expect(page.locator('#exam-switch-message')).toContainText('quyền làm lại được giữ nguyên');
  assert.equal(api.patches.length, 3, 'lần 3 là lần duy nhất khi bấm đúp');
  assert.ok(api.assignmentReads > readsBefore, 'đọc lại danh sách bài từ server sau khi lưu');
  await expect(panel).toBeHidden();
  await expect(page.locator('#exam-mode-toggle')).not.toBeChecked();
  await expect(page.locator('#self-proctoring-toggle')).toBeChecked();
  await expect(page.locator('#self-proctoring-toggle')).toBeDisabled();
  await expect(page.locator('#self-proctoring-limit')).toHaveValue('2');
  await expect(page.locator('#self-proctoring-limit')).toBeDisabled();
  await expect(page.locator('#self-proctoring-save')).toBeDisabled();
  await expect(page.locator('#exam-room-open'), 'lịch sử phòng thi vẫn mở được').toBeVisible();

  // Reload: trạng thái server vẫn là Tự giám sát N=2.
  await open();
  await expect(panel).toBeHidden();
  await expect(page.locator('#self-proctoring-limit')).toHaveValue('2');
  await expect(page.locator('#exam-room-open')).toBeVisible();
  assert.deepEqual(errors, []);
});
