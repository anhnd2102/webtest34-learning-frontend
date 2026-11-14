import { generateUuid, moveExerciseBetweenBlocks, deleteExerciseFromBlock } from './draft-model.js';
import { batchGenerateExerciseVocabVariants } from './question-content.js';
import { openMoveExerciseModal } from './move-exercise-modal.js';
export function bindExerciseActions({ container, builderOwner, draftState, markAsDirty, setActiveBlockIdx, resolveTargetExercise, resequenceItemPositions, render, syncInputs }) {
    // Add Exercise to block
    const addExerciseBtns = container.querySelectorAll('.btn-add-exercise');
    addExerciseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block)
                return;
            if (!Array.isArray(block.exercises))
                block.exercises = [];
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
            markAsDirty();
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
                    if (!block)
                        return;
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
            if (!block || !block.exercises || exIdx <= 0)
                return;
            const temp = block.exercises[exIdx];
            block.exercises[exIdx] = block.exercises[exIdx - 1];
            block.exercises[exIdx - 1] = temp;
            block.exercises.forEach((ex, idx) => { ex.exerciseNumber = idx + 1; });
            const orderMap = new Map();
            block.exercises.forEach((ex, idx) => orderMap.set(ex.exerciseId, idx));
            (block.items || []).sort((a, b) => {
                const ordA = orderMap.get(a.exerciseId) ?? 999;
                const ordB = orderMap.get(b.exerciseId) ?? 999;
                if (ordA !== ordB)
                    return ordA - ordB;
                return (a.position || 0) - (b.position || 0);
            });
            let pos = 1;
            for (const b of draftState.blocks) {
                for (const it of b.items || []) {
                    it.position = pos++;
                }
            }
            markAsDirty();
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
            if (!block || !block.exercises || exIdx >= block.exercises.length - 1)
                return;
            const temp = block.exercises[exIdx];
            block.exercises[exIdx] = block.exercises[exIdx + 1];
            block.exercises[exIdx + 1] = temp;
            block.exercises.forEach((ex, idx) => { ex.exerciseNumber = idx + 1; });
            const orderMap = new Map();
            block.exercises.forEach((ex, idx) => orderMap.set(ex.exerciseId, idx));
            (block.items || []).sort((a, b) => {
                const ordA = orderMap.get(a.exerciseId) ?? 999;
                const ordB = orderMap.get(b.exerciseId) ?? 999;
                if (ordA !== ordB)
                    return ordA - ordB;
                return (a.position || 0) - (b.position || 0);
            });
            let pos = 1;
            for (const b of draftState.blocks) {
                for (const it of b.items || []) {
                    it.position = pos++;
                }
            }
            markAsDirty();
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
            if (!block || !block.exercises || block.exercises.length <= 1)
                return;
            const deletedEx = block.exercises[exIdx];
            if (!deletedEx)
                return;
            const exItems = (block.items || []).filter(it => it.exerciseId === deletedEx.exerciseId);
            if (exItems.length > 0) {
                const exTitle = deletedEx.title || `Bài tập ${exIdx + 1}`;
                const confirmMsg = `Bạn có chắc chắn muốn xóa "${exTitle}" cùng toàn bộ ${exItems.length} câu hỏi bên trong không? Thao tác này không thể hoàn tác.`;
                if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                    if (!window.confirm(confirmMsg))
                        return;
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
                    if (!block || !exId)
                        return;
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
                                setActiveBlockIdx(targetBlockIdx);
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
                                                if (exCard.classList)
                                                    exCard.classList.remove('block-target-highlight');
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
}
