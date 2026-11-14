// NGUỒN: file .ts này; unsaved-changes.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  escapeHtml
} from '../ui/presentation.js';

interface UnsavedChangesGuard { fn: () => unknown, owner: unknown }

let activeUnsavedChangesGuard: UnsavedChangesGuard | null = null;

export function registerUnsavedChangesGuard(fn: () => unknown, owner: unknown = fn) {
  activeUnsavedChangesGuard = { fn, owner };
}

export function unregisterUnsavedChangesGuard(fn: () => unknown, owner: unknown = null) {
  if (!activeUnsavedChangesGuard) return;
  if (owner != null) {
    if (activeUnsavedChangesGuard.owner === owner) {
      activeUnsavedChangesGuard = null;
    }
  } else if (activeUnsavedChangesGuard.fn === fn) {
    activeUnsavedChangesGuard = null;
  }
}

export function hasActiveUnsavedChanges(owner: unknown = null): boolean {
  if (!activeUnsavedChangesGuard) return false;
  if (owner != null && activeUnsavedChangesGuard.owner !== owner) return false;
  try {
    return typeof activeUnsavedChangesGuard.fn === 'function' ? Boolean(activeUnsavedChangesGuard.fn()) : false;
  } catch (_) {
    return false;
  }
}

export function clearActiveUnsavedChanges(owner: unknown = null) {
  if (!activeUnsavedChangesGuard) return;
  if (owner != null) {
    if (activeUnsavedChangesGuard.owner === owner) {
      activeUnsavedChangesGuard = null;
    }
  } else {
    activeUnsavedChangesGuard = null;
  }
}

const builderModalOwners = new WeakMap<HTMLElement, unknown>();

const builderModalCleanups = new WeakMap<HTMLElement, () => void>();

export function getActiveUnsavedChangesOwner(): unknown { return activeUnsavedChangesGuard?.owner; }

export function registerBuilderModalCleanup(modal: HTMLElement, cleanup: () => void) { builderModalCleanups.set(modal, cleanup); }

export function releaseBuilderModal(modal: HTMLElement) {
  builderModalCleanups.get(modal)?.();
  builderModalOwners.delete(modal);
}

export function trackBuilderModal(modal: HTMLElement, owner: unknown) {
  if (owner != null) builderModalOwners.set(modal, owner);
}

export function disposeBuilderModals(builderOwner: unknown) {
if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
        const modals = document.querySelectorAll<HTMLElement>('body > div');
        if (modals && modals.forEach) {
          modals.forEach(m => {
            if (builderModalOwners.get(m) !== builderOwner) return;
            builderModalCleanups.get(m)?.();
            builderModalOwners.delete(m);
            try { if (m.parentNode) m.parentNode.removeChild(m); } catch (_) {}
          });
        }
      }
}

export interface UnsavedChangesModalOptions {
  title?: string;
  subtitle?: string;
  message?: string;
  stayText?: string;
  discardText?: string;
  onDiscard?: () => void;
  onStay?: () => void;
  owner?: unknown;
}

export function openUnsavedChangesModal({
  title = 'Các thay đổi chưa được lưu',
  subtitle = 'Bạn có các chỉnh sửa chưa lưu trong bài thi này',
  message = 'Nếu bạn thoát ra hoặc chuyển sang trang khác, tất cả các thay đổi vừa chỉnh sửa sẽ bị mất hoàn toàn.',
  stayText = 'Ở lại chỉnh sửa',
  discardText = 'Rời khỏi không lưu',
  onDiscard,
  onStay,
  owner = getActiveUnsavedChangesOwner()
}: UnsavedChangesModalOptions = {}) {
  if (typeof document === 'undefined') {
    const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`${title}\n\n${message}`)
      : true;
    if (confirmed) {
      if (typeof onDiscard === 'function') onDiscard();
    } else {
      if (typeof onStay === 'function') onStay();
    }
    return;
  }

  const existing = document.querySelector<HTMLElement>('#modal-unsaved-changes');
  if (existing && existing.parentNode) {
    existing.querySelector<HTMLElement>('#btn-stay-editing')?.focus?.();
    return;
  }

  const returnFocus = document.activeElement as HTMLElement | null;
  const modal = document.createElement('div');
  modal.id = 'modal-unsaved-changes';
  modal.className = 'izone-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-unsaved-title');

  modal.innerHTML = `
    <div class="izone-modal-dialog modal-warning-dialog">
      <div class="izone-modal-header warning-header">
        <div class="modal-header-icon-warning">
          ${renderSvgIcon('alert', 'icon-lg')}
        </div>
        <div class="modal-title-wrap">
          <h3 id="modal-unsaved-title">${escapeHtml(title)}</h3>
          <p class="modal-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <button type="button" class="btn-close-modal" id="btn-close-unsaved-modal" aria-label="Đóng">&times;</button>
      </div>

      <div class="izone-modal-body">
        <div class="alert-warning-box">
          <div class="alert-warning-icon">${renderSvgIcon('alert', 'icon-inline')}</div>
          <div class="alert-warning-text">
            ${escapeHtml(message)}
          </div>
        </div>
        <p class="unsaved-hint-text">
          Hãy bấm <strong>"${escapeHtml(stayText)}"</strong> để tiếp tục lưu lại bài làm bằng nút <em>"Lưu bản nháp"</em> trước khi thoát.
        </p>
      </div>

      <div class="izone-modal-footer">
        <button type="button" class="btn btn-secondary" id="btn-stay-editing">
          ${renderSvgIcon('check', 'icon-inline')} ${escapeHtml(stayText)}
        </button>
        <button type="button" class="btn btn-danger" id="btn-discard-and-leave">
          ${renderSvgIcon('arrowRight', 'icon-inline')} ${escapeHtml(discardText)}
        </button>
      </div>
    </div>
  `;

  trackBuilderModal(modal, owner);
  document.body.appendChild(modal);

  const closeModal = (restoreFocus = false) => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    if (restoreFocus && returnFocus?.isConnected !== false) returnFocus?.focus?.({ preventScroll: true });
  };

  const btnStay = modal.querySelector<HTMLElement>('#btn-stay-editing');
  const btnDiscard = modal.querySelector('#btn-discard-and-leave');
  const btnClose = modal.querySelector('#btn-close-unsaved-modal');

  btnStay?.addEventListener('click', () => {
    closeModal(true);
    if (typeof onStay === 'function') onStay();
  });

  btnClose?.addEventListener('click', () => {
    closeModal(true);
    if (typeof onStay === 'function') onStay();
  });

  btnDiscard?.addEventListener('click', () => {
    closeModal();
    if (typeof onDiscard === 'function') onDiscard();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(true);
      if (typeof onStay === 'function') onStay();
    }
  });

  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal(true);
      if (typeof onStay === 'function') onStay();
    }
  });

  btnStay?.focus();
}

export const mountedBuilders = new WeakMap<object, any>();
