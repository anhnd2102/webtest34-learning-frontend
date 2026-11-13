// NGUỒN: file .ts này; grant-retake.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { grantRetakePath } from '../api/teacher.js';
import type { DashboardRequest, DashboardState, ScopeState } from './dashboard-state.js';
import type { Lifecycle } from './lifecycle.js';

export interface GrantRetakeParams {
  lifecycle: Lifecycle;
  viewState: { currentAttemptDetail?: { student: { studentRef: string, name?: string, discriminator?: string } } | null };
  scopeState: ScopeState;
  examRoom?: HTMLElement | null;
  grantRetakeModal?: HTMLDialogElement | null;
  grantRetakeForm?: HTMLFormElement | null;
  grantRetakeBtn?: HTMLElement | null;
  retakeStudentName?: HTMLElement | null;
  retakeStudentRefInput?: HTMLInputElement | null;
  retakeReasonInput?: HTMLInputElement | HTMLTextAreaElement | null;
  retakeAvailableFromInput?: HTMLInputElement | null;
  retakeExpiresAtInput?: HTMLInputElement | null;
  cancelGrantRetakeBtn?: HTMLElement | null;
  grantRetakeError?: HTMLElement | null;
  state: DashboardState;
  request: DashboardRequest;
  loadExamRoom: () => Promise<unknown>;
  loadAttemptDetail: (classId: string, assignmentId: string, attemptId: string) => Promise<unknown>;
  loadResults: (classId: string, assignmentId: string) => Promise<unknown>;
}

export function createGrantRetake({ lifecycle, viewState, scopeState, examRoom, grantRetakeModal, grantRetakeForm, grantRetakeBtn, retakeStudentName, retakeStudentRefInput, retakeReasonInput, retakeAvailableFromInput, retakeExpiresAtInput, cancelGrantRetakeBtn, grantRetakeError, state, request, loadExamRoom, loadAttemptDetail, loadResults }: GrantRetakeParams) {
  function openGrantRetakeModal({ studentRef, studentName, discriminator }: { studentRef?: string, studentName?: string, discriminator?: string }) {
    const classId = state.classId || scopeState.currentSelectedAssignment?.classId;
    const assignmentId = state.assignmentId || scopeState.currentSelectedAssignment?.id;
    if (!classId || !assignmentId || !studentRef) return;
    if (grantRetakeError) {
      grantRetakeError.hidden = true;
      grantRetakeError.textContent = '';
    }
    if (retakeStudentName) {
      retakeStudentName.textContent = discriminator ? `${studentName} · ${discriminator}` : (studentName || studentRef);
    }
    if (retakeStudentRefInput) {
      retakeStudentRefInput.value = studentRef;
    }
    if (retakeReasonInput) {
      retakeReasonInput.value = '';
    }
    if (retakeAvailableFromInput) {
      retakeAvailableFromInput.value = '';
    }
    if (retakeExpiresAtInput) {
      const nowPlus24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      const localIso = `${nowPlus24h.getFullYear()}-${pad(nowPlus24h.getMonth() + 1)}-${pad(nowPlus24h.getDate())}T${pad(nowPlus24h.getHours())}:${pad(nowPlus24h.getMinutes())}`;
      retakeExpiresAtInput.value = localIso;
    }
    if (typeof grantRetakeModal?.showModal === 'function') {
      grantRetakeModal.showModal();
    } else if (grantRetakeModal) {
      grantRetakeModal.hidden = false;
    }
  }

  if (grantRetakeModal) {
    lifecycle.listen(grantRetakeModal, 'click', (event) => {
      if (event.target === grantRetakeModal) {
        if (typeof grantRetakeModal.close === 'function') grantRetakeModal.close();
        else grantRetakeModal.hidden = true;
      }
    });
  }

  if (grantRetakeBtn) {
    lifecycle.listen(grantRetakeBtn, 'click', () => {
      if (!viewState.currentAttemptDetail) return;
      openGrantRetakeModal({
        studentRef: viewState.currentAttemptDetail.student.studentRef,
        studentName: viewState.currentAttemptDetail.student.name,
        discriminator: viewState.currentAttemptDetail.student.discriminator
      });
    });
  }

  if (cancelGrantRetakeBtn) {
    lifecycle.listen(cancelGrantRetakeBtn, 'click', () => {
      if (typeof grantRetakeModal?.close === 'function') {
        grantRetakeModal.close();
      } else if (grantRetakeModal) {
        grantRetakeModal.hidden = true;
      }
    });
  }

  if (grantRetakeForm) {
    lifecycle.listen(grantRetakeForm, 'submit', async event => {
      event.preventDefault();
      const classId = state.classId || scopeState.currentSelectedAssignment?.classId;
      const assignmentId = state.assignmentId || scopeState.currentSelectedAssignment?.id;
      if (!classId || !assignmentId) return;
      const studentRef = retakeStudentRefInput?.value.trim();
      const reason = retakeReasonInput?.value.trim();
      const availableFromVal = retakeAvailableFromInput?.value;
      const expiresAtVal = retakeExpiresAtInput?.value;

      if (!studentRef || !reason || !expiresAtVal) {
        if (grantRetakeError) {
          grantRetakeError.hidden = false;
          grantRetakeError.textContent = 'Vui lòng điền đầy đủ lý do và hạn chót làm lại.';
        }
        return;
      }

      const availableFrom = availableFromVal ? new Date(availableFromVal).toISOString() : null;
      const expiresAt = new Date(expiresAtVal).toISOString();

      try {
        await request(grantRetakePath(classId, assignmentId, studentRef), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason, availableFrom, expiresAt }),
          errorMessage: 'Không thể cấp quyền làm lại.'
        });
        if (typeof grantRetakeModal?.close === 'function') {
          grantRetakeModal.close();
        } else if (grantRetakeModal) {
          grantRetakeModal.hidden = true;
        }
        alert('Cấp quyền làm lại thành công!');
        if (examRoom && !examRoom.hidden) {
          await loadExamRoom();
        }
        await loadResults(classId, assignmentId);
        if (state.attemptId) {
          await loadAttemptDetail(classId, assignmentId, state.attemptId);
        }
      } catch (err) {
        if (grantRetakeError) {
          grantRetakeError.hidden = false;
          grantRetakeError.textContent = (err as Error).message;
        }
      }
    });
  }

  return { openGrantRetakeModal };
}
