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
import { bindChoiceVariantActions } from './authoring/choice-variant-actions.js';
import { bindVocabularyActions } from './authoring/vocabulary-actions.js';
import { bindVariantInputActions } from './authoring/variant-input-actions.js';
import { bindRubricActions } from './authoring/rubric-actions.js';
import { bindClozeScriptActions } from './cloze-script-actions.js';
import { bindSandboxActions } from './sandbox-actions.js';
import { bindBlockReorderActions } from './block-actions.js';
import { bindToolbarActions } from './toolbar-actions.js';
import { bindRichEditorControls } from './rich-editor-controls.js';
import { openMoveExerciseModal } from './move-exercise-modal.js';
import { bindExerciseActions } from './exercise-actions.js';

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
  const setActiveBlockIdx = (value) => { activeBlockIdx = value; };
  const getActiveBlockIdx = () => activeBlockIdx;
  const isBuilderDisposed = () => isDisposed;
  const addCleanup = (cleanup) => { renderCycleCleanups.push(cleanup); };

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
            <div class="form-group exercise-field exercise-reference-context-field">
              <div class="exercise-reference-context-header">
                <label class="form-label">
                  ${renderSvgIcon('book', 'icon-inline')}
                  <span>Ngữ cảnh bài đọc / Script tham chiếu chung cho AI:</span>
                  <span class="badge badge-info exercise-reference-context-badge">Ẩn với học viên</span>
                </label>
                <button type="button" class="btn btn-secondary btn-sm btn-pull-exercise-cloze-script" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" title="Tự động lấy đoạn văn từ bài Điền từ nội tuyến hoặc bài nghe phía trước">
                  ${renderSvgIcon('clipboard', 'icon-inline')} Lấy Script từ bài Điền từ phía trước
                </button>
              </div>
              <textarea class="form-control form-control-sm exercise-reference-context-input" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" rows="3" placeholder="Dán đoạn văn bài đọc hoặc Script bài nghe dùng chung cho các câu hỏi Đọc hiểu Khối 03 trong bài này... AI sẽ đối chiếu văn bản này khi chấm các câu hỏi tự luận con.">${escapeHtml(ex.referenceContext || '')}</textarea>
              <div class="exercise-reference-context-hint">
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
        <div class="builder-block-card${isBlockCollapsed ? ' is-collapsed' : ''}${isActiveBlock ? ' active-block-tab' : ''}" id="builder-block-${index}" data-block-id="${block.blockId}" data-index="${index}"${isActiveBlock ? '' : ' hidden'}>
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
              <div class="audio-input-with-preview">
                <input type="text" class="form-control block-audio-input" data-index="${index}" value="${escapeHtml(audioVal)}" placeholder="https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/... hoặc assets/34/test-1/listening.mp3" />
                <button type="button" class="btn btn-secondary btn-sm btn-preview-audio" data-target="block" data-index="${index}" title="Nghe thử file âm thanh">
                  ${renderSvgIcon('play', 'icon-inline')} Nghe thử
                </button>
              </div>
              <div class="form-hint audio-guide-hint">Chỉ sử dụng link âm thanh Cloudflare R2 (hoặc assets/). Không hỗ trợ link Google Drive cho bài nghe.</div>
              <div class="audio-drive-warning text-danger"${(audioVal.includes('drive.google.com') || audioVal.includes('docs.google.com')) ? '' : ' hidden'}>Hệ thống không hỗ trợ link Google Drive cho bài nghe. Vui lòng sử dụng link Cloudflare R2 hoặc assets/.</div>
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
              <div class="block-exercise-actions">
                <button type="button" class="btn btn-outline-primary btn-add-exercise" data-block-idx="${index}">
                  + Thêm bài tập (Exercise)
                </button>
                <button type="button" class="btn btn-secondary btn-import-block-csv" data-block-idx="${index}" title="Nhập toàn bộ các bài tập trong Phần này từ file CSV">
                  ${renderSvgIcon('upload', 'icon-inline')} <span>Nhập CSV các bài tập (Block CSV)</span>
                </button>
              </div>
            </div>

            <div class="block-tab-footer-nav">
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
          if (warningEl) {
            const hasDrive = val.includes('drive.google.com') || val.includes('docs.google.com');
            warningEl.hidden = !hasDrive;
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

    bindExerciseActions({ container, builderOwner, draftState, markAsDirty, setActiveBlockIdx, resolveTargetExercise, resequenceItemPositions, render, syncInputs });

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

    bindChoiceVariantActions({ container, draftState, render, syncInputs });

    bindVocabularyActions({ container, draftState, markAsDirty, render, syncInputs, options });

    bindVariantInputActions({ container, draftState, render, syncInputs });

    bindRubricActions({ container, draftState, render, syncInputs });

    bindClozeScriptActions({ container, draftState, markAsDirty, render, syncInputs });

    bindSandboxActions({ container, draftState, render, syncInputs, options });

    bindBlockReorderActions({ container, draftState, markAsDirty, setActiveBlockIdx, getActiveBlockIdx, resequenceItemPositions, render, syncInputs });

    bindDraftSaving({ container, draftState, options, syncInputs, render, markSaved, lifecycle: workflowLifecycle });

    const openCandidateSimulationModal = createSimulation({ draftState, builderOwner, syncInputs });

    // Smart Publishing Modal (2-Step Wizard & Safe Double-Check)
    const openPublishingModal = createPublishing({ draftState, builderOwner, syncInputs, options, render, markSaved });

    // Execution Report Dialog


    bindToolbarActions({ container, builderOwner, draftState, markSaved, handle, openCandidateSimulationModal, openPublishingModal, formVersionData, options });

    bindRichEditorControls({ container, draftState, markAsDirty, isBuilderDisposed, addCleanup, render });
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
