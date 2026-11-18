// NGUỒN: file .ts này; variant-chip-reasons.js do `npm run build` sinh ra.
//
// Thẻ biến thể kèm lý do (spec #54): sau khi dựng giao diện, mỗi nhóm thẻ có thẻ đầu là đáp án gốc; các thẻ còn lại được gắn nhãn
// họ luật đã sinh ra nó ("rút gọn", "số", "từ ghép"…) hoặc "nhập tay". Chỉ thêm nhãn, không đổi nội dung hay thứ tự thẻ.
import { explainVariant } from './answer-variants.js';

export function annotateVariantChips(root: ParentNode | null | undefined): void {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const groups = new Map<Element, Element[]>();
  root.querySelectorAll('.variant-chip').forEach(chip => {
    const parent = chip.parentElement;
    if (!parent) return;
    groups.set(parent, [...(groups.get(parent) || []), chip]);
  });
  for (const chips of groups.values()) {
    const answer = chips[0]?.getAttribute('data-variant') || '';
    chips.forEach((chip, index) => {
      if (chip.querySelector('.chip-reason')) return;
      const variant = chip.getAttribute('data-variant') || '';
      const reason = index === 0 ? 'đáp án gốc' : explainVariant(answer, variant);
      const label = document.createElement('span');
      label.className = `chip-reason${reason === 'nhập tay' ? ' is-manual' : ''}`;
      label.textContent = reason;
      chip.insertBefore(label, chip.querySelector('.btn-remove-chip'));
    });
  }
}
