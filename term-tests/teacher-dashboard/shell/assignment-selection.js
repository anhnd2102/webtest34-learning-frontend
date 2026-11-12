import { readDashboardTab, renderAssignmentChipsView } from './dashboard-state.js';

export function createAssignmentSelection({ queryCoordinator, scopeState, navState, window, assignmentSelect, assignments, results, status, gradingEmptyPlaceholder, assessmentHeader, assessmentTabDistribution, assessmentTabItems, renderSelectedAssignmentShowcase, state, setUrl, loadResults, getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, syncAssessmentHeaderMeta, switchAssessmentTab }) {
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

  function selectAssignment(assignmentId) {
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
        loadResults(state.classId, assignmentId).catch(error => { status.textContent = error.message; });
      }
    } else {
      renderSelectedAssignmentShowcase(null);
      loadResults('', '').catch(() => {});
    }
  }

  return { renderAssignmentChips, selectAssignment };
}
