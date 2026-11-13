// E2E thật: shell học viên (canonical renderer) -> Learning API thật -> PostgreSQL thật. KHÔNG dùng API giả.
// Dành cho môi trường thử dùng một lần, tuyệt đối không trỏ vào production/staging có dữ liệu thật:
//   - Postgres trống đã chạy `learning:migrate` (ví dụ container postgres:16 chỉ để kiểm chứng).
//   - Script tự seed dữ liệu tổng hợp (đề, assignment, roster giả), tự dựng backend ở cổng 8788 (cổng frontend local gọi tới).
// Chạy: LEARNING_E2E_DATABASE_URL=postgres://... PLAYWRIGHT_MODULE=<playwright/index.mjs> node tests/browser/real-backend-e2e.mjs
// Biến: BACKEND_DIR (mặc định ../webtest34-learning-platform/backend), E2E_FRONTEND_PORT (mặc định 18350).
// Kiểm: học viên mở link, tải roster theo mã lớp, vào bài, bản nháp lưu lên DB, tải lại thì khôi phục, tiến độ nghe
// lưu theo lượt (attempt_id + audio_key), nộp đúng một lần và DB ghi trạng thái submitted; rồi giáo viên (đăng nhập thật)
// xem kết quả, cấp quyền làm lại: lượt cũ bị thay thế, lượt mới không kế thừa mốc nghe.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const databaseUrl = process.env.LEARNING_E2E_DATABASE_URL;
if (!databaseUrl) { console.error('Cần LEARNING_E2E_DATABASE_URL (Postgres thử đã migrate).'); process.exit(2); }
if (/\b(webtest\.ducanhdev\.com|prod)/i.test(databaseUrl)) { console.error('Từ chối chạy: URL có vẻ là production.'); process.exit(2); }

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const backendDir = path.resolve(process.env.BACKEND_DIR || path.join(frontendRoot, '..', 'webtest34-learning-platform', 'backend'));
const pg = createRequire(path.join(backendDir, 'package.json'))('pg');
const frontendPort = Number(process.env.E2E_FRONTEND_PORT) || 18350;
const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
const apiPort = 8788; // cố định: config.js của frontend chọn http://127.0.0.1:8788 khi chạy ở loopback

const ids = { template: crypto.randomUUID(), version: crypto.randomUUID(), link: crypto.randomUUID(), token: crypto.randomUUID(), assignment: crypto.randomUUID() };
const className = `ICE${ids.link.slice(0, 5).toUpperCase()}`;
const student = { ref: crypto.randomUUID(), contactId: 910001, name: 'Học Viên E2E' };
// Giáo viên tổng hợp (vai trò admin: không cần ánh xạ lớp); đăng nhập thật bằng email + số điện thoại.
const teacher = { id: 990000 + Math.floor(Math.random() * 9000), name: 'GV E2E', email: `gv-e2e-${crypto.randomUUID().slice(0, 8)}@example.test`, phone: '0900000001' };
const itemIds = { text: crypto.randomUUID(), choice: crypto.randomUUID() };
const blockId = crypto.randomUUID();
const publicDefinition = {
  schemaVersion: 'FormDefinitionV1', formVersionId: ids.version, title: 'E2E Test', kind: 'quiz',
  blocks: [{ blockId, checkpoint: 1, title: 'Phần 1', audioUrl: '', items: [
    { itemFamilyId: crypto.randomUUID(), itemVersionId: itemIds.text, position: 1, prompt: 'Điền từ?', interactionType: 'short_text', pedagogicalTypeCode: 'grammar', layoutType: 'short_text', graderType: 'accepted_text' },
    { itemFamilyId: crypto.randomUUID(), itemVersionId: itemIds.choice, position: 2, prompt: 'Chọn đáp án?', interactionType: 'single_choice', pedagogicalTypeCode: 'grammar', layoutType: 'grid_2', graderType: 'exact_option',
      options: [{ id: 'a', label: 'Đáp án A' }, { id: 'b', label: 'Đáp án B' }] }
  ] }]
};

const pool = new pg.Pool({ connectionString: databaseUrl });
async function seed() {
  await pool.query(`INSERT INTO learning.form_template (id, title, kind, created_by_email) VALUES ($1, 'E2E', 'quiz', 'e2e@izone')`, [ids.template]);
  await pool.query(`INSERT INTO learning.form_version (id, template_id, version, public_definition, definition_hash, status, published_at, created_by_email)
    VALUES ($1, $2, 1, $3::jsonb, $4, 'published', now(), 'e2e@izone')`, [ids.version, ids.template, JSON.stringify(publicDefinition), 'b'.repeat(64)]);
  // Bảng đáp án riêng của phiên bản đề: backend join bắt buộc (thiếu thì mọi lệnh lượt làm trả ATTEMPT_NOT_FOUND). Đáp án tổng hợp.
  await pool.query(`INSERT INTO learning.form_grading_key (form_version_id, grader_version, private_definition, content_hash) VALUES ($1, 1, $2::jsonb, $3)`,
    [ids.version, JSON.stringify({ schemaVersion: 'FormGradingKeyV1', formVersionId: ids.version, graderVersion: 1, groups: {},
      items: { [itemIds.text]: { graderType: 'accepted_text', accepted: ['xin chao'] }, [itemIds.choice]: { graderType: 'exact_option', expectedOptionId: 'a' } } }), 'c'.repeat(64)]);
  await pool.query(`INSERT INTO learning.teachers (teacher_id, teacher_name, teacher_email, teacher_phone, khoi_id, role) VALUES ($1, $2, $3, $4, 2, 'admin')`, [teacher.id, teacher.name, teacher.email, teacher.phone]);
  await pool.query(`INSERT INTO learning.test_access_link (id, public_token, course_key, test_number, title) VALUES ($1, $2, $3, 1, 'E2E')`, [ids.link, ids.token, `e2e-${ids.link}`]);
  await pool.query(`INSERT INTO learning.form_assignment (id, test_link_id, form_version_id, organization_key, course_code, erp_course_class_id, class_name_snapshot, session_number, title, status, created_by_email)
    VALUES ($1, $2, $3, 'izone', '34', 910000, $4, 1, $5, 'published', 'e2e@izone')`, [ids.assignment, ids.link, ids.version, className, `E2E · ${className}`]);
  await pool.query(`INSERT INTO learning.form_assignment_roster (assignment_id, student_ref, erp_student_contact_id, student_name_snapshot) VALUES ($1, $2, $3, $4)`,
    [ids.assignment, student.ref, student.contactId, student.name]);
}

function startProcess(command, args, options, readyText) {
  const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  child.output = '';
  child.stdout.on('data', data => { child.output += data; });
  child.stderr.on('data', data => { child.output += data; });
  child.ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${args.join(' ')} không sẵn sàng: ${child.output.slice(-400)}`)), 20000);
    const check = () => { if (child.output.includes(readyText)) { clearTimeout(timer); resolve(); } else setTimeout(check, 100); };
    check();
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`${args.join(' ')} thoát (${code}): ${child.output.slice(-400)}`)); });
  });
  return child;
}

const dbOne = async (sql, params = []) => (await pool.query(sql, params)).rows[0];
const waitFor = async (predicate, message, timeout = 10000) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate()) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  assert.ok(await predicate(), message);
};

let backend, web, browser;
try {
  await seed();
  backend = startProcess(process.execPath, ['src/server.js'], {
    cwd: backendDir,
    env: { ...process.env, NODE_ENV: 'development', PORT: String(apiPort), TRUST_PROXY_HOPS: '0', LEARNING_DATABASE_URL: databaseUrl, ALLOWED_ORIGINS: frontendOrigin }
  }, String(apiPort));
  web = startProcess(process.execPath, ['serve.mjs', String(frontendPort), '127.0.0.1'], { cwd: frontendRoot }, `:${frontendPort}/`);
  await Promise.all([backend.ready, web.ready]);

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const pageErrors = [];
  const apiCalls = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  const netFailures = [];
  page.on('requestfailed', request => netFailures.push(`${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`));
  page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') netFailures.push(`console.${message.type()}: ${message.text().slice(0, 160)}`); });
  page.on('response', async response => { const url = new URL(response.url()); if (url.pathname.includes('/api/learning/')) apiCalls.push({ path: url.pathname.replace(/^.*\/api\/learning/, ''), status: response.status(), ...(response.status() >= 400 ? { body: (await response.text().catch(() => '')).slice(0, 200) } : {}) }); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });

  const link = `${frontendOrigin}/term-tests/webtest-34-demo/index.html?demoCourse=34&class=${className}#test=${ids.token}`;
  const openAndStart = async () => {
    // Cùng URL (chỉ khác fragment trùng) là điều hướng trong tài liệu, không tải lại; qua about:blank để tải thật.
    await page.goto('about:blank');
    await page.goto(link);
    await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false).catch(error => { throw new Error(`${error.message} | gọi API: ${JSON.stringify(apiCalls)} | mạng: ${netFailures.join(' | ')}`); });
    await page.selectOption('#studentSelectInput', student.ref);
    await page.click('#startExamBtn');
    await page.waitForSelector('.cbt-exam-shell');
  };

  // 1. Vào bài: roster theo mã lớp từ DB thật, tạo lượt thật
  await openAndStart();
  assert.ok(apiCalls.some(call => call.path === '/test-access/resolve' && call.status === 200), 'resolve 200 từ backend thật');
  assert.ok(apiCalls.some(call => call.path === '/attempts/start' && call.status === 201), 'start 201 từ backend thật');
  const attempt = await dbOne(`SELECT id, status, draft_revision FROM learning.attempt WHERE assignment_id = $1 AND student_ref = $2`, [ids.assignment, student.ref]);
  assert.equal(attempt.status, 'active');

  // 2. Bản nháp lưu lên DB
  await page.locator(`input[data-item-id="${itemIds.text}"]`).fill('xin chao');
  await waitFor(async () => Number((await dbOne(`SELECT draft_revision FROM learning.attempt WHERE id = $1`, [attempt.id])).draft_revision) >= 1, `bản nháp được ghi vào PostgreSQL (gọi API: ${JSON.stringify(apiCalls)}; trạng thái lưu: ${await page.locator('#demo-save').textContent().catch(() => '?')}; lỗi: ${pageErrors.join('; ')}; mạng: ${netFailures.join(' | ')})`);
  const saved = await dbOne(`SELECT draft FROM learning.attempt WHERE id = $1`, [attempt.id]);
  assert.match(JSON.stringify(saved.draft), /xin chao/, 'nội dung nháp có trong DB');

  // 3. Tiến độ nghe lưu theo lượt: khóa chính (attempt_id, audio_key)
  const attemptToken = (await dbOne(`SELECT attempt_token FROM learning.attempt WHERE id = $1`, [attempt.id])).attempt_token;
  const api = `http://127.0.0.1:${apiPort}/api/learning`;
  const post = (route, body) => fetch(`${api}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: frontendOrigin }, body: JSON.stringify(body) });
  const checkpoint = await post('/attempts/audio/checkpoint', { attemptToken, audioKey: 'b2', lastHeardSeconds: 12.5, completed: true });
  assert.equal(checkpoint.status, 200, `checkpoint thật: ${await checkpoint.text()}`);
  const audioRow = await dbOne(`SELECT audio_key, completed_at FROM learning.attempt_audio_checkpoint WHERE attempt_id = $1`, [attempt.id]);
  assert.equal(audioRow.audio_key, 'b2');
  assert.ok(audioRow.completed_at, 'nghe xong được ghi vào DB theo lượt');
  const resume = await (await post('/attempts/audio/resume', { attemptToken })).json();
  assert.equal(resume.resume.checkpoints.length, 1, 'resume trả mốc của lượt này');

  // 4. Tải lại: bản nháp khôi phục từ máy chủ
  await openAndStart();
  assert.equal(await page.locator(`input[data-item-id="${itemIds.text}"]`).inputValue(), 'xin chao', 'bản nháp khôi phục sau khi tải lại');
  assert.equal((await dbOne(`SELECT count(*)::int AS n FROM learning.attempt WHERE assignment_id = $1 AND student_ref = $2`, [ids.assignment, student.ref])).n, 1, 'vào lại không tạo lượt thứ hai');

  // 5. Nộp bài đúng một lần
  await page.locator(`input[type="radio"][data-item-id="${itemIds.choice}"]`).first().check({ force: true });
  await page.evaluate(() => document.querySelector('#demo-submit-top')?.click());
  await page.locator('#demo-confirm-submit').waitFor({ state: 'visible' });
  await page.evaluate(() => { const b = document.querySelector('#demo-confirm-submit'); b.click(); b.click(); });
  await waitFor(async () => (await page.locator('#demo-result').textContent().catch(() => '') || '').includes('Nộp bài thành công'), 'giao diện báo nộp thành công');
  const done = await dbOne(`SELECT status, submitted_at FROM learning.attempt WHERE id = $1`, [attempt.id]);
  assert.equal(done.status, 'submitted');
  assert.ok(done.submitted_at, 'có submitted_at');
  assert.equal(apiCalls.filter(call => call.path === '/attempts/submit' && call.status === 200).length >= 1, true);
  assert.equal((await dbOne(`SELECT count(*)::int AS n FROM learning.attempt WHERE assignment_id = $1 AND student_ref = $2 AND status = 'submitted'`, [ids.assignment, student.ref])).n, 1, 'đúng một lượt đã nộp');

  // 6. Sau khi nộp: bắt đầu lại không sinh lượt mới (không có quyền làm lại); backend trả lại lượt đã nộp
  const again = await post('/attempts/start', { testToken: ids.token, courseCode: className, studentRef: student.ref, clientIdempotencyKey: crypto.randomUUID(), identityConfirmed: true });
  const againBody = await again.json();
  assert.equal(againBody.attempt?.status, 'submitted', `bắt đầu lại trả lượt đã nộp, nhận ${JSON.stringify(againBody).slice(0, 200)}`);
  assert.equal((await dbOne(`SELECT count(*)::int AS n FROM learning.attempt WHERE assignment_id = $1 AND student_ref = $2`, [ids.assignment, student.ref])).n, 1, 'không sinh lượt mới khi chưa cấp quyền làm lại');
  // 7. Giáo viên đăng nhập thật và thấy bài đã nộp trong kết quả của bài được giao
  const teacherApi = `http://127.0.0.1:${apiPort}/api/teacher`;
  const teacherCall = (method, route, body, token) => fetch(`${teacherApi}${route}`, { method, headers: { 'content-type': 'application/json', origin: frontendOrigin, ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const badLogin = await teacherCall('POST', '/auth/login', { email: teacher.email, phoneNumber: '0911111111' });
  assert.equal(badLogin.status, 401, 'sai số điện thoại thì không đăng nhập được');
  const login = await teacherCall('POST', '/auth/login', { email: teacher.email, phoneNumber: teacher.phone });
  assert.equal(login.status, 200, `đăng nhập giáo viên thật: ${await login.clone().text()}`);
  const { token: teacherToken } = await login.json();
  assert.ok(teacherToken, 'có token phiên giáo viên');
  const noAuth = await teacherCall('GET', `/classes/910000/assignments`);
  assert.equal(noAuth.status, 401, 'không có phiên thì không đọc được danh sách bài được giao');
  const assignments = await teacherCall('GET', '/classes/910000/assignments', null, teacherToken);
  assert.equal(assignments.status, 200, `danh sách bài được giao: ${await assignments.clone().text()}`);
  assert.match(JSON.stringify(await assignments.json()), new RegExp(ids.assignment), 'bài được giao hiện trong danh sách của lớp');
  const results = await teacherCall('GET', `/classes/910000/assignments/${ids.assignment}/results`, null, teacherToken);
  assert.equal(results.status, 200, `kết quả bài được giao: ${await results.clone().text()}`);
  assert.match(JSON.stringify(await results.json()), /Học Viên E2E/, 'học viên đã nộp hiện trong kết quả');

  // 8. Cấp quyền làm lại: lượt cũ bị thay thế, lượt mới có token mới, khóa nghe theo lượt (mốc nghe lượt cũ không sang lượt mới)
  const noReason = await teacherCall('POST', `/classes/910000/assignments/${ids.assignment}/students/${student.ref}/retake`, { expiresAt: new Date(Date.now() + 3600_000).toISOString() }, teacherToken);
  assert.equal(noReason.status, 400, 'cấp quyền làm lại bắt buộc có lý do');
  const grant = await teacherCall('POST', `/classes/910000/assignments/${ids.assignment}/students/${student.ref}/retake`, { reason: 'E2E kiểm chứng', expiresAt: new Date(Date.now() + 3600_000).toISOString() }, teacherToken);
  assert.equal(grant.status, 200, `cấp quyền làm lại: ${await grant.clone().text()}`);
  const retakeStart = await post('/attempts/start', { testToken: ids.token, courseCode: className, studentRef: student.ref, clientIdempotencyKey: crypto.randomUUID(), identityConfirmed: true });
  assert.equal(retakeStart.status, 201, `bắt đầu lượt làm lại: ${await retakeStart.clone().text()}`);
  const retakeAttempt = (await retakeStart.json()).attempt;
  assert.equal(retakeAttempt.status, 'active');
  assert.notEqual(retakeAttempt.attemptToken, attemptToken, 'lượt làm lại có token mới');
  const attemptRows = (await pool.query(`SELECT status FROM learning.attempt WHERE assignment_id = $1 AND student_ref = $2 ORDER BY created_at`, [ids.assignment, student.ref])).rows.map(row => row.status);
  assert.deepEqual(attemptRows, ['superseded', 'active'], `lượt cũ bị thay thế, lượt mới đang làm: ${attemptRows}`);
  const resume2 = await (await post('/attempts/audio/resume', { attemptToken: retakeAttempt.attemptToken })).json();
  assert.equal(resume2.resume.checkpoints.length, 0, 'lượt làm lại bắt đầu không có mốc nghe nào (khóa nghe theo lượt)');
  const checkpoint2 = await post('/attempts/audio/checkpoint', { attemptToken: retakeAttempt.attemptToken, audioKey: 'b2', lastHeardSeconds: 3, completed: false });
  assert.equal(checkpoint2.status, 200, 'lượt mới ghi mốc nghe được dù lượt cũ đã nghe xong cùng audioKey');
  assert.equal((await pool.query(`SELECT count(*)::int AS n FROM learning.attempt_audio_checkpoint WHERE audio_key = 'b2' AND attempt_id IN (SELECT id FROM learning.attempt WHERE assignment_id = $1)`, [ids.assignment])).rows[0].n, 2, 'mỗi lượt có mốc nghe riêng (attempt_id + audio_key)');
  const oldResume = await post('/attempts/audio/resume', { attemptToken });
  assert.equal((await oldResume.json()).resume?.reason, 'superseded', 'lượt cũ báo đã bị thay thế');

  assert.deepEqual(pageErrors, [], `không có lỗi JS trên trang: ${pageErrors.join('; ')}`);
  console.log(JSON.stringify({ status: 'passed', attemptStatus: done.status, audioKey: audioRow.audio_key, startAgainStatus: againBody.attempt?.status, teacherLogin: true, retake: 'superseded->active', audioPerAttempt: true }));
} catch (error) {
  console.error(error);
  console.error('--- backend output ---\n' + (backend?.output || '').slice(-1500));
  process.exitCode = 1;
} finally {
  await browser?.close();
  backend?.kill();
  web?.kill();
  await pool.end();
}
