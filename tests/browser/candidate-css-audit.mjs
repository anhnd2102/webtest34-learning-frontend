// Đo vai trò của từng khai báo `!important` trong term-tests/webtest-34-demo/dynamic-test.css (giao diện học viên)
// và chụp computed style trước/sau khi chỉnh CSS.
//   IMPORTANT_AUDIT_OUT=<file.json> [CAPTURE_COMPUTED=1 ARTIFACT_DIR=<dir>] node tests/browser/candidate-css-audit.mjs
// Dùng lại shell thi thật và API giả của candidate-mobile-smoke; mỗi viewport đi qua các trạng thái: màn bắt đầu, từng phần
// của bài thi (đủ dạng câu), cỡ chữ, bảng điều hướng trên điện thoại, hộp xác nhận nộp bài và sau khi nộp.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

process.env.PLAYWRIGHT_MODULE ||= 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { openExamShell, openStartScreen, VIEWPORTS } = await import('./candidate-mobile-smoke.mjs');
const { createImportantAudit, importantAuditEnabled } = await import('./helpers/important-audit.mjs');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18322;
const artifactDir = process.env.ARTIFACT_DIR;
const captureComputed = process.env.CAPTURE_COMPUTED === '1';
if (captureComputed && !artifactDir) throw new Error('ARTIFACT_DIR is required with CAPTURE_COMPUTED=1');

const audit = importantAuditEnabled()
  ? createImportantAudit({ stylesDir: fileURLToPath(new URL('../../term-tests/webtest-34-demo/', import.meta.url)), filter: /^dynamic-test\.css$/, sheetSuffix: '/dynamic-test.css' })
  : null;

const child = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  audit?.attach(browser);
  if (artifactDir) await mkdir(artifactDir, { recursive: true });

  const snapshot = async (page, viewport, state) => {
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' }).catch(() => {});
    await page.evaluate(async () => { await document.fonts.ready; document.activeElement?.blur?.(); window.scrollTo(0, 0); });
    await page.waitForTimeout(150);
    if (audit) await audit.observe(page, state);
    if (captureComputed) {
      const styles = await page.evaluate(() => {
        const hashAll = el => { const cs = getComputedStyle(el); let h = 2166136261; for (const name of [...cs].sort()) { const s = name + ':' + cs.getPropertyValue(name) + ';'; for (let j = 0; j < s.length; j++) { h ^= s.charCodeAt(j); h = Math.imul(h, 16777619); } } return (h >>> 0).toString(36); };
        const properties = ['display', 'position', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'overflow', 'z-index', 'box-shadow', 'fill', 'outline', 'outline-offset', 'transform', 'cursor', 'text-decoration', 'opacity', 'visibility', 'flex', 'gap', 'grid-template-columns'];
        return Array.from(document.body.querySelectorAll('*')).map(el => ({ tag: el.tagName, id: el.id, class: el.getAttribute('class'), styles: Object.fromEntries(properties.map(key => [key, getComputedStyle(el).getPropertyValue(key)])), hash: hashAll(el) }));
      });
      await writeFile(join(artifactDir, `${viewport.width}-${state}-computed.json`), JSON.stringify(styles));
    }
  };
  const clickDom = (page, selector) => page.evaluate(s => document.querySelector(s)?.click(), selector);

  for (const viewport of VIEWPORTS) {
    const touch = viewport.width < 768 ? { hasTouch: true, isMobile: true } : {};

    // Màn bắt đầu
    const start = await openStartScreen(browser, viewport, touch);
    await snapshot(start, viewport, 'start');
    await start.close();

    // Bài thi: lần lượt từng phần
    const page = await openExamShell(browser, viewport, touch);
    const sectionCount = await page.evaluate(() => document.querySelectorAll('.cbt-nav-pill').length);
    for (let index = 0; index < sectionCount; index++) {
      await page.evaluate(i => document.querySelectorAll('.cbt-nav-pill')[i].click(), index);
      await page.waitForTimeout(120);
      await snapshot(page, viewport, `section-${index}`);
    }
    await page.evaluate(() => document.querySelectorAll('.cbt-nav-pill')[0]?.click());

    // Một vài đáp án: trạng thái đã trả lời
    await page.locator('input[type="radio"][data-item-id="it-1"]').first().check({ force: true }).catch(() => {});
    await page.locator('input[data-item-id="it-2"]').first().fill('Synthetic').catch(() => {});
    await snapshot(page, viewport, 'answered');

    // Cỡ chữ lớn nhất/nhỏ nhất
    await clickDom(page, '#demo-font-up');
    await clickDom(page, '#demo-font-up');
    await snapshot(page, viewport, 'font-up');
    await clickDom(page, '#demo-font-down');
    await clickDom(page, '#demo-font-down');
    await clickDom(page, '#demo-font-down');
    await snapshot(page, viewport, 'font-down');
    await clickDom(page, '#demo-font-up');

    // Bảng điều hướng trên điện thoại/máy tính bảng
    if (viewport.width < 1024) {
      await page.evaluate(() => document.querySelector('#cbt-bar-count')?.click());
      await page.waitForTimeout(150);
      await snapshot(page, viewport, 'sheet-open');
      await page.evaluate(() => document.querySelector('.cbt-sheet-close')?.click());
    }

    // Hộp xác nhận nộp bài và sau khi nộp
    await clickDom(page, '#demo-submit-top');
    await page.locator('#demo-confirm-submit').waitFor({ state: 'visible' }).catch(() => {});
    await snapshot(page, viewport, 'confirm-dialog');
    await clickDom(page, '#demo-confirm-submit');
    await page.waitForFunction(() => /Nộp bài thành công/.test(document.querySelector('#demo-result')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
    await snapshot(page, viewport, 'submitted');
    await page.close();
  }
  if (audit) audit.write(process.env.IMPORTANT_AUDIT_OUT);
  process.stdout.write(JSON.stringify({ status: 'passed', viewports: VIEWPORTS.length }) + '\n');
} finally {
  if (browser) await browser.close();
  child.kill();
}
