// Smoke di động cho màn Chấm điểm & Đánh giá: breadcrumb/tab không cuộn ngang, danh sách kết quả và bảng chấm từng câu
// dựng thành thẻ, bộ lọc gom sau nút "Bộ lọc", thanh nút dưới đáy ngăn chấm không bẻ chữ. API giả, không chạm production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18392);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const students = [
  { studentRef: 's1', name: 'Nguyễn Văn An', status: 'complete', attemptId: 'att-1', published: true, total: { earned: 18, maximum: 25 }, skills: { writing: { earned: 18, maximum: 25 } }, submittedAt: '2026-10-30T01:30:00Z' },
  { studentRef: 's2', name: 'Trần Thị Bình Nguyên Phương', status: 'review_required', attemptId: 'att-2', published: false, total: { status: 'pending' }, skills: {}, submittedAt: '2026-10-30T01:40:00Z' },
  { studentRef: 's3', name: 'Lê Hoàng Cường', status: 'not_started', attemptId: null, published: false, skills: {} }
];
const longPrompt = 'Describe a memorable trip you took with your family and explain why it was important to you. '.repeat(3);
const detail = () => ({
  class: { name: 'Lớp IC2283', courseCode: '34' },
  assignment: { title: 'IZONE Khối 34 Phase 1 Test 1 Writing và Speaking' },
  student: { name: 'Nguyễn Văn An' },
  attempt: { formVersion: 1, status: 'submitted', startedAt: '2026-10-30T01:00:00Z', submittedAt: '2026-10-30T01:30:00Z', publication: { published: false } },
  incidents: [], skills: [{ code: 'writing' }], scores: { total: { earned: 0, max: 5 }, skills: {} },
  attemptHistory: [], manualGrading: { revision: 0, status: 'none' },
  items: [1, 2].map(n => ({ itemVersionId: `i${n}`, position: n, prompt: longPrompt, interactionType: 'long_text', graderType: 'rubric_async', primarySkill: 'writing', maxScore: 5, scoreEarned: null, verdict: 'pending', needsReview: true, studentAnswer: { text: 'We went to Da Nang last summer and it was wonderful.' }, feedback: null }))
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
  for (const width of [320, 360, 390, 412]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true, locale: 'vi-VN' });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { sessionStorage.setItem('izone_teacher_token', 'synthetic-grading-mobile-token'); });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.startsWith('/api/teacher/')) {
        let payload = {};
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Giáo viên', role: 'admin', courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Lớp IC2283', courseCode: '34', status: 'on_going' }] };
        else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'IZONE Khối 34 Phase 1 Test 1 Writing và Speaking', courseCode: '34', status: 'published' }] };
        else if (path.endsWith('/results')) payload = { assignment: { assignmentId: 'assign-1', title: 'IZONE Khối 34 Phase 1 Test 1 Writing và Speaking' }, skills: [{ code: 'writing', maximum: 25 }], students, pagination: { page: 1, totalPages: 1, totalItems: 3, pageSize: 25 } };
        else if (path.endsWith('/attempts/att-1') || path.endsWith('/attempts/att-2')) payload = detail();
        else if (path.endsWith('/portal-tests')) payload = { tests: [] };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#grading`);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');
    await page.waitForTimeout(300);

    const overflow = () => page.evaluate(() => {
      const de = document.documentElement;
      return {
        page: de.scrollWidth - de.clientWidth,
        tabs: (() => { const n = document.querySelector('.assessment-nav-tabs'); return n.scrollWidth - n.clientWidth; })(),
        header: (() => { const n = document.querySelector('.assessment-header'); return n.scrollWidth - n.clientWidth; })()
      };
    });
    let o = await overflow();
    assert.ok(o.page <= 0, `${width}px: trang cuộn ngang ${o.page}px`);
    assert.ok(o.tabs <= 0, `${width}px: nav-tabs còn cuộn ngang ${o.tabs}px`);
    assert.ok(o.header <= 0, `${width}px: assessment-header tràn ${o.header}px`);
    const crumb = await page.evaluate(() => { const c = document.querySelector('.assessment-breadcrumb').getBoundingClientRect(); const t = document.querySelector('#assessment-test-title'); return { right: c.right, vw: document.documentElement.clientWidth, truncated: t.scrollWidth > t.clientWidth + 1 }; });
    assert.ok(crumb.right <= crumb.vw && !crumb.truncated, `${width}px: breadcrumb tràn hoặc bị cắt chữ`);

    // Danh sách kết quả: thẻ, không cuộn ngang, nút ≥ 44px
    const scroller = await page.evaluate(() => { const s = document.querySelector('#results-content .results-scroll'); return s.scrollWidth - s.clientWidth; });
    assert.ok(scroller <= 0, `${width}px: danh sách kết quả còn cuộn ngang ${scroller}px`);
    assert.equal(await page.locator('#results-content thead').isVisible(), false, `${width}px: còn hiện tiêu đề bảng kết quả`);
    const rowBtn = await page.locator('#results-content .btn-view-attempt').first().boundingBox();
    assert.ok(rowBtn.height >= 43.5, `${width}px: nút Xem bài thấp ${rowBtn.height}px`);

    // Bộ lọc gom sau nút
    assert.equal(await page.locator('#status-filter').isVisible(), false, `${width}px: bộ lọc phải ẩn cho tới khi bấm "Bộ lọc"`);
    await page.locator('#filters-toggle-btn').click();
    assert.equal(await page.locator('#status-filter').isVisible(), true, `${width}px: bấm "Bộ lọc" không mở được`);
    await page.locator('#status-filter').selectOption('complete');
    await page.waitForFunction(() => document.querySelector('#filters-active-count')?.textContent === '1');
    await page.waitForTimeout(300);
    if (outDir && width === 390) await page.screenshot({ path: `${outDir}/grading-list-390.png`, fullPage: true });

    // Mở bài: bấm cả thẻ trên mobile
    await page.locator('#results-content tbody tr.result-row-openable').first().click({ position: { x: 20, y: 10 } });
    await page.waitForFunction(() => document.querySelector('#attempt-detail')?.classList.contains('drawer-open'));
    await page.locator('.grade-score-input').first().waitFor();
    await page.waitForTimeout(400);
    o = await page.evaluate(() => { const d = document.querySelector('#attempt-detail'); const w = document.querySelector('#attempt-detail .grading-table-wrap'); return { drawer: d.scrollWidth - d.clientWidth, table: w.scrollWidth - w.clientWidth }; });
    assert.ok(o.drawer <= 0, `${width}px: ngăn chấm bài cuộn ngang ${o.drawer}px`);
    assert.ok(o.table <= 0, `${width}px: bảng chấm từng câu còn cuộn ngang ${o.table}px`);
    const close = await page.locator('#close-attempt-detail-btn').boundingBox();
    assert.ok(close.width >= 43.5 && close.height >= 43.5 && close.y < 120, `${width}px: nút đóng nhỏ hoặc nằm thấp (${JSON.stringify(close)})`);
    const input = await page.locator('.grade-score-input').first().boundingBox();
    assert.ok(input.height >= 43.5 && input.x >= 0 && input.x + input.width <= width, `${width}px: ô điểm nhỏ hoặc tràn`);

    // Thanh nút dưới đáy: không bẻ chữ, 44px, nằm trong màn hình
    const bar = await page.evaluate(() => [...document.querySelectorAll('#attempt-detail .grading-buttons button')].filter(b => b.getClientRects().length).map(b => { const r = b.getBoundingClientRect(); const line = parseFloat(getComputedStyle(b).lineHeight) || 20; return { id: b.id, h: Math.round(r.height), right: Math.round(r.right), lines: Math.round((b.scrollHeight - 12) / line) }; }));
    for (const b of bar) {
      assert.ok(b.h >= 43 && b.right <= width, `${width}px: nút ${b.id} thấp ${b.h}px hoặc tràn (${b.right})`);
      assert.ok(b.lines <= 2, `${width}px: nút ${b.id} bẻ ${b.lines} dòng`);
    }
    if (outDir && [320, 390].includes(width)) {
      await page.screenshot({ path: `${outDir}/grading-detail-${width}.png` });
      await page.evaluate(() => document.querySelector('#attempt-detail').scrollTo(0, 99999));
      await page.screenshot({ path: `${outDir}/grading-detail-bottom-${width}.png` });
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('grading-mobile-smoke ok');
} finally {
  await browser?.close();
  server.kill();
}
