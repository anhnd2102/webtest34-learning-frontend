// Smoke di động: thẻ bài đang chọn không tràn khung, Phòng thi hiện thẻ thay vì bảng cuộn ngang. API giả, không chạm production.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = 18331;
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const students = [
  { studentRef: 's1', name: 'Nguyễn Văn An', status: 'in_progress', progress: { answered: 3, total: 40 }, connectionStatus: 'connected', incidentCount: 0 },
  { studentRef: 's2', name: 'Trần Thị Bình', status: 'in_progress', progress: { answered: 12, total: 40 }, connectionStatus: 'disconnected', incidentCount: 2, openIncidents: [{}] },
  { studentRef: 's3', name: 'Lê Hoàng Cường', status: 'not_entered', progress: null, connectionStatus: 'unknown', incidentCount: 0 }
];
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Static server startup timed out')), 5000);
    server.once('error', reject);
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timeout); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const outDir = process.env.MOBILE_SHOTS;
  if (outDir) await mkdir(outDir, { recursive: true });
  for (const [role, width] of ['admin', 'lead'].flatMap(role => [320, 360, 390, 412, 768, 1024].map(width => [role, width]))) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, hasTouch: width < 640 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      sessionStorage.setItem('izone_teacher_token', 'synthetic-mobile-token');
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, options = {}) => {
        const url = new URL(String(input), location.href);
        if (!url.pathname.endsWith('/exam/events')) return nativeFetch(input, options);
        return Promise.resolve(new Response(new ReadableStream({ start() {} }), { headers: { 'Content-Type': 'text/event-stream' } }));
      };
    });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/teacher/')) {
        const path = url.pathname;
        let payload = {};
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Giáo viên', role, courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Lớp thử', courseCode: '34', status: 'on_going' }] };
        else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', title: 'Bài thi giữa khóa', courseCode: '34', examMode: true, status: 'published' }] };
        else if (path.endsWith('/results')) payload = { assignment: { assignmentId: 'assign-1' }, skills: [], students: [] };
        else if (path.endsWith('/portal-tests')) payload = { tests: [] };
        else if (path.endsWith('/exam/room')) payload = { room: { status: 'running', readyCount: 2, totalCount: 3, students } };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#dashboard`);
    await page.locator('#selected-assignment-card').waitFor({ state: 'visible' });
    const nav = await page.evaluate(() => { const c = document.querySelector('.navbar-container'); const cs = getComputedStyle(c); const box = c.getBoundingClientRect(); const logout = document.querySelector('#logout-btn').getBoundingClientRect(); return { padRight: parseFloat(cs.paddingRight), contentRight: box.right - parseFloat(cs.paddingRight), logoutRight: logout.right, scroll: c.scrollWidth - c.clientWidth }; });
    assert.ok(nav.logoutRight <= nav.contentRight + 0.5 && nav.scroll <= 0, `${role} ${width}px: nút Đăng xuất vượt navbar-container (phải ${Math.round(nav.logoutRight)} > ${Math.round(nav.contentRight)})`);
    await page.locator('#role-info-btn').click();
    const pop = await page.locator('#role-capabilities-popover').boundingBox();
    assert.ok(pop && pop.x >= -0.5 && pop.x + pop.width <= width + 0.5 && pop.y >= -0.5 && pop.y + pop.height <= 800 + 0.5, `${role} ${width}px: popover vai trò tràn màn hình (${JSON.stringify(pop)})`);
    await page.locator('#close-role-popover').click();
    const toolbarOverflow = await page.evaluate(() => { const t = document.querySelector('.control-toolbar'); return t.scrollWidth - t.clientWidth; });
    assert.ok(toolbarOverflow <= 0, `${role} ${width}px: control-toolbar tràn ${toolbarOverflow}px`);
    const card = await page.locator('#selected-assignment-card').boundingBox();
    const inside = async selector => {
      const box = await page.locator(selector).first().boundingBox();
      return !box || (box.x >= card.x - 0.5 && box.x + box.width <= card.x + card.width + 0.5);
    };
    if (await page.locator('#self-proctoring-save').isVisible()) {
      assert.ok(await inside('#self-proctoring-save'), `${role} ${width}px: nút Lưu tràn khỏi thẻ`);
      assert.ok(await inside('#self-proctoring-controls'), `${role} ${width}px: khối Tự giám sát tràn khỏi thẻ`);
    }
    await page.locator('#exam-room-open').click();
    await page.locator('#exam-room-students tr').first().waitFor();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const offenders = overflow > 0 ? await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5 && el.getClientRects().length).slice(0, 6).map(el => `${el.tagName.toLowerCase()}#${el.id}.${String(el.className).slice(0, 40)}`)) : [];
    assert.ok(overflow <= 0, `${role} ${width}px: trang cuộn ngang ${overflow}px: ${offenders.join(' | ')}`);
    const scroller = await page.evaluate(() => { const s = document.querySelector('#exam-room .results-scroll'); return s.scrollWidth - s.clientWidth; });
    if (width <= 640) {
      assert.ok(scroller <= 0, `${role} ${width}px: bảng Phòng thi vẫn cuộn ngang ${scroller}px`);
      assert.equal(await page.locator('#exam-room thead').isVisible(), false, `${role} ${width}px: còn hiện tiêu đề bảng`);
      const tops = await page.evaluate(() => [...document.querySelectorAll('#exam-room-students tr')].map(tr => [tr.innerText.split(String.fromCharCode(10))[0], tr.getBoundingClientRect().top]));
      tops.sort((x, y) => x[1] - y[1]);
      assert.match(tops[0][0], /Trần Thị Bình/, `${role} ${width}px: học viên có sự cố phải đứng đầu, thực tế ${tops[0][0]}`);
    }
    assert.deepEqual(errors, []);
    if (outDir) await page.screenshot({ path: `${outDir}/mobile-${width}.png`, fullPage: true });
    await page.close();
  }
  console.log('dashboard-mobile-smoke ok');
} finally {
  await browser?.close();
  server.kill();
}
