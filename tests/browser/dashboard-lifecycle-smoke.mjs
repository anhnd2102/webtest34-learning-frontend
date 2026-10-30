// Run manually with an existing Playwright installation and Chrome; no live backend.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = 18320;
const child = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
});
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Static server startup timed out')), 5000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Static server exited: ${code}`)); });
    child.stdout.on('data', data => {
      if (String(data).includes(`:${port}/`)) { clearTimeout(timeout); resolve(); }
    });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = [];
  for (const prefix of ['', '/preview-base']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    const reads = { me: 0, classes: 0, assignments: 0, results: 0 };
    const modules = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (new URL(response.url()).pathname.endsWith('.js')) modules.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
    });
    await page.addInitScript(() => sessionStorage.setItem('izone_teacher_token', 'synthetic-lifecycle-session'));
    const teacher = { name: 'Synthetic Teacher', role: 'admin', email: 'fixture@example.test', courseCodes: ['34'] };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const pathname = url.pathname.replace('/preview-base', '');
      if (pathname.startsWith('/api/teacher/')) {
        let payload;
        if (pathname.endsWith('/auth/me')) { reads.me++; payload = { teacher }; }
        else if (pathname.endsWith('/classes')) { reads.classes++; payload = { classes: [{ classId: '101', name: 'Synthetic 34', courseCode: '34', status: 'on_going', isTeaching: true, assignmentCount: 1 }] }; }
        else if (pathname.endsWith('/assignments')) { reads.assignments++; payload = { assignments: [{ assignmentId: 'fixture-assignment', classId: '101', title: 'Synthetic assignment', courseCode: '34', status: 'published', examMode: false }] }; }
        else if (pathname.endsWith('/results')) { reads.results++; payload = { assignment: { assignmentId: 'fixture-assignment', classId: '101', title: 'Synthetic assignment', courseCode: '34' }, skills: [], students: [], pagination: { page: 1, totalPages: 1, totalItems: 0, pageSize: 25 } }; }
        else payload = {};
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      if (prefix && url.pathname.startsWith(prefix + '/')) {
        const response = await route.fetch({ url: url.href.replace('/preview-base/', '/') });
        return route.fulfill({ response });
      }
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}${prefix}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=fixture-assignment&q=synthetic#grading`);
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Đã cập nhật bảng kết quả');
    assert.equal(reads.me, 1);
    assert.equal(reads.classes, 1);
    assert.equal(await page.locator('#class-select').inputValue(), '101');
    assert.equal(await page.locator('#assignment-select').inputValue(), 'fixture-assignment');
    assert.equal(await page.locator('#search-input').inputValue(), 'synthetic');
    assert.equal(await page.locator('#view-grading').isVisible(), true);
    await page.evaluate(async () => {
      const entry = document.querySelector('script[type="module"][src]').src;
      const { mountDashboard } = await import(new URL('./shell/dashboard.js', entry).href);
      window.mountPilotDashboard = mountDashboard;
      window.pilotHandle = mountDashboard(document);
      window.pilotForeignClicks = 0;
      document.querySelector('#toggle-fixture-btn').addEventListener('click', () => window.pilotForeignClicks++);
      sessionStorage.setItem('unrelated-fixture-value', 'preserve');
    });
    assert.equal(reads.me, 1, 'getting the existing mount does not restore the session twice');
    assert.equal(reads.classes, 1);
    for (let cycle = 0; cycle < 10; cycle++) {
      await page.evaluate(() => {
        if (window.mountPilotDashboard(document) !== window.pilotHandle) throw new Error('Duplicate mount handle');
        const form = document.querySelector('#identity-form');
        const toggle = document.querySelector('#toggle-fixture-btn');
        const before = form.hidden;
        toggle.click();
        if (form.hidden !== !before) throw new Error('Shell toggle ran more than once');
        window.pilotHandle.dispose();
        window.pilotHandle.dispose();
        const after = form.hidden;
        toggle.click();
        if (form.hidden !== after) throw new Error('Disposed listener is still active');
        if (sessionStorage.getItem('unrelated-fixture-value') !== 'preserve') throw new Error('Cleanup cleared unrelated storage');
      });
      const previousReads = reads.results;
      await page.evaluate(() => { window.pilotHandle = window.mountPilotDashboard(document); });
      await page.waitForFunction(() => document.querySelector('#status').textContent === 'Đã cập nhật bảng kết quả');
      await page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/results')).catch(() => {
        // The request may have completed before waitForResponse was registered; counters below are authoritative.
        assert.ok(reads.results > previousReads);
      });
      assert.equal(reads.me, cycle + 2, 'exactly one session restore per fresh mount');
      assert.equal(reads.classes, cycle + 2);
    }
    assert.equal(await page.evaluate(() => window.pilotForeignClicks), 20);
    await page.evaluate(() => window.pilotHandle.dispose());
    assert.deepEqual(errors, []);
    assert.ok(modules.some(response => response.url.includes('/main.js')));
    assert.ok(modules.some(response => response.url.includes('/shell/dashboard.js')));
    assert.ok(modules.every(response => response.status === 200 && response.type.includes('javascript')));
    report.push({ prefix: prefix || '/', cycles: 10, reads, pageErrors: errors.length, javascriptModules: modules.length });
    await page.close();
  }
  console.log(JSON.stringify({ status: 'passed', report }));
} finally {
  await browser?.close();
  child.kill();
}
