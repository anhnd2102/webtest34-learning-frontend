import { createLifecycle } from './lifecycle.js';
import { createQueryCoordinator } from './query-coordinator.js';
import { createResultsView } from '../results/view.js';
import { createAttemptReview } from '../grading/attempt-review.js';
import { createExamRoomView } from '../exam-room/view.js';

import { defaultApiBase, authMePath, authHeaders, assignmentResultsPath, assignmentResultsExportPath, attemptDetailPath } from '../api/teacher.js';

import { ICONS } from '../ui/icons.js';
import { localStudentUrl, readDashboardState, readDashboardTab, assignmentUrl, extractPhase, formatAssignmentMeta } from './dashboard-state.js';
import { downloadResultsXlsx } from '../results/export.js';
import { renderTestBuilderView } from '../studio/builder.js';

import { createPortalPanel } from './portal-panel.js';
import { createProfilePanel } from './profile-panel.js';
import { createGrantRetake } from './grant-retake.js';
import { createReports } from './reports.js';
import { createExamControls } from './exam-controls.js';
import { createPublishAll } from './publish-all.js';
import { createStudioView } from './studio-view.js';
import { createClassDirectory } from './class-directory.js';
import { createExamRoomActions } from './exam-room-actions.js';
import { createAuthSession } from './auth-session.js';
import { createAddStudent } from './add-student.js';
import { createNavigation } from './navigation.js';
import { createAssignmentSelection } from './assignment-selection.js';


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
  //  - navState: tab báo cáo đang mở và cờ chống vòng lặp hash khi điều hướng bằng mã.
  const navState = {
    get currentAssessmentTab() { return currentAssessmentTab; }, set currentAssessmentTab(value) { currentAssessmentTab = value; },
    get isNavigatingProgrammatically() { return isNavigatingProgrammatically; }, set isNavigatingProgrammatically(value) { isNavigatingProgrammatically = value; },
    get previousHash() { return previousHash; }, set previousHash(value) { previousHash = value; }
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
  let isNavigatingProgrammatically = false;
  let previousHash = (typeof window !== 'undefined' ? window.location?.hash : '') || '#dashboard';
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
  lifecycle.onDispose(() => stopExamRoomEvents());
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

  const { loadAndRenderTestStudio } = createStudioView({ root, queryCoordinator, authState, scopeState, form, viewExams, disposeOwnedBuilder, renderOwnedBuilder, request });
  // Phá vòng phụ thuộc: grant retake và view chỉ giữ wrapper lazy tới loadExamRoom/showExamRoomTimeline (khai báo sau).
  const { openGrantRetakeModal } = createGrantRetake({ lifecycle, viewState, scopeState, examRoom, grantRetakeModal, grantRetakeForm, grantRetakeBtn, retakeStudentName, retakeStudentRefInput, retakeReasonInput, retakeAvailableFromInput, retakeExpiresAtInput, cancelGrantRetakeBtn, grantRetakeError, state, apiBase, loadExamRoom: (...args) => loadExamRoom(...args), loadAttemptDetail, loadResults });
  const { renderExamRoom } = createExamRoomView({ root, lifecycle, viewState, actions: { showExamRoomTimeline: student => showExamRoomTimeline(student), openGrantRetakeModal } });

  const { fillIncidentTimeline, showExamRoomTimeline, loadExamRoom, stopExamRoomEvents } = createExamRoomActions({ root, lifecycle, queryCoordinator, viewState, authState, scopeState, examRoomState, document, examRoomOpenButton, examRoom, examRoomMessage, examRoomStartButton, examRoomExtendButton, examRoomExtensionMinutes, examRoomRefreshButton, examRoomCloseButton, results, state, apiBase, request, renderExamRoom, handleLogout: () => handleLogout() });

  const { updateExamModeUI, updateSelfProctoringUI, renderExamSwitch } = createExamControls({ lifecycle, scopeState, examModeToggle, examModeStatusPill, selfProctoringToggle, examModeLockHint, selfProctoringLockHint, selfProctoringLimit, selfProctoringSave, examSwitchControls, examSwitchHint, examSwitchLimit, examSwitchButton, examSwitchMessage, examRoomOpenButton, examRoom, status, state, request, loadAssignments });
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

  const { getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, renderReportsView } = createReports({ root, queryCoordinator, authState, document, window, status, viewReports, assessmentTabDistribution, assessmentTabItems, switchAssessmentTab: (...args) => switchAssessmentTab(...args), statusFilter, state, apiBase, authHeader, endSession, request, applyFilterChange });
  const { syncAssessmentHeaderMeta, switchAssessmentTab, updateDashboardTab } = createNavigation({ lifecycle, queryCoordinator, viewState, scopeState, navState, window, results, status, viewDashboard, viewGrading, viewExams, viewReports, navItems, goToGradingBtn, gradingEmptyPlaceholder, gradingBackToDashboardBtn, pageTitleBar, assessmentHeader, assessmentBackBtn, assessmentClassName, assessmentTestTitle, assessmentStatusBadge, assessmentTabDistribution, assessmentTabItems, assessmentTabBtns, disposeOwnedBuilder, state, loadAndRenderTestStudio, loadResults, getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, renderReportsView });
  const { renderAssignmentChips, selectAssignment } = createAssignmentSelection({ queryCoordinator, scopeState, navState, window, assignmentSelect, assignments, results, status, gradingEmptyPlaceholder, assessmentHeader, assessmentTabDistribution, assessmentTabItems, renderSelectedAssignmentShowcase, state, setUrl, loadResults, getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, syncAssessmentHeaderMeta, switchAssessmentTab });

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

  const { loadClasses, renderFilteredClasses, setupClassFilterToolbar, updateFilterPillsUI } = createClassDirectory({ lifecycle, queryCoordinator, authState, scopeState, classFilterToolbar, adminCourseFilters, leadScopeFilters, classSearchInput, classStatusFilter, classCountBadge, classSelect, status, state, request, setUrl, loadAssignments });

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

  const { publishAllResults } = createPublishAll({ viewState, status, publishAllBtn, state, request, loadResults });

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

  createAddStudent({ authHeader, lifecycle, addStudentBtn, addStudentModal, addStudentForm, eligibleStudentSelect, addStudentRefInput, addStudentNameInput, addStudentDiscInput, addStudentError, cancelAddStudentBtn, state, apiBase, request, loadResults });



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

  const { handleLogout } = createAuthSession({ authHeader, lifecycle, queryCoordinator, authState, scopeState, document, classFilterToolbar, classSearchInput, classStatusFilter, classCountBadge, classSelect, assignmentSelect, selectedAssignmentCard, examRoom, assignments, results, resultsContent, status, classSkillSummary, disposeOwnedBuilder, searchInput, statusFilter, skillFilter, minScoreInput, maxScoreInput, sortBySelect, sortDirSelect, attemptDetail, drawerBackdrop, detailScores, detailAttemptHistory, detailItemsBody, state, loginForm, loginBtn, loginEmail, loginPhone, togglePasswordBtn, loginError, teacherProfile, roleCapabilitiesPopover, logoutBtn, apiBase, stopExamRoomEvents, resetPortal, setUrl, loadClasses, renderTeacherProfile });

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
