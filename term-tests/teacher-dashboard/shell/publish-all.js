// NGUỒN: file .ts này; publish-all.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { attemptPublishPath, assignmentPublishAllPath } from '../api/teacher.js';
export function createPublishAll({ viewState, status, publishAllBtn, state, request, loadResults }) {
    async function publishAllResults() {
        if (!state.classId || !state.assignmentId)
            return;
        const confirmed = confirm('Bạn có chắc chắn muốn công bố điểm cho toàn bộ học viên đã nộp bài trong bài được giao này không?');
        if (!confirmed)
            return;
        if (publishAllBtn) {
            publishAllBtn.disabled = true;
            publishAllBtn.textContent = 'Đang công bố…';
        }
        if (status)
            status.textContent = 'Đang công bố điểm cho toàn bộ học viên…';
        try {
            let success = false;
            let count = 0;
            let msg = '';
            try {
                const payload = await request(assignmentPublishAllPath(state.classId, state.assignmentId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ note: 'Công bố toàn bộ kết quả' })
                });
                success = true;
                count = payload.publishedCount ?? 0;
                msg = payload.message || `Đã công bố kết quả cho ${count} học viên.`;
            }
            catch (batchErr) {
                // Fallback: If batch endpoint returned error or 404, fallback to individual publication
                const submittedStudents = (viewState.currentResultsPayload?.students || []).filter(s => s.attemptId && s.status === 'submitted' && !s.published);
                if (submittedStudents.length > 0) {
                    await Promise.all(submittedStudents.map(s => request(attemptPublishPath(state.classId, state.assignmentId, s.attemptId), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ note: 'Công bố kết quả' })
                    })));
                    success = true;
                    count = submittedStudents.length;
                    msg = `Đã công bố kết quả cho ${count} học viên.`;
                }
                else if ((viewState.currentResultsPayload?.students || []).some(s => s.attemptId && s.status === 'submitted')) {
                    msg = 'Tất cả học viên đã nộp bài đều đã được công bố điểm.';
                    success = true;
                }
                else {
                    throw batchErr;
                }
            }
            alert(msg || 'Đã công bố điểm cho toàn bộ học viên thành công!');
            if (status)
                status.textContent = msg || 'Đã công bố kết quả thành công.';
            await loadResults(state.classId, state.assignmentId);
        }
        catch (err) {
            alert(`Lỗi khi công bố điểm: ${err.message}`);
            if (status)
                status.textContent = `Lỗi công bố: ${err.message}`;
        }
        finally {
            if (publishAllBtn) {
                publishAllBtn.disabled = false;
                publishAllBtn.textContent = 'Công bố toàn bộ điểm';
            }
        }
    }
    return { publishAllResults };
}
