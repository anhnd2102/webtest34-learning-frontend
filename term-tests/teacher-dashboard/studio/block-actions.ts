// NGUỒN: file .ts này; block-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { BinderBase } from './draft-model.js';
export function bindBlockReorderActions({ container, draftState, markAsDirty, setActiveBlockIdx, getActiveBlockIdx, resequenceItemPositions, render, syncInputs }: BinderBase & {
  setActiveBlockIdx: (index: number) => void;
  getActiveBlockIdx: () => number;
  resequenceItemPositions: () => void;
}) {
    const upBtns = container.querySelectorAll<HTMLElement>('.btn-move-block-up');
    if (upBtns && typeof upBtns.forEach === 'function') {
      upBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (idx > 0) {
              const temp = draftState.blocks[idx];
              draftState.blocks[idx] = draftState.blocks[idx - 1];
              draftState.blocks[idx - 1] = temp;
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              setActiveBlockIdx(idx - 1);
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          });
        }
      });
    }

    const downBtns = container.querySelectorAll<HTMLElement>('.btn-move-block-down');
    if (downBtns && typeof downBtns.forEach === 'function') {
      downBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (idx < draftState.blocks.length - 1) {
              const temp = draftState.blocks[idx];
              draftState.blocks[idx] = draftState.blocks[idx + 1];
              draftState.blocks[idx + 1] = temp;
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              setActiveBlockIdx(idx + 1);
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          });
        }
      });
    }

    const delBtns = container.querySelectorAll<HTMLElement>('.btn-delete-block');
    if (delBtns && typeof delBtns.forEach === 'function') {
      delBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (draftState.blocks.length > 1) {
              const targetBlock = draftState.blocks[idx];
              if (!targetBlock) return;
              if (targetBlock.items && targetBlock.items.length > 0) {
                const blockTitle = targetBlock.title || `Phần ${idx + 1}`;
                const confirmMsg = `Bạn có chắc chắn muốn xóa "${blockTitle}" cùng toàn bộ ${targetBlock.items.length} câu hỏi bên trong không? Thao tác này không thể hoàn tác.`;
                if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
                  if (!window.confirm(confirmMsg)) return;
                }
              }
              const [deletedBlock] = draftState.blocks.splice(idx, 1);
              if (deletedBlock?.items) {
                deletedBlock.items.forEach(it => {
                  if (it?.itemVersionId && draftState.gradingKey?.items) {
                    delete draftState.gradingKey.items[it.itemVersionId];
                  }
                });
              }
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              setActiveBlockIdx(Math.max(0, Math.min(getActiveBlockIdx(), draftState.blocks.length - 1)));
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          });
        }
      });
    }
}
