import {
  getActiveUnsavedChangesOwner,
  trackBuilderModal,
  releaseBuilderModal
} from '../navigation/unsaved-changes.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  escapeHtml
} from '../ui/presentation.js';
import {
  getItemSpanCount
} from './draft-model.js';

export function openMoveExerciseModal(opts = {}) {
  const {
    draftState,
    sourceBlockIdx,
    exerciseId,
    owner = getActiveUnsavedChangesOwner(),
    onConfirm = () => {}
  } = opts;

  if (typeof document === 'undefined' || !draftState || !Array.isArray(draftState.blocks)) {
    return null;
  }

  const sourceBlock = draftState.blocks[sourceBlockIdx];
  if (!sourceBlock) return null;

  const exercise = (sourceBlock.exercises || []).find(e => e.exerciseId === exerciseId);
  if (!exercise) return null;

  const exerciseItems = (sourceBlock.items || []).filter(it => it.exerciseId === exerciseId);
  const exerciseQuestionCount = exerciseItems.reduce((sum, itm) => sum + getItemSpanCount(itm), 0);

  // Remove existing modal if open
  const existingModal = document.getElementById('modal-move-exercise');
  if (existingModal) {
    releaseBuilderModal(existingModal);
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'modal-move-exercise';
  modal.className = 'candidate-sim-overlay move-exercise-modal-overlay';

  // Build target block options
  const targetBlockOptionsHtml = draftState.blocks.map((block, idx) => {
    const isCurrent = idx === sourceBlockIdx;
    const title = (block.title || `Phần ${idx + 1}`).trim();
    const exCount = (block.exercises || []).length;
    return `
      <option value="${idx}" ${isCurrent ? 'selected' : ''}>
        Phần ${idx + 1}: ${escapeHtml(title)} (${exCount} bài tập)${isCurrent ? ' [Phần hiện tại]' : ''}
      </option>
    `;
  }).join('');

  modal.innerHTML = `
    <div class="candidate-sim-modal move-exercise-modal move-layout-dialog" role="dialog" aria-modal="true">
      <div class="candidate-sim-header move-layout-header">
        <div>
          <h3 class="move-layout-title">
            ${renderSvgIcon('move', 'icon-inline')}
            <span>Chuyển Bài tập sang Phần khác</span>
          </h3>
          <p class="move-layout-subtitle">
            Chuyển toàn bộ bài tập và các câu hỏi con, tự động đánh số lại câu hỏi liên tục.
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-move-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>

      <div class="modal-body move-layout-body">
        <div class="move-layout-summary">
          <div class="move-layout-exercise-title">
            ${escapeHtml(exercise.title || 'Bài tập')}
          </div>
          <div class="move-layout-summary-meta">
            Gồm <strong>${exerciseQuestionCount} câu hỏi</strong> · Thuộc <strong>Phần ${sourceBlockIdx + 1}: ${escapeHtml(sourceBlock.title || '')}</strong>
          </div>
        </div>

        <div class="form-group move-layout-field">
          <label class="form-label move-layout-label">Chọn Phần thi đích (Target Block):</label>
          <select class="form-select select-target-block move-layout-select">
            ${targetBlockOptionsHtml}
          </select>
        </div>

        <div class="form-group move-layout-field">
          <label class="form-label move-layout-label">Vị trí chèn trong Phần đích (Target Position):</label>
          <select class="form-select select-target-position move-layout-select">
            <option value="end" selected>Cuối phần (Sau bài tập cuối cùng)</option>
            <option value="start">Đầu phần (Trước bài tập đầu tiên)</option>
            <option value="before_ex">Chèn trước một bài tập cụ thể...</option>
            <option value="after_ex">Chèn sau một bài tập cụ thể...</option>
          </select>
        </div>

        <div class="form-group target-exercise-row move-layout-anchor-field" hidden>
          <label class="form-label move-layout-label">Chọn bài tập mốc:</label>
          <select class="form-select select-target-exercise move-layout-select">
          </select>
        </div>

        <div class="move-layout-note">
          ${renderSvgIcon('info', 'icon-inline')}
          <span><strong>Tự động đánh số câu hỏi:</strong> Sau khi chuyển, tất cả câu hỏi trong bài tập này và các bài tập tiếp theo sẽ được đánh số lại liên tục (1..N). Đáp án và thang điểm được bảo toàn 100%.</span>
        </div>
      </div>

      <div class="candidate-sim-footer move-layout-footer">
        <button type="button" class="btn btn-secondary btn-cancel-move-modal">Hủy</button>
        <button type="button" class="btn btn-primary btn-confirm-move-modal">
          ${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận chuyển</span>
        </button>
      </div>
    </div>
  `;

  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('.btn-close-move-modal');
  const cancelBtn = modal.querySelector('.btn-cancel-move-modal');
  const targetBlockSelect = modal.querySelector('.select-target-block');
  const targetPosSelect = modal.querySelector('.select-target-position');
  const targetExRow = modal.querySelector('.target-exercise-row');
  const targetExSelect = modal.querySelector('.select-target-exercise');
  const confirmBtn = modal.querySelector('.btn-confirm-move-modal');

  const closeModal = () => {
    releaseBuilderModal(modal);
    modal.remove();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  function updateTargetExercisesDropdown() {
    const targetIdx = Number(targetBlockSelect.value);
    const targetBlock = draftState.blocks[targetIdx];
    const exercises = (targetBlock?.exercises || []).filter(e => e.exerciseId !== exerciseId);

    if (exercises.length === 0) {
      targetExRow.hidden = true;
      if (targetPosSelect.value === 'before_ex' || targetPosSelect.value === 'after_ex') {
        targetPosSelect.value = 'end';
      }
      return;
    }

    let optsHtml = '';
    exercises.forEach((ex, idx) => {
      optsHtml += `<option value="${idx}">Bài tập ${ex.exerciseNumber || (idx + 1)}: ${escapeHtml(ex.title || '')}</option>`;
    });
    targetExSelect.innerHTML = optsHtml;

    const pos = targetPosSelect.value;
    if (pos === 'before_ex' || pos === 'after_ex') {
      targetExRow.hidden = false;
    } else {
      targetExRow.hidden = true;
    }
  }

  targetBlockSelect?.addEventListener('change', updateTargetExercisesDropdown);
  targetPosSelect?.addEventListener('change', () => {
    const pos = targetPosSelect.value;
    if (pos === 'before_ex' || pos === 'after_ex') {
      targetExRow.hidden = false;
      updateTargetExercisesDropdown();
    } else {
      targetExRow.hidden = true;
    }
  });

  updateTargetExercisesDropdown();

  confirmBtn?.addEventListener('click', () => {
    const targetBlockIdx = Number(targetBlockSelect.value);
    const pos = targetPosSelect.value;
    const targetBlock = draftState.blocks[targetBlockIdx];
    const availableExercises = (targetBlock?.exercises || []).filter(e => e.exerciseId !== exerciseId);

    let insertIndex = -1; // default end
    if (pos === 'start') {
      insertIndex = 0;
    } else if (pos === 'end') {
      insertIndex = targetBlock?.exercises?.length || 0;
    } else if (pos === 'before_ex') {
      const selectedExIdx = Number(targetExSelect.value);
      insertIndex = Math.max(0, selectedExIdx);
    } else if (pos === 'after_ex') {
      const selectedExIdx = Number(targetExSelect.value);
      insertIndex = selectedExIdx + 1;
    }

    closeModal();
    if (typeof onConfirm === 'function') {
      onConfirm({
        sourceBlockIdx,
        exerciseId,
        targetBlockIdx,
        insertIndex
      });
    }
  });

  return modal;
}

