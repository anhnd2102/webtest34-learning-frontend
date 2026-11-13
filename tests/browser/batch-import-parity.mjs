// Parity fixture cho studio/batch-import.js: dòng preview CSV (Trắc nghiệm nhóm, Inline Cloze)
// và nút "Chép mẫu" trong hướng dẫn CSV.
//   ARTIFACT_DIR=<dir> [FRONTEND_ROOT=<root>] node tests/browser/batch-import-parity.mjs
//   node tests/browser/grading-modal-parity.mjs --compare <dirBefore> <dirAfter>   (dùng chung bộ so sánh)
// Dữ liệu hoàn toàn tổng hợp; không gọi API thật.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createImportantAudit, importantAuditEnabled } from './helpers/important-audit.mjs';

const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
const root = process.env.FRONTEND_ROOT || fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18332);
const artifacts = process.env.ARTIFACT_DIR;
assert.ok(artifacts, 'ARTIFACT_DIR is required');
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

const multiGroupCsv = '"Which TWO activities are free of charge?","A, C","Swimming pool | Tennis court | Fitness center | Sauna | Yoga class",2';
const clozeCsv = '"The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________.",six | Nassau,1';

const importantAudit = importantAuditEnabled() ? createImportantAudit() : null;
let browser;
try {
  await mkdir(artifacts, { recursive: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  importantAudit?.attach(browser);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      sessionStorage.setItem('izone_teacher_token', 'synthetic-token');
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });
    });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.startsWith('/api/teacher/')) {
        let payload = {};
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [] };
        else if (path.endsWith('/assignments')) payload = { assignments: [] };
        else if (path.endsWith('/course-test-catalog')) payload = { catalog: [] };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html#dashboard`);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent?.length > 0);
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' });
    await page.evaluate(async () => {
      const entry = document.querySelector('script[type="module"][src]').src;
      window.batchApp = await import(new URL('./app.js', entry).href);
    });
    const capture = async (name, selector) => {
      await page.mouse.move(-1, -1);
      await page.evaluate(async () => { await document.fonts.ready; document.activeElement?.blur?.(); });
      const styles = await page.evaluate(sel => {
        const allPropsHash = el => { const cs = getComputedStyle(el); let h = 2166136261; for (const name of [...cs].sort()) { const s = name + ':' + cs.getPropertyValue(name) + ';'; for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619); } } return (h >>> 0).toString(36); };
        const props = ['display', 'position', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'overflow', 'white-space', 'text-transform', 'letter-spacing', 'justify-content', 'align-items', 'gap', 'text-align'];
        const host = document.querySelector(sel);
        return [host, ...host.querySelectorAll('*')].map(el => ({ tag: el.tagName, class: el.getAttribute('class'), styles: Object.fromEntries(props.map(k => [k, getComputedStyle(el).getPropertyValue(k)])), hash: allPropsHash(el) }));
      }, selector);
      await writeFile(`${artifacts}/${viewport.width}-${name}-computed.json`, JSON.stringify(styles));
      await page.locator(selector).first().screenshot({ path: `${artifacts}/${viewport.width}-${name}.png`, animations: 'disabled', caret: 'hide' });
      if (importantAudit) await importantAudit.observe(page, name);
    };
    for (const [name, opener, csv, expectText] of [
      ['preview-multigroup', 'openMultiGroupBatchModal', multiGroupCsv, 'Đ/A đúng'],
      ['preview-cloze', 'openInlineClozeBatchModal', clozeCsv, 'chỗ trống']
    ]) {
      await page.evaluate(fn => batchApp[fn]({}), opener);
      const modal = page.locator('#generic-batch-modal');
      await modal.waitFor({ state: 'visible' });
      await modal.locator('.textarea-batch-csv').fill(csv);
      const row = modal.locator('.generic-layout-preview-row').first();
      await row.waitFor();
      assert.ok((await row.innerText()).includes(expectText), `${name} preview row renders`);
      await page.waitForTimeout(300);
      await capture(name, '#generic-batch-modal');
      await modal.locator('.btn-close-batch-modal-btn').click();
      assert.equal(await modal.isVisible(), false, `${name} modal closes`);
    }
    await page.evaluate(() => batchApp.openCsvQuickGuideModal());
    const guide = page.locator('#modal-csv-quick-guide');
    await guide.waitFor({ state: 'visible' });
    await capture('guide-default', '#modal-csv-quick-guide');
    const copyBtn = guide.locator('.btn-copy-sample').first();
    await copyBtn.scrollIntoViewIfNeeded();
    await copyBtn.click();
    assert.ok((await copyBtn.innerText()).includes('Đã chép'), 'copy button shows the copied state');
    await capture('guide-copied', '#modal-csv-quick-guide');
    await page.waitForFunction(() => !document.querySelector('#modal-csv-quick-guide .btn-copy-sample')?.textContent.includes('Đã chép'), null, { timeout: 4000 });
    await capture('guide-restored', '#modal-csv-quick-guide');
    assert.deepEqual(errors, [], `browser errors at ${viewport.width}`);
    await page.close();
  }
  console.log(`captured to ${artifacts}`);
  if (importantAudit) importantAudit.write(process.env.IMPORTANT_AUDIT_OUT);
} finally {
  await browser?.close();
  server.kill();
}
