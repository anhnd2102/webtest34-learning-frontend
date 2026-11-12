// Lưu nháp lên máy chủ (gom 1,5 giây, thử lại khi lỗi tạm thời) và trạng thái lưu (tách nguyên văn từ content-preview.mjs).
import { DRAFT_REJECTED_REASON } from './learning-api.js?rev=20261113-audio-a';

export function createDraftSync({ query, isLearningMode, key, state, learningState, apiRequest, buildResponsesPayload }) {
    let draftDebounceTimer = null;
    // Dải báo lỗi lưu (#28): chỉ đổi theo kết quả gọi /attempts/draft; rỗng thì CSS ẩn.
    const setSaveAlert = text => {
      const el = query('#demo-save-alert');
      if (el) el.textContent = text;
      query('#demo-save')?.classList.toggle('is-save-failed', Boolean(text));
    };
    function queueServerDraft() {
      if (state.submittedAt) setSaveAlert('');
      if (!isLearningMode || !learningState.attemptToken || state.submittedAt) return;
      clearTimeout(draftDebounceTimer);
      draftDebounceTimer = setTimeout(async () => {
        try {
          learningState.draftRevision += 1;
          await apiRequest('/attempts/draft', {
            attemptToken: learningState.attemptToken,
            revision: learningState.draftRevision,
            definitionHash: learningState.definitionHash,
            responses: buildResponsesPayload()
          });
          query('#demo-save').textContent = 'Đã lưu máy chủ';
          setSaveAlert('');
        } catch (err) {
          if (state.submittedAt) return;
          query('#demo-save').textContent = 'Lưu máy chủ thất bại';
          // Chỉ thử lại lỗi tạm thời; 4xx khác (đã nộp, hết giờ, máy khác) không do mạng, thử lại cũng không qua.
          const retryable = !err.status || err.status >= 500 || err.status === 429;
          setSaveAlert(retryable ? 'Chưa lưu được, kiểm tra mạng' : `Chưa lưu được. ${DRAFT_REJECTED_REASON[err.code] || ''}Hãy tải lại trang hoặc báo giáo viên.`);
          if (retryable) {
            clearTimeout(draftDebounceTimer);
            draftDebounceTimer = setTimeout(queueServerDraft, 15000);
          }
        }
      }, 1500);
    }
    window.addEventListener('online', () => {
      if (query('#demo-save')?.classList.contains('is-save-failed')) queueServerDraft();
    });

    function persist() {
      try {
        localStorage.setItem(key, JSON.stringify(state));
        // Sau khi nộp không còn gửi nháp (queueServerDraft thoát sớm), nên không ghi "Đang lưu…".
        query('#demo-save').textContent = !isLearningMode ? 'Đã lưu trên trình duyệt' : state.submittedAt ? 'Đã nộp bài' : 'Đang lưu…';
      } catch {
        query('#demo-save').textContent = 'Không lưu được bản nháp.';
      }
      queueServerDraft();
    }

  // Luồng nộp bài hủy bản nháp đang chờ vì lệnh nộp đã mang đủ câu trả lời.
  return { queueServerDraft, persist, clearDraftTimer() { clearTimeout(draftDebounceTimer); } };
}
