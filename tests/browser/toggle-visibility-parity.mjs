// Parity fixture cho các phần tử ẩn/hiện bằng JS trong Test Studio (chuyển display:none inline -> hidden).
// Mỗi nhóm chụp computed style + ảnh ở cả trạng thái đóng và mở, và khẳng định isVisible() từng bước.
//   GROUPS=vocab[,rubric,...] ARTIFACT_DIR=<dir> [FRONTEND_ROOT=<root>] node tests/browser/toggle-visibility-parity.mjs
//   node tests/browser/grading-modal-parity.mjs --compare <dirBefore> <dirAfter>   (dùng chung bộ so sánh)
// Dữ liệu hoàn toàn tổng hợp; không gọi API thật. Chạy cùng một kịch bản trên baseline và sau thay đổi.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
const root = process.env.FRONTEND_ROOT || fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18333);
const artifacts = process.env.ARTIFACT_DIR;
assert.ok(artifacts, 'ARTIFACT_DIR is required');
const groups = (process.env.GROUPS || 'vocab').split(',');
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

const baseForm = items => ({
  id: 'toggle-form', formVersionId: 'toggle-form', title: 'Synthetic toggle form', status: 'draft', version: 1, durationMinutes: 45,
  blocks: [{ blockId: 'b1', title: 'Synthetic block', checkpoint: 1,
    exercises: [{ exerciseId: 'ex1', exerciseNumber: 1, title: 'Synthetic exercise', itemIds: items.map(i => i.itemVersionId) }],
    items }],
  gradingKey: { items: Object.fromEntries(items.map(i => [i.itemVersionId, { graderType: i.graderType, accepted: [i.targetWord || 'x'], expectedOptionId: 'opt_1' }])), groups: {} }
});
const vocabItems = () => ['v1', 'v2'].map((id, index) => ({
  itemVersionId: id, exerciseId: 'ex1', position: index + 1, prompt: 'Synthetic vocabulary', targetWord: index ? 'second-word' : 'full-time',
  interactionType: 'text_select_pair', graderType: 'accepted_text_exact_option', maxScore: 1,
  options: ['one', 'two', 'three'].map((label, option) => ({ id: `opt_${option + 1}`, label: `Synthetic ${label}` }))
}));

let browser;
try {
  await mkdir(artifacts, { recursive: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => sessionStorage.setItem('izone_teacher_token', 'synthetic-token'));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/teacher/')) {
        let payload = {};
        if (url.pathname.endsWith('/auth/me')) payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
        else if (url.pathname.endsWith('/classes')) payload = { classes: [] };
        else if (url.pathname.endsWith('/assignments')) payload = { assignments: [] };
        else if (url.pathname.endsWith('/course-test-catalog')) payload = { catalog: [] };
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
      window.toggleApp = await import(new URL('./app.js', entry).href);
    });
    const mount = async (id, form) => {
      await page.evaluate(({ id, form }) => {
        const host = document.createElement('section'); host.id = id; document.body.prepend(host);
        window[`${id}Handle`] = toggleApp.mountBuilder(host, form);
      }, { id, form });
      return page.locator(`#${id}`);
    };
    const capture = async (name, locator) => {
      await page.mouse.move(-1, -1);
      await page.evaluate(async () => { await document.fonts.ready; document.activeElement?.blur?.(); });
      const handle = await locator.elementHandle();
      const styles = await page.evaluate(host => {
        const props = ['display', 'position', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'overflow', 'visibility', 'flex-direction', 'justify-content', 'align-items', 'gap', 'text-align', 'object-fit'];
        return [host, ...host.querySelectorAll('*')].map(el => ({ tag: el.tagName, class: el.getAttribute('class'), styles: Object.fromEntries(props.map(k => [k, getComputedStyle(el).getPropertyValue(k)])) }));
      }, handle);
      await writeFile(`${artifacts}/${viewport.width}-${name}-computed.json`, JSON.stringify(styles));
      await locator.screenshot({ path: `${artifacts}/${viewport.width}-${name}.png`, animations: 'disabled', caret: 'hide' });
    };
    const expectVisible = async (locator, expected, message) => assert.equal(await locator.isVisible(), expected, message);

    if (groups.includes('vocab')) {
      const host = await mount('toggle-vocab', baseForm(vocabItems()));
      const card = host.locator('[data-item-id="v1"]');
      const bank = card.locator('.vocab-bank-collapsible');
      const bulk = card.locator('.vocab-bulk-paste-panel');
      await expectVisible(bank, false, 'bank starts closed');
      await expectVisible(bulk, false, 'bulk panel starts closed');
      await capture('vocab-closed', card);
      await card.locator('.btn-toggle-vocab-bank').click();
      await expectVisible(bank, true, 'bank opens');
      await capture('vocab-bank-open', card);
      await card.locator('.btn-bulk-paste-vocab-options').click();
      await expectVisible(bulk, true, 'bulk panel opens');
      assert.equal(await bulk.locator('.input-bulk-vocab-options').evaluate(el => el === document.activeElement), true, 'bulk textarea gets focus when opened');
      await capture('vocab-bulk-open', card);
      await card.locator('.btn-bulk-paste-vocab-options').click();
      await expectVisible(bulk, false, 'bulk button toggles the panel closed');
      await card.locator('.btn-bulk-paste-vocab-options').click();
      await expectVisible(bulk, true, 'bulk panel reopens');
      await card.locator('.btn-cancel-bulk-vocab-options').click();
      await expectVisible(bulk, false, 'cancel closes the bulk panel');
      await card.locator('.btn-toggle-vocab-bank').click();
      await expectVisible(bank, false, 'bank closes');
      await capture('vocab-closed-again', card);
      // Bank panel hiển thị lại sau khi bank đã đóng/mở lần hai (kiểm đối xứng toggle).
      await card.locator('.btn-toggle-vocab-bank').click();
      await expectVisible(bank, true, 'bank reopens');
      await page.evaluate(() => { window['toggle-vocabHandle'].dispose?.(); });
    }
    assert.deepEqual(errors, [], `browser errors at ${viewport.width}`);
    await page.close();
  }
  console.log(`captured to ${artifacts} (${groups.join(',')})`);
} finally {
  await browser?.close();
  server.kill();
}
