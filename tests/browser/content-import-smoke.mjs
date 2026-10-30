// Run manually with an existing Playwright installation; no new project dependency.
// PLAYWRIGHT_MODULE may point to playwright/index.mjs. Evidence is written outside the repo.
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = process.argv[2];
assert.ok(output, 'Pass a screenshot/report directory outside the repository');
await mkdir(output, { recursive: true });
const prefix = '/preview-base/';
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.includes('/api/')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'UNAUTHORIZED' }));
    }
    const relative = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname.slice(1);
    const target = path.resolve(root, relative);
    if (!target.startsWith(root)) { res.writeHead(403); return res.end(); }
    const body = process.env.CSV_BASELINE_REF && relative === 'term-tests/teacher-dashboard/app.js'
      ? execFileSync('git', ['show', `${process.env.CSV_BASELINE_REF}:term-tests/teacher-dashboard/app.js`], { cwd: root, maxBuffer: 2 * 1024 * 1024 })
      : await readFile(target);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': `${mime[path.extname(target)] || 'application/octet-stream'}; charset=utf-8` });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const report = [];
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(10000);
    const screenshot = async state => {
      // Settle the existing modal's delayed focus, then neutralize caret/hover/animation noise.
      await page.waitForTimeout(80);
      await page.mouse.move(0, 0);
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.screenshot({ path: path.join(output, `${width}-${state}.png`), fullPage: true, animations: 'disabled', caret: 'hide' });
    };
    const errors = [];
    const moduleResponses = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (new URL(response.url()).pathname.endsWith('.js')) {
        moduleResponses.push({ path: new URL(response.url()).pathname, status: response.status(), type: response.headers()['content-type'] });
      }
    });
    await page.route('**/*', route => route.request().url().startsWith(origin + '/')
      ? route.continue() : route.abort());
    await page.goto(`${origin}${prefix}term-tests/teacher-dashboard/index.html`);
    await page.evaluate(async () => {
      const script = document.querySelector('script[type="module"][src]');
      await import(script.src);
      const app = await import(new URL('./app.js', script.src).href);
      window.pilotApp = app;
      window.savedDrafts = [];
      document.body.className = '';
      document.body.innerHTML = '<main id="pilot-root"></main>';
      app.clearActiveUnsavedChanges();
      app.renderTestBuilderView(document.querySelector('#pilot-root'), {
        id: '00000000-0000-4000-8000-000000000018', version: 1, status: 'draft',
        title: 'CSV import pilot — dữ liệu tổng hợp',
        publicDefinition: { title: 'CSV import pilot — dữ liệu tổng hợp', durationMinutes: 45,
          blocks: [{ blockId: 'pilot-block', checkpoint: 1, title: 'Phần tổng hợp', items: [],
            exercises: [
              { exerciseId: 'first-exercise', exerciseNumber: 1, title: 'Bài tập đầu', itemIds: [] },
              { exerciseId: 'target-exercise', exerciseNumber: 2, title: 'Bài tập nhập CSV', itemIds: [] }
            ] }]
        }, gradingKey: { items: {}, groups: {} }
      }, { onSaveDraft: async payload => {
        window.savedDrafts.push(JSON.parse(JSON.stringify(payload)));
        return { version: 1 };
      } });
    });
    assert.equal(await page.evaluate(() => window.pilotApp.hasActiveUnsavedChanges()), false);
    await screenshot('builder');
    const button = page.locator('.btn-add-single-choice[data-exercise-id="target-exercise"]');
    await button.click();
    const modal = page.locator('#generic-batch-modal');
    await modal.waitFor({ state: 'visible' });
    await screenshot('modal');

    const downloadPromise = page.waitForEvent('download');
    await modal.locator('.btn-download-template').click();
    const download = await downloadPromise;
    const template = await readFile(await download.path(), 'utf8');
    assert.ok(template.startsWith('\uFEFF'));
    assert.equal(download.suggestedFilename(), 'mau_trac_nghiem_don.csv');

    const textarea = modal.locator('.textarea-batch-csv');
    await textarea.fill('Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer\nThiếu,,,,,');
    await screenshot('error');
    const alertPromise = page.waitForEvent('dialog').then(async dialog => {
      assert.match(dialog.message(), /CSV không hợp lệ/);
      await dialog.accept();
    });
    await modal.locator('.btn-batch-confirm').click();
    await alertPromise;
    assert.equal(await modal.isVisible(), true);
    assert.equal(await page.locator('.builder-item-card').count(), 0);

    const csv = '\uFEFFQuestion_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation,Points\r\n"Bến, cảng?",Có,Không,,,B,Ghi chú,0.5\r\nCâu thứ hai,A,B,C,,C,,2';
    // FileReader path, not just a call to the parser.
    await modal.locator('.input-csv-file').setInputFiles({ name: 'synthetic.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await modal.locator('.csv-preview-summary').filter({ hasText: 'Tìm thấy 2' }).waitFor();
    const scrollChecks = await modal.evaluate(root => {
      const scrollable = [root, ...root.querySelectorAll('*')].filter(element =>
        /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight);
      return scrollable.map(element => {
        element.scrollTop = element.scrollHeight;
        const moved = element.scrollTop > 0;
        element.scrollTop = 0;
        return { className: element.className, moved, restored: element.scrollTop === 0 };
      });
    });
    assert.ok(scrollChecks.every(check => check.moved && check.restored), 'Overflowing modal regions scroll and return to the top');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    assert.ok(await page.evaluate(() => window.scrollY > 0), 'Long builder remains scrollable');
    await textarea.focus();
    await page.keyboard.press('Tab');
    const focusAfterTab = await page.evaluate(() => document.activeElement?.className);
    assert.match(focusAfterTab, /\binput-batch-csv-points\b/, 'Tab reaches the CSV points input');
    await page.keyboard.press('Escape');
    assert.equal(await modal.isVisible(), false);
    assert.equal(await page.locator('.builder-item-card').count(), 0);
    assert.equal(await page.evaluate(() => window.pilotApp.hasActiveUnsavedChanges()), false);

    await button.click();
    await modal.locator('.textarea-batch-csv').fill(csv);
    await modal.locator('.btn-close-batch-modal-btn').click();
    assert.equal(await page.locator('.builder-item-card').count(), 0);
    await button.click();
    await modal.locator('.textarea-batch-csv').fill(csv);
    await modal.locator('.btn-batch-confirm').click();
    assert.equal(await modal.isVisible(), false);
    assert.equal(await page.locator('.builder-item-card[data-exercise-id="target-exercise"]').count(), 2);
    assert.equal(await page.locator('.builder-item-card[data-exercise-id="first-exercise"]').count(), 0);
    assert.equal(await page.evaluate(() => window.pilotApp.hasActiveUnsavedChanges()), true);
    await screenshot('imported');
    await page.locator('#btn-save-draft').click();
    await page.waitForFunction(() => window.savedDrafts.length === 1);
    const payload = await page.evaluate(() => window.savedDrafts[0]);
    assert.deepEqual(payload.blocks[0].items.map(item => ({ prompt: item.prompt, position: item.position, exerciseId: item.exerciseId, maxScore: item.maxScore })), [
      { prompt: 'Bến, cảng?', position: 1, exerciseId: 'target-exercise', maxScore: 0.5 },
      { prompt: 'Câu thứ hai', position: 2, exerciseId: 'target-exercise', maxScore: 2 }
    ]);
    assert.deepEqual(payload.blocks[0].items.map(item => payload.gradingKey.items[item.itemVersionId].expectedOptionId), ['opt_b', 'opt_c']);
    assert.equal(await page.evaluate(() => window.pilotApp.hasActiveUnsavedChanges()), false);
    assert.deepEqual(errors, []);
    assert.ok(moduleResponses.length > 0);
    assert.ok(moduleResponses.every(response => response.status === 200 && response.type.includes('javascript')));
    report.push({ width, height, focusAfterTab, scrollChecks, moduleResponses, assertions: 'passed' });
    await page.close();
  }
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, viewports: report.length, status: 'passed' }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
