// Ảnh đầu phần thi (ví dụ đề Writing mô tả biểu đồ/tranh): nhập link, tự đổi link Google Drive, xem trước tại chỗ.
import type { BinderBase } from './draft-model.js';
import { convertGoogleDriveImageUrl } from './media.js';

export function bindBlockImageActions({ container, draftState, markAsDirty }: Pick<BinderBase, 'container' | 'draftState' | 'markAsDirty'>) {
  container.querySelectorAll<HTMLInputElement>('.block-image-input').forEach(input => {
    const update = () => {
      const raw = input.value.trim();
      const converted = convertGoogleDriveImageUrl(raw);
      if (converted !== raw) input.value = converted;
      const block = draftState.blocks[Number(input.getAttribute('data-index'))];
      if (block) block.stimulusImageUrl = converted || null;
      const field = input.closest('.block-field');
      const img = field?.querySelector<HTMLImageElement>('.block-image-preview-img');
      const err = field?.querySelector<HTMLElement>('.block-image-preview-error');
      if (img) {
        if (converted) {
          img.src = converted;
          img.hidden = false;
        } else {
          img.removeAttribute('src');
          img.hidden = true;
        }
      }
      if (err) err.hidden = true;
      markAsDirty();
    };
    input.addEventListener('change', update);
    input.addEventListener('paste', () => setTimeout(update, 20));
  });
  container.querySelectorAll<HTMLImageElement>('.block-image-preview-img').forEach(img => {
    img.addEventListener('error', () => {
      const err = img.closest('.block-field')?.querySelector<HTMLElement>('.block-image-preview-error');
      if (err) err.hidden = false;
    });
  });
}
