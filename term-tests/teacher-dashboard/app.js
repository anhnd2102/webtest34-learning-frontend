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

export function fixtureHeaders({ actorId, role, scope = '' }) {
  const headers = {
    'X-Teacher-Fixture-Id': actorId.trim(),
    'X-Teacher-Fixture-Role': role
  };
  const normalizedScope = scope.split(',').map(value => value.trim()).filter(Boolean).join(',');
  if (role === 'lead' && normalizedScope) headers['X-Teacher-Fixture-Course-Codes'] = normalizedScope.toUpperCase();
  if (role === 'teacher' && normalizedScope) headers['X-Teacher-Fixture-Class-Ids'] = normalizedScope;
  return headers;
}

export function formatAssignmentWindow(opensAt, closesAt, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  if (!opensAt && !closesAt) return 'Không giới hạn thời gian';
  const format = value => value ? new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone
  }).format(new Date(value)) : 'Không giới hạn';
  return `${format(opensAt)} → ${format(closesAt)}`;
}

async function startDashboard() {
  const form = document.querySelector('#identity-form');
  const classSelect = document.querySelector('#class-select');
  const assignments = document.querySelector('#assignments');
  const status = document.querySelector('#status');
  const state = readDashboardState(location.href);

  const identity = () => ({
    actorId: form.elements.actorId.value,
    role: form.elements.role.value,
    scope: form.elements.scope.value
  });
  const apiBase = () => form.elements.apiBase.value.replace(/\/$/, '');
  const request = async path => {
    const response = await fetch(`${apiBase()}${path}`, { headers: fixtureHeaders(identity()) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Không tải được dữ liệu.');
    return payload;
  };
  const setUrl = next => history.replaceState(null, '', assignmentUrl(location.href, next));

  async function loadAssignments(classId, selectedAssignmentId = '') {
    assignments.replaceChildren();
    if (!classId) return;
    status.textContent = 'Đang tải bài được giao…';
    const payload = await request(`/api/teacher/classes/${encodeURIComponent(classId)}/assignments`);
    for (const assignment of payload.assignments) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `assignment-card${assignment.assignmentId === selectedAssignmentId ? ' selected' : ''}`;
      card.innerHTML = `<strong>${assignment.title}</strong><span>Khối ${assignment.courseCode} · Phase ${assignment.phase ?? '—'}</span><span>${formatAssignmentWindow(assignment.opensAt, assignment.closesAt)}</span><span class="status">${assignment.status}</span>`;
      card.addEventListener('click', () => {
        assignments.querySelectorAll('.selected').forEach(node => node.classList.remove('selected'));
        card.classList.add('selected');
        setUrl({ classId, assignmentId: assignment.assignmentId });
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
