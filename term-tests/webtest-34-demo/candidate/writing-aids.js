// NGUỒN: file .ts này; writing-aids.js do `npm run build` sinh ra (xem text-utils.ts).
//
// Dàn ý và từ vựng gợi ý hiện cho học viên ngay trên ô trả lời của câu Writing (spec #40). Dàn ý là các ý AI dùng để chấm
// Task achievement; từ vựng gợi ý không bắt buộc. Đáp án mẫu và hướng dẫn chấm cho AI không bao giờ nằm trong định nghĩa công khai.
import { escape } from './text-utils.js?rev=20261121-wordmark-logo';
const texts = (value) => (Array.isArray(value) ? value : [])
    .map(entry => String(entry ?? '').trim())
    .filter(Boolean);
export function writingAidsHtml(item) {
    const outline = texts(item.studentOutline);
    const vocabulary = texts(item.vocabularyHints);
    const outlineHtml = outline.length
        ? `<section class="cbt-writing-aid cbt-writing-outline" aria-label="Dàn ý bài viết"><h4>Dàn ý bài viết</h4><ol>${outline.map(line => `<li>${escape(line)}</li>`).join('')}</ol></section>`
        : '';
    const vocabularyHtml = vocabulary.length
        ? `<section class="cbt-writing-aid cbt-writing-vocab" aria-label="Từ vựng gợi ý"><h4>Từ vựng gợi ý <span class="cbt-writing-aid-note">(không bắt buộc)</span></h4><ul class="cbt-vocab-chips">${vocabulary.map(word => `<li>${escape(word)}</li>`).join('')}</ul><p class="cbt-writing-aid-note">Bạn không phải dùng các từ này; nếu dùng, chú ý dạng từ (danh từ, động từ, tính từ, trạng từ).</p></section>`
        : '';
    return outlineHtml + vocabularyHtml;
}
