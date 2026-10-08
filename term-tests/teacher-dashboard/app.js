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

export function attemptStatusLabel(status) {
  return ({
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    active: 'Đang làm',
    submitted: 'Đã nộp',
    superseded: 'Bị thay thế'
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
    for (const label of ['Học viên', 'Trạng thái', 'Tổng', ...payload.skills.map(skill => skill.code), 'Nộp lúc', 'Thao tác']) {
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
      emptyCell.colSpan = payload.skills.length + 5;
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

        const actionCell = document.createElement('td');
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
          actionCell.append(detailBtn);
        } else {
          actionCell.textContent = '—';
        }
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

    if (detailItems) {
      detailItems.replaceChildren();
      for (const item of payload.items) {
        const card = document.createElement('div');
        card.className = `question-card verdict-${item.verdict}`;

        const qHeader = document.createElement('div');
        qHeader.className = 'question-header';
        qHeader.innerHTML = `
          <div class="q-title-wrap">
            <span class="q-pos">Câu ${item.position}</span>
            ${item.primarySkill ? `<span class="q-skill-badge">${item.primarySkill.toUpperCase()}</span>` : ''}
            <span class="q-type-badge">${item.interactionType}</span>
          </div>
          <div class="q-score-wrap">
            <span class="verdict-badge ${item.verdict}">${verdictLabel(item.verdict)}</span>
            <span class="q-points">${item.scoreEarned}/${item.maxScore} điểm</span>
          </div>
        `;
        card.append(qHeader);

        const promptDiv = document.createElement('div');
        promptDiv.className = 'question-prompt';
        promptDiv.textContent = item.prompt;
        if (item.helpText) {
          const helpP = document.createElement('p');
          helpP.className = 'question-help';
          helpP.textContent = item.helpText;
          promptDiv.append(helpP);
        }
        card.append(promptDiv);

        if (item.options && item.options.length > 0) {
          const optList = document.createElement('ul');
          optList.className = 'question-options';
          for (const opt of item.options) {
            const li = document.createElement('li');
            const isSelected = item.studentAnswer === opt.id || (Array.isArray(item.studentAnswer) && item.studentAnswer.includes(opt.id));
            if (isSelected) li.className = 'opt-selected';
            li.textContent = `${opt.id}: ${opt.label}${isSelected ? ' (Học viên chọn)' : ''}`;
            optList.append(li);
          }
          card.append(optList);
        }

        const answersWrap = document.createElement('div');
        answersWrap.className = 'answers-wrap';

        const studentAnsP = document.createElement('div');
        studentAnsP.className = 'answer-block student-answer';
        const ansText = item.studentAnswer === null || item.studentAnswer === undefined
          ? '(Chưa trả lời)'
          : (Array.isArray(item.studentAnswer) ? item.studentAnswer.join(', ') : String(item.studentAnswer));
        studentAnsP.innerHTML = `<strong>Câu trả lời của học viên:</strong> <span class="ans-content">${ansText}</span>`;
        answersWrap.append(studentAnsP);

        if (item.expectedAnswer !== null && item.expectedAnswer !== undefined) {
          const expectedAnsP = document.createElement('div');
          expectedAnsP.className = 'answer-block expected-answer';
          const expText = Array.isArray(item.expectedAnswer)
            ? item.expectedAnswer.join(', ')
            : String(item.expectedAnswer);
          expectedAnsP.innerHTML = `<strong>Đáp án mẫu / rubric:</strong> <span class="ans-content">${expText}</span>`;
          answersWrap.append(expectedAnsP);
        }
        card.append(answersWrap);

        if (item.feedback) {
          const fbBox = document.createElement('div');
          fbBox.className = 'feedback-box';
          const fbLines = [];
          if (Number.isFinite(item.feedback.structureScore)) {
            fbLines.push(`Điểm cấu trúc: ${item.feedback.structureScore}`);
          }
          if (Number.isFinite(item.feedback.accuracyScore)) {
            fbLines.push(`Điểm chính xác: ${item.feedback.accuracyScore}`);
          }
          if (Array.isArray(item.feedback.evidence) && item.feedback.evidence.length > 0) {
            fbLines.push(`Nhận xét: ${item.feedback.evidence.join('; ')}`);
          }
          if (Array.isArray(item.feedback.errors) && item.feedback.errors.length > 0) {
            fbLines.push(`Lỗi: ${item.feedback.errors.map(e => e.message || e.code).join(', ')}`);
          }
          fbBox.innerHTML = `<strong>Nhận xét & Rubric:</strong><p>${fbLines.join(' · ') || 'Không có nhận xét chi tiết.'}</p>`;
          card.append(fbBox);
        }

        detailItems.append(card);
      }
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
    if (selectedExists) {
      await loadResults(classId, selectedAssignmentId);
      if (state.attemptId) {
        await loadAttemptDetail(classId, selectedAssignmentId, state.attemptId);
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

  if (closeAttemptDetailBtn) {
    closeAttemptDetailBtn.addEventListener('click', () => {
      if (attemptDetail) attemptDetail.hidden = true;
      if (results) results.hidden = false;
      delete state.attemptId;
      setUrl();
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
