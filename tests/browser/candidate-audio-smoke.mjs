// Smoke âm thanh bài nghe của shell học viên thật (dynamic-exam-renderer.mjs: khối nghe + content-preview.mjs/exam-mode.js).
//   node tests/browser/candidate-audio-smoke.mjs    (không nằm trong `npm test`; cần Chrome và Playwright cục bộ)
// Dùng thẻ <audio> thật với file WAV im lặng do test phục vụ (không giả lập trình phát). Kiểm: đề bị ẩn cho tới khi bấm nghe,
// mỗi bài nghe chỉ một lượt (tạm dừng giữa chừng vẫn tính là đã dùng, nghe xong thì khóa, không nghe lại được), chỉ một bài phát
// cùng lúc, trạng thái mở khóa giữ nguyên khi chuyển phần, lỗi tải file được báo, và Tự giám sát tạm dừng/tiếp tục âm thanh khi rời bài.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

process.env.PLAYWRIGHT_MODULE ||= 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18334;
const origin = `http://127.0.0.1:${port}`;
const TOKEN = '3401-audio-smoke-token';

// WAV 8 kHz, 8-bit, mono, im lặng.
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
  title: 'Audio Smoke',
  timing: { totalMinutes: 60 },
  blocks: [
    { blockId: 'b1', title: 'Phần Đọc', items: [item('it-1', 1, 'Câu đọc 1?')] },
    { blockId: 'b2', title: 'Nghe A', audioUrl: `${origin}/audio/short.wav`, items: [item('it-2', 2, 'Câu nghe A1?')] },
    { blockId: 'b3', title: 'Nghe B', audioUrl: `${origin}/audio/long.wav`, items: [item('it-3', 3, 'Câu nghe B1?')] },
    { blockId: 'b4', title: 'Nghe C', audioUrl: `${origin}/audio/missing.wav`, items: [item('it-4', 4, 'Câu nghe C1?')] }
  ]
};

function createApi(options = {}) {
  const api = { calls: [], count(path) { return this.calls.filter(call => call.path === path).length; }, last(path) { return [...this.calls].reverse().find(call => call.path === path); } };
  api.handler = route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/learning/, '');
    let body = {};
    try { body = request.postDataJSON() || {}; } catch { body = {}; }
    api.calls.push({ path, body });
    let payload = {};
    if (path === '/test-access/resolve') {
      payload = { assignment: { title: definition.title, class: { name: 'Lớp Audio' }, definition, roster: [{ studentRef: 's1', name: 'Học Viên Audio' }] } };
    } else if (path === '/attempts/start') {
      payload = { attempt: { attemptToken: 'audio-attempt', definitionHash: 'h', draftRevision: 0, status: 'active', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), definition, ...(options.selfProctoring ? { selfProctoring: options.selfProctoring } : {}) } };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
  };
  return api;
}

async function openExam(browser, api) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/learning/')) return api.handler(route);
    if (url.pathname === '/audio/short.wav') return route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav(2) });
    if (url.pathname === '/audio/long.wav') return route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav(30) });
    if (url.pathname === '/audio/missing.wav') return route.fulfill({ status: 404, body: 'not found' });
    return url.origin === origin ? route.continue() : route.abort();
  });
  await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#test=${TOKEN}`);
  await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
  await page.selectOption('#studentSelectInput', 's1');
  await page.click('#startExamBtn');
  await page.waitForSelector('.cbt-exam-shell');
  return page;
}

const goTo = (page, index) => page.evaluate(i => document.querySelectorAll('.cbt-nav-pill')[i].click(), index);
const section = (page, blockId) => page.locator(`.simulation-section-card[data-block-id="${blockId}"]`);
const dock = (page, blockId) => section(page, blockId).locator('.strict-audio-dock');
const audioState = (page, blockId) => page.evaluate(id => {
  const audio = document.querySelector(`.simulation-section-card[data-block-id="${id}"] .audio-hidden-element`);
  return { paused: audio.paused, ended: audio.ended, currentTime: audio.currentTime, duration: audio.duration };
}, blockId);
const waitFor = async (predicate, message, timeout = 9000) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate()) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50));
  assert.ok(await predicate(), message);
};

const child = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const report = {};

  // 1. Cổng âm thanh: đề của phần nghe bị ẩn cho tới khi bài nghe bắt đầu phát
  {
    const api = createApi();
    const page = await openExam(browser, api);
    await goTo(page, 1);
    const a = section(page, 'b2');
    assert.equal(await a.getAttribute('data-has-audio'), 'true');
    assert.notEqual(await a.getAttribute('data-audio-unlocked'), 'true', 'chưa nghe thì chưa mở khóa');
    assert.equal(await a.locator('.cbt-audio-gate-placeholder').isVisible(), true, 'hiện thông báo đề đang ẩn');
    assert.equal(await a.locator('input[data-item-id="it-2"]').isVisible(), false, 'ô trả lời bị ẩn khi chưa nghe');
    assert.match(await dock(page, 'b2').locator('.audio-listens-left').textContent(), /Còn 1 lượt nghe/);

    // 2. Bấm nghe: mở khóa đề, tính là đã dùng lượt, nút đổi thành Tạm dừng
    await dock(page, 'b2').locator('.btn-sim-audio-play').click();
    await waitFor(async () => (await a.getAttribute('data-audio-unlocked')) === 'true', 'bài nghe phát thì mở khóa đề');
    assert.equal(await a.locator('.cbt-audio-gate-placeholder').isVisible(), false, 'thông báo đề ẩn biến mất');
    assert.equal(await a.locator('input[data-item-id="it-2"]').isVisible(), true, 'ô trả lời hiện ra');
    assert.match(await dock(page, 'b2').locator('.btn-sim-audio-play').textContent(), /Tạm dừng/);
    assert.match(await dock(page, 'b2').locator('.audio-listens-left').textContent(), /Còn 0 lượt nghe/, 'lượt đang nghe dở cũng tính là đã dùng');

    // 3. Tạm dừng giữa chừng: tiếp tục nghe được, lượt vẫn tính là đã dùng
    await dock(page, 'b2').locator('.btn-sim-audio-play').click();
    assert.equal((await audioState(page, 'b2')).paused, true);
    assert.match(await dock(page, 'b2').locator('.btn-sim-audio-play').textContent(), /Tiếp tục nghe/);
    assert.match(await dock(page, 'b2').locator('.audio-listens-left').textContent(), /Còn 0 lượt nghe/);

    // 4. Nghe xong thì khóa: nút ẩn, báo đã khóa, không phát lại được
    await dock(page, 'b2').locator('.btn-sim-audio-play').click();
    await waitFor(async () => (await audioState(page, 'b2')).ended, 'bài nghe phát hết', 8000);
    assert.equal(await dock(page, 'b2').getAttribute('data-listens-count'), '1');
    assert.equal(await dock(page, 'b2').locator('.btn-sim-audio-play').isHidden(), true, 'nút nghe bị ẩn sau khi nghe xong');
    assert.match(await dock(page, 'b2').locator('.audio-ended-notice').textContent(), /Bài nghe đã khóa/);
    await page.evaluate(() => document.querySelector('.simulation-section-card[data-block-id="b2"] .btn-sim-audio-play').click());
    await page.waitForTimeout(300);
    assert.equal((await audioState(page, 'b2')).paused, true, 'bấm lại (qua DOM) không phát lại');
    report.listenOnce = true;

    // 5. Chuyển phần rồi quay lại: trạng thái mở khóa giữ nguyên
    await goTo(page, 0);
    await goTo(page, 1);
    assert.equal(await a.getAttribute('data-audio-unlocked'), 'true');
    assert.equal(await a.locator('input[data-item-id="it-2"]').isVisible(), true);
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }

  // 6. Chỉ một bài phát cùng lúc; lỗi tải file được báo
  {
    const api = createApi();
    const page = await openExam(browser, api);
    await goTo(page, 2);
    await dock(page, 'b3').locator('.btn-sim-audio-play').click();
    await waitFor(async () => !(await audioState(page, 'b3')).paused, 'bài nghe B phát');
    await goTo(page, 3);
    await dock(page, 'b4').locator('.btn-sim-audio-play').click();
    await waitFor(async () => /Không thể phát file/.test(await dock(page, 'b4').locator('.audio-live-status').textContent()), 'file lỗi thì báo không phát được');
    // phát bài nghe A rồi B: B tạm dừng khi A phát
    await goTo(page, 1);
    await dock(page, 'b2').locator('.btn-sim-audio-play').click();
    await waitFor(async () => (await audioState(page, 'b3')).paused, 'bài nghe khác bị tạm dừng khi bài mới phát');
    assert.equal((await audioState(page, 'b2')).paused, false);
    await page.context().close();
  }

  // 7. Tự giám sát: rời bài tạm dừng âm thanh đang phát, quay lại thì tiếp tục
  {
    const api = createApi({ selfProctoring: { exitLimit: 5, exitCount: 0 } });
    const page = await openExam(browser, api);
    await goTo(page, 2);
    await dock(page, 'b3').locator('.btn-sim-audio-play').click();
    await waitFor(async () => !(await audioState(page, 'b3')).paused, 'bài nghe B phát');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await waitFor(async () => (await audioState(page, 'b3')).paused, 'rời bài thì tạm dừng âm thanh');
    await page.click('#examGuardReturn');
    await waitFor(async () => !(await audioState(page, 'b3')).paused, 'quay lại bài thi thì âm thanh tiếp tục');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }

  // 8. Khoảng trống đã biết (ghi lại, chưa sửa): shell thật không lưu tiến độ nghe. Tải lại trang rồi vào lại lượt thì bài nghe đã
  // nghe xong lại còn 1 lượt. Đường prototype cũ có /attempts/audio/checkpoint và /resume để khóa lại; shell thật không gọi chúng.
  {
    const api = createApi();
    const page = await openExam(browser, api);
    await goTo(page, 1);
    await dock(page, 'b2').locator('.btn-sim-audio-play').click();
    await waitFor(async () => (await audioState(page, 'b2')).ended, 'nghe hết bài nghe A', 8000);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
    await page.selectOption('#studentSelectInput', 's1');
    await page.click('#startExamBtn');
    await page.waitForSelector('.cbt-exam-shell');
    await goTo(page, 1);
    const left = await dock(page, 'b2').locator('.audio-listens-left').textContent();
    report.knownGaps = { audioListenLockSurvivesReload: !/Còn 1 lượt nghe/.test(left), serverAudioCheckpointCalls: api.count('/attempts/audio/checkpoint') + api.count('/attempts/audio/resume') };
    await page.context().close();
  }

  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  if (browser) await browser.close();
  child.kill();
}
