// NGUỒN: file .ts này; preview-link.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { formPreviewTokenPath } from '../api/teacher.js';
// Trang xem trước là renderer học viên (`webtest-34-demo`); token chỉ nằm trong fragment, không vào query.
export function previewPageUrl({ pageUrl, token, apiBase = '' }) {
    const url = new URL('../webtest-34-demo/index.html', pageUrl);
    if (apiBase && (apiBase.includes('webtest.ducanhdev.com') || apiBase.includes('production')))
        url.searchParams.set('prod', '1');
    url.hash = `preview=${encodeURIComponent(token)}`;
    return url.toString();
}
// Mở tab ngay trong cú bấm (tránh bị chặn popup), rồi chuyển tab tới trang xem trước khi có token.
export async function openExamPreview({ formVersionId, request, win, pageUrl, apiBase = '', onError }) {
    if (!formVersionId) {
        onError('Bài thi này chưa liên kết với phiên bản đề nào.');
        return;
    }
    const tab = win.open('about:blank', '_blank');
    try {
        const res = await request(formPreviewTokenPath(formVersionId), {
            method: 'POST',
            errorMessage: 'Không mở được bản xem trước.'
        });
        if (!res?.token)
            throw new Error('Không nhận được liên kết xem trước.');
        const target = previewPageUrl({ pageUrl, token: res.token, apiBase });
        if (tab)
            tab.location.href = target;
        else
            win.open(target, '_blank');
    }
    catch (error) {
        tab?.close();
        onError(error.message || 'Không mở được bản xem trước.');
    }
}
