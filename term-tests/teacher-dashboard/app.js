export function readDashboardState(input) {
  const url = input instanceof URL ? input : new URL(input);
  return {
    classId: url.searchParams.get('classId') || '',
    assignmentId: url.searchParams.get('assignmentId') || ''
  };
}

export function assignmentUrl(input, state) {
  const url = input instanceof URL ? new URL(input) : new URL(input);
  for (const key of ['classId', 'assignmentId']) {
    if (state[key]) url.searchParams.set(key, state[key]);
    else url.searchParams.delete(key);
  }
  return url;
}

export function fixtureHeaders({ actorId }) {
  return { 'X-Teacher-Fixture-Id': actorId.trim() };
}

export function assignmentResultsPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/results`;
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

async function startDashboard() {
  const form = document.querySelector('#identity-form');
  const classSelect = document.querySelector('#class-select');
  const assignments = document.querySelector('#assignments');
  const results = document.querySelector('#results');
  const resultsContent = document.querySelector('#results-content');
  const status = document.querySelector('#status');
  const state = readDashboardState(location.href);

  const identity = () => ({ actorId: form.elements.actorId.value });
  const apiBase = () => form.elements.apiBase.value.replace(/\/$/, '');
  const request = async path => {
    const response = await fetch(`${apiBase()}${path}`, { headers: fixtureHeaders(identity()) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Không tải được dữ liệu.');
    return payload;
  };
  const setUrl = next => history.replaceState(null, '', assignmentUrl(location.href, next));

  function appendCell(row, value, className = '') {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = value;
    row.append(cell);
  }

  function renderResults(payload) {
    resultsContent.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = payload.assignment.title;
    const meta = document.createElement('p');
    meta.textContent = `${payload.assignment.className} · Khối ${payload.assignment.courseCode} · Phiên bản ${payload.assignment.formVersion}`;
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
    for (const student of payload.students) {
      const row = document.createElement('tr');
      appendCell(row, student.discriminator ? `${student.name} · ${student.discriminator}` : student.name);
      appendCell(row, resultStatusLabel(student.status), `result-status ${student.status}`);
      appendCell(row, formatDashboardScore(student.total), 'score');
      for (const skill of payload.skills) appendCell(row, formatDashboardScore(student.skills[skill.code]), 'score');
      appendCell(row, student.submittedAt ? formatAssignmentWindow(student.submittedAt, null).split(' → ')[0] : '—');
      body.append(row);
    }
    table.append(head, body);
    scroll.append(table);
    resultsContent.append(heading, meta, scroll);
    results.hidden = false;
  }

  async function loadResults(classId, assignmentId) {
    if (!classId || !assignmentId) {
      results.hidden = true;
      resultsContent.replaceChildren();
      return;
    }
    status.textContent = 'Đang tải bảng kết quả…';
    renderResults(await request(assignmentResultsPath(classId, assignmentId)));
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
        setUrl({ classId, assignmentId: assignment.assignmentId });
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

  form.addEventListener('submit', event => {
    event.preventDefault();
    loadClasses().catch(error => { status.textContent = error.message; });
  });
  classSelect.addEventListener('change', () => {
    setUrl({ classId: classSelect.value, assignmentId: '' });
    loadAssignments(classSelect.value).catch(error => { status.textContent = error.message; });
  });
}

if (typeof document !== 'undefined') startDashboard();
