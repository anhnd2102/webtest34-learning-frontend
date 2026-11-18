import { expandAnswerVariants } from './answer-variants.js';
import { upgradeNormalization } from './normalization-policy.js';
// Giữ tên và chữ ký cũ cho các nơi gọi; bộ sinh thật nằm ở answer-variants (spec #54).
export function expandSentenceVariants(sentences = []) {
    return expandAnswerVariants(sentences);
}
export function generateHangmanHint(targetText = '') {
    if (!targetText || typeof targetText !== 'string')
        return '';
    const clean = targetText.trim();
    if (!clean)
        return '';
    return clean
        .replace(/\s*-\s*/g, ' - ')
        .replace(/[a-zA-Z]+/g, (word) => {
        if (word.length <= 1)
            return word;
        const first = word[0];
        const underscores = Array(word.length - 1).fill('_').join(' ');
        return `${first} ${underscores}`;
    });
}
export function validateListeningOrderUniqueness(events) {
    if (!Array.isArray(events) || events.length < 2) {
        return { isValid: false, duplicates: [], missingRanks: [] };
    }
    const total = events.length;
    const ranksSeen = new Map();
    const duplicates = [];
    for (const ev of events) {
        const r = Number(ev.rank);
        if (!Number.isFinite(r) || r < 1)
            continue;
        const count = (ranksSeen.get(r) || 0) + 1;
        ranksSeen.set(r, count);
        if (count === 2) {
            duplicates.push(r);
        }
    }
    const missingRanks = [];
    for (let i = 1; i <= total; i++) {
        if (!ranksSeen.has(i)) {
            missingRanks.push(i);
        }
    }
    const isValid = duplicates.length === 0 && missingRanks.length === 0 && ranksSeen.size === total;
    return { isValid, duplicates, missingRanks };
}
export function extractParagraphLabels(passage = '') {
    if (!passage || typeof passage !== 'string')
        return [];
    const labels = new Set();
    const pattern = /(?:Paragraph\s+([A-Z])|\[([A-Z])\])/gi;
    let match;
    while ((match = pattern.exec(passage)) !== null) {
        const letter = (match[1] || match[2] || '').toUpperCase();
        if (letter)
            labels.add(letter);
    }
    return Array.from(labels).sort();
}
export function computeCorrectionScore(answer, gradingKey = {}) {
    const maxScore = Number(gradingKey.maxScore) || 1;
    if (!answer || typeof answer !== 'object') {
        return { score: 0, maxScore, isErrorCorrect: false, isCorrectionCorrect: false };
    }
    const rawError = String(answer.error || '').trim().toLowerCase();
    const rawCorrection = String(answer.correction || '').trim().toLowerCase();
    const expectedErrors = (gradingKey.expectedErrors || []).map((e) => String(e).trim().toLowerCase());
    const expectedCorrections = (gradingKey.expectedCorrections || []).map((c) => String(c).trim().toLowerCase());
    const isErrorCorrect = expectedErrors.length > 0 && expectedErrors.includes(rawError);
    const isCorrectionCorrect = expectedCorrections.length > 0 && expectedCorrections.includes(rawCorrection);
    const scoringRule = gradingKey.scoringRule || 'split_points';
    let score = 0;
    if (scoringRule === 'all_or_nothing') {
        score = (isErrorCorrect && isCorrectionCorrect) ? maxScore : 0;
    }
    else {
        if (isErrorCorrect && isCorrectionCorrect) {
            score = maxScore;
        }
        else if (isErrorCorrect || isCorrectionCorrect) {
            score = maxScore / 2;
        }
        else {
            score = 0;
        }
    }
    return { score, maxScore, isErrorCorrect, isCorrectionCorrect };
}
export function tokenizeSentence(input) {
    if (!input || typeof input !== 'string')
        return [];
    const trimmed = input.trim();
    if (!trimmed)
        return [];
    // Check if contains brackets like [She] [has worked]
    if (trimmed.includes('[') && trimmed.includes(']')) {
        const bracketMatches = trimmed.match(/\[([^\]]+)\]/g);
        if (bracketMatches && bracketMatches.length > 0) {
            return bracketMatches.map(m => m.slice(1, -1).trim()).filter(Boolean);
        }
    }
    // Check if contains slash separator /
    if (trimmed.includes('/')) {
        return trimmed.split('/').map(t => t.trim()).filter(Boolean);
    }
    // Fallback to space-separated words
    return trimmed.split(/\s+/).filter(Boolean);
}
export function scrambleTokens(tokens) {
    if (!Array.isArray(tokens) || tokens.length <= 1) {
        return Array.isArray(tokens) ? [...tokens] : [];
    }
    const copy = [...tokens];
    let shuffled = [...copy];
    for (let attempt = 0; attempt < 10; attempt++) {
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const isSame = shuffled.every((val, idx) => val === copy[idx]);
        if (!isSame)
            break;
    }
    return shuffled;
}
export function scoreTransformationAnswer(studentAnswer, gradingKey) {
    const maxScore = Number(gradingKey?.maxScore) || 1;
    if (!studentAnswer || typeof studentAnswer !== 'string') {
        return { score: 0, isCorrect: false };
    }
    const acceptedList = Array.isArray(gradingKey?.accepted) ? gradingKey.accepted : [];
    if (acceptedList.length === 0) {
        return { score: 0, isCorrect: false };
    }
    const norm = (str) => {
        let s = (str || '').normalize(gradingKey?.normalization?.unicode || 'NFKC');
        if (gradingKey?.normalization?.caseInsensitive !== false) {
            s = s.toLowerCase();
        }
        s = s.replace(/\s+/g, ' ').trim();
        s = s.replace(/[.!?]+$/, '').trim();
        return s;
    };
    const rawAns = norm(studentAnswer);
    if (!rawAns) {
        return { score: 0, isCorrect: false };
    }
    // 1. Direct match with accepted variants
    for (const acc of acceptedList) {
        if (rawAns === norm(acc)) {
            return { score: maxScore, isCorrect: true };
        }
    }
    // 2. Strip prefix and suffix if student typed reconstructed full sentence
    const prefix = norm(gradingKey?.framePrefix || '');
    const suffix = norm(gradingKey?.frameSuffix || '');
    let stripped = rawAns;
    if (prefix && stripped.startsWith(prefix)) {
        stripped = stripped.slice(prefix.length).trim();
    }
    if (suffix && stripped.endsWith(suffix)) {
        stripped = stripped.slice(0, stripped.length - suffix.length).trim();
    }
    stripped = norm(stripped);
    if (stripped) {
        for (const acc of acceptedList) {
            if (stripped === norm(acc)) {
                return { score: maxScore, isCorrect: true };
            }
        }
    }
    // 3. Match against full reconstructed sentence from accepted answer
    for (const acc of acceptedList) {
        const fullConstructed = norm(`${gradingKey?.framePrefix || ''} ${acc} ${gradingKey?.frameSuffix || ''}`);
        if (rawAns === fullConstructed) {
            return { score: maxScore, isCorrect: true };
        }
    }
    return { score: 0, isCorrect: false };
}
export const COMMON_IPA_SYMBOLS = [
    'æ', 'θ', 'ð', 'ʃ', 'ʒ', 'tʃ', 'dʒ', 'ŋ', 'ʌ', 'ɔː', 'ə', 'ɜː', 'ˈ', 'ˌ'
];
export function formatIpaTranscription(rawIpa) {
    if (!rawIpa || typeof rawIpa !== 'string')
        return '';
    const trimmed = rawIpa.trim();
    if (!trimmed)
        return '';
    if (trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2) {
        return trimmed;
    }
    const clean = trimmed.replace(/^\/+|\/+$/g, '').trim();
    return clean ? `/${clean}/` : '';
}
export function formatOptionDisplayLetter(optId, index = 0) {
    if (typeof optId === 'string') {
        const trimmed = optId.trim();
        const matchOptLetter = trimmed.match(/^opt_([a-zA-Z])$/i);
        if (matchOptLetter)
            return matchOptLetter[1].toUpperCase();
        const matchOptNum = trimmed.match(/^opt_([0-9]+)$/i);
        if (matchOptNum) {
            const num = parseInt(matchOptNum[1], 10);
            if (num >= 1 && num <= 26)
                return String.fromCharCode(64 + num);
        }
        if (/^[A-Za-z]$/.test(trimmed))
            return trimmed.toUpperCase();
    }
    const safeIdx = typeof index === 'number' && index >= 0 ? index : 0;
    return String.fromCharCode(65 + safeIdx);
}
export function isShortQaEligibleFor2Col(items) {
    if (!Array.isArray(items) || items.length <= 1)
        return false;
    return items.every(item => {
        const prompt = (item.prompt || '').trim();
        const clean = prompt.replace(/<[^>]+>/g, '').trim();
        const hasComplexHtml = /<(?:table|tbody|tr|td|th|img|figure|video|audio|blockquote|hr)\b/i.test(prompt);
        return clean.length > 0 && clean.length <= 100 && !hasComplexHtml;
    });
}
export function batchGenerateExerciseVocabVariants(block, targetExercise, draftState) {
    if (!block || !Array.isArray(block.items) || !targetExercise || !draftState)
        return 0;
    const targetExerciseId = targetExercise.exerciseId;
    const vocabItems = block.items.filter(it => it.exerciseId === targetExerciseId && it.interactionType === 'text_select_pair');
    let updatedCount = 0;
    vocabItems.forEach(item => {
        const rawWord = (item.targetWord || item.prompt || '').trim();
        if (!rawWord)
            return;
        if (!draftState.gradingKey)
            draftState.gradingKey = { items: {} };
        if (!draftState.gradingKey.items)
            draftState.gradingKey.items = {};
        let currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (!currentKey) {
            currentKey = {
                graderType: 'accepted_text_exact_option',
                accepted: [],
                expectedOptionId: (item.options && item.options[0]) ? item.options[0].id : ''
            };
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
        }
        const currentAccepted = Array.isArray(currentKey.accepted) ? currentKey.accepted.filter(Boolean) : [];
        const generatedVariants = expandSentenceVariants([rawWord]);
        const merged = Array.from(new Set([...currentAccepted, ...generatedVariants])).slice(0, 40);
        currentKey.accepted = merged;
        currentKey.normalization = upgradeNormalization(currentKey.normalization);
        updatedCount++;
    });
    return updatedCount;
}
