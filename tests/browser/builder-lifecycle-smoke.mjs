// Run manually with an existing Playwright installation and Chrome; no live backend.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const localPlaywrightFallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const playwrightPath = process.env.PLAYWRIGHT_MODULE || localPlaywrightFallback;
const { chromium } = await import(pathToFileURL(playwrightPath).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = 18321;
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

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(10000);
    const errors = [];
    const modules = [];

    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (new URL(response.url()).pathname.endsWith('.js')) {
        modules.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
      }
    });

    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });

    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html`);

    await page.evaluate(async () => {
      const script = document.querySelector('script[type="module"][src]');
      await import(script.src);
      const app = await import(new URL('./app.js', script.src).href);
      const builder = await import(new URL('./studio/builder.js', script.src).href);

      window.smokeApp = app;
      window.smokeBuilder = builder;
      window.backEvents = 0;
      window.savedDrafts = [];

      document.body.className = '';
      document.body.innerHTML = '<main id="builder-smoke-root" style="padding: 16px;"></main>';

      const rootEl = document.querySelector('#builder-smoke-root');
      window.smokeHandle = builder.mountBuilder(rootEl, {
        id: 'smoke-form-001',
        version: 1,
        status: 'draft',
        title: 'Smoke Test Form',
        blocks: [
          {
            blockId: 'b1',
            checkpoint: 1,
            title: 'Block 1',
            exercises: [
              { exerciseId: 'ex1', exerciseNumber: 1, title: 'Exercise 1', itemIds: ['i1'] }
            ],
            items: [
              {
                itemVersionId: 'i1',
                exerciseId: 'ex1',
                prompt: 'Original prompt',
                interactionType: 'single_choice',
                graderType: 'exact_option',
                options: [{ id: 'A', label: 'Opt A' }, { id: 'B', label: 'Opt B' }],
                maxScore: 1
              }
            ]
          }
        ],
        gradingKey: { items: { i1: { expectedOptionId: 'A' } } }
      }, {
        onBack: () => { window.backEvents++; },
        onSaveDraft: async (p) => { window.savedDrafts.push(p); return { version: 1 }; }
      });
    });

    // Check initially not dirty
    assert.equal(await page.evaluate(() => window.smokeHandle.hasUnsavedChanges()), false);
    assert.equal(await page.evaluate(() => window.smokeApp.hasActiveUnsavedChanges()), false);

    // Idempotent mount check: calling mountBuilder again on same root returns same handle
    const isSameHandle = await page.evaluate(() => {
      const rootEl = document.querySelector('#builder-smoke-root');
      const draft = window.smokeHandle.getDraft();
      const secondHandle = window.smokeBuilder.mountBuilder(rootEl, draft);
      return secondHandle === window.smokeHandle;
    });
    assert.equal(isSameHandle, true, 'Duplicate mount on same root returns same active handle');

    // Simulate user editing prompt to mark dirty
    const promptInput = page.locator('.item-prompt-input').first();
    await promptInput.fill('Updated prompt by smoke test');
    await promptInput.dispatchEvent('input');

    // Check dirty state
    assert.equal(await page.evaluate(() => window.smokeHandle.hasUnsavedChanges()), true);
    assert.equal(await page.evaluate(() => window.smokeApp.hasActiveUnsavedChanges()), true);
    const statusMsg = page.locator('#builder-status-msg');
    await statusMsg.waitFor({ state: 'visible' });
    assert.ok(await statusMsg.textContent().then(t => t.includes('chưa lưu')));

    // Click Back button: should trigger unsaved changes confirmation modal
    const backBtn = page.locator('#btn-back-to-catalog');
    await backBtn.click();

    const unsavedModal = page.locator('#modal-unsaved-changes');
    await unsavedModal.waitFor({ state: 'visible' });

    // Test Stay: clicking stay must keep builder dirty and not call onBack
    const stayBtn = unsavedModal.locator('#btn-stay-editing');
    await stayBtn.click();
    await unsavedModal.waitFor({ state: 'detached' });

    assert.equal(await page.evaluate(() => window.backEvents), 0, 'onBack not called after staying');
    assert.equal(await page.evaluate(() => window.smokeHandle.hasUnsavedChanges()), true, 'Still dirty after stay');

    // Click Back again -> Discard
    await backBtn.click();
    await page.locator('#modal-unsaved-changes').waitFor({ state: 'visible' });
    const discardBtn = page.locator('#btn-discard-and-leave');
    await discardBtn.click();
    await page.locator('#modal-unsaved-changes').waitFor({ state: 'detached' });

    assert.equal(await page.evaluate(() => window.backEvents), 1, 'onBack called after discard');
    assert.equal(await page.evaluate(() => window.smokeApp.hasActiveUnsavedChanges()), false, 'Guard cleared after discard');

    // 10 Remount / Dispose cycles in browser
    for (let c = 0; c < 10; c++) {
      await page.evaluate((cycle) => {
        const rootEl = document.querySelector('#builder-smoke-root');
        const h = window.smokeBuilder.mountBuilder(rootEl, {
          id: `cycle-form-${cycle}`,
          title: `Cycle Form ${cycle}`,
          blocks: []
        });
        h.dispose();
        h.dispose(); // idempotent
      }, c);
    }

    assert.deepEqual(errors, [], `No page errors in viewport ${viewport.width}x${viewport.height}`);
    assert.ok(modules.some(m => m.url.includes('/studio/builder.js') && m.status === 200));

    report.push({
      viewport: `${viewport.width}x${viewport.height}`,
      modulesLoaded: modules.length,
      errorsCount: errors.length,
      cyclesCompleted: 10
    });

    await page.close();
  }

  console.log(JSON.stringify({ status: 'passed', report }));
} finally {
  await browser?.close();
  child.kill();
}
