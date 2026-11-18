// NGUỒN: file .ts này; block-csv-import.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { BinderBase, BuilderOptions, DraftExercise } from './draft-model.js';
import { generateUuid } from './draft-model.js';
import { commitCardsToExercise } from './card-to-item.js';
import { openBlockCsvUploadModal } from './batch-import.js';

export function bindBlockCsvImport({ container, builderOwner, draftState, markAsDirty, resequenceItemPositions, render, syncInputs, getNextPosition, options }: BinderBase & {
  builderOwner: unknown;
  resequenceItemPositions: () => void;
  getNextPosition: () => number;
  options?: BuilderOptions;
}) {
    // Import Block CSV (All Exercises in Block)
    const importBlockCsvBtns = container.querySelectorAll<HTMLElement>('.btn-import-block-csv');
    importBlockCsvBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;

        openBlockCsvUploadModal({ owner: builderOwner,
          block,
          blockIdx: bIdx,
          onImport: ({ mode, exercises }: any) => {
            if (!exercises || !exercises.length) return;

            if (mode === 'overwrite') {
              (block.items || []).forEach(it => {
                if (it.itemVersionId) {
                  delete draftState.gradingKey.items[it.itemVersionId!];
                }
              });
              block.exercises = [];
              block.items = [];
            }

            block.exercises = block.exercises || [];
            block.items = block.items || [];

            exercises.forEach((parsedEx: any) => {
              const newExId = generateUuid();
              const newExNumber = block.exercises!.length + 1;
              const targetEx: DraftExercise = {
                exerciseId: newExId,
                exerciseNumber: newExNumber,
                title: parsedEx.title || `Exercise ${newExNumber}`,
                instructions: parsedEx.instructions || ''
              };
              block.exercises!.push(targetEx);

              // Dựng câu + đáp án chấm bằng hàm dùng chung với hộp thoại "Thêm câu hỏi".
              commitCardsToExercise({ draftState, block, exercise: targetEx, cards: parsedEx.items || [], startPosition: getNextPosition(), newId: generateUuid });
            });

            resequenceItemPositions();
            markAsDirty();
            render();
          }
        });
      });
    });
}
