// Draft, hợp đồng lời gọi Learning API và trạng thái lượt (tách nguyên văn từ content-preview.mjs).
import { optionId } from './text-utils.js?rev=20261113-submit-a';

/**
 * @typedef {Object} DraftItem
 * @property {string} id
 * @property {import('./text-utils.js').ChoiceOption[]} [options]
 */

/** @typedef {{ course: string, sourceHash: string, groups: { items: DraftItem[] }[] }} DraftForm */

/**
 * @param {Pick<DraftForm, 'course' | 'sourceHash'>} form
 * @returns {string}
 */
export const draftKey = form => `izone_content_demo_${form.course}_${form.sourceHash}_v1`;

/**
 * Chỉ giữ đáp án hợp lệ (chuỗi không quá 12.000 ký tự, nằm trong danh sách lựa chọn nếu có) từ bản nháp trong trình duyệt.
 * @param {DraftForm} form
 * @param {{ answers?: Record<string, unknown>, submittedAt?: unknown } | null | undefined} raw
 * @returns {{ answers: Record<string, string>, submittedAt: number | null }}
 */
export function sanitizeDraft(form, raw) {
  /** @type {Record<string, string>} */
  const answers = {};
  for (const item of form.groups.flatMap(group => group.items)) {
    const value = raw?.answers?.[item.id];
    if (typeof value !== 'string' || value.length > 12000) continue;
    if (item.options && !item.options.some(option => optionId(option) === value)) continue;
    answers[item.id] = value;
  }
  return { answers, submittedAt: typeof raw?.submittedAt === 'number' && Number.isFinite(raw.submittedAt) ? raw.submittedAt : null };
}

// Lý do cho học viên khi /attempts/draft trả lỗi 409 (mã lấy từ learning-service.saveDraft của backend).
/** @type {Record<string, string>} */
export const DRAFT_REJECTED_REASON = {
  ATTEMPT_ALREADY_SUBMITTED: 'Bài đã được nộp. ',
  ATTEMPT_EXPIRED: 'Đã hết giờ làm bài. ',
  FORM_VERSION_MISMATCH: 'Đề vừa được cập nhật. ',
  STALE_DRAFT: 'Bài đang được mở ở một trang khác. ',
  EXAM_DEVICE_SUPERSEDED: 'Bài đang được mở ở máy khác. ',
  EXAM_NOT_RUNNING: 'Phiên thi chưa bắt đầu hoặc đã kết thúc. '
};

/**
 * @param {string} path
 * @returns {'PATCH' | 'POST'}
 */
export function learningRequestMethod(path) {
  return path === '/attempts/draft' ? 'PATCH' : 'POST';
}

const STRICT_BODY_PATHS = ['/attempts/review', '/attempts/result', '/attempts/audio/checkpoint', '/attempts/audio/resume'];

// Mọi request lượt làm gửi kèm mã thiết bị theo tab; Exam Mode dùng nó để chỉ cho một máy làm bài.
/**
 * @param {string} path
 * @param {Record<string, unknown>} body
 * @param {string} deviceId
 * @returns {Record<string, unknown>}
 */
export function learningRequestBody(path, body, deviceId) {
  // /attempts/review, /attempts/result và hai điểm cuối âm thanh có schema strict, không nhận deviceId.
  return path.startsWith('/attempts/') && !STRICT_BODY_PATHS.includes(path) ? { ...body, deviceId } : body;
}

// 'waiting' → phòng chờ (chưa có đề); 'running' → vào đề và bật Exam Guard; 'off' → luồng thường.
/**
 * @param {{ status?: string, exam?: { enabled?: boolean, status?: string } | null } | null | undefined} attempt
 * @returns {'off' | 'waiting' | 'running'}
 */
export function examPhase(attempt) {
  if (!attempt?.exam?.enabled || attempt.status !== 'active') return 'off';
  return attempt.exam.status === 'waiting' || attempt.exam.status === 'running' ? attempt.exam.status : 'off';
}

// Banner luật/bộ đếm của chế độ Tự giám sát; rỗng khi bài không bật chế độ này.
/**
 * @param {{ exitLimit: number, exitCount?: number, autoSubmitted?: boolean } | null | undefined} selfProctoring
 * @returns {string}
 */
export function selfProctoringBannerHtml(selfProctoring) {
  if (!selfProctoring) return '';
  const { level, text } = globalThis.selfProctoringNotice(selfProctoring);
  const colors = { info: '#eff6ff;color:#1e3a8a;border-color:#bfdbfe', danger: '#fef2f2;color:#991b1b;border-color:#fecaca', submitted: '#fffbeb;color:#92400e;border-color:#fde68a' };
  return `<div id="selfProctoringBanner" class="demo-notice ${level}" role="status" aria-live="polite" style="font-weight:600;background:${colors[level]}">${text}</div>`;
}

/**
 * @param {{ answers: Record<string, unknown>, submittedAt: number | null }} state
 * @returns {void}
 */
export function resetLocalAttemptState(state) {
  state.answers = {};
  state.submittedAt = null;
}

