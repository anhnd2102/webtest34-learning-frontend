export type ChoiceOption = string | { id: string };

// Tiện ích văn bản dùng chung cho shell học viên (tách nguyên văn từ content-preview.mjs).
// NGUỒN: file .ts này. text-utils.js bên cạnh do `npm run build` sinh ra và được commit để Pages
// phục vụ trực tiếp; không sửa tay (`npm run build:check` bắt lệch).
export const optionId = (option: ChoiceOption): string => typeof option === 'string' ? option : option.id;
/** Thoát ký tự HTML; null/undefined thành chuỗi rỗng. */
export const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => (({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string, string>)[char]));
/** Đếm từ (tách theo khoảng trắng). */
export const words = (value: unknown): number => String(value || '').trim().split(/\s+/).filter(Boolean).length;
/** Nhãn học viên trong danh sách chọn: tên và email (mã HVxx đổi thành email hocvienxx@izone.edu.vn). */
export function formatCandidateOptionLabel(s: { name: string, email?: string, discriminator?: string }): string {
  let email = (s.email || s.discriminator || '').trim();
  if (/^HV(\d+)$/i.test(email)) {
    email = `hocvien${email.replace(/^HV/i, '')}@izone.edu.vn`;
  }
  const suffix = email ? ` · ${email}` : '';
  return `${s.name}${suffix}`;
}
