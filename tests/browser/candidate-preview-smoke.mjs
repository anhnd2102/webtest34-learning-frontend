// Smoke xem trước đề của giáo viên (chế độ #preview=<token> của shell học viên thật).
//   node tests/browser/candidate-preview-smoke.mjs    (không nằm trong `npm test`; cần Chrome và Playwright cục bộ)
// Kiểm: chỉ đúng một GET đọc đề, không request nào khác tới API; biểu ngữ; đồng hồ đếm lên; nút nộp thành "Thoát xem trước";
// bài nghe nghe lại được; không có bản nháp trong storage; và cấu trúc giao diện giống hệt chế độ học viên cho cùng một đề.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { smokeOrigin, smokeServerArgs } from './helpers/smoke-server.mjs';

process.env.PLAYWRIGHT_MODULE ||= 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18335;
const origin = smokeOrigin(port);
const TEST_TOKEN = '3401-preview-smoke-token';
const PREVIEW_TOKEN = 'eyJtb2RlIjoicHJldmlldyJ9.signature-not-checked-by-fake-api';

function silentWav(seconds) {
  const n = Math.round(8000 * seconds), buf = Buffer.alloc(44 + n, 128);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(8000, 28); buf.writeUInt16LE(1, 32); buf.writeUInt16LE(8, 34);
  buf.write('data', 36); buf.writeUInt32LE(n, 40);
  return buf;
}
const item = (id, position, prompt) => ({ itemVersionId: id, position, interactionType: 'short_text', prompt, points: 1 });
const definition = {
  title: 'Preview Smoke',
  timing: { totalMinutes: 60 },
  blocks: [
    { blockId: 'b1', title: 'Phần Đọc', items: [item('it-1', 1, 'Câu đọc 1?'), item('it-2', 2, 'Câu đọc 2?')] },
    { blockId: 'b2', title: 'Nghe A', audioUrl: `${origin}/audio/short.wav`, items: [item('it-3', 3, 'Câu nghe A1?')] }
  ]
};

function serveWav(route, body) {
  const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || '');
  if (!range) return route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'accept-ranges': 'bytes' }, body });
  const start = Number(range[1]);
  const end = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
  return route.fulfill({ status: 206, contentType: 'audio/wav', headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${body.length}` }, body: body.subarray(start, end + 1) });
}

async function newPage(browser, apiLog) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/audio/short.wav')) return serveWav(route, silentWav(2));
    if (url.pathname.includes('/api/learning/')) {
      const path = url.pathname.replace(/^.*\/api\/learning/, '');
      apiLog.push({ method: request.method(), path, auth: request.headers().authorization || '' });
      if (path === '/preview/definition') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, preview: true, definition }) });
      }
      if (path === '/test-access/resolve') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ assignment: { title: definition.title, class: { name: 'Lớp Smoke' }, definition, roster: [{ studentRef: 's1', name: 'Học Viên' }] } }) });
      }
      if (path === '/attempts/start') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ attempt: { attemptToken: 'preview-smoke-attempt', definitionHash: 'h', draftRevision: 0, status: 'active', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), definition } }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return url.origin === new URL(origin).origin ? route.continue() : route.abort();
  });
  return page;
}

// Tập số lượng phần tử cấu trúc chính: so sánh chế độ xem trước với chế độ học viên.
const structure = page => page.evaluate(() => {
  const selectors = ['.cbt-topbar', '#sectionNavContainer', '.cbt-section-nav-bar', '.exam-layout', '#examSidePanelContainer', '.cbt-main-content',
    '.simulation-section-card', '.strict-audio-dock', '.cbt-question-card, .cbt-short-qa-card', 'input[data-item-id], textarea[data-item-id]', '.cbt-timer', '#demo-submit-top'];
  return Object.fromEntries(selectors.map(selector => [selector, document.querySelectorAll(selector).length]));
});

const waitFor = async (predicate, message, timeout = 9000) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate()) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(await predicate(), message);
};

const child = spawn(process.execPath, smokeServerArgs(port), { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const report = {};

  // 1. Chế độ học viên: lấy cấu trúc làm chuẩn
  let studentStructure;
  {
    const log = [];
    const page = await newPage(browser, log);
    await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#test=${TEST_TOKEN}`);
    await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
    await page.selectOption('#studentSelectInput', 's1');
    await page.click('#startExamBtn');
    await page.waitForSelector('.cbt-exam-shell');
    studentStructure = await structure(page);
    assert.equal(await page.locator('.cbt-preview-banner').count(), 0, 'học viên không thấy biểu ngữ xem trước');
    await page.context().close();
  }

  // 2. Chế độ xem trước
  {
    const log = [];
    const page = await newPage(browser, log);
    await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#preview=${PREVIEW_TOKEN}`);
    await page.waitForSelector('.cbt-intro-card .cbt-preview-banner');
    assert.equal(await page.locator('#classCodeInput').isVisible(), false, 'không hỏi mã lớp');
    assert.equal(await page.locator('#studentSelectInput').isVisible(), false, 'không hỏi học viên');
    await page.waitForFunction(() => document.querySelector('#startExamBtn')?.disabled === false);
    assert.match(await page.locator('.cbt-intro-title').textContent(), /Preview Smoke/);
    await page.click('#startExamBtn');
    await page.waitForSelector('.cbt-exam-shell');

    // Biểu ngữ, nút nộp và đồng hồ
    assert.match(await page.locator('.cbt-topbar .cbt-preview-banner').textContent(), /Bản xem trước, không lưu bài làm/);
    assert.match(await page.locator('#demo-submit-top').textContent(), /Thoát xem trước/);
    const t1 = await page.locator('#examTimerDisplay').textContent();
    await page.waitForTimeout(1300);
    const t2 = await page.locator('#examTimerDisplay').textContent();
    assert.notEqual(t1, t2);
    assert.ok(t2 > t1 && /^00:0\d$/.test(t2), `đồng hồ đếm lên từ 00:00, nhận ${t1} -> ${t2}`);

    // Cấu trúc giao diện giống học viên
    assert.deepEqual(await structure(page), studentStructure, 'xem trước và học viên dùng cùng cấu trúc giao diện');

    // Nhập đáp án: không lưu ở đâu cả
    await page.fill('input[data-item-id="it-1"]', 'abc');
    await page.waitForTimeout(400);

    // Bài nghe: nghe lại được, không lượt
    await page.evaluate(() => document.querySelectorAll('.cbt-nav-pill')[1].click());
    const play = page.locator('.simulation-section-card[data-block-id="b2"] .btn-sim-audio-play');
    await play.click();
    await waitFor(() => page.evaluate(() => document.querySelector('.simulation-section-card[data-block-id="b2"] audio').ended), 'bài nghe phát hết', 8000);
    assert.match(await play.textContent(), /Nghe lại/);
    assert.equal(await play.isDisabled(), false, 'nghe lại được');
    assert.equal(await page.locator('.simulation-section-card[data-block-id="b2"] .audio-listens-left').isVisible(), false, 'không hiện số lượt nghe');
    await play.click();
    await waitFor(() => page.evaluate(() => !document.querySelector('.simulation-section-card[data-block-id="b2"] audio').paused), 'phát lại');

    // Không lưu bản nháp trong trình duyệt
    const keys = await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)));
    assert.deepEqual(keys.filter(key => /draft|izone_learning|izone_timer|attempt/i.test(key)), [], `storage không có bản nháp: ${keys.join(',')}`);

    // Mạng: chỉ đúng một GET đọc đề
    assert.deepEqual(log.map(call => `${call.method} ${call.path}`), ['GET /preview/definition']);
    assert.equal(log[0].auth, `Bearer ${PREVIEW_TOKEN}`);

    // Thoát xem trước: không gửi gì
    await page.locator('#demo-submit-top').click();
    await page.waitForFunction(() => /Đã thoát xem trước/.test(document.body.textContent));
    assert.equal(log.length, 1, 'thoát xem trước không gửi request');
    assert.deepEqual(page.errors, []);
    report.previewRequests = log.length;
    await page.context().close();
  }

  // 3. Token hết hạn: báo rõ, không trang trắng
  {
    const log = [];
    const page = await newPage(browser, log);
    await page.route('**/api/learning/preview/definition', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'INVALID_PREVIEW_TOKEN' }) }));
    await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#preview=${PREVIEW_TOKEN}`);
    await page.waitForSelector('#startExamError:not([hidden])');
    assert.match(await page.locator('#startExamError').textContent(), /hết hạn/);
    assert.equal(await page.locator('#startExamBtn').isDisabled(), true);
    await page.context().close();
  }

  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  if (browser) await browser.close();
  child.kill();
}
