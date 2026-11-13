// Client HTTP dùng chung cho Teacher Dashboard: một nơi gắn auth, parse JSON, xử lý 401 và chuẩn hóa lỗi.
// Không tự thử lại (thao tác ghi không được gửi hai lần).
//
// request(path, options) nhận các tùy chọn của fetch cộng thêm:
//   errorMessage        thông báo dự phòng khi phản hồi lỗi không có `message`.
//   anonymous           true: không gắn auth và không coi 401 là hết phiên (đăng nhập).
//   handleUnauthorized  false: 401 không kết thúc phiên (đăng xuất, khôi phục phiên: nơi gọi tự xử lý).
// Lỗi HTTP là Error có `status`, `code`, `details`, `apiMessage` (message gốc của máy chủ, có thể undefined).
/**
 * @typedef {Object} ApiRequestOptions
 * @property {string} [errorMessage] thông báo dự phòng khi phản hồi lỗi không có message
 * @property {boolean} [anonymous] không gắn auth; 401 không phải hết phiên
 * @property {boolean} [handleUnauthorized] false: 401 không kết thúc phiên
 * @property {string} [method]
 * @property {Record<string, string>} [headers]
 * @property {string} [body]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {Error & { status?: number, code?: string, details?: unknown, apiMessage?: string }} ApiError
 */

/**
 * @param {Object} deps
 * @param {() => string} deps.apiBase
 * @param {() => Record<string, string>} deps.authHeader
 * @param {() => boolean} deps.hasSession
 * @param {() => void} deps.onUnauthorized
 * @param {() => boolean} [deps.isDisposed]
 * @param {(url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'ok' | 'json'>>} [deps.fetchImpl]
 * @returns {(path: string, options?: ApiRequestOptions) => Promise<any>}
 */
export function createApiRequest({ apiBase, authHeader, hasSession, onUnauthorized, isDisposed = () => false, fetchImpl }) {
  return async function request(path, { errorMessage, anonymous = false, handleUnauthorized = true, ...options } = /** @type {ApiRequestOptions} */ ({})) {
    const headers = { ...(anonymous ? {} : authHeader()), ...(options.headers || {}) };
    const send = fetchImpl || ((url, init) => fetch(url, init));
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
