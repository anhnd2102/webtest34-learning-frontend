// NGUỒN: file .ts này; block-csv-import.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { BinderBase, BuilderOptions } from './draft-model.js';
import { generateUuid } from './draft-model.js';
import { appendExercisesToBlock, applyBlockInfo } from './card-to-item.js';
import { failuresMessage, resolveExerciseRubrics } from './rubric-resolve.js';
import { suggestLevel } from './rubric-wizard-model.js';
import { openBlockCsvUploadModal } from './batch-import.js';

export function bindBlockCsvImport({ container, builderOwner, draftState, markAsDirty, resequenceItemPositions, render, syncInputs, getNextPosition, options, runImport }: BinderBase & {
  runImport?: (label: string, apply: () => void) => void;
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
          defaultLevel: suggestLevel(options?.courseId),
          onImport: async ({ mode, exercises: rawExercises, blockInfo }: any) => {
            if (!rawExercises || !rawExercises.length) return;
            // Dòng Tự luận chấm AI kiểu mới: backend dựng quy tắc chấm trước khi thành câu hỏi.
            const outcome = await resolveExerciseRubrics(rawExercises, options?.onBuildRubric);
            if (outcome.failures.length) window.alert?.(failuresMessage(outcome.failures));
            const exercises = outcome.exercises;
            if (!exercises.length) return;
            const count = exercises.reduce((sum: number, exercise: any) => sum + (exercise.items?.length || 0), 0);
            const apply = () => {
              appendExercisesToBlock({ draftState, block, exercises, getNextPosition, newId: generateUuid, mode: mode === 'overwrite' ? 'overwrite' : 'append' });
              if (blockInfo) applyBlockInfo(block, blockInfo);
              resequenceItemPositions();
              markAsDirty();
              render();
            };
            // Có thể hoàn tác lần nhập này cho tới khi người ra đề sửa tiếp.
            if (runImport) runImport(`Đã nhập ${count} câu vào ${block.title || `Phần ${bIdx + 1}`}.`, apply); else apply();
          }
        });
      });
    });
}
