export function readDashboardState(input) {
  const url = input instanceof URL ? input : new URL(input);
  const state = {
    classId: url.searchParams.get('classId') || '',
    assignmentId: url.searchParams.get('assignmentId') || ''
  };
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
  const keys = ['classId', 'assignmentId', 'q', 'status', 'minScore', 'maxScore', 'skill', 'sortBy', 'sortDir', 'page'];
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
    grading: 'Đang chấm',
    review_required: 'Cần duyệt',
    complete: 'Hoàn tất'
  })[status] || status;
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

  const state = readDashboardState(location.href);

  // Sync inputs from initial state
  if (state.q) searchInput.value = state.q;
  if (state.status) statusFilter.value = state.status;
  if (state.minScore) minScoreInput.value = state.minScore;
  if (state.maxScore) maxScoreInput.value = state.maxScore;
  if (state.sortBy) sortBySelect.value = state.sortBy;
  if (state.sortDir) sortDirSelect.value = state.sortDir;

  const identity = () => ({ actorId: form.elements.actorId.value });
  const apiBase = () => form.elements.apiBase.value.replace(/\/$/, '');
  const request = async path => {
    const response = await fetch(`${apiBase()}${path}`, { headers: fixtureHeaders(identity()) });
    const payload = await response.json();
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
    resultsContent.replaceChildren();
    if (assignmentHeading) assignmentHeading.textContent = payload.assignment.title;
    if (assignmentMeta) {
      assignmentMeta.textContent = `${payload.assignment.className} · Khối ${payload.assignment.courseCode} · Phiên bản ${payload.assignment.formVersion}`;
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
    for (const label of ['Học viên', 'Trạng thái', 'Tổng', ...payload.skills.map(skill => skill.code), 'Nộp lúc']) {
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
      emptyCell.colSpan = payload.skills.length + 4;
      emptyCell.className = 'empty-results';
      emptyCell.textContent = 'Không tìm thấy học viên nào phù hợp với bộ lọc.';
      emptyRow.append(emptyCell);
      body.append(emptyRow);
    } else {
      for (const student of payload.students) {
        const row = document.createElement('tr');
        appendCell(row, student.discriminator ? `${student.name} · ${student.discriminator}` : student.name);
        appendCell(row, resultStatusLabel(student.status), `result-status ${student.status}`);
        appendCell(row, formatDashboardScore(student.total), 'score');
        for (const skill of payload.skills) appendCell(row, formatDashboardScore(student.skills[skill.code]), 'score');
        appendCell(row, student.submittedAt ? formatAssignmentWindow(student.submittedAt, null).split(' → ')[0] : '—');
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
      card.innerHTML = `<strong>${assignment.title}</strong><span>Khối ${assignment.courseCode} · Phase ${assignment.phase ?? '—'}</span><span>${formatAssignmentWindow(assignment.opensAt, assignment.closesAt)}</span><span class="status">${assignment.status}</span>`;
      card.addEventListener('click', () => {
        assignments.querySelectorAll('.selected').forEach(node => node.classList.remove('selected'));
        card.classList.add('selected');
        state.classId = classId;
        state.assignmentId = assignment.assignmentId;
        state.page = 1;
        setUrl();
        loadResults(classId, assignment.assignmentId).catch(error => { status.textContent = error.message; });
      });
      assignments.append(card);
    }
    status.textContent = `${payload.assignments.length} bài được giao`;
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

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
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
