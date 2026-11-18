import { generateUuid } from '../draft-model.js';
import { commitCardsToExercise } from '../card-to-item.js';
import { openAddQuestionDialog } from '../add-question-dialog.js';
export function bindAddQuestion({ container, draftState, builderOwner, actions }) {
    const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render } = actions;
    container.querySelectorAll('.btn-add-question').forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const blockIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[blockIdx];
            if (!block)
                return;
            const exercise = resolveTargetExercise(block, btn);
            openAddQuestionDialog({
                owner: builderOwner,
                exerciseTitle: exercise.title || `Bài tập ${exercise.exerciseNumber || ''}`.trim(),
                onCommit: cards => {
                    commitCardsToExercise({ draftState, block, exercise, cards, startPosition: getNextPosition(), newId: generateUuid });
                    resequenceItemPositions();
                    markAsDirty();
                    render();
                },
                // Tự luận chấm AI: dùng trình hướng dẫn hiện có (nút của đúng bài tập này).
                onOpenWizard: () => {
                    const selector = `.btn-add-rubric-async[data-block-idx="${blockIdx}"][data-exercise-idx="${btn.getAttribute('data-exercise-idx')}"]`;
                    container.querySelector(selector)?.click();
                }
            });
        });
    });
}
