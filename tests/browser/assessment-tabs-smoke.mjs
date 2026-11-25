// Smoke: ở màn Chấm điểm & Đánh giá, tại mọi thời điểm chỉ một tab hiện (Chấm chi tiết / Phổ điểm / Phân tích câu hỏi).
// Polling 30 giây của bảng kết quả trước đây bỏ ẩn #results ngay cả khi đang ở tab khác, nên bảng "nhảy" sang tab Phổ điểm.
// Dùng đồng hồ giả của Playwright để chạy nhiều chu kỳ polling. API giả, không chạm production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18400);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const stu = { studentRef: 's1', name: 'Nguyễn Văn An', email: 'an@example.com', score: 20 };
const item = n => ({ itemVersionId: `i${n}`, position: n, skill: 'Reading', prompt: 'Câu hỏi', totalAttempts: 3, correctCount: 1, incorrectCount: 2, maxScore: 1, wrongStudents: [] });
const report = { assignment: { assignmentId: 'assign-1', title: 'Bài thi', maxScore: 25 }, rosterSummary: { totalRoster: 1, submitted: 1 }, overall: { maxScore: 25, statistics: { count: 1 }, histogram: { buckets: [{ min: 15, max: 25, label: '15 – 25', count: 1, students: [stu] }] } }, skills: [] };
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', reject);
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, locale: 'vi-VN' });
    page.setDefaultTimeout(10000);
    const errors = [];
    let resultReads = 0;
    let delayResultsMs = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.addInitScript(() => { sessionStorage.setItem('izone_teacher_token', 'synthetic-tabs-token'); });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.startsWith('/api/teacher/')) {
        let payload = {};
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Giáo viên', role: 'admin', courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Lớp IC2283', courseCode: '34', status: 'on_going' }] };
        else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Bài thi', courseCode: '34', status: 'published' }] };
        else if (path.endsWith('/results')) { resultReads++; if (delayResultsMs) await new Promise(resolve => setTimeout(resolve, delayResultsMs)); payload = { assignment: { assignmentId: 'assign-1' }, skills: [], students: [{ studentRef: 's1', name: 'Nguyễn Văn An', status: 'complete', attemptId: 'a1', skills: {} }], pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 25 } }; }
        else if (path.endsWith('/report')) payload = report;
        else if (path.endsWith('/items-analysis')) payload = { items: [1, 2].map(item), summary: {} };
        else if (path.endsWith('/portal-tests')) payload = { tests: [] };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#grading`);
    for (let i = 0; i < 80 && !(await page.evaluate(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả')); i++) { await page.clock.runFor(300); await page.waitForTimeout(100); }
    const shown = () => page.evaluate(() => Object.fromEntries(['details:#results', 'distribution:#assessment-tab-distribution', 'items:#assessment-tab-items'].map(pair => { const [name, sel] = pair.split(':'); return [name, document.querySelector(sel).getClientRects().length > 0]; })));
    const only = async (tab, when) => {
      const state = await shown();
      for (const [name, visible] of Object.entries(state)) assert.equal(visible, name === tab, `${width}px, ${when}: tab "${tab}" đang mở nhưng "${name}" ${visible ? 'cũng hiện' : 'không hiện'} (${JSON.stringify(state)})`);
    };
    await page.locator('[data-assessment-tab="details"]').click();
    await page.clock.runFor(1000);
    await page.waitForTimeout(300);
    await only('details', 'lúc mở màn');
    // Mỗi lần chuyển tab, đợi qua hơn hai chu kỳ polling: tại mọi thời điểm chỉ tab đang mở được hiện, không trùng id.
    for (const tab of ['distribution', 'items', 'details', 'distribution', 'items']) {
      await page.locator(`[data-assessment-tab="${tab}"]`).click();
      await page.clock.runFor(1000);
      await page.waitForTimeout(200);
      await only(tab, 'ngay sau khi chuyển tab');
      for (let k = 0; k < 13; k++) { await page.clock.runFor(5000); await page.waitForTimeout(60); } // 65 giây
      await only(tab, 'sau hai chu kỳ polling');
      const dup = await page.evaluate(() => ['report-drilldown-container', 'report-toggle-provisional'].map(id => [id, document.querySelectorAll('#' + id).length]).filter(([, n]) => n > 1));
      assert.deepEqual(dup, [], `${width}px, tab "${tab}": id trùng do báo cáo bị vẽ vào nhiều khung`);
    }

    // Phản hồi /results về muộn sau khi đã chuyển sang tab khác không được kéo bảng kết quả hiện lại.
    await page.locator('[data-assessment-tab="details"]').click();
    await page.clock.runFor(1000);
    await page.waitForTimeout(200);
    delayResultsMs = 1500;
    const before = resultReads;
    for (let k = 0; k < 7 && resultReads === before; k++) { await page.clock.runFor(5000); await page.waitForTimeout(60); } // chờ polling kế tiếp phát request
    assert.ok(resultReads > before, `${width}px: không bắt được request /results để làm trễ`);
    await page.locator('[data-assessment-tab="distribution"]').click(); // chuyển tab khi phản hồi chưa về
    await page.waitForTimeout(2200);
    delayResultsMs = 0;
    await page.clock.runFor(500);
    await only('distribution', 'sau khi phản hồi /results về muộn');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('assessment-tabs-smoke ok');
} finally {
  await browser?.close();
  server.kill();
}
