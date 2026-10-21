// Mô hình hiển thị cho "Đồng bộ điểm Portal". Chỉ ánh xạ nhãn tiếng Việt từ phản hồi backend;
// mọi quy tắc nghiệp vụ (đủ điều kiện, quy đổi điểm, khớp học viên) nằm ở backend.
const enc = encodeURIComponent;
const assignmentBase = (classId, assignmentId) => `/api/teacher/classes/${enc(classId)}/assignments/${enc(assignmentId)}`;

export const portalTestsPath = classId => `/api/teacher/classes/${enc(classId)}/portal-tests`;
export const portalLinkPath = (classId, assignmentId) => `${assignmentBase(classId, assignmentId)}/portal-link`;
export const portalSyncPreviewPath = (classId, assignmentId) => `${assignmentBase(classId, assignmentId)}/portal-sync/preview`;
export const portalSyncPath = (classId, assignmentId) => `${assignmentBase(classId, assignmentId)}/portal-sync`;
export const portalSyncStatusPath = (classId, assignmentId) => `${assignmentBase(classId, assignmentId)}/portal-sync/status`;

const ERROR_TEXT = {
  PORTAL_SYNC_DISABLED: 'Tính năng đồng bộ điểm Portal chưa được bật.',
  PORTAL_SYNC_WRITE_DISABLED: 'Đồng bộ điểm Portal đang ở chế độ chỉ xem trước, chưa được ghi điểm.',
  PORTAL_PREVIEW_STALE: 'Dữ liệu đã thay đổi từ lúc xem trước. Hãy xem trước lại.',
  PORTAL_AUTH_FAILED: 'Đăng nhập Portal thất bại. Hãy báo quản trị hệ thống.',
  PORTAL_NOT_CONFIGURED: 'Chưa cấu hình kết nối Portal.'
};

export function portalSyncErrorView(error = {}) {
  return {
    disabled: error.code === 'PORTAL_SYNC_DISABLED',
    message: ERROR_TEXT[error.code] || error.message || 'Không thực hiện được đồng bộ điểm Portal.'
  };
}

const PREVIEW_STATUS = {
  ready: ['Điền được', 'ready'], matched: ['Đã khớp', 'ok'], mismatch: ['Điểm lệch', 'warn'],
  changed_after_sync: ['Đã đổi sau đồng bộ', 'warn'], blocked: ['Bị chặn', 'blocked']
};
const BLOCK_REASON = {
  not_submitted: 'Chưa nộp bài', grading_incomplete: 'Chấm chưa xong', score_not_final: 'Điểm chưa chung cuộc',
  not_in_portal_class: 'Không có trong lớp Portal', link_missing: 'Chưa gắn bài test Portal',
  portal_test_missing: 'Bài test Portal không còn trong lớp', score_out_of_range: 'Điểm ngoài thang',
  retake_pending: 'Đang chờ làm lại', student_not_in_preview: 'Không có trong bản xem trước'
};
const num = value => (value === null || value === undefined ? null : Number(value));

export function previewRowView(row) {
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
    portalText: row.status === 'blocked' && !hasScore ? '—' : (num(row.portalScore) === null ? 'Trống' : String(num(row.portalScore)))
  };
}

export const selectableRefs = rows => rows.filter(r => r.status === 'ready').map(r => r.studentRef);

// Chỉ vân tay, học viên đã chọn và xác nhận tường minh; không bao giờ gửi điểm hay mã Portal.
export const syncRequestBody = (fingerprint, studentRefs) => ({ fingerprint, studentRefs: [...studentRefs], confirm: true });

export const syncConfirmMessage = count => `Ghi điểm của ${count} học viên sang Portal? Chỉ các ô còn trống được điền; điểm sẽ được đọc lại để xác nhận.`;

const SYNC_STATUS = {
  synced: ['Đã đồng bộ', 'ok'], skipped: ['Đã khớp, bỏ qua', 'ok'], mismatch: ['Điểm lệch', 'warn'],
  failed: ['Lỗi', 'blocked'], blocked: ['Bị chặn', 'blocked'], not_attempted: ['Chưa thử (đã dừng)', 'warn'],
  pending: ['Đang chờ', 'warn'], processing: ['Đang xử lý', 'warn']
};
const SYNC_ERROR = {
  PORTAL_READBACK_MISMATCH: 'Đọc lại Portal không thấy đúng điểm',
  PORTAL_SCORE_DIFFERENT: 'Portal đã có điểm khác',
  CHANGED_AFTER_SYNC: 'Điểm Webtest đã đổi sau lần đồng bộ trước',
  PORTAL_REJECTED: 'Portal từ chối ghi điểm',
  PORTAL_AUTH_FAILED: 'Đăng nhập Portal thất bại',
  PORTAL_UNAVAILABLE: 'Portal không phản hồi',
  SYNC_IN_PROGRESS: 'Đang có lần đồng bộ khác chạy',
  SYNC_STALE: 'Lần đồng bộ trước bị treo',
  SYNC_INTERNAL_ERROR: 'Lỗi nội bộ'
};

// `confirmed` chỉ đúng khi backend báo `synced` (đã đọc lại Portal thấy đúng điểm).
export function syncResultView(row) {
  const [statusLabel, tone] = SYNC_STATUS[row.status] || [row.status, 'warn'];
  const reason = row.reason ? (BLOCK_REASON[row.reason] || row.reason) : '';
  const errorText = row.errorCode ? (SYNC_ERROR[row.errorCode] || row.errorCode) : '';
  return {
    studentRef: row.studentRef, statusLabel, tone,
    confirmed: row.status === 'synced',
    retryable: row.status === 'failed',
    errorText: errorText || reason
  };
}

export const retryRefs = rows => rows.filter(r => r.status === 'failed' || r.status === 'not_attempted').map(r => r.studentRef);

export const linkedPortalTest = (tests, assignmentId) => (tests || []).find(t => t.linkedAssignmentId === assignmentId) || null;

export function syncSummaryText(summary = {}) {
  const parts = [`Đã đồng bộ ${summary.synced || 0}`];
  for (const [key, label] of [['skipped', 'Bỏ qua'], ['mismatch', 'Điểm lệch'], ['failed', 'Lỗi'], ['blocked', 'Bị chặn'], ['not_attempted', 'Chưa thử']]) {
    if (summary[key]) parts.push(`${label} ${summary[key]}`);
  }
  return parts.join(' · ');
}
