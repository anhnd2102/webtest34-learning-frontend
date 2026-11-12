// Smoke lối vào và màn "Xem kết quả" của shell học viên thật (term-tests/webtest-34-demo/content-preview.mjs).
//   node tests/browser/candidate-entry-review-smoke.mjs   (không nằm trong `npm test`; cần Chrome và Playwright cục bộ)
// Kiểm: token lấy sạch từ fragment dù link chia sẻ dính ký tự thừa; thông báo quyền làm lại (hết hạn, chưa mở, thời gian thực tế);
// "Xem kết quả" chỉ gọi /attempts/review (không start, không deviceId), các trạng thái chưa nộp/chưa công bố/lỗi có Thử lại/đã công bố,
// hỏi lại kết quả theo nhịp 15 giây khi chưa công bố, nút quay lại.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.PLAYWRIGHT_MODULE ||= 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18333;
const origin = `http://127.0.0.1:${port}`;
const UUID = '34010000-0000-4000-8000-000000000002';

const definition = {
  title: 'Entry Smoke',
  timing: { totalMinutes: 60 },
  blocks: [{ blockId: 'b1', title: 'Phần A', items: [
    { itemVersionId: 'it-1', position: 1, interactionType: 'single_choice', prompt: 'Câu 1?', points: 1, options: [{ id: 'a', text: 'Đáp án A' }, { id: 'b', text: 'Đáp án B' }] }
  ] }]
};

function createApi({ roster } = {}) {
  const api = {
    calls: [],
    failNext: {},
    reviews: [],   // phản hồi lần lượt cho /attempts/review
    results: [],   // phản hồi lần lượt cho /attempts/result (phần tử cuối được lặp lại)
    count(path) { return this.calls.filter(call => call.path === path).length; },
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
      return route.fulfill({ status: failure.status, contentType: 'application/json', body: JSON.stringify({ error: failure.error, message: failure.message || failure.error }) });
    }
    let payload = {};
    if (path === '/test-access/resolve') {
      payload = { assignment: { title: definition.title, class: { name: 'Lớp Entry' }, definition, roster: roster || [{ studentRef: 's1', name: 'Học Viên Entry' }] } };
    } else if (path === '/attempts/review') {
      payload = api.reviews.length > 1 ? api.reviews.shift() : (api.reviews[0] || { status: 'not_submitted' });
    } else if (path === '/attempts/result') {
      payload = api.results.length > 1 ? api.results.shift() : (api.results[0] || {});
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  };
  return api;
}

async function openPage(browser, api, { hash = `#test=${UUID}`, clock = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  if (clock) await page.clock.install({ time: new Date() });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/learning/')) return api.handler(route);
    return url.origin === origin ? route.continue() : route.abort();
  });
  await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34${hash}`);
  return page;
}
const ready = page => page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
const waitFor = async (predicate, message, timeout = 9000) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate()) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(await predicate(), message);
};
const text = (page, selector) => page.locator(selector).first().textContent().then(value => value || '').catch(() => '');

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

  // 1. Token sạch: link dán qua chat hay dính ký tự thừa sau token
  for (const [label, hash] of [['sạch', `#test=${UUID}`], ['dấu \\', `#test=${UUID}\\`], ['%5C', `#test=${UUID}%5C`], ['%20', `#test=${UUID}%20`]]) {
    const api = createApi();
    const page = await openPage(browser, api, { hash });
    await ready(page);
    assert.equal(api.last('/test-access/resolve').body.testToken, UUID, `token ${label} được làm sạch trước khi gửi`);
    await page.context().close();
  }

  // 2. Thông báo quyền làm lại khi chọn học viên
  {
    const day = 24 * 3_600_000;
    const roster = [
      { studentRef: 'plain', name: 'Học viên thường' },
      { studentRef: 'expired', name: 'Hết hạn', retakeGrant: { status: 'granted', expiresAt: new Date(Date.now() - day).toISOString() } },
      { studentRef: 'future', name: 'Chưa mở', retakeGrant: { status: 'granted', availableFrom: new Date(Date.now() + day).toISOString(), expiresAt: new Date(Date.now() + 2 * day).toISOString() } },
      { studentRef: 'active', name: 'Đang mở', retakeGrant: { status: 'granted', expiresAt: new Date(Date.now() + 30 * 60_000).toISOString() } }
    ];
    const api = createApi({ roster });
    const page = await openPage(browser, api);
    await ready(page);
    const startDisabled = () => page.locator('#startExamBtn').isDisabled();
    const status = () => text(page, '#studentSelectStatus');
    await page.selectOption('#studentSelectInput', 'plain');
    assert.equal(await startDisabled(), false);
    assert.match(await status(), /Đã chọn: Học viên thường/);
    await page.selectOption('#studentSelectInput', 'expired');
    assert.equal(await startDisabled(), true, 'quyền làm lại hết hạn thì không bắt đầu được');
    assert.match(await status(), /Quyền làm lại đã hết hạn/);
    await page.selectOption('#studentSelectInput', 'future');
    assert.equal(await startDisabled(), true, 'quyền làm lại chưa mở thì không bắt đầu được');
    assert.match(await status(), /chưa tới thời gian mở/);
    await page.selectOption('#studentSelectInput', 'active');
    assert.equal(await startDisabled(), false);
    const active = await status();
    assert.match(active, /Thời gian làm bài thực tế là (29|30) phút/, 'thời gian thực tế = min(thời lượng đề, thời gian còn lại của quyền)');
    await page.selectOption('#studentSelectInput', '');
    assert.equal(await startDisabled(), true, 'bỏ chọn thì khóa nút bắt đầu');
    await page.context().close();
  }

  // 3. Xem kết quả: hợp đồng yêu cầu, chưa nộp, chưa công bố, lỗi có Thử lại, quay lại
  {
    const api = createApi();
    const page = await openPage(browser, api);
    await ready(page);
    assert.equal(await page.locator('#viewResultBtn').isDisabled(), true, 'chưa chọn tên thì chưa xem kết quả được');
    await page.selectOption('#studentSelectInput', 's1');
    assert.equal(await page.locator('#viewResultBtn').isDisabled(), false);

    api.reviews = [{ status: 'not_submitted' }];
    await page.click('#viewResultBtn');
    await waitFor(async () => /chưa có bài nộp/i.test(await text(page, '#reviewBody')), 'chưa nộp thì báo chưa có bài nộp');
    const review = api.last('/attempts/review').body;
    assert.deepEqual(Object.keys(review).sort(), ['courseCode', 'studentRef', 'testToken'], '/attempts/review không mang deviceId (schema backend strict)');
    assert.equal(review.testToken, UUID);
    assert.equal(api.count('/attempts/start'), 0, 'xem kết quả không bắt đầu lượt làm');
    assert.equal(await page.locator('#reviewMain').isVisible(), true);
    await page.click('#reviewBackBtn');
    assert.equal(await page.locator('#reviewMain').isHidden(), true, 'quay lại ẩn màn kết quả');

    // lỗi máy chủ: hiện lỗi và Thử lại gọi lại
    api.failNext['/attempts/review'] = { status: 500, error: 'down' };
    await page.click('#viewResultBtn');
    await waitFor(async () => /Không tải được|Thử lại/.test(await text(page, '#reviewBody')), 'lỗi tải kết quả được báo');
    assert.ok(await page.locator('#reviewBody [data-review-retry]').count(), 'có nút Thử lại');
    api.reviews = [{ status: 'not_submitted' }];
    await page.click('#reviewBody [data-review-retry]');
    await waitFor(async () => /chưa có bài nộp/i.test(await text(page, '#reviewBody')), 'Thử lại gọi lại và hiện trạng thái mới');

    // trạng thái lạ là lỗi, không phải kết quả
    await page.click('#reviewBackBtn');
    api.reviews = [{ status: 'weird' }];
    await page.click('#viewResultBtn');
    await waitFor(async () => /Không tải được|Thử lại/.test(await text(page, '#reviewBody')), 'trạng thái lạ vào lỗi có Thử lại');
    assert.equal(api.count('/attempts/result'), 0, 'trạng thái lạ không hỏi kết quả');
    assert.equal(api.count('/attempts/start'), 0);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }

  // 4. Chưa công bố: báo đã ghi nhận bài nộp và hỏi lại kết quả mỗi 15 giây (đồng hồ giả), không hỏi dồn
  {
    const api = createApi();
    api.reviews = [{ status: 'submitted_unpublished', attemptToken: 'att-1', submittedAt: new Date().toISOString() }];
    api.results = [{ result: { publication: { published: false } } }];
    const page = await openPage(browser, api, { clock: true });
    await ready(page);
    await page.selectOption('#studentSelectInput', 's1');
    await page.click('#viewResultBtn');
    await waitFor(async () => /Đã ghi nhận bài nộp/.test(await text(page, '#reviewBody')), 'chưa công bố thì báo đã ghi nhận');
    await waitFor(() => api.count('/attempts/result') === 1, 'hỏi kết quả ngay một lần');
    assert.equal(api.last('/attempts/result').body.attemptToken, 'att-1');
    assert.equal(Object.hasOwn(api.last('/attempts/result').body, 'deviceId'), false, '/attempts/result không mang deviceId');
    await page.clock.runFor(14_000);
    await page.waitForTimeout(300); // lời gọi mạng thật chạy sau khi đồng hồ giả chạy xong
    assert.equal(api.count('/attempts/result'), 1, 'chưa tới 15 giây thì chưa hỏi lại');
    await page.clock.runFor(2_000);
    await waitFor(() => api.count('/attempts/result') === 2, 'sau 15 giây hỏi lại');
    // rời màn kết quả thì dừng hỏi
    await page.click('#reviewBackBtn');
    await page.clock.runFor(60_000);
    await page.waitForTimeout(200);
    assert.equal(api.count('/attempts/result'), 2, 'quay lại thì dừng hỏi kết quả');
    await page.context().close();
  }

  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  if (browser) await browser.close();
  child.kill();
}
