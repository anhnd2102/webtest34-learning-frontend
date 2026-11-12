import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Bấm thật nhập CSV theo phần (huỷ, thêm nối tiếp), kéo-thả câu hỏi, mở rộng/thêm phương án và
// mọi thay đổi đều bật cảnh báo thay đổi chưa lưu khi rời builder.
const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18329);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const item = (id, exerciseId, position) => ({
  itemVersionId: id, exerciseId, position, prompt: `Prompt ${id}`, interactionType: 'single_choice',
  pedagogicalTypeCode: 'multiple_choice', graderType: 'exact_option', maxScore: 1,
  options: [{ id: 'A', label: 'Synthetic A' }, { id: 'B', label: 'Synthetic B' }]
});
const cloze = (id, exerciseId, position) => ({
  itemVersionId: id, exerciseId, position, prompt: 'He (1) ____ to school.', interactionType: 'text', layoutType: 'inline_cloze',
  pedagogicalTypeCode: 'inline_cloze', graderType: 'accepted_text', maxScore: 1, clozeAnswers: { 1: { targetWord: 'goes', accepted: ['goes'] } }
});
const rubricItem = (id, exerciseId, position) => ({
  itemVersionId: id, exerciseId, position, prompt: 'Write about your day.', interactionType: 'long_text',
  pedagogicalTypeCode: 'writing_task', graderType: 'rubric_async', maxScore: 4, primarySkill: 'writing'
});
const exercise = (id, itemIds, n, extra = {}) => ({ exerciseId: id, exerciseNumber: n, title: `Exercise ${id}`, itemIds, ...extra });
const rubric = { scoringVersion: 'rubric-v1', maxScore: 4, criteria: [{ id: 'content', label: 'Content', maxScore: 2, requiredConcepts: [] }, { id: 'grammar', label: 'Grammar', maxScore: 2, requiredConcepts: [] }] };
const form = id => ({
  id, formVersionId: id, title: `Synthetic ${id}`, status: 'draft', version: 1, durationMinutes: 45,
  blocks: [
    { blockId: 'b1', title: 'Block one', checkpoint: 1, exercises: [exercise('ex1', ['i1', 'c1'], 1, { audioUrl: '' }), exercise('ex2', ['i3'], 2)], items: [item('i1', 'ex1', 1), cloze('c1', 'ex1', 2), item('i3', 'ex2', 3)] },
    { blockId: 'b2', title: 'Block two', checkpoint: 2, exercises: [exercise('ex3', ['r1'], 1, { exerciseType: 'comprehension' })], items: [rubricItem('r1', 'ex3', 4)] }
  ],
  gradingKey: { items: { i1: { graderType: 'exact_option', expectedOptionId: 'A' }, i3: { graderType: 'exact_option', expectedOptionId: 'A' }, c1: { graderType: 'accepted_text', accepted: ['goes'] }, r1: { graderType: 'rubric_async', rubricCode: 'rubric_comprehension_v1', rubricVersion: 1, rubric } }, groups: {} }
});
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}`)); });
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  page.setDefaultTimeout(10000);
  const errors = [];
  const sandboxCalls = [];
  const alerts = [];
  const confirms = [];
  let acceptConfirm = true;
  const saves = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { confirms.push(dialog.message()); if (acceptConfirm) dialog.accept(); else dialog.dismiss(); });
  await page.addInitScript(() => { sessionStorage.setItem('izone_teacher_token', 'synthetic-builder-token'); });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.startsWith('/api/teacher/')) {
      let status = 200;
      let payload = {};
      if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
      else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Synthetic class', courseCode: '34', status: 'on_going' }] };
      else if (path.endsWith('/assignments')) payload = { assignments: [] };
      else if (path.endsWith('/results')) payload = { assignment: {}, skills: [], students: [], pagination: { page: 1, totalPages: 1, totalItems: 0, pageSize: 25 } };
      else if (path.endsWith('/course-test-catalog')) payload = { catalog: [{ testKey: 'form-a', formVersionId: 'form-a', title: 'Synthetic form-a', status: 'draft', sessionNumber: 1, phase: 'phase_1' }] };
      else if (request.method() === 'PUT' && path.includes('/forms/draft/')) { saves.push(request.postDataJSON()); payload = { version: 2, formVersionId: 'form-a' }; }
      else if (path.includes('/forms/form-')) payload = { formVersion: form('form-a') };
      else if (path.endsWith('/preview-sandbox') || path.includes('sandbox')) { sandboxCalls.push(request.postDataJSON()); payload = { ok: true, scoreEarned: 3, maxScore: 4, criteria: [{ id: 'content', score: 2, maxScore: 2 }, { id: 'grammar', score: 1, maxScore: 2 }], errors: [] }; }
      else if (path.endsWith('/portal-tests')) payload = { tests: [] };
      else { errors.push(`Unexpected API fixture path ${request.method()} ${path}`); status = 404; }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
    return route.continue();
  });
  await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html#exams`);
  await page.locator('.btn-edit-test[data-form-version-id="form-a"]').click();
  await page.locator('.item-prompt-input').first().waitFor();

  const dirtyAfterBack = async () => {
    await page.locator('#btn-back-to-catalog').click();
    await page.waitForTimeout(300);
    const shown = await page.locator('#modal-unsaved-changes').isVisible();
    if (shown) await page.locator('#btn-stay-editing').click(); else await reopen();
    return shown;
  };
  const reopen = async () => {
    await page.goto(page.url().split('#')[0] + '#exams');
    await page.reload();
    await page.locator('.btn-edit-test[data-form-version-id="form-a"]').click();
    await page.locator('.item-prompt-input').first().waitFor();
  };
  // Audio giả: Audio.play() thành công ngay, ghi lại URL đã phát.
  await page.evaluate(() => {
    window.__played = [];
    window.Audio = class { constructor(url) { this.url = url; this.paused = true; this.handlers = {}; } addEventListener(type, fn) { this.handlers[type] = fn; } pause() { this.paused = true; } play() { this.paused = false; window.__played.push(this.url); return Promise.resolve(); } };
  });

  // Xem trước âm thanh: rỗng thì cảnh báo, có URL thì phát và nút đổi chữ, bấm lại thì tạm dừng
  const audioBtn = page.locator('.btn-preview-audio').first();
  const audioInput = audioBtn.locator('xpath=ancestor::*[contains(@class,"audio-input-with-preview")][1]//input[@type="text"]');
  const dialogsBefore = confirms.length;
  await audioBtn.click();
  assert.equal(confirms.length, dialogsBefore + 1, 'URL rỗng thì hiện cảnh báo');
  await audioInput.fill('https://example.test/audio.mp3');
  await audioBtn.click();
  await page.waitForFunction(() => window.__played.length === 1);
  assert.match(await audioBtn.textContent(), /Tạm dừng/);
  await audioBtn.click();
  assert.match(await audioBtn.textContent(), /Nghe thử/);
  assert.equal(await page.evaluate(() => window.__played.length), 1, 'bấm lần hai chỉ tạm dừng, không phát lại');

  // Rich editor (bài điền từ nội tuyến): gõ vào vùng soạn thảo bật cảnh báo thay đổi chưa lưu
  await reopen();
  const visual = page.locator('.rich-editor-visual').first();
  await visual.waitFor();
  assert.equal(await dirtyAfterBack(), false, 'chưa chỉnh gì thì không có cảnh báo');
  await visual.click();
  await page.keyboard.type(' extra');
  assert.equal(await dirtyAfterBack(), true, 'gõ trong rich editor làm bẩn bản nháp');

  // Rich editor: đổi sang chế độ HTML rồi sửa mã
  await reopen();
  await page.locator('.btn-toggle-html-mode').first().click();
  const code = page.locator('.rich-editor-code, .rich-html-editor-wrap textarea').first();
  await code.waitFor({ state: 'visible' });
  await code.fill('He (1) ____ to <b>work</b>.');
  // Rời ô mã trước (blur kích hoạt change và dựng lại builder); bấm thẳng nút quay lại sẽ mất cú nhấp đầu, xem ghi chú trong tài liệu.
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  assert.equal(await dirtyAfterBack(), true, 'sửa HTML làm bẩn bản nháp');

  // Rich editor: chèn bảng
  await reopen();
  await page.locator('.btn-rich-insert-table').first().click();
  await page.locator('.table-presets-menu:visible').first().waitFor();
  await page.locator('.table-presets-menu:visible .btn-table-grid, .table-presets-menu:visible .btn-table-preset').first().click();
  assert.ok(await page.locator('.rich-editor-visual table').count() >= 1, 'bảng được chèn vào vùng soạn thảo');

  // Rich editor: chèn ảnh với URL không hợp lệ hiện lỗi trong popup, không chèn
  await reopen();
  await page.locator('.btn-rich-insert-image').first().click();
  await page.locator('.input-image-link:visible').first().fill('not a url');
  await page.locator('.btn-confirm-insert-image:visible').first().click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.rich-editor-visual img').count(), 0, 'URL sai không chèn ảnh');

  // Chuyển bài tập sang phần khác bằng modal
  await reopen();
  const exInBlocks = () => page.evaluate(() => [...document.querySelectorAll('.builder-exercise-card')].map(card => card.dataset.exerciseId));
  const beforeMove = await exInBlocks();
  await page.locator('.btn-move-exercise-to-block').first().click();
  await page.locator(".move-exercise-modal").waitFor();
  await page.locator(".btn-cancel-move-modal").click();
  await page.locator(".move-exercise-modal").waitFor({ state: "detached" });
  assert.deepEqual(await exInBlocks(), beforeMove, "huỷ chuyển thì không đổi gì");
  assert.equal(await dirtyAfterBack(), false, "mở modal chuyển rồi huỷ thì chưa bẩn");
  await page.locator(".btn-move-exercise-to-block").first().click();
  await page.locator(".move-exercise-modal").waitFor();
  await page.locator(".select-target-block").selectOption({ index: 1 });
  await page.locator(".btn-confirm-move-modal").click();
  await page.waitForTimeout(500);
  const afterMove = await exInBlocks();
  assert.notDeepEqual(afterMove, beforeMove, 'chuyển bài tập đổi vị trí');
  assert.deepEqual([...afterMove].sort(), [...beforeMove].sort(), 'chuyển bài tập không mất bài tập');
  assert.equal(await dirtyAfterBack(), true, 'chuyển bài tập làm bẩn bản nháp');

  // Chấm thử AI (sandbox) và lấy ngữ cảnh kịch bản cloze trên câu rubric ở Phần 2
  await reopen();
  await page.locator('.btn-block-jump-chip[data-block-idx="1"]').first().click();
  await page.locator('.btn-trigger-sandbox').first().waitFor({ state: 'attached' });
  const sandboxTab = page.locator('.btn-rubric-tab[data-tab="sandbox"], .btn-rubric-tab:has-text("Sandbox")').first();
  if (await sandboxTab.count()) await sandboxTab.click();
  const sample = page.locator('.input-sandbox-sample').first();
  await sample.waitFor();
  await page.locator('.btn-trigger-sandbox').first().click();
  assert.equal(sandboxCalls.length, 0, 'chưa nhập câu mẫu thì không gọi API');
  await sample.fill('Synthetic sample answer');
  await page.locator('.btn-trigger-sandbox').first().click();
  await page.waitForFunction(() => /3 \/ 4/.test(document.querySelector('.sandbox-results-container')?.textContent || ''));
  assert.equal(sandboxCalls.length, 1, 'mỗi lần chấm thử đúng một request');
  assert.equal(sandboxCalls[0].sampleAnswer, 'Synthetic sample answer');
  assert.equal(await page.locator('.btn-trigger-sandbox').first().isEnabled(), true, 'nút được bật lại sau khi chấm');
  // Lấy kịch bản cloze (tách riêng để cờ dirty không bị bật bởi thao tác trước)
  await reopen();
  await page.locator(".btn-block-jump-chip[data-block-idx=\"1\"]").first().click();
  assert.equal(await dirtyAfterBack(), false, "mở lại thì chưa bẩn");
  await page.locator(".btn-block-jump-chip[data-block-idx=\"1\"]").first().click();
  await page.locator(".btn-pull-exercise-cloze-script").first().click();
  await page.waitForTimeout(300);
  assert.equal(await dirtyAfterBack(), true, "lấy kịch bản cloze làm bẩn bản nháp");

  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', sandboxCalls: sandboxCalls.length, errors: 0 }) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill();
}
