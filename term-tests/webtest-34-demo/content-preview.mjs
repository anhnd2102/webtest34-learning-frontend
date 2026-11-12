import {
  renderDynamicExam,
  getTotalItemCount,
  getAnsweredCount,
  renderSectionNavPills,
  renderSidePanel,
  initDynamicExamInteractions,
  ICONS
} from './dynamic-exam-renderer.mjs?rev=20261105-sticky-audio-v1';

import { escape, words } from './candidate/text-utils.js?rev=20261113-split-a';
import { draftKey, sanitizeDraft, learningRequestMethod, learningRequestBody, selfProctoringBannerHtml } from './candidate/learning-api.js?rev=20261113-split-a';
import { mapAnswerToDefinitionValue, mapAnswerFromDefinitionValue, sectionKey, sectionLabels, groupSections } from './candidate/group-render.js?rev=20261113-split-a';
import { createExamMode } from './candidate/exam-mode.js?rev=20261113-split-a';
import { createIntroScreen } from './candidate/intro-screen.js?rev=20261113-split-a';
import { createReviewScreen } from './candidate/review-screen.js?rev=20261113-split-a';
import { createExamTimer } from './candidate/exam-timer.js?rev=20261113-split-a';
import { createDraftSync } from './candidate/draft-sync.js?rev=20261113-split-a';
import { createSubmitFlow } from './candidate/submit-flow.js?rev=20261113-split-a';
export { formatCandidateOptionLabel } from './candidate/text-utils.js?rev=20261113-split-a';
export { draftKey, sanitizeDraft, learningRequestMethod, learningRequestBody, examPhase, selfProctoringBannerHtml, resetLocalAttemptState } from './candidate/learning-api.js?rev=20261113-split-a';
export { resultViewModel, resultDetailsHtml, studentResultsBodyHtml, studentResultsHtml, studentReviewHtml, bindResultFilters } from './candidate/result-view.js?rev=20261113-split-a';
export { withLocalGroupLabels, mapAnswerToDefinitionValue, mapAnswerFromDefinitionValue, clozeSegments, choiceLayout, groupBody, CLOUDFLARE_R2_AUDIO_BASE, resolveAudioUrl, groupSections } from './candidate/group-render.js?rev=20261113-split-a';

export async function mount(course) {
  if (!['03','34','45'].includes(course)) throw new Error('Unknown demo course');
  const config = window.WEBTEST_34_PREVIEW_CONFIG || {};
  const queryParams = new URLSearchParams(location.search || '');
  const rawHash = location.hash.replace(/^#/, '').trim();
  const hashParams = new URLSearchParams(rawHash);
  const hashToken = rawHash.includes('=') ? (hashParams.get('token') || hashParams.get('testToken') || hashParams.get('test')) : (rawHash.includes('-') ? rawHash : '');
  const rawTestTokenParam = queryParams.get('testToken') || queryParams.get('token') || (queryParams.get('test')?.includes('-') ? queryParams.get('test') : '');
  const rawTestToken = (hashToken?.includes('-') ? hashToken : '') || rawTestTokenParam || config.LEARNING_TEST_TOKEN || '';
  // Link chia sẻ qua chat hay dính ký tự thừa (vd. ``, %5C, %20) sau token; chỉ giữ đúng UUID khi có.
  const testToken = rawTestToken.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || rawTestToken;

  const explicitTest = Number(queryParams.get('testNum')) || Number(queryParams.get('demoTest')) || (!queryParams.get('test')?.includes('-') ? Number(queryParams.get('test')) : 0);
  let testNum = explicitTest || 1;
  const phaseParam = queryParams.get('phase');
  if ((course === '34' || course === '45') && phaseParam === '2' && testNum <= 2) {
    testNum = testNum + 4;
  }
  if (!explicitTest) {
    const prefixMatch = testToken.match(/^(\d{2})(\d{2})/);
    if (prefixMatch && prefixMatch[1] === course && Number(prefixMatch[2]) <= 6) {
      testNum = Number(prefixMatch[2]);
    } else {
      const tokenMatch = testToken.match(/-0*([1-9]\d*)$/);
      if (tokenMatch && Number(tokenMatch[1]) <= 6) {
        testNum = Number(tokenMatch[1]);
      }
    }
  }

  const isProd = queryParams.get('prod') === '1' || queryParams.get('apiEnv') === 'production';
  const apiBase = (isProd ? 'https://webtest.ducanhdev.com' : (config.LEARNING_API_BASE_URL || config.API_BASE_URL || 'https://webtest.ducanhdev.com')).replace(/\/$/, '');
  const isLearningMode = Boolean(testToken);

  let form = { course, groups: [], durationMinutes: 60 };
  let items = [];
  let title = `Khóa ${course}`;
  let sections = [];
  let activeSection = '';
  let key = `izone_learning_${testToken || course}`;
  let state = { answers: {}, submittedAt: null };

  if (!isLearningMode) {
    let formUrl = new URL(`./demo-content/${course}-test-${testNum}.json?rev=20261026-c34t4-spk-v2`, import.meta.url);
    let response = await fetch(formUrl);
    if (!response.ok && phaseParam === '2') {
      formUrl = new URL(`./demo-content/${course}-p2-test-${testNum > 4 ? testNum - 4 : testNum}.json?rev=20261026-c34t4-spk-v2`, import.meta.url);
      response = await fetch(formUrl);
    }
    if (!response.ok) {
      formUrl = new URL(`./demo-content/${course}.json?rev=20261026-c34t4-spk-v2`, import.meta.url);
      response = await fetch(formUrl);
    }
    if (!response.ok) throw new Error('Content unavailable');
    form = await response.json();
    key = draftKey(form);
    try { state = sanitizeDraft(form, JSON.parse(localStorage.getItem(key))); }
    catch { state = sanitizeDraft(form, null); }
    items = form.groups.flatMap(group => group.items);
    const displayTestNum = form.phase === 2 && (form.testNumber > 4 || testNum > 4) ? (form.testNumber > 4 ? form.testNumber - 4 : testNum - 4) : (form.testNumber || testNum);
    title = `Khóa ${course}${form.phase ? ` · Phase ${form.phase}` : ''} · Test ${displayTestNum}`;
    sections = [...new Set(form.groups.map(sectionKey))];
    activeSection = sections[0];
  }

  const paramClassCode = (queryParams.get('class') || queryParams.get('classCode') || '').trim().toUpperCase();
  const learningState = {
    testToken,
    courseCode: paramClassCode || `TEST-${course}`,
    className: '',
    studentRef: '',
    studentName: '',
    assignment: null,
    definition: null,
    attemptToken: '',
    definitionHash: '',
    draftRevision: 0,
    status: '',
    expiresAt: null,
    exam: null,
    selfProctoring: null,
    result: null,
    pollTimer: null
  };

  const deviceId = (() => {
    try {
      let id = sessionStorage.getItem('webtest34.learning.deviceId');
      if (!id) sessionStorage.setItem('webtest34.learning.deviceId', id = createUuid());
      return id;
    } catch {
      return createUuid();
    }
  })();

  async function apiRequest(path, body) {
    const res = await fetch(`${apiBase}/api/learning${path}`, {
      method: learningRequestMethod(path),
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // iOS có thể hủy request ngay khi đổi app; thiếu dòng này lần rời bài có thể không được ghi.
      keepalive: path.startsWith('/attempts/exam/incidents/'),
      body: JSON.stringify(learningRequestBody(path, body, deviceId))
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.error === 'EXAM_DEVICE_SUPERSEDED' && learningState.status !== 'superseded') dispatchExamGuard({ type: 'device_superseded' });
      throw Object.assign(new Error(data.message || `Lỗi HTTP ${res.status}`), {
        code: data.error,
        status: res.status
      });
    }
    return data;
  }

  function createUuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0');
  }

  // --- EXAM MODE: phòng chờ, SSE, tín hiệu kết nối và Exam Guard (reducer ở exam-guard.js) ---
  const examMode = createExamMode({ apiBase, learningState, deviceId, apiRequest, createUuid, renderExamInterface });
  const { requestFullscreen, requestWakeLock, stopExamConnections, connectExamEvents, renderExamWaitingRoom, dispatchExamGuard, mountExamGuard } = examMode;

  function buildResponsesPayload() {
    if (learningState.definition?.blocks?.length) {
      const responses = {};
      const allItems = learningState.definition.blocks.flatMap(b => b.items || []);
      for (const it of allItems) {
        const val = state.answers[it.itemVersionId];
        if (val !== undefined && val !== null && val !== '') {
          responses[it.itemVersionId] = val;
        }
      }
      return responses;
    }

    const defBlocks = learningState.definition?.blocks || [];
    const responses = {};

    for (let bIndex = 0; bIndex < defBlocks.length; bIndex++) {
      const block = defBlocks[bIndex];
      const group = form.groups[bIndex];
      if (!group) continue;

      const defItems = block.items || [];
      const formItems = group.items || [];

      if (defItems.length === formItems.length) {
        for (let i = 0; i < defItems.length; i++) {
          const val = state.answers[formItems[i].id];
          const answer = typeof val === 'string' ? val : (val ?? '');
          responses[defItems[i].itemVersionId] = mapAnswerToDefinitionValue(formItems[i], defItems[i], answer);
        }
      } else if (formItems.length === defItems.length * 2) {
        for (let i = 0; i < defItems.length; i++) {
          const formItemWord = formItems[i * 2];
          const formItemOpt = formItems[i * 2 + 1];
          const word = String(state.answers[formItemWord?.id] ?? '').trim();
          const rawOpt = state.answers[formItemOpt?.id] ?? '';
          const opt = mapAnswerToDefinitionValue(formItemOpt, defItems[i], rawOpt);
          responses[defItems[i].itemVersionId] = [word, typeof opt === 'string' ? opt : ''];
        }
      } else {
        for (let i = 0; i < defItems.length; i++) {
          if (formItems[i]) {
            const val = state.answers[formItems[i].id];
            const answer = typeof val === 'string' ? val : (val ?? '');
            responses[defItems[i].itemVersionId] = mapAnswerToDefinitionValue(formItems[i], defItems[i], answer);
          }
        }
      }
    }

    return responses;
  }

  function applyServerDraft(serverDraft) {
    if (!serverDraft || typeof serverDraft !== 'object') return;
    if (learningState.definition?.blocks?.length) {
      for (const [itemVerId, val] of Object.entries(serverDraft)) {
        state.answers[itemVerId] = val;
      }
      return;
    }
    const defBlocks = learningState.definition?.blocks || [];

    for (let bIndex = 0; bIndex < defBlocks.length; bIndex++) {
      const block = defBlocks[bIndex];
      const group = form.groups[bIndex];
      if (!group) continue;

      const defItems = block.items || [];
      const formItems = group.items || [];

      if (defItems.length === formItems.length) {
        for (let i = 0; i < defItems.length; i++) {
          const itemVerId = defItems[i].itemVersionId;
          if (serverDraft[itemVerId] !== undefined) {
            state.answers[formItems[i].id] = mapAnswerFromDefinitionValue(formItems[i], defItems[i], serverDraft[itemVerId]);
          }
        }
      } else if (formItems.length === defItems.length * 2) {
        for (let i = 0; i < defItems.length; i++) {
          const itemVerId = defItems[i].itemVersionId;
          const draftVal = serverDraft[itemVerId];
          if (Array.isArray(draftVal)) {
            const formItemWord = formItems[i * 2];
            const formItemOpt = formItems[i * 2 + 1];
            if (formItemWord) state.answers[formItemWord.id] = String(draftVal[0] ?? '');
            if (formItemOpt) state.answers[formItemOpt.id] = mapAnswerFromDefinitionValue(formItemOpt, defItems[i], draftVal[1]);
          }
        }
      }
    }
  }

  // --- RENDER MÀN HÌNH ĐỊNH DANH (IDENTITY SCREEN) KHI CÓ TEST TOKEN ---
  if (isLearningMode) {
    const initialTitle = course === '34' ? 'Minh hoạ đề thi 34' : `IZONE · Khóa ${course}`;
    document.title = `IZONE · Thi CBT · ${initialTitle}`;
    document.body.innerHTML = `
      <div class="content-demo">
        <header class="topbar cbt-topbar simulation-topbar">
          <div class="topbar-inner demo-top">
            <div class="brand">
              <div class="brand-mark">IZ</div>
              <div class="brand-copy">
                <div class="brand-title">IZONE · COMPUTER-BASED TEST</div>
                <div class="brand-sub">${escape(initialTitle)}</div>
              </div>
            </div>
            <div class="top-actions">
              <span class="timer">60:00</span>
            </div>
          </div>
        </header>
        <main class="cbt-intro-wrap">
          <div class="cbt-intro-card">
            <span class="cbt-intro-badge">IZONE · COMPUTER-BASED TEST</span>
            <h1 class="cbt-intro-title">${escape(initialTitle)}</h1>
            <p class="cbt-intro-sub">
              Thời gian làm bài: <strong>60 phút</strong> · Tổng số câu hỏi: <strong>96 câu</strong>.<br>
              Vui lòng nhập <strong>Mã lớp</strong> và chọn <strong>Họ tên của bạn</strong> để bắt đầu làm bài.
            </p>

            <div class="cbt-intro-field">
              <label for="classCodeInput">Mã lớp</label>
              <div class="cbt-intro-input-row">
                <input id="classCodeInput" class="cbt-intro-input" value="${escape(paramClassCode || `TEST-${course}`)}" placeholder="Ví dụ: ICxxxx" autocomplete="off" style="flex:1;font-weight:600">
                <button type="button" class="btn btn-secondary" id="loadRosterBtn" style="min-width:140px;font-weight:600">Tải danh sách</button>
              </div>
              <div id="classCodeStatus" class="cbt-intro-hint">Nhập đúng mã lớp do giáo viên cung cấp, sau đó bấm “Tải danh sách”.</div>
            </div>

            <div class="cbt-intro-field">
              <label for="studentSelectInput">Họ và tên học viên</label>
              <select id="studentSelectInput" class="cbt-intro-input" disabled style="background:#f8fafc">
                <option value="">— Hãy tải danh sách lớp trước —</option>
              </select>
              <div id="studentSelectStatus" class="cbt-intro-hint">Chọn đúng tên của bạn trong danh sách lớp. Tên sẽ được khóa khi nộp bài.</div>
            </div>

            <div id="soundcheckSection" class="cbt-soundcheck-box">
              <div class="cbt-soundcheck-header">
                <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.volume} Kiểm tra âm thanh trước khi làm bài</span>
                <span id="soundcheckStatus" class="cbt-soundcheck-badge">Chưa kiểm tra</span>
              </div>
              <p class="cbt-soundcheck-body">
                Bài thi có nội dung âm thanh. Hãy nhấn <strong>Nghe thử</strong> để kiểm tra loa hoặc tai nghe và điều chỉnh âm lượng phù hợp.
              </p>
              <div class="cbt-soundcheck-controls">
                <button type="button" class="btn btn-secondary" id="soundcheckPlayBtn" style="min-width:130px;background:white;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
                  ${ICONS.volume} Nghe thử
                </button>
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#475569">
                  <label for="soundcheckVolume">Âm lượng:</label>
                  <input id="soundcheckVolume" type="range" min="0" max="1" step="0.05" value="1" style="cursor:pointer;width:110px">
                  <span id="soundcheckVolumeLabel" style="font-weight:700;min-width:36px">100%</span>
                </div>
              </div>
            </div>

            <div id="mobileExamNotice" class="cbt-intro-notice" role="note" hidden>
              <p>Trong lúc làm bài, <strong>không chuyển sang ứng dụng khác và không khóa màn hình</strong>.</p>
              <p id="longWritingHint" hidden>Đề có bài viết dài. Nên làm trên máy tính hoặc iPad có bàn phím để gõ thuận tiện hơn.</p>
            </div>

            <div class="cbt-intro-footer" style="display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:12px;">
              <button type="button" class="btn btn-secondary" id="viewResultBtn" disabled style="min-height:46px;padding:0 24px;font-size:15px;font-weight:700">Xem kết quả</button>
              <button type="button" class="btn-start-exam" id="startExamBtn" disabled>Bắt đầu làm bài →</button>
            </div>
          </div>
        </main>
        <main id="reviewMain" class="demo-width" hidden style="max-width:672px;margin:20px auto;padding:0 16px">
          <button type="button" class="btn btn-secondary" id="reviewBackBtn">← Chọn lại tên</button>
          <div id="reviewBody" aria-live="polite"></div>
        </main>
      </div>
    `;

    document.documentElement.classList.remove('cbt-mounting');

    const canonicalStyle = document.createElement('style');
    canonicalStyle.textContent = `
      .content-demo{color:#404040;background:#f3f4f6;min-height:100vh;font-family:Inter,system-ui,-apple-system,sans-serif}
      .demo-top{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:white;border-bottom:1px solid #e5e7eb}
      .brand{display:flex;align-items:center;gap:12px}
      .brand-mark{width:36px;height:36px;background:#db0829;color:white;font-weight:900;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:16px}
      .brand-title{font-weight:700;font-size:15px;color:#174266}
      .brand-sub{font-size:12px;color:#64748b}
      .timer{font-weight:700;font-size:16px;background:#fff1f2;color:#db0829;padding:6px 12px;border-radius:8px;border:1px solid #ffe4e6}
      button.btn{min-height:44px;border-radius:8px;padding:0 18px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid transparent;transition:all .15s}
      button.btn-primary{background:#db0829;color:white}
      button.btn-primary:not(:disabled):hover{background:#b90622}
      button.btn-secondary{background:white;color:#334155;border-color:#cbd5e1}
      button.btn-secondary:not(:disabled):hover{background:#f8fafc;border-color:#94a3b8}
      button:disabled{opacity:.5;cursor:not-allowed}
      .review-screen{background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,.04);margin-top:16px;line-height:1.5;color:#1e293b}
      .review-header h1{font-size:22px;margin:0 0 4px;color:#174266}.review-header p{margin:0;color:#64748b;font-size:14px}
      .review-total{margin:16px 0;padding:16px;border-radius:12px;background:#fff7f8;border:1px solid #f5d8dd;text-align:center}
      .review-total strong{display:block;font-size:32px;color:#db0829}
      .review-provisional{color:#8a5a00;font-weight:700}
      .review-section{border:1px solid #e2e8f0;border-radius:12px;margin-top:12px;overflow:hidden}
      .review-section-toggle{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;border:0;background:#fff;padding:12px 16px;text-align:left;font:inherit;cursor:pointer}
      .review-section-toggle strong{font-size:17px}.review-section-toggle span{font-size:13px;color:#64748b}
      .review-section-items{list-style:none;margin:0;padding:0 16px 8px}
      .review-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-top:1px solid #e2e8f0;font-size:14px}
      .review-verdict{flex:0 0 auto;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:700;background:#f1f5f9}
      .review-verdict.correct{background:#e8f7f0;color:#12805c}.review-verdict.incorrect{background:#fff0f2;color:#db0829}
      .review-verdict.partial,.review-verdict.pending,.review-verdict.manual_review{background:#fff7e8;color:#8a5a00}
      .review-answer{color:#64748b;word-break:break-word}.review-expected{margin-top:4px}.review-expected.muted{color:#64748b;font-size:13px}
      .review-feedback{margin-top:8px;padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px}
      .review-inline-error{margin-bottom:12px;padding:10px 12px;border-radius:10px;background:#fff0f2;border:1px solid #f5d8dd}
      .review-retry{margin-top:12px;min-height:44px;padding:0 20px;border-radius:10px;border:0;background:#db0829;color:#fff;font-weight:700;cursor:pointer}
      @media(max-width:520px){.content-demo main.demo-width>div{padding:20px!important}.demo-top{padding:10px 12px}.timer{display:none}#viewResultBtn,#startExamBtn{width:100%;margin:0!important}#loadRosterBtn{min-width:0!important;padding:0 12px!important}}
    `;
    document.head.append(canonicalStyle);

    const classInput = document.querySelector('#classCodeInput');
    const loadBtn = document.querySelector('#loadRosterBtn');
    const classStatus = document.querySelector('#classCodeStatus');
    const studentSelect = document.querySelector('#studentSelectInput');
    const studentStatus = document.querySelector('#studentSelectStatus');
    const startBtn = document.querySelector('#startExamBtn');
    const { handleLoadRoster } = createIntroScreen({ config, testToken, paramClassCode, state, learningState, apiRequest, createUuid, requestFullscreen, connectExamEvents, renderExamWaitingRoom, mountExamGuard, applyServerDraft, renderExamInterface, classInput, loadBtn, classStatus, studentSelect, studentStatus, startBtn });

    createReviewScreen({ testToken, title, learningState, apiRequest, studentSelect });

    void handleLoadRoster();
    return;
  }

  // --- RENDER GIAO DIỆN BÀI THI CHÍNH THỨC / PREVIEW ---
  renderExamInterface();

  function renderExamInterface() {
    const isDynamic = Boolean(learningState.definition?.blocks?.length);
    const examTitle = isDynamic ? (learningState.definition.title || learningState.assignment?.title || title) : title;
    const examDuration = isDynamic
      ? (Number(learningState.definition.timing?.totalMinutes || learningState.definition.durationMinutes) || 120)
      : (Number(form.durationMinutes) || 120);

    const examSections = isDynamic
      ? learningState.definition.blocks.map((b, i) => b.title || `Phần ${i + 1}`)
      : sections;
    if (!examSections.includes(activeSection)) {
      activeSection = examSections[0];
    }

    document.title = `IZONE · ${isLearningMode ? 'Thi CBT' : 'Demo'} · ${examTitle}`;
    const headerSub = isLearningMode
      ? `Thí sinh: <strong>${escape(learningState.studentName)}</strong> · Lớp: <strong>${escape(learningState.className)}</strong>`
      : `Bài thi demo · ${examDuration} phút theo đề`;

    const noticeBanner = isLearningMode
      ? selfProctoringBannerHtml(learningState.selfProctoring)
      : `<div class="demo-notice">
          Bản xem thử để duyệt đề. Câu trả lời chỉ lưu trên trình duyệt này; nộp thử chưa chấm điểm hoặc gửi lên hệ thống.
          Dùng link thi có token do người phụ trách cung cấp để mở phiên chấm điểm.
        </div>`;

    let dynamicExamControls = null;

    if (isDynamic) {
      document.body.innerHTML = `
        <div class="candidate-simulation-shell content-demo cbt-exam-shell">
          <header class="topbar simulation-topbar cbt-topbar">
            <div class="topbar-inner demo-top cbt-topbar-inner">
              <div class="brand cbt-brand">
                <div class="brand-mark cbt-brand-mark">IZ</div>
                <div class="brand-copy cbt-brand-copy">
                  <div class="brand-title cbt-brand-title">IZONE · ${escape((examTitle || '').replace(/^(?:IZONE\s*[·•\-:]\s*)+/gi, ''))}</div>
                  <div class="brand-sub cbt-brand-sub">${headerSub}</div>
                </div>
              </div>
              <div class="cbt-current-section" id="cbt-current-section"></div>
              <div class="top-actions cbt-top-actions">
                <span id="demo-save" role="status" class="cbt-save-pill">Đã lưu</span>
                <div class="cbt-font-toggles">
                  <button type="button" class="icon-btn cbt-font-btn" id="demo-font-down" aria-label="Giảm cỡ chữ" title="Giảm cỡ chữ">A−</button>
                  <button type="button" class="icon-btn cbt-font-btn" id="demo-font-up" aria-label="Tăng cỡ chữ" title="Tăng cỡ chữ">A+</button>
                </div>
                <div class="cbt-timer-container">
                  <span class="cbt-timer-icon">${ICONS.clock}</span>
                  <span class="cbt-timer" id="examTimerDisplay">${examDuration}:00</span>
                </div>
                <button type="button" class="btn btn-primary btn-submit-top cbt-btn-submit" id="demo-submit-top">${isLearningMode ? (state.submittedAt ? 'Đã nộp bài' : 'Nộp bài') : 'Nộp thử'}</button>
              </div>
            </div>
            <div class="section-nav-wrap cbt-section-nav-wrap">
              <nav class="section-nav simulation-nav-bar cbt-section-nav-bar" id="sectionNavContainer" aria-label="Các phần bài thi">
                ${renderSectionNavPills(learningState.definition, 0)}
              </nav>
            </div>
            <div id="demo-save-alert" class="cbt-save-alert" role="alert"></div>
          </header>

          <main class="demo-width cbt-main-content" style="max-width:1380px;margin:0 auto;padding:20px 24px;">
            ${noticeBanner}
            <div id="demo-result" class="cbt-result-box" style="display:none;" hidden></div>
            <div id="demo-ai-card" hidden style="margin:20px 0;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 20px rgba(0,0,0,0.04)"></div>

            <div class="exam-layout cbt-exam-layout">
              <div class="main-column simulation-viewport cbt-viewport" id="examMainViewport"></div>
              <div id="examSidePanelContainer" class="cbt-side-container">
                ${renderSidePanel(learningState.definition, state, 0)}
              </div>
            </div>
          </main>

          <dialog id="demo-confirm">
            <h2>${isLearningMode ? 'Xác nhận nộp bài thi?' : 'Nộp bài thử?'}</h2>
            <p id="demo-confirm-text"></p>
            <p>${isLearningMode ? 'Sau khi nộp, hệ thống và AI sẽ tiến hành chấm điểm. Bạn không thể chỉnh sửa bài làm.' : 'Bạn có thể xem lại câu trả lời. Demo chưa chấm điểm.'}</p>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" id="demo-cancel">Quay lại bài</button>
              <button type="button" class="btn btn-primary" id="demo-confirm-submit">${isLearningMode ? 'Xác nhận nộp bài' : 'Xác nhận nộp thử'}</button>
            </div>
          </dialog>
        </div>
      `;

      if (learningState.status === 'active' && !state.submittedAt) {
        examMode.wantWakeLock = true;
        requestWakeLock();
      }

      // Cần để env(safe-area-inset-*) có giá trị; chỉ bật ở màn thi để không đổi các trang khác.
      document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width,initial-scale=1,viewport-fit=cover');
      renderDynamicExam(learningState.definition, document.querySelector('#examMainViewport'), {
        state,
        activeSection,
        onAnswerChange: () => {
          persist();
          update();
        }
      });

      dynamicExamControls = initDynamicExamInteractions(document.body, {
        definition: learningState.definition,
        state,
        onAnswerChange: () => {
          persist();
          update();
        },
        onSectionChange: (secName) => {
          activeSection = secName;
        }
      });
    } else {
      document.body.innerHTML = `<div class="content-demo">
        <header class="topbar"><div class="topbar-inner demo-top"><div class="brand"><div class="brand-mark">IZ</div><div class="brand-copy"><div class="brand-title">IZONE · ${escape(examTitle)}</div><div class="brand-sub">${headerSub}</div></div></div></div><nav class="section-nav demo-tabs" aria-label="Các phần bài">${examSections.map(sec=>`<button class="section-tab" data-demo-go="${escape(sec)}">${isDynamic ? escape(sec) : sectionLabels[sec]} <span class="tab-count" data-demo-tab-count="${escape(sec)}"></span></button>`).join('')}</nav></header>
        <main class="demo-width">
          ${noticeBanner}
          <div class="demo-toolbar">
            <span id="demo-progress" aria-live="polite"></span>
            <span id="demo-save" role="status"></span>
            <button type="button" class="btn btn-primary" id="demo-submit">${isLearningMode ? 'Nộp bài' : 'Nộp thử'}</button>
          </div>
          <div id="demo-result" class="demo-notice" hidden></div>
          <div id="demo-ai-card" hidden style="margin:20px 0;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 20px rgba(0,0,0,0.04)"></div>
          <div class="demo-layout"><aside class="side-panel"><div class="panel-card"><strong>Tiến độ làm bài</strong><div class="progress-track"><div class="progress-fill" id="demo-fill"></div></div><nav aria-label="Điều hướng bài thi">${examSections.map(sec=>`<button class="section-tab" data-demo-go="${escape(sec)}">${isDynamic ? escape(sec) : sectionLabels[sec]} <span data-demo-section-count="${escape(sec)}"></span></button>`).join('')}</nav></div><div class="panel-card"><strong>Lưu ý khi làm bài</strong><p class="meta">Câu trả lời được lưu tự động. Chuyển phần không mất đáp án. Kiểm tra các ô chưa trả lời trước khi nộp bài.</p></div></aside>
          <div class="demo-main">${groupSections(form, true)}<div class="bottom-actions demo-bottom"><button class="btn btn-secondary" id="demo-prev">← Phần trước</button><button class="btn btn-primary" id="demo-next">Phần tiếp →</button></div></div></div>
        </main><dialog id="demo-confirm"><h2>${isLearningMode ? 'Xác nhận nộp bài thi?' : 'Nộp bài thử?'}</h2><p id="demo-confirm-text"></p><p>${isLearningMode ? 'Sau khi nộp, hệ thống và AI sẽ tiến hành chấm điểm. Bạn không thể chỉnh sửa bài làm.' : 'Bạn có thể xem lại câu trả lời. Demo chưa chấm điểm.'}</p><button type="button" class="btn btn-secondary" id="demo-cancel">Quay lại bài</button> <button type="button" class="btn btn-primary" id="demo-confirm-submit">${isLearningMode ? 'Xác nhận nộp bài' : 'Xác nhận nộp thử'}</button></dialog>
      </div>`;

      document.querySelector('.demo-top').insertAdjacentHTML('beforeend',`<div class="top-actions"><button type="button" class="icon-btn" id="demo-font-down" aria-label="Giảm cỡ chữ">A−</button><button type="button" class="icon-btn" id="demo-font-up" aria-label="Tăng cỡ chữ">A+</button><span class="timer" id="examTimerDisplay">${examDuration}:00</span></div>`);
      document.querySelector('.top-actions').prepend(document.querySelector('#demo-save'));
    }

    const examTimer = createExamTimer({ course, examDuration, testToken, isLearningMode, state, learningState });

    if (!isDynamic) {
      for(const section of sections) {
        const groups=form.groups.filter(group=>sectionKey(group)===section);
        document.querySelector(`[data-demo-page="${section}"]`)?.insertAdjacentHTML('beforebegin',`<div class="section-hero" data-demo-page="${section}"><div class="section-kicker">${escape(title)}</div><h2>${sectionLabels[section]}</h2><p>${groups.length} nhóm bài · ${groups.reduce((count,group)=>count+group.items.length,0)} ô trả lời</p></div>`);
      }

      const style = document.createElement('style');
      style.textContent = `
        .content-demo{color:#404040;background:#f3f4f6;min-height:100vh}.demo-width{max-width:1180px;margin:auto;padding:20px}.demo-top{display:flex;align-items:center;justify-content:space-between;gap:16px}.demo-top nav{display:flex;gap:12px}.content-demo a{color:#174266}.content-demo a[aria-current]{font-weight:700;color:#db0829}.demo-notice{background:#fff4df;border:1px solid #ecd8b1;padding:12px 16px;border-radius:10px;margin:12px 0}.demo-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:20px 0}.content-demo button{padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:white}.content-demo #demo-submit,.content-demo #demo-confirm-submit{background:#db0829;color:white;border-color:#db0829}.demo-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px}.demo-layout aside nav{position:sticky;top:100px;display:grid;gap:12px;background:white;padding:16px;border-radius:12px}.demo-section{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:24px;scroll-margin-top:110px}.demo-section h2{margin-top:0;color:#174266;font-size:22px}.demo-lines{white-space:pre-wrap}.demo-context{background:#f3f4f6;padding:16px;border-radius:10px;margin:16px 0}.demo-question{padding:16px 0;border-top:1px solid #eee}.demo-question label{display:block;margin-bottom:10px;font-weight:500}.demo-question img{display:block;max-width:220px;max-height:180px;object-fit:contain;margin:12px 0}.demo-question input,.demo-question textarea,.demo-question select{display:block;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;color:#404040;background:white}.demo-question input:focus,.demo-question textarea:focus,.demo-question select:focus{outline:2px solid #174266;outline-offset:2px}.demo-question small{display:block;margin-top:6px;color:#62576a}.demo-question.done{border-left:3px solid #238563;padding-left:12px}.content-demo dialog{max-width:480px;border:0;border-radius:16px;padding:24px}.content-demo dialog::backdrop{background:#0006}@media(max-width:760px){.demo-layout{grid-template-columns:1fr}.demo-layout aside nav{position:static;display:flex;overflow:auto;white-space:nowrap}.demo-top{flex-direction:column;align-items:flex-start}.demo-section{padding:16px}.demo-width{padding:12px}}`;
      document.head.append(style);

      const layoutStyle = document.createElement('style');
      layoutStyle.textContent = `
        .content-demo .demo-tabs{display:flex;gap:8px;max-width:1180px;margin:auto;overflow-x:auto;padding:8px 24px}
        .content-demo .demo-layout{grid-template-columns:minmax(0,1fr) 280px;gap:24px}
        .content-demo .demo-main{grid-column:1;grid-row:1;min-width:0}
        .content-demo .demo-layout aside{grid-column:2;grid-row:1;top:140px}
        .content-demo .demo-layout aside nav{position:static;padding:0;margin-top:16px;background:transparent;gap:4px}
        .content-demo .demo-layout aside .section-tab{justify-content:space-between;text-align:left}
        .content-demo .demo-section{box-shadow:var(--shadow-1);border-color:var(--color-border);border-radius:var(--radius-lg)}
        .content-demo .demo-audio-gate{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px;margin:14px 0 18px;border:1px solid #f1c8cf;border-radius:12px;background:#fff3f5}
        .content-demo .demo-audio-gate audio{display:none}
        .content-demo .demo-audio-status{font-size:13px;font-weight:600;color:var(--color-text-secondary)}
        .content-demo .demo-audio-linked{font-size:13px}
        .content-demo .demo-section h2{font-family:Geologica,sans-serif;color:var(--color-text);font-size:19px;margin-bottom:0}
        .content-demo .demo-section .points{white-space:nowrap}
        .content-demo .demo-section[hidden]{display:none}
        .content-demo .demo-context{background:#fafbfc;border:1px solid #e9ebee}
        .content-demo .demo-question input:focus,.content-demo .demo-question select:focus,.content-demo .demo-question textarea:focus{outline:2px solid var(--color-primary)}
        .content-demo .demo-cloze{line-height:3;white-space:pre-wrap;overflow-wrap:anywhere}
        .content-demo .demo-sentence{padding:12px 0;border-bottom:1px solid var(--color-border)}
        .content-demo .demo-inline{display:inline-flex;align-items:center;vertical-align:middle;gap:6px;padding:0 4px;border:0;white-space:normal}
        .content-demo .demo-inline input{display:inline-block;width:clamp(110px,16vw,170px);padding:7px 10px;line-height:1.5}
        .content-demo .demo-inline.done{border:0;padding-left:4px}
        .content-demo .demo-inline.done input{border-color:#238563}
        .content-demo .demo-blank-number{font-size:12px;color:var(--color-text-secondary)}
        .content-demo .demo-vocab-grid,.content-demo .demo-picture-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}
        .content-demo .demo-bottom{display:flex;justify-content:space-between;gap:12px;margin-top:20px}
        .content-demo button.section-tab{border:0;background:transparent;padding:10px 12px}
        .content-demo button.section-tab.active{background:#fff3f5;color:var(--color-primary)}
        .content-demo .progress-track{margin-top:12px}
        .content-demo .demo-table-wrapper{margin:20px 0;background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
        .content-demo .demo-table-title{padding:14px 18px;font-family:Geologica,sans-serif;font-size:16px;font-weight:700;color:#1e293b;background:#f8fafc;border-bottom:2px solid #e2e8f0}
        .content-demo .demo-cloze-table{width:100%;border-collapse:collapse}
        .content-demo .demo-table-header{width:28%;min-width:160px;vertical-align:top;text-align:left;padding:14px 18px;background:#f8fafc;font-weight:600;font-size:14px;color:#334155;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0}
        .content-demo .demo-table-cell{vertical-align:top;padding:14px 18px;line-height:2.6;color:#1e293b;border-bottom:1px solid #e2e8f0}
        .content-demo .demo-table-cell br{line-height:1.8}
        .content-demo .demo-cloze-table tr:last-child .demo-table-header,.content-demo .demo-cloze-table tr:last-child .demo-table-cell{border-bottom:0}

        .content-demo .demo-order-container{margin:18px 0;display:grid;gap:18px}
        .content-demo .demo-order-sentences{display:grid;gap:10px}
        .content-demo .demo-order-sentence-card{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;line-height:1.5}
        .content-demo .demo-order-letter{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:var(--color-primary);color:white;font-weight:700;font-size:13px;flex-shrink:0}
        .content-demo .demo-order-text{flex:1;color:#334155;font-weight:500;padding-top:3px}
        .content-demo .demo-order-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:16px;background:#f1f5f9;border-radius:12px}
        .content-demo .demo-order-slot{display:flex;flex-direction:column;gap:6px}
        .content-demo .demo-order-slot-label{font-size:12px;font-weight:700;color:#475569}
        .content-demo .demo-order-slot select{width:100%;min-height:40px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;background:white;font-weight:600}

        .content-demo .demo-picture-grid .demo-prompt-row .demo-lines{font-weight:600;letter-spacing:0.5px}
        @media(max-width:900px){.content-demo .demo-layout{grid-template-columns:1fr}.content-demo .demo-layout aside{display:none}.content-demo .demo-main{grid-column:1}}
        @media(max-width:600px){.content-demo .demo-picture-grid{grid-template-columns:1fr}.content-demo .demo-vocab-grid{gap:0 10px}.content-demo .demo-question{min-width:0}.content-demo .demo-question input,.content-demo .demo-question select{min-width:0}.content-demo .demo-inline input{width:120px}.content-demo .demo-tabs{padding:8px 12px}.content-demo .exercise-head{gap:8px}.content-demo .demo-cloze{line-height:3.2}.content-demo .demo-top nav{flex-shrink:0}}
      `;
      document.head.append(layoutStyle);
    }

    for (const button of document.querySelectorAll('[data-demo-audio-start]')) {
      const gateId = button.dataset.demoAudioStart;
      const audio = document.querySelector(`[data-demo-audio-player="${gateId}"]`);
      const status = document.querySelector(`[data-demo-audio-status="${gateId}"]`);
      let started = false;
      let lastGoodTime = 0;
      document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
      if (status) status.textContent = 'Đã mở khóa nội dung câu hỏi để kiểm tra đề.';
      audio.addEventListener('play', () => {
        started = true;
        document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
        document.querySelectorAll('.demo-audio-linked').forEach(notice => {
          if (notice.closest('.demo-section')?.querySelector(`[data-demo-audio-content="${gateId}"]`)) notice.hidden = true;
        });
        button.hidden = true;
        status.textContent = 'Audio đang phát.';
      });
      audio.addEventListener('timeupdate', () => { if (!audio.seeking) lastGoodTime = audio.currentTime; });
      audio.addEventListener('seeking', () => {
        if (started && Math.abs(audio.currentTime - lastGoodTime) > 0.75) audio.currentTime = lastGoodTime;
      });
      audio.addEventListener('pause', () => {
        if (started && !audio.ended && !examMode.audioHold) audio.play().catch(() => {});
      });
      audio.addEventListener('ended', () => { status.textContent = 'Audio đã phát xong · bài tập vẫn mở để hoàn thành.'; });
      audio.addEventListener('error', () => {
        button.disabled = false;
        button.textContent = 'Thử phát lại audio';
        status.textContent = 'Chưa tải được audio (nội dung câu hỏi vẫn mở để bạn kiểm tra).';
        document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
      });
      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = 'Đang tải audio…';
        try {
          await audio.play();
        } catch {
          button.disabled = false;
          button.textContent = 'Thử phát lại audio';
          status.textContent = 'Trình duyệt chưa phát được audio (nội dung câu hỏi vẫn mở để bạn kiểm tra).';
          document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
        }
      });
    }

    const choiceStyle=document.createElement('style');
    choiceStyle.textContent=`.content-demo .demo-prompt-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}.content-demo .demo-prompt-row .qnum{flex-shrink:0}.content-demo .demo-prompt-row label{margin:4px 0 0}.content-demo .demo-mcq-question{border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin:12px 0}.content-demo .demo-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.content-demo label.demo-choice{display:flex;align-items:center;gap:10px;border:1px solid #dce1e8;border-radius:12px;padding:14px;cursor:pointer;font-weight:400;margin:0;position:relative;overflow-wrap:anywhere}.content-demo .demo-choice-letter{font-weight:700}.content-demo .demo-choice input[type=radio]{position:absolute;opacity:0;width:1px;height:1px;padding:0}.content-demo .demo-choice:has(input:checked){border-color:var(--color-primary);background:#fff3f5}.content-demo .demo-choice:has(input:focus-visible){outline:2px solid var(--color-primary);outline-offset:2px}.content-demo .demo-choice:has(input:disabled){cursor:default}.content-demo input[type=hidden]{display:none}@media(max-width:600px){.content-demo .demo-choice-grid{grid-template-columns:1fr}.content-demo .demo-mcq-question{padding:14px}}`;
    document.head.append(choiceStyle);

    const adaptiveChoiceStyle=document.createElement('style');
    adaptiveChoiceStyle.textContent=`
      .content-demo .demo-mcq-question{container-type:inline-size}
      .content-demo .demo-choice-grid[data-columns="1"]{grid-template-columns:1fr}
      .content-demo .demo-choice-grid[data-columns="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
      .content-demo .demo-choice-grid[data-columns="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
      .content-demo .demo-choice-grid[data-columns="4"]{grid-template-columns:repeat(4,minmax(0,1fr))}
      .content-demo label.demo-choice{min-height:56px;align-items:flex-start;transition:border-color .15s,background-color .15s;line-height:1.6}
      .content-demo .demo-choice-letter{flex-shrink:0;color:var(--color-navy)}
      .content-demo .demo-choice>span:last-child{min-width:0;overflow-wrap:break-word}
      .content-demo .demo-choice:has(input:not(:disabled)):hover{border-color:var(--color-primary);background:#fff8f9}
      .content-demo .demo-choice:has(input:checked) .demo-choice-letter{color:var(--color-primary)}
      .content-demo button.demo-clear-choice{margin-top:8px;min-height:44px;padding:8px 12px;border:0;background:transparent;color:var(--color-text-secondary);text-decoration:underline;text-underline-offset:3px}
      .content-demo button.demo-clear-choice:not(:disabled):hover{color:var(--color-primary);background:#fff3f5}
      .content-demo button.demo-clear-choice:disabled{opacity:.45;cursor:default}
      .content-demo button.demo-clear-choice:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
      @container(max-width:520px){.content-demo .demo-choice-grid[data-columns="4"]{grid-template-columns:repeat(2,minmax(0,1fr))}.content-demo .demo-choice-grid[data-columns="3"]{grid-template-columns:1fr}}
      @container(max-width:360px){.content-demo .demo-choice-grid[data-compact="false"]{grid-template-columns:1fr}}
      @media(max-width:600px){.content-demo .demo-choice-grid[data-columns="4"]{grid-template-columns:repeat(2,minmax(0,1fr))}.content-demo .demo-choice-grid[data-compact="false"],.content-demo .demo-choice-grid[data-columns="3"]{grid-template-columns:1fr}}
    `;
    document.head.append(adaptiveChoiceStyle);

    const wordBankStyle=document.createElement('style');
    wordBankStyle.textContent=`.content-demo .demo-word-bank{background:#fafbfc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0}.content-demo .demo-word-bank strong{display:block;font-size:13px;color:var(--color-text-secondary);margin-bottom:10px}.content-demo .demo-word-bank-list{display:flex;flex-wrap:wrap;gap:8px}.content-demo .demo-word-bank-list span{background:white;border:1px solid #dce1e8;border-radius:8px;padding:5px 14px;line-height:1.5;color:var(--color-navy)}.content-demo .demo-cloze-sentences{white-space:normal}.content-demo .demo-cloze-line{margin:0;padding:12px 0;border-bottom:1px solid #eee;line-height:2.5}.content-demo .demo-cloze-line:last-child{border-bottom:0}@media(max-width:600px){.content-demo .demo-word-bank{padding:12px}.content-demo .demo-word-bank-list span{padding:5px 10px}}`;
    document.head.append(wordBankStyle);

    const correctionStyle=document.createElement('style');
    correctionStyle.textContent=`.content-demo .demo-correction-card{border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin:14px 0;background:white}.content-demo .demo-correction-card .demo-prompt-row{align-items:center;margin-bottom:16px;font-weight:500}.content-demo .demo-correction-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.content-demo .demo-correction-fields .demo-question{padding:0;border-top:0;min-width:0}.content-demo .demo-correction-fields label{font-size:13px;color:var(--color-text-secondary);margin-bottom:8px}.content-demo .demo-correction-fields .demo-question.done{border-left:0;padding-left:0}.content-demo .demo-correction-fields .demo-question.done input{border-color:#238563}@media(max-width:600px){.content-demo .demo-correction-fields{grid-template-columns:1fr;gap:14px}.content-demo .demo-correction-card{padding:14px}}`;
    document.head.append(correctionStyle);

    const canonicalStyle=document.createElement('style');
    canonicalStyle.textContent=`
      .content-demo button.btn{min-height:44px;border-radius:10px;padding:0 18px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:8px}
      .content-demo button.btn-primary{background:var(--color-primary);color:white;border-color:var(--color-primary);box-shadow:0 8px 20px rgba(219,8,41,.14)}
      .content-demo button.btn-primary:not(:disabled):hover{background:var(--color-secondary);border-color:var(--color-secondary)}
      .content-demo button.btn-secondary{background:white;color:var(--color-text);border-color:#e5e7eb}
      .content-demo button.btn-secondary:not(:disabled):hover{border-color:#d5d9df;background:#fafafa}
      .content-demo button:disabled{cursor:default;opacity:.55}
      .content-demo .demo-course-switch{display:flex;justify-content:flex-end;gap:16px;padding:8px 0;font-size:13px}
      .content-demo .demo-section{margin-bottom:18px;padding:24px}
      .content-demo .demo-section h2{font-size:22px;font-weight:400}
      .content-demo .demo-layout aside nav{display:grid;gap:8px}
      .content-demo .demo-question textarea{border-radius:10px;min-height:76px;resize:vertical;line-height:1.5}
      .content-demo .demo-multipart-card{border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;margin:16px 0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.03)}
      .content-demo .demo-multipart-stem{font-size:15px;font-weight:600;color:var(--color-navy,#174266);line-height:1.55}
      .content-demo .demo-subfield-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px}
      .content-demo .demo-subfield{display:flex;flex-direction:column;gap:6px}
      .content-demo .demo-subfield-label{font-size:13px;font-weight:600;color:#475569}
      .content-demo .demo-subfield input{min-height:42px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px}
      .content-demo .demo-subparts-list{display:flex;flex-direction:column;gap:14px;margin-top:14px}
      .content-demo .demo-subpart-item{display:flex;flex-direction:column;gap:6px}
      .content-demo .demo-subpart-label{font-size:14px;font-weight:500;color:#1e293b;line-height:1.45}
      .content-demo .demo-subpart-item input{min-height:42px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px}
      .content-demo .demo-subpart-item textarea{min-height:64px;resize:vertical;line-height:1.5;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px}
      .content-demo .demo-picture-grid .demo-question{border:1px solid #e9ebee;border-radius:12px;padding:14px;margin-bottom:12px}
      .content-demo .demo-picture-grid .demo-question img{max-width:140px;max-height:120px;margin:12px auto}
      .content-demo .demo-top .top-actions{display:flex;align-items:center;gap:8px}
      .content-demo .demo-top .icon-btn{width:40px;height:40px;padding:0;border-radius:10px}
      .content-demo #demo-save{font-size:12px;color:var(--color-text-secondary);max-width:180px}
      .content-demo [data-demo-page][hidden]{display:none}
      @media(max-width:760px){.content-demo .demo-top{flex-direction:row;flex-wrap:wrap}.content-demo .demo-top .top-actions{margin-left:auto}.content-demo #demo-save{display:none}.content-demo .demo-section{padding:18px}.content-demo .timer{min-width:80px}.content-demo .section-hero{padding:20px}.content-demo .demo-multipart-card{padding:14px}.content-demo .demo-subfield-grid{grid-template-columns:1fr;gap:10px}}
    `;
    document.head.append(canonicalStyle);

    let fontScale = parseFloat(localStorage.getItem('izone_cbt_font_scale') || '1') || 1;
    if (fontScale < 0.85 || fontScale > 1.35) fontScale = 1;

    const applyFontScale = (scale) => {
      fontScale = Math.max(0.85, Math.min(1.3, Math.round(scale * 100) / 100));
      document.documentElement.style.setProperty('--font-scale', String(fontScale));
      document.documentElement.style.fontSize = `${16 * fontScale}px`;
      const btnDown = document.querySelector('#demo-font-down');
      const btnUp = document.querySelector('#demo-font-up');
      if (btnDown) {
        btnDown.disabled = fontScale <= 0.85;
        btnDown.title = `Thu nhỏ cỡ chữ (${Math.round(fontScale * 100)}%)`;
      }
      if (btnUp) {
        btnUp.disabled = fontScale >= 1.3;
        btnUp.title = `Phóng to cỡ chữ (${Math.round(fontScale * 100)}%)`;
      }
      try {
        localStorage.setItem('izone_cbt_font_scale', String(fontScale));
      } catch {}
    };

    const resizeFont = (delta) => applyFontScale(fontScale + delta);

    applyFontScale(fontScale);

    const btnFontDown = document.querySelector('#demo-font-down');
    const btnFontUp = document.querySelector('#demo-font-up');
    if (btnFontDown) btnFontDown.addEventListener('click', () => resizeFont(-0.06));
    if (btnFontUp) btnFontUp.addEventListener('click', () => resizeFont(0.06));
    const query = selector => document.querySelector(selector);
    const fields = [...document.querySelectorAll('[data-demo-answer]')];

    const { queueServerDraft, persist, clearDraftTimer } = createDraftSync({ query, isLearningMode, key, state, learningState, apiRequest, buildResponsesPayload });

    function update() {
      if (isDynamic) {
        if (dynamicExamControls && typeof dynamicExamControls.updateAnsweredState === 'function') {
          dynamicExamControls.updateAnsweredState();
        }
        const total = getTotalItemCount(learningState.definition);
        const done = getAnsweredCount(learningState.definition, state.answers);
        if (query('#demo-progress')) query('#demo-progress').textContent = `${done}/${total} câu đã trả lời`;
        if (query('#demo-fill')) query('#demo-fill').style.width = `${total ? Math.round(done / total * 100) : 0}%`;

        learningState.definition.blocks.forEach((block, bIdx) => {
          const secName = block.title || `Phần ${bIdx + 1}`;
          const bItems = block.items || [];
          let bDone = 0;
          for (const it of bItems) {
            const val = state.answers[it.itemVersionId];
            if (val !== undefined && val !== null) {
              if (Array.isArray(val) && val.some(v => typeof v === 'string' && v.trim() !== '')) bDone++;
              else if (typeof val === 'object' && Object.values(val).some(v => typeof v === 'string' && v.trim() !== '')) bDone++;
              else if (typeof val === 'string' && val.trim() !== '') bDone++;
            }
          }
          document.querySelectorAll(`[data-demo-section-count="${secName}"], [data-demo-tab-count="${secName}"]`).forEach(count => {
            count.textContent = `${bDone}/${bItems.length}`;
          });
        });
        if (query('#demo-submit')) query('#demo-submit').disabled = Boolean(state.submittedAt);
        if (query('#demo-submit-top')) query('#demo-submit-top').disabled = Boolean(state.submittedAt);
        if (query('#demo-result')) query('#demo-result').hidden = !state.submittedAt;
        return;
      }

      const done = items.filter(item=>String(state.answers[item.id]||'').trim()).length;
      query('#demo-progress').textContent=`${done}/${items.length} ô đã trả lời`;
      query('#demo-fill').style.width=`${Math.round(done/items.length*100)}%`;
      for (const section of sections) {
        const sectionItems=form.groups.filter(group=>sectionKey(group)===section).flatMap(group=>group.items);
        const answered=sectionItems.filter(item=>String(state.answers[item.id]||'').trim()).length;
        document.querySelectorAll(`[data-demo-section-count="${section}"], [data-demo-tab-count="${section}"]`).forEach(count=>count.textContent=`${answered}/${sectionItems.length}`);
      }
      for (const item of items) {
        const field = document.getElementById(item.id);
        if (field) {
          field.disabled=Boolean(state.submittedAt);
          field.closest('.demo-question')?.classList.toggle('done',Boolean(String(state.answers[item.id]||'').trim()));
        }
        const count = document.getElementById(`${item.id}-count`);
        if (count) count.textContent = `${words(state.answers[item.id])} từ${item.minWords ? ` · tối thiểu ${item.minWords}` : item.maxWords ? ` · tối đa ${item.maxWords} từ (hoặc số theo đề)` : ''}`;
      }
      query('#demo-submit').disabled=Boolean(state.submittedAt);
      document.querySelectorAll('[data-demo-choice]').forEach(radio=>{
        radio.checked=state.answers[radio.dataset.demoChoice]===radio.value;
        radio.disabled=Boolean(state.submittedAt);
      });
      document.querySelectorAll('[data-demo-clear]').forEach(button=>{
        button.disabled=Boolean(state.submittedAt)||!state.answers[button.dataset.demoClear];
      });
      query('#demo-result').hidden=!state.submittedAt;
      if (!isLearningMode) {
        query('#demo-result').textContent=state.submittedAt ? `Đã nộp thử lúc ${new Date(state.submittedAt).toLocaleString('vi-VN')}. Câu trả lời bên dưới được giữ để xem lại; chưa có điểm chấm.` : '';
      }
    }

    for (const field of fields) {
      field.value=state.answers[field.dataset.demoAnswer]||'';
      field.addEventListener(field.tagName==='SELECT'?'change':'input',()=>{
        if (state.submittedAt) return;
        state.answers[field.dataset.demoAnswer]=field.value; persist(); update();
      });
    }
    document.querySelectorAll('[data-demo-choice]').forEach(radio=>radio.addEventListener('change',()=>{
      if(state.submittedAt||!radio.checked)return;
      const field=document.getElementById(radio.dataset.demoChoice);
      if (field) { field.value=radio.value; field.dispatchEvent(new Event('input',{bubbles:true})); }
    }));
    document.querySelectorAll('[data-demo-clear]').forEach(button=>button.addEventListener('click',()=>{
      if(state.submittedAt)return;
      const field=document.getElementById(button.dataset.demoClear);
      if (field) { field.value=''; field.dispatchEvent(new Event('input',{bubbles:true})); }
    }));

    const { pollLearningResult } = createSubmitFlow({ isLearningMode, form, items, title, state, learningState, apiRequest, createUuid, stopExamConnections, buildResponsesPayload, isDynamic, examTimer, query, update, queueServerDraft, persist, clearDraftTimer });

    if (!isDynamic) {
      function showSection(section) {
        activeSection=section;
        document.querySelectorAll('[data-demo-page]').forEach(page=>{
          page.hidden = page.dataset.demoPage !== section;
          page.classList.toggle('hidden', page.dataset.demoPage !== section);
        });
        document.querySelectorAll('[data-demo-go]').forEach(button=>{
          button.classList.toggle('active',button.dataset.demoGo===section);
          if (button.dataset.demoGo===section) button.setAttribute('aria-current','page');
          else button.removeAttribute('aria-current');
        });
        query('#demo-prev').disabled=examSections.indexOf(section)===0;
        query('#demo-next').textContent=examSections.indexOf(section)===examSections.length-1?(isLearningMode?'Nộp bài':'Nộp thử'):'Phần tiếp →';
        window.scrollTo({top:0,behavior:'smooth'});
      }
      document.querySelectorAll('[data-demo-go]').forEach(button=>button.addEventListener('click',()=>showSection(button.dataset.demoGo)));
      query('#demo-prev').addEventListener('click',()=>{
        const previous=examSections[examSections.indexOf(activeSection)-1];if(previous)showSection(previous);
      });
      query('#demo-next').addEventListener('click',()=>{
        const next=examSections[examSections.indexOf(activeSection)+1];if(next)showSection(next);else query('#demo-submit').click();
      });

      update();
      showSection(activeSection);
    } else {
      update();
      const initialIdx = examSections.indexOf(activeSection);
      if (initialIdx >= 0 && dynamicExamControls?.activateSection) {
        dynamicExamControls.activateSection('sim-block-' + initialIdx);
      }
    }

    if (isLearningMode && state.submittedAt) {
      void pollLearningResult();
    }
  }
}
