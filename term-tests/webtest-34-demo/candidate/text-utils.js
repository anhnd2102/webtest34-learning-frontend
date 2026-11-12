// Tiện ích văn bản dùng chung cho shell học viên (tách nguyên văn từ content-preview.mjs).
/** @typedef {string | { id: string }} ChoiceOption */

/**
 * @param {ChoiceOption} option
 * @returns {string}
 */
export const optionId = option => typeof option === 'string' ? option : option.id;
/**
 * Thoát ký tự HTML; null/undefined thành chuỗi rỗng.
 * @param {unknown} value
 * @returns {string}
 */
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => (/** @type {Record<string, string>} */ ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]));
/**
 * Đếm từ (tách theo khoảng trắng).
 * @param {unknown} value
 * @returns {number}
 */
export const words = value => String(value || '').trim().split(/\s+/).filter(Boolean).length;
/**
 * Nhãn học viên trong danh sách chọn: tên và email (mã HVxx đổi thành email hocvienxx@izone.edu.vn).
 * @param {{ name: string, email?: string, discriminator?: string }} s
 * @returns {string}
 */
export function formatCandidateOptionLabel(s) {
  let email = (s.email || s.discriminator || '').trim();
  if (/^HV(\d+)$/i.test(email)) {
    email = `hocvien${email.replace(/^HV/i, '')}@izone.edu.vn`;
  }
  const suffix = email ? ` · ${email}` : '';
  return `${s.name}${suffix}`;
}

