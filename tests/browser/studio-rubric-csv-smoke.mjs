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
  const requirementsIn = payload.requirements || (payload.outline || []).map(label => ({ label }));
  const each = Math.round(((payload.maxScore - language) / requirementsIn.length) * 100) / 100;
  const tiers = payload.level === '03' ? [{ maxErrors: 1, ratio: 1 }, { maxErrors: 3, ratio: 0.5 }] : [{ maxErrors: 0, ratio: 1 }, { maxErrors: 2, ratio: 0.5 }];
  const rubric = {
    scoringVersion: 'izone-rubric-v2', variant: payload.variant, level: payload.level, maxScore: payload.maxScore,
    requirements: requirementsIn.map((requirement, index) => ({ id: `req_${index + 1}`, label: requirement.label, maxScore: requirement.maxScore ?? each, mode: 'binary', ...(requirement.acceptedForms ? { acceptedForms: requirement.acceptedForms } : {}) })),
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
  const dialogs = [];
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.accept(); });
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
      else if (path.endsWith('/rubric-presets/build')) { const body = request.postDataJSON(); builds.push(body); if (body.maxScore === 99) { status = 400; payload = { ok: false, error: 'INVALID_RUBRIC', message: 'Điểm 99 vượt giới hạn của dạng chấm.' }; } else payload = fakeBuild(body); }
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

  const prompts = () => page.evaluate(() => [...document.querySelectorAll('.item-prompt-input')].map(input => input.value));
  const dialog = page.locator('#add-question-dialog');
  const savedDraft = async () => {
    await page.locator('#btn-save-draft').click().catch(() => {});
    await page.waitForTimeout(500);
    return saves.at(-1);
  };
  const HEAD = 'Đề bài,Ngữ cảnh,Dạng chấm,Khối,Điểm,Yêu cầu bắt buộc,Đáp án mẫu,Đáp án đúng,Gợi ý,Số từ tối thiểu';
  const csv = [HEAD,
    'Dịch: Tôi đặc biệt thích chạy bộ.,,Dịch Việt–Anh,34,4,"Particularly + enjoy + V-ing (1.5) [particularly; especially] | Cấu trúc song song (1)",SECRET TRANSLATION ANSWER,,,',
    'Vai trò đúng của Câu 1. Một mặt… là:,On the one hand passage,Writing đọc hiểu,34,2,,,Nêu luận điểm phản đối,,',
    'Explain city life.,,Viết đoạn/bài (Writing),45,15,Topic sentence | Ý 1: chi phí cao,SECRET ESSAY ANSWER,,migrate to | cost of living,120',
    'Dòng sai dạng chấm,,Dạng lạ,34,4,Một | Hai,,,,'].join('\n');

  // ---- Hộp thoại Thêm câu hỏi: tải CSV Tự luận chấm AI kiểu mới
  await page.locator('.btn-add-question').first().click();
  await dialog.waitFor();
  await dialog.locator('[data-aq-type="rubric_async"]').click();
  await dialog.locator('.aq-rubric-mixed').click();
  if (process.env.RB_SHOT) { await dialog.screenshot({ path: process.env.RB_SHOT + '_single.png' }); await dialog.locator('[data-aq-tab="bulk"]').click(); await dialog.screenshot({ path: process.env.RB_SHOT + '_bulk.png' }); }
  await dialog.locator('[data-aq-tab="file"]').click();
  await dialog.locator('.aq-file-text').fill(csv);
  await page.waitForFunction(() => document.querySelector('#add-question-dialog .import-table'));
  const preview = await dialog.locator('.aq-file-preview').innerText();
  assert.match(preview, /3 Hợp lệ/);
  assert.match(preview, /1 Lỗi/);
  assert.match(preview, /Dạng chấm: "Dạng lạ" không nhận ra/);
  assert.equal(builds.length, 0, 'xem trước chưa gọi backend');
  await dialog.locator('.aq-file-add').click();
  await dialog.waitFor({ state: 'detached' });
  await page.waitForFunction(() => [...document.querySelectorAll('.item-prompt-input')].some(input => input.value === 'Explain city life.'));
  assert.equal(builds.length, 3, 'backend dựng quy tắc chấm cho từng dòng hợp lệ');
  assert.deepEqual(builds.map(build => build.variant), ['translation', 'sentence_role', 'writing']);
  assert.equal(builds[0].level, '34');
  assert.deepEqual(builds[0].requirements, [
    { label: 'Particularly + enjoy + V-ing', maxScore: 1.5, acceptedForms: ['particularly', 'especially'] },
    { label: 'Cấu trúc song song', maxScore: 1 }
  ]);
  assert.deepEqual(builds[0].modelAnswers, ['SECRET TRANSLATION ANSWER']);
  assert.deepEqual(builds[2].outline, ['Topic sentence', 'Ý 1: chi phí cao']);
  assert.deepEqual(builds[2].wordCount, { minimum: 120, scoreCapBelowMinimum: true });
  const saved = await savedDraft();
  const items = saved.blocks[0].items;
  const essay = items.find(item => item.prompt === 'Explain city life.');
  const translation = items.find(item => item.prompt.startsWith('Dịch: Tôi đặc biệt'));
  assert.equal(essay.rubricVariant, 'writing');
  assert.deepEqual(essay.studentOutline, ['Topic sentence', 'Ý 1: chi phí cao']);
  assert.deepEqual(essay.vocabularyHints, ['migrate to', 'cost of living']);
  assert.equal(saved.gradingKey.items[essay.itemVersionId].rubricCode, 'izone-rubric-v2');
  assert.equal(saved.gradingKey.items[translation.itemVersionId].rubric.variant, 'translation');
  assert.equal(translation.maxScore, saved.gradingKey.items[translation.itemVersionId].rubric.maxScore, 'điểm câu theo backend');
  assert.equal(JSON.stringify(saved.blocks).includes('SECRET'), false, 'đáp án mẫu không nằm trong định nghĩa công khai');
  assert.equal(JSON.stringify(saved.gradingKey).includes('SECRET TRANSLATION ANSWER'), true, 'đáp án mẫu nằm trong khóa chấm');

  // ---- Cả Phần: dòng Tự luận kiểu mới đi cùng dòng khác; backend từ chối một dòng thì các dòng còn lại vẫn nhập
  const buildsBefore = builds.length;
  const blockCsv = [
    'Bài tập,Hướng dẫn bài tập,Dạng câu,Đề bài,Ngữ cảnh,Dạng chấm,Khối,Điểm,Yêu cầu bắt buộc',
    'Bài viết,Viết,Tự luận chấm AI,Dịch câu thứ hai.,,Dịch Việt–Anh,34,4,Yêu cầu một (2) | Yêu cầu hai (1)',
    ',,Tự luận chấm AI,Câu bị backend từ chối.,,Dịch Việt–Anh,34,99,Yêu cầu một'
  ].join('\n');
  await page.locator('.btn-import-block-csv').first().click();
  await page.locator('#modal-block-csv-upload').waitFor();
  await page.locator('.block-csv-textarea').fill(blockCsv);
  await page.waitForFunction(() => !document.querySelector('.btn-confirm-block-csv').disabled);
  await page.locator('.btn-confirm-block-csv').click();
  await page.locator('#modal-block-csv-upload').waitFor({ state: 'detached' });
  await page.waitForFunction(() => [...document.querySelectorAll('.item-prompt-input')].some(input => input.value === 'Dịch câu thứ hai.'));
  assert.equal(builds.length, buildsBefore + 2);
  assert.ok(dialogs.some(text => /Không dựng được quy tắc chấm cho 1 câu/.test(text) && /Điểm 99 vượt giới hạn/.test(text)), 'báo rõ câu nào bị backend từ chối');
  assert.ok(!(await prompts()).includes('Câu bị backend từ chối.'));


  // ---- Chọn Dạng chấm và Khối trước: form, bảng hàng loạt và mẫu chỉ có cột của dạng đó
  await page.locator('.btn-add-question').first().click();
  await dialog.waitFor();
  await dialog.locator('[data-aq-type="rubric_async"]').click();
  assert.equal(await dialog.locator('.aq-variant-card').count(), 6);
  if (process.env.RB_SHOT) await dialog.screenshot({ path: process.env.RB_SHOT + '_step.png' });
  await dialog.locator('[data-aq-variant="translation"]').click();
  assert.equal(await dialog.locator('.aq-rubric-level option').count(), 3);
  await dialog.locator('.aq-rubric-level').selectOption('03');
  const formLabels = await dialog.locator('[data-panel="single"] .aq-form-row > label').allInnerTexts();
  assert.deepEqual(formLabels.map(text => text.replace(/\s*\(bắt buộc\)/, '').trim()), ['Đề bài', 'Điểm', 'Yêu cầu bắt buộc', 'Đáp án mẫu', 'Điểm Grammar/Vocab', 'Hướng dẫn chấm thêm']);
  await dialog.locator('[data-aq-field="prompt"]').fill('Dịch câu ba.');
  await dialog.locator('[data-aq-field="points"]').fill('4');
  await dialog.locator('[data-aq-field="requirements"]').fill('Cấu trúc A (2) | Cấu trúc B (1)');
  await dialog.locator('[data-aq-field="sample"]').fill('Answer three');
  if (process.env.RB_SHOT) await dialog.screenshot({ path: process.env.RB_SHOT + '_form.png' });
  await dialog.locator('.aq-save').click();
  await dialog.waitFor({ state: 'detached' });
  await page.waitForFunction(() => [...document.querySelectorAll('.item-prompt-input')].some(input => input.value === 'Dịch câu ba.'));
  const lastBuild = builds.at(-1);
  assert.equal(lastBuild.variant, 'translation');
  assert.equal(lastBuild.level, '03', 'Khối chọn một lần trong hộp thoại');
  assert.deepEqual(lastBuild.requirements.map(requirement => requirement.label), ['Cấu trúc A', 'Cấu trúc B']);

  await page.locator('.btn-add-question').first().click();
  await dialog.waitFor();
  await dialog.locator('[data-aq-type="rubric_async"]').click();
  await dialog.locator('[data-aq-variant="writing"]').click();
  assert.equal(await dialog.locator('.aq-rubric-level option').count(), 2, 'Writing chỉ có Khối 34 và 45');
  await dialog.locator('[data-aq-tab="bulk"]').click();
  await dialog.locator('.aq-paste').fill('Explain A\tword one | word two\t15\tTopic | Idea one\tSample A\t100');
  await page.waitForFunction(() => document.querySelectorAll('#add-question-dialog .aq-cell').length > 0);
  assert.match(await dialog.locator('.aq-bulk-summary').innerText(), /1 Hợp lệ/);
  await dialog.locator('.aq-bulk-add').click();
  await dialog.waitFor({ state: 'detached' });
  await page.waitForFunction(() => [...document.querySelectorAll('.item-prompt-input')].some(input => input.value === 'Explain A'));
  const writingBuild = builds.at(-1);
  assert.equal(writingBuild.variant, 'writing');
  assert.equal(writingBuild.level, '34');
  assert.deepEqual(writingBuild.outline, ['Topic', 'Idea one']);
  assert.deepEqual(writingBuild.wordCount, { minimum: 100, scoreCapBelowMinimum: true });
  const savedVariant = await savedDraft();
  const essayA = savedVariant.blocks[0].items.find(item => item.prompt === 'Explain A');
  assert.deepEqual(essayA.studentOutline, ['Topic', 'Idea one']);
  assert.deepEqual(essayA.vocabularyHints, ['word one', 'word two']);

  await page.locator('.btn-add-question').first().click();
  await dialog.waitFor();
  await dialog.locator('[data-aq-type="rubric_async"]').click();
  await dialog.locator('[data-aq-variant="writing"]').click();
  await dialog.locator('[data-aq-tab="file"]').click();
  const [template] = await Promise.all([page.waitForEvent('download'), dialog.locator('.aq-download-template').click()]);
  const templateText = (await (await import('node:fs/promises')).readFile(await template.path(), 'utf8')).replace(/^\uFEFF/, '');
  assert.equal(templateText.split(/\r?\n/)[0], 'Đề bài,Dạng chấm,Khối,Gợi ý,Điểm,Yêu cầu bắt buộc,Đáp án mẫu,Số từ tối thiểu,Hướng dẫn chấm thêm');
  await dialog.locator('.aq-cancel').click();

  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', builds: builds.length, errors: 0 }) + '\n');
} finally {
  await browser?.close();
  server.kill();
}
