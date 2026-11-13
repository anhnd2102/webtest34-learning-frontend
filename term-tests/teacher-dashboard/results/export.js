// NGUỒN: file .ts này; export.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
export function toggleExportXlsxButton(button, assignmentId) {
    if (button)
        button.hidden = !assignmentId;
}
function saveBlob(blob, filename) {
    const href = URL.createObjectURL(blob);
    const link = Object.assign(document.createElement('a'), { href, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 0);
}
export async function downloadResultsXlsx({ url, headers, button, status, fetchImpl = fetch, save = saveBlob, onUnauthorized = () => { } }) {
    const label = button.querySelector('span');
    const idleText = label.textContent;
    button.disabled = true;
    label.textContent = 'Đang xuất…';
    try {
        const response = await fetchImpl(url, { headers });
        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            if (response.status === 401)
                onUnauthorized();
            throw new Error(payload.message || 'Không xuất được file xlsx.');
        }
        const filename = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') || '')?.[1] || 'KetQua.xlsx';
        save(await response.blob(), filename);
        // Chỉ xoá lỗi xuất cũ, giữ nguyên thông báo khác trên dòng trạng thái.
        if (status?.textContent?.startsWith('Lỗi xuất xlsx'))
            status.textContent = '';
    }
    catch (error) {
        if (status)
            status.textContent = `Lỗi xuất xlsx: ${error.message}`;
    }
    finally {
        button.disabled = false;
        label.textContent = idleText;
    }
}
