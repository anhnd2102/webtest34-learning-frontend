import { createLifecycle } from './lifecycle.js';

import {
  defaultApiBase,
  formatOptionDisplayLetter,
  ICONS,
  renderSvgIcon,
  localStudentUrl,
  readDashboardState,
  readDashboardTab,
  switchDashboardTab,
  assignmentUrl,
  resetDashboardState,
  filterClasses,
  formatClassFilterCountLabel,
  formatClassOptionLabel,
  extractPhase,
  formatAssignmentMeta,
  authLoginPath,
  authLogoutPath,
  authMePath,
  authHeaders,
  teacherRoleLabel,
  assignmentResultsPath,
  assignmentResultsExportPath,
  toggleExportXlsxButton,
  downloadResultsXlsx,
  assignmentExamModePath,
  assignmentSelfProctoringPath,
  examModeLockReason,
  selfProctoringLockReason,
  selfProctoringRequestBody,
  examSwitchRequestBody,
  examSwitchView,
  examSwitchErrorView,
  examSwitchSuccessText,
  incidentCellText,
  assignmentExamRoomPath,
  assignmentExamEventsPath,
  assignmentExamStartPath,
  assignmentExamExtendPath,
  formatExamRoomStatus,
  formatExamReadyCount,
  applyExamProgress,
  applyExamIncident,
  formatExamProgress,
  applyExamConnection,
  formatExamConnectionStatus,
  attemptDetailPath,
  manualGradingDraftPath,
  manualGradingCompletePath,
  attemptPublishPath,
  assignmentPublishAllPath,
  assignmentRosterPath,
  eligibleStudentsPath,
  grantRetakePath,
  courseTestCatalogPath,
  hasActiveUnsavedChanges,
  clearActiveUnsavedChanges,
  openUnsavedChangesModal,
  openCreateTestModal,
  renderCourseTestCatalogView,
  formDraftPath,
  formDetailPath,
  formPublishPath,
  formPublishPreviewPath,
  filterClassesForCourse,
  renderTestBuilderView,
  validateManualGradingScores,
  formatDashboardScore,
  resultStatusLabel,
  attemptStatusLabel,
  verdictLabel,
  formatAssignmentWindow,
  formatCurrentTime,
  formatIncidentTimeline,
  CANONICAL_SKILL_LABELS,
  normalizeSkillCode,
  extractAttemptSkills,
  formatCompactPrompt,
  resolveStudentAnswerDisplay,
  resolveExpectedAnswerDisplay,
  getScoreTier,
  computeClassSkillSummary,
  formatCompactScore,
  formatSubmissionTimestamp,
  getStudentInitials,
  getAvatarColor,
  escapeHtml,
  renderAssignmentChipsView
} from '../app.js';
import { parseSseChunk } from '../exam-room-sse.js';
import {
  portalTestsPath, portalLinkPath, portalSyncPreviewPath, portalSyncPath, portalSyncStatusPath,
  portalSyncErrorView, previewRowView, selectableRefs, syncRequestBody, syncConfirmMessage,
  syncResultView, retryRefs, linkedPortalTest, syncSummaryText, scaleWarningText, selectAllState, shouldReloadPreviewAfterSyncError
} from '../portal-sync-view.js';


const mountedDashboards = new WeakMap();

export function mountDashboard(root = globalThis.document) {
  if (!root?.querySelector || !root.querySelector('#identity-form') || !root.querySelector('#class-select')) {
    throw new Error('Dashboard root must contain the identity form and class selector.');
  }
  const current = mountedDashboards.get(root);
  if (current) return current;
  const view = (root.ownerDocument || root).defaultView;
  const lifecycle = createLifecycle(view?.AbortController || globalThis.AbortController);
  const handle = {
    dispose() {
      lifecycle.dispose();
      if (mountedDashboards.get(root) === handle) mountedDashboards.delete(root);
    }
  };
  mountedDashboards.set(root, handle);
  try {
    initializeDashboard(root, lifecycle);
  } catch (error) {
    handle.dispose();
    throw error;
  }
  return handle;
}

function initializeDashboard(root, lifecycle) {
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
  let currentResultsPayload = null;
  let currentAssignmentsList = [];
  let currentServerNow = null;
  let isSwitchingAssignment = false;
  let currentSelectedAssignment = null;
  let examRoomReturnToResults = false;
  let rawClassesList = [];
  let currentTeacher = null;

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
        if (newTab === 'grading') {
          if (state.assignmentId && state.classId) {
            if (results) results.hidden = false;
            if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = true;
          } else {
            if (results) results.hidden = true;
            if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = false;
          }
        }
        if (newTab === 'test-studio' || newTab === 'exams') {
          loadAndRenderTestStudio();
        }
      }
    });
    return activeTab;
  }

  let currentStudioCourseId = 1;
  async function loadAndRenderTestStudio(targetCourseId = currentStudioCourseId) {
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

    try {
      container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải danh mục bài thi...</p></div>';
      const endpoint = courseTestCatalogPath(currentStudioCourseId);
      const res = await request(endpoint);
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
                renderTestBuilderView(container, {
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
          try {
            container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải dữ liệu bài thi...</p></div>';
            const detailRes = await request(formDetailPath(formVersionId));
            const formObj = detailRes?.formVersion || detailRes?.form;
            if (!detailRes || !formObj) {
              throw new Error(detailRes?.message || 'Không tìm thấy dữ liệu bài thi');
            }

            renderTestBuilderView(container, {
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
            alert('Lỗi tải bài thi: ' + (err.message || 'Lỗi kết nối'));
            loadAndRenderTestStudio(currentStudioCourseId);
          }
        }
      });
    } catch (err) {
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
        if (results) results.hidden = false;
        if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = true;
      } else {
        if (results) results.hidden = true;
        if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = false;
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
  const detailGradingHistory = root.querySelector('#detail-grading-history');
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
  const assignmentLinkBar = root.querySelector('#assignment-link-bar');
  const assignmentStudentUrl = root.querySelector('#assignment-student-url');
  const copyStudentLinkBtn = root.querySelector('#copy-student-link-btn');
  const openStudentLinkBtn = root.querySelector('#open-student-link-btn');

  if (copyStudentLinkBtn) {
    lifecycle.listen(copyStudentLinkBtn, 'click', async () => {
      const url = assignmentStudentUrl?.value;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const originalHtml = copyStudentLinkBtn.innerHTML;
        copyStudentLinkBtn.innerHTML = `${ICONS.check} <span>Đã sao chép!</span>`;
        lifecycle.timeout(() => { copyStudentLinkBtn.innerHTML = originalHtml; }, 2000);
      } catch {
        assignmentStudentUrl?.select();
        document.execCommand('copy');
      }
    });
  }

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
      if (assignmentStudentUrl) assignmentStudentUrl.value = '';
      if (openStudentLinkBtn) openStudentLinkBtn.href = '#';
      if (assignmentLinkBar) assignmentLinkBar.hidden = true;
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

      // Also sync legacy assignmentLinkBar
      if (assignmentStudentUrl) assignmentStudentUrl.value = studentUrl;
      if (openStudentLinkBtn) openStudentLinkBtn.href = studentUrl;
      if (assignmentLinkBar) assignmentLinkBar.hidden = false;
    } else {
      if (showcaseLinkBar) showcaseLinkBar.hidden = true;
      if (assignmentLinkBar) assignmentLinkBar.hidden = true;
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
  let examRoomEventsController = null;
  let currentExamRoom = null;

  const currentLocation = typeof window !== 'undefined' ? window.location : null;
  const currentHost = currentLocation?.hostname || '';
  const isTunnel = currentHost.includes('trycloudflare.com') || currentHost.includes('ngrok') || currentHost.includes('loca.lt');
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(currentHost);
  const standardApiBase = defaultApiBase();

  if (loginApiBase) {
    if (isTunnel) {
      loginApiBase.value = currentLocation.origin;
    } else if (isLocalHost && (!loginApiBase.value || loginApiBase.value.includes('webtest.ducanhn.autos'))) {
      loginApiBase.value = 'http://127.0.0.1:8788';
    } else if (!loginApiBase.value || (!isLocalHost && loginApiBase.value.includes('localhost'))) {
      loginApiBase.value = standardApiBase;
    }
  }
  if (form?.elements?.apiBase) {
    if (isTunnel) {
      form.elements.apiBase.value = currentLocation.origin;
    } else if (isLocalHost && (!form.elements.apiBase.value || form.elements.apiBase.value.includes('webtest.ducanhn.autos'))) {
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
    panel.hidden = false;
    panel.querySelector('h3').textContent = `Timeline sự cố · ${student.name || 'Học viên'}`;
    const content = panel.querySelector('div');
    content.textContent = 'Đang tải timeline sự cố…';
    try {
      const payload = await request(attemptDetailPath(state.classId, currentSelectedAssignment.assignmentId, student.attemptId));
      fillIncidentTimeline(content, payload.incidents);
    } catch (error) {
      content.textContent = `Không tải được timeline sự cố: ${error.message}`;
    }
  }

  function renderExamRoom(room) {
    currentExamRoom = room;
    const roomStatus = ({ waiting: 'Đang chờ', running: 'Đang thi', ended: 'Đã kết thúc' })[room.status] || room.status;
    const deadline = room.deadlineAt ? ` · Hạn ${formatAssignmentWindow(room.deadlineAt, null).split(' → ')[0]}` : '';
    if (examRoomSummary) examRoomSummary.textContent = `${roomStatus} · ${formatExamReadyCount(room)}${deadline}`;
    if (examRoomStudents) {
      examRoomStudents.replaceChildren();
      for (const student of room.students || []) {
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const participation = document.createElement('td');
        const progress = document.createElement('td');
        const connection = document.createElement('td');
        const incidents = document.createElement('td');
        const device = document.createElement('td');
        name.textContent = student.name || '—';
        participation.textContent = formatExamRoomStatus(student.status);
        progress.textContent = formatExamProgress(student.progress);
        connection.textContent = formatExamConnectionStatus(student.connectionStatus);
        const incidentCount = Number(student.incidentCount) || 0;
        const openIncident = (student.openIncidents || []).length > 0;
        incidents.textContent = student.status === 'not_entered' ? '—' : `${incidentCount}${openIncident ? ' · đang rời bài' : ''}`;
        device.textContent = student.fullscreenUnsupported === true ? 'Không hỗ trợ toàn màn hình' : '—';
        // Tô đỏ mọi học viên đã có sự cố (không chỉ lúc đang rời bài) để giáo viên không bỏ sót.
        if (incidentCount > 0 || openIncident) {
          row.className = 'exam-incident-active';
          row.setAttribute('aria-label', `${student.name || 'Học viên'} có ${incidentCount} sự cố Exam Guard`);
        }
        row.append(name, participation, progress, connection, incidents, device);
        if (student.attemptId) {
          row.classList.add('exam-room-clickable');
          row.tabIndex = 0;
          row.title = 'Bấm để xem timeline sự cố';
          lifecycle.listen(row, 'click', () => void showExamRoomTimeline(student));
          lifecycle.listen(row, 'keydown', event => { if (event.key === 'Enter') void showExamRoomTimeline(student); });
        }
        examRoomStudents.append(row);
      }
    }
    if (examRoomStartButton) examRoomStartButton.disabled = room.status !== 'waiting';
    if (examRoomExtendButton) examRoomExtendButton.disabled = room.status !== 'running';
  }

  async function loadExamRoom() {
    if (!currentSelectedAssignment || !state.classId) return;
    if (examRoomMessage) examRoomMessage.textContent = 'Đang tải trạng thái Phòng thi…';
    const payload = await request(assignmentExamRoomPath(state.classId, currentSelectedAssignment.assignmentId));
    renderExamRoom(payload.room);
    if (examRoomMessage) examRoomMessage.textContent = '';
  }

  function stopExamRoomEvents() {
    examRoomEventsController?.abort();
    examRoomEventsController = null;
  }

  async function startExamRoomEvents() {
    stopExamRoomEvents();
    if (!sessionToken || !currentSelectedAssignment || !state.classId) return;
    const controller = new AbortController();
    examRoomEventsController = controller;
    const path = assignmentExamEventsPath(state.classId, currentSelectedAssignment.assignmentId);
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${apiBase()}${path}`, {
          headers: { Authorization: `Bearer ${sessionToken}`, Accept: 'text/event-stream' },
          signal: controller.signal
        });
        if (response.status === 401) {
          handleLogout();
          break;
        }
        if (!response.ok || !response.body) throw new Error('Không kết nối được luồng Phòng thi.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
          buffer = parsed.buffer;
          for (const message of parsed.events) {
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
            } else if (message.event !== 'snapshot') await loadExamRoom();
          }
        }
      } catch (error) {
        if (controller.signal.aborted) break;
      }
      if (!controller.signal.aborted) {
        try { await loadExamRoom(); } catch { /* reconnect below; REST may recover with the stream */ }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  lifecycle.listen(examRoomOpenButton, 'click', async () => {
    if (!currentSelectedAssignment) return;
    examRoomReturnToResults = Boolean(results && !results.hidden);
    if (results) results.hidden = true;
    if (examRoom) examRoom.hidden = false;
    try { await loadExamRoom(); startExamRoomEvents(); }
    catch (error) { if (examRoomMessage) examRoomMessage.textContent = error.message; }
  });
  lifecycle.listen(examRoomRefreshButton, 'click', () => {
    loadExamRoom().catch(error => { if (examRoomMessage) examRoomMessage.textContent = error.message; });
  });
  lifecycle.listen(examRoomCloseButton, 'click', () => {
    stopExamRoomEvents();
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
    if (examModeToggle) examModeToggle.disabled = enabled;
    const examReason = examModeLockReason({ exitLimit });
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
      examModeToggle.disabled = false;
    }
  });
  const setUrl = () => history.replaceState(null, '', assignmentUrl(location.href, state));

  function appendCell(row, value, className = '') {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = value;
    row.append(cell);
  }

  function renderClassSkillSummaryCards(container, payload) {
    container.replaceChildren();
    const summary = computeClassSkillSummary(payload);

    // 1. Class Total Average Card
    const totalCard = document.createElement('div');
    totalCard.className = 'class-summary-card card-total';
    totalCard.innerHTML = `
      <div class="summary-card-header">
        <span class="summary-card-title">Điểm trung bình lớp</span>
      </div>
      <div class="summary-card-score">${summary.totalAverage ? `${summary.totalAverage.earned}/${summary.totalAverage.maximum}` : '—'}</div>
      <div class="summary-card-meta">Đã nộp: ${summary.submittedCount}/${summary.totalStudents} học viên</div>
    `;
    container.append(totalCard);

    // 2. Skill Breakdown Cards
    for (const sk of summary.skills) {
      const card = document.createElement('div');
      card.className = 'class-summary-card';
      card.innerHTML = `
        <div class="summary-card-header">
          <span class="summary-card-title">${escapeHtml(sk.label)}</span>
        </div>
        <div class="summary-card-score">${sk.earned !== null ? `${sk.earned}/${sk.maximum}` : '—'}</div>
        <div class="summary-card-meta">${sk.studentCount} học viên có điểm</div>
      `;
      container.append(card);
    }
  }

  // ---- Đồng bộ điểm Portal: chỉ hiển thị dữ liệu backend trả về, không tính điểm hay luật ở trình duyệt.
  const portalEl = id => root.querySelector(`#${id}`);
  const portal = { key: '', tests: [], link: null, preview: null, sync: new Map(), names: new Map(), lastSync: null, busy: false };

  function portalMessage(text) { portalEl('portal-sync-message').textContent = text || ''; }

  function portalCell(row, text, tone) {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (tone) cell.className = `portal-tone-${tone}`;
    row.append(cell);
  }

  function renderPortalPreview() {
    const box = portalEl('portal-preview');
    const body = portalEl('portal-preview-rows');
    body.replaceChildren();
    const preview = portal.preview;
    box.hidden = !preview;
    if (!preview) return;
    for (const raw of preview.rows) {
      const view = previewRowView(raw);
      const result = portal.sync.has(raw.studentRef) ? syncResultView(portal.sync.get(raw.studentRef)) : null;
      const tr = document.createElement('tr');
      const pick = document.createElement('td');
      const box2 = document.createElement('input');
      box2.type = 'checkbox';
      box2.className = 'portal-pick';
      box2.value = raw.studentRef;
      box2.disabled = !view.selectable;
      box2.checked = view.selectable;
      box2.setAttribute('aria-label', `Chọn ${view.name}`);
      lifecycle.listen(box2, 'change', updatePortalSyncButton);
      pick.append(box2);
      tr.append(pick);
      portalCell(tr, view.name);
      portalCell(tr, view.webtestText);
      portalCell(tr, view.portalText);
      portalCell(tr, view.reasonText ? `${view.statusLabel}: ${view.reasonText}` : view.statusLabel, view.tone);
      portalCell(tr, result ? [result.statusLabel, result.errorText].filter(Boolean).join(': ') : '', result?.tone);
      body.append(tr);
    }
    const writable = preview.mode === 'write';
    portalEl('portal-sync-btn').disabled = !writable;
    portalEl('portal-sync-btn').title = writable ? '' : 'Đang ở chế độ chỉ xem trước.';
    portalEl('portal-retry-btn').hidden = !retryRefs([...portal.sync.values()]).length;
    updatePortalSyncButton();
  }

  const pickedRefs = () => [...root.querySelectorAll('.portal-pick:checked')].map(i => i.value);

  function updatePortalSyncButton() {
    const count = pickedRefs().length;
    const btn = portalEl('portal-sync-btn');
    btn.textContent = count ? `Đồng bộ điểm Portal (${count})` : 'Đồng bộ điểm Portal';
    if (portal.preview?.mode === 'write') btn.disabled = !count || portal.busy;
    const all = portalEl('portal-select-all');
    const state = selectAllState(root.querySelectorAll('.portal-pick:not(:disabled)').length, count);
    Object.assign(all, state);
  }

  // Khóa nút thao tác trong lúc một thao tác Portal đang chạy.
  function applyPortalBusy() {
    for (const id of ['portal-unlink-btn', 'portal-preview-btn', 'portal-retry-btn', 'portal-reload-btn']) portalEl(id).disabled = portal.busy;
    portalEl('portal-link-btn').disabled = portal.busy || !portal.tests.some(t => !t.linkedAssignmentId);
    updatePortalSyncButton();
  }

  function resetPortal() {
    Object.assign(portal, { key: '', tests: [], link: null, preview: null, sync: new Map(), lastSync: null, pending: null });
    const section = portalEl('portal-sync');
    if (section) section.hidden = true;
  }

  function renderPortalLastSync() {
    const last = portal.lastSync;
    portalEl('portal-last-sync').textContent = last
      ? `Lần đồng bộ gần nhất: ${new Date(last.startedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · ${last.actorEmail} · ${syncSummaryText(last.summary)}`
      : '';
  }

  function renderPortalPanel() {
    const linked = portal.link;
    portalEl('portal-sync-link').hidden = !!linked;
    portalEl('portal-sync-linked').hidden = !linked;
    if (linked) portalEl('portal-linked-name').textContent = `${linked.name} (thang ${linked.maxScore})`;
    else {
      const select = portalEl('portal-test-select');
      select.replaceChildren();
      for (const t of portal.tests) {
        const option = document.createElement('option');
        option.value = String(t.portalClassTestId);
        option.textContent = `${t.name} (thang ${t.maxScore})${t.linkedAssignmentId ? ' — đã gắn với đợt khác' : ''}`;
        option.disabled = !!t.linkedAssignmentId;
        select.append(option);
      }
      portalEl('portal-link-btn').disabled = !portal.tests.some(t => !t.linkedAssignmentId);
    }
    renderPortalLastSync();
    renderPortalPreview();
    const warning = portalEl('portal-scale-warning');
    warning.textContent = scaleWarningText(portal.preview?.scaleWarning);
    warning.hidden = !warning.textContent;
    applyPortalBusy();
  }

  async function loadPortalLastSync(key) {
    const { sync } = await request(portalSyncStatusPath(state.classId, state.assignmentId));
    if (portal.key !== key) return;
    portal.lastSync = null;
    if (!sync) return;
    // Backend không trả họ tên trong vết; tên chỉ lấy từ bản xem trước đang hiển thị.
    const summary = {};
    for (const r of sync.rows) summary[r.status] = (summary[r.status] || 0) + 1;
    portal.lastSync = { ...sync, summary };
    for (const r of sync.rows) if (!portal.sync.has(r.studentRef)) portal.sync.set(r.studentRef, r);
  }

  // keepResults: giữ kết quả từng dòng của lần ghi vừa xong khi tải lại bản xem trước (vân tay mới).
  async function loadPortalPreview({ keepResults = false, message = '' } = {}) {
    const key = portal.key;
    portalMessage('Đang xem trước điểm Portal…');
    if (!keepResults) portal.sync = new Map();
    portal.preview = null;
    try {
      const { preview } = await request(portalSyncPreviewPath(state.classId, state.assignmentId));
      if (portal.key !== key) return;
      portal.preview = preview;
      await loadPortalLastSync(key);
      if (portal.key !== key) return;
      portalMessage(message || (preview.mode === 'write' ? '' : 'Chế độ chỉ xem trước: chưa thể ghi điểm sang Portal.'));
    } catch (error) {
      if (portal.key !== key) return;
      portalMessage(portalSyncErrorView(error).message);
    }
    renderPortalPanel();
  }

  async function loadPortalPanel() {
    const section = portalEl('portal-sync');
    if (!section) return;
    const key = `${state.classId}/${state.assignmentId}`;
    portal.key = key;
    portal.link = null; portal.preview = null; portal.tests = []; portal.sync = new Map(); portal.lastSync = null;
    portalEl('portal-sync-link').hidden = true;
    portalEl('portal-sync-linked').hidden = true;
    portalEl('portal-preview').hidden = true;
    portalEl('portal-reload-btn').hidden = true;
    portalEl('portal-last-sync').textContent = '';
    section.hidden = false;
    portalMessage('Đang tải bài test Portal…');
    try {
      const { portalTests } = await request(portalTestsPath(state.classId));
      if (portal.key !== key) return;
      portal.tests = Array.isArray(portalTests) ? portalTests : [];
      const linked = linkedPortalTest(portal.tests, state.assignmentId);
      portal.link = linked ? { name: linked.name, maxScore: linked.maxScore } : null;
      portalMessage(linked ? '' : 'Chưa gắn bài test Portal cho đợt giao bài này.');
      renderPortalPanel();
      if (linked) await loadPortalPreview();
    } catch (error) {
      if (portal.key !== key) return;
      const view = portalSyncErrorView(error);
      portalMessage(view.message);
      renderPortalPanel();
      portalEl('portal-sync-link').hidden = true;
      portalEl('portal-sync-linked').hidden = true;
      // Chỉ chế độ tắt mới ẩn hết điều khiển; lỗi khác cho tải lại và chọn lại đợt sẽ tự tải lại.
      if (!view.disabled) { portal.key = ''; portalEl('portal-reload-btn').hidden = false; }
    }
  }

  function ensurePortalPanel() {
    if (!state.classId || !state.assignmentId) { portalEl('portal-sync').hidden = true; portal.key = ''; return; }
    if (portal.key !== `${state.classId}/${state.assignmentId}`) loadPortalPanel();
  }

  async function runPortalAction(action) {
    if (portal.busy) return;
    portal.busy = true;
    applyPortalBusy();
    try { await action(); } catch (error) { portalMessage(portalSyncErrorView(error).message); } finally { portal.busy = false; applyPortalBusy(); }
  }

  async function doPortalSync(refs) {
    const preview = portal.preview;
    const key = portal.key;
    portalMessage('Đang ghi điểm sang Portal và đọc lại để xác nhận…');
    let sync;
    try {
      ({ sync } = await request(portalSyncPath(state.classId, state.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncRequestBody(preview.fingerprint, refs))
      }));
    } catch (error) {
      if (!shouldReloadPreviewAfterSyncError(error)) throw error;
      // Không giữ vân tay cũ: tải lại bản xem trước và kết quả lần đồng bộ gần nhất.
      const suffix = error.code === 'PORTAL_PREVIEW_STALE' ? '' : ' Kết quả ghi chưa rõ, hãy kiểm tra lại bên dưới.';
      await loadPortalPreview({ message: `${portalSyncErrorView(error).message}${suffix}` });
      return;
    }
    if (portal.key !== key) return;
    portal.sync = new Map(sync.rows.map(r => [r.studentRef, r]));
    const text = syncSummaryText(sync.summary);
    // Lần ghi vừa xong làm vân tay cũ hết hiệu lực: tải lại bản xem trước, giữ kết quả từng dòng.
    await loadPortalPreview({ keepResults: true, message: sync.stopped ? `Đã dừng: ${portalSyncErrorView({ code: sync.stopped }).message} ${text}` : text });
  }

  function askPortalConfirm(refs) {
    const dialog = portalEl('portal-sync-confirm');
    portalEl('portal-sync-confirm-text').textContent = syncConfirmMessage(refs.length);
    portal.pending = refs;
    dialog.showModal();
  }

  lifecycle.listen(portalEl('portal-link-btn'), 'click', () => runPortalAction(async () => {
    const id = Number(portalEl('portal-test-select').value);
    if (!id) return;
    await request(portalLinkPath(state.classId, state.assignmentId), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClassTestId: id })
    });
    portal.key = '';
    await loadPortalPanel();
  }));
  lifecycle.listen(portalEl('portal-unlink-btn'), 'click', () => runPortalAction(async () => {
    if (!window.confirm('Gỡ gắn bài test Portal khỏi đợt giao bài này?')) return;
    await request(portalLinkPath(state.classId, state.assignmentId), { method: 'DELETE' });
    portal.key = '';
    await loadPortalPanel();
  }));
  lifecycle.listen(portalEl('portal-preview-btn'), 'click', () => runPortalAction(loadPortalPreview));
  lifecycle.listen(portalEl('portal-reload-btn'), 'click', () => runPortalAction(loadPortalPanel));
  lifecycle.listen(portalEl('portal-select-all'), 'change', event => {
    root.querySelectorAll('.portal-pick:not(:disabled)').forEach(i => { i.checked = event.target.checked; });
    updatePortalSyncButton();
  });
  lifecycle.listen(portalEl('portal-sync-btn'), 'click', () => { const refs = pickedRefs(); if (refs.length) askPortalConfirm(refs); });
  lifecycle.listen(portalEl('portal-retry-btn'), 'click', () => runPortalAction(async () => {
    const wanted = new Set(retryRefs([...portal.sync.values()]));
    await loadPortalPreview();   // vân tay mới; chỉ dòng còn "Điền được" mới thử lại được
    const refs = selectableRefs(portal.preview?.rows || []).filter(r => wanted.has(r));
    if (refs.length) askPortalConfirm(refs); else portalMessage('Không còn dòng nào có thể thử lại.');
  }));
  lifecycle.listen(portalEl('portal-sync-cancel'), 'click', () => portalEl('portal-sync-confirm').close());
  lifecycle.listen(portalEl('portal-sync-confirm-btn'), 'click', event => {
    event.preventDefault();
    portalEl('portal-sync-confirm').close();
    runPortalAction(() => doPortalSync(portal.pending || []));
  });

  function renderResults(payload) {
    toggleExportXlsxButton(exportXlsxBtn, payload?.assignment ? state.assignmentId : '');
    if (!payload || !payload.assignment) {
      if (results) results.hidden = true;
      if (resultsContent) resultsContent.replaceChildren();
      return;
    }
    currentResultsPayload = payload;
    ensurePortalPanel();
    resultsContent.replaceChildren();
    if (assignmentHeading) assignmentHeading.textContent = payload.assignment.title;
    if (assignmentMeta) {
      const meta = formatAssignmentMeta({
        className: payload.assignment.className,
        courseCode: payload.assignment.courseCode,
        phase: payload.assignment.phase,
        title: payload.assignment.title
      });
      const parts = [meta.classLabel, meta.courseLabel];
      if (meta.phaseLabel) parts.push(meta.phaseLabel);
      parts.push(`Phiên bản ${payload.assignment.formVersion}`);
      assignmentMeta.textContent = parts.join(' · ');
    }

    if (assignmentLinkBar) {
      const currentApi = typeof apiBase === 'function' ? apiBase() : '';
      const studentUrl = localStudentUrl(payload.assignment?.studentUrl, currentLocation, currentApi);
      if (studentUrl) {
        assignmentLinkBar.hidden = false;
        if (assignmentStudentUrl) assignmentStudentUrl.value = studentUrl;
        if (openStudentLinkBtn) openStudentLinkBtn.href = studentUrl;
      } else {
        assignmentLinkBar.hidden = true;
      }
    }

    // Update showcase progress bar
    const showcaseProgressText = root.querySelector('#showcase-progress-text');
    const showcaseProgressBar = root.querySelector('#showcase-progress-bar');
    if (showcaseProgressText && showcaseProgressBar) {
      const students = payload.students || [];
      const totalStudents = students.length;
      const submittedStudents = students.filter(s => s.status === 'submitted' || s.attemptId).length;
      const pct = totalStudents > 0 ? Math.round((submittedStudents / totalStudents) * 100) : 0;
      showcaseProgressText.textContent = `${submittedStudents}/${totalStudents} học viên (${pct}%)`;
      showcaseProgressBar.style.width = `${pct}%`;
    }

    // Render Class Skill Performance Summary Bar
    if (classSkillSummary) {
      renderClassSkillSummaryCards(classSkillSummary, payload);
    }

    // Populate skill filter dropdown if needed
    if (skillFilter) {
      const currentSkill = skillFilter.value;
      skillFilter.replaceChildren(new Option('Tổng điểm', ''));
      for (const skill of payload.skills) {
        const normCode = normalizeSkillCode(skill.code);
        const label = CANONICAL_SKILL_LABELS[normCode] || skill.code.toUpperCase();
        skillFilter.add(new Option(`Kỹ năng: ${label}`, skill.code));
      }
      skillFilter.value = state.skill || currentSkill || '';
    }

    const maxTotal = payload.students.find(s => s.total?.maximum)?.total?.maximum
      || (payload.skills.length > 0 ? payload.skills.reduce((acc, s) => acc + (Number(s.maximum) || 0), 0) : 100);

    function createScoreHeader(label, maximum) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = 'th-score';
      th.innerHTML = `
        <div class="th-score-wrap">
          <span class="th-score-label">${escapeHtml(label)}</span>
          ${maximum ? `<span class="th-score-max">(/${escapeHtml(maximum)})</span>` : ''}
        </div>
      `;
      return th;
    }

    function createTextHeader(label) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      return th;
    }

    const scroll = document.createElement('div');
    scroll.className = 'results-scroll';
    const table = document.createElement('table');
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headerRow.append(createTextHeader('Học viên'));
    headerRow.append(createTextHeader('Trạng thái'));
    headerRow.append(createScoreHeader('Tổng điểm', maxTotal));
    for (const skill of payload.skills) {
      const code = skill.code || '';
      const normCode = normalizeSkillCode(code);
      const label = CANONICAL_SKILL_LABELS[normCode] || (code.charAt(0).toUpperCase() + code.slice(1));
      headerRow.append(createScoreHeader(label, skill.maximum));
    }
    headerRow.append(createTextHeader('Sự cố'));
    headerRow.append(createTextHeader('Nộp lúc'));
    headerRow.append(createTextHeader('Thao tác'));
    head.append(headerRow);
    const body = document.createElement('tbody');

    const totalColumns = 5 + payload.skills.length;
    if (payload.students.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = totalColumns;
      emptyCell.className = 'empty-results';
      emptyCell.textContent = 'Không tìm thấy học viên nào phù hợp với bộ lọc.';
      emptyRow.append(emptyCell);
      body.append(emptyRow);
    } else {
      for (const student of payload.students) {
        const row = document.createElement('tr');

        // 1. Name Cell with Initials Avatar & Student Email (Stitch Gradebook Experience)
        const nameCell = document.createElement('td');
        nameCell.className = 'student-cell';
        const initials = getStudentInitials(student.name);
        const studentEmail = student.email || student.studentEmail || '';
        const avatarColor = getAvatarColor(studentEmail || student.name);

        nameCell.innerHTML = `
          <div class="student-cell-wrap">
            <div class="student-avatar" style="background-color: ${avatarColor.bg}; color: ${avatarColor.text}; border-color: ${avatarColor.border};" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="student-info">
              <span class="student-name">${escapeHtml(student.name)}</span>
              ${studentEmail ? `<span class="student-email">${escapeHtml(studentEmail)}</span>` : ''}
              ${student.leftClass ? `<span class="badge-left-class">Không còn trong lớp</span>` : ''}
            </div>
          </div>
        `;
        row.append(nameCell);

        // 2. Status Cell (wrapped in status-cell-wrap to prevent table cell collapse)
        const statusCell = document.createElement('td');
        const statusWrap = document.createElement('div');
        statusWrap.className = 'status-cell-wrap';
        const statusSpan = document.createElement('span');
        statusSpan.className = `result-status ${student.status}`;
        statusSpan.textContent = resultStatusLabel(student.status);
        const pubSpan = document.createElement('span');
        pubSpan.className = `badge-pub ${student.published ? 'is-pub' : ''}`;
        pubSpan.textContent = student.published ? 'Đã công bố' : 'Chưa công bố';
        statusWrap.append(statusSpan, pubSpan);
        statusCell.append(statusWrap);
        row.append(statusCell);

        // 3. Total Score Cell: Bold, larger text, direct tier text color, NO badge
        const totalCell = document.createElement('td');
        totalCell.className = 'score-cell';
        if (student.total && student.total.earned !== null && student.total.earned !== undefined) {
          const totalTier = getScoreTier(student.total.earned, student.total.maximum);
          const scoreVal = formatCompactScore(student.total);
          totalCell.innerHTML = `<span class="score-total ${totalTier || ''}">${escapeHtml(scoreVal)}</span>`;
        } else if (student.total?.status === 'pending') {
          totalCell.innerHTML = `<span class="score-total">Chờ chấm</span>`;
        } else {
          totalCell.innerHTML = `<span class="score-total">—</span>`;
        }
        row.append(totalCell);

        // 4. Per-Skill Score Cells: Standard normal font, only earned score number, NO tier badge
        for (const skill of payload.skills) {
          const skillCell = document.createElement('td');
          skillCell.className = 'score-cell';
          const skScore = student.skills?.[skill.code];
          const skVal = formatCompactScore(skScore);
          skillCell.innerHTML = `<span class="score-skill">${escapeHtml(skVal)}</span>`;
          row.append(skillCell);
        }

        const incidentCell = document.createElement('td');
        incidentCell.textContent = incidentCellText(student);
        row.append(incidentCell);

        // 5. Submitted At Cell: Two-line layout (Line 1: Time, Line 2: Date)
        const submittedCell = document.createElement('td');
        const ts = formatSubmissionTimestamp(student.submittedAt);
        if (ts) {
          submittedCell.innerHTML = `
            <div class="time-stamp-wrap">
              <span class="time-part">${escapeHtml(ts.time)}</span>
              <span class="date-part">${escapeHtml(ts.date)}</span>
            </div>
          `;
        } else {
          submittedCell.textContent = '—';
        }
        row.append(submittedCell);

        // 6. Action Cell
        const actionCell = document.createElement('td');
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'table-actions';
        if (student.attemptId) {
          const detailBtn = document.createElement('button');
          detailBtn.type = 'button';
          detailBtn.className = 'btn-secondary btn-sm btn-view-attempt';
          detailBtn.innerHTML = `${ICONS.view} <span>Xem bài</span>`;
          detailBtn.title = 'Xem chi tiết bài làm';
          lifecycle.listen(detailBtn, 'click', () => {
            state.attemptId = student.attemptId;
            setUrl();
            loadAttemptDetail(state.classId, state.assignmentId, student.attemptId).catch(err => {
              status.textContent = err.message;
            });
          });
          actionsGroup.append(detailBtn);
        }
        const retakeBtn = document.createElement('button');
        retakeBtn.type = 'button';
        retakeBtn.className = 'btn-secondary btn-sm btn-retake';
        retakeBtn.innerHTML = `${ICONS.rotate} <span>Làm lại</span>`;
        retakeBtn.title = 'Cấp quyền làm lại bài thi';
        lifecycle.listen(retakeBtn, 'click', () => {
          openGrantRetakeModal({
            studentRef: student.studentRef,
            studentName: student.name,
            discriminator: student.discriminator
          });
        });
        actionsGroup.append(retakeBtn);
        actionCell.append(actionsGroup);
        row.append(actionCell);

        body.append(row);
      }
    }
    table.append(head, body);
    scroll.append(table);
    resultsContent.append(scroll);

    // Update pagination controls
    const pagination = payload.pagination || { page: 1, pageSize: 25, totalItems: payload.students.length, totalPages: 1 };
    if (paginationInfo) {
      paginationInfo.textContent = `Trang ${pagination.page} / ${pagination.totalPages || 1} (Tổng cộng ${pagination.totalItems} học viên)`;
    }
    if (prevPageBtn) prevPageBtn.disabled = pagination.page <= 1;
    if (nextPageBtn) nextPageBtn.disabled = pagination.page >= pagination.totalPages || pagination.totalPages === 0;

    // Update last updated timestamp
    if (lastUpdated) {
      lastUpdated.textContent = `Cập nhật lúc ${formatCurrentTime()} (Asia/Ho_Chi_Minh)`;
    }

    results.hidden = false;
  }

  function renderAttemptDetail(payload) {
    if (!attemptDetail) return;
    if (detailHeading) {
      const email = payload.student.studentEmail || payload.student.email;
      detailHeading.textContent = `${payload.student.name}${email ? ' · ' + email : ''}`;
    }

    if (detailMeta) {
      detailMeta.replaceChildren();
      const badges = [
        `Lớp: ${payload.class.name} (${payload.class.courseCode})`,
        `Bài: ${payload.assignment.title}`,
        `Phiên bản đề: ${payload.attempt.formVersion}`,
        `Trạng thái: ${attemptStatusLabel(payload.attempt.status)}`,
        `Sự cố: ${payload.incidentCount ?? payload.incidents?.length ?? 0}`,
        `Bắt đầu: ${payload.attempt.startedAt ? formatAssignmentWindow(payload.attempt.startedAt, null).split(' → ')[0] : '—'}`,
        `Nộp lúc: ${payload.attempt.submittedAt ? formatAssignmentWindow(payload.attempt.submittedAt, null).split(' → ')[0] : 'Chưa nộp'}`
      ];
      for (const text of badges) {
        const badge = document.createElement('span');
        badge.className = 'meta-badge';
        badge.textContent = text;
        detailMeta.append(badge);
      }
      const pubBadge = document.createElement('span');
      pubBadge.className = `meta-badge ${payload.attempt.publication?.published ? 'badge-published' : 'badge-unpub'}`;
      pubBadge.textContent = payload.attempt.publication?.published
        ? `Đã công bố (${payload.attempt.publication.publishedBy || ''})`
        : 'Chưa công bố';
      detailMeta.append(pubBadge);

      if (payload.student.leftClass) {
        const leftBadge = document.createElement('span');
        leftBadge.className = 'meta-badge badge-left-class';
        leftBadge.textContent = 'Không còn trong lớp';
        detailMeta.append(leftBadge);
      }

      if (payload.retakeGrant) {
        const retakeBadge = document.createElement('span');
        retakeBadge.className = 'meta-badge';
        retakeBadge.style.background = '#f3e8ff';
        retakeBadge.style.color = '#6b21a8';
        retakeBadge.textContent = `Quyền làm lại: ${resultStatusLabel(payload.retakeGrant.status)}`;
        detailMeta.append(retakeBadge);
      }
    }


    if (detailScores) {
      detailScores.replaceChildren();
      const totalCard = document.createElement('div');
      totalCard.className = 'score-card total-card';
      totalCard.innerHTML = `<strong>Tổng điểm</strong><span class="score-val">${formatDashboardScore(payload.scores.total)}</span>`;
      detailScores.append(totalCard);

      for (const skill of payload.skills) {
        const skillScore = payload.scores.skills?.[skill.code];
        const card = document.createElement('div');
        card.className = 'score-card';
        card.innerHTML = `<strong>${skill.code.toUpperCase()}</strong><span class="score-val">${formatDashboardScore(skillScore)}</span>`;
        detailScores.append(card);
      }
    }

    if (detailIncidents) fillIncidentTimeline(detailIncidents, payload.incidents);

    if (detailAttemptHistory) {
      detailAttemptHistory.replaceChildren();
      if (payload.attemptHistory && payload.attemptHistory.length > 0) {
        const historyTable = document.createElement('table');
        historyTable.className = 'mini-table';
        historyTable.innerHTML = `
          <thead>
            <tr>
              <th>Lần làm bài</th>
              <th>Phiên bản đề</th>
              <th>Trạng thái</th>
              <th>Bắt đầu</th>
              <th>Nộp lúc</th>
            </tr>
          </thead>
        `;
        const hBody = document.createElement('tbody');
        for (const att of payload.attemptHistory) {
          const hRow = document.createElement('tr');
          if (att.isCurrent) hRow.className = 'current-attempt-row';
          const label = att.isCurrent ? `${att.attemptId.slice(0, 8)}… (Hiện tại)` : `${att.attemptId.slice(0, 8)}…`;
          hRow.innerHTML = `
            <td>${label}</td>
            <td>Phiên bản ${att.formVersion}</td>
            <td><span class="result-status ${att.status}">${attemptStatusLabel(att.status)}</span></td>
            <td>${att.startedAt ? formatAssignmentWindow(att.startedAt, null).split(' → ')[0] : '—'}</td>
            <td>${att.submittedAt ? formatAssignmentWindow(att.submittedAt, null).split(' → ')[0] : '—'}</td>
          `;
          hBody.append(hRow);
        }
        historyTable.append(hBody);
        detailAttemptHistory.append(historyTable);
      } else {
        detailAttemptHistory.textContent = 'Không có lịch sử lần làm nào khác.';
      }
    }

    if (detailGradingHistory) {
      detailGradingHistory.replaceChildren();
      if (payload.gradingHistory && payload.gradingHistory.length > 0) {
        const gTable = document.createElement('table');
        gTable.className = 'mini-table';
        gTable.innerHTML = `
          <thead>
            <tr>
              <th>Lượt chấm</th>
              <th>Phiên bản chấm</th>
              <th>Trạng thái</th>
              <th>Bắt đầu</th>
              <th>Hoàn tất</th>
            </tr>
          </thead>
        `;
        const gBody = document.createElement('tbody');
        for (const run of payload.gradingHistory) {
          const gRow = document.createElement('tr');
          gRow.innerHTML = `
            <td>${run.gradingRunId.slice(0, 8)}…</td>
            <td>v${run.graderVersion}</td>
            <td><span class="result-status ${run.status}">${resultStatusLabel(run.status)}</span></td>
            <td>${run.startedAt ? formatAssignmentWindow(run.startedAt, null).split(' → ')[0] : '—'}</td>
            <td>${run.completedAt ? formatAssignmentWindow(run.completedAt, null).split(' → ')[0] : '—'}</td>
          `;
          gBody.append(gRow);
        }
        gTable.append(gBody);
        detailGradingHistory.append(gTable);
      } else {
        detailGradingHistory.textContent = 'Chưa có thông tin lượt chấm.';
      }
    }

    currentAttemptDetail = payload;
    if (conflictAlert) {
      conflictAlert.hidden = true;
      conflictAlert.replaceChildren();
    }

    if (draftStatusMsg) {
      if (payload.manualGrading?.status === 'completed') {
        draftStatusMsg.textContent = 'Bài làm đã hoàn tất chấm điểm.';
        if (saveDraftBtn) saveDraftBtn.disabled = true;
        if (completeGradingBtn) completeGradingBtn.disabled = true;
      } else if (payload.manualGrading?.revision > 0) {
        draftStatusMsg.textContent = `Bản nháp phiên bản ${payload.manualGrading.revision} (lưu lúc ${payload.manualGrading.updatedAt ? formatAssignmentWindow(payload.manualGrading.updatedAt, null).split(' → ')[0] : '—'})`;
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        if (completeGradingBtn) completeGradingBtn.disabled = false;
      } else {
        draftStatusMsg.textContent = 'Chưa có bản nháp nào được lưu.';
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        if (completeGradingBtn) completeGradingBtn.disabled = false;
      }
    }

    if (gradingActionsBar) gradingActionsBar.hidden = false;

    function openItemContextModal(item) {
      if (!itemContextModal || !modalItemContent) return;
      if (modalItemTitle) {
        const skillLabel = item.primarySkill ? ` · ${item.primarySkill.toUpperCase()}` : '';
        modalItemTitle.textContent = `Câu ${item.position}${skillLabel}`;
      }
      modalItemContent.replaceChildren();

      // 1. Prompt Block
      const promptBlock = document.createElement('div');
      promptBlock.className = 'modal-ctx-block';
      promptBlock.innerHTML = `
        <h4>Đề bài / Yêu cầu chi tiết</h4>
        <div style="font-size: 0.95rem; line-height: 1.5; color: #1e293b; white-space: pre-wrap;">${escapeHtml(item.prompt || '—')}</div>
        ${item.helpText ? `<p style="margin: 6px 0 0; font-size: 0.88rem; color: #64748b; font-style: italic;">${escapeHtml(item.helpText)}</p>` : ''}
      `;
      modalItemContent.append(promptBlock);

      // 2. Options List (if options exist)
      if (Array.isArray(item.options) && item.options.length > 0) {
        const optBlock = document.createElement('div');
        optBlock.className = 'modal-ctx-block';
        const optTitle = document.createElement('h4');
        optTitle.textContent = `Danh sách lựa chọn / Từ vựng (${item.options.length})`;
        optBlock.append(optTitle);

        const ul = document.createElement('ul');
        ul.className = 'modal-options-list';
        for (let optIdx = 0; optIdx < item.options.length; optIdx++) {
          const opt = item.options[optIdx];
          const li = document.createElement('li');
          const isSelected = item.studentAnswer === opt.id || (Array.isArray(item.studentAnswer) && item.studentAnswer.includes(opt.id));
          const isExpected = item.expectedAnswer === opt.id || item.expectedOptionId === opt.id || (Array.isArray(item.expectedOptionIds) && item.expectedOptionIds.includes(opt.id));
          const letter = formatOptionDisplayLetter(opt.id, optIdx);

          li.className = 'modal-options-item';
          if (isExpected) {
            li.classList.add('is-correct-key');
          } else if (isSelected) {
            li.classList.add('is-wrong-selection');
          }

          let badgeHtml = '';
          if (isExpected && isSelected) {
            badgeHtml = `<span class="opt-tag tag-correct">${renderSvgIcon('check', 'icon-inline')} <span>Đáp án đúng · Học viên chọn</span></span>`;
          } else if (isExpected) {
            badgeHtml = `<span class="opt-tag tag-expected">${renderSvgIcon('check', 'icon-inline')} <span>Đáp án chuẩn</span></span>`;
          } else if (isSelected) {
            badgeHtml = `<span class="opt-tag tag-wrong">${renderSvgIcon('close', 'icon-inline')} <span>Học viên chọn sai</span></span>`;
          }

          li.innerHTML = `<span class="opt-letter font-bold">${letter}.</span> <span class="opt-text">${escapeHtml(opt.label || opt.id)}</span> ${badgeHtml}`;
          ul.append(li);
        }
        optBlock.append(ul);
        modalItemContent.append(optBlock);
      }

      // 3. Student Answer Block
      const ansBlock = document.createElement('div');
      ansBlock.className = 'modal-ctx-block';
      const ansStudent = resolveStudentAnswerDisplay(item);
      ansBlock.innerHTML = `
        <h4>Bài làm của học viên</h4>
        <div style="font-size: 0.95rem; font-weight: 600; color: #0f172a;">${escapeHtml(ansStudent)}</div>
      `;
      modalItemContent.append(ansBlock);

      // 4. Expected Answer & Feedback
      const expBlock = document.createElement('div');
      expBlock.className = 'modal-ctx-block';
      const ansExpected = resolveExpectedAnswerDisplay(item);
      const fbLines = [];
      if (item.feedback) {
        if (Number.isFinite(item.feedback.structureScore)) fbLines.push(`Điểm cấu trúc: ${item.feedback.structureScore}`);
        if (Number.isFinite(item.feedback.accuracyScore)) fbLines.push(`Điểm chính xác: ${item.feedback.accuracyScore}`);
        if (Array.isArray(item.feedback.evidence) && item.feedback.evidence.length > 0) fbLines.push(`Nhận xét: ${item.feedback.evidence.join('; ')}`);
        if (Array.isArray(item.feedback.errors) && item.feedback.errors.length > 0) fbLines.push(`Lỗi: ${item.feedback.errors.map(e => e.message || e.code).join(', ')}`);
      }
      expBlock.innerHTML = `
        <h4>Đáp án mẫu & Tiêu chí Rubric</h4>
        <div style="font-size: 0.95rem; font-weight: 600; color: #0369a1; margin-bottom: 6px;">${escapeHtml(ansExpected)}</div>
        ${fbLines.length > 0 ? `<p style="margin: 0; font-size: 0.88rem; color: #92400e; background: #fffbeb; padding: 8px 12px; border-radius: 6px;">${escapeHtml(fbLines.join(' · '))}</p>` : ''}
      `;
      modalItemContent.append(expBlock);

      itemContextModal.showModal();
    }

    function renderAttemptTableRows(tabCode = 'all') {
      if (!detailItemsBody || !currentAttemptDetail) return;
      detailItemsBody.replaceChildren();

      const items = currentAttemptDetail.items;
      const { sections } = extractAttemptSkills(items);
      const filteredSections = tabCode === 'all'
        ? sections
        : sections.filter(s => s.skillCode === tabCode);

      for (const section of filteredSections) {
        // Render Section Header Row
        const secTr = document.createElement('tr');
        secTr.className = 'section-header-row';
        secTr.innerHTML = `
          <td colspan="8">
            <div class="sec-header-wrap">
              <span class="sec-header-title">${ICONS.book} <span>${escapeHtml(section.title)}</span></span>
              <div class="sec-header-badges">
                <span class="sec-header-score">${section.scoreEarned}/${section.maxScore} điểm</span>
                <span class="sec-header-count">(${section.correctCount}/${section.totalItems} câu đúng)</span>
                ${section.needsReviewCount > 0 ? `<span class="sec-header-review">${section.needsReviewCount} câu cần duyệt</span>` : ''}
              </div>
            </div>
          </td>
        `;
        detailItemsBody.append(secTr);

        for (const item of section.items) {
          const tr = document.createElement('tr');
          if (item.needsReview) tr.className = 'row-needs-review';

          // 1. # Column (compact question number, no internal tech badges)
          const tdPos = document.createElement('td');
          tdPos.className = 'col-pos-cell';
          tdPos.innerHTML = `<span class="q-pos-num">#${item.position}</span>`;
          tr.append(tdPos);

          // 2. Prompt Column
          const tdPrompt = document.createElement('td');
          const compactPrompt = formatCompactPrompt(item);
          const optBtnHtml = compactPrompt.hasExtensiveOptions
            ? `<button type="button" class="prompt-opt-btn" data-item-id="${item.itemVersionId}">${ICONS.clipboard} <span>Xem danh sách từ (${compactPrompt.optionsCount})</span></button>`
            : '';
          tdPrompt.innerHTML = `
            <div class="prompt-compact">
              <div class="prompt-preview-text" title="${escapeHtml(compactPrompt.text)}">${escapeHtml(compactPrompt.text)}</div>
              ${item.helpText ? `<small style="color:#64748b; display:block;">${escapeHtml(item.helpText)}</small>` : ''}
              ${optBtnHtml}
            </div>
          `;
          tr.append(tdPrompt);

          // 3. Student Answer Column
          const tdStudent = document.createElement('td');
          const studentAnsDisplay = resolveStudentAnswerDisplay(item);
          tdStudent.innerHTML = `
            <div class="ans-display-cell">
              <div class="ans-student-val" title="${escapeHtml(studentAnsDisplay)}">${escapeHtml(studentAnsDisplay)}</div>
            </div>
          `;
          tr.append(tdStudent);

          // 4. Expected Answer Column
          const tdExpected = document.createElement('td');
          const expectedAnsDisplay = resolveExpectedAnswerDisplay(item);
          tdExpected.innerHTML = `
            <div class="ans-display-cell">
              <div class="ans-expected-val" title="${escapeHtml(expectedAnsDisplay)}">${escapeHtml(expectedAnsDisplay)}</div>
            </div>
          `;
          tr.append(tdExpected);

          // 5. Verdict Column
          const tdVerdict = document.createElement('td');
          tdVerdict.innerHTML = `<span class="verdict-badge ${item.verdict}">${verdictLabel(item.verdict)}</span>`;
          tr.append(tdVerdict);

          // 6. Score Column
          const tdScore = document.createElement('td');
          const currentScoreVal = item.draftScore !== null && item.draftScore !== undefined
            ? item.draftScore
            : (item.manualReview ? item.scoreEarned : (item.canGrade ? (item.draftScore ?? '') : item.scoreEarned));

          if (item.canGrade) {
            tdScore.innerHTML = `
              <div class="table-grade-score-wrap">
                <input type="number" step="any" min="0" max="${item.maxScore}" class="grade-score-input table-grade-input" data-item-id="${item.itemVersionId}" value="${currentScoreVal !== undefined ? currentScoreVal : ''}" placeholder="0-${item.maxScore}">
                <span>/${item.maxScore}</span>
              </div>
            `;
          } else {
            tdScore.innerHTML = `<div class="table-grade-score-wrap"><span>${item.scoreEarned}/${item.maxScore}</span></div>`;
          }
          tr.append(tdScore);

          // 7. Feedback Column
          const tdFeedback = document.createElement('td');
          const currentFeedbackVal = typeof item.draftFeedback === 'string'
            ? item.draftFeedback
            : (item.draftFeedback?.comment ?? (item.manualReview && typeof item.feedback === 'object' ? (item.feedback?.comment || '') : ''));

          if (item.canGrade) {
            tdFeedback.innerHTML = `
              <textarea class="grade-feedback-input table-feedback-input" data-item-id="${item.itemVersionId}" placeholder="Nhận xét...">${escapeHtml(currentFeedbackVal)}</textarea>
            `;
          } else {
            const commentText = item.feedback?.comment || '';
            tdFeedback.innerHTML = `<span style="font-size:0.82rem; color:#64748b;">${escapeHtml(commentText) || '—'}</span>`;
          }
          tr.append(tdFeedback);

          // 8. Action Column
          const tdAction = document.createElement('td');
          tdAction.innerHTML = `<button type="button" class="btn-inspect-item" data-item-id="${item.itemVersionId}">${ICONS.view} <span>Xem</span></button>`;
          tr.append(tdAction);

          detailItemsBody.append(tr);
        }
      }

      // Attach event listeners for prompt opt buttons and inspect item buttons
      detailItemsBody.querySelectorAll('.prompt-opt-btn, .btn-inspect-item').forEach(btn => {
        lifecycle.listen(btn, 'click', () => {
          const itm = items.find(i => i.itemVersionId === btn.dataset.itemId);
          if (itm) openItemContextModal(itm);
        });
      });

      // Attach auto-save listener on table score and feedback inputs
      const scoreInputs = detailItemsBody.querySelectorAll('.grade-score-input');
      const feedbackInputs = detailItemsBody.querySelectorAll('.grade-feedback-input');
      [...scoreInputs, ...feedbackInputs].forEach(inp => {
        lifecycle.listen(inp, 'input', () => {
          const itm = items.find(i => i.itemVersionId === inp.dataset.itemId);
          if (itm) {
            if (inp.classList.contains('grade-score-input')) {
              itm.draftScore = inp.value.trim() !== '' ? Number(inp.value.trim()) : null;
            } else if (inp.classList.contains('grade-feedback-input')) {
              itm.draftFeedback = inp.value;
            }
          }
          lifecycle.clearTimeout(autoSaveTimeout);
          autoSaveTimeout = lifecycle.timeout(() => {
            saveManualGradingDraft(true).catch(() => {});
          }, 1500);
        });
      });
    }

    function renderSkillSummary(tabCode = 'all') {
      if (!skillSummaryCard || !currentAttemptDetail) return;
      const skillsData = extractAttemptSkills(currentAttemptDetail.items);
      const summary = skillsData.summary[tabCode] || skillsData.summary['all'];

      const titleText = tabCode === 'all'
        ? 'Tất cả kỹ năng'
        : `Kỹ năng ${summary.label || tabCode.toUpperCase()}`;

      skillSummaryCard.innerHTML = `
        <div class="skill-summary-title">${escapeHtml(titleText)} (${summary.totalItems} câu)</div>
        <div class="skill-summary-metrics">
          <span class="skill-summary-score">${summary.scoreEarned}/${summary.maxScore} điểm</span>
          ${summary.needsReviewCount > 0 ? `<span class="verdict-badge manual_review">${summary.needsReviewCount} câu cần duyệt</span>` : '<span class="verdict-badge correct">Đã chấm xong</span>'}
        </div>
      `;
    }

    function renderSkillTabs() {
      if (!attemptSkillTabs || !currentAttemptDetail) return;
      attemptSkillTabs.replaceChildren();

      const skillsData = extractAttemptSkills(currentAttemptDetail.items);
      const allSummary = skillsData.summary['all'];

      // 1. "All" tab button
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = `skill-tab-btn${currentSkillTab === 'all' ? ' active' : ''}`;
      allBtn.innerHTML = `
        <span>Tất cả</span>
        <span class="tab-count">${allSummary.totalItems}</span>
        ${allSummary.needsReviewCount > 0 ? `<span class="tab-review-pill">${allSummary.needsReviewCount} cần duyệt</span>` : ''}
      `;
      lifecycle.listen(allBtn, 'click', () => {
        currentSkillTab = 'all';
        attemptSkillTabs.querySelectorAll('.skill-tab-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        renderSkillSummary('all');
        renderAttemptTableRows('all');
      });
      attemptSkillTabs.append(allBtn);

      // 2. Each skill tab button
      for (const skill of skillsData.skills) {
        const skillBtn = document.createElement('button');
        skillBtn.type = 'button';
        skillBtn.className = `skill-tab-btn${currentSkillTab === skill.code ? ' active' : ''}`;
        skillBtn.innerHTML = `
          <span>${escapeHtml(skill.label)}</span>
          <span class="tab-count">${skill.totalItems}</span>
          ${skill.needsReviewCount > 0 ? `<span class="tab-review-pill">${skill.needsReviewCount} cần duyệt</span>` : ''}
        `;
        lifecycle.listen(skillBtn, 'click', () => {
          currentSkillTab = skill.code;
          attemptSkillTabs.querySelectorAll('.skill-tab-btn').forEach(b => b.classList.remove('active'));
          skillBtn.classList.add('active');
          renderSkillSummary(skill.code);
          renderAttemptTableRows(skill.code);
        });
        attemptSkillTabs.append(skillBtn);
      }
    }

    currentSkillTab = 'all';
    renderSkillTabs();
    renderSkillSummary(currentSkillTab);
    renderAttemptTableRows(currentSkillTab);

    // Keep detailItems container synchronized for compatibility
    if (detailItems) {
      detailItems.replaceChildren();
    }

    if (publishResultBtn) {
      if (payload.attempt.status === 'active') {
        publishResultBtn.disabled = true;
        publishResultBtn.title = 'Chưa thể công bố bài khi học viên chưa nộp';
      } else {
        publishResultBtn.disabled = false;
        publishResultBtn.title = '';
      }
      publishResultBtn.textContent = payload.attempt.publication?.published ? 'Công bố lại' : 'Công bố kết quả';
    }

    if (drawerBackdrop) drawerBackdrop.hidden = false;
    attemptDetail.hidden = false;
    attemptDetail.classList.add('drawer-open');
    if (results) results.hidden = false;
  }

  async function loadAttemptDetail(classId, assignmentId, attemptId) {
    if (!classId || !assignmentId || !attemptId) {
      if (attemptDetail) {
        attemptDetail.classList.remove('drawer-open');
        attemptDetail.hidden = true;
      }
      if (drawerBackdrop) drawerBackdrop.hidden = true;
      return;
    }
    status.textContent = 'Đang tải chi tiết bài làm…';
    const payload = await request(attemptDetailPath(classId, assignmentId, attemptId));
    renderAttemptDetail(payload);
    status.textContent = 'Đã mở chi tiết bài làm';
  }

  async function loadResults(classId, assignmentId) {
    if (!classId || !assignmentId) {
      results.hidden = true;
      resultsContent.replaceChildren();
      return;
    }
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
    const payload = await request(assignmentResultsPath(classId, assignmentId, queryOptions));
    renderResults(payload);
    status.textContent = 'Đã cập nhật bảng kết quả';
  }

  async function loadAssignments(classId, selectedAssignmentId = '') {
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
    const payload = await request(`/api/teacher/classes/${encodeURIComponent(classId)}/assignments`);
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
    status.textContent = 'Đang kiểm tra quyền…';
    const payload = await request('/api/teacher/classes');
    if (payload.actor) {
      currentTeacher = { ...(currentTeacher || {}), ...payload.actor };
      if (Array.isArray(payload.actor.classIds) && payload.actor.classIds.length > 0) {
        currentTeacher.classIds = payload.actor.classIds;
      }
    }
    rawClassesList = payload.classes || [];
    setupClassFilterToolbar();
    renderFilteredClasses();
    await loadAssignments(classSelect.value, state.assignmentId);
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

  function showConflictAlert(msg) {
    if (!conflictAlert) return;
    conflictAlert.replaceChildren();
    const span = document.createElement('span');
    span.innerHTML = `${ICONS.alert} <span>${escapeHtml(msg)}</span>`;
    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'btn-secondary';
    reloadBtn.textContent = 'Tải lại bài làm';
    lifecycle.listen(reloadBtn, 'click', () => {
      loadAttemptDetail(state.classId, state.assignmentId, state.attemptId).catch(err => {
        status.textContent = err.message;
      });
    });
    conflictAlert.append(span, reloadBtn);
    conflictAlert.hidden = false;
  }

  async function saveManualGradingDraft(silent = false) {
    if (!currentAttemptDetail) return;
    const itemsToSubmit = [];
    const feedbackMap = new Map();
    const scoresMap = {};

    // 1. Populate from items in memory
    for (const itm of currentAttemptDetail.items) {
      if (itm.canGrade) {
        const scoreVal = itm.draftScore !== null && itm.draftScore !== undefined
          ? itm.draftScore
          : (itm.manualReview && itm.scoreEarned !== null ? itm.scoreEarned : null);
        const feedbackVal = typeof itm.draftFeedback === 'string'
          ? itm.draftFeedback
          : (itm.draftFeedback?.comment ?? (itm.manualReview && typeof itm.feedback === 'object' ? (itm.feedback?.comment || '') : null));

        if (scoreVal !== null && scoreVal !== undefined) {
          scoresMap[itm.itemVersionId] = Number(scoreVal);
          itemsToSubmit.push({
            itemVersionId: itm.itemVersionId,
            scoreEarned: Number(scoreVal),
            feedback: feedbackVal || null
          });
        }
      }
    }

    // 2. Override with active inputs in DOM
    const scoreInputs = attemptDetail.querySelectorAll('.grade-score-input');
    const feedbackInputs = attemptDetail.querySelectorAll('.grade-feedback-input');
    feedbackInputs.forEach(input => {
      feedbackMap.set(input.dataset.itemId, input.value.trim());
    });
    scoreInputs.forEach(input => {
      const val = input.value.trim();
      if (val !== '') {
        const num = Number(val);
        scoresMap[input.dataset.itemId] = num;
        const existingIdx = itemsToSubmit.findIndex(it => it.itemVersionId === input.dataset.itemId);
        const itemObj = {
          itemVersionId: input.dataset.itemId,
          scoreEarned: num,
          feedback: feedbackMap.get(input.dataset.itemId) || null
        };
        if (existingIdx >= 0) {
          itemsToSubmit[existingIdx] = itemObj;
        } else {
          itemsToSubmit.push(itemObj);
        }
      }
    });

    for (const itm of currentAttemptDetail.items) {
      if (scoresMap[itm.itemVersionId] !== undefined) {
        const num = scoresMap[itm.itemVersionId];
        if (!Number.isFinite(num) || num < 0 || num > itm.maxScore) {
          if (!silent && status) status.textContent = `Điểm câu ${itm.position} không hợp lệ (0 - ${itm.maxScore}).`;
          return;
        }
      }
    }

    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang lưu nháp...';
    try {
      const response = await fetch(`${apiBase()}${manualGradingDraftPath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          baseRevision: currentAttemptDetail.manualGrading?.revision ?? 0,
          items: itemsToSubmit,
          note: 'Lưu nháp từ Dashboard'
        })
      });
      const payload = await response.json();
      if (response.status === 409) {
        showConflictAlert(payload.message || 'Xung đột: Bài làm đã được cập nhật bởi người khác.');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể lưu nháp.');
      }
      currentAttemptDetail.manualGrading.revision = payload.revision;
      currentAttemptDetail.manualGrading.status = 'draft';
      if (draftStatusMsg) {
        draftStatusMsg.textContent = `Đã lưu nháp lúc ${formatCurrentTime()} (phiên bản ${payload.revision})`;
      }
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi lưu nháp: ${err.message}`;
    }
  }

  async function completeManualGrading() {
    if (!currentAttemptDetail) return;
    const itemsToSubmit = [];
    const feedbackMap = new Map();
    const scoresMap = {};

    // 1. Populate from items in memory
    for (const itm of currentAttemptDetail.items) {
      if (itm.canGrade) {
        const scoreVal = itm.draftScore !== null && itm.draftScore !== undefined
          ? itm.draftScore
          : (itm.manualReview && itm.scoreEarned !== null ? itm.scoreEarned : null);
        const feedbackVal = typeof itm.draftFeedback === 'string'
          ? itm.draftFeedback
          : (itm.draftFeedback?.comment ?? (itm.manualReview && typeof itm.feedback === 'object' ? (itm.feedback?.comment || '') : null));

        if (scoreVal !== null && scoreVal !== undefined) {
          scoresMap[itm.itemVersionId] = Number(scoreVal);
          itemsToSubmit.push({
            itemVersionId: itm.itemVersionId,
            scoreEarned: Number(scoreVal),
            feedback: feedbackVal || null
          });
        }
      }
    }

    // 2. Override with active inputs in DOM
    const scoreInputs = attemptDetail.querySelectorAll('.grade-score-input');
    const feedbackInputs = attemptDetail.querySelectorAll('.grade-feedback-input');
    feedbackInputs.forEach(input => {
      feedbackMap.set(input.dataset.itemId, input.value.trim());
    });
    scoreInputs.forEach(input => {
      const val = input.value.trim();
      if (val !== '') {
        const num = Number(val);
        scoresMap[input.dataset.itemId] = num;
        const existingIdx = itemsToSubmit.findIndex(it => it.itemVersionId === input.dataset.itemId);
        const itemObj = {
          itemVersionId: input.dataset.itemId,
          scoreEarned: num,
          feedback: feedbackMap.get(input.dataset.itemId) || null
        };
        if (existingIdx >= 0) {
          itemsToSubmit[existingIdx] = itemObj;
        } else {
          itemsToSubmit.push(itemObj);
        }
      }
    });

    const validation = validateManualGradingScores(currentAttemptDetail.items, scoresMap);
    if (!validation.valid) {
      alert(validation.message);
      if (status) status.textContent = validation.message;
      return;
    }

    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang hoàn tất chấm...';
    try {
      const response = await fetch(`${apiBase()}${manualGradingCompletePath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          baseRevision: currentAttemptDetail.manualGrading?.revision ?? 0,
          items: itemsToSubmit,
          note: 'Xác nhận hoàn tất chấm'
        })
      });
      const payload = await response.json();
      if (response.status === 409) {
        showConflictAlert(payload.message || 'Xung đột: Bài làm đã được cập nhật bởi người khác.');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể hoàn tất chấm.');
      }
      alert('Đã hoàn tất chấm bài thành công!');
      await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi: ${err.message}`;
    }
  }

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

  async function publishAttemptResult() {
    if (!state.classId || !state.assignmentId || !state.attemptId) return;
    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang công bố kết quả…';
    try {
      const response = await fetch(`${apiBase()}${attemptPublishPath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ note: 'Công bố kết quả' })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể công bố kết quả.');
      }
      alert('Đã công bố kết quả thành công!');
      if (draftStatusMsg) draftStatusMsg.textContent = `Đã công bố kết quả lúc ${formatCurrentTime()}`;
      await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi công bố: ${err.message}`;
    }
  }

  if (publishResultBtn) {
    lifecycle.listen(publishResultBtn, 'click', () => {
      publishAttemptResult().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  function closeAttemptDetail() {
    if (attemptDetail) {
      attemptDetail.classList.remove('drawer-open');
      attemptDetail.hidden = true;
    }
    if (drawerBackdrop) {
      drawerBackdrop.hidden = true;
    }
    if (results) {
      results.hidden = false;
    }
    delete state.attemptId;
    setUrl();
    loadResults(state.classId, state.assignmentId).catch(() => {});
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

  function openGrantRetakeModal({ studentRef, studentName, discriminator }) {
    if (!state.classId || !state.assignmentId || !studentRef) return;
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
      const pad = n => String(n).padStart(2, '0');
      const localIso = `${nowPlus24h.getFullYear()}-${pad(nowPlus24h.getMonth() + 1)}-${pad(nowPlus24h.getDate())}T${pad(nowPlus24h.getHours())}:${pad(nowPlus24h.getMinutes())}`;
      retakeExpiresAtInput.value = localIso;
    }
    if (typeof grantRetakeModal?.showModal === 'function') {
      grantRetakeModal.showModal();
    } else if (grantRetakeModal) {
      grantRetakeModal.hidden = false;
    }
  }

  if (grantRetakeBtn) {
    lifecycle.listen(grantRetakeBtn, 'click', () => {
      if (!currentAttemptDetail) return;
      openGrantRetakeModal({
        studentRef: currentAttemptDetail.student.studentRef,
        studentName: currentAttemptDetail.student.name,
        discriminator: currentAttemptDetail.student.discriminator
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
      if (!state.classId || !state.assignmentId) return;
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
        const response = await fetch(`${apiBase()}${grantRetakePath(state.classId, state.assignmentId, studentRef)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({ reason, availableFrom, expiresAt })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Không thể cấp quyền làm lại.');
        }
        if (typeof grantRetakeModal?.close === 'function') {
          grantRetakeModal.close();
        } else if (grantRetakeModal) {
          grantRetakeModal.hidden = true;
        }
        alert('Cấp quyền làm lại thành công!');
        await loadResults(state.classId, state.assignmentId);
        if (state.attemptId) {
          await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
        }
      } catch (err) {
        if (grantRetakeError) {
          grantRetakeError.hidden = false;
          grantRetakeError.textContent = err.message;
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

  function renderTeacherProfile(teacher) {
    if (!teacher) return;
    document.body.classList.remove('login-page');
    currentTeacher = teacher;
    setupClassFilterToolbar();
    if (teacherProfileName) teacherProfileName.textContent = teacher.name || teacher.email;
    const popoverUserName = root.querySelector('#popover-user-name');
    if (popoverUserName) popoverUserName.textContent = teacher.name || teacher.email;
    if (teacherProfileMeta) teacherProfileMeta.textContent = `${teacher.email} · SĐT: ${teacher.phone || '—'}`;
    const teacherProfileAvatar = root.querySelector('#teacher-profile-avatar');
    if (teacherProfileAvatar) {
      const name = (teacher.name || teacher.email || '').trim();
      const parts = name.split(/\s+/).filter(Boolean);
      let initials = 'GV';
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
      teacherProfileAvatar.textContent = initials;
    }
    if (teacherRoleBadge) {
      teacherRoleBadge.textContent = teacherRoleLabel(teacher.role, teacher.courseCodes);
      teacherRoleBadge.className = `role-badge ${teacher.role || 'teacher'}`;
    }
    if (loginForm) loginForm.hidden = true;
    if (teacherProfile) teacherProfile.hidden = false;
    if (loginError) loginError.hidden = true;

    const currentTab = readDashboardTab(window.location.hash);
    if (currentTab === 'test-studio' || currentTab === 'exams') {
      loadAndRenderTestStudio();
    }
  }

  function toggleRoleCapabilitiesPopover(show) {
    if (!roleCapabilitiesPopover) return;
    const shouldShow = typeof show === 'boolean' ? show : roleCapabilitiesPopover.hidden;
    roleCapabilitiesPopover.hidden = !shouldShow;
    if (roleInfoBtn) roleInfoBtn.setAttribute('aria-expanded', String(shouldShow));
    if (teacherRoleBadge) teacherRoleBadge.setAttribute('aria-expanded', String(shouldShow));
    if (shouldShow && currentTeacher) {
      const popoverUserName = root.querySelector('#popover-user-name');
      if (popoverUserName) popoverUserName.textContent = currentTeacher.name || currentTeacher.email;
      if (teacherRoleBadge) {
        teacherRoleBadge.textContent = teacherRoleLabel(currentTeacher.role, currentTeacher.courseCodes);
        teacherRoleBadge.className = `role-badge ${currentTeacher.role || 'teacher'}`;
      }
    }
  }

  if (roleInfoBtn) {
    lifecycle.listen(roleInfoBtn, 'click', (e) => {
      e.stopPropagation();
      toggleRoleCapabilitiesPopover();
    });
  }

  if (teacherRoleBadge) {
    lifecycle.listen(teacherRoleBadge, 'click', (e) => {
      e.stopPropagation();
      toggleRoleCapabilitiesPopover();
    });
    lifecycle.listen(teacherRoleBadge, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleRoleCapabilitiesPopover();
      }
    });
  }

  if (closeRolePopoverBtn) {
    lifecycle.listen(closeRolePopoverBtn, 'click', () => {
      toggleRoleCapabilitiesPopover(false);
    });
  }

  lifecycle.listen(document, 'click', (e) => {
    if (roleCapabilitiesPopover && !roleCapabilitiesPopover.hidden) {
      if (!roleCapabilitiesPopover.contains(e.target) && !roleBadgeWrap?.contains(e.target)) {
        toggleRoleCapabilitiesPopover(false);
      }
    }
  });

  lifecycle.listen(document, 'keydown', (e) => {
    if (e.key === 'Escape' && roleCapabilitiesPopover && !roleCapabilitiesPopover.hidden) {
      toggleRoleCapabilitiesPopover(false);
    }
  });

  function handleLogout() {
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
    if (detailGradingHistory) detailGradingHistory.replaceChildren();
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
    fetch(`${apiBase()}${authMePath()}`, { headers: { ...authHeader() } })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
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
