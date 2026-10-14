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
});
