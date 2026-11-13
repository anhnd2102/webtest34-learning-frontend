// Khai báo kiểu cho phần dynamic-exam-renderer.mjs mà các module .ts của shell học viên dùng.
// File .mjs 1.700 dòng chưa có kiểu; khai báo này giúp tsc không kiểm kiểu và không emit nó. Chỉ thêm export khi có module .ts dùng.
export declare const ICONS: Record<string, string>;
export declare function getTotalItemCount(definition: unknown): number;
