// Khai báo tạm cho các export của studio/batch-import.js mà module .ts đang dùng, để tsc không kiểm kiểu cả file JS
// 1.054 dòng chưa có kiểu. Xóa file này khi studio/batch-import chuyển sang .ts.
export interface BatchModalArgs { count: number, modal: HTMLElement, defaultPoints?: number, [key: string]: any }

export interface BatchModalOptions {
  title?: string;
  subtitle?: string;
  defaultCount?: number;
  minCount?: number;
  maxCount?: number;
  defaultPoints?: number;
  extraConfigHtml?: string;
  csvConfig?: Record<string, any> | null;
  owner?: unknown;
  onConfirm?: (args: BatchModalArgs) => unknown;
  onSingle?: (args: Partial<BatchModalArgs>) => unknown;
  [key: string]: any;
}

export function parseUploadedFileToCsv(file: File, callback: (error: Error | null | undefined, csvText: string) => void): void;
export function openGenericBatchModal(options?: BatchModalOptions): HTMLElement | null;
export function openCsvUploadModal(options?: Record<string, any>): unknown;
export function openMultiGroupBatchModal(options?: Record<string, any>): unknown;
export function openInlineClozeBatchModal(options?: Record<string, any>): unknown;
