/**
 * dynamic-exam-renderer.mjs
 * Renders dynamic test definitions (from Test Studio / DB) in the Candidate CBT Exam interface.
 * Implements full parity with Test Studio's Candidate Simulation:
 * - Topbar CBT & Header actions
 * - Horizontal Section Nav Pills with exercise & question count badges
 * - True 2-Column CBT Exam Layout:
 *     - Left: Simulation Viewport (Sections, Split-pane Reading Matching, Audio docks, Grouped Questions)
 *     - Right: Sticky Side Panel (Progress bar & ratio, Section list, Filtered Question Navigator Grid, Exam notes)
 * - Footer with Prev / Next / Submit actions
 * - Interactive Question Navigator:
 *     - Filters questions strictly by active section
 *     - Highlights answered questions with .answered (blue pill)
 *     - Click-to-focus with smooth scroll & .nav-focus-pulse animation
 * - Supports all 11+ interaction types:
 *     - vocabulary_pair (text_select_pair)
 *     - pictorial_vocabulary (pictorial_card)
 *     - table_completion / inline_cloze (with multi-blank span expansion)
 *     - single_choice & multi_choice_group
 *     - sentence_rewrite & sentence_reorder (word-bank chips click-to-assemble)
 *     - error_correction
 *     - reading_matching & listening_order
 *     - writing / speaking (long_text / rubric_async)
 *     - short_text
 */

export const ICONS = {
  barChart: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>`,
  compass: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
  lightbulb: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>`,
  volume: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
  zap: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  book: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  clock: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  check: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  play: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  pause: `<svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
};

function escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeRichContent(html) {
  if (!html || typeof html !== 'string') return '';
  let clean = html;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  clean = clean.replace(/<link\b[^>]*>/gi, '');
  clean = clean.replace(/<meta\b[^>]*>/gi, '');
  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = clean.replace(/(?:href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi, '');
  return clean;
}

export function renderFormattedContent(text) {
  if (!text || typeof text !== 'string') return '';
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return sanitizeRichContent(text);
  }
  return escape(text).replace(/\n/g, '<br>');
}

export function formatPedagogicalTypeLabel(item) {
  if (!item) return 'Câu hỏi';
  const rawCode = (item.pedagogicalTypeCode || item.layoutType || item.interactionType || item.graderType || '').toLowerCase();
  
  if (rawCode.includes('table_completion') || rawCode.includes('inline_cloze') || rawCode.includes('inline_dropdown')) {
    return 'Điền từ vào đoạn văn';
  }
  if (rawCode.includes('pronunciation')) {
    return 'Ngữ âm & Phát âm';
  }
  if (rawCode.includes('sentence_rewrite') || rawCode.includes('keyword_transformation')) {
    return 'Viết lại câu';
  }
  if (rawCode.includes('sentence_reorder') || rawCode.includes('token_scramble')) {
    return 'Sắp xếp câu';
  }
  if (rawCode.includes('correction') || rawCode.includes('error')) {
    return 'Tìm & sửa lỗi sai';
  }
  if (rawCode.includes('reading_matching') || rawCode.includes('split_pane')) {
    return 'Ghép nối thông tin';
  }
  if (rawCode.includes('listening_order') || rawCode.includes('timeline')) {
    return 'Sắp xếp thứ tự nghe';
  }
  if (rawCode.includes('pictorial')) {
    return 'Từ vựng qua ảnh';
  }
  if (rawCode.includes('vocab') || rawCode.includes('text_select_pair')) {
    return 'Cặp từ vựng';
  }
  if (rawCode.includes('single_choice')) {
    return 'Trắc nghiệm 1 đáp án';
  }
  if (rawCode.includes('multi_choice')) {
    return 'Trắc nghiệm chọn nhiều';
  }
  if (rawCode.includes('rubric') || rawCode.includes('long_text') || rawCode.includes('essay')) {
    return 'Tự luận';
  }
  if (rawCode.includes('short_text') || rawCode.includes('qa')) {
    return 'Trả lời ngắn';
  }
  return 'Câu hỏi';
}

export function getItemSpanCount(item) {
  if (!item) return 1;
  const isInlineCloze = item.pedagogicalTypeCode === 'inline_cloze' ||
    item.layoutType === 'inline_cloze' ||
    item.pedagogicalTypeCode === 'table_completion' ||
    item.layoutType === 'table_completion' ||
    item.layoutType === 'inline_dropdown_table' ||
    (item.interactionType === 'short_text' && (
      (item.prompt && (/(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/.test(item.prompt))) ||
      (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0)
    ));
  if (isInlineCloze) {
    if (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0) {
      return Object.keys(item.clozeAnswers).length;
    }
    const matches = (item.prompt || '').match(/(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g);
    if (matches && matches.length > 0) return matches.length;
  }
  const isListeningOrder = item.pedagogicalTypeCode === 'listening_order' ||
    item.layoutType === 'timeline_sequence' ||
    item.graderType === 'ordered_sequence' ||
    (Array.isArray(item.events) && item.events.length > 0);
  if (isListeningOrder && Array.isArray(item.events) && item.events.length > 0) {
    return item.events.length;
  }
  return 1;
}

export function getTotalItemCount(definition) {
  if (!definition || !Array.isArray(definition.blocks)) return 0;
  return definition.blocks.reduce((sum, b) => {
    return sum + (Array.isArray(b.items) ? b.items.reduce((s, it) => s + getItemSpanCount(it), 0) : 0);
  }, 0);
}

export function getAnsweredCount(definition, answers = {}) {
  if (!definition || !Array.isArray(definition.blocks)) return 0;
  let answered = 0;
  const allItems = definition.blocks.flatMap(b => b.items || []);
  for (const item of allItems) {
    const span = getItemSpanCount(item);
    const val = answers[item.itemVersionId];
    if (val === undefined || val === null) continue;
    if (span > 1 && typeof val === 'object' && !Array.isArray(val)) {
      for (const k of Object.keys(val)) {
        if (typeof val[k] === 'string' && val[k].trim() !== '') answered++;
      }
    } else if (Array.isArray(val)) {
      if (val.some(v => typeof v === 'string' && v.trim() !== '')) answered++;
    } else if (typeof val === 'object') {
      if (Object.values(val).some(v => typeof v === 'string' && v.trim() !== '')) answered++;
    } else if (typeof val === 'string' && val.trim() !== '') {
      answered++;
    }
  }
  return answered;
}

export function formatOptionDisplayLetter(optId, index) {
  if (!optId && index === undefined) return '';
  const strId = String(optId || '').trim();
  const directMatch = strId.match(/^([a-z])$/i);
  if (directMatch) return directMatch[1].toUpperCase();
  const standardSuffixMatch = strId.match(/[-_]([a-z])$/i);
  if (standardSuffixMatch) return standardSuffixMatch[1].toUpperCase();
  const numSuffixMatch = strId.match(/[-_](\d+)$/i);
  if (numSuffixMatch) {
    const num = parseInt(numSuffixMatch[1], 10);
    if (num >= 1 && num <= 26) return String.fromCharCode(64 + num);
  }
  if (typeof index === 'number' && index >= 0 && index < 26) {
    return String.fromCharCode(65 + index);
  }
  return strId.toUpperCase().slice(0, 2);
}

function parseClozeBlanks(text) {
  const detected = [];
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g;
  for (const m of (text || '').matchAll(pattern)) {
    const num = Number(m[1] || m[2]);
    if (!Number.isNaN(num)) detected.push({ number: num });
  }
  return detected;
}

function isAnswerValueFilled(val) {
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.some(v => typeof v === 'string' && v.trim() !== '');
  if (typeof val === 'object') return Object.values(val).some(v => typeof v === 'string' && v.trim() !== '');
  if (typeof val === 'string') return val.trim().length > 0;
  return false;
}

export function renderSectionNavPills(definition, activeBlockIdx = 0) {
  if (!definition || !Array.isArray(definition.blocks)) return '';
  return definition.blocks.map((b, i) => {
    const bCount = (b.items || []).reduce((s, it) => s + getItemSpanCount(it), 0);
    const exCount = (b.exercises || []).length;
    const badgeText = exCount > 1 ? `${exCount} bài · ${bCount} câu` : `${bCount} câu`;
    const isActive = i === activeBlockIdx;
    return `
      <button type="button" class="section-tab simulation-nav-pill cbt-nav-pill ${isActive ? 'active' : ''}" data-section-target="sim-block-${i}" data-demo-go="${escape(b.title || `Phần ${i + 1}`)}">
        <span class="cbt-pill-title">${escape(b.title || `Phần ${i + 1}`)}</span>
        <span class="tab-count cbt-pill-badge">${badgeText}</span>
      </button>
    `;
  }).join('');
}

export function renderQuestionNavigator(definition, answers = {}) {
  if (!definition || !Array.isArray(definition.blocks)) return '';
  const blocks = definition.blocks;
  return blocks.flatMap((b, bIdx) => {
    const items = b.items || [];
    return items.flatMap(item => {
      const span = getItemSpanCount(item);
      const isInlineCloze = item.pedagogicalTypeCode === 'inline_cloze' ||
        item.layoutType === 'inline_cloze' ||
        item.pedagogicalTypeCode === 'table_completion' ||
        item.layoutType === 'table_completion' ||
        item.layoutType === 'inline_dropdown_table' ||
        (item.interactionType === 'short_text' && (
          (item.prompt && (/(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/.test(item.prompt))) ||
          (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0)
        ));
      const isListeningOrder = item.pedagogicalTypeCode === 'listening_order' ||
        item.layoutType === 'timeline_sequence' ||
        item.graderType === 'ordered_sequence' ||
        (Array.isArray(item.events) && item.events.length > 0);

      const val = answers[item.itemVersionId];

      if (isInlineCloze && span > 1) {
        const detected = parseClozeBlanks(item.prompt || '');
        const uniqueNums = [];
        for (const d of detected) {
          if (!uniqueNums.includes(d.number)) uniqueNums.push(d.number);
        }
        if (item.clozeAnswers) {
          Object.keys(item.clozeAnswers).forEach(k => {
            const n = Number(k);
            if (!Number.isNaN(n) && !uniqueNums.includes(n)) uniqueNums.push(n);
          });
        }
        uniqueNums.sort((a, b) => a - b);
        const btns = [];
        for (let k = 0; k < span; k++) {
          const qPos = item.position + k;
          const blankNum = uniqueNums[k] ?? qPos;
          const isBlankAnswered = typeof val === 'object' && val !== null ? Boolean(val[blankNum]?.trim()) : (typeof val === 'string' && val.trim().length > 0);
          btns.push(`
            <button type="button" class="btn-qnav ${isBlankAnswered ? 'answered' : ''}" data-pos="${qPos}" data-blank-pos="${blankNum}" data-item-id="${escape(item.itemVersionId)}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos} (Chỗ trống ${blankNum})">
              <span class="qnav-num">${qPos}</span>
            </button>
          `);
        }
        return btns;
      }

      if (isListeningOrder && span > 1) {
        const btns = [];
        for (let k = 0; k < span; k++) {
          const qPos = item.position + k;
          const slotNum = k + 1;
          const isSlotAnswered = typeof val === 'object' && val !== null ? Boolean(val[slotNum]?.trim()) : false;
          btns.push(`
            <button type="button" class="btn-qnav ${isSlotAnswered ? 'answered' : ''}" data-pos="${qPos}" data-slot-num="${slotNum}" data-item-id="${escape(item.itemVersionId)}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos} (Bước thứ ${slotNum})">
              <span class="qnav-num">${qPos}</span>
            </button>
          `);
        }
        return btns;
      }

      const qPos = item.position || 1;
      const isAnswered = isAnswerValueFilled(val);
      return [
        `
        <button type="button" class="btn-qnav ${isAnswered ? 'answered' : ''}" data-pos="${qPos}" data-item-id="${escape(item.itemVersionId)}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos}">
          <span class="qnav-num">${qPos}</span>
        </button>
        `
      ];
    });
  }).join('');
}

export function renderSidePanel(definition, state = {}, activeBlockIdx = 0) {
  if (!definition || !Array.isArray(definition.blocks)) return '';
  const blocks = definition.blocks;
  const totalItems = getTotalItemCount(definition);
  const answeredTotal = getAnsweredCount(definition, state.answers || {});
  const pct = totalItems ? Math.round((answeredTotal / totalItems) * 100) : 0;

  const navigatorButtonsHtml = renderQuestionNavigator(definition, state.answers || {});

  return `
    <aside class="side-panel cbt-side-panel">
      <!-- Card 1: Tiến độ làm bài -->
      <div class="panel-card cbt-panel-card cbt-progress-card">
        <div class="cbt-card-header">
          <div class="cbt-card-title-wrap">
            <span class="cbt-card-icon">${ICONS.barChart}</span>
            <strong class="cbt-card-title">Tiến độ làm bài</strong>
          </div>
          <span class="progress-ratio cbt-progress-badge" id="progressRatioDisplay">${answeredTotal}/${totalItems}</span>
        </div>
        <div class="progress-track cbt-progress-track">
          <div class="progress-fill cbt-progress-bar" id="progressFillBar" style="width: ${pct}%;"></div>
        </div>
        <div class="section-list cbt-section-jump-list">
          ${blocks.map((b, i) => {
            const bItems = b.items || [];
            const bTotal = bItems.reduce((s, it) => s + getItemSpanCount(it), 0);
            let bDone = 0;
            for (const it of bItems) {
              const val = (state.answers || {})[it.itemVersionId];
              if (isAnswerValueFilled(val)) bDone += getItemSpanCount(it);
            }
            return `
              <button type="button" class="side-section-btn cbt-jump-btn ${i === activeBlockIdx ? 'active' : ''}" data-section-target="sim-block-${i}" data-demo-go="${escape(b.title || `Phần ${i + 1}`)}">
                <span class="cbt-jump-title">${escape(b.title || `Phần ${i + 1}`)}</span>
                <span class="side-count cbt-jump-count" data-side-count="sim-block-${i}">${bDone}/${bTotal}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Card 2: Bảng câu hỏi Question Navigator -->
      <div class="panel-card cbt-panel-card question-navigator-card cbt-qnav-card">
        <div class="navigator-header cbt-qnav-header">
          <div class="cbt-card-title-wrap">
            <span class="cbt-card-icon">${ICONS.compass}</span>
            <strong class="cbt-card-title">Bảng câu hỏi</strong>
          </div>
          <span class="navigator-summary cbt-qnav-chip" id="qnav-summary">${totalItems} câu</span>
        </div>
        <div class="cbt-qnav-legend">
          <span class="cbt-legend-item"><span class="cbt-legend-dot dot-unanswered"></span> Chưa làm</span>
          <span class="cbt-legend-item"><span class="cbt-legend-dot dot-answered"></span> Đã làm</span>
        </div>
        <div class="question-navigator-grid cbt-qnav-grid" id="questionNavigatorGrid">
          ${navigatorButtonsHtml}
        </div>
      </div>

      <!-- Card 3: Hướng dẫn làm bài -->
      <div class="panel-card cbt-panel-card cbt-tips-card">
        <div class="cbt-card-title-wrap" style="margin-bottom:8px;">
          <span class="cbt-card-icon">${ICONS.lightbulb}</span>
          <strong class="cbt-card-title">Hướng dẫn</strong>
        </div>
        <ul class="sim-notice-text cbt-tips-list">
          <li>Đáp án được lưu tự động theo thời gian thực.</li>
          <li>Bấm vào số câu trên bảng câu hỏi để chuyển nhanh.</li>
          <li>Có thể chuyển phần tùy ý mà không mất bài làm.</li>
        </ul>
      </div>
    </aside>
  `;
}

function renderSimVocabPairTable(vocabItems, answers = {}) {
  if (!vocabItems || !vocabItems.length) return '';
  const firstPrompt = (vocabItems[0]?.prompt || '').trim();
  const promptText = (firstPrompt && !firstPrompt.startsWith('Từ vựng') && firstPrompt.length > 15)
    ? firstPrompt
    : 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:';

  return `
    <div class="candidate-vocab-table-container cbt-vocab-card">
      <div class="candidate-vocab-table-intro">
        <div class="candidate-vocab-table-prompt">${renderFormattedContent(promptText)}</div>
      </div>
      <div class="candidate-vocab-table">
        <div class="candidate-vocab-table-head">
          <div class="vocab-th vocab-th-num">Câu</div>
          <div class="vocab-th vocab-th-en">Từ tiếng Anh nghe được (50% điểm)</div>
          <div class="vocab-th vocab-th-vi">Nghĩa tiếng Việt tương ứng (50% điểm)</div>
        </div>
        <div class="candidate-vocab-table-body">
          ${vocabItems.map(item => {
            const rawAns = answers[item.itemVersionId];
            const enVal = Array.isArray(rawAns) ? (rawAns[0] || '') : (typeof rawAns === 'string' ? rawAns : '');
            const viVal = Array.isArray(rawAns) ? (rawAns[1] || '') : '';
            return `
              <div class="candidate-vocab-table-row" data-item-id="${escape(item.itemVersionId)}">
                <div class="vocab-td vocab-td-num">
                  <span class="vocab-row-num-badge qnum" style="display:inline-flex !important;width:auto !important;max-width:none !important;min-width:max-content !important;height:auto !important;min-height:28px !important;padding:4px 14px !important;border-radius:9999px !important;white-space:nowrap !important;box-sizing:border-box !important;">Câu ${escape(item.position)}</span>
                </div>
                <div class="vocab-td vocab-td-en">
                  <input type="text" class="candidate-vocab-text-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Nhập từ nghe được..." value="${escape(enVal)}" autocomplete="off" />
                </div>
                <div class="vocab-td vocab-td-vi">
                  <select class="candidate-vocab-select" data-item-id="${escape(item.itemVersionId)}">
                    <option value="">-- Chọn nghĩa tương ứng --</option>
                    ${(item.options || []).map(opt => `
                      <option value="${escape(opt.id)}" ${viVal === opt.id ? 'selected' : ''}>${escape(opt.label || opt.id)}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderSimPictorialGroup(pictorialItems, answers = {}) {
  if (!pictorialItems || !pictorialItems.length) return '';
  return `
    <div class="candidate-pictorial-group-container cbt-pictorial-wrap">
      <div class="candidate-pictorial-group-intro">
        <div class="candidate-pictorial-group-prompt">Dựa vào hình ảnh và gợi ý, hãy hoàn thành từ/cụm từ tương ứng:</div>
      </div>
      <div class="candidate-pictorial-grid">
        ${pictorialItems.map(item => {
          const imgSrc = item.image || item.stimulusImageUrl || '';
          const val = typeof answers[item.itemVersionId] === 'string' ? answers[item.itemVersionId] : '';
          return `
            <div class="candidate-pictorial-card cbt-pictorial-card" data-item-id="${escape(item.itemVersionId)}">
              <div class="candidate-pictorial-card-header">
                <span class="question-num-badge qnum" style="display:inline-flex !important;width:auto !important;max-width:none !important;min-width:max-content !important;height:auto !important;min-height:28px !important;padding:4px 14px !important;border-radius:9999px !important;white-space:nowrap !important;box-sizing:border-box !important;">Câu ${escape(item.position)}</span>
                <span class="question-type-badge cbt-type-badge">Từ vựng qua ảnh</span>
              </div>
              ${imgSrc ? `
                <div class="candidate-pictorial-thumb">
                  <img src="${escape(imgSrc)}" alt="Câu ${escape(item.position)}" onerror="this.parentElement.style.display='none'" />
                </div>
              ` : ''}
              <div class="candidate-pictorial-hints">
                ${item.letterHint ? `<div class="pictorial-letter-hint">${escape(item.letterHint)}</div>` : ''}
                ${item.captionHint ? `<div class="pictorial-caption-hint">${escape(item.captionHint)}</div>` : ''}
              </div>
              <div class="candidate-pictorial-input-wrap">
                <input type="text" class="candidate-pictorial-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Nhập từ hoàn chỉnh..." value="${escape(val)}" autocomplete="off" />
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderSimShortQaGroup(shortItems, answers = {}) {
  if (!shortItems || !shortItems.length) return '';
  return `
    <div class="candidate-short-qa-container cbt-short-qa-wrap">
      ${shortItems.map(item => {
        const val = typeof answers[item.itemVersionId] === 'string' ? answers[item.itemVersionId] : '';
        return `
          <div class="candidate-short-qa-item cbt-short-qa-card" data-item-id="${escape(item.itemVersionId)}">
            <div class="candidate-short-prompt-row">
              <span class="candidate-short-qnum qnum" style="display:inline-flex !important;width:auto !important;max-width:none !important;min-width:max-content !important;height:auto !important;min-height:28px !important;padding:4px 14px !important;border-radius:9999px !important;white-space:nowrap !important;box-sizing:border-box !important;">Câu ${escape(item.position)}</span>
              <div class="candidate-short-prompt-text">${renderFormattedContent(item.prompt || '')}</div>
            </div>
            <div class="candidate-short-input-wrap">
              <input type="text" class="candidate-short-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Nhập câu trả lời của bạn..." value="${escape(val)}" autocomplete="off" />
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function renderInlineCloze(item, answers = {}) {
  const text = item.prompt || '';
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g;
  const containsHtml = /<[a-z][\s\S]*>/i.test(text);

  const renderBlank = (num) => {
    const rawVal = answers[item.itemVersionId];
    const val = typeof rawVal === 'object' && rawVal !== null ? (rawVal[num] || '') : (typeof rawVal === 'string' ? rawVal : '');
    const isFilled = typeof val === 'string' && val.trim().length > 0;
    return `<span class="inline-blank-wrapper cbt-blank-pill ${isFilled ? 'is-filled' : ''}" data-item-id="${escape(item.itemVersionId)}">` +
      `<span class="inline-blank-number cbt-blank-idx">(${num})</span>` +
      `<input type="text" class="inline-fill-input cbt-blank-input" data-item-id="${escape(item.itemVersionId)}" data-position="${num}" placeholder="" value="${escape(val)}" autocomplete="off" />` +
    `</span>`;
  };

  if (containsHtml) {
    const cleanHtml = sanitizeRichContent(text);
    let html = '';
    let last = 0;
    for (const match of cleanHtml.matchAll(pattern)) {
      const num = Number(match[1] || match[2]);
      html += cleanHtml.slice(last, match.index);
      html += renderBlank(num);
      last = match.index + match[0].length;
    }
    html += cleanHtml.slice(last);
    return `<div class="candidate-inline-cloze-wrap cbt-cloze-content" style="max-width:100%;word-break:break-word;overflow-wrap:break-word;white-space:normal;">${html}</div>`;
  }

  const cleanText = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\u00a0/g, ' ').trim();
  const rawLines = cleanText.split('\n');

  if (rawLines.length > 1) {
    const linesHtml = rawLines.map(line => {
      let lineHtml = '';
      let last = 0;
      for (const match of line.matchAll(pattern)) {
        const num = Number(match[1] || match[2]);
        lineHtml += escape(line.slice(last, match.index));
        lineHtml += renderBlank(num);
        last = match.index + match[0].length;
      }
      lineHtml += escape(line.slice(last));
      return `<div class="cbt-cloze-line" style="display:block;width:100%;max-width:100%;box-sizing:border-box;white-space:normal;overflow-wrap:break-word;word-break:normal;margin-bottom:14px;line-height:2.2;">${lineHtml}</div>`;
    }).join('');

    return `<div class="candidate-inline-cloze-wrap cbt-cloze-content" style="max-width:100%;word-break:break-word;overflow-wrap:break-word;white-space:normal;">${linesHtml}</div>`;
  }

  let html = '';
  let last = 0;
  for (const match of cleanText.matchAll(pattern)) {
    const num = Number(match[1] || match[2]);
    html += escape(cleanText.slice(last, match.index));
    html += renderBlank(num);
    last = match.index + match[0].length;
  }
  html += escape(cleanText.slice(last));
  return `<div class="candidate-inline-cloze-wrap cbt-cloze-content" style="max-width:100%;word-break:break-word;overflow-wrap:break-word;white-space:normal;"><div class="cbt-cloze-line" style="display:block;width:100%;max-width:100%;box-sizing:border-box;white-space:normal;overflow-wrap:break-word;word-break:normal;line-height:2.2;">${html}</div></div>`;
}

export function renderQuestionCard(item, answers = {}, block = null) {
  const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
  const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') && !isPronunciation;
  const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
  const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair');
  const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching');
  const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence');
  const isSingleChoice = item.interactionType === 'single_choice' && !isListeningOrder && !isReadingMatching && !isErrorCorrection;
  const isMultiGroup = item.interactionType === 'multi_choice_group';
  const isInlineCloze = item.pedagogicalTypeCode === 'inline_cloze' ||
    item.layoutType === 'inline_cloze' ||
    item.pedagogicalTypeCode === 'table_completion' ||
    item.layoutType === 'table_completion' ||
    item.layoutType === 'inline_dropdown_table' ||
    (item.interactionType === 'short_text' && (
      (item.prompt && (/(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/.test(item.prompt))) ||
      (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0)
    ));
  const isRubricAsync = item.graderType === 'rubric_async' || item.interactionType === 'long_text';

  const rawAns = answers[item.itemVersionId];
  let interactiveHtml = '';

  if (isInlineCloze) {
    interactiveHtml = renderInlineCloze(item, answers);
  } else if (isSingleChoice) {
    const cols = (item.options || []).length === 3 ? 'grid-cols-3' : ((item.options || []).length >= 4 ? 'grid-cols-4' : 'grid-cols-2');
    interactiveHtml = `
      <div class="candidate-options-grid cbt-options-grid ${cols}">
        ${(item.options || []).map((opt, optIdx) => {
          const checked = rawAns === opt.id ? 'checked' : '';
          return `
            <label class="candidate-choice-label cbt-choice-tile ${checked ? 'selected' : ''}">
              <input type="radio" name="cand_${escape(item.itemVersionId)}" value="${escape(opt.id)}" data-item-id="${escape(item.itemVersionId)}" ${checked} />
              <span class="choice-key cbt-choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
              <span class="choice-text cbt-choice-text">${escape(opt.label || opt.id)}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  } else if (isMultiGroup) {
    const selectedList = Array.isArray(rawAns) ? rawAns : [];
    interactiveHtml = `
      <div class="candidate-options-grid cbt-options-grid grid-cols-2">
        ${(item.options || []).map((opt, optIdx) => {
          const checked = selectedList.includes(opt.id) ? 'checked' : '';
          return `
            <label class="candidate-choice-label cbt-choice-tile ${checked ? 'selected' : ''}">
              <input type="checkbox" name="cand_${escape(item.itemVersionId)}" value="${escape(opt.id)}" data-item-id="${escape(item.itemVersionId)}" ${checked} />
              <span class="choice-key cbt-choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
              <span class="choice-text cbt-choice-text">${escape(opt.label || opt.id)}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  } else if (isSentenceRewrite) {
    const val = typeof rawAns === 'string' ? rawAns : '';
    interactiveHtml = `
      <div class="candidate-transformation-wrap cbt-transformation-wrap" data-item-id="${escape(item.itemVersionId)}">
        <div class="transformation-keyword-row cbt-keyword-row">
          <span class="cbt-keyword-label">Từ khóa bắt buộc:</span>
          <span class="keyword-badge-pill cbt-keyword-pill">${escape(item.keyword || '')}</span>
        </div>
        <div class="candidate-frame-box cbt-frame-box">
          <span class="frame-prefix-text cbt-frame-text">${escape(item.framePrefix || '')}</span>
          <input type="text" class="candidate-transformation-input cbt-transformation-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Nhập cụm từ khuyết..." value="${escape(val)}" autocomplete="off" />
          <span class="frame-suffix-text cbt-frame-text">${escape(item.frameSuffix || '')}</span>
        </div>
      </div>
    `;
  } else if (isSentenceReorder) {
    const val = typeof rawAns === 'string' ? rawAns : '';
    const tokens = item.tokens || (item.targetSentence ? item.targetSentence.split(' ') : []);
    interactiveHtml = `
      <div class="candidate-sentence-reorder-wrap cbt-reorder-wrap" data-item-id="${escape(item.itemVersionId)}">
        <div class="candidate-token-bank cbt-token-bank">
          ${tokens.map(tok => `
            <button type="button" class="btn-token-chip cbt-token-chip" data-token="${escape(tok)}">${escape(tok)}</button>
          `).join('')}
        </div>
        <div class="assembly-input-wrap cbt-assembly-wrap">
          <input type="text" class="candidate-reorder-input cbt-reorder-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Bấm thẻ từ hoặc gõ câu..." value="${escape(val)}" autocomplete="off" />
          <button type="button" class="btn-clear-assembly cbt-btn-clear" data-item-id="${escape(item.itemVersionId)}">Xóa</button>
        </div>
      </div>
    `;
  } else if (isErrorCorrection) {
    const errVal = rawAns?.error || '';
    const corrVal = rawAns?.correction || '';
    interactiveHtml = `
      <div class="candidate-error-correction-grid cbt-correction-grid" data-item-id="${escape(item.itemVersionId)}">
        <div class="candidate-dual-box cbt-dual-box">
          <label class="cbt-error-label">1. Từ/cụm từ sai:</label>
          <input type="text" class="candidate-error-input cbt-input-field" data-item-id="${escape(item.itemVersionId)}" placeholder="Lỗi sai..." value="${escape(errVal)}" autocomplete="off" />
        </div>
        <div class="candidate-dual-box cbt-dual-box">
          <label class="cbt-corr-label">2. Sửa lại thành:</label>
          <input type="text" class="candidate-correction-input cbt-input-field" data-item-id="${escape(item.itemVersionId)}" placeholder="Sửa đúng..." value="${escape(corrVal)}" autocomplete="off" />
        </div>
      </div>
    `;
  } else if (isReadingMatching) {
    const val = typeof rawAns === 'string' ? rawAns : '';
    interactiveHtml = `
      <div class="candidate-matching-wrap cbt-matching-wrap">
        <select class="candidate-choice-select cbt-select-field" data-item-id="${escape(item.itemVersionId)}">
          <option value="">-- Chọn Heading tương ứng --</option>
          ${(item.options || []).map(opt => `
            <option value="${escape(opt.id)}" ${val === opt.id ? 'selected' : ''}>${escape(opt.label || opt.id)}</option>
          `).join('')}
        </select>
      </div>
    `;
  } else if (isRubricAsync) {
    const val = typeof rawAns === 'string' ? rawAns : '';
    const wordCount = val.trim() ? val.trim().split(/\s+/).length : 0;
    interactiveHtml = `
      <div class="candidate-open-wrap cbt-open-wrap">
        <textarea class="candidate-open-textarea cbt-open-textarea" data-item-id="${escape(item.itemVersionId)}" rows="5" placeholder="Nhập bài viết / câu trả lời của bạn tại đây...">${escape(val)}</textarea>
        <div class="candidate-open-meta cbt-open-meta">
          <span class="word-count-badge cbt-chip">Số từ: <strong>${wordCount}</strong></span>
          <span class="scoring-info-badge cbt-chip-score">Điểm tối đa: ${item.maxScore || 4} điểm</span>
        </div>
      </div>
    `;
  } else {
    const val = typeof rawAns === 'string' ? rawAns : '';
    interactiveHtml = `
      <input type="text" class="candidate-short-input cbt-short-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Gõ câu trả lời của bạn..." value="${escape(val)}" autocomplete="off" />
    `;
  }

  let promptText = '';
  if (isInlineCloze) {
    promptText = item.instructions || item.instruction || item.taskInstructions || item.helpText || block?.instructions || 'Điền từ thích hợp vào chỗ trống trong đoạn văn hoặc câu bên dưới:';
  } else if (item.instructions && item.instructions !== item.prompt && item.prompt) {
    promptText = `${item.instructions}<br/>${item.prompt}`;
  } else {
    promptText = item.prompt || item.instructions || item.instruction || '';
  }
  const span = getItemSpanCount(item);
  const qNumDisplay = span > 1 ? `Câu ${item.position} – ${item.position + span - 1}` : `Câu ${item.position}`;
  const scoreDisplay = span > 1 ? `${span} câu · ${item.maxScore || span} điểm` : `${item.maxScore || 1} điểm`;
  const typeLabel = formatPedagogicalTypeLabel(item);

  return `
    <div class="candidate-question-card cbt-question-card" data-item-id="${escape(item.itemVersionId)}">
      <div class="candidate-question-header cbt-question-header">
        <div class="cbt-qhead-left">
          <span class="question-num-badge qnum cbt-qnum-badge" style="display:inline-flex !important;width:auto !important;max-width:none !important;min-width:max-content !important;height:auto !important;min-height:28px !important;padding:4px 16px !important;border-radius:9999px !important;white-space:nowrap !important;box-sizing:border-box !important;">${escape(qNumDisplay)}</span>
          <span class="cbt-qscore-badge">${escape(scoreDisplay)}</span>
        </div>
        <div class="cbt-qhead-right">
          <span class="question-type-badge cbt-type-badge">${escape(typeLabel)}</span>
        </div>
      </div>
      ${promptText ? `<div class="candidate-question-prompt cbt-question-prompt">${renderFormattedContent(promptText)}</div>` : ''}
      <div class="cbt-question-interactive-body">
        ${interactiveHtml}
      </div>
    </div>
  `;
}

export function convertGoogleDriveAudioUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    const fileId = match[1];
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
    const apiBase = isLocal ? `${window.location.protocol}//${window.location.hostname}:8788` : '';
    return `${apiBase}/api/teacher/media/drive-stream?id=${encodeURIComponent(fileId)}`;
  }
  if (typeof window !== 'undefined' && window.location.pathname.includes('/term-tests/teacher-dashboard/') && trimmed.startsWith('assets/')) {
    return `../webtest-34-demo/${trimmed}`;
  }
  return trimmed;
}

export function renderAudioDockHtml(audioSrc, label = 'Bài nghe phần thi', maxListens = 1) {
  const convertedUrl = convertGoogleDriveAudioUrl(audioSrc);
  if (!convertedUrl) return '';
  return `
    <div class="strict-audio-dock candidate-audio-dock" data-audio-src="${escape(convertedUrl)}" data-listens-count="0" data-max-listens="${maxListens}">
      <div class="strict-audio-header">
        <span class="audio-badge">${ICONS.volume} ${escape(label)}</span>
        <div class="audio-meta-right">
          <div class="audio-volume-control">
            <label class="volume-label" title="Âm lượng loa">${ICONS.volume}</label>
            <input type="range" class="candidate-audio-volume" min="0" max="1" step="0.05" value="1" aria-label="Âm lượng loa" />
            <output class="volume-output">100%</output>
          </div>
        </div>
      </div>
      <div class="strict-audio-body">
        <button type="button" class="btn btn-primary btn-sm btn-sim-audio-play">
          ${ICONS.play} Bắt đầu nghe
        </button>
        <div class="sim-audio-timeline">
          <div class="sim-audio-time-current">00:00</div>
          <div class="sim-audio-bar-track">
            <div class="sim-audio-bar-fill" style="width:0%"></div>
          </div>
          <div class="sim-audio-time-total">--:--</div>
        </div>
        <div class="audio-live-status" style="display:none;">
          <span class="dot"></span>
          <span class="status-text">Đang phát bài nghe…</span>
        </div>
        <div class="audio-ended-notice" style="display:none;">
          <span class="dot dot-ended"></span>
          <span class="audio-note">Đã nghe xong bài nghe · Bài nghe đã khóa</span>
        </div>
      </div>
      <audio class="audio-hidden-element" src="${escape(convertedUrl)}" preload="auto" style="display:none;"></audio>
    </div>
  `;
}

export function renderDynamicExam(definition, container, { state = { answers: {} }, onAnswerChange, activeSection }) {
  if (!container || !definition || !Array.isArray(definition.blocks)) return;

  const blocks = definition.blocks;
  const currentSection = activeSection || blocks[0]?.title || 'Phần 1';

  let html = '';

  blocks.forEach((block, bIdx) => {
    const sectionName = block.title || `Phần ${bIdx + 1}`;
    const isVisible = sectionName === currentSection || bIdx === 0;
    const items = block.items || [];
    const audioSrc = block.audioUrl || block.stimulusAudioUrl || '';
    const reading = block.readingPassage || '';

    // Check if this block has split-pane reading matching
    const hasSplitPane = items.some(it => it.pedagogicalTypeCode === 'reading_matching' || it.layoutType === 'split_pane_matching');

    // Group items into sub-clusters
    const itemGroups = [];
    items.forEach(item => {
      const isVocab = item.interactionType === 'text_select_pair';
      const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary');
      const isShortText = item.interactionType === 'short_text' && item.layoutType !== 'inline_cloze' && !isPictorial && item.pedagogicalTypeCode !== 'reading_matching';

      const lastGroup = itemGroups[itemGroups.length - 1];
      if (isVocab) {
        if (lastGroup && lastGroup.type === 'vocab_pair_group') {
          lastGroup.items.push(item);
        } else {
          itemGroups.push({ type: 'vocab_pair_group', items: [item] });
        }
      } else if (isPictorial) {
        if (lastGroup && lastGroup.type === 'pictorial_group') {
          lastGroup.items.push(item);
        } else {
          itemGroups.push({ type: 'pictorial_group', items: [item] });
        }
      } else if (isShortText) {
        if (lastGroup && lastGroup.type === 'short_qa_group') {
          lastGroup.items.push(item);
        } else {
          itemGroups.push({ type: 'short_qa_group', items: [item] });
        }
      } else {
        itemGroups.push({ type: 'single', item });
      }
    });

    const renderedGroups = itemGroups.map(group => {
      if (group.type === 'vocab_pair_group') {
        return renderSimVocabPairTable(group.items, state.answers);
      }
      if (group.type === 'pictorial_group') {
        return renderSimPictorialGroup(group.items, state.answers);
      }
      if (group.type === 'short_qa_group') {
        return renderSimShortQaGroup(group.items, state.answers);
      }
      return renderQuestionCard(group.item, state.answers, block);
    }).join('');

    const bCount = items.reduce((s, it) => s + getItemSpanCount(it), 0);
    const exCount = (block.exercises || []).length;

    let sectionContentHtml = '';
    if (hasSplitPane && reading) {
      sectionContentHtml = `
        <div class="cbt-section-hero">
          <div class="cbt-hero-top">
            <div class="cbt-hero-title-group">
              <span class="cbt-hero-pill-tag">Phần thi ${bIdx + 1}</span>
              <h2 class="cbt-hero-title">${escape(block.title || `Phần ${bIdx + 1}`)}</h2>
            </div>
            <div class="cbt-hero-meta-chips">
              <span class="cbt-chip cbt-chip-count">${ICONS.zap} ${bCount} câu hỏi</span>
              ${exCount > 1 ? `<span class="cbt-chip cbt-chip-ex">${ICONS.book} ${exCount} bài tập</span>` : ''}
            </div>
          </div>
          ${block.instructions ? `
            <div class="cbt-instruction-banner">
              <span class="cbt-instruction-icon">${ICONS.lightbulb}</span>
              <div class="cbt-instruction-text">${renderFormattedContent(block.instructions)}</div>
            </div>
          ` : ''}
        </div>

        <div class="exercise simulation-split-pane-exercise cbt-exercise-wrap">
          <div class="exercise-head" style="display:none;">
            <div>
              <h2>${escape(block.title || `Phần ${bIdx + 1}`)}</h2>
              ${block.instructions ? `<p class="demo-lines">${escape(block.instructions)}</p>` : ''}
            </div>
            <span class="points">${items.length} câu hỏi</span>
          </div>

          ${audioSrc ? renderAudioDockHtml(audioSrc, `Bài nghe: ${block.title || `Phần ${bIdx + 1}`}`, 1) : ''}

          <div class="split-pane-mobile-toggle">
            <button type="button" class="btn btn-secondary btn-sm active toggle-pane-btn" data-pane="reading" data-section="${bIdx}">${ICONS.book} Xem bài đọc</button>
            <button type="button" class="btn btn-secondary btn-sm toggle-pane-btn" data-pane="questions" data-section="${bIdx}">Xem câu hỏi (${items.length})</button>
          </div>

          <div class="split-pane-reading cbt-split-pane" id="split-pane-${bIdx}">
            <div class="reading-passage-column active-pane cbt-reading-col" data-pane-type="reading">
              <div class="reading-passage-sticky-header cbt-reading-header">
                <span class="reading-title-badge">${ICONS.book} Bài đọc hiểu (Reading Passage)</span>
                <span class="reading-hint">Cuộn độc lập để tra cứu</span>
              </div>
              <div class="reading-passage-content cbt-reading-body">
                ${renderFormattedContent(reading)}
              </div>
            </div>

            <div class="matching-questions-column cbt-matching-col" data-pane-type="questions">
              <div class="matching-column-header cbt-matching-header">Danh sách câu hỏi ghép nối</div>
              <div class="demo-questions-wrap cbt-questions-wrap">
                ${renderedGroups}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      sectionContentHtml = `
        <div class="cbt-section-hero">
          <div class="cbt-hero-top">
            <div class="cbt-hero-title-group">
              <span class="cbt-hero-pill-tag">Phần thi ${bIdx + 1}</span>
              <h2 class="cbt-hero-title">${escape(block.title || `Phần ${bIdx + 1}`)}</h2>
            </div>
            <div class="cbt-hero-meta-chips">
              <span class="cbt-chip cbt-chip-count">${ICONS.zap} ${bCount} câu hỏi</span>
              ${exCount > 1 ? `<span class="cbt-chip cbt-chip-ex">${ICONS.book} ${exCount} bài tập</span>` : ''}
            </div>
          </div>
          ${block.instructions ? `
            <div class="cbt-instruction-banner">
              <span class="cbt-instruction-icon">${ICONS.lightbulb}</span>
              <div class="cbt-instruction-text">${renderFormattedContent(block.instructions)}</div>
            </div>
          ` : ''}
        </div>

        <div class="exercise cbt-exercise-wrap">
          <div class="exercise-head" style="display:none;">
            <div>
              <h2>${escape(block.title || `Phần ${bIdx + 1}`)}</h2>
              ${block.instructions ? `<p class="demo-lines">${escape(block.instructions)}</p>` : ''}
            </div>
            <span class="points">${items.length} câu hỏi</span>
          </div>

          ${audioSrc ? renderAudioDockHtml(audioSrc, `Bài nghe: ${block.title || `Phần ${bIdx + 1}`}`, 1) : ''}

          ${reading ? `
            <div class="sim-reading-dock cbt-reading-dock">
              <div class="reading-header cbt-reading-dock-header">${ICONS.book} Bài đọc tham khảo:</div>
              <div class="reading-content cbt-reading-dock-body">${renderFormattedContent(reading)}</div>
            </div>
          ` : ''}

          <div class="demo-questions-wrap cbt-questions-wrap">
            ${renderedGroups}
          </div>
        </div>
      `;
    }

    html += `
      <section class="simulation-section-card section-page ${isVisible ? 'active' : ''}" id="sim-block-${bIdx}" data-demo-page="${escape(sectionName)}">
        ${sectionContentHtml}
      </section>
    `;
  });

  html += `
    <footer class="simulation-footer cbt-simulation-footer">
      <div class="footer-note cbt-footer-note">
        <span class="cbt-save-indicator-dot"></span>
        <span>Câu trả lời được tự động lưu. Hãy kiểm tra các câu hỏi chưa làm trong phần thi trước khi chuyển tiếp hoặc nộp bài.</span>
      </div>
      <div class="footer-actions cbt-footer-actions">
        <button class="btn btn-secondary cbt-btn-prev" id="demo-prev">← Phần trước</button>
        <button class="btn btn-primary cbt-btn-next" id="demo-next">Phần tiếp →</button>
      </div>
    </footer>
  `;

  container.innerHTML = html;
}

export function initDynamicExamInteractions(rootEl, { definition, state = { answers: {} }, onAnswerChange, onSectionChange }) {
  if (!rootEl || !definition) return;

  const blocks = definition.blocks || [];
  const qnavBtns = rootEl.querySelectorAll('.btn-qnav');

  // Question Navigator filtering strictly by Section
  const filterNavigatorBySection = (targetSectionId) => {
    let visibleCount = 0;
    qnavBtns.forEach(btn => {
      const btnSection = btn.getAttribute('data-section-target');
      const isMatch = !targetSectionId || btnSection === targetSectionId;
      btn.style.display = isMatch ? 'inline-flex' : 'none';
      if (isMatch) visibleCount++;
    });
    const summaryEl = rootEl.querySelector('#qnav-summary');
    if (summaryEl) {
      summaryEl.textContent = `${visibleCount} câu`;
    }
  };

  // Section switcher
  const activateSection = (targetId) => {
    rootEl.querySelectorAll('.section-tab, .simulation-nav-pill').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-section-target') === targetId);
    });
    rootEl.querySelectorAll('.side-section-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-section-target') === targetId);
    });
    rootEl.querySelectorAll('.section-page, .simulation-section-card').forEach(sec => {
      sec.classList.toggle('active', sec.id === targetId);
    });
    filterNavigatorBySection(targetId);

    // Sync Prev/Next button labels & disabled states
    const blockIdx = parseInt((targetId || '').replace('sim-block-', ''), 10) || 0;
    const prevBtn = rootEl.querySelector('#demo-prev');
    const nextBtn = rootEl.querySelector('#demo-next');
    if (prevBtn) prevBtn.disabled = blockIdx === 0;
    if (nextBtn) {
      nextBtn.textContent = blockIdx === blocks.length - 1 ? 'Nộp bài' : 'Phần tiếp →';
    }

    if (onSectionChange) {
      const activeBlock = blocks[blockIdx];
      onSectionChange(activeBlock?.title || `Phần ${blockIdx + 1}`);
    }
  };

  // Bind Section Pills & Side section buttons
  rootEl.querySelectorAll('.section-tab, .simulation-nav-pill, .side-section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-section-target');
      if (targetId) activateSection(targetId);
    });
  });

  // Prev / Next button navigation
  const prevBtn = rootEl.querySelector('#demo-prev');
  const nextBtn = rootEl.querySelector('#demo-next');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const activeCard = rootEl.querySelector('.simulation-section-card.section-page.active');
      const currentId = activeCard?.id || 'sim-block-0';
      const idx = parseInt(currentId.replace('sim-block-', ''), 10);
      if (idx > 0) activateSection(`sim-block-${idx - 1}`);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const activeCard = rootEl.querySelector('.simulation-section-card.section-page.active');
      const currentId = activeCard?.id || 'sim-block-0';
      const idx = parseInt(currentId.replace('sim-block-', ''), 10);
      if (idx < blocks.length - 1) {
        activateSection(`sim-block-${idx + 1}`);
      } else {
        const topSubmit = document.querySelector('#demo-submit-top') || document.querySelector('#demo-submit');
        if (topSubmit) topSubmit.click();
      }
    });
  }

  // Question Navigator click-to-focus and section navigation
  qnavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSectionId = btn.getAttribute('data-section-target');
      const pos = btn.getAttribute('data-pos');
      const blankPos = btn.getAttribute('data-blank-pos');
      const slotNum = btn.getAttribute('data-slot-num');
      const itemId = btn.getAttribute('data-item-id');

      // 1. Activate target section
      if (targetSectionId) {
        activateSection(targetSectionId);
      }

      // 2. Find target element
      let targetEl = null;
      if (blankPos || btn.hasAttribute('data-blank-pos')) {
        targetEl = rootEl.querySelector(`.inline-fill-input[data-position="${blankPos}"]`) ||
          rootEl.querySelector(`.inline-fill-input[data-position="${pos}"]`);
      } else if (slotNum || btn.hasAttribute('data-slot-num')) {
        targetEl = rootEl.querySelector(`.candidate-sequence-select[data-position="${pos}"]`) ||
          rootEl.querySelector(`[data-item-id="${CSS.escape(itemId)}"] .candidate-sequence-select[data-slot="${slotNum}"]`);
      } else if (itemId) {
        const itemCard = rootEl.querySelector(`.candidate-question-card[data-item-id="${CSS.escape(itemId)}"]`) ||
          rootEl.querySelector(`.candidate-vocab-table-row[data-item-id="${CSS.escape(itemId)}"]`) ||
          rootEl.querySelector(`.candidate-pictorial-card[data-item-id="${CSS.escape(itemId)}"]`) ||
          rootEl.querySelector(`.candidate-short-qa-item[data-item-id="${CSS.escape(itemId)}"]`) ||
          rootEl.querySelector(`[data-item-id="${CSS.escape(itemId)}"]`);
        if (itemCard) {
          targetEl = itemCard.querySelector('input:not([type="hidden"]), select, textarea') || itemCard;
        }
      }

      if (targetEl) {
        if (typeof targetEl.scrollIntoView === 'function') {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (typeof targetEl.focus === 'function') {
          targetEl.focus();
        }
        targetEl.classList.add('nav-focus-pulse');
        setTimeout(() => {
          targetEl.classList.remove('nav-focus-pulse');
        }, 1200);
      }
    });
  });

  // Function to update navigator answered states and progress bar
  const updateAnsweredState = () => {
    const totalItems = getTotalItemCount(definition);
    let answeredTotal = 0;

    qnavBtns.forEach(btn => {
      const pos = btn.getAttribute('data-pos');
      const blankPos = btn.getAttribute('data-blank-pos');
      const slotNum = btn.getAttribute('data-slot-num');
      const itemId = btn.getAttribute('data-item-id');

      let isAnswered = false;
      if (blankPos || btn.hasAttribute('data-blank-pos')) {
        const input = rootEl.querySelector(`.inline-fill-input[data-position="${blankPos || pos}"]`);
        if (input && input.value && input.value.trim().length > 0) isAnswered = true;
      } else if (slotNum || btn.hasAttribute('data-slot-num')) {
        const select = rootEl.querySelector(`.candidate-sequence-select[data-position="${pos}"]`);
        if (select && select.value && select.value.trim().length > 0) isAnswered = true;
      } else if (itemId) {
        const val = state.answers[itemId];
        isAnswered = isAnswerValueFilled(val);
      }

      btn.classList.toggle('answered', isAnswered);
      if (isAnswered) answeredTotal++;
    });

    // Update Progress ratio & fill
    const progressRatio = rootEl.querySelector('#progressRatioDisplay');
    if (progressRatio) progressRatio.textContent = `${answeredTotal}/${totalItems}`;
    const progressFill = rootEl.querySelector('#progressFillBar');
    if (progressFill) {
      const pct = totalItems ? Math.round((answeredTotal / totalItems) * 100) : 0;
      progressFill.style.width = `${pct}%`;
    }

    // Update Side section badges
    blocks.forEach((b, i) => {
      const bItems = b.items || [];
      const bTotal = bItems.reduce((s, it) => s + getItemSpanCount(it), 0);
      let bDone = 0;
      for (const it of bItems) {
        const val = state.answers[it.itemVersionId];
        if (isAnswerValueFilled(val)) bDone += getItemSpanCount(it);
      }
      const sideBadge = rootEl.querySelector(`[data-side-count="sim-block-${i}"]`);
      if (sideBadge) sideBadge.textContent = `${bDone}/${bTotal}`;
    });
  };

  // Initial navigator filter
  filterNavigatorBySection('sim-block-0');
  updateAnsweredState();

  // Input & change event delegation
  function captureAnswer(e) {
    const target = e.target;
    const itemId = target.getAttribute('data-item-id');
    if (!itemId) return;

    let value = undefined;

    // Vocab pair
    const row = target.closest('.candidate-vocab-table-row');
    if (row) {
      const enInput = row.querySelector('.candidate-vocab-text-input');
      const viSelect = row.querySelector('.candidate-vocab-select');
      const enVal = (enInput?.value || '').trim();
      const viVal = viSelect?.value || '';
      value = [enVal, viVal];
      state.answers[itemId] = value;
      updateAnsweredState();
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Error correction
    const errGrid = target.closest('.candidate-error-correction-grid');
    if (errGrid) {
      const errInp = errGrid.querySelector('.candidate-error-input');
      const corrInp = errGrid.querySelector('.candidate-correction-input');
      value = { error: (errInp?.value || '').trim(), correction: (corrInp?.value || '').trim() };
      state.answers[itemId] = value;
      updateAnsweredState();
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Inline cloze blank
    const blankWrap = target.closest('.inline-blank-wrapper');
    if (blankWrap) {
      const pos = target.getAttribute('data-position');
      if (pos) {
        const currentAnswers = typeof state.answers[itemId] === 'object' && state.answers[itemId] !== null ? state.answers[itemId] : {};
        currentAnswers[pos] = target.value.trim();
        value = currentAnswers;
        state.answers[itemId] = value;
        blankWrap.classList.toggle('is-filled', Boolean(target.value.trim()));
        updateAnsweredState();
        if (onAnswerChange) onAnswerChange(itemId, value);
        return;
      }
    }

    // Multi group (checkbox)
    if (target.type === 'checkbox') {
      const checkedBoxes = rootEl.querySelectorAll(`input[type="checkbox"][data-item-id="${CSS.escape(itemId)}"]:checked`);
      value = Array.from(checkedBoxes).map(cb => cb.value);
      state.answers[itemId] = value;
      const card = target.closest('.candidate-question-card') || target.closest('.cbt-question-card');
      if (card) {
        card.querySelectorAll('.candidate-choice-label').forEach(lbl => {
          const cb = lbl.querySelector('input[type="checkbox"]');
          lbl.classList.toggle('selected', cb && cb.checked);
        });
      }
      updateAnsweredState();
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Single choice (radio)
    if (target.type === 'radio') {
      value = target.value;
      state.answers[itemId] = value;
      const card = target.closest('.candidate-question-card') || target.closest('.cbt-question-card');
      if (card) {
        card.querySelectorAll('.candidate-choice-label').forEach(lbl => {
          const r = lbl.querySelector('input[type="radio"]');
          lbl.classList.toggle('selected', r && r.checked);
        });
      }
      updateAnsweredState();
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Textarea word counter
    if (target.tagName === 'TEXTAREA') {
      value = target.value;
      const countBadge = target.parentElement?.querySelector('.word-count-badge strong');
      if (countBadge) {
        const words = value.trim() ? value.trim().split(/\s+/).length : 0;
        countBadge.textContent = String(words);
      }
      state.answers[itemId] = value;
      updateAnsweredState();
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Standard text or select
    value = target.value;
    state.answers[itemId] = value;
    updateAnsweredState();
    if (onAnswerChange) onAnswerChange(itemId, value);
  }

  rootEl.addEventListener('input', captureAnswer);
  rootEl.addEventListener('change', captureAnswer);

  // Token chips click-to-assemble
  rootEl.querySelectorAll('.btn-token-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.candidate-sentence-reorder-wrap');
      const input = wrap?.querySelector('.candidate-reorder-input');
      if (input) {
        const token = btn.getAttribute('data-token');
        input.value = (input.value ? input.value + ' ' : '') + token;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });

  // Reorder clear button
  rootEl.querySelectorAll('.btn-clear-assembly').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.candidate-sentence-reorder-wrap');
      const input = wrap?.querySelector('.candidate-reorder-input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });

  // Split-pane mobile toggles
  rootEl.querySelectorAll('.toggle-pane-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pane = btn.getAttribute('data-pane');
      const secIdx = btn.getAttribute('data-section');
      const container = rootEl.querySelector(`#split-pane-${secIdx}`);
      if (!container) return;
      btn.parentElement.querySelectorAll('.toggle-pane-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const readingCol = container.querySelector('.reading-passage-column');
      const qCol = container.querySelector('.matching-questions-column');
      if (pane === 'reading') {
        if (readingCol) readingCol.style.display = 'block';
        if (qCol) qCol.style.display = 'none';
      } else {
        if (readingCol) readingCol.style.display = 'none';
        if (qCol) qCol.style.display = 'flex';
      }
    });
  });

  // Initialize Strict Audio Docks (max 2 listens)
  initStrictAudioDocks(rootEl);

  return {
    activateSection,
    filterNavigatorBySection,
    updateAnsweredState
  };
}

export function initStrictAudioDocks(rootEl) {
  if (!rootEl) return;
  const docks = rootEl.querySelectorAll('.strict-audio-dock');
  docks.forEach(dock => {
    const audioEl = dock.querySelector('.audio-hidden-element');
    const playBtn = dock.querySelector('.btn-sim-audio-play');
    const volumeInput = dock.querySelector('.candidate-audio-volume');
    const volumeOutput = dock.querySelector('.volume-output');
    const liveStatus = dock.querySelector('.audio-live-status');
    const endedNotice = dock.querySelector('.audio-ended-notice');
    const timeCurrent = dock.querySelector('.sim-audio-time-current');
    const timeTotal = dock.querySelector('.sim-audio-time-total');
    const barFill = dock.querySelector('.sim-audio-bar-fill');

    if (!audioEl || !playBtn) return;

    const maxListens = parseInt(dock.getAttribute('data-max-listens') || '1', 10);
    let listensCount = parseInt(dock.getAttribute('data-listens-count') || '0', 10);
    let maxPlayedTime = 0;

    const formatSec = (secs) => {
      if (isNaN(secs) || secs < 0) return '00:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    if (volumeInput) {
      audioEl.volume = Number(volumeInput.value) || 1;
      volumeInput.addEventListener('input', (e) => {
        const val = Number(e.target.value) || 0;
        audioEl.volume = val;
        if (volumeOutput) volumeOutput.textContent = `${Math.round(val * 100)}%`;
      });
    }

    if (typeof audioEl.addEventListener === 'function') {
      audioEl.addEventListener('loadedmetadata', () => {
        if (timeTotal && audioEl.duration) {
          timeTotal.textContent = formatSec(audioEl.duration);
        }
      });

      audioEl.addEventListener('timeupdate', () => {
        if (timeCurrent) timeCurrent.textContent = formatSec(audioEl.currentTime);
        if (barFill && audioEl.duration) {
          const pct = Math.min(100, (audioEl.currentTime / audioEl.duration) * 100);
          barFill.style.width = `${pct}%`;
        }
        maxPlayedTime = Math.max(maxPlayedTime, audioEl.currentTime);
      });

      // Seeking protection: prevent skipping forward past played time
      audioEl.addEventListener('seeking', () => {
        if (Math.abs(audioEl.currentTime - maxPlayedTime) > 1.5) {
          audioEl.currentTime = maxPlayedTime;
        }
      });

      audioEl.addEventListener('pause', () => {
        if (!audioEl.ended && listensCount < maxListens) {
          playBtn.innerHTML = `${ICONS.play} Tiếp tục nghe`;
          if (liveStatus) liveStatus.style.display = 'none';
        }
      });

      audioEl.addEventListener('ended', () => {
        listensCount++;
        dock.setAttribute('data-listens-count', String(listensCount));
        maxPlayedTime = 0;
        if (liveStatus) liveStatus.style.display = 'none';

        playBtn.disabled = true;
        playBtn.style.display = 'none';
        if (endedNotice) endedNotice.style.display = 'inline-flex';
      });

      audioEl.addEventListener('error', () => {
        console.warn('Audio playback error:', audioEl.error);
        if (liveStatus) {
          liveStatus.innerHTML = `<span class="dot" style="background:#e11d48"></span><span class="status-text" style="color:#e11d48">Không thể phát file bài nghe</span>`;
          liveStatus.style.display = 'inline-flex';
        }
      });
    }

    playBtn.addEventListener('click', async () => {
      if (listensCount >= maxListens) return;

      if (audioEl.paused) {
        // Pause all other audios in rootEl
        rootEl.querySelectorAll('.audio-hidden-element').forEach(other => {
          if (other !== audioEl && !other.paused) other.pause();
        });

        try {
          await audioEl.play();
          playBtn.innerHTML = `${ICONS.pause} Tạm dừng`;
          if (liveStatus) liveStatus.style.display = 'inline-flex';
        } catch (err) {
          console.warn('Cannot play audio:', err);
        }
      } else {
        audioEl.pause();
        playBtn.innerHTML = `${ICONS.play} Tiếp tục nghe`;
        if (liveStatus) liveStatus.style.display = 'none';
      }
    });
  });
}

