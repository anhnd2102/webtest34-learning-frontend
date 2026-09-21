export const draftKey = form => `izone_content_demo_${form.course}_${form.sourceHash}_v1`;

const optionId = option => typeof option === 'string' ? option : option.id;
export function sanitizeDraft(form, raw) {
  const answers = {};
  for (const item of form.groups.flatMap(group => group.items)) {
    const value = raw?.answers?.[item.id];
    if (typeof value !== 'string' || value.length > 12000) continue;
    if (item.options && !item.options.some(option => optionId(option) === value)) continue;
    answers[item.id] = value;
  }
  return { answers, submittedAt: typeof raw?.submittedAt === 'number' && Number.isFinite(raw.submittedAt) ? raw.submittedAt : null };
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const words = value => String(value || '').trim().split(/\s+/).filter(Boolean).length;

export function resultViewModel(result) {
  const summary = result?.summary || {};
  const gradingStatus = result?.gradingStatus || 'pending';
  const scoreFinal = summary.scoreFinal === true && gradingStatus === 'complete';
  return {
    tone: gradingStatus === 'manual_review' ? 'manual_review' : scoreFinal ? 'complete' : 'pending',
    title: gradingStatus === 'manual_review' ? 'Đang chờ giảng viên kiểm tra' : scoreFinal ? 'Đã chấm xong' : 'AI đang chấm bài',
    scoreFinal,
    pendingItemCount: Number.isInteger(summary.pendingItemCount) ? summary.pendingItemCount : 0,
    scoreLabel: scoreFinal ? 'Điểm chính thức' : 'Điểm tạm tính',
    score: `${summary.scoreEarned ?? 0} / ${summary.maxScore ?? 0}`
  };
}

export function clozeSegments(text, ids, numbered = true) {
  const pattern = numbered ? /\((\d+)\)\s*[_\.\u2026]{2,}/g : /[_\.\u2026]{3,}/g;
  const segments = [];
  const seen = new Set();
  let previous = 0;
  for (const match of text.matchAll(pattern)) {
    const index = numbered ? Number(match[1]) - 1 : seen.size;
    if (!ids[index] || seen.has(ids[index])) return null;
    segments.push(text.slice(previous, match.index), { id: ids[index], number: index + 1 });
    seen.add(ids[index]); previous = match.index + match[0].length;
  }
  if (seen.size !== ids.length || !seen.size) return null;
  segments.push(text.slice(previous));
  return segments;
}

const sectionKey = group => group.id.split('-')[0];
const sectionLabels = { vocabulary: 'Vocabulary', listening: 'Listening', grammar: 'Grammar', pronunciation: 'Pronunciation', translation: 'Translation', writing: 'Writing', speaking: 'Speaking' };
export function choiceLayout(options) {
  const labels=options.map(option=>String(typeof option==='string'?option:option.label).trim());
  const compact=labels.every(label=>label.length<=16&&!/[\r\n]/.test(label));
  const longest=Math.max(0,...labels.map(label=>label.length));
  return { columns: options.length===4 ? (compact?4:2) : options.length===3 ? (longest>60?1:3) : options.length===2 ? (longest>100?1:2) : 1, compact };
}
function answerField(item, inline = false, cards = false) {
  const attributes = `id="${escape(item.id)}" data-demo-answer="${escape(item.id)}" aria-label="${escape(item.prompt)}"`;
  if (item.options && cards) {
    const layout=choiceLayout(item.options);
    return `<input type="hidden" ${attributes}><div class="demo-choice-grid" data-columns="${layout.columns}" data-compact="${layout.compact}" role="radiogroup" aria-label="${escape(item.prompt)}">${item.options.map((option,index)=>`<label class="demo-choice"><input type="radio" name="${escape(item.id)}" data-demo-choice="${escape(item.id)}" value="${escape(optionId(option))}"><span class="demo-choice-letter">${String.fromCharCode(65+index)}</span><span>${escape(typeof option==='string'?option:option.label)}</span></label>`).join('')}</div><button type="button" class="demo-clear-choice" data-demo-clear="${escape(item.id)}" aria-label="Bỏ chọn: ${escape(item.prompt)}">Bỏ chọn</button>`;
  }
  if (item.options) return `<select ${attributes}><option value="">— Chọn đáp án —</option>${item.options.map(option=>`<option value="${escape(optionId(option))}">${escape(typeof option === 'string' ? option : option.label)}</option>`).join('')}</select>`;
  if (item.long) return `<textarea ${attributes} maxlength="12000" rows="4" placeholder="Viết câu trả lời"></textarea>`;
  return `<input type="text" ${attributes} maxlength="12000" autocomplete="off" placeholder="${inline ? 'Điền đáp án' : 'Nhập câu trả lời'}">`;
}
function clozeMarkup(segments, items, numbered = true) {
  return segments.map(segment => typeof segment === 'string' ? escape(segment) : `<span class="demo-question demo-inline">${numbered ? `<span class="demo-blank-number">(${segment.number})</span>` : ''}${answerField(items.find(item => item.id === segment.id), true)}</span>`).join('');
}
export function groupBody(group) {
  if (group.id==='grammar-correction' && group.items.length%2===0) {
    const pairs=[];
    for(let index=0;index<group.items.length;index+=2) {
      const error=group.items[index], correction=group.items[index+1];
      const sentence=error.prompt.replace(/\nLỗi sai\s*$/,'');
      if(correction.prompt.replace(/\nPhần sửa đúng\s*$/,'')!==sentence)break;
      const prefix=sentence.match(/^\s*(\d+)[.)]\s*/);
      pairs.push(`<div class="demo-correction-card"><div class="demo-prompt-row"><span class="qnum">${prefix?prefix[1]:index/2+1}</span><div class="demo-lines">${escape(sentence.replace(/^\s*\d+[.)]\s*/,''))}</div></div><div class="demo-correction-fields"><div class="demo-question"><label for="${escape(error.id)}">Lỗi sai</label>${answerField(error)}</div><div class="demo-question"><label for="${escape(correction.id)}">Phần sửa đúng</label>${answerField(correction)}</div></div></div>`);
    }
    if(pairs.length===group.items.length/2)return `<div class="demo-correction-list">${pairs.join('')}</div>`;
  }
  if (group.id === 'grammar-perfect' && group.context) {
    const lines=group.context.split('\n');
    const firstSentence=lines.findIndex(line=>/^\s*-\s+/.test(line));
    const bank=lines.slice(0,firstSentence).map(line=>line.trim()).filter(Boolean);
    const segments=firstSentence>0 && bank.every(word=>/^[a-z ]+$/i.test(word))
      ? clozeSegments(lines.slice(firstSentence).join('\n'),group.items.map(item=>item.id)) : null;
    if (segments) return `<div class="demo-word-bank" aria-label="Động từ gợi ý"><strong>Động từ gợi ý</strong><div class="demo-word-bank-list">${bank.map(word=>`<span>${escape(word)}</span>`).join('')}</div></div><div class="demo-cloze demo-cloze-sentences">${clozeMarkup(segments,group.items).split('\n').map(sentence=>`<p class="demo-cloze-line">${sentence.replace(/^\s*-\s*/, '')}</p>`).join('')}</div>`;
  }
  const inlineGroups = ['listening-gap', 'listening-notes', 'grammar-present', 'grammar-past', 'grammar-perfect'];
  const numbered = group.context && inlineGroups.includes(group.id) ? clozeSegments(group.context, group.items.map(item => item.id)) : null;
  if (numbered) return `<div class="demo-context demo-lines demo-cloze">${clozeMarkup(numbered, group.items)}</div>`;
  return `${group.context ? `<div class="demo-context demo-lines">${escape(group.context)}</div>` : ''}<div class="${group.id === 'vocabulary-listen' ? 'demo-vocab-grid' : group.id === 'vocabulary-picture' ? 'demo-picture-grid' : ''}">${group.items.map((item,index) => {
    const prefix=item.prompt.match(/^\s*(\d+)[.)]\s*/);
    const number=prefix?prefix[1]:group.id==='vocabulary-listen'?Math.floor(index/2)+1:index+1;
    const prompt=item.prompt.replace(/^\s*\d+[.)]\s*/,'');
    const single = group.id === 'grammar-verb' ? clozeSegments(prompt, [item.id], false) : null;
    if (single) return `<div class="demo-cloze demo-sentence"><span class="qnum">${number}</span> ${clozeMarkup(single, [item], false)}</div>`;
    const cards=['vocabulary-choice','pronunciation-choice','listening-tf'].includes(group.id);
    return `<div class="demo-question${cards?' demo-mcq-question':''}"><div class="demo-prompt-row"><span class="qnum">${number}</span><${cards?'div':'label'} ${cards?'':`for="${escape(item.id)}"`} class="demo-lines">${escape(prompt)}</${cards?'div':'label'}></div>
      ${item.targetWord ? `<p>Thay từ/cụm: <strong>${escape(item.targetWord)}</strong></p>` : ''}
      ${item.image ? `<img src="${escape(item.image)}" alt="Hình minh họa câu ${escape(item.prompt.split('.')[0])}" loading="lazy">` : ''}
      ${answerField(item,false,cards)}${item.long || item.maxWords ? `<small id="${escape(item.id)}-count"></small>` : ''}</div>`;
  }).join('')}</div>`;
}

export async function mount(course) {
  if (!['03','34','45'].includes(course)) throw new Error('Unknown demo course');
  const response = await fetch(new URL(`./demo-content/${course}.json`, import.meta.url));
  if (!response.ok) throw new Error('Content unavailable');
  const form = await response.json();
  const key = draftKey(form);
  let state;
  try { state = sanitizeDraft(form, JSON.parse(localStorage.getItem(key))); }
  catch { state = sanitizeDraft(form, null); }
  const items = form.groups.flatMap(group => group.items);
  const title = `Khóa ${course}${form.phase ? ' · Phase 1' : ''} · Test 1`;
  const sections = [...new Set(form.groups.map(sectionKey))];
  let activeSection = sections[0];
  document.title = `IZONE · Demo · ${title}`;
  document.body.innerHTML = `<div class="content-demo">
    <header class="topbar"><div class="topbar-inner demo-top"><div class="brand"><div class="brand-mark">IZ</div><div class="brand-copy"><div class="brand-title">IZONE · ${escape(title)}</div><div class="brand-sub">Bài thi demo · ${form.durationMinutes} phút theo đề</div></div></div><nav aria-label="Chọn khóa">${['03','34','45'].map(c => `<a ${c===course?'aria-current="page"':''} href="?demoCourse=${c}">Khóa ${c}</a>`).join('')}</nav></div><nav class="section-nav demo-tabs" aria-label="Các phần bài">${sections.map(section=>`<button class="section-tab" data-demo-go="${section}">${sectionLabels[section]} <span class="tab-count" data-demo-tab-count="${section}"></span></button>`).join('')}</nav></header>
    <main class="demo-width"><div class="demo-notice">Bản xem thử để duyệt đề. Câu trả lời chỉ lưu trên trình duyệt này; nộp thử chưa chấm điểm hoặc gửi lên hệ thống.</div>
      <div class="demo-toolbar"><span id="demo-progress" aria-live="polite"></span><span id="demo-save" role="status"></span><button type="button" class="btn btn-primary" id="demo-submit">Nộp thử</button><button type="button" class="btn btn-secondary" id="demo-reset">Xóa bản nháp / làm lại</button></div>
      <div id="demo-result" class="demo-notice" hidden></div>
      <div class="demo-layout"><aside class="side-panel"><div class="panel-card"><strong>Tiến độ làm bài</strong><div class="progress-track"><div class="progress-fill" id="demo-fill"></div></div><nav aria-label="Điều hướng bài thi">${sections.map(section=>`<button class="section-tab" data-demo-go="${section}">${sectionLabels[section]} <span data-demo-section-count="${section}"></span></button>`).join('')}</nav></div><div class="panel-card"><strong>Lưu ý khi làm bài</strong><p class="meta">Câu trả lời được lưu tự động trên trình duyệt. Chuyển phần không mất đáp án. Kiểm tra các ô chưa trả lời trước khi nộp thử.</p></div></aside>
      <div class="demo-main">${form.groups.map(group => `<section data-demo-page="${sectionKey(group)}" id="demo-${escape(group.id)}" class="exercise demo-section"><div class="exercise-head"><div><h2>${escape(group.title)}</h2><p class="demo-lines">${escape(group.instructions)}</p></div><span class="points">${group.items.length} ô trả lời</span></div>
        ${group.notice ? `<p class="demo-notice">${escape(group.notice)}</p>` : ''}
        ${group.audioPath ? `<audio controls preload="none" src="${escape(group.audioPath)}" aria-label="Audio ${escape(group.title)}"></audio>` : group.audioRequired ? '<p class="demo-notice">Chưa có file audio được xác minh cho nhóm này. Hiện có thể duyệt câu đề và ô trả lời.</p>' : ''}
        ${groupBody(group)}</section>`).join('')}<div class="bottom-actions demo-bottom"><button class="btn btn-secondary" id="demo-prev">← Phần trước</button><button class="btn btn-primary" id="demo-next">Phần tiếp →</button></div></div></div>
    </main><dialog id="demo-confirm"><h2>Nộp bài thử?</h2><p id="demo-confirm-text"></p><p>Bạn có thể xem lại câu trả lời. Demo chưa chấm điểm.</p><button type="button" class="btn btn-secondary" id="demo-cancel">Quay lại bài</button> <button type="button" class="btn btn-primary" id="demo-confirm-submit">Xác nhận nộp thử</button></dialog>
  </div>`;
  // Reuse the canonical page's component structure and design tokens.
  const courseNavigation=document.querySelector('.demo-top nav');
  courseNavigation.className='demo-course-switch';
  document.querySelector('main.demo-width').prepend(courseNavigation);
  document.querySelector('.demo-top').insertAdjacentHTML('beforeend',`<div class="top-actions"><button type="button" class="icon-btn" id="demo-font-down" aria-label="Giảm cỡ chữ">A−</button><button type="button" class="icon-btn" id="demo-font-up" aria-label="Tăng cỡ chữ">A+</button><span class="timer" aria-label="Thời lượng theo đề, chưa chạy đếm ngược">${form.durationMinutes}:00</span></div>`);
  document.querySelector('.top-actions').prepend(document.querySelector('#demo-save'));
  for(const section of sections) {
    const groups=form.groups.filter(group=>sectionKey(group)===section);
    document.querySelector(`[data-demo-page="${section}"]`).insertAdjacentHTML('beforebegin',`<div class="section-hero" data-demo-page="${section}"><div class="section-kicker">${escape(title)}</div><h2>${sectionLabels[section]}</h2><p>${groups.length} nhóm bài · ${groups.reduce((count,group)=>count+group.items.length,0)} ô trả lời</p></div>`);
  }
  const style = document.createElement('style');
  style.textContent = `
    .content-demo{color:#404040;background:#f3f4f6;min-height:100vh}.demo-width{max-width:1180px;margin:auto;padding:20px}.demo-top{display:flex;align-items:center;justify-content:space-between;gap:16px}.demo-top nav{display:flex;gap:12px}.content-demo a{color:#174266}.content-demo a[aria-current]{font-weight:700;color:#db0829}.demo-notice{background:#fff4df;border:1px solid #ecd8b1;padding:12px 16px;border-radius:10px;margin:12px 0}.demo-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:20px 0}.content-demo button{padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:white}.content-demo #demo-submit,.content-demo #demo-confirm-submit{background:#db0829;color:white;border-color:#db0829}.demo-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:24px}.demo-layout aside nav{position:sticky;top:100px;display:grid;gap:12px;background:white;padding:16px;border-radius:12px}.demo-section{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:24px;margin-bottom:24px;scroll-margin-top:110px}.demo-section h2{margin-top:0;color:#174266;font-size:22px}.demo-lines{white-space:pre-wrap}.demo-context{background:#f3f4f6;padding:16px;border-radius:10px;margin:16px 0}.demo-question{padding:16px 0;border-top:1px solid #eee}.demo-question label{display:block;margin-bottom:10px;font-weight:500}.demo-question img{display:block;max-width:220px;max-height:180px;object-fit:contain;margin:12px 0}.demo-question input,.demo-question textarea,.demo-question select{display:block;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;color:#404040;background:white}.demo-question input:focus,.demo-question textarea:focus,.demo-question select:focus{outline:2px solid #174266;outline-offset:2px}.demo-question small{display:block;margin-top:6px;color:#62576a}.demo-question.done{border-left:3px solid #238563;padding-left:12px}.content-demo dialog{max-width:480px;border:0;border-radius:16px;padding:24px}.content-demo dialog::backdrop{background:#0006}@media(max-width:760px){.demo-layout{grid-template-columns:1fr}.demo-layout aside nav{position:static;display:flex;overflow:auto;white-space:nowrap}.demo-top{flex-direction:column;align-items:flex-start}.demo-section{padding:16px}.demo-width{padding:12px}}`;
  document.head.append(style);
  const layoutStyle = document.createElement('style');
  layoutStyle.textContent = `
    .content-demo .demo-tabs{display:flex;gap:8px;max-width:1180px;margin:auto;overflow-x:auto;padding:8px 24px}
    .content-demo .demo-layout{grid-template-columns:minmax(0,1fr) 280px;gap:24px}
    .content-demo .demo-main{grid-column:1;grid-row:1;min-width:0}
    .content-demo .demo-layout aside{grid-column:2;grid-row:1;top:140px}
    .content-demo .demo-layout aside nav{position:static;padding:0;margin-top:16px;background:transparent;gap:4px}
    .content-demo .demo-layout aside .section-tab{justify-content:space-between;text-align:left}
    .content-demo .demo-section{box-shadow:var(--shadow-1);border-color:var(--color-border);border-radius:var(--radius-lg)}
    .content-demo .demo-section h2{font-family:Geologica,sans-serif;color:var(--color-text);font-size:19px;margin-bottom:0}
    .content-demo .demo-section .points{white-space:nowrap}
    .content-demo .demo-section[hidden]{display:none}
    .content-demo .demo-context{background:#fafbfc;border:1px solid #e9ebee}
    .content-demo .demo-question input:focus,.content-demo .demo-question select:focus,.content-demo .demo-question textarea:focus{outline:2px solid var(--color-primary)}
    .content-demo .demo-cloze{line-height:3;white-space:pre-wrap;overflow-wrap:anywhere}
    .content-demo .demo-sentence{padding:12px 0;border-bottom:1px solid var(--color-border)}
    .content-demo .demo-inline{display:inline-flex;align-items:center;vertical-align:middle;gap:6px;padding:0 4px;border:0;white-space:normal}
    .content-demo .demo-inline input{display:inline-block;width:clamp(110px,16vw,170px);padding:7px 10px;line-height:1.5}
    .content-demo .demo-inline.done{border:0;padding-left:4px}
    .content-demo .demo-inline.done input{border-color:#238563}
    .content-demo .demo-blank-number{font-size:12px;color:var(--color-text-secondary)}
    .content-demo .demo-vocab-grid,.content-demo .demo-picture-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}
    .content-demo .demo-bottom{display:flex;justify-content:space-between;gap:12px;margin-top:20px}
    .content-demo button.section-tab{border:0;background:transparent;padding:10px 12px}
    .content-demo button.section-tab.active{background:#fff3f5;color:var(--color-primary)}
    .content-demo .progress-track{margin-top:12px}
    @media(max-width:900px){.content-demo .demo-layout{grid-template-columns:1fr}.content-demo .demo-layout aside{display:none}.content-demo .demo-main{grid-column:1}}
    @media(max-width:600px){.content-demo .demo-picture-grid{grid-template-columns:1fr}.content-demo .demo-vocab-grid{gap:0 10px}.content-demo .demo-question{min-width:0}.content-demo .demo-question input,.content-demo .demo-question select{min-width:0}.content-demo .demo-inline input{width:120px}.content-demo .demo-tabs{padding:8px 12px}.content-demo .exercise-head{gap:8px}.content-demo .demo-cloze{line-height:3.2}.content-demo .demo-top nav{flex-shrink:0}}
  `;
  document.head.append(layoutStyle);
  const choiceStyle=document.createElement('style');
  choiceStyle.textContent=`.content-demo .demo-prompt-row{display:flex;align-items:flex-start;gap:12px;margin-bottom:12px}.content-demo .demo-prompt-row .qnum{flex-shrink:0}.content-demo .demo-prompt-row label{margin:4px 0 0}.content-demo .demo-mcq-question{border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin:12px 0}.content-demo .demo-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.content-demo label.demo-choice{display:flex;align-items:center;gap:10px;border:1px solid #dce1e8;border-radius:12px;padding:14px;cursor:pointer;font-weight:400;margin:0;position:relative;overflow-wrap:anywhere}.content-demo .demo-choice-letter{font-weight:700}.content-demo .demo-choice input[type=radio]{position:absolute;opacity:0;width:1px;height:1px;padding:0}.content-demo .demo-choice:has(input:checked){border-color:var(--color-primary);background:#fff3f5}.content-demo .demo-choice:has(input:focus-visible){outline:2px solid var(--color-primary);outline-offset:2px}.content-demo .demo-choice:has(input:disabled){cursor:default}.content-demo input[type=hidden]{display:none}@media(max-width:600px){.content-demo .demo-choice-grid{grid-template-columns:1fr}.content-demo .demo-mcq-question{padding:14px}}`;
  document.head.append(choiceStyle);
  const adaptiveChoiceStyle=document.createElement('style');
  adaptiveChoiceStyle.textContent=`
    .content-demo .demo-mcq-question{container-type:inline-size}
    .content-demo .demo-choice-grid[data-columns="1"]{grid-template-columns:1fr}
    .content-demo .demo-choice-grid[data-columns="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}
    .content-demo .demo-choice-grid[data-columns="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
    .content-demo .demo-choice-grid[data-columns="4"]{grid-template-columns:repeat(4,minmax(0,1fr))}
    .content-demo label.demo-choice{min-height:56px;align-items:flex-start;transition:border-color .15s,background-color .15s;line-height:1.6}
    .content-demo .demo-choice-letter{flex-shrink:0;color:var(--color-navy)}
    .content-demo .demo-choice>span:last-child{min-width:0;overflow-wrap:break-word}
    .content-demo .demo-choice:has(input:not(:disabled)):hover{border-color:var(--color-primary);background:#fff8f9}
    .content-demo .demo-choice:has(input:checked) .demo-choice-letter{color:var(--color-primary)}
    .content-demo button.demo-clear-choice{margin-top:8px;min-height:44px;padding:8px 12px;border:0;background:transparent;color:var(--color-text-secondary);text-decoration:underline;text-underline-offset:3px}
    .content-demo button.demo-clear-choice:not(:disabled):hover{color:var(--color-primary);background:#fff3f5}
    .content-demo button.demo-clear-choice:disabled{opacity:.45;cursor:default}
    .content-demo button.demo-clear-choice:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
    @container(max-width:520px){.content-demo .demo-choice-grid[data-columns="4"]{grid-template-columns:repeat(2,minmax(0,1fr))}.content-demo .demo-choice-grid[data-columns="3"]{grid-template-columns:1fr}}
    @container(max-width:360px){.content-demo .demo-choice-grid[data-compact="false"]{grid-template-columns:1fr}}
    @media(max-width:600px){.content-demo .demo-choice-grid[data-columns="4"]{grid-template-columns:repeat(2,minmax(0,1fr))}.content-demo .demo-choice-grid[data-compact="false"],.content-demo .demo-choice-grid[data-columns="3"]{grid-template-columns:1fr}}
  `;
  document.head.append(adaptiveChoiceStyle);
  const wordBankStyle=document.createElement('style');
  wordBankStyle.textContent=`.content-demo .demo-word-bank{background:#fafbfc;border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:16px 0}.content-demo .demo-word-bank strong{display:block;font-size:13px;color:var(--color-text-secondary);margin-bottom:10px}.content-demo .demo-word-bank-list{display:flex;flex-wrap:wrap;gap:8px}.content-demo .demo-word-bank-list span{background:white;border:1px solid #dce1e8;border-radius:8px;padding:5px 14px;line-height:1.5;color:var(--color-navy)}.content-demo .demo-cloze-sentences{white-space:normal}.content-demo .demo-cloze-line{margin:0;padding:12px 0;border-bottom:1px solid #eee;line-height:2.5}.content-demo .demo-cloze-line:last-child{border-bottom:0}@media(max-width:600px){.content-demo .demo-word-bank{padding:12px}.content-demo .demo-word-bank-list span{padding:5px 10px}}`;
  document.head.append(wordBankStyle);
  const correctionStyle=document.createElement('style');
  correctionStyle.textContent=`.content-demo .demo-correction-card{border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin:14px 0;background:white}.content-demo .demo-correction-card .demo-prompt-row{align-items:center;margin-bottom:16px;font-weight:500}.content-demo .demo-correction-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}.content-demo .demo-correction-fields .demo-question{padding:0;border-top:0;min-width:0}.content-demo .demo-correction-fields label{font-size:13px;color:var(--color-text-secondary);margin-bottom:8px}.content-demo .demo-correction-fields .demo-question.done{border-left:0;padding-left:0}.content-demo .demo-correction-fields .demo-question.done input{border-color:#238563}@media(max-width:600px){.content-demo .demo-correction-fields{grid-template-columns:1fr;gap:14px}.content-demo .demo-correction-card{padding:14px}}`;
  document.head.append(correctionStyle);
  const canonicalStyle=document.createElement('style');
  canonicalStyle.textContent=`
    .content-demo button.btn{min-height:44px;border-radius:10px;padding:0 18px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:8px}
    .content-demo button.btn-primary{background:var(--color-primary);color:white;border-color:var(--color-primary);box-shadow:0 8px 20px rgba(219,8,41,.14)}
    .content-demo button.btn-primary:not(:disabled):hover{background:var(--color-secondary);border-color:var(--color-secondary)}
    .content-demo button.btn-secondary{background:white;color:var(--color-text);border-color:#e5e7eb}
    .content-demo button.btn-secondary:not(:disabled):hover{border-color:#d5d9df;background:#fafafa}
    .content-demo button:disabled{cursor:default;opacity:.55}
    .content-demo .demo-course-switch{display:flex;justify-content:flex-end;gap:16px;padding:8px 0;font-size:13px}
    .content-demo .demo-section{margin-bottom:18px;padding:24px}
    .content-demo .demo-section h2{font-size:22px;font-weight:400}
    .content-demo .demo-layout aside nav{display:grid;gap:8px}
    .content-demo .demo-question textarea{border-radius:12px;min-height:140px;resize:vertical;line-height:1.6}
    .content-demo .demo-picture-grid .demo-question{border:1px solid #e9ebee;border-radius:12px;padding:14px;margin-bottom:12px}
    .content-demo .demo-picture-grid .demo-question img{max-width:140px;max-height:120px;margin:12px auto}
    .content-demo .demo-top .top-actions{display:flex;align-items:center;gap:8px}
    .content-demo .demo-top .icon-btn{width:40px;height:40px;padding:0;border-radius:10px}
    .content-demo #demo-save{font-size:12px;color:var(--color-text-secondary);max-width:180px}
    .content-demo [data-demo-page][hidden]{display:none}
    @media(max-width:760px){.content-demo .demo-top{flex-direction:row;flex-wrap:wrap}.content-demo .demo-top .top-actions{margin-left:auto}.content-demo #demo-save{display:none}.content-demo .demo-section{padding:18px}.content-demo .timer{min-width:80px}.content-demo .section-hero{padding:20px}}
  `;
  document.head.append(canonicalStyle);
  let fontScale=1;
  const resizeFont=delta=>{fontScale=Math.max(.85,Math.min(1.3,fontScale+delta));document.documentElement.style.setProperty('--font-scale',fontScale);};
  document.querySelector('#demo-font-down').addEventListener('click',()=>resizeFont(-.05));
  document.querySelector('#demo-font-up').addEventListener('click',()=>resizeFont(.05));
  const query = selector => document.querySelector(selector);
  const fields = [...document.querySelectorAll('[data-demo-answer]')];
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(state)); query('#demo-save').textContent='Đã lưu trên trình duyệt'; }
    catch { query('#demo-save').textContent='Không lưu được bản nháp. Giữ trang mở để bảo toàn câu trả lời.'; }
  }
  function update() {
    const done = items.filter(item=>String(state.answers[item.id]||'').trim()).length;
    query('#demo-progress').textContent=`${done}/${items.length} ô đã trả lời`;
    query('#demo-fill').style.width=`${Math.round(done/items.length*100)}%`;
    for (const section of sections) {
      const sectionItems=form.groups.filter(group=>sectionKey(group)===section).flatMap(group=>group.items);
      const answered=sectionItems.filter(item=>String(state.answers[item.id]||'').trim()).length;
      document.querySelectorAll(`[data-demo-section-count="${section}"], [data-demo-tab-count="${section}"]`).forEach(count=>count.textContent=`${answered}/${sectionItems.length}`);
    }
    for (const item of items) {
      const field = document.getElementById(item.id);
      field.disabled=Boolean(state.submittedAt);
      field.closest('.demo-question').classList.toggle('done',Boolean(String(state.answers[item.id]||'').trim()));
      const count = document.getElementById(`${item.id}-count`);
      if (count) count.textContent = `${words(state.answers[item.id])} từ${item.minWords ? ` · tối thiểu ${item.minWords}` : item.maxWords ? ` · tối đa ${item.maxWords} từ (hoặc số theo đề)` : ''}`;
    }
    query('#demo-submit').disabled=Boolean(state.submittedAt);
    document.querySelectorAll('[data-demo-choice]').forEach(radio=>{
      radio.checked=state.answers[radio.dataset.demoChoice]===radio.value;
      radio.disabled=Boolean(state.submittedAt);
    });
    document.querySelectorAll('[data-demo-clear]').forEach(button=>{
      button.disabled=Boolean(state.submittedAt)||!state.answers[button.dataset.demoClear];
    });
    query('#demo-result').hidden=!state.submittedAt;
    query('#demo-result').textContent=state.submittedAt ? `Đã nộp thử lúc ${new Date(state.submittedAt).toLocaleString('vi-VN')}. Câu trả lời bên dưới được giữ để xem lại; chưa có điểm chấm.` : '';
  }
  for (const field of fields) {
    field.value=state.answers[field.dataset.demoAnswer]||'';
    field.addEventListener(field.tagName==='SELECT'?'change':'input',()=>{
      if (state.submittedAt) return;
      state.answers[field.dataset.demoAnswer]=field.value; persist(); update();
    });
  }
  document.querySelectorAll('[data-demo-choice]').forEach(radio=>radio.addEventListener('change',()=>{
    if(state.submittedAt||!radio.checked)return;
    const field=document.getElementById(radio.dataset.demoChoice);
    field.value=radio.value;field.dispatchEvent(new Event('input',{bubbles:true}));
  }));
  document.querySelectorAll('[data-demo-clear]').forEach(button=>button.addEventListener('click',()=>{
    if(state.submittedAt)return;
    const field=document.getElementById(button.dataset.demoClear);
    field.value='';field.dispatchEvent(new Event('input',{bubbles:true}));
  }));
  query('#demo-submit').addEventListener('click',()=>{
    const missing=items.filter(item=>!String(state.answers[item.id]||'').trim()).length;
    query('#demo-confirm-text').textContent=`Còn ${missing} ô chưa trả lời. Bạn vẫn có thể nộp thử để duyệt giao diện.`;
    query('#demo-confirm').showModal();
  });
  query('#demo-cancel').addEventListener('click',()=>query('#demo-confirm').close());
  query('#demo-confirm-submit').addEventListener('click',()=>{
    state.submittedAt=Date.now(); persist(); update(); query('#demo-confirm').close(); window.scrollTo({top:0,behavior:'smooth'});
  });
  query('#demo-reset').addEventListener('click',()=>{
    if (!confirm('Xóa câu trả lời demo của khóa này và làm lại?')) return;
    state=sanitizeDraft(form,null); fields.forEach(field=>field.value=''); persist(); update();
  });
  function showSection(section) {
    activeSection=section;
    document.querySelectorAll('[data-demo-page]').forEach(page=>page.hidden=page.dataset.demoPage!==section);
    document.querySelectorAll('[data-demo-go]').forEach(button=>{
      button.classList.toggle('active',button.dataset.demoGo===section);
      if (button.dataset.demoGo===section) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    query('#demo-prev').disabled=sections.indexOf(section)===0;
    query('#demo-next').textContent=sections.indexOf(section)===sections.length-1?'Nộp thử':'Phần tiếp →';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('[data-demo-go]').forEach(button=>button.addEventListener('click',()=>showSection(button.dataset.demoGo)));
  query('#demo-prev').addEventListener('click',()=>{
    const previous=sections[sections.indexOf(activeSection)-1];if(previous)showSection(previous);
  });
  query('#demo-next').addEventListener('click',()=>{
    const next=sections[sections.indexOf(activeSection)+1];if(next)showSection(next);else query('#demo-submit').click();
  });
  update();
  showSection(activeSection);
}
