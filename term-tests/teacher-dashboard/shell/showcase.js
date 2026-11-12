import { ICONS } from '../ui/icons.js';
import { localStudentUrl, formatAssignmentMeta } from './dashboard-state.js';

export function createShowcase({ root, lifecycle, viewState, scopeState, document, classSelect, selectedAssignmentCard, showcaseBadgeClass, showcaseTitle, showcaseBlockBadge, showcasePhaseBadge, showcaseStatusBadge, examSwitchControls, examRoomOpenButton, examRoom, showcaseLinkBar, showcaseStudentUrl, copyShowcaseLinkBtn, openShowcaseLinkBtn, currentLocation, apiBase, stopExamRoomEvents, updateExamModeUI, updateSelfProctoringUI, renderExamSwitch }) {
  if (copyShowcaseLinkBtn) {
    lifecycle.listen(copyShowcaseLinkBtn, 'click', async () => {
      const url = showcaseStudentUrl?.value;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const originalHtml = copyShowcaseLinkBtn.innerHTML;
        copyShowcaseLinkBtn.innerHTML = `${ICONS.check} <span>Đã sao chép!</span>`;
        lifecycle.timeout(() => { copyShowcaseLinkBtn.innerHTML = originalHtml; }, 2000);
      } catch {
        showcaseStudentUrl?.select();
        document.execCommand('copy');
      }
    });
  }

  const showcaseQrBtn = root.querySelector('#showcase-qr-btn');
  if (showcaseQrBtn) {
    lifecycle.listen(showcaseQrBtn, 'click', () => {
      const url = showcaseStudentUrl?.value;
      if (!url) return;
      let modal = root.querySelector('#qr-code-modal');
      if (!modal) {
        modal = document.createElement('dialog');
        modal.id = 'qr-code-modal';
        modal.className = 'qr-modal';
        document.body.append(modal);
      }
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=220x220&margin=10`;
      modal.innerHTML = `
        <div class="qr-modal-content">
          <div class="qr-modal-header">
            <h3>Mã QR phòng làm bài</h3>
            <button type="button" class="btn-close-qr" onclick="this.closest('dialog').close()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="qr-image-wrap">
            <img src="${qrApiUrl}" alt="Mã QR bài thi" width="220" height="220" style="border-radius: 8px;">
          </div>
          <p class="qr-modal-hint">Học viên quét mã để truy cập ngay vào bài kiểm tra.</p>
        </div>
      `;
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      }
    });
  }

  function renderSelectedAssignmentShowcase(assignment) {
    stopExamRoomEvents();
    const timelinePanel = root.querySelector('#exam-room-timeline');
    if (timelinePanel) timelinePanel.hidden = true;
    viewState.currentExamRoom = null;
    const showcaseProgressText = root.querySelector('#showcase-progress-text');
    const showcaseProgressBar = root.querySelector('#showcase-progress-bar');
    if (!selectedAssignmentCard) return;
    if (!assignment) {
      scopeState.currentSelectedAssignment = null;
      selectedAssignmentCard.hidden = true;
      if (showcaseProgressText) showcaseProgressText.textContent = '—';
      if (showcaseProgressBar) showcaseProgressBar.style.width = '0%';
      if (examRoom) examRoom.hidden = true;
      if (showcaseStudentUrl) showcaseStudentUrl.value = '';
      if (openShowcaseLinkBtn) openShowcaseLinkBtn.href = '#';
      if (showcaseLinkBar) showcaseLinkBar.hidden = true;
      if (examRoomOpenButton) examRoomOpenButton.hidden = true;
      if (examSwitchControls) examSwitchControls.hidden = true;
      return;
    }

    selectedAssignmentCard.hidden = false;
    scopeState.currentSelectedAssignment = assignment;
    if (examRoom) examRoom.hidden = true;
    // Phòng thi vẫn mở được sau khi đã chuyển chế độ để xem lại sự cố của phiên cũ.
    if (examRoomOpenButton) examRoomOpenButton.hidden = !(assignment.examMode || assignment.examSession);
    updateExamModeUI(assignment.examMode);
    updateSelfProctoringUI(assignment.exitLimit, assignment.examMode);
    renderExamSwitch(assignment);
    const selectedClassOpt = classSelect?.selectedOptions?.[0];
    const currentClassName = assignment.className || (selectedClassOpt ? selectedClassOpt.text.split(' · ')[0].replace(/^Lớp\s*/, '') : '');

    const meta = formatAssignmentMeta({
      className: currentClassName,
      courseCode: assignment.courseCode,
      phase: assignment.phase,
      title: assignment.title
    });

    if (showcaseBadgeClass) showcaseBadgeClass.textContent = meta.classLabel;
    if (showcaseTitle) showcaseTitle.textContent = assignment.title;
    if (showcaseBlockBadge) showcaseBlockBadge.textContent = meta.courseLabel;
    if (showcasePhaseBadge) {
      if (meta.phaseLabel) {
        showcasePhaseBadge.textContent = meta.phaseLabel;
        showcasePhaseBadge.hidden = false;
      } else {
        showcasePhaseBadge.hidden = true;
      }
    }
    if (showcaseStatusBadge) {
      showcaseStatusBadge.textContent = assignment.status === 'published' ? 'Đang phát hành' : assignment.status;
    }

    const currentApi = typeof apiBase === 'function' ? apiBase() : '';
    const studentUrl = localStudentUrl(assignment.studentUrl, currentLocation, currentApi);
    if (studentUrl) {
      if (showcaseStudentUrl) showcaseStudentUrl.value = studentUrl;
      if (openShowcaseLinkBtn) openShowcaseLinkBtn.href = studentUrl;
      if (showcaseLinkBar) showcaseLinkBar.hidden = false;
    } else {
      if (showcaseLinkBar) showcaseLinkBar.hidden = true;
    }
  }

  return { renderSelectedAssignmentShowcase };
}
