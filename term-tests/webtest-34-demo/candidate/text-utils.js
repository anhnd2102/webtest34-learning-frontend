// Tiện ích văn bản dùng chung cho shell học viên (tách nguyên văn từ content-preview.mjs).
export const optionId = option => typeof option === 'string' ? option : option.id;
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const words = value => String(value || '').trim().split(/\s+/).filter(Boolean).length;
// Lý do cho học viên khi /attempts/draft trả lỗi 409 (mã lấy từ learning-service.saveDraft của backend).
export function formatCandidateOptionLabel(s) {
  let email = (s.email || s.discriminator || '').trim();
  if (/^HV(\d+)$/i.test(email)) {
    email = `hocvien${email.replace(/^HV/i, '')}@izone.edu.vn`;
  }
  const suffix = email ? ` · ${email}` : '';
  return `${s.name}${suffix}`;
}

