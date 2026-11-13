// Draft, hợp đồng lời gọi Learning API và trạng thái lượt (tách nguyên văn từ content-preview.mjs).
// NGUỒN: file .ts này; learning-api.js do `npm run build` sinh ra (xem text-utils.ts). Import nội bộ viết
// không có `?rev=`, bước build tự thêm rev dùng chung của shell học viên.
import { optionId, type ChoiceOption } from './text-utils.js';

export interface DraftItem {
  id: string;
  options?: ChoiceOption[];
}

export type DraftForm = { course: string, sourceHash: string, groups: { items: DraftItem[] }[] };

export const draftKey = (form: Pick<DraftForm, 'course' | 'sourceHash'>): string => `izone_content_demo_${form.course}_${form.sourceHash}_v1`;

/**
 * Chỉ giữ đáp án hợp lệ (chuỗi không quá 12.000 ký tự, nằm trong danh sách lựa chọn nếu có) từ bản nháp trong trình duyệt.
 */
export function sanitizeDraft(
  form: DraftForm,
  raw: { answers?: Record<string, unknown>, submittedAt?: unknown } | null | undefined
): { answers: Record<string, string>, submittedAt: number | null } {
  const answers: Record<string, string> = {};
  for (const item of form.groups.flatMap(group => group.items)) {
    const value = raw?.answers?.[item.id];
    if (typeof value !== 'string' || value.length > 12000) continue;
    if (item.options && !item.options.some(option => optionId(option) === value)) continue;
    answers[item.id] = value;
  }
  return { answers, submittedAt: typeof raw?.submittedAt === 'number' && Number.isFinite(raw.submittedAt) ? raw.submittedAt : null };
}

// Lý do cho học viên khi /attempts/draft trả lỗi 409 (mã lấy từ learning-service.saveDraft của backend).
export const DRAFT_REJECTED_REASON: Record<string, string> = {
  ATTEMPT_ALREADY_SUBMITTED: 'Bài đã được nộp. ',
  ATTEMPT_EXPIRED: 'Đã hết giờ làm bài. ',
  FORM_VERSION_MISMATCH: 'Đề vừa được cập nhật. ',
  STALE_DRAFT: 'Bài đang được mở ở một trang khác. ',
  EXAM_DEVICE_SUPERSEDED: 'Bài đang được mở ở máy khác. ',
  EXAM_NOT_RUNNING: 'Phiên thi chưa bắt đầu hoặc đã kết thúc. '
};

export function learningRequestMethod(path: string): 'PATCH' | 'POST' {
  return path === '/attempts/draft' ? 'PATCH' : 'POST';
}

const STRICT_BODY_PATHS = ['/attempts/review', '/attempts/result', '/attempts/audio/checkpoint', '/attempts/audio/resume'];

// Mọi request lượt làm gửi kèm mã thiết bị theo tab; Exam Mode dùng nó để chỉ cho một máy làm bài.
export function learningRequestBody(path: string, body: Record<string, unknown>, deviceId: string): Record<string, unknown> {
  // /attempts/review, /attempts/result và hai điểm cuối âm thanh có schema strict, không nhận deviceId.
  return path.startsWith('/attempts/') && !STRICT_BODY_PATHS.includes(path) ? { ...body, deviceId } : body;
}

// 'waiting' → phòng chờ (chưa có đề); 'running' → vào đề và bật Exam Guard; 'off' → luồng thường.
export function examPhase(
  attempt: { status?: string, exam?: { enabled?: boolean, status?: string } | null } | null | undefined
): 'off' | 'waiting' | 'running' {
  if (!attempt?.exam?.enabled || attempt.status !== 'active') return 'off';
  return attempt.exam.status === 'waiting' || attempt.exam.status === 'running' ? attempt.exam.status : 'off';
}

// Banner luật/bộ đếm của chế độ Tự giám sát; rỗng khi bài không bật chế độ này.
export function selfProctoringBannerHtml(
  selfProctoring: { exitLimit: number, exitCount?: number, autoSubmitted?: boolean } | null | undefined
): string {
  if (!selfProctoring) return '';
  const { level, text } = globalThis.selfProctoringNotice(selfProctoring);
  const colors = { info: '#eff6ff;color:#1e3a8a;border-color:#bfdbfe', danger: '#fef2f2;color:#991b1b;border-color:#fecaca', submitted: '#fffbeb;color:#92400e;border-color:#fde68a' };
  return `<div id="selfProctoringBanner" class="demo-notice ${level}" role="status" aria-live="polite" style="font-weight:600;background:${colors[level]}">${text}</div>`;
}

export function resetLocalAttemptState(state: { answers: Record<string, unknown>, submittedAt: number | null }): void {
  state.answers = {};
  state.submittedAt = null;
}
