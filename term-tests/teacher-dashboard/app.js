export function defaultApiBase(currentLocation = (typeof window !== 'undefined' ? window.location : null)) {
  const hostname = currentLocation?.hostname || '';
  const isLocal = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
  return isLocal ? 'http://localhost:8788' : 'https://webtest.ducanhn.autos';
}

export function readDashboardState(input) {
  const url = input instanceof URL ? input : new URL(input);
  const state = {
    classId: url.searchParams.get('classId') || '',
    assignmentId: url.searchParams.get('assignmentId') || ''
  };
  const attemptId = url.searchParams.get('attemptId');
  if (attemptId !== null && attemptId !== '') state.attemptId = attemptId;
  const q = url.searchParams.get('q');
  if (q !== null && q !== '') state.q = q;
  const status = url.searchParams.get('status');
  if (status !== null && status !== '') state.status = status;
  const minScore = url.searchParams.get('minScore');
  if (minScore !== null && minScore !== '') state.minScore = minScore;
  const maxScore = url.searchParams.get('maxScore');
  if (maxScore !== null && maxScore !== '') state.maxScore = maxScore;
  const skill = url.searchParams.get('skill');
  if (skill !== null && skill !== '') state.skill = skill;
  const sortBy = url.searchParams.get('sortBy');
  if (sortBy !== null && sortBy !== '') state.sortBy = sortBy;
  const sortDir = url.searchParams.get('sortDir');
  if (sortDir !== null && sortDir !== '') state.sortDir = sortDir;
  const page = url.searchParams.get('page');
  if (page !== null && page !== '') {
    const parsedPage = Number.parseInt(page, 10);
    state.page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  }
  return state;
}

export function assignmentUrl(input, state) {
  const url = input instanceof URL ? new URL(input) : new URL(input);
  const keys = ['classId', 'assignmentId', 'attemptId', 'q', 'status', 'minScore', 'maxScore', 'skill', 'sortBy', 'sortDir', 'page'];
  for (const key of keys) {
    if (state[key] !== undefined && state[key] !== null && state[key] !== '' && (key !== 'page' || Number(state[key]) > 1)) {
      url.searchParams.set(key, String(state[key]));
    } else {
      url.searchParams.delete(key);
    }
  }
  return url;
}

export function fixtureHeaders({ actorId }) {
  return { 'X-Teacher-Fixture-Id': actorId.trim() };
}

export function authLoginPath() {
  return '/api/teacher/auth/login';
}

export function authLogoutPath() {
  return '/api/teacher/auth/logout';
}

export function authMePath() {
  return '/api/teacher/auth/me';
}

export function authHeaders({ token = '', actorId = '' } = {}) {
  if (token && typeof token === 'string' && token.trim()) {
    return { 'Authorization': `Bearer ${token.trim()}` };
  }
  if (actorId && typeof actorId === 'string' && actorId.trim()) {
    return { 'X-Teacher-Fixture-Id': actorId.trim() };
  }
  return {};
}

export function teacherRoleLabel(role, courseCodes = []) {
  if (role === 'admin') return 'Quản trị viên (Toàn quyền)';
  if (role === 'lead') {
    const khoiList = courseCodes && courseCodes.length > 0 ? courseCodes.join(', ') : 'Khối';
    return `Trưởng bộ môn (Khối ${khoiList})`;
  }
  if (role === 'qm') return 'Quản lý chất lượng';
  return 'Giáo viên phụ trách lớp';
}

export function assignmentResultsPath(classId, assignmentId, options = {}) {
  const base = `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/results`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null && value !== '' && (key !== 'page' || Number(value) > 1)) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function attemptDetailPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}`;
}

export function manualGradingDraftPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/draft`;
}

export function manualGradingCompletePath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/complete`;
}

export function attemptPublishPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/publish`;
}

export function assignmentPublishAllPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/publish`;
}

export function assignmentRosterPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/roster`;
}

export function eligibleStudentsPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/eligible-students`;
}

export function studentTransferPath(classId, studentRef) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentRef)}/transfer`;
}

export function grantRetakePath(classId, assignmentId, studentRef) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/students/${encodeURIComponent(studentRef)}/retake`;
}


export function formatPublicationStatus(publication) {
  if (!publication || !publication.published) return 'Chưa công bố';
  return 'Đã công bố';
}

export function validateManualGradingScores(items, scores) {
  for (const item of items) {
    if (item.canGrade) {
      const val = scores[item.itemVersionId];
      if (item.needsReview && (val === undefined || val === null || val === '')) {
        return { valid: false, message: 'Còn câu cần duyệt chưa được chấm.' };
      }
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0 || num > item.maxScore) {
          return { valid: false, message: `Điểm câu ${item.position} không hợp lệ (0 - ${item.maxScore}).` };
        }
      }
    }
  }
  return { valid: true, message: '' };
}

export function formatDashboardScore(score) {
  if (!score) return '—';
  if (score.status === 'pending') return 'Chờ chấm';
  const value = `${score.earned}/${score.maximum}`;
  return score.status === 'provisional' ? `${value} · Tạm tính` : value;
}

export function resultStatusLabel(status) {
  return ({
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    retake_granted: 'Được phép làm lại',
    retaking: 'Đang làm lại',
    retake_expired: 'Quyền làm lại đã hết hạn',
    grading: 'Đang chấm',
    review_required: 'Cần duyệt',
    complete: 'Hoàn tất'
  })[status] || status;
}

export function attemptStatusLabel(status) {
  return ({
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    active: 'Đang làm',
    submitted: 'Đã nộp',
    superseded: 'Bị thay thế',
    expired: 'Hết hạn'
  })[status] || status;
}

export function verdictLabel(verdict) {
  return ({
    correct: 'Đúng',
    incorrect: 'Sai',
    partial: 'Đúng một phần',
    pending: 'Chờ chấm',
    manual_review: 'Cần duyệt',
    ungraded: 'Chưa chấm',
    not_submitted: 'Chưa nộp'
  })[verdict] || verdict;
}

export function formatAssignmentWindow(opensAt, closesAt, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  if (!opensAt && !closesAt) return 'Không giới hạn thời gian';
  const format = value => value ? new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone
  }).format(new Date(value)) : 'Không giới hạn';
  return `${format(opensAt)} → ${format(closesAt)} (${timeZone})`;
}

export function formatCurrentTime(date = new Date(), locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone
  }).format(date);
}

const CANONICAL_SKILL_LABELS = {
  vocabulary: 'Vocabulary',
  listening: 'Listening',
  pronunciation: 'Pronunciation',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
  grammar: 'Grammar',
  general: 'Chung'
};

export function extractAttemptSkills(items = []) {
  const skillMap = new Map();
  const sectionMap = new Map();
  let totalScoreEarned = 0;
  let totalMaxScore = 0;
  let totalNeedsReview = 0;

  for (const item of items) {
    const code = (item.primarySkill || 'general').toLowerCase();
    const scoreEarned = Number(item.scoreEarned) || 0;
    const maxScore = Number(item.maxScore) || 0;
    const needsReview = Boolean(item.needsReview);

    totalScoreEarned += scoreEarned;
    totalMaxScore += maxScore;
    if (needsReview) totalNeedsReview += 1;

    if (!skillMap.has(code)) {
      skillMap.set(code, {
        code,
        label: CANONICAL_SKILL_LABELS[code] || (code.charAt(0).toUpperCase() + code.slice(1)),
        totalItems: 0,
        needsReviewCount: 0,
        scoreEarned: 0,
        maxScore: 0
      });
    }
    const skillStat = skillMap.get(code);
    skillStat.totalItems += 1;
    skillStat.scoreEarned += scoreEarned;
    skillStat.maxScore += maxScore;
    if (needsReview) skillStat.needsReviewCount += 1;

    // Track Section
    const secId = item.sectionId || item.sectionTitle || `sec-${code}`;
    const secTitle = item.sectionTitle || (CANONICAL_SKILL_LABELS[code] ? `Phần ${CANONICAL_SKILL_LABELS[code]}` : 'Phần bài tập');
    if (!sectionMap.has(secId)) {
      sectionMap.set(secId, {
        id: secId,
        title: secTitle,
        skillCode: code,
        totalItems: 0,
        correctCount: 0,
        needsReviewCount: 0,
        scoreEarned: 0,
        maxScore: 0,
        items: []
      });
    }
    const secStat = sectionMap.get(secId);
    secStat.totalItems += 1;
    if (item.verdict === 'correct') secStat.correctCount += 1;
    if (needsReview) secStat.needsReviewCount += 1;
    secStat.scoreEarned = Math.round((secStat.scoreEarned + scoreEarned) * 100) / 100;
    secStat.maxScore = Math.round((secStat.maxScore + maxScore) * 100) / 100;
    secStat.items.push(item);
  }

  const skills = Array.from(skillMap.values());
  const sections = Array.from(sectionMap.values());
  const summary = {
    all: {
      code: 'all',
      label: 'Tất cả kỹ năng',
      totalItems: items.length,
      needsReviewCount: totalNeedsReview,
      scoreEarned: Math.round(totalScoreEarned * 100) / 100,
      maxScore: Math.round(totalMaxScore * 100) / 100
    }
  };

  for (const skill of skills) {
    summary[skill.code] = {
      ...skill,
      scoreEarned: Math.round(skill.scoreEarned * 100) / 100,
      maxScore: Math.round(skill.maxScore * 100) / 100
    };
  }

  return { skills, summary, sections };
}

export function formatCompactPrompt(item) {
  const options = Array.isArray(item.options) ? item.options : [];
  const optionsCount = options.length;
  const isExtensive = optionsCount > 4 || item.interactionType === 'text_select_pair';
  return {
    text: item.prompt || `Câu hỏi số ${item.position}`,
    optionsCount,
    hasExtensiveOptions: isExtensive
  };
}

export function resolveStudentAnswerDisplay(item) {
  if (item.studentAnswer === null || item.studentAnswer === undefined || item.studentAnswer === '') {
    return '(Chưa trả lời)';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(item.studentAnswer)) {
    return item.studentAnswer.map(ans => optMap.get(String(ans)) || String(ans)).join(', ');
  }

  const raw = String(item.studentAnswer);
  if (optMap.has(raw)) {
    return `${optMap.get(raw)} (${raw})`;
  }
  return raw;
}

export function resolveExpectedAnswerDisplay(item) {
  if (item.expectedAnswer === null || item.expectedAnswer === undefined || item.expectedAnswer === '') {
    return item.graderType === 'rubric_async' ? '(Chấm theo rubric)' : '—';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(item.expectedAnswer)) {
    return item.expectedAnswer.map(ans => optMap.get(String(ans)) || String(ans)).join(', ');
  }

  const raw = String(item.expectedAnswer);
  if (optMap.has(raw)) {
    return `${optMap.get(raw)} (${raw})`;
  }
  return raw;
}

async function startDashboard() {
  const form = document.querySelector('#identity-form');
  const classSelect = document.querySelector('#class-select');
  const assignments = document.querySelector('#assignments');
  const results = document.querySelector('#results');
  const resultsContent = document.querySelector('#results-content');
  const assignmentHeading = document.querySelector('#assignment-heading');
  const assignmentMeta = document.querySelector('#assignment-meta');
  const status = document.querySelector('#status');
  const lastUpdated = document.querySelector('#last-updated');
  const refreshBtn = document.querySelector('#refresh-btn');
  const publishAllBtn = document.querySelector('#publish-all-btn');
  let currentResultsPayload = null;

  const addStudentBtn = document.querySelector('#add-student-btn');
  const addStudentModal = document.querySelector('#add-student-modal');
  const addStudentForm = document.querySelector('#add-student-form');
  const eligibleStudentSelect = document.querySelector('#eligible-student-select');
  const addStudentRefInput = document.querySelector('#add-student-ref-input');
  const addStudentNameInput = document.querySelector('#add-student-name-input');
  const addStudentDiscInput = document.querySelector('#add-student-disc-input');
  const addStudentError = document.querySelector('#add-student-error');
  const cancelAddStudentBtn = document.querySelector('#cancel-add-student-btn');

  const grantRetakeModal = document.querySelector('#grant-retake-modal');
  const grantRetakeForm = document.querySelector('#grant-retake-form');
  const grantRetakeBtn = document.querySelector('#grant-retake-btn');
  const retakeStudentName = document.querySelector('#retake-student-name');
  const retakeStudentRefInput = document.querySelector('#retake-student-ref-input');
  const retakeReasonInput = document.querySelector('#retake-reason-input');
  const retakeAvailableFromInput = document.querySelector('#retake-available-from-input');
  const retakeExpiresAtInput = document.querySelector('#retake-expires-at-input');
  const cancelGrantRetakeBtn = document.querySelector('#cancel-grant-retake-btn');
  const grantRetakeError = document.querySelector('#grant-retake-error');

  const searchInput = document.querySelector('#search-input');
  const statusFilter = document.querySelector('#status-filter');
  const skillFilter = document.querySelector('#skill-filter');
  const minScoreInput = document.querySelector('#min-score-input');
  const maxScoreInput = document.querySelector('#max-score-input');
  const sortBySelect = document.querySelector('#sort-by-select');
  const sortDirSelect = document.querySelector('#sort-dir-select');
  const resetFiltersBtn = document.querySelector('#reset-filters-btn');
  const paginationInfo = document.querySelector('#pagination-info');
  const prevPageBtn = document.querySelector('#prev-page-btn');
  const nextPageBtn = document.querySelector('#next-page-btn');
  const attemptDetail = document.querySelector('#attempt-detail');
  const closeAttemptDetailBtn = document.querySelector('#close-attempt-detail-btn');
  const detailHeading = document.querySelector('#detail-heading');
  const detailMeta = document.querySelector('#detail-meta');
  const detailScores = document.querySelector('#detail-scores');
  const detailItems = document.querySelector('#detail-items');
  const detailAttemptHistory = document.querySelector('#detail-attempt-history');
  const detailGradingHistory = document.querySelector('#detail-grading-history');
  const attemptSkillTabs = document.querySelector('#attempt-skill-tabs');
  const skillSummaryCard = document.querySelector('#skill-summary-card');
  const detailItemsTable = document.querySelector('#detail-items-table');
  const detailItemsBody = document.querySelector('#detail-items-body');
  const itemContextModal = document.querySelector('#item-context-modal');
  const modalItemTitle = document.querySelector('#modal-item-title');
  const modalItemContent = document.querySelector('#modal-item-content');
  const closeItemModalBtn = document.querySelector('#close-item-modal-btn');
  let currentSkillTab = 'all';

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (closeItemModalBtn && itemContextModal) {
    closeItemModalBtn.addEventListener('click', () => {
      itemContextModal.close();
    });
  }

  const saveDraftBtn = document.querySelector('#save-draft-btn');
  const completeGradingBtn = document.querySelector('#complete-grading-btn');
  const publishResultBtn = document.querySelector('#publish-result-btn');
  const draftStatusMsg = document.querySelector('#draft-status-msg');
  const conflictAlert = document.querySelector('#conflict-alert');
  const gradingActionsBar = document.querySelector('#grading-actions-bar');
  const assignmentLinkBar = document.querySelector('#assignment-link-bar');
  const assignmentStudentUrl = document.querySelector('#assignment-student-url');
  const copyStudentLinkBtn = document.querySelector('#copy-student-link-btn');
  const openStudentLinkBtn = document.querySelector('#open-student-link-btn');

  if (copyStudentLinkBtn) {
    copyStudentLinkBtn.addEventListener('click', async () => {
      const url = assignmentStudentUrl?.value;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const originalText = copyStudentLinkBtn.textContent;
        copyStudentLinkBtn.textContent = '✓ Đã sao chép!';
        setTimeout(() => { copyStudentLinkBtn.textContent = originalText; }, 2000);
      } catch {
        assignmentStudentUrl?.select();
        document.execCommand('copy');
      }
    });
  }

  let currentAttemptDetail = null;

  const state = readDashboardState(location.href);

  // Sync inputs from initial state
  if (state.q) searchInput.value = state.q;
  if (state.status) statusFilter.value = state.status;
  if (state.minScore) minScoreInput.value = state.minScore;
  if (state.maxScore) maxScoreInput.value = state.maxScore;
  if (state.sortBy) sortBySelect.value = state.sortBy;
  if (state.sortDir) sortDirSelect.value = state.sortDir;

  const loginForm = document.querySelector('#login-form');
  const loginApiBase = document.querySelector('#login-api-base');
  const loginEmail = document.querySelector('#login-email');
  const loginPhone = document.querySelector('#login-phone');
  const loginError = document.querySelector('#login-error');
  const toggleFixtureBtn = document.querySelector('#toggle-fixture-btn');
  const teacherProfile = document.querySelector('#teacher-profile');
  const teacherProfileName = document.querySelector('#teacher-profile-name');
  const teacherProfileMeta = document.querySelector('#teacher-profile-meta');
  const teacherRoleBadge = document.querySelector('#teacher-role-badge');
  const logoutBtn = document.querySelector('#logout-btn');

  let sessionToken = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('izone_teacher_token') || '') : '';

  const currentLocation = typeof window !== 'undefined' ? window.location : null;
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(currentLocation?.hostname || '');
  const standardApiBase = defaultApiBase(currentLocation);

  if (loginApiBase) {
    if (!loginApiBase.value || (!isLocalHost && loginApiBase.value.includes('localhost'))) {
      loginApiBase.value = standardApiBase;
    }
  }
  if (form?.elements?.apiBase) {
    if (!form.elements.apiBase.value || (!isLocalHost && form.elements.apiBase.value.includes('localhost'))) {
      form.elements.apiBase.value = standardApiBase;
    }
  }

  const identity = () => ({ actorId: form?.elements?.actorId?.value || '' });
  const apiBase = () => (loginApiBase?.value || form?.elements?.apiBase?.value || standardApiBase).replace(/\/$/, '');
  const authHeader = () => authHeaders({ token: sessionToken, actorId: form?.elements?.actorId?.value });

  const request = async (path, options = {}) => {
    const headers = { ...authHeader(), ...(options.headers || {}) };
    const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && sessionToken) {
      handleLogout();
      if (loginError) {
        loginError.hidden = false;
        loginError.textContent = 'Phiên làm việc đã kết thúc hoặc không hợp lệ. Vui lòng đăng nhập lại.';
      }
      throw new Error(payload.message || 'Yêu cầu đăng nhập.');
    }
    if (!response.ok) throw new Error(payload.message || 'Không tải được dữ liệu.');
    return payload;
  };
  const setUrl = () => history.replaceState(null, '', assignmentUrl(location.href, state));

  function appendCell(row, value, className = '') {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = value;
    row.append(cell);
  }

  function renderResults(payload) {
    currentResultsPayload = payload;
    resultsContent.replaceChildren();
    if (assignmentHeading) assignmentHeading.textContent = payload.assignment.title;
    if (assignmentMeta) {
      assignmentMeta.textContent = `${payload.assignment.className} · Khối ${payload.assignment.courseCode} · Phiên bản ${payload.assignment.formVersion}`;
    }

    if (assignmentLinkBar) {
      if (payload.assignment?.studentUrl) {
        assignmentLinkBar.hidden = false;
        if (assignmentStudentUrl) assignmentStudentUrl.value = payload.assignment.studentUrl;
        if (openStudentLinkBtn) openStudentLinkBtn.href = payload.assignment.studentUrl;
      } else {
        assignmentLinkBar.hidden = true;
      }
    }

    // Populate skill filter dropdown if needed
    if (skillFilter) {
      const currentSkill = skillFilter.value;
      skillFilter.replaceChildren(new Option('Tổng điểm', ''));
      for (const skill of payload.skills) {
        skillFilter.add(new Option(`Kỹ năng: ${skill.code.toUpperCase()}`, skill.code));
      }
      skillFilter.value = state.skill || currentSkill || '';
    }

    const scroll = document.createElement('div');
    scroll.className = 'results-scroll';
    const table = document.createElement('table');
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of ['Học viên', 'Trạng thái', 'Công bố', 'Tổng', ...payload.skills.map(skill => skill.code), 'Nộp lúc', 'Thao tác']) {
      const header = document.createElement('th');
      header.scope = 'col';
      header.textContent = label;
      headerRow.append(header);
    }
    head.append(headerRow);
    const body = document.createElement('tbody');

    if (payload.students.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = payload.skills.length + 6;
      emptyCell.className = 'empty-results';
      emptyCell.textContent = 'Không tìm thấy học viên nào phù hợp với bộ lọc.';
      emptyRow.append(emptyCell);
      body.append(emptyRow);
    } else {
      for (const student of payload.students) {
        const row = document.createElement('tr');
        const nameCell = document.createElement('td');
        const nameText = student.discriminator ? `${student.name} · ${student.discriminator}` : student.name;
        nameCell.textContent = nameText;
        if (student.leftClass) {
          const leftBadge = document.createElement('span');
          leftBadge.className = 'badge-left-class';
          leftBadge.textContent = 'Không còn trong lớp';
          nameCell.append(leftBadge);
        }
        row.append(nameCell);
        appendCell(row, resultStatusLabel(student.status), `result-status ${student.status}`);

        appendCell(row, student.published ? 'Đã công bố' : 'Chưa công bố', `badge-pub ${student.published ? 'is-pub' : ''}`);
        appendCell(row, formatDashboardScore(student.total), 'score');
        for (const skill of payload.skills) appendCell(row, formatDashboardScore(student.skills[skill.code]), 'score');
        appendCell(row, student.submittedAt ? formatAssignmentWindow(student.submittedAt, null).split(' → ')[0] : '—');

        const actionCell = document.createElement('td');
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'table-actions';
        if (student.attemptId) {
          const detailBtn = document.createElement('button');
          detailBtn.type = 'button';
          detailBtn.className = 'btn-secondary btn-sm';
          detailBtn.textContent = 'Xem chi tiết';
          detailBtn.addEventListener('click', () => {
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
        retakeBtn.className = 'btn-secondary btn-sm';
        retakeBtn.textContent = 'Làm lại';
        retakeBtn.title = 'Cấp quyền làm lại bài thi';
        retakeBtn.addEventListener('click', () => {
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
      detailHeading.textContent = `${payload.student.name}${payload.student.discriminator ? ' · ' + payload.student.discriminator : ''}`;
    }

    if (detailMeta) {
      detailMeta.replaceChildren();
      const badges = [
        `Lớp: ${payload.class.name} (${payload.class.courseCode})`,
        `Bài: ${payload.assignment.title}`,
        `Phiên bản đề: ${payload.attempt.formVersion}`,
        `Trạng thái: ${attemptStatusLabel(payload.attempt.status)}`,
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
        modalItemTitle.textContent = `Câu ${item.position} · ${item.interactionType}${skillLabel}`;
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
        for (const opt of item.options) {
          const li = document.createElement('li');
          const isSelected = item.studentAnswer === opt.id || (Array.isArray(item.studentAnswer) && item.studentAnswer.includes(opt.id));
          if (isSelected) li.className = 'is-selected';
          li.textContent = `${opt.id}: ${opt.label}${isSelected ? ' (Học viên chọn)' : ''}`;
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
              <span class="sec-header-title">📚 ${escapeHtml(section.title)}</span>
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

          // 1. # Column
          const tdPos = document.createElement('td');
          tdPos.innerHTML = `
            <div class="q-col-pos">
              <span class="q-pos-num">Câu ${item.position}</span>
              <span class="q-type-badge">${item.interactionType}</span>
              ${item.primarySkill ? `<span class="q-skill-badge">${item.primarySkill.toUpperCase()}</span>` : ''}
            </div>
          `;
          tr.append(tdPos);

          // 2. Prompt Column
          const tdPrompt = document.createElement('td');
          const compactPrompt = formatCompactPrompt(item);
          const optBtnHtml = compactPrompt.hasExtensiveOptions
            ? `<button type="button" class="prompt-opt-btn" data-item-id="${item.itemVersionId}">📋 Xem danh sách từ (${compactPrompt.optionsCount})</button>`
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
          tdAction.innerHTML = `<button type="button" class="btn-inspect-item" data-item-id="${item.itemVersionId}">🔍 Xem</button>`;
          tr.append(tdAction);

          detailItemsBody.append(tr);
        }
      }

      // Attach event listeners for prompt opt buttons and inspect item buttons
      detailItemsBody.querySelectorAll('.prompt-opt-btn, .btn-inspect-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const itm = items.find(i => i.itemVersionId === btn.dataset.itemId);
          if (itm) openItemContextModal(itm);
        });
      });

      // Attach auto-save listener on table score and feedback inputs
      const scoreInputs = detailItemsBody.querySelectorAll('.grade-score-input');
      const feedbackInputs = detailItemsBody.querySelectorAll('.grade-feedback-input');
      [...scoreInputs, ...feedbackInputs].forEach(inp => {
        inp.addEventListener('input', () => {
          const itm = items.find(i => i.itemVersionId === inp.dataset.itemId);
          if (itm) {
            if (inp.classList.contains('grade-score-input')) {
              itm.draftScore = inp.value.trim() !== '' ? Number(inp.value.trim()) : null;
            } else if (inp.classList.contains('grade-feedback-input')) {
              itm.draftFeedback = inp.value;
            }
          }
          clearTimeout(autoSaveTimeout);
          autoSaveTimeout = setTimeout(() => {
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
      allBtn.addEventListener('click', () => {
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
        skillBtn.addEventListener('click', () => {
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

    if (payload.manualGradingHistory && payload.manualGradingHistory.length > 0 && detailGradingHistory) {
      const mgHeader = document.createElement('h4');
      mgHeader.textContent = 'Lịch sử chấm của giảng viên';
      mgHeader.style.margin = '16px 0 6px';
      const mgTable = document.createElement('table');
      mgTable.className = 'mini-table';
      mgTable.innerHTML = `
        <thead>
          <tr>
            <th>Hành động</th>
            <th>Người thực hiện</th>
            <th>Phiên bản</th>
            <th>Thời gian</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
      `;
      const mgBody = document.createElement('tbody');
      for (const log of payload.manualGradingHistory) {
        const row = document.createElement('tr');
        const actionLabel = log.action === 'complete' ? 'Hoàn tất chấm' : 'Lưu nháp';
        row.innerHTML = `
          <td><span class="result-status ${log.action === 'complete' ? 'complete' : 'grading'}">${actionLabel}</span></td>
          <td>${log.actorEmail || '—'}</td>
          <td>v${log.revision}</td>
          <td>${log.createdAt ? formatAssignmentWindow(log.createdAt, null).split(' → ')[0] : '—'}</td>
          <td>${log.note || '—'}</td>
        `;
        mgBody.append(row);
      }
      mgTable.append(mgBody);
      detailGradingHistory.append(mgHeader, mgTable);
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

    if (results) results.hidden = true;
    attemptDetail.hidden = false;
  }

  async function loadAttemptDetail(classId, assignmentId, attemptId) {
    if (!classId || !assignmentId || !attemptId) {
      if (attemptDetail) attemptDetail.hidden = true;
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
    if (assignmentStudentUrl) assignmentStudentUrl.value = '';
    if (openStudentLinkBtn) openStudentLinkBtn.href = '#';
    if (assignmentLinkBar) assignmentLinkBar.hidden = true;
    await loadResults('', '');
    if (!classId) return;
    status.textContent = 'Đang tải bài được giao…';
    const payload = await request(`/api/teacher/classes/${encodeURIComponent(classId)}/assignments`);
    let selectedExists = false;
    for (const assignment of payload.assignments) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `assignment-card${assignment.assignmentId === selectedAssignmentId ? ' selected' : ''}`;
      if (assignment.assignmentId === selectedAssignmentId) selectedExists = true;
      const linkSnippet = assignment.studentUrl
        ? `<span class="card-link-row"><span class="card-copy-btn" data-url="${encodeURIComponent(assignment.studentUrl)}">📋 Sao chép link học viên</span></span>`
        : '';
      card.innerHTML = `<strong>${assignment.title}</strong><span>Khối ${assignment.courseCode} · Phase ${assignment.phase ?? '—'}</span><span>${formatAssignmentWindow(assignment.opensAt, assignment.closesAt)}</span><span class="status">${assignment.status}</span>${linkSnippet}`;
      card.addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.card-copy-btn');
        if (copyBtn) {
          e.stopPropagation();
          const targetUrl = decodeURIComponent(copyBtn.dataset.url);
          navigator.clipboard.writeText(targetUrl).then(() => {
            const original = copyBtn.textContent;
            copyBtn.textContent = '✓ Đã chép!';
            setTimeout(() => { copyBtn.textContent = original; }, 1500);
          }).catch(() => {});
          return;
        }
        assignments.querySelectorAll('.selected').forEach(node => node.classList.remove('selected'));
        card.classList.add('selected');
        state.classId = classId;
        state.assignmentId = assignment.assignmentId;
        state.page = 1;
        setUrl();
        if (assignmentStudentUrl) assignmentStudentUrl.value = assignment.studentUrl || '';
        if (openStudentLinkBtn) openStudentLinkBtn.href = assignment.studentUrl || '#';
        if (assignmentLinkBar) assignmentLinkBar.hidden = !assignment.studentUrl;
        loadResults(classId, assignment.assignmentId).catch(error => { status.textContent = error.message; });
      });
      assignments.append(card);
    }
    status.textContent = `${payload.assignments.length} bài được giao`;
    const activeAssignment = payload.assignments.find(a => a.assignmentId === (selectedAssignmentId || state.assignmentId));
    if (activeAssignment) {
      if (assignmentStudentUrl) assignmentStudentUrl.value = activeAssignment.studentUrl || '';
      if (openStudentLinkBtn) openStudentLinkBtn.href = activeAssignment.studentUrl || '#';
      if (assignmentLinkBar) assignmentLinkBar.hidden = !activeAssignment.studentUrl;
    } else {
      if (assignmentStudentUrl) assignmentStudentUrl.value = '';
      if (openStudentLinkBtn) openStudentLinkBtn.href = '#';
      if (assignmentLinkBar) assignmentLinkBar.hidden = true;
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
          const attemptContainer = document.querySelector('#attempt-detail');
          if (attemptContainer) attemptContainer.hidden = true;
          if (loginError && loginError.textContent.includes('Không tìm thấy bài làm')) {
            loginError.hidden = true;
            loginError.textContent = '';
          }
        }
      }
    }
  }

  async function loadClasses() {
    status.textContent = 'Đang kiểm tra quyền…';
    const payload = await request('/api/teacher/classes');
    classSelect.replaceChildren(new Option('Chọn lớp', ''));
    for (const item of payload.classes) {
      classSelect.add(new Option(`${item.name} · Khối ${item.courseCode} · ${item.assignmentCount} bài`, item.classId));
    }
    classSelect.value = state.classId;
    status.textContent = `${payload.classes.length} lớp được phép truy cập`;
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
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilterChange, 300);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      state.status = statusFilter.value;
      applyFilterChange();
    });
  }

  if (skillFilter) {
    skillFilter.addEventListener('change', () => {
      state.skill = skillFilter.value;
      applyFilterChange();
    });
  }

  if (minScoreInput) {
    minScoreInput.addEventListener('change', () => {
      state.minScore = minScoreInput.value;
      applyFilterChange();
    });
  }

  if (maxScoreInput) {
    maxScoreInput.addEventListener('change', () => {
      state.maxScore = maxScoreInput.value;
      applyFilterChange();
    });
  }

  if (sortBySelect) {
    sortBySelect.addEventListener('change', () => {
      state.sortBy = sortBySelect.value;
      applyFilterChange();
    });
  }

  if (sortDirSelect) {
    sortDirSelect.addEventListener('change', () => {
      state.sortDir = sortDirSelect.value;
      applyFilterChange();
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
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
    span.textContent = `⚠️ ${msg}`;
    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'btn-secondary';
    reloadBtn.textContent = 'Tải lại bài làm';
    reloadBtn.addEventListener('click', () => {
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
    saveDraftBtn.addEventListener('click', () => {
      saveManualGradingDraft(false).catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  if (completeGradingBtn) {
    completeGradingBtn.addEventListener('click', () => {
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
    publishResultBtn.addEventListener('click', () => {
      publishAttemptResult().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  if (closeAttemptDetailBtn) {
    closeAttemptDetailBtn.addEventListener('click', () => {
      if (attemptDetail) attemptDetail.hidden = true;
      if (results) results.hidden = false;
      delete state.attemptId;
      setUrl();
      loadResults(state.classId, state.assignmentId).catch(() => {});
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
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

  if (publishAllBtn) {
    publishAllBtn.addEventListener('click', () => {
      publishAllResults().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', async () => {
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
    eligibleStudentSelect.addEventListener('change', () => {
      const selected = eligibleStudentSelect.selectedOptions[0];
      if (selected && selected.value) {
        if (addStudentRefInput) addStudentRefInput.value = selected.value;
        if (addStudentNameInput) addStudentNameInput.value = selected.dataset.name || '';
        if (addStudentDiscInput) addStudentDiscInput.value = selected.dataset.discriminator || '';
      }
    });
  }

  if (cancelAddStudentBtn) {
    cancelAddStudentBtn.addEventListener('click', () => {
      if (typeof addStudentModal?.close === 'function') {
        addStudentModal.close();
      } else if (addStudentModal) {
        addStudentModal.hidden = true;
      }
    });
  }

  if (addStudentForm) {
    addStudentForm.addEventListener('submit', async event => {
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
    grantRetakeBtn.addEventListener('click', () => {
      if (!currentAttemptDetail) return;
      openGrantRetakeModal({
        studentRef: currentAttemptDetail.student.studentRef,
        studentName: currentAttemptDetail.student.name,
        discriminator: currentAttemptDetail.student.discriminator
      });
    });
  }

  if (cancelGrantRetakeBtn) {
    cancelGrantRetakeBtn.addEventListener('click', () => {
      if (typeof grantRetakeModal?.close === 'function') {
        grantRetakeModal.close();
      } else if (grantRetakeModal) {
        grantRetakeModal.hidden = true;
      }
    });
  }

  if (grantRetakeForm) {
    grantRetakeForm.addEventListener('submit', async event => {
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
    prevPageBtn.addEventListener('click', () => {
      if ((state.page || 1) > 1) {
        state.page = (state.page || 1) - 1;
        setUrl();
        loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      state.page = (state.page || 1) + 1;
      setUrl();
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
    });
  }

  function renderTeacherProfile(teacher) {
    if (!teacher) return;
    if (teacherProfileName) teacherProfileName.textContent = teacher.name || teacher.email;
    if (teacherProfileMeta) teacherProfileMeta.textContent = `${teacher.email} · SĐT: ${teacher.phone || '—'}`;
    if (teacherRoleBadge) {
      teacherRoleBadge.textContent = teacherRoleLabel(teacher.role, teacher.courseCodes);
      teacherRoleBadge.className = `role-badge ${teacher.role || 'teacher'}`;
    }
    if (loginForm) loginForm.hidden = true;
    if (teacherProfile) teacherProfile.hidden = false;
    if (loginError) loginError.hidden = true;
  }

  function handleLogout() {
    sessionToken = '';
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('izone_teacher_token');
      sessionStorage.removeItem('izone_teacher_profile');
    }
    if (teacherProfile) teacherProfile.hidden = true;
    if (loginForm) loginForm.hidden = false;
    if (classSelect) classSelect.replaceChildren(new Option('Chọn lớp', ''));
    if (assignments) assignments.replaceChildren();
    if (results) results.hidden = true;
    if (attemptDetail) attemptDetail.hidden = true;
    if (status) status.textContent = 'Đã đăng xuất. Vui lòng đăng nhập lại.';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
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
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
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
    toggleFixtureBtn.addEventListener('click', () => {
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

  form.addEventListener('submit', event => {
    event.preventDefault();
    loadClasses().catch(error => { status.textContent = error.message; });
  });

  classSelect.addEventListener('change', () => {
    state.classId = classSelect.value;
    state.assignmentId = '';
    state.page = 1;
    setUrl();
    loadAssignments(classSelect.value).catch(error => { status.textContent = error.message; });
  });

  // Light periodic polling every 30 seconds if visible and active
  setInterval(() => {
    if (!document.hidden && state.classId && state.assignmentId) {
      loadResults(state.classId, state.assignmentId).catch(() => {});
    }
  }, 30000);
}

if (typeof document !== 'undefined') startDashboard();
