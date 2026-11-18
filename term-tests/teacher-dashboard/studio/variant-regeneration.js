// NGUỒN: file .ts này; variant-regeneration.js do `npm run build` sinh ra.
//
// "Tạo lại biến thể" (spec #54): thay danh sách biến thể của một đáp án bằng danh sách sinh theo quy tắc mới và nâng câu lên ruleSet v2.
import { MAX_VARIANTS, generateAnswerVariants } from './answer-variants.js';
import { upgradeNormalization } from './normalization-policy.js';
// Hỏi trước khi thay nếu có biến thể sẽ mất (do tự thêm hoặc sinh theo quy tắc cũ). Không có window.confirm thì cứ thay.
export function confirmReplaceVariants(current, next) {
    const kept = new Set(next.map(text => text.toLowerCase()));
    const lost = current.filter(text => text && !kept.has(text.toLowerCase()));
    if (!lost.length || typeof window === 'undefined' || typeof window.confirm !== 'function')
        return true;
    const shown = lost.slice(0, 5).map(text => `- ${text}`).join('\n');
    const more = lost.length > 5 ? `\n… và ${lost.length - 5} biến thể khác.` : '';
    return window.confirm(`Tạo lại biến thể sẽ thay danh sách hiện tại bằng danh sách theo quy tắc mới. Các biến thể sau sẽ mất:\n${shown}${more}\nTiếp tục?`);
}
export function truncationNotice(truncated) {
    return truncated ? `Đáp án này có nhiều hơn ${MAX_VARIANTS} biến thể; chỉ giữ ${MAX_VARIANTS} biến thể quan trọng nhất (đáp án gốc, rồi biến thể đơn, rồi tổ hợp). Bạn có thể bỏ bớt từng thẻ hoặc tự thêm.` : '';
}
// Tạo lại danh sách `field` của khóa chấm từ `answer`. Trả null nếu giáo viên không đồng ý thay.
export function regenerateVariantList(key, answer, field = 'accepted') {
    const result = generateAnswerVariants(answer);
    const list = result.variants.map(variant => variant.text);
    const current = Array.isArray(key[field]) ? key[field] : [];
    if (!confirmReplaceVariants(current, list))
        return null;
    key[field] = list;
    key.normalization = upgradeNormalization(key.normalization);
    return { list, truncated: result.truncated };
}
