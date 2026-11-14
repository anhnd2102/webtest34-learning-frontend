import { renderSvgIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/presentation.js';
export function bindDraftSaving({ container, draftState, options, syncInputs, render, markSaved, lifecycle }) {
    const saveBtn = container.querySelector('#btn-save-draft');
    const statusMsg = container.querySelector('#builder-status-msg');
    if (saveBtn && typeof options.onSaveDraft === 'function' && typeof saveBtn.addEventListener === 'function') {
        saveBtn.addEventListener('click', async () => {
            syncInputs();
            saveBtn.disabled = true;
            saveBtn.innerHTML = `${renderSvgIcon('rotate', 'icon-inline spin')} <span>Đang lưu...</span>`;
            if (statusMsg) {
                statusMsg.className = 'builder-status-pill saving';
                statusMsg.innerHTML = `${renderSvgIcon('rotate', 'icon-inline spin')} <span>Đang lưu bản nháp...</span>`;
            }
            try {
                const payload = {
                    formVersionId: draftState.formVersionId,
                    title: draftState.title,
                    phase: draftState.phase,
                    sessionNumber: draftState.sessionNumber,
                    durationMinutes: draftState.durationMinutes,
                    answerReleasePolicy: draftState.answerReleasePolicy,
                    blocks: draftState.blocks.map((b, i) => ({
                        blockId: b.blockId,
                        checkpoint: i + 1,
                        title: b.title || `Phần ${i + 1}`,
                        instructions: b.instructions || '',
                        audioUrl: b.audioUrl || null,
                        readingPassage: b.readingPassage || null,
                        stimulusAudioUrl: b.audioUrl || null,
                        stimulusReadingPassage: b.readingPassage || null,
                        exercises: b.exercises || [],
                        items: (b.items || []).map((itm, itmIdx) => ({
                            ...itm,
                            prompt: (typeof itm.prompt === 'string' && itm.prompt.trim()) ? itm.prompt.trim() : `Câu ${itm.position || itmIdx + 1}`
                        }))
                    })),
                    gradingKey: draftState.gradingKey
                };
                // Ensure every item in gradingKey has non-empty accepted array if accepted_text
                const cleanGradingKey = JSON.parse(JSON.stringify(draftState.gradingKey || { items: {}, groups: {} }));
                for (const [k, itmKey] of Object.entries(cleanGradingKey.items || {})) {
                    if (itmKey && (itmKey.graderType === 'accepted_text' || itmKey.graderType === 'accepted_text_exact_option')) {
                        if (!Array.isArray(itmKey.accepted) || itmKey.accepted.length === 0 || itmKey.accepted.every((a) => !String(a).trim())) {
                            itmKey.accepted = ['answer'];
                        }
                        else {
                            itmKey.accepted = itmKey.accepted.filter((a) => String(a).trim());
                            if (itmKey.accepted.length === 0)
                                itmKey.accepted = ['answer'];
                        }
                    }
                    if (itmKey && itmKey.graderType === 'exact_option' && !itmKey.expectedOptionId) {
                        itmKey.expectedOptionId = 'A';
                    }
                    if (itmKey && itmKey.graderType === 'accepted_text_exact_option' && !itmKey.expectedOptionId) {
                        itmKey.expectedOptionId = 'opt_1';
                    }
                    if (itmKey && itmKey.graderType === 'ordered_sequence') {
                        if (!Array.isArray(itmKey.expectedSequence) || itmKey.expectedSequence.length === 0) {
                            itmKey.expectedSequence = ['A', 'B', 'C', 'D', 'E'];
                        }
                    }
                    if (itmKey && itmKey.graderType === 'correction_pair') {
                        if (!Array.isArray(itmKey.expectedErrors) || itmKey.expectedErrors.length === 0) {
                            itmKey.expectedErrors = ['error'];
                        }
                        if (!Array.isArray(itmKey.expectedCorrections) || itmKey.expectedCorrections.length === 0) {
                            itmKey.expectedCorrections = ['correction'];
                        }
                        if (!itmKey.scoringRule) {
                            itmKey.scoringRule = 'split_points';
                        }
                    }
                }
                payload.gradingKey = cleanGradingKey;
                draftState.gradingKey = cleanGradingKey;
                const saveDirtyVersion = lifecycle.getDirtyVersion();
                const res = await options.onSaveDraft(payload);
                if (lifecycle.isDisposed())
                    return;
                if (lifecycle.getDirtyVersion() === saveDirtyVersion) {
                    markSaved();
                }
                const now = new Date();
                const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
                if (res && res.forked) {
                    draftState.formVersionId = res.formVersionId;
                    draftState.version = res.version;
                    draftState.submissionCount = 0;
                    draftState.status = 'draft';
                    render();
                    const newStatusMsg = container.querySelector('#builder-status-msg');
                    if (newStatusMsg) {
                        newStatusMsg.className = 'builder-status-pill forked';
                        newStatusMsg.innerHTML = `${renderSvgIcon('alert', 'icon-inline')} <span>Đã tạo bản nháp mới v${res.version} (bảo toàn đề cũ đã có bài nộp)</span>`;
                    }
                }
                else {
                    if (res && res.version)
                        draftState.version = res.version;
                    if (statusMsg) {
                        statusMsg.className = 'builder-status-pill success';
                        statusMsg.innerHTML = `${renderSvgIcon('check', 'icon-inline')} <span>Đã lưu bản nháp v${draftState.version} lúc ${timeStr}</span>`;
                    }
                }
            }
            catch (err) {
                if (lifecycle.isDisposed())
                    return;
                if (statusMsg) {
                    statusMsg.className = 'builder-status-pill error';
                    statusMsg.innerHTML = `${renderSvgIcon('alert', 'icon-inline')} <span>Lỗi khi lưu: ${escapeHtml(err.message || 'Không thể lưu bản nháp')}</span>`;
                }
            }
            finally {
                if (lifecycle.isDisposed())
                    return;
                const activeSaveBtn = container.querySelector('#btn-save-draft');
                if (activeSaveBtn) {
                    activeSaveBtn.disabled = false;
                    activeSaveBtn.innerHTML = `${renderSvgIcon('save', 'icon-inline')} <span>Lưu bản nháp</span>`;
                }
            }
        });
    }
    // Candidate Simulation Modal
}
