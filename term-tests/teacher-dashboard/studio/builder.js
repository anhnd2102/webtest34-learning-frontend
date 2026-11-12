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
import { renderSvgIcon } from '../ui/icons.js';
import { updatePromptPosition, isComprehensionExercise, pruneOrphanClozeKeys, getItemSpanCount, computeTestBuilderScoreSummary, scaleRubricCriteriaScores, resequenceItemPositions } from './draft-model.js';
import { escapeHtml } from '../ui/presentation.js';
import { renderScoreBreakdownBarHtml, renderBlocksNavCardHtml, renderScoreSkillChipsHtml, renderBlockJumpTagsHtml } from './builder-summary.js';
import { bindBlockJumpChips } from './block-jump-chips.js';
import { bindBlockCsvImport } from './block-csv-import.js';
import { bindAudioPreviewActions } from './audio-preview-actions.js';
import { bindBlockNavigationActions } from './block-navigation-actions.js';
import { bindCollapseActions } from './collapse-actions.js';
import { bindItemActions } from './item-actions.js';
import { bindChoiceVariantActions } from './authoring/choice-variant-actions.js';
import { bindVocabularyActions } from './authoring/vocabulary-actions.js';
import { bindVariantInputActions } from './authoring/variant-input-actions.js';
import { bindRubricActions } from './authoring/rubric-actions.js';
import { bindClozeScriptActions } from './cloze-script-actions.js';
import { bindSandboxActions } from './sandbox-actions.js';
import { bindBlockReorderActions } from './block-actions.js';
import { bindToolbarActions } from './toolbar-actions.js';
import { bindRichEditorControls } from './rich-editor-controls.js';
import { bindExerciseActions } from './exercise-actions.js';


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
    bindBlockJumpChips({ container, jumpToBlock });

    bindBlockCsvImport({ container, builderOwner, draftState, markAsDirty, resequenceItemPositions, render, syncInputs, getNextPosition, options });

    bindExerciseActions({ container, builderOwner, draftState, markAsDirty, setActiveBlockIdx, resolveTargetExercise, resequenceItemPositions, render, syncInputs });

    bindAudioPreviewActions({ container, render });

    bindBlockNavigationActions({ container, draftState, markAsDirty, setActiveBlockIdx, render, jumpToBlock, syncInputs, getNextPosition, options });

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

    bindCollapseActions({ container, draftState, collapsedCardKeys, render });

    bindItemActions({ container, draftState, markAsDirty, isBuilderDisposed, addCleanup, resequenceItemPositions, render, syncInputs });

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
