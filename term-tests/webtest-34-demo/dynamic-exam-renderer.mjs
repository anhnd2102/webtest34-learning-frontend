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

function escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getItemSpanCount(item) {
  if (!item) return 1;
  const isInlineCloze = item.pedagogicalTypeCode === 'inline_cloze' ||
    item.layoutType === 'inline_cloze' ||
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
    const badgeText = exCount > 1 ? `${exCount} bài tập · ${bCount} câu` : `${bCount} câu`;
    const isActive = i === activeBlockIdx;
    return `
      <button type="button" class="section-tab simulation-nav-pill ${isActive ? 'active' : ''}" data-section-target="sim-block-${i}" data-demo-go="${escape(b.title || `Phần ${i + 1}`)}">
        <span>${escape(b.title || `Phần ${i + 1}`)}</span>
        <span class="tab-count">${badgeText}</span>
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
    <aside class="side-panel">
      <!-- Card 1: Tiến độ làm bài -->
      <div class="panel-card">
        <div class="progress-row">
          <strong>Tiến độ làm bài</strong>
          <span class="progress-ratio" id="progressRatioDisplay">${answeredTotal}/${totalItems}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="progressFillBar" style="width: ${pct}%;"></div>
        </div>
        <div class="section-list">
          ${blocks.map((b, i) => {
            const bItems = b.items || [];
            const bTotal = bItems.reduce((s, it) => s + getItemSpanCount(it), 0);
            let bDone = 0;
            for (const it of bItems) {
              const val = (state.answers || {})[it.itemVersionId];
              if (isAnswerValueFilled(val)) bDone += getItemSpanCount(it);
            }
            return `
              <button type="button" class="side-section-btn ${i === activeBlockIdx ? 'active' : ''}" data-section-target="sim-block-${i}" data-demo-go="${escape(b.title || `Phần ${i + 1}`)}">
                <span>${escape(b.title || `Phần ${i + 1}`)}</span>
                <span class="side-count" data-side-count="sim-block-${i}">${bDone}/${bTotal}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Card 2: Bảng câu hỏi Question Navigator -->
      <div class="panel-card question-navigator-card">
        <div class="navigator-header">
          <strong>Bảng câu hỏi</strong>
          <span class="navigator-summary" id="qnav-summary">${totalItems} câu</span>
        </div>
        <div class="question-navigator-grid" id="questionNavigatorGrid">
          ${navigatorButtonsHtml}
        </div>
      </div>

      <!-- Card 3: Lưu ý khi làm bài -->
      <div class="panel-card">
        <strong>Lưu ý khi làm bài</strong>
        <p class="sim-notice-text">
          • Câu trả lời được lưu tự động lên hệ thống.<br/>
          • Có thể chuyển phần mà không mất đáp án.<br/>
          • Nhấn vào số câu trên bảng câu hỏi để chuyển nhanh tới câu đó.
        </p>
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
    <div class="candidate-vocab-table-container">
      <div class="candidate-vocab-table-intro">
        <div class="candidate-vocab-table-prompt">${escape(promptText)}</div>
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
                  <span class="vocab-row-num-badge qnum">Câu ${escape(item.position)}</span>
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
    <div class="candidate-pictorial-group-container">
      <div class="candidate-pictorial-group-intro">
        <div class="candidate-pictorial-group-prompt">Dựa vào hình ảnh và gợi ý, hãy hoàn thành từ/cụm từ tương ứng:</div>
      </div>
      <div class="candidate-pictorial-grid">
        ${pictorialItems.map(item => {
          const imgSrc = item.image || item.stimulusImageUrl || '';
          const val = typeof answers[item.itemVersionId] === 'string' ? answers[item.itemVersionId] : '';
          return `
            <div class="candidate-pictorial-card" data-item-id="${escape(item.itemVersionId)}">
              <div class="candidate-pictorial-card-header">
                <span class="question-num-badge qnum">Câu ${escape(item.position)}</span>
                <span class="question-type-badge">Từ vựng qua ảnh</span>
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
    <div class="candidate-short-qa-container">
      ${shortItems.map(item => {
        const val = typeof answers[item.itemVersionId] === 'string' ? answers[item.itemVersionId] : '';
        return `
          <div class="candidate-short-qa-item" data-item-id="${escape(item.itemVersionId)}">
            <div class="candidate-short-prompt-row">
              <span class="candidate-short-qnum qnum">Câu ${escape(item.position)}</span>
              <div class="candidate-short-prompt-text">${escape(item.prompt || '')}</div>
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

function renderInlineCloze(item, answers = {}) {
  const text = item.prompt || '';
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g;
  let html = '';
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1] || match[2]);
    html += escape(text.slice(last, match.index)).replace(/\n/g, '<br>');
    const rawVal = answers[item.itemVersionId];
    const val = typeof rawVal === 'object' && rawVal !== null ? (rawVal[num] || '') : (typeof rawVal === 'string' ? rawVal : '');
    html += `<span class="inline-blank-wrapper" data-item-id="${escape(item.itemVersionId)}">
      <span class="inline-blank-number">(${num})</span>
      <input type="text" class="inline-fill-input" data-item-id="${escape(item.itemVersionId)}" data-position="${num}" placeholder="${num}" value="${escape(val)}" autocomplete="off" />
    </span>`;
    last = match.index + match[0].length;
  }
  html += escape(text.slice(last)).replace(/\n/g, '<br>');
  return `<div class="candidate-inline-cloze-wrap">${html}</div>`;
}

function renderQuestionCard(item, answers = {}) {
  const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
  const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') && !isPronunciation;
  const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
  const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair');
  const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching');
  const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence');
  const isSingleChoice = item.interactionType === 'single_choice' && !isListeningOrder && !isReadingMatching && !isErrorCorrection;
  const isMultiGroup = item.interactionType === 'multi_choice_group';
  const isInlineCloze = item.interactionType === 'short_text' && (item.layoutType === 'inline_cloze' || (item.prompt && (/(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/.test(item.prompt))));
  const isRubricAsync = item.graderType === 'rubric_async' || item.interactionType === 'long_text';

  const rawAns = answers[item.itemVersionId];
  let interactiveHtml = '';

  if (isInlineCloze) {
    interactiveHtml = renderInlineCloze(item, answers);
  } else if (isSingleChoice) {
    const cols = (item.options || []).length === 3 ? 'grid-cols-3' : ((item.options || []).length >= 4 ? 'grid-cols-4' : 'grid-cols-2');
    interactiveHtml = `
      <div class="candidate-options-grid ${cols}">
        ${(item.options || []).map((opt, optIdx) => {
          const checked = rawAns === opt.id ? 'checked' : '';
          return `
            <label class="candidate-choice-label">
              <input type="radio" name="cand_${escape(item.itemVersionId)}" value="${escape(opt.id)}" data-item-id="${escape(item.itemVersionId)}" ${checked} />
              <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
              <span class="choice-text">${escape(opt.label || opt.id)}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  } else if (isMultiGroup) {
    const selectedList = Array.isArray(rawAns) ? rawAns : [];
    interactiveHtml = `
      <div class="candidate-options-grid grid-cols-2">
        ${(item.options || []).map((opt, optIdx) => {
          const checked = selectedList.includes(opt.id) ? 'checked' : '';
          return `
            <label class="candidate-choice-label">
              <input type="checkbox" name="cand_${escape(item.itemVersionId)}" value="${escape(opt.id)}" data-item-id="${escape(item.itemVersionId)}" ${checked} />
              <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
              <span class="choice-text">${escape(opt.label || opt.id)}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  } else if (isSentenceRewrite) {
    const val = typeof rawAns === 'string' ? rawAns : '';
    interactiveHtml = `
      <div class="candidate-transformation-wrap" data-item-id="${escape(item.itemVersionId)}">
        <div class="transformation-keyword-row">
          <span style="font-size:0.85rem;font-weight:600;color:#475569;">Từ khóa bắt buộc:</span>
          <span class="keyword-badge-pill">${escape(item.keyword || '')}</span>
        </div>
        <div class="candidate-frame-box">
          <span class="frame-prefix-text">${escape(item.framePrefix || '')}</span>
          <input type="text" class="candidate-transformation-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Nhập cụm từ khuyết..." value="${escape(val)}" autocomplete="off" />
          <span class="frame-suffix-text">${escape(item.frameSuffix || '')}</span>
        </div>
      </div>
    `;
  } else if (isSentenceReorder) {
    const val = typeof rawAns === 'string' ? rawAns : '';
    const tokens = item.tokens || (item.targetSentence ? item.targetSentence.split(' ') : []);
    interactiveHtml = `
      <div class="candidate-sentence-reorder-wrap" data-item-id="${escape(item.itemVersionId)}">
        <div class="candidate-token-bank">
          ${tokens.map(tok => `
            <button type="button" class="btn-token-chip" data-token="${escape(tok)}">${escape(tok)}</button>
          `).join('')}
        </div>
        <div class="assembly-input-wrap">
          <input type="text" class="candidate-reorder-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Bấm thẻ từ hoặc gõ câu..." value="${escape(val)}" autocomplete="off" />
          <button type="button" class="btn-clear-assembly" data-item-id="${escape(item.itemVersionId)}">Xóa</button>
        </div>
      </div>
    `;
  } else if (isErrorCorrection) {
    const errVal = rawAns?.error || '';
    const corrVal = rawAns?.correction || '';
    interactiveHtml = `
      <div class="candidate-error-correction-grid" data-item-id="${escape(item.itemVersionId)}">
        <div class="candidate-dual-box">
          <label style="font-size:0.82rem;font-weight:600;color:#b91c1c;">1. Từ/cụm từ sai:</label>
          <input type="text" class="candidate-error-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Lỗi sai..." value="${escape(errVal)}" autocomplete="off" />
        </div>
        <div class="candidate-dual-box">
          <label style="font-size:0.82rem;font-weight:600;color:#15803d;">2. Sửa lại thành:</label>
          <input type="text" class="candidate-correction-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Sửa đúng..." value="${escape(corrVal)}" autocomplete="off" />
        </div>
      </div>
    `;
  } else if (isReadingMatching) {
    const val = typeof rawAns === 'string' ? rawAns : '';
    interactiveHtml = `
      <div class="candidate-matching-wrap">
        <select class="candidate-choice-select" data-item-id="${escape(item.itemVersionId)}">
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
      <div class="candidate-open-wrap">
        <textarea class="candidate-open-textarea" data-item-id="${escape(item.itemVersionId)}" rows="5" placeholder="Nhập bài viết / câu trả lời của bạn tại đây...">${escape(val)}</textarea>
        <div class="candidate-open-meta">
          <span class="word-count-badge">Số từ: <strong>${wordCount}</strong></span>
          <span class="scoring-info-badge">Điểm tối đa: ${item.maxScore || 4} điểm (Chấm AI)</span>
        </div>
      </div>
    `;
  } else {
    const val = typeof rawAns === 'string' ? rawAns : '';
    interactiveHtml = `
      <input type="text" class="candidate-short-input" data-item-id="${escape(item.itemVersionId)}" placeholder="Gõ câu trả lời của bạn..." value="${escape(val)}" autocomplete="off" />
    `;
  }

  const promptText = isInlineCloze ? '' : (item.prompt || '');

  return `
    <div class="candidate-question-card" data-item-id="${escape(item.itemVersionId)}">
      <div class="candidate-question-header">
        <span class="question-num-badge qnum">Câu ${escape(item.position)}</span>
        <span class="question-type-badge">${escape(item.pedagogicalTypeCode || item.interactionType || 'Câu hỏi')}</span>
      </div>
      ${promptText ? `<div class="candidate-question-prompt">${escape(promptText).replace(/\n/g, '<br>')}</div>` : ''}
      ${interactiveHtml}
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
      return renderQuestionCard(group.item, state.answers);
    }).join('');

    let sectionContentHtml = '';
    if (hasSplitPane && reading) {
      sectionContentHtml = `
        <div class="exercise simulation-split-pane-exercise">
          <div class="exercise-head">
            <div>
              <h2>${escape(block.title || `Phần ${bIdx + 1}`)}</h2>
              ${block.instructions ? `<p class="demo-lines">${escape(block.instructions)}</p>` : ''}
            </div>
            <span class="points">${items.length} câu hỏi</span>
          </div>

          <div class="split-pane-mobile-toggle">
            <button type="button" class="btn btn-secondary btn-sm active toggle-pane-btn" data-pane="reading" data-section="${bIdx}">📖 Xem bài đọc</button>
            <button type="button" class="btn btn-secondary btn-sm toggle-pane-btn" data-pane="questions" data-section="${bIdx}">Xem câu hỏi (${items.length})</button>
          </div>

          <div class="split-pane-reading" id="split-pane-${bIdx}">
            <div class="reading-passage-column active-pane" data-pane-type="reading">
              <div class="reading-passage-sticky-header">
                <span class="reading-title-badge">📖 Bài đọc hiểu (Reading Passage)</span>
                <span class="reading-hint">Cuộn độc lập để tra cứu</span>
              </div>
              <div class="reading-passage-content">
                ${escape(reading).replace(/\n/g, '<br/>')}
              </div>
            </div>

            <div class="matching-questions-column" data-pane-type="questions">
              <div class="matching-column-header">Danh sách câu hỏi ghép nối</div>
              <div class="demo-questions-wrap">
                ${renderedGroups}
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      sectionContentHtml = `
        <div class="exercise">
          <div class="exercise-head">
            <div>
              <h2>${escape(block.title || `Phần ${bIdx + 1}`)}</h2>
              ${block.instructions ? `<p class="demo-lines">${escape(block.instructions)}</p>` : ''}
            </div>
            <span class="points">${items.length} câu hỏi</span>
          </div>

          ${audioSrc ? `
            <div class="audio-dock sim-audio-dock">
              <audio controls src="${escape(audioSrc)}" style="width:100%;max-width:540px;height:40px;"></audio>
            </div>
          ` : ''}

          ${reading ? `
            <div class="sim-reading-dock">
              <div class="reading-header">📖 Bài đọc tham khảo:</div>
              <div class="reading-content">${escape(reading).replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}

          <div class="demo-questions-wrap">
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
    <footer class="simulation-footer">
      <div class="footer-note">Câu trả lời được tự động lưu. Hãy kiểm tra các câu hỏi chưa làm trong phần thi trước khi chuyển tiếp hoặc nộp bài.</div>
      <div class="footer-actions">
        <button class="btn btn-secondary" id="demo-prev">← Phần trước</button>
        <button class="btn btn-primary" id="demo-next">Phần tiếp →</button>
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
      updateAnsweredState();
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Single choice (radio)
    if (target.type === 'radio') {
      value = target.value;
      state.answers[itemId] = value;
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

  return {
    activateSection,
    filterNavigatorBySection,
    updateAnsweredState
  };
}
