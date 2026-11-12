import { createResultsView } from '../results/view.js';
import { createAttemptReview } from '../grading/attempt-review.js';
import { createExamRoomView } from '../exam-room/view.js';
import { createLifecycle } from './lifecycle.js';
import { createQueryCoordinator } from './query-coordinator.js';

import { defaultApiBase, authLoginPath, authLogoutPath, authMePath, authHeaders, assignmentResultsPath, assignmentResultsExportPath, assignmentExamModePath, assignmentSelfProctoringPath, assignmentExamRoomPath, assignmentExamEventsPath, assignmentExamStartPath, assignmentExamExtendPath, attemptDetailPath, attemptPublishPath, assignmentPublishAllPath, assignmentRosterPath, eligibleStudentsPath, grantRetakePath, courseTestCatalogPath, formDraftPath, formDetailPath, formPublishPath, formPublishPreviewPath } from '../api/teacher.js';

import { ICONS } from '../ui/icons.js';
import { localStudentUrl, readDashboardState, readDashboardTab, switchDashboardTab, assignmentUrl, resetDashboardState, filterClasses, formatClassFilterCountLabel, formatClassOptionLabel, extractPhase, formatAssignmentMeta, renderAssignmentChipsView } from './dashboard-state.js';
import { teacherRoleLabel, getRoleCapabilities, formatIncidentTimeline } from '../results/presentation.js';
import { downloadResultsXlsx } from '../results/export.js';
import { examModeLockReason, selfProctoringLockReason, selfProctoringRequestBody, examSwitchRequestBody, examSwitchView, examSwitchErrorView, examSwitchSuccessText, applyExamProgress, applyExamIncident, applyExamConnection } from '../exam-room/presentation.js';
import { hasActiveUnsavedChanges, clearActiveUnsavedChanges, openUnsavedChangesModal } from '../navigation/unsaved-changes.js';
import { openCreateTestModal, renderCourseTestCatalogView, filterClassesForCourse } from '../studio/catalog.js';
import { renderTestBuilderView } from '../studio/builder.js';

import { createExamRoomSession } from './exam-room-session.js';
import { reportApiPath, renderScoreDistributionView } from './analytics/score-distribution-view.js';
import { itemAnalysisApiPath, renderReportModeSwitch, renderItemAnalysisView } from './analytics/item-analysis-view.js';
import { createPortalPanel } from './portal-panel.js';
import { createProfilePanel } from './profile-panel.js';
import { createGrantRetake } from './grant-retake.js';
import { createReports } from './reports.js';


const mountedDashboards = new WeakMap();

export function mountDashboard(root = globalThis.document) {
  if (!root?.querySelector || !root.querySelector('#identity-form') || !root.querySelector('#class-select')) {
    throw new Error('Dashboard root must contain the identity form and class selector.');
  }
  const current = mountedDashboards.get(root);
  if (current) return current;
  const view = (root.ownerDocument || root).defaultView;
  const lifecycle = createLifecycle(view?.AbortController || globalThis.AbortController);
  const queryCoordinator = createQueryCoordinator(lifecycle, view?.AbortController || globalThis.AbortController);
  const handle = {
    dispose() {
      lifecycle.dispose();
      queryCoordinator.dispose();
      if (mountedDashboards.get(root) === handle) mountedDashboards.delete(root);
    }
  };
  mountedDashboards.set(root, handle);
  try {
    initializeDashboard(root, lifecycle, queryCoordinator);
  } catch (error) {
    handle.dispose();
    throw error;
  }
  return handle;
}

function initializeDashboard(root, lifecycle, queryCoordinator) {
  // Accessors share the shell's existing state; extracted views do not create a second store.
  const viewState = {
    get currentResultsPayload() { return currentResultsPayload; }, set currentResultsPayload(value) { currentResultsPayload = value; },
    get currentAttemptDetail() { return currentAttemptDetail; }, set currentAttemptDetail(value) { currentAttemptDetail = value; },
    get currentSkillTab() { return currentSkillTab; }, set currentSkillTab(value) { currentSkillTab = value; },
    get autoSaveTimeout() { return autoSaveTimeout; }, set autoSaveTimeout(value) { autoSaveTimeout = value; },
    get currentExamRoom() { return currentExamRoom; }, set currentExamRoom(value) { currentExamRoom = value; }
  };
  // Owners của state dùng chung. Mỗi nhóm chỉ là accessor trên biến let của shell (không tạo store thứ hai);
  // module tách ra nhận đúng owner cần dùng thay vì đọc/gán biến let trực tiếp.
  //  - auth: phiên đăng nhập và giáo viên hiện tại.
  //  - scope: lớp/bài được giao đang xem.
  //  - examRoomState: phòng thi (phiên SSE, cờ quay lại kết quả; currentExamRoom nằm ở viewState).
  const authState = {
    get sessionToken() { return sessionToken; }, set sessionToken(value) { sessionToken = value; },
    get currentTeacher() { return currentTeacher; }, set currentTeacher(value) { currentTeacher = value; }
  };
  const scopeState = {
    get rawClassesList() { return rawClassesList; }, set rawClassesList(value) { rawClassesList = value; },
    get currentAssignmentsList() { return currentAssignmentsList; }, set currentAssignmentsList(value) { currentAssignmentsList = value; },
    get currentSelectedAssignment() { return currentSelectedAssignment; }, set currentSelectedAssignment(value) { currentSelectedAssignment = value; },
    get currentServerNow() { return currentServerNow; }, set currentServerNow(value) { currentServerNow = value; },
    get isSwitchingAssignment() { return isSwitchingAssignment; }, set isSwitchingAssignment(value) { isSwitchingAssignment = value; }
  };
  const examRoomState = {
    get examRoomSession() { return examRoomSession; }, set examRoomSession(value) { examRoomSession = value; },
    get examRoomReturnToResults() { return examRoomReturnToResults; }, set examRoomReturnToResults(value) { examRoomReturnToResults = value; }
  };
  const document = root.ownerDocument || root;
  const window = document.defaultView || globalThis.window;
  const location = window.location;
  const history = window.history;
  const form = root.querySelector('#identity-form');
  const classFilterToolbar = root.querySelector('#class-filter-toolbar');
  const adminCourseFilters = root.querySelector('#admin-course-filters');
  const leadScopeFilters = root.querySelector('#lead-scope-filters');
  const classSearchInput = root.querySelector('#class-search-input');
  const classStatusFilter = root.querySelector('#class-status-filter');
  const classCountBadge = root.querySelector('#class-count-badge');
  const classSelect = root.querySelector('#class-select');
  const assignmentSelect = root.querySelector('#assignment-select');
  const selectedAssignmentCard = root.querySelector('#selected-assignment-card');
  const showcaseBadgeClass = root.querySelector('#showcase-badge-class');
  const showcaseTitle = root.querySelector('#showcase-title');
  const showcaseBlockBadge = root.querySelector('#showcase-block-badge');
  const showcasePhaseBadge = root.querySelector('#showcase-phase-badge');
  const showcaseStatusBadge = root.querySelector('#showcase-status-badge');
  const examModeToggle = root.querySelector('#exam-mode-toggle');
  const examModeStatusPill = root.querySelector('#exam-mode-status-pill');
  const selfProctoringToggle = root.querySelector('#self-proctoring-toggle');
  const examModeLockHint = root.querySelector('#exam-mode-lock-hint');
  const selfProctoringLockHint = root.querySelector('#self-proctoring-lock-hint');
  const selfProctoringLimit = root.querySelector('#self-proctoring-limit');
  const selfProctoringSave = root.querySelector('#self-proctoring-save');
  const examSwitchControls = root.querySelector('#exam-switch-controls');
  const examSwitchHint = root.querySelector('#exam-switch-hint');
  const examSwitchLimit = root.querySelector('#exam-switch-limit');
  const examSwitchButton = root.querySelector('#exam-switch-btn');
  const examSwitchMessage = root.querySelector('#exam-switch-message');
  const examRoomOpenButton = root.querySelector('#exam-room-open');
  const examRoom = root.querySelector('#exam-room');
  const examRoomSummary = root.querySelector('#exam-room-summary');
  const examRoomMessage = root.querySelector('#exam-room-message');
  const examRoomStudents = root.querySelector('#exam-room-students');
  const examRoomStartButton = root.querySelector('#exam-room-start');
  const examRoomExtendButton = root.querySelector('#exam-room-extend');
  const examRoomExtensionMinutes = root.querySelector('#exam-room-extension-minutes');
  const examRoomRefreshButton = root.querySelector('#exam-room-refresh');
  const examRoomCloseButton = root.querySelector('#exam-room-close');
  const showcaseLinkBar = root.querySelector('#showcase-link-bar');
  const showcaseStudentUrl = root.querySelector('#showcase-student-url');
  const copyShowcaseLinkBtn = root.querySelector('#copy-showcase-link-btn');
  const openShowcaseLinkBtn = root.querySelector('#open-showcase-link-btn');
  const assignments = root.querySelector('#assignment-chips') || root.querySelector('#assignments');
  const results = root.querySelector('#results');
  const resultsContent = root.querySelector('#results-content');
  const assignmentHeading = root.querySelector('#assignment-heading');
  const assignmentMeta = root.querySelector('#assignment-meta');
  const status = root.querySelector('#status');
  const lastUpdated = root.querySelector('#last-updated');
  const refreshBtn = root.querySelector('#refresh-btn');
  const publishAllBtn = root.querySelector('#publish-all-btn');
  const exportXlsxBtn = root.querySelector('#export-xlsx-btn');
  const classSkillSummary = root.querySelector('#class-skill-summary');
  const viewDashboard = root.querySelector('#view-dashboard');
  const viewGrading = root.querySelector('#view-grading');
  const viewExams = root.querySelector('#view-exams');
  const viewReports = root.querySelector('#view-reports');
  const navItems = Array.from(root.querySelectorAll('.navbar-menu .nav-item'));
  const goToGradingBtn = root.querySelector('#go-to-grading-btn');
  const gradingEmptyPlaceholder = root.querySelector('#grading-empty-placeholder');
  const gradingBackToDashboardBtn = root.querySelector('#grading-back-to-dashboard-btn');
  const pageTitleBar = root.querySelector('.page-title-bar');
  const assessmentHeader = root.querySelector('#assessment-header');
  const assessmentBackBtn = root.querySelector('#assessment-back-btn');
  const assessmentClassName = root.querySelector('#assessment-class-name');
  const assessmentTestTitle = root.querySelector('#assessment-test-title');
  const assessmentStatusBadge = root.querySelector('#assessment-status-badge');
  const assessmentTabDistribution = root.querySelector('#assessment-tab-distribution');
  const assessmentTabItems = root.querySelector('#assessment-tab-items');
  const assessmentTabBtns = Array.from(root.querySelectorAll('.assessment-tab-btn'));
  let currentAssessmentTab = 'details';
  let currentResultsPayload = null;
  let currentAssignmentsList = [];
  let currentServerNow = null;
  let isSwitchingAssignment = false;
  let currentSelectedAssignment = null;
  let examRoomReturnToResults = false;
  let rawClassesList = [];
  let currentTeacher = null;
  let activeBuilder = null;
  lifecycle.onDispose(disposeOwnedBuilder);

  function disposeOwnedBuilder() {
    activeBuilder?.dispose();
    activeBuilder = null;
  }

  function renderOwnedBuilder(...args) {
    disposeOwnedBuilder();
    activeBuilder = renderTestBuilderView(...args);
    return activeBuilder;
  }

  function syncAssessmentHeaderMeta() {
    if (assessmentClassName) {
      const cls = rawClassesList.find(c => String(c.classId) === String(state.classId));
      assessmentClassName.textContent = cls?.name || currentSelectedAssignment?.className || (state.classId ? `Lớp ${state.classId}` : '—');
    }
    if (assessmentTestTitle) {
      assessmentTestTitle.textContent = currentSelectedAssignment?.title || 'Bài kiểm tra';
    }
    if (assessmentStatusBadge) {
      const st = currentSelectedAssignment?.status;
      assessmentStatusBadge.textContent = st === 'published' ? 'Đang phát hành' : (st === 'closed' ? 'Đã đóng' : (st || 'Đang mở'));
    }
  }

  function switchAssessmentTab(targetTab) {
    currentAssessmentTab = targetTab || 'details';
    assessmentTabBtns.forEach(btn => {
      const isMatch = btn.getAttribute('data-assessment-tab') === currentAssessmentTab;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    if (assessmentTabDistribution) {
      assessmentTabDistribution.hidden = currentAssessmentTab !== 'distribution';
    }
    if (results) {
      results.hidden = currentAssessmentTab !== 'details';
    }
    if (assessmentTabItems) {
      assessmentTabItems.hidden = currentAssessmentTab !== 'items';
    }

    if (currentAssessmentTab === 'distribution') {
      getReportState().mode = 'distribution';
      if (!getReportState().reportData && !getReportState().isLoading) {
        loadScoreDistributionReport();
      } else {
        renderReportsView();
      }
    } else if (currentAssessmentTab === 'details') {
      if (!currentResultsPayload && state.classId && state.assignmentId) {
        loadResults(state.classId, state.assignmentId).catch(err => {
          if (status) status.textContent = err.message;
        });
      }
    } else if (currentAssessmentTab === 'items') {
      getReportState().mode = 'item_analysis';
      if (!getReportState().itemAnalysisData && !getReportState().itemAnalysisLoading) {
        loadItemAnalysisReport();
      } else {
        renderReportsView();
      }
    }
  }

  function updateDashboardTab(tabId) {
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
            switchAssessmentTab(currentAssessmentTab || 'details');
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

  let currentStudioCourseId = 1;
  async function loadAndRenderTestStudio(targetCourseId = currentStudioCourseId) {
    disposeOwnedBuilder();
    queryCoordinator.cancel('testStudio');
    queryCoordinator.cancel('testStudioBuilder');
    currentStudioCourseId = Number(targetCourseId || 1);
    const container = root.querySelector('#test-studio-container') || viewExams;
    if (!container) return;

    if (!currentTeacher && sessionToken) {
      container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang kiểm tra quyền hạn...</p></div>';
      return;
    }

    const teacherRole = currentTeacher ? currentTeacher.role : 'teacher';
    if (teacherRole !== 'lead' && teacherRole !== 'admin') {
      renderCourseTestCatalogView(container, [], { teacherRole, courseId: currentStudioCourseId });
      return;
    }

    const query = queryCoordinator?.begin?.('testStudio');
    if (queryCoordinator && !query) return;

    try {
      container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải danh mục bài thi...</p></div>';
      const endpoint = courseTestCatalogPath(currentStudioCourseId);
      const res = await request(endpoint, { signal: query?.signal });
      if (query && !query.isCurrent()) return;
      const catalog = res.catalog || [];
      const handleDeleteDraft = async ({ formVersionId, title }) => {
        if (!formVersionId) return;
        try {
          container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang xóa bài thi...</p></div>';
          const delRes = await request(formDraftPath(formVersionId), {
            method: 'DELETE'
          });
          if (delRes && delRes.success) {
            alert(`Đã xóa bài thi ${title ? `"${title}" ` : ''}thành công.`);
          }
          await loadAndRenderTestStudio(currentStudioCourseId);
        } catch (err) {
          alert('Lỗi xóa bài thi: ' + (err.message || 'Lỗi kết nối'));
          await loadAndRenderTestStudio(currentStudioCourseId);
        }
      };

      if (!rawClassesList || rawClassesList.length === 0) {
        try {
          const classPayload = await request('/api/teacher/classes');
          rawClassesList = classPayload?.classes || [];
        } catch (_) {}
      }
      const relevantClasses = filterClassesForCourse(rawClassesList, currentStudioCourseId);

      renderCourseTestCatalogView(container, catalog, {
        teacherRole,
        courseId: currentStudioCourseId,
        onCourseChange: (newCid) => {
          loadAndRenderTestStudio(newCid);
        },
        onDeleteDraft: handleDeleteDraft,
        onAddTest: () => {
          openCreateTestModal({
            courseId: currentStudioCourseId,
            catalog,
            onSubmit: async ({ courseId, sessionNumber, phase, title, durationMinutes }) => {
              try {
                container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang khởi tạo bản nháp bài thi mới...</p></div>';

                const postRes = await request(formDraftPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    courseId,
                    sessionNumber,
                    phase,
                    title,
                    durationMinutes
                  })
                });

                if (!postRes || !postRes.formVersionId) {
                  throw new Error(postRes?.message || 'Không thể tạo bản nháp bài thi');
                }

                const detailRes = await request(formDetailPath(postRes.formVersionId));

                const formObj = detailRes?.formVersion || detailRes?.form || {};
                renderOwnedBuilder(container, {
                  ...formObj,
                  id: formObj.id || formObj.formVersionId || postRes.formVersionId,
                  formVersionId: formObj.formVersionId || formObj.id || postRes.formVersionId,
                  phase,
                  sessionNumber,
                  gradingKey: detailRes?.gradingKey || formObj.gradingKey,
                  submissionCount: detailRes?.submissionCount || 0
                }, {
                  teacherRole,
                  courseId,
                  catalog,
                  classes: relevantClasses,
                  onBack: () => {
                    if (hasActiveUnsavedChanges()) {
                      openUnsavedChangesModal({
                        onDiscard: () => {
                          clearActiveUnsavedChanges();
                          loadAndRenderTestStudio(courseId);
                        }
                      });
                      return;
                    }
                    clearActiveUnsavedChanges();
                    loadAndRenderTestStudio(courseId);
                  },
                  onDeleteDraft: handleDeleteDraft,
                  onSaveDraft: async (updatedPayload) => {
                    const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updatedPayload)
                    });
                    return putRes;
                  },
                  onPublishPreview: async (previewPayload) => {
                    return await request(formPublishPreviewPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(previewPayload)
                    });
                  },
                  onPublish: async (publishPayload) => {
                    const pubRes = await request(formPublishPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(publishPayload)
                    });
                    return pubRes;
                  }
                });
              } catch (err) {
                alert('Lỗi khởi tạo bài thi: ' + (err.message || 'Lỗi kết nối'));
                loadAndRenderTestStudio(currentStudioCourseId);
              }
            }
          });
        },
        onEditTest: async ({ testKey, formVersionId }) => {
          if (!formVersionId) {
            alert('Bài thi này chưa liên kết với phiên bản form nào.');
            return;
          }
          const editQuery = queryCoordinator?.begin?.('testStudioBuilder');
          if (queryCoordinator && !editQuery) return;

          try {
            container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải dữ liệu bài thi...</p></div>';
            const detailRes = await request(formDetailPath(formVersionId), { signal: editQuery?.signal });
            if (editQuery && (!editQuery.isCurrent() || queryCoordinator?.isCurrent?.('testStudio', query?.id) === false)) return;
            const formObj = detailRes?.formVersion || detailRes?.form;
            if (!detailRes || !formObj) {
              throw new Error(detailRes?.message || 'Không tìm thấy dữ liệu bài thi');
            }

            renderOwnedBuilder(container, {
              ...formObj,
              id: formObj.id || formObj.formVersionId || formVersionId,
              formVersionId: formObj.formVersionId || formObj.id || formVersionId,
              gradingKey: detailRes?.gradingKey || formObj.gradingKey,
              testKey,
              submissionCount: detailRes?.submissionCount || 0
            }, {
              teacherRole,
              courseId: currentStudioCourseId,
              catalog,
              classes: relevantClasses,
              onBack: () => {
                if (hasActiveUnsavedChanges()) {
                  openUnsavedChangesModal({
                    onDiscard: () => {
                      clearActiveUnsavedChanges();
                      loadAndRenderTestStudio(currentStudioCourseId);
                    }
                  });
                  return;
                }
                clearActiveUnsavedChanges();
                loadAndRenderTestStudio(currentStudioCourseId);
              },
              onDeleteDraft: handleDeleteDraft,
              onSaveDraft: async (updatedPayload) => {
                const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedPayload)
                });
                return putRes;
              },
              onPublishPreview: async (previewPayload) => {
                return await request(formPublishPreviewPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(previewPayload)
                });
              },
              onPublish: async (publishPayload) => {
                const pubRes = await request(formPublishPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(publishPayload)
                });
                return pubRes;
              }
            });
          } catch (err) {
            if (editQuery && (!editQuery.isCurrent() || queryCoordinator?.isCurrent?.('testStudio', query?.id) === false || err.name === 'AbortError')) return;
            alert('Lỗi tải bài thi: ' + (err.message || 'Lỗi kết nối'));
            loadAndRenderTestStudio(currentStudioCourseId);
          }
        }
      });
    } catch (err) {
      if (query && (!query.isCurrent() || err.name === 'AbortError')) return;
      container.innerHTML = `<div class="panel showcase-placeholder"><p class="alert-error">Không thể tải danh mục bài thi: ${err.message || 'Lỗi kết nối'}</p></div>`;
    }
  }

  let isNavigatingProgrammatically = false;
  let previousHash = (typeof window !== 'undefined' ? window.location?.hash : '') || '#dashboard';

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
            isNavigatingProgrammatically = true;
            if (window.location.hash !== targetHash) {
              window.location.hash = targetHash;
            }
            previousHash = targetHash;
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
      previousHash = targetHash;
      updateDashboardTab(cleanTab);
    });
  });

  lifecycle.listen(window, 'hashchange', () => {
    if (isNavigatingProgrammatically) {
      isNavigatingProgrammatically = false;
      previousHash = window.location.hash;
      return;
    }
    const newHash = window.location.hash;
    if (hasActiveUnsavedChanges()) {
      openUnsavedChangesModal({
        onDiscard: () => {
          clearActiveUnsavedChanges();
          previousHash = newHash;
          updateDashboardTab(newHash);
        },
        onStay: () => {
          isNavigatingProgrammatically = true;
          window.location.hash = previousHash;
        }
      });
      return;
    }
    previousHash = newHash;
    updateDashboardTab(newHash);
  });

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    lifecycle.listen(window, 'beforeunload', (e) => {
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
            isNavigatingProgrammatically = true;
            window.location.hash = '#grading';
            previousHash = '#grading';
            updateDashboardTab('grading');
          }
        });
        return;
      }
      window.location.hash = '#grading';
      previousHash = '#grading';
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
            isNavigatingProgrammatically = true;
            window.location.hash = '#dashboard';
            previousHash = '#dashboard';
            updateDashboardTab('dashboard');
          }
        });
        return;
      }
      window.location.hash = '#dashboard';
      previousHash = '#dashboard';
      updateDashboardTab('dashboard');
    });
  }

  function renderAssignmentChips(targetAssignmentId = state.assignmentId) {
    renderAssignmentChipsView(assignments, {
      assignmentsList: currentAssignmentsList,
      selectedAssignmentId: targetAssignmentId,
      isSwitching: isSwitchingAssignment,
      onSelect: (assignmentId) => {
        selectAssignment(assignmentId);
      },
      onToggleSwitch: (switching) => {
        isSwitchingAssignment = switching;
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
    isSwitchingAssignment = false;
    renderAssignmentChips(assignmentId);

    const currentTab = readDashboardTab(window.location.hash);
    if (currentTab === 'grading') {
      if (assignmentId && state.classId) {
        if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = true;
        if (assessmentHeader) assessmentHeader.hidden = false;
        syncAssessmentHeaderMeta();
        switchAssessmentTab(currentAssessmentTab || 'details');
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
      const activeAssignment = currentAssignmentsList.find(a => a.assignmentId === assignmentId);
      renderSelectedAssignmentShowcase(activeAssignment);
      if (state.classId) {
        loadResults(state.classId, assignmentId).catch(error => { status.textContent = error.message; });
      }
    } else {
      renderSelectedAssignmentShowcase(null);
      loadResults('', '').catch(() => {});
    }
  }

  const addStudentBtn = root.querySelector('#add-student-btn');
  const addStudentModal = root.querySelector('#add-student-modal');
  const addStudentForm = root.querySelector('#add-student-form');
  const eligibleStudentSelect = root.querySelector('#eligible-student-select');
  const addStudentRefInput = root.querySelector('#add-student-ref-input');
  const addStudentNameInput = root.querySelector('#add-student-name-input');
  const addStudentDiscInput = root.querySelector('#add-student-disc-input');
  const addStudentError = root.querySelector('#add-student-error');
  const cancelAddStudentBtn = root.querySelector('#cancel-add-student-btn');

  const grantRetakeModal = root.querySelector('#grant-retake-modal');
  const grantRetakeForm = root.querySelector('#grant-retake-form');
  const grantRetakeBtn = root.querySelector('#grant-retake-btn');
  const retakeStudentName = root.querySelector('#retake-student-name');
  const retakeStudentRefInput = root.querySelector('#retake-student-ref-input');
  const retakeReasonInput = root.querySelector('#retake-reason-input');
  const retakeAvailableFromInput = root.querySelector('#retake-available-from-input');
  const retakeExpiresAtInput = root.querySelector('#retake-expires-at-input');
  const cancelGrantRetakeBtn = root.querySelector('#cancel-grant-retake-btn');
  const grantRetakeError = root.querySelector('#grant-retake-error');

  const searchInput = root.querySelector('#search-input');
  const statusFilter = root.querySelector('#status-filter');
  const skillFilter = root.querySelector('#skill-filter');
  const minScoreInput = root.querySelector('#min-score-input');
  const maxScoreInput = root.querySelector('#max-score-input');
  const sortBySelect = root.querySelector('#sort-by-select');
  const sortDirSelect = root.querySelector('#sort-dir-select');
  const resetFiltersBtn = root.querySelector('#reset-filters-btn');
  const paginationInfo = root.querySelector('#pagination-info');
  const prevPageBtn = root.querySelector('#prev-page-btn');
  const nextPageBtn = root.querySelector('#next-page-btn');
  const attemptDetail = root.querySelector('#attempt-detail');
  const closeAttemptDetailBtn = root.querySelector('#close-attempt-detail-btn');
  const drawerBackdrop = root.querySelector('#drawer-backdrop');
  const detailHeading = root.querySelector('#detail-heading');
  const detailMeta = root.querySelector('#detail-meta');
  const detailScores = root.querySelector('#detail-scores');
  const detailIncidents = root.querySelector('#detail-incidents');
  const detailItems = root.querySelector('#detail-items');
  const detailAttemptHistory = root.querySelector('#detail-attempt-history');
  const attemptSkillTabs = root.querySelector('#attempt-skill-tabs');
  const skillSummaryCard = root.querySelector('#skill-summary-card');
  const detailItemsTable = root.querySelector('#detail-items-table');
  const detailItemsBody = root.querySelector('#detail-items-body');
  const itemContextModal = root.querySelector('#item-context-modal');
  const modalItemTitle = root.querySelector('#modal-item-title');
  const modalItemContent = root.querySelector('#modal-item-content');
  const closeItemModalBtn = root.querySelector('#close-item-modal-btn');
  let currentSkillTab = 'all';

  if (closeItemModalBtn && itemContextModal) {
    lifecycle.listen(closeItemModalBtn, 'click', () => {
      itemContextModal.close();
    });
  }

  const saveDraftBtn = root.querySelector('#save-draft-btn');
  const completeGradingBtn = root.querySelector('#complete-grading-btn');
  const publishResultBtn = root.querySelector('#publish-result-btn');
  const draftStatusMsg = root.querySelector('#draft-status-msg');
  const conflictAlert = root.querySelector('#conflict-alert');
  const gradingActionsBar = root.querySelector('#grading-actions-bar');

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
    currentExamRoom = null;
    const showcaseProgressText = root.querySelector('#showcase-progress-text');
    const showcaseProgressBar = root.querySelector('#showcase-progress-bar');
    if (!selectedAssignmentCard) return;
    if (!assignment) {
      currentSelectedAssignment = null;
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
    currentSelectedAssignment = assignment;
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

  let currentAttemptDetail = null;

  const state = readDashboardState(location.href);
  Object.defineProperty(state, 'selectedAssignmentId', {
    get() { return this.assignmentId; },
    set(v) { this.assignmentId = v; },
    enumerable: false,
    configurable: true
  });

  // Sync inputs from initial state
  if (state.q) searchInput.value = state.q;
  if (state.status) statusFilter.value = state.status;
  if (state.minScore) minScoreInput.value = state.minScore;
  if (state.maxScore) maxScoreInput.value = state.maxScore;
  if (state.sortBy) sortBySelect.value = state.sortBy;
  if (state.sortDir) sortDirSelect.value = state.sortDir;

  const loginForm = root.querySelector('#login-form');
  const loginBtn = root.querySelector('#login-btn');
  const loginApiBase = root.querySelector('#login-api-base');
  const loginEmail = root.querySelector('#login-email');
  const loginPhone = root.querySelector('#login-phone');
  const togglePasswordBtn = root.querySelector('#toggle-password-btn');
  const loginError = root.querySelector('#login-error');
  const toggleFixtureBtn = root.querySelector('#toggle-fixture-btn');
  const teacherProfile = root.querySelector('#teacher-profile');
  const teacherProfileName = root.querySelector('#teacher-profile-name');
  const teacherProfileMeta = root.querySelector('#teacher-profile-meta');
  const teacherRoleBadge = root.querySelector('#teacher-role-badge');
  const roleBadgeWrap = root.querySelector('#role-badge-wrap');
  const roleInfoBtn = root.querySelector('#role-info-btn');
  const roleCapabilitiesPopover = root.querySelector('#role-capabilities-popover');
  const closeRolePopoverBtn = root.querySelector('#close-role-popover');
  const popoverRoleTitle = root.querySelector('#popover-role-title');
  const logoutBtn = root.querySelector('#logout-btn');

  let sessionToken = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('izone_teacher_token') || '') : '';
  let examRoomSession = null;
  lifecycle.onDispose(stopExamRoomEvents);
  let currentExamRoom = null;

  const currentLocation = typeof window !== 'undefined' ? window.location : null;
  const currentHost = currentLocation?.hostname || '';
  const isTunnel = currentHost.includes('trycloudflare.com') || currentHost.includes('ngrok') || currentHost.includes('loca.lt');
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(currentHost);
  const standardApiBase = defaultApiBase();

  if (loginApiBase) {
    if (isTunnel) {
      loginApiBase.value = currentLocation.origin;
    } else if (isLocalHost && (!loginApiBase.value || loginApiBase.value.includes('webtest.ducanhdev.com'))) {
      loginApiBase.value = 'http://127.0.0.1:8788';
    } else if (!loginApiBase.value || (!isLocalHost && loginApiBase.value.includes('localhost'))) {
      loginApiBase.value = standardApiBase;
    }
  }
  if (form?.elements?.apiBase) {
    if (isTunnel) {
      form.elements.apiBase.value = currentLocation.origin;
    } else if (isLocalHost && (!form.elements.apiBase.value || form.elements.apiBase.value.includes('webtest.ducanhdev.com'))) {
      form.elements.apiBase.value = 'http://127.0.0.1:8788';
    } else if (!form.elements.apiBase.value || (!isLocalHost && form.elements.apiBase.value.includes('localhost'))) {
      form.elements.apiBase.value = standardApiBase;
    }
  }

  const identity = () => ({ actorId: form?.elements?.actorId?.value || '' });
  const apiBase = () => (loginApiBase?.value || form?.elements?.apiBase?.value || standardApiBase).replace(/\/$/, '');
  const authHeader = () => authHeaders({ token: sessionToken, actorId: form?.elements?.actorId?.value });

  const endSession = () => {
    handleLogout();
    if (loginError) {
      loginError.hidden = false;
      loginError.textContent = 'Phiên làm việc đã kết thúc hoặc không hợp lệ. Vui lòng đăng nhập lại.';
    }
  };

  const request = async (path, options = {}) => {
    const headers = { ...authHeader(), ...(options.headers || {}) };
    const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (options.signal?.aborted || lifecycle.isDisposed()) {
      throw Object.assign(new Error('Request is no longer current.'), { name: 'AbortError' });
    }
    if (response.status === 401 && sessionToken) {
      endSession();
      throw new Error(payload.message || 'Yêu cầu đăng nhập.');
    }
    if (!response.ok) {
      throw Object.assign(new Error(payload.message || 'Không tải được dữ liệu.'), {
        code: payload.error, details: payload.details, status: response.status
      });
    }
    return payload;
  };

  function fillIncidentTimeline(container, rawIncidents) {
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

  async function showExamRoomTimeline(student) {
    const panel = root.querySelector('#exam-room-timeline');
    if (!panel || !student.attemptId || !currentSelectedAssignment) return;
    const query = queryCoordinator?.begin?.('examRoomTimeline');
    if (queryCoordinator && !query) return;

    panel.hidden = false;
    panel.querySelector('h3').textContent = `Timeline sự cố · ${student.name || 'Học viên'}`;
    const content = panel.querySelector('div');
    content.textContent = 'Đang tải timeline sự cố…';
    try {
      const payload = await request(attemptDetailPath(state.classId, currentSelectedAssignment.assignmentId, student.attemptId), {
        signal: query?.signal
      });
      if (query && !query.isCurrent()) return;
      fillIncidentTimeline(content, payload.incidents);
    } catch (error) {
      if (query && (!query.isCurrent() || error.name === 'AbortError')) return;
      content.textContent = `Không tải được timeline sự cố: ${error.message}`;
    }
  }

  const { openGrantRetakeModal } = createGrantRetake({ lifecycle, viewState, scopeState, examRoom, grantRetakeModal, grantRetakeForm, grantRetakeBtn, retakeStudentName, retakeStudentRefInput, retakeReasonInput, retakeAvailableFromInput, retakeExpiresAtInput, cancelGrantRetakeBtn, grantRetakeError, state, apiBase, loadExamRoom, loadAttemptDetail, loadResults });
  const { renderExamRoom } = createExamRoomView({ root, lifecycle, viewState, actions: { showExamRoomTimeline, openGrantRetakeModal } });

  async function loadExamRoom(owner = examRoomSession) {
    if (!currentSelectedAssignment || !state.classId || (owner && !owner.isCurrent())) return;
    const query = queryCoordinator?.begin?.('examRoom');
    if (queryCoordinator && !query) return;

    if (examRoomMessage) examRoomMessage.textContent = 'Đang tải trạng thái Phòng thi…';
    try {
      const payload = await request(assignmentExamRoomPath(state.classId, currentSelectedAssignment.assignmentId), {
        signal: query?.signal
      });
      if ((owner && !owner.isCurrent()) || (query && !query.isCurrent())) return;
      renderExamRoom(payload.room);
      if (examRoomMessage) examRoomMessage.textContent = '';
    } catch (err) {
      if ((owner && !owner.isCurrent()) || (query && (!query.isCurrent() || err.name === 'AbortError'))) return;
      if (examRoomMessage) examRoomMessage.textContent = err.message || 'Lỗi tải trạng thái Phòng thi';
    }
  }

  function stopExamRoomEvents() {
    const previous = examRoomSession;
    examRoomSession = null;
    previous?.dispose();
    queryCoordinator.cancel('examRoom');
    queryCoordinator.cancel('examRoomTimeline');
  }

  function createCurrentRoomSession() {
    stopExamRoomEvents();
    const classId = state.classId;
    const assignmentId = currentSelectedAssignment.assignmentId;
    const path = assignmentExamEventsPath(classId, assignmentId);
    const origin = apiBase();
    const token = sessionToken;
    const session = createExamRoomSession({
      isScopeCurrent: () => !lifecycle.isDisposed() && examRoomSession === session
        && state.classId === classId && currentSelectedAssignment?.assignmentId === assignmentId,
      fetchStream: signal => fetch(`${origin}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' }, signal
      }),
      onUnauthorized: handleLogout,
      refresh: () => loadExamRoom(session),
      onMessage: async message => {
        if (message.event === 'snapshot' && message.data.room) renderExamRoom(message.data.room);
        else if (message.event === 'exam.incident.opened' || message.event === 'exam.incident.closed') {
          currentExamRoom = applyExamIncident(currentExamRoom, message.data);
          if (currentExamRoom) renderExamRoom(currentExamRoom);
        } else if (message.event === 'exam.progress.updated') {
          currentExamRoom = applyExamProgress(currentExamRoom, message.data);
          if (currentExamRoom) renderExamRoom(currentExamRoom);
        } else if (message.event === 'exam.connection.changed') {
          currentExamRoom = applyExamConnection(currentExamRoom, message.data);
          if (currentExamRoom) renderExamRoom(currentExamRoom);
        } else if (message.event !== 'snapshot') await loadExamRoom(session);
      }
    });
    examRoomSession = session;
    return session;
  }

  lifecycle.listen(examRoomOpenButton, 'click', async () => {
    if (!currentSelectedAssignment) return;
    const session = createCurrentRoomSession();
    examRoomReturnToResults = Boolean(results && !results.hidden);
    if (results) results.hidden = true;
    if (examRoom) examRoom.hidden = false;
    await loadExamRoom(session);
    if (session.isCurrent() && sessionToken) session.start();
  });
  lifecycle.listen(examRoomRefreshButton, 'click', () => {
    loadExamRoom().catch(error => { if (examRoomMessage) examRoomMessage.textContent = error.message; });
  });
  lifecycle.listen(examRoomCloseButton, 'click', () => {
    stopExamRoomEvents();
    const panel = root.querySelector('#exam-room-timeline');
    if (panel) panel.hidden = true;
    if (examRoom) examRoom.hidden = true;
    if (examRoomReturnToResults && results) results.hidden = false;
  });
  lifecycle.listen(examRoomStartButton, 'click', async () => {
    if (!currentSelectedAssignment) return;
    examRoomStartButton.disabled = true;
    try {
      await request(assignmentExamStartPath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      await loadExamRoom();
    } catch (error) {
      if (examRoomMessage) examRoomMessage.textContent = error.message;
      examRoomStartButton.disabled = false;
    }
  });
  lifecycle.listen(examRoomExtendButton, 'click', async () => {
    if (!currentSelectedAssignment) return;
    examRoomExtendButton.disabled = true;
    try {
      await request(assignmentExamExtendPath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: Number(examRoomExtensionMinutes?.value) })
      });
    } catch (error) {
      if (examRoomMessage) examRoomMessage.textContent = error.message;
      examRoomExtendButton.disabled = false;
      return;
    }
    loadExamRoom().catch(error => {
      if (examRoomMessage) examRoomMessage.textContent = `Đã gia hạn nhưng chưa tải lại được trạng thái: ${error.message}`;
    });
  });

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
    const lockedAfterExam = !examMode && Boolean(currentSelectedAssignment?.examSession);
    if (selfProctoringToggle) { selfProctoringToggle.checked = enabled; selfProctoringToggle.disabled = Boolean(examMode) || lockedAfterExam; }
    if (selfProctoringLimit) { selfProctoringLimit.value = enabled ? String(exitLimit) : ''; selfProctoringLimit.disabled = !enabled || lockedAfterExam; }
    if (selfProctoringSave) selfProctoringSave.disabled = lockedAfterExam || (!enabled && !selfProctoringToggle?.checked);
    const examReason = examModeLockReason({ exitLimit, examMode, examSession: currentSelectedAssignment?.examSession });
    if (examModeToggle) examModeToggle.disabled = Boolean(examReason);
    const selfReason = selfProctoringLockReason({ examMode, examSession: currentSelectedAssignment?.examSession });
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
    const view = examSwitchView(assignment, { serverNow: currentServerNow });
    examSwitchControls.hidden = !view.visible;
    if (!view.visible) return;
    examSwitchHint.textContent = view.hint;
    examSwitchButton.disabled = examSwitchBusy;
  }
  lifecycle.listen(examSwitchButton, 'click', async () => {
    const target = currentSelectedAssignment;
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
    if (!currentSelectedAssignment) return;
    selfProctoringSave.disabled = true;
    try {
      const body = selfProctoringRequestBody(selfProctoringToggle.checked, selfProctoringLimit.value);
      const payload = await request(assignmentSelfProctoringPath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      currentSelectedAssignment.exitLimit = payload.exitLimit;
      status.textContent = payload.exitLimit === null ? 'Đã tắt Tự giám sát.' : `Đã bật Tự giám sát: thoát quá ${payload.exitLimit} lần thì bài tự nộp.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      updateSelfProctoringUI(currentSelectedAssignment.exitLimit, currentSelectedAssignment.examMode);
    }
  });

  lifecycle.listen(examModeToggle, 'change', async () => {
    if (!currentSelectedAssignment) return;
    examModeToggle.disabled = true;
    try {
      const payload = await request(assignmentExamModePath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: examModeToggle.checked })
      });
      currentSelectedAssignment.examMode = payload.examMode;
      updateExamModeUI(payload.examMode);
      updateSelfProctoringUI(currentSelectedAssignment.exitLimit, payload.examMode);
      if (examRoomOpenButton) examRoomOpenButton.hidden = !payload.examMode;
      if (!payload.examMode && examRoom) examRoom.hidden = true;
      status.textContent = payload.examMode ? 'Exam Mode đã bật. Học viên sẽ chờ giáo viên bắt đầu.' : 'Exam Mode đã tắt.';
    } catch (error) {
      updateExamModeUI(currentSelectedAssignment.examMode);
      status.textContent = error.message;
    } finally {
      examModeToggle.disabled = Boolean(examModeLockReason(currentSelectedAssignment));
    }
  });
  const { ensurePortalPanel, resetPortal } = createPortalPanel({ root, lifecycle, state, request, document, window });
  const setUrl = () => history.replaceState(null, '', assignmentUrl(location.href, state));

  const { renderResults } = createResultsView({ root, lifecycle, state, viewState, actions: { ensurePortalPanel, apiBase, setUrl, loadAttemptDetail, openGrantRetakeModal } });






  const { renderAttemptDetail, showConflictAlert, saveManualGradingDraft, completeManualGrading, publishAttemptResult, closeAttemptDetail } = createAttemptReview({ root, lifecycle, state, viewState, queryCoordinator, actions: { fillIncidentTimeline, loadAttemptDetail, apiBase, authHeader, setUrl, loadResults } });

  async function loadAttemptDetail(classId, assignmentId, attemptId) {
    if (!classId || !assignmentId || !attemptId) {
      queryCoordinator?.cancel?.('attemptDetail');
      if (attemptDetail) {
        attemptDetail.classList.remove('drawer-open');
        attemptDetail.hidden = true;
      }
      if (drawerBackdrop) drawerBackdrop.hidden = true;
      return;
    }
    const query = queryCoordinator?.begin?.('attemptDetail');
    if (queryCoordinator && !query) return;

    status.textContent = 'Đang tải chi tiết bài làm…';
    try {
      const payload = await request(attemptDetailPath(classId, assignmentId, attemptId), {
        signal: query?.signal
      });
      if (query && !query.isCurrent()) return;
      if (state.classId !== classId || state.assignmentId !== assignmentId || state.attemptId !== attemptId) return;

      renderAttemptDetail(payload);
      status.textContent = 'Đã mở chi tiết bài làm';
    } catch (error) {
      if (query && (!query.isCurrent() || error.name === 'AbortError')) return;
      status.textContent = error.message;
    }
  }

  async function loadResults(classId, assignmentId) {
    if (!classId || !assignmentId) {
      queryCoordinator?.cancel?.('results');
      results.hidden = true;
      resultsContent.replaceChildren();
      return;
    }
    const query = queryCoordinator?.begin?.('results');
    if (queryCoordinator && !query) return;

    status.textContent = 'Đang tải bảng kết quả…';
    const queryOptions = {
      q: state.q,
      status: state.status,
      minScore: state.minScore,
      maxScore: state.maxScore,
      skill: state.skill,
      sortBy: state.sortBy,
      sortDir: state.sortDir,
      page: state.page
    };
    try {
      const payload = await request(assignmentResultsPath(classId, assignmentId, queryOptions), {
        signal: query?.signal
      });
      if (query && !query.isCurrent()) return;
      if (state.classId !== classId || state.assignmentId !== assignmentId) return;

      renderResults(payload);
      status.textContent = 'Đã cập nhật bảng kết quả';
    } catch (error) {
      if (query && (!query.isCurrent() || error.name === 'AbortError')) return;
      status.textContent = error.message;
    }
  }

  const { getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, renderReportsView } = createReports({ root, queryCoordinator, authState, document, window, status, viewReports, assessmentTabDistribution, assessmentTabItems, switchAssessmentTab, statusFilter, state, apiBase, authHeader, endSession, request, applyFilterChange });

  async function loadAssignments(classId, selectedAssignmentId = '') {
    const query = queryCoordinator?.begin?.('assignments');
    if (queryCoordinator && !query) return;

    assignments.replaceChildren();
    if (assignmentSelect) {
      assignmentSelect.replaceChildren(new Option('-- Chọn bài test --', ''));
      assignmentSelect.disabled = !classId;
    }
    renderSelectedAssignmentShowcase(null);
    currentAssignmentsList = [];
    await loadResults('', '');
    if (!classId) return;

    status.textContent = 'Đang tải bài được giao…';
    try {
      const payload = await request(`/api/teacher/classes/${encodeURIComponent(classId)}/assignments`, {
        signal: query?.signal
      });
      if (query && !query.isCurrent()) return;
      if (state.classId !== classId && classSelect?.value !== classId) return;

      currentAssignmentsList = payload.assignments || [];
      currentServerNow = payload.serverNow || null;
      let selectedExists = false;

      if (assignmentSelect) {
        assignmentSelect.disabled = false;
        for (const assignment of currentAssignmentsList) {
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

      status.textContent = `${currentAssignmentsList.length} bài được giao`;

      const activeAssignment = currentAssignmentsList.find(a => a.assignmentId === (selectedAssignmentId || state.assignmentId));
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
            console.warn('Attempt detail not found:', err.message);
            state.attemptId = '';
            setUrl();
            const attemptContainer = root.querySelector('#attempt-detail');
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
      if (query && (!query.isCurrent() || error.name === 'AbortError')) return;
      status.textContent = error.message;
    }
  }

  rawClassesList = [];
  currentTeacher = null;

  function updateFilterPillsUI() {
    if (adminCourseFilters) {
      const activeCourse = state.course || 'all';
      adminCourseFilters.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.course === activeCourse);
      });
    }
    if (leadScopeFilters) {
      const activeScope = state.scope || 'all';
      leadScopeFilters.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scope === activeScope);
      });
    }
    if (classStatusFilter) {
      classStatusFilter.value = state.classStatus || '';
    }
    if (classSearchInput) {
      classSearchInput.value = state.classQ || '';
    }
  }

  function renderFilteredClasses() {
    if (!classSelect) return;
    const userClassIds = currentTeacher?.classIds || [];
    const filtered = filterClasses(rawClassesList, {
      course: state.course,
      scope: state.scope,
      classStatus: state.classStatus,
      q: state.classQ,
      userRole: currentTeacher?.role,
      userClassIds
    });

    if (classCountBadge) {
      classCountBadge.textContent = formatClassFilterCountLabel({
        count: filtered.length,
        course: state.course,
        scope: state.scope,
        classStatus: state.classStatus,
        userRole: currentTeacher?.role
      });
    }

    classSelect.replaceChildren(new Option(filtered.length > 0 ? `-- Chọn lớp (${filtered.length}) --` : '-- Không có lớp phù hợp --', ''));
    for (const item of filtered) {
      classSelect.add(new Option(formatClassOptionLabel(item), item.classId));
    }

    const matchingClass = filtered.find(c => c.classId === state.classId);
    if (matchingClass) {
      classSelect.value = state.classId;
    } else {
      classSelect.value = '';
    }

    if (status) {
      status.textContent = `${filtered.length}/${rawClassesList.length} lớp phù hợp bộ lọc`;
    }
  }

  function setupClassFilterToolbar() {
    if (!classFilterToolbar || !currentTeacher) return;
    classFilterToolbar.hidden = false;

    const role = currentTeacher.role;
    if (role === 'admin' || role === 'qm') {
      if (adminCourseFilters) adminCourseFilters.hidden = false;
      if (leadScopeFilters) leadScopeFilters.hidden = true;
    } else if (role === 'lead') {
      if (adminCourseFilters) adminCourseFilters.hidden = true;
      if (leadScopeFilters) {
        leadScopeFilters.hidden = false;
        const allBtn = leadScopeFilters.querySelector('[data-scope="all"]');
        if (allBtn && currentTeacher.courseCodes?.length) {
          allBtn.innerHTML = `${ICONS.classes} <span>Toàn bộ khối</span>`;
        }
      }
    } else {
      if (adminCourseFilters) adminCourseFilters.hidden = true;
      if (leadScopeFilters) leadScopeFilters.hidden = true;
    }

    updateFilterPillsUI();
  }

  if (adminCourseFilters) {
    lifecycle.listen(adminCourseFilters, 'click', event => {
      const pill = event.target.closest('.filter-pill');
      if (!pill) return;
      const course = pill.dataset.course || 'all';
      state.course = course === 'all' ? '' : course;
      setUrl();
      updateFilterPillsUI();
      renderFilteredClasses();
    });
  }

  if (leadScopeFilters) {
    lifecycle.listen(leadScopeFilters, 'click', event => {
      const pill = event.target.closest('.filter-pill');
      if (!pill) return;
      const scope = pill.dataset.scope || 'all';
      state.scope = scope === 'all' ? '' : scope;
      setUrl();
      updateFilterPillsUI();
      renderFilteredClasses();
    });
  }

  if (classStatusFilter) {
    lifecycle.listen(classStatusFilter, 'change', () => {
      state.classStatus = classStatusFilter.value;
      setUrl();
      renderFilteredClasses();
    });
  }

  let classSearchTimeout = null;
  if (classSearchInput) {
    lifecycle.listen(classSearchInput, 'input', () => {
      state.classQ = classSearchInput.value.trim();
      lifecycle.clearTimeout(classSearchTimeout);
      classSearchTimeout = lifecycle.timeout(() => {
        setUrl();
        renderFilteredClasses();
      }, 250);
    });
  }

  async function loadClasses() {
    const query = queryCoordinator?.begin?.('classes');
    if (queryCoordinator && !query) return;

    status.textContent = 'Đang kiểm tra quyền…';
    try {
      const payload = await request('/api/teacher/classes', { signal: query?.signal });
      if (query && !query.isCurrent()) return;
      if (payload.actor) {
        currentTeacher = { ...(currentTeacher || {}), ...payload.actor };
        if (Array.isArray(payload.actor.classIds) && payload.actor.classIds.length > 0) {
          currentTeacher.classIds = payload.actor.classIds;
        }
      }
      rawClassesList = payload.classes || [];
      setupClassFilterToolbar();
      renderFilteredClasses();
      if (query && !query.isCurrent()) return;
      await loadAssignments(classSelect.value, state.assignmentId);
    } catch (error) {
      if (query && (!query.isCurrent() || error.name === 'AbortError')) return;
      status.textContent = error.message;
    }
  }

  // Filter and pagination event handlers
  function applyFilterChange() {
    state.page = 1;
    setUrl();
    loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
  }

  let searchTimeout = null;
  if (searchInput) {
    lifecycle.listen(searchInput, 'input', () => {
      queryCoordinator.cancel('results');
      state.q = searchInput.value.trim();
      lifecycle.clearTimeout(searchTimeout);
      searchTimeout = lifecycle.timeout(applyFilterChange, 300);
    });
  }

  if (statusFilter) {
    lifecycle.listen(statusFilter, 'change', () => {
      state.status = statusFilter.value;
      applyFilterChange();
    });
  }

  if (skillFilter) {
    lifecycle.listen(skillFilter, 'change', () => {
      state.skill = skillFilter.value;
      applyFilterChange();
    });
  }

  if (minScoreInput) {
    lifecycle.listen(minScoreInput, 'change', () => {
      state.minScore = minScoreInput.value;
      applyFilterChange();
    });
  }

  if (maxScoreInput) {
    lifecycle.listen(maxScoreInput, 'change', () => {
      state.maxScore = maxScoreInput.value;
      applyFilterChange();
    });
  }

  if (sortBySelect) {
    lifecycle.listen(sortBySelect, 'change', () => {
      state.sortBy = sortBySelect.value;
      applyFilterChange();
    });
  }

  if (sortDirSelect) {
    lifecycle.listen(sortDirSelect, 'change', () => {
      state.sortDir = sortDirSelect.value;
      applyFilterChange();
    });
  }

  if (resetFiltersBtn) {
    lifecycle.listen(resetFiltersBtn, 'click', () => {
      state.q = '';
      state.status = '';
      state.minScore = '';
      state.maxScore = '';
      state.skill = '';
      state.sortBy = '';
      state.sortDir = 'asc';
      state.page = 1;
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      if (skillFilter) skillFilter.value = '';
      if (minScoreInput) minScoreInput.value = '';
      if (maxScoreInput) maxScoreInput.value = '';
      if (sortBySelect) sortBySelect.value = '';
      if (sortDirSelect) sortDirSelect.value = 'asc';
      setUrl();
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
    });
  }

  let autoSaveTimeout = null;







  if (saveDraftBtn) {
    lifecycle.listen(saveDraftBtn, 'click', () => {
      saveManualGradingDraft(false).catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  if (completeGradingBtn) {
    lifecycle.listen(completeGradingBtn, 'click', () => {
      completeManualGrading().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }



  if (publishResultBtn) {
    lifecycle.listen(publishResultBtn, 'click', () => {
      publishAttemptResult().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }



  if (closeAttemptDetailBtn) {
    lifecycle.listen(closeAttemptDetailBtn, 'click', closeAttemptDetail);
  }
  if (drawerBackdrop) {
    lifecycle.listen(drawerBackdrop, 'click', closeAttemptDetail);
  }
  lifecycle.listen(window, 'keydown', (event) => {
    if (event.key === 'Escape' && attemptDetail && !attemptDetail.hidden) {
      closeAttemptDetail();
    }
  });

  if (refreshBtn) {
    lifecycle.listen(refreshBtn, 'click', () => {
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
    });
  }

  async function publishAllResults() {
    if (!state.classId || !state.assignmentId) return;
    const confirmed = confirm('Bạn có chắc chắn muốn công bố điểm cho toàn bộ học viên đã nộp bài trong bài được giao này không?');
    if (!confirmed) return;

    if (publishAllBtn) {
      publishAllBtn.disabled = true;
      publishAllBtn.textContent = 'Đang công bố…';
    }
    if (status) status.textContent = 'Đang công bố điểm cho toàn bộ học viên…';

    try {
      let success = false;
      let count = 0;
      let msg = '';
      try {
        const payload = await request(assignmentPublishAllPath(state.classId, state.assignmentId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: 'Công bố toàn bộ kết quả' })
        });
        success = true;
        count = payload.publishedCount ?? 0;
        msg = payload.message || `Đã công bố kết quả cho ${count} học viên.`;
      } catch (batchErr) {
        // Fallback: If batch endpoint returned error or 404, fallback to individual publication
        const submittedStudents = (currentResultsPayload?.students || []).filter(
          s => s.attemptId && s.status === 'submitted' && !s.published
        );
        if (submittedStudents.length > 0) {
          await Promise.all(
            submittedStudents.map(s =>
              request(attemptPublishPath(state.classId, state.assignmentId, s.attemptId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: 'Công bố kết quả' })
              })
            )
          );
          success = true;
          count = submittedStudents.length;
          msg = `Đã công bố kết quả cho ${count} học viên.`;
        } else if ((currentResultsPayload?.students || []).some(s => s.attemptId && s.status === 'submitted')) {
          msg = 'Tất cả học viên đã nộp bài đều đã được công bố điểm.';
          success = true;
        } else {
          throw batchErr;
        }
      }

      alert(msg || 'Đã công bố điểm cho toàn bộ học viên thành công!');
      if (status) status.textContent = msg || 'Đã công bố kết quả thành công.';
      await loadResults(state.classId, state.assignmentId);
    } catch (err) {
      alert(`Lỗi khi công bố điểm: ${err.message}`);
      if (status) status.textContent = `Lỗi công bố: ${err.message}`;
    } finally {
      if (publishAllBtn) {
        publishAllBtn.disabled = false;
        publishAllBtn.textContent = 'Công bố toàn bộ điểm';
      }
    }
  }

  if (exportXlsxBtn) {
    lifecycle.listen(exportXlsxBtn, 'click', () => {
      if (!state.classId || !state.assignmentId) return;
      downloadResultsXlsx({
        url: `${apiBase()}${assignmentResultsExportPath(state.classId, state.assignmentId)}`,
        headers: authHeader(),
        button: exportXlsxBtn,
        status,
        onUnauthorized: () => { if (sessionToken) endSession(); }
      });
    });
  }

  if (publishAllBtn) {
    lifecycle.listen(publishAllBtn, 'click', () => {
      publishAllResults().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  if (addStudentBtn) {
    lifecycle.listen(addStudentBtn, 'click', async () => {
      if (!state.classId || !state.assignmentId) return;
      if (addStudentError) {
        addStudentError.hidden = true;
        addStudentError.textContent = '';
      }
      if (eligibleStudentSelect) {
        eligibleStudentSelect.replaceChildren(new Option('-- Chọn học viên --', ''));
        try {
          const res = await request(eligibleStudentsPath(state.classId, state.assignmentId));
          if (res.ok && Array.isArray(res.students)) {
            for (const s of res.students) {
              const opt = new Option(s.discriminator ? `${s.name} · ${s.discriminator}` : s.name, s.studentRef);
              opt.dataset.name = s.name;
              opt.dataset.discriminator = s.discriminator || '';
              opt.dataset.contactId = s.erpStudentContactId || '';
              eligibleStudentSelect.add(opt);
            }
          }
        } catch {
          // ignore error fetching eligible students
        }
      }
      if (addStudentRefInput) addStudentRefInput.value = '';
      if (addStudentNameInput) addStudentNameInput.value = '';
      if (addStudentDiscInput) addStudentDiscInput.value = '';
      if (typeof addStudentModal?.showModal === 'function') {
        addStudentModal.showModal();
      } else if (addStudentModal) {
        addStudentModal.hidden = false;
      }
    });
  }

  if (eligibleStudentSelect) {
    lifecycle.listen(eligibleStudentSelect, 'change', () => {
      const selected = eligibleStudentSelect.selectedOptions[0];
      if (selected && selected.value) {
        if (addStudentRefInput) addStudentRefInput.value = selected.value;
        if (addStudentNameInput) addStudentNameInput.value = selected.dataset.name || '';
        if (addStudentDiscInput) addStudentDiscInput.value = selected.dataset.discriminator || '';
      }
    });
  }

  if (cancelAddStudentBtn) {
    lifecycle.listen(cancelAddStudentBtn, 'click', () => {
      if (typeof addStudentModal?.close === 'function') {
        addStudentModal.close();
      } else if (addStudentModal) {
        addStudentModal.hidden = true;
      }
    });
  }

  if (addStudentForm) {
    lifecycle.listen(addStudentForm, 'submit', async event => {
      event.preventDefault();
      if (!state.classId || !state.assignmentId) return;
      const studentRef = addStudentRefInput?.value.trim();
      const name = addStudentNameInput?.value.trim();
      const discriminator = addStudentDiscInput?.value.trim();
      if (!studentRef || !name) {
        if (addStudentError) {
          addStudentError.hidden = false;
          addStudentError.textContent = 'Vui lòng nhập đầy đủ mã định danh và tên học viên.';
        }
        return;
      }
      try {
        const response = await fetch(`${apiBase()}${assignmentRosterPath(state.classId, state.assignmentId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({ studentRef, name, discriminator })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Không thể thêm học viên.');
        }
        if (typeof addStudentModal?.close === 'function') {
          addStudentModal.close();
        } else if (addStudentModal) {
          addStudentModal.hidden = true;
        }
        await loadResults(state.classId, state.assignmentId);
      } catch (err) {
        if (addStudentError) {
          addStudentError.hidden = false;
          addStudentError.textContent = err.message;
        }
      }
    });
  }



  if (prevPageBtn) {
    lifecycle.listen(prevPageBtn, 'click', () => {
      if ((state.page || 1) > 1) {
        state.page = (state.page || 1) - 1;
        setUrl();
        loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
      }
    });
  }

  if (nextPageBtn) {
    lifecycle.listen(nextPageBtn, 'click', () => {
      state.page = (state.page || 1) + 1;
      setUrl();
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
    });
  }

  const { renderTeacherProfile, toggleRoleCapabilitiesPopover } = createProfilePanel({ root, lifecycle, authState, document, window, loadAndRenderTestStudio, loginForm, loginError, teacherProfile, teacherProfileName, teacherProfileMeta, teacherRoleBadge, roleBadgeWrap, roleInfoBtn, roleCapabilitiesPopover, closeRolePopoverBtn, setupClassFilterToolbar });

  function handleLogout() {
    disposeOwnedBuilder();
    for (const scope of ['sessionRestore', 'classes', 'assignments', 'results', 'attemptDetail', 'testStudio', 'testStudioBuilder', 'examRoom', 'examRoomTimeline', 'reports', 'itemAnalysis']) {
      queryCoordinator.cancel(scope);
    }
    stopExamRoomEvents();
    resetPortal();
    if (roleCapabilitiesPopover) roleCapabilitiesPopover.hidden = true;
    document.body.classList.add('login-page');
    sessionToken = '';
    currentTeacher = null;
    rawClassesList = [];
    if (classFilterToolbar) classFilterToolbar.hidden = true;
    if (classSearchInput) classSearchInput.value = '';
    if (classStatusFilter) classStatusFilter.value = '';
    if (classCountBadge) classCountBadge.textContent = '0 lớp';
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('izone_teacher_token');
      sessionStorage.removeItem('izone_teacher_profile');
    }
    if (teacherProfile) teacherProfile.hidden = true;
    if (loginForm) loginForm.hidden = false;
    if (classSelect) classSelect.replaceChildren(new Option('-- Chọn lớp --', ''));
    if (assignmentSelect) {
      assignmentSelect.replaceChildren(new Option('-- Chọn bài test --', ''));
      assignmentSelect.disabled = true;
    }
    if (selectedAssignmentCard) selectedAssignmentCard.hidden = true;
    currentAssignmentsList = [];
    if (results) results.hidden = true;
    if (resultsContent) resultsContent.replaceChildren();
    if (classSkillSummary) classSkillSummary.replaceChildren();
    if (attemptDetail) {
      attemptDetail.classList.remove('drawer-open');
      attemptDetail.hidden = true;
    }
    if (drawerBackdrop) drawerBackdrop.hidden = true;
    if (detailScores) detailScores.replaceChildren();
    if (detailItemsBody) detailItemsBody.replaceChildren();
    if (detailAttemptHistory) detailAttemptHistory.replaceChildren();
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (skillFilter) skillFilter.value = '';
    if (minScoreInput) minScoreInput.value = '';
    if (maxScoreInput) maxScoreInput.value = '';
    if (sortBySelect) sortBySelect.value = 'submitted_at';
    if (sortDirSelect) sortDirSelect.value = 'desc';

    resetDashboardState(state);
    setUrl();
    if (status) status.textContent = 'Đã đăng xuất. Vui lòng đăng nhập lại.';
  }

  if (togglePasswordBtn && loginPhone) {
    lifecycle.listen(togglePasswordBtn, 'click', () => {
      const isPassword = loginPhone.type === 'password';
      loginPhone.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      togglePasswordBtn.setAttribute('title', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      togglePasswordBtn.setAttribute('aria-pressed', String(isPassword));
    });
  }

  if (loginPhone && loginForm) {
    lifecycle.listen(loginPhone, 'keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (typeof loginForm.requestSubmit === 'function') {
          loginForm.requestSubmit();
        } else {
          loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    });
  }

  if (loginForm) {
    lifecycle.listen(loginForm, 'submit', async event => {
      event.preventDefault();
      if (loginBtn.disabled) return;
      if (loginError) loginError.hidden = true;
      const email = loginEmail?.value.trim() || '';
      const phone = loginPhone?.value.trim() || '';
      if (!email || !phone) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = 'Vui lòng nhập đầy đủ Email và Số điện thoại.';
        }
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Đang đăng nhập…';
      loginForm.setAttribute('aria-busy', 'true');
      try {
        if (status) status.textContent = 'Đang xác thực tài khoản…';
        const response = await fetch(`${apiBase()}${authLoginPath()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Email hoặc số điện thoại không chính xác.');
        }

        sessionToken = payload.token;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('izone_teacher_token', payload.token);
          sessionStorage.setItem('izone_teacher_profile', JSON.stringify(payload.teacher));
        }

        renderTeacherProfile(payload.teacher);
        await loadClasses();
      } catch (err) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = err.message;
        }
        if (status) status.textContent = `Lỗi đăng nhập: ${err.message}`;
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Đăng nhập';
        loginForm.removeAttribute('aria-busy');
      }
    });
  }

  if (logoutBtn) {
    lifecycle.listen(logoutBtn, 'click', async () => {
      stopExamRoomEvents();
      try {
        if (sessionToken) {
          await fetch(`${apiBase()}${authLogoutPath()}`, {
            method: 'POST',
            headers: { ...authHeader() }
          }).catch(() => {});
        }
      } finally {
        handleLogout();
      }
    });
  }

  if (toggleFixtureBtn && form) {
    lifecycle.listen(toggleFixtureBtn, 'click', () => {
      form.hidden = !form.hidden;
    });
  }

  // Restore session on load if present
  if (sessionToken) {
    const cachedProfile = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('izone_teacher_profile') : null;
    if (cachedProfile) {
      try {
        renderTeacherProfile(JSON.parse(cachedProfile));
      } catch {
        // ignore
      }
    }
    const restoreQuery = queryCoordinator.begin('sessionRestore');
    fetch(`${apiBase()}${authMePath()}`, { headers: { ...authHeader() }, signal: restoreQuery.signal })
      .then(async res => {
        if (!restoreQuery.isCurrent()) return;
        if (res.ok) {
          const data = await res.json();
          if (!restoreQuery.isCurrent()) return;
          renderTeacherProfile(data.teacher);
          await loadClasses();
        } else {
          handleLogout();
        }
      })
      .catch(() => {});
  }

  lifecycle.listen(form, 'submit', event => {
    event.preventDefault();
    document.body.classList.remove('login-page');
    loadClasses().catch(error => { status.textContent = error.message; });
  });

  lifecycle.listen(classSelect, 'change', () => {
    queryCoordinator.cancel('classes');
    queryCoordinator.cancel('attemptDetail');
    queryCoordinator.cancel('reports');
    queryCoordinator.cancel('itemAnalysis');
    getReportState().reportData = null;
    getReportState().itemAnalysisData = null;
    getReportState().expandedItemIds.clear();
    state.classId = classSelect.value;
    state.assignmentId = '';
    state.attemptId = '';
    state.page = 1;
    setUrl();
    if (assignmentSelect) {
      assignmentSelect.value = '';
    }
    renderSelectedAssignmentShowcase(null);
    loadAssignments(classSelect.value).catch(error => { status.textContent = error.message; });
  });

  if (assignmentSelect) {
    lifecycle.listen(assignmentSelect, 'change', () => {
      selectAssignment(assignmentSelect.value);
    });
  }

  // Light periodic polling every 30 seconds if visible and active
  lifecycle.interval(() => {
    if (!document.hidden && state.classId && state.assignmentId) {
      loadResults(state.classId, state.assignmentId).catch(() => {});
    }
  }, 30000);

  // Initialize view tab according to current URL hash
  if (typeof window !== 'undefined') {
    updateDashboardTab(window.location.hash || '#dashboard');
  }
}
