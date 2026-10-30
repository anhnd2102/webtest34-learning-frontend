// Export historical frontend snapshots; never checkout/reset/revert the user's workspace.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const playwright = process.env.PLAYWRIGHT_MODULE || 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(playwright).href);
const root = fileURLToPath(new URL('../../', import.meta.url));
const artifacts = path.resolve(root, '.git/verification/issue-24');
const refs = ['a8c203c', '7ab2f3e', 'e263d26', '915bc91', 'ad358df'];
const port = 18325;
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = [];
try {
  for (const ref of refs) {
    const commit = execFileSync('git', ['rev-parse', `${ref}^{commit}`], { cwd: root, encoding: 'utf8' }).trim();
    const snapshot = path.resolve(artifacts, 'source-snapshots', ref);
    assert.ok(snapshot.startsWith(artifacts + path.sep));
    await mkdir(snapshot, { recursive: true });
    const archive = path.resolve(artifacts, `${ref}.tar`);
    // Synthetic fixtures require dashboard source, not the canonical renderer's audio/media.
    execFileSync('git', ['archive', '--format=tar', `--output=${archive}`, commit, '--', 'serve.mjs', 'package.json', 'term-tests/teacher-dashboard', 'term-tests/34-shared'], { cwd: root });
    execFileSync('tar', ['-xf', archive, '-C', snapshot]);
    const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: snapshot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Snapshot server timeout')), 5000);
        server.once('error', error => { clearTimeout(timeout); reject(error); });
        server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Snapshot server exited ${code}`)); });
        server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timeout); resolve(); } });
      });
      for (const prefix of ['', '/preview-base']) {
        const page = await browser.newPage();
        page.setDefaultTimeout(10000);
        const errors = [];
        const modules = [];
        let restores = 0;
        page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {
          if (new URL(response.url()).pathname.endsWith('.js')) modules.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
        });
        await page.addInitScript(() => sessionStorage.setItem('izone_teacher_token', 'synthetic-rollback-token'));
        await page.route('**/*', async route => {
          const url = new URL(route.request().url());
          const pathname = url.pathname;
          if (pathname.startsWith('/api/teacher/')) {
            let payload = {};
            if (pathname.endsWith('/auth/me')) { restores++; payload = { teacher: { name: 'Synthetic teacher', role: 'admin', courseCodes: ['34'] } }; }
            else if (pathname.endsWith('/classes')) payload = { classes: [{ classId: '101', name: 'Synthetic class', courseCode: '34', status: 'on_going' }] };
            else if (pathname.endsWith('/assignments')) payload = { assignments: [{ assignmentId: 'assign-1', title: 'Synthetic assignment', courseCode: '34', status: 'published' }] };
            else if (pathname.endsWith('/results')) payload = { assignment: { assignmentId: 'assign-1' }, students: [], skills: [] };
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
          }
          if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
          if (prefix && pathname.startsWith(prefix + '/')) return route.fulfill({ response: await route.fetch({ url: url.href.replace(prefix + '/', '/') }) });
          return route.continue();
        });
        await page.goto(`http://127.0.0.1:${port}${prefix}/term-tests/teacher-dashboard/index.html?classId=101&assignmentId=assign-1&q=rollback#grading`);
        await page.waitForFunction(() => document.querySelector('#status')?.textContent === 'Đã cập nhật bảng kết quả');
        assert.equal(await page.locator('#class-select').inputValue(), '101');
        assert.equal(await page.locator('#assignment-select').inputValue(), 'assign-1');
        assert.equal(await page.locator('#search-input').inputValue(), 'rollback');
        assert.equal(await page.locator('#view-grading').isVisible(), true);
        const entry = await page.locator('script[type="module"][src]').getAttribute('src');
        assert.ok(entry.includes(ref === 'ad358df' ? 'app.js' : 'main.js'));
        assert.equal(restores, 1);
        assert.ok(modules.every(module => module.status === 200 && module.type?.includes('javascript')));
        assert.deepEqual(errors, []);
        report.push({ ref, commit, prefix: prefix || '/', entry, modules: modules.length, restores, errors: 0 });
        await page.close();
      }
    } finally {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill();
      await exited;
    }
  }
  await writeFile(path.join(artifacts, 'rollback-report.json'), JSON.stringify({ browser: browser.version(), node: process.version, report }, null, 2));
  process.stdout.write(JSON.stringify({ status: 'passed', report }) + '\n');
} finally {
  await browser.close();
}
