import { generateUuid } from '../draft-model.js';
import { appendExercisesToBlock, applyBlockInfo } from '../card-to-item.js';
import { openTestImportDialog } from '../test-import-dialog.js';
import { failuresMessage, resolveExerciseRubrics } from '../rubric-resolve.js';
import { suggestLevel } from '../rubric-wizard-model.js';
export function bindTestImport({ container, draftState, builderOwner, actions, options }) {
    const { syncInputs, getNextPosition, resequenceItemPositions, markAsDirty, render, runImport } = actions;
    container.querySelector('#btn-import-test-excel')?.addEventListener('click', () => {
        syncInputs();
        openTestImportDialog({
            owner: builderOwner,
            existingBlockCount: draftState.blocks.length,
            defaultLevel: suggestLevel(options?.courseId),
            onImport: async (rawBlocks) => {
                // Dòng Tự luận chấm AI kiểu mới: backend dựng quy tắc chấm trước khi thành câu hỏi.
                const failures = [];
                const blocks = [];
                for (const entry of rawBlocks) {
                    const outcome = await resolveExerciseRubrics(entry.read.exercises, options?.onBuildRubric);
                    failures.push(...outcome.failures);
                    if (outcome.exercises.some(exercise => exercise.items.length))
                        blocks.push({ ...entry, exercises: outcome.exercises });
                }
                if (failures.length)
                    window.alert?.(failuresMessage(failures));
                if (!blocks.length)
                    return;
                const apply = () => {
                    for (const entry of blocks) {
                        const block = {
                            blockId: generateUuid(),
                            checkpoint: draftState.blocks.length + 1,
                            title: entry.title,
                            instructions: '',
                            audioUrl: null,
                            readingPassage: null,
                            stimulusAudioUrl: null,
                            stimulusReadingPassage: null,
                            exercises: [],
                            items: []
                        };
                        draftState.blocks.push(block);
                        appendExercisesToBlock({ draftState, block, exercises: entry.exercises.filter(exercise => exercise.items.length), getNextPosition, newId: generateUuid });
                        // Tên Phần là tên sheet; thông tin Phần chỉ bổ sung hướng dẫn, bài đọc, âm thanh.
                        if (entry.info)
                            applyBlockInfo(block, entry.info, { withTitle: false });
                    }
                    resequenceItemPositions();
                    markAsDirty();
                    render();
                };
                const questions = blocks.reduce((sum, entry) => sum + entry.exercises.reduce((inner, exercise) => inner + exercise.items.length, 0), 0);
                const label = `Đã thêm ${blocks.length} Phần (${questions} câu) từ file Excel.`;
                if (runImport)
                    runImport(label, apply);
                else
                    apply();
            }
        });
    });
}
