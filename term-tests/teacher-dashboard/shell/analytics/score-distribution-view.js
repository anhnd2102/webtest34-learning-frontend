/**
 * score-distribution-view.js
 * Visual component and SVG chart renderer for Teacher Dashboard Score Distribution Reports.
 * Follows IZONE Design System (Ruby Red / Navy / Slate, 1.8px line SVG icons, no percentage display).
 */

const VIEW_ICONS = {
  users: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  submitted: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  award: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
  clock: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  alert: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  rotate: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>',
  chart: '<svg class="icon-inline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  trendUp: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
  trendDown: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>',
  target: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  scale: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>',
  empty: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>'
};

/**
 * Generate API endpoint URL for score distribution report.
 */
export function reportApiPath(classId, assignmentId, { includeProvisional = false } = {}) {
  const base = `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/report`;
  return includeProvisional ? `${base}?includeProvisional=true` : base;
}

/**
 * Format score as achieved/max without percentages.
 */
export function formatScoreFraction(score, maxScore) {
  if (score === null || score === undefined || score === '') return '—';
  const num = Number(score);
  if (!Number.isFinite(num)) return '—';
  const max = Number(maxScore);
  const validMax = Number.isFinite(max) && max > 0 ? max : 100;
  return `${num}/${validMax}`;
}

/**
 * Render Roster Summary metrics grid.
 */
export function renderScoreKpiCards(rosterSummary = {}, statistics = {}, maxScore = 100) {
  const {
    totalRoster = 0,
    submitted = 0,
    officialGraded = 0,
    provisional = 0,
    pendingReview = 0,
    retaking = 0,
    notSubmitted = 0
  } = rosterSummary;

  const {
    mean = null
  } = statistics;

  const validMax = Number.isFinite(Number(maxScore)) && Number(maxScore) > 0 ? Number(maxScore) : 100;
  const meanDisplay = mean !== null && mean !== undefined ? formatScoreFraction(mean, validMax) : '—';
  const pendingCount = (Number(pendingReview) || 0) + (Number(provisional) || 0);

  const cards = [
    {
      id: 'kpi-total',
      label: 'Tổng số học viên',
      value: `${totalRoster} học viên`,
      icon: VIEW_ICONS.users,
      badgeClass: 'metric-neutral',
      tooltip: 'Tổng danh sách lớp trong đợt thi (Bấm để xem toàn bộ danh sách)',
      filterStatus: '',
      isClickable: true
    },
    {
      id: 'kpi-mean',
      label: 'Điểm trung bình',
      value: meanDisplay,
      icon: VIEW_ICONS.target,
      badgeClass: 'metric-primary',
      tooltip: 'Điểm trung bình đạt/tối đa theo kỹ năng đang chọn',
      filterStatus: null,
      isClickable: false
    },
    {
      id: 'kpi-official',
      label: 'Có điểm chính thức',
      value: `${officialGraded} / ${totalRoster}`,
      icon: VIEW_ICONS.award,
      badgeClass: 'metric-success',
      tooltip: 'Học viên đã có điểm chính thức/công bố (Bấm để lọc)',
      filterStatus: 'complete',
      isClickable: true
    },
    {
      id: 'kpi-pending',
      label: 'Chờ chấm / duyệt',
      value: `${pendingCount} / ${totalRoster}`,
      icon: VIEW_ICONS.clock,
      badgeClass: 'metric-warning',
      tooltip: 'Bài nộp cần GV chấm tự luận/nói hoặc đang nháp (Bấm để lọc)',
      filterStatus: 'review_required,grading',
      isClickable: true
    },
    {
      id: 'kpi-not-submitted',
      label: 'Chưa nộp bài',
      value: `${notSubmitted} / ${totalRoster}`,
      icon: VIEW_ICONS.alert,
      badgeClass: 'metric-muted',
      tooltip: 'Học viên chưa vào thi hoặc đang làm dở (Bấm để lọc)',
      filterStatus: 'not_started,in_progress',
      isClickable: true
    },
    {
      id: 'kpi-retaking',
      label: 'Đang làm lại',
      value: `${retaking} / ${totalRoster}`,
      icon: VIEW_ICONS.rotate,
      badgeClass: 'metric-info',
      tooltip: 'Học viên đã được cấp quyền làm lại hoặc đang thi lại (Bấm để lọc)',
      filterStatus: 'retake_granted,retaking',
      isClickable: true
    }
  ];

  return `
    <div class="report-roster-grid report-kpi-grid">
      ${cards.map(c => `
        <div class="report-metric-card ${c.badgeClass}${c.isClickable ? ' clickable-kpi-card' : ''}" 
             ${c.isClickable ? `data-filter-status="${c.filterStatus}" role="button" tabindex="0"` : ''} 
             title="${c.tooltip}">
          <div class="metric-card-header">
            <span class="metric-icon">${c.icon}</span>
            <span class="metric-label">${c.label}</span>
          </div>
          <div class="metric-card-value">${c.value}</div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderRosterSummaryCards(rosterSummary = {}) {
  const {
    totalRoster = 0,
    submitted = 0,
    officialGraded = 0,
    provisional = 0,
    pendingReview = 0,
    retaking = 0,
    notSubmitted = 0
  } = rosterSummary;

  const cards = [
    {
      label: 'Tổng số học viên',
      value: totalRoster,
      icon: VIEW_ICONS.users,
      badgeClass: 'metric-neutral',
      tooltip: 'Sĩ số danh sách lớp trong bài thi'
    },
    {
      label: 'Đã nộp bài',
      value: submitted,
      icon: VIEW_ICONS.submitted,
      badgeClass: 'metric-primary',
      tooltip: 'Số học viên đã hoàn thành và nộp bài'
    },
    {
      label: 'Có điểm chính thức',
      value: officialGraded,
      icon: VIEW_ICONS.award,
      badgeClass: 'metric-success',
      tooltip: 'Bài đã được chấm xong toàn diện'
    },
    {
      label: 'Chờ chấm / duyệt',
      value: pendingReview + provisional,
      icon: VIEW_ICONS.clock,
      badgeClass: 'metric-warning',
      tooltip: 'Bao gồm bài cần chấm tự luận/nói hoặc điểm tạm tính'
    },
    {
      label: 'Chưa nộp bài',
      value: notSubmitted,
      icon: VIEW_ICONS.alert,
      badgeClass: 'metric-muted',
      tooltip: 'Học viên chưa bắt đầu hoặc chưa nộp bài'
    }
  ];

  if (retaking > 0) {
    cards.push({
      label: 'Đang làm lại',
      value: retaking,
      icon: VIEW_ICONS.rotate,
      badgeClass: 'metric-info',
      tooltip: 'Được cấp quyền và đang làm lại bài'
    });
  }

  return `
    <div class="report-roster-grid">
      ${cards.map(c => `
        <div class="report-metric-card ${c.badgeClass}" title="${c.tooltip}">
          <div class="metric-card-header">
            <span class="metric-icon">${c.icon}</span>
            <span class="metric-label">${c.label}</span>
          </div>
          <div class="metric-card-value">${c.value}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render Statistical indicators grid (Min, Max, Mean, Median, SD).
 */
export function renderStatisticsCards(statistics = {}, maxScore = 100) {
  const {
    count = 0,
    min = null,
    max = null,
    mean = null,
    median = null,
    standardDeviation = null
  } = statistics;

  const items = [
    {
      label: 'Điểm cao nhất',
      value: formatScoreFraction(max, maxScore),
      icon: VIEW_ICONS.trendUp,
      desc: 'Học viên có kết quả cao nhất'
    },
    {
      label: 'Điểm thấp nhất',
      value: formatScoreFraction(min, maxScore),
      icon: VIEW_ICONS.trendDown,
      desc: 'Học viên có kết quả thấp nhất'
    },
    {
      label: 'Điểm trung bình',
      value: formatScoreFraction(mean, maxScore),
      icon: VIEW_ICONS.target,
      desc: 'Giá trị trung bình cộng'
    },
    {
      label: 'Điểm trung vị (Median)',
      value: formatScoreFraction(median, maxScore),
      icon: VIEW_ICONS.scale,
      desc: 'Mốc điểm chính giữa phân bố'
    },
    {
      label: 'Độ lệch chuẩn (SD)',
      value: standardDeviation !== null && standardDeviation !== undefined ? standardDeviation : '—',
      icon: VIEW_ICONS.chart,
      desc: 'Mức độ phân tán điểm số'
    }
  ];

  return `
    <div class="report-statistics-grid">
      ${items.map(it => `
        <div class="report-stat-card">
          <div class="stat-card-top">
            <span class="stat-icon">${it.icon}</span>
            <span class="stat-label">${it.label}</span>
          </div>
          <div class="stat-value">${it.value}</div>
          <div class="stat-desc">${it.desc}</div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render SVG Histogram Chart.
 */
export function renderHistogramSvg(histogram = {}, maxScore = 100, options = {}) {
  const { activeBucketIndex = -1, chartTitle = 'Phân bố phổ điểm' } = options;
  const buckets = Array.isArray(histogram.buckets) ? histogram.buckets : [];

  if (buckets.length === 0) {
    return `
      <div class="histogram-empty">
        <p>Chưa có dữ liệu dải điểm để hiển thị biểu đồ.</p>
      </div>
    `;
  }

  // Calculate layout dimensions
  const svgWidth = 760;
  const svgHeight = 260;
  const padLeft = 40;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const maxCount = Math.max(...buckets.map(b => Number(b.count) || 0), 1);
  const totalStudents = buckets.reduce((acc, b) => acc + (Number(b.count) || 0), 0);

  // Grid line values (e.g. 0, 25%, 50%, 75%, 100% of maxCount)
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  const colWidth = chartWidth / buckets.length;
  const barWidth = Math.max(16, Math.min(colWidth - 8, 48));

  const barsSvg = buckets.map((bucket, i) => {
    const count = Number(bucket.count) || 0;
    const barHeight = count === 0 ? 0 : Math.round((count / maxCount) * chartHeight);
    const x = padLeft + i * colWidth + (colWidth - barWidth) / 2;
    const y = padTop + chartHeight - barHeight;
    const isSelected = i === activeBucketIndex;

    const countLabelY = Math.max(padTop + 14, y - 6);

    return `
      <g class="histogram-bucket-col${isSelected ? ' active' : ''}" 
         data-bucket-idx="${i}" 
         data-bucket-min="${bucket.min}" 
         data-bucket-max="${bucket.max}" 
         data-count="${count}"
         role="button" 
         tabindex="0"
         aria-label="Khoảng ${bucket.label}: ${count} học viên">
        <!-- Interactive hover background -->
        <rect x="${padLeft + i * colWidth + 2}" y="${padTop}" width="${colWidth - 4}" height="${chartHeight}" 
              class="histogram-hover-slot" rx="4" />
        
        <!-- Score Bar -->
        ${barHeight > 0 ? `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
                class="histogram-bar${isSelected ? ' bar-selected' : ''}" 
                rx="4" ry="4" />
        ` : ''}

        <!-- Count on top of bar -->
        ${count > 0 ? `
          <text x="${x + barWidth / 2}" y="${countLabelY}" 
                class="histogram-count-label" text-anchor="middle">
            ${count}
          </text>
        ` : ''}

        <!-- X-axis Interval Label -->
        <text x="${x + barWidth / 2}" y="${padTop + chartHeight + 20}" 
              class="histogram-axis-label" text-anchor="middle">
          ${bucket.label}
        </text>
      </g>
    `;
  }).join('');

  const gridSvg = gridLevels.map(lvl => {
    const y = padTop + chartHeight - lvl * chartHeight;
    const value = Math.round(lvl * maxCount);
    return `
      <g class="histogram-grid-line">
        <line x1="${padLeft}" y1="${y}" x2="${svgWidth - padRight}" y2="${y}" />
        <text x="${padLeft - 8}" y="${y + 4}" class="histogram-y-axis-label" text-anchor="end">${value}</text>
      </g>
    `;
  }).join('');

  return `
    <div class="histogram-card-container">
      <div class="histogram-chart-header">
        <div class="chart-header-left">
          <h4 class="chart-title">${VIEW_ICONS.chart} ${chartTitle}</h4>
          <span class="chart-subtitle">Thang điểm: 0 – ${maxScore} pts · Đã ghi nhận: ${totalStudents} học viên</span>
        </div>
      </div>
      <div class="histogram-svg-wrapper">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="histogram-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Biểu đồ phổ điểm học viên">
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#db0829" />
              <stop offset="100%" stop-color="#b90622" />
            </linearGradient>
            <linearGradient id="barActiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#9e051d" />
              <stop offset="100%" stop-color="#730314" />
            </linearGradient>
          </defs>

          <!-- Horizontal Grid Lines -->
          ${gridSvg}

          <!-- Baseline Axis -->
          <line x1="${padLeft}" y1="${padTop + chartHeight}" x2="${svgWidth - padRight}" y2="${padTop + chartHeight}" class="histogram-baseline" />

          <!-- Bars and Labels -->
          ${barsSvg}
        </svg>
      </div>
      <div class="histogram-chart-footer">
        <span class="chart-hint">Gợi ý: Bấm vào từng cột điểm để lọc nhanh danh sách học viên theo dải điểm.</span>
      </div>
    </div>
  `;
}

/**
 * Render Empty State Placeholder.
 */
export function renderEmptyState(message = 'Vui lòng chọn Lớp và Bài thi để xem báo cáo phổ điểm.') {
  return `
    <div class="panel showcase-placeholder report-empty-state">
      <div class="placeholder-icon">
        ${VIEW_ICONS.empty}
      </div>
      <h3>Báo cáo phổ điểm &amp; Phân tích năng lực</h3>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Render Loading Skeleton State.
 */
export function renderLoadingSkeleton() {
  return `
    <div class="report-loading-container" aria-busy="true">
      <div class="report-roster-grid skeleton-pulse">
        ${[1, 2, 3, 4, 5].map(() => `
          <div class="report-metric-card skeleton-card">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line large"></div>
          </div>
        `).join('')}
      </div>
      <div class="report-statistics-grid skeleton-pulse">
        ${[1, 2, 3, 4, 5].map(() => `
          <div class="report-stat-card skeleton-card">
            <div class="skeleton-line short"></div>
            <div class="skeleton-line medium"></div>
          </div>
        `).join('')}
      </div>
      <div class="histogram-card-container skeleton-pulse">
        <div class="skeleton-chart-box"></div>
      </div>
    </div>
  `;
}

/**
 * Render Error State with Retry button.
 */
export function renderErrorState(errorMessage, onRetry) {
  return `
    <div class="panel report-error-panel">
      <div class="alert alert-danger">
        <span class="alert-icon">${VIEW_ICONS.alert}</span>
        <div class="alert-content">
          <strong>Không thể tải dữ liệu báo cáo</strong>
          <p>${errorMessage || 'Đã xảy ra lỗi trong quá trình tải dữ liệu. Vui lòng thử lại.'}</p>
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm btn-retry-report">
        ${VIEW_ICONS.rotate} Thử lại
      </button>
    </div>
  `;
}

/**
 * Render Drilldown table of students in selected histogram bucket.
 */
export function renderDrilldownTable(bucket, maxScore, skillCode = 'overall', allStudentsList = []) {
  const isFiltered = Boolean(bucket && bucket.label);
  const students = isFiltered
    ? (Array.isArray(bucket.students) ? bucket.students : [])
    : (Array.isArray(allStudentsList) ? allStudentsList : (Array.isArray(bucket?.students) ? bucket.students : []));

  const titleText = isFiltered
    ? `Danh sách học viên khoảng điểm ${bucket.label} pts`
    : `Danh sách học viên ${skillCode === 'overall' ? 'toàn bài' : 'kỹ năng ' + (skillCode || '').toUpperCase()}`;

  const countText = `${students.length} học viên`;

  return `
    <div class="drilldown-card">
      <div class="drilldown-header">
        <div class="drilldown-header-left">
          <h4 class="drilldown-title">
            ${titleText}
          </h4>
          <span class="drilldown-count">${countText}</span>
        </div>
        ${isFiltered ? `
          <button type="button" class="btn btn-secondary btn-sm btn-close-drilldown" title="Xem toàn bộ danh sách">
            Đóng
          </button>
        ` : `
          <span class="drilldown-badge-all">Toàn bộ danh sách</span>
        `}
      </div>
      ${students.length === 0 ? `
        <div class="drilldown-empty"><p>Không có học viên nào trong danh sách.</p></div>
      ` : `
        <div class="drilldown-table-wrapper">
          <table class="drilldown-table">
            <thead>
              <tr>
                <th style="width: 50px;">STT</th>
                <th>Học viên</th>
                <th>Email</th>
                <th style="text-align: right;">Điểm (${skillCode === 'overall' ? 'Toàn bài' : skillCode})</th>
              </tr>
            </thead>
            <tbody>
              ${students.map((s, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td class="student-name-cell"><strong>${s.name || '—'}</strong></td>
                  <td class="student-email-cell">${s.email || '—'}</td>
                  <td class="student-score-cell" style="text-align: right;">${formatScoreFraction(s.score, maxScore)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

/**
 * Main Controller function to render the full Score Distribution View into container.
 * 
 * @param {HTMLElement} container 
 * @param {Object} state - { reportData, isLoading, error, activeSkill: 'overall', includeProvisional: false, activeBucketIndex: -1 }
 * @param {Object} callbacks - { onProvisionalToggle, onSkillChange, onBucketClick, onRetry, onExportExcel, onPrint }
 */
export function renderScoreDistributionView(container, state = {}, callbacks = {}) {
  if (!container) return;

  const {
    reportData = null,
    isLoading = false,
    error = null,
    activeSkill = 'overall',
    includeProvisional = false,
    activeBucketIndex = -1
  } = state;

  const {
    onProvisionalToggle = () => {},
    onSkillChange = () => {},
    onBucketClick = () => {},
    onRetry = () => {},
    onExportExcel = () => {},
    onPrint = () => {},
    onCardFilter = () => {}
  } = callbacks;

  if (isLoading) {
    container.innerHTML = renderLoadingSkeleton();
    return;
  }

  if (error) {
    container.innerHTML = renderErrorState(error.message || String(error));
    const retryBtn = container.querySelector('.btn-retry-report');
    if (retryBtn) retryBtn.addEventListener('click', onRetry);
    return;
  }

  if (!reportData) {
    container.innerHTML = renderEmptyState();
    return;
  }

  const { assignment, rosterSummary, overall, skills = [] } = reportData;

  // Selected skill or overall data
  let currentTarget;
  let currentTitle = 'Phân bố phổ điểm toàn bài';
  let currentMaxScore = assignment?.maxScore || overall?.maxScore || 100;

  if (activeSkill === 'overall' || !activeSkill) {
    currentTarget = overall;
  } else {
    const found = skills.find(s => s.code === activeSkill);
    if (found) {
      currentTarget = found;
      currentTitle = `Phân bố phổ điểm Kỹ năng: ${found.name || found.code}`;
      currentMaxScore = found.maxScore || currentMaxScore;
    } else {
      currentTarget = overall;
    }
  }

  const allBuckets = currentTarget?.histogram?.buckets || [];
  const allStudents = allBuckets.flatMap(b => Array.isArray(b.students) ? b.students : []);
  const sortedAllStudents = [...allStudents].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

  const activeBucket = activeBucketIndex >= 0 ? allBuckets[activeBucketIndex] : null;
  const drilldownHtml = renderDrilldownTable(activeBucket, currentMaxScore, activeSkill, sortedAllStudents);

  const skillsTabs = [
    { code: 'overall', label: 'Toàn bài (Overall)' },
    ...skills.map(s => ({ code: s.code, label: s.name || s.code }))
  ];

  const html = `
    <div class="score-distribution-view">
      <!-- Toolbar: Title & Interactive Controls -->
      <div class="report-header-toolbar">
        <div class="report-header-info">
          <h3 class="report-title">${VIEW_ICONS.chart} Báo cáo phổ điểm: ${assignment?.title || 'Bài thi'}</h3>
          <span class="report-meta">Lớp: <strong>${assignment?.className || assignment?.classId || '—'}</strong> · Thang điểm: <strong>${currentMaxScore} điểm</strong></span>
        </div>
        <div class="report-header-actions">
          <label class="toggle-control" title="Khi bật, hệ thống kết nạp thêm bài thi có điểm tạm tính">
            <input type="checkbox" id="report-toggle-provisional" ${includeProvisional ? 'checked' : ''} />
            <span class="toggle-label">Bao gồm điểm tạm tính</span>
          </label>
          <button type="button" class="btn btn-secondary btn-sm btn-export-excel" title="Tải file Excel kết quả chi tiết">
            Tải Excel
          </button>
          <button type="button" class="btn btn-secondary btn-sm btn-print-report" title="In hoặc lưu file PDF">
            In báo cáo
          </button>
        </div>
      </div>

      <!-- Skill Selection Tabs -->
      ${skills.length > 0 ? `
        <div class="report-skill-tabs" role="tablist">
          ${skillsTabs.map(tab => `
            <button type="button" 
                    role="tab" 
                    class="skill-tab-btn ${activeSkill === tab.code ? 'active' : ''}" 
                    data-skill-code="${tab.code}"
                    aria-selected="${activeSkill === tab.code ? 'true' : 'false'}">
              ${tab.label}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <!-- Roster Summary -->
      ${renderScoreKpiCards(rosterSummary, currentTarget?.statistics || {}, currentMaxScore)}




      <!-- Interactive Histogram & Drilldown Side-by-Side Area -->
      <div class="histogram-drilldown-split-area has-active-drilldown">
        <div class="histogram-card-slot">
          ${renderHistogramSvg(currentTarget?.histogram || {}, currentMaxScore, {
            activeBucketIndex,
            chartTitle: currentTitle
          })}
        </div>

        <!-- Drilldown Details Container (always side-by-side: shows all students or filtered bucket) -->
        <div id="report-drilldown-container" class="report-drilldown-slot">
          ${drilldownHtml}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Bind Events
  const provToggle = container.querySelector('#report-toggle-provisional');
  if (provToggle) {
    provToggle.addEventListener('change', (e) => {
      onProvisionalToggle(e.target.checked);
    });
  }

  const tabBtns = container.querySelectorAll('.skill-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const skillCode = btn.getAttribute('data-skill-code');
      onSkillChange(skillCode);
    });
  });

  const bucketCols = container.querySelectorAll('.histogram-bucket-col');
  bucketCols.forEach(col => {
    col.addEventListener('click', () => {
      const idx = Number(col.getAttribute('data-bucket-idx'));
      const min = Number(col.getAttribute('data-bucket-min'));
      const max = Number(col.getAttribute('data-bucket-max'));
      const count = Number(col.getAttribute('data-count'));
      const bucket = currentTarget?.histogram?.buckets?.[idx] || { min, max, count };
      onBucketClick({ bucket, index: idx, skillCode: activeSkill });
    });
  });

  const closeDrilldownBtn = container.querySelector('.btn-close-drilldown');
  if (closeDrilldownBtn) {
    closeDrilldownBtn.addEventListener('click', () => {
      onBucketClick({ bucket: null, index: -1, skillCode: activeSkill });
    });
  }

  const exportBtn = container.querySelector('.btn-export-excel');
  if (exportBtn) {
    exportBtn.addEventListener('click', onExportExcel);
  }

  const printBtn = container.querySelector('.btn-print-report');
  if (printBtn) {
    printBtn.addEventListener('click', onPrint);
  }

  const kpiCards = container.querySelectorAll('.clickable-kpi-card');
  kpiCards.forEach(card => {
    const handleFilter = () => {
      const statusVal = card.getAttribute('data-filter-status');
      onCardFilter(statusVal !== null ? statusVal : '');
    };
    card.addEventListener('click', handleFilter);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleFilter();
      }
    });
  });
}
