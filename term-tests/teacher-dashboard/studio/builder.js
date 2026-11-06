import { bindChoiceAuthoring } from './authoring/choice.js';
import { bindShortAnswerAuthoring } from './authoring/short-answer.js';
import { bindReadingMatchingAuthoring } from './authoring/reading-matching.js';
import { bindListeningOrderAuthoring } from './authoring/listening-order.js';
import { bindErrorCorrectionAuthoring } from './authoring/error-correction.js';
import { bindSentenceAuthoring } from './authoring/sentence.js';
import { bindPronunciationAuthoring } from './authoring/pronunciation.js';
import { bindPictorialAuthoring } from './authoring/pictorial.js';
import { bindVocabularyAuthoring } from './authoring/vocabulary.js';
import { bindRubricAuthoring } from './authoring/rubric.js';
import { createQuestionRenderer } from './question-renderer.js';
import { createSimulation } from './simulation.js';
import { createPublishing } from './publishing.js';
import { createDraftInputSync } from './draft-inputs.js';
import { bindDraftSaving } from './draft-saving.js';
import { mountedBuilders, registerUnsavedChangesGuard, openUnsavedChangesModal, unregisterUnsavedChangesGuard, disposeBuilderModals } from '../navigation/unsaved-changes.js';
import { generateUuid } from './draft-model.js';
import { previewSandboxPath } from '../api/teacher.js';
import { renderSvgIcon } from '../ui/icons.js';
import { updatePromptPosition, isComprehensionExercise, findPrecedingClozeScript, pruneOrphanClozeKeys, getItemSpanCount, parseClozeBlanks, computeTestBuilderScoreSummary, scaleRubricCriteriaScores, insertItemsIntoBlockExercise, reorderBlockItem, moveItemToExercise, moveExerciseBetweenBlocks, deleteExerciseFromBlock, resequenceItemPositions } from './draft-model.js';
import { generateHangmanHint, expandSentenceVariants, batchGenerateExerciseVocabVariants } from './question-content.js';
import { escapeHtml } from '../ui/presentation.js';
import { sanitizeRichContent, renderInlineClozeMarkup, generateTableHtml } from '../ui/rich-content.js';
import { renderScoreBreakdownBarHtml, renderBlocksNavCardHtml, renderScoreSkillChipsHtml, renderBlockJumpTagsHtml } from './builder-summary.js';
import { convertGoogleDriveAudioUrl, convertGoogleDriveImageUrl, validateImageUrl } from './media.js';
import { openBlockCsvUploadModal } from './batch-import.js';
import { openMoveExerciseModal } from './move-exercise-modal.js';

import { openConfirmDeleteTestModal } from './catalog.js';

export function mountBuilder(container, formVersionData = {}, options = {}) {
  if (!container) return { dispose() {}, hasUnsavedChanges: () => false, getDraft: () => null };

  const currentFormVersionId = formVersionData.id || formVersionData.formVersionId;
  const currentSubCount = Number(formVersionData.submissionCount || 0);
  const currentVersion = Number(formVersionData.version || 1);
  const currentStatus = formVersionData.status || 'draft';

  const existing = mountedBuilders.get(container);
  if (existing && !existing.isDisposed) {
    const isSameData = existing.formVersionData === formVersionData || (
      existing.formVersionId === currentFormVersionId &&
      existing.submissionCount === currentSubCount &&
      existing.version === currentVersion &&
      existing.status === currentStatus
    );
    if (isSameData) {
      return existing.handle;
    }
    existing.handle.dispose();
  }

  let isDisposed = false;
  let isDirty = false;
  let dirtyVersion = 0;
  const builderOwner = { id: generateUuid(), formVersionId: currentFormVersionId };
  const timeouts = new Set();
  let renderCycleCleanups = [];

  const matchedCatalogItem = Array.isArray(options.catalog)
    ? options.catalog.find(it => it.formVersionId === (formVersionData.id || formVersionData.formVersionId))
    : null;

  const draftState = {
    formVersionId: formVersionData.id || formVersionData.formVersionId || generateUuid(),
    formTemplateId: formVersionData.formTemplateId || '',
    version: Number(formVersionData.version || 1),
    status: formVersionData.status || 'draft',
    title: formVersionData.title || formVersionData.publicDefinition?.title || matchedCatalogItem?.title || 'Đề thi mới',
    phase: formVersionData.phase !== undefined
      ? formVersionData.phase
      : (formVersionData.publicDefinition?.phase !== undefined ? formVersionData.publicDefinition.phase : (matchedCatalogItem?.phase || null)),
    sessionNumber: formVersionData.sessionNumber || formVersionData.publicDefinition?.sessionNumber || matchedCatalogItem?.sessionNumber || null,
    durationMinutes: Number(formVersionData.durationMinutes || formVersionData.publicDefinition?.durationMinutes || 60),
    answerReleasePolicy: formVersionData.answerReleasePolicy || formVersionData.publicDefinition?.answerReleasePolicy || 'teacher_release',
    submissionCount: Number(formVersionData.submissionCount || 0),
    blocks: JSON.parse(JSON.stringify(formVersionData.publicDefinition?.blocks || formVersionData.blocks || [])),
    gradingKey: {
      items: JSON.parse(JSON.stringify(formVersionData.gradingKey?.items || {})),
      groups: JSON.parse(JSON.stringify(formVersionData.gradingKey?.groups || {}))
    }
  };

  if (!draftState.blocks.length) {
    const initialItemId = generateUuid();
    const initialExId = generateUuid();
    draftState.blocks.push({
      blockId: generateUuid(),
      checkpoint: 1,
      title: 'Phần 1: Khởi động',
      instructions: '',
      audioUrl: '',
      readingPassage: '',
      exercises: [
        {
          exerciseId: initialExId,
          exerciseNumber: 1,
          title: 'Bài tập 1: Khởi động',
          instructions: '',
          audioUrl: null,
          readingPassage: null,
          itemIds: [initialItemId]
        }
      ],
      items: [
        {
          itemFamilyId: generateUuid(),
          itemVersionId: initialItemId,
          position: 1,
          exerciseId: initialExId,
          exerciseTitle: 'Bài tập 1: Khởi động',
          prompt: 'Câu hỏi 1:',
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'multiple_choice',
          layoutType: 'grid_4',
          graderType: 'exact_option',
          required: true,
          maxScore: 1,
          options: [
            { id: 'A', label: 'Phương án A' },
            { id: 'B', label: 'Phương án B' },
            { id: 'C', label: 'Phương án C' },
            { id: 'D', label: 'Phương án D' }
          ],
          skillCodes: [],
          releasePolicy: 'inherit'
        }
      ]
    });
    draftState.gradingKey.items[initialItemId] = {
      graderType: 'exact_option',
      expectedOptionId: 'A'
    };
  }

  // Normalize exercises in each block for 3-level hierarchy (Block -> Exercise -> Item)
  for (const block of draftState.blocks) {
    if (!Array.isArray(block.exercises) || block.exercises.length === 0) {
      const defaultExId = generateUuid();
      block.exercises = [
        {
          exerciseId: defaultExId,
          exerciseNumber: 1,
          title: block.title ? `${block.title}` : 'Exercise 1',
          instructions: block.instructions || '',
          audioUrl: block.audioUrl || null,
          readingPassage: block.readingPassage || null,
          itemIds: (block.items || []).map(it => it.itemVersionId)
        }
      ];
    } else {
      block.exercises.forEach((ex, idx) => {
        ex.exerciseNumber = idx + 1;
        if (!ex.exerciseId) ex.exerciseId = generateUuid();
        if (!ex.title) ex.title = `Exercise ${idx + 1}`;
      });
    }

    const exIdMap = new Map(block.exercises.map(e => [e.exerciseId, e]));
    const firstEx = block.exercises[0];

    for (const itm of block.items || []) {
      if (!itm.exerciseId || !exIdMap.has(itm.exerciseId)) {
        itm.exerciseId = firstEx.exerciseId;
        itm.exerciseTitle = itm.exerciseTitle || firstEx.title;
      } else {
        itm.exerciseTitle = itm.exerciseTitle || exIdMap.get(itm.exerciseId)?.title;
      }
    }

    for (const ex of block.exercises) {
      ex.itemIds = (block.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
    }
  }

  function markAsDirty() {
    if (isDisposed) return;
    dirtyVersion++;
    isDirty = true;
    if (typeof container?.querySelector === 'function') {
      const statusMsg = container.querySelector('#builder-status-msg');
      if (statusMsg && !statusMsg.classList.contains('saving') && !statusMsg.classList.contains('forked')) {
        statusMsg.className = 'builder-status-pill unsaved';
        statusMsg.innerHTML = `${renderSvgIcon('edit', 'icon-inline')} <span>Có thay đổi chưa lưu</span>`;
      }
    }
  }

  const unsavedGuardChecker = () => !isDisposed && isDirty;
  registerUnsavedChangesGuard(unsavedGuardChecker, builderOwner);

  const markSaved = () => { isDirty = false; };
  const hasUnsavedChanges = () => !isDisposed && isDirty;
  const workflowLifecycle = { isDisposed: () => isDisposed, getDirtyVersion: () => dirtyVersion };
  const collapsedCardKeys = new Set();
  let activeBlockIdx = 0;

  function resolveTargetExercise(block, btn) {
    if (!Array.isArray(block.exercises) || block.exercises.length === 0) {
      const defaultExId = generateUuid();
      block.exercises = [
        {
          exerciseId: defaultExId,
          exerciseNumber: 1,
          title: block.title ? `${block.title}` : 'Exercise 1',
          instructions: block.instructions || '',
          audioUrl: block.audioUrl || null,
          readingPassage: block.readingPassage || null,
          itemIds: (block.items || []).map(it => it.itemVersionId)
        }
      ];
    }
    const exId = btn ? btn.getAttribute('data-exercise-id') : null;
    const exIdxStr = btn ? btn.getAttribute('data-exercise-idx') : null;
    const exIdx = exIdxStr !== null && exIdxStr !== undefined && exIdxStr !== '' ? Number(exIdxStr) : null;
    if (exId) {
      const found = block.exercises.find(e => e.exerciseId === exId);
      if (found) return found;
    }
    if (exIdx !== null && block.exercises[exIdx]) {
      return block.exercises[exIdx];
    }
    return block.exercises[0];
  }

  function updatePromptPositionLocal(prompt, newPos, span = 1) {
    return updatePromptPosition(prompt, newPos, span);
  }

  function resequenceItemPositions(options = {}) {
    const forceStartAtOne = options.forceStartAtOne ?? false;
    const firstPos = draftState.blocks[0]?.items?.[0]?.position;
    let pos = (!forceStartAtOne && typeof firstPos === 'number' && firstPos > 2) ? firstPos : 1;
    for (const b of draftState.blocks) {
      for (const itm of b.items || []) {
        pruneOrphanClozeKeys(itm, draftState.gradingKey?.items?.[itm.itemVersionId]);
        const span = getItemSpanCount(itm);
        itm.spanCount = span;
        itm.position = pos;
        if (itm.prompt) {
          itm.prompt = updatePromptPositionLocal(itm.prompt, pos, span);
        }
        pos += span;
      }
      for (const ex of b.exercises || []) {
        ex.itemIds = (b.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
      }
    }
  }

  // Ensure initial grading key entries exist
  for (const block of draftState.blocks) {
    for (const itm of block.items || []) {
      if (itm.interactionType === 'single_choice' && !draftState.gradingKey.items[itm.itemVersionId]) {
        draftState.gradingKey.items[itm.itemVersionId] = {
          graderType: 'exact_option',
          expectedOptionId: itm.options?.[0]?.id || 'A'
        };
      } else if (itm.interactionType === 'short_text') {
        const initialWord = itm.targetWord || ((itm.prompt && !/^Câu \d+/i.test(itm.prompt) && !/^Từ vựng qua ảnh \d+/i.test(itm.prompt)) ? itm.prompt : '');
        if (!draftState.gradingKey.items[itm.itemVersionId]) {
          draftState.gradingKey.items[itm.itemVersionId] = {
            graderType: 'accepted_text',
            accepted: initialWord ? [initialWord] : [],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
        } else {
          const currentKey = draftState.gradingKey.items[itm.itemVersionId];
          if (Array.isArray(currentKey.accepted)) {
            currentKey.accepted = currentKey.accepted.filter(v => v !== 'answer' && v !== 'draft_placeholder');
            if (!currentKey.accepted.length && initialWord) {
              currentKey.accepted = [initialWord];
            }
          }
        }
      } else if (itm.interactionType === 'text_select_pair') {
        const initialWord = itm.targetWord || ((itm.prompt && !/^Từ vựng câu \d+/i.test(itm.prompt)) ? itm.prompt : '');
        if (!draftState.gradingKey.items[itm.itemVersionId]) {
          draftState.gradingKey.items[itm.itemVersionId] = {
            graderType: 'accepted_text_exact_option',
            accepted: initialWord ? [initialWord] : [],
            expectedOptionId: itm.options?.[0]?.id || 'opt_1',
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
        } else {
          const currentKey = draftState.gradingKey.items[itm.itemVersionId];
          if (Array.isArray(currentKey.accepted)) {
            currentKey.accepted = currentKey.accepted.filter(v => v !== 'answer' && v !== 'draft_placeholder');
            if (!currentKey.accepted.length && initialWord) {
              currentKey.accepted = [initialWord];
            }
          }
        }
      } else if (itm.graderType === 'rubric_async' && !draftState.gradingKey.items[itm.itemVersionId]) {
        draftState.gradingKey.items[itm.itemVersionId] = {
          graderType: 'rubric_async',
          rubricCode: 'rubric_translation_v1',
          rubricVersion: 1,
          rubric: {
            scoringVersion: 'rubric-translation-v1',
            maxScore: itm.maxScore || 4,
            criteria: [
              { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: (itm.maxScore || 4) / 2, requiredConcepts: [] },
              { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: (itm.maxScore || 4) / 2, requiredConcepts: [] }
            ]
          }
        };
      } else if (itm.graderType === 'unordered_group_slot' && itm.groupId && !draftState.gradingKey.groups[itm.groupId]) {
        draftState.gradingKey.groups[itm.groupId] = {
          graderType: 'unordered_group_slot',
          expectedOptionIds: (itm.options || []).slice(0, 2).map(o => o.id)
        };
      }
    }
  }

  const renderItemCard = createQuestionRenderer({ draftState, collapsedCardKeys });

  function renderExerciseItems(block, blockIdx, exercise, exIdx) {
    const items = (block.items || []).filter(it => {
      if (it.exerciseId === exercise.exerciseId) return true;
      if (!it.exerciseId && exIdx === 0) {
        it.exerciseId = exercise.exerciseId;
        it.exerciseTitle = exercise.title || `Exercise ${exercise.exerciseNumber || 1}`;
        return true;
      }
      return false;
    });
    if (!items.length) {
      return `<div class="empty-items-notice">Chưa có câu hỏi nào trong bài tập này. Chọn một dạng câu hỏi bên dưới để thêm.</div>`;
    }
    return items.map(item => {
      const itemIdx = block.items.indexOf(item);
      return renderItemCard(item, itemIdx, block, blockIdx);
    }).join('');
  }

  function renderBlockExercises(block, blockIdx) {
    const exercises = block.exercises || [];
    return exercises.map((ex, exIdx) => {
      const exItems = (block.items || []).filter(it => it.exerciseId === ex.exerciseId);
      const exQuestionsCount = exItems.reduce((sum, itm) => sum + getItemSpanCount(itm), 0);
      const hasVariantItems = exItems.some(it => {
        const type = it.pedagogicalTypeCode || it.itemType;
        return ['vocabulary_pair', 'error_correction', 'sentence_transformation', 'sentence_reorder'].includes(type);
      });
      const isFirst = exIdx === 0;
      const isLast = exIdx === exercises.length - 1;
      const isOnly = exercises.length <= 1;

      const exCardKey = ex.exerciseId || `ex-${blockIdx}-${exIdx}`;
      const isExCollapsed = collapsedCardKeys.has(exCardKey);

      return `
        <div class="builder-exercise-card${isExCollapsed ? ' is-collapsed' : ''}" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
          <div class="builder-exercise-header">
            <div class="exercise-header-left">
              <button type="button" class="btn btn-icon btn-sm btn-toggle-exercise-collapse" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" title="Thu gọn / Mở rộng bài tập" aria-label="Thu gọn hoặc mở rộng bài tập" aria-expanded="${isExCollapsed ? 'false' : 'true'}">${isExCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline')}</button>
              <span class="exercise-badge">Exercise ${ex.exerciseNumber || (exIdx + 1)}</span>
              <input type="text" class="exercise-title-input form-control form-control-sm" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" value="${escapeHtml(ex.title || '')}" placeholder="Tiêu đề bài tập (Ví dụ: Nghe từ và chọn nghĩa)..." />
              <span class="badge badge-info exercise-items-count">${exQuestionsCount} câu hỏi</span>
            </div>
            <div class="exercise-header-actions">
              ${hasVariantItems ? `
                <button type="button" class="btn btn-secondary btn-sm btn-batch-generate-exercise-variants" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}" title="Tự động sinh biến thể đáp án cho toàn bộ câu hỏi trong bài tập này">
                  ${renderSvgIcon('zap', 'icon-inline')} <span>Sinh biến thể cả bài</span>
                </button>
              ` : ''}
              <button type="button" class="btn btn-secondary btn-sm btn-move-exercise-to-block" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}" title="Chuyển bài tập này sang Phần thi khác">
                ${renderSvgIcon('move', 'icon-inline')} <span>Chuyển sang Phần khác</span>
              </button>
              <button type="button" class="btn btn-icon btn-sm btn-move-exercise-up" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isFirst ? 'disabled' : ''} title="Di chuyển bài tập lên" aria-label="Di chuyển bài tập lên">${renderSvgIcon('arrowUp', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-exercise-down" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isLast ? 'disabled' : ''} title="Di chuyển bài tập xuống" aria-label="Di chuyển bài tập xuống">${renderSvgIcon('arrowDown', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-delete-exercise" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isOnly ? 'disabled' : ''} title="Xóa bài tập này" aria-label="Xóa bài tập này">${renderSvgIcon('close', 'icon-inline')}</button>
            </div>
          </div>
          <div class="builder-exercise-body">
            <div class="form-group exercise-field">
              <label class="form-label"><strong>Hướng dẫn làm bài tập (Exercise Instructions):</strong></label>
              <textarea class="form-control exercise-instructions-input" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" rows="2" placeholder="Ví dụ: Listen and note down the words/phrases you hear from the audio...">${escapeHtml(ex.instructions || '')}</textarea>
            </div>
            ${isComprehensionExercise(ex, block, draftState.gradingKey) ? `
            <div class="form-group exercise-field exercise-reference-context-field" style="margin-top: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                <label class="form-label" style="margin: 0; font-size: 0.82rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 6px;">
                  ${renderSvgIcon('book', 'icon-inline')}
                  <span>Ngữ cảnh bài đọc / Script tham chiếu chung cho AI:</span>
                  <span class="badge badge-info" style="font-size: 0.72rem; padding: 2px 6px;">Ẩn với học viên</span>
                </label>
                <button type="button" class="btn btn-secondary btn-sm btn-pull-exercise-cloze-script" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" title="Tự động lấy đoạn văn từ bài Điền từ nội tuyến hoặc bài nghe phía trước">
                  ${renderSvgIcon('clipboard', 'icon-inline')} Lấy Script từ bài Điền từ phía trước
                </button>
              </div>
              <textarea class="form-control form-control-sm exercise-reference-context-input" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" rows="3" placeholder="Dán đoạn văn bài đọc hoặc Script bài nghe dùng chung cho các câu hỏi Đọc hiểu Khối 03 trong bài này... AI sẽ đối chiếu văn bản này khi chấm các câu hỏi tự luận con.">${escapeHtml(ex.referenceContext || '')}</textarea>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">
                ${renderSvgIcon('lock', 'icon-inline')} <strong>Dùng chung toàn bài tập:</strong> Các câu hỏi Tự luận AI bên dưới sẽ tự động kế thừa ngữ cảnh này, không cần dán lặp lại ở từng câu hỏi.
              </div>
            </div>
            ` : ''}
            <div class="exercise-items-list block-items-list" data-exercise-id="${ex.exerciseId}" data-block-idx="${blockIdx}">
              ${renderExerciseItems(block, blockIdx, ex, exIdx)}
            </div>
            <div class="exercise-add-item-bar block-add-item-bar">
              <span class="add-item-caption">+ Thêm câu hỏi vào Exercise ${ex.exerciseNumber || (exIdx + 1)}:</span>
              <div class="add-item-buttons">
                <button type="button" class="btn btn-secondary btn-sm btn-add-listening-order" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Sắp xếp thứ tự nghe (Listening Order)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-error-correction" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Tìm và sửa lỗi (Error Correction)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-sentence-reorder" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Sắp xếp câu (Sentence Reorder)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-single-choice" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Trắc nghiệm (Single Choice)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-multi-group" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Nhóm chọn nhiều (Multi-Select Group)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-fitb btn-add-short-text" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Điền ô trống (Short Text)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-inline-cloze" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Điền từ nội tuyến (Inline Cloze)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-pictorial" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Thẻ từ vựng qua ảnh (Pictorial)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-vocab-pair" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Cặp từ vựng (Vocabulary Pair)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-rubric-async" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Tự luận chấm AI (AI Rubric)
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderBlockItems(block, blockIdx) {
    return renderBlockExercises(block, blockIdx);
  }

  function render() {
    if (isDisposed) return;
    for (const cleanup of renderCycleCleanups) {
      try { cleanup(); } catch (_) {}
    }
    renderCycleCleanups = [];
    const isImmutable = draftState.submissionCount > 0;
    const isPublished = draftState.status === 'published';
    const statusBadgeClass = isPublished ? 'badge-published' : 'badge-draft';
    const statusBadgeText = isPublished ? 'Đã công bố' : 'Bản nháp';

    const totalExamQuestions = draftState.blocks.reduce((sum, b) => {
      return sum + (b.items || []).reduce((s, itm) => s + getItemSpanCount(itm), 0);
    }, 0);

    activeBlockIdx = Math.max(0, Math.min(activeBlockIdx, draftState.blocks.length - 1));

    const blocksHtml = draftState.blocks.map((block, index) => {
      const isFirst = index === 0;
      const isLast = index === draftState.blocks.length - 1;
      const isOnly = draftState.blocks.length <= 1;
      const audioVal = block.audioUrl || block.stimulusAudioUrl || '';
      const readingVal = block.readingPassage || block.stimulusReadingPassage || '';
      const itemsCount = (block.items || []).reduce((sum, itm) => sum + getItemSpanCount(itm), 0);
      const blockCardKey = block.blockId || `b-${index}`;
      const isBlockCollapsed = collapsedCardKeys.has(blockCardKey);
      const isActiveBlock = index === activeBlockIdx;

      return `
        <div class="builder-block-card${isBlockCollapsed ? ' is-collapsed' : ''}${isActiveBlock ? ' active-block-tab' : ''}" id="builder-block-${index}" data-block-id="${block.blockId}" data-index="${index}" style="${isActiveBlock ? 'display: block;' : 'display: none;'}">
          <div class="builder-block-header">
            <button type="button" class="btn btn-icon btn-sm btn-toggle-block-collapse" data-index="${index}" title="Thu gọn / Mở rộng phần thi" aria-label="Thu gọn hoặc mở rộng phần thi" aria-expanded="${isBlockCollapsed ? 'false' : 'true'}">${isBlockCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline')}</button>
            <div class="block-checkpoint-pill">Phần ${index + 1}</div>
            <input type="text" class="block-title-input form-control" data-index="${index}" value="${escapeHtml(block.title || '')}" placeholder="Tiêu đề phần thi..." />
            <div class="block-header-actions">
              <button type="button" class="btn btn-icon btn-sm btn-move-block-up" data-index="${index}" ${isFirst ? 'disabled' : ''} title="Di chuyển lên" aria-label="Di chuyển lên">${renderSvgIcon('arrowUp', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-block-down" data-index="${index}" ${isLast ? 'disabled' : ''} title="Di chuyển xuống" aria-label="Di chuyển xuống">${renderSvgIcon('arrowDown', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-delete-block" data-index="${index}" ${isOnly ? 'disabled' : ''} title="Xóa phần này" aria-label="Xóa phần này">${renderSvgIcon('close', 'icon-inline')}</button>
            </div>
          </div>
          <div class="builder-block-body">
            <div class="form-group block-field">
              <label class="form-label">Hướng dẫn phần thi (Instructions):</label>
              <textarea class="form-control block-instructions-input" data-index="${index}" rows="3" placeholder="Nhập hướng dẫn làm bài cho phần này...">${escapeHtml(block.instructions || '')}</textarea>
            </div>
            <div class="form-group block-field">
              <label class="form-label">File âm thanh (Audio URL / Path):</label>
              <div class="audio-input-with-preview" style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="form-control block-audio-input" data-index="${index}" value="${escapeHtml(audioVal)}" placeholder="https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/... hoặc assets/34/test-1/listening.mp3" style="flex:1;" />
                <button type="button" class="btn btn-secondary btn-sm btn-preview-audio" data-target="block" data-index="${index}" title="Nghe thử file âm thanh">
                  ${renderSvgIcon('play', 'icon-inline')} Nghe thử
                </button>
              </div>
              <div class="form-hint audio-guide-hint" style="font-size:0.78rem; color:#64748b; margin-top:4px;">Chỉ sử dụng link âm thanh Cloudflare R2 (hoặc assets/). Không hỗ trợ link Google Drive cho bài nghe.</div>
              <div class="audio-drive-warning text-danger" style="${(audioVal.includes('drive.google.com') || audioVal.includes('docs.google.com')) ? 'display:block;' : 'display:none;'} color:var(--izone-primary, #db0829); font-size:0.8rem; margin-top:4px;">Hệ thống không hỗ trợ link Google Drive cho bài nghe. Vui lòng sử dụng link Cloudflare R2 hoặc assets/.</div>
            </div>
            <div class="form-group block-field">
              <label class="form-label">Đoạn văn đọc hiểu (Reading Passage):</label>
              <textarea class="form-control block-reading-input" data-index="${index}" rows="8" placeholder="Dán văn bản đọc hiểu (nếu có)...">${escapeHtml(readingVal)}</textarea>
            </div>

            <div class="block-items-section">
              <div class="block-items-header-bar">
                <h4>Danh sách bài tập & câu hỏi (${itemsCount} câu · ${(block.exercises || []).length} bài tập)</h4>
              </div>
              <div class="block-exercises-container block-items-list" data-block-idx="${index}">
                ${renderBlockExercises(block, index)}
              </div>
              <div class="block-exercise-actions" style="margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline-primary btn-add-exercise" data-block-idx="${index}">
                  + Thêm bài tập (Exercise)
                </button>
                <button type="button" class="btn btn-secondary btn-import-block-csv" data-block-idx="${index}" title="Nhập toàn bộ các bài tập trong Phần này từ file CSV">
                  ${renderSvgIcon('upload', 'icon-inline')} <span>Nhập CSV các bài tập (Block CSV)</span>
                </button>
              </div>
            </div>

            <div class="block-tab-footer-nav" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div>
                ${index > 0 ? `
                  <button type="button" class="btn btn-outline-secondary btn-sm btn-prev-block" data-target-idx="${index - 1}">
                    ← Phần ${index}: ${escapeHtml(draftState.blocks[index - 1]?.title || `Phần ${index}`)}
                  </button>
                ` : '<span></span>'}
              </div>
              <div>
                ${index < draftState.blocks.length - 1 ? `
                  <button type="button" class="btn btn-outline-primary btn-sm btn-next-block" data-target-idx="${index + 1}">
                    Phần ${index + 2}: ${escapeHtml(draftState.blocks[index + 1]?.title || `Phần ${index + 2}`)} →
                  </button>
                ` : '<span></span>'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const savedWindowScrollY = (typeof window !== 'undefined')
      ? (window.scrollY ?? window.pageYOffset ?? (typeof document !== 'undefined' ? document.documentElement?.scrollTop : 0) ?? 0)
      : 0;
    const savedContainerScrollTop = container ? (container.scrollTop || 0) : 0;

    container.innerHTML = `
      <div class="test-builder-workspace">
        <div class="test-builder-top-bar">
          <div class="builder-top-left">
            <button type="button" class="btn btn-secondary btn-sm btn-back-to-catalog" id="btn-back-to-catalog">
              ${renderSvgIcon('arrowLeft', 'icon-inline')} <span>Quay lại danh mục</span>
            </button>
            <div class="builder-status-tags">
              <span class="version-tag">Phiên bản: <strong>v${draftState.version}</strong></span>
              <span class="status-badge ${statusBadgeClass}">${statusBadgeText}</span>
              <span class="total-questions-tag">Tổng cộng: <strong>${totalExamQuestions} câu hỏi</strong></span>
              ${isImmutable
                ? `<span class="immutability-badge warning" title="Đã có học viên nộp bài — Chỉnh sửa sẽ tạo bản nháp mới v${draftState.version + 1}">${renderSvgIcon('lock', 'icon-inline')} Đã có ${draftState.submissionCount} bài nộp</span>`
                : `<span class="immutability-badge mutable" title="Chưa có học viên nộp bài — Sẽ lưu trực tiếp trên bản nháp v${draftState.version}">${renderSvgIcon('edit', 'icon-inline')} Chưa có bài nộp</span>`
              }
            </div>
          </div>
          <div class="builder-top-right">
            <span class="builder-status-msg" id="builder-status-msg" aria-live="polite"></span>
            <div class="builder-actions-group">
              <button type="button" class="btn btn-secondary btn-sm btn-preview-test" id="btn-preview-test" title="Xem trước giao diện bài thi của học sinh">
                ${renderSvgIcon('view', 'icon-inline')} <span class="btn-text">Xem trước bài thi</span>
              </button>
              ${!isPublished && !isImmutable ? `
                <button type="button" class="btn btn-outline-danger btn-sm btn-delete-draft-workspace" id="btn-delete-draft-workspace" title="Xóa bản nháp này">
                  ${renderSvgIcon('trash', 'icon-inline')} <span class="btn-text">Xóa bản nháp</span>
                </button>
              ` : ''}
              <button type="button" class="btn btn-primary btn-save-draft" id="btn-save-draft">
                ${renderSvgIcon('save', 'icon-inline')} <span class="btn-text">Lưu bản nháp</span>
              </button>
              <button type="button" class="btn btn-success btn-sm btn-publish-test" id="btn-publish-test" title="Công bố đề thi cho các lớp">
                ${renderSvgIcon('publish', 'icon-inline')} <span class="btn-text">Công bố đề thi</span>
              </button>
            </div>
          </div>
        </div>

        ${renderScoreBreakdownBarHtml(draftState)}

        ${isImmutable ? `
          <div class="alert-notice alert-immutable">
            <div class="notice-icon">${renderSvgIcon('alert', 'icon-inline')}</div>
            <div class="notice-text">
              <strong>Bảo toàn tính bất biến (Content Immutability):</strong> Đề thi này đã có <strong>${draftState.submissionCount} bài nộp</strong>. Khi bạn lưu thay đổi, hệ thống sẽ tự động tạo một phiên bản nháp mới (<strong>v${draftState.version + 1}</strong>) để giữ nguyên vẹn kết quả và dữ liệu chấm điểm của các bài thi đã nộp.
            </div>
          </div>
        ` : ''}

        <div class="test-builder-main">
          <div class="builder-settings-card panel">
            <div class="settings-grid">
              <div class="form-group setting-title-group">
                <label class="form-label" for="builder-test-title">Tên bài thi:</label>
                <input type="text" id="builder-test-title" class="form-control" value="${escapeHtml(draftState.title)}" placeholder="Nhập tên bài thi..." />
              </div>
              <div class="form-group setting-phase-group">
                <label class="form-label" for="builder-test-phase">Giai đoạn (Phase):</label>
                <select id="builder-test-phase" class="form-select">
                  <option value="" ${!draftState.phase ? 'selected' : ''}>Không phân Phase (Tổng hợp)</option>
                  <option value="1" ${Number(draftState.phase) === 1 ? 'selected' : ''}>Phase 1</option>
                  <option value="2" ${Number(draftState.phase) === 2 ? 'selected' : ''}>Phase 2</option>
                </select>
              </div>
              <div class="form-group setting-session-group">
                <label class="form-label" for="builder-test-session">Buổi học (Session):</label>
                <input type="number" id="builder-test-session" class="form-control" value="${draftState.sessionNumber || ''}" min="1" placeholder="Ví dụ: 1" />
              </div>
              <div class="form-group setting-duration-group">
                <label class="form-label" for="builder-test-duration">Thời lượng (phút):</label>
                <input type="number" id="builder-test-duration" class="form-control" value="${draftState.durationMinutes}" min="5" max="300" />
              </div>
              <div class="form-group setting-policy-group">
                <label class="form-label" for="builder-test-policy">Công bố đáp án:</label>
                <select id="builder-test-policy" class="form-select">
                  <option value="hidden" ${draftState.answerReleasePolicy === 'hidden' ? 'selected' : ''}>Ẩn đáp án (hidden)</option>
                  <option value="immediate" ${draftState.answerReleasePolicy === 'immediate' ? 'selected' : ''}>Hiện ngay khi nộp (immediate)</option>
                  <option value="teacher_release" ${draftState.answerReleasePolicy === 'teacher_release' ? 'selected' : ''}>Giáo viên công bố (teacher_release)</option>
                </select>
              </div>
            </div>
          </div>

          ${renderBlocksNavCardHtml(draftState.blocks, activeBlockIdx)}

          <div class="builder-blocks-section">
            <div class="blocks-section-header">
              <div class="blocks-title-wrap">
                <h3>Nội dung phần thi đang chọn (${draftState.blocks.length} phần · ${totalExamQuestions} câu hỏi)</h3>
                <p class="subtitle">Mỗi phần thi (Block) đại diện cho một chặng bài làm với âm thanh, bài đọc hoặc hướng dẫn riêng.</p>
              </div>
              <div class="blocks-header-actions-group">
                <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-collapse-all" title="Thu gọn toàn bộ bài tập trong phần thi này">
                  Thu gọn bài tập
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-expand-all" title="Mở rộng toàn bộ bài tập trong phần thi này">
                  Mở rộng bài tập
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-block">
                  + Thêm phần thi (Block)
                </button>
              </div>
            </div>

            <div class="builder-blocks-list" id="builder-blocks-list">
              ${blocksHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: savedWindowScrollY, behavior: 'instant' });
    }
    if (container && typeof savedContainerScrollTop === 'number') {
      container.scrollTop = savedContainerScrollTop;
    }
  }

  function jumpToBlock(bIdx) {
    if (typeof bIdx !== 'number' || isNaN(bIdx)) return;
    if (typeof container.querySelector !== 'function') return;

    if (activeBlockIdx !== bIdx) {
      syncInputs();
      activeBlockIdx = Math.max(0, Math.min(bIdx, Math.max(0, draftState.blocks.length - 1)));
      render();
    }

    const card = container.querySelector(`#builder-block-${activeBlockIdx}`) ||
                 container.querySelector(`.builder-block-card[data-index="${activeBlockIdx}"]`);
    if (!card) return;

    const block = draftState.blocks[activeBlockIdx];
    const blockCardKey = (block && block.blockId) || (card.getAttribute && card.getAttribute('data-block-id')) || `b-${activeBlockIdx}`;

    // 1. If block is collapsed, expand it so teacher can view/edit immediately
    if (card.classList && card.classList.contains('is-collapsed')) {
      card.classList.remove('is-collapsed');
      collapsedCardKeys.delete(blockCardKey);
      const toggleBtn = card.querySelector('.btn-toggle-block-collapse');
      if (toggleBtn) {
        toggleBtn.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
        if (typeof toggleBtn.setAttribute === 'function') {
          toggleBtn.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // 2. Smoothly scroll into view
    if (typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 3. Highlight animation pulse
    if (card.classList) {
      card.classList.remove('block-target-highlight');
      if (typeof card.offsetWidth === 'number') {
        void card.offsetWidth;
      }
      card.classList.add('block-target-highlight');
      setTimeout(() => {
        if (card.classList) card.classList.remove('block-target-highlight');
      }, 1600);
    }
  }

  function updateScoreBreakdownBar() {
    const barEl = container.querySelector('#builder-score-breakdown-bar');
    const summary = computeTestBuilderScoreSummary(draftState.blocks);
    if (barEl) {
      const scoreValEl = barEl.querySelector('.score-total-val');
      if (scoreValEl) scoreValEl.textContent = summary.totalScore;
      const qValEl = barEl.querySelector('.score-total-questions');
      if (qValEl) qValEl.textContent = `${summary.totalQuestions} câu hỏi`;

      const chipsWrap = barEl.querySelector('.score-skills-chips');
      if (chipsWrap) {
        chipsWrap.innerHTML = renderScoreSkillChipsHtml(summary.skills);
      }

      const newSkillChips = barEl.querySelectorAll('.score-skill-chip[data-first-block-idx]');
      if (newSkillChips && typeof newSkillChips.forEach === 'function') {
        newSkillChips.forEach(chip => {
          if (typeof chip.addEventListener === 'function') {
            chip.addEventListener('click', (e) => {
              e.preventDefault();
              const bIdx = Number(chip.getAttribute('data-first-block-idx'));
              if (!isNaN(bIdx)) jumpToBlock(bIdx);
            });
          }
        });
      }
    }

    const navCardEl = container.querySelector('#builder-blocks-nav-card');
    if (navCardEl) {
      const chipsWrap = navCardEl.querySelector('.blocks-nav-chips');
      if (chipsWrap) {
        chipsWrap.innerHTML = renderBlockJumpTagsHtml(draftState.blocks, activeBlockIdx);
      }
      const newJumpChips = navCardEl.querySelectorAll('.btn-block-jump-chip');
      if (newJumpChips && typeof newJumpChips.forEach === 'function') {
        newJumpChips.forEach(chip => {
          if (typeof chip.addEventListener === 'function') {
            chip.addEventListener('click', (e) => {
              e.preventDefault();
              const bIdx = Number(chip.getAttribute('data-block-idx'));
              if (!isNaN(bIdx)) jumpToBlock(bIdx);
            });
          }
        });
      }
    }

    const totalQTag = container.querySelector('.total-questions-tag strong');
    if (totalQTag) totalQTag.textContent = `${summary.totalQuestions} câu hỏi`;
  }

  const syncInputs = createDraftInputSync({ container, draftState, updateScoreBreakdownBar, hasUnsavedChanges });

  function getNextPosition() {
    let nextPos = 1;
    for (const b of draftState.blocks) {
      for (const itm of b.items || []) {
        const span = getItemSpanCount(itm);
        const endPos = (typeof itm.position === 'number') ? (itm.position + span) : nextPos;
        if (endPos >= nextPos) {
          nextPos = endPos;
        }
      }
    }
    return nextPos;
  }

  function bindEvents() {
    const authoringHost = { container, draftState, builderOwner, actions: { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } };
    if (typeof container.querySelector !== 'function') return;

    // Live update Score Breakdown Bar and mark dirty when question or rubric criterion score changes
    if (typeof container.addEventListener === 'function') {
      const onContainerInput = (e) => {
        if (isDisposed) return;
        markAsDirty();
        if (e?.target?.classList?.contains('item-max-score-input')) {
          const iCard = e.target.closest ? e.target.closest('.builder-item-card') : null;
          const bIdx = Number(e.target.getAttribute('data-block-idx'));
          const iIdx = Number(e.target.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (item && item.graderType === 'rubric_async') {
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            const newScore = parseFloat(e.target.value);
            if (currentKey && currentKey.rubric && Number.isFinite(newScore) && newScore > 0) {
              const scaled = scaleRubricCriteriaScores(currentKey.rubric.criteria || [], newScore);
              currentKey.rubric.criteria = scaled;
              currentKey.rubric.maxScore = newScore;
              item.maxScore = newScore;
              if (iCard) {
                const critInputs = iCard.querySelectorAll('.criterion-max-score-input');
                critInputs.forEach((inp, idx) => {
                  if (scaled[idx]) inp.value = scaled[idx].maxScore;
                });
              }
            }
          }
          syncInputs();
        } else if (e?.target?.classList?.contains('criterion-max-score-input')) {
          syncInputs();
        }
        if (e?.target?.classList?.contains('block-audio-input')) {
          const val = e.target.value || '';
          const parent = e.target.closest ? e.target.closest('.block-field') : null;
          const warningEl = parent && parent.querySelector ? parent.querySelector('.audio-drive-warning') : null;
          if (warningEl && warningEl.style) {
            const hasDrive = val.includes('drive.google.com') || val.includes('docs.google.com');
            warningEl.style.display = hasDrive ? 'block' : 'none';
          }
        }
      };
      const onContainerChange = () => {
        if (isDisposed) return;
        markAsDirty();
      };
      container.addEventListener('input', onContainerInput);
      container.addEventListener('change', onContainerChange);
      renderCycleCleanups.push(() => {
        container.removeEventListener?.('input', onContainerInput);
        container.removeEventListener?.('change', onContainerChange);
      });
    }

    const backBtn = container.querySelector('#btn-back-to-catalog');
    if (backBtn && typeof backBtn.addEventListener === 'function') {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isDirty) {
          openUnsavedChangesModal({ owner: builderOwner,
            onDiscard: () => {
              isDirty = false;
              handle?.dispose();
              if (typeof options.onBack === 'function') options.onBack();
            },
            onStay: () => {
              // User chooses to stay and continue editing
            }
          });
          return;
        }
        handle?.dispose();
        if (typeof options.onBack === 'function') options.onBack();
      });
    }

    // Quick jump to block via Block chips or Skill chips in Score Breakdown bar
    const blockJumpChips = container.querySelectorAll('.btn-block-jump-chip');
    if (blockJumpChips && typeof blockJumpChips.forEach === 'function') {
      blockJumpChips.forEach(chip => {
        if (typeof chip.addEventListener === 'function') {
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            const bIdx = Number(chip.getAttribute('data-block-idx'));
            if (!isNaN(bIdx)) jumpToBlock(bIdx);
          });
        }
      });
    }

    const skillChipsWithJump = container.querySelectorAll('.score-skill-chip[data-first-block-idx]');
    if (skillChipsWithJump && typeof skillChipsWithJump.forEach === 'function') {
      skillChipsWithJump.forEach(chip => {
        if (typeof chip.addEventListener === 'function') {
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            const bIdx = Number(chip.getAttribute('data-first-block-idx'));
            if (!isNaN(bIdx)) jumpToBlock(bIdx);
          });
        }
      });
    }

    // Import Block CSV (All Exercises in Block)
    const importBlockCsvBtns = container.querySelectorAll('.btn-import-block-csv');
    importBlockCsvBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;

        openBlockCsvUploadModal({ owner: builderOwner,
          block,
          blockIdx: bIdx,
          onImport: ({ mode, exercises }) => {
            if (!exercises || !exercises.length) return;

            if (mode === 'overwrite') {
              (block.items || []).forEach(it => {
                if (it.itemVersionId) {
                  delete draftState.gradingKey.items[it.itemVersionId];
                }
              });
              block.exercises = [];
              block.items = [];
            }

            block.exercises = block.exercises || [];
            block.items = block.items || [];

            exercises.forEach((parsedEx) => {
              const newExId = generateUuid();
              const newExNumber = block.exercises.length + 1;
              const targetEx = {
                exerciseId: newExId,
                exerciseNumber: newExNumber,
                title: parsedEx.title || `Exercise ${newExNumber}`,
                instructions: parsedEx.instructions || ''
              };
              block.exercises.push(targetEx);

              const startingPos = getNextPosition();
              const batchItems = [];

              (parsedEx.items || []).forEach((parsedItem, idx) => {
                const newItemId = generateUuid();
                const itemScore = parsedItem.maxScore != null && !isNaN(parsedItem.maxScore) && parsedItem.maxScore > 0 ? parsedItem.maxScore : 1;
                const itmObj = {
                  itemFamilyId: generateUuid(),
                  itemVersionId: newItemId,
                  position: startingPos + idx,
                  exerciseId: targetEx.exerciseId,
                  exerciseTitle: targetEx.title,
                  prompt: parsedItem.prompt,
                  helpText: parsedItem.helpText || '',
                  interactionType: parsedItem.interactionType || 'short_text',
                  pedagogicalTypeCode: parsedItem.pedagogicalTypeCode || 'short_text',
                  layoutType: parsedItem.layoutType || 'default',
                  graderType: parsedItem.graderType || 'accepted_text',
                  required: true,
                  maxScore: itemScore,
                  options: parsedItem.options || [],
                  skillCodes: [],
                  releasePolicy: 'inherit'
                };

                if (parsedItem.pedagogicalTypeCode === 'sentence_reorder') {
                  itmObj.tokens = parsedItem.tokens;
                  itmObj.distractors = parsedItem.distractors || [];
                  itmObj.targetSentence = parsedItem.targetSentence;
                } else if (parsedItem.pedagogicalTypeCode === 'sentence_rewrite') {
                  itmObj.mandatoryKeyword = parsedItem.mandatoryKeyword;
                  itmObj.targetSentence = parsedItem.targetSentence;
                } else if (parsedItem.pedagogicalTypeCode === 'error_correction' || parsedItem.interactionType === 'correction_pair' || parsedItem.graderType === 'correction_pair') {
                  const errs = (parsedItem.expectedErrors && parsedItem.expectedErrors.length)
                    ? parsedItem.expectedErrors
                    : (parsedItem.targetWord ? [parsedItem.targetWord] : ['error']);
                  const corrs = (parsedItem.expectedCorrections && parsedItem.expectedCorrections.length)
                    ? parsedItem.expectedCorrections
                    : (parsedItem.accepted && parsedItem.accepted.length ? parsedItem.accepted : ['correction']);
                  itmObj.targetWord = parsedItem.targetWord || errs[0];
                  itmObj.expectedErrors = errs;
                  itmObj.expectedCorrections = corrs;
                  itmObj.accepted = corrs;
                  itmObj.scoringRule = parsedItem.scoringRule || 'split_points';
                  itmObj.interactionType = 'correction_pair';
                  itmObj.pedagogicalTypeCode = 'error_correction';
                  itmObj.graderType = 'correction_pair';
                  itmObj.layoutType = 'correction_inline';
                } else if (parsedItem.pedagogicalTypeCode === 'pictorial_vocabulary') {
                  itmObj.image = parsedItem.image;
                  itmObj.targetWord = parsedItem.targetWord;
                  itmObj.captionHint = parsedItem.captionHint || '';
                  itmObj.letterHint = generateHangmanHint(parsedItem.targetWord);
                } else if (parsedItem.pedagogicalTypeCode === 'pronunciation_choice') {
                  itmObj.targetWord = parsedItem.targetWord || '';
                } else if (parsedItem.pedagogicalTypeCode === 'listening_order') {
                  itmObj.listeningEvents = parsedItem.listeningEvents || [];
                  itmObj.events = parsedItem.events || [];
                } else if (parsedItem.pedagogicalTypeCode === 'vocabulary_pair' || parsedItem.interactionType === 'text_select_pair') {
                  itmObj.targetWord = parsedItem.targetWord || parsedItem.prompt;
                  itmObj.options = parsedItem.options || [];
                  itmObj.captionHint = parsedItem.captionHint || parsedItem.vietnameseMeaning || '';
                }

                batchItems.push(itmObj);

                if (parsedItem.graderType === 'exact_option') {
                  draftState.gradingKey.items[newItemId] = {
                    graderType: 'exact_option',
                    expectedOptionId: parsedItem.expectedOptionId || 'A'
                  };
                  if (parsedItem.pedagogicalTypeCode === 'listening_order') {
                    draftState.gradingKey.items[newItemId].events = itmObj.events;
                  }
                } else if (parsedItem.graderType === 'rubric_async') {
                  draftState.gradingKey.items[newItemId] = {
                    graderType: 'rubric_async',
                    rubricCode: parsedItem.rubricCode || 'rubric_async_custom',
                    rubricVersion: 1,
                    rubric: parsedItem.rubric || {
                      scoringVersion: 'rubric_async_custom',
                      maxScore: itemScore,
                      criteria: [
                        { id: 'crit_1', label: 'Ý nghĩa & Nội dung', maxScore: itemScore / 2, requiredConcepts: [] },
                        { id: 'crit_2', label: 'Ngữ pháp & Diễn đạt', maxScore: itemScore / 2, requiredConcepts: [] }
                      ]
                    }
                  };
                } else if (parsedItem.graderType === 'accepted_text_exact_option' || parsedItem.interactionType === 'text_select_pair' || parsedItem.pedagogicalTypeCode === 'vocabulary_pair') {
                  draftState.gradingKey.items[newItemId] = {
                    graderType: 'accepted_text_exact_option',
                    accepted: expandSentenceVariants([itmObj.targetWord || itmObj.prompt || '']),
                    expectedOptionId: parsedItem.expectedOptionId || (itmObj.options?.[0]?.id || 'meaning-01'),
                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                  };
                } else if (parsedItem.graderType === 'inline_cloze' || parsedItem.layoutType === 'inline_cloze') {
                  itmObj.clozeAnswers = parsedItem.clozeAnswers || {};
                  draftState.gradingKey.items[newItemId] = {
                    graderType: 'inline_cloze',
                    blanks: itmObj.clozeAnswers,
                    accepted: parsedItem.accepted || [itmObj.targetWord || ''],
                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                  };
                } else if (parsedItem.graderType === 'correction_pair' || parsedItem.pedagogicalTypeCode === 'error_correction' || parsedItem.interactionType === 'correction_pair') {
                  const errs = itmObj.expectedErrors || (parsedItem.targetWord ? [parsedItem.targetWord] : ['error']);
                  const corrs = itmObj.expectedCorrections || (parsedItem.accepted && parsedItem.accepted.length ? parsedItem.accepted : ['correction']);
                  draftState.gradingKey.items[newItemId] = {
                    graderType: 'correction_pair',
                    expectedErrors: errs,
                    expectedCorrections: corrs,
                    accepted: corrs,
                    scoringRule: parsedItem.scoringRule || 'split_points',
                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                  };
                } else {
                  draftState.gradingKey.items[newItemId] = {
                    graderType: 'accepted_text',
                    accepted: parsedItem.accepted || [parsedItem.targetAnswer || ''],
                    normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                  };
                  if (parsedItem.pedagogicalTypeCode === 'sentence_reorder') {
                    draftState.gradingKey.items[newItemId].tokens = parsedItem.tokens;
                    draftState.gradingKey.items[newItemId].distractors = parsedItem.distractors || [];
                  } else if (parsedItem.pedagogicalTypeCode === 'sentence_rewrite') {
                    draftState.gradingKey.items[newItemId].keyword = parsedItem.mandatoryKeyword;
                  } else if (parsedItem.pedagogicalTypeCode === 'error_correction') {
                    draftState.gradingKey.items[newItemId].targetWord = parsedItem.targetWord;
                  }
                }
              });

              insertItemsIntoBlockExercise(block, targetEx, batchItems);
            });

            resequenceItemPositions();
            markAsDirty();
            render();
          }
        });
      });
    });

    // Add Exercise to block
    const addExerciseBtns = container.querySelectorAll('.btn-add-exercise');
    addExerciseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        if (!Array.isArray(block.exercises)) block.exercises = [];
        const nextExNum = block.exercises.length + 1;
        const newExId = generateUuid();
        block.exercises.push({
          exerciseId: newExId,
          exerciseNumber: nextExNum,
          title: `Bài tập ${nextExNum}`,
          instructions: '',
          audioUrl: null,
          readingPassage: null,
          itemIds: []
        });
        render();
      });
    });

    // Batch Generate Exercise Vocab Variants
    const batchGenVariantBtns = container.querySelectorAll('.btn-batch-generate-exercise-variants');
    if (batchGenVariantBtns && typeof batchGenVariantBtns.forEach === 'function') {
      batchGenVariantBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block) return;
            const targetEx = resolveTargetExercise(block, btn);
            const count = batchGenerateExerciseVocabVariants(block, targetEx, draftState);
            markAsDirty();
            render();
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
              window.alert(`Đã tự động sinh biến thể đáp án cho ${count} câu hỏi Cặp từ vựng.`);
            }
          });
        }
      });
    }

    // Move Exercise Up
    const moveExUpBtns = container.querySelectorAll('.btn-move-exercise-up');
    moveExUpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const exIdx = Number(btn.getAttribute('data-exercise-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.exercises || exIdx <= 0) return;
        const temp = block.exercises[exIdx];
        block.exercises[exIdx] = block.exercises[exIdx - 1];
        block.exercises[exIdx - 1] = temp;
        block.exercises.forEach((ex, idx) => { ex.exerciseNumber = idx + 1; });
        const orderMap = new Map();
        block.exercises.forEach((ex, idx) => orderMap.set(ex.exerciseId, idx));
        (block.items || []).sort((a, b) => {
          const ordA = orderMap.get(a.exerciseId) ?? 999;
          const ordB = orderMap.get(b.exerciseId) ?? 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.position || 0) - (b.position || 0);
        });
        let pos = 1;
        for (const b of draftState.blocks) {
          for (const it of b.items || []) {
            it.position = pos++;
          }
        }
        render();
      });
    });

    // Move Exercise Down
    const moveExDownBtns = container.querySelectorAll('.btn-move-exercise-down');
    moveExDownBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const exIdx = Number(btn.getAttribute('data-exercise-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.exercises || exIdx >= block.exercises.length - 1) return;
        const temp = block.exercises[exIdx];
        block.exercises[exIdx] = block.exercises[exIdx + 1];
        block.exercises[exIdx + 1] = temp;
        block.exercises.forEach((ex, idx) => { ex.exerciseNumber = idx + 1; });
        const orderMap = new Map();
        block.exercises.forEach((ex, idx) => orderMap.set(ex.exerciseId, idx));
        (block.items || []).sort((a, b) => {
          const ordA = orderMap.get(a.exerciseId) ?? 999;
          const ordB = orderMap.get(b.exerciseId) ?? 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.position || 0) - (b.position || 0);
        });
        let pos = 1;
        for (const b of draftState.blocks) {
          for (const it of b.items || []) {
            it.position = pos++;
          }
        }
        render();
      });
    });

    // Delete Exercise
    const deleteExBtns = container.querySelectorAll('.btn-delete-exercise');
    deleteExBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const exIdx = Number(btn.getAttribute('data-exercise-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.exercises || block.exercises.length <= 1) return;
        const deletedEx = block.exercises[exIdx];
        if (!deletedEx) return;

        const exItems = (block.items || []).filter(it => it.exerciseId === deletedEx.exerciseId);
        if (exItems.length > 0) {
          const exTitle = deletedEx.title || `Bài tập ${exIdx + 1}`;
          const confirmMsg = `Bạn có chắc chắn muốn xóa "${exTitle}" cùng toàn bộ ${exItems.length} câu hỏi bên trong không? Thao tác này không thể hoàn tác.`;
          if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            if (!window.confirm(confirmMsg)) return;
          }
        }

        // Perform exercise and child questions deletion
        deleteExerciseFromBlock(draftState, { blockIdx: bIdx, exerciseIdx: exIdx });
        markAsDirty();
        render();
      });
    });

    // Move Exercise to another Block
    const moveExToBlockBtns = container.querySelectorAll('.btn-move-exercise-to-block');
    if (moveExToBlockBtns && typeof moveExToBlockBtns.forEach === 'function') {
      moveExToBlockBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const exId = btn.getAttribute('data-exercise-id');
            const block = draftState.blocks[bIdx];
            if (!block || !exId) return;

            openMoveExerciseModal({
              draftState,
              sourceBlockIdx: bIdx,
              exerciseId: exId,
              owner: builderOwner,
              onConfirm: ({ targetBlockIdx, insertIndex }) => {
                const moved = moveExerciseBetweenBlocks(draftState, {
                  sourceBlockIdx: bIdx,
                  exerciseId: exId,
                  targetBlockIdx,
                  insertIndex
                });
                if (moved) {
                  activeBlockIdx = targetBlockIdx;
                  resequenceItemPositions();
                  markAsDirty();
                  render();
                  setTimeout(() => {
                    const exCard = container.querySelector(`.builder-exercise-card[data-exercise-id="${exId}"]`);
                    if (exCard) {
                      if (typeof exCard.scrollIntoView === 'function') {
                        exCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                      if (exCard.classList) {
                        exCard.classList.add('block-target-highlight');
                        setTimeout(() => {
                          if (exCard.classList) exCard.classList.remove('block-target-highlight');
                        }, 2000);
                      }
                    }
                  }, 50);
                }
              }
            });
          });
        }
      });
    }

    let currentPreviewAudio = null;
    let currentPreviewBtn = null;

    const previewAudioBtns = container.querySelectorAll('.btn-preview-audio');
    if (previewAudioBtns && typeof previewAudioBtns.forEach === 'function') {
      previewAudioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const inputWrap = btn.closest('.audio-input-with-preview');
          const inputEl = inputWrap?.querySelector('input[type="text"]');
          if (!inputEl) return;
          const rawUrl = inputEl.value.trim();
          if (!rawUrl) {
            alert('Vui lòng nhập đường dẫn file âm thanh hoặc link Google Drive trước khi nghe thử.');
            return;
          }

          const streamUrl = convertGoogleDriveAudioUrl(rawUrl);
          if (inputEl.value !== streamUrl) {
            inputEl.value = streamUrl;
          }

          let playUrl = streamUrl;
          const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (driveMatch) {
            const fileId = driveMatch[1];
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
            const apiBase = isLocal ? `${window.location.protocol}//${window.location.hostname}:8788` : '';
            playUrl = `${apiBase}/api/teacher/media/drive-stream?id=${encodeURIComponent(fileId)}`;
          }

          if (currentPreviewAudio && !currentPreviewAudio.paused && currentPreviewBtn === btn) {
            currentPreviewAudio.pause();
            btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
            return;
          }

          if (currentPreviewAudio) {
            currentPreviewAudio.pause();
            if (currentPreviewBtn) {
              currentPreviewBtn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
            }
          }

          if (typeof Audio !== 'undefined') {
            currentPreviewAudio = new Audio(playUrl);
            currentPreviewBtn = btn;
            btn.innerHTML = `${renderSvgIcon('pause', 'icon-inline')} Tạm dừng`;

            currentPreviewAudio.addEventListener('ended', () => {
              btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
            });

            currentPreviewAudio.addEventListener('error', () => {
              btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
              alert('Không thể phát file âm thanh. Nếu dùng link Google Drive, vui lòng đảm bảo file đã được cài đặt quyền "Bất kỳ ai có đường liên kết đều có thể xem".');
            });

            currentPreviewAudio.play().catch(err => {
              btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
              console.warn('Playback error:', err);
            });
          }
        });
      });
    }

    const addBlockBtn = container.querySelector('#btn-add-block');
    if (addBlockBtn && typeof addBlockBtn.addEventListener === 'function') {
      addBlockBtn.addEventListener('click', () => {
        syncInputs();
        const nextIdx = draftState.blocks.length + 1;
        const nextPos = getNextPosition();
        const initialItemId = generateUuid();
        const initialExId = generateUuid();

        draftState.blocks.push({
          blockId: generateUuid(),
          checkpoint: nextIdx,
          title: `Phần ${nextIdx}`,
          instructions: '',
          audioUrl: null,
          readingPassage: null,
          stimulusAudioUrl: null,
          stimulusReadingPassage: null,
          exercises: [
            {
              exerciseId: initialExId,
              exerciseNumber: 1,
              title: `Bài tập 1: Phần ${nextIdx}`,
              instructions: '',
              audioUrl: null,
              readingPassage: null,
              itemIds: [initialItemId]
            }
          ],
          items: [
            {
              itemFamilyId: generateUuid(),
              itemVersionId: initialItemId,
              position: nextPos,
              exerciseId: initialExId,
              exerciseTitle: `Bài tập 1: Phần ${nextIdx}`,
              prompt: `Câu hỏi ${nextPos}:`,
              helpText: '',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Phương án A' },
                { id: 'B', label: 'Phương án B' },
                { id: 'C', label: 'Phương án C' },
                { id: 'D', label: 'Phương án D' }
              ],
              skillCodes: [],
              releasePolicy: 'inherit'
            }
          ]
        });
        draftState.gradingKey.items[initialItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        };
        activeBlockIdx = draftState.blocks.length - 1;
        markAsDirty();
        render();
      });
    }

    const tabAddBlockBtn = container.querySelector('#btn-tab-add-block');
    if (tabAddBlockBtn && typeof tabAddBlockBtn.addEventListener === 'function') {
      tabAddBlockBtn.addEventListener('click', () => {
        if (addBlockBtn && typeof addBlockBtn.click === 'function') {
          addBlockBtn.click();
        }
      });
    }

    const prevBlockBtns = container.querySelectorAll('.btn-prev-block');
    if (prevBlockBtns && typeof prevBlockBtns.forEach === 'function') {
      prevBlockBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const targetIdx = Number(btn.getAttribute('data-target-idx'));
            if (!isNaN(targetIdx) && targetIdx >= 0) {
              jumpToBlock(targetIdx);
            }
          });
        }
      });
    }

    const nextBlockBtns = container.querySelectorAll('.btn-next-block');
    if (nextBlockBtns && typeof nextBlockBtns.forEach === 'function') {
      nextBlockBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const targetIdx = Number(btn.getAttribute('data-target-idx'));
            if (!isNaN(targetIdx) && targetIdx < draftState.blocks.length) {
              jumpToBlock(targetIdx);
            }
          });
        }
      });
    }

    bindChoiceAuthoring(authoringHost);

    bindShortAnswerAuthoring(authoringHost);

    bindReadingMatchingAuthoring(authoringHost);

    bindListeningOrderAuthoring(authoringHost);

    bindErrorCorrectionAuthoring(authoringHost);

    bindSentenceAuthoring(authoringHost);

    bindPronunciationAuthoring(authoringHost);

    bindPictorialAuthoring(authoringHost);

    bindVocabularyAuthoring(authoringHost);

    bindRubricAuthoring(authoringHost);

    // Toggle Collapse / Expand Block Card
    const toggleBlockCollapseBtns = container.querySelectorAll('.btn-toggle-block-collapse');
    if (toggleBlockCollapseBtns && typeof toggleBlockCollapseBtns.forEach === 'function') {
      toggleBlockCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-block-card') : null;
            if (!card) return;
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-index') : null) || (card.getAttribute && card.getAttribute('data-index')) || 0);
            const block = draftState.blocks[bIdx];
            const blockCardKey = (block && block.blockId) || (card.getAttribute && card.getAttribute('data-block-id')) || `b-${bIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(blockCardKey);
            } else {
              collapsedCardKeys.delete(blockCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
          });
        }
      });
    }

    // Toggle Collapse / Expand Exercise Card
    const toggleExerciseCollapseBtns = container.querySelectorAll('.btn-toggle-exercise-collapse');
    if (toggleExerciseCollapseBtns && typeof toggleExerciseCollapseBtns.forEach === 'function') {
      toggleExerciseCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-exercise-card') : null;
            if (!card) return;
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-block-idx') : null) || (card.getAttribute && card.getAttribute('data-block-idx')) || 0);
            const eIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-exercise-idx') : null) || (card.getAttribute && card.getAttribute('data-exercise-idx')) || 0);
            const ex = draftState.blocks[bIdx]?.exercises?.[eIdx];
            const exCardKey = (ex && ex.exerciseId) || (card.getAttribute && card.getAttribute('data-exercise-id')) || `ex-${bIdx}-${eIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(exCardKey);
            } else {
              collapsedCardKeys.delete(exCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
          });
        }
      });
    }

    // Toggle Collapse / Expand Question Item Card
    const toggleCollapseBtns = container.querySelectorAll('.btn-toggle-item-collapse');
    if (toggleCollapseBtns && typeof toggleCollapseBtns.forEach === 'function') {
      toggleCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-item-card') : null;
            if (!card) return;
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-block-idx') : null) || (card.getAttribute && card.getAttribute('data-block-idx')) || 0);
            const iIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-item-idx') : null) || (card.getAttribute && card.getAttribute('data-item-idx')) || 0);
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            const itemCardKey = (item && item.itemVersionId) || (card.getAttribute && card.getAttribute('data-item-id')) || `item-${bIdx}-${iIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(itemCardKey);
            } else {
              collapsedCardKeys.delete(itemCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
          });
        }
      });
    }

    // Bulk Collapse All
    const btnCollapseAll = typeof container.querySelector === 'function' ? container.querySelector('#btn-collapse-all') : null;
    if (btnCollapseAll && typeof btnCollapseAll.addEventListener === 'function') {
      btnCollapseAll.addEventListener('click', () => {
        draftState.blocks.forEach((block, bIdx) => {
          collapsedCardKeys.add(block.blockId || `b-${bIdx}`);
          (block.exercises || []).forEach((ex, eIdx) => {
            collapsedCardKeys.add(ex.exerciseId || `ex-${bIdx}-${eIdx}`);
          });
          (block.items || []).forEach((item, iIdx) => {
            collapsedCardKeys.add(item.itemVersionId || `item-${bIdx}-${iIdx}`);
          });
        });

        const blocks = container.querySelectorAll('.builder-block-card');
        if (blocks && typeof blocks.forEach === 'function') {
          blocks.forEach(card => card.classList?.add('is-collapsed'));
        }
        const exercises = container.querySelectorAll('.builder-exercise-card');
        if (exercises && typeof exercises.forEach === 'function') {
          exercises.forEach(card => card.classList?.add('is-collapsed'));
        }
        const items = container.querySelectorAll('.builder-item-card');
        if (items && typeof items.forEach === 'function') {
          items.forEach(card => card.classList?.add('is-collapsed'));
        }

        const blockToggles = container.querySelectorAll('.btn-toggle-block-collapse');
        if (blockToggles && typeof blockToggles.forEach === 'function') {
          blockToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const exToggles = container.querySelectorAll('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const itemToggles = container.querySelectorAll('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
      });
    }

    // Bulk Expand All
    const btnExpandAll = typeof container.querySelector === 'function' ? container.querySelector('#btn-expand-all') : null;
    if (btnExpandAll && typeof btnExpandAll.addEventListener === 'function') {
      btnExpandAll.addEventListener('click', () => {
        collapsedCardKeys.clear();

        const blocks = container.querySelectorAll('.builder-block-card');
        if (blocks && typeof blocks.forEach === 'function') {
          blocks.forEach(card => card.classList?.remove('is-collapsed'));
        }
        const exercises = container.querySelectorAll('.builder-exercise-card');
        if (exercises && typeof exercises.forEach === 'function') {
          exercises.forEach(card => card.classList?.remove('is-collapsed'));
        }
        const items = container.querySelectorAll('.builder-item-card');
        if (items && typeof items.forEach === 'function') {
          items.forEach(card => card.classList?.remove('is-collapsed'));
        }

        const blockToggles = container.querySelectorAll('.btn-toggle-block-collapse');
        if (blockToggles && typeof blockToggles.forEach === 'function') {
          blockToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const exToggles = container.querySelectorAll('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const itemToggles = container.querySelectorAll('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
      });
    }

    // Prompt change listener for inline cloze and real-time counter
    const promptInputs = container.querySelectorAll('.item-prompt-input');
    promptInputs.forEach(promptEl => {
      promptEl.addEventListener('input', () => {
        const bIdx = Number(promptEl.getAttribute('data-block-idx'));
        const iIdx = Number(promptEl.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        item.prompt = promptEl.value;
        const itemCard = (typeof promptEl.closest === 'function') ? promptEl.closest('.builder-item-card') : (promptEl.parentElement || null);
        const charCountEl = itemCard?.querySelector ? itemCard.querySelector('.prompt-char-count') : null;
        if (charCountEl) {
          charCountEl.textContent = `${(promptEl.value || '').length} ký tự`;
        }
        markAsDirty();
      });

      promptEl.addEventListener('change', () => {
        const bIdx = Number(promptEl.getAttribute('data-block-idx'));
        const iIdx = Number(promptEl.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        syncInputs();
        if (item.layoutType === 'inline_cloze' || item.pedagogicalTypeCode === 'inline_cloze') {
          resequenceItemPositions();
          render();
        }
      });
    });

    // Move Question Item Up
    const moveItemUpBtns = container.querySelectorAll('.btn-move-item-up');
    moveItemUpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.items || iIdx <= 0) return;
        const currentItem = block.items[iIdx];
        const prevItem = block.items[iIdx - 1];
        block.items[iIdx] = prevItem;
        block.items[iIdx - 1] = currentItem;
        if (prevItem.exerciseId && prevItem.exerciseId !== currentItem.exerciseId) {
          currentItem.exerciseId = prevItem.exerciseId;
          currentItem.exerciseTitle = prevItem.exerciseTitle;
        }
        resequenceItemPositions();
        render();
      });
    });

    // Move Question Item Down
    const moveItemDownBtns = container.querySelectorAll('.btn-move-item-down');
    moveItemDownBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.items || iIdx >= block.items.length - 1) return;
        const currentItem = block.items[iIdx];
        const nextItem = block.items[iIdx + 1];
        block.items[iIdx] = nextItem;
        block.items[iIdx + 1] = currentItem;
        if (nextItem.exerciseId && nextItem.exerciseId !== currentItem.exerciseId) {
          currentItem.exerciseId = nextItem.exerciseId;
          currentItem.exerciseTitle = nextItem.exerciseTitle;
        }
        resequenceItemPositions();
        render();
      });
    });

    // HTML5 Drag and Drop for Question Items (Drag Handle Isolated)
    const draggableItemCards = container.querySelectorAll('.builder-item-card');
    let draggedItemInfo = null;
    let isDragHandleActive = false;
    let activeDragCard = null;

    if (draggableItemCards && typeof draggableItemCards.forEach === 'function') {
      draggableItemCards.forEach(card => {
        if (typeof card.addEventListener !== 'function') return;

        const handle = card.querySelector ? card.querySelector('.item-drag-handle') : null;
        if (handle && typeof handle.addEventListener === 'function') {
          handle.addEventListener('mousedown', () => {
            isDragHandleActive = true;
            activeDragCard = card;
            if (typeof card.setAttribute === 'function') {
              card.setAttribute('draggable', 'true');
            }
          });

          const resetHandleState = () => {
            if (!draggedItemInfo) {
              isDragHandleActive = false;
              activeDragCard = null;
              if (typeof card.setAttribute === 'function') {
                card.setAttribute('draggable', 'false');
              }
            }
          };

          handle.addEventListener('mouseup', resetHandleState);
        }

        card.addEventListener('dragstart', (e) => {
          const targetTag = e.target?.tagName?.toLowerCase();
          const isInputOrControl = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || targetTag === 'button';
          const isTargetFromHandle = (isDragHandleActive && activeDragCard === card) ||
            (e.target && typeof e.target.closest === 'function' && Boolean(e.target.closest('.item-drag-handle')));

          if (!isTargetFromHandle || isInputOrControl) {
            if (typeof e.preventDefault === 'function') {
              e.preventDefault();
            }
            return;
          }

          syncInputs();
          draggedItemInfo = {
            blockIdx: Number(card.getAttribute('data-block-idx')),
            itemIdx: Number(card.getAttribute('data-item-idx')),
            itemId: card.getAttribute('data-item-id'),
            exerciseId: card.getAttribute('data-exercise-id')
          };
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try {
              e.dataTransfer.setData('text/plain', card.getAttribute('data-item-id') || '');
            } catch (_) {}
          }
          if (card.classList && typeof card.classList.add === 'function') {
            card.classList.add('dragging');
          }
        });

        card.addEventListener('dragover', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

          const rect = typeof card.getBoundingClientRect === 'function' ? card.getBoundingClientRect() : null;
          const isTopHalf = rect ? ((e.clientY - rect.top) < (rect.height / 2)) : false;

          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
            if (isTopHalf) {
              card.classList.add('drop-target-above');
            } else {
              card.classList.add('drop-target-below');
            }
          }
        });

        card.addEventListener('dragleave', () => {
          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
          }
        });

        card.addEventListener('drop', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (typeof e.stopPropagation === 'function') e.stopPropagation();

          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
          }

          const sourceBlockIdx = draggedItemInfo.blockIdx;
          const sourceItemIdx = draggedItemInfo.itemIdx;
          const targetBlockIdx = Number(card.getAttribute('data-block-idx'));
          const targetItemIdx = Number(card.getAttribute('data-item-idx'));
          const targetExerciseId = card.getAttribute('data-exercise-id');

          const rect = typeof card.getBoundingClientRect === 'function' ? card.getBoundingClientRect() : null;
          const positionAbove = rect ? ((e.clientY - rect.top) < (rect.height / 2)) : false;

          reorderBlockItem(draftState, sourceBlockIdx, sourceItemIdx, targetBlockIdx, targetItemIdx, positionAbove, targetExerciseId);

          resequenceItemPositions();
          markAsDirty();
          render();
        });

        card.addEventListener('dragend', () => {
          draggedItemInfo = null;
          isDragHandleActive = false;
          activeDragCard = null;
          const allCards = container.querySelectorAll('.builder-item-card');
          if (allCards && typeof allCards.forEach === 'function') {
            allCards.forEach(c => {
              if (typeof c.setAttribute === 'function') {
                c.setAttribute('draggable', 'false');
              }
              if (c.classList && typeof c.classList.remove === 'function') {
                c.classList.remove('dragging', 'drop-target-above', 'drop-target-below');
              }
            });
          }
          const allLists = container.querySelectorAll('.exercise-items-list');
          if (allLists && typeof allLists.forEach === 'function') {
            allLists.forEach(l => {
              if (l.classList && typeof l.classList.remove === 'function') {
                l.classList.remove('drag-over-empty');
              }
            });
          }
        });
      });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      const onDocMouseUp = () => {
        if (isDisposed) return;
        if (isDragHandleActive && !draggedItemInfo) {
          isDragHandleActive = false;
          if (activeDragCard && typeof activeDragCard.setAttribute === 'function') {
            activeDragCard.setAttribute('draggable', 'false');
          }
          activeDragCard = null;
        }
      };
      document.addEventListener('mouseup', onDocMouseUp);
      renderCycleCleanups.push(() => {
        document.removeEventListener?.('mouseup', onDocMouseUp);
      });
    }

    // Drop onto empty exercise items container
    const exerciseLists = container.querySelectorAll('.exercise-items-list');
    if (exerciseLists && typeof exerciseLists.forEach === 'function') {
      exerciseLists.forEach(list => {
        if (typeof list.addEventListener !== 'function') return;

        list.addEventListener('dragover', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          if (list.classList && typeof list.classList.add === 'function') {
            list.classList.add('drag-over-empty');
          }
        });

        list.addEventListener('dragleave', () => {
          if (list.classList && typeof list.classList.remove === 'function') {
            list.classList.remove('drag-over-empty');
          }
        });

        list.addEventListener('drop', (e) => {
          if (e.target && typeof e.target.closest === 'function' && e.target.closest('.builder-item-card')) return;
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (list.classList && typeof list.classList.remove === 'function') {
            list.classList.remove('drag-over-empty');
          }

          const targetExerciseId = list.getAttribute('data-exercise-id');
          const targetBlockIdx = Number(list.getAttribute('data-block-idx'));

          moveItemToExercise(draftState, draggedItemInfo.blockIdx, draggedItemInfo.itemIdx, targetBlockIdx, targetExerciseId);

          resequenceItemPositions();
          markAsDirty();
          render();
        });
      });
    }

    // Delete Question Item
    const delItemBtns = container.querySelectorAll('.btn-delete-item');
    delItemBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (block && block.items) {
          const [deletedItem] = block.items.splice(iIdx, 1);
          if (deletedItem?.itemVersionId) {
            delete draftState.gradingKey.items[deletedItem.itemVersionId];
          }
          resequenceItemPositions();
          render();
        }
      });
    });

    // Add Option to single/multi choice
    const addOptBtns = container.querySelectorAll('.btn-add-option');
    addOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nextId = alphabet[item.options.length] || `OPT${item.options.length + 1}`;
        item.options.push({ id: nextId, label: `Phương án ${nextId}` });
        render();
      });
    });

    // Delete Option
    const delOptBtns = container.querySelectorAll('.btn-del-option');
    delOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item && item.options && item.options.length > 2) {
          item.options = item.options.filter(o => o.id !== optId);
          render();
        } else {
          alert('Một câu hỏi lựa chọn phải có ít nhất 2 phương án.');
        }
      });
    });

    // Generate variants button for FITB
    const genVariantBtns = container.querySelectorAll('.btn-generate-variants');
    genVariantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const blankNum = btn.getAttribute('data-blank-num');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const blankCard = btn.closest('.cloze-blank-config-card');
        const rawInput = blankCard ? blankCard.querySelector('.input-cloze-blank-target') : card?.querySelector('.input-fitb-raw');
        const rawVal = rawInput?.value?.trim() || '';
        if (!rawVal) {
          alert('Vui lòng nhập đáp án chuẩn trước khi sinh biến thể.');
          return;
        }
        const generated = expandSentenceVariants([rawVal]);
        if (blankNum && item.layoutType === 'inline_cloze') {
          item.clozeAnswers = item.clozeAnswers || {};
          const prevAccepted = Array.isArray(item.clozeAnswers[blankNum]?.accepted) ? item.clozeAnswers[blankNum].accepted : [];
          const merged = Array.from(new Set([...prevAccepted, ...generated]));
          item.clozeAnswers[blankNum] = {
            targetWord: rawVal,
            accepted: merged
          };
          const detected = parseClozeBlanks(item.prompt || '');
          const firstNum = detected.length ? detected[0].number : (item.position || 1);
          if (Number(blankNum) === firstNum) {
            draftState.gradingKey.items[item.itemVersionId] = {
              graderType: 'accepted_text',
              accepted: merged,
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          }
        } else {
          const prevAccepted = Array.isArray(draftState.gradingKey.items[item.itemVersionId]?.accepted)
            ? draftState.gradingKey.items[item.itemVersionId].accepted
            : [];
          const merged = Array.from(new Set([...prevAccepted, ...generated]));
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'accepted_text',
            accepted: merged,
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
        }
        render();
      });
    });

    // Remove single variant chip
    const removeChipBtns = container.querySelectorAll('.btn-remove-chip');
    removeChipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const blankNum = btn.getAttribute('data-blank-num');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        const variantToRemove = btn.getAttribute('data-variant');
        if (!item) return;
        if (blankNum && item.layoutType === 'inline_cloze') {
          item.clozeAnswers = item.clozeAnswers || {};
          if (item.clozeAnswers[blankNum] && Array.isArray(item.clozeAnswers[blankNum].accepted)) {
            item.clozeAnswers[blankNum].accepted = item.clozeAnswers[blankNum].accepted.filter(v => v !== variantToRemove);
          }
          const detected = parseClozeBlanks(item.prompt || '');
          const firstNum = detected.length ? detected[0].number : (item.position || 1);
          if (Number(blankNum) === firstNum) {
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (currentKey && Array.isArray(currentKey.accepted)) {
              currentKey.accepted = currentKey.accepted.filter(v => v !== variantToRemove);
            }
          }
          render();
          return;
        }
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey && Array.isArray(currentKey.accepted)) {
          currentKey.accepted = currentKey.accepted.filter(v => v !== variantToRemove);
          if (!currentKey.accepted.length) currentKey.accepted = ['answer'];
          render();
        }
      });
    });

    // Generate variants button for Vocab Pair
    const genVocabVariantBtns = container.querySelectorAll('.btn-generate-vocab-variants');
    genVocabVariantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const rawInput = card?.querySelector('.input-vocab-raw');
        const rawVal = rawInput?.value?.trim() || '';
        if (!rawVal) {
          alert('Vui lòng nhập từ tiếng Anh chuẩn trước khi sinh biến thể.');
          return;
        }
        const generated = expandSentenceVariants([rawVal]);
        const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId || item.options?.[0]?.id || 'opt_1';
        const prevAccepted = Array.isArray(draftState.gradingKey.items[item.itemVersionId]?.accepted)
          ? draftState.gradingKey.items[item.itemVersionId].accepted
          : [];
        const merged = Array.from(new Set([...prevAccepted, ...generated]));
        draftState.gradingKey.items[item.itemVersionId] = {
          graderType: 'accepted_text_exact_option',
          accepted: merged,
          expectedOptionId: currentExpected,
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        render();
      });
    });

    // Add manual variant input for Vocab Pair
    const addVocabVariantInputs = container.querySelectorAll('.input-add-vocab-variant');
    addVocabVariantInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId || item.options?.[0]?.id || 'opt_1';
          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'accepted_text_exact_option',
            accepted: [],
            expectedOptionId: currentExpected,
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            if (currentKey.accepted.length > 40) currentKey.accepted.pop();
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
          }
        }
      });
    });

    // Add Option to Vocab Pair
    const addVocabOptBtns = container.querySelectorAll('.btn-add-vocab-option');
    addVocabOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const nextNum = (item.options?.length || 0) + 1;
        const nextId = `opt_${nextNum}`;
        item.options = item.options || [];
        item.options.push({ id: nextId, label: `Nghĩa phương án ${nextNum}` });
        render();
      });
    });

    // Delete Option from Vocab Pair
    const delVocabOptBtns = container.querySelectorAll('.btn-del-vocab-option');
    delVocabOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item && item.options && item.options.length > 2) {
          item.options = item.options.filter(o => o.id !== optId);
          // if deleted expected option, fallback to first option
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId;
          if (currentExpected === optId) {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = item.options[0]?.id || 'opt_1';
          }
          render();
        } else {
          alert('Một câu hỏi cặp từ vựng phải có ít nhất 2 nghĩa để lựa chọn.');
        }
      });
    });

    // Toggle Bulk Paste Panel for Vocab Options
    const toggleBulkVocabBtns = container.querySelectorAll('.btn-bulk-paste-vocab-options');
    toggleBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bIdx = btn.getAttribute('data-block-idx');
        const iIdx = btn.getAttribute('data-item-idx');
        const panel = container.querySelector(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        if (panel) {
          const isHidden = panel.style.display === 'none' || !panel.style.display;
          panel.style.display = isHidden ? 'block' : 'none';
          if (isHidden) {
            const ta = panel.querySelector('.input-bulk-vocab-options');
            if (ta) ta.focus();
          }
        }
      });
    });

    // Cancel Bulk Paste Panel
    const cancelBulkVocabBtns = container.querySelectorAll('.btn-cancel-bulk-vocab-options');
    cancelBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bIdx = btn.getAttribute('data-block-idx');
        const iIdx = btn.getAttribute('data-item-idx');
        const panel = container.querySelector(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        if (panel) panel.style.display = 'none';
      });
    });

    // Apply Bulk Paste Vocab Options
    const applyBulkVocabBtns = container.querySelectorAll('.btn-apply-bulk-vocab-options');
    applyBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const panel = container.querySelector(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        const ta = panel?.querySelector('.input-bulk-vocab-options');
        const rawText = ta ? ta.value : '';
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          item.options = lines.map((lbl, idx) => ({
            id: `opt_${idx + 1}`,
            label: lbl
          }));
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId;
          if (!item.options.some(o => o.id === currentExpected)) {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = item.options[0].id;
          }
          markAsDirty();
          render();
        } else {
          alert('Vui lòng nhập hoặc dán ít nhất 2 nghĩa tiếng Việt (mỗi dòng một nghĩa).');
        }
      });
    });

    // Copy Options from Preceding Vocab Pair Item
    const copyPrevVocabBtns = container.querySelectorAll('.btn-copy-prev-vocab-options');
    copyPrevVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;

        let prevItem = null;
        for (let p = iIdx - 1; p >= 0; p--) {
          const candidate = draftState.blocks[bIdx]?.items?.[p];
          if (candidate && candidate.interactionType === 'text_select_pair' && candidate.options && candidate.options.length >= 2) {
            prevItem = candidate;
            break;
          }
        }

        if (prevItem) {
          item.options = prevItem.options.map(o => ({ id: o.id, label: o.label }));
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId;
          if (!item.options.some(o => o.id === currentExpected)) {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = item.options[0].id;
          }
          markAsDirty();
          render();
        } else {
          alert('Không tìm thấy câu hỏi cặp từ vựng nào trước câu này để sao chép.');
        }
      });
    });

    // Sync Vocab Options across the whole Block
    const syncVocabToBlockBtns = container.querySelectorAll('.btn-sync-vocab-options-to-block');
    syncVocabToBlockBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const sourceItem = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!sourceItem || !sourceItem.options || sourceItem.options.length < 2) return;

        const block = draftState.blocks[bIdx];
        (block.items || []).forEach(it => {
          if (it.interactionType === 'text_select_pair' && it.itemVersionId !== sourceItem.itemVersionId) {
            it.options = sourceItem.options.map(o => ({ id: o.id, label: o.label }));
            const itKey = draftState.gradingKey.items[it.itemVersionId];
            if (itKey && !it.options.some(o => o.id === itKey.expectedOptionId)) {
              itKey.expectedOptionId = it.options[0].id;
            }
          }
        });

        markAsDirty();
        render();
      });
    });

    // Toggle Vocab Meaning Bank Collapsible
    const toggleVocabBankBtns = container.querySelectorAll('.btn-toggle-vocab-bank');
    toggleVocabBankBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const targetEl = container.querySelector('#' + targetId);
        if (targetEl) {
          const isHidden = targetEl.style.display === 'none';
          targetEl.style.display = isHidden ? 'block' : 'none';
          btn.textContent = isHidden ? btn.textContent.replace('▼', '▲') : btn.textContent.replace('▲', '▼');
        }
      });
    });

    // Select Vocab Correct Dropdown change
    const selectVocabDropdowns = container.querySelectorAll('.select-vocab-correct-dropdown');
    selectVocabDropdowns.forEach(sel => {
      sel.addEventListener('change', () => {
        const bIdx = Number(sel.getAttribute('data-block-idx'));
        const iIdx = Number(sel.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item) {
          if (!draftState.gradingKey.items[item.itemVersionId]) {
            draftState.gradingKey.items[item.itemVersionId] = {
              graderType: 'accepted_text_exact_option',
              accepted: [item.prompt || 'word'],
              expectedOptionId: sel.value,
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          } else {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = sel.value;
          }
          markAsDirty();

          // Also synchronize radio button and highlight state in bank
          const itemCard = sel.closest('.item-card');
          if (itemCard) {
            const allRadios = itemCard.querySelectorAll('.radio-vocab-correct');
            allRadios.forEach(r => {
              r.checked = (r.value === sel.value);
            });
            const allRows = itemCard.querySelectorAll('.vocab-meaning-row');
            allRows.forEach(r => {
              if (r.getAttribute('data-option-id') === sel.value) {
                r.classList.add('is-correct');
              } else {
                r.classList.remove('is-correct');
              }
            });
          }
        }
      });
    });

    // Radio Vocab Correct change syncs back to dropdown
    const vocabRadios = container.querySelectorAll('.radio-vocab-correct');
    vocabRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const itemCard = radio.closest('.item-card');
        if (itemCard) {
          const sel = itemCard.querySelector('.select-vocab-correct-dropdown');
          if (sel) sel.value = radio.value;
          const allRows = itemCard.querySelectorAll('.vocab-meaning-row');
          allRows.forEach(r => {
            if (r.getAttribute('data-option-id') === radio.value) {
              r.classList.add('is-correct');
            } else {
              r.classList.remove('is-correct');
            }
          });
        }
      });
    });

    // Add manual variant input
    const addVariantInputs = container.querySelectorAll('.input-add-variant');
    addVariantInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const blankNum = input.getAttribute('data-blank-num');
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;

          if (blankNum && item.layoutType === 'inline_cloze') {
            item.clozeAnswers = item.clozeAnswers || {};
            item.clozeAnswers[blankNum] = item.clozeAnswers[blankNum] || { accepted: [] };
            if (!item.clozeAnswers[blankNum].accepted.includes(val)) {
              item.clozeAnswers[blankNum].accepted.push(val);
              if (item.clozeAnswers[blankNum].accepted.length > 40) item.clozeAnswers[blankNum].accepted.pop();
            }
            const detected = parseClozeBlanks(item.prompt || '');
            const firstNum = detected.length ? detected[0].number : (item.position || 1);
            if (Number(blankNum) === firstNum) {
              const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
              if (!currentKey.accepted.includes(val)) {
                currentKey.accepted.push(val);
                if (currentKey.accepted.length > 40) currentKey.accepted.pop();
                draftState.gradingKey.items[item.itemVersionId] = currentKey;
              }
            }
            render();
            return;
          }

          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'accepted_text',
            accepted: [],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            if (currentKey.accepted.length > 40) currentKey.accepted.pop();
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
          }
        }
      });
    });

    // Preset switch handler
    const presetSelects = container.querySelectorAll('.select-rubric-preset');
    presetSelects.forEach(sel => {
      sel.addEventListener('change', () => {
        syncInputs();
        const bIdx = Number(sel.getAttribute('data-block-idx'));
        const iIdx = Number(sel.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const val = sel.value;
        const currentScore = item.maxScore || 4;

        if (val === 'translation') {
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_translation_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-translation-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: currentScore / 2, requiredConcepts: [] },
                { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: currentScore / 2, requiredConcepts: [] }
              ]
            }
          };
        } else if (val === 'speaking') {
          const s1 = Math.round(currentScore * 0.4 * 10) / 10;
          const s2 = Math.round(currentScore * 0.3 * 10) / 10;
          const s3 = Math.round((currentScore - s1 - s2) * 10) / 10;
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_speaking_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-speaking-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'idea', label: 'Ý tưởng & Phát triển (Idea Development)', maxScore: s1, requiredConcepts: [] },
                { id: 'vocabulary', label: 'Từ vựng & Diễn đạt (Vocabulary)', maxScore: s2, requiredConcepts: [] },
                { id: 'coherence', label: 'Ngữ pháp & Mạch lạc (Grammar & Coherence)', maxScore: s3, requiredConcepts: [] }
              ]
            }
          };
        } else if (val === 'comprehension') {
          const targetEx = draftState.blocks[bIdx]?.exercises?.find(e => e.exerciseId === item.exerciseId);
          if (targetEx) {
            targetEx.exerciseType = 'comprehension';
          }
          const s1 = Math.round(currentScore * 0.7 * 10) / 10;
          const s2 = Math.round((currentScore - s1) * 10) / 10;
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_comprehension_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-comprehension-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'comprehension', label: 'Mức độ hiểu nội dung (Comprehension)', maxScore: s1, requiredConcepts: [] },
                { id: 'keywords', label: 'Từ khóa & Khái niệm cốt lõi (Keywords)', maxScore: s2, requiredConcepts: [] }
              ]
            }
          };
        }
        render();
      });
    });

    // Tab switch handler inside Rubric card
    const rubricTabs = container.querySelectorAll('.btn-rubric-tab');
    rubricTabs.forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.getAttribute('data-tab');
        const bIdx = tabBtn.getAttribute('data-block-idx');
        const iIdx = tabBtn.getAttribute('data-item-idx');
        const card = tabBtn.closest('.builder-item-card');
        if (!card) return;

        card.querySelectorAll('.btn-rubric-tab').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        const criteriaPane = card.querySelector(`#pane-criteria-${bIdx}-${iIdx}`);
        const guidancePane = card.querySelector(`#pane-guidance-${bIdx}-${iIdx}`);
        const sandboxPane = card.querySelector(`#pane-sandbox-${bIdx}-${iIdx}`);

        if (criteriaPane) criteriaPane.style.display = tab === 'criteria' ? 'flex' : 'none';
        if (guidancePane) guidancePane.style.display = tab === 'guidance' ? 'flex' : 'none';
        if (sandboxPane) sandboxPane.style.display = tab === 'sandbox' ? 'flex' : 'none';
      });
    });

    // Add Criterion handler
    const addCriterionBtns = container.querySelectorAll('.btn-add-criterion');
    addCriterionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (!currentKey || !currentKey.rubric) return;

        const nextNum = (currentKey.rubric.criteria?.length || 0) + 1;
        currentKey.rubric.criteria = currentKey.rubric.criteria || [];
        currentKey.rubric.criteria.push({
          id: `criterion_${nextNum}`,
          label: `Tiêu chí ${nextNum}`,
          maxScore: 1,
          requiredConcepts: []
        });
        const total = currentKey.rubric.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
        currentKey.rubric.maxScore = total;
        item.maxScore = total;
        render();
      });
    });

    // Delete Criterion handler
    const delCriterionBtns = container.querySelectorAll('.btn-del-criterion');
    delCriterionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const cIdx = Number(btn.getAttribute('data-criterion-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey && currentKey.rubric && currentKey.rubric.criteria && currentKey.rubric.criteria.length > 1) {
          currentKey.rubric.criteria.splice(cIdx, 1);
          const total = currentKey.rubric.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
          currentKey.rubric.maxScore = total;
          item.maxScore = total;
          render();
        } else {
          alert('Rubric phải có ít nhất 1 tiêu chí chấm điểm.');
        }
      });
    });

    // Pull Cloze Script for Exercise handler
    const pullExScriptBtns = container.querySelectorAll('.btn-pull-exercise-cloze-script');
    pullExScriptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const exIdx = Number(btn.getAttribute('data-exercise-idx'));
        const ex = draftState.blocks[bIdx]?.exercises?.[exIdx];
        if (!ex) return;

        const script = findPrecedingClozeScript(draftState, bIdx);
        if (script) {
          ex.referenceContext = script;
          markAsDirty();
          render();
        } else {
          alert('Không tìm thấy bài điền từ nội tuyến hoặc đoạn văn nào ở các phần phía trước.');
        }
      });
    });

    // Pull Cloze Script handler
    const pullScriptBtns = container.querySelectorAll('.btn-pull-cloze-script');
    pullScriptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;

        let extractedScript = '';
        for (let b = bIdx; b >= 0; b--) {
          const block = draftState.blocks[b];
          if (!block) continue;
          const clozeItem = (block.items || []).find(it =>
            it.layoutType === 'inline_cloze' ||
            it.pedagogicalTypeCode === 'inline_cloze' ||
            it.pedagogicalTypeCode === 'table_completion' ||
            /(?:\(\d+\)\s*[_\.\u2026]{2,})|(?:\{\{\d+\}\})/i.test(it.prompt || '')
          );
          if (clozeItem && clozeItem.prompt) {
            extractedScript = clozeItem.prompt
              .replace(/<[^>]+>/g, ' ')
              .replace(/(?:\(\d+\)\s*[_\.\u2026]{2,})|(?:\{\{\d+\}\})/g, '...')
              .replace(/\s+/g, ' ')
              .trim();
            break;
          }
          if (block.readingPassage || block.stimulusReadingPassage) {
            extractedScript = (block.readingPassage || block.stimulusReadingPassage).trim();
            break;
          }
        }

        if (extractedScript) {
          item.referenceContext = extractedScript;
          render();
        } else {
          alert('Không tìm thấy bài điền từ nội tuyến hoặc đoạn văn nào ở các phần phía trước.');
        }
      });
    });

    // Trigger AI Sandbox handler
    const triggerSandboxBtns = container.querySelectorAll('.btn-trigger-sandbox');
    triggerSandboxBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (!currentKey || !currentKey.rubric) return;

        const card = btn.closest('.builder-item-card');
        const sampleTextarea = card?.querySelector('.input-sandbox-sample');
        const resultsContainer = card?.querySelector('.sandbox-results-container');
        const sampleAnswer = sampleTextarea?.value?.trim() || '';

        if (!sampleAnswer) {
          alert('Vui lòng nhập câu trả lời mẫu trước khi chấm thử.');
          return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Đang chấm AI...';
        if (resultsContainer) {
          resultsContainer.style.display = 'block';
          resultsContainer.innerHTML = '<div class="alert-notice"><div class="notice-text">Đang gửi yêu cầu đánh giá đến AI Gateway...</div></div>';
        }

        try {
          const parentEx = draftState.blocks[bIdx]?.exercises?.find(e => e.exerciseId === item.exerciseId);
          const referenceContext = item.referenceContext || parentEx?.referenceContext || draftState.blocks[bIdx]?.readingPassage || draftState.blocks[bIdx]?.stimulusReadingPassage || draftState.blocks[bIdx]?.referenceContext || '';
          let sandboxResult;
          if (typeof options.onPreviewSandbox === 'function') {
            sandboxResult = await options.onPreviewSandbox({
              prompt: item.prompt,
              context: referenceContext,
              sampleAnswer,
              interactionType: item.interactionType,
              pedagogicalTypeCode: item.pedagogicalTypeCode,
              rubric: currentKey.rubric
            });
          } else {
            const apiRes = await fetch(previewSandboxPath(options.apiBase), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {})
              },
              body: JSON.stringify({
                prompt: item.prompt,
                context: referenceContext,
                sampleAnswer,
                interactionType: item.interactionType,
                pedagogicalTypeCode: item.pedagogicalTypeCode,
                rubric: currentKey.rubric
              })
            });
            sandboxResult = await apiRes.json();
          }

          if (!sandboxResult || !sandboxResult.ok) {
            throw new Error(sandboxResult?.message || 'Chấm thử AI thất bại.');
          }

          const criteriaRows = (sandboxResult.criteria || []).map(c => `
            <div class="sandbox-criterion-row">
              <span><strong>${escapeHtml(c.id || '')}:</strong> ${c.maxScore !== undefined ? `(${c.score}/${c.maxScore}đ)` : ''}</span>
              <span class="sandbox-criterion-score">${c.score}đ</span>
            </div>
          `).join('');

          const errorsRows = (sandboxResult.errors || []).map(err => `
            <div class="error-pill" style="color: #b91c1c; font-size: 0.78rem;">
              • <strong>${escapeHtml(err.code || '')}:</strong> ${escapeHtml(err.message || '')}
            </div>
          `).join('');

          if (resultsContainer) {
            resultsContainer.innerHTML = `
              <div class="sandbox-results-box">
                <div class="sandbox-score-summary">
                  <span>Điểm AI tạm tính:</span>
                  <span class="sandbox-score-badge">${sandboxResult.scoreEarned} / ${sandboxResult.maxScore}</span>
                </div>
                ${criteriaRows ? `<div class="sandbox-criteria-breakdown">${criteriaRows}</div>` : ''}
                ${errorsRows ? `<div class="sandbox-errors-breakdown">${errorsRows}</div>` : ''}
              </div>
            `;
          }
        } catch (err) {
          if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="alert-notice alert-immutable"><div class="notice-text" style="color:#b91c1c;">Lỗi: ${escapeHtml(err.message || 'Không thể chấm thử')}</div></div>`;
          }
        } finally {
          btn.disabled = false;
          btn.innerHTML = `${renderSvgIcon('zap', 'icon-inline')} Chấm thử AI`;
        }
      });
    });

    const upBtns = container.querySelectorAll('.btn-move-block-up');
    if (upBtns && typeof upBtns.forEach === 'function') {
      upBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (idx > 0) {
              const temp = draftState.blocks[idx];
              draftState.blocks[idx] = draftState.blocks[idx - 1];
              draftState.blocks[idx - 1] = temp;
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              activeBlockIdx = idx - 1;
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          });
        }
      });
    }

    const downBtns = container.querySelectorAll('.btn-move-block-down');
    if (downBtns && typeof downBtns.forEach === 'function') {
      downBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (idx < draftState.blocks.length - 1) {
              const temp = draftState.blocks[idx];
              draftState.blocks[idx] = draftState.blocks[idx + 1];
              draftState.blocks[idx + 1] = temp;
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              activeBlockIdx = idx + 1;
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          });
        }
      });
    }

    const delBtns = container.querySelectorAll('.btn-delete-block');
    if (delBtns && typeof delBtns.forEach === 'function') {
      delBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (draftState.blocks.length > 1) {
              const targetBlock = draftState.blocks[idx];
              if (!targetBlock) return;
              if (targetBlock.items && targetBlock.items.length > 0) {
                const blockTitle = targetBlock.title || `Phần ${idx + 1}`;
                const confirmMsg = `Bạn có chắc chắn muốn xóa "${blockTitle}" cùng toàn bộ ${targetBlock.items.length} câu hỏi bên trong không? Thao tác này không thể hoàn tác.`;
                if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                  if (!window.confirm(confirmMsg)) return;
                }
              }
              const [deletedBlock] = draftState.blocks.splice(idx, 1);
              if (deletedBlock?.items) {
                deletedBlock.items.forEach(it => {
                  if (it?.itemVersionId && draftState.gradingKey?.items) {
                    delete draftState.gradingKey.items[it.itemVersionId];
                  }
                });
              }
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              activeBlockIdx = Math.max(0, Math.min(activeBlockIdx, draftState.blocks.length - 1));
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          });
        }
      });
    }

    bindDraftSaving({ container, draftState, options, syncInputs, render, markSaved, lifecycle: workflowLifecycle });

    const openCandidateSimulationModal = createSimulation({ draftState, builderOwner, syncInputs });

    // Smart Publishing Modal (2-Step Wizard & Safe Double-Check)
    const openPublishingModal = createPublishing({ draftState, builderOwner, syncInputs, options, render, markSaved });

    // Execution Report Dialog


    const previewBtn = container.querySelector('#btn-preview-test');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        openCandidateSimulationModal();
      });
    }

    const publishBtn = container.querySelector('#btn-publish-test');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        openPublishingModal();
      });
    }

    const deleteDraftBtn = container.querySelector('#btn-delete-draft-workspace');
    if (deleteDraftBtn) {
      deleteDraftBtn.addEventListener('click', () => {
        if (typeof openConfirmDeleteTestModal === 'function' && typeof document !== 'undefined') {
          openConfirmDeleteTestModal({ owner: builderOwner,
            formVersionId: draftState.formVersionId,
            testKey: formVersionData.testKey || '',
            title: draftState.title || formVersionData.title || '',
            sessionNumber: draftState.sessionNumber || '',
            phase: draftState.phase || '',
            courseName: options.courseId === 1 ? 'Khối 03' : (options.courseId === 3 ? 'Khối 45' : 'Khối 34'),
            onConfirm: () => {
              isDirty = false;
              handle?.dispose();
              if (typeof options.onDeleteDraft === 'function') {
                options.onDeleteDraft({
                  formVersionId: draftState.formVersionId,
                  testKey: formVersionData.testKey || '',
                  title: draftState.title || formVersionData.title || ''
                });
              }
            }
          });
        } else {
          const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm('Bạn có chắc chắn muốn xóa bài thi này không? Thao tác này không thể hoàn tác.')
            : true;
          if (confirmed) {
            isDirty = false;
            handle?.dispose();
            if (typeof options.onDeleteDraft === 'function') {
              options.onDeleteDraft({
                formVersionId: draftState.formVersionId,
                testKey: formVersionData.testKey || '',
                title: draftState.title || formVersionData.title || ''
              });
            }
          }
        }
      });
    }

    // Rich HTML Editor interactive controls in builder item cards
    const richWraps = container.querySelectorAll('.rich-html-editor-wrap');
    if (richWraps && typeof richWraps.forEach === 'function') {
      richWraps.forEach(wrap => {
        const visualEl = wrap.querySelector ? wrap.querySelector('.rich-editor-visual') : null;
        const codeEl = wrap.querySelector ? wrap.querySelector('.rich-editor-code, textarea') : null;
        const toggleBtn = wrap.querySelector ? wrap.querySelector('.btn-toggle-html-mode') : null;
        const tableBtn = wrap.querySelector ? wrap.querySelector('.btn-rich-insert-table') : null;
        const tableMenu = wrap.querySelector ? wrap.querySelector('.table-presets-menu') : null;
        const imageBtn = wrap.querySelector ? wrap.querySelector('.btn-rich-insert-image') : null;
        const imagePopup = wrap.querySelector ? wrap.querySelector('.image-insert-popup') : null;
        const imageLinkInput = wrap.querySelector ? wrap.querySelector('.input-image-link') : null;
        const confirmImageBtn = wrap.querySelector ? wrap.querySelector('.btn-confirm-insert-image') : null;
        const imageErrorEl = wrap.querySelector ? wrap.querySelector('.popup-image-error') : null;
        const generalErrorEl = wrap.querySelector ? wrap.querySelector('.general-editor-error') : null;

        let savedRange = null;
        const saveSelection = () => {
          if (typeof window !== 'undefined' && window.getSelection) {
            const sel = window.getSelection();
            if (!visualEl || !sel?.rangeCount) return;
            const range = sel.getRangeAt(0);
            if (visualEl.contains && visualEl.contains(range.commonAncestorContainer)) {
              savedRange = range.cloneRange();
            }
          }
        };

        const closeAllPopups = () => {
          if (tableMenu && tableMenu.style) tableMenu.style.display = 'none';
          if (imagePopup && imagePopup.style) {
            imagePopup.style.display = 'none';
            if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
          }
        };

        const showError = (msg) => {
          if (generalErrorEl) {
            generalErrorEl.textContent = msg;
            if (generalErrorEl.style) generalErrorEl.style.display = 'flex';
            setTimeout(() => {
              if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
            }, 5000);
          }
        };

        const clearError = () => {
          if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
          if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
        };

        const syncToCode = () => {
          if (!visualEl || !codeEl) return;
          const clean = sanitizeRichContent(visualEl.innerHTML || '');
          codeEl.value = clean;
          markAsDirty();

          // Real-time sync to draftState and live preview
          const bIdx = wrap.getAttribute ? wrap.getAttribute('data-block-idx') : null;
          const iIdx = wrap.getAttribute ? wrap.getAttribute('data-item-idx') : null;
          if (bIdx !== null && iIdx !== null) {
            const blockIndex = Number(bIdx);
            const itemIndex = Number(iIdx);
            const item = draftState.blocks?.[blockIndex]?.items?.[itemIndex];
            if (item) {
              item.prompt = clean;
              const itemCard = (typeof wrap.closest === 'function') ? wrap.closest('.builder-item-card') : (wrap.parentElement || null);
              const previewEl = itemCard?.querySelector ? itemCard.querySelector('.cloze-preview-content') : null;
              if (previewEl) {
                previewEl.innerHTML = renderInlineClozeMarkup(clean, [item], {}, { disabled: true }) || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>';
              }
              const charCountEl = wrap.querySelector ? wrap.querySelector('.prompt-char-count') : null;
              if (charCountEl) {
                charCountEl.textContent = `${clean.length} ký tự`;
              }
            }
          }
        };

        const syncToVisual = () => {
          if (!visualEl || !codeEl) return;
          const clean = sanitizeRichContent(codeEl.value || '');
          visualEl.innerHTML = clean;
          markAsDirty();

          const bIdx = wrap.getAttribute ? wrap.getAttribute('data-block-idx') : null;
          const iIdx = wrap.getAttribute ? wrap.getAttribute('data-item-idx') : null;
          if (bIdx !== null && iIdx !== null) {
            const blockIndex = Number(bIdx);
            const itemIndex = Number(iIdx);
            const item = draftState.blocks?.[blockIndex]?.items?.[itemIndex];
            if (item) {
              item.prompt = clean;
              const itemCard = (typeof wrap.closest === 'function') ? wrap.closest('.builder-item-card') : (wrap.parentElement || null);
              const previewEl = itemCard?.querySelector ? itemCard.querySelector('.cloze-preview-content') : null;
              if (previewEl) {
                previewEl.innerHTML = renderInlineClozeMarkup(clean, [item], {}, { disabled: true }) || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>';
              }
            }
          }
        };

        const insertHtmlAtCursor = (htmlToInsert) => {
          if (!htmlToInsert) return;
          const isCodeVisible = codeEl && codeEl.style && codeEl.style.display !== 'none';
          if (isCodeVisible) {
            const start = codeEl.selectionStart || codeEl.value.length;
            const end = codeEl.selectionEnd || codeEl.value.length;
            codeEl.value = codeEl.value.substring(0, start) + htmlToInsert + codeEl.value.substring(end);
            syncToVisual();
            return;
          }
          if (visualEl) {
            visualEl.focus?.();
            let range = savedRange;
            if (!range || (visualEl.contains && !visualEl.contains(range.commonAncestorContainer))) {
              if (typeof document !== 'undefined' && document.createRange) {
                range = document.createRange();
                range.selectNodeContents(visualEl);
                range.collapse(false);
              }
            }

            if (range && range.createContextualFragment) {
              range.deleteContents?.();
              const fragment = range.createContextualFragment(htmlToInsert);
              const lastNode = fragment.lastChild;
              range.insertNode?.(fragment);
              if (lastNode && range.setStartAfter) {
                range.setStartAfter(lastNode);
                range.collapse?.(true);
              }
              if (typeof window !== 'undefined' && window.getSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges?.();
                sel.addRange?.(range);
                savedRange = range.cloneRange ? range.cloneRange() : range;
              }
            } else {
              visualEl.innerHTML += htmlToInsert;
            }
            syncToCode();
          }
        };

        if (toggleBtn && visualEl && codeEl && toggleBtn.addEventListener) {
          toggleBtn.addEventListener('click', () => {
            closeAllPopups();
            const isCurrentlyVisual = visualEl.style && visualEl.style.display !== 'none';
            if (isCurrentlyVisual) {
              syncToCode();
              if (visualEl.style) visualEl.style.display = 'none';
              if (codeEl.style) codeEl.style.display = 'block';
              toggleBtn.classList?.add?.('active');
              toggleBtn.textContent = 'Trực quan';
            } else {
              syncToVisual();
              if (codeEl.style) codeEl.style.display = 'none';
              if (visualEl.style) visualEl.style.display = 'block';
              toggleBtn.classList?.remove?.('active');
              toggleBtn.textContent = '</> Mã HTML';
            }
          });
        }

        if (visualEl && visualEl.addEventListener) {
          visualEl.addEventListener('keyup', saveSelection);
          visualEl.addEventListener('mouseup', saveSelection);
          visualEl.addEventListener('input', syncToCode);
          visualEl.addEventListener('blur', syncToCode);

          // Advanced paste handler with DOMParser
          visualEl.addEventListener('paste', (event) => {
            const cd = event.clipboardData;
            if (!cd) return;

            const html = cd.getData?.('text/html');
            if (html && typeof DOMParser !== 'undefined') {
              const parsed = new DOMParser().parseFromString(html, 'text/html');
              const embeddedImages = Array.from(parsed.body.querySelectorAll('img')).filter(
                img => !/^https:/i.test(img.getAttribute('src') || '')
              );
              const hasImageFile = Array.from(cd.files || []).some(
                file => file.type && file.type.startsWith('image/')
              );

              if (embeddedImages.length || hasImageFile) {
                event.preventDefault?.();
                saveSelection();
                embeddedImages.forEach(img => img.remove());
                if (html) {
                  insertHtmlAtCursor(parsed.body.innerHTML);
                } else {
                  insertHtmlAtCursor(escapeHtml(cd.getData?.('text/plain') || ''));
                }
                showError('Hãy tải ảnh lên Google Drive rồi dùng nút “Chèn ảnh”.');
                return;
              }
            }

            if (cd.items) {
              for (let i = 0; i < cd.items.length; i++) {
                if (cd.items[i].type && cd.items[i].type.indexOf('image') !== -1) {
                  event.preventDefault?.();
                  showError('Hệ thống không hỗ trợ dán ảnh trực tiếp base64. Vui lòng dùng Google Drive.');
                  return;
                }
              }
            }
          });

          visualEl.addEventListener('drop', (event) => {
            const hasImage = Array.from(event.dataTransfer?.files || []).some(
              file => file.type && file.type.startsWith('image/')
            );
            if (hasImage) {
              event.preventDefault?.();
              showError('Hãy dùng nút “Chèn ảnh” để nhập link ảnh.');
            }
          });
        }

        if (codeEl && codeEl.addEventListener) {
          codeEl.addEventListener('input', syncToVisual);
        }

        // Heading format dropdown
        const headingSelect = wrap.querySelector ? wrap.querySelector('.select-format-heading') : null;
        if (headingSelect && headingSelect.addEventListener) {
          headingSelect.addEventListener('change', () => {
            const tag = headingSelect.value;
            visualEl?.focus?.();
            if (typeof document !== 'undefined' && document.execCommand) {
              document.execCommand('formatBlock', false, tag === 'p' ? '<p>' : `<${tag}>`);
            }
            syncToCode();
          });
        }

        // Formatting action buttons (Bold, Italic, Underline, Strikethrough, Lists, Alignment, Clear)
        const formatBtnConfigs = [
          { sel: '.btn-format-bold', cmd: 'bold' },
          { sel: '.btn-format-italic', cmd: 'italic' },
          { sel: '.btn-format-underline', cmd: 'underline' },
          { sel: '.btn-format-strike', cmd: 'strikeThrough' },
          { sel: '.btn-format-ul', cmd: 'insertUnorderedList' },
          { sel: '.btn-format-ol', cmd: 'insertOrderedList' },
          { sel: '.btn-format-align-left', cmd: 'justifyLeft' },
          { sel: '.btn-format-align-center', cmd: 'justifyCenter' },
          { sel: '.btn-format-align-right', cmd: 'justifyRight' },
          { sel: '.btn-format-clear', cmd: 'removeFormat' }
        ];

        formatBtnConfigs.forEach(({ sel, cmd }) => {
          const btn = wrap.querySelector ? wrap.querySelector(sel) : null;
          if (btn && btn.addEventListener) {
            btn.addEventListener('mousedown', (e) => {
              e.preventDefault?.(); // Prevent loss of selection
            });
            btn.addEventListener('click', (e) => {
              e.preventDefault?.();
              visualEl?.focus?.();
              if (typeof document !== 'undefined' && document.execCommand) {
                document.execCommand(cmd, false, null);
              }
              syncToCode();
            });
          }
        });

        if (tableBtn && tableMenu && tableBtn.addEventListener) {
          tableBtn.addEventListener?.('mousedown', saveSelection);
          tableBtn.addEventListener('click', (e) => {
            e.stopPropagation?.();
            saveSelection();
            const isVisible = tableMenu.style?.display !== 'none';
            closeAllPopups();
            if (tableMenu.style) tableMenu.style.display = isVisible ? 'none' : 'grid';
          });

          const gridBtns = tableMenu.querySelectorAll?.('.btn-table-grid') || [];
          if (gridBtns.forEach) {
            gridBtns.forEach(btn => {
              btn.addEventListener?.('click', (e) => {
                e.stopPropagation?.();
                const r = Number(btn.getAttribute('data-rows')) || 2;
                const c = Number(btn.getAttribute('data-cols')) || 2;
                closeAllPopups();
                const tblHtml = generateTableHtml(r, c) + '<p><br></p>';
                insertHtmlAtCursor(tblHtml);
              });
            });
          }

          const presetBtns = tableMenu.querySelectorAll?.('.btn-table-preset') || [];
          if (presetBtns.forEach) {
            presetBtns.forEach(btn => {
              btn.addEventListener?.('click', (e) => {
                e.stopPropagation?.();
                const preset = btn.getAttribute('data-preset');
                closeAllPopups();
                const tblHtml = generateTableHtml(null, null, preset) + '<p><br></p>';
                insertHtmlAtCursor(tblHtml);
              });
            });
          }
        }

        if (imageBtn && imagePopup) {
          imageBtn.addEventListener?.('mousedown', saveSelection);
          imageBtn.addEventListener('click', (e) => {
            e.stopPropagation?.();
            saveSelection();
            const isVisible = imagePopup.style?.display !== 'none';
            closeAllPopups();
            if (imagePopup.style) {
              imagePopup.style.display = isVisible ? 'none' : 'grid';
              if (!isVisible && imageLinkInput) {
                imageLinkInput.value = '';
                clearError();
                setTimeout(() => imageLinkInput.focus?.(), 50);
              }
            }
          });

          const executeInsertImage = () => {
            const urlVal = imageLinkInput?.value?.trim() || '';
            if (!urlVal) {
              if (imageErrorEl) {
                imageErrorEl.textContent = 'Vui lòng nhập đường dẫn ảnh.';
                if (imageErrorEl.style) imageErrorEl.style.display = 'block';
              }
              return;
            }
            const converted = convertGoogleDriveImageUrl(urlVal);
            if (!validateImageUrl(converted)) {
              if (imageErrorEl) {
                imageErrorEl.textContent = 'Link không hợp lệ. Hãy dùng link HTTPS hoặc Google Drive.';
                if (imageErrorEl.style) imageErrorEl.style.display = 'block';
              }
              return;
            }
            const imgTag = `<img src="${escapeHtml(converted)}" alt="" />`;
            insertHtmlAtCursor(imgTag);
            closeAllPopups();
          };

          confirmImageBtn?.addEventListener?.('click', (e) => {
            e.stopPropagation?.();
            executeInsertImage();
          });

          imageLinkInput?.addEventListener?.('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault?.();
              executeInsertImage();
            }
          });
        }
      });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      const onDocClick = (e) => {
        if (isDisposed) return;
        const openMenus = container.querySelectorAll ? container.querySelectorAll('.table-presets-menu, .image-insert-popup') : [];
        if (openMenus.forEach) {
          openMenus.forEach(m => {
            if (!e.target || !m.contains?.(e.target)) {
              if (m.style) m.style.display = 'none';
            }
          });
        }
      };
      document.addEventListener('click', onDocClick);
      renderCycleCleanups.push(() => {
        document.removeEventListener?.('click', onDocClick);
      });
    }
  }

  const handle = {
    dispose() {
      if (isDisposed) return;
      isDisposed = true;
      for (const cleanup of renderCycleCleanups) {
        try { cleanup(); } catch (_) {}
      }
      renderCycleCleanups = [];
      unregisterUnsavedChangesGuard(unsavedGuardChecker, builderOwner);
      if (mountedBuilders.get(container)?.handle === handle) {
        mountedBuilders.delete(container);
      }
      for (const t of timeouts) clearTimeout(t);
      timeouts.clear();

      disposeBuilderModals(builderOwner);

      if (typeof container?.querySelectorAll === 'function') {
        const audios = container.querySelectorAll('audio');
        if (audios && audios.forEach) {
          audios.forEach(a => {
            try { a.pause?.(); a.src = ''; } catch (_) {}
          });
        }
      }
    },
    hasUnsavedChanges() {
      return !isDisposed && isDirty;
    },
    getDraft() {
      return draftState;
    }
  };

  mountedBuilders.set(container, {
    formVersionId: draftState.formVersionId,
    formVersionData,
    options,
    submissionCount: Number(draftState.submissionCount || 0),
    version: Number(draftState.version || 1),
    status: draftState.status || 'draft',
    handle,
    isDisposed: false
  });

  render();
  return handle;
}

export function renderTestBuilderView(container, formVersionData = {}, options = {}) {
  return mountBuilder(container, formVersionData, options);
}
