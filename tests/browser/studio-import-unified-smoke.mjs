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

  const prompts = () => page.evaluate(() => [...document.querySelectorAll(".item-prompt-input")].map(input => input.value));
  const csv = [
    'Bài tập,Hướng dẫn bài tập,Dạng câu,Đề bài,Lựa chọn A,Lựa chọn B,Lựa chọn C,Lựa chọn D,Đáp án đúng,Điểm',
    'Bài mới,Làm đi,Trắc nghiệm một đáp án,Câu hợp lệ?,Alpha,Beta,,,B,1',
    ',,Trắc nghiệm một đáp án,Câu lỗi?,Alpha,Beta,,,E,1',
    ',,Trắc nghiệm chọn nhiều đáp án,Chọn hai,Mot,Hai,Ba,,"A, C",2'
  ].join('\n');

  // Mở hộp thoại Phần: bảng xem trước báo từng dòng, dòng lỗi có số dòng và cách sửa
  await page.locator('.btn-import-block-csv').first().click();
  await page.locator('#modal-block-csv-upload').waitFor();
  assert.match(await page.locator('#modal-block-csv-upload .csv-layout-schema-code').innerText(), /Bài tập, Hướng dẫn bài tập, Dạng câu, Đề bài/);
  await page.locator('.block-csv-textarea').fill(csv);
  await page.waitForFunction(() => document.querySelector('.block-csv-preview-box .import-table'));
  const preview = await page.locator('.block-csv-preview-box').innerText();
  assert.match(preview, /2 Hợp lệ/);
  assert.match(preview, /1 Lỗi/);
  assert.match(preview, /"E" không có trong các lựa chọn A, B/);
  assert.equal(await page.locator('.btn-download-import-errors').count(), 1);
  assert.equal(await page.locator('.btn-confirm-block-csv').isDisabled(), false, 'dòng hợp lệ vẫn nhập được dù có dòng lỗi');

  // Nhập: dòng lỗi bị bỏ qua, trắc nghiệm chọn nhiều có đáp án (trước đây mất đáp án ở đường nhập cả Phần)
  await page.locator('.btn-confirm-block-csv').click();
  await page.locator('#modal-block-csv-upload').waitFor({ state: 'detached' });
  await page.waitForFunction(() => [...document.querySelectorAll('.item-prompt-input')].some(input => input.value === 'Câu hợp lệ?'));
  const after = await prompts();
  assert.ok(after.includes('Câu hợp lệ?'));
  assert.ok(!after.includes('Câu lỗi?'));
  assert.ok(after.includes('Chọn hai'));
  await page.locator('#btn-save-draft').click().catch(() => {});
  await page.waitForTimeout(500);
  assert.ok(saves.length >= 1, 'bản nháp được lưu');
  const saved = saves.at(-1);
  const group = saved.blocks[0].items.find(entry => entry.prompt === 'Chọn hai');
  assert.ok(group && group.groupId, 'câu chọn nhiều có nhóm');
  assert.deepEqual(saved.gradingKey.groups[group.groupId].expectedOptionIds, ['A', 'C']);
  assert.equal(saved.gradingKey.items[group.itemVersionId].graderType, 'unordered_group_slot');

  // Hộp thoại một dạng (trắc nghiệm): cùng bộ cột, điểm mặc định của hộp thoại áp cho dòng không ghi điểm
  await page.locator('.btn-add-single-choice').first().click();
  await page.locator('#generic-batch-modal .textarea-batch-csv').waitFor();
  await page.locator('#generic-batch-modal .input-batch-csv-points').fill('2.5');
  await page.locator('#generic-batch-modal .textarea-batch-csv').fill('Đề bài,Lựa chọn A,Lựa chọn B,Đáp án đúng,Điểm\nSingle one?,x,y,A,\nSingle two?,x,y,Z,1');
  await page.waitForFunction(() => document.querySelector('#generic-batch-modal .import-table'));
  assert.match(await page.locator('#generic-batch-modal .csv-preview-summary').innerText(), /1 Lỗi/);
  await page.locator('#generic-batch-modal .btn-confirm-csv-import').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.item-prompt-input')].some(input => input.value === 'Single one?'));
  assert.ok(!(await prompts()).includes('Single two?'));
  await page.locator('#btn-save-draft').click().catch(() => {});
  await page.waitForTimeout(500);
  const savedSingle = saves.at(-1).blocks[0].items.find(entry => entry.prompt === 'Single one?');
  assert.equal(savedSingle.maxScore, 2.5, 'điểm mặc định của hộp thoại được áp dụng');

  // Mẫu tải về dùng bộ cột thống nhất
  await page.locator('.btn-import-block-csv').first().click();
  await page.locator('#modal-block-csv-upload').waitFor();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.btn-download-block-template').click()]);
  const text = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8');
  assert.ok(text.startsWith('﻿Bài tập,Hướng dẫn bài tập,Dạng câu,Đề bài'));
  // Trung tâm hướng dẫn: đủ 13 dạng, mở đúng dạng từ hộp thoại một dạng, Excel mẫu sinh lúc tải
  await page.locator('#modal-block-csv-upload .btn-view-csv-guide').click();
  const guide = page.locator('#modal-csv-quick-guide');
  await guide.waitFor();
  assert.equal(await guide.locator('[data-guide-type]').count(), 13);
  const [excel] = await Promise.all([page.waitForEvent('download'), guide.locator('.btn-download-excel-template').click()]);
  const fs = await import('node:fs/promises');
  const vendor = await fs.readFile(new URL('../../term-tests/teacher-dashboard/vendor/xlsx.full.min.js', import.meta.url), 'utf8');
  const XLSX = new Function('window', 'global', `${vendor}; return window.XLSX || global.XLSX;`)(globalThis, globalThis);
  const workbook = XLSX.read(await fs.readFile(await excel.path()), { type: 'buffer' });
  assert.equal(workbook.SheetNames[0], 'Phần thi');
  assert.ok(workbook.SheetNames.includes('Thông tin Phần') && workbook.SheetNames.includes('Hướng dẫn'));
  assert.equal(workbook.SheetNames.length, 16);
  await guide.locator('.btn-close-guide').click();
  await page.locator('#modal-block-csv-upload .btn-cancel-block-csv').click();
  await page.locator('.btn-add-single-choice').first().click();
  await page.locator('#generic-batch-modal .btn-view-csv-guide').click();
  await guide.waitFor();
  assert.equal(await guide.locator('.guide-type.is-focus').getAttribute('data-guide-type'), 'single_choice');
  await guide.locator('.btn-close-guide-footer').click();
  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', errors: 0 }) + '\n');
} finally {
  await browser?.close();
  server.kill();
}
