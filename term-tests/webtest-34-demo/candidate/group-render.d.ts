// Khai báo tạm cho phần group-render.js mà module .ts dùng; xóa file này khi group-render.js chuyển sang .ts.
import type { ResultDefinition } from './result-view.js';

export declare function withLocalGroupLabels(definition: ResultDefinition | null | undefined, form: unknown): ResultDefinition | null | undefined;
