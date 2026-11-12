import { readDashboardCss } from './helpers/dashboard-css.mjs';
import { readDashboardSource } from './helpers/dashboard-source.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';



test('teacher room markup offers a manual refresh, start, and extension control', async () => {
  const page = await fs.readFile(new URL('../term-tests/teacher-dashboard/index.html', import.meta.url), 'utf8');
  assert.match(page, /id="exam-room-refresh"/);
  assert.match(page, /id="exam-room-start"[^>]*>Bắt đầu/);
  assert.match(page, /id="exam-room-extend"[^>]*>Gia hạn/);
  assert.match(page, /<th>Tiến độ<\/th><th>Kết nối<\/th>/);
});

test('teacher room consumes the scoped Bearer SSE stream and reconnects with a fresh snapshot', async () => {
  const source = readDashboardSource();
  const styles = await readDashboardCss();
  assert.match(source, /fetch\(`\$\{origin\}\$\{path\}`,[\s\S]*?Authorization: `Bearer \$\{token\}`[\s\S]*?response\.body\.getReader\(\)/);
  assert.match(source, /parseSseChunk\(buffer/);
  assert.match(source, /message\.event === 'snapshot'[\s\S]*?message\.event === 'exam\.incident\.opened'/);
  assert.match(source, /message\.event === 'exam\.incident\.closed'/);
  assert.match(source, /message\.event === 'exam\.progress\.updated'[\s\S]*?applyExamProgress\((?:viewState\.)?currentExamRoom, message\.data\)/);
  assert.match(source, /message\.event === 'exam\.connection\.changed'[\s\S]*?applyExamConnection\((?:viewState\.)?currentExamRoom, message\.data\)/);
  assert.match(source, /connection\.textContent = formatExamConnectionStatus\(student\.connectionStatus\)/);
  assert.match(source, /progress\.textContent = formatExamProgress\(student\.progress\)/);
  assert.match(source, /row\.append\(name, participation, progress, connection, incidents, device, retake\)/);
  // Timing, fallback and cleanup are exercised through mountDashboard in exam-room-lifecycle.test.mjs.
  assert.match(source, /refresh: \(\) => loadExamRoom\(session\)/);
  assert.match(styles, /\.exam-incident-active\s*\{[^}]*background:\s*#fee2e2/);
});
