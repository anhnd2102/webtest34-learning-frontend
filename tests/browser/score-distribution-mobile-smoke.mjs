// Smoke di động cho bảng drill-down ở tab Phổ điểm: cột email mặc định thu gọn, bấm nút để mở rộng/thu gọn,
// không cuộn ngang; desktop luôn hiện email và ẩn nút. API giả, không chạm production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18396);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const students = [
  { studentRef: 's1', name: 'Nguyễn Văn An', email: 'an.nguyen.van.1998@example-center.edu.vn', score: 100 },
  { studentRef: 's2', name: 'Trần Thị Bình Nguyên Phương', email: 'binh.nguyen.phuong@example-center.edu.vn', score: 87.5 },
  { studentRef: 's3', name: 'Lê Hoàng Cường', email: '', score: 12 }
];
const report = {
  assignment: { assignmentId: 'assign-1', title: 'Bài thi giữa khóa', className: 'Lớp IC2283', maxScore: 100 },
  rosterSummary: { totalRoster: 3, submitted: 3, officialGraded: 3, provisional: 0, pendingReview: 0, retaking: 0, notSubmitted: 0 },
  overall: { maxScore: 100, statistics: { count: 3, mean: 17, median: 18, min: 12, max: 21 }, histogram: { buckets: [{ min: 10, max: 15, label: '10 – 15', count: 1, students: [students[2]] }, { min: 15, max: 25, label: '15 – 25', count: 2, students: [students[0], students[1]] }] } },
  skills: []
};
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
    await page.addInitScript(() => { sessionStorage.setItem('izone_teacher_token', 'synthetic-distribution-token'); });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.startsWith('/api/teacher/')) {
        let payload = {};
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Giáo viên', role: 'admin', courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Lớp IC2283', courseCode: '34', status: 'on_going' }] };
        else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Bài thi giữa khóa', courseCode: '34', status: 'published' }] };
        else if (path.endsWith('/results')) payload = { assignment: { assignmentId: 'assign-1' }, skills: [], students: [], pagination: { page: 1, totalPages: 1, totalItems: 0, pageSize: 25 } };
        else if (path.endsWith('/report')) payload = report;
        else if (path.endsWith('/items-analysis')) payload = { items: [], summary: {} };
        else if (path.endsWith('/portal-tests')) payload = { tests: [] };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#grading`);
    await page.waitForTimeout(600);
    await page.locator('[data-assessment-tab="distribution"]').click();
    await page.locator('.drilldown-card:visible').waitFor();

    const state = () => page.evaluate(() => {
      const de = document.documentElement;
      const card = [...document.querySelectorAll('.drilldown-card')].find(c => c.getClientRects().length > 0);
      const w = card.querySelector('.drilldown-table-wrapper');
      const emailCell = card.querySelector('.student-email-cell');
      return {
        page: de.scrollWidth - de.clientWidth,
        wrapper: w.scrollWidth - w.clientWidth,
        emailVisible: emailCell.getClientRects().length > 0,
        toggleVisible: !!card.querySelector('.btn-toggle-email')?.getClientRects().length,
        cardRight: Math.round(card.getBoundingClientRect().right),
        vw: de.clientWidth
      };
    });
    let s = await state();
    assert.ok(s.page <= 0, `${width}px: trang cuộn ngang ${s.page}px`);
    const scoreCells = await page.evaluate(() => [...document.querySelectorAll('.drilldown-card .student-score-cell')].filter(c => c.getClientRects().length).map(c => ({ text: c.textContent.trim(), h: Math.round(c.getBoundingClientRect().height), fs: Math.round(parseFloat(getComputedStyle(c).fontSize)), w: Math.round(c.getBoundingClientRect().width) })));
    assert.ok(scoreCells.length >= 3, `${width}px: thiếu ô điểm`);
    const head = await page.evaluate(() => { const th = [...document.querySelectorAll('.drilldown-card th:last-child')].find(e => e.getClientRects().length); const r = th.getBoundingClientRect(); return { text: th.textContent.trim(), h: Math.round(r.height), fs: Math.round(parseFloat(getComputedStyle(th).fontSize)), over: th.scrollWidth - th.clientWidth }; });
    assert.ok(head.h <= head.fs * 1.8 + 20 && head.over <= 0, `${width}px: tiêu đề cột điểm "${head.text}" bị xuống dòng hoặc tràn (cao ${head.h}px)`);
    for (const c of scoreCells) assert.ok(c.h <= c.fs * 1.8 + 20, `${width}px: điểm "${c.text}" bị xuống dòng (cao ${c.h}px, rộng ${c.w}px)`);
    if (mobile) {
      assert.equal(s.toggleVisible, true, `${width}px: thiếu nút bật/tắt email`);
      assert.equal(s.emailVisible, false, `${width}px: email phải thu gọn mặc định`);
      assert.ok(s.wrapper <= 0, `${width}px: bảng drill-down cuộn ngang ${s.wrapper}px khi thu gọn`);
      const btn = await page.locator('.btn-toggle-email:visible').boundingBox();
      assert.ok(btn.height >= 43.5, `${width}px: nút email thấp ${btn.height}px`);
      assert.equal(await page.locator('.btn-toggle-email:visible').textContent(), 'Hiện email');
      await page.locator('.btn-toggle-email:visible').click();
      s = await state();
      assert.equal(s.emailVisible, true, `${width}px: bấm nút không mở rộng được email`);
      assert.equal(await page.locator('.btn-toggle-email:visible').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.btn-toggle-email:visible').textContent(), 'Ẩn email');
      assert.ok(s.page <= 0 && s.wrapper <= 0, `${width}px: mở rộng email gây cuộn ngang (trang ${s.page}, bảng ${s.wrapper})`);
      if (outDir && [320, 390].includes(width)) await page.screenshot({ path: `${outDir}/drilldown-email-open-${width}.png`, fullPage: true });
      await page.locator('.btn-toggle-email:visible').click();
      s = await state();
      assert.equal(s.emailVisible, false, `${width}px: bấm lần hai phải thu gọn lại`);
    } else {
      assert.equal(s.emailVisible, true, 'desktop luôn hiện cột email');
      assert.equal(s.toggleVisible, false, 'desktop phải ẩn nút bật/tắt email');
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('score-distribution-mobile-smoke ok');
} finally {
  await browser?.close();
  server.kill();
}
