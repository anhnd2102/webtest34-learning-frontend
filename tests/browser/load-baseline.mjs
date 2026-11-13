// Đo baseline tải (số request, byte, thời gian) cho hai màn vào đầu: shell học viên và dashboard giáo viên.
// Mục đích: có số gốc để so với ngưỡng đã chốt (REFACTOR_PLAN mục 8) trước khi emit `.ts`/đổi artifact Pages.
// Chạy tay: PLAYWRIGHT_MODULE=<đường dẫn playwright/index.mjs> node tests/browser/load-baseline.mjs
// Biến: LOAD_RUNS (mặc định 5), LOAD_OUT (ghi JSON), LOAD_GZIP=0 để phục vụ không nén, LOAD_ROOT (thư mục phục vụ).
// Không nằm trong `npm test`. Cache lạnh mỗi lượt, API Learning giả, mạng ngoài bị chặn, không chạm production.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

// LOAD_ROOT=_site để đo đúng artifact Pages đã dựng bằng `npm run stage:pages`.
const root = process.env.LOAD_ROOT ? path.resolve(process.env.LOAD_ROOT) : fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18340;
const origin = `http://127.0.0.1:${port}`;
const runs = Number(process.env.LOAD_RUNS) || 5;
const gzip = process.env.LOAD_GZIP !== '0'; // GitHub Pages phục vụ nén; mặc định mô phỏng điều đó.
const TOKEN = '3401-load-baseline-token';

// Thông số mạng ghi rõ để so sánh được. Byte/giây = bit/giây / 8.
export const PROFILES = {
  none: null,
  fast4g: { latency: 60, downloadThroughput: (9_000_000 / 8), uploadThroughput: (1_500_000 / 8) },
  slow4g: { latency: 150, downloadThroughput: (1_600_000 / 8), uploadThroughput: (750_000 / 8) }
};

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg'
};
const compressible = new Set(['.html', '.js', '.mjs', '.json', '.css', '.svg']);

// Static server nhỏ riêng cho phép đo, có gzip tuỳ chọn; không dùng serve.mjs vì nó không nén.
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, origin);
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
    const ext = path.extname(file).toLowerCase();
    const headers = { 'content-type': mime[ext] || 'application/octet-stream', 'cache-control': 'no-store' };
    if (gzip && compressible.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
      headers['content-encoding'] = 'gzip';
      res.writeHead(200, headers);
      createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    } else {
      res.writeHead(200, headers);
      createReadStream(file).pipe(res);
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

const definition = {
  title: 'Load Baseline', timing: { totalMinutes: 60 },
  blocks: [{ blockId: 'b1', title: 'Phần A', items: [
    { itemVersionId: 'it-1', position: 1, interactionType: 'single_choice', prompt: 'Câu 1?', points: 1,
      options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
    { itemVersionId: 'it-2', position: 2, interactionType: 'short_text', prompt: 'Câu 2?', points: 1 }
  ] }]
};

async function mockApi(page) {
  const attempt = { attemptToken: 'load-attempt', definitionHash: 'h', draftRevision: 0, status: 'active',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(), definition };
  await page.route('**/api/**', route => {
    const p = new URL(route.request().url()).pathname;
    if (p.endsWith('/test-access/resolve')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        assignment: { title: definition.title, class: { name: 'Lớp Load' }, definition, roster: [{ studentRef: 's1', name: 'Học Viên' }] } }) });
    }
    if (p.endsWith('/attempts/start')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ attempt }) });
    // Dashboard: chưa đăng nhập, mọi API khác trả 401 để màn đầu dựng xong mà không cần dữ liệu thật.
    return route.fulfill({ status: p.includes('/api/learning/') ? 200 : 401, contentType: 'application/json', body: '{}' });
  });
}

const SCENARIOS = {
  // Từ lúc mở link tới khi màn chọn học viên dùng được, rồi tới khi vào được màn làm bài.
  async candidate(page, mark) {
    await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#test=${TOKEN}`);
    await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
    mark('startScreenReady');
    await page.selectOption('#studentSelectInput', 's1');
    await page.click('#startExamBtn');
    await page.waitForSelector('.cbt-exam-shell');
    mark('examShellReady');
  },
  async dashboard(page, mark) {
    await page.goto(`${origin}/term-tests/teacher-dashboard/index.html`, { waitUntil: 'load' });
    mark('load');
    await page.waitForLoadState('networkidle');
    mark('networkIdle');
  }
};

async function measureOnce(browser, scenario, profile) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const reqs = new Map();
  cdp.on('Network.requestWillBeSent', e => { if (e.request.url.startsWith(origin)) reqs.set(e.requestId, { type: e.type, url: e.request.url, wire: 0, decoded: 0 }); });
  cdp.on('Network.dataReceived', e => { const r = reqs.get(e.requestId); if (r) r.decoded += e.dataLength; });
  cdp.on('Network.loadingFinished', e => { const r = reqs.get(e.requestId); if (r) r.wire = e.encodedDataLength; });
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin === origin) return route.fallback();
    return route.abort();
  });
  await mockApi(page);
  const p = PROFILES[profile];
  if (p) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...p });
  const marks = {};
  const t0 = Date.now();
  const mark = name => { marks[name] = Date.now() - t0; };
  await SCENARIOS[scenario](page, mark);
  await context.close();
  const all = [...reqs.values()].filter(r => !r.url.includes('/api/'));
  const sum = (arr, k) => arr.reduce((s, r) => s + r[k], 0);
  const byType = type => all.filter(r => r.type === type);
  return {
    marks,
    requests: all.length,
    wireTotal: sum(all, 'wire'),
    jsRequests: byType('Script').length,
    jsWire: sum(byType('Script'), 'wire'),
    jsDecoded: sum(byType('Script'), 'decoded'),
    cssRequests: byType('Stylesheet').length,
    cssWire: sum(byType('Stylesheet'), 'wire'),
    cssDecoded: sum(byType('Stylesheet'), 'decoded')
  };
}

const median = values => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const kb = n => `${(n / 1024).toFixed(0)} KB`;

const server = await startServer();
let browser;
const report = { generatedAt: new Date().toISOString(), runs, gzip, profiles: PROFILES, results: {} };
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const scenario of Object.keys(SCENARIOS)) {
    report.results[scenario] = {};
    for (const profile of Object.keys(PROFILES)) {
      const samples = [];
      for (let i = 0; i < runs; i++) samples.push(await measureOnce(browser, scenario, profile));
      const markNames = Object.keys(samples[0].marks);
      const row = {
        requests: samples[0].requests, wireTotal: median(samples.map(s => s.wireTotal)),
        jsRequests: samples[0].jsRequests, jsWire: median(samples.map(s => s.jsWire)), jsDecoded: median(samples.map(s => s.jsDecoded)),
        cssRequests: samples[0].cssRequests, cssWire: median(samples.map(s => s.cssWire)), cssDecoded: median(samples.map(s => s.cssDecoded)),
        marksMs: Object.fromEntries(markNames.map(m => [m, { median: median(samples.map(s => s.marks[m])), max: Math.max(...samples.map(s => s.marks[m])) }]))
      };
      report.results[scenario][profile] = row;
      const times = markNames.map(m => `${m} ${row.marksMs[m].median} ms (max ${row.marksMs[m].max})`).join(', ');
      console.log(`${scenario.padEnd(9)} ${profile.padEnd(7)} req ${row.requests} | JS ${row.jsRequests} file ${kb(row.jsWire)} nén / ${kb(row.jsDecoded)} gốc | CSS ${row.cssRequests} file ${kb(row.cssWire)} nén | ${times}`);
    }
  }
} finally {
  await browser?.close();
  server.close();
}
if (process.env.LOAD_OUT) writeFileSync(process.env.LOAD_OUT, `${JSON.stringify(report, null, 2)}\n`);
