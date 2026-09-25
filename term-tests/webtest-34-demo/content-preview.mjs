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

export function learningRequestMethod(path) {
  return path === '/attempts/draft' ? 'PATCH' : 'POST';
}

export function resetLocalAttemptState(state) {
  state.answers = {};
  state.submittedAt = null;
}

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

export function resultDetailsHtml(result, definition) {
  const itemsById = new Map((result?.items || []).map(item => [item.itemVersionId, item]));
  const verdictLabel = verdict => ({ correct: 'Đúng', incorrect: 'Sai', partial: 'Một phần', pending: 'Đang chấm', manual_review: 'Chờ duyệt' }[verdict] || verdict || 'Chưa chấm');
  return (definition?.blocks || []).map(block => {
    const items = (block.items || []).map(item => itemsById.get(item.itemVersionId)).filter(Boolean);
    if (!items.length) return '';
    const score = Number(items.reduce((sum, item) => sum + (Number(item.scoreEarned) || 0), 0).toFixed(2));
    const maxScore = Number(items.reduce((sum, item) => sum + (Number(item.maxScore) || 0), 0).toFixed(2));
    const correct = items.filter(item => item.verdict === 'correct').length;
    const details = items.map(item => {
      const tone = item.verdict === 'correct' ? 'correct' : item.verdict === 'incorrect' ? 'incorrect' : item.verdict === 'partial' ? 'partial' : 'pending';
      const errors = (item.feedback?.errors || []).map(error => `<li>${escape(error.message || error.code || '')}</li>`).join('');
      const feedback = errors ? `<div class="learning-result-feedback"><strong>Nhận xét</strong><ul>${errors}</ul></div>` : '';
      return `<div class="learning-result-item"><span class="learning-result-verdict ${tone}">${escape(verdictLabel(item.verdict))}</span><div><strong>Câu ${escape(item.position)}</strong><div class="learning-result-answer">${escape(item.rawAnswer || 'Chưa trả lời')}</div>${feedback}</div></div>`;
    }).join('');
    return `<article class="learning-result-section"><div class="learning-result-section-header"><h3>${escape(block.title)}</h3><div class="learning-result-section-actions"><div class="learning-result-section-summary"><div class="learning-result-score">${score} / ${maxScore} điểm</div><div class="meta">${correct}/${items.length} câu đúng</div></div><button class="result-details-toggle" type="button" data-result-details="result-${escape(block.blockId)}" aria-expanded="false">Xem chi tiết</button></div></div><div class="learning-result-exercise" id="result-${escape(block.blockId)}" hidden><div class="learning-result-items">${details}</div></div></article>`;
  }).join('');
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

export function groupSections(form) {
  const audioGates = new Map();
  for (const group of form.groups) {
    if (group.audioPath && !audioGates.has(group.audioPath)) {
      audioGates.set(group.audioPath, `audio-gate-${audioGates.size + 1}`);
    }
  }
  const renderedAudio = new Set();
  return form.groups.map(group => {
    const gateId = group.audioPath ? audioGates.get(group.audioPath) : '';
    const ownsAudio = gateId && !renderedAudio.has(gateId);
    if (ownsAudio) renderedAudio.add(gateId);
    const audioControl = ownsAudio
      ? `<div class="demo-audio-gate" data-demo-audio-gate="${escape(gateId)}"><button type="button" class="btn btn-primary demo-audio-start" data-demo-audio-start="${escape(gateId)}">▶ Bắt đầu phát audio</button><audio preload="metadata" src="${escape(group.audioPath)}" data-demo-audio-player="${escape(gateId)}"></audio><span class="demo-audio-status" data-demo-audio-status="${escape(gateId)}">Nội dung bài nghe đang được khóa.</span></div>`
      : gateId
        ? `<p class="demo-notice demo-audio-linked">Nhóm này sẽ mở khi audio ở phần trên bắt đầu phát.</p>`
        : group.audioRequired
          ? '<p class="demo-notice">Chưa có audio cho nhóm này nên nội dung đang được khóa.</p>'
          : '';
    const hidden = gateId || group.audioRequired ? ' hidden' : '';
    return `<section data-demo-page="${sectionKey(group)}" id="demo-${escape(group.id)}" class="exercise demo-section"><div class="exercise-head"><div><h2>${escape(group.title)}</h2><p class="demo-lines">${escape(group.instructions)}</p></div><span class="points">${group.items.length} ô trả lời</span></div>
      ${group.notice ? `<p class="demo-notice">${escape(group.notice)}</p>` : ''}
      ${audioControl}
      <div data-demo-audio-content="${escape(gateId)}"${hidden}>${groupBody(group)}</div></section>`;
  }).join('');
}

export async function mount(course) {
  if (!['03','34','45'].includes(course)) throw new Error('Unknown demo course');
  const config = window.WEBTEST_34_PREVIEW_CONFIG || {};
  const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
  const queryParams = new URLSearchParams(location.search || '');
  const testToken = hashParams.get('test') || queryParams.get('test') || config.LEARNING_TEST_TOKEN || '';

  let testNum = Number(queryParams.get('testNum')) || 1;
  const tokenMatch = testToken.match(/-0*([1-9]\d*)$/);
  if (tokenMatch) {
    testNum = Number(tokenMatch[1]);
  }

  let formUrl = new URL(`./demo-content/${course}-test-${testNum}.json`, import.meta.url);
  let response = await fetch(formUrl);
  if (!response.ok) {
    formUrl = new URL(`./demo-content/${course}.json`, import.meta.url);
    response = await fetch(formUrl);
  }
  if (!response.ok) throw new Error('Content unavailable');
  const form = await response.json();
  const key = draftKey(form);
  let state;
  try { state = sanitizeDraft(form, JSON.parse(localStorage.getItem(key))); }
  catch { state = sanitizeDraft(form, null); }
  const items = form.groups.flatMap(group => group.items);
  const title = `Khóa ${course}${form.phase ? ' · Phase 1' : ''} · Test ${form.testNumber || testNum}`;
  const sections = [...new Set(form.groups.map(sectionKey))];
  let activeSection = sections[0];

  const isProd = queryParams.get('prod') === '1' || queryParams.get('apiEnv') === 'production';
  const apiBase = (isProd ? 'https://webtest.ducanhn.autos' : (config.LEARNING_API_BASE_URL || config.API_BASE_URL || 'https://webtest.ducanhn.autos')).replace(/\/$/, '');
  const isLearningMode = Boolean(testToken);

  let learningState = {
    testToken,
    courseCode: `TEST-${course}`,
    className: '',
    studentRef: '',
    studentName: '',
    assignment: null,
    definition: null,
    attemptToken: '',
    definitionHash: '',
    draftRevision: 0,
    status: '',
    expiresAt: null,
    result: null,
    pollTimer: null
  };

  async function apiRequest(path, body) {
    const res = await fetch(`${apiBase}/api/learning${path}`, {
      method: learningRequestMethod(path),
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw Object.assign(new Error(data.message || `Lỗi HTTP ${res.status}`), {
        code: data.error,
        status: res.status
      });
    }
    return data;
  }

  function createUuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2).padStart(12, '0');
  }

  function buildResponsesPayload() {
    const defItems = (learningState.definition?.blocks || []).flatMap(b => b.items || []);
    const formItems = form.groups.flatMap(g => g.items || []);
    const responses = {};
    if (defItems.length && defItems.length === formItems.length) {
      for (let i = 0; i < defItems.length; i++) {
        const val = state.answers[formItems[i].id];
        responses[defItems[i].itemVersionId] = typeof val === 'string' ? val : (val ?? '');
      }
    } else {
      for (const item of formItems) {
        responses[item.id] = state.answers[item.id] || '';
      }
    }
    return responses;
  }

  function applyServerDraft(serverDraft) {
    if (!serverDraft || typeof serverDraft !== 'object') return;
    const defItems = (learningState.definition?.blocks || []).flatMap(b => b.items || []);
    const formItems = form.groups.flatMap(g => g.items || []);
    if (defItems.length && defItems.length === formItems.length) {
      for (let i = 0; i < defItems.length; i++) {
        const itemVerId = defItems[i].itemVersionId;
        if (serverDraft[itemVerId] !== undefined) {
          state.answers[formItems[i].id] = serverDraft[itemVerId];
        }
      }
    }
  }

  // --- RENDER MÀN HÌNH ĐỊNH DANH (IDENTITY SCREEN) KHI CÓ TEST TOKEN ---
  if (isLearningMode) {
    document.title = `IZONE · Thi CBT · ${title}`;
    document.body.innerHTML = `
      <div class="content-demo">
        <header class="topbar">
          <div class="topbar-inner demo-top">
            <div class="brand">
              <div class="brand-mark">IZ</div>
              <div class="brand-copy">
                <div class="brand-title">IZONE · COMPUTER-BASED TEST</div>
                <div class="brand-sub">${escape(title)}</div>
              </div>
            </div>
            <div class="top-actions">
              <span class="timer">${form.durationMinutes}:00</span>
            </div>
          </div>
        </header>
        <main class="demo-width" style="max-width:680px;margin:36px auto;padding:16px">
          <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,0.04)">
            <div style="font-size:12px;font-weight:700;color:#db0829;letter-spacing:1px;margin-bottom:8px">IZONE · COMPUTER-BASED TEST</div>
            <h1 style="font-size:24px;color:#174266;margin:0 0 12px 0">${escape(title)}</h1>
            <p style="color:#64748b;font-size:14px;line-height:1.5;margin-bottom:24px">
              Thời gian làm bài: <strong>${form.durationMinutes} phút</strong> · Tổng số câu hỏi: <strong>${items.length} câu</strong>.<br>
              Vui lòng nhập <strong>Mã lớp</strong> và chọn <strong>Họ tên của bạn</strong> để bắt đầu làm bài.
            </p>

            <div style="margin-bottom:20px">
              <label for="classCodeInput" style="display:block;font-weight:600;margin-bottom:8px;color:#1e293b">Mã lớp</label>
              <div style="display:flex;gap:10px">
                <input id="classCodeInput" value="TEST-${course}" placeholder="Ví dụ: TEST-${course}" autocomplete="off" style="flex:1;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px;font-weight:600">
                <button type="button" class="btn btn-secondary" id="loadRosterBtn" style="min-width:140px;font-weight:600">Tải danh sách</button>
              </div>
              <div id="classCodeStatus" style="font-size:13px;margin-top:6px;color:#64748b">Nhập đúng mã lớp do giáo viên cung cấp, sau đó bấm “Tải danh sách”.</div>
            </div>

            <div style="margin-bottom:28px">
              <label for="studentSelectInput" style="display:block;font-weight:600;margin-bottom:8px;color:#1e293b">Họ và tên học viên</label>
              <select id="studentSelectInput" disabled style="width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px;background:#f8fafc">
                <option value="">— Hãy tải danh sách lớp trước —</option>
              </select>
              <div id="studentSelectStatus" style="font-size:13px;margin-top:6px;color:#64748b">Chọn đúng tên của bạn trong danh sách lớp. Tên sẽ được khóa khi nộp bài.</div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f1f5f9;padding-top:20px">
              <a href="?demoCourse=${course}" style="color:#64748b;font-size:13px;text-decoration:underline">Chuyển sang chế độ duyệt nhanh đề</a>
              <button type="button" class="btn btn-primary" id="startExamBtn" disabled style="min-height:46px;padding:0 24px;font-size:15px;font-weight:700">Bắt đầu làm bài →</button>
            </div>
          </div>
        </main>
      </div>
    `;

    const canonicalStyle = document.createElement('style');
    canonicalStyle.textContent = `
      .content-demo{color:#404040;background:#f3f4f6;min-height:100vh;font-family:Inter,system-ui,-apple-system,sans-serif}
      .demo-top{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:white;border-bottom:1px solid #e5e7eb}
      .brand{display:flex;align-items:center;gap:12px}
      .brand-mark{width:36px;height:36px;background:#db0829;color:white;font-weight:900;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:16px}
      .brand-title{font-weight:700;font-size:15px;color:#174266}
      .brand-sub{font-size:12px;color:#64748b}
      .timer{font-weight:700;font-size:16px;background:#fff1f2;color:#db0829;padding:6px 12px;border-radius:8px;border:1px solid #ffe4e6}
      button.btn{min-height:44px;border-radius:8px;padding:0 18px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid transparent;transition:all .15s}
      button.btn-primary{background:#db0829;color:white}
      button.btn-primary:not(:disabled):hover{background:#b90622}
      button.btn-secondary{background:white;color:#334155;border-color:#cbd5e1}
      button.btn-secondary:not(:disabled):hover{background:#f8fafc;border-color:#94a3b8}
      button:disabled{opacity:.5;cursor:not-allowed}
    `;
    document.head.append(canonicalStyle);

    const classInput = document.querySelector('#classCodeInput');
    const loadBtn = document.querySelector('#loadRosterBtn');
    const classStatus = document.querySelector('#classCodeStatus');
    const studentSelect = document.querySelector('#studentSelectInput');
    const studentStatus = document.querySelector('#studentSelectStatus');
    const startBtn = document.querySelector('#startExamBtn');

    async function handleLoadRoster() {
      const code = classInput.value.trim().toUpperCase();
      if (!code) {
        classStatus.textContent = 'Vui lòng nhập mã lớp.';
        classStatus.style.color = '#db0829';
        return;
      }
      loadBtn.disabled = true;
      loadBtn.textContent = 'Đang tải…';
      classStatus.textContent = 'Đang kiểm tra mã lớp…';
      classStatus.style.color = '#64748b';
      studentSelect.disabled = true;
      studentSelect.innerHTML = '<option value="">— Đang tải danh sách —</option>';

      try {
        const res = await apiRequest('/test-access/resolve', {
          testToken,
          courseCode: code
        });
        const assignment = res.assignment;
        if (!assignment || !assignment.roster || !assignment.roster.length) {
          throw new Error('Không tìm thấy học viên nào trong lớp này.');
        }
        learningState.assignment = assignment;
        learningState.definition = assignment.definition;
        learningState.courseCode = code;
        learningState.className = assignment.class?.name || code;

        studentSelect.innerHTML = '<option value="">— Chọn tên của bạn —</option>' + assignment.roster.map(s => {
          const disc = s.discriminator ? ` · ${s.discriminator}` : '';
          return `<option value="${escape(s.studentRef)}">${escape(s.name + disc)}</option>`;
        }).join('');
        studentSelect.disabled = false;
        studentSelect.style.background = 'white';
        classInput.disabled = true;
        loadBtn.textContent = 'Đã tải';
        classStatus.textContent = `Lớp ${escape(learningState.className)} · ${assignment.roster.length} học viên.`;
        classStatus.style.color = '#16a34a';
        studentStatus.textContent = 'Hãy chọn tên của bạn trong danh sách trên.';
      } catch (err) {
        loadBtn.disabled = false;
        loadBtn.textContent = 'Thử lại';
        classStatus.textContent = `Không tải được danh sách: ${err.message}`;
        classStatus.style.color = '#db0829';
        studentSelect.innerHTML = '<option value="">— Vui lòng tải lại —</option>';
      }
    }

    loadBtn.addEventListener('click', handleLoadRoster);
    classInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleLoadRoster(); } });

    studentSelect.addEventListener('change', () => {
      const ref = studentSelect.value;
      if (ref) {
        const student = learningState.assignment?.roster?.find(s => s.studentRef === ref);
        learningState.studentRef = ref;
        learningState.studentName = student?.name || '';
        startBtn.disabled = false;
        studentStatus.textContent = `Đã chọn: ${escape(learningState.studentName)}.`;
        studentStatus.style.color = '#16a34a';
      } else {
        startBtn.disabled = true;
        studentStatus.textContent = 'Chọn đúng tên của bạn trong danh sách lớp.';
        studentStatus.style.color = '#64748b';
      }
    });

    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      startBtn.textContent = 'Đang mở đề thi…';
      try {
        const startRes = await apiRequest('/attempts/start', {
          testToken,
          courseCode: learningState.courseCode,
          studentRef: learningState.studentRef,
          identityConfirmed: true,
          clientIdempotencyKey: createUuid()
        });
        learningState.attemptToken = startRes.attempt.attemptToken;
        learningState.definitionHash = startRes.attempt.definitionHash;
        learningState.draftRevision = startRes.attempt.draftRevision || 0;
        learningState.status = startRes.attempt.status || 'active';
        learningState.expiresAt = startRes.attempt.expiresAt ? Date.parse(startRes.attempt.expiresAt) : null;
        resetLocalAttemptState(state);
        if (startRes.attempt.draft) {
          applyServerDraft(startRes.attempt.draft);
        }
        if (startRes.attempt.status === 'submitted') {
          state.submittedAt = state.submittedAt || Date.now();
        }
        renderExamInterface();
      } catch (err) {
        startBtn.disabled = false;
        startBtn.textContent = 'Bắt đầu làm bài →';
        alert(`Không mở được phiên làm bài: ${err.message}`);
      }
    });

    void handleLoadRoster();
    return;
  }

  // --- RENDER GIAO DIỆN BÀI THI CHÍNH THỨC / PREVIEW ---
  renderExamInterface();

  function renderExamInterface() {
    document.title = `IZONE · ${isLearningMode ? 'Thi CBT' : 'Demo'} · ${title}`;
    const headerSub = isLearningMode
      ? `Thí sinh: <strong>${escape(learningState.studentName)}</strong> · Lớp: <strong>${escape(learningState.className)}</strong>`
      : `Bài thi demo · ${form.durationMinutes} phút theo đề`;

    const noticeBanner = isLearningMode
      ? `<div class="demo-notice" style="background:#f0fdf4;border-color:#bbf7d0;color:#166534">
          <strong>Phiên thi chính thức:</strong> Câu trả lời được tự động lưu lên máy chủ. Sau khi hoàn thành, hãy bấm <strong>Nộp bài</strong> để hệ thống và AI chấm điểm.
        </div>`
      : `<div class="demo-notice">
          Bản xem thử để duyệt đề. Câu trả lời chỉ lưu trên trình duyệt này; nộp thử chưa chấm điểm hoặc gửi lên hệ thống.
          Dùng link thi có token do người phụ trách cung cấp để mở phiên chấm điểm.
        </div>`;

    document.body.innerHTML = `<div class="content-demo">
      <header class="topbar"><div class="topbar-inner demo-top"><div class="brand"><div class="brand-mark">IZ</div><div class="brand-copy"><div class="brand-title">IZONE · ${escape(title)}</div><div class="brand-sub">${headerSub}</div></div></div></div><nav class="section-nav demo-tabs" aria-label="Các phần bài">${sections.map(section=>`<button class="section-tab" data-demo-go="${section}">${sectionLabels[section]} <span class="tab-count" data-demo-tab-count="${section}"></span></button>`).join('')}</nav></header>
      <main class="demo-width">
        ${noticeBanner}
        <div class="demo-toolbar">
          <span id="demo-progress" aria-live="polite"></span>
          <span id="demo-save" role="status"></span>
          <button type="button" class="btn btn-primary" id="demo-submit">${isLearningMode ? 'Nộp bài' : 'Nộp thử'}</button>
          <button type="button" class="btn btn-secondary" id="demo-reset">Xóa bản nháp / làm lại</button>
        </div>
        <div id="demo-result" class="demo-notice" hidden></div>
        <div id="demo-ai-card" hidden style="margin:20px 0;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 20px rgba(0,0,0,0.04)"></div>
        <div class="demo-layout"><aside class="side-panel"><div class="panel-card"><strong>Tiến độ làm bài</strong><div class="progress-track"><div class="progress-fill" id="demo-fill"></div></div><nav aria-label="Điều hướng bài thi">${sections.map(section=>`<button class="section-tab" data-demo-go="${section}">${sectionLabels[section]} <span data-demo-section-count="${section}"></span></button>`).join('')}</nav></div><div class="panel-card"><strong>Lưu ý khi làm bài</strong><p class="meta">Câu trả lời được lưu tự động. Chuyển phần không mất đáp án. Kiểm tra các ô chưa trả lời trước khi nộp bài.</p></div></aside>
        <div class="demo-main">${groupSections(form)}<div class="bottom-actions demo-bottom"><button class="btn btn-secondary" id="demo-prev">← Phần trước</button><button class="btn btn-primary" id="demo-next">Phần tiếp →</button></div></div></div>
      </main><dialog id="demo-confirm"><h2>${isLearningMode ? 'Xác nhận nộp bài thi?' : 'Nộp bài thử?'}</h2><p id="demo-confirm-text"></p><p>${isLearningMode ? 'Sau khi nộp, hệ thống và AI sẽ tiến hành chấm điểm. Bạn không thể chỉnh sửa bài làm.' : 'Bạn có thể xem lại câu trả lời. Demo chưa chấm điểm.'}</p><button type="button" class="btn btn-secondary" id="demo-cancel">Quay lại bài</button> <button type="button" class="btn btn-primary" id="demo-confirm-submit">${isLearningMode ? 'Xác nhận nộp bài' : 'Xác nhận nộp thử'}</button></dialog>
    </div>`;

    document.querySelector('.demo-top').insertAdjacentHTML('beforeend',`<div class="top-actions"><button type="button" class="icon-btn" id="demo-font-down" aria-label="Giảm cỡ chữ">A−</button><button type="button" class="icon-btn" id="demo-font-up" aria-label="Tăng cỡ chữ">A+</button><span class="timer" id="examTimerDisplay">${form.durationMinutes}:00</span></div>`);
    document.querySelector('.top-actions').prepend(document.querySelector('#demo-save'));

    // Đếm ngược thời gian làm bài (120 phút)
    const durationMinutes = Number(form.durationMinutes) || 120;
    const durationMs = durationMinutes * 60 * 1000;
    const timerStorageKey = `izone_timer_${isLearningMode ? (learningState.attemptToken || testToken) : course}`;

    let examEndTime = learningState.expiresAt;
    if (!examEndTime) {
      let storedStart = parseInt(localStorage.getItem(timerStorageKey) || '0', 10);
      if (!storedStart || storedStart > Date.now()) {
        storedStart = Date.now();
        localStorage.setItem(timerStorageKey, String(storedStart));
      }
      examEndTime = storedStart + durationMs;
    }

    const timerDisplay = document.querySelector('#examTimerDisplay');
    let examTimerInterval = null;

    function tickExamTimer() {
      if (!timerDisplay) return;
      if (state.submittedAt) {
        timerDisplay.textContent = 'Đã nộp';
        timerDisplay.classList.remove('warn');
        if (examTimerInterval) clearInterval(examTimerInterval);
        return;
      }
      const now = Date.now();
      const remainingMs = Math.max(0, examEndTime - now);
      const remainingSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(remainingSecs / 60);
      const secs = remainingSecs % 60;
      timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (remainingSecs <= 600) {
        timerDisplay.classList.add('warn');
      } else {
        timerDisplay.classList.remove('warn');
      }
      if (remainingSecs <= 0) {
        if (examTimerInterval) clearInterval(examTimerInterval);
        if (!state.submittedAt) {
          alert('Đã hết giờ làm bài! Hệ thống sẽ tự động xác nhận nộp bài.');
          const confirmSubmitBtn = document.querySelector('#demo-confirm-submit');
          if (confirmSubmitBtn) confirmSubmitBtn.click();
        }
      }
    }

    tickExamTimer();
    examTimerInterval = setInterval(tickExamTimer, 1000);

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
      .content-demo .demo-audio-gate{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:16px;margin:14px 0 18px;border:1px solid #f1c8cf;border-radius:12px;background:#fff3f5}
      .content-demo .demo-audio-gate audio{display:none}
      .content-demo .demo-audio-status{font-size:13px;font-weight:600;color:var(--color-text-secondary)}
      .content-demo .demo-audio-linked{font-size:13px}
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

    for (const button of document.querySelectorAll('[data-demo-audio-start]')) {
      const gateId = button.dataset.demoAudioStart;
      const audio = document.querySelector(`[data-demo-audio-player="${gateId}"]`);
      const status = document.querySelector(`[data-demo-audio-status="${gateId}"]`);
      let started = false;
      let lastGoodTime = 0;
      audio.addEventListener('play', () => {
        if (!started) {
          started = true;
          document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
          document.querySelectorAll('.demo-audio-linked').forEach(notice => {
            if (notice.closest('.demo-section')?.querySelector(`[data-demo-audio-content="${gateId}"]`)) notice.hidden = true;
          });
        }
        button.hidden = true;
        status.textContent = 'Audio đang phát · bài tập đã được mở.';
      });
      audio.addEventListener('timeupdate', () => { if (!audio.seeking) lastGoodTime = audio.currentTime; });
      audio.addEventListener('seeking', () => {
        if (started && Math.abs(audio.currentTime - lastGoodTime) > 0.75) audio.currentTime = lastGoodTime;
      });
      audio.addEventListener('pause', () => {
        if (started && !audio.ended) audio.play().catch(() => {});
      });
      audio.addEventListener('ended', () => { status.textContent = 'Audio đã phát xong · bài tập vẫn mở để hoàn thành.'; });
      audio.addEventListener('error', () => {
        if (started) return;
        button.disabled = false;
        button.textContent = 'Thử phát lại audio';
        status.textContent = 'Không tải được audio. Bài tập vẫn đang khóa.';
      });
      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = 'Đang tải audio…';
        try {
          await audio.play();
        } catch {
          button.disabled = false;
          button.textContent = 'Thử phát lại audio';
          status.textContent = 'Trình duyệt chưa phát được audio. Bài tập vẫn đang khóa.';
        }
      });
    }

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

    let draftDebounceTimer = null;
    function queueServerDraft() {
      if (!isLearningMode || !learningState.attemptToken || state.submittedAt) return;
      clearTimeout(draftDebounceTimer);
      draftDebounceTimer = setTimeout(async () => {
        try {
          learningState.draftRevision += 1;
          await apiRequest('/attempts/draft', {
            attemptToken: learningState.attemptToken,
            revision: learningState.draftRevision,
            definitionHash: learningState.definitionHash,
            responses: buildResponsesPayload()
          });
          query('#demo-save').textContent = 'Đã lưu máy chủ';
        } catch {
          query('#demo-save').textContent = 'Lưu máy chủ thất bại';
        }
      }, 1500);
    }

    function persist() {
      try {
        localStorage.setItem(key, JSON.stringify(state));
        query('#demo-save').textContent = isLearningMode ? 'Đang lưu…' : 'Đã lưu trên trình duyệt';
      } catch {
        query('#demo-save').textContent = 'Không lưu được bản nháp.';
      }
      queueServerDraft();
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
        if (field) {
          field.disabled=Boolean(state.submittedAt);
          field.closest('.demo-question')?.classList.toggle('done',Boolean(String(state.answers[item.id]||'').trim()));
        }
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
      if (!isLearningMode) {
        query('#demo-result').textContent=state.submittedAt ? `Đã nộp thử lúc ${new Date(state.submittedAt).toLocaleString('vi-VN')}. Câu trả lời bên dưới được giữ để xem lại; chưa có điểm chấm.` : '';
      }
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
      if (field) { field.value=radio.value; field.dispatchEvent(new Event('input',{bubbles:true})); }
    }));
    document.querySelectorAll('[data-demo-clear]').forEach(button=>button.addEventListener('click',()=>{
      if(state.submittedAt)return;
      const field=document.getElementById(button.dataset.demoClear);
      if (field) { field.value=''; field.dispatchEvent(new Event('input',{bubbles:true})); }
    }));

    query('#demo-submit').addEventListener('click',()=>{
      const missing=items.filter(item=>!String(state.answers[item.id]||'').trim()).length;
      query('#demo-confirm-text').textContent=`Còn ${missing} ô chưa trả lời. Bạn có chắc chắn muốn nộp bài?`;
      query('#demo-confirm').showModal();
    });
    query('#demo-cancel').addEventListener('click',()=>query('#demo-confirm').close());

    function renderAiResultCard(result) {
      const vm = resultViewModel(result);
      const card = query('#demo-ai-card');
      card.hidden = false;
      const isComplete = vm.scoreFinal;
      const isManualReview = result.gradingStatus === 'manual_review';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;border-bottom:1px solid #f1f5f9;padding-bottom:16px;margin-bottom:16px">
          <div>
            <div style="font-size:12px;font-weight:700;color:${isComplete ? '#16a34a' : isManualReview ? '#ea580c' : '#d97706'};letter-spacing:1px;text-transform:uppercase">
              ${escape(vm.title)}
            </div>
            <h2 style="font-size:22px;color:#174266;margin:4px 0 0 0">Kết quả bài thi · ${escape(learningState.studentName || title)}</h2>
            <div style="font-size:13px;color:#64748b;margin-top:4px">Mã lớp: <strong>${escape(learningState.className || learningState.courseCode)}</strong> · Trạng thái chấm: <strong>${escape(result.gradingStatus || 'pending')}</strong></div>
          </div>
          <div style="background:${isComplete ? '#f0fdf4' : isManualReview ? '#fff7ed' : '#fffbeb'};border:1px solid ${isComplete ? '#bbf7d0' : isManualReview ? '#fed7aa' : '#fef3c7'};border-radius:12px;padding:12px 20px;text-align:right">
            <div style="font-size:12px;color:#64748b;font-weight:600">${escape(vm.scoreLabel)}</div>
            <div style="font-size:28px;font-weight:900;color:${isComplete ? '#16a34a' : isManualReview ? '#c2410c' : '#b45309'}">${escape(vm.score)}</div>
          </div>
        </div>
        ${isComplete ? `
          <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;margin-bottom:16px">
            <h4 style="margin:0 0 8px 0;font-size:14px;color:#334155">Tổng kết đánh giá của AI</h4>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">
              Bài thi đã hoàn tất chấm điểm toàn diện các phần trắc nghiệm, từ vựng và tự luận Speaking/Writing. Các câu trả lời bên dưới đã được lưu trữ vĩnh viễn trên hệ thống.
            </p>
          </div>
        ` : isManualReview ? `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span style="font-size:20px">📝</span>
            <div style="font-size:13px;color:#9a3412;line-height:1.5">
              Hệ thống AI đã hoàn tất chấm. Một số câu tự luận được chuyển sang trạng thái <strong>Chờ giảng viên kiểm tra</strong> (manual review). Điểm chính thức sẽ được cập nhật sau khi giảng viên xác nhận.
            </div>
          </div>
        ` : `
          <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span style="font-size:20px">⏳</span>
            <div style="font-size:13px;color:#1e40af;line-height:1.5">
              Hệ thống đang tiến hành chấm các câu tự luận bằng AI. Điểm chính thức sẽ tự động cập nhật ngay tại đây (còn lại ${vm.pendingItemCount} câu đang xử lý).
            </div>
          </div>
        `}
        <div class="learning-result-grid">${resultDetailsHtml(result, learningState.definition)}</div>
      `;
      card.querySelectorAll('[data-result-details]').forEach(button => button.addEventListener('click', () => {
        const details = card.querySelector(`#${button.dataset.resultDetails}`);
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        button.textContent = expanded ? 'Xem chi tiết' : 'Ẩn chi tiết';
        if (details) details.hidden = expanded;
      }));
    }

    async function pollLearningResult() {
      if (!isLearningMode || !learningState.attemptToken) return;
      try {
        const res = await apiRequest('/attempts/result', { attemptToken: learningState.attemptToken });
        if (res.result) {
          learningState.result = res.result;
          renderAiResultCard(res.result);
          if (res.result.gradingStatus === 'complete' || res.result.gradingStatus === 'manual_review' || res.result.summary?.scoreFinal) {
            clearInterval(learningState.pollTimer);
            learningState.pollTimer = null;
          }
        }
      } catch {}
    }

    query('#demo-confirm-submit').addEventListener('click', async () => {
      query('#demo-confirm-submit').disabled = true;
      query('#demo-confirm-submit').textContent = 'Đang gửi…';
      try {
        if (isLearningMode && learningState.attemptToken) {
          const res = await apiRequest('/attempts/submit', {
            attemptToken: learningState.attemptToken,
            submissionId: createUuid(),
            definitionHash: learningState.definitionHash,
            draftRevision: Number(learningState.draftRevision || 0),
            responses: buildResponsesPayload()
          });
          state.submittedAt = Date.now();
          persist();
          update();
          if (examTimerInterval) clearInterval(examTimerInterval);
          if (timerDisplay) { timerDisplay.textContent = 'Đã nộp'; timerDisplay.classList.remove('warn'); }
          query('#demo-confirm').close();
          window.scrollTo({top: 0, behavior: 'smooth'});

          query('#demo-result').hidden = false;
          query('#demo-result').style.background = '#f0fdf4';
          query('#demo-result').style.borderColor = '#bbf7d0';
          query('#demo-result').style.color = '#166534';
          query('#demo-result').innerHTML = `<strong>Nộp bài thành công!</strong> Bài làm của bạn đã được chuyển cho AI Worker để chấm điểm.`;

          if (res.result) {
            renderAiResultCard(res.result);
          }
          if (!learningState.pollTimer) {
            learningState.pollTimer = setInterval(pollLearningResult, 3500);
            void pollLearningResult();
          }
        } else {
          state.submittedAt=Date.now();
          persist();
          update();
          query('#demo-confirm').close();
          window.scrollTo({top:0,behavior:'smooth'});
        }
      } catch (err) {
        alert(`Nộp bài không thành công: ${err.message}`);
      } finally {
        query('#demo-confirm-submit').disabled = false;
        query('#demo-confirm-submit').textContent = isLearningMode ? 'Xác nhận nộp bài' : 'Xác nhận nộp thử';
      }
    });

    query('#demo-reset').addEventListener('click',()=>{
      if (!confirm('Xóa câu trả lời và làm lại?')) return;
      state=sanitizeDraft(form,null); fields.forEach(field=>field.value=''); persist(); update();
      localStorage.removeItem(timerStorageKey);
      if (examTimerInterval) clearInterval(examTimerInterval);
      examEndTime = Date.now() + durationMs;
      tickExamTimer();
      examTimerInterval = setInterval(tickExamTimer, 1000);
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
      query('#demo-next').textContent=sections.indexOf(section)===sections.length-1?(isLearningMode?'Nộp bài':'Nộp thử'):'Phần tiếp →';
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

    if (isLearningMode && state.submittedAt) {
      void pollLearningResult();
      if (!learningState.pollTimer) {
        learningState.pollTimer = setInterval(pollLearningResult, 3000);
      }
    }
  }
}
