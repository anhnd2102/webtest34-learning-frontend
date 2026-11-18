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
  const blockCount = () => page.locator('.builder-block-card').count();
  const savedDraft = async () => {
    await page.locator('#btn-save-draft').click().catch(() => {});
    await page.waitForTimeout(500);
    return saves.at(-1);
  };
  const fs = await import('node:fs/promises');
  const vendor = await fs.readFile(new URL('../../term-tests/teacher-dashboard/vendor/xlsx.full.min.js', import.meta.url), 'utf8');
  const XLSX = new Function('window', 'global', `${vendor}; return window.XLSX || global.XLSX;`)(globalThis, globalThis);
  const HEAD = ['Bài tập', 'Hướng dẫn bài tập', 'Dạng câu', 'Đề bài', 'Lựa chọn A', 'Lựa chọn B', 'Đáp án đúng', 'Âm thanh', 'Điểm'];
  const mcRow = (title, prompt, correct = 'A') => [title, '', 'Trắc nghiệm một đáp án', prompt, 'x', 'y', correct, '', '1'];
  const xlsxBuffer = sheets => {
    const workbook = XLSX.utils.book_new();
    for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
    return Buffer.from(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
  };
  const undoToast = page.locator('#import-undo-toast');

  // ---- Mức 2: cả Phần, CSV có dòng "Thông tin Phần"; câu trùng chỉ cảnh báo; hoàn tác; sửa tiếp thì hết hoàn tác
  const before = await prompts();
  const csv = [HEAD.join(','),
    'Phần Nghe,Nghe kỹ,Thông tin Phần,Passage text,,,,bai-nghe.mp3,',
    mcRow('Bài mới', 'Câu mới một?').join(','),
    mcRow('', before[0] || 'Prompt i1').join(',')].join('\n');
  await page.locator('.btn-import-block-csv').first().click();
  await page.locator('#modal-block-csv-upload').waitFor();
  await page.locator('.input-media-base').fill('assets/audio');
  await page.locator('.block-csv-textarea').fill(csv);
  await page.waitForFunction(() => document.querySelector('.block-csv-preview-box .import-table'));
  const preview = await page.locator('.block-csv-preview-box').innerText();
  assert.match(preview, /Cập nhật thông tin Phần từ file/);
  assert.match(preview, /Trùng với một câu đã có/);
  await page.locator('.btn-confirm-block-csv').click();
  await page.locator('#modal-block-csv-upload').waitFor({ state: 'detached' });
  await undoToast.waitFor();
  assert.match(await undoToast.innerText(), /Đã nhập 2 câu/);
  assert.equal(await page.locator('.block-title-input').first().inputValue(), 'Phần Nghe');
  assert.equal(await page.locator('.block-instructions-input').first().inputValue(), 'Nghe kỹ');
  assert.equal(await page.locator('.block-audio-input').first().inputValue(), 'assets/audio/bai-nghe.mp3');
  assert.ok((await prompts()).includes('Câu mới một?'));

  await undoToast.locator('.btn-undo-import').click();
  await undoToast.waitFor({ state: 'detached' });
  assert.deepEqual(await prompts(), before, 'hoàn tác trả đúng các câu cũ');
  assert.notEqual(await page.locator('.block-title-input').first().inputValue(), 'Phần Nghe', 'hoàn tác cả thông tin Phần');

  // Nhập lại rồi sửa tiếp: hết hoàn tác
  await page.locator('.btn-import-block-csv').first().click();
  await page.locator('.block-csv-textarea').fill([HEAD.join(','), mcRow('Bài mới', 'Câu khác?').join(',')].join('\n'));
  await page.waitForFunction(() => !document.querySelector('.btn-confirm-block-csv').disabled);
  await page.locator('.btn-confirm-block-csv').click();
  await undoToast.waitFor();
  await page.locator('.block-title-input').first().fill('Đổi tên sau khi nhập');
  await undoToast.waitFor({ state: 'detached' });

  // ---- Mức 2 từ Excel: sheet "Thông tin Phần" + "Phần thi"
  await page.locator('.btn-import-block-csv').first().click();
  await page.locator('#modal-block-csv-upload').waitFor();
  await page.locator('.input-block-csv-file').setInputFiles({
    name: 'phan.xlsx', mimeType: 'application/octet-stream',
    buffer: xlsxBuffer([
      ['Thông tin Phần', [['Tiêu đề', 'Hướng dẫn', 'Bài đọc', 'Audio'], ['Phần Excel', 'Làm theo Excel', 'Bài đọc Excel', '']]],
      ['Phần thi', [HEAD, mcRow('Bài Excel', 'Câu từ Excel?')]]
    ])
  });
  await page.waitForFunction(() => /Cập nhật thông tin Phần từ file/.test(document.querySelector('.block-csv-preview-box')?.textContent || ''));
  await page.locator('.btn-confirm-block-csv').click();
  await page.locator('#modal-block-csv-upload').waitFor({ state: 'detached' });
  assert.ok((await prompts()).includes('Câu từ Excel?'));
  assert.equal(await page.locator('.block-reading-input').first().inputValue(), 'Bài đọc Excel');
  await undoToast.locator('.btn-dismiss-undo').click();

  // ---- Mức 3: cả đề từ Excel, mỗi sheet một Phần; sheet hướng dẫn/thông tin không thành Phần
  const blocksBefore = await blockCount();
  await page.locator('#btn-import-test-excel').click();
  const testDialog = page.locator('#test-import-dialog');
  await testDialog.waitFor();
  await testDialog.locator('.ti-file-input').setInputFiles({
    name: 'de.xlsx', mimeType: 'application/octet-stream',
    buffer: xlsxBuffer([
      ['Thông tin Phần', [['Tiêu đề', 'Hướng dẫn', 'Bài đọc', 'Audio'], ['Reading', 'Đọc kỹ', 'Passage R', ''], ['Listening', 'Nghe', '', 'l.mp3']]],
      ['Reading', [HEAD, mcRow('Bài 1', 'R1?'), mcRow('', 'R2?')]],
      ['Listening', [HEAD, mcRow('Bài 1', 'L1?'), mcRow('', 'L2?', 'Z')]],
      ['Hướng dẫn', [['a', 'b']]]
    ])
  });
  await page.waitForFunction(() => document.querySelectorAll('#test-import-dialog .ti-block').length === 2);
  assert.match(await testDialog.locator('.ti-preview').innerText(), /2 Phần sẽ thêm/);
  assert.match(await testDialog.locator('.ti-preview').innerText(), /1 dòng lỗi/);
  if (process.env.TI_SHOT) await testDialog.screenshot({ path: process.env.TI_SHOT });
  await testDialog.locator('.ti-add').click();
  await testDialog.waitFor({ state: 'detached' });
  await undoToast.waitFor();
  assert.equal(await blockCount(), blocksBefore + 2);
  const draft = await savedDraft();
  const reading = draft.blocks.find(entry => entry.title === 'Reading');
  const listening = draft.blocks.find(entry => entry.title === 'Listening');
  assert.equal(reading.items.length, 2);
  assert.equal(listening.items.length, 1, 'dòng lỗi bị bỏ qua');
  assert.equal(reading.instructions, 'Đọc kỹ');
  assert.equal(reading.readingPassage, 'Passage R');
  assert.equal(listening.audioUrl, 'l.mp3');
  assert.ok(reading.items.every(item => draft.gradingKey.items[item.itemVersionId]), 'mọi câu có đáp án chấm');
  await undoToast.waitFor().catch(() => {});

  // ---- Thư mục media cho dạng có ảnh: chỉ tên file thì cảnh báo, có thư mục thì ghép
  await page.evaluate(() => { try { localStorage.removeItem('izone.studio.mediaBase'); } catch (_) {} });
  await page.locator('.btn-add-question').first().click();
  const dialog = page.locator('#add-question-dialog');
  await dialog.waitFor();
  await dialog.locator('[data-aq-type="pictorial_vocabulary"]').click();
  await dialog.locator('[data-aq-tab="bulk"]').click();
  await dialog.locator('.aq-paste').fill('apple.png\tapple\ttáo');
  await page.waitForFunction(() => document.querySelectorAll('#add-question-dialog .aq-cell').length > 0);
  assert.match(await dialog.locator('.aq-status').first().innerText(), /Cảnh báo/);
  await dialog.locator('.input-media-base').fill('assets/vocabulary');
  await page.waitForFunction(() => /Hợp lệ/.test(document.querySelector('#add-question-dialog .aq-status')?.textContent || ''));
  await dialog.locator('.aq-bulk-add').click();
  await dialog.waitFor({ state: 'detached' });
  const afterMedia = await savedDraft();
  const pictorial = afterMedia.blocks.flatMap(entry => entry.items).find(item => item.pedagogicalTypeCode === 'pictorial_vocabulary');
  assert.equal(pictorial.image, 'assets/vocabulary/apple.png');

  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', errors: 0 }) + '\n');
} finally {
  await browser?.close();
  server.kill();
}
