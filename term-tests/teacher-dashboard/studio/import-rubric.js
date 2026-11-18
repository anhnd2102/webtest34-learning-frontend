// NGUỒN: file .ts này; import-rubric.js do `npm run build` sinh ra.
//
// Dòng Tự luận chấm AI kiểu mới trong CSV (spec #91, GĐ 5): Dạng chấm, Khối, Yêu cầu bắt buộc, Đáp án mẫu...
// Dùng lại mô hình của trình hướng dẫn (cùng quy tắc kiểm tra, cùng payload gửi backend), nên CSV và trình hướng dẫn cho kết quả như nhau.
// Điểm, bảng trừ lỗi theo Khối và chỉ dẫn cho AI do backend dựng khi nhập; frontend không tự tính.
import { COLUMN_LABEL } from './import-registry.js';
import { buildRubricPayload, createWizardState, emptyQuestion, splitLines, validateWizardStep } from './rubric-wizard-model.js';
// Bỏ dấu, chữ thường: nhận cả "Dịch Việt–Anh" lẫn "dich viet anh".
const plain = (text) => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const VARIANT_NAMES = [
    { variant: 'translation', names: ['Dịch Việt–Anh', 'Dịch', 'translation'] },
    { variant: 'sentence_order', names: ['Điền sắp xếp và chia động từ', 'Sắp xếp và chia động từ', 'sentence order', 'sentence_order'] },
    { variant: 'reading_comprehension', names: ['Đọc hiểu', 'reading comprehension', 'reading_comprehension'] },
    { variant: 'sentence_role', names: ['Writing đọc hiểu', 'Vai trò câu', 'sentence role', 'sentence_role'] },
    { variant: 'speaking_text', names: ['Speaking dạng văn bản', 'Speaking', 'speaking text', 'speaking_text'] },
    { variant: 'writing', names: ['Viết đoạn/bài (Writing)', 'Viết đoạn/bài', 'Writing', 'Viết'] }
];
export function resolveRubricVariant(raw) {
    const key = plain(raw);
    if (!key)
        return undefined;
    return VARIANT_NAMES.find(entry => entry.names.some(name => plain(name) === key))?.variant;
}
export function resolveRubricLevel(raw) {
    const key = plain(raw).replace(/^(khoi|k)\s*/, '');
    if (key === '03' || key === '3')
        return '03';
    if (key === '34')
        return '34';
    if (key === '45')
        return '45';
    return undefined;
}
// "tên (điểm) [cách viết chấp nhận]" cách nhau bằng |; ngoặc không chỉ có số thì thuộc về tên.
export function parseRequirements(text) {
    return String(text ?? '').split(/\r?\n|\|/).map(part => part.trim()).filter(Boolean).map(part => {
        let rest = part;
        let acceptedForms = '';
        const forms = rest.match(/\[([^\]]*)\]\s*$/);
        if (forms) {
            acceptedForms = forms[1].trim();
            rest = rest.slice(0, forms.index).trim();
        }
        let maxScore = '';
        const score = rest.match(/\(\s*(\d+(?:[.,]\d+)?)\s*(?:đ|điểm|d)?\s*\)\s*$/i);
        if (score) {
            maxScore = score[1].replace(',', '.');
            rest = rest.slice(0, score.index).trim();
        }
        return { label: rest, maxScore, acceptedForms };
    }).filter(requirement => requirement.label);
}
// Dạng có chấm Grammar/Vocab (khớp danh mục của backend).
const LANGUAGE_VARIANTS = ['translation', 'sentence_order', 'speaking_text'];
const clean = (value) => String(value ?? '').trim();
const err = (field, text, hint) => ({ level: 'error', column: COLUMN_LABEL[field] || field, text, ...(hint ? { hint } : {}) });
// Gắn lỗi của trình hướng dẫn (câu văn tiếng Việt) vào đúng cột của file.
function columnOf(problem) {
    const text = problem.toLowerCase();
    if (text.includes('đề bài'))
        return 'prompt';
    if (text.includes('vai trò'))
        return 'correct';
    if (text.includes('mức chấm') || text.includes('khối'))
        return 'level';
    if (text.includes('điểm mỗi câu'))
        return 'points';
    return 'requirements';
}
export function buildRubricRow(record, options = {}) {
    const messages = [];
    const variant = resolveRubricVariant(clean(record.variant));
    if (!variant) {
        messages.push(err('variant', `"${clean(record.variant)}" không nhận ra.`, 'Dùng: Dịch Việt–Anh, Điền sắp xếp và chia động từ, Đọc hiểu, Writing đọc hiểu, Speaking dạng văn bản hoặc Viết đoạn/bài (Writing).'));
        return { messages };
    }
    const rawLevel = clean(record.level);
    const level = rawLevel ? resolveRubricLevel(rawLevel) : (options.defaultLevel || '34');
    if (!level) {
        messages.push(err('level', `"${rawLevel}" không nhận ra.`, 'Ghi 03, 34 hoặc 45 (để trống thì theo Khối của đề).'));
        return { messages };
    }
    const state = createWizardState({ variant });
    state.level = level;
    const rawPoints = clean(record.points);
    if (rawPoints) {
        const value = Number(rawPoints.replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0) {
            messages.push(err('points', `"${rawPoints}" không hợp lệ.`, 'Nhập một số lớn hơn 0, ví dụ 4.'));
            return { messages };
        }
        state.points = String(value);
    }
    state.context = clean(record.context);
    state.useOwnContext = Boolean(state.context);
    state.languageScore = clean(record.languageScore);
    state.wordMin = clean(record.wordMin);
    const question = emptyQuestion(variant);
    question.prompt = clean(record.prompt);
    const requirements = parseRequirements(clean(record.requirements));
    if (variant === 'writing') {
        question.outline = requirements.map(requirement => requirement.label).join('\n');
        question.vocabularyHints = clean(record.hint).split(/\r?\n|\|/).map(part => part.trim()).filter(Boolean).join('\n');
    }
    else if (variant === 'sentence_role') {
        question.role = clean(record.correct);
    }
    else {
        question.requirements = requirements;
    }
    question.modelAnswers = clean(record.sample).split(/\r?\n|\|/).map(part => part.trim()).filter(Boolean).join('\n');
    question.promptGuidance = clean(record.guidance);
    state.questions = [question];
    for (const problem of [...validateWizardStep(state, 2), ...validateWizardStep(state, 3)])
        messages.push(err(columnOf(problem), problem));
    // Điểm các yêu cầu phải khớp điểm của câu theo cùng quy tắc của backend (backend vẫn là nơi quyết định):
    // dạng không chấm Grammar/Vocab thì tổng phải bằng điểm của câu; dạng có Grammar/Vocab thì phải chừa điểm cho phần đó.
    const scored = question.requirements.filter(requirement => requirement.maxScore !== '');
    if (variant !== 'writing' && variant !== 'sentence_role' && scored.length) {
        const total = Math.round(scored.reduce((sum, requirement) => sum + Number(requirement.maxScore), 0) * 100) / 100;
        const maximum = Number(state.points);
        const language = Number(state.languageScore.replace(',', '.'));
        const allScored = scored.length === question.requirements.length;
        if (LANGUAGE_VARIANTS.includes(variant)) {
            if (state.languageScore !== '' && Number.isFinite(language)) {
                const remaining = Math.round((maximum - language - total) * 100) / 100;
                if (allScored ? Math.abs(remaining) > 0.001 : remaining <= 0) {
                    messages.push(err('requirements', `Điểm các yêu cầu (${total}) cộng Grammar/Vocab (${language}) ${allScored ? 'phải bằng' : 'phải nhỏ hơn'} điểm của câu (${maximum}).`));
                }
            }
            else if (total > maximum + 1e-9) {
                messages.push(err('requirements', `Tổng điểm các yêu cầu (${total}) vượt điểm của câu (${maximum}).`, 'Giảm điểm các yêu cầu, hoặc tăng điểm của câu; phần còn lại dành cho Grammar/Vocab.'));
            }
        }
        else if (allScored && Math.abs(total - maximum) > 0.001) {
            messages.push(err('requirements', total > maximum ? `Tổng điểm các yêu cầu (${total}) vượt điểm của câu (${maximum}).` : `Tổng điểm các yêu cầu (${total}) phải bằng điểm của câu (${maximum}) vì dạng này không chấm Grammar/Vocab.`, 'Sửa điểm từng yêu cầu cho khớp điểm của câu.'));
        }
        else if (!allScored && total >= maximum - 1e-9) {
            messages.push(err('requirements', `Tổng điểm các yêu cầu đã ghi (${total}) vượt hoặc bằng điểm của câu (${maximum}); các yêu cầu chưa ghi điểm không còn điểm để chia.`));
        }
    }
    if (messages.length)
        return { messages };
    const card = {
        prompt: question.prompt,
        referenceContext: state.context,
        interactionType: 'long_text',
        pedagogicalTypeCode: 'writing',
        layoutType: 'default',
        graderType: 'rubric_async',
        maxScore: Number(state.points),
        rubricVariant: variant,
        rubricCode: 'izone-rubric-v2',
        // Payload gửi POST /rubric-presets/build lúc nhập; điểm câu và bảng trừ lỗi theo Khối do backend quyết định.
        pendingRubric: buildRubricPayload(state, question)
    };
    if (variant === 'writing') {
        card.studentOutline = splitLines(question.outline);
        const hints = splitLines(question.vocabularyHints);
        if (hints.length)
            card.vocabularyHints = hints;
    }
    return { card, messages };
}
