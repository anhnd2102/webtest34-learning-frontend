// NGUỒN: file .ts này; presentation.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
export const CANONICAL_SKILL_LABELS = {
    vocabulary: 'Vocabulary',
    vocabulary_listen_write: 'Vocabulary',
    listening: 'Listening',
    pronunciation: 'Pronunciation',
    reading: 'Reading',
    writing: 'Writing',
    speaking: 'Speaking',
    grammar: 'Grammar',
    general: 'Chung'
};
export function normalizeSkillCode(code, sectionTitle = '') {
    if (typeof sectionTitle === 'string' && sectionTitle) {
        const prefix = sectionTitle.split(/[·\-\:]/)[0].trim().toLowerCase();
        if (prefix.includes('vocab'))
            return 'vocabulary';
        if (prefix.includes('listen'))
            return 'listening';
        if (prefix.includes('pronun'))
            return 'pronunciation';
        if (prefix.includes('read'))
            return 'reading';
        if (prefix.includes('writ') || prefix.includes('dịch') || prefix.includes('translat'))
            return 'writing';
        if (prefix.includes('speak'))
            return 'speaking';
        if (prefix.includes('gramm'))
            return 'grammar';
    }
    if (!code || typeof code !== 'string')
        return 'general';
    const clean = code.trim().toLowerCase();
    if (clean.includes('vocab'))
        return 'vocabulary';
    if (clean.includes('listen'))
        return 'listening';
    if (clean.includes('pronun'))
        return 'pronunciation';
    if (clean.includes('read'))
        return 'reading';
    if (clean.includes('writ') || clean.includes('translat'))
        return 'writing';
    if (clean.includes('speak'))
        return 'speaking';
    if (clean.includes('gramm'))
        return 'grammar';
    return clean;
}
export function escapeHtml(str) {
    if (str === null || str === undefined)
        return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
