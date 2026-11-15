export function createApiRequest({ apiBase, authHeader, hasSession, onUnauthorized, isDisposed = () => false, fetchImpl }) {
    return async function request(path, { errorMessage, anonymous = false, handleUnauthorized = true, ...options } = {}) {
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
