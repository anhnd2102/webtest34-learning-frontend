import { openConfirmDeleteTestModal } from './catalog.js';
export function bindToolbarActions({ container, builderOwner, draftState, markSaved, handle, openCandidateSimulationModal, openPublishingModal, formVersionData, options }) {
    const previewBtn = container.querySelector('#btn-preview-test');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            openCandidateSimulationModal();
        });
    }
    const publishBtn = container.querySelector('#btn-publish-test');
    if (publishBtn) {
        publishBtn.addEventListener('click', () => {
            openPublishingModal();
        });
    }
    const deleteDraftBtn = container.querySelector('#btn-delete-draft-workspace');
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
            }
            else {
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
