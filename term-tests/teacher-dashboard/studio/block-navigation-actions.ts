// NGUỒN: file .ts này; block-navigation-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { generateUuid } from './draft-model.js';
import type { BinderBase } from './draft-model.js';

export function bindBlockNavigationActions({ container, draftState, markAsDirty, setActiveBlockIdx, render, jumpToBlock, syncInputs, getNextPosition }: BinderBase & {
  setActiveBlockIdx: (index: number) => void;
  jumpToBlock: (index: number) => void;
  getNextPosition: () => number;
  options?: unknown;
}) {
    const addBlockBtn = container.querySelector<HTMLElement>('#btn-add-block');
    if (addBlockBtn && typeof addBlockBtn.addEventListener === 'function') {
      addBlockBtn.addEventListener('click', () => {
        syncInputs();
        const nextIdx = draftState.blocks.length + 1;
        const nextPos = getNextPosition();
        const initialItemId = generateUuid();
        const initialExId = generateUuid();

        draftState.blocks.push({
          blockId: generateUuid(),
          checkpoint: nextIdx,
          title: `Phần ${nextIdx}`,
          instructions: '',
          audioUrl: null,
          readingPassage: null,
          stimulusAudioUrl: null,
          stimulusReadingPassage: null,
          exercises: [
            {
              exerciseId: initialExId,
              exerciseNumber: 1,
              title: `Bài tập 1: Phần ${nextIdx}`,
              instructions: '',
              audioUrl: null,
              readingPassage: null,
              itemIds: [initialItemId]
            }
          ],
          items: [
            {
              itemFamilyId: generateUuid(),
              itemVersionId: initialItemId,
              position: nextPos,
              exerciseId: initialExId,
              exerciseTitle: `Bài tập 1: Phần ${nextIdx}`,
              prompt: `Câu hỏi ${nextPos}:`,
              helpText: '',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Phương án A' },
                { id: 'B', label: 'Phương án B' },
                { id: 'C', label: 'Phương án C' },
                { id: 'D', label: 'Phương án D' }
              ],
              skillCodes: [],
              releasePolicy: 'inherit'
            }
          ]
        });
        draftState.gradingKey!.items![initialItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        };
        setActiveBlockIdx(draftState.blocks.length - 1);
        markAsDirty();
        render();
      });
    }

    const tabAddBlockBtn = container.querySelector<HTMLElement>('#btn-tab-add-block');
    if (tabAddBlockBtn && typeof tabAddBlockBtn.addEventListener === 'function') {
      tabAddBlockBtn.addEventListener('click', () => {
        if (addBlockBtn && typeof addBlockBtn.click === 'function') {
          addBlockBtn.click();
        }
      });
    }

    const prevBlockBtns = container.querySelectorAll<HTMLElement>('.btn-prev-block');
    if (prevBlockBtns && typeof prevBlockBtns.forEach === 'function') {
      prevBlockBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const targetIdx = Number(btn.getAttribute('data-target-idx'));
            if (!isNaN(targetIdx) && targetIdx >= 0) {
              jumpToBlock(targetIdx);
            }
          });
        }
      });
    }

    const nextBlockBtns = container.querySelectorAll<HTMLElement>('.btn-next-block');
    if (nextBlockBtns && typeof nextBlockBtns.forEach === 'function') {
      nextBlockBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const targetIdx = Number(btn.getAttribute('data-target-idx'));
            if (!isNaN(targetIdx) && targetIdx < draftState.blocks.length) {
              jumpToBlock(targetIdx);
            }
          });
        }
      });
    }
}
