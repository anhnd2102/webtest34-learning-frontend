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
  items: [{ itemVersionId: 'i1', position: 1, prompt: 'Synthetic essay prompt', interactionType: 'long_text', graderType: 'rubric_async', primarySkill: 'writing', maxScore: 3, scoreEarned: 2, originalScore: 2, verdict: 'partial', canGrade: true, needsReview: true, studentAnswer: 'I especially enjoy running.', expectedAnswer: null, options: [], draftScore: null, draftFeedback: null, draftRequirementScores: null, feedback: { structureScore: 1, accuracyScore: 1, requiredStructures: [{ id: 'req_1', label: 'Particularly + enjoy + V-ing', achieved: false, credit: 0, maxScore: 1, scoreEarned: 0, evidence: ['especially enjoy'], comment: 'Dung especially.' }, { id: 'req_2', label: 'Parallel structure', achieved: true, credit: 1, maxScore: 1, scoreEarned: 1, evidence: ['running'] }], language: { maxScore: 1, scoreEarned: 1, independentErrors: 0 }, errors: [], evidence: [] } }]
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
  const mode = { draft: 'ok', complete: 'ok', publishAll: 'batch' };
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

  // Mở bài làm; câu chấm theo yêu cầu không có ô nhập điểm tổng ở bảng
  await page.locator('.btn-view-attempt').first().click();
  await page.waitForFunction(() => document.querySelector('#attempt-detail')?.classList.contains('drawer-open'));
  await page.locator('.score-by-requirement-hint').waitFor();
  assert.equal(await page.locator('.grade-score-input').count(), 0);

  // Mở câu: thấy bằng chứng từng yêu cầu, sửa điểm yêu cầu 1 từ 0 lên 0.5 rồi lưu
  await page.locator('.btn-inspect-item').first().click();
  await page.locator('.req-score-input').first().waitFor();
  assert.equal(await page.locator('.req-score-input').count(), 3);
  assert.match(await page.locator('.req-review').textContent(), /especially enjoy/);
  await page.locator('.req-score-input[data-req-id="req_1"]').fill('0.5');
  await page.locator('.btn-modal-save-grade').click();
  await page.waitForFunction(() => /Đã lưu nháp/.test(document.querySelector('#draft-status-msg').textContent));
  const drafts = writes.filter(write => write.path.endsWith('/manual-grading/draft'));
  assert.equal(drafts.length, 1);
  assert.deepEqual(drafts[0].body.items[0].requirementScores, { req_1: 0.5, req_2: 1, language: 1 });
  assert.equal(drafts[0].body.items[0].itemVersionId, 'i1');

  // Hoàn tất chấm: vẫn gửi điểm từng yêu cầu đã sửa
  await page.locator('#complete-grading-btn').click();
  await page.waitForTimeout(500);
  const completes = writes.filter(write => write.path.endsWith('/manual-grading/complete'));
  assert.equal(completes.length, 1);
  assert.deepEqual(completes[0].body.items[0].requirementScores, { req_1: 0.5, req_2: 1, language: 1 });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'passed', errors: errors.length }));
} finally {
  await browser?.close();
  server.kill();
}
