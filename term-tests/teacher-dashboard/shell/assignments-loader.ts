// NGUỒN: file .ts này; assignments-loader.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { readDashboardTab, extractPhase } from './dashboard-state.js';
import type { AssignmentRecord, DashboardRequest, DashboardState, ScopeState } from './dashboard-state.js';
import type { QueryHandle } from './query-coordinator.js';

export interface AssignmentsLoaderParams {
  root: ParentNode;
  queryCoordinator?: { begin(scopeKey: string): QueryHandle | null } | null;
  scopeState: ScopeState;
  window: { location: { hash: string } };
  classSelect?: HTMLSelectElement | null;
  assignmentSelect?: HTMLSelectElement | null;
  assignments: HTMLElement;
  status: HTMLElement;
  drawerBackdrop?: HTMLElement | null;
  state: DashboardState;
  loginError?: HTMLElement | null;
  request: DashboardRequest;
  setUrl: () => void;
  loadAttemptDetail: (classId: string, assignmentId: string, attemptId: string) => Promise<unknown>;
  loadResults: (classId: string, assignmentId: string) => Promise<unknown>;
  getReportState: () => { mode?: string };
  loadScoreDistributionReport: (classId: string, assignmentId: string) => Promise<unknown>;
  loadItemAnalysisReport: (classId: string, assignmentId: string) => Promise<unknown>;
  renderSelectedAssignmentShowcase: (assignment: AssignmentRecord | null) => void;
  renderAssignmentChips: (selectedAssignmentId?: string) => void;
}

export function createAssignmentsLoader({ root, queryCoordinator, scopeState, window, classSelect, assignmentSelect, assignments, status, drawerBackdrop, state, loginError, request, setUrl, loadAttemptDetail, loadResults, getReportState, loadScoreDistributionReport, loadItemAnalysisReport, renderSelectedAssignmentShowcase, renderAssignmentChips }: AssignmentsLoaderParams) {
  async function loadAssignments(classId: string, selectedAssignmentId = ''): Promise<void> {
    const query = queryCoordinator?.begin?.('assignments');
    if (queryCoordinator && !query) return;

    assignments.replaceChildren();
    if (assignmentSelect) {
      assignmentSelect.replaceChildren(new Option('-- Chọn bài test --', ''));
      assignmentSelect.disabled = !classId;
    }
    renderSelectedAssignmentShowcase(null);
    scopeState.currentAssignmentsList = [];
    await loadResults('', '');
    if (!classId) return;

    status.textContent = 'Đang tải bài được giao…';
    try {
      const payload = await request(`/api/teacher/classes/${encodeURIComponent(classId)}/assignments`, {
        signal: query?.signal
      });
      if (query && !query.isCurrent()) return;
      if (state.classId !== classId && classSelect?.value !== classId) return;

      scopeState.currentAssignmentsList = payload.assignments || [];
      scopeState.currentServerNow = payload.serverNow || null;
      let selectedExists = false;

      if (assignmentSelect) {
        assignmentSelect.disabled = false;
        for (const assignment of scopeState.currentAssignmentsList) {
          const phaseLabel = extractPhase(assignment.phase, assignment.title);
          const optLabel = phaseLabel ? `${assignment.title} (${phaseLabel})` : assignment.title;
          const opt = new Option(optLabel, assignment.assignmentId);
          if (assignment.assignmentId === selectedAssignmentId) {
            opt.selected = true;
            selectedExists = true;
          }
          assignmentSelect.add(opt);
        }
      }

      renderAssignmentChips(selectedAssignmentId);

      status.textContent = `${scopeState.currentAssignmentsList.length} bài được giao`;

      const activeAssignment = scopeState.currentAssignmentsList.find(a => a.assignmentId === (selectedAssignmentId || state.assignmentId));
      if (activeAssignment) {
        renderSelectedAssignmentShowcase(activeAssignment);
      } else {
        renderSelectedAssignmentShowcase(null);
      }

      if (selectedExists) {
        await loadResults(classId, selectedAssignmentId);
        if (query && !query.isCurrent()) return;
        const currentTab = readDashboardTab(window.location.hash);
        if (currentTab === 'reports') {
          if (getReportState().mode === 'item_analysis') {
            await loadItemAnalysisReport(classId, selectedAssignmentId);
          } else {
            await loadScoreDistributionReport(classId, selectedAssignmentId);
          }
        }
        if (state.attemptId) {
          try {
            await loadAttemptDetail(classId, selectedAssignmentId, state.attemptId);
          } catch (err) {
            console.warn('Attempt detail not found:', (err as Error).message);
            state.attemptId = '';
            setUrl();
            const attemptContainer = root.querySelector<HTMLElement>('#attempt-detail');
            if (attemptContainer) {
              attemptContainer.classList.remove('drawer-open');
              attemptContainer.hidden = true;
            }
            if (drawerBackdrop) drawerBackdrop.hidden = true;
            if (loginError && loginError.textContent.includes('Không tìm thấy bài làm')) {
              loginError.hidden = true;
              loginError.textContent = '';
            }
          }
        }
      }
    } catch (error) {
      if (query && (!query.isCurrent() || (error as Error).name === 'AbortError')) return;
      status.textContent = (error as Error).message;
    }
  }

  return { loadAssignments };
}
