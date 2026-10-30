import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
const root = process.env.FRONTEND_ROOT || fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18324);
const captureOnly = process.env.CAPTURE_ONLY === '1';
const label = process.env.ARTIFACT_LABEL || 'final';
const artifacts = new URL(`../../.git/verification/issue-24/${label}/`, import.meta.url);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const form = id => ({
  id, formVersionId: id, title: `Synthetic ${id}`, status: 'draft', version: 1, durationMinutes: 45,
  blocks: [{ blockId: 'b1', title: 'Synthetic block', checkpoint: 1,
    exercises: [{ exerciseId: 'ex1', exerciseNumber: 1, title: 'Synthetic exercise', itemIds: ['i1'] }],
    items: [{ itemVersionId: 'i1', exerciseId: 'ex1', position: 1, prompt: 'Synthetic prompt',
      interactionType: 'single_choice', pedagogicalTypeCode: 'multiple_choice', graderType: 'exact_option', maxScore: 1,
      options: [{ id: 'A', label: 'Synthetic A' }, { id: 'B', label: 'Synthetic B' }] }]
  }], gradingKey: { items: { i1: { graderType: 'exact_option', expectedOptionId: 'A' } }, groups: {} }
});
const room = { status: 'running', readyCount: 1, totalCount: 1, students: [{ studentRef: 's1', name: 'Synthetic student', status: 'in_progress', progress: { answered: 1, total: 2 }, connectionStatus: 'connected' }] };
let browser;
try {
  await mkdir(artifacts, { recursive: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    if (process.env.SMOKE_WIDTH && Number(process.env.SMOKE_WIDTH) !== viewport.width) continue;
    for (const prefix of ['', '/preview-base']) {
      if (process.env.SMOKE_ROOT_ONLY === '1' && prefix) continue;
      if (captureOnly && prefix) continue;
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
      page.setDefaultTimeout(10000);
      const errors = [];
      const modules = [];
      const reads = { me: 0, classes: 0, assignments: 0, results: 0, catalog: 0, detail: 0, saves: 0 };
      const pendingSaves = [];
      const savedPayloads = [];
      let saveMode = 'success';
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (new URL(response.url()).pathname.endsWith('.js')) modules.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
      });
      await page.addInitScript(() => {
        sessionStorage.setItem('izone_teacher_token', 'synthetic-integration-token');
        const NativeDate = Date;
        window.Date = class extends NativeDate {
          constructor(...args) { super(...(args.length ? args : ['2026-10-30T02:00:00Z'])); }
          static now() { return NativeDate.parse('2026-10-30T02:00:00Z'); }
        };
        const nativeFetch = fetch.bind(window);
        window.integrationStreams = [];
        window.fetch = (input, options = {}) => {
          if (!new URL(String(input), location.href).pathname.endsWith('/exam/events')) return nativeFetch(input, options);
          const entry = { signal: options.signal, cancelled: false };
          const body = new ReadableStream({ start(controller) { entry.controller = controller; }, cancel() { entry.cancelled = true; } });
          integrationStreams.push(entry);
          return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
        };
      });
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path.startsWith('/api/teacher/')) {
          let payload = {};
          let status = 200;
          if (path.endsWith('/auth/me')) { reads.me++; payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } }; }
          else if (path.endsWith('/classes')) { reads.classes++; payload = { classes: [{ classId: '101', name: 'Synthetic class', courseCode: '34', status: 'on_going' }] }; }
          else if (path.endsWith('/assignments')) { reads.assignments++; payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Synthetic assignment', courseCode: '34', status: 'published', examMode: true }] }; }
          else if (path.endsWith('/results')) { reads.results++; payload = { assignment: { assignmentId: 'assign-1', title: 'Synthetic assignment' }, skills: [], students: [], pagination: { page: 1, totalPages: 1, totalItems: 0, pageSize: 25 } }; }
          else if (path.endsWith('/course-test-catalog')) { reads.catalog++; payload = { catalog: ['form-a', 'form-b'].map(id => ({ testKey: id, formVersionId: id, title: `Synthetic ${id}`, status: 'draft', sessionNumber: id === 'form-a' ? 1 : 2, phase: 'phase_1' })) }; }
          else if (route.request().method() === 'PUT' && path.includes('/forms/draft/')) {
            reads.saves++;
            savedPayloads.push(route.request().postDataJSON());
            if (saveMode === 'pending') { pendingSaves.push(route); return; }
            if (saveMode === 'error') { status = 500; payload = { message: 'Synthetic save failure' }; }
            else payload = { version: 2, formVersionId: path.split('/').at(-1) };
          }
          else if (path.includes('/forms/form-')) { reads.detail++; payload = { formVersion: form(path.split('/').at(-1)) }; }
          else if (path.endsWith('/exam/room')) payload = { room };
          else if (path.endsWith('/portal-tests')) payload = { tests: [] };
          else { errors.push(`Unexpected fixture path ${path}`); status = 404; }
          return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
        }
        if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
        if (prefix && path.startsWith(prefix + '/')) return route.fulfill({ response: await route.fetch({ url: url.href.replace(prefix + '/', '/') }) });
        return route.continue();
      });
      const base = `http://127.0.0.1:${port}${prefix}/term-tests/teacher-dashboard/`;
      await page.goto(`${base}index.html?classId=101&assignmentId=assign-1&q=synthetic#dashboard`);
      await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' });
      await page.evaluate(async () => {
        const entry = document.querySelector('script[type="module"][src]').src;
        window.integrationApp = await import(entry.includes('/app.js') ? entry : new URL('./app.js', entry).href);
        if (!entry.includes('/app.js')) {
          window.integrationMount = (await import(new URL('./shell/dashboard.js', entry).href)).mountDashboard;
          window.integrationHandle = integrationMount(document);
        }
      });
      const cacheContract = await page.evaluate(async () => {
        const entry = document.querySelector('script[type="module"][src]').src;
        const fresh = await fetch(entry, { cache: 'reload' });
        const cached = await fetch(entry, { cache: 'force-cache' });
        const query = new URL(entry);
        query.searchParams.set('integration-probe', '24');
        const alternate = await fetch(query);
        const texts = await Promise.all([fresh.text(), cached.text(), alternate.text()]);
        await import(entry);
        return { status: [fresh.status, cached.status, alternate.status], same: texts.every(text => text === texts[0]), type: fresh.headers.get('content-type'), cache: fresh.headers.get('cache-control'), revision: new URL(entry).searchParams.get('rev') };
      });
      assert.deepEqual(cacheContract.status, [200, 200, 200]);
      assert.equal(cacheContract.same, true);
      assert.ok(cacheContract.type.includes('javascript') && cacheContract.cache.includes('no-store'));
      assert.ok(cacheContract.revision);
      assert.equal(reads.me, 1, 're-importing the actual entry does not bootstrap twice');
      const screenshot = async state => {
        if (prefix) return;
        await page.evaluate(async () => { await document.fonts.ready; document.activeElement?.blur?.(); window.scrollTo(0, 0); });
        await page.screenshot({ path: fileURLToPath(new URL(`${viewport.width}-${state}.png`, artifacts)), fullPage: true, animations: 'disabled', caret: 'hide' });
      };
      const openBuilder = async id => {
        await page.evaluate(() => { location.hash = '#exams'; });
        await page.locator(`.btn-edit-test[data-form-version-id="${id}"]`).click();
        await page.locator('.item-prompt-input').first().waitFor();
      };
      await screenshot('dashboard');
      await openBuilder('form-a');
      await screenshot('builder');
      await page.locator('.item-prompt-input').first().fill('Changed synthetic prompt');
      assert.equal(await page.evaluate(() => integrationApp.hasActiveUnsavedChanges()), true);
      await page.locator('#btn-back-to-catalog').click();
      await page.locator('#modal-unsaved-changes').waitFor();
      await screenshot('dirty-modal');
      await page.locator('#btn-stay-editing').click();
      if (!captureOnly) {
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-back-to-catalog', 'Staying returns keyboard focus to the initiating control');
        await page.locator('#btn-back-to-catalog').click();
        await page.locator('#modal-unsaved-changes').waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#modal-unsaved-changes').count(), 0, 'Escape stays in the draft');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-back-to-catalog');
        assert.equal(await page.locator('.item-prompt-input').first().inputValue(), 'Changed synthetic prompt');
        await page.evaluate(() => integrationHandle.dispose());
        assert.equal(await page.evaluate(() => integrationApp.hasActiveUnsavedChanges()), false, 'Dashboard disposal ends its dirty Builder');
        const remount = async () => {
          const before = reads.me;
          await page.evaluate(() => { integrationHandle = integrationMount(document); });
          await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');
          await page.locator('.btn-edit-test').first().waitFor();
          assert.equal(reads.me, before + 1, 'one session restore per remount');
        };
        await remount();
        await page.evaluate(() => { location.hash = '#dashboard'; });
        await page.waitForFunction(() => !document.querySelector('#view-dashboard').hidden);
        const beforeNav = reads.catalog;
        // Legacy nav is CSS-hidden; dispatch its public DOM action without changing layout.
        await page.locator('.nav-item[href="#test-studio"]').evaluate(link => link.click());
        await page.locator('.btn-edit-test').first().waitFor();
        await page.waitForTimeout(50);
        assert.equal(reads.catalog, beforeNav + 1, 'one navigation creates one catalog load');
        await openBuilder('form-a');
        await page.locator('.btn-add-single-choice[data-exercise-id="ex1"]').click();
        const csvModal = page.locator('#generic-batch-modal');
        await csvModal.locator('.textarea-batch-csv').fill('Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation,Points\nImported prompt,Yes,No,,,A,Synthetic explanation,2');
        await csvModal.locator('.btn-batch-confirm').click();
        assert.equal(await page.locator('.builder-item-card').count(), 2);
        assert.equal(await page.evaluate(() => integrationApp.hasActiveUnsavedChanges()), true);
        saveMode = 'error';
        await page.locator('#btn-save-draft').click();
        await page.locator('#builder-status-msg.error').waitFor();
        assert.equal(reads.saves, 1);
        assert.equal(await page.evaluate(() => integrationApp.hasActiveUnsavedChanges()), true);
        assert.ok(savedPayloads[0].blocks[0].items.some(item => item.prompt.includes('Imported prompt')));
        saveMode = 'success';
        await page.locator('#btn-save-draft').click();
        await page.locator('#builder-status-msg.success').waitFor();
        assert.equal(reads.saves, 2);
        assert.equal(await page.evaluate(() => integrationApp.hasActiveUnsavedChanges()), false);

        // Browser Back restores Studio; Forward is guarded while the reopened draft is dirty.
        await page.evaluate(() => { location.hash = '#dashboard'; });
        await page.waitForFunction(() => !document.querySelector('#view-dashboard').hidden);
        await page.goBack();
        await page.locator('.btn-edit-test').first().waitFor();
        await page.locator('.btn-edit-test[data-form-version-id="form-a"]').click();
        await page.locator('.item-prompt-input').first().fill('History draft stays');
        await page.goForward();
        await page.locator('#modal-unsaved-changes').waitFor();
        await page.locator('#btn-stay-editing').click();
        await page.waitForFunction(() => ['#exams', '#test-studio'].includes(location.hash));
        assert.equal(await page.locator('.item-prompt-input').first().inputValue(), 'History draft stays');
        assert.equal(await page.evaluate(() => integrationApp.hasActiveUnsavedChanges()), true);

        // Old save completion must not clear the new draft's guard.
        saveMode = 'pending';
        await page.locator('#btn-save-draft').click();
        await page.waitForTimeout(30);
        assert.equal(pendingSaves.length, 1);
        await page.evaluate(() => { location.hash = '#dashboard'; });
        await page.locator('#modal-unsaved-changes').waitFor();
        await page.locator('#btn-discard-and-leave').click();
        await openBuilder('form-b');
        await page.locator('.item-prompt-input').first().fill('New draft must stay dirty');
        await pendingSaves.shift().fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 99 }) });
        await page.waitForTimeout(50);
        assert.equal(await page.evaluate(() => integrationApp.hasActiveUnsavedChanges()), true);
        assert.equal(await page.locator('.item-prompt-input').first().inputValue(), 'New draft must stay dirty');
        assert.equal(await page.locator('#builder-status-msg').getAttribute('class'), 'builder-status-pill unsaved');
        const scrollBeforeStay = await page.evaluate(() => {
          window.scrollTo({ top: 400, behavior: 'instant' });
          document.querySelector('.item-prompt-input').focus({ preventScroll: true });
          return window.scrollY;
        });
        assert.ok(scrollBeforeStay > 0, 'Builder remains scrollable');
        await page.locator('#btn-back-to-catalog').evaluate(button => button.click());
        await page.locator('#btn-stay-editing').click();
        assert.equal(await page.evaluate(() => window.scrollY), scrollBeforeStay, 'Staying preserves scroll');
        assert.equal(await page.locator('.item-prompt-input').first().evaluate(input => input === document.activeElement), true);
        await page.locator('#btn-back-to-catalog').click();
        await page.locator('#btn-discard-and-leave').click();
        await page.locator('.btn-edit-test').first().waitFor();

        await page.evaluate(() => {
          window.foreignClicks = 0;
          document.querySelector('#toggle-fixture-btn').addEventListener('click', () => foreignClicks++);
          sessionStorage.setItem('foreign-value', 'preserve');
        });
        for (let cycle = 0; cycle < 10; cycle++) {
          const beforeDetail = reads.detail;
          await openBuilder('form-a');
          assert.equal(reads.detail, beforeDetail + 1);
          await page.locator('.item-prompt-input').first().fill(`Cycle ${cycle}`);
          await page.locator('#btn-back-to-catalog').click();
          await page.locator('#btn-discard-and-leave').click();
          await page.locator('.btn-edit-test').first().waitFor();
          await page.evaluate(() => { location.hash = '#dashboard'; });
          await page.locator('#exam-room-open').click();
          await page.waitForFunction(count => integrationStreams.length === count, cycle + 1);
          await page.evaluate(snapshot => integrationStreams.at(-1).controller.enqueue(new TextEncoder().encode(`event: snapshot\ndata: ${JSON.stringify({ room: snapshot })}\n\n`)), room);
          await page.waitForFunction(() => document.querySelector('#exam-room-students')?.textContent.includes('Synthetic student'));
          if (cycle === 0) await screenshot('room');
          await page.evaluate(() => {
            if (integrationMount(document) !== integrationHandle) throw new Error('Duplicate mount');
            const toggle = document.querySelector('#toggle-fixture-btn');
            const form = document.querySelector('#identity-form');
            const before = form.hidden;
            toggle.click();
            if (form.hidden !== !before) throw new Error('Duplicate shell listener');
            integrationHandle.dispose();
            integrationHandle.dispose();
            const after = form.hidden;
            toggle.click();
            if (form.hidden !== after) throw new Error('Disposed shell still reacts');
            if (!integrationStreams.at(-1).signal.aborted || !integrationStreams.at(-1).cancelled) throw new Error('Disposed stream still active');
            if (integrationApp.hasActiveUnsavedChanges()) throw new Error('Stale Builder guard');
            if (sessionStorage.getItem('foreign-value') !== 'preserve') throw new Error('Foreign storage cleared');
            location.hash = '#exams';
          });
          await remount();
        }
        assert.equal(await page.evaluate(() => foreignClicks), 20);
        await openBuilder('form-a');
        await page.evaluate(data => {
          const foreignRoot = document.createElement('section');
          document.body.appendChild(foreignRoot);
          const foreign = integrationApp.mountBuilder(foreignRoot, data);
          foreignRoot.querySelector('.item-prompt-input').dispatchEvent(new Event('input', { bubbles: true }));
          foreignRoot.querySelector('#btn-back-to-catalog').click();
          integrationHandle.dispose();
          if (!integrationApp.hasActiveUnsavedChanges()) throw new Error('Cleanup cleared another Builder guard');
          if (!document.querySelector('#modal-unsaved-changes')) throw new Error('Cleanup removed another Builder dialog');
          foreign.dispose();
          foreignRoot.remove();
        }, form('foreign-form'));
      }
      if (captureOnly) {
        await page.locator('#btn-back-to-catalog').click();
        await page.locator('#btn-discard-and-leave').click();
        await page.locator('.btn-edit-test').first().waitFor();
        await page.evaluate(() => { location.hash = '#dashboard'; });
        await page.locator('#exam-room-open').click();
        await page.locator('#exam-room-students tr').first().waitFor();
        await screenshot('room');
      }
      assert.deepEqual(errors, []);
      assert.ok(modules.every(module => module.status === 200 && module.type?.includes('javascript')));
      report.push({ viewport: `${viewport.width}x${viewport.height}`, prefix: prefix || '/', reads, cycles: captureOnly ? 0 : 10, cacheContract, modules: modules.length, errors: errors.length });
      await page.close();
    }
  }
  const visualComparison = [];
  if (!captureOnly && process.env.COMPARE_BASELINE === '1') {
    for (const width of [1440, 1024, 390]) {
      for (const state of ['dashboard', 'builder', 'dirty-modal', 'room']) {
        const name = `${width}-${state}.png`;
        const baseline = await readFile(new URL(`../baseline/${name}`, artifacts));
        const final = await readFile(new URL(name, artifacts));
        visualComparison.push({ name, identical: baseline.equals(final) });
      }
    }
  }
  const result = { status: 'passed', captureOnly, browser: browser.version(), node: process.version, report, visualComparison, visualStatus: visualComparison.some(item => !item.identical) ? 'manual-review-required' : 'identical-or-not-compared' };
  await writeFile(new URL('report.json', artifacts), JSON.stringify(result, null, 2));
  process.stdout.write(JSON.stringify(result) + '\n');
} finally {
  await browser?.close();
  server.kill();
}
