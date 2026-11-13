// NGUỒN: file .ts này; exam-room-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { assignmentExamRoomPath, assignmentExamEventsPath, assignmentExamStartPath, assignmentExamExtendPath, attemptDetailPath } from '../api/teacher.js';
import { formatIncidentTimeline } from '../results/presentation.js';
import { applyExamProgress, applyExamIncident, applyExamConnection } from '../exam-room/presentation.js';
import { createExamRoomSession } from './exam-room-session.js';
import type { AuthState, DashboardRequest, DashboardState, ScopeState } from './dashboard-state.js';
import type { Lifecycle } from './lifecycle.js';
import type { QueryHandle } from './query-coordinator.js';
import type { ExamRoom } from '../exam-room/presentation.js';
import type { IncidentRecord } from '../results/presentation.js';

type RoomSession = ReturnType<typeof createExamRoomSession>;

export interface ExamRoomActionsParams {
  root: ParentNode;
  lifecycle: Lifecycle;
  queryCoordinator: { begin(scopeKey: string): QueryHandle | null, cancel(scopeKey: string): void };
  viewState: { currentExamRoom: ExamRoom | null | undefined };
  authState: AuthState;
  scopeState: ScopeState;
  examRoomState: { examRoomSession: RoomSession | null, examRoomReturnToResults: boolean };
  document: Document;
  examRoomOpenButton: HTMLElement | null;
  examRoom?: HTMLElement | null;
  examRoomMessage?: HTMLElement | null;
  examRoomStartButton: HTMLButtonElement;
  examRoomExtendButton: HTMLButtonElement;
  examRoomExtensionMinutes?: HTMLInputElement | null;
  examRoomRefreshButton: HTMLElement | null;
  examRoomCloseButton: HTMLElement | null;
  results?: HTMLElement | null;
  state: DashboardState;
  apiBase: () => string;
  request: DashboardRequest;
  renderExamRoom: (room: ExamRoom) => void;
  handleLogout: () => void;
}

export function createExamRoomActions({ root, lifecycle, queryCoordinator, viewState, authState, scopeState, examRoomState, document, examRoomOpenButton, examRoom, examRoomMessage, examRoomStartButton, examRoomExtendButton, examRoomExtensionMinutes, examRoomRefreshButton, examRoomCloseButton, results, state, apiBase, request, renderExamRoom, handleLogout }: ExamRoomActionsParams) {
  function fillIncidentTimeline(container: HTMLElement, rawIncidents?: IncidentRecord[]) {
    container.replaceChildren();
    const incidents = formatIncidentTimeline(rawIncidents || []);
    if (!incidents.length) {
      container.textContent = 'Không có sự cố được ghi nhận.';
      return;
    }
    const table = document.createElement('table');
    table.className = 'mini-table';
    table.innerHTML = '<thead><tr><th>Loại</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thời lượng</th></tr></thead>';
    const body = document.createElement('tbody');
    for (const incident of incidents) {
      const row = document.createElement('tr');
      for (const value of [incident.typeLabel, incident.startedAt, incident.endedAt, incident.duration]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      body.append(row);
    }
    table.append(body);
    container.append(table);
  }

  async function showExamRoomTimeline(student: { attemptId?: string, name?: string }) {
    const panel = root.querySelector<HTMLElement>('#exam-room-timeline');
    if (!panel || !student.attemptId || !scopeState.currentSelectedAssignment) return;
    const query = queryCoordinator?.begin?.('examRoomTimeline');
    if (queryCoordinator && !query) return;

    panel.hidden = false;
    panel.querySelector('h3')!.textContent = `Timeline sự cố · ${student.name || 'Học viên'}`;
    const content = panel.querySelector('div')!;
    content.textContent = 'Đang tải timeline sự cố…';
    try {
      const payload = await request(attemptDetailPath(state.classId!, scopeState.currentSelectedAssignment.assignmentId, student.attemptId), {
        signal: query?.signal
      });
      if (query && !query.isCurrent()) return;
      fillIncidentTimeline(content, payload.incidents);
    } catch (error) {
      if (query && (!query.isCurrent() || (error as Error).name === 'AbortError')) return;
      content.textContent = `Không tải được timeline sự cố: ${(error as Error).message}`;
    }
  }


  async function loadExamRoom(owner: RoomSession | null = examRoomState.examRoomSession): Promise<void> {
    if (!scopeState.currentSelectedAssignment || !state.classId || (owner && !owner.isCurrent())) return;
    const query = queryCoordinator?.begin?.('examRoom');
    if (queryCoordinator && !query) return;

    if (examRoomMessage) examRoomMessage.textContent = 'Đang tải trạng thái Phòng thi…';
    try {
      const payload = await request(assignmentExamRoomPath(state.classId, scopeState.currentSelectedAssignment.assignmentId), {
        signal: query?.signal
      });
      if ((owner && !owner.isCurrent()) || (query && !query.isCurrent())) return;
      renderExamRoom(payload.room);
      if (examRoomMessage) examRoomMessage.textContent = '';
    } catch (err) {
      if ((owner && !owner.isCurrent()) || (query && (!query.isCurrent() || (err as Error).name === 'AbortError'))) return;
      if (examRoomMessage) examRoomMessage.textContent = (err as Error).message || 'Lỗi tải trạng thái Phòng thi';
    }
  }

  function stopExamRoomEvents() {
    const previous = examRoomState.examRoomSession;
    examRoomState.examRoomSession = null;
    previous?.dispose();
    queryCoordinator.cancel('examRoom');
    queryCoordinator.cancel('examRoomTimeline');
  }

  function createCurrentRoomSession() {
    stopExamRoomEvents();
    const classId = state.classId!;
    const assignmentId = scopeState.currentSelectedAssignment!.assignmentId;
    const path = assignmentExamEventsPath(classId, assignmentId);
    const origin = apiBase();
    const token = authState.sessionToken;
    const session: RoomSession = createExamRoomSession({
      isScopeCurrent: () => !lifecycle.isDisposed() && examRoomState.examRoomSession === session
        && state.classId === classId && scopeState.currentSelectedAssignment?.assignmentId === assignmentId,
      fetchStream: (signal: AbortSignal) => fetch(`${origin}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal
      }),
      onUnauthorized: handleLogout,
      refresh: () => loadExamRoom(session),
      onMessage: async (message: { event?: string, data?: any }) => {
        if (message.event === 'snapshot' && message.data.room) renderExamRoom(message.data.room);
        else if (message.event === 'exam.incident.opened' || message.event === 'exam.incident.closed') {
          viewState.currentExamRoom = applyExamIncident(viewState.currentExamRoom, message.data);
          if (viewState.currentExamRoom) renderExamRoom(viewState.currentExamRoom);
        } else if (message.event === 'exam.progress.updated') {
          viewState.currentExamRoom = applyExamProgress(viewState.currentExamRoom, message.data);
          if (viewState.currentExamRoom) renderExamRoom(viewState.currentExamRoom);
        } else if (message.event === 'exam.connection.changed') {
          viewState.currentExamRoom = applyExamConnection(viewState.currentExamRoom, message.data);
          if (viewState.currentExamRoom) renderExamRoom(viewState.currentExamRoom);
        } else if (message.event !== 'snapshot') await loadExamRoom(session);
      }
    });
    examRoomState.examRoomSession = session;
    return session;
  }

  lifecycle.listen(examRoomOpenButton, 'click', async () => {
    if (!scopeState.currentSelectedAssignment) return;
    const session = createCurrentRoomSession();
    examRoomState.examRoomReturnToResults = Boolean(results && !results.hidden);
    if (results) results.hidden = true;
    if (examRoom) examRoom.hidden = false;
    await loadExamRoom(session);
    if (session.isCurrent() && authState.sessionToken) session.start();
  });
  lifecycle.listen(examRoomRefreshButton, 'click', () => {
    loadExamRoom().catch((error: Error) => { if (examRoomMessage) examRoomMessage.textContent = error.message; });
  });
  lifecycle.listen(examRoomCloseButton, 'click', () => {
    stopExamRoomEvents();
    const panel = root.querySelector<HTMLElement>('#exam-room-timeline');
    if (panel) panel.hidden = true;
    if (examRoom) examRoom.hidden = true;
    if (examRoomState.examRoomReturnToResults && results) results.hidden = false;
  });
  lifecycle.listen(examRoomStartButton, 'click', async () => {
    if (!scopeState.currentSelectedAssignment) return;
    examRoomStartButton.disabled = true;
    try {
      await request(assignmentExamStartPath(state.classId!, scopeState.currentSelectedAssignment.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      await loadExamRoom();
    } catch (error) {
      if (examRoomMessage) examRoomMessage.textContent = (error as Error).message;
      examRoomStartButton.disabled = false;
    }
  });
  lifecycle.listen(examRoomExtendButton, 'click', async () => {
    if (!scopeState.currentSelectedAssignment) return;
    examRoomExtendButton.disabled = true;
    try {
      await request(assignmentExamExtendPath(state.classId!, scopeState.currentSelectedAssignment.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: Number(examRoomExtensionMinutes?.value) })
      });
    } catch (error) {
      if (examRoomMessage) examRoomMessage.textContent = (error as Error).message;
      examRoomExtendButton.disabled = false;
      return;
    }
    loadExamRoom().catch((error: Error) => {
      if (examRoomMessage) examRoomMessage.textContent = `Đã gia hạn nhưng chưa tải lại được trạng thái: ${error.message}`;
    });
  });

  return { fillIncidentTimeline, showExamRoomTimeline, loadExamRoom, stopExamRoomEvents };
}
