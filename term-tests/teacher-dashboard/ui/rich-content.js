import {
  validateImageUrl
} from '../studio/media.js';
import {
  escapeHtml
} from './presentation.js';

export function sanitizeRichContent(html) {
  if (!html || typeof html !== 'string') return '';

  let clean = html;

  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  clean = clean.replace(/<link\b[^>]*>/gi, '');
  clean = clean.replace(/<meta\b[^>]*>/gi, '');

  clean = clean.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = clean.replace(/(?:href|src)\s*=\s*["']\s*javascript:[^"']*["']/gi, '');

  clean = clean.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/\bsrc\s*=\s*["']([^"']*)["']/i);
    const src = srcMatch ? srcMatch[1].trim() : '';
    if (!src || !validateImageUrl(src)) {
      return '';
    }
    return match;
  });

  return clean;
}

export function generateTableHtml(rows = 3, cols = 2, preset = null) {
  if (preset === 'itinerary') {
    return `<table class="cloze-table">\n` +
      `  <thead>\n` +
      `    <tr>\n` +
      `      <th colspan="2" style="text-align: center; font-size: 1.05rem;">The Family Caribbean Cruise</th>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <th style="width: 35%;">Mục / Chi tiết</th>\n` +
      `      <th>Thông tin</th>\n` +
      `    </tr>\n` +
      `  </thead>\n` +
      `  <tbody>\n` +
      `    <tr>\n` +
      `      <td><strong>Type of cruise</strong></td>\n` +
      `      <td>Family fun and leisure</td>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <td><strong>Departure</strong></td>\n` +
      `      <td>Miami, Florida</td>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <td><strong>Places to visit</strong></td>\n` +
      `      <td>six (1) __________ Caribbean islands</td>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <td><strong>On-board activities</strong></td>\n` +
      `      <td>A wide range of food, (2) __________ and dinner</td>\n` +
      `    </tr>\n` +
      `  </tbody>\n` +
      `</table>`;
  }

  if (preset === 'notes') {
    return `<table class="cloze-table">\n` +
      `  <thead>\n` +
      `    <tr>\n` +
      `      <th colspan="2" style="text-align: center; font-size: 1.05rem;">IELTS Note Completion</th>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <th style="width: 35%;">Chủ đề / Yếu tố</th>\n` +
      `      <th>Ghi chú chi tiết</th>\n` +
      `    </tr>\n` +
      `  </thead>\n` +
      `  <tbody>\n` +
      `    <tr>\n` +
      `      <td><strong>Date & Time</strong></td>\n` +
      `      <td>Saturday, at (1) __________ a.m.</td>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <td><strong>Location</strong></td>\n` +
      `      <td>Room (2) __________ in the Community Center</td>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <td><strong>Contact Person</strong></td>\n` +
      `      <td>Dr. (3) __________</td>\n` +
      `    </tr>\n` +
      `  </tbody>\n` +
      `</table>`;
  }

  if (preset === 'vocabulary') {
    return `<table class="cloze-table">\n` +
      `  <thead>\n` +
      `    <tr>\n` +
      `      <th>Từ vựng</th>\n` +
      `      <th>Phiên âm</th>\n` +
      `      <th>Loại từ</th>\n` +
      `      <th>Nghĩa tiếng Việt</th>\n` +
      `    </tr>\n` +
      `  </thead>\n` +
      `  <tbody>\n` +
      `    <tr>\n` +
      `      <td>destination</td>\n` +
      `      <td>/ˌdes.tɪˈneɪ.ʃən/</td>\n` +
      `      <td>noun</td>\n` +
      `      <td>điểm đến</td>\n` +
      `    </tr>\n` +
      `    <tr>\n` +
      `      <td>itinerary</td>\n` +
      `      <td>/aɪˈtɪn.ər.ər.i/</td>\n` +
      `      <td>noun</td>\n` +
      `      <td>lịch trình chuyến đi</td>\n` +
      `    </tr>\n` +
      `  </tbody>\n` +
      `</table>`;
  }

  const rCount = Math.max(1, Number(rows) || 2);
  const cCount = Math.max(1, Number(cols) || 2);

  const ths = Array.from({ length: cCount }, (_, i) => `<th>Cột ${i + 1}</th>`).join('');
  const trs = Array.from({ length: rCount }, (_, r) => {
    const tds = Array.from({ length: cCount }, (_, c) => `<td>Nội dung ${r + 1}-${c + 1}</td>`).join('');
    return `    <tr>${tds}</tr>`;
  }).join('\n');

  return `<table class="cloze-table">\n` +
    `  <thead>\n` +
    `    <tr>${ths}</tr>\n` +
    `  </thead>\n` +
    `  <tbody>\n` +
    `${trs}\n` +
    `  </tbody>\n` +
    `</table>`;
}

export function renderInlineClozeMarkup(text, items = [], responses = {}, options = {}) {
  if (!text || typeof text !== 'string') return '';
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g;

  const containsHtml = /<[a-z][\s\S]*>/i.test(text);

  if (containsHtml) {
    const cleanHtml = sanitizeRichContent(text);
    let html = '';
    let last = 0;

    for (const match of cleanHtml.matchAll(pattern)) {
      const num = Number(match[1] || match[2]);
      let item = Array.isArray(items) ? (items.find(it => it.position === num) || items[num - 1]) : null;
      if (!item && Array.isArray(items) && items.length === 1 && items[0]) {
        item = items[0];
      }
      html += cleanHtml.slice(last, match.index);

      const itemId = item?.itemVersionId
        ? (item.position === num ? item.itemVersionId : `${item.itemVersionId}__b${num}`)
        : `blank-${num}`;
      const userVal = escapeHtml(responses[itemId] || (responses[item?.itemVersionId] && item?.position === num ? responses[item?.itemVersionId] : ''));
      const disabledAttr = options.disabled ? 'disabled' : '';

      html += `<span class="inline-blank-wrapper" data-item-id="${escapeHtml(itemId)}">` +
        `<span class="inline-blank-number">(${num})</span>` +
        `<input type="text" class="form-control inline-fill-input" data-item-id="${escapeHtml(itemId)}" data-position="${num}" placeholder="${num}" value="${userVal}" ${disabledAttr} />` +
        `</span>`;

      last = match.index + match[0].length;
    }

    html += cleanHtml.slice(last);
    return html;
  }

  let html = '';
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1] || match[2]);
    let item = Array.isArray(items) ? (items.find(it => it.position === num) || items[num - 1]) : null;
    if (!item && Array.isArray(items) && items.length === 1 && items[0]) {
      item = items[0];
    }
    html += escapeHtml(text.slice(last, match.index)).replace(/\n/g, '<br/>');

    const itemId = item?.itemVersionId
      ? (item.position === num ? item.itemVersionId : `${item.itemVersionId}__b${num}`)
      : `blank-${num}`;
    const userVal = escapeHtml(responses[itemId] || (responses[item?.itemVersionId] && item?.position === num ? responses[item?.itemVersionId] : ''));
    const disabledAttr = options.disabled ? 'disabled' : '';

    html += `<span class="inline-blank-wrapper" data-item-id="${escapeHtml(itemId)}">` +
      `<span class="inline-blank-number">(${num})</span>` +
      `<input type="text" class="form-control inline-fill-input" data-item-id="${escapeHtml(itemId)}" data-position="${num}" placeholder="${num}" value="${userVal}" ${disabledAttr} />` +
      `</span>`;

    last = match.index + match[0].length;
  }

  html += escapeHtml(text.slice(last)).replace(/\n/g, '<br/>');
  return html;
}
