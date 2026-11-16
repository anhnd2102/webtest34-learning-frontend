import { convertGoogleDriveImageUrl } from './media.js';
export function bindBlockImageActions({ container, draftState, markAsDirty }) {
    container.querySelectorAll('.block-image-input').forEach(input => {
        const update = () => {
            const raw = input.value.trim();
            const converted = convertGoogleDriveImageUrl(raw);
            if (converted !== raw)
                input.value = converted;
            const block = draftState.blocks[Number(input.getAttribute('data-index'))];
            if (block)
                block.stimulusImageUrl = converted || null;
            const field = input.closest('.block-field');
            const img = field?.querySelector('.block-image-preview-img');
            const err = field?.querySelector('.block-image-preview-error');
            if (img) {
                if (converted) {
                    img.src = converted;
                    img.hidden = false;
                }
                else {
                    img.removeAttribute('src');
                    img.hidden = true;
                }
            }
            if (err)
                err.hidden = true;
            markAsDirty();
        };
        input.addEventListener('change', update);
        input.addEventListener('paste', () => setTimeout(update, 20));
    });
    container.querySelectorAll('.block-image-preview-img').forEach(img => {
        img.addEventListener('error', () => {
            const err = img.closest('.block-field')?.querySelector('.block-image-preview-error');
            if (err)
                err.hidden = false;
        });
    });
}
