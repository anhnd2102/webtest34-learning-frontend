/**
 * item-analysis-view.js
 * Visual component and interaction view for Teacher Dashboard Item Error Analysis.
 * Follows IZONE Design System (Ruby Red / Navy / Slate, 1.8px line SVG icons, no colored emojis).
 */

import {
  computeItemErrorRate,
  sortItems,
  filterItemsBySkill,
  extractUniqueSkills,
  formatItemPromptDisplay
} from './item-analysis.js';

const ITEM_ICONS = {
  chart: '<svg class="icon-inline" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  list: '<svg class="icon-inline" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  chevronDown: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
  chevronUp: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>',
  check: '<svg class="icon-inline text-success" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  alert: '<svg class="icon-inline text-warning" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  x: '<svg class="icon-inline text-danger" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  minus: '<svg class="icon-inline text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  sort: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>',
  empty: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
};

/**
 * Generate API endpoint URL for item analysis report.
 */
export function itemAnalysisApiPath(classId, assignmentId, { includeProvisional = false } = {}) {
  const base = `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/items-analysis`;
  return includeProvisional ? `${base}?includeProvisional=true` : base;
}

/**
 * Render Mode Switcher between Score Distribution (Histogram) and Item Analysis.
 */
export function renderReportModeSwitch(activeMode = 'distribution') {
  const isDist = activeMode === 'distribution';
  const isItems = activeMode === 'item_analysis';

  return `
    <div class="report-mode-switcher-container" role="tablist" aria-label="Chế độ báo cáo">
      <button 
        type="button" 
        class="report-mode-btn ${isDist ? 'active' : ''}" 
        data-report-mode="distribution"
        role="tab"
        aria-selected="${isDist}"
      >
        ${ITEM_ICONS.chart}
        <span>Phổ điểm lớp</span>
      </button>
      <button 
        type="button" 
        class="report-mode-btn ${isItems ? 'active' : ''}" 
        data-report-mode="item_analysis"
        role="tab"
        aria-selected="${isItems}"
      >
        ${ITEM_ICONS.list}
        <span>Phân tích câu hỏi</span>
      </button>
    </div>
  `;
}

/**
 * Render Toolbar for Item Analysis: Skill Filter Tabs & Sorting Buttons.
 */
export function renderItemAnalysisControls({
  skills = [],
  selectedSkill = 'ALL',
  sortCriteria = 'error_rate_desc',
  totalItems = 0
} = {}) {
  const allActive = !selectedSkill || selectedSkill === 'ALL';

  const skillTabsHtml = [
    `<button type="button" class="item-filter-tab ${allActive ? 'active' : ''}" data-skill="ALL">
      Tất cả kỹ năng ${totalItems > 0 ? `<span class="tab-count">(${totalItems})</span>` : ''}
    </button>`
  ].concat(
    skills.map(s => {
      const active = String(selectedSkill).toUpperCase() === s.toUpperCase();
      return `
        <button type="button" class="item-filter-tab ${active ? 'active' : ''}" data-skill="${escapeHtml(s)}">
          ${escapeHtml(s)}
        </button>
      `;
    })
  ).join('');

  const sortOptions = [
    { id: 'error_rate_desc', label: 'Sai nhiều nhất' },
    { id: 'position_asc', label: 'Thứ tự đề thi' },
    { id: 'unanswered_desc', label: 'Bỏ trống nhiều nhất' }
  ];

  const sortButtonsHtml = sortOptions.map(opt => {
    const active = sortCriteria === opt.id;
    return `
      <button 
        type="button" 
        class="item-sort-btn ${active ? 'active' : ''}" 
        data-sort="${opt.id}"
      >
        ${ITEM_ICONS.sort}
        <span>${opt.label}</span>
      </button>
    `;
  }).join('');

  return `
    <div class="item-analysis-toolbar">
      <div class="item-skill-tabs" role="tablist" aria-label="Lọc theo kỹ năng">
        ${skillTabsHtml}
      </div>
      <div class="item-sort-controls" role="group" aria-label="Sắp xếp danh sách câu hỏi">
        <span class="sort-label">Sắp xếp:</span>
        ${sortButtonsHtml}
      </div>
    </div>
  `;
}

/**
 * Render 4-color horizontal distribution bar representing student outcomes on an item.
 */
export function renderItemDistributionBar(item) {
  const total = Number(item?.totalAttempts ?? item?.stats?.totalAttempts) || 0;
  if (total <= 0) {
    return `<div class="item-dist-bar empty-bar" title="Chưa có dữ liệu làm bài"><div class="bar-segment-empty"></div></div>`;
  }

  const correct = Number(item?.correctCount ?? item?.stats?.correctCount) || 0;
  const partial = Number(item?.partialCount ?? item?.stats?.partialCount) || 0;
  const incorrect = Number(item?.incorrectCount ?? item?.stats?.incorrectCount) || 0;
  const unanswered = Number(item?.unansweredCount ?? item?.stats?.unansweredCount) || 0;

  const pctCorrect = ((correct / total) * 100).toFixed(1);
  const pctPartial = ((partial / total) * 100).toFixed(1);
  const pctIncorrect = ((incorrect / total) * 100).toFixed(1);
  const pctUnanswered = ((unanswered / total) * 100).toFixed(1);

  return `
    <div class="item-dist-bar" title="Đúng: ${correct}, 1 phần: ${partial}, Sai: ${incorrect}, Bỏ trống: ${unanswered}">
      ${correct > 0 ? `<div class="bar-segment-correct" style="width: ${pctCorrect}%;" title="Đúng: ${correct}/${total}"></div>` : ''}
      ${partial > 0 ? `<div class="bar-segment-partial" style="width: ${pctPartial}%;" title="Đúng 1 phần: ${partial}/${total}"></div>` : ''}
      ${incorrect > 0 ? `<div class="bar-segment-incorrect" style="width: ${pctIncorrect}%;" title="Sai: ${incorrect}/${total}"></div>` : ''}
      ${unanswered > 0 ? `<div class="bar-segment-unanswered" style="width: ${pctUnanswered}%;" title="Bỏ trống: ${unanswered}/${total}"></div>` : ''}
    </div>
  `;
}

/**
 * Render single Item Card with summary bar and accordion drawer.
 */
export function renderItemCard(item, { isExpanded = false, maxScore = 1 } = {}) {
  const itemId = item.itemVersionId || `item-${item.position || 0}`;
  const position = item.position !== undefined ? item.position : '—';
  const promptSummary = formatItemPromptDisplay(item.prompt);
  const skill = item.skill || item.skillCode || 'Chung';

  const total = Number(item?.totalAttempts ?? item?.stats?.totalAttempts) || 0;
  const incorrect = Number(item?.incorrectCount ?? item?.stats?.incorrectCount) || 0;
  const partial = Number(item?.partialCount ?? item?.stats?.partialCount) || 0;
  const unanswered = Number(item?.unansweredCount ?? item?.stats?.unansweredCount) || 0;
  const errorCount = incorrect + partial + unanswered;
  const errorRate = computeItemErrorRate(item);
  const errorPct = Math.round(errorRate * 100);

  const errorBadgeClass = errorRate >= 0.5 ? 'badge-danger-soft' : errorRate >= 0.2 ? 'badge-warning-soft' : 'badge-neutral-soft';

  // Details drawer contents
  let drawerContent = '';
  if (isExpanded) {
    // 1. Common wrong answers
    const commonWrong = Array.isArray(item.commonWrongAnswers) ? item.commonWrongAnswers : [];
    const wrongAnswersHtml = commonWrong.length > 0
      ? `<div class="item-detail-section">
          <h5 class="detail-subtitle">Các phương án sai phổ biến</h5>
          <div class="common-wrong-pills">
            ${commonWrong.map(wa => `
              <div class="wrong-pill">
                <span class="pill-answer">"${escapeHtml(wa.answer || '—')}"</span>
                <span class="pill-count">${wa.count} học viên chọn</span>
              </div>
            `).join('')}
          </div>
        </div>`
      : '';

    // 2. Expected answer
    const expectedHtml = `
      <div class="item-detail-section expected-answer-box">
        <h5 class="detail-subtitle">Đáp án chuẩn của đề</h5>
        <div class="expected-answer-content">
          <code>${escapeHtml(item.expectedAnswer || 'Chưa thiết lập đáp án')}</code>
        </div>
      </div>
    `;

    // 3. Wrong students list
    const wrongStudents = Array.isArray(item.wrongStudents) ? item.wrongStudents : [];
    const studentRowsHtml = wrongStudents.length > 0
      ? wrongStudents.map((st, idx) => {
          let statusBadge = '';
          if (st.verdict === 'partial') {
            statusBadge = `<span class="badge-status status-partial">${ITEM_ICONS.alert} Đúng 1 phần</span>`;
          } else if (st.verdict === 'unanswered' || !st.rawAnswer) {
            statusBadge = `<span class="badge-status status-unanswered">${ITEM_ICONS.minus} Chưa trả lời</span>`;
          } else {
            statusBadge = `<span class="badge-status status-incorrect">${ITEM_ICONS.x} Làm sai</span>`;
          }

          const rawDisplay = st.rawAnswer ? escapeHtml(st.rawAnswer) : '<em class="text-muted">(Bỏ trống)</em>';
          const itemMax = Number(st.maxScore) > 0 ? Number(st.maxScore) : (Number(item.maxScore) || 1);
          const earned = Number(st.scoreEarned) || 0;
          const scoreDisplay = `${earned}/${itemMax}`;

          return `
            <tr>
              <td class="col-num">${idx + 1}</td>
              <td class="col-student">
                <div class="student-name">${escapeHtml(st.name || 'Học viên')}</div>
                ${st.email ? `<div class="student-meta">${escapeHtml(st.email)}</div>` : ''}
              </td>
              <td class="col-answer">${rawDisplay}</td>
              <td class="col-score font-numeric">${scoreDisplay}</td>
              <td class="col-status">${statusBadge}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="5" class="empty-table-cell">Không có học viên nào làm sai câu hỏi này.</td></tr>`;

    const studentsTableHtml = `
      <div class="item-detail-section">
        <h5 class="detail-subtitle">Danh sách học viên cần lưu ý (${wrongStudents.length})</h5>
        <div class="table-responsive item-wrong-table-wrapper">
          <table class="table-izone table-compact">
            <thead>
              <tr>
                <th class="col-num">#</th>
                <th class="col-student">Học viên</th>
                <th class="col-answer">Câu trả lời thực tế</th>
                <th class="col-score">Điểm câu</th>
                <th class="col-status">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${studentRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    drawerContent = `
      <div class="item-card-drawer" id="drawer-${itemId}">
        ${expectedHtml}
        ${wrongAnswersHtml}
        ${studentsTableHtml}
      </div>
    `;
  }

  return `
    <div class="item-card ${isExpanded ? 'card-expanded' : ''}" data-item-id="${escapeHtml(itemId)}">
      <div class="item-card-header btn-toggle-item" data-action="toggle-item" data-item-id="${escapeHtml(itemId)}" role="button" tabindex="0" aria-expanded="${isExpanded}">
        <div class="item-header-left">
          <div class="item-position-badge">Câu ${position}</div>
          <div class="item-skill-tag">${escapeHtml(skill)}</div>
          <div class="item-prompt-snippet" title="${escapeHtml(promptSummary)}">
            ${escapeHtml(promptSummary)}
          </div>
        </div>

        <div class="item-header-center">
          ${renderItemDistributionBar(item)}
        </div>

        <div class="item-header-right">
          <div class="item-error-badge ${errorBadgeClass}">
            <span class="error-count-text">${errorCount}/${total} học viên</span>
            <span class="error-rate-text">(${errorPct}%)</span>
          </div>
          <button type="button" class="btn-item-accordion" aria-label="Xem chi tiết câu hỏi" tabindex="-1">
            ${isExpanded ? ITEM_ICONS.chevronUp : ITEM_ICONS.chevronDown}
          </button>
        </div>
      </div>
      ${drawerContent}
    </div>
  `;
}

/**
 * Render Complete Item Analysis Container.
 */
export function renderItemAnalysisView({
  items = [],
  loading = false,
  error = null,
  selectedSkill = 'ALL',
  sortCriteria = 'error_rate_desc',
  expandedItemIds = new Set()
} = {}) {
  if (loading) {
    return `
      <div class="item-analysis-state-box loading-state">
        <div class="spinner-izone" aria-hidden="true"></div>
        <p>Đang tổng hợp dữ liệu câu hỏi từ các bài thi...</p>
      </div>
    `;
  }

  if (error) {
    return `
      <div class="item-analysis-state-box error-state">
        ${ITEM_ICONS.empty}
        <h4 class="state-title">Không thể tải phân tích câu hỏi</h4>
        <p class="state-desc">${escapeHtml(error.message || String(error))}</p>
      </div>
    `;
  }

  if (!Array.isArray(items) || items.length === 0) {
    return `
      <div class="item-analysis-state-box empty-state">
        ${ITEM_ICONS.empty}
        <h4 class="state-title">Không có dữ liệu phân tích câu hỏi</h4>
        <p class="state-desc">Chưa có bài nộp hợp lệ nào hoặc bài thi không có câu hỏi.</p>
      </div>
    `;
  }

  const allSkills = extractUniqueSkills(items);
  const filtered = filterItemsBySkill(items, selectedSkill);
  const sorted = sortItems(filtered, sortCriteria);

  const controlsHtml = renderItemAnalysisControls({
    skills: allSkills,
    selectedSkill,
    sortCriteria,
    totalItems: items.length
  });

  const cardsHtml = sorted.map(item => {
    const isExpanded = expandedItemIds.has(item.itemVersionId);
    return renderItemCard(item, { isExpanded, maxScore: item.maxScore });
  }).join('');

  return `
    <div class="item-analysis-container">
      ${controlsHtml}
      <div class="item-cards-list">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/**
 * Safe HTML string escaper.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
