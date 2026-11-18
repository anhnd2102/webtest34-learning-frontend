import { generateUuid } from '../draft-model.js';
import { commitCardsToExercise } from '../card-to-item.js';
import { openAddQuestionDialog } from '../add-question-dialog.js';
import { failuresMessage, resolveRubricCards } from '../rubric-resolve.js';
import { suggestLevel } from '../rubric-wizard-model.js';
export function bindAddQuestion({ container, draftState, builderOwner, actions, options: builderOptions }) {
    const { syncInputs, getNextPosition, resolveTargetExercise, resequenceItemPositions, markAsDirty, render, runImport } = actions;
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
                defaultLevel: suggestLevel(builderOptions?.courseId),
                exerciseTitle: exercise.title || `Bài tập ${exercise.exerciseNumber || ''}`.trim(),
                existingPrompts: (block.items || []).filter(item => item.exerciseId === exercise.exerciseId).map(item => String(item.prompt || '')).filter(Boolean),
                onCommit: async (rawCards, meta) => {
                    // Dòng Tự luận chấm AI kiểu mới: backend dựng quy tắc chấm trước khi thành câu hỏi.
                    const outcome = await resolveRubricCards(rawCards, builderOptions?.onBuildRubric);
                    if (outcome.failures.length)
                        window.alert?.(failuresMessage(outcome.failures));
                    const cards = outcome.cards;
                    if (!cards.length)
                        return;
                    const apply = () => {
                        commitCardsToExercise({ draftState, block, exercise, cards, startPosition: getNextPosition(), newId: generateUuid });
                        resequenceItemPositions();
                        markAsDirty();
                        render();
                    };
                    // Nhập hàng loạt hoặc từ file có thể hoàn tác; thêm từng câu thì không (người ra đề thấy ngay câu vừa thêm).
                    if (meta.via !== 'single' && runImport)
                        runImport(`Đã thêm ${cards.length} câu vào ${exercise.title || 'bài tập'}.`, apply);
                    else
                        apply();
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
