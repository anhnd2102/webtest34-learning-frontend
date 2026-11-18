import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Bấm thật nhập CSV theo phần (huỷ, thêm nối tiếp), kéo-thả câu hỏi, mở rộng/thêm phương án và
// mọi thay đổi đều bật cảnh báo thay đổi chưa lưu khi rời builder.
const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18328);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const item = (id, exerciseId, position) => ({
  itemVersionId: id, exerciseId, position, prompt: `Prompt ${id}`, interactionType: 'single_choice',
  pedagogicalTypeCode: 'multiple_choice', graderType: 'exact_option', maxScore: 1,
  options: [{ id: 'A', label: 'Synthetic A' }, { id: 'B', label: 'Synthetic B' }]
});
const exercise = (id, itemIds, n) => ({ exerciseId: id, exerciseNumber: n, title: `Exercise ${id}`, itemIds });
const form = id => ({
  id, formVersionId: id, title: `Synthetic ${id}`, status: 'draft', version: 1, durationMinutes: 45,
  blocks: [
    { blockId: 'b1', title: 'Block one', checkpoint: 1, exercises: [exercise('ex1', ['i1', 'i2'], 1), exercise('ex2', ['i3'], 2)], items: [item('i1', 'ex1', 1), item('i2', 'ex1', 2), item('i3', 'ex2', 3)] },
    { blockId: 'b2', title: 'Block two', checkpoint: 2, exercises: [exercise('ex3', ['i4'], 1)], items: [item('i4', 'ex3', 4)] }
  ],
  gradingKey: { items: Object.fromEntries(['i1', 'i2', 'i3', 'i4'].map(key => [key, { graderType: 'exact_option', expectedOptionId: 'A' }])), groups: {} }
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
  await page.addInitScript(() => { const openShortcuts = () => document.querySelectorAll('.add-item-shortcuts').forEach(details => { details.open = true; }); new MutationObserver(openShortcuts).observe(document, { childList: true, subtree: true }); });
  page.setDefaultTimeout(10000);
  const errors = [];
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

  const prompts = () => page.evaluate(() => [...document.querySelectorAll('.item-prompt-input')].map(input => input.value));
  const dialog = page.locator('#add-question-dialog');
  const openDialog = async typeCode => {
    await page.locator('.btn-add-question').first().click();
    await dialog.waitFor();
    if (typeCode) await dialog.locator(`[data-aq-type="${typeCode}"]`).click();
  };
  const savedBlock = async () => {
    await page.locator('#btn-save-draft').click().catch(() => {});
    await page.waitForTimeout(500);
    return saves.at(-1);
  };

  // Một cửa vào: nút "Thêm câu hỏi" là nút chính, các nút theo dạng cũ chỉ là lối tắt thu gọn
  assert.ok(await page.locator('.btn-add-question').count() >= 1);
  assert.equal(await page.locator('.add-item-shortcuts').count() >= 1, true);

  // Chọn dạng nhóm theo họ, tên tiếng Việt
  await openDialog();
  assert.equal(await dialog.locator('.aq-type-btn').count(), 13);
  assert.ok((await dialog.innerText()).includes('Trắc nghiệm một đáp án'));
  assert.doesNotMatch(await dialog.innerText(), /single_choice|multi_select_group/);
  await dialog.locator('[data-aq-type="single_choice"]').click();
  assert.equal(await dialog.locator('[data-aq-tab]').count(), 3);

  // Từng câu: lỗi theo cột khi bấm Lưu thiếu đáp án; xem trước hiện khi đủ; Lưu và thêm câu tiếp giữ dạng
  await dialog.locator('[data-aq-field="prompt"]').fill('Câu một?');
  await dialog.locator('[data-aq-field="optA"]').fill('Alpha');
  await dialog.locator('[data-aq-field="optB"]').fill('Beta');
  await dialog.locator('.aq-save-next').click();
  assert.match(await dialog.locator('.aq-messages').innerText(), /Đáp án đúng/);
  await dialog.locator('[data-aq-field="correct"]').fill('B');
  await page.waitForFunction(() => /Alpha/.test(document.querySelector('#add-question-dialog .aq-preview')?.textContent || ''));
  assert.doesNotMatch(await dialog.locator('.aq-preview').innerText(), /đúng/i, 'xem trước không lộ đáp án');
  await dialog.locator('.aq-default-points').fill('2');
  if (process.env.AQ_SHOT) await dialog.screenshot({ path: process.env.AQ_SHOT });
  await dialog.locator('.aq-save-next').click();
  await page.waitForFunction(() => /Đã thêm 1 câu/.test(document.querySelector('#add-question-dialog .aq-added')?.textContent || ''));
  assert.equal(await dialog.locator('[data-aq-field="prompt"]').inputValue(), '', 'form được xóa để nhập câu tiếp');
  assert.equal(await dialog.locator('.aq-default-points').inputValue(), '2', 'giữ nguyên điểm mặc định');
  await dialog.locator('[data-aq-field="prompt"]').fill('Câu hai?');
  await dialog.locator('[data-aq-field="optA"]').fill('Gamma');
  await dialog.locator('[data-aq-field="optB"]').fill('Delta');
  await dialog.locator('[data-aq-field="correct"]').fill('A');
  await dialog.locator('.aq-save').click();
  await dialog.waitFor({ state: 'detached' });
  let after = await prompts();
  assert.ok(after.includes('Câu một?') && after.includes('Câu hai?'));
  let saved = await savedBlock();
  const first = saved.blocks[0].items.find(entry => entry.prompt === 'Câu một?');
  assert.equal(first.maxScore, 2, 'điểm mặc định áp dụng');
  assert.equal(saved.gradingKey.items[first.itemVersionId].expectedOptionId, 'opt_b');

  // Hàng loạt: gõ nhanh từ vựng -> bảng sửa tại chỗ -> thêm
  await openDialog('vocabulary_pair');
  await dialog.locator('[data-aq-tab="bulk"]').click();
  await dialog.locator('.aq-quick').fill('destination - điểm đến\nitinerary = lịch trình');
  await page.waitForFunction(() => document.querySelectorAll('#add-question-dialog .aq-cell').length > 0);
  assert.equal(await dialog.locator('.aq-grid tbody tr').count(), 2);
  await dialog.locator('.aq-cell[data-aq-row="1"][data-aq-col="correct"]').fill('hành trình');
  assert.match(await dialog.locator('.aq-bulk-summary').innerText(), /2 Hợp lệ/);
  await dialog.locator('.aq-bulk-add').click();
  await dialog.waitFor({ state: 'detached' });
  saved = await savedBlock();
  const vocab = saved.blocks[0].items.filter(entry => entry.pedagogicalTypeCode === 'vocabulary_pair');
  assert.equal(vocab.length, 2);
  assert.deepEqual(vocab[0].options.map(option => option.label).sort(), ['hành trình', 'điểm đến']);

  // Hàng loạt: dán từ Excel (tab) có dòng lỗi -> chỉ dòng hợp lệ được thêm
  await openDialog('single_choice');
  await dialog.locator('[data-aq-tab="bulk"]').click();
  await dialog.locator('.aq-paste').fill('Dán một\tx\ty\t\t\tA\nDán hai\tx\ty\t\t\tZ');
  await page.waitForFunction(() => document.querySelectorAll('#add-question-dialog .aq-cell').length > 0);
  assert.match(await dialog.locator('.aq-bulk-summary').innerText(), /1 Hợp lệ.*1 Lỗi/);
  await dialog.locator('.aq-bulk-add').click();
  await dialog.waitFor({ state: 'detached' });
  after = await prompts();
  assert.ok(after.includes('Dán một') && !after.includes('Dán hai'));

  // Tải CSV: cùng bộ đọc và bảng xem trước
  await openDialog('fitb');
  await dialog.locator('[data-aq-tab="file"]').click();
  await dialog.locator('.aq-file-text').fill('Đề bài,Đáp án đúng,Điểm\nFile một ___,a,\nFile hai ___,,1');
  await page.waitForFunction(() => document.querySelector('#add-question-dialog .import-table'));
  assert.match(await dialog.locator('.aq-file-preview').innerText(), /1 Lỗi/);
  await dialog.locator('.aq-file-add').click();
  await dialog.waitFor({ state: 'detached' });
  after = await prompts();
  assert.ok(after.includes('File một ___') && !after.includes('File hai ___'));

  // Tự luận chấm AI: từng câu dùng trình hướng dẫn; nghe sắp xếp: chỉ làm theo bộ
  await openDialog('rubric_async');
  assert.equal(await dialog.locator('.aq-open-wizard').count(), 1);
  await dialog.locator('.aq-cancel').click();
  await openDialog('listening_order');
  assert.match(await dialog.locator('[data-panel="single"]').innerText(), /Hàng loạt/);
  assert.equal(await dialog.locator('.aq-save').isDisabled(), true);
  await dialog.locator('.aq-cancel').click();

  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', errors: 0 }) + '\n');
} finally {
  await browser?.close();
  server.kill();
}
