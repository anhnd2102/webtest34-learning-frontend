// NGUỒN: file .ts này; rubric-wizard.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
//
// Trình hướng dẫn 4 bước tạo câu Tự luận chấm AI (spec #40): 1 chọn dạng → 2 nội dung → 3 Khối và mức chấm → 4 chấm thử.
// Không hiện mã kỹ thuật; quy tắc chấm do backend dựng (`onBuildRubric`), ở đây chỉ thu thập dữ liệu và hiển thị.
import { registerBuilderModalCleanup, trackBuilderModal } from '../navigation/unsaved-changes.js';
import { renderSvgIcon } from '../ui/icons.js';
import { escapeHtml } from '../ui/presentation.js';
import { VARIANT_EXAMPLES, buildRubricPayload, changeVariant, emptyQuestion, levelsForVariant, questionsFromSentences, validateWizardStep } from './rubric-wizard-model.js';
const STEP_TITLES = ['Chọn dạng', 'Nội dung', 'Khối và mức chấm', 'Chấm thử'];
export function renderStepper(step) {
    return `<ol class="rw-stepper" aria-label="Các bước">${STEP_TITLES.map((title, index) => {
        const number = index + 1;
        const status = number === step ? 'is-current' : (number < step ? 'is-done' : '');
        return `<li class="rw-step ${status}"${number === step ? ' aria-current="step"' : ''}><span class="rw-step-number">${number}</span><span class="rw-step-title">${title}</span></li>`;
    }).join('')}</ol>`;
}
export function renderStepOne(catalog, state) {
    const groups = catalog.families.map(family => {
        const cards = catalog.variants.filter(variant => variant.family === family.family).map(variant => `
      <label class="rw-variant-card${state.variant === variant.variant ? ' is-selected' : ''}">
        <input type="radio" name="rw-variant" value="${variant.variant}"${state.variant === variant.variant ? ' checked' : ''} />
        <span class="rw-variant-title">${escapeHtml(variant.label)}</span>
        <span class="rw-variant-desc">${escapeHtml(variant.description)}</span>
        <span class="rw-variant-example"><strong>Ví dụ:</strong> ${escapeHtml(VARIANT_EXAMPLES[variant.variant] || '')}</span>
      </label>`).join('');
        return `<fieldset class="rw-family"><legend>${escapeHtml(family.label)}</legend><div class="rw-variant-grid">${cards}</div></fieldset>`;
    }).join('');
    return `<p class="rw-lead">Chọn dạng câu hỏi bạn muốn tạo. Hệ thống sẽ gợi ý cách chấm phù hợp ở các bước sau.</p>${groups}`;
}
const field = (label, control, hint = '') => `<div class="form-group rw-field"><label class="form-label">${label}</label>${control}${hint ? `<div class="form-hint">${hint}</div>` : ''}</div>`;
function renderRequirementRows(question, qIndex, withForms, kindLabel) {
    const rows = question.requirements.map((row, rIndex) => `
    <div class="rw-requirement-row" data-r="${rIndex}">
      <input type="text" class="form-control rw-input" data-q="${qIndex}" data-f="req-label" data-r="${rIndex}" value="${escapeHtml(row.label)}" placeholder="${kindLabel}" aria-label="${kindLabel}" />
      <input type="text" inputmode="decimal" class="form-control rw-input rw-input-score" data-q="${qIndex}" data-f="req-score" data-r="${rIndex}" value="${escapeHtml(row.maxScore)}" placeholder="Điểm" aria-label="Điểm của yêu cầu" />
      ${withForms ? `<input type="text" class="form-control rw-input" data-q="${qIndex}" data-f="req-forms" data-r="${rIndex}" value="${escapeHtml(row.acceptedForms)}" placeholder="Dạng chấp nhận thêm (cách nhau bằng dấu ;)" aria-label="Dạng chấp nhận thêm" />` : ''}
      <button type="button" class="btn btn-icon btn-sm btn-ghost" data-rw-action="remove-requirement" data-q="${qIndex}" data-r="${rIndex}" title="Xóa dòng" aria-label="Xóa dòng">${renderSvgIcon('close', 'icon-inline')}</button>
    </div>`).join('');
    return `<div class="rw-requirements">${rows}<button type="button" class="btn btn-secondary btn-sm" data-rw-action="add-requirement" data-q="${qIndex}">${renderSvgIcon('plusCircle', 'icon-inline')} <span>Thêm dòng</span></button></div>`;
}
function renderQuestion(state, question, qIndex) {
    const variant = state.variant;
    const textarea = (f, value, rows, placeholder = '') => `<textarea class="form-control rw-input" rows="${rows}" data-q="${qIndex}" data-f="${f}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`;
    let body = '';
    if (variant === 'writing') {
        body = field('Đề bài (hiện cho học viên)', textarea('prompt', question.prompt, 3, 'Ví dụ: Explain some of the difficulties of living in a city...'))
            + field('Dàn ý đoạn (hiện cho học viên, mỗi dòng một ý)', textarea('outline', question.outline, 5, 'Topic sentence\nÝ 1: ...\nÝ 2: ...'), 'AI dùng chính các ý này để chấm Task achievement; điểm chia đều cho từng ý.')
            + field('Từ vựng gợi ý (không bắt buộc, mỗi dòng một từ/cụm)', textarea('vocab', question.vocabularyHints, 3, 'migrate to\nthe cost of living'), 'Học viên không dùng các từ này cũng không bị trừ điểm.');
    }
    else if (variant === 'sentence_role') {
        body = field('Đề bài (hiện cho học viên)', `<input type="text" class="form-control rw-input" data-q="${qIndex}" data-f="prompt" value="${escapeHtml(question.prompt)}" />`)
            + field('Vai trò đúng của câu (chỉ AI thấy, học viên không thấy)', textarea('role', question.role, 2, 'Ví dụ: Nêu luận điểm phản đối thí nghiệm trên động vật'), 'Học viên được điểm khi nêu ý nghĩa tương đương, viết tiếng Việt hay tiếng Anh đều được.');
    }
    else {
        const structured = variant === 'translation' || variant === 'sentence_order';
        body = field('Đề bài (hiện cho học viên)', textarea('prompt', question.prompt, 3, variant === 'sentence_order' ? 'Từ cho sẵn: ... Hãy sắp xếp thành câu hoàn chỉnh và chia động từ.' : ''))
            + field(structured ? 'Yêu cầu bắt buộc (mỗi yêu cầu có điểm riêng)' : 'Ý chính cần có (mỗi ý có điểm riêng)', renderRequirementRows(question, qIndex, structured, structured ? 'Cấu trúc hoặc từ vựng bắt buộc' : 'Ý chính'), structured
                ? 'Để trống cột điểm để hệ thống chia đều. Cột "dạng chấp nhận" chỉ nhận đúng các dạng bạn liệt kê, không tự suy từ đồng nghĩa.'
                : 'Ý đúng một phần được nửa điểm. Để trống cột điểm để hệ thống chia đều.')
            + field('Đáp án mẫu (chỉ AI thấy, mỗi dòng một đáp án)', textarea('model', question.modelAnswers, 3));
    }
    const removable = state.questions.length > 1 ? `<button type="button" class="btn btn-icon btn-sm btn-ghost" data-rw-action="remove-question" data-q="${qIndex}" title="Xóa câu" aria-label="Xóa câu">${renderSvgIcon('trash', 'icon-inline')}</button>` : '';
    return `<section class="rw-question" data-q="${qIndex}"><header class="rw-question-head"><h4>Câu ${qIndex + 1}</h4>${removable}</header>${body}</section>`;
}
export function renderStepTwo(state, precedingScript = '') {
    const variant = state.variant;
    const usesContext = variant === 'reading_comprehension' || variant === 'sentence_role' || variant === 'speaking_text';
    const context = usesContext ? field('Bài đọc / ngữ cảnh chung cho AI (ẩn với học viên)', `<textarea class="form-control rw-input" rows="4" data-rw="context" placeholder="Dán đoạn văn bài đọc hoặc script...">${escapeHtml(state.context)}</textarea>`
        + (precedingScript ? `<button type="button" class="btn btn-secondary btn-sm" data-rw-action="pull-script">${renderSvgIcon('clipboard', 'icon-inline')} <span>Lấy script từ bài phía trước</span></button>` : ''), 'AI đối chiếu văn bản này khi chấm. Học viên không nhìn thấy ở ô này.') : '';
    const splitter = variant === 'sentence_role' ? field('Các câu cần phân tích (mỗi dòng một câu)', `<textarea class="form-control rw-input" rows="4" data-rw="sentences" placeholder="Một mặt, có những tranh luận đạo đức chống lại việc thí nghiệm trên động vật."></textarea>
     <button type="button" class="btn btn-secondary btn-sm" data-rw-action="split-sentences">${renderSvgIcon('layers', 'icon-inline')} <span>Tạo câu hỏi từ các dòng này</span></button>`, 'Mỗi dòng thành một câu hỏi "Vai trò đúng của Câu N"; sau đó bạn chỉ cần nhập vai trò đúng.') : '';
    const points = field(variant === 'writing' ? 'Điểm mỗi câu (một đoạn thân bài)' : 'Điểm mỗi câu', `<input type="text" inputmode="decimal" class="form-control rw-input rw-input-score" data-rw="points" value="${escapeHtml(state.points)}" />`);
    const questions = state.questions.map((question, index) => renderQuestion(state, question, index)).join('');
    return `${points}${context}${splitter}${questions}<button type="button" class="btn btn-secondary btn-sm" data-rw-action="add-question">${renderSvgIcon('plusCircle', 'icon-inline')} <span>Thêm câu hỏi</span></button>`;
}
export function renderStepThree(state, catalog, summary) {
    const info = catalog.variants.find(variant => variant.variant === state.variant);
    const allowed = levelsForVariant(state.variant);
    const levels = catalog.levels.filter(level => allowed.includes(level.level)).map(level => `
    <label class="rw-level-card${state.level === level.level ? ' is-selected' : ''}">
      <input type="radio" name="rw-level" value="${level.level}"${state.level === level.level ? ' checked' : ''} />
      <span class="rw-variant-title">${escapeHtml(level.label)}</span>
      <span class="rw-variant-desc">${escapeHtml(level.description)}</span>
    </label>`).join('');
    const body = summary.loading ? '<p class="rw-muted">Đang dựng tóm tắt cách chấm...</p>'
        : (summary.error ? `<p class="rw-error" role="alert">${escapeHtml(summary.error)}</p>`
            : `<ul class="rw-summary">${(summary.lines || []).map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`);
    const advanced = `<details class="rw-advanced"><summary>Tùy chỉnh nâng cao</summary>
    ${info?.hasLanguage ? field('Điểm dành cho Grammar/Vocab (để trống để dùng mặc định)', `<input type="text" inputmode="decimal" class="form-control rw-input rw-input-score" data-rw="language" value="${escapeHtml(state.languageScore)}" />`) : ''}
    ${state.variant === 'writing' ? field('Số từ tối thiểu (để trống nếu không giới hạn)', `<input type="text" inputmode="numeric" class="form-control rw-input rw-input-score" data-rw="wordmin" value="${escapeHtml(state.wordMin)}" />`, 'Bài ngắn hơn mức này bị giới hạn điểm theo số từ đã viết.') : ''}
    ${field('Hướng dẫn thêm cho AI (học viên không thấy)', `<textarea class="form-control rw-input" rows="3" data-rw="guidance" placeholder="Ví dụ: chấp nhận cách viết tắt thông dụng.">${escapeHtml(state.questions[0]?.promptGuidance || '')}</textarea>`)}
  </details>`;
    return `<p class="rw-lead">Chọn Khối để áp dụng mức chấm tương ứng. Khối của đề được chọn sẵn, bạn có thể đổi cho câu này.</p>
    <div class="rw-level-grid">${levels}</div>
    <h4 class="rw-subtitle">Cách chấm sẽ như sau</h4>${body}${advanced}`;
}
export function renderStepFour(state, resultHtml) {
    return `<p class="rw-lead">Dán một câu trả lời mẫu của học viên để xem AI chấm thử. Bước này không bắt buộc và không lưu bài.</p>
    ${field('Câu trả lời mẫu', `<textarea class="form-control rw-input" rows="4" data-rw="sample">${escapeHtml(state.sample)}</textarea>`)}
    <button type="button" class="btn btn-primary btn-sm" data-rw-action="sandbox">${renderSvgIcon('zap', 'icon-inline')} <span>Chấm thử AI</span></button>
    <div class="rw-sandbox-result" aria-live="polite">${resultHtml}</div>`;
}
// `labels`: id yêu cầu/tiêu chí -> tên hiển thị, để không lộ mã kỹ thuật cho người tạo đề.
export function renderSandboxResult(result, labels = {}) {
    const name = (id) => escapeHtml(labels[id] || id);
    const rows = (result.requiredStructures || []).filter((row) => row.maxScore !== undefined).map((row) => `<li><span>${row.achieved ? 'Đạt' : (row.credit > 0 ? 'Một phần' : 'Chưa đạt')}</span> ${name(row.id)}: ${row.scoreEarned}/${row.maxScore} điểm</li>`).join('');
    const criteria = (result.criteria || []).map((row) => `<li>${name(row.id)}: ${row.score}/${row.maxScore} điểm</li>`).join('');
    const errors = (result.errors || []).map((error) => `<li>${escapeHtml(error.message || error.code || '')}</li>`).join('');
    return `<div class="rw-result"><p class="rw-result-score">Điểm tạm tính: <strong>${result.scoreEarned}/${result.maxScore}</strong></p>
    ${rows ? `<ul>${rows}</ul>` : ''}${criteria ? `<ul>${criteria}</ul>` : ''}${errors ? `<p>Lỗi AI bắt được:</p><ul>${errors}</ul>` : ''}</div>`;
}
// ---- Lớp DOM ----
export function openRubricWizard(options) {
    if (typeof document === 'undefined')
        return null;
    const state = options.state;
    let step = state.mode === 'edit' ? 2 : 1;
    let catalog = null;
    let summary = {};
    let sandboxHtml = '';
    let message = '';
    let busy = false;
    let summaryTimer = null;
    document.querySelector('#rubric-wizard-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'rubric-wizard-modal';
    modal.className = 'modal-generic-batch-overlay modal-batch-vocab-overlay';
    trackBuilderModal(modal, options.owner);
    document.body.appendChild(modal);
    modal.hidden = false;
    const readStepInputs = () => {
        modal.querySelectorAll('[data-f]').forEach(input => {
            const q = state.questions[Number(input.getAttribute('data-q'))];
            if (!q)
                return;
            const f = input.getAttribute('data-f');
            const r = Number(input.getAttribute('data-r'));
            if (f === 'prompt')
                q.prompt = input.value;
            else if (f === 'outline')
                q.outline = input.value;
            else if (f === 'vocab')
                q.vocabularyHints = input.value;
            else if (f === 'role')
                q.role = input.value;
            else if (f === 'model')
                q.modelAnswers = input.value;
            else if (f === 'req-label' && q.requirements[r])
                q.requirements[r].label = input.value;
            else if (f === 'req-score' && q.requirements[r])
                q.requirements[r].maxScore = input.value;
            else if (f === 'req-forms' && q.requirements[r])
                q.requirements[r].acceptedForms = input.value;
        });
        const get = (key) => modal.querySelector(`[data-rw="${key}"]`);
        if (get('points'))
            state.points = get('points').value;
        if (get('context'))
            state.context = get('context').value;
        if (get('language'))
            state.languageScore = get('language').value;
        if (get('wordmin'))
            state.wordMin = get('wordmin').value;
        if (get('sample'))
            state.sample = get('sample').value;
        if (get('guidance'))
            state.questions.forEach(q => { q.promptGuidance = get('guidance').value; });
        const level = modal.querySelector('input[name="rw-level"]:checked');
        if (level)
            state.level = level.value;
    };
    const frame = (inner) => `
    <div class="modal-generic-batch-card modal-batch-vocab-card rw-card" role="dialog" aria-modal="true" aria-labelledby="rw-title">
      <div class="modal-generic-batch-header modal-batch-vocab-header">
        <div class="generic-layout-heading">${renderSvgIcon('plusCircle', 'icon-inline')}<h3 id="rw-title" class="generic-layout-title">${state.mode === 'edit' ? 'Chỉnh lại câu Tự luận chấm AI' : 'Tạo câu hỏi Tự luận chấm AI'}</h3></div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost" data-rw-action="close" title="Đóng" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>
      <div class="modal-generic-batch-body rw-body">
        ${options.exerciseTitle ? `<p class="rw-muted">Thuộc bài tập: ${escapeHtml(options.exerciseTitle)}</p>` : ''}
        ${renderStepper(step)}
        <div class="rw-errors" role="alert">${message ? escapeHtml(message) : ''}</div>
        ${inner}
      </div>
      <div class="modal-generic-batch-footer rw-footer">
        ${step === 1 && options.onLegacy ? `<button type="button" class="btn btn-ghost btn-sm" data-rw-action="legacy">${renderSvgIcon('fileText', 'icon-inline')} <span>Nhập hàng loạt từ CSV (định dạng cũ)</span></button>` : ''}
        <span class="rw-spacer"></span>
        <button type="button" class="btn btn-secondary" data-rw-action="close">Hủy bỏ</button>
        ${step > (state.mode === 'edit' ? 2 : 1) ? '<button type="button" class="btn btn-secondary" data-rw-action="back">Quay lại</button>' : ''}
        <button type="button" class="btn btn-primary" data-rw-action="next"${busy ? ' disabled' : ''}>${step === 4 ? (state.mode === 'edit' ? 'Lưu thay đổi' : `Tạo ${state.questions.length} câu hỏi`) : 'Tiếp tục'}</button>
      </div>
    </div>`;
    const refreshSummary = async () => {
        summary = { loading: true };
        paint();
        try {
            const built = await options.buildRubric(buildRubricPayload(state, state.questions[0]));
            summary = { lines: built.summary };
        }
        catch (error) {
            summary = { error: error.message || 'Không dựng được cách chấm.' };
        }
        if (step === 3)
            paint();
    };
    const paint = () => {
        let inner = '';
        if (!catalog)
            inner = '<p class="rw-muted">Đang tải danh sách dạng câu hỏi...</p>';
        else if (step === 1)
            inner = renderStepOne(catalog, state);
        else if (step === 2)
            inner = renderStepTwo(state, options.precedingScript);
        else if (step === 3)
            inner = renderStepThree(state, catalog, summary);
        else
            inner = renderStepFour(state, sandboxHtml);
        modal.innerHTML = frame(inner);
    };
    const close = () => { modal.hidden = true; modal.remove(); window.removeEventListener('keydown', onKey); };
    const onKey = (event) => { if (event.key === 'Escape')
        close(); };
    window.addEventListener('keydown', onKey);
    registerBuilderModalCleanup(modal, close);
    const goTo = async (target) => {
        message = '';
        step = target;
        paint();
        if (step === 3)
            await refreshSummary();
    };
    const finish = async () => {
        busy = true;
        message = '';
        paint();
        try {
            const rubrics = [];
            for (const question of state.questions)
                rubrics.push((await options.buildRubric(buildRubricPayload(state, question))).rubric);
            close();
            options.onComplete({ state, rubrics });
        }
        catch (error) {
            busy = false;
            message = error.message || 'Không tạo được câu hỏi.';
            paint();
        }
    };
    modal.addEventListener('change', event => {
        const target = event.target;
        if (target.name === 'rw-variant' && catalog) {
            readStepInputs();
            Object.assign(state, changeVariant(state, target.value));
            paint();
        }
        else if (target.name === 'rw-level') {
            readStepInputs();
            if (summaryTimer)
                clearTimeout(summaryTimer);
            summaryTimer = setTimeout(refreshSummary, 200);
            modal.querySelectorAll('.rw-level-card').forEach(card => card.classList.toggle('is-selected', card.contains(target)));
        }
    });
    modal.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-rw-action]');
        if (!button)
            return;
        const action = button.getAttribute('data-rw-action');
        const q = Number(button.getAttribute('data-q'));
        const r = Number(button.getAttribute('data-r'));
        if (action === 'close') {
            close();
            return;
        }
        if (action === 'legacy') {
            close();
            options.onLegacy?.();
            return;
        }
        readStepInputs();
        if (action === 'back') {
            await goTo(step - 1);
            return;
        }
        if (action === 'next') {
            const problems = validateWizardStep(state, step);
            if (problems.length) {
                message = problems.join(' ');
                paint();
                return;
            }
            if (step === 4) {
                await finish();
                return;
            }
            await goTo(step + 1);
            return;
        }
        if (action === 'add-question')
            state.questions.push(emptyQuestion(state.variant));
        else if (action === 'remove-question')
            state.questions.splice(q, 1);
        else if (action === 'add-requirement')
            state.questions[q].requirements.push({ label: '', maxScore: '', acceptedForms: '' });
        else if (action === 'remove-requirement')
            state.questions[q].requirements.splice(r, 1);
        else if (action === 'pull-script')
            state.context = options.precedingScript || state.context;
        else if (action === 'split-sentences') {
            const raw = modal.querySelector('[data-rw="sentences"]')?.value || '';
            const made = questionsFromSentences(raw.split(/\r?\n/u));
            if (made.length)
                state.questions = made;
        }
        else if (action === 'sandbox') {
            const problems = validateWizardStep(state, 2);
            if (problems.length || !options.previewSandbox) {
                sandboxHtml = `<p class="rw-error">${escapeHtml(problems[0] || 'Chấm thử chưa được cấu hình.')}</p>`;
                paint();
                return;
            }
            if (!state.sample.trim()) {
                sandboxHtml = '<p class="rw-error">Hãy nhập câu trả lời mẫu trước khi chấm thử.</p>';
                paint();
                return;
            }
            sandboxHtml = '<p class="rw-muted">Đang gửi tới AI Gateway...</p>';
            paint();
            try {
                const rubric = (await options.buildRubric(buildRubricPayload(state, state.questions[0]))).rubric;
                const result = await options.previewSandbox({
                    prompt: state.questions[0].prompt, context: state.context, sampleAnswer: state.sample,
                    interactionType: 'long_text', pedagogicalTypeCode: 'writing', rubric
                });
                const labels = {};
                for (const entry of [...(rubric.requirements || []), ...(rubric.criteria || [])])
                    labels[entry.id] = entry.label;
                sandboxHtml = result?.ok ? renderSandboxResult(result, labels) : `<p class="rw-error">${escapeHtml(result?.message || 'Chấm thử thất bại.')}</p>`;
            }
            catch (error) {
                sandboxHtml = `<p class="rw-error">${escapeHtml(error.message || 'Chấm thử thất bại.')}</p>`;
            }
        }
        paint();
    });
    paint();
    options.loadPresets().then(loaded => { catalog = loaded; paint(); }).catch(error => {
        modal.innerHTML = frame(`<p class="rw-error" role="alert">${escapeHtml(error.message || 'Không tải được danh sách dạng câu hỏi.')}</p>`);
    });
    return modal;
}
