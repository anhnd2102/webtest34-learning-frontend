import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const fallback = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || fallback).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const port = 18323;
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
});
const room = name => ({ status: 'running', readyCount: 1, totalCount: 1, students: [{ studentRef: 's1', name, status: 'in_progress', progress: { answered: 0, total: 2 }, connectionStatus: 'connected' }] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Static server startup timed out')), 5000);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Static server exited ${code}`)); });
    server.stdout.on('data', data => {
      if (String(data).includes(`:${port}/`)) { clearTimeout(timeout); resolve(); }
    });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = [];
  const artifacts = new URL('../../.git/verification/issue-23/', import.meta.url);
  await mkdir(artifacts, { recursive: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      sessionStorage.setItem('izone_teacher_token', 'synthetic-browser-room-token');
      const nativeFetch = window.fetch.bind(window);
      window.roomFixture = { streams: [] };
      window.fetch = (input, options = {}) => {
        const url = new URL(String(input), location.href);
        if (!url.pathname.endsWith('/exam/events')) return nativeFetch(input, options);
        const entry = { url: url.pathname, cancelled: false, signal: options.signal };
        const body = new ReadableStream({
          start(controller) { entry.controller = controller; },
          cancel() { entry.cancelled = true; }
        });
        window.roomFixture.streams.push(entry);
        return Promise.resolve(new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }));
      };
    });
    let roomReads = 0;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.startsWith('/api/teacher/')) {
        let payload;
        if (path.endsWith('/auth/me')) payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } };
        else if (path.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Synthetic class', courseCode: '34', status: 'on_going' }] };
        else if (path.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', title: 'Synthetic assignment', courseCode: '34', examMode: true, status: 'published' }] };
        else if (path.endsWith('/results')) payload = { assignment: { assignmentId: 'assign-1' }, skills: [], students: [] };
        else if (path.endsWith('/portal-tests')) payload = { tests: [] };
        else if (path.endsWith('/exam/room')) { roomReads++; payload = { room: room('REST student') }; }
        else {
          errors.push(`Unexpected API fixture path ${path}`);
          return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
      return route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1#dashboard`);
    await page.locator('#exam-room-open').waitFor({ state: 'visible' });
    const send = async (index, event, data) => page.evaluate(({ index, event, data }) => {
      roomFixture.streams[index].controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    }, { index, event, data });
    for (let i = 0; i < 10; i++) {
      // Keyboard activation exercises focus and the actual room controls.
      await page.locator('#exam-room-open').focus();
      await page.locator('#exam-room-open').press('Enter');
      await page.waitForFunction(count => roomFixture.streams.length === count, i + 1);
      await send(i, 'snapshot', { room: room(`Current student ${i}`) });
      await page.waitForFunction(name => document.querySelector('#exam-room-students')?.textContent.includes(name), `Current student ${i}`);
      await send(i, 'exam.progress.updated', { studentRef: 's1', progress: { answered: 1, total: 2 } });
      await page.waitForFunction(() => document.querySelector('#exam-room-students')?.textContent.includes('1/2'));
      if (i === 0) await page.screenshot({ path: fileURLToPath(new URL(`room-${viewport.width}.png`, artifacts)), fullPage: true });
      await page.locator('#exam-room-close').focus();
      await page.locator('#exam-room-close').press('Enter');
      await page.waitForFunction(index => roomFixture.streams[index].cancelled && roomFixture.streams[index].signal.aborted, i);
    }
    await page.locator('#exam-room-open').click();
    await page.waitForFunction(() => roomFixture.streams.length === 11);
    await page.evaluate(() => roomFixture.streams[10].controller.close());
    await page.waitForFunction(() => roomFixture.streams.length === 12);
    await send(11, 'snapshot', { room: room('Reconnected student') });
    await page.waitForFunction(() => document.querySelector('#exam-room-students')?.textContent.includes('Reconnected student'));
    const beforeFallback = roomReads;
    await page.evaluate(() => roomFixture.streams[11].controller.close());
    await page.waitForFunction(() => document.querySelector('#exam-room-students')?.textContent.includes('REST student'));
    assert.ok(roomReads > beforeFallback);
    await page.locator('#exam-room-close').click();
    await page.waitForTimeout(1200);
    assert.equal(await page.evaluate(() => roomFixture.streams.length), 12, 'closed owner does not reconnect');
    assert.equal(errors.length, 0, errors.join('\n'));
    report.push({ viewport: `${viewport.width}x${viewport.height}`, cycles: 10, reconnect: 'verified', errors: 0 });
    await page.close();
  }
  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  if (browser) await browser.close();
  server.kill();
}
