// Lưu nháp lên máy chủ (gom 1,5 giây, thử lại khi lỗi tạm thời) và trạng thái lưu (tách nguyên văn từ content-preview.mjs).
// NGUỒN: file .ts này; draft-sync.js do `npm run build` sinh ra (xem text-utils.ts).
import { DRAFT_REJECTED_REASON } from './learning-api.js';

export interface DraftSyncParams {
  query: (selector: string) => HTMLElement | null;
  isLearningMode: boolean;
  key: string;
  state: { submittedAt: number | null };
  learningState: { attemptToken: string, draftRevision: number, definitionHash: string };
  apiRequest: (path: string, body: Record<string, unknown>) => Promise<unknown>;
  buildResponsesPayload: () => unknown;
}

export function createDraftSync({ query, isLearningMode, key, state, learningState, apiRequest, buildResponsesPayload }: DraftSyncParams) {
    let draftDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    // Dải báo lỗi lưu (#28): chỉ đổi theo kết quả gọi /attempts/draft; rỗng thì CSS ẩn.
    const setSaveAlert = (text: string) => {
      const el = query('#demo-save-alert');
      if (el) el.textContent = text;
      query('#demo-save')?.classList.toggle('is-save-failed', Boolean(text));
    };
    // Văn bản trạng thái lưu; phần tử luôn có trong giao diện thi nên không có thì bỏ qua thay vì ném lỗi.
    const setSaveStatus = (text: string) => {
      const el = query('#demo-save');
      if (el) el.textContent = text;
    };
    function queueServerDraft() {
      if (state.submittedAt) setSaveAlert('');
      if (!isLearningMode || !learningState.attemptToken || state.submittedAt) return;
      if (draftDebounceTimer) clearTimeout(draftDebounceTimer);
      draftDebounceTimer = setTimeout(async () => {
        try {
          learningState.draftRevision += 1;
          await apiRequest('/attempts/draft', {
            attemptToken: learningState.attemptToken,
            revision: learningState.draftRevision,
            definitionHash: learningState.definitionHash,
            responses: buildResponsesPayload()
          });
          setSaveStatus('Đã lưu máy chủ');
          setSaveAlert('');
        } catch (error) {
          const err = error as { status?: number, code?: string };
          if (state.submittedAt) return;
          setSaveStatus('Lưu máy chủ thất bại');
          // Chỉ thử lại lỗi tạm thời; 4xx khác (đã nộp, hết giờ, máy khác) không do mạng, thử lại cũng không qua.
          const retryable = !err.status || err.status >= 500 || err.status === 429;
          setSaveAlert(retryable ? 'Chưa lưu được, kiểm tra mạng' : `Chưa lưu được. ${DRAFT_REJECTED_REASON[err.code ?? ''] || ''}Hãy tải lại trang hoặc báo giáo viên.`);
          if (retryable) {
            if (draftDebounceTimer) clearTimeout(draftDebounceTimer);
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
        setSaveStatus(!isLearningMode ? 'Đã lưu trên trình duyệt' : state.submittedAt ? 'Đã nộp bài' : 'Đang lưu…');
      } catch {
        setSaveStatus('Không lưu được bản nháp.');
      }
      queueServerDraft();
    }

  // Luồng nộp bài hủy bản nháp đang chờ vì lệnh nộp đã mang đủ câu trả lời.
  return { queueServerDraft, persist, clearDraftTimer() { if (draftDebounceTimer) clearTimeout(draftDebounceTimer); } };
}
