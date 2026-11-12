export function examModeLockReason({ exitLimit, examMode, examSession } = {}) {
  // Server từ chối đổi Exam Mode khi phiên không còn ở trạng thái chờ (EXAM_SESSION_ALREADY_STARTED).
  if (examMode && examSession && examSession.status !== 'waiting') return 'Phiên thi đã bắt đầu nên không tắt được Exam Mode. Dùng "Chuyển sang Tự giám sát" sau khi hết hạn nộp.';
  return exitLimit === null || exitLimit === undefined ? '' : 'Bài đang bật Tự giám sát nên không bật được Exam Mode. Tắt Tự giám sát trước; nếu đã có học viên bắt đầu làm thì không tắt được nữa.';
}

export function selfProctoringLockReason({ examMode, examSession } = {}) {
  if (examMode) return 'Bài đang bật Exam Mode: tắt Exam Mode trước khi bật Tự giám sát.';
  if (examSession) return 'Bài đã chuyển từ Exam Mode sang Tự giám sát nên không đổi lại được; giới hạn thoát cố định.';
  return '';
}

export function selfProctoringRequestBody(enabled, rawLimit) {
  if (!enabled) return { exitLimit: null };
  const text = String(rawLimit ?? '').trim();
  if (!/^\d+$/.test(text)) throw new Error('Giới hạn thoát phải là số nguyên ≥ 0.');
  return { exitLimit: Number(text) };
}

export function examSwitchRequestBody(rawLimit) {
  const text = String(rawLimit ?? '').trim();
  if (!/^\d+$/.test(text)) throw new Error('Giới hạn thoát phải là số nguyên ≥ 0.');
  return { enabled: false, switchTo: 'self-proctoring', exitLimit: Number(text) };
}

export function formatExamDeadline(iso, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return 'chưa xác định';
  const text = new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone
  }).format(date);
  return `${text} (giờ Việt Nam, UTC+7)`;
}

export function examSwitchView(assignment, { serverNow = null } = {}) {
  const session = assignment?.examSession;
  if (!assignment?.examMode || !session || !['running', 'ended'].includes(session.status)) return { visible: false };
  const deadline = formatExamDeadline(session.deadlineAt);
  const deadlineMs = Date.parse(session.deadlineAt);
  const serverNowMs = Date.parse(serverNow);
  let hint;
  if (session.status === 'ended') hint = 'Phiên thi đã kết thúc. Có thể chuyển sang Tự giám sát.';
  else if (!Number.isFinite(deadlineMs)) hint = 'Chưa xác định được hạn nộp của phiên thi; máy chủ sẽ từ chối chuyển cho đến khi có dữ liệu hợp lệ.';
  else if (Number.isFinite(serverNowMs) && serverNowMs >= deadlineMs) hint = `Phiên thi đã quá hạn nộp (${deadline}) theo đồng hồ máy chủ. Bấm chuyển để máy chủ chốt các bài còn dở và đổi chế độ.`;
  else hint = `Phiên thi đang diễn ra, hạn nộp ${deadline}. Chỉ chuyển được sau thời điểm này; máy chủ sẽ kiểm tra lại khi bạn bấm.`;
  return { visible: true, status: session.status, deadline, hint };
}

export function examSwitchErrorView(error) {
  const details = error?.details || {};
  switch (error?.code) {
    case 'EXAM_SESSION_STILL_RUNNING':
      return { text: `Phiên thi chưa kết thúc. Hạn nộp: ${formatExamDeadline(details.deadlineAt)}. Hãy chuyển sau thời điểm này.`, retryable: false };
    case 'EXAM_SETTLEMENT_PENDING':
      return { text: 'Hệ thống chưa chốt xong bài của phiên thi cũ nên chưa đổi chế độ. Chưa có gì bị thay đổi, hãy bấm Thử lại sau ít phút.', retryable: true };
    case 'INVALID_EXAM_DEADLINE':
    case 'INVALID_EXAM_SESSION':
      return { text: 'Không xác định được hạn nộp của phiên thi nên chưa thể chuyển. Hãy báo quản trị viên kiểm tra dữ liệu phiên thi.', retryable: false };
    case 'EXAM_SESSION_NOT_STARTED':
      return { text: 'Phiên thi chưa bắt đầu nên chưa thể chuyển sang Tự giám sát.', retryable: false };
    case 'SELF_PROCTORING_LOCKED':
      return { text: 'Bài đã chuyển sang Tự giám sát với giới hạn thoát khác, không thể đổi lại.', retryable: false };
    default:
      return { text: error?.message || 'Không chuyển được chế độ. Chưa có gì bị thay đổi, hãy thử lại.', retryable: true };
  }
}

export function examSwitchSuccessText(payload) {
  const limit = payload?.exitLimit;
  const lead = payload?.switched === false ? 'Bài đã ở Tự giám sát' : 'Đã chuyển sang Tự giám sát';
  return `${lead}: thoát quá ${limit} lần thì bài tự nộp. Chế độ mới chỉ áp dụng cho lượt làm bắt đầu từ bây giờ; điểm, lịch sử phiên thi và quyền làm lại được giữ nguyên, học viên đã nộp vẫn cần được cấp làm lại.`;
}

export function incidentCellText(student) {
  if (!student.attemptId) return '—';
  const count = student.incidentCount ?? 0;
  if (student.exitLimit === null || student.exitLimit === undefined) return String(count);
  return `${count}/${student.exitLimit}${student.autoSubmitted ? ' · Tự nộp do vượt giới hạn' : ''}`;
}

export function formatExamRoomStatus(status) {
  return ({ not_entered: 'Chưa vào', entered: 'Đã vào', ready: 'Sẵn sàng', in_progress: 'Đang làm', submitted: 'Đã nộp' })[status] || 'Chưa vào';
}

export function formatExamReadyCount({ readyCount = 0, totalCount = 0 } = {}) {
  return `${readyCount}/${totalCount} sẵn sàng`;
}

export function applyExamProgress(room, { studentRef, progress } = {}) {
  if (!room || !Array.isArray(room.students) || typeof studentRef !== 'string'
    || !Number.isInteger(progress?.answered) || !Number.isInteger(progress?.total)
    || progress.answered < 0 || progress.total < progress.answered) return room;
  const index = room.students.findIndex(student => student.studentRef === studentRef);
  if (index < 0) return room;
  return {
    ...room,
    students: room.students.map((student, studentIndex) =>
      studentIndex === index ? { ...student, progress: { answered: progress.answered, total: progress.total } } : student)
  };
}

export function applyExamIncident(room, { studentRef, incident, incidentCount } = {}) {
  const index = room?.students?.findIndex(student => student.studentRef === studentRef) ?? -1;
  if (index < 0 || !incident?.incidentId) return room;
  return {
    ...room,
    students: room.students.map((student, studentIndex) => {
      if (studentIndex !== index) return student;
      const others = (student.openIncidents || []).filter(item => item.incidentId !== incident.incidentId);
      return {
        ...student,
        incidentCount: Number.isInteger(incidentCount) ? incidentCount : student.incidentCount,
        openIncidents: incident.endedAt ? others : [incident]
      };
    })
  };
}

export function formatExamProgress(progress) {
  if (!Number.isInteger(progress?.answered) || !Number.isInteger(progress?.total)
    || progress.answered < 0 || progress.total < progress.answered) return '—';
  return `${progress.answered}/${progress.total}`;
}

export function applyExamConnection(room, { studentRef, status } = {}) {
  if (!room || !Array.isArray(room.students) || typeof studentRef !== 'string'
    || !['connected', 'disconnected'].includes(status)) return room;
  const index = room.students.findIndex(student => student.studentRef === studentRef);
  if (index < 0) return room;
  return {
    ...room,
    students: room.students.map((student, studentIndex) =>
      studentIndex === index ? { ...student, connectionStatus: status } : student)
  };
}

export function formatExamConnectionStatus(status) {
  return ({ connected: 'Đang kết nối', disconnected: 'Mất kết nối' })[status] || '—';
}

export function formatExamDevice({ device, fullscreenUnsupported } = {}) {
  const parts = device ? [
    ({ mobile: 'Điện thoại', tablet: 'Máy tính bảng', desktop: 'Máy tính' })[device.type] || 'Thiết bị khác',
    ...[device.os, device.browser].filter(value => value && value !== 'other')
  ] : [];
  if (fullscreenUnsupported === true) parts.push('Không hỗ trợ toàn màn hình');
  return parts.join(' · ') || '—';
}
