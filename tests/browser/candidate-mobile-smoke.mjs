// Smoke test shell thi thật của học viên (link #test=) ở nhiều viewport, API Learning giả lập.
// Chạy tay: PLAYWRIGHT_MODULE=<đường dẫn playwright index.mjs> node tests/browser/candidate-mobile-smoke.mjs
// Không nằm trong `npm test`. Ticket sau thêm kiểm tra vào `checks` và đề vào `definition`.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);

const root = fileURLToPath(new URL('../../', import.meta.url));
const port = Number(process.env.SMOKE_PORT) || 18322;
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
    },
    {
      // Đề đọc ghép: có readingPassage + câu reading_matching nên renderer dựng split-pane.
      blockId: 'b4', title: 'Phần D', readingPassage: Array.from({ length: 40 }, (_, i) => `<p>Đoạn ${i + 1}. Nội dung bài đọc dài để trang phải cuộn.</p>`).join(''),
      items: [7, 8, 9, 10].map(position => ({
        itemVersionId: `it-${position}`, position, interactionType: 'single_choice', pedagogicalTypeCode: 'reading_matching',
        prompt: `Câu ${position}?`, points: 1,
        options: [{ id: 'a', text: 'Đáp án A' }, { id: 'b', text: 'Đáp án B' }]
      }))
    },
    {
      // Bảng dán từ trình soạn thảo trong đề điền từ, có ô trống và độ rộng cố định.
      blockId: 'b5', title: 'Phần E', items: [{
        itemVersionId: 'it-11', position: 11, interactionType: 'short_text', pedagogicalTypeCode: 'table_completion', layoutType: 'inline_cloze', points: 3,
        prompt: `<p>Listen and complete.</p><table style="width:900px"><thead><tr><th></th><th>The right career</th></tr></thead><tbody><tr><td></td><td></td></tr><tr><td style="width:300px"><b>Factors for the right career</b></td><td style="width:600px"><b>There are some factors</b><br>The most important: A job suitable for your personality (1) ........ E.g: Outgoing people can be tour guides. Happiness at work changes (2) ........ and more.</td></tr><tr><td><b>Other factors</b></td><td>The money or the (3) ........ may not be the right factors</td></tr></tbody></table>`
      }]
    }
  ]
};

// Giả lập Learning API: resolve → start; mọi route khác trả {}.
function mockLearningApi(page, attemptExtra = {}) {
  const attempt = {
    ...attemptExtra,
    attemptToken: 'smoke-attempt', definitionHash: 'h', draftRevision: 0, status: 'active',
    expiresAt: new Date(Date.now() + 3600_000).toISOString(), definition
  };
  return page.route(`**/api/learning/**`, route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path.endsWith('/attempts/draft')) page.draftCalls = (page.draftCalls || 0) + 1;
    // Ticket #28: page.draftFails = mã HTTP làm /attempts/draft thất bại, để thử dải báo lỗi lưu.
    if (path.endsWith('/attempts/draft') && page.draftFails) {
      return route.fulfill({ status: page.draftFails, contentType: 'application/json', body: '{"error":"down"}' });
    }
    if (path.endsWith('/test-access/resolve')) {
      body = { assignment: { title: definition.title, class: { name: 'Lớp Smoke' }, definition,
        roster: [{ studentRef: 's1', name: 'Học Viên Smoke' }] } };
    } else if (path.endsWith('/attempts/start')) body = { attempt };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

// Mở shell thi thật và trả về page đã vào màn làm bài.
export async function openExamShell(browser, viewport, contextOptions = {}, attemptExtra = {}, initScript) {
  const page = await openStartScreen(browser, viewport, contextOptions, attemptExtra, initScript);
  await page.selectOption('#studentSelectInput', 's1');
  await page.click('#startExamBtn');
  await page.waitForSelector('.cbt-exam-shell');
  return page;
}

// Mở màn hình bắt đầu (đã tải danh sách lớp), chưa vào bài.
export async function openStartScreen(browser, viewport, contextOptions = {}, attemptExtra = {}, initScript) {
  const page = await browser.newPage({ viewport, ...contextOptions });
  if (initScript) await page.addInitScript(initScript);
  page.setDefaultTimeout(10000);
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/learning/')) return route.fallback();
    // Chặn mạng ngoài (font, ...), chỉ cho static server cục bộ.
    return url.origin === origin ? route.continue() : route.abort();
  });
  await mockLearningApi(page, attemptExtra);
  await page.goto(`${origin}/term-tests/webtest-34-demo/index.html?demoCourse=34#test=${TOKEN}`);
  await page.waitForFunction(() => document.querySelector('#studentSelectInput')?.disabled === false);
  return page;
}

// Wake Lock giả: đếm lần xin/nhả; window.__wl.fail = true để giả lập trình duyệt từ chối.
const fakeWakeLock = () => {
  window.__wl = { requests: 0, releases: 0, fail: false, last: null };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => {
    window.__wl.requests++;
    if (window.__wl.fail) throw new DOMException('denied', 'NotAllowedError');
    const lock = new EventTarget();
    lock.release = async () => { window.__wl.releases++; lock.dispatchEvent(new Event('release')); };
    return (window.__wl.last = lock);
  } } });
};
const setVisibility = (page, state) => page.evaluate(v => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });
  document.dispatchEvent(new Event('visibilitychange'));
}, state);

// Bấm qua DOM để dùng được cả khi nút đang ẩn trên khổ này (đã chuyển vào bảng trượt).
const clickDom = (page, selector) => page.evaluate(s => document.querySelector(s).click(), selector);
const goToSection = (page, index) => page.evaluate(i => document.querySelectorAll('.cbt-nav-pill')[i < 0 ? document.querySelectorAll('.cbt-nav-pill').length + i : i].click(), index);
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
    assert.ok(bar.height <= 60, `thanh trên cao ${bar.height}px ở ${vp.width}px`);
    assert.ok(await page.locator('#cbt-current-section').isVisible(), 'thiếu tên phần hiện tại');
    assert.ok(await page.locator('#examTimerDisplay').isVisible(), 'đồng hồ bị ẩn');
    const timer = await box(page, '#examTimerDisplay');
    assert.ok(timer.y + timer.height <= bar.y + bar.height, 'đồng hồ nằm ngoài thanh trên');
  },
  async phoneControlsStillUsable(page, vp) {
    // Thanh trên từng khổ: nút chọn phần còn trên iPad, Nộp bài rời đi dưới 1024px.
    assert.equal(await page.locator('.cbt-nav-pill').first().isVisible(), vp.width >= 640, `nút chọn phần sai ở ${vp.width}px`);
    assert.equal(await page.locator('#demo-font-up').isVisible(), vp.width >= 640, `A+ sai ở ${vp.width}px`);
    assert.equal(await page.locator('#demo-submit-top').isVisible(), vp.width >= 1024, `Nộp bài sai ở ${vp.width}px`);
    assert.equal(await page.locator('#cbt-current-section').isVisible(), vp.width < 640, `tên phần sai ở ${vp.width}px`);
    if (vp.width >= 1024) return;
    await page.click('#cbt-bar-count');
    for (const sel of ['#cbtSheet .side-section-btn', '#cbtSheet .btn-qnav', '#cbtSheet #demo-font-down', '#cbtSheet #demo-font-up', '#cbtSheet #demo-submit-top']) {
      const b = await box(page, sel);
      assert.ok(b && b.width > 0 && b.x >= 0 && b.x + b.width <= vp.width + 1, `${sel} không dùng được ở ${vp.width}px`);
    }
    await page.click('.cbt-sheet-close');
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
    await page.evaluate(() => { scrollTo(0, 0); document.querySelector('.simulation-nav-pill[data-section-target="sim-block-3"]').click(); });
    await page.waitForSelector('#sim-block-3.active .cbt-split-pane');
    await page.waitForFunction(() => scrollY === 0);
    // Trả về Phần A để các check sau không phụ thuộc phần đang mở.
    const backToFirstSection = async () => {
      await page.evaluate(() => document.querySelector('.simulation-nav-pill[data-section-target="sim-block-0"]').click());
      await page.waitForSelector('#sim-block-0.active');
      await page.waitForFunction(() => scrollY === 0);
    };
    const reading = '#sim-block-3 .cbt-reading-col', questions = '#sim-block-3 .cbt-matching-col';

    if (vp.width >= 1024) {
      assert.ok(!(await visible('#sim-block-3 .split-pane-mobile-toggle')), `tab còn hiện ở ${vp.width}px`);
      const [r, q] = [await box(page, reading), await box(page, questions)];
      assert.ok(r && q && r.x + r.width <= q.x + 1 && Math.abs(r.y - q.y) < 40, `hai cột không song song ở ${vp.width}px`);
      return backToFirstSection();
    }
    assert.ok(await visible('#sim-block-3 .split-pane-mobile-toggle'), `không thấy tab ở ${vp.width}px`);
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
    const [bar, tabs] = [await box(page, '.cbt-topbar'), await box(page, '#sim-block-3 .split-pane-mobile-toggle')];
    assert.ok(Math.abs(tabs.y - (bar.y + bar.height)) <= 1, `tab không dính dưới thanh trên (tab.y=${tabs.y}, bar=${bar.y + bar.height})`);

    // Nhảy tới câu ở tab khác thì tự sang Câu hỏi.
    await tab('reading').click();
    await page.evaluate(() => document.querySelector('.btn-qnav[data-item-id="it-9"]').click());
    assert.ok(await visible(questions), 'nhảy câu không chuyển sang tab Câu hỏi');
    assert.ok(await tab('questions').evaluate(el => el.classList.contains('active')), 'tab Câu hỏi không được đánh dấu active');
    await backToFirstSection();
  },
  async phoneAnswerWide(page, vp) {
    if (vp.width >= 640) return;
    await revealAllSections(page);
    for (const sel of ['.candidate-short-input', '.candidate-pictorial-input']) {
      const b = await box(page, sel);
      assert.ok(b.width >= vp.width * 0.8, `${sel} chỉ rộng ${b.width}px ở ${vp.width}px`);
    }
  },
  async phoneVocabPairFullRow(page, vp) {
    if (vp.width >= 640) return;
    await revealAllSections(page);
    for (const sel of ['.candidate-vocab-text-input', '.candidate-vocab-select']) {
      const b = await box(page, sel);
      assert.ok(b.width >= vp.width * 0.8, `${sel} chỉ rộng ${b.width}px ở ${vp.width}px`);
    }
    // Ô nhập và ô chọn xếp chồng, không đứng cạnh nhau.
    const [a, c] = await Promise.all([box(page, '.candidate-vocab-text-input'), box(page, '.candidate-vocab-select')]);
    assert.ok(c.y >= a.y + a.height - 1, 'ô chọn nghĩa không nằm dưới ô nhập từ');
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
    await clickDom(page, '#demo-font-down');
    await clickDom(page, '#demo-font-down');
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
  // Lưu lỗi: dải đỏ hiện khi cuộn/chuyển phần, chỉ mất khi lưu máy chủ thành công; chấm nhỏ hiện lúc bình thường.
  async saveFailureBanner(page, vp) {
    const alert = page.locator('.cbt-exam-shell [role="alert"]#demo-save-alert');
    const dot = page.locator('#demo-save');
    const type = async text => { await page.locator('input[type="text"][data-item-id="it-2"]').fill(text); };
    assert.ok(await dot.isVisible(), `trạng thái lưu bị ẩn ở ${vp.width}px`);
    assert.equal(await alert.isVisible(), false, 'dải lỗi hiện khi chưa có lỗi');
    page.draftFails = 500;
    await type('x');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    assert.equal((await alert.textContent()).trim(), 'Chưa lưu được, kiểm tra mạng');
    assert.ok(await dot.evaluate(el => el.classList.contains('is-save-failed')), 'chấm lưu không đổi trạng thái khi lỗi');
    // Gõ tiếp (persist ghi "Đang lưu…") và chuyển phần vẫn không làm mất dải đỏ.
    await type('xy');
    await page.evaluate(() => scrollTo(0, 400));
    await goToSection(page, 1);
    const b = await box(page, '#demo-save-alert');
    assert.ok(await alert.isVisible() && b.y >= 0 && b.x >= 0 && b.x + b.width <= vp.width + 1, `dải lỗi không nằm trong màn hình ở ${vp.width}px`);
    await goToSection(page, 0);
    page.draftFails = false;
    await type('xyz');
    await alert.waitFor({ state: 'hidden', timeout: 5000 });
    assert.ok(await dot.isVisible(), 'chấm lưu biến mất sau khi phục hồi');
    assert.equal(await dot.evaluate(el => el.classList.contains('is-save-failed')), false, 'chấm lưu vẫn báo lỗi sau khi phục hồi');
    await page.evaluate(() => scrollTo(0, 0));
  },
  async bottomBar(page, vp) {
    const bar = page.locator('.cbt-bottom-bar');
    const prev = page.locator('#cbt-bar-prev');
    const next = page.locator('#cbt-bar-next');
    const active = () => page.locator('.simulation-section-card.active').getAttribute('id');
    if (vp.width >= 1024) {
      assert.equal(await bar.isVisible(), false, `thanh đáy hiện ở ${vp.width}px`);
      assert.ok(await page.locator('#demo-next').isVisible(), `mất nút cuối trang ở ${vp.width}px`);
      return;
    }
    assert.ok(await bar.isVisible(), `thiếu thanh đáy ở ${vp.width}px`);
    assert.equal(await page.locator('#demo-next').isVisible(), false, `nút cuối trang còn hiện ở ${vp.width}px`);
    const b = await bar.boundingBox();
    assert.ok(Math.abs(b.y + b.height - vp.height) <= 1, `thanh đáy không sát đáy ở ${vp.width}px`);
    await goToSection(page, 0);
    assert.ok(await prev.isDisabled(), 'Trước vẫn bấm được ở phần đầu');
    assert.equal((await next.textContent()).trim(), 'Sau');
    // Gắn sự kiện hai lần sẽ nhảy quá một phần.
    await next.click();
    assert.equal(await active(), 'sim-block-1');
    await prev.click();
    assert.equal(await active(), 'sim-block-0');
    // Số câu đổi ngay khi trả lời, không chờ lưu.
    const count = page.locator('#cbt-bar-count');
    const input = page.locator('input[type="text"][data-item-id="it-2"]');
    const old = await input.inputValue();
    await input.fill('');
    const before = await count.textContent();
    await input.fill('dem-so-cau');
    const after = await count.textContent();
    assert.equal(parseInt(after, 10), parseInt(before, 10) + 1, `số câu không đổi: ${before} -> ${after}`);
    await input.fill(old);
    // Thanh không che cuối trang.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);
    const note = await page.locator('.cbt-footer-note').boundingBox();
    assert.ok(note.y + note.height <= (await bar.boundingBox()).y + 1, `thanh đáy che cuối trang ở ${vp.width}px`);
    // Bàn phím mở: visualViewport thấp đi rồi trở lại.
    const setViewport = height => page.evaluate(h => {
      Object.defineProperty(visualViewport, 'height', { configurable: true, get: () => h });
      visualViewport.dispatchEvent(new Event('resize'));
    }, height);
    await setViewport(vp.height - 300);
    assert.equal(await bar.isVisible(), false, 'thanh đáy không ẩn khi bàn phím mở');
    await setViewport(vp.height);
    assert.ok(await bar.isVisible(), 'thanh đáy không hiện lại khi bàn phím đóng');
    // Phần cuối: Sau thành Nộp bài, mở đúng hộp xác nhận.
    await goToSection(page, -1);
    assert.equal((await next.textContent()).trim(), 'Nộp bài');
    await next.click();
    assert.ok(await page.locator('#demo-confirm').evaluate(d => d.open), 'Nộp bài không mở hộp xác nhận');
    await page.locator('#demo-confirm #demo-cancel, #demo-confirm .btn-secondary').first().click();
    await goToSection(page, 0);
    await page.evaluate(() => scrollTo(0, 0));
  },
  async questionSheet(page, vp) {
    if (vp.width >= 1024) {
      assert.ok(await page.locator('.cbt-exam-layout > .cbt-side-container .cbt-tips-card').isVisible(), `mất bảng bên ở ${vp.width}px`);
      return;
    }
    const sheet = page.locator('#cbtSheet');
    const isOpen = () => sheet.evaluate(d => d.open);
    const count = page.locator('#cbt-bar-count');
    await goToSection(page, 0);
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal(await page.locator('.cbt-exam-layout > .cbt-side-container').isVisible(), false, 'bảng bên còn nằm trong trang');
    // Đóng bằng nút, Esc và chạm nền; focus nằm trong bảng và trả về khi đóng.
    await count.click();
    assert.ok(await isOpen(), 'không mở được bảng');
    assert.ok(await sheet.evaluate(d => d.contains(document.activeElement)), 'focus không vào bảng');
    assert.equal(await page.locator('#cbtSheet .cbt-tips-card').isVisible(), false, 'còn thẻ Hướng dẫn');
    await page.click('.cbt-sheet-close');
    assert.equal(await isOpen(), false, 'nút Đóng không đóng bảng');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'cbt-bar-count', 'focus không trả về');
    await count.click();
    await page.keyboard.press('Escape');
    assert.equal(await isOpen(), false, 'Esc không đóng bảng');
    await count.click();
    await page.mouse.click(vp.width / 2, 2);
    assert.equal(await isOpen(), false, 'chạm nền không đóng bảng');
    // Đóng xong, các nút mượn về đúng chỗ cũ.
    assert.equal(await page.evaluate(() => document.querySelector('#demo-submit-top').parentElement.className.includes('cbt-top-actions')), true, 'Nộp bài không về thanh trên');
    // Lưới có cả đề và phân biệt đã làm, kể cả câu một ô nhiều số.
    await goToSection(page, 2);
    const blanks = page.locator('#sim-block-2 .cbt-blank-input');
    const oldBlank = await blanks.first().inputValue();
    await blanks.first().fill('x');
    await count.click();
    assert.equal(await page.locator('#cbtSheet .btn-qnav:visible').count(), await page.locator('#cbtSheet .btn-qnav').count(), 'lưới không hiện cả đề');
    const firstBlank = await blanks.first().getAttribute('data-position');
    assert.ok(await page.locator(`#cbtSheet .btn-qnav[data-item-id="it-5"][data-blank-pos="${firstBlank}"]`).evaluate(b => b.classList.contains('answered')), 'ô đã làm không được đánh dấu');
    const unanswered = page.locator('#cbtSheet .btn-qnav[data-blank-pos]:not(.answered)').first();
    assert.ok(await unanswered.count(), 'ô chưa làm bị đánh dấu nhầm');
    await page.click('.cbt-sheet-close');
    await blanks.first().fill(oldBlank);
    // Nhảy sang câu ở phần khác: đóng bảng, đúng phần, cuộn tới câu, không bật bàn phím trên cảm ứng.
    await count.click();
    await page.click('#cbtSheet .btn-qnav[data-item-id="it-2"]');
    await page.waitForTimeout(700);
    assert.equal(await isOpen(), false, 'nhảy câu không đóng bảng');
    assert.equal(await page.locator('.simulation-section-card.active').getAttribute('id'), 'sim-block-0', 'nhảy sai phần');
    const target = await box(page, 'input[type="text"][data-item-id="it-2"]');
    assert.ok(target.y >= 0 && target.y + target.height <= vp.height, `câu nhảy tới ngoài màn hình ở ${vp.width}px: ${target.y}`);
    const focused = await page.evaluate(() => document.activeElement?.matches('input, textarea, select'));
    assert.equal(focused, !await isCoarse(page), 'nhảy câu sai hành vi focus');
    // Chọn phần trong bảng.
    await count.click();
    await page.locator('#cbtSheet .side-section-btn').nth(1).click();
    assert.equal(await isOpen(), false, 'chọn phần không đóng bảng');
    assert.equal(await page.locator('.simulation-section-card.active').getAttribute('id'), 'sim-block-1', 'chọn phần sai');
    // A+ trong bảng dùng được và không đóng bảng.
    await goToSection(page, 0);
    await count.click();
    const size = () => page.evaluate(() => parseFloat(document.documentElement.style.fontSize));
    const fontBefore = await size();
    await page.click('#cbtSheet #demo-font-down');
    assert.ok(await size() < fontBefore, 'A− trong bảng không có tác dụng');
    assert.ok(await isOpen(), 'A− làm đóng bảng');
    await page.click('#cbtSheet #demo-font-up');
    // Nộp bài trong bảng mở hộp xác nhận sẵn có, hủy thì quay lại bài.
    await page.click('#cbtSheet #demo-submit-top');
    assert.equal(await isOpen(), false, 'bảng còn mở phía sau hộp xác nhận');
    assert.ok(await page.locator('#demo-confirm').evaluate(d => d.open), 'không mở hộp xác nhận');
    await page.locator('#demo-confirm .btn-secondary').first().click();
    // Xoay iPad qua 1024px khi bảng đang mở: bảng tự đóng, không kẹt nút ngoài chỗ cũ.
    await count.click();
    await page.setViewportSize({ width: 1100, height: vp.height });
    await page.waitForTimeout(100);
    assert.equal(await isOpen(), false, 'bảng còn mở từ 1024px');
    assert.ok(await page.locator('.cbt-exam-layout > .cbt-side-container').isVisible(), 'bảng bên không về sau khi đóng');
    await page.setViewportSize(vp);
    await page.evaluate(() => scrollTo(0, 0));
  },
  async topbarNotClipped(page, vp) {
    const clipped = await page.evaluate(() => [...document.querySelectorAll('.cbt-nav-pill')]
      .filter(p => p.scrollWidth > p.clientWidth + 1).map(p => p.textContent.trim()));
    assert.deepEqual(clipped, [], `chữ tràn khỏi nút chọn phần ở ${vp.width}px`);
    if (vp.width < 640) {
      // Sau khi nộp, nút này ẩn nên không có box.
      const submit = await box(page, '#demo-submit-top');
      assert.ok(!submit || submit.height <= 44, `nút Nộp bài xuống dòng ở ${vp.width}px`);
      assert.ok((await box(page, '.cbt-timer-container')).height <= 40, `đồng hồ xuống dòng ở ${vp.width}px`);
      const right = await page.locator('.cbt-top-actions').evaluate(el => Math.max(...[...el.children].map(c => c.getBoundingClientRect().right)));
      assert.ok(right <= vp.width, `thanh trên tràn màn hình ở ${vp.width}px`);
    }
  },
  async activePillAndMaxFontStayOnScreen(page, vp) {
    const pills = page.locator('.cbt-nav-pill');
    await goToSection(page, -1);
    await page.waitForTimeout(400);
    if (vp.width >= 640) {
      const b = await pills.last().boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= vp.width + 1, `phần đang chọn nằm ngoài màn hình ở ${vp.width}px`);
    }
    await goToSection(page, 0);
    for (const id of ['#demo-font-up', '#demo-font-down']) {
      for (let i = 0; i < 6 && await page.locator(id).isEnabled(); i++) await clickDom(page, id);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(width <= vp.width, `tràn ngang khi đổi cỡ chữ ở ${vp.width}px: ${width}`);
    }
    await clickDom(page, '#demo-font-up');
  },
  async richTableFitsCard(page, vp) {
    await revealAllSections(page);
    const out = await page.evaluate(() => {
      const table = document.querySelector('.cbt-cloze-content table');
      const card = table.closest('.cbt-cloze-content').getBoundingClientRect();
      const inputs = [...table.querySelectorAll('input')].map(i => i.getBoundingClientRect().right);
      return { doc: document.documentElement.scrollWidth, table: table.getBoundingClientRect().right, card: card.right, input: Math.max(...inputs) };
    });
    assert.ok(out.doc <= vp.width, `bảng làm tràn trang ở ${vp.width}px: ${out.doc}`);
    assert.ok(out.table <= out.card + 1 && out.input <= out.card + 1, `bảng tràn khỏi thẻ câu hỏi ở ${vp.width}px: ${JSON.stringify(out)}`);
  },
  async noLegacyBreakpoints(page) {
    const found = await page.evaluate(() => [...document.styleSheets].flatMap(s => {
      try { return [...s.cssRules]; } catch { return []; }
    }).filter(r => r.media && /(960|1023)px/.test(r.media.mediaText)).map(r => r.media.mediaText));
    assert.deepEqual(found, [], 'còn mốc 960px/1023px');
  },
  async saveRetriesAutomatically(page, vp) {
    const alert = page.locator('#demo-save-alert');
    const type = text => page.locator('input[type="text"][data-item-id="it-2"]').fill(text);
    page.draftFails = 500;
    await type('retry-online');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    // Có mạng trở lại: tự lưu, học viên không phải gõ thêm.
    page.draftFails = 0;
    await page.evaluate(() => dispatchEvent(new Event('online')));
    await alert.waitFor({ state: 'hidden', timeout: 5000 });
    // Hai ca sau phải chờ qua chu kỳ 15 giây nên chỉ đo ở một khổ.
    if (vp.width !== 390 || await isCoarse(page)) return;
    page.draftFails = 500;
    await type('retry-timer');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    page.draftFails = 0;
    await alert.waitFor({ state: 'hidden', timeout: 20000 });
    // Lỗi cố định (đã nộp, hết giờ, máy khác) không thử lại.
    page.draftFails = 409;
    await type('no-retry');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    const calls = page.draftCalls;
    await page.waitForTimeout(17000);
    assert.equal(page.draftCalls, calls, 'vẫn thử lại khi lỗi 409');
    page.draftFails = 0;
    await page.evaluate(() => dispatchEvent(new Event('online')));
    await alert.waitFor({ state: 'hidden', timeout: 5000 });
  },
  // Nộp bài làm khóa màn hình nên check này phải đứng cuối.
  async submitClearsSaveAlert(page, vp) {
    const alert = page.locator('#demo-save-alert');
    page.draftFails = 500;
    await page.locator('input[type="text"][data-item-id="it-2"]').fill('submit');
    await alert.waitFor({ state: 'visible', timeout: 5000 });
    const calls = page.draftCalls;
    await clickDom(page, '#demo-submit-top');
    await page.click('#demo-confirm-submit');
    await alert.waitFor({ state: 'hidden', timeout: 5000 });
    await page.waitForTimeout(2000);
    assert.equal(page.draftCalls, calls, 'vẫn gửi nháp sau khi nộp');
    await checks.topbarNotClipped(page, vp);
    assert.equal(await page.locator('.cbt-bottom-bar').isVisible(), false, 'thanh đáy còn hiện sau khi nộp');
    // Không còn thanh đáy và bảng trượt: vẫn phải chuyển được phần để xem lại bài.
    assert.ok(await page.locator('.cbt-nav-pill').first().isVisible(), `không xem lại được bài sau khi nộp ở ${vp.width}px`);
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
    // Cảnh báo thoát của Exam Mode khóa thanh đáy, trả lại khi học viên quay về bài.
    const guarded = await openExamShell(browser, VIEWPORTS[1], {}, { exam: { enabled: true, status: 'running' } });
    await guarded.click('#cbt-bar-count');
    await guarded.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await guarded.locator('#examGuardOverlay').waitFor({ state: 'visible' });
    assert.ok(await guarded.locator('.cbt-bottom-bar').evaluate(el => el.inert), 'thanh đáy vẫn dùng được khi có cảnh báo thoát');
    assert.equal(await guarded.locator('#cbtSheet').evaluate(d => d.open), false, 'bảng trượt che lớp cảnh báo thoát');
    await guarded.click('#examGuardReturn');
    await guarded.locator('#examGuardOverlay').waitFor({ state: 'hidden' });
    assert.equal(await guarded.locator('.cbt-bottom-bar').evaluate(el => el.inert), false, 'thanh đáy không mở lại sau cảnh báo');
    await guarded.close();

    // Ticket #35: thông báo ở màn bắt đầu chỉ trên thiết bị cảm ứng (kể cả iPad tự nhận là Macintosh).
    const ipadMacUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
    for (const [name, vp, opts, expected] of [
      ['điện thoại', VIEWPORTS[1], { hasTouch: true, isMobile: true }, true],
      ['iPad tự nhận Macintosh', VIEWPORTS[3], { hasTouch: true, userAgent: ipadMacUA }, true],
      ['máy tính dùng chuột', VIEWPORTS[4], {}, false]
    ]) {
      const start = await openStartScreen(browser, vp, opts, {}, name.startsWith('iPad') ? () => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 }) : undefined);
      assert.equal(await start.locator('#mobileExamNotice').isVisible(), expected, `thông báo di động sai trên ${name}`);
      // Đề mẫu có câu long_text (Phần B) nên gợi ý bài viết dài hiện cùng thông báo.
      assert.equal(await start.locator('#longWritingHint').isVisible(), expected, `gợi ý bài viết dài sai trên ${name}`);
      await start.selectOption('#studentSelectInput', 's1');
      assert.ok(await start.locator('#startExamBtn').isEnabled(), `không bắt đầu được trên ${name}`);
      await start.close();
    }

    // Ticket #35: Wake Lock xin khi vào bài, xin lại khi trang hiện lại, nhả khi nộp bài.
    const wl = await openExamShell(browser, VIEWPORTS[1], { hasTouch: true, isMobile: true }, {}, fakeWakeLock);
    const counts = () => wl.evaluate(() => ({ requests: window.__wl.requests, releases: window.__wl.releases }));
    await wl.waitForFunction(() => window.__wl.requests === 1);
    await setVisibility(wl, 'hidden');
    await wl.evaluate(() => window.__wl.last.release()); // hệ thống tự nhả khi trang bị ẩn
    await setVisibility(wl, 'visible');
    await wl.waitForFunction(() => window.__wl.requests === 2);
    await clickDom(wl, '#demo-submit-top');
    await clickDom(wl, '#demo-confirm-submit');
    await wl.waitForFunction(() => window.__wl.releases === 2);
    await setVisibility(wl, 'hidden');
    await setVisibility(wl, 'visible');
    assert.deepEqual(await counts(), { requests: 2, releases: 2 }, 'còn xin Wake Lock sau khi nộp');
    assert.deepEqual(wl.errors, [], 'lỗi trang khi dùng Wake Lock');
    await wl.close();
    // Trình duyệt không hỗ trợ: không lỗi, vẫn vào bài.
    const unsupported = await openExamShell(browser, VIEWPORTS[1], { hasTouch: true, isMobile: true }, {}, () => { delete Navigator.prototype.wakeLock; });
    assert.deepEqual(unsupported.errors, [], 'lỗi trang khi không có Wake Lock');
    await unsupported.close();
    // Trình duyệt từ chối: không lỗi, vẫn vào bài.
    const deniedLock = await openStartScreen(browser, VIEWPORTS[1], { hasTouch: true, isMobile: true }, {}, fakeWakeLock);
    await deniedLock.evaluate(() => { window.__wl.fail = true; });
    await deniedLock.selectOption('#studentSelectInput', 's1');
    await deniedLock.click('#startExamBtn');
    await deniedLock.waitForSelector('.cbt-exam-shell');
    await deniedLock.waitForFunction(() => window.__wl.requests === 1);
    assert.deepEqual(deniedLock.errors, [], 'lỗi trang khi Wake Lock bị từ chối');
    await deniedLock.close();
    console.log(JSON.stringify(report));
    console.log('candidate-mobile-smoke: OK');
  } finally {
    await browser?.close();
    child.kill();
  }
}
