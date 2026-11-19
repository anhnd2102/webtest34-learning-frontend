// NGUỒN: file .mts này; content-preview.mjs do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; build tự thêm rev (tree webtest-34-demo/) và đọc rev từ chính file .mjs đã sinh.
import {
  renderDynamicExam,
  getTotalItemCount,
  getAnsweredCount,
  renderSectionNavPills,
  renderSidePanel,
  initDynamicExamInteractions,
  ICONS
} from './dynamic-exam-renderer.mjs';

import { escape } from './candidate/text-utils.js';
import { learningRequestMethod, learningRequestBody, selfProctoringBannerHtml } from './candidate/learning-api.js';
import { mapAnswerToDefinitionValue, mapAnswerFromDefinitionValue } from './candidate/group-render.js';
import { createExamMode } from './candidate/exam-mode.js';
import { createIntroScreen } from './candidate/intro-screen.js';
import { createReviewScreen } from './candidate/review-screen.js';
import { createExamTimer } from './candidate/exam-timer.js';
import { createDraftSync } from './candidate/draft-sync.js';
import { createSubmitFlow } from './candidate/submit-flow.js';
import { readPreviewToken, previewBannerHtml, fetchPreviewDefinition, blockedPreviewRequest, PREVIEW_CSS } from './candidate/preview-mode.js';
export { formatCandidateOptionLabel } from './candidate/text-utils.js';
export { draftKey, sanitizeDraft, learningRequestMethod, learningRequestBody, examPhase, selfProctoringBannerHtml, resetLocalAttemptState } from './candidate/learning-api.js';
export { resultViewModel, resultDetailsHtml, studentResultsBodyHtml, studentResultsHtml, studentReviewHtml, bindResultFilters } from './candidate/result-view.js';
export { withLocalGroupLabels, mapAnswerToDefinitionValue, mapAnswerFromDefinitionValue } from './candidate/group-render.js';

export async function mount(course: string) {
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

  // Xem trước của giáo viên: token ký ngắn hạn trong fragment `#preview=...`; không có danh tính học viên.
  const previewToken = readPreviewToken(location.hash);
  const isPreview = Boolean(previewToken);

  const isProd = queryParams.get('prod') === '1' || queryParams.get('apiEnv') === 'production';
  const apiBase = (isProd ? 'https://webtest.ducanhdev.com' : (config.LEARNING_API_BASE_URL || config.API_BASE_URL || 'https://webtest.ducanhdev.com')).replace(/\/$/, '');
  // Shell chỉ mở bằng link có token (chế độ xem thử bằng đề dựng sẵn đã bỏ); `isLearningMode` giữ lại làm tham số cho các module `candidate/`.
  if (!testToken && !isPreview) throw new Error('Thiếu mã bài thi: hãy mở bài thi bằng link do giáo viên cung cấp.');
  const isLearningMode = true;

  // form, state và learningState dùng chung cho nhiều module `candidate/` có kiểu riêng (hợp đồng nằm ở từng module); ở đây giữ `any`
  // vì đề và đáp án là JSON động từ Learning API.
  let form: any = { course, groups: [], durationMinutes: 60 };
  let items: any[] = [];
  let title = `Khóa ${course}`;
  let activeSection = '';
  let key = `izone_learning_${testToken || course}`;
  let state: any = { answers: {}, submittedAt: null };

  const paramClassCode = (queryParams.get('class') || queryParams.get('classCode') || '').trim().toUpperCase();
  const learningState: any = {
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

  // Tiến độ nghe lưu trên máy chủ theo lượt làm bài: nghe xong thì khóa, nghe dở thì tiếp tục từ vị trí đã lưu.
  // Không tải được thì vẫn vào bài (không chặn thí sinh), khi đó bài nghe coi như chưa nghe.
  async function loadAudioProgress() {
    state.audioProgress = {};
    if (!learningState.attemptToken) return;
    try {
      const { resume } = await apiRequest('/attempts/audio/resume', { attemptToken: learningState.attemptToken });
      state.unlockedAudioBlocks = state.unlockedAudioBlocks instanceof Set ? state.unlockedAudioBlocks : new Set();
      for (const checkpoint of resume?.checkpoints || []) {
        state.audioProgress[checkpoint.audioKey] = { lastHeardSeconds: Number(checkpoint.lastHeardSeconds) || 0, completed: Boolean(checkpoint.completedAt) };
        state.unlockedAudioBlocks.add(checkpoint.audioKey);
      }
    } catch (error) {
      console.warn('Không tải được tiến độ nghe:', error);
    }
  }
  // Mốc nghe gửi tuần tự theo từng bài nghe; lỗi chỉ ghi cảnh báo vì lần sau sẽ gửi lại mốc mới hơn.
  const audioCheckpointChains = new Map();
  function saveAudioProgress(audioKey: string, seconds: number, completed: boolean) {
    if (!learningState.attemptToken || state.submittedAt) return;
    state.audioProgress = state.audioProgress || {};
    state.audioProgress[audioKey] = { lastHeardSeconds: seconds, completed: completed || Boolean(state.audioProgress[audioKey]?.completed) };
    const body = { attemptToken: learningState.attemptToken, audioKey, lastHeardSeconds: Math.max(0, Math.min(86400, seconds)), completed };
    const next = (audioCheckpointChains.get(audioKey) || Promise.resolve()).catch(() => {}).then(() => apiRequest('/attempts/audio/checkpoint', body)).catch((error: unknown) => console.warn('Chưa lưu được mốc nghe:', error));
    audioCheckpointChains.set(audioKey, next);
  }
  // Mở giao diện thi sau khi đã có tiến độ nghe để bài đã nghe xong không bị mở lại sau khi tải trang.
  async function openExamInterface() {
    await loadAudioProgress();
    renderExamInterface();
  }

  async function apiRequest(path: string, body?: any) {
    // Xem trước không gửi gì lên máy chủ (đề được đọc riêng bằng một GET khi mở trang).
    if (isPreview) return blockedPreviewRequest();
    const res = await fetch(`${apiBase}/api/learning${path}`, {
      method: learningRequestMethod(path),
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      // iOS có thể hủy request ngay khi đổi app; thiếu dòng này lần rời bài có thể không được ghi.
      keepalive: path.startsWith('/attempts/exam/incidents/') || path === '/attempts/audio/checkpoint',
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
  const examMode = createExamMode({ apiBase, learningState, deviceId, apiRequest, createUuid, renderExamInterface: openExamInterface });
  const { requestFullscreen, requestWakeLock, stopExamConnections, connectExamEvents, renderExamWaitingRoom, dispatchExamGuard, mountExamGuard } = examMode;

  function buildResponsesPayload() {
    if (learningState.definition?.blocks?.length) {
      const responses: Record<string, any> = {};
      const allItems = learningState.definition.blocks.flatMap((b: any) => b.items || []);
      for (const it of allItems) {
        const val = state.answers[it.itemVersionId];
        if (val !== undefined && val !== null && val !== '') {
          responses[it.itemVersionId] = val;
        }
      }
      return responses;
    }

    const defBlocks = learningState.definition?.blocks || [];
    const responses: Record<string, any> = {};

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

  function applyServerDraft(serverDraft: any) {
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

            <p id="startExamError" style="color:#db0829" role="alert" hidden></p>
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

    const classInput = document.querySelector<HTMLInputElement>('#classCodeInput')!;
    const loadBtn = document.querySelector<HTMLButtonElement>('#loadRosterBtn')!;
    const classStatus = document.querySelector<HTMLElement>('#classCodeStatus')!;
    const studentSelect = document.querySelector<HTMLSelectElement>('#studentSelectInput')!;
    const studentStatus = document.querySelector<HTMLElement>('#studentSelectStatus')!;
    const startBtn = document.querySelector<HTMLButtonElement>('#startExamBtn')!;
    const { handleLoadRoster } = createIntroScreen({ config, testToken, paramClassCode, state, learningState, apiRequest, createUuid, requestFullscreen, connectExamEvents, renderExamWaitingRoom, mountExamGuard, applyServerDraft, renderExamInterface: openExamInterface, preview: isPreview, classInput, loadBtn, classStatus, studentSelect, studentStatus, startBtn });

    if (isPreview) {
      canonicalStyle.textContent += PREVIEW_CSS;
      const introCard = document.querySelector<HTMLElement>('.cbt-intro-card');
      for (const field of [classInput, studentSelect]) field.closest<HTMLElement>('.cbt-intro-field')?.setAttribute('hidden', '');
      document.querySelector<HTMLElement>('#viewResultBtn')?.setAttribute('hidden', '');
      introCard?.insertAdjacentHTML('afterbegin', previewBannerHtml());
      startBtn.disabled = true;
      startBtn.textContent = 'Đang tải đề…';
      const startError = document.querySelector<HTMLElement>('#startExamError');
      fetchPreviewDefinition(apiBase, previewToken).then(({ definition }) => {
        learningState.definition = definition;
        learningState.studentName = 'Xem trước';
        learningState.className = '';
        const minutes = Number(definition.timing?.totalMinutes || definition.durationMinutes) || 120;
        const titleEl = document.querySelector<HTMLElement>('.cbt-intro-title');
        if (titleEl) titleEl.textContent = definition.title || initialTitle;
        const subEl = document.querySelector<HTMLElement>('.cbt-intro-sub');
        if (subEl) subEl.innerHTML = `Thời gian làm bài: <strong>${minutes} phút</strong> · Tổng số câu hỏi: <strong>${getTotalItemCount(definition)} câu</strong>.<br>Đây là bản xem trước để kiểm tra nội dung; không có bài làm nào được lưu.`;
        startBtn.disabled = false;
        startBtn.textContent = 'Bắt đầu xem trước →';
      }).catch((err: Error) => {
        startBtn.textContent = 'Không mở được đề';
        if (startError) { startError.textContent = err.message; startError.hidden = false; }
      });
    } else {
      createReviewScreen({ testToken, title, learningState, apiRequest, studentSelect });
      void handleLoadRoster();
    }
    return;

  // --- RENDER GIAO DIỆN BÀI THI CHÍNH THỨC ---

  function renderExamInterface() {
    const definitionBlocks: any[] = learningState.definition?.blocks || [];
    if (!definitionBlocks.length) {
      document.body.innerHTML = '<main class="cbt-intro-wrap"><div class="cbt-intro-card"><h1>Đề thi chưa có nội dung</h1><p>Hãy liên hệ giáo viên để được cấp lại link bài thi.</p></div></main>';
      return;
    }
    const examTitle = learningState.definition.title || learningState.assignment?.title || title;
    const examDuration = Number(learningState.definition.timing?.totalMinutes || learningState.definition.durationMinutes) || 120;

    const examSections: string[] = definitionBlocks.map((b: any, i: number) => b.title || `Phần ${i + 1}`);
    if (!examSections.includes(activeSection)) {
      activeSection = examSections[0];
    }

    document.title = `IZONE · Thi CBT · ${examTitle}`;
    const headerSub = isPreview ? 'Bản xem trước' : `Thí sinh: <strong>${escape(learningState.studentName)}</strong> · Lớp: <strong>${escape(learningState.className)}</strong>`;

    const noticeBanner = selfProctoringBannerHtml(learningState.selfProctoring);

    let dynamicExamControls: any = null;

    document.body.innerHTML = `
      <div class="candidate-simulation-shell content-demo cbt-exam-shell">
        <header class="topbar simulation-topbar cbt-topbar">
          ${isPreview ? previewBannerHtml() : ''}
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
              <button type="button" class="btn btn-primary btn-submit-top cbt-btn-submit" id="demo-submit-top">${state.submittedAt ? 'Đã nộp bài' : (isPreview ? 'Thoát xem trước' : 'Nộp bài')}</button>
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
          <h2>Xác nhận nộp bài thi?</h2>
          <p id="demo-confirm-text"></p>
          <p id="demo-confirm-error" style="color:#db0829" role="alert" hidden></p>
          <p>Sau khi nộp, hệ thống và AI sẽ tiến hành chấm điểm. Bạn không thể chỉnh sửa bài làm.</p>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" id="demo-cancel">Quay lại bài</button>
            <button type="button" class="btn btn-primary" id="demo-confirm-submit">Xác nhận nộp bài</button>
          </div>
        </dialog>
      </div>
    `;

    if (learningState.status === 'active' && !state.submittedAt) {
      examMode.wantWakeLock = true;
      requestWakeLock();
    }

    // Cần để env(safe-area-inset-*) có giá trị; chỉ bật ở màn thi để không đổi các trang khác.
    document.querySelector<HTMLElement>('meta[name="viewport"]')?.setAttribute('content', 'width=device-width,initial-scale=1,viewport-fit=cover');
    renderDynamicExam(learningState.definition, document.querySelector<HTMLElement>('#examMainViewport'), {
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
      onAudioProgress: isPreview ? undefined : saveAudioProgress,
      allowReplay: isPreview,
      onAnswerChange: () => {
        persist();
        update();
      },
      onSectionChange: (secName) => {
        activeSection = secName;
      }
    });

    const examTimer = createExamTimer({ course, examDuration, testToken, isLearningMode, state, learningState, countUp: isPreview });

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

    const applyFontScale = (scale: number) => {
      fontScale = Math.max(0.85, Math.min(1.3, Math.round(scale * 100) / 100));
      document.documentElement.style.setProperty('--font-scale', String(fontScale));
      document.documentElement.style.fontSize = `${16 * fontScale}px`;
      const btnDown = document.querySelector<HTMLButtonElement>('#demo-font-down');
      const btnUp = document.querySelector<HTMLButtonElement>('#demo-font-up');
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

    const resizeFont = (delta: number) => applyFontScale(fontScale + delta);

    applyFontScale(fontScale);

    const btnFontDown = document.querySelector<HTMLElement>('#demo-font-down');
    const btnFontUp = document.querySelector<HTMLElement>('#demo-font-up');
    if (btnFontDown) btnFontDown.addEventListener('click', () => resizeFont(-0.06));
    if (btnFontUp) btnFontUp.addEventListener('click', () => resizeFont(0.06));
    const query = (selector: string): any => document.querySelector<HTMLElement>(selector);

    // Xem trước không lưu nháp (cả máy chủ lẫn trình duyệt).
    const { queueServerDraft, persist, clearDraftTimer } = isPreview
      ? { queueServerDraft() {}, persist() {}, clearDraftTimer() {} }
      : createDraftSync({ query, isLearningMode, key, state, learningState, apiRequest, buildResponsesPayload });

    function update() {
      if (dynamicExamControls && typeof dynamicExamControls.updateAnsweredState === 'function') {
        dynamicExamControls.updateAnsweredState();
      }
      const total = getTotalItemCount(learningState.definition);
      const done = getAnsweredCount(learningState.definition, state.answers);
      if (query('#demo-progress')) query('#demo-progress').textContent = `${done}/${total} câu đã trả lời`;
      if (query('#demo-fill')) query('#demo-fill').style.width = `${total ? Math.round(done / total * 100) : 0}%`;

      learningState.definition.blocks.forEach((block: any, bIdx: number) => {
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
        document.querySelectorAll<HTMLElement>(`[data-demo-section-count="${secName}"], [data-demo-tab-count="${secName}"]`).forEach(count => {
          count.textContent = `${bDone}/${bItems.length}`;
        });
      });
      if (query('#demo-submit')) query('#demo-submit').disabled = Boolean(state.submittedAt);
      if (query('#demo-submit-top')) query('#demo-submit-top').disabled = Boolean(state.submittedAt);
      if (query('#demo-result')) query('#demo-result').hidden = !state.submittedAt;
    }

    let pollLearningResult: () => unknown = () => {};
    if (isPreview) {
      // Không có nộp bài: nút trên thanh chỉ thoát xem trước và không gửi gì.
      const savePill = query('#demo-save');
      if (savePill) savePill.hidden = true;
      query('#demo-submit-top')?.addEventListener('click', () => {
        examTimer.stop();
        window.close();
        document.body.innerHTML = '<main class="cbt-intro-wrap"><div class="cbt-intro-card"><h1 class="cbt-intro-title">Đã thoát xem trước</h1><p>Bạn có thể đóng tab này và quay lại Dashboard.</p></div></main>';
      });
    } else {
      ({ pollLearningResult } = createSubmitFlow({ isLearningMode, form, items, title, state, learningState, apiRequest, createUuid, stopExamConnections, buildResponsesPayload, isDynamic: true, examTimer, query, update, queueServerDraft, persist, clearDraftTimer }));
    }

    update();
    const initialIdx = examSections.indexOf(activeSection);
    if (initialIdx >= 0 && dynamicExamControls?.activateSection) {
      dynamicExamControls.activateSection('sim-block-' + initialIdx);
    }

    if (state.submittedAt) {
      void pollLearningResult();
    }
  }
}
