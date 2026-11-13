import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Bấm thật trên Chrome với API giả: chấm nháp (kể cả xung đột 409), hoàn tất chấm, công bố một bài,
// công bố toàn bộ (đường batch và đường dự phòng từng bài) và chuyển tab báo cáo.
const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18326);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const student = { studentRef: 's1', name: 'Synthetic student', status: 'submitted', attemptId: 'att-1', published: false, skills: {}, attempts: [] };
const detail = () => ({
  class: { name: 'Synthetic class', courseCode: '34' },
  assignment: { title: 'Synthetic assignment' },
  student: { name: 'Synthetic student' },
  attempt: { formVersion: 1, status: 'submitted', startedAt: '2026-10-30T01:00:00Z', submittedAt: '2026-10-30T01:30:00Z', publication: { published: false } },
  incidents: [], skills: [{ code: 'writing' }], scores: { total: { earned: null, max: 2 }, skills: {} },
  attemptHistory: [], manualGrading: { revision: 0, status: 'none' },
  items: [{ itemVersionId: 'i1', position: 1, prompt: 'Synthetic essay prompt', interactionType: 'long_text', graderType: 'rubric_async', primarySkill: 'writing', maxScore: 2, scoreEarned: null, canGrade: true, manualReview: true, needsReview: true, verdict: 'pending', studentAnswer: 'Synthetic answer' }]
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
  const writes = [];
  const reads = { detail: 0, results: 0, report: 0, items: 0 };
  const dialogs = [];
  const mode = { draft: '409', complete: 'ok', publishAll: 'batch' };
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.accept(); });
  await page.addInitScript(() => { sessionStorage.setItem('izone_teacher_token', 'synthetic-grading-token'); });
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path.startsWith('/api/teacher/')) {
      const method = request.method();
      let status = 200;
      let payload = {};
      if (method !== 'GET') writes.push({ method, path, auth: request.headers().authorization || '', body: request.postData() ? JSON.parse(request.postData()) : null });
      if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
      else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Synthetic class', courseCode: '34', status: 'on_going' }] };
      else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Synthetic assignment', courseCode: '34', status: 'published' }] };
      else if (path.endsWith('/results')) { reads.results++; payload = { assignment: { assignmentId: 'assign-1', title: 'Synthetic assignment' }, skills: [], students: [student], pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 25 } }; }
      else if (path.endsWith('/attempts/att-1') && method === 'GET') { reads.detail++; payload = detail(); }
      else if (path.endsWith('/manual-grading/draft')) {
        if (mode.draft === '409') { status = 409; payload = { message: 'Synthetic revision conflict' }; } else payload = { revision: 1 };
      }
      else if (path.endsWith('/manual-grading/complete')) payload = { ok: true };
      else if (path.endsWith('/attempts/att-1/publish')) payload = { ok: true };
      else if (path.endsWith('/assignments/assign-1/publish')) {
        if (mode.publishAll === 'batch') payload = { publishedCount: 1 }; else { status = 404; payload = { message: 'Synthetic missing batch endpoint' }; }
      }
      else if (path.endsWith('/report')) { reads.report++; payload = { assignment: { maxScore: 2 }, statistics: { count: 0 }, buckets: [], rosterSummary: { totalRoster: 1, submitted: 1, officialGraded: 0, provisional: 0, pendingReview: 1, retaking: 0, notSubmitted: 0 }, skills: [] }; }
      else if (path.endsWith('/items-analysis')) { reads.items++; payload = { items: [], summary: {} }; }
      else if (path.endsWith('/portal-tests')) payload = { tests: [] };
      else { errors.push(`Unexpected API fixture path ${method} ${path}`); status = 404; }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(payload) });
    }
    if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
    return route.continue();
  });
  const waitDialog = async (text, occurrence = 1) => {
    const deadline = Date.now() + 5000;
    while (dialogs.filter(message => message === text).length < occurrence && Date.now() < deadline) await page.waitForTimeout(25);
    assert.ok(dialogs.filter(message => message === text).length >= occurrence, `thiếu hộp thoại: ${text}`);
  };
  const countWrites = suffix => writes.filter(write => write.path.endsWith(suffix)).length;
  await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#grading`);
  await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');

  // Mở bài làm
  await page.locator('.btn-view-attempt').first().click();
  await page.waitForFunction(() => document.querySelector('#attempt-detail')?.classList.contains('drawer-open'));
  await page.locator('.grade-score-input').first().waitFor();
  await page.locator('.grade-score-input').first().fill('1.5');

  // Chấm nháp: 409 hiện cảnh báo xung đột và không ghi "Lỗi lưu nháp"; sau đó lưu thành công
  await page.locator('#save-draft-btn').click();
  await page.waitForFunction(() => !document.querySelector('#conflict-alert').hidden);
  assert.match(await page.locator('#conflict-alert').textContent(), /Synthetic revision conflict/);
  assert.equal(countWrites('/manual-grading/draft'), 1, '409 không bị gửi lại');
  mode.draft = 'ok';
  await page.locator('#save-draft-btn').click();
  await page.waitForFunction(() => /Đã lưu nháp/.test(document.querySelector('#draft-status-msg').textContent));
  const drafts = writes.filter(write => write.path.endsWith('/manual-grading/draft'));
  assert.equal(drafts.length, 2);
  assert.deepEqual(drafts[1].body.items.map(item => [item.itemVersionId, item.scoreEarned]), [['i1', 1.5]]);
  assert.equal(drafts[1].body.baseRevision, 0);
  assert.equal(drafts[1].auth, 'Bearer synthetic-grading-token');

  // Hoàn tất chấm: một POST rồi tải lại chi tiết
  const detailBefore = reads.detail;
  await page.locator('#complete-grading-btn').click();
  await page.waitForFunction(count => window.__d = count, 0).catch(() => {});
  await page.waitForFunction(() => true);
  await page.waitForTimeout(400);
  assert.equal(countWrites('/manual-grading/complete'), 1);
  assert.ok(dialogs.includes('Đã hoàn tất chấm bài thành công!'));
  assert.ok(reads.detail > detailBefore, 'tải lại chi tiết sau khi hoàn tất');

  // Công bố một bài
  await page.locator('#publish-result-btn').click();
  await page.waitForTimeout(400);
  assert.equal(countWrites('/attempts/att-1/publish'), 1);
  assert.ok(dialogs.includes('Đã công bố kết quả thành công!'));
  await page.locator('#close-attempt-detail-btn').click();
  await page.waitForFunction(() => !document.querySelector('#attempt-detail').classList.contains('drawer-open'));

  // Công bố toàn bộ: đường batch chỉ một POST
  await page.locator('#publish-all-btn').click();
  await waitDialog('Đã công bố kết quả cho 1 học viên.');
  assert.equal(countWrites('/assignments/assign-1/publish'), 1);
  assert.equal(countWrites('/attempts/att-1/publish'), 1, 'batch thành công thì không công bố từng bài');

  // Công bố toàn bộ: batch lỗi 404 thì dự phòng công bố từng bài đã nộp
  mode.publishAll = 'fallback';
  await page.locator('#publish-all-btn').click();
  await waitDialog('Đã công bố kết quả cho 1 học viên.', 2);
  assert.equal(countWrites('/assignments/assign-1/publish'), 2);
  assert.equal(countWrites('/attempts/att-1/publish'), 2, 'dự phòng công bố đúng một lần cho bài đã nộp');
  assert.ok(await page.locator('#publish-all-btn').isEnabled());

  // Chuyển tab báo cáo
  await page.locator('[data-assessment-tab="distribution"]').click();
  await page.waitForFunction(() => !document.querySelector('#assessment-tab-distribution').hidden && document.querySelector('#results').hidden);
  await page.waitForFunction(() => true);
  await page.waitForTimeout(400);
  assert.equal(reads.report, 1);
  await page.locator('[data-assessment-tab="items"]').click();
  await page.waitForFunction(() => !document.querySelector('#assessment-tab-items').hidden && document.querySelector('#assessment-tab-distribution').hidden);
  await page.waitForTimeout(400);
  assert.equal(reads.items, 1);
  await page.locator('[data-assessment-tab="details"]').click();
  await page.waitForFunction(() => !document.querySelector('#results').hidden && document.querySelector('#assessment-tab-items').hidden);
  await page.locator('[data-assessment-tab="distribution"]').click();
  await page.waitForTimeout(400);
  assert.equal(reads.report, 1, 'quay lại tab đã tải không gọi lại báo cáo');

  assert.equal(errors.length, 0, errors.join('\n'));
  process.stdout.write(JSON.stringify({ status: 'passed', writes: writes.map(write => `${write.method} ${write.path.split('/').slice(-2).join('/')}`), reads, errors: 0 }) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill();
}
