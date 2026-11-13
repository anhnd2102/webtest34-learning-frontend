// Smoke Exam Mode và Tự giám sát của shell học viên thật (term-tests/webtest-34-demo/content-preview.mjs + exam-guard.js)
// với Learning API giả và luồng SSE do test điều khiển. Lưới an toàn cho bước 7 (gỡ đường prototype nội tuyến, tách mã).
//   node tests/browser/candidate-exam-mode-smoke.mjs     (không nằm trong `npm test`; cần Chrome và Playwright cục bộ)
// Kiểm: phòng chờ (chưa lộ đề, heartbeat, nút sẵn sàng và lỗi), vào đề khi nhận exam.started qua SSE, Exam Guard (mở/đóng
// sự cố, gộp sự cố gần nhau, thoát toàn màn hình, mở lại sự cố khi lần mở bị lỗi mạng, tải lại trang không tính là rời bài),
// gia hạn giờ, thiết bị bị thay, mất kết nối SSE rồi kết nối lại, và chế độ Tự giám sát tự nộp khi vượt giới hạn.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.PLAYWRIGHT_MODULE ||= 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18332;
const origin = `http://127.0.0.1:${port}`;
const TOKEN = '3401-exam-smoke-token';

const examDefinition = {
  title: 'Exam Smoke',
  timing: { totalMinutes: 60 },
  blocks: [{ blockId: 'b1', title: 'Phần A', items: [
    { itemVersionId: 'it-1', position: 1, interactionType: 'single_choice', prompt: 'Câu 1?', points: 1, options: [{ id: 'a', text: 'Đáp án A' }, { id: 'b', text: 'Đáp án B' }] },
    { itemVersionId: 'it-2', position: 2, interactionType: 'short_text', prompt: 'Câu 2?', points: 1 }
  ] }]
};

function createApi(options = {}) {
  const api = {
    calls: [],
    failNext: {},
    exam: options.exam || null,
    incidentResponses: [],     // phản hồi lần lượt cho incidents/open (ví dụ có selfProctoring)
    count(path) { return this.calls.filter(call => call.path === path).length; },
    all(path) { return this.calls.filter(call => call.path === path); },
    last(path) { return [...this.calls].reverse().find(call => call.path === path); }
  };
  api.handler = route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/learning/, '');
    let body = {};
    try { body = request.postDataJSON() || {}; } catch { body = {}; }
    api.calls.push({ path, body });
    const failure = api.failNext[path];
    if (failure) {
      delete api.failNext[path];
      if (failure === 'abort') return route.abort('failed');
      return route.fulfill({ status: failure.status, contentType: 'application/json', body: JSON.stringify({ error: failure.error, message: failure.message || failure.error }) });
    }
    let payload = {};
    if (path === '/test-access/resolve') {
      payload = { assignment: { title: examDefinition.title, class: { name: 'Lớp Exam' }, definition: examDefinition, roster: [{ studentRef: 's1', name: 'Học Viên Exam' }] } };
    } else if (path === '/attempts/start') {
      payload = { attempt: {
        attemptToken: 'exam-attempt', definitionHash: 'h', draftRevision: 0, status: 'active',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        // Phòng chờ chưa có đề; Tự giám sát chạy trên bài thường nên có đề ngay.
        ...(api.exam ? { exam: api.exam, ...(api.exam.status === 'running' ? { definition: examDefinition } : {}) } : { definition: examDefinition }),
        ...(options.selfProctoring ? { selfProctoring: options.selfProctoring } : {})
      } };
    } else if (path === '/attempts/exam/incidents/open') {
      payload = api.incidentResponses.shift() || {};
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  };
  return api;
}

// Giả lập toàn màn hình (headless không ổn định) và luồng SSE do test điều khiển.
const installBrowserStubs = () => {
  let fullscreenElement = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreenElement });
  window.__fullscreen = { requests: 0, fail: false };
  Element.prototype.requestFullscreen = function requestFullscreen() {
    window.__fullscreen.requests++;
    if (window.__fullscreen.fail) return Promise.reject(new Error('denied'));
    fullscreenElement = this;
    setTimeout(() => document.dispatchEvent(new Event('fullscreenchange')), 0);
    return Promise.resolve();
  };
  document.exitFullscreen = () => { fullscreenElement = null; document.dispatchEvent(new Event('fullscreenchange')); return Promise.resolve(); };
  window.__streams = [];
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, options = {}) => {
    const url = new URL(String(input), location.href);
    if (!url.pathname.endsWith('/attempts/events')) return nativeFetch(input, options);
    const entry = { search: url.search, authorization: (options.headers || {}).Authorization || '', signal: options.signal, closed: false };
    const body = new ReadableStream({ start(controller) { entry.controller = controller; }, cancel() { entry.closed = true; } });
    window.__streams.push(entry);
    return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
  };
};

async function openPage(browser, api, { clock = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.errors = [];
  page.dialogs = [];
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('dialog', dialog => { page.dialogs.push(dialog.message()); dialog.accept(); });
  await page.addInitScript(installBrowserStubs);
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

async function start(page) {
  await page.selectOption('#studentSelectInput', 's1');
  await page.click('#startExamBtn');
}

const waitFor = async (predicate, message, timeout = 9000) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate()) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(await predicate(), message);
};
const sse = (page, index, event, data) => page.evaluate(({ index, event, data }) => {
  window.__streams[index].controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
}, { index, event, data });
const guardVisible = page => page.evaluate(() => { const el = document.querySelector('#examGuardOverlay'); return Boolean(el) && !el.hidden; });
const blur = page => page.evaluate(() => window.dispatchEvent(new Event('blur')));

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

  // 1. Phòng chờ: chưa lộ đề, mở luồng SSE có Bearer, heartbeat; nút sẵn sàng; lỗi sẵn sàng; exam.started vào đề
  {
    const api = createApi({ exam: { enabled: true, status: 'waiting' } });
    const page = await openPage(browser, api);
    await start(page);
    await page.locator('#examReadyBtn').waitFor();
    assert.match(await page.locator('main h1').textContent(), /Xin chào Học Viên Exam/);
    assert.equal(await page.locator('.cbt-exam-shell').count(), 0, 'phòng chờ chưa lộ đề');
    assert.equal(await page.locator('input[data-item-id]').count(), 0);
    await waitFor(() => page.evaluate(() => window.__streams.length >= 1), 'mở luồng SSE');
    const stream = await page.evaluate(() => ({ authorization: window.__streams[0].authorization, search: window.__streams[0].search }));
    assert.equal(stream.authorization, 'Bearer exam-attempt', 'SSE dùng attemptToken làm Bearer');
    assert.match(stream.search, /deviceId=/);
    assert.equal(api.count('/attempts/exam/heartbeat'), 1, 'heartbeat gửi ngay khi vào phòng chờ');
    assert.equal(api.last('/attempts/exam/heartbeat').body.attemptToken, 'exam-attempt');
    assert.ok(api.last('/attempts/exam/heartbeat').body.deviceId, 'mọi lời gọi /attempts/* mang deviceId');

    api.failNext['/attempts/exam/ready'] = { status: 500, error: 'down', message: 'Lỗi máy chủ' };
    await page.click('#examReadyBtn');
    await waitFor(async () => !(await page.locator('#examWaitingError').isHidden()), 'lỗi sẵn sàng được báo');
    assert.match(await page.locator('#examWaitingError').textContent(), /Không thể lưu trạng thái sẵn sàng/);
    assert.equal(await page.locator('#examReadyBtn').isEnabled(), true, 'nút sẵn sàng bật lại để thử lại');
    await page.click('#examReadyBtn');
    await waitFor(() => api.count('/attempts/exam/ready') === 2, 'thử lại sẵn sàng');
    assert.equal(api.last('/attempts/exam/ready').body.fullscreenUnsupported, false);
    await waitFor(async () => /Đã sẵn sàng/.test(await page.locator('#examFullscreenStatus').textContent()), 'hiện trạng thái sẵn sàng');
    assert.equal(await page.locator('#examReadyBtn').isHidden(), true);
    assert.ok(await page.evaluate(() => window.__fullscreen.requests >= 1), 'xin toàn màn hình trong cú bấm');

    // giáo viên bắt đầu: exam.started mang đề và hạn chót
    await sse(page, 0, 'exam.started', { status: 'running', deadlineAt: new Date(Date.now() + 3_600_000).toISOString(), definition: examDefinition });
    await page.waitForSelector('.cbt-exam-shell');
    assert.ok(await page.locator('input[data-item-id="it-2"]').count() >= 1, 'đề hiện sau exam.started');
    assert.equal(await guardVisible(page), false, 'Exam Guard đã gắn nhưng chưa có cảnh báo');
    assert.deepEqual(page.errors, []);

    // 2. Exam Guard khi đang thi
    await blur(page);
    await waitFor(() => guardVisible(page), 'rời cửa sổ thì hiện cảnh báo');
    await waitFor(() => api.count('/attempts/exam/incidents/open') === 1, 'mở sự cố');
    const open = api.last('/attempts/exam/incidents/open').body;
    assert.equal(open.type, 'left_exam');
    assert.ok(open.incidentId);
    assert.equal(await page.evaluate(() => document.querySelector('.content-demo').classList.contains('exam-guard-blurred')), true, 'đề bị làm mờ');
    await blur(page);
    await page.waitForTimeout(300);
    assert.equal(api.count('/attempts/exam/incidents/open'), 1, 'hai lần rời trong 2 giây gộp thành một sự cố');
    await page.click('#examGuardReturn');
    await waitFor(() => api.count('/attempts/exam/incidents/close') === 1, 'đóng sự cố khi quay lại');
    assert.equal(api.last('/attempts/exam/incidents/close').body.incidentId, open.incidentId, 'đóng đúng sự cố đã mở');
    await waitFor(async () => !(await guardVisible(page)), 'cảnh báo biến mất khi quay lại');

    // thoát toàn màn hình cũng là rời bài
    await page.evaluate(() => document.exitFullscreen());
    await waitFor(() => api.count('/attempts/exam/incidents/open') === 2, 'thoát toàn màn hình mở sự cố mới');
    await page.click('#examGuardReturn');
    await waitFor(() => api.count('/attempts/exam/incidents/close') === 2, 'đóng sự cố toàn màn hình');

    // lần mở sự cố bị lỗi mạng: khi đóng, mở lại trước rồi mới đóng
    await page.waitForTimeout(2100);
    api.failNext['/attempts/exam/incidents/open'] = 'abort';
    await blur(page);
    await waitFor(() => api.count('/attempts/exam/incidents/open') === 3, 'lần mở thứ ba (bị lỗi mạng)');
    await page.click('#examGuardReturn');
    await waitFor(() => api.count('/attempts/exam/incidents/close') === 3, 'vẫn đóng được sự cố');
    const reopened = api.all('/attempts/exam/incidents/open');
    assert.equal(reopened.length, 4, 'mở lại sự cố (idempotent) trước khi đóng');
    assert.equal(reopened[2].body.incidentId, reopened[3].body.incidentId, 'mở lại đúng sự cố cũ');
    await page.waitForTimeout(2100);

    // tải lại hoặc đóng tab (pagehide) không tính là rời bài
    const opensBefore = api.count('/attempts/exam/incidents/open');
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); window.dispatchEvent(new Event('blur')); });
    await page.waitForTimeout(300);
    assert.equal(api.count('/attempts/exam/incidents/open'), opensBefore, 'sau pagehide, blur không mở sự cố');
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));

    // 3. Gia hạn giờ qua SSE
    const timerBefore = await page.locator('#examTimerDisplay').textContent();
    await sse(page, 0, 'exam.extended', { deadlineAt: new Date(Date.now() + 2 * 3_600_000).toISOString() });
    await waitFor(async () => (await page.locator('#examTimerDisplay').textContent()) !== timerBefore, 'gia hạn làm đồng hồ đổi', 4000);
    const [minBefore] = timerBefore.split(':').map(Number);
    const [minAfter] = (await page.locator('#examTimerDisplay').textContent()).split(':').map(Number);
    assert.ok(minAfter > minBefore || minBefore >= 59, `đồng hồ tăng sau gia hạn: ${timerBefore}`);

    // 4. Mất kết nối SSE: tự kết nối lại sau khoảng 1 giây
    const streamsBefore = await page.evaluate(() => window.__streams.length);
    await page.evaluate(() => window.__streams[0].controller.close());
    await waitFor(() => page.evaluate(count => window.__streams.length > count, streamsBefore), 'SSE kết nối lại sau khi đứt', 6000);

    // 5. Thiết bị bị thay: khóa đề, báo, dừng kết nối
    const lastStream = (await page.evaluate(() => window.__streams.length)) - 1;
    await sse(page, lastStream, 'device.superseded', {});
    await waitFor(async () => /đang được mở ở máy khác/.test(await page.locator('#examGuardMessage').textContent()), 'báo thiết bị bị thay');
    assert.equal(await page.evaluate(() => document.querySelector('.content-demo').inert), true, 'đề bị khóa');
    assert.equal(await page.locator('#examGuardReturn').isHidden(), true, 'không cho quay lại bài khi đã bị thay');
    const heartbeats = api.count('/attempts/exam/heartbeat');
    await page.waitForTimeout(500);
    assert.equal(api.count('/attempts/exam/heartbeat'), heartbeats);
    report.incidents = { opens: api.count('/attempts/exam/incidents/open'), closes: api.count('/attempts/exam/incidents/close') };
    await page.context().close();
  }

  // 5b. Phòng chờ: thoát toàn màn hình hiện nút vào lại, không mở sự cố (chưa thi); vào lại thất bại thì báo
  {
    const api = createApi({ exam: { enabled: true, status: 'waiting' } });
    const page = await openPage(browser, api);
    await start(page);
    await page.click('#examReadyBtn');
    await waitFor(async () => /Đã sẵn sàng/.test(await page.locator('#examFullscreenStatus').textContent()), 'sẵn sàng');
    assert.equal(await page.locator('#examFullscreenReenter').isHidden(), true, 'đang toàn màn hình thì ẩn nút vào lại');
    await page.evaluate(() => document.exitFullscreen());
    await waitFor(async () => !(await page.locator('#examFullscreenReenter').isHidden()), 'thoát toàn màn hình thì hiện nút vào lại');
    assert.equal(api.count('/attempts/exam/incidents/open'), 0, 'chưa thi nên không mở sự cố');
    const requests = await page.evaluate(() => window.__fullscreen.requests);
    await page.click('#examFullscreenReenter');
    await waitFor(() => page.evaluate(count => window.__fullscreen.requests > count, requests), 'nút vào lại xin toàn màn hình');
    await waitFor(async () => await page.locator('#examFullscreenReenter').isHidden(), 'vào lại được thì ẩn nút');
    await page.evaluate(() => { window.__fullscreen.fail = true; document.exitFullscreen(); });
    await waitFor(async () => !(await page.locator('#examFullscreenReenter').isHidden()), 'hiện lại nút vào lại');
    await page.click('#examFullscreenReenter');
    await waitFor(async () => /Không thể bật toàn màn hình/.test(await page.locator('#examFullscreenStatus').textContent()), 'vào lại thất bại thì báo');
    await page.context().close();
  }

  // 5c. Đang thi: "Quay lại bài thi" xin toàn màn hình; không bật được thì mở sự cố mới và giữ cảnh báo
  {
    const api = createApi({ exam: { enabled: true, status: 'waiting' } });
    const page = await openPage(browser, api);
    await start(page);
    await page.locator('#examReadyBtn').waitFor();
    await waitFor(() => page.evaluate(() => window.__streams.length >= 1), 'mở luồng SSE');
    await sse(page, 0, 'exam.started', { status: 'running', deadlineAt: new Date(Date.now() + 3_600_000).toISOString(), definition: examDefinition });
    await page.waitForSelector('.cbt-exam-shell');
    await blur(page);
    await waitFor(() => api.count('/attempts/exam/incidents/open') === 1, 'sự cố đầu');
    const firstId = api.last('/attempts/exam/incidents/open').body.incidentId;
    const requestsBefore = await page.evaluate(() => window.__fullscreen.requests);
    await page.evaluate(() => { window.__fullscreen.fail = true; });
    await page.click('#examGuardReturn');
    await waitFor(() => page.evaluate(count => window.__fullscreen.requests > count, requestsBefore), 'quay lại bài thi xin toàn màn hình');
    await waitFor(() => api.count('/attempts/exam/incidents/open') === 2, 'không bật được toàn màn hình thì mở sự cố mới');
    assert.notEqual(api.last('/attempts/exam/incidents/open').body.incidentId, firstId);
    await waitFor(() => api.count('/attempts/exam/incidents/close') === 1, 'sự cố cũ vẫn được đóng');
    assert.equal(api.last('/attempts/exam/incidents/close').body.incidentId, firstId);
    assert.equal(await guardVisible(page), true, 'cảnh báo còn đó vì chưa vào lại được toàn màn hình');
    assert.match(await page.locator('#examGuardMessage').textContent(), /Không thể bật toàn màn hình/);
    // vào lại được thì đóng sự cố và hết cảnh báo
    await page.evaluate(() => { window.__fullscreen.fail = false; });
    await page.click('#examGuardReturn');
    await waitFor(async () => !(await guardVisible(page)), 'vào lại được thì hết cảnh báo');
    await page.context().close();
  }

  // 5d. Tải lại trang giữa chừng: vào lại lượt đang chạy thì thẳng vào đề (không phòng chờ), kết nối SSE và heartbeat lại
  {
    const api = createApi({ exam: { enabled: true, status: 'waiting' } });
    const page = await openPage(browser, api);
    await start(page);
    await page.locator('#examReadyBtn').waitFor();
    await waitFor(() => page.evaluate(() => window.__streams.length >= 1), 'mở luồng SSE');
    await sse(page, 0, 'exam.started', { status: 'running', deadlineAt: new Date(Date.now() + 3_600_000).toISOString(), definition: examDefinition });
    await page.waitForSelector('.cbt-exam-shell');
    api.exam = { enabled: true, status: 'running', deadlineAt: new Date(Date.now() + 3_000_000).toISOString() };
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
    const heartbeatsBefore = api.count('/attempts/exam/heartbeat');
    await start(page);
    await page.waitForSelector('.cbt-exam-shell');
    assert.equal(await page.locator('#examReadyBtn').count(), 0, 'lượt đang chạy không qua phòng chờ');
    await waitFor(() => page.evaluate(() => window.__streams.length >= 1), 'kết nối lại SSE sau khi tải lại');
    await waitFor(() => api.count('/attempts/exam/heartbeat') > heartbeatsBefore, 'heartbeat chạy lại sau khi tải lại');
    await blur(page);
    await waitFor(() => guardVisible(page), 'Exam Guard hoạt động ngay sau khi vào lại');
    await page.context().close();
  }

  // 6. Heartbeat định kỳ (đồng hồ giả) trong phòng chờ
  {
    const api = createApi({ exam: { enabled: true, status: 'waiting' } });
    const page = await openPage(browser, api, { clock: true });
    await start(page);
    await page.locator('#examReadyBtn').waitFor();
    assert.equal(api.count('/attempts/exam/heartbeat'), 1);
    await page.clock.runFor(41_000);
    await waitFor(() => api.count('/attempts/exam/heartbeat') >= 3, 'heartbeat lặp lại mỗi 20 giây');
    await page.context().close();
  }

  // 7. Tự giám sát: banner luật, đếm lần thoát, tự nộp khi vượt giới hạn rồi không gửi sự cố nữa
  {
    const api = createApi({ selfProctoring: { exitLimit: 2, exitCount: 0 } });
    api.incidentResponses = [{ selfProctoring: { exitLimit: 2, exitCount: 1 } }, { selfProctoring: { exitLimit: 2, exitCount: 3, autoSubmitted: true } }];
    const page = await openPage(browser, api);
    await start(page);
    await page.waitForSelector('.cbt-exam-shell');
    assert.match(await page.locator('#selfProctoringBanner').textContent(), /thoát quá 2 lần/);
    await blur(page);
    await waitFor(() => api.count('/attempts/exam/incidents/open') === 1, 'sự cố đầu tiên');
    await waitFor(async () => /1\/2/.test(await page.locator('#selfProctoringBanner').textContent()), 'banner đếm 1/2');
    await page.click('#examGuardReturn');
    await waitFor(() => api.count('/attempts/exam/incidents/close') === 1, 'đóng sự cố đầu');
    await page.waitForTimeout(2100);
    await blur(page);
    await waitFor(() => api.count('/attempts/exam/incidents/open') === 2, 'sự cố thứ hai');
    await waitFor(async () => (await page.locator('#demo-result').textContent()).includes('tự động nộp'), 'vượt giới hạn thì hiện thông báo tự nộp');
    const opens = api.count('/attempts/exam/incidents/open');
    await page.waitForTimeout(2100);
    await blur(page);
    await page.waitForTimeout(300);
    assert.equal(api.count('/attempts/exam/incidents/open'), opens, 'sau tự nộp không gửi sự cố nữa');
    assert.equal(api.count('/attempts/submit'), 0, 'tự nộp do máy chủ thực hiện, trình duyệt không gọi /attempts/submit');
    await page.context().close();
  }

  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  if (browser) await browser.close();
  child.kill();
}
