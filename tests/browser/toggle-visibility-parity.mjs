// Parity fixture cho các phần tử ẩn/hiện bằng JS trong Test Studio (chuyển display:none inline -> hidden).
// Mỗi nhóm chụp computed style + ảnh ở cả trạng thái đóng và mở, và khẳng định isVisible() từng bước.
//   TOGGLE_GROUPS=vocab[,rubric,...] ARTIFACT_DIR=<dir> [FRONTEND_ROOT=<root>] node tests/browser/toggle-visibility-parity.mjs
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
const groups = (process.env.TOGGLE_GROUPS || 'vocab').split(',');
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

const baseForm = items => ({
  id: 'toggle-form', formVersionId: 'toggle-form', title: 'Synthetic toggle form', status: 'draft', version: 1, durationMinutes: 45,
  blocks: [{ blockId: 'b1', title: 'Synthetic block', checkpoint: 1,
    exercises: [{ exerciseId: 'ex1', exerciseNumber: 1, title: 'Synthetic exercise', itemIds: items.map(i => i.itemVersionId) }],
    items }],
  gradingKey: { items: Object.fromEntries(items.map(i => [i.itemVersionId, { graderType: i.graderType, accepted: [i.targetWord || 'x'], expectedOptionId: 'opt_1' }])), groups: {} }
});
const rubricForm = () => {
  const rubric = { scoringVersion: 'rubric-comprehension-v1', maxScore: 4, criteria: [{ id: 'meaning', label: 'Synthetic meaning', maxScore: 2, requiredConcepts: ['alpha'] }, { id: 'keywords', label: 'Synthetic keywords', maxScore: 2, requiredConcepts: [] }] };
  const item = (id, exerciseId, position, extra = {}) => ({ itemVersionId: id, exerciseId, position, prompt: 'Synthetic comprehension', interactionType: 'long_text', pedagogicalTypeCode: 'writing', graderType: 'rubric_async', maxScore: 4, options: [], ...extra });
  const form = baseForm([item('r1', 'ex1', 1), item('r2', 'ex2', 2), item('r3', 'ex2', 3, { referenceContext: 'Synthetic item-level context.' })]);
  form.blocks[0].exercises = [
    { exerciseId: 'ex1', exerciseNumber: 1, title: 'Synthetic context exercise', referenceContext: 'Synthetic shared context.', itemIds: ['r1'] },
    { exerciseId: 'ex2', exerciseNumber: 2, title: 'Synthetic plain exercise', itemIds: ['r2', 'r3'] }
  ];
  form.gradingKey.items = Object.fromEntries(['r1', 'r2', 'r3'].map(id => [id, { graderType: 'rubric_async', rubricCode: 'rubric_comprehension_v1', rubric: structuredClone(rubric) }]));
  return form;
};
const pictorialForm = () => {
  const item = (id, position, image) => ({ itemVersionId: id, exerciseId: 'ex1', position, prompt: 'Synthetic picture', interactionType: 'short_text', pedagogicalTypeCode: 'pictorial_vocabulary', layoutType: 'pictorial_card', graderType: 'accepted_text', maxScore: 1, options: [], targetWord: 'synthetic', ...(image ? { image } : {}) });
  return baseForm([item('p1', 1, '../webtest-34-demo/assets/03/test-1/pic-2.png'), item('p2', 2, null)]);
};
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
      if (url.pathname.endsWith('/forms/preview-sandbox')) {
        const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
        if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ ok: true, scoreEarned: 1, maxScore: 4, criteria: [{ id: 'meaning', score: 1, maxScore: 2 }], errors: [{ code: 'SYNTHETIC_CODE', message: 'Synthetic error message' }] }) });
      }
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
    if (groups.includes('rubric')) {
      const host = await mount('toggle-rubric', rubricForm());
      const r1 = host.locator('[data-item-id="r1"]');
      const r2 = host.locator('[data-item-id="r2"]');
      const r3 = host.locator('[data-item-id="r3"]');
      // Ngữ cảnh AI: r1 kế thừa từ Bài tập (ẩn), r2 comprehension không có ngữ cảnh (hiện), r3 có ngữ cảnh riêng (hiện).
      await expectVisible(r1.locator('.ai-reference-context-group'), false, 'inherited exercise context hides the item context');
      await expectVisible(r2.locator('.ai-reference-context-group'), true, 'comprehension item without context shows the field');
      await expectVisible(r3.locator('.ai-reference-context-group'), true, 'item with its own context shows the field');
      await capture('rubric-ctx-inherited', r1);
      await capture('rubric-ctx-plain', r2);
      await capture('rubric-ctx-own', r3);
      const pane = name => r1.locator(`.pane-${name}`);
      const tab = name => r1.locator(`.btn-rubric-tab[data-tab="${name}"]`);
      const expectOnly = async which => {
        for (const name of ['criteria', 'guidance', 'sandbox']) await expectVisible(pane(name), name === which, `${name} pane visibility on the ${which} tab`);
      };
      await expectOnly('criteria');
      await tab('guidance').click();
      await expectOnly('guidance');
      await capture('rubric-tab-guidance', r1);
      await tab('sandbox').click();
      await expectOnly('sandbox');
      await expectVisible(r1.locator('.sandbox-results-container'), false, 'sandbox results start hidden');
      await capture('rubric-tab-sandbox', r1);
      await r1.locator('.input-sandbox-sample').fill('Synthetic sample answer');
      await r1.locator('.btn-trigger-sandbox').click();
      await r1.locator('.sandbox-errors-breakdown .error-pill').waitFor();
      await expectVisible(r1.locator('.sandbox-results-container'), true, 'sandbox results show after a run');
      await page.waitForTimeout(200);
      await capture('rubric-sandbox-results', r1);
      await tab('criteria').click();
      await expectOnly('criteria');
      await capture('rubric-tab-criteria', r1);
      await tab('sandbox').click();
      await expectOnly('sandbox');
      await expectVisible(r1.locator('.sandbox-results-container'), true, 'sandbox results persist across tab switches');
      await page.evaluate(() => { window['toggle-rubricHandle'].dispose?.(); });
    }
    if (groups.includes('pictorial')) {
      const host = await mount('toggle-pictorial', pictorialForm());
      const good = '../webtest-34-demo/assets/03/test-1/pic-2.png';
      const bad = '../webtest-34-demo/assets/03/test-1/missing-image.png';
      const settled = locator => locator.evaluate(img => img.complete || new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); }));
      const p1 = host.locator('[data-item-id="p1"]');
      const p2 = host.locator('[data-item-id="p2"]');
      const state = card => ({ img: card.locator('.pictorial-preview-img'), err: card.locator('.pictorial-preview-error'), input: card.locator('.input-pictorial-image'), btn: card.locator('.btn-preview-drive-image') });
      const a = state(p1), b = state(p2);
      await settled(a.img);
      await expectVisible(a.img, true, 'item with an image starts with the preview visible');
      await expectVisible(a.err, false, 'no error badge initially');
      await expectVisible(b.img, false, 'item without an image starts with the preview hidden');
      // Hành vi có sẵn (giữ nguyên, không sửa trong đợt này): <img src=""> phát sự kiện error nên huy hiệu lỗi hiện cả khi chưa có ảnh.
      await b.err.waitFor({ state: 'visible' });
      await expectVisible(b.err, true, 'existing behaviour: an empty src fires onerror and shows the badge');
      await capture('pictorial-with-image', p1);
      await capture('pictorial-no-image', p2);
      // Nhập URL hợp lệ vào câu chưa có ảnh: ảnh hiện sau khi tải.
      await b.input.fill(good);
      await settled(b.img);
      await expectVisible(b.img, true, 'a valid URL shows the preview');
      await expectVisible(b.err, false, 'no error badge for a valid URL');
      await capture('pictorial-typed-valid', p2);
      // URL lỗi: onerror ẩn ảnh và hiện huy hiệu lỗi.
      await b.input.fill(bad);
      await b.err.waitFor({ state: 'visible' });
      await expectVisible(b.img, false, 'a broken URL hides the preview');
      await expectVisible(b.err, true, 'a broken URL shows the error badge');
      await capture('pictorial-typed-broken', p2);
      // Xóa URL: ảnh ẩn (huy hiệu lỗi: xem ghi chú hành vi có sẵn bên dưới).
      await b.input.fill('');
      await expectVisible(b.img, false, 'clearing the URL hides the preview');
      // Cùng hành vi có sẵn: JS đặt src = '' nên onerror chạy ngay sau đó và hiện lại huy hiệu lỗi.
      await b.err.waitFor({ state: 'visible' });
      await expectVisible(b.err, true, 'existing behaviour: clearing the URL sets an empty src, so onerror shows the badge');
      await capture('pictorial-cleared', p2);
      // Nút xem trước với URL hợp lệ.
      await b.input.fill(good);
      await b.input.fill('');
      await b.input.evaluate((el, value) => { el.value = value; }, good);
      await b.btn.click();
      await settled(b.img);
      await expectVisible(b.img, true, 'the preview button shows a valid image');
      await expectVisible(b.err, false, 'the preview button leaves no error badge');
      await capture('pictorial-preview-button', p2);
      await page.evaluate(() => { window['toggle-pictorialHandle'].dispose?.(); });
    }
    assert.deepEqual(errors, [], `browser errors at ${viewport.width}`);
    await page.close();
  }
  console.log(`captured to ${artifacts} (${groups.join(',')})`);
} finally {
  await browser?.close();
  server.kill();
}
