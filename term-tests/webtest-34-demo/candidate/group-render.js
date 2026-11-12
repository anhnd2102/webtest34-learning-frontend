// Dựng các nhóm câu hỏi và âm thanh của bài thi (tách nguyên văn từ content-preview.mjs).
import { escape, words, optionId } from './text-utils.js?rev=20261113-audio-a';
// Cùng URL (kể cả rev) với import trong content-preview.mjs để dùng chung một thể hiện module.
import { ICONS } from '../dynamic-exam-renderer.mjs?rev=20261113-audio-a';

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

export const sectionKey = group => group.id.split('-')[0];
export const sectionLabels = { vocabulary: 'Vocabulary', listening: 'Listening', grammar: 'Grammar', pronunciation: 'Pronunciation', translation: 'Translation', writing: 'Writing', speaking: 'Speaking', reading: 'Reading' };
export function choiceLayout(options) {
  const labels=options.map(option=>String(typeof option==='string'?option:option.label).trim());
  const compact=labels.every(label=>label.length<=16&&!/[\r\n]/.test(label));
  const longest=Math.max(0,...labels.map(label=>label.length));
  return { columns: options.length===4 ? (compact?4:2) : options.length===3 ? (longest>60?1:3) : options.length===2 ? (longest>100?1:2) : 1, compact };
}
export function answerField(item, inline = false, cards = false) {
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
export function clozeMarkup(segments, items, numbered = true) {
  return segments.map(segment => typeof segment === 'string' ? escape(segment) : `<span class="demo-question demo-inline">${numbered ? `<span class="demo-blank-number">(${segment.number})</span>` : ''}${answerField(items.find(item => item.id === segment.id), true)}</span>`).join('');
}
export function extractWordBank(context) {
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
      ? `<div class="demo-audio-gate" data-demo-audio-gate="${escape(gateId)}"><button type="button" class="btn btn-primary demo-audio-start" data-demo-audio-start="${escape(gateId)}">${ICONS.play} Phát audio (nếu có)</button><audio preload="metadata" src="${escape(resolveAudioUrl(group.audioPath))}" data-demo-audio-player="${escape(gateId)}"></audio><span class="demo-audio-status" data-demo-audio-status="${escape(gateId)}">${bypass ? 'Đã mở khóa nội dung câu hỏi để kiểm tra.' : 'Nội dung bài nghe đang được khóa.'}</span></div>`
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

