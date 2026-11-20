// Chế độ xem trước đề của giáo viên: cùng renderer với học viên, không danh tính, không ghi gì lên máy chủ.
// NGUỒN: file .ts này; preview-mode.js do `npm run build` sinh ra (xem text-utils.ts).
import { escape } from './text-utils.js?rev=20261121-brand-logo';
export const PREVIEW_BANNER_TEXT = 'Bản xem trước, không lưu bài làm';
// Token xem trước chỉ đi trong fragment: `#preview=<token>`; không đọc từ query hay storage.
export function readPreviewToken(hash) {
    const raw = String(hash || '').replace(/^#/, '').trim();
    if (!raw.includes('='))
        return '';
    return (new URLSearchParams(raw).get('preview') || '').trim();
}
export function previewBannerHtml() {
    return `<div class="cbt-preview-banner" role="status">${escape(PREVIEW_BANNER_TEXT)}</div>`;
}
// Đọc định nghĩa đề công khai bằng token xem trước. Đây là request duy nhất của chế độ xem trước (GET).
export async function fetchPreviewDefinition(apiBase, token, fetchImpl = fetch) {
    const res = await fetchImpl(`${apiBase}/api/learning/preview/definition`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.definition) {
        const message = res.status === 401
            ? 'Liên kết xem trước đã hết hạn hoặc không hợp lệ. Hãy bấm "Xem trước" lại từ Dashboard.'
            : (data?.message || `Không tải được đề xem trước (HTTP ${res.status}).`);
        throw Object.assign(new Error(message), { status: res.status });
    }
    return { definition: data.definition, expiresAt: data.expiresAt || null };
}
// Chế độ xem trước không được gọi máy chủ ngoài bước đọc đề: mọi apiRequest của luồng học viên đều bị chặn.
export function blockedPreviewRequest() {
    return Promise.reject(new Error('Chế độ xem trước không gửi dữ liệu lên máy chủ.'));
}
export const PREVIEW_CSS = `
.cbt-preview-banner{padding:8px 16px;text-align:center;font-weight:700;font-size:.9rem;color:var(--izone-on-primary,#fff);background:var(--izone-primary,#e11d48);letter-spacing:.2px}
`;
