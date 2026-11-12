import {
  getActiveUnsavedChangesOwner,
  trackBuilderModal,
  mountedBuilders
} from '../navigation/unsaved-changes.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  escapeHtml
} from '../ui/presentation.js';

export function openConfirmDeleteTestModal({ testKey, formVersionId, title, sessionNumber, phase, courseName, onConfirm, owner = getActiveUnsavedChangesOwner() }) {
  if (typeof document === 'undefined') return;
  let modal = document.querySelector('#modal-confirm-delete-test');
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }

  modal = document.createElement('div');
  modal.id = 'modal-confirm-delete-test';
  modal.className = 'izone-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-delete-title');

  const phaseText = phase ? `Phase ${phase}` : '—';
  const sessionText = sessionNumber ? `Buổi ${sessionNumber}` : '—';

  modal.innerHTML = `
    <div class="izone-modal-dialog modal-danger-dialog">
      <div class="izone-modal-header danger-header">
        <div class="modal-header-icon-danger">
          ${renderSvgIcon('trash', 'icon-lg')}
        </div>
        <div class="modal-title-wrap">
          <h3 id="modal-delete-title">Xác nhận xóa bài thi</h3>
          <p class="modal-subtitle">Thao tác này sẽ xóa vĩnh viễn đề thi khỏi hệ thống</p>
        </div>
        <button type="button" class="btn-close-modal" id="btn-close-delete-modal" aria-label="Đóng">&times;</button>
      </div>

      <div class="izone-modal-body">
        <div class="target-test-card">
          <div class="test-target-title">${escapeHtml(title || 'Bài thi')}</div>
          <div class="test-target-meta">
            <span class="meta-tag"><code>${escapeHtml(testKey || formVersionId || '—')}</code></span>
            <span class="meta-tag">${sessionText}</span>
            <span class="meta-tag">${phaseText}</span>
            ${courseName ? `<span class="meta-tag">${escapeHtml(courseName)}</span>` : ''}
          </div>
        </div>

        <div class="alert-danger-box">
          <div class="alert-danger-icon">${renderSvgIcon('alert', 'icon-inline')}</div>
          <div class="alert-danger-text">
            <strong>Cảnh báo nguy hiểm:</strong> Thao tác này sẽ xóa vĩnh viễn cấu trúc bài thi, các câu hỏi và đáp án liên quan. Hành động này <strong>KHÔNG THỂ HOÀN TÁC</strong>.
          </div>
        </div>

        <div class="confirmation-input-group">
          <label class="form-label" for="input-confirm-keyword">
            Vui lòng nhập chữ <strong class="danger-keyword">XÓA</strong> vào ô bên dưới để xác nhận:
          </label>
          <input type="text" id="input-confirm-keyword" class="form-control input-danger-confirm" placeholder="XÓA" autocomplete="off" />
        </div>
      </div>

      <div class="izone-modal-footer">
        <button type="button" class="btn btn-secondary" id="btn-cancel-delete">Hủy bỏ</button>
        <button type="button" class="btn btn-danger" id="btn-submit-delete" disabled>
          ${renderSvgIcon('trash', 'icon-inline')} Xác nhận xóa vĩnh viễn
        </button>
      </div>
    </div>
  `;

  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  const inputKw = modal.querySelector('#input-confirm-keyword');
  const submitBtn = modal.querySelector('#btn-submit-delete');
  const cancelBtn = modal.querySelector('#btn-cancel-delete');
  const closeBtn = modal.querySelector('#btn-close-delete-modal');

  const closeModal = () => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  if (inputKw && submitBtn) {
    inputKw.addEventListener('input', () => {
      const val = inputKw.value.trim().toUpperCase();
      const isValid = (val === 'XÓA' || val === 'XOA');
      submitBtn.disabled = !isValid;
    });
    inputKw.focus();
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm({ formVersionId, testKey, title });
      }
    });
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

export function openCreateTestModal({ courseId, catalog = [], onSubmit, onCancel, owner = getActiveUnsavedChangesOwner() }) {
  if (typeof document === 'undefined') return;
  let modal = document.querySelector('#modal-create-test');
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }

  modal = document.createElement('div');
  modal.id = 'modal-create-test';
  modal.className = 'izone-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-create-title');

  const cid = Number(courseId || 1);
  const courseNames = { 1: '03', 2: '34', 3: '45' };
  const courseCode = courseNames[cid] || '34';

  const computeSuggested = (targetPhase) => {
    const list = Array.isArray(catalog) ? catalog : [];
    let relevant = list;
    if (targetPhase === 1) relevant = list.filter(it => Number(it.phase) === 1);
    else if (targetPhase === 2) relevant = list.filter(it => Number(it.phase) === 2);

    const maxSess = relevant.reduce((max, it) => Math.max(max, Number(it.sessionNumber) || 0), 0);
    const overallMaxSess = list.reduce((max, it) => Math.max(max, Number(it.sessionNumber) || 0), 0);
    const nextSess = maxSess > 0 ? (maxSess + 1) : (overallMaxSess + 1);
    const nextTestNum = relevant.length + 1;
    const phaseLabel = targetPhase ? ` (Phase ${targetPhase})` : '';
    const suggestedTitle = `IZONE · Khối ${courseCode}${phaseLabel} · Test ${nextTestNum}`;
    return { nextSess, suggestedTitle, nextTestNum };
  };

  const initialPhase = (cid === 2 || cid === 3) ? 1 : null;
  const initialData = computeSuggested(initialPhase);

  modal.innerHTML = `
    <div class="izone-modal-dialog modal-create-dialog">
      <div class="izone-modal-header">
        <div class="modal-header-icon-primary">
          ${renderSvgIcon('book', 'icon-lg')}
        </div>
        <div class="modal-title-wrap">
          <h3 id="modal-create-title">Khởi tạo bài thi mới</h3>
          <p class="modal-subtitle">Thiết lập lộ trình Buổi học và Giai đoạn (Phase) cho đề thi</p>
        </div>
        <button type="button" class="btn-close-modal" id="btn-close-create-modal" aria-label="Đóng">&times;</button>
      </div>

      <div class="izone-modal-body">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="create-course-select">Khối đào tạo:</label>
            <select id="create-course-select" class="form-select" disabled>
              <option value="1" ${cid === 1 ? 'selected' : ''}>Khối 03</option>
              <option value="2" ${cid === 2 ? 'selected' : ''}>Khối 34</option>
              <option value="3" ${cid === 3 ? 'selected' : ''}>Khối 45</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="create-phase-select">Giai đoạn (Phase):</label>
            <select id="create-phase-select" class="form-select">
              <option value="1" ${initialPhase === 1 ? 'selected' : ''}>Giai đoạn 1 (Phase 1)</option>
              <option value="2" ${initialPhase === 2 ? 'selected' : ''}>Giai đoạn 2 (Phase 2)</option>
              <option value="" ${initialPhase === null ? 'selected' : ''}>Không phân Phase (Đề tổng hợp)</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="create-session-input">Buổi học (Session Number):</label>
            <input type="number" id="create-session-input" class="form-control" min="1" max="100" value="${initialData.nextSess}" required />
            <small class="form-hint">Số buổi học trong lộ trình đào tạo</small>
          </div>

          <div class="form-group">
            <label class="form-label" for="create-duration-input">Thời lượng làm bài (phút):</label>
            <input type="number" id="create-duration-input" class="form-control" min="5" max="300" value="60" required />
            <small class="form-hint">Thời gian đếm ngược thi chuẩn</small>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="create-title-input">Tên bài thi:</label>
          <input type="text" id="create-title-input" class="form-control" value="${escapeHtml(initialData.suggestedTitle)}" required placeholder="Ví dụ: IZONE · Khối 34 (Phase 1) · Test 5" />
          <small class="form-hint">Hiển thị trong phòng thi và bảng điểm học viên</small>
        </div>
      </div>

      <div class="izone-modal-footer">
        <button type="button" class="btn btn-secondary" id="btn-cancel-create">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btn-submit-create">
          + Khởi tạo bài thi
        </button>
      </div>
    </div>
  `;

  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  const phaseSelect = modal.querySelector('#create-phase-select');
  const sessionInput = modal.querySelector('#create-session-input');
  const titleInput = modal.querySelector('#create-title-input');
  const durationInput = modal.querySelector('#create-duration-input');
  const submitBtn = modal.querySelector('#btn-submit-create');
  const cancelBtn = modal.querySelector('#btn-cancel-create');
  const closeBtn = modal.querySelector('#btn-close-create-modal');

  const closeModal = () => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  if (phaseSelect) {
    phaseSelect.addEventListener('change', () => {
      const pVal = phaseSelect.value ? Number(phaseSelect.value) : null;
      const data = computeSuggested(pVal);
      if (sessionInput) sessionInput.value = data.nextSess;
      if (titleInput) titleInput.value = data.suggestedTitle;
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const title = (titleInput?.value || '').trim();
      const sess = Number(sessionInput?.value);
      const dur = Number(durationInput?.value) || 60;
      const phase = phaseSelect?.value ? Number(phaseSelect.value) : null;

      if (!title) {
        alert('Vui lòng nhập tên bài thi.');
        titleInput?.focus();
        return;
      }
      if (!sess || sess <= 0) {
        alert('Vui lòng nhập số buổi học hợp lệ.');
        sessionInput?.focus();
        return;
      }

      closeModal();
      if (typeof onSubmit === 'function') {
        onSubmit({
          courseId: cid,
          phase,
          sessionNumber: sess,
          title,
          durationMinutes: dur
        });
      }
    });
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

export function renderCourseTestCatalogView(container, catalog = [], options = {}) {
  if (!container) return;
  const existingBuilder = mountedBuilders.get(container);
  if (existingBuilder) {
    existingBuilder.handle?.dispose();
  }
  const teacherRole = options.teacherRole || 'teacher';
  const selectedCourseId = Number(options.courseId || 1);

  if (teacherRole !== 'lead' && teacherRole !== 'admin') {
    container.innerHTML = `
      <div class="panel showcase-placeholder unauthorized-card">
        <div class="placeholder-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>Quyền hạn bị giới hạn</h3>
        <p>Chỉ Khối trưởng (Lead) hoặc Quản trị viên (Admin) mới có quyền truy cập Quản lý đề thi.</p>
      </div>
    `;
    return;
  }

  const courses = [
    { id: 1, name: 'Khối 03' },
    { id: 2, name: 'Khối 34' },
    { id: 3, name: 'Khối 45' }
  ];

  const courseButtons = courses.map(c => `
    <button type="button" class="btn-course-tab ${c.id === selectedCourseId ? 'active' : ''}" data-course-id="${c.id}">
      ${c.name}
    </button>
  `).join('');

  let cardsHtml = '';
  if (!catalog || catalog.length === 0) {
    cardsHtml = `
      <div class="empty-catalog-state">
        <svg class="empty-catalog-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p>Chưa có bài thi nào trong danh mục của khối này.</p>
      </div>
    `;
  } else {
    const renderTestRows = (items) => {
      return items.map(item => {
        const isPublished = item.status === 'published';
        const badgeClass = isPublished ? 'badge-published' : 'badge-draft';
        const badgeText = isPublished ? 'Đã công bố' : 'Bản nháp';
        const sessionLabel = `Buổi ${item.sessionNumber}`;
        const phaseBadge = item.phase ? `<span class="phase-pill">Phase ${item.phase}</span>` : '<span class="text-muted">—</span>';
        const subCount = Number(item.submissionCount || 0);
        // Allow delete if 0 submissions (both drafts and published tests without submissions)
        const canDelete = subCount === 0;

        return `
          <div class="test-card test-row" data-test-key="${item.testKey || ''}" data-test-id="${item.id || ''}">
            <div class="col-session">
              <span class="session-badge">${sessionLabel}</span>
            </div>
            <div class="col-phase">
              ${phaseBadge}
            </div>
            <div class="col-title">
              <span class="test-card-title">${escapeHtml(item.title || '—')}</span>
            </div>
            <div class="col-meta">
              <div class="test-card-meta">
                <span class="meta-item test-key-tag">
                  ${renderSvgIcon('book', 'icon-inline')}
                  <code>${escapeHtml(item.testKey || '—')}</code>
                </span>
                <span class="meta-item version-tag" title="${item.formVersionId || ''}">
                  ${renderSvgIcon('lock', 'icon-inline')}
                  <span>${item.formVersionId ? item.formVersionId.slice(0, 8) + '...' : '—'}</span>
                </span>
              </div>
            </div>
            <div class="col-status">
              <span class="status-badge ${badgeClass}">${badgeText}</span>
              ${subCount > 0 ? `<span class="submission-count-tag" title="${subCount} học viên đã nộp bài">${subCount} bài nộp</span>` : ''}
            </div>
            <div class="col-actions">
              <div class="test-row-actions">
                <button type="button" class="btn btn-secondary btn-sm btn-edit-test" data-test-key="${item.testKey || ''}" data-form-version-id="${item.formVersionId || ''}">
                  ${renderSvgIcon('edit', 'icon-inline')} Chỉnh sửa
                </button>
                ${canDelete ? `
                  <button type="button" class="btn btn-outline-danger btn-sm btn-delete-test-draft btn-delete-test" data-test-key="${item.testKey || ''}" data-form-version-id="${item.formVersionId || ''}" data-title="${escapeHtml(item.title || '')}" data-session="${item.sessionNumber || ''}" data-phase="${item.phase || ''}" title="Xóa bài thi này">
                    ${renderSvgIcon('trash', 'icon-inline')} Xóa
                  </button>
                ` : `
                  <span class="action-locked" title="Đã có bài nộp — Không thể xóa">${renderSvgIcon('lock', 'icon-inline')}</span>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    const phase1Items = catalog.filter(it => Number(it.phase) === 1);
    const phase2Items = catalog.filter(it => Number(it.phase) === 2);
    const otherItems = catalog.filter(it => !it.phase || (Number(it.phase) !== 1 && Number(it.phase) !== 2));
    const hasPhases = phase1Items.length > 0 || phase2Items.length > 0;

    const renderPhaseTableGroup = (groupTitle, phaseTag, items) => {
      if (!items || items.length === 0) return '';
      return `
        <div class="test-phase-group">
          <div class="test-phase-header">
            <div class="phase-title-badge">
              ${phaseTag ? `<span class="phase-pill-large">${phaseTag}</span>` : ''}
              <h3 class="phase-group-heading">${groupTitle}</h3>
            </div>
            <span class="phase-count-pill">${items.length} bài thi</span>
          </div>
          <div class="test-table-wrapper">
            <div class="test-table-header">
              <div class="col-session">Buổi</div>
              <div class="col-phase">Phase</div>
              <div class="col-title">Tên bài thi</div>
              <div class="col-meta">Mã đề & Định danh</div>
              <div class="col-status">Trạng thái</div>
              <div class="col-actions">Thao tác</div>
            </div>
            <div class="test-table-body">
              ${renderTestRows(items)}
            </div>
          </div>
        </div>
      `;
    };

    if (hasPhases) {
      cardsHtml = `
        <div class="test-catalog-tables">
          ${renderPhaseTableGroup('Giai đoạn 1 · Nền tảng & Kỹ năng', 'Phase 1', phase1Items)}
          ${renderPhaseTableGroup('Giai đoạn 2 · Tăng tốc & Luyện thi', 'Phase 2', phase2Items)}
          ${renderPhaseTableGroup('Đề thi chung & Tổng hợp', (phase1Items.length > 0 || phase2Items.length > 0) ? 'Tổng hợp' : '', otherItems)}
        </div>
      `;
    } else {
      cardsHtml = `
        <div class="test-catalog-tables">
          ${renderPhaseTableGroup('Lộ trình các bài thi theo buổi', '', catalog)}
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div class="test-studio-header">
      <div class="studio-title-wrap">
        <h2>Quản lý Đề thi (Test Studio)</h2>
        <p class="subtitle">Xem và quản lý lộ trình bài thi theo từng buổi của các khối đào tạo IZONE.</p>
      </div>
      <div class="studio-header-actions">
        <button type="button" class="btn btn-primary btn-add-test" id="btn-add-test">
          + Thêm bài thi mới
        </button>
      </div>
    </div>

    <div class="test-studio-course-bar">
      <div class="course-tabs-group" role="tablist" aria-label="Chọn khối">
        ${courseButtons}
      </div>
    </div>

    <div class="test-studio-content">
      ${cardsHtml}
    </div>
  `;

  if (typeof options.onCourseChange === 'function' && typeof container.querySelectorAll === 'function') {
    const courseBtns = container.querySelectorAll('.btn-course-tab');
    courseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = Number(btn.getAttribute('data-course-id'));
        options.onCourseChange(cid);
      });
    });
  }

  if (typeof options.onAddTest === 'function' && typeof container.querySelector === 'function') {
    const addBtn = container.querySelector('#btn-add-test');
    if (addBtn) {
      addBtn.addEventListener('click', options.onAddTest);
    }
  }

  if (typeof options.onEditTest === 'function' && typeof container.querySelectorAll === 'function') {
    const editBtns = container.querySelectorAll('.btn-edit-test');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const testKey = btn.getAttribute('data-test-key');
        const formVersionId = btn.getAttribute('data-form-version-id');
        options.onEditTest({ testKey, formVersionId });
      });
    });
  }

  if (typeof options.onDeleteDraft === 'function' && typeof container.querySelectorAll === 'function') {
    const delBtns = container.querySelectorAll('.btn-delete-test-draft, .btn-delete-test');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const testKey = btn.getAttribute('data-test-key');
        const formVersionId = btn.getAttribute('data-form-version-id');
        const title = btn.getAttribute('data-title');
        const sessionNumber = btn.getAttribute('data-session');
        const phase = btn.getAttribute('data-phase');
        if (!formVersionId) return;

        openConfirmDeleteTestModal({
          testKey,
          formVersionId,
          title,
          sessionNumber,
          phase,
          courseName: selectedCourseId === 1 ? 'Khối 03' : (selectedCourseId === 3 ? 'Khối 45' : 'Khối 34'),
          onConfirm: () => {
            options.onDeleteDraft({ testKey, formVersionId, title });
          }
        });
      });
    });
  }
}


export function getCourseCodeFromCourseId(courseId) {
  const cid = Number(courseId);
  if (cid === 1 || courseId === '03' || courseId === 'course-03') return '03';
  if (cid === 3 || courseId === '45' || courseId === 'course-45') return '45';
  return '34';
}

export function filterClassesForCourse(classes = [], courseId) {
  const targetCode = getCourseCodeFromCourseId(courseId);
  const targetNum = targetCode === '03' ? 1 : (targetCode === '45' ? 3 : 2);
  return (classes || []).filter(c => {
    const rawCourse = String(c.courseCode || c.course_code || '').toLowerCase().replace(/^course-/, '');
    const cId = Number(c.courseId || c.course_id || 0);
    return rawCourse === targetCode || cId === targetNum || rawCourse.includes(targetCode);
  });
}
