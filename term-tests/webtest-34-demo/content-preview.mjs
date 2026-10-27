import { parseSseChunk } from '../teacher-dashboard/exam-room-sse.js';
import {
  renderDynamicExam,
  getTotalItemCount,
  getAnsweredCount,
  renderSectionNavPills,
  renderSidePanel,
  initDynamicExamInteractions,
  ICONS
} from './dynamic-exam-renderer.mjs?rev=20261024-cbt-v14';

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

// Mọi request lượt làm gửi kèm mã thiết bị theo tab; Exam Mode dùng nó để chỉ cho một máy làm bài.
export function learningRequestBody(path, body, deviceId) {
  // /attempts/review và /attempts/result có schema strict, không nhận deviceId.
  return path.startsWith('/attempts/') && !['/attempts/review', '/attempts/result'].includes(path) ? { ...body, deviceId } : body;
}

// 'waiting' → phòng chờ (chưa có đề); 'running' → vào đề và bật Exam Guard; 'off' → luồng thường.
export function examPhase(attempt) {
  if (!attempt?.exam?.enabled || attempt.status !== 'active') return 'off';
  return ['waiting', 'running'].includes(attempt.exam.status) ? attempt.exam.status : 'off';
}

// Banner luật/bộ đếm của chế độ Tự giám sát; rỗng khi bài không bật chế độ này.
export function selfProctoringBannerHtml(selfProctoring) {
  if (!selfProctoring) return '';
  const { level, text } = globalThis.selfProctoringNotice(selfProctoring);
  const colors = { info: '#eff6ff;color:#1e3a8a;border-color:#bfdbfe', danger: '#fef2f2;color:#991b1b;border-color:#fecaca', submitted: '#fffbeb;color:#92400e;border-color:#fde68a' };
  return `<div id="selfProctoringBanner" class="demo-notice ${level}" role="status" aria-live="polite" style="font-weight:600;background:${colors[level]}">${text}</div>`;
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
      const expText = (item.expectedAnswer !== null && item.expectedAnswer !== undefined)
        ? (Array.isArray(item.expectedAnswer) ? item.expectedAnswer.join(', ') : String(item.expectedAnswer))
        : '';
      const expHtml = expText ? `<div class="learning-result-expected"><strong>Đáp án:</strong> ${escape(expText)}</div>` : '';
      return `<div class="learning-result-item"><span class="learning-result-verdict ${tone}">${escape(verdictLabel(item.verdict))}</span><div><strong>Câu ${escape(item.position)}</strong><div class="learning-result-answer">${escape(item.rawAnswer || 'Chưa trả lời')}</div>${expHtml}${feedback}</div></div>`;
    }).join('');
    return `<article class="learning-result-section"><div class="learning-result-section-header"><h3>${escape(block.title)}</h3><div class="learning-result-section-actions"><div class="learning-result-section-summary"><div class="learning-result-score">${score} / ${maxScore} điểm</div><div class="meta">${correct}/${items.length} câu đúng</div></div><button class="result-details-toggle" type="button" data-result-details="result-${escape(block.blockId)}" aria-expanded="false">Xem chi tiết</button></div></div><div class="learning-result-exercise" id="result-${escape(block.blockId)}" hidden><div class="learning-result-items">${details}</div></div></article>`;
  }).join('');
}

export function withLocalGroupLabels(definition, form) {
  if (!definition || !Array.isArray(definition.blocks) || !Array.isArray(form?.groups)) return definition;
  return {
    ...definition,
    blocks: definition.blocks.map((block, index) => {
      const local = form.groups[index];
      if (!local) return block;
      return {
        ...block,
        title: local.title || block.title,
        instructions: local.instructions || block.instructions
      };
    })
  };
}

export function mapAnswerToDefinitionValue(formItem, definitionItem, value) {
  if (typeof value !== 'string' || !Array.isArray(formItem?.options) || !Array.isArray(definitionItem?.options)) return value;
  const localIndex = formItem.options.findIndex(option => optionId(option) === value);
  return localIndex < 0 ? value : (definitionItem.options[localIndex]?.id || value);
}

export function mapAnswerFromDefinitionValue(formItem, definitionItem, value) {
  if (typeof value !== 'string' || !Array.isArray(formItem?.options) || !Array.isArray(definitionItem?.options)) return value;
  const definitionIndex = definitionItem.options.findIndex(option => option?.id === value);
  return definitionIndex < 0 ? value : optionId(formItem.options[definitionIndex]);
}

export function clozeSegments(text, ids, numbered = true) {
  const pattern = numbered ? /\((\d+)\)\s*[_\.\u2026]{2,}/g : /[_\.\u2026]{3,}/g;
  const segments = [];
  const seen = new Set();
  let previous = 0;
  let baseOffset = 0;
  if (numbered) {
    const allNums = [...text.matchAll(pattern)].map(m => Number(m[1]));
    if (allNums.length) {
      const minNum = Math.min(...allNums);
      if (minNum > 1 && Math.max(...allNums) - minNum + 1 <= ids.length) {
        baseOffset = minNum - 1;
      }
    }
  }
  for (const match of text.matchAll(pattern)) {
    const rawNum = numbered ? Number(match[1]) : seen.size + 1;
    const index = numbered ? (rawNum - 1 - baseOffset) : seen.size;
    if (!ids[index] || seen.has(ids[index])) return null;
    segments.push(text.slice(previous, match.index), { id: ids[index], number: rawNum });
    seen.add(ids[index]); previous = match.index + match[0].length;
  }
  if (seen.size !== ids.length || !seen.size) return null;
  segments.push(text.slice(previous));
  return segments;
}

const sectionKey = group => group.id.split('-')[0];
const sectionLabels = { vocabulary: 'Vocabulary', listening: 'Listening', grammar: 'Grammar', pronunciation: 'Pronunciation', translation: 'Translation', writing: 'Writing', speaking: 'Speaking', reading: 'Reading' };
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
    const cleanLabel = opt => {
      const raw = typeof opt === 'string' ? opt : (opt?.label ?? '');
      return raw.replace(/^[A-D][.)]\s*/i, '');
    };
    return `<input type="hidden" ${attributes}><div class="demo-choice-grid" data-columns="${layout.columns}" data-compact="${layout.compact}" role="radiogroup" aria-label="${escape(item.prompt)}">${item.options.map((option,index)=>`<label class="demo-choice"><input type="radio" name="${escape(item.id)}" data-demo-choice="${escape(item.id)}" value="${escape(optionId(option))}"><span class="demo-choice-letter">${String.fromCharCode(65+index)}</span><span>${escape(cleanLabel(option))}</span></label>`).join('')}</div><button type="button" class="demo-clear-choice" data-demo-clear="${escape(item.id)}" aria-label="Bỏ chọn: ${escape(item.prompt)}">Bỏ chọn</button>`;
  }
  if (item.options) return `<select ${attributes}><option value="">— Chọn đáp án —</option>${item.options.map(option=>`<option value="${escape(optionId(option))}">${escape(typeof option === 'string' ? option : option.label)}</option>`).join('')}</select>`;
  if (item.long) return `<textarea ${attributes} maxlength="12000" rows="4" placeholder="Viết câu trả lời"></textarea>`;
  return `<input type="text" ${attributes} maxlength="12000" autocomplete="off" placeholder="${inline ? 'Điền đáp án' : 'Nhập câu trả lời'}">`;
}
function clozeMarkup(segments, items, numbered = true) {
  return segments.map(segment => typeof segment === 'string' ? escape(segment) : `<span class="demo-question demo-inline">${numbered ? `<span class="demo-blank-number">(${segment.number})</span>` : ''}${answerField(items.find(item => item.id === segment.id), true)}</span>`).join('');
}
function extractWordBank(context) {
  if (!context) return null;
  const bracketMatch = context.match(/^\s*\[?\s*(Từ|Động từ)\s*gợi\s*ý\s*:\s*([^\]\n]+)\]?\s*\n*/i);
  if (bracketMatch) {
    const label = bracketMatch[1].toLowerCase().includes('động') ? 'Động từ gợi ý' : 'Từ gợi ý';
    const words = bracketMatch[2].split(/\s*[|,\/]\s*/).map(w => w.trim()).filter(Boolean);
    const body = context.slice(bracketMatch[0].length).trim();
    return { label, words, body };
  }
  const lines = context.split('\n');
  const firstSentence = lines.findIndex(line => /^\s*-\s+/.test(line));
  if (firstSentence > 0) {
    const bank = lines.slice(0, firstSentence).map(line => line.trim()).filter(Boolean);
    if (bank.every(word => /^[a-z ]+$/i.test(word))) {
      return {
        label: 'Động từ gợi ý',
        words: bank,
        body: lines.slice(firstSentence).join('\n')
      };
    }
  }
  return null;
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
  const bankInfo = extractWordBank(group.context);
  if (bankInfo) {
    const segments = clozeSegments(bankInfo.body, group.items.map(item => item.id));
    if (segments) {
      return `<div class="demo-word-bank" aria-label="${escape(bankInfo.label)}"><strong>${escape(bankInfo.label)}</strong><div class="demo-word-bank-list">${bankInfo.words.map(word=>`<span>${escape(word)}</span>`).join('')}</div></div><div class="demo-cloze demo-cloze-sentences">${clozeMarkup(segments,group.items).split('\n').map(l => l.trim()).filter(Boolean).map(sentence=>`<p class="demo-cloze-line">${sentence.replace(/^\s*-\s*/, '')}</p>`).join('')}</div>`;
    }
  }
  if (group.table && Array.isArray(group.table.rows)) {
    const pattern = /\((\d+)\)\s*[_\.\u2026]{2,}/g;
    const items = group.items;
    const renderCell = text => {
      if (!text) return '';
      let html = '';
      let last = 0;
      for (const match of text.matchAll(pattern)) {
        const num = Number(match[1]);
        const item = items[num - 1];
        html += escape(text.slice(last, match.index)).replace(/\n/g, '<br>');
        if (item) {
          html += `<span class="demo-question demo-inline"><span class="demo-blank-number">(${num})</span>${answerField(item, true)}</span>`;
        } else {
          html += escape(match[0]);
        }
        last = match.index + match[0].length;
      }
      html += escape(text.slice(last)).replace(/\n/g, '<br>');
      return html;
    };

    if (group.table.columns && Array.isArray(group.table.columns)) {
      return `<div class="demo-table-wrapper">
        ${group.table.title ? `<div class="demo-table-title">${escape(group.table.title)}</div>` : ''}
        <table class="demo-cloze-table">
          <thead>
            <tr>${group.table.columns.map(col => `<th class="demo-table-header">${escape(col)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${group.table.rows.map(row => `
              <tr>${(row.cells || []).map(cell => `<td class="demo-table-cell">${renderCell(cell)}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
    }

    return `<div class="demo-table-wrapper">
      ${group.table.title ? `<div class="demo-table-title">${escape(group.table.title)}</div>` : ''}
      <table class="demo-cloze-table">
        <tbody>
          ${group.table.rows.map(row => `
            <tr>
              <th scope="row" class="demo-table-header">${escape(row.header).replace(/\n/g, '<br>')}</th>
              <td class="demo-table-cell">${renderCell(row.content)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
  }

  if (group.id.startsWith('listening-order')) {
    const sentences = (group.context || '').split('\n').map(l => l.trim()).filter(Boolean);
    return `<div class="demo-order-container">
      <div class="demo-order-sentences">
        ${sentences.map(s => {
          const m = s.match(/^([A-E])[.)\s]\s*(.*)$/i);
          if (m) {
            return `<div class="demo-order-sentence-card"><span class="demo-order-letter">${escape(m[1].toUpperCase())}</span><span class="demo-order-text">${escape(m[2])}</span></div>`;
          }
          return `<div class="demo-order-sentence-card">${escape(s)}</div>`;
        }).join('')}
      </div>
      <div class="demo-order-slots">
        ${group.items.map((item, index) => `
          <div class="demo-order-slot">
            <label for="${escape(item.id)}" class="demo-order-slot-label">Vị trí ${index + 1}</label>
            ${answerField(item)}
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  const numbered = group.context ? clozeSegments(group.context, group.items.map(item => item.id)) : null;
  if (numbered) return `<div class="demo-context demo-lines demo-cloze">${clozeMarkup(numbered, group.items)}</div>`;
  if (['vocabulary-listen', 'vocabulary-picture'].includes(group.id)) {
    return `${group.context ? `<div class="demo-context demo-lines">${escape(group.context)}</div>` : ''}<div class="${group.id === 'vocabulary-listen' ? 'demo-vocab-grid' : 'demo-picture-grid'}">${group.items.map((item, index) => {
      const prefix = item.prompt.match(/^\s*(\d+)[.)]\s*/);
      const number = prefix ? prefix[1] : group.id === 'vocabulary-listen' ? Math.floor(index / 2) + 1 : index + 1;
      const prompt = item.prompt.replace(/^\s*\d+[.)]\s*/, '');
      const cards = ['vocabulary-choice', 'pronunciation-choice', 'listening-tf'].includes(group.id);
      return `<div class="demo-question${cards ? ' demo-mcq-question' : ''}"><div class="demo-prompt-row"><span class="qnum">${number}</span><${cards ? 'div' : 'label'} ${cards ? '' : `for="${escape(item.id)}"`} class="demo-lines">${escape(prompt)}</${cards ? 'div' : 'label'}></div>
        ${item.targetWord ? `<p>Thay từ/cụm: <strong>${escape(item.targetWord)}</strong></p>` : ''}
        ${item.image ? `<img src="${escape(item.image)}" alt="Hình minh họa câu ${escape(item.prompt.split('.')[0])}" loading="lazy">` : ''}
        ${answerField(item, false, cards)}${item.long || item.maxWords ? `<small id="${escape(item.id)}-count"></small>` : ''}</div>`;
    }).join('')}</div>`;
  }

  // Clustering for general groups
  const clusters = [];
  let curCluster = [];
  let curKey = null;

  for (const item of group.items) {
    const prefix = item.prompt.match(/^\s*(\d+)[.)]\s*/);
    const nlSplit = item.prompt.split('\n');
    const stem = nlSplit.length > 1 ? nlSplit[0].replace(/^\s*\d+[.)]\s*/, '').trim() : null;
    const key = prefix ? `num-${prefix[1]}` : (stem ? `stem-${stem}` : null);

    if (key && key === curKey) {
      curCluster.push(item);
    } else {
      if (curCluster.length) clusters.push(curCluster);
      curCluster = [item];
      curKey = key;
    }
  }
  if (curCluster.length) clusters.push(curCluster);

  let clusterCounter = 0;
  const rendered = clusters.map(cluster => {
    clusterCounter++;
    const firstItem = cluster[0];
    const prefix = firstItem.prompt.match(/^\s*(\d+)[.)]\s*/);
    const questionNumber = prefix ? prefix[1] : clusterCounter;

    if (cluster.length === 1) {
      const item = cluster[0];
      const prompt = item.prompt.replace(/^\s*\d+[.)]\s*/, '');
      const isChoiceGroup = group.id.includes('choice') || group.id.includes('matching') || group.id.includes('headings') || group.id.includes('info') || group.id.endsWith('-tf');
      const single = !item.long && (!item.options || !item.options.length) && /[_\.\u2026]{3,}/.test(prompt)
        ? clozeSegments(prompt, [item.id], false)
        : null;
      if (single) return `<div class="demo-cloze demo-sentence"><span class="qnum">${questionNumber}</span> ${clozeMarkup(single, [item], false)}</div>`;
      const cards = isChoiceGroup || ['vocabulary-choice', 'pronunciation-choice', 'listening-tf', 'listening-choice', 'grammar-choice', 'reading-choice', 'reading-tf'].includes(group.id);
      return `<div class="demo-question${cards ? ' demo-mcq-question' : ''}"><div class="demo-prompt-row"><span class="qnum">${questionNumber}</span><${cards ? 'div' : 'label'} ${cards ? '' : `for="${escape(item.id)}"`} class="demo-lines">${escape(prompt)}</${cards ? 'div' : 'label'}></div>
        ${item.targetWord ? `<p>Thay từ/cụm: <strong>${escape(item.targetWord)}</strong></p>` : ''}
        ${item.image ? `<img src="${escape(item.image)}" alt="Hình minh họa câu ${escape(item.prompt.split('.')[0])}" loading="lazy">` : ''}
        ${answerField(item, false, cards)}${item.long || item.maxWords ? `<small id="${escape(item.id)}-count"></small>` : ''}</div>`;
    }

    const allHaveNl = cluster.every(it => it.prompt.includes('\n'));
    const firstLastNl = allHaveNl ? cluster[0].prompt.lastIndexOf('\n') : -1;
    const firstStem = allHaveNl && firstLastNl > 0 ? cluster[0].prompt.slice(0, firstLastNl).replace(/^\s*\d+[.)]\s*/, '').trim() : '';
    const hasCommonStem = allHaveNl && Boolean(firstStem) && cluster.every(it => {
      const idx = it.prompt.lastIndexOf('\n');
      return idx > 0 && it.prompt.slice(0, idx).replace(/^\s*\d+[.)]\s*/, '').trim() === firstStem;
    });
    const commonStemText = hasCommonStem ? firstStem : '';

    const getSubLabel = it => {
      if (hasCommonStem) {
        const idx = it.prompt.lastIndexOf('\n');
        return it.prompt.slice(idx + 1).trim();
      }
      return it.prompt.replace(/^\s*\d+[.)]\s*/, '').trim();
    };

    const isCompactGrid = cluster.every(it => !it.long && getSubLabel(it).length <= 40);

    if (isCompactGrid) {
      return `<div class="demo-question demo-multipart-card">
        <div class="demo-prompt-row"><span class="qnum">${questionNumber}</span>${commonStemText ? `<div class="demo-lines demo-multipart-stem">${escape(commonStemText)}</div>` : ''}</div>
        <div class="demo-subfield-grid">
          ${cluster.map(it => {
            const subLabel = getSubLabel(it);
            return `<div class="demo-subfield">
              <label for="${escape(it.id)}" class="demo-subfield-label">${escape(subLabel)}</label>
              ${answerField(it, false, false)}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }

    return `<div class="demo-question demo-multipart-card">
      <div class="demo-prompt-row"><span class="qnum">${questionNumber}</span>${commonStemText ? `<div class="demo-lines demo-multipart-stem">${escape(commonStemText)}</div>` : ''}</div>
      <div class="demo-subparts-list">
        ${cluster.map(it => {
          const subLabel = getSubLabel(it);
          return `<div class="demo-subpart-item">
            <label for="${escape(it.id)}" class="demo-subpart-label">${escape(subLabel)}</label>
            ${answerField(it, false, false)}
            ${it.long || it.maxWords ? `<small id="${escape(it.id)}-count"></small>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;
  });

  return `${group.context ? `<div class="demo-context demo-lines">${escape(group.context)}</div>` : ''}<div>${rendered.join('')}</div>`;
}

export const CLOUDFLARE_R2_AUDIO_BASE = 'https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev';

export function resolveAudioUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.replace(/^\.?\//, '');
  const [filePath, query] = clean.split('?');
  const querySuffix = query ? `?${query}` : '';
  if (filePath.includes('soundcheck')) return `${CLOUDFLARE_R2_AUDIO_BASE}/soundcheck.mp3${querySuffix}`;
  let match = filePath.match(/^assets\/03\/test-(\d+)\/(listening|vocabulary)\.mp3$/);
  if (match) return `${CLOUDFLARE_R2_AUDIO_BASE}/course-03/test-${match[1]}/${match[2]}.mp3${querySuffix}`;
  match = filePath.match(/^assets\/34\/test-(\d+)\/(listening|vocabulary(?:\s|%20)?)\.mp3$/);
  if (match) {
    if (match[1] === '4' && match[2].trim().startsWith('vocabulary')) {
      return `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-4/vocabulary%20.mp3${querySuffix}`;
    }
    return `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-1/test-${match[1]}/${match[2]}.mp3${querySuffix}`;
  }
  match = filePath.match(/^assets\/34\/p2-test-(\d+)\/listening\.mp3$/);
  if (match) return `${CLOUDFLARE_R2_AUDIO_BASE}/course-34/phase-2/test-${match[1]}/listening.mp3${querySuffix}`;
  match = filePath.match(/^assets\/45\/test-(\d+)\/listening\.mp3$/);
  if (match) return `${CLOUDFLARE_R2_AUDIO_BASE}/course-45/phase-1/test-${match[1]}/listening.mp3${querySuffix}`;
  match = filePath.match(/^assets\/45\/p2-test-(\d+)\/listening\.mp3$/);
  if (match) return `${CLOUDFLARE_R2_AUDIO_BASE}/course-45/phase-2/test-${match[1]}/listening.mp3${querySuffix}`;
  return `${CLOUDFLARE_R2_AUDIO_BASE}/${clean}`;
}

export function groupSections(form, bypass = false) {
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
      ? `<div class="demo-audio-gate" data-demo-audio-gate="${escape(gateId)}"><button type="button" class="btn btn-primary demo-audio-start" data-demo-audio-start="${escape(gateId)}">▶ Phát audio (nếu có)</button><audio preload="metadata" src="${escape(resolveAudioUrl(group.audioPath))}" data-demo-audio-player="${escape(gateId)}"></audio><span class="demo-audio-status" data-demo-audio-status="${escape(gateId)}">${bypass ? 'Đã mở khóa nội dung câu hỏi để kiểm tra.' : 'Nội dung bài nghe đang được khóa.'}</span></div>`
      : gateId
        ? `<p class="demo-notice demo-audio-linked">${bypass ? 'Bài nghe này dùng chung audio ở phần trên.' : 'Nhóm này sẽ mở khi audio ở phần trên bắt đầu phát.'}</p>`
        : group.audioRequired
          ? `<p class="demo-notice">${bypass ? 'Chưa có file audio chính thức. Nội dung câu hỏi đã mở để kiểm tra.' : 'Chưa có audio cho nhóm này nên nội dung đang được khóa.'}</p>`
          : '';
    const hidden = !bypass && (gateId || group.audioRequired) ? ' hidden' : '';
    return `<section data-demo-page="${sectionKey(group)}" id="demo-${escape(group.id)}" class="exercise demo-section"><div class="exercise-head"><div><h2>${escape(group.title)}</h2><p class="demo-lines">${escape(group.instructions)}</p></div><span class="points">${group.items.length} ô trả lời</span></div>
      ${group.notice ? `<p class="demo-notice">${escape(group.notice)}</p>` : ''}
      ${audioControl}
      <div data-demo-audio-content="${escape(gateId)}"${hidden}>${groupBody(group)}</div></section>`;
  }).join('');
}

export async function mount(course) {
  if (!['03','34','45'].includes(course)) throw new Error('Unknown demo course');
  const config = window.WEBTEST_34_PREVIEW_CONFIG || {};
  const queryParams = new URLSearchParams(location.search || '');
  const rawHash = location.hash.replace(/^#/, '').trim();
  const hashParams = new URLSearchParams(rawHash);
  const hashToken = rawHash.includes('=') ? (hashParams.get('token') || hashParams.get('testToken') || hashParams.get('test')) : (rawHash.includes('-') ? rawHash : '');
  const rawTestTokenParam = queryParams.get('testToken') || queryParams.get('token') || (queryParams.get('test')?.includes('-') ? queryParams.get('test') : '');
  const testToken = (hashToken?.includes('-') ? hashToken : '') || rawTestTokenParam || config.LEARNING_TEST_TOKEN || '';

  const explicitTest = Number(queryParams.get('testNum')) || Number(queryParams.get('demoTest')) || (!queryParams.get('test')?.includes('-') ? Number(queryParams.get('test')) : 0);
  let testNum = explicitTest || 1;
  const phaseParam = queryParams.get('phase');
  if ((course === '34' || course === '45') && phaseParam === '2' && testNum <= 2) {
    testNum = testNum + 4;
  }
  if (!explicitTest) {
    const prefixMatch = testToken.match(/^(\d{2})(\d{2})/);
    if (prefixMatch && prefixMatch[1] === course && Number(prefixMatch[2]) <= 6) {
      testNum = Number(prefixMatch[2]);
    } else {
      const tokenMatch = testToken.match(/-0*([1-9]\d*)$/);
      if (tokenMatch && Number(tokenMatch[1]) <= 6) {
        testNum = Number(tokenMatch[1]);
      }
    }
  }

  const isProd = queryParams.get('prod') === '1' || queryParams.get('apiEnv') === 'production';
  const apiBase = (isProd ? 'https://webtest.ducanhn.autos' : (config.LEARNING_API_BASE_URL || config.API_BASE_URL || 'https://webtest.ducanhn.autos')).replace(/\/$/, '');
  const isLearningMode = Boolean(testToken);

  let form = { course, groups: [], durationMinutes: 60 };
  let items = [];
  let title = `Khóa ${course}`;
  let sections = [];
  let activeSection = '';
  let key = `izone_learning_${testToken || course}`;
  let state = { answers: {}, submittedAt: null };

  if (!isLearningMode) {
    let formUrl = new URL(`./demo-content/${course}-test-${testNum}.json?rev=20261026-c34t4-spk-v2`, import.meta.url);
    let response = await fetch(formUrl);
    if (!response.ok && phaseParam === '2') {
      formUrl = new URL(`./demo-content/${course}-p2-test-${testNum > 4 ? testNum - 4 : testNum}.json?rev=20261026-c34t4-spk-v2`, import.meta.url);
      response = await fetch(formUrl);
    }
    if (!response.ok) {
      formUrl = new URL(`./demo-content/${course}.json?rev=20261026-c34t4-spk-v2`, import.meta.url);
      response = await fetch(formUrl);
    }
    if (!response.ok) throw new Error('Content unavailable');
    form = await response.json();
    key = draftKey(form);
    try { state = sanitizeDraft(form, JSON.parse(localStorage.getItem(key))); }
    catch { state = sanitizeDraft(form, null); }
    items = form.groups.flatMap(group => group.items);
    const displayTestNum = form.phase === 2 && (form.testNumber > 4 || testNum > 4) ? (form.testNumber > 4 ? form.testNumber - 4 : testNum - 4) : (form.testNumber || testNum);
    title = `Khóa ${course}${form.phase ? ` · Phase ${form.phase}` : ''} · Test ${displayTestNum}`;
    sections = [...new Set(form.groups.map(sectionKey))];
    activeSection = sections[0];
  }

  const paramClassCode = (queryParams.get('class') || queryParams.get('classCode') || '').trim().toUpperCase();
  let learningState = {
    testToken,
    courseCode: paramClassCode || `TEST-${course}`,
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
    exam: null,
    selfProctoring: null,
    result: null,
    pollTimer: null
  };

  const deviceId = (() => {
    try {
      let id = sessionStorage.getItem('webtest34.learning.deviceId');
      if (!id) sessionStorage.setItem('webtest34.learning.deviceId', id = createUuid());
      return id;
    } catch {
      return createUuid();
    }
  })();

  async function apiRequest(path, body) {
    const res = await fetch(`${apiBase}/api/learning${path}`, {
      method: learningRequestMethod(path),
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(learningRequestBody(path, body, deviceId))
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.error === 'EXAM_DEVICE_SUPERSEDED' && learningState.status !== 'superseded') dispatchExamGuard({ type: 'device_superseded' });
      throw Object.assign(new Error(data.message || `Lỗi HTTP ${res.status}`), {
        code: data.error,
        status: res.status
      });
    }
    return data;
  }

  function createUuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0');
  }

  // --- EXAM MODE: phòng chờ, SSE, tín hiệu kết nối và Exam Guard (reducer ở exam-guard.js) ---
  const supportsFullscreen = () => typeof document.documentElement.requestFullscreen === 'function';
  const requestFullscreen = () => (supportsFullscreen() ? document.documentElement.requestFullscreen() : Promise.reject(new Error('unsupported')));
  let examGuardState = { running: false, fullscreenSupported: supportsFullscreen() };
  let examStreamController = null;
  let examHeartbeatTimer = null;
  let examAudioHold = false;
  let examPausedAudios = [];
  const examIncidentOperations = new Map();
  const examActive = () => ['waiting', 'running'].includes(learningState.exam?.status) && learningState.status === 'active';

  function stopExamConnections() {
    clearInterval(examHeartbeatTimer);
    examHeartbeatTimer = null;
    examStreamController?.abort();
    examStreamController = null;
  }

  function startExamHeartbeat() {
    if (examHeartbeatTimer) return;
    const send = () => {
      if (!examActive()) return clearInterval(examHeartbeatTimer);
      void apiRequest('/attempts/exam/heartbeat', { attemptToken: learningState.attemptToken }).catch(() => {});
    };
    send();
    examHeartbeatTimer = setInterval(send, 20_000);
  }

  function applyExamDeadline(deadlineAt) {
    if (deadlineAt) learningState.expiresAt = Date.parse(deadlineAt);
  }

  function enterRunningExam(payload) {
    if (payload.exam?.status !== 'running' || !payload.definition || learningState.exam?.status === 'running') return;
    learningState.exam = { ...learningState.exam, ...payload.exam, enabled: true };
    learningState.definition = payload.definition;
    applyExamDeadline(payload.exam.deadlineAt);
    renderExamInterface();
    mountExamGuard();
  }

  async function consumeExamEvents(signal) {
    const res = await fetch(`${apiBase}/api/learning/attempts/events?deviceId=${encodeURIComponent(deviceId)}`, {
      headers: { Authorization: `Bearer ${learningState.attemptToken}` }, cache: 'no-store', signal
    });
    if (!res.ok || !res.body) throw new Error(`Lỗi HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) return;
      const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
      buffer = parsed.buffer;
      for (const { event, data } of parsed.events) {
        if (event === 'snapshot' || event === 'exam.started') {
          const payload = event === 'exam.started' ? { exam: data, definition: data.definition } : data;
          if (learningState.exam?.status === 'running') applyExamDeadline(payload.exam?.deadlineAt);
          else enterRunningExam(payload);
        } else if (event === 'exam.extended' && !learningState.exam?.retake) {
          applyExamDeadline(data.deadlineAt);
        } else if (event === 'device.superseded') {
          dispatchExamGuard({ type: 'device_superseded' });
          return;
        }
      }
    }
  }

  async function connectExamEvents() {
    startExamHeartbeat();
    if (examStreamController) return;
    const controller = examStreamController = new AbortController();
    while (!controller.signal.aborted && examActive()) {
      try { await consumeExamEvents(controller.signal); } catch { if (controller.signal.aborted) break; }
      if (!controller.signal.aborted && examActive()) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (examStreamController === controller) examStreamController = null;
  }

  function renderExamWaitingRoom() {
    document.querySelector('main').innerHTML = `
      <div style="background:white;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,0.04);text-align:center" aria-live="polite">
        <div style="font-size:12px;font-weight:700;color:#db0829;letter-spacing:1px;margin-bottom:8px">PHÒNG CHỜ</div>
        <h1 style="font-size:24px;color:#174266;margin:0 0 12px 0">Xin chào ${escape(learningState.studentName)}!</h1>
        <p style="color:#64748b">Đề sẽ hiện khi giáo viên bắt đầu.</p>
        <p id="examFullscreenStatus" style="color:#64748b"></p>
        <p id="examWaitingError" style="color:#db0829" role="alert" hidden></p>
        <button type="button" class="btn btn-primary" id="examReadyBtn">Tôi đã sẵn sàng</button>
        <button type="button" class="btn btn-secondary" id="examFullscreenReenter" hidden>Vào chế độ thi</button>
      </div>`;
    const readyBtn = document.querySelector('#examReadyBtn');
    const status = document.querySelector('#examFullscreenStatus');
    const reenter = document.querySelector('#examFullscreenReenter');
    readyBtn.addEventListener('click', async () => {
      const fullscreenUnsupported = !supportsFullscreen();
      // requestFullscreen phải gọi ngay trong handler của cú bấm.
      const fullscreenAttempt = requestFullscreen().catch(() => null);
      readyBtn.disabled = true;
      try {
        await fullscreenAttempt;
        await apiRequest('/attempts/exam/ready', { attemptToken: learningState.attemptToken, fullscreenUnsupported });
        readyBtn.hidden = true;
        status.textContent = fullscreenUnsupported
          ? 'Thiết bị không hỗ trợ toàn màn hình; giáo viên đã được thông báo.'
          : (document.fullscreenElement ? 'Đã sẵn sàng. Hãy chờ giáo viên bắt đầu.' : 'Không thể bật toàn màn hình. Bạn vẫn có thể chờ giáo viên bắt đầu.');
      } catch (err) {
        readyBtn.disabled = false;
        const error = document.querySelector('#examWaitingError');
        error.textContent = `Không thể lưu trạng thái sẵn sàng: ${err.message}`;
        error.hidden = false;
      }
    });
    reenter.addEventListener('click', () => { requestFullscreen().catch(() => { status.textContent = 'Không thể bật toàn màn hình. Hãy thử lại.'; }); });
  }

  function requestExamIncident(command) {
    const opening = command.type === 'open_incident';
    const body = { attemptToken: learningState.attemptToken, incidentId: command.incidentId, ...(opening ? { type: 'left_exam' } : {}) };
    const previous = examIncidentOperations.get(command.incidentId) || Promise.resolve();
    // Đóng một sự cố mà lần mở bị lỗi mạng: mở lại (idempotent) trước khi đóng.
    const operation = previous
      .catch(() => (opening ? undefined : apiRequest('/attempts/exam/incidents/open', { ...body, type: 'left_exam' })))
      .then(() => apiRequest(opening ? '/attempts/exam/incidents/open' : '/attempts/exam/incidents/close', body));
    examIncidentOperations.set(command.incidentId, operation);
    void operation.then(data => {
      if (data?.selfProctoring) applySelfProctoring(data.selfProctoring);
    }).catch(err => {
      if (err.code === 'EXAM_DEVICE_SUPERSEDED') return;
      const message = document.querySelector('#examGuardMessage');
      if (message) message.textContent = 'Không thể lưu sự cố rời bài. Hãy giữ trang mở và thử quay lại bài thi.';
    });
  }

  // Server trả số lần thoát sau mỗi sự cố; vượt giới hạn thì server đã tự nộp bài.
  function applySelfProctoring(next) {
    learningState.selfProctoring = { ...learningState.selfProctoring, ...next };
    const { text } = globalThis.selfProctoringNotice(learningState.selfProctoring);
    const banner = document.querySelector('#selfProctoringBanner');
    if (banner) banner.outerHTML = selfProctoringBannerHtml(learningState.selfProctoring);
    const message = document.querySelector('#examGuardMessage');
    if (message) message.textContent = text;
    if (learningState.selfProctoring.autoSubmitted && learningState.status === 'active') {
      learningState.status = 'submitted';
      learningState.onAutoSubmitted?.(text);
    }
  }

  function runExamGuardCommand(command) {
    if (command.type === 'pause_audio') {
      examAudioHold = true;
      examPausedAudios = [...document.querySelectorAll('audio')].filter(audio => !audio.paused && !audio.ended);
      examPausedAudios.forEach(audio => audio.pause());
    } else if (command.type === 'resume_audio') {
      examAudioHold = false;
      examPausedAudios.forEach(audio => audio.play().catch(() => {}));
      examPausedAudios = [];
    } else if (command.type === 'request_fullscreen') {
      requestFullscreen().catch(() => {
        dispatchExamGuard({ type: 'left_exam', at: Date.now(), incidentId: createUuid() });
        const message = document.querySelector('#examGuardMessage');
        if (message) message.textContent = 'Không thể bật toàn màn hình. Hãy bấm “Quay lại bài thi” để thử lại.';
      });
    } else if (command.type === 'open_incident' || command.type === 'close_incident') {
      requestExamIncident(command);
    }
  }

  function dispatchExamGuard(event) {
    mountExamGuard();
    examGuardState = {
      ...examGuardState,
      running: (learningState.exam?.status === 'running' || Boolean(learningState.selfProctoring)) && learningState.status === 'active',
      fullscreenSupported: !learningState.selfProctoring && supportsFullscreen()
    };
    const result = globalThis.examGuardReducer(examGuardState, event);
    examGuardState = result.state;
    const overlay = document.querySelector('#examGuardOverlay');
    document.querySelector('.content-demo')?.classList.toggle('exam-guard-blurred', Boolean(examGuardState.prompt));
    if (overlay) overlay.hidden = !examGuardState.prompt;
    if (examGuardState.superseded) {
      learningState.status = 'superseded';
      stopExamConnections();
      const main = document.querySelector('.content-demo');
      if (main) main.inert = true;
      document.querySelector('#examGuardMessage').textContent = 'Bài thi đang được mở ở máy khác. Nếu không phải bạn, hãy báo giáo viên.';
      document.querySelector('#examGuardReturn').hidden = true;
    } else if (examGuardState.prompt && document.visibilityState !== 'hidden') {
      document.querySelector('#examGuardReturn')?.focus();
    }
    for (const command of result.commands) runExamGuardCommand(command);
  }

  let examGuardListening = false;
  function mountExamGuard() {
    if (!document.querySelector('#examGuardOverlay')) {
      document.body.insertAdjacentHTML('beforeend', `
        <style>.exam-guard-blurred{filter:blur(7px);pointer-events:none;user-select:none}
        #examGuardOverlay{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:rgba(17,24,39,.72)}
        #examGuardOverlay[hidden]{display:none}
        #examGuardOverlay .card{width:min(100%,480px);padding:28px;border-radius:18px;background:#fff;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.3)}</style>
        <div id="examGuardOverlay" role="alertdialog" aria-modal="true" aria-labelledby="examGuardTitle" aria-describedby="examGuardMessage" hidden>
          <div class="card"><h2 id="examGuardTitle">Bạn đã rời khỏi màn hình thi.</h2>
          <p id="examGuardMessage">Giáo viên sẽ được thông báo.</p>
          <button type="button" class="btn btn-primary" id="examGuardReturn">Quay lại bài thi</button></div>
        </div>`);
      document.querySelector('#examGuardReturn').addEventListener('click', () => {
        document.querySelector('#examGuardMessage').textContent = learningState.selfProctoring ? globalThis.selfProctoringNotice(learningState.selfProctoring).text : 'Giáo viên sẽ được thông báo.';
        dispatchExamGuard({ type: 'return_click', at: Date.now() });
      });
    }
    if (examGuardListening) return;
    examGuardListening = true;
    const leave = () => dispatchExamGuard({ type: 'left_exam', at: Date.now(), incidentId: createUuid() });
    window.addEventListener('blur', leave);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); });
    document.addEventListener('fullscreenchange', () => {
      const reenter = document.querySelector('#examFullscreenReenter');
      if (reenter) reenter.hidden = !supportsFullscreen() || Boolean(document.fullscreenElement);
      if (!document.fullscreenElement && supportsFullscreen()) leave();
    });
  }

  function buildResponsesPayload() {
    if (learningState.definition?.blocks?.length) {
      const responses = {};
      const allItems = learningState.definition.blocks.flatMap(b => b.items || []);
      for (const it of allItems) {
        const val = state.answers[it.itemVersionId];
        if (val !== undefined && val !== null && val !== '') {
          responses[it.itemVersionId] = val;
        }
      }
      return responses;
    }

    const defBlocks = learningState.definition?.blocks || [];
    const responses = {};

    for (let bIndex = 0; bIndex < defBlocks.length; bIndex++) {
      const block = defBlocks[bIndex];
      const group = form.groups[bIndex];
      if (!group) continue;

      const defItems = block.items || [];
      const formItems = group.items || [];

      if (defItems.length === formItems.length) {
        for (let i = 0; i < defItems.length; i++) {
          const val = state.answers[formItems[i].id];
          const answer = typeof val === 'string' ? val : (val ?? '');
          responses[defItems[i].itemVersionId] = mapAnswerToDefinitionValue(formItems[i], defItems[i], answer);
        }
      } else if (formItems.length === defItems.length * 2) {
        for (let i = 0; i < defItems.length; i++) {
          const formItemWord = formItems[i * 2];
          const formItemOpt = formItems[i * 2 + 1];
          const word = String(state.answers[formItemWord?.id] ?? '').trim();
          const rawOpt = state.answers[formItemOpt?.id] ?? '';
          const opt = mapAnswerToDefinitionValue(formItemOpt, defItems[i], rawOpt);
          responses[defItems[i].itemVersionId] = [word, typeof opt === 'string' ? opt : ''];
        }
      } else {
        for (let i = 0; i < defItems.length; i++) {
          if (formItems[i]) {
            const val = state.answers[formItems[i].id];
            const answer = typeof val === 'string' ? val : (val ?? '');
            responses[defItems[i].itemVersionId] = mapAnswerToDefinitionValue(formItems[i], defItems[i], answer);
          }
        }
      }
    }

    return responses;
  }

  function applyServerDraft(serverDraft) {
    if (!serverDraft || typeof serverDraft !== 'object') return;
    if (learningState.definition?.blocks?.length) {
      for (const [itemVerId, val] of Object.entries(serverDraft)) {
        state.answers[itemVerId] = val;
      }
      return;
    }
    const defBlocks = learningState.definition?.blocks || [];

    for (let bIndex = 0; bIndex < defBlocks.length; bIndex++) {
      const block = defBlocks[bIndex];
      const group = form.groups[bIndex];
      if (!group) continue;

      const defItems = block.items || [];
      const formItems = group.items || [];

      if (defItems.length === formItems.length) {
        for (let i = 0; i < defItems.length; i++) {
          const itemVerId = defItems[i].itemVersionId;
          if (serverDraft[itemVerId] !== undefined) {
            state.answers[formItems[i].id] = mapAnswerFromDefinitionValue(formItems[i], defItems[i], serverDraft[itemVerId]);
          }
        }
      } else if (formItems.length === defItems.length * 2) {
        for (let i = 0; i < defItems.length; i++) {
          const itemVerId = defItems[i].itemVersionId;
          const draftVal = serverDraft[itemVerId];
          if (Array.isArray(draftVal)) {
            const formItemWord = formItems[i * 2];
            const formItemOpt = formItems[i * 2 + 1];
            if (formItemWord) state.answers[formItemWord.id] = String(draftVal[0] ?? '');
            if (formItemOpt) state.answers[formItemOpt.id] = mapAnswerFromDefinitionValue(formItemOpt, defItems[i], draftVal[1]);
          }
        }
      }
    }
  }

  // --- RENDER MÀN HÌNH ĐỊNH DANH (IDENTITY SCREEN) KHI CÓ TEST TOKEN ---
  if (isLearningMode) {
    const initialTitle = paramClassCode ? 'Đang tải thông tin đề thi…' : title;
    document.title = `IZONE · Thi CBT · ${initialTitle}`;
    document.body.innerHTML = `
      <div class="content-demo">
        <header class="topbar cbt-topbar simulation-topbar">
          <div class="topbar-inner demo-top">
            <div class="brand">
              <div class="brand-mark">IZ</div>
              <div class="brand-copy">
                <div class="brand-title">IZONE · COMPUTER-BASED TEST</div>
                <div class="brand-sub">${escape(initialTitle)}</div>
              </div>
            </div>
            <div class="top-actions">
              <span class="timer">${paramClassCode ? '—' : `${form.durationMinutes}:00`}</span>
            </div>
          </div>
        </header>
        <main class="cbt-intro-wrap">
          <div class="cbt-intro-card">
            <span class="cbt-intro-badge">IZONE · COMPUTER-BASED TEST</span>
            <h1 class="cbt-intro-title">${escape(initialTitle)}</h1>
            <p class="cbt-intro-sub">
              ${paramClassCode ? 'Đang nạp danh sách lớp và cấu trúc đề thi…' : `Thời gian làm bài: <strong>${form.durationMinutes} phút</strong> · Tổng số câu hỏi: <strong>${items.length} câu</strong>.<br>Vui lòng nhập <strong>Mã lớp</strong> và chọn <strong>Họ tên của bạn</strong> để bắt đầu làm bài.`}
            </p>

            <div class="cbt-intro-field">
              <label for="classCodeInput">Mã lớp</label>
              <div class="cbt-intro-input-row">
                <input id="classCodeInput" class="cbt-intro-input" value="${escape(paramClassCode || `TEST-${course}`)}" placeholder="Ví dụ: ICxxxx" autocomplete="off" style="flex:1;font-weight:600">
                <button type="button" class="btn btn-secondary" id="loadRosterBtn" style="min-width:140px;font-weight:600">Tải danh sách</button>
              </div>
              <div id="classCodeStatus" class="cbt-intro-hint">Nhập đúng mã lớp do giáo viên cung cấp, sau đó bấm “Tải danh sách”.</div>
            </div>

            <div class="cbt-intro-field">
              <label for="studentSelectInput">Họ và tên học viên</label>
              <select id="studentSelectInput" class="cbt-intro-input" disabled style="background:#f8fafc">
                <option value="">— Hãy tải danh sách lớp trước —</option>
              </select>
              <div id="studentSelectStatus" class="cbt-intro-hint">Chọn đúng tên của bạn trong danh sách lớp. Tên sẽ được khóa khi nộp bài.</div>
            </div>

            <div id="soundcheckSection" class="cbt-soundcheck-box">
              <div class="cbt-soundcheck-header">
                <span style="display:inline-flex;align-items:center;gap:6px;">${ICONS.volume} Kiểm tra âm thanh trước khi làm bài</span>
                <span id="soundcheckStatus" class="cbt-soundcheck-badge">Chưa kiểm tra</span>
              </div>
              <p class="cbt-soundcheck-body">
                Bài thi có nội dung âm thanh. Hãy nhấn <strong>Nghe thử</strong> để kiểm tra loa hoặc tai nghe và điều chỉnh âm lượng phù hợp.
              </p>
              <div class="cbt-soundcheck-controls">
                <button type="button" class="btn btn-secondary" id="soundcheckPlayBtn" style="min-width:130px;background:white;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
                  ${ICONS.volume} Nghe thử
                </button>
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#475569">
                  <label for="soundcheckVolume">Âm lượng:</label>
                  <input id="soundcheckVolume" type="range" min="0" max="1" step="0.05" value="1" style="cursor:pointer;width:110px">
                  <span id="soundcheckVolumeLabel" style="font-weight:700;min-width:36px">100%</span>
                </div>
              </div>
            </div>

            <div class="cbt-intro-footer" style="display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:12px;">
              <button type="button" class="btn btn-secondary" id="viewResultBtn" disabled style="min-height:46px;padding:0 24px;font-size:15px;font-weight:700">Xem kết quả</button>
              <button type="button" class="btn-start-exam" id="startExamBtn" disabled>Bắt đầu làm bài →</button>
            </div>
          </div>
        </main>
        <main id="reviewMain" class="demo-width" hidden style="max-width:672px;margin:20px auto;padding:0 16px">
          <button type="button" class="btn btn-secondary" id="reviewBackBtn">← Chọn lại tên</button>
          <div id="reviewBody" aria-live="polite"></div>
        </main>
      </div>
    `;

    document.documentElement.classList.remove('cbt-mounting');

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
      .review-screen{background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,.04);margin-top:16px;line-height:1.5;color:#1e293b}
      .review-header h1{font-size:22px;margin:0 0 4px;color:#174266}.review-header p{margin:0;color:#64748b;font-size:14px}
      .review-total{margin:16px 0;padding:16px;border-radius:12px;background:#fff7f8;border:1px solid #f5d8dd;text-align:center}
      .review-total strong{display:block;font-size:32px;color:#db0829}
      .review-provisional{color:#8a5a00;font-weight:700}
      .review-section{border:1px solid #e2e8f0;border-radius:12px;margin-top:12px;overflow:hidden}
      .review-section-toggle{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;border:0;background:#fff;padding:12px 16px;text-align:left;font:inherit;cursor:pointer}
      .review-section-toggle strong{font-size:17px}.review-section-toggle span{font-size:13px;color:#64748b}
      .review-section-items{list-style:none;margin:0;padding:0 16px 8px}
      .review-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-top:1px solid #e2e8f0;font-size:14px}
      .review-verdict{flex:0 0 auto;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:700;background:#f1f5f9}
      .review-verdict.correct{background:#e8f7f0;color:#12805c}.review-verdict.incorrect{background:#fff0f2;color:#db0829}
      .review-verdict.partial,.review-verdict.pending,.review-verdict.manual_review{background:#fff7e8;color:#8a5a00}
      .review-answer{color:#64748b;word-break:break-word}.review-expected{margin-top:4px}.review-expected.muted{color:#64748b;font-size:13px}
      .review-feedback{margin-top:8px;padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px}
      .review-inline-error{margin-bottom:12px;padding:10px 12px;border-radius:10px;background:#fff0f2;border:1px solid #f5d8dd}
      .review-retry{margin-top:12px;min-height:44px;padding:0 20px;border-radius:10px;border:0;background:#db0829;color:#fff;font-weight:700;cursor:pointer}
      @media(max-width:520px){.content-demo main.demo-width>div{padding:20px!important}.demo-top{padding:10px 12px}.timer{display:none}#viewResultBtn,#startExamBtn{width:100%;margin:0!important}#loadRosterBtn{min-width:0!important;padding:0 12px!important}}
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
        if (assignment.title) {
          const h1 = document.querySelector('h1');
          if (h1) h1.textContent = assignment.title;
          const brandSub = document.querySelector('.brand-sub');
          if (brandSub) brandSub.textContent = assignment.title;
          document.title = assignment.title;
        }

        if (assignment.definition?.blocks?.length) {
          const dynTotal = getTotalItemCount(assignment.definition);
          const dynMinutes = Number(assignment.definition.timing?.totalMinutes || assignment.definition.durationMinutes) || 120;
          const introP = document.querySelector('.cbt-intro-sub') || document.querySelector('main.demo-width p') || document.querySelector('main p');
          if (introP) {
            introP.innerHTML = `Thời gian làm bài: <strong>${dynMinutes} phút</strong> · Tổng số câu hỏi: <strong>${dynTotal} câu</strong>.<br>Vui lòng nhập <strong>Mã lớp</strong> và chọn <strong>Họ tên của bạn</strong> để bắt đầu làm bài.`;
          }
          const timerSpan = document.querySelector('.top-actions .timer');
          if (timerSpan) {
            timerSpan.textContent = `${dynMinutes}:00`;
          }
        }
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

    if (paramClassCode) {
      void handleLoadRoster();
    }

    studentSelect.addEventListener('change', () => {
      const ref = studentSelect.value;
      if (ref) {
        const student = learningState.assignment?.roster?.find(s => s.studentRef === ref);
        learningState.studentRef = ref;
        learningState.studentName = student?.name || '';

        if (student?.retakeGrant) {
          const grant = student.retakeGrant;
          const now = Date.now();
          const expiresAtMs = grant.expiresAt ? new Date(grant.expiresAt).getTime() : 0;
          const availableFromMs = grant.availableFrom ? new Date(grant.availableFrom).getTime() : 0;

          if (grant.status === 'expired' || (expiresAtMs && expiresAtMs <= now)) {
            startBtn.disabled = true;
            const expTime = new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh'
            }).format(new Date(grant.expiresAt));
            studentStatus.textContent = `Quyền làm lại đã hết hạn (hạn chót: ${expTime}). Hãy liên hệ giáo viên để được cấp lại.`;
            studentStatus.style.color = '#dc2626';
            return;
          } else if (availableFromMs && availableFromMs > now) {
            startBtn.disabled = true;
            const openTime = new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh'
            }).format(new Date(grant.availableFrom));
            studentStatus.textContent = `Quyền làm lại chưa tới thời gian mở (bắt đầu lúc: ${openTime}).`;
            studentStatus.style.color = '#dc2626';
            return;
          } else {
            const defMinutes = Number(learningState.assignment?.definition?.timing?.totalMinutes) || 120;
            const remainingMinutes = Math.min(defMinutes, Math.max(0, Math.floor((expiresAtMs - now) / 60000)));
            const expTime = new Intl.DateTimeFormat('vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
              timeZone: 'Asia/Ho_Chi_Minh'
            }).format(new Date(grant.expiresAt));
            studentStatus.textContent = `Đã chọn: ${escape(learningState.studentName)}. Quyền làm lại: Thời gian làm bài thực tế là ${remainingMinutes} phút (hạn chót nộp bài: ${expTime}).`;
            studentStatus.style.color = '#16a34a';
            startBtn.disabled = false;
            return;
          }
        }

        startBtn.disabled = false;
        studentStatus.textContent = `Đã chọn: ${escape(learningState.studentName)}.`;
        studentStatus.style.color = '#16a34a';
      } else {
        startBtn.disabled = true;
        studentStatus.textContent = 'Chọn đúng tên của bạn trong danh sách lớp.';
        studentStatus.style.color = '#64748b';
      }
    });

    const soundcheckUrl = config.AUDIO?.soundcheck?.remote || 'https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/soundcheck.mp3';
    let soundcheckAudio = null;
    const soundcheckPlayBtn = document.querySelector('#soundcheckPlayBtn');
    const soundcheckStatus = document.querySelector('#soundcheckStatus');
    const soundcheckVolume = document.querySelector('#soundcheckVolume');
    const soundcheckVolumeLabel = document.querySelector('#soundcheckVolumeLabel');

    if (soundcheckPlayBtn) {
      soundcheckPlayBtn.addEventListener('click', () => {
        if (!soundcheckAudio) {
          soundcheckAudio = new Audio(soundcheckUrl);
          soundcheckAudio.volume = parseFloat(soundcheckVolume?.value || '1');
          soundcheckAudio.addEventListener('ended', () => {
            soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử lại`;
            if (soundcheckStatus) {
              soundcheckStatus.textContent = 'Âm thanh hoạt động tốt';
              soundcheckStatus.style.background = '#dcfce7';
              soundcheckStatus.style.color = '#15803d';
            }
          });
          soundcheckAudio.addEventListener('error', () => {
            soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử`;
            if (soundcheckStatus) {
              soundcheckStatus.textContent = 'Lỗi tải audio';
              soundcheckStatus.style.background = '#fee2e2';
              soundcheckStatus.style.color = '#dc2626';
            }
          });
        }
        if (soundcheckAudio.paused) {
          soundcheckAudio.currentTime = 0;
          soundcheckAudio.play().then(() => {
            soundcheckPlayBtn.innerHTML = 'Dừng nghe thử';
            if (soundcheckStatus) {
              soundcheckStatus.textContent = 'Đang phát âm thanh…';
              soundcheckStatus.style.background = '#dbeafe';
              soundcheckStatus.style.color = '#1d4ed8';
            }
          }).catch(err => {
            console.warn('Audio play error:', err);
            soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử`;
          });
        } else {
          soundcheckAudio.pause();
          soundcheckAudio.currentTime = 0;
          soundcheckPlayBtn.innerHTML = `${ICONS.volume} Nghe thử lại`;
          if (soundcheckStatus) {
            soundcheckStatus.textContent = 'Âm thanh hoạt động';
            soundcheckStatus.style.background = '#dcfce7';
            soundcheckStatus.style.color = '#15803d';
          }
        }
      });
    }

    if (soundcheckVolume) {
      soundcheckVolume.addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        if (soundcheckVolumeLabel) soundcheckVolumeLabel.textContent = `${Math.round(val * 100)}%`;
        if (soundcheckAudio) soundcheckAudio.volume = val;
      });
    }

    startBtn.addEventListener('click', async () => {
      if (soundcheckAudio) {
        soundcheckAudio.pause();
        soundcheckAudio.currentTime = 0;
      }
      // Exam Mode: vào toàn màn hình ngay trong cú bấm (trình duyệt chỉ cho phép trong user gesture).
      if (learningState.assignment?.exam?.enabled) requestFullscreen().catch(() => {});
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
        learningState.exam = startRes.attempt.exam || null;
        learningState.selfProctoring = startRes.attempt.selfProctoring || null;
        if (startRes.attempt.definition) learningState.definition = startRes.attempt.definition;
        const phase = examPhase(startRes.attempt);
        if (phase === 'waiting') {
          renderExamWaitingRoom();
          mountExamGuard();
          void connectExamEvents();
          return;
        }
        renderExamInterface();
        if (learningState.selfProctoring && learningState.status === 'active') mountExamGuard();
        if (phase === 'running') {
          mountExamGuard();
          void connectExamEvents();
        }
      } catch (err) {
        startBtn.disabled = false;
        startBtn.textContent = 'Bắt đầu làm bài →';
        alert(`Không mở được phiên làm bài: ${err.message}`);
      }
    });

    // --- XEM KẾT QUẢ: chỉ đọc qua /attempts/review + /attempts/result, không start, không âm thanh, không Exam Guard ---
    const viewBtn = document.querySelector('#viewResultBtn');
    const introMain = document.querySelector('main.demo-width:not(#reviewMain)');
    const reviewMain = document.querySelector('#reviewMain');
    const reviewBody = document.querySelector('#reviewBody');
    const REVIEW_POLL_MAX_MS = 45 * 60 * 1000;
    let reviewApi = null;
    let reviewModulePromise = null;
    let reviewModuleTries = 0;
    let reviewRetry = null;
    let reviewTimer = null;
    let reviewRun = 0;
    let reviewLastHtml = '';
    let reviewSubmittedAt = '';
    let reviewShown = false;

    // Lỗi nạp module không được nuốt: mỗi lần thử lại dùng URL mới để tránh cache lỗi.
    function loadReviewModule() {
      reviewModulePromise ||= import(`../34-shared/review-module.mjs?rev=20261017-review-v1${reviewModuleTries++ ? `&retry=${Date.now()}` : ''}`)
        .then(module => (reviewApi = module), error => { reviewModulePromise = null; throw error; });
      return reviewModulePromise;
    }
    loadReviewModule().catch(() => {});
    studentSelect.addEventListener('change', () => { viewBtn.disabled = !studentSelect.value; });

    function stopReviewPolling() {
      clearTimeout(reviewTimer);
      reviewTimer = null;
      reviewRun += 1;
    }

    // input: phần còn lại của reviewViewModel ({state, result, definition, error}).
    function renderReview(input) {
      if (!reviewApi) {
        loadReviewModule().then(() => renderReview(input), () => {
          reviewRetry = () => renderReview(input);
          reviewBody.innerHTML = '<section class="review-screen review-error" style="padding:16px"><p role="alert">Không tải được màn hình kết quả. Kiểm tra kết nối mạng rồi thử lại.</p><button type="button" class="review-retry" data-review-retry>Thử lại</button></section>';
          reviewLastHtml = '';
        });
        return;
      }
      const meta = {
        testTitle: document.querySelector('.brand-sub')?.textContent || title,
        studentName: learningState.studentName,
        className: learningState.className,
        submittedAt: reviewSubmittedAt
      };
      const html = reviewApi.reviewHtml(reviewApi.reviewViewModel({ meta, ...input }));
      if (html === reviewLastHtml) return; // polling không dựng lại khi nội dung không đổi
      const expanded = [...reviewBody.querySelectorAll('[data-review-section][aria-expanded="true"]')].map(btn => btn.dataset.reviewSection);
      reviewBody.innerHTML = reviewLastHtml = html;
      expanded.forEach(id => {
        reviewBody.querySelector(`[data-review-section="${id}"]`)?.setAttribute('aria-expanded', 'true');
        const list = document.getElementById(id);
        if (list) list.hidden = false;
      });
    }

    const reviewError = (error, retry) => { reviewRetry = retry; renderReview({ state: 'error', error }); };

    async function openReview() {
      if (!learningState.studentRef) return;
      stopReviewPolling();
      const run = reviewRun;
      reviewLastHtml = '';
      reviewSubmittedAt = '';
      reviewShown = false;
      introMain.hidden = true;
      reviewMain.hidden = false;
      renderReview({ state: 'loading' });
      try {
        const review = await apiRequest('/attempts/review', { testToken, courseCode: learningState.courseCode, studentRef: learningState.studentRef });
        if (run !== reviewRun) return;
        if (review.status === 'not_submitted') return renderReview({ state: 'no_submission' });
        if (review.status !== 'submitted_unpublished' && review.status !== 'published') throw new Error(`Trạng thái không hợp lệ: ${review.status}`);
        reviewSubmittedAt = review.submittedAt || '';
        if (review.status === 'submitted_unpublished') renderReview({ state: 'not_released' });
        pollReview(review.attemptToken, run, Date.now(), 0);
      } catch (error) {
        if (run === reviewRun) reviewError(error, openReview);
      }
    }

    // Chưa công bố: hỏi chậm 15s để tự cập nhật khi giảng viên công bố; đã công bố nhưng còn câu chờ chấm: 2s.
    async function pollReview(attemptToken, run, startedAt, delay) {
      if (delay) await new Promise(resolve => { reviewTimer = setTimeout(resolve, delay); });
      if (run !== reviewRun) return;
      let next = 15_000;
      try {
        const res = await apiRequest('/attempts/result', { attemptToken });
        if (run !== reviewRun) return;
        const result = res.result;
        if (result?.publication?.published && Array.isArray(result.items)) {
          // Chế độ thi 'waiting' không trả definition lúc resolve; dùng definition từ /attempts/result trước.
          const definition = res.definition || learningState.definition;
          reviewShown = true;
          renderReview({ state: 'ready', result, definition: { blocks: definition?.blocks, sections: definition?.sections } });
          if (['complete', 'manual_review'].includes(result.gradingStatus) && !result.summary?.pendingItemCount) return;
          next = 2000;
        }
      } catch (error) {
        if (run !== reviewRun) return;
        if (error.status === 429 && reviewShown) {
          next = 30_000; // đã có kết quả trên màn hình: chỉ giãn nhịp hỏi
        } else {
          // Chưa có gì để hiện (hoặc lỗi bền): dừng polling và hiện Thử lại.
          reviewError(error, () => { stopReviewPolling(); renderReview({ state: 'loading' }); pollReview(attemptToken, reviewRun, Date.now(), 0); });
          return;
        }
      }
      if (Date.now() - startedAt < REVIEW_POLL_MAX_MS) void pollReview(attemptToken, run, startedAt, next);
    }

    viewBtn.addEventListener('click', openReview);
    document.querySelector('#reviewBackBtn').addEventListener('click', () => {
      stopReviewPolling();
      reviewMain.hidden = true;
      introMain.hidden = false;
    });
    reviewMain.addEventListener('click', event => {
      if (event.target.closest('[data-review-retry]')) reviewRetry?.();
      const toggle = event.target.closest('[data-review-section]');
      if (toggle) {
        const list = document.getElementById(toggle.dataset.reviewSection);
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        if (list) list.hidden = expanded;
        toggle.setAttribute('aria-expanded', String(!expanded));
      }
    });

    void handleLoadRoster();
    return;
  }

  // --- RENDER GIAO DIỆN BÀI THI CHÍNH THỨC / PREVIEW ---
  renderExamInterface();

  function renderExamInterface() {
    const isDynamic = Boolean(learningState.definition?.blocks?.length);
    const examTitle = isDynamic ? (learningState.definition.title || learningState.assignment?.title || title) : title;
    const examDuration = isDynamic
      ? (Number(learningState.definition.timing?.totalMinutes || learningState.definition.durationMinutes) || 120)
      : (Number(form.durationMinutes) || 120);

    const examSections = isDynamic
      ? learningState.definition.blocks.map((b, i) => b.title || `Phần ${i + 1}`)
      : sections;
    if (!examSections.includes(activeSection)) {
      activeSection = examSections[0];
    }

    document.title = `IZONE · ${isLearningMode ? 'Thi CBT' : 'Demo'} · ${examTitle}`;
    const headerSub = isLearningMode
      ? `Thí sinh: <strong>${escape(learningState.studentName)}</strong> · Lớp: <strong>${escape(learningState.className)}</strong>`
      : `Bài thi demo · ${examDuration} phút theo đề`;

    const noticeBanner = isLearningMode
      ? selfProctoringBannerHtml(learningState.selfProctoring)
      : `<div class="demo-notice">
          Bản xem thử để duyệt đề. Câu trả lời chỉ lưu trên trình duyệt này; nộp thử chưa chấm điểm hoặc gửi lên hệ thống.
          Dùng link thi có token do người phụ trách cung cấp để mở phiên chấm điểm.
        </div>`;

    let dynamicExamControls = null;

    if (isDynamic) {
      document.body.innerHTML = `
        <div class="candidate-simulation-shell content-demo cbt-exam-shell">
          <header class="topbar simulation-topbar cbt-topbar">
            <div class="topbar-inner demo-top cbt-topbar-inner">
              <div class="brand cbt-brand">
                <div class="brand-mark cbt-brand-mark">IZ</div>
                <div class="brand-copy cbt-brand-copy">
                  <div class="brand-title cbt-brand-title">IZONE · ${escape((examTitle || '').replace(/^(?:IZONE\s*[·•\-:]\s*)+/gi, ''))}</div>
                  <div class="brand-sub cbt-brand-sub">${headerSub}</div>
                </div>
              </div>
              <div class="top-actions cbt-top-actions">
                <span id="demo-save" role="status" class="cbt-save-pill">Đã lưu</span>
                <div class="cbt-font-toggles">
                  <button type="button" class="icon-btn cbt-font-btn" id="demo-font-down" aria-label="Giảm cỡ chữ" title="Giảm cỡ chữ">A−</button>
                  <button type="button" class="icon-btn cbt-font-btn" id="demo-font-up" aria-label="Tăng cỡ chữ" title="Tăng cỡ chữ">A+</button>
                </div>
                <div class="cbt-timer-container">
                  <span class="cbt-timer-icon">${ICONS.clock}</span>
                  <span class="cbt-timer" id="examTimerDisplay">${examDuration}:00</span>
                </div>
                <button type="button" class="btn btn-primary btn-submit-top cbt-btn-submit" id="demo-submit-top">${isLearningMode ? (state.submittedAt ? 'Đã nộp bài' : 'Nộp bài') : 'Nộp thử'}</button>
              </div>
            </div>
            <div class="section-nav-wrap cbt-section-nav-wrap">
              <nav class="section-nav simulation-nav-bar cbt-section-nav-bar" id="sectionNavContainer" aria-label="Các phần bài thi">
                ${renderSectionNavPills(learningState.definition, 0)}
              </nav>
            </div>
          </header>

          <main class="demo-width cbt-main-content" style="max-width:1380px;margin:0 auto;padding:20px 24px;">
            ${noticeBanner}
            <div id="demo-result" class="cbt-result-box" style="display:none;" hidden></div>
            <div id="demo-ai-card" hidden style="margin:20px 0;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 20px rgba(0,0,0,0.04)"></div>

            <div class="exam-layout cbt-exam-layout">
              <div class="main-column simulation-viewport cbt-viewport" id="examMainViewport"></div>
              <div id="examSidePanelContainer" class="cbt-side-container">
                ${renderSidePanel(learningState.definition, state, 0)}
              </div>
            </div>
          </main>

          <dialog id="demo-confirm">
            <h2>${isLearningMode ? 'Xác nhận nộp bài thi?' : 'Nộp bài thử?'}</h2>
            <p id="demo-confirm-text"></p>
            <p>${isLearningMode ? 'Sau khi nộp, hệ thống và AI sẽ tiến hành chấm điểm. Bạn không thể chỉnh sửa bài làm.' : 'Bạn có thể xem lại câu trả lời. Demo chưa chấm điểm.'}</p>
            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
              <button type="button" class="btn btn-secondary" id="demo-cancel">Quay lại bài</button>
              <button type="button" class="btn btn-primary" id="demo-confirm-submit">${isLearningMode ? 'Xác nhận nộp bài' : 'Xác nhận nộp thử'}</button>
            </div>
          </dialog>
        </div>
      `;

      renderDynamicExam(learningState.definition, document.querySelector('#examMainViewport'), {
        state,
        activeSection,
        onAnswerChange: () => {
          persist();
          update();
        }
      });

      dynamicExamControls = initDynamicExamInteractions(document.body, {
        definition: learningState.definition,
        state,
        onAnswerChange: () => {
          persist();
          update();
        },
        onSectionChange: (secName) => {
          activeSection = secName;
        }
      });
    } else {
      document.body.innerHTML = `<div class="content-demo">
        <header class="topbar"><div class="topbar-inner demo-top"><div class="brand"><div class="brand-mark">IZ</div><div class="brand-copy"><div class="brand-title">IZONE · ${escape(examTitle)}</div><div class="brand-sub">${headerSub}</div></div></div></div><nav class="section-nav demo-tabs" aria-label="Các phần bài">${examSections.map(sec=>`<button class="section-tab" data-demo-go="${escape(sec)}">${isDynamic ? escape(sec) : sectionLabels[sec]} <span class="tab-count" data-demo-tab-count="${escape(sec)}"></span></button>`).join('')}</nav></header>
        <main class="demo-width">
          ${noticeBanner}
          <div class="demo-toolbar">
            <span id="demo-progress" aria-live="polite"></span>
            <span id="demo-save" role="status"></span>
            <button type="button" class="btn btn-primary" id="demo-submit">${isLearningMode ? 'Nộp bài' : 'Nộp thử'}</button>
          </div>
          <div id="demo-result" class="demo-notice" hidden></div>
          <div id="demo-ai-card" hidden style="margin:20px 0;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:24px;box-shadow:0 8px 20px rgba(0,0,0,0.04)"></div>
          <div class="demo-layout"><aside class="side-panel"><div class="panel-card"><strong>Tiến độ làm bài</strong><div class="progress-track"><div class="progress-fill" id="demo-fill"></div></div><nav aria-label="Điều hướng bài thi">${examSections.map(sec=>`<button class="section-tab" data-demo-go="${escape(sec)}">${isDynamic ? escape(sec) : sectionLabels[sec]} <span data-demo-section-count="${escape(sec)}"></span></button>`).join('')}</nav></div><div class="panel-card"><strong>Lưu ý khi làm bài</strong><p class="meta">Câu trả lời được lưu tự động. Chuyển phần không mất đáp án. Kiểm tra các ô chưa trả lời trước khi nộp bài.</p></div></aside>
          <div class="demo-main">${groupSections(form, true)}<div class="bottom-actions demo-bottom"><button class="btn btn-secondary" id="demo-prev">← Phần trước</button><button class="btn btn-primary" id="demo-next">Phần tiếp →</button></div></div></div>
        </main><dialog id="demo-confirm"><h2>${isLearningMode ? 'Xác nhận nộp bài thi?' : 'Nộp bài thử?'}</h2><p id="demo-confirm-text"></p><p>${isLearningMode ? 'Sau khi nộp, hệ thống và AI sẽ tiến hành chấm điểm. Bạn không thể chỉnh sửa bài làm.' : 'Bạn có thể xem lại câu trả lời. Demo chưa chấm điểm.'}</p><button type="button" class="btn btn-secondary" id="demo-cancel">Quay lại bài</button> <button type="button" class="btn btn-primary" id="demo-confirm-submit">${isLearningMode ? 'Xác nhận nộp bài' : 'Xác nhận nộp thử'}</button></dialog>
      </div>`;

      document.querySelector('.demo-top').insertAdjacentHTML('beforeend',`<div class="top-actions"><button type="button" class="icon-btn" id="demo-font-down" aria-label="Giảm cỡ chữ">A−</button><button type="button" class="icon-btn" id="demo-font-up" aria-label="Tăng cỡ chữ">A+</button><span class="timer" id="examTimerDisplay">${examDuration}:00</span></div>`);
      document.querySelector('.top-actions').prepend(document.querySelector('#demo-save'));
    }

    // Đếm ngược thời gian làm bài
    const durationMinutes = Number(examDuration) || 120;
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
        timerDisplay.classList.add('is-submitted');
        if (examTimerInterval) clearInterval(examTimerInterval);
        return;
      }
      const now = Date.now();
      // Exam Mode cập nhật learningState.expiresAt khi giáo viên gia hạn.
      const remainingMs = Math.max(0, (learningState.expiresAt || examEndTime) - now);
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

    if (!isDynamic) {
      for(const section of sections) {
        const groups=form.groups.filter(group=>sectionKey(group)===section);
        document.querySelector(`[data-demo-page="${section}"]`)?.insertAdjacentHTML('beforebegin',`<div class="section-hero" data-demo-page="${section}"><div class="section-kicker">${escape(title)}</div><h2>${sectionLabels[section]}</h2><p>${groups.length} nhóm bài · ${groups.reduce((count,group)=>count+group.items.length,0)} ô trả lời</p></div>`);
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
        .content-demo .demo-table-wrapper{margin:20px 0;background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
        .content-demo .demo-table-title{padding:14px 18px;font-family:Geologica,sans-serif;font-size:16px;font-weight:700;color:#1e293b;background:#f8fafc;border-bottom:2px solid #e2e8f0}
        .content-demo .demo-cloze-table{width:100%;border-collapse:collapse}
        .content-demo .demo-table-header{width:28%;min-width:160px;vertical-align:top;text-align:left;padding:14px 18px;background:#f8fafc;font-weight:600;font-size:14px;color:#334155;border-bottom:1px solid #e2e8f0;border-right:1px solid #e2e8f0}
        .content-demo .demo-table-cell{vertical-align:top;padding:14px 18px;line-height:2.6;color:#1e293b;border-bottom:1px solid #e2e8f0}
        .content-demo .demo-table-cell br{line-height:1.8}
        .content-demo .demo-cloze-table tr:last-child .demo-table-header,.content-demo .demo-cloze-table tr:last-child .demo-table-cell{border-bottom:0}

        .content-demo .demo-order-container{margin:18px 0;display:grid;gap:18px}
        .content-demo .demo-order-sentences{display:grid;gap:10px}
        .content-demo .demo-order-sentence-card{display:flex;align-items:flex-start;gap:12px;padding:12px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;line-height:1.5}
        .content-demo .demo-order-letter{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;background:var(--color-primary);color:white;font-weight:700;font-size:13px;flex-shrink:0}
        .content-demo .demo-order-text{flex:1;color:#334155;font-weight:500;padding-top:3px}
        .content-demo .demo-order-slots{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;padding:16px;background:#f1f5f9;border-radius:12px}
        .content-demo .demo-order-slot{display:flex;flex-direction:column;gap:6px}
        .content-demo .demo-order-slot-label{font-size:12px;font-weight:700;color:#475569}
        .content-demo .demo-order-slot select{width:100%;min-height:40px;border:1px solid #cbd5e1;border-radius:8px;padding:6px 10px;background:white;font-weight:600}

        .content-demo .demo-picture-grid .demo-prompt-row .demo-lines{font-weight:600;letter-spacing:0.5px}
        @media(max-width:900px){.content-demo .demo-layout{grid-template-columns:1fr}.content-demo .demo-layout aside{display:none}.content-demo .demo-main{grid-column:1}}
        @media(max-width:600px){.content-demo .demo-picture-grid{grid-template-columns:1fr}.content-demo .demo-vocab-grid{gap:0 10px}.content-demo .demo-question{min-width:0}.content-demo .demo-question input,.content-demo .demo-question select{min-width:0}.content-demo .demo-inline input{width:120px}.content-demo .demo-tabs{padding:8px 12px}.content-demo .exercise-head{gap:8px}.content-demo .demo-cloze{line-height:3.2}.content-demo .demo-top nav{flex-shrink:0}}
      `;
      document.head.append(layoutStyle);
    }

    for (const button of document.querySelectorAll('[data-demo-audio-start]')) {
      const gateId = button.dataset.demoAudioStart;
      const audio = document.querySelector(`[data-demo-audio-player="${gateId}"]`);
      const status = document.querySelector(`[data-demo-audio-status="${gateId}"]`);
      let started = false;
      let lastGoodTime = 0;
      document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
      if (status) status.textContent = 'Đã mở khóa nội dung câu hỏi để kiểm tra đề.';
      audio.addEventListener('play', () => {
        started = true;
        document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
        document.querySelectorAll('.demo-audio-linked').forEach(notice => {
          if (notice.closest('.demo-section')?.querySelector(`[data-demo-audio-content="${gateId}"]`)) notice.hidden = true;
        });
        button.hidden = true;
        status.textContent = 'Audio đang phát.';
      });
      audio.addEventListener('timeupdate', () => { if (!audio.seeking) lastGoodTime = audio.currentTime; });
      audio.addEventListener('seeking', () => {
        if (started && Math.abs(audio.currentTime - lastGoodTime) > 0.75) audio.currentTime = lastGoodTime;
      });
      audio.addEventListener('pause', () => {
        if (started && !audio.ended && !examAudioHold) audio.play().catch(() => {});
      });
      audio.addEventListener('ended', () => { status.textContent = 'Audio đã phát xong · bài tập vẫn mở để hoàn thành.'; });
      audio.addEventListener('error', () => {
        button.disabled = false;
        button.textContent = 'Thử phát lại audio';
        status.textContent = 'Chưa tải được audio (nội dung câu hỏi vẫn mở để bạn kiểm tra).';
        document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
      });
      button.addEventListener('click', async () => {
        button.disabled = true;
        status.textContent = 'Đang tải audio…';
        try {
          await audio.play();
        } catch {
          button.disabled = false;
          button.textContent = 'Thử phát lại audio';
          status.textContent = 'Trình duyệt chưa phát được audio (nội dung câu hỏi vẫn mở để bạn kiểm tra).';
          document.querySelectorAll(`[data-demo-audio-content="${gateId}"]`).forEach(content => { content.hidden = false; });
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
      .content-demo .demo-question textarea{border-radius:10px;min-height:76px;resize:vertical;line-height:1.5}
      .content-demo .demo-multipart-card{border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;margin:16px 0;background:#ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.03)}
      .content-demo .demo-multipart-stem{font-size:15px;font-weight:600;color:var(--color-navy,#174266);line-height:1.55}
      .content-demo .demo-subfield-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px}
      .content-demo .demo-subfield{display:flex;flex-direction:column;gap:6px}
      .content-demo .demo-subfield-label{font-size:13px;font-weight:600;color:#475569}
      .content-demo .demo-subfield input{min-height:42px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px}
      .content-demo .demo-subparts-list{display:flex;flex-direction:column;gap:14px;margin-top:14px}
      .content-demo .demo-subpart-item{display:flex;flex-direction:column;gap:6px}
      .content-demo .demo-subpart-label{font-size:14px;font-weight:500;color:#1e293b;line-height:1.45}
      .content-demo .demo-subpart-item input{min-height:42px;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px}
      .content-demo .demo-subpart-item textarea{min-height:64px;resize:vertical;line-height:1.5;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px}
      .content-demo .demo-picture-grid .demo-question{border:1px solid #e9ebee;border-radius:12px;padding:14px;margin-bottom:12px}
      .content-demo .demo-picture-grid .demo-question img{max-width:140px;max-height:120px;margin:12px auto}
      .content-demo .demo-top .top-actions{display:flex;align-items:center;gap:8px}
      .content-demo .demo-top .icon-btn{width:40px;height:40px;padding:0;border-radius:10px}
      .content-demo #demo-save{font-size:12px;color:var(--color-text-secondary);max-width:180px}
      .content-demo [data-demo-page][hidden]{display:none}
      @media(max-width:760px){.content-demo .demo-top{flex-direction:row;flex-wrap:wrap}.content-demo .demo-top .top-actions{margin-left:auto}.content-demo #demo-save{display:none}.content-demo .demo-section{padding:18px}.content-demo .timer{min-width:80px}.content-demo .section-hero{padding:20px}.content-demo .demo-multipart-card{padding:14px}.content-demo .demo-subfield-grid{grid-template-columns:1fr;gap:10px}}
    `;
    document.head.append(canonicalStyle);

    let fontScale = parseFloat(localStorage.getItem('izone_cbt_font_scale') || '1') || 1;
    if (fontScale < 0.85 || fontScale > 1.35) fontScale = 1;

    const applyFontScale = (scale) => {
      fontScale = Math.max(0.85, Math.min(1.3, Math.round(scale * 100) / 100));
      document.documentElement.style.setProperty('--font-scale', String(fontScale));
      document.documentElement.style.fontSize = `${16 * fontScale}px`;
      const btnDown = document.querySelector('#demo-font-down');
      const btnUp = document.querySelector('#demo-font-up');
      if (btnDown) {
        btnDown.disabled = fontScale <= 0.85;
        btnDown.title = `Thu nhỏ cỡ chữ (${Math.round(fontScale * 100)}%)`;
      }
      if (btnUp) {
        btnUp.disabled = fontScale >= 1.3;
        btnUp.title = `Phóng to cỡ chữ (${Math.round(fontScale * 100)}%)`;
      }
      try {
        localStorage.setItem('izone_cbt_font_scale', String(fontScale));
      } catch {}
    };

    const resizeFont = (delta) => applyFontScale(fontScale + delta);

    applyFontScale(fontScale);

    const btnFontDown = document.querySelector('#demo-font-down');
    const btnFontUp = document.querySelector('#demo-font-up');
    if (btnFontDown) btnFontDown.addEventListener('click', () => resizeFont(-0.06));
    if (btnFontUp) btnFontUp.addEventListener('click', () => resizeFont(0.06));
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
      if (isDynamic) {
        if (dynamicExamControls && typeof dynamicExamControls.updateAnsweredState === 'function') {
          dynamicExamControls.updateAnsweredState();
        }
        const total = getTotalItemCount(learningState.definition);
        const done = getAnsweredCount(learningState.definition, state.answers);
        if (query('#demo-progress')) query('#demo-progress').textContent = `${done}/${total} câu đã trả lời`;
        if (query('#demo-fill')) query('#demo-fill').style.width = `${total ? Math.round(done / total * 100) : 0}%`;

        learningState.definition.blocks.forEach((block, bIdx) => {
          const secName = block.title || `Phần ${bIdx + 1}`;
          const bItems = block.items || [];
          let bDone = 0;
          for (const it of bItems) {
            const val = state.answers[it.itemVersionId];
            if (val !== undefined && val !== null) {
              if (Array.isArray(val) && val.some(v => typeof v === 'string' && v.trim() !== '')) bDone++;
              else if (typeof val === 'object' && Object.values(val).some(v => typeof v === 'string' && v.trim() !== '')) bDone++;
              else if (typeof val === 'string' && val.trim() !== '') bDone++;
            }
          }
          document.querySelectorAll(`[data-demo-section-count="${secName}"], [data-demo-tab-count="${secName}"]`).forEach(count => {
            count.textContent = `${bDone}/${bItems.length}`;
          });
        });
        if (query('#demo-submit')) query('#demo-submit').disabled = Boolean(state.submittedAt);
        if (query('#demo-submit-top')) query('#demo-submit-top').disabled = Boolean(state.submittedAt);
        if (query('#demo-result')) query('#demo-result').hidden = !state.submittedAt;
        return;
      }

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

    function handleOpenSubmitDialog() {
      if (isDynamic) {
        const total = getTotalItemCount(learningState.definition);
        const done = getAnsweredCount(learningState.definition, state.answers);
        const missing = total - done;
        query('#demo-confirm-text').textContent = missing > 0
          ? `Còn ${missing} câu chưa trả lời (đã làm ${done}/${total} câu). Bạn có chắc chắn muốn nộp bài?`
          : `Bạn đã trả lời đầy đủ ${total}/${total} câu. Bạn có chắc chắn muốn nộp bài?`;
        query('#demo-confirm').showModal();
        return;
      }
      const missing=items.filter(item=>!String(state.answers[item.id]||'').trim()).length;
      query('#demo-confirm-text').textContent=`Còn ${missing} ô chưa trả lời. Bạn có chắc chắn muốn nộp bài?`;
      query('#demo-confirm').showModal();
    }

    if (query('#demo-submit')) {
      query('#demo-submit').addEventListener('click', handleOpenSubmitDialog);
    }
    if (query('#demo-submit-top')) {
      query('#demo-submit-top').addEventListener('click', handleOpenSubmitDialog);
    }
    query('#demo-cancel').addEventListener('click',()=>query('#demo-confirm').close());

    function openDynamicResultsModal(result) {
      const summary = result?.summary || {};
      const scoreFinal = summary.scoreFinal === true && result.gradingStatus === 'complete';
      const isManualReview = result.gradingStatus === 'manual_review';
      const items = result?.items || [];
      const definition = learningState.definition || {};

      // Map definition items
      const defItemsMap = new Map();
      for (const block of (definition.blocks || [])) {
        for (const it of (block.items || [])) {
          defItemsMap.set(it.itemVersionId, it);
        }
      }

      // Mark question navigator buttons with is-correct / is-incorrect
      items.forEach(it => {
        const qnavBtn = document.querySelector(`.btn-qnav[data-item-id="${it.itemVersionId}"]`);
        if (qnavBtn) {
          qnavBtn.classList.remove('is-correct', 'is-incorrect');
          if (it.verdict === 'correct') {
            qnavBtn.classList.add('is-correct');
          } else if (it.verdict === 'incorrect' || it.verdict === 'partial') {
            qnavBtn.classList.add('is-incorrect');
          }
        }
      });

      // Prepare breakdown rows
      const rowsHtml = items.map(it => {
        const defItem = defItemsMap.get(it.itemVersionId) || {};
        const isCorrect = it.verdict === 'correct';
        const isPartial = it.verdict === 'partial';
        const typeLabel = defItem.pedagogicalTypeCode === 'pronunciation_choice' ? 'Phát âm' :
          (defItem.pedagogicalTypeCode === 'sentence_rewrite' ? 'Biến đổi câu' :
          (defItem.pedagogicalTypeCode === 'sentence_reorder' ? 'Sắp xếp câu' :
          (defItem.interactionType === 'correction_pair' ? 'Sửa lỗi sai' :
          (defItem.interactionType === 'text_select_pair' ? 'Cặp từ vựng' :
          (defItem.interactionType === 'single_choice' ? 'Trắc nghiệm' :
          (defItem.interactionType === 'multi_choice_group' ? 'Chọn nhiều' :
          (defItem.interactionType === 'short_text' ? 'Điền từ' : 'Tự luận')))))));

        const candidateAnswer = (it.rawAnswer !== undefined && it.rawAnswer !== null && String(it.rawAnswer).trim() !== '')
          ? String(it.rawAnswer)
          : '(Chưa trả lời)';
        const expectedAnswer = it.expectedAnswer !== undefined && it.expectedAnswer !== null
          ? (Array.isArray(it.expectedAnswer) ? it.expectedAnswer.join(', ') : String(it.expectedAnswer))
          : '—';

        const rowClass = isCorrect ? 'row-correct' : (isPartial ? 'row-partial' : 'row-incorrect');
        const verdictBadge = isCorrect
          ? '<span class="status-correct">✓ Đúng</span>'
          : (isPartial ? '<span class="status-partial">Đúng 50%</span>' : '<span class="status-incorrect">✕ Chưa đúng</span>');

        return `
          <tr class="${rowClass}">
            <td><strong>Câu ${it.position}</strong></td>
            <td><span class="type-badge">${escape(typeLabel)}</span></td>
            <td>${escape(candidateAnswer)}</td>
            <td><span class="correct-badge">${escape(expectedAnswer)}</span></td>
            <td><strong>${it.scoreEarned ?? 0}/${it.maxScore ?? 1}đ</strong></td>
            <td>${verdictBadge}</td>
          </tr>
        `;
      }).join('');

      let modal = document.querySelector('#simulation-results-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'simulation-results-modal';
        modal.className = 'simulation-results-modal';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="sim-results-dialog">
          <header class="sim-results-header">
            <div class="sim-results-title-wrap">
              <span class="sim-results-badge">Kết quả bài thi</span>
              <h3>Bảng tổng hợp chấm điểm</h3>
            </div>
            <button type="button" class="btn-close-sim-results" id="btn-close-sim-results" aria-label="Đóng">✕</button>
          </header>
          <div class="sim-results-body" id="sim-results-body">
            <div class="sim-score-banner">
              <div class="score-banner-title">Tổng điểm đạt được:</div>
              <div class="score-banner-value">${summary.scoreEarned ?? 0}/${summary.maxScore ?? 0}đ</div>
              <div class="score-banner-sub">
                Thí sinh: <strong>${escape(learningState.studentName || '')}</strong> · Lớp: <strong>${escape(learningState.className || '')}</strong> · Trạng thái: <strong>${scoreFinal ? 'Hoàn tất chấm điểm' : (isManualReview ? 'Chờ giảng viên duyệt' : 'Đang xử lý')}</strong>
              </div>
            </div>
            <div class="sim-breakdown-table-wrap">
              <table class="sim-breakdown-table">
                <thead>
                  <tr>
                    <th>Câu</th>
                    <th>Dạng câu</th>
                    <th>Bài làm của bạn</th>
                    <th>Đáp án đúng</th>
                    <th>Điểm</th>
                    <th>Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || '<tr><td colspan="6" style="text-align:center;padding:16px;">Đang cập nhật chi tiết...</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
          <footer class="sim-results-footer">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-retest-simulation">Xem lại trên bài thi</button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-done-simulation-results">Đóng kết quả</button>
          </footer>
        </div>
      `;

      modal.style.display = 'flex';

      const closeHandler = () => {
        modal.style.display = 'none';
      };
      modal.querySelectorAll('#btn-close-sim-results, #btn-retest-simulation, #btn-done-simulation-results').forEach(b => {
        b.addEventListener('click', closeHandler);
      });

      // Show persistent reopening card in #demo-result
      const resBanner = query('#demo-result');
      if (resBanner) {
        resBanner.hidden = false;
        resBanner.style.background = '#f0fdf4';
        resBanner.style.borderColor = '#bbf7d0';
        resBanner.style.color = '#166534';
        resBanner.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div>
              <strong>Đã hoàn tất chấm điểm!</strong> Tổng điểm đạt được: <strong>${summary.scoreEarned ?? 0}/${summary.maxScore ?? 0}đ</strong> (${scoreFinal ? 'Điểm chính thức' : 'Điểm tạm tính'}).
            </div>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-open-results-modal" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;">
              ${ICONS.barChart} Xem lại Bảng tổng hợp chấm điểm
            </button>
          </div>
        `;
        const reOpenBtn = resBanner.querySelector('#btn-open-results-modal');
        if (reOpenBtn) {
          reOpenBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
          });
        }
      }
    }

    function renderAiResultCard(result) {
      const isPublished = Boolean(result?.publication?.published);
      const card = query('#demo-ai-card');
      card.hidden = false;

      if (isDynamic) {
        if (!isPublished) {
          card.innerHTML = `
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:24px;text-align:center;color:#166534">
              <div style="font-size:32px;margin-bottom:6px">✓</div>
              <h3 style="color:#15803d;margin:0 0 8px 0;font-size:19px;font-weight:700">Bài làm đã được nộp thành công!</h3>
              <p style="margin:0;font-size:14px;color:#166534;line-height:1.6">
                Hệ thống đã ghi nhận an toàn bài thi của bạn.<br>
                Điểm số sẽ được giáo viên công bố sau khi hoàn tất chấm điểm. Bạn có thể xem lại bài làm bên dưới.
              </p>
            </div>
          `;
          return;
        }

        // isPublished is true -> Show Candidate Simulation Results Modal
        openDynamicResultsModal(result);
        return;
      }

      if (!isPublished) {
        card.innerHTML = `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:28px 24px;text-align:center;color:#166534">
            <div style="font-size:36px;margin-bottom:8px">✓</div>
            <h3 style="color:#15803d;margin:0 0 10px 0;font-size:20px;font-weight:700">Bài làm đã được nộp thành công!</h3>
            <p style="margin:0;font-size:15px;color:#166534;line-height:1.6">
              Hệ thống đã ghi nhận an toàn bài thi của bạn.<br>
              Kết quả và điểm số sẽ được giáo viên công bố sau khi hoàn tất chấm điểm.
            </p>
          </div>
        `;
        return;
      }
      const vm = resultViewModel(result);
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
            <h4 style="margin:0 0 8px 0;font-size:14px;color:#334155">Tổng kết đánh giá bài làm</h4>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">
              Bài thi đã hoàn tất chấm điểm toàn diện các phần thi. Các câu trả lời bên dưới đã được lưu trữ vĩnh viễn trên hệ thống.
            </p>
          </div>
        ` : isManualReview ? `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span class="cbt-card-icon" style="color:#c2410c">${ICONS.book}</span>
            <div style="font-size:13px;color:#9a3412;line-height:1.5">
              Hệ thống đã hoàn tất chấm điểm. Một số câu tự luận được chuyển sang trạng thái <strong>Chờ giảng viên kiểm tra</strong>. Điểm chính thức sẽ được cập nhật sau khi giảng viên xác nhận.
            </div>
          </div>
        ` : `
          <div style="background:#eff6ff;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <span class="cbt-card-icon" style="color:#2563eb">${ICONS.clock}</span>
            <div style="font-size:13px;color:#1e40af;line-height:1.5">
              Hệ thống đang tiến hành chấm các câu tự luận. Điểm chính thức sẽ tự động cập nhật ngay tại đây (còn lại ${vm.pendingItemCount} câu đang xử lý).
            </div>
          </div>
        `}
        <div class="learning-result-grid">${resultDetailsHtml(result, withLocalGroupLabels(learningState.definition, form))}</div>
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
          if (!res.result.publication?.published) {
            if (learningState.pollTimer) {
              clearInterval(learningState.pollTimer);
              learningState.pollTimer = null;
            }
          } else if (res.result.gradingStatus === 'complete' || res.result.gradingStatus === 'manual_review' || res.result.summary?.scoreFinal) {
            if (learningState.pollTimer) {
              clearInterval(learningState.pollTimer);
              learningState.pollTimer = null;
            }
          }
        }
      } catch {}
    }

    learningState.onAutoSubmitted = text => {
      state.submittedAt = Date.now();
      stopExamConnections();
      persist();
      update();
      if (examTimerInterval) clearInterval(examTimerInterval);
      if (timerDisplay) { timerDisplay.textContent = 'Đã nộp'; timerDisplay.classList.remove('warn'); }
      query('#demo-result').hidden = false;
      query('#demo-result').textContent = text;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
          // Dừng Exam Guard và tín hiệu kết nối: lượt đã nộp không còn là thiết bị đang làm bài.
          learningState.status = 'submitted';
          stopExamConnections();
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
          query('#demo-result').innerHTML = `<strong>Nộp bài thành công!</strong> Bài làm của bạn đã được ghi nhận an toàn trên hệ thống.`;

          if (isDynamic) {
            document.querySelectorAll('#examMainViewport input, #examMainViewport select, #examMainViewport textarea, #examMainViewport button').forEach(el => {
              if (el.id !== 'demo-prev' && el.id !== 'demo-next') {
                el.disabled = true;
              }
            });
            const topSubmit = query('#demo-submit-top');
            if (topSubmit) {
              topSubmit.disabled = true;
              topSubmit.textContent = 'Đã nộp bài';
            }
          }

          if (res.result) {
            renderAiResultCard(res.result);
          }
          if (res.result?.publication?.published && !learningState.pollTimer) {
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

    function showSection(section) {
      activeSection=section;
      document.querySelectorAll('[data-demo-page]').forEach(page=>{
        page.hidden = page.dataset.demoPage !== section;
        page.classList.toggle('hidden', page.dataset.demoPage !== section);
      });
      document.querySelectorAll('[data-demo-go]').forEach(button=>{
        button.classList.toggle('active',button.dataset.demoGo===section);
        if (button.dataset.demoGo===section) button.setAttribute('aria-current','page');
        else button.removeAttribute('aria-current');
      });
      query('#demo-prev').disabled=examSections.indexOf(section)===0;
      query('#demo-next').textContent=examSections.indexOf(section)===examSections.length-1?(isLearningMode?'Nộp bài':'Nộp thử'):'Phần tiếp →';
      window.scrollTo({top:0,behavior:'smooth'});
    }
    document.querySelectorAll('[data-demo-go]').forEach(button=>button.addEventListener('click',()=>showSection(button.dataset.demoGo)));
    query('#demo-prev').addEventListener('click',()=>{
      const previous=examSections[examSections.indexOf(activeSection)-1];if(previous)showSection(previous);
    });
    query('#demo-next').addEventListener('click',()=>{
      const next=examSections[examSections.indexOf(activeSection)+1];if(next)showSection(next);else query('#demo-submit').click();
    });

    update();
    showSection(activeSection);

    if (isLearningMode && state.submittedAt) {
      void pollLearningResult();
    }
  }
}
