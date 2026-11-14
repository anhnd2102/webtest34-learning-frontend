// NGUỒN: file .ts này; navigation.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { readDashboardTab, switchDashboardTab } from './dashboard-state.js';
import type { DashboardState, ScopeState, ReportState } from './dashboard-state.js';
import type { Lifecycle } from './lifecycle.js';
import { hasActiveUnsavedChanges, clearActiveUnsavedChanges, openUnsavedChangesModal } from '../navigation/unsaved-changes.js';

type El = HTMLElement | null | undefined;

export interface NavigationParams {
  lifecycle: Lifecycle;
  queryCoordinator: { cancel(scopeKey: string): void };
  viewState: { currentResultsPayload?: unknown };
  scopeState: ScopeState;
  navState: { currentAssessmentTab?: string, isNavigatingProgrammatically: boolean, previousHash: string };
  window: Window;
  results: El;
  status: El;
  viewDashboard: El;
  viewGrading: El;
  viewExams: El;
  viewReports: El;
  navItems: HTMLElement[];
  goToGradingBtn: El;
  gradingEmptyPlaceholder: El;
  gradingBackToDashboardBtn: El;
  pageTitleBar: El;
  assessmentHeader: El;
  assessmentBackBtn: El;
  assessmentClassName: El;
  assessmentTestTitle: El;
  assessmentStatusBadge: El;
  assessmentTabDistribution: El;
  assessmentTabItems: El;
  assessmentTabBtns: HTMLElement[];
  disposeOwnedBuilder: () => void;
  state: DashboardState;
  loadAndRenderTestStudio: () => unknown;
  loadResults: (classId: string, assignmentId: string) => Promise<unknown>;
  getReportState: () => ReportState;
  cancelAssessmentQueries: () => void;
  loadScoreDistributionReport: () => unknown;
  loadItemAnalysisReport: () => unknown;
  renderReportsView: () => void;
}

export function createNavigation({ lifecycle, queryCoordinator, viewState, scopeState, navState, window, results, status, viewDashboard, viewGrading, viewExams, viewReports, navItems, goToGradingBtn, gradingEmptyPlaceholder, gradingBackToDashboardBtn, pageTitleBar, assessmentHeader, assessmentBackBtn, assessmentClassName, assessmentTestTitle, assessmentStatusBadge, assessmentTabDistribution, assessmentTabItems, assessmentTabBtns, disposeOwnedBuilder, state, loadAndRenderTestStudio, loadResults, getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, renderReportsView }: NavigationParams) {
  function syncAssessmentHeaderMeta() {
    if (assessmentClassName) {
      const cls = scopeState.rawClassesList.find(c => String(c.classId) === String(state.classId));
      assessmentClassName.textContent = cls?.name || scopeState.currentSelectedAssignment?.className || (state.classId ? `Lớp ${state.classId}` : '—');
    }
    if (assessmentTestTitle) {
      assessmentTestTitle.textContent = scopeState.currentSelectedAssignment?.title || 'Bài kiểm tra';
    }
    if (assessmentStatusBadge) {
      const st = scopeState.currentSelectedAssignment?.status;
      assessmentStatusBadge.textContent = st === 'published' ? 'Đang phát hành' : (st === 'closed' ? 'Đã đóng' : (st || 'Đang mở'));
    }
  }

  function switchAssessmentTab(targetTab?: string | null) {
    navState.currentAssessmentTab = targetTab || 'details';
    assessmentTabBtns.forEach(btn => {
      const isMatch = btn.getAttribute('data-assessment-tab') === navState.currentAssessmentTab;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    if (assessmentTabDistribution) {
      assessmentTabDistribution.hidden = navState.currentAssessmentTab !== 'distribution';
    }
    if (results) {
      results.hidden = navState.currentAssessmentTab !== 'details';
    }
    if (assessmentTabItems) {
      assessmentTabItems.hidden = navState.currentAssessmentTab !== 'items';
    }

    if (navState.currentAssessmentTab === 'distribution') {
      getReportState().mode = 'distribution';
      if (!getReportState().reportData && !getReportState().isLoading) {
        loadScoreDistributionReport();
      } else {
        renderReportsView();
      }
    } else if (navState.currentAssessmentTab === 'details') {
      if (!viewState.currentResultsPayload && state.classId && state.assignmentId) {
        loadResults(state.classId, state.assignmentId).catch((err: Error) => {
          if (status) status.textContent = err.message;
        });
      }
    } else if (navState.currentAssessmentTab === 'items') {
      getReportState().mode = 'item_analysis';
      if (!getReportState().itemAnalysisData && !getReportState().itemAnalysisLoading) {
        loadItemAnalysisReport();
      } else {
        renderReportsView();
      }
    }
  }

  function updateDashboardTab(tabId: string) {
    const activeTab = switchDashboardTab(tabId, {
      views: {
        dashboard: viewDashboard,
        grading: viewGrading,
        exams: viewExams,
        reports: viewReports
      },
      navItems,
      onTabChange: (newTab) => {
        if (newTab !== 'test-studio' && newTab !== 'exams') {
          disposeOwnedBuilder();
          queryCoordinator.cancel('testStudio');
          queryCoordinator.cancel('testStudioBuilder');
        }
        if (newTab !== 'reports' && newTab !== 'grading') {
          cancelAssessmentQueries();
        }
        if (pageTitleBar) {
          pageTitleBar.hidden = newTab !== 'dashboard';
        }
        if (newTab === 'grading') {
          if (state.assignmentId && state.classId) {
            if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = true;
            if (assessmentHeader) assessmentHeader.hidden = false;
            syncAssessmentHeaderMeta();
            switchAssessmentTab(navState.currentAssessmentTab || 'details');
          } else {
            if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = false;
            if (assessmentHeader) assessmentHeader.hidden = true;
            if (results) results.hidden = true;
            if (assessmentTabDistribution) assessmentTabDistribution.hidden = true;
            if (assessmentTabItems) assessmentTabItems.hidden = true;
          }
        }
        if (newTab === 'test-studio' || newTab === 'exams') {
          loadAndRenderTestStudio();
        }
        if (newTab === 'reports') {
          if (getReportState().mode === 'item_analysis') {
            loadItemAnalysisReport();
          } else {
            loadScoreDistributionReport();
          }
        }
      }
    });
    return activeTab;
  }



  navItems.forEach(item => {
    lifecycle.listen(item, 'click', (e) => {
      e.preventDefault();
      const href = item.getAttribute('href') || '#dashboard';
      const cleanTab = readDashboardTab(href);
      const targetHash = '#' + cleanTab;

      if (hasActiveUnsavedChanges()) {
        openUnsavedChangesModal({
          onDiscard: () => {
            clearActiveUnsavedChanges();
            navState.isNavigatingProgrammatically = true;
            if (window.location.hash !== targetHash) {
              window.location.hash = targetHash;
            }
            navState.previousHash = targetHash;
            updateDashboardTab(cleanTab);
          },
          onStay: () => {
            // User chooses to stay
          }
        });
        return;
      }

      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      navState.previousHash = targetHash;
      updateDashboardTab(cleanTab);
    });
  });

  lifecycle.listen(window, 'hashchange', () => {
    if (navState.isNavigatingProgrammatically) {
      navState.isNavigatingProgrammatically = false;
      navState.previousHash = window.location.hash;
      return;
    }
    const newHash = window.location.hash;
    if (hasActiveUnsavedChanges()) {
      openUnsavedChangesModal({
        onDiscard: () => {
          clearActiveUnsavedChanges();
          navState.previousHash = newHash;
          updateDashboardTab(newHash);
        },
        onStay: () => {
          navState.isNavigatingProgrammatically = true;
          window.location.hash = navState.previousHash;
        }
      });
      return;
    }
    navState.previousHash = newHash;
    updateDashboardTab(newHash);
  });

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    lifecycle.listen(window, 'beforeunload', (ev) => {
      const e = ev as BeforeUnloadEvent;
      if (hasActiveUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  if (goToGradingBtn) {
    lifecycle.listen(goToGradingBtn, 'click', (e) => {
      e.preventDefault();
      if (hasActiveUnsavedChanges()) {
        openUnsavedChangesModal({
          onDiscard: () => {
            clearActiveUnsavedChanges();
            navState.isNavigatingProgrammatically = true;
            window.location.hash = '#grading';
            navState.previousHash = '#grading';
            updateDashboardTab('grading');
          }
        });
        return;
      }
      window.location.hash = '#grading';
      navState.previousHash = '#grading';
      updateDashboardTab('grading');
    });
  }

  if (assessmentBackBtn) {
    lifecycle.listen(assessmentBackBtn, 'click', () => {
      updateDashboardTab('dashboard');
      if (typeof window !== 'undefined') window.location.hash = '#dashboard';
    });
  }

  assessmentTabBtns.forEach(btn => {
    lifecycle.listen(btn, 'click', () => {
      const tab = btn.getAttribute('data-assessment-tab');
      if (tab) switchAssessmentTab(tab);
    });
  });

  if (gradingBackToDashboardBtn) {
    lifecycle.listen(gradingBackToDashboardBtn, 'click', (e) => {
      e.preventDefault();
      if (hasActiveUnsavedChanges()) {
        openUnsavedChangesModal({
          onDiscard: () => {
            clearActiveUnsavedChanges();
            navState.isNavigatingProgrammatically = true;
            window.location.hash = '#dashboard';
            navState.previousHash = '#dashboard';
            updateDashboardTab('dashboard');
          }
        });
        return;
      }
      window.location.hash = '#dashboard';
      navState.previousHash = '#dashboard';
      updateDashboardTab('dashboard');
    });
  }

  return { syncAssessmentHeaderMeta, switchAssessmentTab, updateDashboardTab };
}
