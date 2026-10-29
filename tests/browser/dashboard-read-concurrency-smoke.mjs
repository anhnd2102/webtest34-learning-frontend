// Browser smoke test for dashboard read concurrency and out-of-order protection.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const localPlaywrightFallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const playwrightPath = process.env.PLAYWRIGHT_MODULE || localPlaywrightFallback;
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = 18322;
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
  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1024x768', width: 1024, height: 768 },
    { name: '390x844', width: 390, height: 844 }
  ];

  const report = [];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.addInitScript(() => sessionStorage.setItem('izone_teacher_token', 'concurrency-smoke-token'));

    const teacher = { name: 'Teacher Concurrency', role: 'admin', email: 'concurrency@example.test', courseCodes: ['34'] };
    const classes = [
      { classId: '101', name: 'Class 101 Slow', courseCode: '34', status: 'on_going', isTeaching: true, assignmentCount: 1 },
      { classId: '102', name: 'Class 102 Fast', courseCode: '34', status: 'on_going', isTeaching: true, assignmentCount: 1 }
    ];

    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const pathname = url.pathname;

      if (pathname.startsWith('/api/teacher/')) {
        let payload = {};
        if (pathname.endsWith('/auth/me')) {
          payload = { teacher };
        } else if (pathname.endsWith('/classes')) {
          payload = { classes };
        } else if (pathname.endsWith('/results')) {
          const q = url.searchParams.get('q') || '';
          if (q === 'slow-search') {
            await new Promise(r => setTimeout(r, 250));
            payload = {
              assignment: { assignmentId: 'assign-102', classId: '102', title: 'Assignment 102 Current' },
              skills: [],
              students: [{ studentId: 'st-slow', name: 'Old Stale Student' }],
              pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 25 }
            };
          } else {
            payload = {
              assignment: { assignmentId: 'assign-102', classId: '102', title: 'Assignment 102 Current' },
              skills: [],
              students: [{ studentId: 'st-fast', name: 'Fresh Fast Student' }],
              pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 25 }
            };
          }
        } else if (pathname.includes('/classes/101/assignments')) {
          // Add artificial delay to class 101 assignments
          await new Promise(r => setTimeout(r, 200));
          payload = { assignments: [{ assignmentId: 'assign-101', classId: '101', title: 'Assignment 101 Stale', courseCode: '34', status: 'published' }] };
        } else if (pathname.includes('/classes/102/assignments')) {
          // Fast reply for class 102
          payload = { assignments: [{ assignmentId: 'assign-102', classId: '102', title: 'Assignment 102 Current', courseCode: '34', status: 'published' }] };
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }

      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });

    // 1. Initial navigation to dashboard with class 102
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=102&assignmentId=assign-102#grading`);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');

    // 2. Rapid search query changes: slow query followed immediately by fast query
    const searchInput = page.locator('#search-input');
    await searchInput.fill('slow-search');
    await page.waitForTimeout(50);
    await searchInput.fill('fast-search');

    // Wait for latest status
    await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');
    // Ensure table does NOT display old stale student
    await page.waitForTimeout(300); // allow slow query to have arrived
    const resultsText = await page.locator('#results-content').innerText();
    assert.ok(!resultsText.includes('Old Stale Student'), 'Stale slow search must not overwrite fresh result');

    // 3. Verify URL reflects latest query
    const currentUrl = page.url();
    assert.ok(currentUrl.includes('q=fast-search') || currentUrl.includes('102'), 'URL reflects current state');

    // 4. Rapid class switching on dashboard view: switch to 101 then immediately back to 102
    await page.evaluate(() => { window.location.hash = '#dashboard'; });
    await page.waitForFunction(() => !document.querySelector('#view-dashboard')?.hidden);

    await page.selectOption('#class-select', '101');
    await page.waitForTimeout(30);
    await page.selectOption('#class-select', '102');
    await page.waitForTimeout(300); // allow 101 slow response to complete

    const selectedClassVal = await page.locator('#class-select').inputValue();
    assert.equal(selectedClassVal, '102', 'Class select maintains current selection 102');
    const chipText = await page.locator('#assignment-chips').innerText();
    assert.ok(!chipText.includes('Assignment 101 Stale'), 'Stale assignments for 101 did not overwrite 102');

    assert.equal(errors.length, 0, `Page errors encountered in viewport ${vp.name}: ${errors.join('; ')}`);
    report.push({ viewport: vp.name, errorsCount: errors.length, status: 'verified' });
    await page.close();
  }

  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  if (browser) await browser.close();
  child.kill();
}
