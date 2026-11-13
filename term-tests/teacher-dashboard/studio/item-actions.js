import { reorderBlockItem, moveItemToExercise, parseClozeBlanks } from './draft-model.js';

// Chữ ký tập ô trống của bài điền từ: chỉ khi đổi thì cần dựng lại các thẻ cấu hình từng ô.
const blankSignature = prompt => parseClozeBlanks(prompt || '').map(blank => blank.number).join(',');

export function bindItemActions({ container, draftState, markAsDirty, isBuilderDisposed, addCleanup, resequenceItemPositions, render, syncInputs }) {
    // Prompt change listener for inline cloze and real-time counter
    const promptInputs = container.querySelectorAll('.item-prompt-input');
    promptInputs.forEach(promptEl => {
      // Tập ô trống tại thời điểm dựng giao diện; cập nhật mỗi khi dựng lại.
      const initialItem = draftState.blocks[Number(promptEl.getAttribute('data-block-idx'))]?.items?.[Number(promptEl.getAttribute('data-item-idx'))];
      let renderedBlanks = blankSignature(initialItem?.prompt);
      promptEl.addEventListener('input', () => {
        const bIdx = Number(promptEl.getAttribute('data-block-idx'));
        const iIdx = Number(promptEl.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        item.prompt = promptEl.value;
        const itemCard = (typeof promptEl.closest === 'function') ? promptEl.closest('.builder-item-card') : (promptEl.parentElement || null);
        const charCountEl = itemCard?.querySelector ? itemCard.querySelector('.prompt-char-count') : null;
        if (charCountEl) {
          charCountEl.textContent = `${(promptEl.value || '').length} ký tự`;
        }
        markAsDirty();
      });

      promptEl.addEventListener('change', () => {
        const bIdx = Number(promptEl.getAttribute('data-block-idx'));
        const iIdx = Number(promptEl.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        syncInputs();
        if (item.layoutType === 'inline_cloze' || item.pedagogicalTypeCode === 'inline_cloze') {
          // Không dựng lại khi tập ô trống không đổi: change xảy ra lúc ô mất focus (giữa mousedown và mouseup của
          // nút khác), dựng lại ngay lúc đó thay thế nút vừa nhấn và cú nhấp bị nuốt.
          const currentBlanks = blankSignature(item.prompt);
          if (currentBlanks !== renderedBlanks) {
            renderedBlanks = currentBlanks;
            resequenceItemPositions();
            render();
          }
        }
      });
    });

    // Move Question Item Up
    const moveItemUpBtns = container.querySelectorAll('.btn-move-item-up');
    moveItemUpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.items || iIdx <= 0) return;
        const currentItem = block.items[iIdx];
        const prevItem = block.items[iIdx - 1];
        block.items[iIdx] = prevItem;
        block.items[iIdx - 1] = currentItem;
        if (prevItem.exerciseId && prevItem.exerciseId !== currentItem.exerciseId) {
          currentItem.exerciseId = prevItem.exerciseId;
          currentItem.exerciseTitle = prevItem.exerciseTitle;
        }
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Move Question Item Down
    const moveItemDownBtns = container.querySelectorAll('.btn-move-item-down');
    moveItemDownBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.items || iIdx >= block.items.length - 1) return;
        const currentItem = block.items[iIdx];
        const nextItem = block.items[iIdx + 1];
        block.items[iIdx] = nextItem;
        block.items[iIdx + 1] = currentItem;
        if (nextItem.exerciseId && nextItem.exerciseId !== currentItem.exerciseId) {
          currentItem.exerciseId = nextItem.exerciseId;
          currentItem.exerciseTitle = nextItem.exerciseTitle;
        }
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // HTML5 Drag and Drop for Question Items (Drag Handle Isolated)
    const draggableItemCards = container.querySelectorAll('.builder-item-card');
    let draggedItemInfo = null;
    let isDragHandleActive = false;
    let activeDragCard = null;

    if (draggableItemCards && typeof draggableItemCards.forEach === 'function') {
      draggableItemCards.forEach(card => {
        if (typeof card.addEventListener !== 'function') return;

        const handle = card.querySelector ? card.querySelector('.item-drag-handle') : null;
        if (handle && typeof handle.addEventListener === 'function') {
          handle.addEventListener('mousedown', () => {
            isDragHandleActive = true;
            activeDragCard = card;
            if (typeof card.setAttribute === 'function') {
              card.setAttribute('draggable', 'true');
            }
          });

          const resetHandleState = () => {
            if (!draggedItemInfo) {
              isDragHandleActive = false;
              activeDragCard = null;
              if (typeof card.setAttribute === 'function') {
                card.setAttribute('draggable', 'false');
              }
            }
          };

          handle.addEventListener('mouseup', resetHandleState);
        }

        card.addEventListener('dragstart', (e) => {
          const targetTag = e.target?.tagName?.toLowerCase();
          const isInputOrControl = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || targetTag === 'button';
          const isTargetFromHandle = (isDragHandleActive && activeDragCard === card) ||
            (e.target && typeof e.target.closest === 'function' && Boolean(e.target.closest('.item-drag-handle')));

          if (!isTargetFromHandle || isInputOrControl) {
            if (typeof e.preventDefault === 'function') {
              e.preventDefault();
            }
            return;
          }

          syncInputs();
          draggedItemInfo = {
            blockIdx: Number(card.getAttribute('data-block-idx')),
            itemIdx: Number(card.getAttribute('data-item-idx')),
            itemId: card.getAttribute('data-item-id'),
            exerciseId: card.getAttribute('data-exercise-id')
          };
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try {
              e.dataTransfer.setData('text/plain', card.getAttribute('data-item-id') || '');
            } catch (_) {}
          }
          if (card.classList && typeof card.classList.add === 'function') {
            card.classList.add('dragging');
          }
        });

        card.addEventListener('dragover', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

          const rect = typeof card.getBoundingClientRect === 'function' ? card.getBoundingClientRect() : null;
          const isTopHalf = rect ? ((e.clientY - rect.top) < (rect.height / 2)) : false;

          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
            if (isTopHalf) {
              card.classList.add('drop-target-above');
            } else {
              card.classList.add('drop-target-below');
            }
          }
        });

        card.addEventListener('dragleave', () => {
          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
          }
        });

        card.addEventListener('drop', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (typeof e.stopPropagation === 'function') e.stopPropagation();

          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
          }

          const sourceBlockIdx = draggedItemInfo.blockIdx;
          const sourceItemIdx = draggedItemInfo.itemIdx;
          const targetBlockIdx = Number(card.getAttribute('data-block-idx'));
          const targetItemIdx = Number(card.getAttribute('data-item-idx'));
          const targetExerciseId = card.getAttribute('data-exercise-id');

          const rect = typeof card.getBoundingClientRect === 'function' ? card.getBoundingClientRect() : null;
          const positionAbove = rect ? ((e.clientY - rect.top) < (rect.height / 2)) : false;

          reorderBlockItem(draftState, sourceBlockIdx, sourceItemIdx, targetBlockIdx, targetItemIdx, positionAbove, targetExerciseId);

          resequenceItemPositions();
          markAsDirty();
          render();
        });

        card.addEventListener('dragend', () => {
          draggedItemInfo = null;
          isDragHandleActive = false;
          activeDragCard = null;
          const allCards = container.querySelectorAll('.builder-item-card');
          if (allCards && typeof allCards.forEach === 'function') {
            allCards.forEach(c => {
              if (typeof c.setAttribute === 'function') {
                c.setAttribute('draggable', 'false');
              }
              if (c.classList && typeof c.classList.remove === 'function') {
                c.classList.remove('dragging', 'drop-target-above', 'drop-target-below');
              }
            });
          }
          const allLists = container.querySelectorAll('.exercise-items-list');
          if (allLists && typeof allLists.forEach === 'function') {
            allLists.forEach(l => {
              if (l.classList && typeof l.classList.remove === 'function') {
                l.classList.remove('drag-over-empty');
              }
            });
          }
        });
      });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      const onDocMouseUp = () => {
        if (isBuilderDisposed()) return;
        if (isDragHandleActive && !draggedItemInfo) {
          isDragHandleActive = false;
          if (activeDragCard && typeof activeDragCard.setAttribute === 'function') {
            activeDragCard.setAttribute('draggable', 'false');
          }
          activeDragCard = null;
        }
      };
      document.addEventListener('mouseup', onDocMouseUp);
      addCleanup(() => {
        document.removeEventListener?.('mouseup', onDocMouseUp);
      });
    }

    // Drop onto empty exercise items container
    const exerciseLists = container.querySelectorAll('.exercise-items-list');
    if (exerciseLists && typeof exerciseLists.forEach === 'function') {
      exerciseLists.forEach(list => {
        if (typeof list.addEventListener !== 'function') return;

        list.addEventListener('dragover', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          if (list.classList && typeof list.classList.add === 'function') {
            list.classList.add('drag-over-empty');
          }
        });

        list.addEventListener('dragleave', () => {
          if (list.classList && typeof list.classList.remove === 'function') {
            list.classList.remove('drag-over-empty');
          }
        });

        list.addEventListener('drop', (e) => {
          if (e.target && typeof e.target.closest === 'function' && e.target.closest('.builder-item-card')) return;
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (list.classList && typeof list.classList.remove === 'function') {
            list.classList.remove('drag-over-empty');
          }

          const targetExerciseId = list.getAttribute('data-exercise-id');
          const targetBlockIdx = Number(list.getAttribute('data-block-idx'));

          moveItemToExercise(draftState, draggedItemInfo.blockIdx, draggedItemInfo.itemIdx, targetBlockIdx, targetExerciseId);

          resequenceItemPositions();
          markAsDirty();
          render();
        });
      });
    }

    // Delete Question Item
    const delItemBtns = container.querySelectorAll('.btn-delete-item');
    delItemBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (block && block.items) {
          const [deletedItem] = block.items.splice(iIdx, 1);
          if (deletedItem?.itemVersionId) {
            delete draftState.gradingKey.items[deletedItem.itemVersionId];
          }
          resequenceItemPositions();
          markAsDirty();
          render();
        }
      });
    });
}
