// NGUỒN: file .ts này; media-base.js do `npm run build` sinh ra.
//
// Thư mục chứa ảnh/âm thanh người ra đề đã khai (nhớ trên máy này): cột Ảnh/Âm thanh trong file chỉ cần tên file.
// Chỉ lưu đường dẫn thư mục, không lưu dữ liệu học viên hay đáp án.
const KEY = 'izone.studio.mediaBase';

export function getMediaBase(): string {
  try { return String(globalThis.localStorage?.getItem(KEY) ?? ''); } catch (_) { return ''; }
}

export function setMediaBase(value: string): void {
  try { globalThis.localStorage?.setItem(KEY, String(value ?? '').trim()); } catch (_) { /* bỏ qua: trình duyệt chặn lưu trữ */ }
}

export function mediaBaseFieldHtml(value: string): string {
  const safe = String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<label class="aq-media-base">Thư mục ảnh/âm thanh (tùy chọn) <input type="text" class="form-control input-media-base" value="${safe}" placeholder="assets/vocabulary hoặc https://..." /></label><span class="aq-note-text">Cột Ảnh/Âm thanh chỉ có tên file (apple.png) sẽ được ghép với thư mục này.</span>`;
}
