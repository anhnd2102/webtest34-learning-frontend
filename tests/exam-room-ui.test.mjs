import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('student requests fullscreen from the ready and re-entry click handlers only', async () => {
  const page = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(page, /examReadyButton\?\.addEventListener\('click', async \(\) => \{[\s\S]*?document\.documentElement\.requestFullscreen\(\)/);
  assert.match(page, /examFullscreenReenter\?\.addEventListener\('click', \(\) => \{[\s\S]*?document\.documentElement\.requestFullscreen\(\)/);
  assert.match(page, /\$\('#examGuardReturn'\)\.addEventListener\('click',[\s\S]*?type: 'return_click'/);
  assert.match(page, /command\.type === 'request_fullscreen'[\s\S]*?document\.documentElement\.requestFullscreen\(\)/);
  assert.equal([...page.matchAll(/\.requestFullscreen\(\)/g)].length, 3);
  assert.match(page, /fullscreenchange/);
  assert.match(page, /exam-waiting-error/);
});

test('Exam Guard adds its visibility handler without replacing the audio checkpoint listener', async () => {
  const page = await fs.readFile(new URL('../term-tests/webtest-34-demo/index.html', import.meta.url), 'utf8');
  assert.match(page, /document\.addEventListener\('visibilitychange', \(\) => \{\s*if\(document\.visibilityState === 'hidden'\) snapshotActiveAudio\(\);\s*\}\);/);
  assert.match(page, /document\.addEventListener\('visibilitychange', \(\) => \{\s*if\(document\.visibilityState === 'hidden'\) dispatchExamGuard/);
  assert.match(page, /attempts\/exam\/incidents\/open/);
  assert.match(page, /attempts\/exam\/incidents\/close/);
  assert.match(page, /Giáo viên sẽ được thông báo\./);
});

test('teacher room markup offers a manual refresh, start, and extension control', async () => {
  const page = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(page, /id="exam-room-refresh"/);
  assert.match(page, /id="exam-room-start"[^>]*>Bắt đầu/);
  assert.match(page, /id="exam-room-extend"[^>]*>Gia hạn/);
  assert.match(page, /<th>Tiến độ<\/th><th>Kết nối<\/th>/);
});

test('teacher room consumes the scoped Bearer SSE stream and reconnects with a fresh snapshot', async () => {
  const source = await fs.readFile(new URL('../term-tests/teacher-dashboard/app.js', import.meta.url), 'utf8');
  const styles = await fs.readFile(new URL('../term-tests/teacher-dashboard/styles.css', import.meta.url), 'utf8');
  assert.match(source, /fetch\(`\$\{apiBase\(\)\}\$\{path\}`,[\s\S]*?Authorization: `Bearer \$\{sessionToken\}`[\s\S]*?response\.body\.getReader\(\)/);
  assert.match(source, /parseSseChunk\(buffer/);
  assert.match(source, /message\.event === 'snapshot'[\s\S]*?message\.event === 'exam\.incident\.opened'/);
  assert.match(source, /message\.event === 'exam\.incident\.closed'/);
  assert.match(source, /message\.event === 'exam\.progress\.updated'[\s\S]*?applyExamProgress\(currentExamRoom, message\.data\)/);
  assert.match(source, /message\.event === 'exam\.connection\.changed'[\s\S]*?applyExamConnection\(currentExamRoom, message\.data\)/);
  assert.match(source, /connection\.textContent = formatExamConnectionStatus\(student\.connectionStatus\)/);
  assert.match(source, /progress\.textContent = formatExamProgress\(student\.progress\)/);
  assert.match(source, /row\.append\(name, participation, progress, connection, incidents, device\)/);
  assert.match(source, /await loadExamRoom\(\);[\s\S]*?setTimeout\(resolve, 1000\)/);
  assert.match(styles, /\.exam-incident-active\s*\{[^}]*background:\s*#fee2e2/);
});
