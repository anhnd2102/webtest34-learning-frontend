// NGUỒN: file .ts này; portal-sync-view.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
// Mô hình hiển thị cho "Đồng bộ điểm Portal". Chỉ ánh xạ nhãn tiếng Việt từ phản hồi backend;
// mọi quy tắc nghiệp vụ (đủ điều kiện, quy đổi điểm, khớp học viên) nằm ở backend.
const enc = encodeURIComponent;
const assignmentBase = (classId: string, assignmentId: string) => `/api/teacher/classes/${enc(classId)}/assignments/${enc(assignmentId)}`;

export const portalTestsPath = (classId: string) => `/api/teacher/classes/${enc(classId)}/portal-tests`;
export const portalLinkPath = (classId: string, assignmentId: string) => `${assignmentBase(classId, assignmentId)}/portal-link`;
export const portalSyncPreviewPath = (classId: string, assignmentId: string) => `${assignmentBase(classId, assignmentId)}/portal-sync/preview`;
export const portalSyncPath = (classId: string, assignmentId: string) => `${assignmentBase(classId, assignmentId)}/portal-sync`;
export const portalSyncStatusPath = (classId: string, assignmentId: string) => `${assignmentBase(classId, assignmentId)}/portal-sync/status`;

const ERROR_TEXT: Record<string, string> = {
  PORTAL_SYNC_DISABLED: 'Tính năng đồng bộ điểm Portal chưa được bật.',
  PORTAL_SYNC_WRITE_DISABLED: 'Đồng bộ điểm Portal đang ở chế độ chỉ xem trước, chưa được ghi điểm.',
  PORTAL_PREVIEW_STALE: 'Dữ liệu đã thay đổi từ lúc xem trước. Hãy xem trước lại.',
  PORTAL_AUTH_FAILED: 'Đăng nhập Portal thất bại. Hãy báo quản trị hệ thống.',
  PORTAL_LINK_CHANGED: 'Liên kết bài test Portal đã bị người khác thay đổi. Hãy xem trước lại.',
  PORTAL_NOT_CONFIGURED: 'Chưa cấu hình kết nối Portal.'
};

export function portalSyncErrorView(error: { code?: string, message?: string } = {}) {
  return {
    disabled: error.code === 'PORTAL_SYNC_DISABLED',
    message: ERROR_TEXT[error.code ?? ''] || error.message || 'Không thực hiện được đồng bộ điểm Portal.'
  };
}

const PREVIEW_STATUS: Record<string, [string, string]> = {
  ready: ['Điền được', 'ready'], matched: ['Đã khớp', 'ok'], mismatch: ['Điểm lệch', 'warn'],
  changed_after_sync: ['Đã đổi sau đồng bộ', 'warn'], blocked: ['Bị chặn', 'blocked']
};
const BLOCK_REASON: Record<string, string> = {
  not_submitted: 'Chưa nộp bài', grading_incomplete: 'Chấm chưa xong', score_not_final: 'Điểm chưa chung cuộc',
  not_in_portal_class: 'Không có trong lớp Portal', link_missing: 'Chưa gắn bài test Portal',
  portal_test_missing: 'Bài test Portal không còn trong lớp', score_out_of_range: 'Điểm ngoài thang',
  retake_pending: 'Đang chờ làm lại', student_not_in_preview: 'Không có trong bản xem trước'
};
// Lý do chặn nghĩa là không có ô điểm Portal để so sánh.
const NO_PORTAL_CELL = new Set(['not_in_portal_class', 'portal_test_missing', 'link_missing']);
const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));

export interface PreviewRow {
  studentRef: string;
  name?: string;
  status: string;
  reason?: string;
  webtestEarned?: number | null;
  webtestMaximum?: number | null;
  convertedScore?: number | null;
  portalScore?: number | null;
}

export function previewRowView(row: PreviewRow) {
  const [statusLabel, tone] = PREVIEW_STATUS[row.status] || [row.status, 'blocked'];
  const earned = num(row.webtestEarned);
  const hasScore = earned !== null && num(row.webtestMaximum) !== null;
  const converted = num(row.convertedScore);
  return {
    studentRef: row.studentRef,
    name: row.name || 'Học viên',
    statusLabel, tone,
    selectable: row.status === 'ready',
    reasonText: row.reason ? (BLOCK_REASON[row.reason] || row.reason) : '',
    webtestText: hasScore ? `${earned}/${num(row.webtestMaximum)}${converted === null ? '' : ` → ${converted}`}` : '—',
    portalText: (row.status === 'blocked' && !hasScore) || NO_PORTAL_CELL.has(row.reason ?? '') ? '—' : (num(row.portalScore) === null ? 'Trống' : String(num(row.portalScore)))
  };
}

export const selectableRefs = (rows: { status: string, studentRef: string }[]) => rows.filter(r => r.status === 'ready').map(r => r.studentRef);

// Chỉ vân tay, học viên đã chọn và xác nhận tường minh; không bao giờ gửi điểm hay mã Portal.
export const syncRequestBody = (fingerprint: string, studentRefs: Iterable<string>) => ({ fingerprint, studentRefs: [...studentRefs], confirm: true });

export const syncConfirmMessage = (count: number) => `Ghi điểm của ${count} học viên sang Portal? Chỉ các ô còn trống được điền; điểm sẽ được đọc lại để xác nhận.`;

const SYNC_STATUS: Record<string, [string, string]> = {
  synced: ['Đã đồng bộ', 'ok'], skipped: ['Đã khớp, bỏ qua', 'ok'], mismatch: ['Điểm lệch', 'warn'],
  failed: ['Lỗi', 'blocked'], blocked: ['Bị chặn', 'blocked'], not_attempted: ['Chưa thử (đã dừng)', 'warn'],
  pending: ['Đang chờ', 'warn'], processing: ['Đang xử lý', 'warn']
};
const SYNC_ERROR: Record<string, string> = {
  PORTAL_READBACK_MISMATCH: 'Đọc lại Portal không thấy đúng điểm',
  PORTAL_SCORE_DIFFERENT: 'Portal đã có điểm khác',
  CHANGED_AFTER_SYNC: 'Điểm Webtest đã đổi sau lần đồng bộ trước',
  PORTAL_REJECTED: 'Portal từ chối ghi điểm',
  PORTAL_AUTH_FAILED: 'Đăng nhập Portal thất bại',
  PORTAL_UNAVAILABLE: 'Portal không phản hồi',
  SYNC_IN_PROGRESS: 'Đang có lần đồng bộ khác chạy',
  SYNC_STALE: 'Lần đồng bộ trước bị treo',
  SYNC_INTERNAL_ERROR: 'Lỗi nội bộ khi đồng bộ, hãy thử lại sau'
};

const RETRYABLE = new Set(['failed', 'not_attempted']);

// `confirmed` chỉ đúng khi backend báo `synced` (đã đọc lại Portal thấy đúng điểm).
export function syncResultView(row: { studentRef: string, status: string, reason?: string, errorCode?: string }) {
  const [statusLabel, tone] = SYNC_STATUS[row.status] || [row.status, 'warn'];
  const reason = row.reason ? (BLOCK_REASON[row.reason] || row.reason) : '';
  const errorText = row.errorCode ? (SYNC_ERROR[row.errorCode] || row.errorCode) : '';
  return {
    studentRef: row.studentRef, statusLabel, tone,
    confirmed: row.status === 'synced',
    retryable: RETRYABLE.has(row.status),
    errorText: errorText || reason
  };
}

export const retryRefs = (rows: { status: string, studentRef: string }[]) => rows.filter(r => RETRYABLE.has(r.status)).map(r => r.studentRef);

export const selectAllState = (selectable: number, picked: number) => ({
  checked: selectable > 0 && picked === selectable,
  indeterminate: picked > 0 && picked < selectable,
  disabled: selectable === 0
});

// Vân tay cũ hoặc không nhận được phản hồi (mất mạng, hết thời gian): kết quả ghi không rõ, phải xem trước lại.
export const shouldReloadPreviewAfterSyncError = (error?: { code?: string, status?: number } | null) => error?.code === 'PORTAL_PREVIEW_STALE' || error?.status === undefined;

export const scaleWarningText = (w?: { linkedMaxScore: number, currentMaxScore: number } | null) => (w ? `Thang điểm Portal đã đổi từ ${w.linkedMaxScore} thành ${w.currentMaxScore} kể từ lúc gắn bài test; điểm vẫn được quy đổi theo thang cũ (${w.linkedMaxScore}). Hãy gỡ gắn và gắn lại nếu cần dùng thang mới.` : '');

export const linkedPortalTest = <T extends { linkedAssignmentId?: string | null }>(tests: T[] | null | undefined, assignmentId: string) => (tests || []).find(t => t.linkedAssignmentId === assignmentId) || null;

export function syncSummaryText(summary: Record<string, number | undefined> = {}) {
  const parts = [`Đã đồng bộ ${summary.synced || 0}`];
  for (const [key, label] of [['skipped', 'Bỏ qua'], ['mismatch', 'Điểm lệch'], ['failed', 'Lỗi'], ['blocked', 'Bị chặn'], ['not_attempted', 'Chưa thử'], ['pending', 'Đang chờ'], ['processing', 'Đang xử lý'], ['unresolved', 'Chưa xác định']]) {
    if (summary[key]) parts.push(`${label} ${summary[key]}`);
  }
  return parts.join(' · ');
}
