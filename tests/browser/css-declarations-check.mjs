// Kiểm chứng scripts/css-declarations.mjs với CSSOM thật của Chrome:
// với mỗi rule (thứ tự như rule-map), tập longhand có priority "important" do CSSOM báo phải bằng tập longhand
// suy ra từ các khai báo !important mà công cụ tìm thấy (bung shorthand bằng chính CSSOM).
//   node tests/browser/css-declarations-check.mjs
// Thoát mã 1 nếu có rule lệch; in từng rule lệch (thường là khai báo CSS không hợp lệ bị CSSOM bỏ).
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { scanDeclarations } from '../../scripts/css-declarations.mjs';

const localPlaywright = 'C:/Users/OS/.nuget/packages/microsoft.playwright/1.63.0/.playwright/package/index.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE || localPlaywright).href);
const root = process.env.FRONTEND_ROOT || fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT || 18340);
const server = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

const inventory = scanDeclarations();
const expectedProperties = new Map();
for (const declaration of inventory) {
  if (!declaration.important) continue;
  if (!expectedProperties.has(declaration.order)) expectedProperties.set(declaration.order, []);
  expectedProperties.get(declaration.order).push([declaration.property, declaration.value]);
}

let browser;
let mismatches = 0;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server startup timeout')), 5000);
    server.once('error', error => { clearTimeout(timer); reject(error); });
    server.stdout.on('data', data => { if (String(data).includes(`:${port}/`)) { clearTimeout(timer); resolve(); } });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' || Number(url.port) !== port) return route.abort();
    return route.continue();
  });
  await page.goto(`http://127.0.0.1:${port}/term-tests/teacher-dashboard/index.html`);
  await page.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href && new URL(sheet.href).pathname.endsWith('/styles.css')));
  await page.waitForTimeout(800);
  const result = await page.evaluate(expected => {
    const rules = [];
    function visit(list) {
      for (const rule of list) {
        if (rule.styleSheet) visit(rule.styleSheet.cssRules);
        else if (rule.selectorText) rules.push(rule);
        else if (rule.constructor.name === 'CSSMediaRule') visit(rule.cssRules);
      }
    }
    for (const sheet of document.styleSheets) if (sheet.href && new URL(sheet.href).pathname.endsWith('/styles.css')) visit(sheet.cssRules);
    const probe = document.createElement('div');
    const longhandsOf = (property, value) => {
      probe.style.cssText = '';
      probe.style.setProperty(property, value, 'important');
      return [...probe.style].filter(name => probe.style.getPropertyPriority(name) === 'important');
    };
    const differences = [];
    rules.forEach((rule, order) => {
      const actual = new Set();
      for (const name of rule.style) if (rule.style.getPropertyPriority(name) === 'important') actual.add(name);
      const wanted = new Set();
      for (const [property, value] of expected[order] || []) for (const name of longhandsOf(property, value)) wanted.add(name);
      const missing = [...wanted].filter(name => !actual.has(name));
      const extra = [...actual].filter(name => !wanted.has(name));
      if (missing.length || extra.length) differences.push({ order, selector: rule.selectorText, missing, extra });
    });
    return { rules: rules.length, differences };
  }, Object.fromEntries(expectedProperties));
  console.log(`CSSOM rules: ${result.rules}; inventory rules: ${new Set(inventory.map(d => d.order)).size}`);
  if (result.rules !== new Set(inventory.map(d => d.order)).size) mismatches++;
  for (const difference of result.differences) { mismatches++; console.log('DIFF', JSON.stringify(difference)); }
  console.log(mismatches ? `FAIL: ${mismatches} mismatch(es)` : 'OK: declaration inventory matches CSSOM priorities for every rule');
} finally {
  await browser?.close();
  server.kill();
}
process.exit(mismatches ? 1 : 0);
