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
      blockId: 'b3', title: 'Phần C', items: [
        { itemVersionId: 'it-4', position: 4, interactionType: 'text_select_pair', prompt: 'Nghe và chọn.', points: 1,
          options: [{ id: 'opt-a', label: 'tháng hai' }, { id: 'opt-b', label: 'tháng ba' }] },
        { itemVersionId: 'it-5', position: 5, interactionType: 'short_text', layoutType: 'inline_cloze', points: 3,
          prompt: 'Một câu văn rất dài để kiểm tra dòng giãn ra (1) _____ và (2) _____ rồi tiếp tục (3) _____ cho đến hết dòng thật dài supercalifragilisticexpialidocious.' },
        { itemVersionId: 'it-6', position: 6, interactionType: 'short_text', pedagogicalTypeCode: 'pictorial_vocabulary',
          layoutType: 'pictorial_card', letterHint: 'F_ _ _ _ _ _ _', points: 1 }
      ]
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
export async function openExamShell(browser, viewport, contextOptions = {}) {
  const page = await browser.newPage({ viewport, ...contextOptions });
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
const isCoarse = page => page.evaluate(() => matchMedia('(pointer: coarse)').matches);
// Hiện mọi phần cùng lúc để đo bố cục; idempotent.
const revealAllSections = page => page.addStyleTag({ content: '.cbt-exam-shell .section-page{display:block !important}' });

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
  async phoneAnswerWide(page, vp) {
    if (vp.width >= 640) return;
    await revealAllSections(page);
    for (const sel of ['.candidate-short-input', '.candidate-pictorial-input']) {
      const b = await box(page, sel);
      assert.ok(b.width >= vp.width * 0.8, `${sel} chỉ rộng ${b.width}px ở ${vp.width}px`);
    }
  },
  async phoneMetaOneLine(page, vp) {
    if (vp.width >= 640) return;
    await revealAllSections(page);
    const tops = await page.evaluate(() => [...document.querySelectorAll('.cbt-question-header')].map(h =>
      [...h.querySelectorAll('.cbt-qnum-badge,.cbt-qscore-badge,.cbt-type-badge')].map(e => Math.round(e.getBoundingClientRect().top))));
    assert.ok(tops.length > 0, 'không có thẻ câu hỏi');
    for (const t of tops) assert.ok(Math.max(...t) - Math.min(...t) <= 4, `thông tin câu xuống dòng ở ${vp.width}px: ${t}`);
  },
  async phoneSectionHeroCompact(page, vp) {
    if (vp.width >= 640) return;
    const hero = await box(page, '.cbt-section-hero');
    assert.ok(hero.height <= 110, `thẻ tiêu đề phần cao ${hero.height}px ở ${vp.width}px`);
  },
  async coarseInputsNoZoomEvenWhenFontShrunk(page) {
    if (!await isCoarse(page)) return;
    await revealAllSections(page);
    await page.click('#demo-font-down');
    await page.click('#demo-font-down');
    const small = await page.evaluate(() => [...document.querySelectorAll('.cbt-exam-shell input[type=text], .cbt-exam-shell select, .cbt-exam-shell textarea')]
      .map(e => [e.className, parseFloat(getComputedStyle(e).fontSize)]).filter(([, f]) => f < 16));
    assert.deepEqual(small, [], 'ô nhập cỡ chữ dưới 16px trên màn cảm ứng');
  },
  async coarseTouchTargets44(page) {
    if (!await isCoarse(page)) return;
    await revealAllSections(page);
    const sel = '.cbt-exam-shell input[type=text], .cbt-exam-shell select, .cbt-exam-shell textarea, .cbt-exam-shell .candidate-choice-label, .cbt-exam-shell button';
    const small = await page.evaluate(s => [...document.querySelectorAll(s)].map(e => [e.className || e.tagName, e.getBoundingClientRect()])
      .filter(([, r]) => r.width > 0 && r.height > 0 && r.height < 43.5).map(([c, r]) => `${c}:${Math.round(r.height)}`), sel);
    assert.deepEqual(small, [], 'vùng chạm dưới 44px');
  },
  async clozeStaysInsideCard(page, vp) {
    await revealAllSections(page);
    const bad = await page.evaluate(() => [...document.querySelectorAll('.cbt-cloze-content, .cbt-cloze-line')].filter(e => e.scrollWidth > e.clientWidth + 1).length);
    assert.equal(bad, 0, `cloze tràn ngang ở ${vp.width}px`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(vp.width === 1440 || overflow <= 0, `cuộn ngang ${overflow}px ở ${vp.width}px`);
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
      if (vp.width < 1024) {
        // Màn cảm ứng thật (pointer: coarse) cho các luật chỉ áp dụng trên điện thoại/máy tính bảng.
        const touch = await openExamShell(browser, vp, { hasTouch: true, isMobile: true });
        for (const check of Object.values(checks)) await check(touch, vp);
        assert.deepEqual(touch.errors, [], `lỗi trang (cảm ứng) ở ${vp.width}px`);
        await touch.close();
      }
    }
    console.log(JSON.stringify(report));
    console.log('candidate-mobile-smoke: OK');
  } finally {
    await browser?.close();
    child.kill();
  }
}
