// Draft, hợp đồng lời gọi Learning API và trạng thái lượt (tách nguyên văn từ content-preview.mjs).
import { optionId } from './text-utils.js?rev=20261113-audio-a';

export const draftKey = form => `izone_content_demo_${form.course}_${form.sourceHash}_v1`;

export function sanitizeDraft(form, raw) {
  const answers = {};
  for (const item of form.groups.flatMap(group => group.items)) {
    const value = raw?.answers?.[item.id];
    if (typeof value !== 'string' || value.length > 12000) continue;
    if (item.options && !item.options.some(option => optionId(option) === value)) continue;
    answers[item.id] = value;
  }
  return { answers, submittedAt: typeof raw?.submittedAt === 'number' && Number.isFinite(raw.submittedAt) ? raw.submittedAt : null };
}

export const DRAFT_REJECTED_REASON = {
  ATTEMPT_ALREADY_SUBMITTED: 'Bài đã được nộp. ',
  ATTEMPT_EXPIRED: 'Đã hết giờ làm bài. ',
  FORM_VERSION_MISMATCH: 'Đề vừa được cập nhật. ',
  STALE_DRAFT: 'Bài đang được mở ở một trang khác. ',
  EXAM_DEVICE_SUPERSEDED: 'Bài đang được mở ở máy khác. ',
  EXAM_NOT_RUNNING: 'Phiên thi chưa bắt đầu hoặc đã kết thúc. '
};

export function learningRequestMethod(path) {
  return path === '/attempts/draft' ? 'PATCH' : 'POST';
}

// Mọi request lượt làm gửi kèm mã thiết bị theo tab; Exam Mode dùng nó để chỉ cho một máy làm bài.
const STRICT_BODY_PATHS = ['/attempts/review', '/attempts/result', '/attempts/audio/checkpoint', '/attempts/audio/resume'];

export function learningRequestBody(path, body, deviceId) {
  // /attempts/review, /attempts/result và hai điểm cuối âm thanh có schema strict, không nhận deviceId.
  return path.startsWith('/attempts/') && !STRICT_BODY_PATHS.includes(path) ? { ...body, deviceId } : body;
}

// 'waiting' → phòng chờ (chưa có đề); 'running' → vào đề và bật Exam Guard; 'off' → luồng thường.
export function examPhase(attempt) {
  if (!attempt?.exam?.enabled || attempt.status !== 'active') return 'off';
  return ['waiting', 'running'].includes(attempt.exam.status) ? attempt.exam.status : 'off';
}

// Banner luật/bộ đếm của chế độ Tự giám sát; rỗng khi bài không bật chế độ này.
export function selfProctoringBannerHtml(selfProctoring) {
  if (!selfProctoring) return '';
  const { level, text } = globalThis.selfProctoringNotice(selfProctoring);
  const colors = { info: '#eff6ff;color:#1e3a8a;border-color:#bfdbfe', danger: '#fef2f2;color:#991b1b;border-color:#fecaca', submitted: '#fffbeb;color:#92400e;border-color:#fde68a' };
  return `<div id="selfProctoringBanner" class="demo-notice ${level}" role="status" aria-live="polite" style="font-weight:600;background:${colors[level]}">${text}</div>`;
}

export function resetLocalAttemptState(state) {
  state.answers = {};
  state.submittedAt = null;
}

