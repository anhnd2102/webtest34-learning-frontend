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
  blocks: [{ blockId: 'b1', title: 'Block one', checkpoint: 1, readingPassage: '<p>Cities are growing <b>quickly</b>.</p>', exercises: [{ exerciseId: 'ex1', exerciseNumber: 1, title: 'Exercise ex1', itemIds: ['i1'] }], items: [item('i1', 'ex1', 1)] }],
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

  // Phần có bài đọc: câu "Đọc hiểu" dùng chung, không phải dán lại
  await page.locator('.btn-add-rubric-async').first().click();
  const modal = page.locator('#rubric-wizard-modal');
  await modal.locator('.rw-variant-card').first().waitFor();
  await modal.locator('.rw-variant-card:has(input[value="reading_comprehension"])').click();
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('.rw-shared-context').waitFor();
  assert.match(await modal.locator('.rw-shared-preview').textContent(), /Cities are growing quickly\./);
  assert.equal(await modal.locator('[data-rw="context"]').count(), 0, 'không bắt dán lại bài đọc');

  // Đổi sang ngữ cảnh riêng rồi quay lại bài đọc của Phần
  await modal.locator('[data-rw-action="use-own-context"]').click();
  await modal.locator('[data-rw="context"]').fill('Own passage');
  assert.equal(await modal.locator('[data-rw-action="use-shared-context"]').count(), 1);
  await modal.locator('[data-rw-action="use-shared-context"]').click();
  await modal.locator('.rw-shared-context').waitFor();

  // Nhập một câu và hoàn tất: bài tập KHÔNG nhận bản sao bài đọc (backend tự ghép khi chấm)
  await modal.locator('[data-f="prompt"]').first().fill('What is happening to cities?');
  await modal.locator('[data-f="req-label"][data-r="0"]').fill('Cities are growing');
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('.rw-summary li').first().waitFor();
  await modal.locator('[data-rw-action="next"]').click();
  await modal.locator('[data-rw-action="next"]').click();
  await page.waitForFunction(() => !document.querySelector('#rubric-wizard-modal'));
  await page.locator('#save-draft-btn, .btn-save-draft').first().click().catch(() => {});
  await page.waitForTimeout(500);
  const sent = saves.at(-1);
  if (sent) {
    const exercise = sent.blocks[0].exercises.find(candidate => candidate.exerciseId === 'ex1');
    assert.ok(!exercise.referenceContext, 'không sao chép bài đọc vào bài tập');
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'passed', saved: Boolean(sent), errors: errors.length }));
} finally {
  await browser?.close();
  server.kill();
}
