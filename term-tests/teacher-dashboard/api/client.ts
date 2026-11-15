// NGUỒN: file .ts này; client.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
// Client HTTP dùng chung cho Teacher Dashboard: một nơi gắn auth, parse JSON, xử lý 401 và chuẩn hóa lỗi.
// Không tự thử lại (thao tác ghi không được gửi hai lần).
//
// request(path, options) nhận các tùy chọn của fetch cộng thêm:
//   errorMessage        thông báo dự phòng khi phản hồi lỗi không có `message`.
//   anonymous           true: không gắn auth và không coi 401 là hết phiên (đăng nhập).
//   handleUnauthorized  false: 401 không kết thúc phiên (đăng xuất, khôi phục phiên: nơi gọi tự xử lý).
// Lỗi HTTP là Error có `status`, `code`, `details`, `apiMessage` (message gốc của máy chủ, có thể undefined).
export interface ApiRequestOptions {
  /** thông báo dự phòng khi phản hồi lỗi không có message */
  errorMessage?: string;
  /** không gắn auth; 401 không phải hết phiên */
  anonymous?: boolean;
  /** false: 401 không kết thúc phiên */
  handleUnauthorized?: boolean;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export type ApiError = Error & { status?: number, code?: string, details?: unknown, apiMessage?: string };

export interface ApiRequestDeps {
  apiBase: () => string;
  authHeader: () => Record<string, string>;
  hasSession: () => boolean;
  onUnauthorized: () => void;
  isDisposed?: () => boolean;
  fetchImpl?: (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'ok' | 'json'>>;
}

export function createApiRequest({ apiBase, authHeader, hasSession, onUnauthorized, isDisposed = () => false, fetchImpl }: ApiRequestDeps): (path: string, options?: ApiRequestOptions) => Promise<any> {
  return async function request(path: string, { errorMessage, anonymous = false, handleUnauthorized = true, ...options }: ApiRequestOptions = {}) {
    const headers = { ...(anonymous ? {} : authHeader()), ...(options.headers || {}) };
    const send = fetchImpl || ((url: string, init: RequestInit) => fetch(url, init));
    const response = await send(`${apiBase()}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (options.signal?.aborted || isDisposed()) {
      throw Object.assign(new Error('Request is no longer current.'), { name: 'AbortError' });
    }
    if (response.status === 401 && !anonymous && handleUnauthorized && hasSession()) {
      onUnauthorized();
      throw new Error(payload.message || 'Yêu cầu đăng nhập.');
    }
    if (!response.ok) {
      throw Object.assign(new Error(payload.message || errorMessage || 'Không tải được dữ liệu.'), {
        code: payload.error, details: payload.details, status: response.status, apiMessage: payload.message
      });
    }
    return payload;
  };
}
