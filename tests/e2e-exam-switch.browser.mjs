// E2E cục bộ: trình duyệt thật ↔ backend thật (createApp, đồng hồ giả) ↔ PostgreSQL thật. Không chạm production, không dùng dữ liệu học viên thật.
//
//   PLATFORM_BACKEND_DIR=/path/to/webtest34-learning-platform/backend \
//   LEARNING_TEST_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/learning_test \
//   NODE_PATH=$(npm root -g) node --test tests/e2e-exam-switch.browser.mjs
//
// Cần cổng 8788 (API local mà config.js của trang học viên trỏ tới) và 18034 (static server) còn trống.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const platformDir = process.env.PLATFORM_BACKEND_DIR;
const databaseUrl = process.env.LEARNING_TEST_DATABASE_URL;
const skip = (!platformDir || !databaseUrl) && 'cần PLATFORM_BACKEND_DIR và LEARNING_TEST_DATABASE_URL';

const API_PORT = 8788;
const STATIC_PORT = 18034;
const classCode = 'ICE2E01';
const classId = '910101';
const teacherRow = { id: 910001, khoi: 910034, email: 'e2e-gv@example.test', phone: '0900000001' };
const root = fileURLToPath(new URL('..', import.meta.url));
const uuid = () => crypto.randomUUID();

// "09:00" neo vào thời điểm thật − 150 phút để "11:30" ≈ bây giờ (cột mặc định của DB dùng now() thật).
const baseline = Math.floor(Date.now() / 60_000) * 60_000 - 150 * 60_000;
const at = (hh, mm, ss = 0, ms = 0) => new Date(baseline + ((((hh - 9) * 60 + mm) * 60) + ss) * 1000 + ms);
const clock = { now: at(8, 50) };

const WAV = (() => { // 0,3 giây im lặng, đủ để trình duyệt coi là audio hợp lệ
  const samples = 2400, header = Buffer.alloc(44), data = Buffer.alloc(samples * 2);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVEfmt ', 8); header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(8000, 24); header.writeUInt32LE(16000, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
})();

function startStatic() {
  const child = spawn(process.execPath, ['serve.mjs', String(STATIC_PORT), '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  return new Promise(resolve => setTimeout(() => resolve(() => child.kill()), 1200));
}

async function seedTeacher(pool) {
  await pool.query(`INSERT INTO learning.khoi (khoi_id, khoi_name, course_code) VALUES ($1, 'E2E', '34') ON CONFLICT DO NOTHING`, [teacherRow.khoi]);
  await pool.query(`INSERT INTO learning.teachers (teacher_id, teacher_name, teacher_email, teacher_phone, khoi_id, role)
    VALUES ($1, 'GV E2E', $2, $3, $4, 'admin') ON CONFLICT DO NOTHING`, [teacherRow.id, teacherRow.email, teacherRow.phone, teacherRow.khoi]);
  await pool.query(`INSERT INTO learning.classes (class_id, class_name, course_id, teacher_id, status) VALUES ($1, $2, $3, $4, 'on_going') ON CONFLICT DO NOTHING`,
    [classId, classCode, teacherRow.khoi, teacherRow.id]);
}

async function purgeTeacher(pool) {
  await pool.query('DELETE FROM learning.teacher_session WHERE teacher_id = $1', [teacherRow.id]);
  await pool.query('DELETE FROM learning.classes WHERE class_id = $1', [classId]);
  await pool.query('DELETE FROM learning.teachers WHERE teacher_id = $1', [teacherRow.id]);
  await pool.query('DELETE FROM learning.khoi WHERE khoi_id = $1', [teacherRow.khoi]);
}

// Khung 96 câu mà trang học viên Khóa 34 yêu cầu (vị trí → loại sư phạm). Nội dung và đáp án đều là giả.
const SECTIONS = [
  ['vocabulary_listen_write', 25], ['vocabulary_picture_write', 25], ['listening_order', 5], ['listening_gap', 5], ['listening_true_false', 5],
  ['pronunciation_word', 10], ['pronunciation_choice', 10], ['translation', 8], ['speaking', 3]
];
const stableId = label => { const h = crypto.createHash('sha256').update(label).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };

function syntheticForm(versionId) {
  let position = 0;
  const blocks = SECTIONS.map(([pedagogicalTypeCode, count], sectionIndex) => ({
    blockId: stableId(`block:${pedagogicalTypeCode}`), checkpoint: Math.min(3, sectionIndex + 1), title: pedagogicalTypeCode,
    items: Array.from({ length: count }, () => {
      position += 1;
      return {
        itemFamilyId: stableId(`family:${position}`), itemVersionId: stableId(`version:${versionId}:${position}`), position,
        prompt: `Câu ${position}`, interactionType: 'short_text', pedagogicalTypeCode, layoutType: 'short_text', graderType: 'accepted_text'
      };
    })
  }));
  const items = blocks.flatMap(block => block.items);
  const definition = { schemaVersion: 'FormDefinitionV1', formVersionId: versionId, title: 'Test E2E', kind: 'quiz', durationMinutes: 150, blocks };
  const gradingKey = {
    schemaVersion: 'FormGradingKeyV1', formVersionId: versionId, graderVersion: 1,
    items: Object.fromEntries(items.map(item => [item.itemVersionId, { graderType: 'accepted_text', accepted: ['answer'] }])), groups: {}
  };
  return { definition, gradingKey, answers: Object.fromEntries(items.map(item => [item.itemVersionId, 'answer'])) };
}

async function seed(pool) {
  const ids = { template: uuid(), version: uuid(), link: uuid(), testToken: uuid(), assignment: uuid() };
  const hash = crypto.createHash('sha256').update(ids.version).digest('hex');
  const { definition, gradingKey, answers } = syntheticForm(ids.version);
  await pool.query(`INSERT INTO learning.form_template (id, title, kind, created_by_email) VALUES ($1, 'T', 'quiz', 't@test')`, [ids.template]);
  await pool.query(`INSERT INTO learning.form_version (id, template_id, version, public_definition, definition_hash, status, created_by_email, published_at)
    VALUES ($1, $2, 1, $3::jsonb, $4, 'published', 't@test', now())`, [ids.version, ids.template, JSON.stringify(definition), hash]);
  await pool.query(`INSERT INTO learning.form_grading_key (form_version_id, grader_version, private_definition, content_hash) VALUES ($1, 1, $2::jsonb, $3)`,
    [ids.version, JSON.stringify(gradingKey), 'a'.repeat(64)]);
  await pool.query(`INSERT INTO learning.test_access_link (id, public_token, course_key, test_number, title) VALUES ($1, $2, $3, 1, 'Test E2E')`, [ids.link, ids.testToken, `e2e-${ids.link}`]);
  await pool.query(`INSERT INTO learning.form_assignment (id, test_link_id, form_version_id, organization_key, course_code, erp_course_class_id,
      class_name_snapshot, session_number, title, status, created_by_email)
    VALUES ($1, $2, $3, 'izone', '34', $4, $5, 1, 'Test E2E', 'published', 't@test')`, [ids.assignment, ids.link, ids.version, classId, classCode]);
  const students = {};
  for (const [key, name] of [['exam', 'Học Viên Thi'], ['first', 'Học Viên Mới'], ['grant', 'Học Viên Làm Lại']]) {
    students[key] = { ref: uuid(), name };
    await pool.query(`INSERT INTO learning.form_assignment_roster (assignment_id, student_ref, erp_student_contact_id, student_name_snapshot)
      VALUES ($1, $2, $3, $4)`, [ids.assignment, students[key].ref, 5000 + Object.keys(students).length, name]);
  }
  return { ids, hash, students, answers };
}

async function purge(pool, { ids }) {
  const a = ids.assignment;
  const byAttempt = '(SELECT id FROM learning.attempt WHERE assignment_id = $1)';
  const bySubmission = '(SELECT id FROM learning.submission WHERE assignment_id = $1)';
  for (const sql of [
    `DELETE FROM learning.grading_result_item WHERE grading_run_id IN (SELECT id FROM learning.grading_run WHERE submission_id IN ${bySubmission})`,
    `DELETE FROM learning.grading_run WHERE submission_id IN ${bySubmission}`, `DELETE FROM learning.response_item WHERE submission_id IN ${bySubmission}`,
    'DELETE FROM learning.attendance_record WHERE assignment_id = $1', 'DELETE FROM learning.attendance_event WHERE assignment_id = $1',
    'DELETE FROM learning.result_publication_log WHERE assignment_id = $1', 'DELETE FROM learning.attempt_publication WHERE assignment_id = $1',
    'DELETE FROM learning.retake_grant WHERE assignment_id = $1', 'DELETE FROM learning.exam_incident WHERE assignment_id = $1',
    `DELETE FROM learning.self_proctor_incident WHERE attempt_id IN ${byAttempt}`, `DELETE FROM learning.attempt_audio_checkpoint WHERE attempt_id IN ${byAttempt}`,
    'DELETE FROM learning.exam_participant WHERE assignment_id = $1', 'DELETE FROM learning.submission WHERE assignment_id = $1',
    'DELETE FROM learning.attempt WHERE assignment_id = $1', 'DELETE FROM learning.exam_session WHERE assignment_id = $1',
    'DELETE FROM learning.form_assignment_roster WHERE assignment_id = $1', 'DELETE FROM learning.evidence_event WHERE assignment_id = $1',
    'DELETE FROM learning.form_assignment WHERE id = $1'
  ]) await pool.query(sql, [a]);
  await pool.query('DELETE FROM learning.test_access_link WHERE id = $1', [ids.link]);
  await pool.query('DELETE FROM learning.form_grading_key WHERE form_version_id = $1', [ids.version]);
  await pool.query('DELETE FROM learning.form_version WHERE id = $1', [ids.version]);
  await pool.query('DELETE FROM learning.form_template WHERE id = $1', [ids.template]);
}

test('E2E: GV chuyển sau hết phiên, HV nhận Tự giám sát và bị tự nộp khi vượt N, lịch sử/điểm được giữ', { skip, timeout: 240_000 }, async t => {
  const platform = createRequire(path.join(platformDir, 'package.json'));
  const pg = platform('pg');
  const { createApp } = await import(path.join(platformDir, 'src/app.js'));
  const { chromium, expect } = createRequire(import.meta.url)('playwright/test');

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 8 });
  const config = {
    allowedOrigins: new Set([`http://127.0.0.1:${STATIC_PORT}`]), trustProxyHops: 1, appVersion: 'e2e', buildSha: 'e2e', rosterSyncSecret: '',
    teacherDatabaseAuthEnabled: true, nodeEnv: 'test'
  };
  const app = createApp({ config, pool, clock: () => new Date(clock.now) });
  const server = http.createServer(app);
  await new Promise((resolve, reject) => server.once('error', reject).listen(API_PORT, '127.0.0.1', resolve));
  const stopStatic = await startStatic();
  await seedTeacher(pool);
  const fixture = await seed(pool);
  const browser = await chromium.launch({
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true,
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  t.after(async () => {
    await browser.close(); stopStatic();
    app.locals.examConnectionMonitor.close();
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
    await purge(pool, fixture).catch(error => console.error('purge', error.message));
    await purgeTeacher(pool).catch(error => console.error('purgeTeacher', error.message));
    await pool.end();
  });

  // Đăng nhập GV thật (email + số điện thoại trong DB) để lấy phiên; API học viên/GV đều đi qua HTTP thật.
  const call = (method, route, body, headers = {}) => fetch(`http://127.0.0.1:${API_PORT}${route}`, {
    method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined
  }).then(async res => ({ status: res.status, body: await res.json().catch(() => ({})) }));
  const login = await call('POST', '/api/teacher/auth/login', { email: teacherRow.email, phoneNumber: teacherRow.phone });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const auth = { authorization: `Bearer ${login.body.token}` };
  const teacherBase = `/api/teacher/classes/${classId}/assignments/${fixture.ids.assignment}`;
  const { students } = fixture;

  // --- Chuẩn bị phiên thi 09:00 → 11:30 bằng API; HV "exam" nộp bài trước hạn. ---
  clock.now = at(8, 50);
  assert.equal((await call('PATCH', `${teacherBase}/exam-mode`, { enabled: true }, auth)).status, 200);
  // Hai HV vào phòng chờ bằng link cũ; HV còn lại ("first") chưa làm gì.
  const devices = {};
  for (const key of ['exam', 'grant']) {
    devices[key] = { deviceId: uuid() };
    const entered = await call('POST', '/api/learning/attempts/start', {
      testToken: fixture.ids.testToken, courseCode: classCode, studentRef: students[key].ref, clientIdempotencyKey: uuid(), identityConfirmed: true, deviceId: devices[key].deviceId
    });
    assert.equal(entered.status, 201, JSON.stringify(entered.body));
    devices[key].attemptToken = entered.body.attempt.attemptToken;
  }
  clock.now = at(9, 0);
  const examStart = await call('POST', `${teacherBase}/exam/start`, {}, auth);
  assert.equal(examStart.status, 200, JSON.stringify(examStart.body));
  clock.now = at(10, 0);
  for (const key of ['exam', 'grant']) {
    const submitted = await call('POST', '/api/learning/attempts/submit', {
      attemptToken: devices[key].attemptToken, deviceId: devices[key].deviceId, submissionId: uuid(), definitionHash: fixture.hash, draftRevision: 0, responses: fixture.answers
    });
    assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
  }
  // GV cấp làm lại cho HV "grant" (mở từ 10:10, hạn 14:00): dùng được sau khi phiên thi kết thúc.
  clock.now = at(10, 10);
  assert.equal((await call('POST', `${teacherBase}/students/${students.grant.ref}/retake`,
    { reason: 'thi lại', availableFrom: at(10, 10).toISOString(), expiresAt: at(14, 0).toISOString() }, auth)).status, 200);
  const snapshot = async () => (await pool.query(`SELECT s.id, s.response_hash, s.grading_status, a.proctoring_mode FROM learning.submission s
    JOIN learning.attempt a ON a.id = s.attempt_id WHERE s.assignment_id = $1 ORDER BY s.id`, [fixture.ids.assignment])).rows;
  const before = await snapshot();
  assert.equal(before.length, 2);
  assert.ok(before.every(row => row.proctoring_mode === 'exam'));

  // --- Trình duyệt GV: dashboard trỏ thẳng vào backend local. ---
  const pageErrors = [];
  const teacherPage = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  // Chỉ đổi đích mạng của harness: trang vẫn gọi API production mặc định, fetch (kể cả SSE) được chuyển sang backend local.
  await teacherPage.addInitScript(local => {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => realFetch(typeof input === 'string' ? input.replace('https://webtest.ducanhn.autos', local) : input, init);
  }, `http://127.0.0.1:${API_PORT}`);
  teacherPage.on('pageerror', error => pageErrors.push(`[teacher] ${error.message}`));
  const openDashboard = async () => {
    await teacherPage.goto(`http://127.0.0.1:${STATIC_PORT}/term-tests/teacher-dashboard/index.html`);
    if (await teacherPage.locator('#login-form').isVisible()) {
      await teacherPage.locator('#login-email').fill(teacherRow.email);
      await teacherPage.locator('#login-phone').fill(teacherRow.phone);
      await teacherPage.locator('#login-btn').click();
    }
    await expect(teacherPage.locator(`#class-select option[value="${classId}"]`)).toHaveCount(1);
    await teacherPage.locator('#class-select').selectOption(classId);
    await expect(teacherPage.locator('#assignment-select')).toBeEnabled();
    await teacherPage.locator('#assignment-select').selectOption(fixture.ids.assignment);
  };
  await openDashboard();
  await expect(teacherPage.locator('#exam-switch-controls')).toBeVisible();
  await expect(teacherPage.locator('#exam-switch-hint')).toContainText('đang diễn ra');

  // T01: 11:29:59.999 → bị chặn, cấu hình giữ nguyên.
  clock.now = at(11, 29, 59, 999);
  await teacherPage.locator('#exam-switch-limit').fill('1');
  await teacherPage.locator('#exam-switch-btn').click();
  await expect(teacherPage.locator('#exam-switch-message')).toContainText('Phiên thi chưa kết thúc');
  assert.deepEqual((await pool.query('SELECT exam_mode, exit_limit FROM learning.form_assignment WHERE id = $1', [fixture.ids.assignment])).rows[0], { exam_mode: true, exit_limit: null });

  // T02: đúng 11:30 → chuyển; UI đọc lại từ server.
  clock.now = at(11, 30);
  await teacherPage.locator('#exam-switch-btn').click();
  await expect(teacherPage.locator('#exam-switch-message')).toContainText('Đã chuyển sang Tự giám sát: thoát quá 1 lần');
  await expect(teacherPage.locator('#exam-switch-controls')).toBeHidden();
  await expect(teacherPage.locator('#self-proctoring-limit')).toHaveValue('1');
  assert.deepEqual((await pool.query(`SELECT a.exam_mode, a.exit_limit, s.status FROM learning.form_assignment a JOIN learning.exam_session s ON s.assignment_id = a.id WHERE a.id = $1`, [fixture.ids.assignment])).rows[0],
    { exam_mode: false, exit_limit: 1, status: 'ended' });

  // T21: reload vẫn đúng và phòng thi/lịch sử vẫn mở được.
  await openDashboard();
  await expect(teacherPage.locator('#self-proctoring-limit')).toHaveValue('1');
  await expect(teacherPage.locator('#exam-switch-controls')).toBeHidden();
  await teacherPage.locator('#exam-room-open').click();
  await expect(teacherPage.locator('#exam-room-students')).toContainText('Học Viên Thi');
  await teacherPage.locator('#exam-room-close').click();
  assert.deepEqual(await snapshot(), before, 'điểm/bài nộp cũ không đổi');

  // --- Trình duyệt HV: vào bằng link cũ (#test=...), nhận Tự giám sát, không qua phòng chờ/thiết bị của phiên cũ. ---
  const studentFlow = async student => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => pageErrors.push(`[student ${student.name}] ${error.message}`));
    const requests = [];
    page.on('request', request => { if (request.url().startsWith(`http://127.0.0.1:${API_PORT}`)) requests.push(new URL(request.url()).pathname); });
    // Sai lệch hợp đồng có sẵn ngoài phạm vi issue #31: trang học viên gắn deviceId vào mọi /attempts/* (trừ review/result)
    // nhưng backend audio/resume và audio/checkpoint dùng schema strict không nhận deviceId (400 INVALID_AUDIO_*).
    // Harness gỡ deviceId khỏi hai request này để kiểm chứng phần chuyển chế độ; không sửa code sản phẩm.
    await page.route('**/api/learning/attempts/audio/**', route => {
      const { deviceId: _ignored, ...body } = route.request().postDataJSON() || {};
      return route.continue({ postData: JSON.stringify(body) });
    });
    await page.route(/\.(mp3|wav|m4a)(\?.*)?$/, route => route.fulfill({
      status: 200, contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*', 'accept-ranges': 'none' }, body: WAV
    }));
    await page.goto(`http://127.0.0.1:${STATIC_PORT}/term-tests/webtest-34-demo/index.html#test=${fixture.ids.testToken}`);
    await page.locator('#classCode').fill(classCode);
    await page.locator('#loadRosterBtn').click();
    await expect(page.locator('#studentSelect')).toBeEnabled();
    await page.locator('#studentSelect').selectOption({ value: student.ref });
    await page.locator('#continueToAudio').click();
    await expect(page.locator('#soundcheckBtn')).toBeEnabled();
    await page.locator('#soundcheckBtn').click();
    await expect(page.locator('#startExam')).toBeEnabled();
    await page.locator('#startExam').click();
    return { page, requests };
  };
  const leaveAndReturn = async page => {
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#examGuardOverlay')).toBeVisible();
    await page.locator('#examGuardReturn').click();
    await expect(page.locator('#examGuardOverlay')).toBeHidden();
  };
  const attemptOf = async student => (await pool.query(`SELECT id, status, proctoring_mode, auto_submitted_reason, expires_at FROM learning.attempt
    WHERE assignment_id = $1 AND student_ref = $2 AND status <> 'superseded'`, [fixture.ids.assignment, student.ref])).rows[0];
  const countRows = async (sql, params) => (await pool.query(sql, params)).rows[0].n;

  clock.now = at(11, 36);
  for (const [key, expectedExpiry] of [['first', null], ['grant', at(14, 0)]]) {
    const student = students[key];
    const { page, requests } = await studentFlow(student);
    // Lượt mới là Tự giám sát: có banner N=1, không phòng chờ Exam Mode, không gọi thiết bị/heartbeat/SSE của phiên cũ.
    await expect(page.locator('#examApp')).toBeVisible();
    await expect(page.locator('#examWaitingRoom')).toBeHidden();
    await expect(page.locator('#selfProctoringBanner')).toContainText('thoát quá 1 lần, bài sẽ tự động nộp');
    assert.ok(!requests.some(route => /exam\/(ready|heartbeat)|attempts\/events/.test(route)), `không gọi API phòng thi: ${requests.join(', ')}`);
    const started = await attemptOf(student);
    assert.equal(started.proctoring_mode, 'self');
    assert.equal(started.status, 'active');
    if (expectedExpiry) assert.equal(started.expires_at.toISOString(), expectedExpiry.toISOString(), 'giữ hạn của grant');
    // Không đăng ký thiết bị Exam Mode: HV chưa từng vào phòng thi không có dòng nào; HV cũ giữ nguyên thiết bị của phiên cũ.
    const participants = (await pool.query('SELECT current_device_id FROM learning.exam_participant WHERE assignment_id = $1 AND student_ref = $2', [fixture.ids.assignment, student.ref])).rows;
    assert.deepEqual(participants.map(row => row.current_device_id), devices[key] ? [devices[key].deviceId] : []);

    // Thoát lần 1 (≤ N): cảnh báo, chưa nộp. Thoát lần 2 (> N): server tự nộp.
    await leaveAndReturn(page);
    await expect(page.locator('#selfProctoringBanner')).toContainText('Bạn đã thoát 1/1 lần');
    assert.equal((await attemptOf(student)).status, 'active');
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('#selfProctoringBanner')).toContainText('Bài đã được tự động nộp vì bạn thoát quá 1 lần');
    const done = await attemptOf(student);
    assert.deepEqual([done.status, done.auto_submitted_reason, done.proctoring_mode], ['submitted', 'exit_limit', 'self']);
    assert.equal(await countRows('SELECT count(*)::int AS n FROM learning.self_proctor_incident WHERE attempt_id = $1', [done.id]), 2);
    assert.equal(await countRows('SELECT count(*)::int AS n FROM learning.exam_incident WHERE attempt_id = $1', [done.id]), 0);
    await page.close();
  }
  // HV làm lại nhận lượt mới; HV đã nộp trong phiên cũ vẫn giữ nguyên bài và chế độ Exam Mode.
  const afterRows = await snapshot();
  for (const row of before) assert.deepEqual(afterRows.find(candidate => candidate.id === row.id), row, 'bài nộp Exam Mode cũ giữ nguyên');

  // --- GV xem lại: lịch sử Exam Mode không bị gắn nhầm N/tự nộp; lượt Tự giám sát hiện X/N và nhãn tự nộp. ---
  await openDashboard();
  await expect(teacherPage.locator('#results')).toContainText('Học Viên Mới');
  const rowText = async name => (await teacherPage.locator('#results tr', { hasText: name }).first().innerText()).replace(/\s+/g, ' ');
  assert.match(await rowText('Học Viên Mới'), /2\/1 · Tự nộp do vượt giới hạn/);
  assert.match(await rowText('Học Viên Làm Lại'), /2\/1 · Tự nộp do vượt giới hạn/);
  assert.doesNotMatch(await rowText('Học Viên Thi'), /Tự nộp do vượt giới hạn|\d+\/\d+ ·/, 'lượt Exam Mode cũ không mang N hay nhãn tự nộp');
  assert.deepEqual(pageErrors, []);
});
