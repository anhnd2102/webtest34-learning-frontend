// NGUỒN: file .ts này; test-import.js do `npm run build` sinh ra.
//
// Nối nút "Nhập cả đề từ Excel" với hộp thoại nhập nhiều Phần (spec #91, GĐ 4). Mỗi sheet thành một Phần mới thêm vào cuối đề.
import type { AuthoringHost } from '../draft-model.js';
import { generateUuid } from '../draft-model.js';
import { appendExercisesToBlock, applyBlockInfo } from '../card-to-item.js';
import { openTestImportDialog } from '../test-import-dialog.js';

export function bindTestImport({ container, draftState, builderOwner, actions }: AuthoringHost) {
  const { syncInputs, getNextPosition, resequenceItemPositions, markAsDirty, render, runImport } = actions;
  container.querySelector<HTMLElement>('#btn-import-test-excel')?.addEventListener('click', () => {
    syncInputs();
    openTestImportDialog({
      owner: builderOwner,
      existingBlockCount: draftState.blocks.length,
      onImport: blocks => {
        const apply = () => {
          for (const entry of blocks) {
            const block: any = {
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
            if (entry.info) applyBlockInfo(block, entry.info, { withTitle: false });
          }
          resequenceItemPositions();
          markAsDirty();
          render();
        };
        const questions = blocks.reduce((sum, entry) => sum + entry.read.cards.length, 0);
        const label = `Đã thêm ${blocks.length} Phần (${questions} câu) từ file Excel.`;
        if (runImport) runImport(label, apply); else apply();
      }
    });
  });
}
