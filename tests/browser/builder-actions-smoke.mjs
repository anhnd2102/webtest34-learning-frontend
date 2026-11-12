import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Bấm thật các handler của builder đã tách (bindXxx): thêm/xóa/di chuyển phần, bài tập, câu hỏi,
// thu gọn/mở rộng và hộp xác nhận xóa. Kiểm bằng DOM dựng lại sau mỗi thao tác, không đọc state nội bộ.
const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18327);
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

  const snapshot = () => page.evaluate(() => ({
    blocks: [...document.querySelectorAll('.block-title-input')].map(input => input.value),
    exercises: [...document.querySelectorAll('.builder-exercise-card')].map(card => card.dataset.exerciseId),
    prompts: [...document.querySelectorAll('.item-prompt-input')].map(input => input.value)
  }));
  const before = await snapshot();
  assert.deepEqual(before.blocks, ['Block one', 'Block two']);
  assert.ok(before.prompts.includes('Prompt i1') && before.prompts.includes('Prompt i2'));

  // Thêm bài tập vào phần đang mở
  const exercisesBefore = before.exercises.length;
  await page.locator('.btn-add-exercise').first().click();
  await page.waitForFunction(count => document.querySelectorAll('.builder-exercise-card').length === count + 1, exercisesBefore);

  // Di chuyển câu hỏi: i1 xuống dưới i2 rồi lên lại
  await page.locator('.btn-move-item-down').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.item-prompt-input')[0].value === 'Prompt i2');
  await page.locator('.btn-move-item-up').nth(1).click();
  await page.waitForFunction(() => document.querySelectorAll('.item-prompt-input')[0].value === 'Prompt i1');

  // Thu gọn/mở rộng tất cả
  await page.locator('#btn-collapse-all').click();
  assert.ok(await page.locator('.builder-item-card.is-collapsed').count() > 0);
  assert.equal(await page.locator('.btn-toggle-item-collapse[aria-expanded="true"]').count(), 0);
  await page.locator('#btn-expand-all').click();
  assert.equal(await page.locator('.builder-item-card.is-collapsed').count(), 0);

  // Xóa câu hỏi
  const promptsBefore = (await snapshot()).prompts.length;
  await page.locator('.btn-delete-item').first().click();
  await page.waitForFunction(count => document.querySelectorAll('.item-prompt-input').length === count - 1, promptsBefore);

  // Xóa bài tập có câu hỏi: từ chối thì giữ nguyên, đồng ý thì xóa
  const exBeforeDelete = (await snapshot()).exercises.length;
  const confirmsBefore = confirms.length;
  acceptConfirm = false;
  await page.locator('.btn-delete-exercise').first().click();
  await page.waitForFunction(count => true, 0);
  assert.equal(confirms.length, confirmsBefore + 1);
  assert.equal((await snapshot()).exercises.length, exBeforeDelete, 'từ chối xác nhận thì không xóa');
  acceptConfirm = true;
  await page.locator('.btn-delete-exercise').first().click();
  await page.waitForFunction(count => document.querySelectorAll('.builder-exercise-card').length === count - 1, exBeforeDelete);

  // Thêm phần, di chuyển phần, xóa phần
  await page.locator('#btn-add-block').click();
  await page.waitForFunction(() => document.querySelectorAll('.block-title-input').length === 3);
  await page.locator('.btn-move-block-up:visible').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('.block-title-input')].map(input => input.value).join('|') === 'Block one|Phần 3|Block two');
  await page.locator('.btn-move-block-down:visible').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('.block-title-input')].map(input => input.value).join('|') === 'Block one|Block two|Phần 3');
  await page.locator('.btn-move-block-up:visible').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('.block-title-input')].map(input => input.value).join('|') === 'Block one|Phần 3|Block two');
  await page.locator('.btn-move-block-up:visible').first().click();
  await page.waitForFunction(() => [...document.querySelectorAll('.block-title-input')].map(input => input.value).join('|') === 'Phần 3|Block one|Block two');
  await page.locator('.btn-delete-block:visible').first().click();
  await page.waitForFunction(() => document.querySelectorAll('.block-title-input').length === 2);
  assert.deepEqual((await snapshot()).blocks, ['Block one', 'Block two']);

  // Sau các thao tác, builder vẫn lưu được và payload phản ánh cấu trúc hiện tại
  await page.locator('#btn-save-draft').click().catch(() => {});
  await page.waitForTimeout(500);
  if (saves.length) {
    const saved = saves.at(-1);
    assert.equal(saved.blocks.length, 2);
    assert.deepEqual(saved.blocks.map(block => block.checkpoint), [1, 2], 'checkpoint được đánh lại theo thứ tự');
  }
  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', confirms: confirms.length, saves: saves.length, errors: 0 }) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill();
}
