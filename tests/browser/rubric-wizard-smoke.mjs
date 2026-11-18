import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Bấm thật trình hướng dẫn tạo câu Tự luận chấm AI (spec #40, GĐ 3): chọn dạng -> nội dung -> Khối -> chấm thử -> tạo câu,
// rồi chỉnh lại bằng trình hướng dẫn và lưu bản nháp. API giả; backend thật đã có test riêng cho quy tắc chấm.
const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18331);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

const catalog = {
  ok: true,
  families: [
    { family: 'structured_sentence', label: 'Viết câu theo cấu trúc' },
    { family: 'key_ideas', label: 'Trả lời theo ý' },
    { family: 'writing', label: 'Viết đoạn/bài (Writing)' }
  ],
  variants: [
    { variant: 'translation', family: 'structured_sentence', label: 'Dịch Việt–Anh', description: 'Dịch một câu.', levels: ['03', '34', '45'], requirementKind: 'structure', hasLanguage: true },
    { variant: 'sentence_order', family: 'structured_sentence', label: 'Điền sắp xếp và chia động từ', description: 'Sắp xếp từ.', levels: ['03', '34', '45'], requirementKind: 'structure', hasLanguage: true },
    { variant: 'reading_comprehension', family: 'key_ideas', label: 'Đọc hiểu', description: 'Trả lời theo đoạn văn.', levels: ['03', '34', '45'], requirementKind: 'idea', hasLanguage: false },
    { variant: 'sentence_role', family: 'key_ideas', label: 'Writing đọc hiểu', description: 'Vai trò câu.', levels: ['03', '34', '45'], requirementKind: 'idea', hasLanguage: false },
    { variant: 'speaking_text', family: 'key_ideas', label: 'Speaking dạng văn bản', description: 'Speaking.', levels: ['03', '34', '45'], requirementKind: 'idea', hasLanguage: true },
    { variant: 'writing', family: 'writing', label: 'Viết đoạn/bài (Writing)', description: 'Viết đoạn.', levels: ['34', '45'], requirementKind: 'outline', hasLanguage: false }
  ],
  levels: [
    { level: '03', label: 'Khối 03', description: 'Mức chấm dễ hơn.' },
    { level: '34', label: 'Khối 34', description: 'Mức chuẩn.' },
    { level: '45', label: 'Khối 45', description: 'Mức chuẩn.' }
  ]
};

// Bản giả của backend dựng rubric: chia đều điểm, chỉ đủ để kiểm đường đi dữ liệu của giao diện.
function fakeBuild(payload) {
  const language = payload.languageScore ?? payload.maxScore / 2;
  const each = Math.round(((payload.maxScore - language) / payload.requirements.length) * 100) / 100;
  const tiers = payload.level === '03' ? [{ maxErrors: 1, ratio: 1 }, { maxErrors: 3, ratio: 0.5 }] : [{ maxErrors: 0, ratio: 1 }, { maxErrors: 2, ratio: 0.5 }];
  const rubric = {
    scoringVersion: 'izone-rubric-v2', variant: payload.variant, level: payload.level, maxScore: payload.maxScore,
    requirements: payload.requirements.map((requirement, index) => ({ id: `req_${index + 1}`, label: requirement.label, maxScore: requirement.maxScore ?? each, mode: 'binary', ...(requirement.acceptedForms ? { acceptedForms: requirement.acceptedForms } : {}) })),
    language: { maxScore: language, tiers },
    ...(payload.modelAnswers ? { modelAnswers: payload.modelAnswers } : {})
  };
  return { ok: true, rubric, summary: [`Khối ${payload.level}: mức chấm áp dụng.`, `Tổng điểm tối đa của câu: ${payload.maxScore}.`] };
}

const item = (id, exerciseId, position) => ({
  itemVersionId: id, exerciseId, position, prompt: `Prompt ${id}`, interactionType: 'single_choice',
  pedagogicalTypeCode: 'multiple_choice', graderType: 'exact_option', maxScore: 1,
  options: [{ id: 'A', label: 'Synthetic A' }, { id: 'B', label: 'Synthetic B' }]
});
const form = id => ({
  id, formVersionId: id, title: `Synthetic ${id}`, status: 'draft', version: 1, durationMinutes: 45,
  blocks: [{ blockId: 'b1', title: 'Block one', checkpoint: 1, exercises: [{ exerciseId: 'ex1', exerciseNumber: 1, title: 'Exercise ex1', itemIds: ['i1'] }], items: [item('i1', 'ex1', 1)] }],
  gradingKey: { items: { i1: { graderType: 'exact_option', expectedOptionId: 'A' } }, groups: {} }
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
  const builds = [];
  const sandboxes = [];
  const saves = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  await page.addInitScript(() => { sessionStorage.setItem('izone_teacher_token', 'synthetic-wizard-token'); });
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
      else if (path.endsWith('/course-test-catalog')) payload = { catalog: [{ testKey: 'form-a', formVersionId: 'form-a', title: 'Synthetic form-a', status: 'draft', sessionNumber: 1, phase: 1 }] };
      else if (path.endsWith('/rubric-presets/build')) { const body = request.postDataJSON(); builds.push(body); payload = fakeBuild(body); }
      else if (path.endsWith('/rubric-presets')) payload = catalog;
      else if (path.endsWith('/forms/preview-sandbox')) {
        sandboxes.push(request.postDataJSON());
        payload = { ok: true, scoreEarned: 3, maxScore: 4, requiredStructures: [{ id: 'req_1', achieved: false, credit: 0, scoreEarned: 0, maxScore: 1 }, { id: 'req_2', achieved: true, credit: 1, scoreEarned: 1, maxScore: 1 }], criteria: [], errors: [] };
      } else if (request.method() === 'PUT' && path.includes('/forms/draft/')) { saves.push(request.postDataJSON()); payload = { version: 2, formVersionId: 'form-a' }; }
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

  // Bước 1: ba lối vào, sáu dạng
  await page.locator('.btn-add-rubric-async').first().click();
  const modal = page.locator('#rubric-wizard-modal');
  await modal.locator('.rw-variant-card').first().waitFor();
  assert.equal(await modal.locator('fieldset.rw-family').count(), 3);
  assert.equal(await modal.locator('input[name="rw-variant"]').count(), 6);
  assert.equal(await modal.locator('[data-rw-action="next"]').getAttribute('disabled'), null);
  await modal.locator('[data-rw-action="next"]').click();
  assert.match(await modal.locator('.rw-errors').innerText(), /chọn một dạng/i, 'chưa chọn dạng thì không sang bước 2');
  await modal.locator('.rw-variant-card', { hasText: 'Dịch Việt–Anh' }).click();

  // Bước 2: nội dung
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('[data-f="prompt"]').first().waitFor();
  await modal.locator('[data-rw-action="next"]').click();
  assert.match(await modal.locator('.rw-errors').innerText(), /đề bài/i, 'thiếu đề bài thì báo lỗi ngay trong hộp thoại');
  await modal.locator('[data-f="prompt"]').first().fill('Dịch: Tôi đặc biệt thích chạy bộ, bơi lội và đạp xe.');
  await modal.locator('[data-f="req-label"][data-r="0"]').fill('Particularly + enjoy + V-ing');
  await modal.locator('[data-f="req-forms"][data-r="0"]').fill('particularly; especially');
  await modal.locator('[data-f="req-label"][data-r="1"]').fill('Cấu trúc song song');
  await modal.locator('[data-f="model"]').fill('I particularly enjoy running, swimming, and cycling.');

  // Bước 3: Khối được chọn sẵn theo khóa của đề (đề đang mở không chỉ định khóa nên là Khối 03); đổi Khối thì dựng lại tóm tắt
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('.rw-summary li').first().waitFor();
  assert.equal(await modal.locator('input[name="rw-level"]:checked').getAttribute('value'), '03');
  assert.match(await modal.locator('.rw-summary').innerText(), /Khối 03/);
  await modal.locator('.rw-level-card', { hasText: 'Khối 45' }).click();
  await page.waitForFunction(() => /Khối 45/.test(document.querySelector('#rubric-wizard-modal .rw-summary')?.textContent || ''));
  assert.equal(builds.at(-1).level, '45');
  await modal.locator('.rw-level-card', { hasText: 'Khối 03' }).click();
  await page.waitForFunction(() => /Khối 03/.test(document.querySelector('#rubric-wizard-modal .rw-summary')?.textContent || ''));
  assert.equal(builds.at(-1).level, '03');
  assert.deepEqual(builds.at(-1).requirements[0].acceptedForms, ['particularly', 'especially']);

  // Bước 4: chấm thử rồi tạo câu hỏi
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('[data-rw="sample"]').fill('I especially enjoy running, swimming, and cycling.');
  await modal.locator('[data-rw-action="sandbox"]').click();
  await modal.locator('.rw-result').waitFor();
  assert.match(await modal.locator('.rw-result').innerText(), /3\/4/);
  assert.match(await modal.locator('.rw-result').innerText(), /Particularly \+ enjoy \+ V-ing/);
  assert.equal(sandboxes.length, 1);
  assert.equal(sandboxes[0].rubric.scoringVersion, 'izone-rubric-v2');
  await modal.locator('[data-rw-action="next"]').click();
  await page.locator('.template-rubric-v2').waitFor();
  assert.equal(await page.locator('#rubric-wizard-modal').count(), 0, 'hộp thoại đóng sau khi tạo');
  assert.match(await page.locator('.template-rubric-v2 .rw-card-head').innerText(), /Dịch Việt–Anh.*Khối 03/s);
  assert.equal(await page.locator('.template-rubric-v2 .criterion-label-input').count(), 0);

  // Chỉnh lại bằng trình hướng dẫn: mở ở bước 2 với dữ liệu đã nhập
  await page.locator('.btn-edit-rubric-wizard').first().click();
  await modal.locator('[data-f="prompt"]').first().waitFor();
  assert.match(await modal.locator('[data-f="prompt"]').first().inputValue(), /Tôi đặc biệt thích chạy bộ/);
  assert.equal(await modal.locator('[data-f="req-label"][data-r="0"]').inputValue(), 'Particularly + enjoy + V-ing');
  await modal.locator('[data-f="req-label"][data-r="1"]').fill('Cấu trúc song song (liệt kê)');
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('.rw-summary li').first().waitFor();
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('[data-rw-action="next"]').click();
  await page.waitForFunction(() => !document.querySelector('#rubric-wizard-modal'));
  assert.match(await page.locator('.template-rubric-v2').innerText(), /liệt kê/);

  // Esc đóng hộp thoại không tạo gì thêm
  const cardsBefore = await page.locator('.template-rubric-v2').count();
  await page.locator('.btn-add-rubric-async').first().click();
  await modal.locator('.rw-variant-card').first().waitFor();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('#rubric-wizard-modal'));
  assert.equal(await page.locator('.template-rubric-v2').count(), cardsBefore);

  // Lưu bản nháp: rubric snapshot nằm trong grading key, câu mang biến thể
  await page.locator('#btn-save-draft').click().catch(() => {});
  await page.waitForTimeout(500);
  assert.ok(saves.length >= 1, 'bản nháp được lưu');
  const saved = saves.at(-1);
  const created = saved.blocks[0].items.find(entry => entry.rubricVariant === 'translation');
  assert.ok(created, 'câu mới có trong bản nháp');
  const key = saved.gradingKey.items[created.itemVersionId];
  assert.equal(key.rubricCode, 'izone-rubric-v2');
  assert.equal(key.rubric.level, '03');
  assert.equal(key.rubric.requirements[1].label, 'Cấu trúc song song (liệt kê)');
  assert.equal(created.maxScore, 4);
  assert.equal(JSON.stringify(saved.blocks).includes('I particularly enjoy running'), false, 'đáp án mẫu không nằm trong định nghĩa công khai');

  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', builds: builds.length, sandboxes: sandboxes.length, saves: saves.length, errors: 0 }) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill();
}
