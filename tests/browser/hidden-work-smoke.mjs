// Smoke: thành phần đang ẩn không được chạy ngầm.
//  1) polling /results 30 giây chỉ chạy ở Teacher Dashboard (thẻ bài) và tab "Chấm chi tiết";
//  2) luồng SSE phòng thi ngắt khi rời Teacher Dashboard và nối lại khi quay về (phòng còn mở);
//  3) báo cáo chỉ vẽ panel của tab đang mở.
// Dùng đồng hồ giả của Playwright. API giả, không chạm production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18421);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const stu = { studentRef: 's1', name: 'Nguyễn Văn An', email: 'an@example.com', score: 20 };
const report = { assignment: { assignmentId: 'assign-1', title: 'Bài thi', maxScore: 25 }, rosterSummary: { totalRoster: 1, submitted: 1 }, overall: { maxScore: 25, statistics: { count: 1 }, histogram: { buckets: [{ min: 15, max: 25, label: '15 – 25', count: 1, students: [stu] }] } }, skills: [] };
const item = n => ({ itemVersionId: `i${n}`, position: n, skill: 'Reading', prompt: 'Câu hỏi', totalAttempts: 3, correctCount: 1, incorrectCount: 2, maxScore: 1, wrongStudents: [] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', reject);
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  page.setDefaultTimeout(10000);
  const errors = [];
  let resultReads = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.addInitScript(() => {
    sessionStorage.setItem('izone_teacher_token', 'synthetic-hidden-work-token');
    const nativeFetch = window.fetch.bind(window);
    window.__streams = [];
    window.fetch = (input, options = {}) => {
      const url = new URL(String(input), location.href);
      if (!url.pathname.endsWith('/exam/events')) return nativeFetch(input, options);
      const entry = { closed: false };
      options.signal?.addEventListener('abort', () => { entry.closed = true; });
      window.__streams.push(entry);
      return Promise.resolve(new Response(new ReadableStream({ start() {}, cancel() { entry.closed = true; } }), { headers: { 'Content-Type': 'text/event-stream' } }));
    };
  });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.startsWith('/api/teacher/')) {
      let payload = {};
      if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Giáo viên', role: 'admin', courseCodes: ['34'] } };
      else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Lớp IC2283', courseCode: '34', status: 'on_going' }] };
      else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Bài thi', courseCode: '34', examMode: true, status: 'published' }] };
      else if (path.endsWith('/results')) { resultReads++; payload = { assignment: { assignmentId: 'assign-1' }, skills: [], students: [{ studentRef: 's1', name: 'Nguyễn Văn An', status: 'complete', attemptId: 'a1', skills: {} }], pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 25 } }; }
      else if (path.endsWith('/exam/room')) payload = { room: { status: 'running', readyCount: 0, totalCount: 0, students: [] } };
      else if (path.endsWith('/report')) payload = report;
      else if (path.endsWith('/items-analysis')) payload = { items: [1, 2].map(item), summary: {} };
      else if (path.endsWith('/portal-tests')) payload = { tests: [] };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
    return route.continue();
  });
  // Tua đồng hồ từng bước nhỏ để phản hồi mạng kịp về giữa các lần tua.
  const advance = async ms => { for (let t = 0; t < ms; t += 5000) { await page.clock.runFor(Math.min(5000, ms - t)); await page.waitForTimeout(40); } };
  const pollsDuring = async ms => { const before = resultReads; await advance(ms); return resultReads - before; };
  const setHash = async hash => { await page.evaluate(h => { location.hash = h; }, hash); await advance(1500); await page.waitForTimeout(150); };

  await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#dashboard`);
  for (let i = 0; i < 40 && !(await page.locator('#exam-room-open').isVisible().catch(() => false)); i++) { await page.clock.runFor(300); await page.waitForTimeout(80); }

  // 1) polling
  assert.ok(await pollsDuring(65000) >= 2, 'Teacher Dashboard phải còn polling tiến độ nộp bài');
  await setHash('#test-studio');
  assert.equal(await pollsDuring(65000), 0, 'tab Quản lý bài thi không được polling /results');
  await setHash('#grading');
  await page.locator('[data-assessment-tab="details"]').click();
  await advance(1000);
  assert.ok(await pollsDuring(65000) >= 2, 'tab Chấm chi tiết phải còn polling');
  await page.locator('[data-assessment-tab="distribution"]').click();
  await advance(1000);
  assert.equal(await pollsDuring(65000), 0, 'tab Phổ điểm không được polling /results');
  await page.locator('[data-assessment-tab="items"]').click();
  await advance(1000);
  assert.equal(await pollsDuring(65000), 0, 'tab Phân tích câu hỏi không được polling /results');

  // 3) chỉ vẽ panel của tab đang mở (đang ở tab Phân tích câu hỏi, panel Phổ điểm đã vẽ lúc trước có thể còn nội dung cũ)
  await page.locator('[data-assessment-tab="details"]').click();
  await advance(500);
  await page.reload();
  for (let i = 0; i < 40 && !(await page.locator('[data-assessment-tab="items"]').isVisible().catch(() => false)); i++) { await page.clock.runFor(300); await page.waitForTimeout(80); }
  await page.locator('[data-assessment-tab="items"]').click();
  await advance(1500);
  const panels = await page.evaluate(() => ({ distribution: document.querySelector('#assessment-tab-distribution').children.length, items: document.querySelector('#assessment-tab-items').children.length }));
  assert.equal(panels.distribution, 0, `tab Phân tích câu hỏi không được vẽ cả panel Phổ điểm (${JSON.stringify(panels)})`);
  assert.ok(panels.items > 0, 'panel Phân tích câu hỏi phải được vẽ');
  await page.locator('[data-assessment-tab="distribution"]').click();
  await advance(1500);
  const panels2 = await page.evaluate(() => document.querySelector('#assessment-tab-distribution').children.length);
  assert.ok(panels2 > 0, 'chuyển sang Phổ điểm phải vẽ panel này');

  // 2) SSE phòng thi
  await setHash('#dashboard');
  await page.locator('#exam-room-open').click();
  await advance(2000);
  let streams = await page.evaluate(() => window.__streams.map(s => s.closed));
  assert.deepEqual(streams, [false], 'mở phòng thi phải có đúng một luồng SSE đang mở');
  await setHash('#grading');
  streams = await page.evaluate(() => window.__streams.map(s => s.closed));
  assert.equal(streams[streams.length - 1], true, `rời Teacher Dashboard phải ngắt luồng SSE phòng thi (${JSON.stringify(streams)})`);
  await setHash('#dashboard');
  await advance(2000);
  streams = await page.evaluate(() => window.__streams.map(s => s.closed));
  assert.equal(streams.length, 2, `quay lại phải nối lại luồng SSE (${JSON.stringify(streams)})`);
  assert.equal(streams[1], false, 'luồng SSE mới phải đang mở');
  assert.equal(await page.locator('#exam-room').isVisible(), true, 'phòng thi vẫn mở khi quay lại');
  await page.locator('#exam-room-close').click();
  await advance(1000);
  streams = await page.evaluate(() => window.__streams.map(s => s.closed));
  assert.equal(streams[streams.length - 1], true, 'bấm Đóng phải ngắt luồng SSE');
  await setHash('#grading');
  await setHash('#dashboard');
  streams = await page.evaluate(() => window.__streams.length);
  assert.equal(streams, 2, 'phòng thi đã đóng thì quay lại không được nối lại SSE');

  assert.deepEqual(errors, []);
  console.log('hidden-work-smoke ok');
} finally {
  await browser?.close();
  server.kill();
}
