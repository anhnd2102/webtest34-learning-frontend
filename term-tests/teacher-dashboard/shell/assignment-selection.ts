// NGUỒN: file .ts này; assignment-selection.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { readDashboardTab, renderAssignmentChipsView } from './dashboard-state.js';
import type { AssignmentRecord, DashboardState, ScopeState } from './dashboard-state.js';

export interface AssignmentSelectionParams {
  queryCoordinator: { cancel(scopeKey: string): void };
  scopeState: ScopeState;
  navState: { currentAssessmentTab?: string };
  window: { location: { hash: string } };
  assignmentSelect?: HTMLSelectElement | null;
  assignments: HTMLElement | null;
  results?: HTMLElement | null;
  status: HTMLElement;
  gradingEmptyPlaceholder?: HTMLElement | null;
  assessmentHeader?: HTMLElement | null;
  assessmentTabDistribution?: HTMLElement | null;
  assessmentTabItems?: HTMLElement | null;
  renderSelectedAssignmentShowcase: (assignment: AssignmentRecord | null | undefined) => void;
  state: DashboardState;
  setUrl: () => void;
  loadResults: (classId: string, assignmentId: string) => Promise<unknown>;
  getReportState: () => { reportData: unknown, itemAnalysisData: unknown, expandedItemIds: Set<string>, mode?: string };
  cancelAssessmentQueries: () => void;
  loadScoreDistributionReport: () => unknown;
  loadItemAnalysisReport: () => unknown;
  syncAssessmentHeaderMeta: () => void;
  switchAssessmentTab: (tab: string) => void;
}

export function createAssignmentSelection({ queryCoordinator, scopeState, navState, window, assignmentSelect, assignments, results, status, gradingEmptyPlaceholder, assessmentHeader, assessmentTabDistribution, assessmentTabItems, renderSelectedAssignmentShowcase, state, setUrl, loadResults, getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, syncAssessmentHeaderMeta, switchAssessmentTab }: AssignmentSelectionParams) {
  function renderAssignmentChips(targetAssignmentId = state.assignmentId) {
    renderAssignmentChipsView(assignments, {
      assignmentsList: scopeState.currentAssignmentsList,
      selectedAssignmentId: targetAssignmentId,
      isSwitching: scopeState.isSwitchingAssignment,
      onSelect: (assignmentId) => {
        selectAssignment(assignmentId);
      },
      onToggleSwitch: (switching) => {
        scopeState.isSwitchingAssignment = switching;
        renderAssignmentChips(state.assignmentId);
      }
    });
  }

  function selectAssignment(assignmentId: string) {
    queryCoordinator.cancel('attemptDetail');
    cancelAssessmentQueries();
    getReportState().reportData = null;
    getReportState().itemAnalysisData = null;
    getReportState().expandedItemIds.clear();
    state.assignmentId = assignmentId || '';
    state.attemptId = '';
    state.page = 1;
    setUrl();
    if (assignmentSelect) assignmentSelect.value = assignmentId || '';
    scopeState.isSwitchingAssignment = false;
    renderAssignmentChips(assignmentId);

    const currentTab = readDashboardTab(window.location.hash);
    if (currentTab === 'grading') {
      if (assignmentId && state.classId) {
        if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = true;
        if (assessmentHeader) assessmentHeader.hidden = false;
        syncAssessmentHeaderMeta();
        switchAssessmentTab(navState.currentAssessmentTab || 'details');
      } else {
        if (results) results.hidden = true;
        if (assessmentTabDistribution) assessmentTabDistribution.hidden = true;
        if (assessmentTabItems) assessmentTabItems.hidden = true;
        if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = false;
        if (assessmentHeader) assessmentHeader.hidden = true;
      }
    }
    if (currentTab === 'reports') {
      if (getReportState().mode === 'item_analysis') {
        loadItemAnalysisReport();
      } else {
        loadScoreDistributionReport();
      }
    }

    if (assignmentId) {
      const activeAssignment = scopeState.currentAssignmentsList.find(a => a.assignmentId === assignmentId);
      renderSelectedAssignmentShowcase(activeAssignment);
      if (state.classId) {
        loadResults(state.classId, assignmentId).catch((error: Error) => { status.textContent = error.message; });
      }
    } else {
      renderSelectedAssignmentShowcase(null);
      loadResults('', '').catch(() => {});
    }
  }

  return { renderAssignmentChips, selectAssignment };
}
