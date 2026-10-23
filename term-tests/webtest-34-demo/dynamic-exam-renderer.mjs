/**
 * dynamic-exam-renderer.mjs
 * Renders dynamic test definitions (from Test Studio / DB) in the Candidate CBT Exam interface.
 * Supports all 11+ Test Studio interaction types:
 * - vocabulary_pair (text_select_pair)
 * - pictorial_vocabulary (pictorial_card)
 * - table_completion / inline_cloze
 * - single_choice & multi_choice_group
 * - sentence_rewrite & sentence_reorder
 * - error_correction
 * - reading_matching & listening_order
 * - writing / speaking (long_text / rubric_async)
 * - short_text
 */

function escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getTotalItemCount(definition) {
  if (!definition || !Array.isArray(definition.blocks)) return 0;
  return definition.blocks.reduce((sum, b) => sum + (Array.isArray(b.items) ? b.items.length : 0), 0);
}

export function getAnsweredCount(definition, answers = {}) {
  if (!definition || !Array.isArray(definition.blocks)) return 0;
  let answered = 0;
  const allItems = definition.blocks.flatMap(b => b.items || []);
  for (const item of allItems) {
    const val = answers[item.itemVersionId];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
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

function renderSimVocabPairTable(vocabItems, answers) {
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
                  <span class="vocab-row-num-badge">Câu ${escape(item.position)}</span>
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

function renderSimPictorialGroup(pictorialItems, answers) {
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
                <span class="question-num-badge">Câu ${escape(item.position)}</span>
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

function renderSimShortQaGroup(shortItems, answers) {
  if (!shortItems || !shortItems.length) return '';
  return `
    <div class="candidate-short-qa-container">
      ${shortItems.map(item => {
        const val = typeof answers[item.itemVersionId] === 'string' ? answers[item.itemVersionId] : '';
        return `
          <div class="candidate-short-qa-item" data-item-id="${escape(item.itemVersionId)}">
            <div class="candidate-short-prompt-row">
              <span class="candidate-short-qnum">Câu ${escape(item.position)}</span>
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

function renderInlineCloze(item, answers) {
  const text = item.prompt || '';
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g;
  let html = '';
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1] || match[2]);
    html += escape(text.slice(last, match.index)).replace(/\n/g, '<br>');
    const val = typeof answers[item.itemVersionId] === 'string' ? answers[item.itemVersionId] : '';
    html += `<span class="inline-blank-wrapper" data-item-id="${escape(item.itemVersionId)}">
      <span class="inline-blank-number">(${num})</span>
      <input type="text" class="inline-fill-input" data-item-id="${escape(item.itemVersionId)}" placeholder="${num}" value="${escape(val)}" autocomplete="off" />
    </span>`;
    last = match.index + match[0].length;
  }
  html += escape(text.slice(last)).replace(/\n/g, '<br>');
  return `<div class="candidate-inline-cloze-wrap">${html}</div>`;
}

function renderQuestionCard(item, answers) {
  const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
  const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') && !isPronunciation;
  const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
  const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair');
  const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching');
  const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence');
  const isSingleChoice = item.interactionType === 'single_choice' && !isListeningOrder && !isReadingMatching && !isErrorCorrection;
  const isMultiGroup = item.interactionType === 'multi_choice_group';
  const isInlineCloze = item.interactionType === 'short_text' && item.layoutType === 'inline_cloze';
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
        <span class="question-num-badge">Câu ${escape(item.position)}</span>
        <span class="question-type-badge">${escape(item.pedagogicalTypeCode || item.interactionType || 'Câu hỏi')}</span>
      </div>
      ${promptText ? `<div class="candidate-question-prompt">${escape(promptText).replace(/\n/g, '<br>')}</div>` : ''}
      ${interactiveHtml}
    </div>
  `;
}

export function renderDynamicExam(definition, container, { state, onAnswerChange, activeSection }) {
  if (!container || !definition || !Array.isArray(definition.blocks)) return;

  const blocks = definition.blocks;
  const currentSection = activeSection || blocks[0]?.title || 'Phần 1';

  let html = '';

  blocks.forEach((block, bIdx) => {
    const sectionName = block.title || `Phần ${bIdx + 1}`;
    const isVisible = sectionName === currentSection;
    const items = block.items || [];
    const audioSrc = block.audioUrl || block.stimulusAudioUrl || '';
    const reading = block.readingPassage || '';

    // Group items into sub-clusters (vocab pairs, pictorials, short QAs, or single items)
    const itemGroups = [];
    items.forEach(item => {
      const isVocab = item.interactionType === 'text_select_pair';
      const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary');
      const isShortText = item.interactionType === 'short_text' && item.layoutType !== 'inline_cloze' && !isPictorial;

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

    html += `
      <section data-demo-page="${escape(sectionName)}" class="exercise demo-section ${isVisible ? '' : 'hidden'}">
        <div class="exercise-head">
          <div>
            <h2>${escape(block.title || `Phần ${bIdx + 1}`)}</h2>
            ${block.instructions ? `<p class="demo-lines">${escape(block.instructions)}</p>` : ''}
          </div>
          <span class="points">${items.length} câu hỏi</span>
        </div>

        ${audioSrc ? `
          <div class="demo-audio-gate" style="margin-bottom:16px;">
            <audio controls src="${escape(audioSrc)}" style="width:100%;max-width:540px;height:40px;"></audio>
          </div>
        ` : ''}

        ${reading ? `
          <div class="sim-reading-dock" style="margin-bottom:16px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
            <div style="font-weight:700;color:#174266;margin-bottom:8px;">Bài đọc tham khảo:</div>
            <div style="max-height:300px;overflow-y:auto;line-height:1.6;color:#334155;">${escape(reading).replace(/\n/g, '<br>')}</div>
          </div>
        ` : ''}

        <div class="demo-questions-wrap">
          ${renderedGroups}
        </div>
      </section>
    `;
  });

  html += `
    <div class="bottom-actions demo-bottom">
      <button class="btn btn-secondary" id="demo-prev">← Phần trước</button>
      <button class="btn btn-primary" id="demo-next">Phần tiếp →</button>
    </div>
  `;

  container.innerHTML = html;

  // Bind input and change events with delegation
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
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Multi group (checkbox)
    if (target.type === 'checkbox') {
      const checkedBoxes = container.querySelectorAll(`input[type="checkbox"][data-item-id="${CSS.escape(itemId)}"]:checked`);
      value = Array.from(checkedBoxes).map(cb => cb.value);
      state.answers[itemId] = value;
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Single choice (radio)
    if (target.type === 'radio') {
      value = target.value;
      state.answers[itemId] = value;
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
      if (onAnswerChange) onAnswerChange(itemId, value);
      return;
    }

    // Standard text or select
    value = target.value;
    state.answers[itemId] = value;
    if (onAnswerChange) onAnswerChange(itemId, value);
  }

  container.addEventListener('input', captureAnswer);
  container.addEventListener('change', captureAnswer);

  // Reorder chips click event
  container.querySelectorAll('.btn-token-chip').forEach(btn => {
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
  container.querySelectorAll('.btn-clear-assembly').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.candidate-sentence-reorder-wrap');
      const input = wrap?.querySelector('.candidate-reorder-input');
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
}
