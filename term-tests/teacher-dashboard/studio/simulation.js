import {
  trackBuilderModal,
  releaseBuilderModal,
  registerBuilderModalCleanup
} from '../navigation/unsaved-changes.js';
import { initSimulationPronunciationAudio } from './simulation-pronunciation-audio.js';
import {
  escapeHtml
} from '../ui/presentation.js';
import {
  sanitizeRichContent,
  renderInlineClozeMarkup
} from '../ui/rich-content.js';
import {
  formatIpaTranscription,
  formatOptionDisplayLetter,
  tokenizeSentence,
  scrambleTokens,
  isShortQaEligibleFor2Col,
  scoreTransformationAnswer
} from './question-content.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  renderStrictCandidateAudioDock,
  initStrictCandidateAudioDocks
} from './media.js';
import {
  getItemSpanCount,
  parseClozeBlanks
} from './draft-model.js';

export function createSimulation({ draftState, builderOwner, syncInputs }) {
function openCandidateSimulationModal() {
      syncInputs();
      let modal = document.querySelector('#candidate-simulation-modal');
      if (modal) releaseBuilderModal(modal);
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'candidate-simulation-modal';
        modal.className = 'candidate-simulation-overlay';
        document.body.appendChild(modal);
      }
      trackBuilderModal(modal, builderOwner);

      const blocks = draftState.blocks || [];
      const sectionsNavHtml = blocks.map((b, i) => `
        <button type="button" class="simulation-nav-pill ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
          Phần ${i + 1}: ${escapeHtml(b.title || `Phần ${i + 1}`)}
        </button>
      `).join('');

      const simulationBlocksHtml = blocks.map((b, bIdx) => {
        const audioUrl = b.audioUrl || b.stimulusAudioUrl || '';
        const reading = b.readingPassage || b.stimulusReadingPassage || '';
        const items = b.items || [];
        const exercises = (b.exercises && b.exercises.length > 0) ? b.exercises : [
          {
            exerciseId: b.blockId,
            exerciseNumber: 1,
            title: b.title || `Phần ${bIdx + 1}`,
            instructions: b.instructions || '',
            audioUrl,
            readingPassage: reading,
            itemIds: items.map(it => it.itemVersionId)
          }
        ];

        const formatSimulationPrompt = (promptText) => {
          if (!promptText || typeof promptText !== 'string') return '';
          const containsHtml = /<[a-z][\s\S]*>/i.test(promptText);
          if (containsHtml) {
            return sanitizeRichContent(promptText);
          }
          return escapeHtml(promptText).replace(/\n/g, '<br/>');
        };

        const renderSimQuestionCard = (item) => {
          const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
          const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') && !isPronunciation;
          const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
          const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || b.layoutType === 'split_pane_matching') && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isSingleChoice = item.interactionType === 'single_choice' && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isMultiGroup = item.interactionType === 'multi_choice_group' && item.graderType === 'unordered_group_slot';
          const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isInlineCloze = item.interactionType === 'short_text' && item.layoutType === 'inline_cloze' && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isShortText = item.interactionType === 'short_text' && item.graderType !== 'rubric_async' && !isInlineCloze && !isPictorial && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isVocabPair = item.interactionType === 'text_select_pair';
          const isRubricAsync = item.graderType === 'rubric_async';

          const hasLongOption = (item.options || []).some(o => (o.label || '').length > 25);
          const layout = item.layoutType || (hasLongOption ? 'grid_1' : (item.options?.length === 3 ? 'grid_3' : (item.options?.length >= 4 ? 'grid_4' : 'grid_2')));
          const colsClass = layout === 'grid_1' ? 'grid-cols-1' : (layout === 'grid_3' ? 'grid-cols-3' : (layout === 'grid_4' ? 'grid-cols-4' : 'grid-cols-2'));

          let interactiveHtml = '';
          if (isPronunciation) {
            const formattedIpa = formatIpaTranscription(item.ipaTranscription || '');
            const audioSrc = item.audioUrl || '';
            interactiveHtml = `
              <div class="candidate-pronunciation-wrap" data-item-id="${item.itemVersionId}">
                <div class="candidate-ipa-display-dock">
                  <div class="candidate-ipa-badge">${escapeHtml(formattedIpa || '/.../')}</div>
                  ${audioSrc ? `
                    <button type="button" class="btn btn-sm btn-secondary candidate-ipa-audio-btn" data-audio-src="${escapeHtml(audioSrc)}" title="Nghe phát âm mẫu" aria-pressed="false">
                      ${renderSvgIcon('audio', 'icon-inline')} <span class="ipa-audio-button-label">Nghe phát âm</span>
                    </button>
                    <span class="candidate-ipa-audio-status" role="status" hidden></span>
                    <audio src="${escapeHtml(audioSrc)}" class="ipa-inline-audio"></audio>
                  ` : ''}
                </div>

                <div class="candidate-pron-options-grid ${colsClass}">
                  ${(item.options || []).map((opt, optIdx) => `
                    <label class="candidate-choice-label candidate-pron-option-label">
                      <input type="radio" name="sim_pron_${item.itemVersionId}" value="${opt.id}" />
                      <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
                      <span class="choice-text choice-ipa-text">${escapeHtml(opt.label || '')}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `;
          } else if (isSentenceRewrite) {
            const kw = (item.keyword || '').toUpperCase();
            interactiveHtml = `
              <div class="candidate-transformation-wrap" data-item-id="${item.itemVersionId}">
                <div class="transformation-keyword-row">
                  <span class="keyword-label">Từ khóa bắt buộc:</span>
                  <span class="keyword-badge-pill">${escapeHtml(kw)}</span>
                </div>
                <div class="candidate-frame-box">
                  <span class="frame-prefix-text">${escapeHtml(item.framePrefix || '')}</span>
                  <input type="text" class="form-control candidate-transformation-input" data-item-id="${item.itemVersionId}" placeholder="Nhập cụm từ khuyết..." />
                  <span class="frame-suffix-text">${escapeHtml(item.frameSuffix || '')}</span>
                </div>
              </div>
            `;
          } else if (isReadingMatching) {
            interactiveHtml = `
              <div class="candidate-matching-wrap">
                <label class="form-label" style="font-size:0.8rem;color:#64748b;margin-bottom:4px;">Chọn Heading / Tiêu đề phù hợp:</label>
                <select class="form-select form-select-sm matching-select candidate-choice-select" data-item-id="${item.itemVersionId}">
                  <option value="">-- Chọn Heading tương ứng --</option>
                  ${(item.options || []).map(opt => `
                    <option value="${escapeHtml(opt.id)}">${escapeHtml(opt.label || opt.id)}</option>
                  `).join('')}
                </select>
              </div>
            `;
          } else if (isListeningOrder) {
            const events = item.events || [];
            const audioSrc = item.audioUrl || audioUrl || '';
            interactiveHtml = `
              <div class="candidate-listening-order-wrap">
                ${audioSrc ? `
                  <div class="candidate-audio-dock">
                    ${renderStrictCandidateAudioDock(null, { audioUrl: audioSrc, label: 'Đoạn ghi âm câu hỏi' })}
                  </div>
                ` : ''}

                <div class="candidate-events-pool">
                  <div class="events-pool-title">Các câu / sự kiện cần sắp xếp:</div>
                  <div class="events-pool-grid">
                    ${events.map(ev => `
                      <div class="event-pool-card" data-event-label="${escapeHtml(ev.label)}">
                        <span class="event-pool-badge">${escapeHtml(ev.label)}</span>
                        <span class="event-pool-text">${escapeHtml(ev.text || '')}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <div class="candidate-timeline-slots">
                  <div class="timeline-slots-title">Trình tự diễn ra theo thời gian:</div>
                  <div class="timeline-slots-grid">
                    ${events.map((_, idx) => `
                      <div class="timeline-slot-card" data-slot-index="${idx + 1}" data-position="${item.position + idx}" data-item-id="${item.itemVersionId}">
                        <div class="slot-badge">Câu ${item.position + idx} · Thứ ${idx + 1}</div>
                        <select class="form-select form-select-sm candidate-sequence-select" data-slot="${idx + 1}" data-position="${item.position + idx}" data-item-id="${item.itemVersionId}">
                          <option value="">-- Chọn sự kiện --</option>
                          ${events.map(ev => `
                            <option value="${escapeHtml(ev.label)}">${escapeHtml(ev.label)}: ${escapeHtml(ev.text ? (ev.text.length > 30 ? ev.text.substring(0, 30) + '...' : ev.text) : '')}</option>
                          `).join('')}
                        </select>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          } else if (isSingleChoice) {
            interactiveHtml = `
              <div class="candidate-options-grid ${colsClass}">
                ${(item.options || []).map((opt, optIdx) => `
                  <label class="candidate-choice-label">
                    <input type="radio" name="sim_choice_${item.itemVersionId}" value="${opt.id}" />
                    <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
                    <span class="choice-text">${escapeHtml(opt.label || '')}</span>
                  </label>
                `).join('')}
              </div>
            `;
          } else if (isMultiGroup) {
            interactiveHtml = `
              <div class="candidate-options-grid ${colsClass}">
                ${(item.options || []).map((opt, optIdx) => `
                  <label class="candidate-choice-label">
                    <input type="checkbox" name="sim_multi_${item.itemVersionId}" value="${opt.id}" />
                    <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
                    <span class="choice-text">${escapeHtml(opt.label || '')}</span>
                  </label>
                `).join('')}
              </div>
            `;
          } else if (isPictorial) {
            const imgSrc = item.image || item.stimulusImageUrl || '';
            interactiveHtml = `
              <div class="candidate-pictorial-card">
                ${imgSrc ? `
                  <div class="candidate-pictorial-thumb">
                    <img src="${escapeHtml(imgSrc)}" alt="Câu ${item.position}" onerror="this.parentElement.style.display='none'" />
                  </div>
                ` : ''}
                <div class="candidate-pictorial-hints">
                  ${item.letterHint ? `<div class="pictorial-letter-hint">${escapeHtml(item.letterHint)}</div>` : ''}
                  ${item.captionHint ? `<div class="pictorial-caption-hint">${escapeHtml(item.captionHint)}</div>` : ''}
                </div>
                <div class="candidate-pictorial-input-wrap">
                  <input type="text" class="form-control candidate-pictorial-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ hoàn chỉnh..." />
                </div>
              </div>
            `;
          } else if (isInlineCloze) {
            interactiveHtml = `<div class="candidate-inline-cloze-wrap">${renderInlineClozeMarkup(item.prompt || '', [item])}</div>`;
          } else if (isSentenceReorder) {
            const tokens = item.tokens || tokenizeSentence(item.targetSentence || '');
            const distractors = item.distractors || [];
            const allChips = scrambleTokens([...tokens, ...distractors]);
            interactiveHtml = `
              <div class="candidate-sentence-reorder-wrap" data-item-id="${item.itemVersionId}">
                <div class="candidate-token-bank-header">
                  <span class="token-bank-label">Ngân hàng từ / Cụm từ (Bấm vào thẻ để ghép câu):</span>
                </div>
                <div class="candidate-token-bank" data-item-id="${item.itemVersionId}">
                  ${allChips.map((tok, idx) => `
                    <button type="button" class="btn-token-chip" data-token="${escapeHtml(tok)}" data-token-id="t-${idx}">
                      ${escapeHtml(tok)}
                    </button>
                  `).join('')}
                </div>

                <div class="candidate-assembly-area" style="margin-top: 12px;">
                  <label class="form-label" style="font-size:0.8rem; font-weight:600; color:#334155;">Câu bạn ghép được (Có thể bấm thẻ phía trên hoặc gõ trực tiếp):</label>
                  <div class="assembly-input-wrap">
                    <input type="text" class="form-control candidate-reorder-input" data-item-id="${item.itemVersionId}" placeholder="Bấm các thẻ từ ở trên hoặc gõ câu hoàn chỉnh vào đây..." />
                    <button type="button" class="btn btn-secondary btn-sm btn-clear-assembly" data-item-id="${item.itemVersionId}" title="Xóa và ghép lại từ đầu">
                      ${renderSvgIcon('rotate', 'icon-inline')} <span>Ghép lại</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
          } else if (isErrorCorrection) {
            interactiveHtml = `
              <div class="candidate-error-correction-grid">
                <div class="candidate-dual-box candidate-error-box">
                  <label class="form-label" style="font-size:0.8rem;font-weight:600;color:#b91c1c;">1. Lỗi sai trong câu (Error):</label>
                  <input type="text" class="form-control candidate-error-input" data-item-id="${item.itemVersionId}" placeholder="Từ/cụm từ sai..." />
                </div>
                <div class="candidate-dual-box candidate-correction-box">
                  <label class="form-label" style="font-size:0.8rem;font-weight:600;color:#15803d;">2. Sửa lại thành (Correction):</label>
                  <input type="text" class="form-control candidate-correction-input" data-item-id="${item.itemVersionId}" placeholder="Từ/cụm từ sửa đúng..." />
                </div>
              </div>
            `;
          } else if (isShortText) {
            interactiveHtml = `
              <div class="candidate-short-wrap">
                <input type="text" class="form-control candidate-short-input" data-item-id="${item.itemVersionId}" placeholder="Gõ câu trả lời của bạn..." />
              </div>
            `;
          } else if (isVocabPair) {
            interactiveHtml = `
              <div class="candidate-vocab-pair-row">
                <div class="candidate-vocab-input-col">
                  <label class="candidate-field-label">1. Từ tiếng Anh nghe được (50% điểm):</label>
                  <input type="text" class="form-control candidate-vocab-text-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ tiếng Anh nghe được..." />
                </div>
                <div class="candidate-vocab-select-col">
                  <label class="candidate-field-label">2. Nghĩa tiếng Việt tương ứng (50% điểm):</label>
                  <select class="form-select candidate-vocab-select" data-item-id="${item.itemVersionId}">
                    <option value="">-- Chọn nghĩa tiếng Việt tương ứng --</option>
                    ${(item.options || []).map(opt => `
                      <option value="${opt.id}">${escapeHtml(opt.label || '')}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `;
          } else if (isRubricAsync) {
            interactiveHtml = `
              <div class="candidate-open-wrap">
                <textarea class="form-control candidate-open-textarea" data-item-id="${item.itemVersionId}" rows="4" placeholder="Nhập bài luận hoặc câu trả lời tại đây..."></textarea>
                <div class="candidate-open-meta">
                  <span class="word-count-badge">Số từ: <strong>0</strong> từ</span>
                  <span class="scoring-info-badge">Điểm tối đa: ${item.maxScore || 4} điểm</span>
                </div>
              </div>
            `;
          }

          const formatSimulationPrompt = (promptText) => {
            if (!promptText || typeof promptText !== 'string') return '';
            const containsHtml = /<[a-z][\s\S]*>/i.test(promptText);
            if (containsHtml) {
              return sanitizeRichContent(promptText);
            }
            return escapeHtml(promptText).replace(/\n/g, '<br/>');
          };

          const promptDisplay = isPronunciation
            ? `${formatSimulationPrompt(item.prompt || `Chọn phiên âm / trọng âm đúng cho "${item.targetWord || 'từ'}"`)}`
            : (isSentenceRewrite
              ? `Hoàn thành câu thứ hai sao cho có nghĩa tương đương với câu gốc, sử dụng từ in hoa đã cho:<br/><blockquote class="transformation-prompt-quote">“${formatSimulationPrompt(item.prompt || '')}”</blockquote>`
              : (isSentenceReorder
                ? `Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:${item.prompt && item.prompt !== 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:' ? `<br/><blockquote class="reorder-prompt-quote">${formatSimulationPrompt(item.prompt)}</blockquote>` : ''}`
                : (isErrorCorrection
                  ? `Tìm lỗi sai trong câu sau và sửa lại cho đúng:<br/><blockquote class="correction-prompt-quote">“${formatSimulationPrompt(item.prompt || '')}”</blockquote>`
                  : (isReadingMatching
                    ? `Nối đoạn văn với tiêu đề phù hợp: <strong>${formatSimulationPrompt(item.prompt || 'Paragraph')}</strong>`
                    : (isListeningOrder
                      ? 'Nghe đoạn ghi âm và sắp xếp các sự kiện sau theo đúng thứ tự thời gian:'
                      : (isVocabPair
                        ? 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:'
                        : (isInlineCloze
                          ? (item.instructions || item.instruction || b?.instructions || 'Điền từ thích hợp vào chỗ trống trong đoạn văn hoặc bảng:')
                          : (isPictorial
                            ? 'Nhìn hình và hoàn thành từ vựng:'
                            : formatSimulationPrompt(item.prompt || '')))))))));

          if (isVocabPair) {
            return renderSimVocabPairTable([item]);
          }

          return `
            <div class="candidate-question-card ${isPictorial ? 'card-pictorial' : ''}" data-item-id="${item.itemVersionId}">
              <div class="candidate-question-header">
                <span class="question-num-badge qnum">Câu ${item.position}</span>
                <span class="question-type-badge">${isPronunciation ? 'Phát âm' : (isSentenceRewrite ? 'Biến đổi câu' : (isSentenceReorder ? 'Sắp xếp câu' : (isErrorCorrection ? 'Tìm và sửa lỗi' : (isReadingMatching ? 'Ghép nối (Matching)' : (isListeningOrder ? 'Sắp xếp thứ tự' : (isSingleChoice ? 'Trắc nghiệm' : (isMultiGroup ? 'Chọn nhiều' : (isPictorial ? 'Từ vựng qua ảnh' : (isInlineCloze ? 'Điền từ nội tuyến' : (isShortText ? 'Điền từ' : 'Tự luận'))))))))))}</span>
              </div>
              ${promptDisplay ? `<div class="candidate-question-prompt">${promptDisplay}</div>` : ''}
              ${interactiveHtml}
            </div>
          `;
        };

        const isVocabTargetWord = (text, itm) => {
          if (!text) return true;
          const t = text.trim();
          if (itm?.targetWord && itm.targetWord.trim().toLowerCase() === t.toLowerCase()) return true;
          if (/^Từ vựng( câu \d+)?$/i.test(t)) return true;
          const accepted = draftState?.gradingKey?.items?.[itm?.itemVersionId]?.accepted || [];
          if (accepted.some(a => String(a).trim().toLowerCase() === t.toLowerCase())) return true;
          if (!/(nghe|chọn|điền|nhập|nối|hoàn thành|bài tập|hướng dẫn|listen|write|note|choose|select|match|complete)/i.test(t) && t.split(/\s+/).length <= 5) {
            return true;
          }
          return false;
        };

        const renderSimVocabPairTable = (vocabItems) => {
          if (!vocabItems || !vocabItems.length) return '';
          const defaultPrompt = 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:';
          let firstPrompt = defaultPrompt;
          const rawPrompt = (vocabItems[0]?.prompt || '').trim();
          if (rawPrompt && !isVocabTargetWord(rawPrompt, vocabItems[0])) {
            firstPrompt = rawPrompt;
          }

          return `
            <div class="candidate-vocab-table-container">
              <div class="candidate-vocab-table-intro">
                <div class="candidate-vocab-table-prompt">
                  ${escapeHtml(firstPrompt)}
                </div>
              </div>
              <div class="candidate-vocab-table">
                <div class="candidate-vocab-table-head">
                  <div class="vocab-th vocab-th-num">Câu</div>
                  <div class="vocab-th vocab-th-en">Từ tiếng Anh nghe được (50% điểm)</div>
                  <div class="vocab-th vocab-th-vi">Nghĩa tiếng Việt tương ứng (50% điểm)</div>
                </div>
                <div class="candidate-vocab-table-body">
                  ${vocabItems.map(item => `
                    <div class="candidate-vocab-table-row" data-item-id="${item.itemVersionId}">
                      <div class="vocab-td vocab-td-num">
                        <span class="vocab-row-num-badge qnum">Câu ${item.position}</span>
                      </div>
                      <div class="vocab-td vocab-td-en">
                        <input type="text" class="form-control candidate-vocab-text-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ nghe được..." autocomplete="off" />
                      </div>
                      <div class="vocab-td vocab-td-vi">
                        <select class="form-select candidate-vocab-select" data-item-id="${item.itemVersionId}">
                          <option value="">-- Chọn nghĩa tương ứng --</option>
                          ${(item.options || []).map(opt => `
                            <option value="${opt.id}">${escapeHtml(opt.label || '')}</option>
                          `).join('')}
                        </select>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        };

        const renderSimPictorialGroup = (pictorialItems) => {
          if (!pictorialItems || !pictorialItems.length) return '';
          const defaultPrompt = 'Dựa vào hình ảnh và gợi ý, hãy hoàn thành từ/cụm từ tương ứng:';
          let firstPrompt = defaultPrompt;
          const rawPrompt = (pictorialItems[0]?.prompt || '').trim();
          if (rawPrompt && !isVocabTargetWord(rawPrompt, pictorialItems[0]) && rawPrompt !== 'Nhìn hình và hoàn thành từ vựng:') {
            firstPrompt = rawPrompt;
          }

          return `
            <div class="candidate-pictorial-group-container">
              <div class="candidate-pictorial-group-intro">
                <div class="candidate-pictorial-group-prompt">
                  ${escapeHtml(firstPrompt)}
                </div>
              </div>
              <div class="candidate-pictorial-grid">
                ${pictorialItems.map(item => {
                  const imgSrc = item.image || item.stimulusImageUrl || '';
                  return `
                    <div class="candidate-pictorial-card" data-item-id="${item.itemVersionId}">
                      <div class="candidate-pictorial-card-header">
                        <span class="question-num-badge qnum">Câu ${item.position}</span>
                        <span class="question-type-badge">Từ vựng qua ảnh</span>
                      </div>
                      ${imgSrc ? `
                        <div class="candidate-pictorial-thumb">
                          <img src="${escapeHtml(imgSrc)}" alt="Câu ${item.position}" onerror="this.parentElement.style.display='none'" />
                        </div>
                      ` : ''}
                      <div class="candidate-pictorial-hints">
                        ${item.letterHint ? `<div class="pictorial-letter-hint">${escapeHtml(item.letterHint)}</div>` : ''}
                        ${item.captionHint ? `<div class="pictorial-caption-hint">${escapeHtml(item.captionHint)}</div>` : ''}
                      </div>
                      <div class="candidate-pictorial-input-wrap">
                        <input type="text" class="form-control candidate-pictorial-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ hoàn chỉnh..." autocomplete="off" />
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        };

        const renderSimShortQaGroup = (shortItems) => {
          if (!shortItems || !shortItems.length) return '';
          const is2Col = isShortQaEligibleFor2Col(shortItems);
          return `
            <div class="candidate-short-qa-container ${is2Col ? 'short-qa-2col' : ''}">
              ${shortItems.map(item => {
                const promptHtml = formatSimulationPrompt(item.prompt || '');
                return `
                <div class="candidate-short-qa-item" data-item-id="${item.itemVersionId}">
                  <div class="candidate-short-prompt-row">
                    <span class="candidate-short-qnum qnum">Câu ${item.position}</span>
                    <div class="candidate-short-prompt-text">${promptHtml}</div>
                  </div>
                  <div class="candidate-short-input-wrap">
                    <input type="text" class="form-control candidate-short-input" data-item-id="${item.itemVersionId}" placeholder="Nhập câu trả lời của bạn..." autocomplete="off" />
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          `;
        };

        const exercisesHtml = exercises.map((ex, exIdx) => {
          const exItems = items.filter(it => it.exerciseId === ex.exerciseId || (!it.exerciseId && exIdx === 0));
          const exItemsList = exItems.length ? exItems : (exercises.length === 1 ? items : []);
          const exPoints = exItemsList.reduce((sum, it) => sum + (it.maxScore || 1), 0);
          const exAudioUrl = ex.audioUrl || (exercises.length === 1 ? audioUrl : '');
          const exReading = ex.readingPassage || (exercises.length === 1 ? reading : '');

          const itemGroups = [];
          exItemsList.forEach(item => {
            const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
            const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.pedagogicalTypeCode === 'sentence_transformation' || item.layoutType === 'keyword_transformation' || item.layoutType === 'sentence_rewrite') && !isPronunciation;
            const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
            const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || b.layoutType === 'split_pane_matching') && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isInlineCloze = item.interactionType === 'short_text' && item.layoutType === 'inline_cloze' && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isVocab = item.interactionType === 'text_select_pair';
            const isShortText = item.interactionType === 'short_text' && item.graderType !== 'rubric_async' && !isInlineCloze && !isPictorial && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;

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

          const exItemsHtml = itemGroups.map(group => {
            if (group.type === 'vocab_pair_group') {
              return renderSimVocabPairTable(group.items);
            }
            if (group.type === 'pictorial_group') {
              return renderSimPictorialGroup(group.items);
            }
            if (group.type === 'short_qa_group') {
              return renderSimShortQaGroup(group.items);
            }
            return renderSimQuestionCard(group.item);
          }).join('');

          const isSplitPane = exItemsList.some(it => it.pedagogicalTypeCode === 'reading_matching' || it.layoutType === 'split_pane_matching');

          if (isSplitPane && exReading) {
            return `
              <div class="exercise simulation-split-pane-exercise" data-exercise-id="${ex.exerciseId}">
                <div class="exercise-head sim-section-header">
                  <div>
                    <h3>${exercises.length > 1 ? `Exercise ${ex.exerciseNumber || (exIdx + 1)}: ` : ''}${escapeHtml(ex.title || `Bài tập ${ex.exerciseNumber || (exIdx + 1)}`)}</h3>
                    ${ex.instructions ? `<div class="sim-instructions"><p>${escapeHtml(ex.instructions)}</p></div>` : ''}
                  </div>
                  <span class="points">${exItemsList.length} ô trả lời · ${exPoints} điểm</span>
                </div>

                <div class="split-pane-mobile-toggle">
                  <button type="button" class="btn btn-sm btn-outline-primary active toggle-pane-btn" data-pane="reading" data-section="${bIdx}_${exIdx}">${renderSvgIcon('book', 'icon-inline')} Xem bài đọc</button>
                  <button type="button" class="btn btn-sm btn-outline-primary toggle-pane-btn" data-pane="questions" data-section="${bIdx}_${exIdx}">Xem câu hỏi ghép nối (${exItemsList.length})</button>
                </div>

                <div class="split-pane-reading" id="split-pane-${bIdx}_${exIdx}">
                  <div class="reading-passage-column active-pane" data-pane-type="reading">
                    <div class="reading-passage-sticky-header">
                      <span class="reading-title-badge">${renderSvgIcon('book', 'icon-inline')} Bài đọc hiểu (Reading Passage)</span>
                      <span class="reading-hint">Cuộn độc lập để tra cứu</span>
                    </div>
                    <div class="reading-passage-content">
                      ${escapeHtml(exReading).replace(/\n/g, '<br/>')}
                    </div>
                  </div>

                  <div class="matching-questions-column" data-pane-type="questions">
                    <div class="matching-column-header">
                      <span class="matching-title-badge">Danh sách câu hỏi ghép nối</span>
                    </div>
                    <div class="sim-questions-list matching-items-list">
                      ${exItemsHtml || '<div class="sim-empty-items">Chưa có câu hỏi trong bài tập này.</div>'}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }

          return `
            <div class="exercise" data-exercise-id="${ex.exerciseId}">
              <div class="exercise-head sim-section-header">
                <div>
                  <h3>${exercises.length > 1 ? `Exercise ${ex.exerciseNumber || (exIdx + 1)}: ` : ''}${escapeHtml(ex.title || `Bài tập ${ex.exerciseNumber || (exIdx + 1)}`)}</h3>
                  ${ex.instructions ? `<div class="sim-instructions"><p>${escapeHtml(ex.instructions)}</p></div>` : ''}
                </div>
                <span class="points">${exItemsList.length} ô trả lời · ${exPoints} điểm</span>
              </div>

              ${exAudioUrl ? `
                <div class="audio-dock sim-audio-dock">
                  ${renderStrictCandidateAudioDock(null, { audioUrl: exAudioUrl, label: `Bài nghe: ${ex.title || 'Bài tập'}` })}
                </div>
              ` : ''}

              ${exReading ? `
                <div class="sim-reading-dock">
                  <div class="reading-header">${renderSvgIcon('book', 'icon-inline')} Bài đọc hiểu:</div>
                  <div class="reading-content">${escapeHtml(exReading).replace(/\n/g, '<br/>')}</div>
                </div>
              ` : ''}

              <div class="sim-questions-list">
                ${exItemsHtml || '<div class="sim-empty-items">Chưa có câu hỏi trong bài tập này.</div>'}
              </div>
            </div>
          `;
        }).join('');

        return `
          <section class="simulation-section-card section-page ${bIdx === 0 ? 'active' : ''}" id="sim-block-${bIdx}">
            ${(b.instructions || audioUrl || reading) && exercises.length > 1 ? `
              <div class="sim-section-lead-head">
                <h2>Phần ${bIdx + 1}: ${escapeHtml(b.title || `Phần ${bIdx + 1}`)}</h2>
                ${b.instructions ? `<div class="sim-instructions"><p>${escapeHtml(b.instructions)}</p></div>` : ''}
                ${audioUrl && !exercises.some(e => e.audioUrl) ? `
                  <div class="audio-dock sim-audio-dock">
                    ${renderStrictCandidateAudioDock(null, { audioUrl: audioUrl, label: `Bài nghe phần ${bIdx + 1}` })}
                  </div>
                ` : ''}
                ${reading && !exercises.some(e => e.readingPassage) ? `
                  <div class="sim-reading-dock">
                    <div class="reading-header">${renderSvgIcon('book', 'icon-inline')} Bài đọc hiểu phần ${bIdx + 1}:</div>
                    <div class="reading-content">${escapeHtml(reading).replace(/\n/g, '<br/>')}</div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div class="section-exercises-wrapper">
              ${exercisesHtml}
            </div>
          </section>
        `;
      }).join('');

      const totalItems = blocks.reduce((sum, b) => sum + (b.items || []).reduce((s, it) => s + getItemSpanCount(it), 0), 0);

      const navigatorButtonsHtml = blocks.flatMap((b, bIdx) => {
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
              btns.push(`
                <button type="button" class="btn-qnav" data-pos="${qPos}" data-blank-pos="${blankNum}" data-item-id="${item.itemVersionId}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos} (Chỗ trống ${blankNum})">
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
              btns.push(`
                <button type="button" class="btn-qnav" data-pos="${qPos}" data-slot-num="${slotNum}" data-item-id="${item.itemVersionId}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos} (Bước thứ ${slotNum})">
                  <span class="qnav-num">${qPos}</span>
                </button>
              `);
            }
            return btns;
          }

          const qPos = item.position || 1;
          return [
            `
            <button type="button" class="btn-qnav" data-pos="${qPos}" data-item-id="${item.itemVersionId}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos}">
              <span class="qnav-num">${qPos}</span>
            </button>
            `
          ];
        });
      }).join('');

      modal.innerHTML = `
        <div class="candidate-simulation-shell candidate-simulation-dialog">
          <header class="topbar simulation-topbar simulation-top-header">
            <div class="topbar-inner">
              <div class="brand sim-title-area">
                <div class="brand-mark">IZ</div>
                <div class="brand-copy">
                  <div class="brand-title">IZONE · ${escapeHtml(draftState.title || 'Đề thi')}</div>
                  <div class="brand-sub">IZONE · CANDIDATE SIMULATION · Chế độ xem trước giáo viên</div>
                </div>
              </div>
              <div class="top-actions sim-meta-badges">
                <span class="preview-badge">Đang xem trước</span>
                <span class="meta-pill">${renderSvgIcon('clock', 'icon-inline')} ${draftState.durationMinutes} phút</span>
                <span class="meta-pill">${renderSvgIcon('book', 'icon-inline')} ${blocks.length} phần thi</span>
                <span class="meta-pill">${renderSvgIcon('lock', 'icon-inline')} v${draftState.version}</span>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-close-simulation">${renderSvgIcon('close', 'icon-inline')} <span>Thoát xem trước</span></button>
              </div>
            </div>
          </header>

          <div class="section-nav-wrap">
            <nav class="section-nav simulation-nav-bar">
              ${blocks.map((b, i) => {
                const bCount = (b.items || []).reduce((s, it) => s + getItemSpanCount(it), 0);
                return `
                <button type="button" class="section-tab simulation-nav-pill ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
                  <span>${escapeHtml(b.title || `Phần ${i + 1}`)}</span>
                  <span class="tab-count">${(b.exercises || []).length > 1 ? `${(b.exercises || []).length} bài tập · ` : ''}${bCount} câu</span>
                </button>
              `;
              }).join('')}
            </nav>
          </div>

          <div class="exam-layout">
            <div class="main-column simulation-viewport">
              ${simulationBlocksHtml}
            </div>

            <aside class="side-panel">
              <div class="panel-card">
                <div class="progress-row">
                  <strong>Tiến độ làm bài</strong>
                  <span class="progress-ratio">0/${totalItems}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill"></div>
                </div>
                <div class="section-list">
                  ${blocks.map((b, i) => {
                    const bCount = (b.items || []).reduce((s, it) => s + getItemSpanCount(it), 0);
                    return `
                    <button type="button" class="side-section-btn ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
                      <span>${escapeHtml(b.title || `Phần ${i + 1}`)}</span>
                      <span class="side-count">0/${bCount}</span>
                    </button>
                  `;
                  }).join('')}
                </div>
              </div>

              <!-- Question Navigator Card -->
              <div class="panel-card question-navigator-card">
                <div class="navigator-header">
                  <strong>Bảng câu hỏi</strong>
                  <span class="navigator-summary" id="qnav-summary">${totalItems} câu</span>
                </div>
                <div class="question-navigator-grid">
                  ${navigatorButtonsHtml}
                </div>
              </div>

              <div class="panel-card">
                <strong>Lưu ý khi làm bài</strong>
                <p class="sim-notice-text">
                  Câu trả lời được lưu tự động. Chuyển phần không mất đáp án. Kiểm tra các ô chưa trả lời trước khi nộp bài.
                </p>
              </div>
            </aside>
          </div>

          <footer class="simulation-footer">
            <div class="footer-note">Đây là màn hình mô phỏng trực quan giao diện bài thi của thí sinh theo chuẩn IZONE. Mọi thao tác làm bài tại đây chỉ dùng để kiểm tra hiển thị.</div>
            <div class="footer-actions">
              <button type="button" class="btn btn-success btn-sm btn-submit-simulation" id="btn-submit-simulation">
                ${renderSvgIcon('check', 'icon-inline')} <span>Nộp bài & Chấm thử</span>
              </button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-close-simulation-footer">Hoàn tất kiểm tra</button>
            </div>
          </footer>

          <!-- Simulation Results Modal -->
          <div class="simulation-results-modal" id="simulation-results-modal">
            <div class="sim-results-dialog">
              <header class="sim-results-header">
                <div class="sim-results-title-wrap">
                  <span class="sim-results-badge">Kết quả mô phỏng</span>
                  <h3>Bảng tổng hợp chấm điểm</h3>
                </div>
                <button type="button" class="btn-close-sim-results" id="btn-close-sim-results" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
              </header>
              <div class="sim-results-body" id="sim-results-body"></div>
              <footer class="sim-results-footer">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-retest-simulation">Xem lại trên bài thi</button>
                <button type="button" class="btn btn-primary btn-sm" id="btn-done-simulation-results">Đóng kết quả</button>
              </footer>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
      initStrictCandidateAudioDocks(modal);
      const pronunciationAudio = initSimulationPronunciationAudio(modal);
      registerBuilderModalCleanup(modal, () => pronunciationAudio.dispose());

      const closeBtns = modal.querySelectorAll('#btn-close-simulation, #btn-close-simulation-footer');
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          pronunciationAudio.stop();
          modal.style.display = 'none';
        });
      });

      const qnavBtns = modal.querySelectorAll('.btn-qnav');

      const filterNavigatorBySection = (targetSectionId) => {
        let visibleCount = 0;
        qnavBtns.forEach(btn => {
          const btnSection = btn.getAttribute ? btn.getAttribute('data-section-target') : null;
          const isMatch = !targetSectionId || btnSection === targetSectionId;
          if (btn.style) {
            btn.style.display = isMatch ? 'inline-flex' : 'none';
          }
          if (isMatch) visibleCount++;
        });
        const summaryEl = modal.querySelector('#qnav-summary');
        if (summaryEl) {
          summaryEl.textContent = `${visibleCount} câu`;
        }
      };

      const allNavBtns = modal.querySelectorAll('.section-tab, .simulation-nav-pill, .side-section-btn');
      allNavBtns.forEach(btn => {
        btn.addEventListener?.('click', () => {
          pronunciationAudio.stop();
          const targetId = btn.getAttribute('data-section-target');
          modal.querySelectorAll('.section-tab, .simulation-nav-pill').forEach(b => {
            b.classList?.toggle('active', b.getAttribute('data-section-target') === targetId);
          });
          modal.querySelectorAll('.side-section-btn').forEach(b => {
            b.classList?.toggle('active', b.getAttribute('data-section-target') === targetId);
          });
          modal.querySelectorAll('.section-page, .simulation-section-card').forEach(sec => {
            sec.classList?.toggle('active', sec.id === targetId);
          });
          filterNavigatorBySection(targetId);
          const targetEl = modal.querySelector(`#${targetId}`);
          if (targetEl && typeof targetEl.scrollIntoView === 'function') {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

      // Question Navigator click-to-focus and section navigation
      qnavBtns.forEach(btn => {
        btn.addEventListener?.('click', () => {
          pronunciationAudio.stop();
          const targetSectionId = btn.getAttribute('data-section-target');
          const pos = btn.getAttribute('data-pos');
          const blankPos = btn.getAttribute('data-blank-pos');
          const slotNum = btn.getAttribute('data-slot-num');
          const itemId = btn.getAttribute('data-item-id');

          // 1. Activate target section tab if needed
          if (targetSectionId) {
            modal.querySelectorAll('.section-tab, .simulation-nav-pill').forEach(b => {
              b.classList?.toggle('active', b.getAttribute('data-section-target') === targetSectionId);
            });
            modal.querySelectorAll('.side-section-btn').forEach(b => {
              b.classList?.toggle('active', b.getAttribute('data-section-target') === targetSectionId);
            });
            modal.querySelectorAll('.section-page, .simulation-section-card').forEach(sec => {
              sec.classList?.toggle('active', sec.id === targetSectionId);
            });
            filterNavigatorBySection(targetSectionId);
          }

          // 2. Find target element
          let targetEl = null;
          if (blankPos || btn.hasAttribute?.('data-blank-pos')) {
            targetEl = modal.querySelector(`.inline-fill-input[data-position="${blankPos}"]`) ||
              modal.querySelector(`.inline-fill-input[data-position="${pos}"]`);
          } else if (slotNum || btn.hasAttribute?.('data-slot-num')) {
            targetEl = modal.querySelector(`.candidate-sequence-select[data-position="${pos}"]`) ||
              modal.querySelector(`[data-item-id="${itemId}"] .candidate-sequence-select[data-slot="${slotNum}"]`) ||
              modal.querySelector(`.candidate-sequence-select[data-slot="${slotNum}"]`);
          } else if (itemId) {
            const itemCard = modal.querySelector(`.candidate-question-card[data-item-id="${itemId}"]`) ||
              modal.querySelector(`.candidate-short-qa-item[data-item-id="${itemId}"]`) ||
              modal.querySelector(`[data-item-id="${itemId}"]`);
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
            targetEl.classList?.add('nav-focus-pulse');
            setTimeout(() => {
              targetEl.classList?.remove('nav-focus-pulse');
            }, 1200);
          }
        });
      });

      // Filter navigator initially for the first section
      filterNavigatorBySection('sim-block-0');

      // Update answered state on candidate input/change
      function updateAnsweredState() {
        qnavBtns.forEach(btn => {
          const pos = btn.getAttribute('data-pos');
          const blankPos = btn.getAttribute('data-blank-pos');
          const slotNum = btn.getAttribute('data-slot-num');
          const itemId = btn.getAttribute('data-item-id');

          let isAnswered = false;
          if (blankPos || btn.hasAttribute('data-blank-pos')) {
            const input = modal.querySelector(`.inline-fill-input[data-position="${blankPos || pos}"]`);
            if (input && input.value && input.value.trim().length > 0) {
              isAnswered = true;
            }
          } else if (slotNum || btn.hasAttribute('data-slot-num')) {
            const select = modal.querySelector(`.candidate-sequence-select[data-position="${pos}"]`) ||
              modal.querySelector(`[data-item-id="${itemId}"] .candidate-sequence-select[data-slot="${slotNum}"]`) ||
              modal.querySelector(`.candidate-sequence-select[data-slot="${slotNum}"]`);
            if (select && select.value && select.value.trim().length > 0) {
              isAnswered = true;
            }
          } else if (itemId) {
            const checkedRadio = modal.querySelector(`input[name="sim_choice_${itemId}"]:checked, input[name="sim_pron_${itemId}"]:checked`);
            if (checkedRadio) isAnswered = true;
            const checkedMulti = modal.querySelector(`input[name="sim_multi_${itemId}"]:checked`);
            if (checkedMulti) isAnswered = true;
            const textInput = modal.querySelector(`.candidate-transformation-input[data-item-id="${itemId}"], .candidate-reorder-input[data-item-id="${itemId}"], .candidate-open-textarea[data-item-id="${itemId}"], .candidate-pictorial-input[data-item-id="${itemId}"], .candidate-vocab-text-input[data-item-id="${itemId}"], .candidate-short-input[data-item-id="${itemId}"], .candidate-error-input[data-item-id="${itemId}"], .candidate-correction-input[data-item-id="${itemId}"]`);
            if (textInput && textInput.value && textInput.value.trim().length > 0) isAnswered = true;
            const selectEl = modal.querySelector(`.candidate-choice-select[data-item-id="${itemId}"], .candidate-vocab-select[data-item-id="${itemId}"]`);
            if (selectEl && selectEl.value && selectEl.value.trim().length > 0) isAnswered = true;
          }

          btn.classList.toggle('answered', isAnswered);
        });

        const answeredCount = modal.querySelectorAll('.btn-qnav.answered').length;
        const totalCount = qnavBtns.length || totalItems;
        const ratioEl = modal.querySelector('.progress-ratio');
        if (ratioEl) {
          ratioEl.textContent = `${answeredCount}/${totalCount}`;
        }
        const fillEl = modal.querySelector('.progress-fill');
        if (fillEl) {
          const pct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
          fillEl.style.width = `${pct}%`;
        }
      }

      if (typeof modal.addEventListener === 'function') {
        modal.addEventListener('input', updateAnsweredState);
        modal.addEventListener('change', updateAnsweredState);
      }

      // Simulation Submission & Grading
      const submitSimBtn = modal.querySelector('#btn-submit-simulation');
      if (submitSimBtn) {
        submitSimBtn.addEventListener('click', () => {
          pronunciationAudio.stop();
          let totalAchieved = 0;
          let totalMax = 0;
          const details = [];

          const allItemsMap = new Map();
          for (const b of blocks) {
            for (const it of (b.items || [])) {
              allItemsMap.set(it.itemVersionId, it);
            }
          }

          const qnavButtons = modal.querySelectorAll('.btn-qnav');
          qnavButtons.forEach(btn => {
            const pos = Number(btn.getAttribute('data-pos'));
            const blankPos = btn.getAttribute('data-blank-pos');
            const slotNum = btn.getAttribute('data-slot-num') ? Number(btn.getAttribute('data-slot-num')) : null;
            const itemId = btn.getAttribute('data-item-id');
            const item = allItemsMap.get(itemId);
            const itemKey = draftState.gradingKey?.items?.[itemId] || {};

            let candidateAnswer = '';
            let correctAnswer = '';
            let isCorrect = false;
            let score = 0;
            let maxScore = 1;
            let typeLabel = 'Câu hỏi';

            if (blankPos !== null && blankPos !== undefined) {
              typeLabel = 'Điền từ nội tuyến';
              const input = modal.querySelector(`.inline-fill-input[data-position="${blankPos}"]`) ||
                modal.querySelector(`.inline-fill-input[data-position="${pos}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const bAnswer = item?.clozeAnswers?.[blankPos] || item?.clozeAnswers?.[String(blankPos)] || itemKey;
              const accepted = (bAnswer?.accepted && bAnswer.accepted.length > 0)
                ? bAnswer.accepted
                : (bAnswer?.targetWord ? [bAnswer.targetWord] : (itemKey.accepted || []));
              correctAnswer = accepted[0] || '—';
              isCorrect = accepted.some(acc => acc.trim().toLowerCase() === candidateAnswer.toLowerCase());
              score = isCorrect ? 1 : 0;
              maxScore = 1;
            } else if (slotNum !== null && slotNum !== undefined) {
              typeLabel = 'Thứ tự nghe';
              const select = modal.querySelector(`.candidate-sequence-select[data-position="${pos}"]`) ||
                modal.querySelector(`[data-item-id="${itemId}"] .candidate-sequence-select[data-slot="${slotNum}"]`) ||
                modal.querySelector(`.candidate-sequence-select[data-slot="${slotNum}"]`);
              candidateAnswer = select?.value?.trim() || '';
              const expectedSeq = itemKey.expectedSequence || (item?.events ? [...item.events].sort((a,b)=>a.rank-b.rank).map(e=>e.label) : []);
              const expectedLabel = expectedSeq[slotNum - 1] || '';
              correctAnswer = `Thứ ${slotNum}: ${expectedLabel}`;
              isCorrect = candidateAnswer !== '' && candidateAnswer.toUpperCase() === expectedLabel.toUpperCase();
              score = isCorrect ? 1 : 0;
              maxScore = 1;
            } else if (item?.interactionType === 'text_select_pair' || item?.pedagogicalTypeCode === 'vocabulary_pair') {
              typeLabel = 'Cặp từ vựng';
              const textInput = modal.querySelector(`.candidate-vocab-text-input[data-item-id="${itemId}"]`);
              const selectEl = modal.querySelector(`.candidate-vocab-select[data-item-id="${itemId}"]`);
              const textVal = textInput?.value?.trim() || '';
              const optId = selectEl?.value?.trim() || '';
              const optObj = (item?.options || []).find(o => String(o.id) === String(optId));
              const selectedOptLabel = optObj?.label || optId;

              if (textVal && selectedOptLabel) {
                candidateAnswer = `${textVal} · ${selectedOptLabel}`;
              } else if (textVal) {
                candidateAnswer = `${textVal} · (chưa chọn nghĩa)`;
              } else if (selectedOptLabel) {
                candidateAnswer = `(chưa nhập từ) · ${selectedOptLabel}`;
              } else {
                candidateAnswer = '';
              }

              const accepted = (itemKey.accepted && itemKey.accepted.length > 0)
                ? itemKey.accepted
                : (item?.targetWord ? [item.targetWord] : []);
              const expectedText = accepted[0] || item?.targetWord || '—';
              const expectedOptId = itemKey.expectedOptionId || '';
              const expOptObj = (item?.options || []).find(o => String(o.id) === String(expectedOptId));
              const expectedOptLabel = expOptObj?.label || expectedOptId || '—';
              correctAnswer = `${expectedText} · ${expectedOptLabel}`;

              const textCorrect = Boolean(textVal) && accepted.some(acc => acc.trim().toLowerCase() === textVal.toLowerCase());
              const optCorrect = Boolean(optId) && (expectedOptId ? optId === expectedOptId : true);

              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              const componentScore = maxScore / 2;
              score = (textCorrect ? componentScore : 0) + (optCorrect ? componentScore : 0);
              isCorrect = score === maxScore;
            } else if (item?.pedagogicalTypeCode === 'sentence_rewrite') {
              typeLabel = 'Biến đổi câu';
              const input = modal.querySelector(`.candidate-transformation-input[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const res = scoreTransformationAnswer(candidateAnswer, itemKey);
              isCorrect = res.isCorrect;
              score = res.score;
              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              correctAnswer = (itemKey.accepted || [])[0] || '—';
            } else if (item?.pedagogicalTypeCode === 'sentence_reorder') {
              typeLabel = 'Sắp xếp câu';
              const input = modal.querySelector(`.candidate-reorder-input[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const target = item?.targetSentence || (itemKey.accepted || [])[0] || '';
              correctAnswer = target;
              isCorrect = candidateAnswer.toLowerCase().replace(/[.!?]+$/, '').trim() === target.toLowerCase().replace(/[.!?]+$/, '').trim();
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.interactionType === 'correction_pair' || item?.pedagogicalTypeCode === 'error_correction' || item?.graderType === 'correction_pair') {
              typeLabel = 'Tìm và sửa lỗi';
              const errInput = modal.querySelector(`.candidate-error-input[data-item-id="${itemId}"]`);
              const corrInput = modal.querySelector(`.candidate-correction-input[data-item-id="${itemId}"]`);
              const errVal = errInput?.value?.trim() || '';
              const corrVal = corrInput?.value?.trim() || '';
              candidateAnswer = (errVal || corrVal) ? `${errVal || '(chưa nhập lỗi)'} -> ${corrVal || '(chưa sửa)'}` : '';
              const expErr = itemKey.expectedError || item?.expectedError || '';
              const expCorr = itemKey.expectedCorrection || (itemKey.accepted || [])[0] || item?.expectedCorrection || '';
              correctAnswer = `${expErr} -> ${expCorr}`;
              const errMatch = !expErr || errVal.toLowerCase() === expErr.toLowerCase();
              const corrMatch = !expCorr || (itemKey.accepted || [expCorr]).some(a => a.trim().toLowerCase() === corrVal.toLowerCase());
              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              const comp = maxScore / 2;
              score = (errMatch ? comp : 0) + (corrMatch ? comp : 0);
              isCorrect = score === maxScore;
            } else if (item?.pedagogicalTypeCode === 'reading_matching' || item?.layoutType === 'split_pane_matching') {
              typeLabel = 'Ghép nối (Matching)';
              const select = modal.querySelector(`.candidate-choice-select[data-item-id="${itemId}"]`);
              candidateAnswer = select?.value?.trim() || '';
              const expOpt = itemKey.expectedOptionId || item?.expectedOptionId || '';
              correctAnswer = expOpt || '—';
              isCorrect = candidateAnswer !== '' && candidateAnswer === expOpt;
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.interactionType === 'single_choice' || item?.pedagogicalTypeCode === 'pronunciation_choice' || item?.pedagogicalTypeCode === 'pronunciation_word') {
              typeLabel = 'Trắc nghiệm';
              const checked = modal.querySelector(`input[name="sim_choice_${itemId}"]:checked, input[name="sim_pron_${itemId}"]:checked`);
              candidateAnswer = checked?.value || '';
              const expOpt = itemKey.expectedOptionId || '';
              correctAnswer = expOpt;
              isCorrect = candidateAnswer !== '' && candidateAnswer === expOpt;
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.interactionType === 'multi_choice_group') {
              typeLabel = 'Chọn nhiều';
              const checkedEls = modal.querySelectorAll(`input[name="sim_multi_${itemId}"]:checked`);
              const selectedVals = Array.from(checkedEls).map(el => el.value);
              candidateAnswer = selectedVals.join(', ');
              const expectedOpts = itemKey.expectedOptionIds || (itemKey.expectedOptionId ? [itemKey.expectedOptionId] : []);
              correctAnswer = expectedOpts.join(', ');
              const matchCount = selectedVals.filter(v => expectedOpts.includes(v)).length;
              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              score = expectedOpts.length > 0 && selectedVals.length === expectedOpts.length && matchCount === expectedOpts.length ? maxScore : 0;
              isCorrect = score === maxScore;
            } else if (item?.pedagogicalTypeCode === 'pictorial_vocabulary' || item?.layoutType === 'pictorial_card') {
              typeLabel = 'Từ vựng qua ảnh';
              const input = modal.querySelector(`.candidate-pictorial-input[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const accepted = (itemKey.accepted && itemKey.accepted.length > 0) ? itemKey.accepted : (item?.targetWord ? [item.targetWord] : []);
              correctAnswer = accepted[0] || '—';
              isCorrect = accepted.some(acc => acc.trim().toLowerCase() === candidateAnswer.toLowerCase());
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.graderType === 'rubric_async') {
              typeLabel = 'Tự luận (AI)';
              const input = modal.querySelector(`.candidate-open-textarea[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              correctAnswer = '(Chấm tự luận / AI)';
              score = candidateAnswer ? (item?.maxScore || 4) : 0;
              maxScore = item?.maxScore || 4;
              isCorrect = Boolean(candidateAnswer);
            } else {
              typeLabel = 'Điền từ';
              const input = modal.querySelector(`.candidate-short-input[data-item-id="${itemId}"], .candidate-open-textarea[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const accepted = (itemKey.accepted && itemKey.accepted.length > 0) ? itemKey.accepted : (item?.targetWord ? [item.targetWord] : []);
              correctAnswer = accepted[0] || '—';
              isCorrect = accepted.some(acc => acc.trim().toLowerCase() === candidateAnswer.toLowerCase());
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            }

            totalAchieved += score;
            totalMax += maxScore;

            btn.classList.remove('is-correct', 'is-incorrect');
            btn.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');

            details.push({
              pos,
              typeLabel,
              candidateAnswer: candidateAnswer || '(Chưa trả lời)',
              correctAnswer,
              score,
              maxScore,
              isCorrect
            });
          });

          // Render summary breakdown
          const resultsModal = modal.querySelector('#simulation-results-modal');
          const resultsBody = modal.querySelector('#sim-results-body');
          if (resultsBody && resultsModal) {
            resultsBody.innerHTML = `
              <div class="sim-score-banner">
                <div class="score-banner-title">Tổng điểm đạt được:</div>
                <div class="score-banner-value">${totalAchieved}/${totalMax}đ</div>
                <div class="score-banner-sub">Đã chấm chi tiết toàn bộ ${details.length} câu hỏi theo bộ đáp án của đề thi.</div>
              </div>
              <div class="sim-breakdown-table-wrap">
                <table class="sim-breakdown-table">
                  <thead>
                    <tr>
                      <th>Câu</th>
                      <th>Dạng câu</th>
                      <th>Bài làm của bạn</th>
                      <th>Đáp án đúng</th>
                      <th>Điểm</th>
                      <th>Đánh giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${details.map(d => `
                      <tr class="${d.isCorrect ? 'row-correct' : (d.score > 0 ? 'row-partial' : 'row-incorrect')}">
                        <td><strong>Câu ${d.pos}</strong></td>
                        <td><span class="type-badge">${escapeHtml(d.typeLabel)}</span></td>
                        <td>${escapeHtml(d.candidateAnswer)}</td>
                        <td><span class="correct-badge">${escapeHtml(d.correctAnswer)}</span></td>
                        <td><strong>${d.score}/${d.maxScore}đ</strong></td>
                        <td>${d.isCorrect ? `<span class="status-correct">${renderSvgIcon('check', 'icon-inline')} Đúng</span>` : (d.score > 0 ? `<span class="status-partial" style="font-weight:700; color:#d97706;">Đúng 50%</span>` : `<span class="status-incorrect">${renderSvgIcon('close', 'icon-inline')} Chưa đúng</span>`)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
            resultsModal.style.display = 'flex';
          }
        });
      }

      // Close simulation results handlers
      const closeResultsBtns = modal.querySelectorAll('#btn-close-sim-results, #btn-done-simulation-results, #btn-retest-simulation');
      closeResultsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const resModal = modal.querySelector('#simulation-results-modal');
          if (resModal) resModal.style.display = 'none';
        });
      });

      const openTextareas = modal.querySelectorAll('.candidate-open-textarea');
      openTextareas.forEach(ta => {
        ta.addEventListener('input', () => {
          const text = ta.value.trim();
          const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
          const countEl = ta.closest('.candidate-open-wrap')?.querySelector('.word-count-badge strong');
          if (countEl) countEl.textContent = count;
        });
      });

      // Mobile Split-Pane switcher handling
      const toggleBtns = modal.querySelectorAll('.toggle-pane-btn');
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const secIdx = btn.getAttribute('data-section');
          const targetPane = btn.getAttribute('data-pane');
          const containerSection = modal.querySelector(`#sim-block-${secIdx}`);
          if (!containerSection) return;

          containerSection.querySelectorAll('.toggle-pane-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const readingCol = containerSection.querySelector('.reading-passage-column');
          const questionsCol = containerSection.querySelector('.matching-questions-column');

          if (targetPane === 'reading') {
            readingCol?.classList.add('active-pane');
            questionsCol?.classList.remove('active-pane');
          } else {
            readingCol?.classList.remove('active-pane');
            questionsCol?.classList.add('active-pane');
          }
        });
      });

      // Sentence Reorder token assembling interactions
      const tokenChips = modal.querySelectorAll('.btn-token-chip');
      tokenChips.forEach(chip => {
        chip.addEventListener('click', () => {
          if (chip.classList.contains('is-used')) return;
          const wrap = chip.closest('.candidate-sentence-reorder-wrap');
          const input = wrap?.querySelector('.candidate-reorder-input');
          const token = chip.getAttribute('data-token');
          if (input && token) {
            const current = input.value.trim();
            input.value = current ? `${current} ${token}` : token;
            chip.classList.add('is-used');
          }
        });
      });

      const clearAssemblyBtns = modal.querySelectorAll('.btn-clear-assembly');
      clearAssemblyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const wrap = btn.closest('.candidate-sentence-reorder-wrap');
          const input = wrap?.querySelector('.candidate-reorder-input');
          if (input) input.value = '';
          wrap?.querySelectorAll('.btn-token-chip').forEach(c => c.classList.remove('is-used'));
        });
      });
    }
  return openCandidateSimulationModal;
}
