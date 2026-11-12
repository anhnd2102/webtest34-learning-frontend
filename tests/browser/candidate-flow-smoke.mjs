// Smoke luồng học viên trên shell thi thật (link #test=, term-tests/webtest-34-demo/content-preview.mjs)
// với Learning API giả lập có trạng thái. Lưới an toàn trước khi tách mã của canonical renderer (bước 7):
// kiểm hành vi quan sát được, không đọc mã nguồn.
//   node tests/browser/candidate-flow-smoke.mjs        (không nằm trong `npm test`; cần Chrome và Playwright cục bộ)
// Kiểm: chọn đáp án và lưu nháp lên máy chủ theo revision tăng dần; bản nháp máy chủ khôi phục khi vào lại lượt;
// lỗi lưu nháp (500 và mất mạng) được báo rồi hồi phục; nộp đúng một lần dù bấm xác nhận nhiều lần, khóa bài và
// không lưu nháp sau nộp; lỗi mạng khi nộp thì báo và nộp lại được; hết giờ tự nộp đúng một lần.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.PLAYWRIGHT_MODULE ||= 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18331;
const origin = `http://127.0.0.1:${port}`;
const TOKEN = '3401-flow-smoke-token';

// Đề rút gọn: 2 phần, đủ câu chọn, câu điền ngắn và câu viết.
const flowDefinition = {
  title: 'Flow Smoke',
  timing: { totalMinutes: 60 },
  blocks: [
    { blockId: 'b1', title: 'Phần A', items: [
      { itemVersionId: 'it-1', position: 1, interactionType: 'single_choice', prompt: 'Câu 1?', points: 1, options: [{ id: 'a', text: 'Đáp án A' }, { id: 'b', text: 'Đáp án B' }] },
      { itemVersionId: 'it-2', position: 2, interactionType: 'short_text', prompt: 'Câu 2?', points: 1 }
    ] },
    { blockId: 'b2', title: 'Phần B', items: [
      { itemVersionId: 'it-3', position: 3, interactionType: 'long_text', prompt: 'Viết đoạn văn ngắn.', points: 5 }
    ] }
  ]
};

// API giả có trạng thái: ghi lại mọi lời gọi, lưu bản nháp như máy chủ thật, cho phép bật lỗi một lần theo đường dẫn.
function createApi(options = {}) {
  const api = {
    calls: [],
    failNext: {},           // { '/attempts/draft': { status, error } | 'abort' }
    draftStore: { ...(options.serverDraft || {}) },
    expiresInMs: options.expiresInMs ?? 3_600_000,
    count(path) { return this.calls.filter(call => call.path === path).length; },
    last(path) { return [...this.calls].reverse().find(call => call.path === path); },
    all(path) { return this.calls.filter(call => call.path === path); }
  };
  api.handler = route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/learning/, '');
    let body = {};
    try { body = request.postDataJSON() || {}; } catch { body = {}; }
    api.calls.push({ path, method: request.method(), body });
    const failure = api.failNext[path];
    if (failure) {
      delete api.failNext[path];
      if (failure === 'abort') return route.abort('failed');
      return route.fulfill({ status: failure.status, contentType: 'application/json', body: JSON.stringify({ error: failure.error, message: failure.message || failure.error }) });
    }
    let payload = {};
    if (path === '/test-access/resolve') {
      payload = { assignment: { title: flowDefinition.title, class: { name: 'Lớp Flow' }, definition: flowDefinition, roster: [{ studentRef: 's1', name: 'Học Viên Flow' }] } };
    } else if (path === '/attempts/start') {
      const hasDraft = Object.keys(api.draftStore).length > 0;
      payload = { attempt: {
        attemptToken: 'flow-attempt', definitionHash: 'h', draftRevision: hasDraft ? 5 : 0, status: 'active',
        expiresAt: new Date(Date.now() + api.expiresInMs).toISOString(), definition: flowDefinition,
        ...(hasDraft ? { draft: api.draftStore } : {})
      } };
    } else if (path === '/attempts/draft') {
      Object.assign(api.draftStore, body.responses || {});
    } else if (path === '/attempts/submit') {
      payload = { receipt: { gradingStatus: 'pending' } };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  };
  return api;
}

async function openPage(browser, api, { clock = false, context: existingContext } = {}) {
  const context = existingContext || await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.errors = [];
  page.dialogs = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('dialog', dialog => { page.dialogs.push(dialog.message()); dialog.accept(); });
  if (clock) await page.clock.install({ time: new Date() });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/learning/')) return api.handler(route);
    return url.origin === origin ? route.continue() : route.abort();
  });
  await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#test=${TOKEN}`);
  await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
  return page;
}

async function startExam(page) {
  await page.selectOption('#studentSelectInput', 's1');
  await page.click('#startExamBtn');
  await page.waitForSelector('.cbt-exam-shell');
}

const clickDom = (page, selector) => page.evaluate(s => document.querySelector(s).click(), selector);
const waitFor = async (predicate, message, timeout = 9000) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate()) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(await predicate(), message);
};
const text = (page, selector) => page.locator(selector).first().textContent().then(value => value || '').catch(() => '');
const goToSection = (page, index) => page.evaluate(i => document.querySelectorAll('.cbt-nav-pill')[i].click(), index);
const submitAll = async page => {
  await clickDom(page, '#demo-submit-top');
  await page.locator('#demo-confirm-submit').waitFor({ state: 'visible' });
  await clickDom(page, '#demo-confirm-submit');
};

const child = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = {};

  // 1. Token lấy từ fragment; chọn đáp án và nhập chữ lưu nháp lên máy chủ theo revision tăng dần
  {
    const api = createApi();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
    const page = await openPage(browser, api, { context });
    await startExam(page);
    assert.equal(api.last('/test-access/resolve').body.testToken, TOKEN, 'token lấy từ URL fragment');
    assert.equal(api.last('/attempts/start').body.studentRef, 's1');
    assert.equal(api.last('/attempts/start').body.identityConfirmed, true);
    assert.equal(api.last('/attempts/start').method, 'POST');
    await page.locator('input[type="radio"][data-item-id="it-1"]').first().check({ force: true });
    await page.locator('input[data-item-id="it-2"]').fill('Synthetic answer');
    await waitFor(() => api.count('/attempts/draft') >= 1 && JSON.stringify(api.last('/attempts/draft').body.responses).includes('Synthetic answer'), 'bản nháp có đáp án đã nhập được lưu lên máy chủ');
    await waitFor(async () => (await text(page, '#demo-save')) === 'Đã lưu máy chủ', 'trạng thái lưu hiện "Đã lưu máy chủ"');
    assert.equal(api.last('/attempts/draft').method, 'PATCH');
    assert.equal(api.last('/attempts/draft').body.attemptToken, 'flow-attempt');
    await goToSection(page, 1);
    await page.locator('textarea[data-item-id="it-3"]').fill('Essay text');
    await waitFor(() => JSON.stringify(api.last('/attempts/draft').body.responses).includes('Essay text'), 'câu viết cũng được lưu');
    const revisions = api.all('/attempts/draft').map(call => call.body.revision);
    assert.ok(revisions.every((revision, index) => index === 0 || revision > revisions[index - 1]), `revision tăng dần: ${revisions}`);
    report.draftRevisions = revisions;
    assert.deepEqual(page.errors, []);

    // 2. Mở lại trang rồi vào lại lượt: bản nháp từ máy chủ được khôi phục (trình duyệt không giữ đáp án)
    await page.close();
    const again = await openPage(browser, api, { context });
    await startExam(again);
    assert.equal(await again.locator('input[data-item-id="it-2"]').inputValue(), 'Synthetic answer', 'đáp án điền khôi phục từ máy chủ');
    assert.equal(await again.locator('input[type="radio"][data-item-id="it-1"]').first().isChecked(), true, 'đáp án chọn khôi phục từ máy chủ');
    await goToSection(again, 1);
    assert.equal(await again.locator('textarea[data-item-id="it-3"]').inputValue(), 'Essay text');
    assert.deepEqual(again.errors, []);
    await context.close();
  }

  // 3. Lỗi lưu nháp: 500 và mất mạng đều được báo; lần gõ sau lưu được bản mới nhất
  {
    const api = createApi();
    const page = await openPage(browser, api);
    await startExam(page);
    api.failNext['/attempts/draft'] = { status: 500, error: 'down' };
    await page.locator('input[data-item-id="it-2"]').fill('first');
    await waitFor(async () => (await text(page, '#demo-save')) === 'Lưu máy chủ thất bại', 'lỗi lưu nháp được báo');
    assert.match(await text(page, '#demo-save-alert'), /Chưa lưu được/);
    await page.locator('input[data-item-id="it-2"]').fill('second');
    await waitFor(async () => (await text(page, '#demo-save')) === 'Đã lưu máy chủ' && JSON.stringify(api.last('/attempts/draft').body.responses).includes('second'), 'lần gõ sau lưu được');
    assert.equal(await text(page, '#demo-save-alert'), '', 'thông báo lỗi được xóa sau khi lưu lại được');
    api.failNext['/attempts/draft'] = 'abort';
    await page.locator('input[data-item-id="it-2"]').fill('third');
    await waitFor(async () => (await text(page, '#demo-save')) === 'Lưu máy chủ thất bại', 'mất mạng khi lưu nháp được báo');
    await page.locator('input[data-item-id="it-2"]').fill('fourth');
    await waitFor(async () => (await text(page, '#demo-save')) === 'Đã lưu máy chủ' && JSON.stringify(api.last('/attempts/draft').body.responses).includes('fourth'), 'sau mất mạng, lưu lại bản mới nhất');
    assert.equal(api.count('/attempts/submit'), 0, 'lỗi lưu nháp không tự nộp bài');
    await page.context().close();
  }

  // 4. Nộp bài: bấm xác nhận nhiều lần chỉ gửi một request; khóa bài; không lưu nháp sau nộp
  {
    const api = createApi();
    const page = await openPage(browser, api);
    await startExam(page);
    await page.locator('input[type="radio"][data-item-id="it-1"]').first().check({ force: true });
    await page.locator('input[data-item-id="it-2"]').fill('final');
    await clickDom(page, '#demo-submit-top');
    await page.locator('#demo-confirm-submit').waitFor({ state: 'visible' });
    await page.evaluate(() => { const b = document.querySelector('#demo-confirm-submit'); b.click(); b.click(); b.click(); });
    await waitFor(() => api.count('/attempts/submit') >= 1, 'nộp bài gọi API');
    await waitFor(async () => (await text(page, '#demo-result')).includes('Nộp bài thành công'), 'hiện thông báo nộp thành công');
    assert.equal(api.count('/attempts/submit'), 1, 'bấm xác nhận nhiều lần vẫn chỉ nộp một lần');
    const submit = api.last('/attempts/submit').body;
    assert.equal(submit.attemptToken, 'flow-attempt');
    assert.ok(submit.submissionId, 'có submissionId');
    assert.match(JSON.stringify(submit.responses), /final/);
    assert.equal(await page.locator('input[data-item-id="it-2"]').isDisabled(), true, 'bài làm bị khóa sau khi nộp');
    assert.equal(await text(page, '#demo-submit-top'), 'Đã nộp bài');
    const draftsAtSubmit = api.count('/attempts/draft');
    await page.waitForTimeout(2200);
    assert.equal(api.count('/attempts/draft'), draftsAtSubmit, 'sau khi nộp không lưu nháp nữa');
    await page.context().close();
  }

  // 5. Mất kết nối khi nộp: báo lỗi, không tự nộp lại, học viên nộp lại được
  {
    const api = createApi();
    const page = await openPage(browser, api);
    await startExam(page);
    await page.locator('input[data-item-id="it-2"]').fill('retry me');
    api.failNext['/attempts/submit'] = 'abort';
    await submitAll(page);
    await waitFor(() => page.dialogs.some(message => /Nộp bài không thành công/.test(message)), 'lỗi nộp được báo cho học viên');
    await page.waitForTimeout(500);
    assert.equal(api.count('/attempts/submit'), 1, 'không tự nộp lại');
    assert.equal(await page.locator('#demo-confirm-submit').isEnabled(), true, 'nút xác nhận được bật lại để thử lần nữa');
    await clickDom(page, '#demo-confirm-submit');
    await waitFor(async () => (await text(page, '#demo-result')).includes('Nộp bài thành công'), 'nộp lại thành công');
    assert.equal(api.count('/attempts/submit'), 2);
    const ids = api.all('/attempts/submit').map(call => call.body.submissionId);
    // Khoảng trống đã biết (ghi lại, chưa sửa): mỗi lần bấm sinh submissionId mới nên nộp lại không idempotent nếu phản hồi bị mất.
    report.knownGaps = { submissionIdStableAcrossRetry: ids[0] === ids[1] };
    await page.context().close();
  }

  // 6. Hết giờ: tự nộp đúng một lần và có báo cho học viên
  {
    const api = createApi({ expiresInMs: 4000 });
    const page = await openPage(browser, api, { clock: true });
    await startExam(page);
    await page.locator('input[data-item-id="it-2"]').fill('before deadline');
    assert.equal(api.count('/attempts/submit'), 0);
    await page.clock.runFor(7000);
    await waitFor(() => api.count('/attempts/submit') >= 1, 'hết giờ thì tự nộp');
    await page.clock.runFor(6000);
    await page.waitForTimeout(300);
    assert.equal(api.count('/attempts/submit'), 1, 'hết giờ chỉ tự nộp một lần');
    assert.match(JSON.stringify(api.last('/attempts/submit').body.responses), /before deadline/);
    assert.ok(page.dialogs.some(message => /hết giờ/i.test(message)), 'báo hết giờ cho học viên');
    await page.context().close();
  }

  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  if (browser) await browser.close();
  child.kill();
}
