import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Bấm thật trên Chrome với API giả: bộ lọc/phân trang, thêm học viên, cấp quyền làm lại,
// đăng xuất rồi đăng nhập, điều hướng hash. Mỗi thao tác ghi phải gửi đúng một request.
const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18325);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const room = { status: 'running', readyCount: 1, totalCount: 1, students: [{ studentRef: 's1', name: 'Synthetic student', status: 'in_progress', progress: { answered: 1, total: 2 }, connectionStatus: 'connected' }] };
const student = { studentRef: 's1', name: 'Synthetic student', status: 'complete', skills: {}, attempts: [] };
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  page.setDefaultTimeout(10000);
  const errors = [];
  const calls = [];
  const results = [];
  const dialogs = [];
  let rosterMode = 'error';
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.accept(); });
  await page.addInitScript(() => {
    sessionStorage.setItem('izone_teacher_token', 'synthetic-actions-token');
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, options = {}) => {
      if (!new URL(String(input), location.href).pathname.endsWith('/exam/events')) return nativeFetch(input, options);
      const body = new ReadableStream({ start() {} });
      return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.startsWith('/api/teacher/')) {
      const method = request.method();
      let status = 200;
      let payload = {};
      if (method !== 'GET') calls.push({ method, path, auth: request.headers().authorization || '', body: request.postData() ? JSON.parse(request.postData()) : null });
      if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
      else if (path.endsWith('/auth/logout')) payload = { ok: true };
      else if (path.endsWith('/auth/login')) payload = { token: 'synthetic-login-token', teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
      else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Synthetic class', courseCode: '34', status: 'on_going' }] };
      else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Synthetic assignment', courseCode: '34', examMode: true, status: 'published' }] };
      else if (path.endsWith('/results')) {
        results.push(url.searchParams.toString());
        payload = { assignment: { assignmentId: 'assign-1', title: 'Synthetic assignment' }, skills: [], students: [student], pagination: { page: Number(url.searchParams.get('page') || 1), totalPages: 2, totalItems: 30, pageSize: 25 } };
      }
      else if (path.endsWith('/eligible-students')) payload = { ok: true, students: [{ studentRef: 'sv-9', name: 'Eligible student', discriminator: 'k9' }] };
      else if (path.endsWith('/roster')) {
        if (rosterMode === 'error') { status = 400; payload = { message: 'Synthetic duplicate student' }; } else payload = { ok: true };
      }
      else if (path.endsWith('/retake')) payload = { ok: true };
      else if (path.endsWith('/exam/room')) payload = { room };
      else if (path.endsWith('/portal-tests')) payload = { tests: [] };
      else { errors.push(`Unexpected API fixture path ${method} ${path}`); status = 404; }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
    return route.continue();
  });
  const settle = () => page.waitForTimeout(400);
  await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#grading`);
  await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');

  // Bộ lọc và phân trang
  const before = results.length;
  await page.locator('#search-input').fill('abc');
  await page.waitForFunction(n => window.__n = n, before).catch(() => {});
  await settle();
  assert.ok(results.slice(before).some(query => new URLSearchParams(query).get('q') === 'abc'), 'tìm kiếm gửi q=abc');
  await page.locator('#next-page-btn').click({ force: true });
  await settle();
  assert.ok(results.some(query => new URLSearchParams(query).get('page') === '2'), 'trang sau gửi page=2');
  assert.match(page.url(), /page=2/);

  // Thêm học viên: lỗi 400 giữ modal và hiện lỗi, sau đó thành công đóng modal; mỗi lần đúng một POST
  await page.locator('#add-student-btn').click();
  await page.locator('#add-student-modal').waitFor({ state: 'visible' });
  await page.locator('#eligible-student-select').selectOption('sv-9');
  assert.equal(await page.locator('#add-student-name-input').inputValue(), 'Eligible student');
  await page.locator('#add-student-form button[type="submit"]').click();
  await page.waitForFunction(() => !document.querySelector('#add-student-error').hidden);
  assert.equal(await page.locator('#add-student-error').textContent(), 'Synthetic duplicate student');
  assert.equal(calls.filter(call => call.path.endsWith('/roster')).length, 1);
  rosterMode = 'ok';
  await page.locator('#add-student-form button[type="submit"]').click();
  await page.locator('#add-student-modal').waitFor({ state: 'hidden' });
  const rosterCalls = calls.filter(call => call.path.endsWith('/roster'));
  assert.equal(rosterCalls.length, 2);
  assert.deepEqual(rosterCalls[1].body, { studentRef: 'sv-9', name: 'Eligible student', discriminator: 'k9' });
  assert.equal(rosterCalls[1].auth, 'Bearer synthetic-actions-token', 'request dùng chung gắn auth');

  // Điều hướng hash bằng nút điều hướng
  await page.locator('.navbar-menu .nav-item[href="#dashboard"]').click();
  await page.waitForFunction(() => location.hash === '#dashboard' && !document.querySelector('#view-dashboard').hidden);
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#grading' && !document.querySelector('#view-grading').hidden);
  await page.locator('.navbar-menu .nav-item[href="#dashboard"]').click();
  await page.waitForFunction(() => !document.querySelector('#view-dashboard').hidden);

  // Cấp quyền làm lại từ phòng thi
  await page.locator('#exam-room-open').click();
  await page.locator('.btn-retake').first().waitFor();
  await page.locator('.btn-retake').first().click();
  await page.locator('#grant-retake-modal').waitFor({ state: 'visible' });
  await page.locator('#retake-reason-input').fill('Synthetic network incident');
  await page.locator('#retake-expires-at-input').fill('2030-01-01T10:00');
  await page.locator('#grant-retake-form button[type="submit"]').click();
  await page.locator('#grant-retake-modal').waitFor({ state: 'hidden' });
  const retakeCalls = calls.filter(call => call.path.endsWith('/retake'));
  assert.equal(retakeCalls.length, 1, 'cấp quyền làm lại chỉ gửi một request');
  assert.equal(retakeCalls[0].body.reason, 'Synthetic network incident');
  assert.equal(retakeCalls[0].auth, 'Bearer synthetic-actions-token');
  assert.ok(dialogs.includes('Cấp quyền làm lại thành công!'));
  assert.ok(await page.locator('#grant-retake-error').isHidden(), 'không có lỗi (ví dụ authHeader chưa khai báo)');

  // Đăng xuất rồi đăng nhập lại
  await page.locator('#logout-btn').click();
  await page.waitForFunction(() => document.body.classList.contains('login-page') && !document.querySelector('#login-form').hidden);
  assert.equal(calls.filter(call => call.path.endsWith('/auth/logout')).length, 1);
  assert.equal(await page.evaluate(() => sessionStorage.getItem('izone_teacher_token')), null);
  await page.locator('#login-email').fill('teacher@example.test');
  await page.locator('#login-phone').fill('0900000000');
  await page.locator('#login-btn').click();
  await page.waitForFunction(() => sessionStorage.getItem('izone_teacher_token') === 'synthetic-login-token');
  const loginCalls = calls.filter(call => call.path.endsWith('/auth/login'));
  assert.equal(loginCalls.length, 1);
  assert.deepEqual(loginCalls[0].body, { email: 'teacher@example.test', phone: '0900000000' });
  await page.waitForFunction(() => document.querySelectorAll('#class-select option').length > 1);

  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', writes: calls.map(call => `${call.method} ${call.path.split('/').slice(-1)[0]}`), errors: 0 }) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill();
}
