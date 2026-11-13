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

  const dirtyAfterBack = async () => {
    await page.locator("#btn-back-to-catalog").click();
    await page.waitForTimeout(300);
    const shown = await page.locator("#modal-unsaved-changes").isVisible();
    if (shown) await page.locator("#btn-stay-editing").click(); else await reopen();
    return shown;
  };
  const reopen = async () => {
    await page.goto(page.url().split("#")[0] + "#exams");
    await page.reload();
    await page.locator(".btn-edit-test[data-form-version-id=form-a]").click();
    await page.locator(".item-prompt-input").first().waitFor();
  };
  const prompts = () => page.evaluate(() => [...document.querySelectorAll(".item-prompt-input")].map(input => input.value));
  const exerciseCount = () => page.locator(".builder-exercise-card").count();
  const csv = "Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score\nImported ex,Do it,single_choice,Imported question?,A,Alpha | Beta,1";

  // Nhập CSV: huỷ không đổi gì
  assert.equal(await dirtyAfterBack(), false, "chưa làm gì thì không có cảnh báo");
  const exBefore = await exerciseCount();
  await page.locator(".btn-import-block-csv").first().click();
  await page.locator("#modal-block-csv-upload").waitFor();
  assert.equal(await page.locator(".btn-confirm-block-csv").isDisabled(), true, "chưa có dữ liệu thì chưa xác nhận được");
  await page.locator(".block-csv-textarea").fill(csv);
  await page.waitForFunction(() => /1 bài tập, 1 câu hỏi/.test(document.querySelector(".block-csv-preview-box").textContent));
  await page.locator(".btn-cancel-block-csv").click();
  await page.locator("#modal-block-csv-upload").waitFor({ state: "detached" });
  assert.equal(await exerciseCount(), exBefore);
  assert.equal(await dirtyAfterBack(), false, "huỷ nhập không làm bẩn bản nháp");

  // Nhập CSV: thêm nối tiếp
  await page.locator(".btn-import-block-csv").first().click();
  await page.locator(".block-csv-textarea").fill(csv);
  await page.waitForFunction(() => !document.querySelector(".btn-confirm-block-csv").disabled);
  await page.locator(".btn-confirm-block-csv").click();
  await page.locator("#modal-block-csv-upload").waitFor({ state: "detached" });
  await page.waitForFunction(count => document.querySelectorAll(".builder-exercise-card").length === count + 1, exBefore);
  assert.ok((await prompts()).includes("Imported question?"));
  assert.equal(await dirtyAfterBack(), true, "nhập CSV làm bẩn bản nháp");

  // Kéo-thả: kéo câu đầu xuống sau câu thứ hai trong cùng bài tập
  await reopen();
  const before = await prompts();
  // Phát sự kiện HTML5 drag trên tay cầm và thẻ đích (Playwright không tạo dragstart ổn định với tay cầm tuỳ biến).
  await page.evaluate(() => {
    const cards = document.querySelectorAll(".builder-item-card");
    const handle = cards[0].querySelector(".item-drag-handle");
    const target = cards[1];
    const transfer = new DataTransfer();
    const fire = (el, type, extra = {}) => el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer, ...extra }));
    handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fire(handle, "dragstart");
    const rect = target.getBoundingClientRect();
    fire(target, "dragover", { clientY: rect.bottom - 2 });
    fire(target, "drop", { clientY: rect.bottom - 2 });
    fire(handle, "dragend");
  });
  await page.waitForTimeout(400);
  const dragged = await prompts();
  assert.notDeepEqual(dragged, before, "kéo-thả đổi thứ tự câu hỏi");
  assert.deepEqual([...dragged].sort(), [...before].sort(), "kéo-thả không mất câu hỏi");
  assert.equal(await dirtyAfterBack(), true, "kéo-thả làm bẩn bản nháp");

  // Thêm phương án lựa chọn rồi xóa lại
  await reopen();
  const optionsBefore = await page.locator(".btn-del-option").count();
  await page.locator(".btn-add-option").first().click();
  await page.waitForFunction(count => document.querySelectorAll(".btn-del-option").length === count + 1, optionsBefore);
  assert.equal(await dirtyAfterBack(), true, "thêm phương án làm bẩn bản nháp");
  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', csv: true, drag: true, errors: 0 }) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill();
}
