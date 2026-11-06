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
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '10050';
  modal.style.padding = '24px 16px';
  modal.style.boxSizing = 'border-box';

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
    <div class="candidate-sim-modal move-exercise-modal" role="dialog" aria-modal="true" style="max-width: 580px; width: 95%; max-height: calc(100vh - 48px); display: flex; flex-direction: column; overflow: hidden; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);">
      <div class="candidate-sim-header" style="flex-shrink: 0; display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding: 16px 20px 12px; margin-bottom: 0;">
        <div>
          <h3 style="margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 8px;">
            ${renderSvgIcon('move', 'icon-inline')}
            <span>Chuyển Bài tập sang Phần khác</span>
          </h3>
          <p style="margin: 0; font-size: 13px; color: #64748b;">
            Chuyển toàn bộ bài tập và các câu hỏi con, tự động đánh số lại câu hỏi liên tục.
          </p>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-move-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>

      <div class="modal-body" style="flex: 1 1 auto; overflow-y: auto; min-height: 0; padding: 18px 20px; display: flex; flex-direction: column; gap: 14px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #334155;">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${escapeHtml(exercise.title || 'Bài tập')}
          </div>
          <div style="color: #64748b; font-size: 12px;">
            Gồm <strong>${exerciseQuestionCount} câu hỏi</strong> · Thuộc <strong>Phần ${sourceBlockIdx + 1}: ${escapeHtml(sourceBlock.title || '')}</strong>
          </div>
        </div>

        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Chọn Phần thi đích (Target Block):</label>
          <select class="form-select select-target-block" style="font-size: 13px;">
            ${targetBlockOptionsHtml}
          </select>
        </div>

        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Vị trí chèn trong Phần đích (Target Position):</label>
          <select class="form-select select-target-position" style="font-size: 13px;">
            <option value="end" selected>Cuối phần (Sau bài tập cuối cùng)</option>
            <option value="start">Đầu phần (Trước bài tập đầu tiên)</option>
            <option value="before_ex">Chèn trước một bài tập cụ thể...</option>
            <option value="after_ex">Chèn sau một bài tập cụ thể...</option>
          </select>
        </div>

        <div class="form-group target-exercise-row" style="margin: 0; display: none;">
          <label class="form-label" style="font-weight: 600; font-size: 13px; margin-bottom: 6px;">Chọn bài tập mốc:</label>
          <select class="form-select select-target-exercise" style="font-size: 13px;">
          </select>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #1e40af; line-height: 1.45;">
          ${renderSvgIcon('info', 'icon-inline')}
          <span><strong>Tự động đánh số câu hỏi:</strong> Sau khi chuyển, tất cả câu hỏi trong bài tập này và các bài tập tiếp theo sẽ được đánh số lại liên tục (1..N). Đáp án và thang điểm được bảo toàn 100%.</span>
        </div>
      </div>

      <div class="candidate-sim-footer" style="flex-shrink: 0; background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 20px; margin-top: auto; display: flex; justify-content: flex-end; gap: 8px;">
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
      targetExRow.style.display = 'none';
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
      targetExRow.style.display = 'block';
    } else {
      targetExRow.style.display = 'none';
    }
  }

  targetBlockSelect?.addEventListener('change', updateTargetExercisesDropdown);
  targetPosSelect?.addEventListener('change', () => {
    const pos = targetPosSelect.value;
    if (pos === 'before_ex' || pos === 'after_ex') {
      targetExRow.style.display = 'block';
      updateTargetExercisesDropdown();
    } else {
      targetExRow.style.display = 'none';
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

