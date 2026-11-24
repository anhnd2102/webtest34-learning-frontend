// Smoke di động cho tab Phân tích câu hỏi: thẻ câu hỏi không tràn và không bị co đề bài về 0, vùng bấm đủ 44px,
// chú giải thanh phân bố hiện chữ, bảng học viên cần lưu ý thành thẻ. API giả, không chạm production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18395);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const item = n => ({
  itemVersionId: `i${n}`, position: n, skill: n % 2 ? 'Listening' : 'Reading',
  prompt: { text: 'Choose the correct word to complete the sentence about the weather forecast for tomorrow morning in the city.' },
  totalAttempts: 13, correctCount: 4, incorrectCount: 7, partialCount: 1, unansweredCount: 1, maxScore: 1, expectedAnswer: 'although',
  commonWrongAnswers: [{ answer: 'because', count: 5 }, { answer: 'despite', count: 2 }],
  wrongStudents: [
    { name: 'Nguyễn Văn An', email: 'an.nguyen@example.com', rawAnswer: 'because', verdict: 'incorrect', scoreEarned: 0, maxScore: 1 },
    { name: 'Trần Thị Bình Nguyên Phương', rawAnswer: '', verdict: 'unanswered', scoreEarned: 0, maxScore: 1 }
  ]
});
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', reject);
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const outDir = process.env.MOBILE_SHOTS;
  if (outDir) await mkdir(outDir, { recursive: true });
  for (const width of [320, 360, 390, 412, 1024]) {
    const mobile = width <= 640;
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: mobile, locale: 'vi-VN' });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { sessionStorage.setItem('izone_teacher_token', 'synthetic-item-analysis-token'); });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.startsWith('/api/teacher/')) {
        let payload = {};
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Giáo viên', role: 'admin', courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Lớp IC2283', courseCode: '34', status: 'on_going' }] };
        else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Bài thi giữa khóa', courseCode: '34', status: 'published' }] };
        else if (path.endsWith('/results')) payload = { assignment: { assignmentId: 'assign-1' }, skills: [], students: [], pagination: { page: 1, totalPages: 1, totalItems: 0, pageSize: 25 } };
        else if (path.endsWith('/items-analysis')) payload = { items: [1, 2, 3, 4].map(item), summary: {} };
        else if (path.endsWith('/report')) payload = { assignment: { maxScore: 2 }, statistics: { count: 0 }, buckets: [], rosterSummary: {} };
        else if (path.endsWith('/portal-tests')) payload = { tests: [] };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#grading`);
    await page.waitForTimeout(600);
    await page.locator('[data-assessment-tab="items"]').click();
    await page.locator('.item-card').first().waitFor();

    const measure = () => page.evaluate(() => {
      const de = document.documentElement;
      const box = document.querySelector('#assessment-tab-items');
      const cards = [...box.querySelectorAll('.item-card')];
      const wide = cards.filter(c => c.scrollWidth > c.clientWidth + 1 || c.getBoundingClientRect().right > de.clientWidth + 1).length;
      const snippet = box.querySelector('.item-prompt-snippet');
      const small = [...box.querySelectorAll('.item-filter-tab, .item-sort-btn, .btn-item-accordion, .item-card-header')].filter(e => e.getClientRects().length && e.getBoundingClientRect().height < 43.5).map(e => `${e.className.slice(0, 24)} ${Math.round(e.getBoundingClientRect().height)}`);
      return { page: de.scrollWidth - de.clientWidth, wide, snippetW: Math.round(snippet.getBoundingClientRect().width), snippetClipped: snippet.scrollHeight > snippet.clientHeight + 1 && snippet.clientHeight < 10, small };
    });
    let m = await measure();
    assert.ok(m.page <= 0, `${width}px: trang cuộn ngang ${m.page}px`);
    assert.equal(m.wide, 0, `${width}px: ${m.wide} thẻ câu hỏi tràn khung`);
    assert.ok(m.snippetW > 100 && !m.snippetClipped, `${width}px: đề bài bị co (${m.snippetW}px)`);
    if (mobile) {
      assert.deepEqual(m.small, [], `${width}px: vùng bấm dưới 44px: ${m.small.join('; ')}`);
      assert.match(await page.locator('.item-card').first().locator('.item-dist-legend').innerText(), /Đúng 4.*Một phần 1.*Sai 7.*Bỏ trống 1/s, `${width}px: thiếu chú giải thanh phân bố`);
      assert.equal(await page.locator('.item-card').first().locator('.error-rate-text').isVisible(), false, `${width}px: còn hiện phần trăm`);
      const head = await page.evaluate(() => { const bar = document.querySelector('.item-card .item-dist-bar').getBoundingClientRect(); const pos = document.querySelector('.item-card .item-position-badge').getBoundingClientRect(); return { barTop: bar.top, posBottom: pos.bottom }; });
      assert.ok(head.barTop >= head.posBottom, `${width}px: thanh phân bố đè lên nhãn Câu N`);
    } else {
      assert.equal(await page.locator('.item-card').first().locator('.item-dist-legend').isVisible(), false, `${width}px: chú giải chỉ hiện ở mobile`);
      assert.equal(await page.locator('.item-card').first().locator('.error-rate-text').isVisible(), true, 'desktop phải giữ nguyên tỉ lệ');
    }

    await page.locator('.item-card-header').first().click();
    await page.locator('.item-card-drawer').first().waitFor();
    await page.waitForTimeout(250);
    m = await measure();
    assert.ok(m.page <= 0 && m.wide === 0, `${width}px: thẻ mở rộng gây tràn ngang`);
    const table = await page.evaluate(() => { const w = document.querySelector('.item-wrong-table-wrapper'); return { over: w.scrollWidth - w.clientWidth, headVisible: !!w.querySelector('thead')?.getClientRects().length }; });
    if (mobile) {
      assert.ok(table.over <= 0, `${width}px: bảng học viên cần lưu ý còn cuộn ngang ${table.over}px`);
      assert.equal(table.headVisible, false, `${width}px: còn hiện tiêu đề bảng`);
    }
    if (outDir && [320, 390].includes(width)) await page.screenshot({ path: `${outDir}/item-analysis-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('item-analysis-mobile-smoke ok');
} finally {
  await browser?.close();
  server.kill();
}
