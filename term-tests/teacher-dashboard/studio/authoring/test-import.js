import { generateUuid } from '../draft-model.js';
import { appendExercisesToBlock, applyBlockInfo } from '../card-to-item.js';
import { openTestImportDialog } from '../test-import-dialog.js';
export function bindTestImport({ container, draftState, builderOwner, actions }) {
    const { syncInputs, getNextPosition, resequenceItemPositions, markAsDirty, render, runImport } = actions;
    container.querySelector('#btn-import-test-excel')?.addEventListener('click', () => {
        syncInputs();
        openTestImportDialog({
            owner: builderOwner,
            existingBlockCount: draftState.blocks.length,
            onImport: blocks => {
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
                        appendExercisesToBlock({ draftState, block, exercises: entry.read.exercises.filter(exercise => exercise.items.length), getNextPosition, newId: generateUuid });
                        // Tên Phần là tên sheet; thông tin Phần chỉ bổ sung hướng dẫn, bài đọc, âm thanh.
                        if (entry.info)
                            applyBlockInfo(block, entry.info, { withTitle: false });
                    }
                    resequenceItemPositions();
                    markAsDirty();
                    render();
                };
                const questions = blocks.reduce((sum, entry) => sum + entry.read.cards.length, 0);
                const label = `Đã thêm ${blocks.length} Phần (${questions} câu) từ file Excel.`;
                if (runImport)
                    runImport(label, apply);
                else
                    apply();
            }
        });
    });
}
