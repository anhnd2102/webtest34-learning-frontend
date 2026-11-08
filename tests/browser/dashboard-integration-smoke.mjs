import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
const root = process.env.FRONTEND_ROOT || fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18324);
const captureOnly = process.env.CAPTURE_ONLY === '1';
const label = process.env.ARTIFACT_LABEL || 'final';
const artifacts = pathToFileURL((process.env.ARTIFACT_DIR || execFileSync('git', [
  'rev-parse', '--path-format=absolute', '--git-path', `verification/issue-24/${label}`
], { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' }).trim()) + '/');
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
async function assertEventually(predicate, message) {
  const deadline = Date.now() + 3000;
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  assert.ok(predicate(), message);
}
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
      const cssResponses = [];
      const reads = { me: 0, classes: 0, assignments: 0, results: 0, catalog: 0, detail: 0, saves: 0 };
      const pendingSaves = [];
      const savedPayloads = [];
      let saveMode = 'success';
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (new URL(response.url()).pathname.endsWith('.js')) modules.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
        if (/\/teacher-dashboard\/(styles\.css|styles\/[^/]+\.css)$/.test(new URL(response.url()).pathname)) cssResponses.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
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
      const screenshot = async (state, { preserveFocus = false, preserveHover = false } = {}) => {
        if (prefix) return;
        if (!preserveHover) await page.mouse.move(-1, -1);
        await page.evaluate(async preserveFocus => { await document.fonts.ready; if (!preserveFocus) document.activeElement?.blur?.(); window.scrollTo(0, 0); }, preserveFocus);
        if (process.env.CAPTURE_COMPUTED === '1') {
          const styles = await page.evaluate(() => {
            const properties = ['display', 'position', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'overflow', 'z-index', 'box-shadow', 'fill', 'outline', 'outline-offset', 'transform', 'cursor', 'text-decoration'];
            return Array.from(document.body.querySelectorAll('*')).map(el => ({ tag: el.tagName, id: el.id, class: el.getAttribute('class'), styles: Object.fromEntries(properties.map(key => [key, getComputedStyle(el).getPropertyValue(key)])) }));
          });
          await writeFile(new URL(`${viewport.width}-${state}-computed.json`, artifacts), JSON.stringify(styles));
          if (viewport.width === 1440 && state === 'dashboard') {
            const rules = await page.evaluate(() => {
              const map = [];
              function visit(rules, source, conditions = []) {
                for (const rule of rules) {
                  if (rule.styleSheet) visit(rule.styleSheet.cssRules, new URL(rule.styleSheet.href).pathname.split('/').at(-1), conditions);
                  else if (rule.selectorText) map.push({ order: map.length, source, conditions, selector: rule.selectorText });
                  else if (rule.cssRules) visit(rule.cssRules, source, [...conditions, rule.conditionText || rule.name || rule.constructor.name]);
                }
              }
              for (const sheet of document.styleSheets) if (sheet.href && new URL(sheet.href).pathname.endsWith('/styles.css')) visit(sheet.cssRules, 'styles.css');
              return map;
            });
            await writeFile(new URL('css-rule-map.json', artifacts), JSON.stringify(rules, null, 2));
          }
        }
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
      if (process.env.BUILDER_STYLE_PARITY === '1') {
        await page.evaluate(data => {
          const host = document.createElement('section'); host.id = 'builder-style-fixture'; document.body.prepend(host);
          data.blocks[0].items.push({ ...structuredClone(data.blocks[0].items[0]), itemVersionId: 'i2', position: 2, pedagogicalTypeCode: 'inline_cloze', layoutType: 'inline_cloze', interactionType: 'short_text', graderType: 'exact_text', prompt: 'Synthetic (1) _____' });
          data.blocks[0].exercises[0].itemIds.push('i2');
          data.blocks[0].items[0] = { ...data.blocks[0].items[0], pedagogicalTypeCode: 'pronunciation_choice', targetWord: 'camera', ipaTranscription: '/test/' };
          const second = structuredClone(data.blocks[0]);
          second.blockId = 'b2'; second.title = 'Second synthetic block';
          second.exercises[0].exerciseId = 'ex2'; second.exercises[0].itemIds = ['i3', 'i4'];
          second.items.forEach((item, index) => { item.itemVersionId = `i${index + 3}`; item.exerciseId = 'ex2'; });
          data.blocks.push(second);
          window.builderStyleHandle = integrationApp.mountBuilder(host, data);
        }, form('builder-style'));
        const host = page.locator('#builder-style-fixture');
        await screenshot('builder-controls');
        await host.locator('.btn-next-block').first().click();
        assert.equal(await host.locator('#builder-block-1').isVisible(), true);
        await screenshot('builder-next-block');
        await host.locator('#builder-block-1 .btn-prev-block').click();
        const card = host.locator('#builder-block-0');
        await card.locator('.block-audio-input').fill('https://drive.google.com/file/d/synthetic/view');
        await card.locator('.block-audio-input').dispatchEvent('change');
        assert.equal(await card.locator('.audio-drive-warning').isVisible(), true);
        await screenshot('builder-audio-warning');
        await card.locator('.btn-toggle-exercise-collapse').click();
        assert.equal(await card.locator('.builder-exercise-card').evaluate(el => el.classList.contains('is-collapsed')), true);
        await screenshot('builder-exercise-collapsed');
        await card.locator('.btn-toggle-exercise-collapse').click();
        await card.locator('.btn-rich-insert-image').first().click();
        await card.locator('.input-image-link').first().fill('not-a-valid-url');
        await card.locator('.btn-confirm-insert-image').first().click();
        assert.equal(await card.locator('.popup-image-error').first().isVisible(), true);
        await screenshot('builder-image-error');
        if (process.env.BUILDER_DRAG_CHECK === '1') {
          await card.locator('.btn-rich-insert-image').first().click();
          await card.locator('.input-ipa-transcription').fill('/typed-value/');
          for (const button of await card.locator('.btn-toggle-item-collapse').all()) await button.click();
          const cards = card.locator('.builder-item-card');
          await cards.nth(1).locator('.item-drag-handle').dragTo(cards.first(), { targetPosition: { x: 100, y: 10 } });
          assert.deepEqual(await page.evaluate(() => builderStyleHandle.getDraft().blocks[0].items.map(item => item.itemVersionId)), ['i2', 'i1']);
          assert.equal(await card.locator('.input-ipa-transcription').inputValue(), '/typed-value/');
        }
        await page.evaluate(() => { builderStyleHandle.dispose(); document.querySelector('#builder-style-fixture').remove(); });
      }
      if (process.env.CSS_PARITY === '1') {
        await page.evaluate(data => {
          const host = document.createElement('section'); host.id = 'css-parity-host'; document.body.append(host);
          data.blocks[0].items[0] = { ...data.blocks[0].items[0], interactionType: 'listening_order', pedagogicalTypeCode: 'listening_order', events: [{ label: 'A', text: 'Synthetic event' }], audioUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=' };
          window.cssParityBuilder = integrationApp.mountBuilder(host, data);
          host.querySelector('#btn-preview-test').click();
        }, form('css-parity'));
        await page.locator('#candidate-simulation-modal').waitFor();
        assert.ok(await page.locator('#candidate-simulation-modal audio').count() > 0);
        await screenshot('simulation-audio');
        await page.locator('#btn-close-simulation').click();
        await page.locator('#css-parity-host #btn-publish-test').click();
        await page.locator('#smart-publishing-modal').waitFor();
        await screenshot('publishing');
        await page.locator('#btn-close-publish-modal').click();
        await page.evaluate(() => { cssParityBuilder.dispose(); document.querySelector('#css-parity-host').remove(); });
        if (process.env.CSS_CONTEXT_PARITY === '1') {
          await page.evaluate(() => {
            const host = document.createElement('section'); host.id = 'css-context-fixture';
            host.innerHTML = '<div class="assessment-header"><div class="assessment-header-top"><button class="btn-back-dashboard">Back</button><div class="assessment-breadcrumb"><span class="crumb-class">Synthetic class</span><span class="crumb-separator">/</span><span class="crumb-test">Synthetic test</span><span class="crumb-badge">Published</span></div></div><div class="assessment-nav-tabs"><button class="assessment-tab-btn active">Details</button><button class="assessment-tab-btn">Distribution</button></div></div><div class="exercise-reference-context-field"><input aria-label="Synthetic reference context" value="Synthetic context"></div><div class="ai-inherited-context-notice">Inherited context <button class="btn-toggle-custom-item-context">Edit</button></div><div class="report-kpi-grid"><button class="clickable-kpi-card">Synthetic KPI</button></div><div class="retake-action-wrap"><span class="retake-badge">Retake</span><span class="retake-badge active">Active retake</span><button class="btn-retake-renew">Renew</button></div>';
            document.body.prepend(host);
          });
          await screenshot('context-default');
          await page.locator('#css-context-fixture input').focus();
          await screenshot('context-focus', { preserveFocus: true });
          await page.locator('#css-context-fixture .assessment-tab-btn').last().hover();
          await screenshot('context-hover', { preserveHover: true });
          await page.locator('#css-context-fixture .btn-toggle-custom-item-context').focus();
          await page.keyboard.press('Tab');
          assert.equal(await page.locator('#css-context-fixture .clickable-kpi-card').evaluate(el => el === document.activeElement && el.matches(':focus-visible')), true);
          await screenshot('context-keyboard', { preserveFocus: true });
          await page.locator('#css-context-fixture').evaluate(el => el.remove());
        }
        await page.evaluate(() => {
          const host = document.createElement('div'); host.id = 'css-gradient-probe';
          host.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:white';
          host.innerHTML = '<svg width="120" height="80"><defs><linearGradient id="barGradient"><stop stop-color="var(--izone-primary)"/></linearGradient></defs><rect class="histogram-bar" x="10" y="10" width="100" height="60"/></svg>';
          document.body.append(host);
        });
        assert.match(await page.locator('#css-gradient-probe rect').evaluate(el => getComputedStyle(el).fill), /^url\(["']?#barGradient/);
        await page.locator('#css-gradient-probe').screenshot({ path: fileURLToPath(new URL(`${viewport.width}-histogram-bar.png`, artifacts)) });
        await page.locator('#css-gradient-probe').evaluate(el => el.remove());
      }
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
          if (cycle === 0) {
            await screenshot('room');
            await page.locator('#exam-room-students .btn-retake').first().click();
            assert.equal(await page.locator('#grant-retake-modal').evaluate(el => el.open), true);
            await page.locator('#cancel-grant-retake-btn').click();
            assert.equal(await page.locator('#grant-retake-modal').evaluate(el => el.open), false);
          }
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
          // The caller owns a shared dialog even when another root registered its guard last.
          const firstRoot = document.createElement('section');
          const secondRoot = document.createElement('section');
          document.body.append(firstRoot, secondRoot);
          let first = integrationApp.mountBuilder(firstRoot, data);
          let second = integrationApp.mountBuilder(secondRoot, { ...data, id: 'second-form', formVersionId: 'second-form' });
          firstRoot.querySelector('.btn-add-single-choice').click();
          second.dispose();
          if (!document.querySelector('#generic-batch-modal')) throw new Error('Foreign guard incorrectly claimed another root’s CSV modal');
          first.dispose();
          if (document.querySelector('#generic-batch-modal')) throw new Error('Own CSV modal was not cleaned');
          // Ownership transfers when the next Builder reuses an existing preview element.
          first = integrationApp.mountBuilder(firstRoot, data);
          firstRoot.querySelector('#btn-preview-test').click();
          document.querySelector('#btn-close-simulation').click();
          second = integrationApp.mountBuilder(secondRoot, { ...data, id: 'second-form', formVersionId: 'second-form' });
          secondRoot.querySelector('#btn-preview-test').click();
          first.dispose();
          if (!document.querySelector('#candidate-simulation-modal')) throw new Error('Previous owner removed a reused preview');
          second.dispose();
          if (document.querySelector('#candidate-simulation-modal')) throw new Error('New owner did not clean its reused preview');
          firstRoot.remove();
          secondRoot.remove();
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
      if (!captureOnly) {
        // New main authoring behavior must survive the move into workflow modules.
        await page.evaluate(data => {
          const host = document.createElement('section');
          host.id = 'integration-rubric-host';
          document.body.append(host);
          window.integrationRubric = integrationApp.mountBuilder(host, data);
        }, form('rubric-integration'));
        const host = page.locator('#integration-rubric-host');
        assert.equal(await host.locator('.exercise-reference-context-input').count(), 0);
        await host.locator('.btn-add-rubric-async').click();
        const modal = page.locator('#generic-batch-modal');
        await modal.locator('[data-tab="stepper"]').click();
        const preset = modal.locator('.select-batch-rubric-type');
        assert.deepEqual(await preset.locator('option').evaluateAll(options => options.map(option => option.value)), ['translation', 'comprehension', 'speaking']);
        assert.equal(await preset.inputValue(), 'comprehension');
        await preset.selectOption('translation');
        assert.equal(await modal.locator('#batch-rubric-context-group').isVisible(), false);
        await preset.selectOption('comprehension');
        await modal.locator('.batch-rubric-context-input').fill('Synthetic shared reference context');
        await modal.locator('.btn-batch-single').click();
        const draft = await page.evaluate(() => integrationRubric.getDraft());
        assert.equal(draft.blocks[0].exercises[0].exerciseType, 'comprehension');
        assert.equal(draft.blocks[0].exercises[0].referenceContext, 'Synthetic shared reference context');
        assert.equal(draft.blocks[0].items.at(-1).graderType, 'rubric_async');
        assert.equal(await host.locator('.exercise-reference-context-input').inputValue(), 'Synthetic shared reference context');
        await page.evaluate(() => { integrationRubric.dispose(); document.querySelector('#integration-rubric-host').remove(); });
      }
      if (!captureOnly && process.env.RUN_ASSESSMENT_RACE === '1') {
        await page.evaluate(() => { location.hash = '#grading'; integrationHandle = integrationMount(document); });
        await page.locator('#assessment-header').waitFor();
        const pendingReports = [];
        await page.route(/\/(report|items-analysis)(\?|$)/, route => { pendingReports.push(route); });
        for (const tab of ['distribution', 'items']) {
          let previous = pendingReports.length;
          await page.locator(`[data-assessment-tab="${tab}"]`).click();
          await assertEventually(() => pendingReports.length > previous, 'report request starts');
          previous = pendingReports.length;
          await page.locator('#assignment-select').evaluate(select => {
            if (!Array.from(select.options).some(option => option.value === 'assign-2')) select.add(new Option('Synthetic second assignment', 'assign-2'));
            select.value = select.value === 'assign-1' ? 'assign-2' : 'assign-1';
            select.dispatchEvent(new Event('change', { bubbles: true }));
          });
          await assertEventually(() => pendingReports.length > previous, 'assignment change restarts the canceled report');
          assert.ok(pendingReports.at(-1).request().url().includes(`/assignments/${await page.locator('#assignment-select').inputValue()}/`));
          previous = pendingReports.length;
          await page.evaluate(() => { location.hash = '#dashboard'; });
          await page.waitForFunction(() => !document.querySelector('#view-dashboard').hidden);
          await page.evaluate(() => { location.hash = '#grading'; });
          await assertEventually(() => pendingReports.length > previous, 'returning to grading restarts the canceled report');
        }
        await page.evaluate(() => integrationHandle.dispose());
        for (const route of pendingReports) await route.abort().catch(() => {});
      }
      assert.deepEqual(errors, []);
      const cssLoad = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource').filter(entry => /\/teacher-dashboard\/(styles\.css|styles\/[^/]+\.css)$/.test(new URL(entry.name).pathname));
        return { resources: resources.map(entry => ({ url: entry.name, startTime: entry.startTime, responseEnd: entry.responseEnd, duration: entry.duration })), firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime ?? null };
      });
      assert.ok(cssResponses.every(response => response.status === 200 && response.type?.includes('text/css')));
      if (cssResponses.some(response => response.url.includes('/styles/'))) {
        assert.equal(cssResponses.length, 13, 'entry and all 12 fragments load');
        assert.ok(cssLoad.firstPaint !== null && cssLoad.firstPaint >= Math.max(...cssLoad.resources.map(entry => entry.responseEnd)), 'cold first paint waits for imported styles');
      }
      assert.ok(modules.every(module => module.status === 200 && module.type?.includes('javascript')));
      report.push({ viewport: `${viewport.width}x${viewport.height}`, prefix: prefix || '/', reads, cycles: captureOnly ? 0 : 10, cacheContract, modules: modules.length, errors: errors.length, css: { responses: cssResponses, ...cssLoad } });
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
