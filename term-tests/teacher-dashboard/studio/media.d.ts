// Khai báo tạm cho export của studio/media.js mà module .ts đang dùng, để tsc không kiểm kiểu cả file JS chưa có kiểu.
// Xóa file này khi studio/media chuyển sang .ts.
export function validateImageUrl(url: string): boolean;
