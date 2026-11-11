import {
  parseClozeBlanks,
  getItemSpanCount
} from './draft-model.js';
import {
  COMMON_IPA_SYMBOLS,
  formatIpaTranscription,
  tokenizeSentence,
  scrambleTokens,
  extractParagraphLabels,
  validateListeningOrderUniqueness,
  formatOptionDisplayLetter
} from './question-content.js';
import {
  escapeHtml
} from '../ui/presentation.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  sanitizeRichContent,
  renderInlineClozeMarkup
} from '../ui/rich-content.js';

export function createQuestionRenderer({ draftState, collapsedCardKeys }) {
function renderItemCard(item, itemIdx, block, blockIdx) {
      const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
      const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') && !isPronunciation;
      const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
      const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || block.layoutType === 'split_pane_matching') && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isSingleChoice = item.interactionType === 'single_choice' && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isMultiGroup = item.interactionType === 'multi_choice_group' && item.graderType === 'unordered_group_slot';
      const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isInlineCloze = (item.pedagogicalTypeCode === 'inline_cloze' || item.layoutType === 'inline_cloze' || (item.interactionType === 'short_text' && item.layoutType === 'inline_cloze')) && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isShortText = item.interactionType === 'short_text' && item.graderType !== 'rubric_async' && !isInlineCloze && !isPictorial && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isVocabPair = item.interactionType === 'text_select_pair';
      const isRubricAsync = item.graderType === 'rubric_async';
      const hasRedundantPrompt = isVocabPair || isPictorial || isPronunciation || isSentenceRewrite || isSentenceReorder || isReadingMatching || isListeningOrder;

      let nextBlankNum = 1;
      if (isInlineCloze) {
        const detectedBlanks = parseClozeBlanks(item.prompt || '');
        const uniqueBlankNums = [];
        for (const b of detectedBlanks) {
          if (!uniqueBlankNums.includes(b.number)) uniqueBlankNums.push(b.number);
        }
        const maxBlankNum = uniqueBlankNums.length ? Math.max(...uniqueBlankNums) : (item.position || 1);
        nextBlankNum = uniqueBlankNums.length ? maxBlankNum + 1 : (item.position || 1);
      }

      const hasLongOption = (item.options || []).some(o => (o.label || '').length > 25);
      const layout = item.layoutType || (hasLongOption ? 'grid_1' : (item.options?.length === 3 ? 'grid_3' : (item.options?.length >= 4 ? 'grid_4' : 'grid_2')));
      const colsClass = layout === 'grid_1' ? 'grid-cols-1' : (layout === 'grid_3' ? 'grid-cols-3' : (layout === 'grid_4' ? 'grid-cols-4' : 'grid-cols-2'));

      const itemKey = draftState.gradingKey.items[item.itemVersionId] || {};
      const groupKey = item.groupId ? (draftState.gradingKey.groups[item.groupId] || {}) : {};

      let specificHtml = '';

      if (isPronunciation) {
        const targetWord = item.targetWord || itemKey.targetWord || 'camera';
        const ipaTranscription = item.ipaTranscription || itemKey.ipaTranscription || '/ˈkæm.ər.ə/';
        const audioUrl = item.audioUrl || itemKey.audioUrl || '';
        const optionsList = item.options && item.options.length ? item.options : [
          { id: 'A', label: '/ˈkæm.ər.ə/' },
          { id: 'B', label: '/kəˈmɪər.ə/' },
          { id: 'C', label: '/ˈkæm.eɪ.rə/' }
        ];
        const expectedOptionId = itemKey.expectedOptionId || optionsList[0]?.id || 'A';

        const ipaButtonsHtml = COMMON_IPA_SYMBOLS.map(sym => `
          <button type="button" class="btn btn-secondary btn-sm btn-ipa-symbol" data-symbol="${escapeHtml(sym)}" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn ký tự phiên âm ${escapeHtml(sym)}">
            ${escapeHtml(sym)}
          </button>
        `).join('');

        const optionsHtml = optionsList.map(opt => `
          <div class="pronunciation-option-row">
            <label class="option-select-label" title="Chọn làm đáp án đúng">
              <input type="radio" name="pron_correct_${item.itemVersionId}" class="radio-pron-correct" value="${opt.id}" ${opt.id === expectedOptionId ? 'checked' : ''} data-correct="${opt.id}" />
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control form-control-sm input-pron-option-label" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Ký hiệu phiên âm hoặc từ cho phương án ${opt.id}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-pronunciation-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án này" aria-label="Xóa phương án này">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-pronunciation-ipa">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cấu hình câu hỏi Phát âm & Phiên âm IPA (Pronunciation):</strong></span>
              <span class="badge badge-info">Bàn phím ký tự IPA 1-click & Audio</span>
            </div>

            <div class="pronunciation-grid-inputs">
              <div class="form-group">
                <label class="form-label"><strong>1. Từ / Cụm từ mục tiêu (Target Word):</strong></label>
                <input type="text" class="form-control input-pronunciation-word" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(targetWord)}" placeholder="Ví dụ: camera, generous, though..." />
              </div>
              <div class="form-group">
                <label class="form-label"><strong>2. File âm thanh mẫu (Audio Pronunciation URL - Tùy chọn):</strong></label>
                <div class="audio-input-with-preview">
                  <input type="text" class="form-control input-pronunciation-audio" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(audioUrl)}" placeholder="https://assets.izone.edu.vn/audio/... hoặc link Google Drive" />
                  <button type="button" class="btn btn-secondary btn-sm btn-preview-audio" data-target="pron" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Nghe thử file âm thanh">
                    ${renderSvgIcon('play', 'icon-inline')} Nghe thử
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><strong>3. Ký hiệu phiên âm chuẩn quốc tế (IPA Transcription):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-ipa-transcription" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(ipaTranscription)}" placeholder="Ví dụ: /ˈkæm.ər.ə/" />
              </div>
            </div>

            <div class="ipa-symbol-keyboard-panel">
              <div class="ipa-keyboard-header">
                Bàn phím chèn nhanh ký tự IPA (Bấm để chèn vào ô phiên âm):
              </div>
              <div class="ipa-symbol-keyboard">
                ${ipaButtonsHtml}
              </div>
            </div>

            <div class="ipa-phonetic-badge-wrap">
              <span class="ipa-preview-label">Xem trước huy hiệu phiên âm (IPA Badge Preview):</span>
              <div class="ipa-phonetic-badge">
                ${escapeHtml(formatIpaTranscription(ipaTranscription) || '/.../')}
              </div>
            </div>

            <div class="pronunciation-options-section">
              <div class="template-header-bar">
                <span class="section-sublabel"><strong>Danh sách phương án phân biệt (Tích chọn đáp án đúng):</strong></span>
              </div>
              <div class="pronunciation-options-list">
                ${optionsHtml}
              </div>
              <div class="options-actions">
                <button type="button" class="btn btn-secondary btn-sm btn-add-pronunciation-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  + Thêm phương án IPA
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (isSentenceRewrite) {
        const keyword = item.keyword || itemKey.keyword || 'PREVENTED';
        const framePrefix = item.framePrefix ?? itemKey.framePrefix ?? 'His severe illness';
        const frameSuffix = item.frameSuffix ?? itemKey.frameSuffix ?? 'from going to the conference.';
        const targetAnswer = item.targetAnswer || (itemKey.accepted && itemKey.accepted[0]) || 'prevented him';
        const acceptedList = itemKey.accepted || [targetAnswer];

        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        specificHtml = `
          <div class="template-section template-sentence-transformation">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cấu hình câu biến đổi (Keyword Transformation):</strong></span>
              <span class="badge badge-info">Biến đổi câu giữ nguyên nghĩa</span>
            </div>

            <div class="form-group">
              <label class="form-label"><strong>1. Từ khóa bắt buộc (Keyword - Tự động in hoa):</strong></label>
              <input type="text" class="form-control input-transformation-keyword" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(keyword)}" placeholder="Ví dụ: PREVENTED, UNLESS, SO..." />
            </div>

            <div class="transformation-frame-inputs">
              <div class="form-group">
                <label class="form-label"><strong>2. Tiền tố khung câu (Frame Prefix):</strong></label>
                <input type="text" class="form-control input-frame-prefix" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(framePrefix)}" placeholder="Ví dụ: His severe illness" />
              </div>
              <div class="form-group">
                <label class="form-label"><strong>3. Hậu tố khung câu (Frame Suffix):</strong></label>
                <input type="text" class="form-control input-frame-suffix" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(frameSuffix)}" placeholder="Ví dụ: from going to the conference." />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><strong>4. Đáp án mẫu trong chỗ trống (Target Answer):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-transformation-answer" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(targetAnswer)}" placeholder="Ví dụ: prevented him" />
                <button type="button" class="btn btn-secondary btn-generate-transformation-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động sinh các biến thể viết tắt/mở rộng">
                  ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể
                </button>
              </div>
            </div>

            <div class="transformation-frame-preview">
              <div class="frame-preview-title">Xem trước khung câu hoàn chỉnh:</div>
              <div class="frame-preview-content">
                <span class="frame-prefix-text">${escapeHtml(framePrefix || '')}</span>
                <span class="frame-blank-placeholder">[ ${escapeHtml(targetAnswer || '_____')} ]</span>
                <span class="frame-suffix-text">${escapeHtml(frameSuffix || '')}</span>
              </div>
            </div>

            <!-- Accepted variants chips -->
            <div class="variant-chips-container">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể đáp án được chấp nhận (${acceptedList.length}/20)</span>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-transformation-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể đáp án (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isSentenceReorder) {
        const tokens = item.tokens || itemKey.tokens || tokenizeSentence(item.targetSentence || 'She / has worked / at the company / for five years');
        const distractors = item.distractors || itemKey.distractors || [];
        const targetSentence = item.targetSentence || (itemKey.accepted && itemKey.accepted[0]) || tokens.join(' ');
        const rawTokensStr = tokens.join(' / ');
        const scrambled = scrambleTokens(tokens);

        const acceptedList = itemKey.accepted || [targetSentence];
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const distractorChipsHtml = distractors.map((d, dIdx) => `
          <span class="distractor-chip" data-distractor="${escapeHtml(d)}" data-distractor-idx="${dIdx}">
            <span class="chip-text"><span class="distractor-symbol">×</span> ${escapeHtml(d)}</span>
            <button type="button" class="btn-remove-distractor-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-distractor-idx="${dIdx}" title="Xóa từ gây nhiễu" aria-label="Xóa từ gây nhiễu">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const scrambledPreviewChips = [...scrambled, ...distractors].map((tok) => `
          <span class="token-chip ${distractors.includes(tok) ? 'token-distractor' : ''}">${escapeHtml(tok)}</span>
        `).join('');

        specificHtml = `
          <div class="template-section template-sentence-reorder">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cấu hình câu cần sắp xếp (Token Scramble):</strong></span>
              <span class="badge badge-info">Tự động xáo trộn từ/cụm từ</span>
            </div>

            <div class="form-group">
              <label class="form-label"><strong>1. Câu hoàn chỉnh mục tiêu (Target Sentence):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-target-sentence" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(targetSentence)}" placeholder="Nhập câu chuẩn hoàn chỉnh..." />
                <button type="button" class="btn btn-secondary btn-tokenize-sentence" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động phân rã câu thành các mảnh từ">
                  ${renderSvgIcon('zap', 'icon-inline')} Phân rã từ (Tokenize)
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label"><strong>2. Các mảnh từ phân tách bởi dấu gạch chéo <code>/</code> hoặc ngoặc vuông <code>[ ]</code>:</strong></label>
              <input type="text" class="form-control input-raw-tokens" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawTokensStr)}" placeholder="She / has worked / at the company / for five years" />
              <div class="reorder-tokens-hint">
                Ví dụ: <code>She / has worked / at the company / for five years</code> hoặc <code>[We] [have decided] [to postpone]</code>.
              </div>
            </div>

            <!-- Scrambled preview pool -->
            <div class="scrambled-preview-box">
              <div class="scrambled-title-bar">
                <span class="preview-mini-label">Mô phỏng ngân hàng thẻ từ xáo trộn (${tokens.length + distractors.length} thẻ):</span>
                <span class="scramble-refresh-hint">Học viên bấm vào thẻ để ghép câu</span>
              </div>
              <div class="scrambled-tokens-pool">
                ${scrambledPreviewChips || '<em>Chưa có mảnh từ nào...</em>'}
              </div>
            </div>

            <!-- Distractor manager -->
            <div class="distractors-manager-box">
              <label class="form-label"><strong>3. Từ gây nhiễu (Distractor Tokens - Tùy chọn):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-add-distractor" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="Nhập từ gây nhiễu (không có trong câu đúng)..." />
                <button type="button" class="btn btn-secondary btn-sm btn-add-distractor-btn" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  + Thêm từ nhiễu
                </button>
              </div>
              <div class="distractor-chips-wrap">
                ${distractorChipsHtml || '<span>Chưa có từ gây nhiễu.</span>'}
              </div>
            </div>

            <!-- Accepted sentence variants -->
            <div class="variant-chips-container">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể câu được chấp nhận (${acceptedList.length}/20)</span>
                <button type="button" class="btn btn-secondary btn-sm btn-generate-reorder-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm câu biến thể (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isErrorCorrection) {
        const rawErrors = (itemKey.expectedErrors && itemKey.expectedErrors.length)
          ? itemKey.expectedErrors
          : (item.expectedErrors && item.expectedErrors.length)
            ? item.expectedErrors
            : (itemKey.targetWord ? [itemKey.targetWord] : (item.targetWord ? [item.targetWord] : []));
        const expectedErrors = rawErrors.filter(v => v != null && String(v).trim().length > 0);

        const rawCorrections = (itemKey.expectedCorrections && itemKey.expectedCorrections.length)
          ? itemKey.expectedCorrections
          : (itemKey.accepted && itemKey.accepted.length)
            ? itemKey.accepted
            : (item.expectedCorrections && item.expectedCorrections.length)
              ? item.expectedCorrections
              : (item.accepted && item.accepted.length)
                ? item.accepted
                : [];
        const expectedCorrections = rawCorrections.filter(v => v != null && String(v).trim().length > 0);
        const scoringRule = itemKey.scoringRule || item.scoringRule || 'split_points';

        const errorChipsHtml = expectedErrors.map(v => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-error-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const correctionChipsHtml = expectedCorrections.map(v => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-correction-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        specificHtml = `
          <div class="template-section template-error-correction">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cặp dữ liệu tìm lỗi sai và sửa lại:</strong></span>
              <div class="scoring-rule-selector">
                <label class="form-label">Quy tắc chấm điểm:</label>
                <select class="form-select form-select-sm select-scoring-rule" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  <option value="split_points" ${scoringRule === 'split_points' ? 'selected' : ''}>Chia điểm (50% Lỗi sai + 50% Sửa lại)</option>
                  <option value="all_or_nothing" ${scoringRule === 'all_or_nothing' ? 'selected' : ''}>Trọn điểm (Đúng cả 2 mới có điểm)</option>
                </select>
              </div>
            </div>

            <div class="dual-input-grid">
              <!-- Error identification box -->
              <div class="dual-box error-box">
                <label class="form-label"><strong>1. Lỗi sai trong câu (Identified Error):</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-error-token" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(expectedErrors[0] || item.targetWord || '')}" placeholder="Từ / cụm từ sai trong câu..." />
                  <button type="button" class="btn btn-secondary btn-sm btn-generate-error-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động sinh biến thể cho lỗi sai">
                    ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể
                  </button>
                </div>
                <div class="variant-chips-container">
                  <div class="chips-meta-bar">
                    <span class="chips-count-badge">Biến thể lỗi sai (${expectedErrors.length}/20)</span>
                    <input type="text" class="form-control form-control-sm input-add-error-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể lỗi (Enter)..." />
                  </div>
                  <div class="variant-chips-wrap">
                    ${errorChipsHtml}
                  </div>
                </div>
              </div>

              <!-- Correction box -->
              <div class="dual-box correction-box">
                <label class="form-label"><strong>2. Phần sửa lại đúng (Correction):</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-correction-token" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(expectedCorrections[0] || (item.accepted && item.accepted[0]) || '')}" placeholder="Từ / cụm từ sửa đúng..." />
                  <button type="button" class="btn btn-secondary btn-sm btn-generate-correction-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động sinh biến thể cho phần sửa">
                    ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể
                  </button>
                </div>
                <div class="variant-chips-container">
                  <div class="chips-meta-bar">
                    <span class="chips-count-badge">Biến thể sửa đúng (${expectedCorrections.length}/20)</span>
                    <input type="text" class="form-control form-control-sm input-add-correction-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể sửa (Enter)..." />
                  </div>
                  <div class="variant-chips-wrap">
                    ${correctionChipsHtml}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (isReadingMatching) {
        const passageText = block.readingPassage || block.stimulusReadingPassage || item.readingPassage || '';
        const detectedParagraphs = extractParagraphLabels(passageText);
        const expectedId = itemKey.expectedOptionId || item.options?.[0]?.id || '';
        const optionsList = item.options || [];

        const optionsHtml = optionsList.map(opt => `
          <div class="matching-heading-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Chọn làm tiêu đề/đáp án đúng cho câu này">
              <input type="radio" name="radio_matching_correct_${item.itemVersionId}" class="radio-matching-correct" value="${opt.id}" ${opt.id === expectedId ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control form-control-sm matching-heading-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Nội dung Heading / Tiêu đề ${opt.id}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-matching-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án này" aria-label="Xóa phương án này">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-reading-matching">
            <div class="split-pane-header-bar">
              <span class="badge badge-info split-pane-preview-badge">${renderSvgIcon('book', 'icon-inline')} Bố cục chia đôi màn hình (Split-Pane 2 cột: Bài đọc bên trái, Câu hỏi bên phải)</span>
              ${detectedParagraphs.length ? `<span class="badge badge-success">Phát hiện ${detectedParagraphs.length} đoạn văn: [${detectedParagraphs.join(', ')}]</span>` : ''}
            </div>

            <div class="rich-editor rich-html-editor-wrap" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
              <div class="rich-editor__toolbar rich-editor-toolbar">
                <div class="rich-editor__toolbar-left toolbar-group">
                  <button type="button" class="btn btn-secondary btn-sm btn-extract-paragraphs" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động nhận diện các đoạn văn Paragraph A, B, C...">
                    ${renderSvgIcon('search', 'icon-inline')} Quét nhãn đoạn văn
                  </button>
                  <div class="rich-editor__control control-heading-select">
                    <select class="form-select form-select-sm select-format-heading" title="Chọn cấp độ tiêu đề">
                      <option value="p">Đoạn văn (Normal)</option>
                      <option value="h2">Tiêu đề lớn (H2)</option>
                      <option value="h3">Tiêu đề mục (H3)</option>
                      <option value="h4">Tiêu đề nhỏ (H4)</option>
                    </select>
                  </div>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-bold" title="Tô đậm (Bold - Ctrl+B)">
                    ${renderSvgIcon('bold', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-italic" title="In nghiêng (Italic - Ctrl+I)">
                    ${renderSvgIcon('italic', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-underline" title="Gạch chân (Underline - Ctrl+U)">
                    ${renderSvgIcon('underline', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-strike" title="Gạch ngang (Strikethrough)">
                    ${renderSvgIcon('strike', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-ul" title="Danh sách dấu chấm (Bullet List)">
                    ${renderSvgIcon('listUl', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-ol" title="Danh sách số (Numbered List)">
                    ${renderSvgIcon('listOl', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-align-left" title="Căn trái">
                    ${renderSvgIcon('alignLeft', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-center" title="Căn giữa">
                    ${renderSvgIcon('alignCenter', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-right" title="Căn phải">
                    ${renderSvgIcon('alignRight', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-clear" title="Xóa toàn bộ định dạng">
                    ${renderSvgIcon('removeFormat', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <div class="rich-editor__control dropdown-table-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-editor-action btn-rich-insert-table" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn Bảng dữ liệu">
                      ${renderSvgIcon('table', 'icon-inline')} <span>Chèn bảng</span> ${renderSvgIcon('chevronDown', 'icon-inline')}
                    </button>
                    <div class="rich-editor__popup table-presets-menu" style="display: none;">
                      <strong>Tạo bảng nhanh</strong>
                      <div class="rich-editor__table-options">
                        <button type="button" class="btn-table-grid" data-rows="2" data-cols="2">2 cột × 2 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="3" data-cols="3">3 cột × 3 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="4" data-cols="2">2 cột × 4 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="5" data-cols="4">4 cột × 5 dòng</button>
                      </div>
                      <small>Số dòng chưa tính dòng tiêu đề.</small>
                      <div class="rich-editor__presets-section">
                        <small>Mẫu sư phạm IELTS</small>
                        <button type="button" class="btn-table-preset" data-preset="itinerary">Lịch trình chuyến đi (Itinerary)</button>
                        <button type="button" class="btn-table-preset" data-preset="notes">Ghi chú bài nghe (Note Completion)</button>
                        <button type="button" class="btn-table-preset" data-preset="vocabulary">Bảng từ vựng 4 cột (Vocabulary)</button>
                      </div>
                    </div>
                  </div>
                  <div class="rich-editor__control dropdown-image-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-rich-insert-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn ảnh (URL HTTPS hoặc Google Drive)">
                      ${renderSvgIcon('image', 'icon-inline')} <span>Chèn ảnh</span>
                    </button>
                    <div class="rich-editor__popup image-insert-popup" style="display: none;">
                      <label>
                        Link ảnh
                        <input type="url" class="input-image-link" placeholder="https://drive.google.com/file/d/..." />
                      </label>
                      <small>Ảnh Drive cần chia sẻ “Bất kỳ ai có đường liên kết”.</small>
                      <div class="rich-editor__error popup-image-error" style="display: none;"></div>
                      <div class="rich-editor__actions">
                        <button type="button" class="btn-confirm-insert-image">Chèn</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rich-editor__toolbar-right toolbar-group">
                  <button type="button" class="btn btn-sm btn-ghost-subtle btn-toggle-html-mode" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chuyển chế độ [Trực quan ⇄ Mã HTML]">
                    &lt;/&gt; Mã HTML
                  </button>
                </div>
              </div>

              <div class="rich-editor__content-area">
                <div class="rich-editor__content rich-editor-visual" contenteditable="true" spellcheck="false" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">${sanitizeRichContent(passageText)}</div>
                <textarea class="rich-editor__code rich-editor-code form-control input-reading-passage" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="8" style="display: none;" placeholder="Nhập văn bản bài đọc tại đây (Hỗ trợ nhãn Paragraph A:, [B], Section C...)...">${escapeHtml(passageText)}</textarea>
              </div>

              <div class="rich-editor__error general-editor-error" style="display: none;" role="alert"></div>

              <div class="rich-editor__footer">
                Enter để xuống dòng. Shift+Enter để ngắt dòng mềm. Nhấp vào ô bảng để chỉnh sửa.
              </div>
            </div>

            <div class="matching-headings-pool">
              <div class="template-header-bar">
                <span class="section-sublabel"><strong>Danh sách Headings / Tiêu đề lựa chọn (Tích chọn đáp án đúng):</strong></span>
              </div>
              <div class="matching-headings-list">
                ${optionsHtml}
              </div>
              <div class="options-actions">
                <button type="button" class="btn btn-secondary btn-sm btn-add-matching-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  + Thêm Heading mới
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (isListeningOrder) {
        const events = item.events || [
          { label: 'A', rank: 1, text: 'Sự kiện A' },
          { label: 'B', rank: 2, text: 'Sự kiện B' },
          { label: 'C', rank: 3, text: 'Sự kiện C' },
          { label: 'D', rank: 4, text: 'Sự kiện D' },
          { label: 'E', rank: 5, text: 'Sự kiện E' }
        ];
        const audioUrl = item.audioUrl || block.audioUrl || '';
        const orderValidation = validateListeningOrderUniqueness(events);
        const sortedByRank = [...events].sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));

        const eventsHtml = events.map((ev, eIdx) => `
          <div class="listening-event-row" data-event-idx="${eIdx}">
            <div class="event-badge">${escapeHtml(ev.label || String.fromCharCode(65 + eIdx))}</div>
            <input type="text" class="form-control form-control-sm input-event-text" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-event-idx="${eIdx}" value="${escapeHtml(ev.text || '')}" placeholder="Nội dung sự kiện ${ev.label}..." />
            <div class="rank-selector-wrap">
              <label class="rank-label">Vị trí:</label>
              <select class="form-select form-select-sm select-event-rank" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-event-idx="${eIdx}">
                ${Array.from({ length: events.length }, (_, i) => i + 1).map(r => `
                  <option value="${r}" ${Number(ev.rank) === r ? 'selected' : ''}>Thứ ${r}</option>
                `).join('')}
              </select>
            </div>
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-event" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-event-idx="${eIdx}" title="Xóa sự kiện" aria-label="Xóa sự kiện">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `).join('');

        const previewBadges = sortedByRank.map(ev => `
          <div class="timeline-step">
            <span class="step-num">#${ev.rank || '?'}</span>
            <span class="step-card"><strong class="step-label">${ev.label}:</strong> ${escapeHtml(ev.text ? (ev.text.length > 28 ? ev.text.substring(0, 28) + '...' : ev.text) : '---')}</span>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-listening-order">
            <div class="form-group audio-input-group">
              <label class="form-label"><strong>File ghi âm Audio (URL / Path):</strong></label>
              <div class="audio-input-with-preview">
                <input type="text" class="form-control form-control-sm input-listening-audio" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(audioUrl)}" placeholder="assets/34/test-1/listening.mp3 hoặc link Google Drive" />
                <button type="button" class="btn btn-secondary btn-sm btn-preview-audio" data-target="item" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Nghe thử file âm thanh">
                  ${renderSvgIcon('play', 'icon-inline')} Nghe thử
                </button>
              </div>
            </div>

            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Danh sách chuỗi sự kiện & Thứ tự chuẩn:</strong></span>
              <div class="validation-status-wrap">
                ${orderValidation.isValid
                  ? `<span class="badge badge-success">${renderSvgIcon('check', 'icon-inline')} Thứ tự hợp lệ (${events.length} bước)</span>`
                  : `<span class="badge badge-warning">${renderSvgIcon('alert', 'icon-inline')} Trùng hoặc thiếu thứ tự: ${orderValidation.duplicates.length ? `Trùng [#${orderValidation.duplicates.join(', ')}]` : ''} ${orderValidation.missingRanks.length ? `Thiếu [#${orderValidation.missingRanks.join(', ')}]` : ''}</span>`}
              </div>
            </div>

            <div class="listening-events-list">
              ${eventsHtml}
            </div>

            <div class="options-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-add-listening-event" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                + Thêm sự kiện tiếp theo (${String.fromCharCode(65 + events.length)})
              </button>
            </div>

            <div class="timeline-preview-bar">
              <div class="timeline-preview-label">Trình tự mẫu (Chronological Timeline Preview):</div>
              <div class="timeline-steps-container">
                ${previewBadges}
              </div>
            </div>
          </div>
        `;
      } else if (isSingleChoice) {
        const expectedId = itemKey.expectedOptionId || item.options?.[0]?.id || 'A';
        const optionsHtml = (item.options || []).map((opt, optIdx) => {
          const letter = formatOptionDisplayLetter(opt.id, optIdx);
          return `
          <div class="option-item-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Chọn làm đáp án đúng">
              <input type="radio" name="radio_correct_${item.itemVersionId}" class="radio-correct" value="${opt.id}" ${opt.id === expectedId ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${letter}</span>
            </label>
            <input type="text" class="form-control option-label-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Phương án ${letter}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án" aria-label="Xóa phương án">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `;
        }).join('');

        specificHtml = `
          <div class="template-section template-single-choice">
            <div class="template-header-bar">
              <span class="section-sublabel">Các phương án lựa chọn (Tích tròn chọn đáp án đúng):</span>
              <div class="layout-selector-wrap">
                <span class="layout-title">Bố cục:</span>
                <select class="form-select form-select-sm select-layout" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  <option value="grid_1" ${layout === 'grid_1' ? 'selected' : ''}>1 cột (Xếp dọc - Phù hợp câu dài)</option>
                  <option value="grid_2" ${layout === 'grid_2' ? 'selected' : ''}>2 cột (grid_2)</option>
                  <option value="grid_3" ${layout === 'grid_3' ? 'selected' : ''}>3 cột (grid_3)</option>
                  <option value="grid_4" ${layout === 'grid_4' ? 'selected' : ''}>4 cột (grid_4)</option>
                </select>
              </div>
            </div>
            <div class="builder-options-grid ${colsClass}">
              ${optionsHtml}
            </div>
            <div class="options-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-add-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                + Thêm phương án
              </button>
            </div>
          </div>
        `;
      } else if (isMultiGroup) {
        const expectedIds = groupKey.expectedOptionIds || ['A', 'B'];
        const groupIdVal = item.groupId || `group_${blockIdx + 1}`;
        const optionsHtml = (item.options || []).map((opt, optIdx) => {
          const letter = formatOptionDisplayLetter(opt.id, optIdx);
          return `
          <div class="option-item-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Tích chọn đáp án đúng cho nhóm">
              <input type="checkbox" class="checkbox-correct" value="${opt.id}" ${expectedIds.includes(opt.id) ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${letter}</span>
            </label>
            <input type="text" class="form-control option-label-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Phương án ${letter}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án" aria-label="Xóa phương án">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `;
        }).join('');

        specificHtml = `
          <div class="template-section template-multi-group">
            <div class="template-header-bar">
              <div class="group-config-wrap">
                <span class="badge-group-pill">Nhóm unordered_group_slot</span>
                <label class="group-id-label">Mã nhóm:
                  <input type="text" class="form-control form-control-sm input-group-id" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(groupIdVal)}" placeholder="group_1" />
                </label>
              </div>
              <div class="layout-selector-wrap">
                <span class="layout-title">Bố cục:</span>
                <select class="form-select form-select-sm select-layout" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  <option value="grid_1" ${layout === 'grid_1' ? 'selected' : ''}>1 cột (Xếp dọc - Phù hợp câu dài)</option>
                  <option value="grid_2" ${layout === 'grid_2' ? 'selected' : ''}>2 cột (grid_2)</option>
                  <option value="grid_3" ${layout === 'grid_3' ? 'selected' : ''}>3 cột (grid_3)</option>
                  <option value="grid_4" ${layout === 'grid_4' ? 'selected' : ''}>4 cột (grid_4)</option>
                </select>
              </div>
            </div>
            <p class="template-help-text">Chấm độc lập thứ tự (unordered_group_slot): Học viên chọn đúng các phương án được tích bên dưới theo bất kỳ thứ tự nào đều được tính điểm.</p>
            <div class="builder-options-grid ${colsClass}">
              ${optionsHtml}
            </div>
            <div class="options-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-add-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                + Thêm phương án
              </button>
            </div>
          </div>
        `;
      } else if (isInlineCloze) {
        const detectedBlanks = parseClozeBlanks(item.prompt || '');
        const uniqueBlankNums = [];
        for (const b of detectedBlanks) {
          if (!uniqueBlankNums.includes(b.number)) {
            uniqueBlankNums.push(b.number);
          }
        }
        if (!uniqueBlankNums.length) {
          uniqueBlankNums.push(item.position || 1);
        }

        item.clozeAnswers = item.clozeAnswers || {};

        const blanksConfigHtml = uniqueBlankNums.map((bNum, idx) => {
          const bAnswer = item.clozeAnswers[bNum] || item.clozeAnswers[String(bNum)];
          let targetWord = bAnswer?.targetWord || (bAnswer?.accepted?.[0] || '');
          let accepted = bAnswer?.accepted || [];

          if (!targetWord && (uniqueBlankNums.length === 1 || idx === 0 || bNum === item.position)) {
            targetWord = item.targetWord || (itemKey.accepted?.[0] || '');
          }
          if (!accepted.length && (uniqueBlankNums.length === 1 || idx === 0 || bNum === item.position)) {
            accepted = itemKey.accepted || [];
          }

          const filteredAccepted = accepted.filter(v => v && v !== 'answer' && v !== 'draft_placeholder');
          const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
          const blankTargetVal = targetWord || (acceptedList[0] || '');

          const chipsHtml = acceptedList.map((v) => `
            <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
              <span class="chip-text">${escapeHtml(v)}</span>
              <button type="button" class="btn-remove-chip btn-remove-cloze-blank-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
            </span>
          `).join('');

          return `
            <div class="cloze-blank-config-card" data-blank-num="${bNum}">
              <div class="cloze-blank-header">
                <span class="cloze-blank-badge">
                  Chỗ trống (${bNum})
                </span>
              </div>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-fitb-raw input-cloze-blank-target" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" value="${escapeHtml(blankTargetVal)}" placeholder="Nhập đáp án chuẩn cho chỗ trống (${bNum})..." />
                <button type="button" class="btn btn-secondary btn-sm btn-generate-variants btn-generate-cloze-blank-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" title="Tự động sinh biến thể cho chỗ trống (${bNum})">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
              </div>
              <div class="variant-chips-container">
                <div class="chips-meta-bar">
                  <span class="chips-count-badge">Các biến thể được chấp nhận (${acceptedList.length}/40)</span>
                  <div class="quick-add-variant">
                    <input type="text" class="form-control form-control-sm input-add-variant input-add-cloze-blank-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                  </div>
                </div>
                <div class="variant-chips-wrap">
                  ${chipsHtml}
                </div>
              </div>
            </div>
          `;
        }).join('');

        const maxBlankNum = uniqueBlankNums.length ? Math.max(...uniqueBlankNums) : (item.position || 1);
        const nextBlankNum = uniqueBlankNums.length ? maxBlankNum + 1 : (item.position || 1);
        const livePreviewHtml = renderInlineClozeMarkup(item.prompt || '', [item], {}, { disabled: true });

        specificHtml = `
          <div class="template-section template-inline-cloze">
            <div class="cloze-live-preview-box">
              <span class="preview-mini-label">Xem trước hiển thị nội tuyến:</span>
              <div class="cloze-preview-content">${livePreviewHtml || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>'}</div>
            </div>

            <div class="cloze-answers-config">
              <label class="form-label"><strong>Cấu hình đáp án chuẩn cho các chỗ trống (${uniqueBlankNums.length} chỗ trống):</strong></label>
              <div class="cloze-blanks-list">
                ${blanksConfigHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isPictorial) {
        const rawAccepted = itemKey.accepted || [];
        const filteredAccepted = rawAccepted.filter(v => v && v !== 'answer' && v !== 'draft_placeholder' && !/^Từ vựng qua ảnh \d+/i.test(v));
        const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const rawTargetVal = item.targetWord || (acceptedList[0] || '') || (item.prompt && !/^Từ vựng qua ảnh \d+/i.test(item.prompt) ? item.prompt : '');
        const imgSrc = item.image || item.stimulusImageUrl || '';

        specificHtml = `
          <div class="template-section template-pictorial-vocab">
            <div class="pictorial-meta-grid">
              <div class="form-group pictorial-image-group">
                <label class="form-label"><strong>Ảnh minh họa (Image URL / Path / Google Drive Link):</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-pictorial-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(imgSrc)}" placeholder="assets/test 1/vocabulary/image1.png hoặc https://drive.google.com/..." />
                  <button type="button" class="btn btn-secondary btn-sm btn-preview-drive-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Xem trước ảnh hoặc chuyển đổi link Google Drive">
                    ${renderSvgIcon('eye', 'icon-inline')} Xem trước ảnh
                  </button>
                </div>
                <div class="pictorial-preview-wrap pictorial-thumb-preview">
                  <img class="pictorial-preview-img" src="${escapeHtml(imgSrc)}" alt="Image Preview"${imgSrc ? '' : ' style="display: none;"'} onerror="this.style.display='none'; const err = this.parentElement?.querySelector('.pictorial-preview-error'); if (err) err.style.display='inline-block';" onload="const err = this.parentElement?.querySelector('.pictorial-preview-error'); if (err) err.style.display='none'; this.style.display='inline-block';" />
                  <span class="pictorial-preview-error badge badge-warning" style="display: none;">${renderSvgIcon('alert', 'icon-inline')} Không thể tải ảnh. Hãy kiểm tra lại link ảnh hoặc quyền chia sẻ công khai (Anyone with the link).</span>
                </div>
              </div>

              <div class="form-group pictorial-target-group">
                <label class="form-label"><strong>Từ / Cụm từ tiếng Anh chuẩn:</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-pictorial-target input-fitb-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawTargetVal)}" placeholder="Nhập từ/cụm từ mẫu (ví dụ: school kids)..." />
                  <button type="button" class="btn btn-secondary btn-generate-hangman" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động tạo gợi ý Hangman từ từ mục tiêu">
                    ${renderSvgIcon('zap', 'icon-inline')} Sinh gợi ý Hangman
                  </button>
                </div>
              </div>
            </div>

            <div class="pictorial-hints-grid">
              <div class="form-group">
                <label class="form-label"><strong>Gợi ý chữ cái (Letter / Hangman hint):</strong></label>
                <input type="text" class="form-control input-pictorial-letter-hint" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(item.letterHint || '')}" placeholder="s _ _ _ _ _ k _ _ _" />
              </div>
              <div class="form-group">
                <label class="form-label"><strong>Gợi ý nghĩa tiếng Việt (Caption hint):</strong></label>
                <input type="text" class="form-control input-pictorial-caption" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(item.captionHint || '')}" placeholder="(độ tuổi đi học)" />
              </div>
            </div>

            <div class="variant-chips-container">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể được chấp nhận (${acceptedList.length}/40)</span>
                <button type="button" class="btn btn-secondary btn-sm btn-generate-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isShortText) {
        const rawAccepted = itemKey.accepted || [];
        const filteredAccepted = rawAccepted.filter(v => v && v !== 'answer' && v !== 'draft_placeholder');
        const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const rawFitbVal = item.targetWord || (acceptedList[0] || '') || (item.prompt && !/^Câu \d+/i.test(item.prompt) ? item.prompt : '');

        specificHtml = `
          <div class="template-section template-fitb">
            <div class="fitb-raw-box">
              <label class="form-label">Đáp án gốc (Nhập từ/câu mẫu để tự động mở rộng biến thể dấu câu, viết tắt, nháy đơn):</label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-fitb-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawFitbVal)}" placeholder="Nhập đáp án chuẩn..." />
                <button type="button" class="btn btn-secondary btn-generate-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
              </div>
            </div>
            <div class="variant-chips-container">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể được chấp nhận (${acceptedList.length}/40)</span>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isVocabPair) {
        const rawAccepted = itemKey.accepted || [];
        const filteredAccepted = rawAccepted.filter(v => v && !/^Từ vựng câu \d+/i.test(v) && v !== 'answer' && v !== 'draft_placeholder');
        const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const expectedOptId = itemKey.expectedOptionId || item.options?.[0]?.id || 'opt_1';
        const optionsList = item.options && item.options.length ? item.options : [
          { id: 'opt_1', label: 'Nghĩa phương án 1' },
          { id: 'opt_2', label: 'Nghĩa phương án 2' },
          { id: 'opt_3', label: 'Nghĩa phương án 3' },
          { id: 'opt_4', label: 'Nghĩa phương án 4' }
        ];

        const dropdownOptionsHtml = optionsList.map(opt => `
          <option value="${opt.id}" ${opt.id === expectedOptId ? 'selected' : ''}>
            [${opt.id}] ${escapeHtml(opt.label || '(Chưa nhập nghĩa)')}
          </option>
        `).join('');

        const optionsHtml = optionsList.map((opt) => `
          <div class="vocab-meaning-row ${opt.id === expectedOptId ? 'is-correct' : ''}" data-option-id="${opt.id}">
            <label class="option-select-label" title="Chọn làm nghĩa tiếng Việt đúng">
              <input type="radio" name="radio_vocab_correct_${item.itemVersionId}" class="radio-vocab-correct" value="${opt.id}" ${opt.id === expectedOptId ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control vocab-meaning-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Nghĩa tiếng Việt..." />
            <button type="button" class="btn btn-icon btn-sm btn-del-vocab-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa nghĩa này" aria-label="Xóa nghĩa này">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `).join('');

        let hasPrevVocabItem = false;
        for (let p = itemIdx - 1; p >= 0; p--) {
          if (block.items[p] && block.items[p].interactionType === 'text_select_pair') {
            hasPrevVocabItem = true;
            break;
          }
        }
        const totalVocabItemsInBlock = (block.items || []).filter(it => it.interactionType === 'text_select_pair').length;

        const rawVocabVal = item.targetWord || (acceptedList[0] || '') || (item.prompt && !/^Từ vựng câu \d+/i.test(item.prompt) ? item.prompt : '');

        specificHtml = `
          <div class="template-section template-vocab-pair">
            <div class="vocab-english-box">
              <label class="form-label"><strong>1. Từ tiếng Anh chuẩn (50% điểm):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-vocab-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawVocabVal)}" placeholder="Nhập từ tiếng Anh chuẩn..." />
                <button type="button" class="btn btn-secondary btn-generate-vocab-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể tự động
                </button>
              </div>
              <div class="variant-chips-container">
                <div class="chips-meta-bar">
                  <span class="chips-count-badge">Các biến thể tiếng Anh được chấp nhận (${acceptedList.length}/40)</span>
                  <div class="quick-add-variant">
                    <input type="text" class="form-control form-control-sm input-add-vocab-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                  </div>
                </div>
                <div class="variant-chips-wrap">
                  ${chipsHtml}
                </div>
              </div>
            </div>

            <div class="vocab-options-box">
              <div class="template-header-bar vocab-options-header-bar">
                <label class="form-label"><strong>2. Danh sách nghĩa tiếng Việt (50% điểm - Tích tròn nghĩa đúng):</strong></label>
              </div>

              <!-- Compact selector row -->
              <div class="vocab-compact-selector-row">
                <span>Nghĩa đúng câu này:</span>
                <select class="form-select form-select-sm select-vocab-correct-dropdown" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${dropdownOptionsHtml}
                </select>
                <button type="button" class="btn btn-secondary btn-sm btn-toggle-vocab-bank" data-target="vocab-bank-${blockIdx}-${itemIdx}">
                  Ngân hàng nghĩa (${optionsList.length}) ▼
                </button>
              </div>

              <!-- Collapsible Bank Details -->
              <div class="vocab-bank-collapsible" id="vocab-bank-${blockIdx}-${itemIdx}" hidden>
                <div class="vocab-options-tools-bar">
                  <button type="button" class="btn btn-secondary btn-sm btn-bulk-paste-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Dán nhanh nhiều nghĩa từ Excel hoặc Word">
                    ${renderSvgIcon('copy', 'icon-inline')} Dán nhanh danh sách nghĩa
                  </button>
                  ${hasPrevVocabItem ? `
                    <button type="button" class="btn btn-secondary btn-sm btn-copy-prev-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Sao chép toàn bộ danh sách nghĩa từ câu từ vựng liền trước">
                      ${renderSvgIcon('download', 'icon-inline')} Lấy nghĩa từ câu trước
                    </button>
                  ` : ''}
                  ${totalVocabItemsInBlock > 1 ? `
                    <button type="button" class="btn btn-secondary btn-sm btn-sync-vocab-options-to-block" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Áp dụng toàn bộ danh sách nghĩa này cho tất cả câu cặp từ vựng trong phần này">
                      ${renderSvgIcon('refresh', 'icon-inline')} Áp dụng cho cả phần này
                    </button>
                  ` : ''}
                </div>

                <!-- Collapsible Bulk Paste Box -->
                <div class="vocab-bulk-paste-panel" id="vocab-bulk-paste-${blockIdx}-${itemIdx}" hidden>
                  <div class="bulk-paste-caption">
                    <span>Nhập hoặc dán danh sách nghĩa tiếng Việt (Mỗi dòng là một nghĩa):</span>
                  </div>
                  <textarea class="form-control input-bulk-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="4" placeholder="hướng ngoại&#10;môi trường&#10;kiên cường, có khả năng phục hồi&#10;thân thiện, cởi mở"></textarea>
                  <div class="bulk-paste-actions">
                    <button type="button" class="btn btn-primary btn-sm btn-apply-bulk-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                      Áp dụng danh sách nghĩa
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm btn-cancel-bulk-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                      Hủy
                    </button>
                  </div>
                </div>

                <div class="vocab-bank-scrollable">
                  <div class="vocab-meaning-grid">
                    ${optionsHtml}
                  </div>
                </div>
                <div class="options-actions">
                  <button type="button" class="btn btn-secondary btn-sm btn-add-vocab-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                    + Thêm nghĩa tiếng Việt
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (isRubricAsync) {
        const rubricObj = itemKey.rubric || {
          scoringVersion: 'rubric-translation-v1',
          maxScore: item.maxScore || 4,
          criteria: [
            { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: (item.maxScore || 4) / 2, requiredConcepts: [] },
            { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: (item.maxScore || 4) / 2, requiredConcepts: [] }
          ]
        };
        const scoringVer = rubricObj.scoringVersion || 'rubric-translation-v1';
        const criteriaList = rubricObj.criteria || [];
        const criteriaHtml = criteriaList.map((crit, cIdx) => `
          <div class="rubric-criterion-card" data-criterion-idx="${cIdx}">
            <div class="criterion-card-header">
              <div class="criterion-header-left">
                <span class="criterion-id-badge">${escapeHtml(crit.id)}</span>
                <input type="text" class="form-control form-control-sm criterion-label-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" value="${escapeHtml(crit.label || '')}" placeholder="Tên tiêu chí..." />
              </div>
              <div class="criterion-header-right">
                <label class="form-label">Điểm:</label>
                <input type="number" class="form-control form-control-sm criterion-max-score-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" value="${crit.maxScore}" step="0.5" min="0" max="100" />
                <button type="button" class="btn btn-icon btn-sm btn-del-criterion" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" title="Xóa tiêu chí" aria-label="Xóa tiêu chí">${renderSvgIcon('close', 'icon-inline')}</button>
              </div>
            </div>
            <div class="criterion-card-body">
              <label class="form-label">Từ khóa / khái niệm bắt buộc (Phân tách bởi dấu phẩy):</label>
              <input type="text" class="form-control form-control-sm criterion-concepts-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" value="${escapeHtml((crit.requiredConcepts || []).join(', '))}" placeholder="keyword1, phrase2..." />
            </div>
          </div>
        `).join('');

        const promptGuidance = rubricObj.promptGuidance || '';

        const parentEx = block?.exercises?.find(e => e.exerciseId === item.exerciseId);
        const hasExContext = Boolean(parentEx && parentEx.referenceContext && parentEx.referenceContext.trim());
        const hasItemCustomContext = Boolean(item.referenceContext && item.referenceContext.trim());
        const isComprehension = scoringVer.includes('comprehension') || item.rubricCode === 'rubric_comprehension_v1';
        const showItemContextInitially = hasItemCustomContext || (!hasExContext && isComprehension);

        specificHtml = `
          <div class="template-section template-rubric-async">
            ${hasExContext ? `
              <div class="ai-inherited-context-notice">
                <span>✓ <strong>Đã kế thừa ngữ cảnh chung từ Bài tập</strong> (${escapeHtml(parentEx.title || 'Exercise')}).</span>

              </div>
            ` : ''}

            <div class="ai-reference-context-group" id="ai-ref-group-${blockIdx}-${itemIdx}" style="display: ${showItemContextInitially ? 'block' : 'none'};">
              <div class="ai-reference-context-header">
                <label class="form-label">
                  ${renderSvgIcon('book', 'icon-inline')} Ngữ cảnh bài đọc / Script tham chiếu cho AI:
                </label>
                <button type="button" class="btn btn-secondary btn-sm btn-pull-cloze-script" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động lấy đoạn văn từ bài Điền từ nội tuyến hoặc bài nghe phía trước">
                  ${renderSvgIcon('clipboard', 'icon-inline')} Lấy Script từ bài Điền từ phía trước
                </button>
              </div>
              <textarea class="form-control form-control-sm item-reference-context-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="3" placeholder="Dán đoạn văn bài đọc hoặc Script bài nghe để AI hiểu ngữ cảnh (ví dụ: dòng thứ mấy, đại từ 'its' thay thế cho từ nào...). Ẩn hoàn toàn với học viên.">${escapeHtml(item.referenceContext || '')}</textarea>
              <div class="form-hint">
                ${renderSvgIcon('lock', 'icon-inline')} <strong>Ẩn hoàn toàn với học viên:</strong> Văn bản này chỉ gửi ngầm kèm theo cho AI Gateway làm căn cứ đối chiếu khi chấm; giao diện thí sinh chỉ hiển thị câu hỏi và ô trả lời.
              </div>
            </div>

            <div class="rubric-preset-selector">
              <span class="preset-title">Mẫu Rubric gợi ý (Preset):</span>
              <select class="form-select form-select-sm select-rubric-preset" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                <option value="translation" ${scoringVer.includes('translation') ? 'selected' : ''}>Dịch thuật (Translation - 50% Meaning, 50% Grammar)</option>
                <option value="comprehension" ${scoringVer.includes('comprehension') ? 'selected' : ''}>Đọc hiểu Khối 03 (70% Comprehension, 30% Keywords)</option>
                <option value="speaking" ${scoringVer.includes('speaking') ? 'selected' : ''}>Speaking dạng văn bản (40% Ý tưởng, 30% Từ vựng, 30% Ngữ pháp)</option>
              </select>
            </div>

            <div class="rubric-tabs-container">
              <div class="rubric-tabs-header">
                <button type="button" class="btn-rubric-tab active" data-tab="criteria" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('clipboard', 'icon-inline')} Tiêu chí chấm điểm (${criteriaList.length})
                </button>
                <button type="button" class="btn-rubric-tab" data-tab="guidance" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('book', 'icon-inline')} Hướng dẫn Prompt nâng cao
                </button>
                <button type="button" class="btn-rubric-tab" data-tab="sandbox" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('view', 'icon-inline')} Sandbox Chấm thử AI
                </button>
              </div>

              <div class="rubric-tab-content">
                <div class="rubric-tab-pane pane-criteria" id="pane-criteria-${blockIdx}-${itemIdx}">
                  <div class="rubric-criteria-list">
                    ${criteriaHtml}
                  </div>
                  <div class="criteria-actions">
                    <button type="button" class="btn btn-secondary btn-sm btn-add-criterion" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                      + Thêm tiêu chí (Criterion)
                    </button>
                  </div>
                </div>

                <div class="rubric-tab-pane pane-guidance" id="pane-guidance-${blockIdx}-${itemIdx}" style="display: none;">
                  <label class="form-label">Chỉ dẫn nâng cao dành cho AI Grader (Custom Prompt Instructions):</label>
                  <textarea class="form-control input-rubric-guidance" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="4" placeholder="Ví dụ: Chấp nhận các cách diễn đạt đồng nghĩa cho từ 'thành công'; trừ điểm nếu thiếu liên từ nối...">${escapeHtml(promptGuidance)}</textarea>
                </div>

                <div class="rubric-tab-pane pane-sandbox" id="pane-sandbox-${blockIdx}-${itemIdx}" style="display: none;">
                  <div class="rubric-sandbox-panel">
                    <p class="sandbox-desc">Nhập câu trả lời mẫu của học sinh để chạy thử nghiệm bộ chấm qua AI Gateway ngay lập tức (không lưu bài thi):</p>
                    <div class="sandbox-input-group">
                      <textarea class="form-control input-sandbox-sample" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="3" placeholder="Nhập câu trả lời mẫu của học viên để chấm thử..."></textarea>
                      <button type="button" class="btn btn-primary btn-sm btn-trigger-sandbox" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                        ${renderSvgIcon('zap', 'icon-inline')} Chấm thử AI
                      </button>
                    </div>
                    <div class="sandbox-results-container" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" style="display: none;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      const typeLabel = isPronunciation
        ? 'Phát âm (Pronunciation)'
        : (isSentenceRewrite
          ? 'Biến đổi câu (Transformation)'
          : (isSentenceReorder
            ? 'Sắp xếp câu (Sentence Reorder)'
            : (isErrorCorrection
              ? 'Tìm và sửa lỗi (Error Correction)'
              : (isReadingMatching
                ? 'Ghép nối (Reading Matching)'
                : (isListeningOrder
                  ? 'Sắp xếp thứ tự nghe (Listening Order)'
                  : (isSingleChoice
                    ? 'Trắc nghiệm 1 đáp án (Single Choice)'
                    : (isMultiGroup
                      ? 'Nhóm chọn nhiều (Multi-Select Group)'
                      : (isVocabPair
                        ? 'Cặp từ vựng (Vocabulary Pair - 50/50 Partial)'
                        : (isRubricAsync
                          ? 'Tự luận chấm AI (AI-Graded Rubric)'
                          : (isPictorial
                            ? 'Thẻ từ vựng qua ảnh (Pictorial Card)'
                            : (isInlineCloze
                              ? 'Điền từ nội tuyến (Inline Cloze)'
                              : 'Điền ô trống (Short Text)')))))))))));

      const kindClass = isListeningOrder
        ? 'listening_order'
        : (isReadingMatching
          ? 'reading_matching'
          : (isPictorial
            ? 'pictorial_vocabulary'
            : (isInlineCloze
              ? 'inline_cloze'
              : item.interactionType)));

      const spanCount = getItemSpanCount(item);
      item.spanCount = spanCount;
      let itemPosLabel = `Câu ${item.position}`;
      if (spanCount > 1) {
        const endPos = item.position + spanCount - 1;
        if (isListeningOrder) {
          itemPosLabel = `Câu ${item.position} – ${endPos} (${spanCount} bước sự kiện)`;
        } else if (isInlineCloze) {
          itemPosLabel = `Câu ${item.position} – ${endPos} (${spanCount} chỗ trống)`;
        } else {
          itemPosLabel = `Câu ${item.position} – ${endPos} (${spanCount} câu)`;
        }
      }

      const itemDisplayScore = isListeningOrder
        ? ((!item.maxScore || item.maxScore === 1) && item.events?.length ? item.events.length : (item.maxScore || 1))
        : (isInlineCloze
            ? ((!item.maxScore || item.maxScore === 1) && spanCount > 1 ? spanCount : (item.maxScore || 1))
            : (item.maxScore || 1));

      const itemCardKey = item.itemVersionId || `item-${blockIdx}-${itemIdx}`;
      const isItemCollapsed = collapsedCardKeys.has(itemCardKey);

      return `
        <div class="builder-item-card${isItemCollapsed ? ' is-collapsed' : ''}" draggable="false" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-item-id="${item.itemVersionId}" data-exercise-id="${item.exerciseId || ''}">
          <div class="builder-item-header">
            <div class="item-title-info">
              <span class="drag-handle item-drag-handle" title="Kéo thả để sắp xếp câu hỏi" aria-label="Kéo thả sắp xếp">⋮⋮</span>
              <button type="button" class="btn btn-icon btn-sm btn-toggle-item-collapse" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Thu gọn / Mở rộng câu hỏi" aria-label="Thu gọn hoặc mở rộng câu hỏi" aria-expanded="${isItemCollapsed ? 'false' : 'true'}">${isItemCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline')}</button>
              <span class="item-pos-pill${spanCount > 1 ? ' has-span' : ''}">${itemPosLabel}</span>
              <span class="item-kind-pill ${kindClass}">${typeLabel}</span>
              <span class="item-prompt-preview-snippet">${escapeHtml((item.prompt || '').trim().substring(0, 55) + ((item.prompt || '').length > 55 ? '...' : ''))}</span>
            </div>
            <div class="item-header-controls">
              <button type="button" class="btn btn-icon btn-sm btn-move-item-up" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" ${itemIdx === 0 ? 'disabled' : ''} title="Di chuyển câu hỏi lên" aria-label="Di chuyển câu hỏi lên">${renderSvgIcon('arrowUp', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-item-down" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" ${itemIdx === (block.items || []).length - 1 ? 'disabled' : ''} title="Di chuyển câu hỏi xuống" aria-label="Di chuyển câu hỏi xuống">${renderSvgIcon('arrowDown', 'icon-inline')}</button>
              <label class="item-score-label">Điểm:
                <input type="number" class="form-control form-control-sm item-max-score-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${itemDisplayScore}" min="0" max="100" />
              </label>
              <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-delete-item" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Xóa câu hỏi này" aria-label="Xóa câu hỏi này">${renderSvgIcon('close', 'icon-inline')}</button>
            </div>
          </div>
          <div class="builder-item-body">
            ${!hasRedundantPrompt ? (isInlineCloze ? `
            <div class="rich-editor rich-html-editor-wrap item-prompt-group" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
              <div class="rich-editor__toolbar rich-editor-toolbar">
                <div class="rich-editor__toolbar-left toolbar-group">
                  <!-- Heading Dropdown -->
                  <div class="rich-editor__control control-heading-select">
                    <select class="form-select form-select-sm select-format-heading" title="Chọn cấp độ tiêu đề">
                      <option value="p">Đoạn văn (Normal)</option>
                      <option value="h2">Tiêu đề lớn (H2)</option>
                      <option value="h3">Tiêu đề mục (H3)</option>
                      <option value="h4">Tiêu đề nhỏ (H4)</option>
                    </select>
                  </div>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Inline Formatting Actions -->
                  <button type="button" class="btn-editor-action btn-format-bold" title="Tô đậm (Bold - Ctrl+B)">
                    ${renderSvgIcon('bold', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-italic" title="In nghiêng (Italic - Ctrl+I)">
                    ${renderSvgIcon('italic', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-underline" title="Gạch chân (Underline - Ctrl+U)">
                    ${renderSvgIcon('underline', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-strike" title="Gạch ngang (Strikethrough)">
                    ${renderSvgIcon('strike', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Lists -->
                  <button type="button" class="btn-editor-action btn-format-ul" title="Danh sách dấu chấm (Bullet List)">
                    ${renderSvgIcon('listUl', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-ol" title="Danh sách số (Numbered List)">
                    ${renderSvgIcon('listOl', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Alignment -->
                  <button type="button" class="btn-editor-action btn-format-align-left" title="Căn trái">
                    ${renderSvgIcon('alignLeft', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-center" title="Căn giữa">
                    ${renderSvgIcon('alignCenter', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-right" title="Căn phải">
                    ${renderSvgIcon('alignRight', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Clear Formatting -->
                  <button type="button" class="btn-editor-action btn-format-clear" title="Xóa toàn bộ định dạng">
                    ${renderSvgIcon('removeFormat', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <div class="rich-editor__control dropdown-table-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-editor-action btn-rich-insert-table" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn Bảng dữ liệu">
                      ${renderSvgIcon('table', 'icon-inline')} <span>Chèn bảng</span> ${renderSvgIcon('chevronDown', 'icon-inline')}
                    </button>
                    <div class="rich-editor__popup table-presets-menu" style="display: none;">
                      <strong>Tạo bảng nhanh</strong>
                      <div class="rich-editor__table-options">
                        <button type="button" class="btn-table-grid" data-rows="2" data-cols="2">2 cột × 2 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="3" data-cols="3">3 cột × 3 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="4" data-cols="2">2 cột × 4 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="5" data-cols="4">4 cột × 5 dòng</button>
                      </div>
                      <small>Số dòng chưa tính dòng tiêu đề.</small>
                      <div class="rich-editor__presets-section">
                        <small>Mẫu sư phạm IELTS</small>
                        <button type="button" class="btn-table-preset" data-preset="itinerary">Lịch trình chuyến đi (Itinerary)</button>
                        <button type="button" class="btn-table-preset" data-preset="notes">Ghi chú bài nghe (Note Completion)</button>
                        <button type="button" class="btn-table-preset" data-preset="vocabulary">Bảng từ vựng 4 cột (Vocabulary)</button>
                      </div>
                    </div>
                  </div>

                  <div class="rich-editor__control dropdown-image-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-rich-insert-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn ảnh (URL HTTPS hoặc Google Drive)">
                      ${renderSvgIcon('image', 'icon-inline')} <span>Chèn ảnh</span>
                    </button>
                    <div class="rich-editor__popup image-insert-popup" style="display: none;">
                      <label>
                        Link ảnh
                        <input type="url" class="input-image-link" placeholder="https://drive.google.com/file/d/..." />
                      </label>
                      <small>Ảnh Drive cần chia sẻ “Bất kỳ ai có đường liên kết”.</small>
                      <div class="rich-editor__error popup-image-error" style="display: none;"></div>
                      <div class="rich-editor__actions">
                        <button type="button" class="btn-confirm-insert-image">Chèn</button>
                      </div>
                    </div>
                  </div>

                  <button type="button" class="btn btn-secondary btn-sm btn-insert-blank-token" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-next-num="${nextBlankNum}" title="Chèn chỗ trống (${nextBlankNum}) __________">
                    + Chèn chỗ trống (${nextBlankNum}) __________
                  </button>
                </div>

                <div class="rich-editor__toolbar-right toolbar-group">
                  <span class="prompt-char-count">${(item.prompt || '').length} ký tự</span>
                  <button type="button" class="btn btn-sm btn-ghost-subtle btn-toggle-html-mode" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chuyển chế độ [Trực quan ⇄ Mã HTML]">
                    &lt;/&gt; Mã HTML
                  </button>
                </div>
              </div>

              <div class="rich-editor__content-area">
                <div class="rich-editor__content rich-editor-visual" contenteditable="true" spellcheck="false" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">${sanitizeRichContent(item.prompt || '')}</div>
                <textarea class="rich-editor__code rich-editor-code form-control item-prompt-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="4" style="display: none;" placeholder="Nhập đề bài hoặc đoạn văn chứa token (1) __________...">${escapeHtml(item.prompt || '')}</textarea>
              </div>

              <div class="rich-editor__error general-editor-error" style="display: none;" role="alert"></div>

              <div class="rich-editor__footer">
                Enter để xuống dòng. Shift+Enter để ngắt dòng mềm. Nhấp vào ô bảng để chỉnh sửa.
              </div>
            </div>
            ` : `
            <div class="form-group item-prompt-group">
              <div class="item-prompt-header-bar">
                <label class="form-label">${isErrorCorrection ? 'Câu văn gốc chứa lỗi sai (Original Sentence with Error):' : 'Đề bài / Nội dung câu hỏi (Question Prompt):'}</label>
                <span class="prompt-char-count">${(item.prompt || '').length} ký tự</span>
              </div>
              <textarea class="form-control item-prompt-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="${isErrorCorrection ? 3 : 4}" placeholder="${isErrorCorrection ? 'Nhập câu văn chứa lỗi sai (ví dụ: There are much people in the classroom.)...' : 'Nhập đề bài, trích đoạn hoặc yêu cầu của câu hỏi...'}">${escapeHtml(item.prompt || '')}</textarea>
            </div>
            `) : ''}
            ${specificHtml}
          </div>
        </div>
      `;
  }
  return renderItemCard;
}
