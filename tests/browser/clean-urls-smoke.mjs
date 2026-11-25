// Smoke địa chỉ ngắn trên đúng artifact Pages (`npm run stage:pages` -> _site): `/` là Teacher Dashboard, `/exam/` là renderer học viên,
// thanh địa chỉ không bị chuyển hướng sang đường dẫn dài, mọi tài nguyên tải được (không 404), link cũ `/term-tests/...` vẫn chạy,
// tham số ngắn `c` chọn khóa, link không kèm mã lớp để ô mã lớp trống. API giả, không chạm production.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18430);
const token = '34060000-0000-4000-8000-000000000002';
execFileSync(process.execPath, ['scripts/stage-pages.mjs'], { cwd: root, stdio: 'ignore' });
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1', '_site'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', reject);
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const origin = `http://127.0.0.1:${port}`;

  async function open(url, { token: sessionToken = '' } = {}) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
    page.setDefaultTimeout(10000);
    const seen = { broken: [], errors: [], resolveBodies: [] };
    page.on('pageerror', error => seen.errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) seen.broken.push(`${response.status()} ${response.url().replace(origin, '')}`); });
    page.on('requestfailed', request => { if (request.url().startsWith(origin)) seen.broken.push(`failed ${request.url().replace(origin, '')}`); });
    if (sessionToken) await page.addInitScript(value => sessionStorage.setItem('izone_teacher_token', value), sessionToken);
    await page.route('**/*', async route => {
      const target = new URL(route.request().url());
      if (target.pathname.startsWith('/api/')) {
        if (target.pathname.endsWith('/test-access/resolve')) {
          seen.resolveBodies.push(JSON.parse(route.request().postData() || '{}'));
          return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'TEST_ASSIGNMENT_NOT_AVAILABLE', message: 'Bài test hoặc mã lớp chưa được cấu hình.' } }) });
        }
        let payload = {};
        if (target.pathname.endsWith('/auth/me')) payload = { teacher: { name: 'Giáo viên', role: 'admin', courseCodes: ['34'] } };
        else if (target.pathname.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Lớp IC2283', courseCode: '34', status: 'on_going' }] };
        else if (target.pathname.endsWith('/assignments')) payload = { assignments: [] };
        else if (target.pathname.endsWith('/portal-tests')) payload = { tests: [] };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (target.hostname !== '127.0.0.1' || Number(target.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`${origin}${url}`);
    return { page, seen };
  }

  // 1) Teacher Dashboard ở gốc: không chuyển hướng, form đăng nhập hiện, logo tải được, không tài nguyên gãy.
  {
    const { page, seen } = await open('/#dashboard');
    await page.locator('#login-form').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    const url = new URL(page.url());
    assert.equal(url.pathname, '/', `dashboard bị chuyển hướng sang ${url.pathname}`);
    assert.equal(url.hash, '#dashboard');
    assert.equal(url.search, '', 'không được thêm ?v= vào địa chỉ');
    assert.equal(await page.title(), 'IZONE · Teacher Dashboard');
    assert.ok(await page.evaluate(() => [...document.images].filter(img => img.getClientRects().length).every(img => img.naturalWidth > 0)), 'ảnh logo không tải được');
    assert.deepEqual(seen.broken, [], 'dashboard ở gốc có tài nguyên gãy');
    assert.deepEqual(seen.errors, []);
    await page.close();
  }

  // 1b) Dashboard sau đăng nhập (phiên có sẵn): vào được giao diện chính ở gốc.
  {
    const { page, seen } = await open('/#dashboard', { token: 'synthetic-clean-url-token' });
    await page.locator('.global-navbar').waitFor({ state: 'visible' });
    await page.locator('#teacher-profile').waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).pathname, '/');
    assert.deepEqual(seen.broken, [], 'dashboard sau đăng nhập có tài nguyên gãy');
    assert.deepEqual(seen.errors, []);
    await page.close();
  }

  // 2) Link học viên có mã lớp ở /exam/: giữ địa chỉ, ô mã lớp điền sẵn, gửi mã lớp lên API, tham số c chọn khóa.
  {
    const { page, seen } = await open(`/exam/?c=34&phase=1&test=2&class=IC2283#test=${token}`);
    await page.locator('#classCodeInput').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.querySelector('#classCodeStatus'), null, { timeout: 8000 });
    await page.waitForTimeout(800);
    const url = new URL(page.url());
    assert.equal(url.pathname, '/exam/', `/exam/ bị chuyển hướng sang ${url.pathname}`);
    assert.equal(url.search, '?c=34&phase=1&test=2&class=IC2283');
    assert.equal(await page.locator('#classCodeInput').inputValue(), 'IC2283');
    assert.ok(seen.resolveBodies.length >= 1, 'phải tự gọi tải danh sách lớp khi link có mã lớp');
    for (const body of seen.resolveBodies) assert.deepEqual(body, { testToken: token, courseCode: 'IC2283' });
    assert.deepEqual(seen.broken.filter(item => !item.includes('/api/')), [], '/exam/ có tài nguyên gãy');
    assert.deepEqual(seen.errors, []);
    await page.close();
  }

  // 3) Link không kèm mã lớp (thi lại, thi tập trung): ô mã lớp trống có gợi ý, không tự gọi API, nhập mã rồi bấm tải thì gửi đúng mã.
  {
    const { page, seen } = await open(`/exam/?c=34&phase=1&test=2#test=${token}`);
    await page.locator('#classCodeInput').waitFor({ state: 'visible' });
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#classCodeInput').inputValue(), '', 'ô mã lớp phải trống khi link không có class');
    assert.equal(await page.locator('#classCodeInput').getAttribute('placeholder'), 'Ví dụ: IC2283');
    assert.equal(seen.resolveBodies.length, 0, 'không được tự gọi API khi chưa có mã lớp');
    await page.locator('#classCodeInput').fill('ic2284');
    await page.locator('#loadRosterBtn').click();
    await page.waitForFunction(() => /Không tải được danh sách/.test(document.querySelector('#classCodeStatus')?.textContent || ''));
    assert.deepEqual(seen.resolveBodies, [{ testToken: token, courseCode: 'IC2284' }], 'mã lớp tự nhập phải được viết hoa và gửi lên');
    assert.deepEqual(seen.errors, []);
    await page.close();
  }

  // 4) Tham số c=03 chọn đúng khóa; tên cũ demoCourse vẫn được nhận.
  for (const query of ['c=03', 'demoCourse=03']) {
    const { page } = await open(`/exam/?${query}&class=IC0301#test=${token}`);
    await page.locator('#classCodeInput').waitFor({ state: 'visible' });
    assert.match(await page.title(), /Khóa 03/, `${query} không chọn khóa 03`);
    await page.close();
  }

  // 5) Link cũ đã phát vẫn chạy: đường dẫn dài ở trong cùng artifact.
  {
    const { page, seen } = await open(`/term-tests/webtest-34-demo/index.html?demoCourse=34&phase=1&test=2&class=IC2283#test=${token}`);
    await page.locator('#classCodeInput').waitFor({ state: 'visible' });
    await page.waitForTimeout(800);
    assert.equal(new URL(page.url()).pathname, '/term-tests/webtest-34-demo/index.html');
    assert.equal(await page.locator('#classCodeInput').inputValue(), 'IC2283');
    assert.deepEqual(seen.broken.filter(item => !item.includes('/api/')), []);
    await page.close();
  }
  {
    const { page } = await open('/term-tests/teacher-dashboard/index.html#dashboard');
    await page.locator('#login-form').waitFor({ state: 'visible' });
    await page.close();
  }

  console.log('clean-urls-smoke ok');
} finally {
  await browser?.close();
  server.kill();
}
