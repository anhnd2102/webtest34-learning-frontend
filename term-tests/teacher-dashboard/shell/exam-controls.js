import { assignmentExamModePath, assignmentSelfProctoringPath } from '../api/teacher.js';
import { examModeLockReason, selfProctoringLockReason, selfProctoringRequestBody, examSwitchRequestBody, examSwitchView, examSwitchErrorView, examSwitchSuccessText } from '../exam-room/presentation.js';

export function createExamControls({ lifecycle, scopeState, examModeToggle, examModeStatusPill, selfProctoringToggle, examModeLockHint, selfProctoringLockHint, selfProctoringLimit, selfProctoringSave, examSwitchControls, examSwitchHint, examSwitchLimit, examSwitchButton, examSwitchMessage, examRoomOpenButton, examRoom, status, state, request, loadAssignments }) {
  function updateExamModeUI(enabled) {
    const isEnabled = Boolean(enabled);
    if (examModeToggle) examModeToggle.checked = isEnabled;
    if (examModeStatusPill) {
      examModeStatusPill.textContent = isEnabled ? 'Đang bật' : 'Đang tắt';
      examModeStatusPill.className = `exam-mode-status-pill ${isEnabled ? 'active' : ''}`;
    }
  }

  function updateSelfProctoringUI(exitLimit, examMode) {
    const enabled = exitLimit !== null && exitLimit !== undefined;
    // Bài đã chuyển từ Exam Mode sang Tự giám sát: server khoá đổi N, nên khoá luôn các ô để không hứa điều server từ chối.
    const lockedAfterExam = !examMode && Boolean(scopeState.currentSelectedAssignment?.examSession);
    if (selfProctoringToggle) { selfProctoringToggle.checked = enabled; selfProctoringToggle.disabled = Boolean(examMode) || lockedAfterExam; }
    if (selfProctoringLimit) { selfProctoringLimit.value = enabled ? String(exitLimit) : ''; selfProctoringLimit.disabled = !enabled || lockedAfterExam; }
    if (selfProctoringSave) selfProctoringSave.disabled = lockedAfterExam || (!enabled && !selfProctoringToggle?.checked);
    const examReason = examModeLockReason({ exitLimit, examMode, examSession: scopeState.currentSelectedAssignment?.examSession });
    if (examModeToggle) examModeToggle.disabled = Boolean(examReason);
    const selfReason = selfProctoringLockReason({ examMode, examSession: scopeState.currentSelectedAssignment?.examSession });
    if (examModeLockHint) { examModeLockHint.textContent = examReason; examModeLockHint.hidden = !examReason; }
    if (selfProctoringLockHint) { selfProctoringLockHint.textContent = selfReason; selfProctoringLockHint.hidden = !selfReason; }
  }

  // Khối "Chuyển sang Tự giám sát": hiện khi phiên thi đã bắt đầu; kết quả cuối cùng luôn đọc lại từ server.
  let examSwitchAssignmentId = '';
  let examSwitchBusy = false;
  function setExamSwitchMessage(text, level = 'info') {
    if (!examSwitchMessage) return;
    examSwitchMessage.textContent = text;
    examSwitchMessage.dataset.level = level;
  }
  function renderExamSwitch(assignment) {
    if (!examSwitchControls) return;
    if (assignment?.assignmentId !== examSwitchAssignmentId) {
      examSwitchAssignmentId = assignment?.assignmentId || '';
      setExamSwitchMessage('');
      if (examSwitchLimit) examSwitchLimit.value = '';
    }
    const view = examSwitchView(assignment, { serverNow: scopeState.currentServerNow });
    examSwitchControls.hidden = !view.visible;
    if (!view.visible) return;
    examSwitchHint.textContent = view.hint;
    examSwitchButton.disabled = examSwitchBusy;
  }
  lifecycle.listen(examSwitchButton, 'click', async () => {
    const target = scopeState.currentSelectedAssignment;
    if (!target || examSwitchBusy) return;
    let body;
    try { body = examSwitchRequestBody(examSwitchLimit.value); }
    catch (error) { setExamSwitchMessage(error.message, 'error'); examSwitchLimit.focus(); return; }
    examSwitchBusy = true;
    examSwitchButton.disabled = true;
    examSwitchLimit.disabled = true;
    setExamSwitchMessage('Đang chuyển chế độ…');
    let payload;
    try {
      payload = await request(assignmentExamModePath(state.classId, target.assignmentId), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
    } catch (error) {
      const view = examSwitchErrorView(error);
      setExamSwitchMessage(view.text, 'error');
      examSwitchButton.textContent = view.retryable ? 'Thử lại' : 'Chuyển sang Tự giám sát';
      examSwitchBusy = false;
      examSwitchLimit.disabled = false;
      examSwitchButton.disabled = false;
      return;
    }
    // Chỉ báo thành công sau khi đọc lại trạng thái từ server; reload cũng thấy đúng như vậy.
    examSwitchBusy = false;
    examSwitchLimit.disabled = false;
    examSwitchButton.textContent = 'Chuyển sang Tự giám sát';
    try {
      await loadAssignments(state.classId, target.assignmentId);
      setExamSwitchMessage(examSwitchSuccessText(payload), 'success');
      status.textContent = 'Đã chuyển sang Tự giám sát.';
    } catch (error) {
      setExamSwitchMessage(`Máy chủ đã nhận yêu cầu chuyển nhưng chưa tải lại được trạng thái mới: ${error.message}. Hãy tải lại trang để xác nhận.`, 'error');
      examSwitchButton.disabled = false;
    }
  });

  lifecycle.listen(selfProctoringToggle, 'change', () => {
    selfProctoringLimit.disabled = !selfProctoringToggle.checked;
    if (selfProctoringToggle.checked) selfProctoringLimit.focus();
    selfProctoringSave.disabled = false;
  });

  lifecycle.listen(selfProctoringSave, 'click', async () => {
    if (!scopeState.currentSelectedAssignment) return;
    selfProctoringSave.disabled = true;
    try {
      const body = selfProctoringRequestBody(selfProctoringToggle.checked, selfProctoringLimit.value);
      const payload = await request(assignmentSelfProctoringPath(state.classId, scopeState.currentSelectedAssignment.assignmentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      scopeState.currentSelectedAssignment.exitLimit = payload.exitLimit;
      status.textContent = payload.exitLimit === null ? 'Đã tắt Tự giám sát.' : `Đã bật Tự giám sát: thoát quá ${payload.exitLimit} lần thì bài tự nộp.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      updateSelfProctoringUI(scopeState.currentSelectedAssignment.exitLimit, scopeState.currentSelectedAssignment.examMode);
    }
  });

  lifecycle.listen(examModeToggle, 'change', async () => {
    if (!scopeState.currentSelectedAssignment) return;
    examModeToggle.disabled = true;
    try {
      const payload = await request(assignmentExamModePath(state.classId, scopeState.currentSelectedAssignment.assignmentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: examModeToggle.checked })
      });
      scopeState.currentSelectedAssignment.examMode = payload.examMode;
      updateExamModeUI(payload.examMode);
      updateSelfProctoringUI(scopeState.currentSelectedAssignment.exitLimit, payload.examMode);
      if (examRoomOpenButton) examRoomOpenButton.hidden = !payload.examMode;
      if (!payload.examMode && examRoom) examRoom.hidden = true;
      status.textContent = payload.examMode ? 'Exam Mode đã bật. Học viên sẽ chờ giáo viên bắt đầu.' : 'Exam Mode đã tắt.';
    } catch (error) {
      updateExamModeUI(scopeState.currentSelectedAssignment.examMode);
      status.textContent = error.message;
    } finally {
      examModeToggle.disabled = Boolean(examModeLockReason(scopeState.currentSelectedAssignment));
    }
  });

  return { updateExamModeUI, updateSelfProctoringUI, renderExamSwitch };
}
