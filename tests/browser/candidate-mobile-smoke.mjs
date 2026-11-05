// Smoke test shell thi thật của học viên (link #test=) ở nhiều viewport, API Learning giả lập.
// Chạy tay: PLAYWRIGHT_MODULE=<đường dẫn playwright index.mjs> node tests/browser/candidate-mobile-smoke.mjs
// Không nằm trong `npm test`. Ticket sau thêm kiểm tra vào `checks` và đề vào `definition`.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = 18322;
const origin = `http://127.0.0.1:${port}`;
const TOKEN = '3401-smoke-test-token';

export const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 }
];

// Đề giả lập: 2 phần, đủ dạng cơ bản. Thêm block/item ở đây khi ticket sau cần.
export const definition = {
  title: 'Smoke Test Mobile',
  timing: { totalMinutes: 60 },
  blocks: [
    {
      blockId: 'b1', title: 'Phần A', items: [
        { itemVersionId: 'it-1', position: 1, interactionType: 'single_choice', prompt: 'Câu 1?', points: 1,
          options: [{ id: 'a', text: 'Đáp án A' }, { id: 'b', text: 'Đáp án B' }] },
        { itemVersionId: 'it-2', position: 2, interactionType: 'short_text', prompt: 'Câu 2?', points: 1 }
      ]
    },
    {
      blockId: 'b2', title: 'Phần B', items: [
        { itemVersionId: 'it-3', position: 3, interactionType: 'long_text', prompt: 'Viết đoạn văn ngắn.', points: 5 }
      ]
    },
    {
      // Đề đọc ghép: có readingPassage + câu reading_matching nên renderer dựng split-pane.
      blockId: 'b3', title: 'Phần C', readingPassage: Array.from({ length: 40 }, (_, i) => `<p>Đoạn ${i + 1}. Nội dung bài đọc dài để trang phải cuộn.</p>`).join(''),
      items: [4, 5, 6, 7].map(position => ({
        itemVersionId: `it-${position}`, position, interactionType: 'single_choice', pedagogicalTypeCode: 'reading_matching',
        prompt: `Câu ${position}?`, points: 1,
        options: [{ id: 'a', text: 'Đáp án A' }, { id: 'b', text: 'Đáp án B' }]
      }))
    }
  ]
};

// Giả lập Learning API: resolve → start; mọi route khác trả {}.
function mockLearningApi(page) {
  const attempt = {
    attemptToken: 'smoke-attempt', definitionHash: 'h', draftRevision: 0, status: 'active',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(), definition
  };
  return page.route(`**/api/learning/**`, route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.endsWith('/test-access/resolve')) {
      body = { assignment: { title: definition.title, class: { name: 'Lớp Smoke' }, definition,
        roster: [{ studentRef: 's1', name: 'Học Viên Smoke' }] } };
    } else if (path.endsWith('/attempts/start')) body = { attempt };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

// Mở shell thi thật và trả về page đã vào màn làm bài.
export async function openExamShell(browser, viewport) {
  const page = await browser.newPage({ viewport });
  page.setDefaultTimeout(10000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/learning/')) return route.fallback();
    // Chặn mạng ngoài (font, ...), chỉ cho static server cục bộ.
    return url.origin === origin ? route.continue() : route.abort();
  });
  await mockLearningApi(page);
  await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#test=${TOKEN}`);
  await page.waitForFunction(() => !document.querySelector('#studentSelectInput').disabled);
  await page.selectOption('#studentSelectInput', 's1');
  await page.click('#startExamBtn');
  await page.waitForSelector('.cbt-exam-shell');
  return page;
}

const box = (page, selector) => page.locator(selector).first().boundingBox();

// Mỗi check nhận (page, viewport); ném lỗi nếu sai. Ticket sau thêm vào đây.
export const checks = {
  async noHorizontalScroll(page, vp) {
    if (vp.width === 1440) return;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `cuộn ngang ${overflow}px ở ${vp.width}px`);
  },
  async phoneTopbarCompact(page, vp) {
    if (vp.width >= 640) return;
    const bar = await box(page, '.cbt-topbar');
    assert.ok(bar.height < 187, `thanh trên cao ${bar.height}px ở ${vp.width}px`);
    assert.ok(await page.locator('#examTimerDisplay').isVisible(), 'đồng hồ bị ẩn');
    const timer = await box(page, '#examTimerDisplay');
    assert.ok(timer.y + timer.height <= bar.y + bar.height, 'đồng hồ nằm ngoài thanh trên');
  },
  async phoneControlsStillUsable(page, vp) {
    if (vp.width >= 640) return;
    for (const sel of ['.cbt-nav-pill', '#demo-font-down', '#demo-font-up', '#demo-submit-top']) {
      const b = await box(page, sel);
      assert.ok(b && b.width > 0 && b.x >= 0 && b.x + b.width <= vp.width + 1, `${sel} không dùng được ở ${vp.width}px`);
    }
  },
  async singleColumnBelow1024(page, vp) {
    const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.cbt-exam-layout')).gridTemplateColumns.split(' ').length);
    assert.equal(cols, vp.width < 1024 ? 1 : 2, `số cột sai ở ${vp.width}px`);
  },
  async topbarStaysPinned(page, vp) {
    const y = await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.style.height = '3000px';
      document.querySelector('#examMainViewport').append(spacer);
      scrollTo(0, 1500);
      const top = document.querySelector('.cbt-topbar').getBoundingClientRect().top;
      spacer.remove();
      scrollTo(0, 0);
      return top;
    });
    assert.equal(Math.round(y), 0, `thanh trên không dính khi cuộn ở ${vp.width}px (top=${y})`);
  },
  async readingTabs(page, vp) {
    const visible = sel => page.locator(sel).first().isVisible();
    const tab = pane => page.locator(`.simulation-section-card.active .toggle-pane-btn[data-pane="${pane}"]`);
    const scrollY = () => page.evaluate(() => Math.round(scrollY));
    const scrollTo = async y => { await page.evaluate(v => scrollTo(0, v), y); await page.waitForFunction(v => Math.round(scrollY) === v, y); };
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector('.simulation-nav-pill[data-section-target="sim-block-2"]').click(); });
    await page.waitForSelector('#sim-block-2.active .cbt-split-pane');
    await page.waitForFunction(() => scrollY === 0);
    const reading = '#sim-block-2 .cbt-reading-col', questions = '#sim-block-2 .cbt-matching-col';

    if (vp.width >= 1024) {
      assert.ok(!(await visible('#sim-block-2 .split-pane-mobile-toggle')), `tab còn hiện ở ${vp.width}px`);
      const [r, q] = [await box(page, reading), await box(page, questions)];
      assert.ok(r && q && r.x + r.width <= q.x + 1 && Math.abs(r.y - q.y) < 40, `hai cột không song song ở ${vp.width}px`);
      return;
    }
    assert.ok(await visible('#sim-block-2 .split-pane-mobile-toggle'), `không thấy tab ở ${vp.width}px`);
    assert.ok((await visible(reading)) && !(await visible(questions)), 'mặc định phải chỉ hiện Bài đọc');

    await scrollTo(300);
    await tab('questions').click();
    assert.ok(!(await visible(reading)) && (await visible(questions)), 'sang tab Câu hỏi nhưng cột chưa đổi');
    await page.locator(`${questions} select.candidate-choice-select`).first().selectOption('a');
    await scrollTo(150);
    await tab('reading').click();
    assert.equal(await scrollY(), 300, 'tab Bài đọc không nhớ vị trí cuộn');
    await tab('questions').click();
    assert.equal(await scrollY(), 150, 'tab Câu hỏi không nhớ vị trí cuộn');
    assert.equal(await page.locator(`${questions} select.candidate-choice-select`).first().inputValue(), 'a', 'mất đáp án khi chuyển tab');

    // Tab dính ngay dưới thanh trên khi cuộn.
    await scrollTo(400);
    const [bar, tabs] = [await box(page, '.cbt-topbar'), await box(page, '#sim-block-2 .split-pane-mobile-toggle')];
    assert.ok(Math.abs(tabs.y - (bar.y + bar.height)) <= 1, `tab không dính dưới thanh trên (tab.y=${tabs.y}, bar=${bar.y + bar.height})`);

    // Nhảy tới câu ở tab khác thì tự sang Câu hỏi.
    await tab('reading').click();
    await page.evaluate(() => document.querySelector('.btn-qnav[data-item-id="it-6"]').click());
    assert.ok(await visible(questions), 'nhảy câu không chuyển sang tab Câu hỏi');
    assert.ok(await tab('questions').evaluate(el => el.classList.contains('active')), 'tab Câu hỏi không được đánh dấu active');
  },
  async noLegacyBreakpoints(page) {
    const found = await page.evaluate(() => [...document.styleSheets].flatMap(s => {
      try { return [...s.cssRules]; } catch { return []; }
    }).filter(r => r.media && /(960|1023)px/.test(r.media.mediaText)).map(r => r.media.mediaText));
    assert.deepEqual(found, [], 'còn mốc 960px/1023px');
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const child = spawn(process.execPath, ['serve.mjs', String(port), '127.0.0.1'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Static server startup timed out')), 5000);
      child.once('error', reject);
      child.stdout.on('data', d => { if (String(d).includes(`:${port}/`)) { clearTimeout(t); resolve(); } });
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const report = [];
    for (const vp of VIEWPORTS) {
      const page = await openExamShell(browser, vp);
      const parts = {};
      for (const sel of ['.cbt-topbar', '.cbt-topbar-inner', '.cbt-brand', '.cbt-top-actions', '.cbt-section-nav-wrap']) parts[sel] = (await box(page, sel))?.height;
      if (process.env.SMOKE_VERBOSE) { console.log(vp.width, JSON.stringify(parts)); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${process.env.SMOKE_VERBOSE}/shell-${vp.width}.png` }); }
      for (const check of Object.values(checks)) await check(page, vp);
      assert.deepEqual(page.errors, [], `lỗi trang ở ${vp.width}px`);
      report.push({ width: vp.width, topbar: parts['.cbt-topbar'] });
      await page.close();
    }
    console.log(JSON.stringify(report));
    console.log('candidate-mobile-smoke: OK');
  } finally {
    await browser?.close();
    child.kill();
  }
}
