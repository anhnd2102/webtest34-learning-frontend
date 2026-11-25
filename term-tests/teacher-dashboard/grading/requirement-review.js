// NGUỒN: file .ts này; requirement-review.js do `npm run build` sinh ra.
//
// Màn chấm lại của giáo viên cho câu rubric v2 (spec #40, GĐ 5): thấy bằng chứng AI từng yêu cầu và sửa điểm từng yêu cầu.
// Chỉ gửi điểm từng thành phần; tổng điểm câu do backend tính lại, giá trị xem trước ở đây không phải điểm chính thức.
import { escapeHtml } from '../ui/presentation.js';
const LANGUAGE_ID = 'language';
export function hasRequirementBreakdown(feedback) {
    const list = feedback?.requiredStructures;
    return Array.isArray(list) && list.length > 0 && list.every((requirement) => requirement.maxScore !== undefined);
}
const fmt = (value) => String(Number(Number(value ?? 0).toFixed(2)));
function row(opts) {
    const evidence = (opts.evidence || []).map(text => `<q class="req-evidence">${escapeHtml(text)}</q>`).join('');
    return `<li class="req-row">
    <div class="req-main"><span class="req-name">${escapeHtml(opts.name)}</span>${evidence}${opts.note ? `<p class="req-note">${escapeHtml(opts.note)}</p>` : ''}</div>
    <div class="req-score"><input type="number" step="0.25" min="0" max="${fmt(opts.max)}" class="req-score-input table-grade-input" data-req-id="${escapeHtml(opts.id)}" value="${fmt(opts.current)}" aria-label="Điểm: ${escapeHtml(opts.name)}"><span class="req-denom">/ ${fmt(opts.max)}</span><span class="req-ai">AI: ${fmt(opts.aiScore)}</span></div>
  </li>`;
}
export function requirementReviewHtml(feedback, draft) {
    const current = (id, aiScore) => (draft && draft[id] !== undefined ? draft[id] : aiScore);
    const rows = feedback.requiredStructures.map(requirement => row({
        id: requirement.id, name: requirement.label || requirement.id, max: requirement.maxScore,
        current: current(requirement.id, requirement.scoreEarned ?? 0), aiScore: requirement.scoreEarned ?? 0,
        evidence: requirement.evidence, note: requirement.comment
    }));
    if (feedback.language) {
        rows.push(row({
            id: LANGUAGE_ID, name: 'Grammar/Vocab', max: feedback.language.maxScore,
            current: current(LANGUAGE_ID, feedback.language.scoreEarned ?? 0), aiScore: feedback.language.scoreEarned ?? 0,
            note: `${feedback.language.independentErrors ?? 0} lỗi độc lập`
        }));
    }
    for (const criterion of (feedback.criteria || [])) {
        rows.push(row({
            id: criterion.id, name: criterion.label || criterion.id, max: criterion.maxScore,
            current: current(criterion.id, criterion.score ?? 0), aiScore: criterion.score ?? 0, evidence: criterion.evidence
        }));
    }
    const errors = (feedback.errors || []).map(error => `<li>${escapeHtml(error.message || error.code || '')}${(error.evidence || []).length ? ` <q class="req-evidence">${escapeHtml(error.evidence.join('; '))}</q>` : ''}</li>`).join('');
    return `<div class="req-review"><ul class="req-list">${rows.join('')}</ul>${errors ? `<details class="req-errors"><summary>Lỗi AI ghi nhận</summary><ul>${errors}</ul></details>` : ''}</div>`;
}
export function collectRequirementScores(root) {
    const scores = {};
    for (const input of Array.from(root.querySelectorAll('.req-score-input'))) {
        const raw = String(input.value ?? '').trim();
        if (raw === '')
            continue;
        scores[input.dataset.reqId] = Number(raw);
    }
    return scores;
}
export function previewRequirementTotal(feedback, draft) {
    const pick = (id, aiScore) => (draft[id] !== undefined ? draft[id] : aiScore);
    let total = 0;
    for (const requirement of feedback.requiredStructures)
        total += pick(requirement.id, requirement.scoreEarned ?? 0);
    if (feedback.language)
        total += pick(LANGUAGE_ID, feedback.language.scoreEarned ?? 0);
    for (const criterion of (feedback.criteria || []))
        total += pick(criterion.id, criterion.score ?? 0);
    return Number(total.toFixed(2));
}
