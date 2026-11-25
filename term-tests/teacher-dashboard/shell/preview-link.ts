// NGUỒN: file .ts này; preview-link.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { formPreviewTokenPath } from '../api/teacher.js';

// Trang xem trước là renderer học viên (`webtest-34-demo`); token chỉ nằm trong fragment, không vào query.
export function previewPageUrl({ pageUrl, token, apiBase = '' }: { pageUrl: string, token: string, apiBase?: string }): string {
  // Neo theo thư mục `term-tests/` trong địa chỉ trang (hoặc theo thư mục của trang khi dashboard phục vụ ở địa chỉ ngắn `/`),
  // để link xem trước đúng cả ở `/term-tests/teacher-dashboard/index.html` lẫn `/`.
  const page = new URL(pageUrl);
  const termTestsAt = page.pathname.indexOf('/term-tests/');
  const siteRoot = termTestsAt >= 0 ? page.pathname.slice(0, termTestsAt + 1) : page.pathname.replace(/[^/]*$/, '');
  const url = new URL(`${siteRoot}term-tests/webtest-34-demo/index.html`, page);
  if (apiBase && (apiBase.includes('webtest.izoneacademic.com') || apiBase.includes('production'))) url.searchParams.set('prod', '1');
  url.hash = `preview=${encodeURIComponent(token)}`;
  return url.toString();
}

type PreviewRequest = (path: string, options?: Record<string, unknown>) => Promise<{ token?: string }>;
type PreviewWindow = { open: (url: string, target?: string) => { location: { href: string }, close: () => void } | null };

// Mở tab ngay trong cú bấm (tránh bị chặn popup), rồi chuyển tab tới trang xem trước khi có token.
export async function openExamPreview({ formVersionId, request, win, pageUrl, apiBase = '', onError }: {
  formVersionId: string;
  request: PreviewRequest;
  win: PreviewWindow;
  pageUrl: string;
  apiBase?: string;
  onError: (message: string) => void;
}): Promise<void> {
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
    if (!res?.token) throw new Error('Không nhận được liên kết xem trước.');
    const target = previewPageUrl({ pageUrl, token: res.token, apiBase });
    if (tab) tab.location.href = target;
    else win.open(target, '_blank');
  } catch (error) {
    tab?.close();
    onError((error as Error).message || 'Không mở được bản xem trước.');
  }
}
