// NGUỒN: file .ts này; collapse-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { BinderBase } from './draft-model.js';
import { renderSvgIcon } from '../ui/icons.js';

export function bindCollapseActions({ container, draftState, collapsedCardKeys }: Pick<BinderBase, 'container' | 'draftState' | 'render'> & { collapsedCardKeys: Set<string> }) {
    // Toggle Collapse / Expand Block Card
    const toggleBlockCollapseBtns = container.querySelectorAll<HTMLElement>('.btn-toggle-block-collapse');
    if (toggleBlockCollapseBtns && typeof toggleBlockCollapseBtns.forEach === 'function') {
      toggleBlockCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-block-card') : null;
            if (!card) return;
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-index') : null) || (card.getAttribute && card.getAttribute('data-index')) || 0);
            const block = draftState.blocks[bIdx];
            const blockCardKey = (block && block.blockId) || (card.getAttribute && card.getAttribute('data-block-id')) || `b-${bIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(blockCardKey);
            } else {
              collapsedCardKeys.delete(blockCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
          });
        }
      });
    }

    // Toggle Collapse / Expand Exercise Card
    const toggleExerciseCollapseBtns = container.querySelectorAll<HTMLElement>('.btn-toggle-exercise-collapse');
    if (toggleExerciseCollapseBtns && typeof toggleExerciseCollapseBtns.forEach === 'function') {
      toggleExerciseCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-exercise-card') : null;
            if (!card) return;
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-block-idx') : null) || (card.getAttribute && card.getAttribute('data-block-idx')) || 0);
            const eIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-exercise-idx') : null) || (card.getAttribute && card.getAttribute('data-exercise-idx')) || 0);
            const ex = draftState.blocks[bIdx]?.exercises?.[eIdx];
            const exCardKey = (ex && ex.exerciseId) || (card.getAttribute && card.getAttribute('data-exercise-id')) || `ex-${bIdx}-${eIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(exCardKey);
            } else {
              collapsedCardKeys.delete(exCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
          });
        }
      });
    }

    // Toggle Collapse / Expand Question Item Card
    const toggleCollapseBtns = container.querySelectorAll<HTMLElement>('.btn-toggle-item-collapse');
    if (toggleCollapseBtns && typeof toggleCollapseBtns.forEach === 'function') {
      toggleCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-item-card') : null;
            if (!card) return;
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-block-idx') : null) || (card.getAttribute && card.getAttribute('data-block-idx')) || 0);
            const iIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-item-idx') : null) || (card.getAttribute && card.getAttribute('data-item-idx')) || 0);
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            const itemCardKey = (item && item.itemVersionId) || (card.getAttribute && card.getAttribute('data-item-id')) || `item-${bIdx}-${iIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(itemCardKey);
            } else {
              collapsedCardKeys.delete(itemCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
          });
        }
      });
    }

    // Bulk Collapse All
    const btnCollapseAll = typeof container.querySelector === 'function' ? container.querySelector<HTMLElement>('#btn-collapse-all') : null;
    if (btnCollapseAll && typeof btnCollapseAll.addEventListener === 'function') {
      btnCollapseAll.addEventListener('click', () => {
        draftState.blocks.forEach((block, bIdx) => {
          collapsedCardKeys.add(block.blockId || `b-${bIdx}`);
          (block.exercises || []).forEach((ex, eIdx) => {
            collapsedCardKeys.add(ex.exerciseId || `ex-${bIdx}-${eIdx}`);
          });
          (block.items || []).forEach((item, iIdx) => {
            collapsedCardKeys.add(item.itemVersionId || `item-${bIdx}-${iIdx}`);
          });
        });

        const blocks = container.querySelectorAll<HTMLElement>('.builder-block-card');
        if (blocks && typeof blocks.forEach === 'function') {
          blocks.forEach(card => card.classList?.add('is-collapsed'));
        }
        const exercises = container.querySelectorAll<HTMLElement>('.builder-exercise-card');
        if (exercises && typeof exercises.forEach === 'function') {
          exercises.forEach(card => card.classList?.add('is-collapsed'));
        }
        const items = container.querySelectorAll<HTMLElement>('.builder-item-card');
        if (items && typeof items.forEach === 'function') {
          items.forEach(card => card.classList?.add('is-collapsed'));
        }

        const blockToggles = container.querySelectorAll<HTMLElement>('.btn-toggle-block-collapse');
        if (blockToggles && typeof blockToggles.forEach === 'function') {
          blockToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const exToggles = container.querySelectorAll<HTMLElement>('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const itemToggles = container.querySelectorAll<HTMLElement>('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
      });
    }

    // Bulk Expand All
    const btnExpandAll = typeof container.querySelector === 'function' ? container.querySelector<HTMLElement>('#btn-expand-all') : null;
    if (btnExpandAll && typeof btnExpandAll.addEventListener === 'function') {
      btnExpandAll.addEventListener('click', () => {
        collapsedCardKeys.clear();

        const blocks = container.querySelectorAll<HTMLElement>('.builder-block-card');
        if (blocks && typeof blocks.forEach === 'function') {
          blocks.forEach(card => card.classList?.remove('is-collapsed'));
        }
        const exercises = container.querySelectorAll<HTMLElement>('.builder-exercise-card');
        if (exercises && typeof exercises.forEach === 'function') {
          exercises.forEach(card => card.classList?.remove('is-collapsed'));
        }
        const items = container.querySelectorAll<HTMLElement>('.builder-item-card');
        if (items && typeof items.forEach === 'function') {
          items.forEach(card => card.classList?.remove('is-collapsed'));
        }

        const blockToggles = container.querySelectorAll<HTMLElement>('.btn-toggle-block-collapse');
        if (blockToggles && typeof blockToggles.forEach === 'function') {
          blockToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const exToggles = container.querySelectorAll<HTMLElement>('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const itemToggles = container.querySelectorAll<HTMLElement>('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
      });
    }
}
