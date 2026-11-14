// NGUỒN: file .ts này; toolbar-actions.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import type { BinderBase, BuilderHandle, BuilderOptions } from './draft-model.js';
import { openConfirmDeleteTestModal } from './catalog.js';

export function bindToolbarActions({ container, builderOwner, draftState, markSaved, handle, openCandidateSimulationModal, openPublishingModal, formVersionData, options }: Pick<BinderBase, 'container' | 'draftState'> & {
  builderOwner: unknown;
  markSaved: () => void;
  handle: BuilderHandle;
  openCandidateSimulationModal: () => void;
  openPublishingModal: () => void;
  formVersionData: Record<string, any>;
  options: BuilderOptions;
}) {
    const previewBtn = container.querySelector<HTMLElement>('#btn-preview-test');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        openCandidateSimulationModal();
      });
    }

    const publishBtn = container.querySelector<HTMLElement>('#btn-publish-test');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        openPublishingModal();
      });
    }

    const deleteDraftBtn = container.querySelector<HTMLElement>('#btn-delete-draft-workspace');
    if (deleteDraftBtn) {
      deleteDraftBtn.addEventListener('click', () => {
        if (typeof openConfirmDeleteTestModal === 'function' && typeof document !== 'undefined') {
          openConfirmDeleteTestModal({ owner: builderOwner,
            formVersionId: draftState.formVersionId,
            testKey: formVersionData.testKey || '',
            title: draftState.title || formVersionData.title || '',
            sessionNumber: draftState.sessionNumber || '',
            phase: draftState.phase || '',
            courseName: options.courseId === 1 ? 'Khối 03' : (options.courseId === 3 ? 'Khối 45' : 'Khối 34'),
            onConfirm: () => {
              markSaved();
              handle?.dispose();
              if (typeof options.onDeleteDraft === 'function') {
                options.onDeleteDraft({
                  formVersionId: draftState.formVersionId,
                  testKey: formVersionData.testKey || '',
                  title: draftState.title || formVersionData.title || ''
                });
              }
            }
          });
        } else {
          const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm('Bạn có chắc chắn muốn xóa bài thi này không? Thao tác này không thể hoàn tác.')
            : true;
          if (confirmed) {
            markSaved();
            handle?.dispose();
            if (typeof options.onDeleteDraft === 'function') {
              options.onDeleteDraft({
                formVersionId: draftState.formVersionId,
                testKey: formVersionData.testKey || '',
                title: draftState.title || formVersionData.title || ''
              });
            }
          }
        }
      });
    }
}
