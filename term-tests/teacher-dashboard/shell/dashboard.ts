// NGUỒN: file .ts này; dashboard.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { createApiRequest } from '../api/client.js';
import { createLifecycle } from './lifecycle.js';
import { createQueryCoordinator } from './query-coordinator.js';
import { createResultsView } from '../results/view.js';
import { createAttemptReview } from '../grading/attempt-review.js';
import { createExamRoomView } from '../exam-room/view.js';

import { defaultApiBase, authMePath, authHeaders, assignmentResultsPath, assignmentResultsExportPath, attemptDetailPath } from '../api/teacher.js';

import { readDashboardState, assignmentUrl, readDashboardTab } from './dashboard-state.js';
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
import { createShowcase } from './showcase.js';
import { createAssignmentsLoader } from './assignments-loader.js';
import { createPagination } from './pagination.js';
import { createResultsFilters } from './results-filters.js';
import { createExamRoomSession } from './exam-room-session.js';
import type { AssignmentRecord, ClassRecord, TeacherActor } from './dashboard-state.js';
import type { Lifecycle } from './lifecycle.js';
import type { ExamRoom } from '../exam-room/presentation.js';

type QueryCoordinator = ReturnType<typeof createQueryCoordinator>;


type DashboardRoot = Document | HTMLElement;
type CaughtError = { message?: string, name?: string, status?: number };
// Form danh tính: phần tử điều khiển tra theo tên qua `form.elements.<tên>`.
type IdentityForm = HTMLFormElement & { elements: HTMLFormControlsCollection & { apiBase?: HTMLInputElement, actorId?: HTMLInputElement } };
export interface DashboardHandle { dispose(): void }

const mountedDashboards = new WeakMap<object, DashboardHandle>();

export function mountDashboard(root: DashboardRoot = globalThis.document): DashboardHandle {
  if (!root?.querySelector || !root.querySelector('#identity-form') || !root.querySelector('#class-select')) {
    throw new Error('Dashboard root must contain the identity form and class selector.');
  }
  const current = mountedDashboards.get(root);
  if (current) return current;
  const view = ((root.ownerDocument || root) as Document).defaultView;
  const lifecycle = createLifecycle(view?.AbortController || globalThis.AbortController);
  const queryCoordinator = createQueryCoordinator(lifecycle, view?.AbortController || globalThis.AbortController);
  const handle: DashboardHandle = {
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

function initializeDashboard(root: DashboardRoot, lifecycle: Lifecycle, queryCoordinator: QueryCoordinator) {
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
  const document = (root.ownerDocument || root) as Document;
  const window = document.defaultView || globalThis.window;
  const location = window.location;
  const history = window.history;
  const form = root.querySelector<IdentityForm>('#identity-form');
  const classFilterToolbar = root.querySelector<HTMLElement>('#class-filter-toolbar');
  const adminCourseFilters = root.querySelector<HTMLElement>('#admin-course-filters');
  const leadScopeFilters = root.querySelector<HTMLElement>('#lead-scope-filters');
  const classSearchInput = root.querySelector<HTMLInputElement>('#class-search-input');
  const classStatusFilter = root.querySelector<HTMLSelectElement>('#class-status-filter');
  const classCountBadge = root.querySelector<HTMLElement>('#class-count-badge');
  const classSelect = root.querySelector<HTMLSelectElement>('#class-select')!;
  const assignmentSelect = root.querySelector<HTMLSelectElement>('#assignment-select');
  const selectedAssignmentCard = root.querySelector<HTMLSelectElement>('#selected-assignment-card');
  const showcaseBadgeClass = root.querySelector<HTMLElement>('#showcase-badge-class');
  const showcaseTitle = root.querySelector<HTMLElement>('#showcase-title');
  const showcaseBlockBadge = root.querySelector<HTMLElement>('#showcase-block-badge');
  const showcasePhaseBadge = root.querySelector<HTMLElement>('#showcase-phase-badge');
  const showcaseStatusBadge = root.querySelector<HTMLElement>('#showcase-status-badge');
  const examModeToggle = root.querySelector<HTMLInputElement>('#exam-mode-toggle')!;
  const examModeStatusPill = root.querySelector<HTMLElement>('#exam-mode-status-pill');
  const selfProctoringToggle = root.querySelector<HTMLInputElement>('#self-proctoring-toggle')!;
  const examModeLockHint = root.querySelector<HTMLElement>('#exam-mode-lock-hint');
  const selfProctoringLockHint = root.querySelector<HTMLElement>('#self-proctoring-lock-hint');
  const selfProctoringLimit = root.querySelector<HTMLInputElement>('#self-proctoring-limit')!;
  const selfProctoringSave = root.querySelector<HTMLButtonElement>('#self-proctoring-save')!;
  const examSwitchControls = root.querySelector<HTMLElement>('#exam-switch-controls');
  const examSwitchHint = root.querySelector<HTMLElement>('#exam-switch-hint')!;
  const examSwitchLimit = root.querySelector<HTMLInputElement>('#exam-switch-limit')!;
  const examSwitchButton = root.querySelector<HTMLButtonElement>('#exam-switch-btn')!;
  const examSwitchMessage = root.querySelector<HTMLElement>('#exam-switch-message');
  const examRoomOpenButton = root.querySelector<HTMLButtonElement>('#exam-room-open');
  const examRoom = root.querySelector<HTMLElement>('#exam-room');
  const examRoomSummary = root.querySelector<HTMLElement>('#exam-room-summary');
  const examRoomMessage = root.querySelector<HTMLElement>('#exam-room-message');
  const examRoomStudents = root.querySelector<HTMLElement>('#exam-room-students');
  const examRoomStartButton = root.querySelector<HTMLButtonElement>('#exam-room-start')!;
  const examRoomExtendButton = root.querySelector<HTMLButtonElement>('#exam-room-extend')!;
  const examRoomExtensionMinutes = root.querySelector<HTMLInputElement>('#exam-room-extension-minutes');
  const examRoomRefreshButton = root.querySelector<HTMLButtonElement>('#exam-room-refresh');
  const examRoomCloseButton = root.querySelector<HTMLButtonElement>('#exam-room-close');
  const showcaseLinkBar = root.querySelector<HTMLElement>('#showcase-link-bar');
  const showcaseStudentUrl = root.querySelector<HTMLInputElement>('#showcase-student-url')!;
  const copyShowcaseLinkBtn = root.querySelector<HTMLButtonElement>('#copy-showcase-link-btn');
  const openShowcaseLinkBtn = root.querySelector<HTMLAnchorElement>('#open-showcase-link-btn')!;
  const previewAssignmentBtn = root.querySelector<HTMLElement>('#preview-assignment-btn');
  const assignments = root.querySelector<HTMLElement>('#assignment-chips') || root.querySelector<HTMLElement>('#assignments')!;
  const results = root.querySelector<HTMLElement>('#results')!;
  const resultsContent = root.querySelector<HTMLElement>('#results-content')!;
  const assignmentHeading = root.querySelector<HTMLElement>('#assignment-heading');
  const assignmentMeta = root.querySelector<HTMLElement>('#assignment-meta');
  const status = root.querySelector<HTMLElement>('#status')!;
  const lastUpdated = root.querySelector<HTMLElement>('#last-updated');
  const refreshBtn = root.querySelector<HTMLButtonElement>('#refresh-btn');
  const publishAllBtn = root.querySelector<HTMLButtonElement>('#publish-all-btn');
  const exportXlsxBtn = root.querySelector<HTMLButtonElement>('#export-xlsx-btn');
  const classSkillSummary = root.querySelector<HTMLElement>('#class-skill-summary');
  const viewDashboard = root.querySelector<HTMLElement>('#view-dashboard');
  const viewGrading = root.querySelector<HTMLElement>('#view-grading');
  const viewExams = root.querySelector<HTMLElement>('#view-exams');
  const navItems = Array.from(root.querySelectorAll<HTMLElement>('.navbar-menu .nav-item'));
  const goToGradingBtn = root.querySelector<HTMLButtonElement>('#go-to-grading-btn');
  const gradingEmptyPlaceholder = root.querySelector<HTMLElement>('#grading-empty-placeholder');
  const gradingBackToDashboardBtn = root.querySelector<HTMLButtonElement>('#grading-back-to-dashboard-btn');
  const pageTitleBar = root.querySelector<HTMLElement>('.page-title-bar');
  const assessmentHeader = root.querySelector<HTMLElement>('#assessment-header');
  const assessmentBackBtn = root.querySelector<HTMLButtonElement>('#assessment-back-btn');
  const assessmentClassName = root.querySelector<HTMLElement>('#assessment-class-name');
  const assessmentTestTitle = root.querySelector<HTMLElement>('#assessment-test-title');
  const assessmentStatusBadge = root.querySelector<HTMLElement>('#assessment-status-badge');
  const assessmentTabDistribution = root.querySelector<HTMLElement>('#assessment-tab-distribution');
  const assessmentTabItems = root.querySelector<HTMLElement>('#assessment-tab-items');
  const assessmentTabBtns = Array.from(root.querySelectorAll<HTMLElement>('.assessment-tab-btn'));
  let currentAssessmentTab = 'details';
  let isNavigatingProgrammatically = false;
  let previousHash = (typeof window !== 'undefined' ? window.location?.hash : '') || '#dashboard';
  let currentResultsPayload: any = null;
  let currentAssignmentsList: AssignmentRecord[] = [];
  let currentServerNow: string | null = null;
  let isSwitchingAssignment = false;
  let currentSelectedAssignment: AssignmentRecord | null = null;
  let examRoomReturnToResults = false;
  let rawClassesList: ClassRecord[] = [];
  let currentTeacher: TeacherActor | null = null;
  let activeBuilder: { dispose(): void } | null = null;
  lifecycle.onDispose(disposeOwnedBuilder);

  function disposeOwnedBuilder() {
    activeBuilder?.dispose();
    activeBuilder = null;
  }

  function renderOwnedBuilder(...args: Parameters<typeof renderTestBuilderView>) {
    disposeOwnedBuilder();
    activeBuilder = renderTestBuilderView(...args);
    return activeBuilder;
  }



  const addStudentBtn = root.querySelector<HTMLButtonElement>('#add-student-btn');
  const addStudentModal = root.querySelector<HTMLDialogElement>('#add-student-modal');
  const addStudentForm = root.querySelector<HTMLFormElement>('#add-student-form');
  const eligibleStudentSelect = root.querySelector<HTMLSelectElement>('#eligible-student-select');
  const addStudentRefInput = root.querySelector<HTMLInputElement>('#add-student-ref-input');
  const addStudentNameInput = root.querySelector<HTMLInputElement>('#add-student-name-input');
  const addStudentDiscInput = root.querySelector<HTMLInputElement>('#add-student-disc-input');
  const addStudentError = root.querySelector<HTMLElement>('#add-student-error');
  const cancelAddStudentBtn = root.querySelector<HTMLButtonElement>('#cancel-add-student-btn');

  const grantRetakeModal = root.querySelector<HTMLDialogElement>('#grant-retake-modal');
  const grantRetakeForm = root.querySelector<HTMLFormElement>('#grant-retake-form');
  const grantRetakeBtn = root.querySelector<HTMLButtonElement>('#grant-retake-btn');
  const retakeStudentName = root.querySelector<HTMLElement>('#retake-student-name');
  const retakeStudentRefInput = root.querySelector<HTMLInputElement>('#retake-student-ref-input');
  const retakeReasonInput = root.querySelector<HTMLInputElement>('#retake-reason-input');
  const retakeAvailableFromInput = root.querySelector<HTMLInputElement>('#retake-available-from-input');
  const retakeExpiresAtInput = root.querySelector<HTMLInputElement>('#retake-expires-at-input');
  const cancelGrantRetakeBtn = root.querySelector<HTMLButtonElement>('#cancel-grant-retake-btn');
  const grantRetakeError = root.querySelector<HTMLElement>('#grant-retake-error');

  const searchInput = root.querySelector<HTMLInputElement>('#search-input')!;
  const statusFilter = root.querySelector<HTMLSelectElement>('#status-filter')!;
  const skillFilter = root.querySelector<HTMLSelectElement>('#skill-filter');
  const minScoreInput = root.querySelector<HTMLInputElement>('#min-score-input')!;
  const maxScoreInput = root.querySelector<HTMLInputElement>('#max-score-input')!;
  const sortBySelect = root.querySelector<HTMLSelectElement>('#sort-by-select')!;
  const sortDirSelect = root.querySelector<HTMLSelectElement>('#sort-dir-select')!;
  const resetFiltersBtn = root.querySelector<HTMLButtonElement>('#reset-filters-btn');
  const paginationInfo = root.querySelector<HTMLElement>('#pagination-info');
  const prevPageBtn = root.querySelector<HTMLButtonElement>('#prev-page-btn');
  const nextPageBtn = root.querySelector<HTMLButtonElement>('#next-page-btn');
  const attemptDetail = root.querySelector<HTMLElement>('#attempt-detail');
  const closeAttemptDetailBtn = root.querySelector<HTMLButtonElement>('#close-attempt-detail-btn');
  const drawerBackdrop = root.querySelector<HTMLElement>('#drawer-backdrop');
  const detailHeading = root.querySelector<HTMLElement>('#detail-heading');
  const detailMeta = root.querySelector<HTMLElement>('#detail-meta');
  const detailScores = root.querySelector<HTMLElement>('#detail-scores');
  const detailIncidents = root.querySelector<HTMLElement>('#detail-incidents');
  const detailItems = root.querySelector<HTMLElement>('#detail-items');
  const detailAttemptHistory = root.querySelector<HTMLElement>('#detail-attempt-history');
  const attemptSkillTabs = root.querySelector<HTMLElement>('#attempt-skill-tabs');
  const skillSummaryCard = root.querySelector<HTMLElement>('#skill-summary-card');
  const detailItemsTable = root.querySelector<HTMLElement>('#detail-items-table');
  const detailItemsBody = root.querySelector<HTMLElement>('#detail-items-body');
  const itemContextModal = root.querySelector<HTMLDialogElement>('#item-context-modal');
  const modalItemTitle = root.querySelector<HTMLElement>('#modal-item-title');
  const modalItemContent = root.querySelector<HTMLElement>('#modal-item-content');
  const closeItemModalBtn = root.querySelector<HTMLButtonElement>('#close-item-modal-btn');
  let currentSkillTab = 'all';

  if (closeItemModalBtn && itemContextModal) {
    lifecycle.listen(closeItemModalBtn, 'click', () => {
      itemContextModal.close();
    });
  }

  const saveDraftBtn = root.querySelector<HTMLButtonElement>('#save-draft-btn');
  const completeGradingBtn = root.querySelector<HTMLButtonElement>('#complete-grading-btn');
  const publishResultBtn = root.querySelector<HTMLButtonElement>('#publish-result-btn');
  const draftStatusMsg = root.querySelector<HTMLElement>('#draft-status-msg');
  const conflictAlert = root.querySelector<HTMLElement>('#conflict-alert');
  const gradingActionsBar = root.querySelector<HTMLElement>('#grading-actions-bar');


  let currentAttemptDetail: any = null;

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

  const loginForm = root.querySelector<HTMLFormElement>('#login-form');
  const loginBtn = root.querySelector<HTMLButtonElement>('#login-btn')!;
  const loginApiBase = root.querySelector<HTMLInputElement>('#login-api-base');
  const loginEmail = root.querySelector<HTMLInputElement>('#login-email')!;
  const loginPhone = root.querySelector<HTMLInputElement>('#login-phone')!;
  const togglePasswordBtn = root.querySelector<HTMLButtonElement>('#toggle-password-btn');
  const loginError = root.querySelector<HTMLElement>('#login-error');
  const toggleFixtureBtn = root.querySelector<HTMLButtonElement>('#toggle-fixture-btn');
  const teacherProfile = root.querySelector<HTMLElement>('#teacher-profile');
  const teacherProfileName = root.querySelector<HTMLElement>('#teacher-profile-name');
  const teacherProfileMeta = root.querySelector<HTMLElement>('#teacher-profile-meta');
  const teacherRoleBadge = root.querySelector<HTMLElement>('#teacher-role-badge');
  const roleBadgeWrap = root.querySelector<HTMLElement>('#role-badge-wrap');
  const roleInfoBtn = root.querySelector<HTMLButtonElement>('#role-info-btn');
  const roleCapabilitiesPopover = root.querySelector<HTMLElement>('#role-capabilities-popover');
  const closeRolePopoverBtn = root.querySelector<HTMLButtonElement>('#close-role-popover');
  const popoverRoleTitle = root.querySelector<HTMLElement>('#popover-role-title');
  const logoutBtn = root.querySelector<HTMLButtonElement>('#logout-btn');

  let sessionToken = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('izone_teacher_token') || '') : '';
  let examRoomSession: ReturnType<typeof createExamRoomSession> | null = null;
  lifecycle.onDispose(() => stopExamRoomEvents());
  let currentExamRoom: ExamRoom | null = null;

  const currentLocation = typeof window !== 'undefined' ? window.location : null;
  const currentHost = currentLocation?.hostname || '';
  const isTunnel = currentHost.includes('trycloudflare.com') || currentHost.includes('ngrok') || currentHost.includes('loca.lt');
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(currentHost);
  const standardApiBase = defaultApiBase();

  if (loginApiBase) {
    if (isTunnel) {
      loginApiBase.value = currentLocation!.origin;
    } else if (isLocalHost && (!loginApiBase.value || loginApiBase.value.includes('webtest.ducanhdev.com'))) {
      loginApiBase.value = 'http://127.0.0.1:8788';
    } else if (!loginApiBase.value || (!isLocalHost && loginApiBase.value.includes('localhost'))) {
      loginApiBase.value = standardApiBase;
    }
  }
  if (form?.elements?.apiBase) {
    if (isTunnel) {
      form.elements.apiBase.value = currentLocation!.origin;
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

  const request = createApiRequest({ apiBase, authHeader, hasSession: () => Boolean(sessionToken), onUnauthorized: endSession, isDisposed: () => lifecycle.isDisposed() });

  const { loadAndRenderTestStudio } = createStudioView({ root, queryCoordinator, authState, scopeState, form, viewExams, disposeOwnedBuilder, renderOwnedBuilder, request });
  // Phá vòng phụ thuộc: grant retake và view chỉ giữ wrapper lazy tới loadExamRoom/showExamRoomTimeline (khai báo sau).
  const { openGrantRetakeModal } = createGrantRetake({ lifecycle, viewState, scopeState, examRoom, grantRetakeModal, grantRetakeForm, grantRetakeBtn, retakeStudentName, retakeStudentRefInput, retakeReasonInput, retakeAvailableFromInput, retakeExpiresAtInput, cancelGrantRetakeBtn, grantRetakeError, state, request, loadExamRoom: (...args) => loadExamRoom(...args), loadAttemptDetail, loadResults });
  const { renderExamRoom } = createExamRoomView({ root, lifecycle, viewState, actions: { showExamRoomTimeline: student => showExamRoomTimeline(student), openGrantRetakeModal } });

  const { fillIncidentTimeline, showExamRoomTimeline, loadExamRoom, stopExamRoomEvents, suspendExamRoomEvents, resumeExamRoomEvents } = createExamRoomActions({ root, lifecycle, queryCoordinator, viewState, authState, scopeState, examRoomState, document, examRoomOpenButton, examRoom, examRoomMessage, examRoomStartButton, examRoomExtendButton, examRoomExtensionMinutes, examRoomRefreshButton, examRoomCloseButton, results, state, apiBase, request, renderExamRoom, handleLogout: () => handleLogout() });

  const { updateExamModeUI, updateSelfProctoringUI, renderExamSwitch } = createExamControls({ lifecycle, scopeState, examModeToggle, examModeStatusPill, selfProctoringToggle, examModeLockHint, selfProctoringLockHint, selfProctoringLimit, selfProctoringSave, examSwitchControls, examSwitchHint, examSwitchLimit, examSwitchButton, examSwitchMessage, examRoomOpenButton, examRoom, status, state, request, loadAssignments: (...args) => loadAssignments(...args) });
  const { ensurePortalPanel, resetPortal } = createPortalPanel({ root, lifecycle, state, request, document, window });
  const setUrl = () => history.replaceState(null, '', assignmentUrl(location.href, state));

  const { renderResults } = createResultsView({ root, lifecycle, state, viewState, actions: { ensurePortalPanel, setUrl, loadAttemptDetail, openGrantRetakeModal, resultsTabActive: () => navState.currentAssessmentTab === 'details' } });






  const { renderAttemptDetail, showConflictAlert, saveManualGradingDraft, completeManualGrading, publishAttemptResult, closeAttemptDetail } = createAttemptReview({ root, lifecycle, state, viewState, queryCoordinator, actions: { fillIncidentTimeline, loadAttemptDetail, request, setUrl, loadResults, resultsTabActive: () => navState.currentAssessmentTab === 'details' } });

  async function loadAttemptDetail(classId: string | undefined, assignmentId: string | undefined, attemptId: string | undefined) {
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
      if (query && (!query.isCurrent() || (error as CaughtError).name === 'AbortError')) return;
      status.textContent = (error as CaughtError).message as string;
    }
  }

  async function loadResults(classId: string | undefined, assignmentId: string | undefined) {
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
      if (query && (!query.isCurrent() || (error as CaughtError).name === 'AbortError')) return;
      status.textContent = (error as CaughtError).message as string;
    }
  }

  const { getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, renderReportsView } = createReports({ root, queryCoordinator, authState, document, window, status, assessmentTabDistribution, assessmentTabItems, switchAssessmentTab: (...args) => switchAssessmentTab(...args), statusFilter, state, apiBase, authHeader, endSession, request, applyFilterChange: (...args) => applyFilterChange(...args) });
  const { syncAssessmentHeaderMeta, switchAssessmentTab, updateDashboardTab } = createNavigation({ lifecycle, queryCoordinator, viewState, scopeState, navState, window, results, status, viewDashboard, viewGrading, viewExams, navItems, goToGradingBtn, gradingEmptyPlaceholder, gradingBackToDashboardBtn, pageTitleBar, assessmentHeader, assessmentBackBtn, assessmentClassName, assessmentTestTitle, assessmentStatusBadge, assessmentTabDistribution, assessmentTabItems, assessmentTabBtns, disposeOwnedBuilder, state, loadAndRenderTestStudio, loadResults, getReportState, cancelAssessmentQueries, loadScoreDistributionReport, loadItemAnalysisReport, renderReportsView, examRoomEvents: { suspend: suspendExamRoomEvents, resume: resumeExamRoomEvents } });
  const { renderSelectedAssignmentShowcase } = createShowcase({ root, lifecycle, viewState, scopeState, document, classSelect, selectedAssignmentCard, showcaseBadgeClass, showcaseTitle, showcaseBlockBadge, showcasePhaseBadge, showcaseStatusBadge, examSwitchControls, examRoomOpenButton, examRoom, showcaseLinkBar, showcaseStudentUrl, copyShowcaseLinkBtn, openShowcaseLinkBtn, currentLocation, apiBase, previewAssignmentBtn, request, previewWindow: window, stopExamRoomEvents, updateExamModeUI, updateSelfProctoringUI, renderExamSwitch });
  const { renderAssignmentChips, selectAssignment } = createAssignmentSelection({ queryCoordinator, scopeState, navState, window, assignmentSelect, assignments, results, status, gradingEmptyPlaceholder, assessmentHeader, assessmentTabDistribution, assessmentTabItems, renderSelectedAssignmentShowcase, state, setUrl, loadResults, getReportState, cancelAssessmentQueries, syncAssessmentHeaderMeta, switchAssessmentTab });

  const { loadAssignments } = createAssignmentsLoader({ root, queryCoordinator, scopeState, window, classSelect, assignmentSelect, assignments, status, drawerBackdrop, state, loginError, request, setUrl, loadAttemptDetail, loadResults, renderSelectedAssignmentShowcase, renderAssignmentChips });

  rawClassesList = [];
  currentTeacher = null;

  const { loadClasses, renderFilteredClasses, setupClassFilterToolbar, updateFilterPillsUI } = createClassDirectory({ lifecycle, queryCoordinator, authState, scopeState, classFilterToolbar, adminCourseFilters, leadScopeFilters, classSearchInput, classStatusFilter, classCountBadge, classSelect, status, state, request, setUrl, loadAssignments });

  const { applyFilterChange } = createResultsFilters({ lifecycle, queryCoordinator, results, status, searchInput, statusFilter, skillFilter, minScoreInput, maxScoreInput, sortBySelect, sortDirSelect, resetFiltersBtn, state, setUrl, loadResults });

  let autoSaveTimeout: ReturnType<typeof setTimeout> | undefined | null = null;







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
    if ((event as KeyboardEvent).key === 'Escape' && attemptDetail && !attemptDetail.hidden) {
      closeAttemptDetail();
    }
  });

  if (refreshBtn) {
    lifecycle.listen(refreshBtn, 'click', () => {
      loadResults(state.classId, state.assignmentId).catch((error: CaughtError) => { status.textContent = error.message as string; });
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

  createAddStudent({ lifecycle, addStudentBtn, addStudentModal, addStudentForm, eligibleStudentSelect, addStudentRefInput, addStudentNameInput, addStudentDiscInput, addStudentError, cancelAddStudentBtn, state, request, loadResults });



  createPagination({ lifecycle, status, prevPageBtn, nextPageBtn, state, setUrl, loadResults });

  const { renderTeacherProfile, toggleRoleCapabilitiesPopover } = createProfilePanel({ root, lifecycle, authState, document, window, loadAndRenderTestStudio, loginForm, loginError, teacherProfile, teacherProfileName, teacherProfileMeta, teacherRoleBadge, roleBadgeWrap, roleInfoBtn, roleCapabilitiesPopover, closeRolePopoverBtn, setupClassFilterToolbar });

  const { handleLogout } = createAuthSession({ lifecycle, queryCoordinator, authState, scopeState, document, classFilterToolbar, classSearchInput, classStatusFilter, classCountBadge, classSelect, assignmentSelect, selectedAssignmentCard, examRoom, assignments, results, resultsContent, status, classSkillSummary, disposeOwnedBuilder, searchInput, statusFilter, skillFilter, minScoreInput, maxScoreInput, sortBySelect, sortDirSelect, attemptDetail, drawerBackdrop, detailScores, detailAttemptHistory, detailItemsBody, state, loginForm, loginBtn, loginEmail, loginPhone, togglePasswordBtn, loginError, teacherProfile, roleCapabilitiesPopover, logoutBtn, request, stopExamRoomEvents, resetPortal, setUrl, loadClasses, renderTeacherProfile: renderTeacherProfile as (teacher: TeacherActor) => void });

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
    const restoreQuery = queryCoordinator.begin('sessionRestore')!;
    (async () => {
      let data;
      try {
        data = await request(authMePath(), { signal: restoreQuery.signal, handleUnauthorized: false });
      } catch (error) {
        // Phản hồi lỗi HTTP (kể cả 401) nghĩa là phiên không còn hợp lệ; lỗi mạng hoặc bị hủy thì bỏ qua.
        if (restoreQuery.isCurrent() && (error as CaughtError).status) handleLogout();
        return;
      }
      if (!restoreQuery.isCurrent()) return;
      try {
        renderTeacherProfile(data.teacher);
        await loadClasses();
      } catch {
        // lỗi hiển thị/tải lớp không làm mất phiên
      }
    })();
  }

  lifecycle.listen(form, 'submit', event => {
    event.preventDefault();
    document.body.classList.remove('login-page');
    loadClasses().catch((error: CaughtError) => { status.textContent = error.message as string; });
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
    loadAssignments(classSelect.value).catch((error: CaughtError) => { status.textContent = error.message as string; });
  });

  if (assignmentSelect) {
    lifecycle.listen(assignmentSelect, 'change', () => {
      selectAssignment(assignmentSelect.value);
    });
  }

  // Polling nhẹ 30 giây, chỉ khi dữ liệu kết quả đang được hiển thị: thẻ bài đang chọn ở Teacher Dashboard (tiến độ nộp bài)
  // hoặc bảng ở tab "Chấm chi tiết". Các màn khác (Quản lý bài thi, Phổ điểm, Phân tích câu hỏi) không cần.
  function isResultsPollingNeeded() {
    const tab = readDashboardTab(window.location.hash);
    if (tab === 'dashboard') return true;
    return tab === 'grading' && navState.currentAssessmentTab === 'details';
  }
  lifecycle.interval(() => {
    if (!document.hidden && state.classId && state.assignmentId && isResultsPollingNeeded()) {
      loadResults(state.classId, state.assignmentId).catch(() => {});
    }
  }, 30000);

  // Initialize view tab according to current URL hash
  if (typeof window !== 'undefined') {
    updateDashboardTab(window.location.hash || '#dashboard');
  }
}
