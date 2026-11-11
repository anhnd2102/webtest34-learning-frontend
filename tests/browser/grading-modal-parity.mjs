// Parity fixture cho modal chi tiết câu (grading/attempt-review.js).
//   ARTIFACT_DIR=<dir> [FRONTEND_ROOT=<root>] node tests/browser/grading-modal-parity.mjs
// Ghi <viewport>-<state>-computed.json và .png vào ARTIFACT_DIR. So sánh hai lần chạy:
//   node tests/browser/grading-modal-parity.mjs --compare <dirBaseline> <dirAfter>
// Dữ liệu hoàn toàn tổng hợp; không gọi API thật.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

if (process.argv[2] === '--compare') {
  const [a, b] = [process.argv[3], process.argv[4]];
  let bad = 0;
  for (const name of (await readdir(a)).filter(n => n.endsWith('-computed.json'))) {
    const left = JSON.parse(await readFile(`${a}/${name}`, 'utf8'));
    const right = JSON.parse(await readFile(`${b}/${name}`, 'utf8').catch(() => 'null'));
    if (!right) { console.log(`MISSING ${name}`); bad++; continue; }
    // So theo thứ tự DOM; bỏ qua attribute class vì class chính là thứ được đổi.
    const diffs = [];
    if (left.length !== right.length) diffs.push(`length ${left.length} vs ${right.length}`);
    for (let i = 0; i < Math.min(left.length, right.length); i++) {
      if (left[i].tag !== right[i].tag) diffs.push(`#${i} tag ${left[i].tag} vs ${right[i].tag}`);
      for (const key of Object.keys(left[i].styles)) {
        if (left[i].styles[key] !== right[i].styles[key]) diffs.push(`#${i} <${left[i].tag} class="${left[i].class}"> ${key}: ${left[i].styles[key]} -> ${right[i].styles[key]}`);
      }
    }
    console.log(`${diffs.length ? 'DIFF ' : 'SAME '}${name} (${left.length} elements)`);
    for (const d of diffs.slice(0, 20)) console.log('   ', d);
    bad += diffs.length ? 1 : 0;
  }
  process.exit(bad ? 1 : 0);
}

const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
const root = process.env.FRONTEND_ROOT || fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18331);
const artifacts = process.env.ARTIFACT_DIR;
assert.ok(artifacts, 'ARTIFACT_DIR is required');
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

const attempt = {
  student: { name: 'Synthetic student', email: 'student@example.test' },
  class: { name: 'Synthetic class', courseCode: '34' },
  assignment: { title: 'Synthetic assignment' },
  attempt: { attemptId: 'att-1', formVersion: 1, status: 'submitted', startedAt: '2026-10-30T01:00:00Z', submittedAt: '2026-10-30T01:40:00Z', publication: { published: false } },
  retakeGrant: { status: 'active' },
  incidents: [], incidentCount: 0,
  scores: { total: { earned: 3, max: 6, provisional: true }, skills: {} },
  skills: [],
  attemptHistory: [],
  manualGrading: { status: 'draft', revision: 0 },
  items: [
    { itemVersionId: 'i1', position: 1, primarySkill: 'vocabulary', sectionId: 's1', sectionTitle: 'Phần từ vựng', prompt: 'Chọn từ đúng cho câu: She ____ to school.', helpText: 'Chọn một đáp án.',
      options: [{ id: 'A', label: 'go' }, { id: 'B', label: 'goes' }, { id: 'C', label: 'going' }],
      studentAnswer: 'A', expectedAnswer: 'B', expectedOptionId: 'B', scoreEarned: 0, maxScore: 1, verdict: 'incorrect', needsReview: false, canGrade: false },
    { itemVersionId: 'i2', position: 2, primarySkill: 'writing', sectionId: 's2', sectionTitle: 'Phần viết', prompt: 'Write two sentences about your weekend.', helpText: null,
      studentAnswer: 'I stayed home and read a book.', expectedAnswer: 'Sample answer about a weekend.',
      feedback: { structureScore: 1, accuracyScore: 1, evidence: ['Đủ ý'], errors: [{ message: 'Thiếu mạo từ' }] },
      scoreEarned: 2, maxScore: 5, verdict: 'partial', needsReview: true, canGrade: true, draftScore: 2, draftFeedback: 'Cần thêm chi tiết', isOverridden: true, originalScore: 1 }
  ]
};
const results = {
  assignment: { assignmentId: 'assign-1', title: 'Synthetic assignment' }, skills: [],
  students: [{ studentRef: 's1', name: 'Synthetic student', email: 'student@example.test', status: 'submitted', attemptId: 'att-1', scores: { total: { earned: 3, max: 6 }, skills: {} } }],
  pagination: { page: 1, totalPages: 1, totalItems: 1, pageSize: 25 }
};

let browser;
try {
  await mkdir(artifacts, { recursive: true });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, reducedMotion: 'reduce', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => sessionStorage.setItem('izone_teacher_token', 'synthetic-token'));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.startsWith('/api/teacher/')) {
        let payload = {};
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Synthetic class', courseCode: '34', status: 'on_going' }] };
        else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', classId: '101', title: 'Synthetic assignment', courseCode: '34', status: 'published' }] };
        else if (path.endsWith('/results')) payload = results;
        else if (path.includes('/attempts/att-1')) payload = attempt;
        else if (path.endsWith('/exam/room')) payload = { room: { status: 'idle', students: [] } };
        else if (path.endsWith('/portal-tests')) payload = { tests: [] };
        else if (path.endsWith('/course-test-catalog')) payload = { catalog: [] };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#grading`);
    await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' });
    const capture = async (name, selector) => {
      await page.mouse.move(-1, -1);
      await page.evaluate(async () => { await document.fonts.ready; document.activeElement?.blur?.(); });
      const styles = await page.evaluate(sel => {
        const props = ['display', 'position', 'color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'width', 'height', 'padding', 'margin', 'border', 'border-radius', 'overflow', 'white-space', 'text-transform', 'letter-spacing', 'justify-content', 'align-items', 'gap', 'text-align'];
        const host = document.querySelector(sel);
        return [host, ...host.querySelectorAll('*')].map(el => ({ tag: el.tagName, class: el.getAttribute('class'), styles: Object.fromEntries(props.map(k => [k, getComputedStyle(el).getPropertyValue(k)])) }));
      }, selector);
      await writeFile(`${artifacts}/${viewport.width}-${name}-computed.json`, JSON.stringify(styles));
      await page.locator(selector).first().screenshot({ path: `${artifacts}/${viewport.width}-${name}.png`, animations: 'disabled', caret: 'hide' });
    };
    await page.evaluate(() => { location.hash = '#grading'; });
    await page.locator('.btn-view-attempt').first().click();
    await page.locator('#detail-items-body .btn-inspect-item').first().waitFor();
    await capture('detail-meta', '#detail-meta');
    await capture('detail-items', '#detail-items-body');
    for (const [name, id] of [['modal-choice', 'i1'], ['modal-overridden', 'i2']]) {
      const inspect = page.locator(`#detail-items-body .btn-inspect-item[data-item-id="${id}"]`);
      if (!(await inspect.isVisible())) { await page.locator('.btn-view-attempt').first().click(); await inspect.waitFor(); }
      await inspect.click();
      await page.locator('#item-context-modal[open]').waitFor();
      await page.waitForTimeout(300);
      await capture(name, '#modal-item-content');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#item-context-modal[open]'));
    }
    assert.deepEqual(errors, [], `browser errors at ${viewport.width}`);
    await page.close();
  }
  console.log(`captured to ${artifacts}`);
} finally {
  await browser?.close();
  server.kill();
}
