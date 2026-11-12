import { parseSseChunk } from '../../teacher-dashboard/exam-room-sse.js';
import { escape } from './text-utils.js?rev=20261113-audio-a';
import { selfProctoringBannerHtml } from './learning-api.js?rev=20261113-audio-a';

export function createExamMode({ apiBase, learningState, deviceId, apiRequest, createUuid, renderExamInterface }) {
  const ignoreFocusSignals = Boolean(globalThis.isIosDevice?.(navigator));
  const supportsFullscreen = () => !ignoreFocusSignals && typeof document.documentElement.requestFullscreen === 'function';
  const requestFullscreen = () => (supportsFullscreen() ? document.documentElement.requestFullscreen() : Promise.reject(new Error('unsupported')));
  let examGuardState = { running: false, fullscreenSupported: supportsFullscreen(), ignoreFocusSignals };
  let examStreamController = null;
  let examHeartbeatTimer = null;
  let examAudioHold = false;
  let examPausedAudios = [];
  const examIncidentOperations = new Map();
  const examActive = () => ['waiting', 'running'].includes(learningState.exam?.status) && learningState.status === 'active';

  // Giữ màn hình sáng khi đang làm bài. Trình duyệt không hỗ trợ hoặc từ chối thì bỏ qua, bài vẫn làm bình thường.
  // wakeLock giữ promise của lần xin hiện tại; hệ thống tự nhả khi trang bị ẩn nên xin lại khi trang hiện lại.
  let wakeLock = null;
  let wantWakeLock = false;
  function requestWakeLock() {
    if (!wantWakeLock || wakeLock || document.visibilityState !== 'visible' || !navigator.wakeLock) return;
    wakeLock = navigator.wakeLock.request('screen').then(lock => {
      lock.addEventListener('release', () => { wakeLock = null; });
      if (!wantWakeLock) lock.release();
      return lock;
    }).catch(() => { wakeLock = null; });
  }
  document.addEventListener('visibilitychange', requestWakeLock);

  function stopExamConnections() {
    wantWakeLock = false;
    wakeLock?.then(lock => lock?.release());
    clearInterval(examHeartbeatTimer);
    examHeartbeatTimer = null;
    examStreamController?.abort();
    examStreamController = null;
  }

  function startExamHeartbeat() {
    if (examHeartbeatTimer) return;
    const send = () => {
      if (!examActive()) return clearInterval(examHeartbeatTimer);
      void apiRequest('/attempts/exam/heartbeat', { attemptToken: learningState.attemptToken }).catch(() => {});
    };
    send();
    examHeartbeatTimer = setInterval(send, 20_000);
  }

  function applyExamDeadline(deadlineAt) {
    if (deadlineAt) learningState.expiresAt = Date.parse(deadlineAt);
  }

  async function enterRunningExam(payload) {
    if (payload.exam?.status !== 'running' || !payload.definition || learningState.exam?.status === 'running') return;
    learningState.exam = { ...learningState.exam, ...payload.exam, enabled: true };
    learningState.definition = payload.definition;
    applyExamDeadline(payload.exam.deadlineAt);
    await renderExamInterface();
    mountExamGuard();
  }

  async function consumeExamEvents(signal) {
    const res = await fetch(`${apiBase}/api/learning/attempts/events?deviceId=${encodeURIComponent(deviceId)}`, {
      headers: { Authorization: `Bearer ${learningState.attemptToken}` }, cache: 'no-store', signal
    });
    if (!res.ok || !res.body) throw new Error(`Lỗi HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) return;
      const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
      buffer = parsed.buffer;
      for (const { event, data } of parsed.events) {
        if (event === 'snapshot' || event === 'exam.started') {
          const payload = event === 'exam.started' ? { exam: data, definition: data.definition } : data;
          if (learningState.exam?.status === 'running') applyExamDeadline(payload.exam?.deadlineAt);
          else await enterRunningExam(payload);
        } else if (event === 'exam.extended' && !learningState.exam?.retake) {
          applyExamDeadline(data.deadlineAt);
        } else if (event === 'device.superseded') {
          dispatchExamGuard({ type: 'device_superseded' });
          return;
        }
      }
    }
  }

  async function connectExamEvents() {
    startExamHeartbeat();
    if (examStreamController) return;
    const controller = examStreamController = new AbortController();
    while (!controller.signal.aborted && examActive()) {
      try { await consumeExamEvents(controller.signal); } catch { if (controller.signal.aborted) break; }
      if (!controller.signal.aborted && examActive()) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (examStreamController === controller) examStreamController = null;
  }

  function renderExamWaitingRoom() {
    document.querySelector('main').innerHTML = `
      <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,0.04);text-align:center" aria-live="polite">
        <div style="font-size:12px;font-weight:700;color:#db0829;letter-spacing:1px;margin-bottom:8px">PHÒNG CHỜ</div>
        <h1 style="font-size:24px;color:#174266;margin:0 0 12px 0">Xin chào ${escape(learningState.studentName)}!</h1>
        <p style="color:#64748b">Đề sẽ hiện khi giáo viên bắt đầu.</p>
        <p id="examFullscreenStatus" style="color:#64748b"></p>
        <p id="examWaitingError" style="color:#db0829" role="alert" hidden></p>
        <button type="button" class="btn btn-primary" id="examReadyBtn">Tôi đã sẵn sàng</button>
        <button type="button" class="btn btn-secondary" id="examFullscreenReenter" hidden>Vào chế độ thi</button>
      </div>`;
    const readyBtn = document.querySelector('#examReadyBtn');
    const status = document.querySelector('#examFullscreenStatus');
    const reenter = document.querySelector('#examFullscreenReenter');
    readyBtn.addEventListener('click', async () => {
      const fullscreenUnsupported = !supportsFullscreen();
      // requestFullscreen phải gọi ngay trong handler của cú bấm.
      const fullscreenAttempt = requestFullscreen().catch(() => null);
      readyBtn.disabled = true;
      try {
        await fullscreenAttempt;
        await apiRequest('/attempts/exam/ready', { attemptToken: learningState.attemptToken, fullscreenUnsupported });
        readyBtn.hidden = true;
        status.textContent = fullscreenUnsupported
          ? 'Thiết bị không hỗ trợ toàn màn hình; giáo viên đã được thông báo.'
          : (document.fullscreenElement ? 'Đã sẵn sàng. Hãy chờ giáo viên bắt đầu.' : 'Không thể bật toàn màn hình. Bạn vẫn có thể chờ giáo viên bắt đầu.');
      } catch (err) {
        readyBtn.disabled = false;
        const error = document.querySelector('#examWaitingError');
        error.textContent = `Không thể lưu trạng thái sẵn sàng: ${err.message}`;
        error.hidden = false;
      }
    });
    reenter.addEventListener('click', () => { requestFullscreen().catch(() => { status.textContent = 'Không thể bật toàn màn hình. Hãy thử lại.'; }); });
  }

  function requestExamIncident(command) {
    const opening = command.type === 'open_incident';
    const body = { attemptToken: learningState.attemptToken, incidentId: command.incidentId, ...(opening ? { type: 'left_exam' } : {}) };
    const previous = examIncidentOperations.get(command.incidentId) || Promise.resolve();
    // Đóng một sự cố mà lần mở bị lỗi mạng: mở lại (idempotent) trước khi đóng.
    const operation = previous
      .catch(() => (opening ? undefined : apiRequest('/attempts/exam/incidents/open', { ...body, type: 'left_exam' })))
      .then(() => apiRequest(opening ? '/attempts/exam/incidents/open' : '/attempts/exam/incidents/close', body));
    examIncidentOperations.set(command.incidentId, operation);
    void operation.then(data => {
      if (data?.selfProctoring) applySelfProctoring(data.selfProctoring);
    }).catch(err => {
      if (err.code === 'EXAM_DEVICE_SUPERSEDED') return;
      const message = document.querySelector('#examGuardMessage');
      if (message) message.textContent = 'Không thể lưu sự cố rời bài. Hãy giữ trang mở và thử quay lại bài thi.';
    });
  }

  // Server trả số lần thoát sau mỗi sự cố; vượt giới hạn thì server đã tự nộp bài.
  function applySelfProctoring(next) {
    learningState.selfProctoring = { ...learningState.selfProctoring, ...next };
    const { text } = globalThis.selfProctoringNotice(learningState.selfProctoring);
    const banner = document.querySelector('#selfProctoringBanner');
    if (banner) banner.outerHTML = selfProctoringBannerHtml(learningState.selfProctoring);
    const message = document.querySelector('#examGuardMessage');
    if (message) message.textContent = text;
    if (learningState.selfProctoring.autoSubmitted && learningState.status === 'active') {
      learningState.status = 'submitted';
      learningState.onAutoSubmitted?.(text);
    }
  }

  function runExamGuardCommand(command) {
    if (command.type === 'pause_audio') {
      examAudioHold = true;
      examPausedAudios = [...document.querySelectorAll('audio')].filter(audio => !audio.paused && !audio.ended);
      examPausedAudios.forEach(audio => audio.pause());
    } else if (command.type === 'resume_audio') {
      examAudioHold = false;
      examPausedAudios.forEach(audio => audio.play().catch(() => {}));
      examPausedAudios = [];
    } else if (command.type === 'request_fullscreen') {
      requestFullscreen().catch(() => {
        dispatchExamGuard({ type: 'left_exam', reason: 'fullscreen', at: Date.now(), incidentId: createUuid() });
        const message = document.querySelector('#examGuardMessage');
        if (message) message.textContent = 'Không thể bật toàn màn hình. Hãy bấm “Quay lại bài thi” để thử lại.';
      });
    } else if (command.type === 'open_incident' || command.type === 'close_incident') {
      requestExamIncident(command);
    }
  }

  function dispatchExamGuard(event) {
    mountExamGuard();
    examGuardState = {
      ...examGuardState,
      running: (learningState.exam?.status === 'running' || Boolean(learningState.selfProctoring)) && learningState.status === 'active',
      fullscreenSupported: !learningState.selfProctoring && supportsFullscreen()
    };
    const result = globalThis.examGuardReducer(examGuardState, event);
    examGuardState = result.state;
    const overlay = document.querySelector('#examGuardOverlay');
    document.querySelector('.content-demo')?.classList.toggle('exam-guard-blurred', Boolean(examGuardState.prompt));
    document.querySelector('.cbt-bottom-bar')?.toggleAttribute('inert', Boolean(examGuardState.prompt));
    // Bảng trượt nằm trên top layer, sẽ che mất lớp cảnh báo nếu còn mở.
    if (examGuardState.prompt) document.querySelector('#cbtSheet')?.close();
    if (overlay) overlay.hidden = !examGuardState.prompt;
    if (examGuardState.superseded) {
      learningState.status = 'superseded';
      stopExamConnections();
      const main = document.querySelector('.content-demo');
      if (main) main.inert = true;
      document.querySelector('#examGuardMessage').textContent = 'Bài thi đang được mở ở máy khác. Nếu không phải bạn, hãy báo giáo viên.';
      document.querySelector('#examGuardReturn').hidden = true;
    } else if (examGuardState.prompt && document.visibilityState !== 'hidden') {
      document.querySelector('#examGuardReturn')?.focus();
    }
    for (const command of result.commands) runExamGuardCommand(command);
  }

  let examGuardListening = false;
  function mountExamGuard() {
    if (!document.querySelector('#examGuardOverlay')) {
      document.body.insertAdjacentHTML('beforeend', `
        <style>.exam-guard-blurred{filter:blur(7px);pointer-events:none;user-select:none}
        #examGuardOverlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:rgba(17,24,39,.72)}
        #examGuardOverlay[hidden]{display:none}
        #examGuardOverlay .card{width:min(100%,480px);padding:28px;border-radius:18px;background:#fff;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.3)}</style>
        <div id="examGuardOverlay" role="alertdialog" aria-modal="true" aria-labelledby="examGuardTitle" aria-describedby="examGuardMessage" hidden>
          <div class="card"><h2 id="examGuardTitle">Bạn đã rời khỏi màn hình thi.</h2>
          <p id="examGuardMessage">Giáo viên sẽ được thông báo.</p>
          <button type="button" class="btn btn-primary" id="examGuardReturn">Quay lại bài thi</button></div>
        </div>`);
      document.querySelector('#examGuardReturn').addEventListener('click', () => {
        document.querySelector('#examGuardMessage').textContent = learningState.selfProctoring ? globalThis.selfProctoringNotice(learningState.selfProctoring).text : 'Giáo viên sẽ được thông báo.';
        dispatchExamGuard({ type: 'return_click', at: Date.now() });
      });
    }
    if (examGuardListening) return;
    examGuardListening = true;
    // Tải lại hoặc đóng tab cũng làm trang bị ẩn (sau pagehide), nhưng không tính là rời bài.
    let pageUnloading = false;
    window.addEventListener('pagehide', () => { pageUnloading = true; });
    window.addEventListener('pageshow', () => { pageUnloading = false; });
    const leave = reason => {
      if (pageUnloading) return;
      dispatchExamGuard({ type: 'left_exam', reason, at: Date.now(), incidentId: createUuid() });
    };
    window.addEventListener('blur', () => leave('blur'));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave('hidden'); });
    document.addEventListener('fullscreenchange', () => {
      const reenter = document.querySelector('#examFullscreenReenter');
      if (reenter) reenter.hidden = !supportsFullscreen() || Boolean(document.fullscreenElement);
      if (!document.fullscreenElement && supportsFullscreen()) leave('fullscreen');
    });
  }

  // examAudioHold và wantWakeLock được shell đọc/ghi từ bên ngoài, nên đi qua accessor.
  return {
    requestFullscreen, requestWakeLock, stopExamConnections, connectExamEvents, renderExamWaitingRoom, dispatchExamGuard, mountExamGuard,
    get audioHold() { return examAudioHold; },
    get wantWakeLock() { return wantWakeLock; },
    set wantWakeLock(value) { wantWakeLock = value; }
  };
}
