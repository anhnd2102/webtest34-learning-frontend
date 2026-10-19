import { parseSseChunk } from './exam-room-sse.js';

export function defaultApiBase() {
  return 'https://webtest.ducanhn.autos';
}

export function expandSentenceVariants(sentences = []) {
  const list = Array.isArray(sentences) ? sentences : [sentences];
  const result = new Set();

  const contractionPairs = [
    [/(\b)I('m|’m)(\b)/gi, '$1I am$3'],
    [/(\b)I am(\b)/gi, "$1I'm$2"],
    [/(\b)you('re|’re)(\b)/gi, '$1you are$3'],
    [/(\b)you are(\b)/gi, "$1you're$2"],
    [/(\b)we('re|’re)(\b)/gi, '$1we are$3'],
    [/(\b)we are(\b)/gi, "$1we're$2"],
    [/(\b)they('re|’re)(\b)/gi, '$1they are$3'],
    [/(\b)they are(\b)/gi, "$1they're$2"],
    [/(\b)he('s|’s)(\b)/gi, '$1he is$3'],
    [/(\b)he is(\b)/gi, "$1he's$2"],
    [/(\b)she('s|’s)(\b)/gi, '$1she is$3'],
    [/(\b)she is(\b)/gi, "$1she's$2"],
    [/(\b)it('s|’s)(\b)/gi, '$1it is$3'],
    [/(\b)it is(\b)/gi, "$1it's$2"],
    [/(\b)don('t|’t)(\b)/gi, '$1do not$3'],
    [/(\b)do not(\b)/gi, "$1don't$2"],
    [/(\b)doesn('t|’t)(\b)/gi, '$1does not$3'],
    [/(\b)does not(\b)/gi, "$1doesn't$2"],
    [/(\b)didn('t|’t)(\b)/gi, '$1did not$3'],
    [/(\b)did not(\b)/gi, "$1didn't$2"],
    [/(\b)can('t|’t)(\b)/gi, '$1cannot$3'],
    [/(\b)cannot(\b)/gi, "$1can't$2"],
    [/(\b)won('t|’t)(\b)/gi, '$1will not$3'],
    [/(\b)will not(\b)/gi, "$1won't$2"],
    [/(\b)isn('t|’t)(\b)/gi, '$1is not$3'],
    [/(\b)is not(\b)/gi, "$1isn't$2"],
    [/(\b)aren('t|’t)(\b)/gi, '$1are not$3'],
    [/(\b)are not(\b)/gi, "$1aren't$2"],
    [/(\b)wasn('t|’t)(\b)/gi, '$1was not$3'],
    [/(\b)was not(\b)/gi, "$1wasn't$2"],
    [/(\b)weren('t|’t)(\b)/gi, '$1were not$3'],
    [/(\b)weren't(\b)/gi, "$1were not$2"],
    [/(\b)hasn('t|’t)(\b)/gi, '$1has not$3'],
    [/(\b)has not(\b)/gi, "$1hasn't$2"],
    [/(\b)haven('t|’t)(\b)/gi, '$1have not$3'],
    [/(\b)have not(\b)/gi, "$1haven't$2"]
  ];

  for (const s of list) {
    if (!s || typeof s !== 'string') continue;
    const clean = s.normalize('NFKC').trim().replace(/\s+/gu, ' ');
    if (!clean) continue;
    result.add(clean);

    for (const [pattern, replacement] of contractionPairs) {
      if (pattern.test(clean)) {
        const transformed = clean.replace(pattern, replacement);
        result.add(transformed);
      }
    }
  }

  const afterContractions = Array.from(result);
  for (const item of afterContractions) {
    const withoutPeriod = item.replace(/\.+$/gu, '').trim();
    if (withoutPeriod) {
      result.add(withoutPeriod);
      result.add(withoutPeriod + '.');
    }
    if (item.includes('?')) {
      const withoutQ = item.replace(/\?+$/gu, '').trim();
      if (withoutQ) {
        result.add(withoutQ);
        result.add(withoutQ + '?');
      }
    }
  }

  const afterPunctuation = Array.from(result);
  for (const item of afterPunctuation) {
    if (item.includes(',')) {
      result.add(item.replace(/,/gu, '').replace(/\s+/gu, ' ').trim());
    }
  }

  const afterCommas = Array.from(result);
  for (const item of afterCommas) {
    if (item.includes("'")) {
      result.add(item.replace(/'/gu, '’'));
    }
    if (item.includes('’')) {
      result.add(item.replace(/’/gu, "'"));
    }
  }

  return Array.from(result).filter(Boolean).slice(0, 40);
}

export function generateHangmanHint(targetText = '') {
  if (!targetText || typeof targetText !== 'string') return '';
  const clean = targetText.trim();
  if (!clean) return '';

  return clean
    .replace(/\s*-\s*/g, ' - ')
    .replace(/[a-zA-Z]+/g, (word) => {
      if (word.length <= 1) return word;
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
    if (!Number.isFinite(r) || r < 1) continue;
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
  if (!passage || typeof passage !== 'string') return [];
  const labels = new Set();
  const pattern = /(?:Paragraph\s+([A-Z])|\[([A-Z])\])/gi;
  let match;
  while ((match = pattern.exec(passage)) !== null) {
    const letter = (match[1] || match[2] || '').toUpperCase();
    if (letter) labels.add(letter);
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

  const expectedErrors = (gradingKey.expectedErrors || []).map(e => String(e).trim().toLowerCase());
  const expectedCorrections = (gradingKey.expectedCorrections || []).map(c => String(c).trim().toLowerCase());

  const isErrorCorrect = expectedErrors.length > 0 && expectedErrors.includes(rawError);
  const isCorrectionCorrect = expectedCorrections.length > 0 && expectedCorrections.includes(rawCorrection);

  const scoringRule = gradingKey.scoringRule || 'split_points';
  let score = 0;

  if (scoringRule === 'all_or_nothing') {
    score = (isErrorCorrect && isCorrectionCorrect) ? maxScore : 0;
  } else {
    if (isErrorCorrect && isCorrectionCorrect) {
      score = maxScore;
    } else if (isErrorCorrect || isCorrectionCorrect) {
      score = maxScore / 2;
    } else {
      score = 0;
    }
  }

  return { score, maxScore, isErrorCorrect, isCorrectionCorrect };
}

export function tokenizeSentence(input) {
  if (!input || typeof input !== 'string') return [];
  const trimmed = input.trim();
  if (!trimmed) return [];

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
    if (!isSame) break;
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
  if (!rawIpa || typeof rawIpa !== 'string') return '';
  const trimmed = rawIpa.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2) {
    return trimmed;
  }
  const clean = trimmed.replace(/^\/+|\/+$/g, '').trim();
  return clean ? `/${clean}/` : '';
}

export const ICONS = {
  teacher: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  classes: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  book: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  search: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  link: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  external: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  externalLink: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  copy: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  qr: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  view: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  alert: '<svg class="icon-inline" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  filter: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  rotate: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>',
  clipboard: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
  logout: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  save: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  publish: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  lock: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  edit: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
  clock: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  zap: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  arrowLeft: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  audio: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>',
  trash: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
};

export function renderSvgIcon(name, customClass = '') {
  const icon = ICONS[name];
  if (!icon) return '';
  if (!customClass) return icon;
  return icon.replace('class="', `class="${customClass} `);
}

// Dashboard chạy local (run-local.sh) thì link học viên trỏ về static server local; production giữ nguyên link backend trả.
// `prod=1`: run-local.sh không chạy backend, nên trang học viên local phải gọi API production như dashboard.
export function localStudentUrl(studentUrl, location) {
  if (!studentUrl || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(location?.hostname || '')) return studentUrl;
  const url = new URL(studentUrl);
  const index = url.pathname.indexOf('/term-tests/');
  if (index < 0) return studentUrl;
  url.searchParams.set('prod', '1');
  return `${location.origin}${url.pathname.slice(index)}${url.search}${url.hash}`;
}

export function readDashboardState(input) {
  const url = input instanceof URL ? input : new URL(input);
  const state = {
    classId: url.searchParams.get('classId') || '',
    assignmentId: url.searchParams.get('assignmentId') || ''
  };
  const attemptId = url.searchParams.get('attemptId');
  if (attemptId !== null && attemptId !== '') state.attemptId = attemptId;
  const q = url.searchParams.get('q');
  if (q !== null && q !== '') state.q = q;
  const status = url.searchParams.get('status');
  if (status !== null && status !== '') state.status = status;
  const minScore = url.searchParams.get('minScore');
  if (minScore !== null && minScore !== '') state.minScore = minScore;
  const maxScore = url.searchParams.get('maxScore');
  if (maxScore !== null && maxScore !== '') state.maxScore = maxScore;
  const skill = url.searchParams.get('skill');
  if (skill !== null && skill !== '') state.skill = skill;
  const sortBy = url.searchParams.get('sortBy');
  if (sortBy !== null && sortBy !== '') state.sortBy = sortBy;
  const sortDir = url.searchParams.get('sortDir');
  if (sortDir !== null && sortDir !== '') state.sortDir = sortDir;
  const page = url.searchParams.get('page');
  if (page !== null && page !== '') {
    const parsedPage = Number.parseInt(page, 10);
    state.page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  }
  const course = url.searchParams.get('course');
  if (course !== null && course !== '') state.course = course;
  const scope = url.searchParams.get('scope');
  if (scope !== null && scope !== '') state.scope = scope;
  const classStatus = url.searchParams.get('classStatus');
  if (classStatus !== null && classStatus !== '') state.classStatus = classStatus;
  const classQ = url.searchParams.get('classQ');
  if (classQ !== null && classQ !== '') state.classQ = classQ;
  return state;
}

export const SUPPORTED_DASHBOARD_TABS = ['dashboard', 'exams', 'grading', 'reports'];
export const DEFAULT_DASHBOARD_TAB = 'dashboard';

export function readDashboardTab(input) {
  if (!input) return DEFAULT_DASHBOARD_TAB;
  let hash = '';
  if (typeof input === 'string') {
    if (input.includes('#')) {
      hash = input.slice(input.indexOf('#') + 1);
    } else {
      hash = input;
    }
  } else if (input instanceof URL) {
    hash = input.hash ? input.hash.replace(/^#/, '') : '';
  } else if (typeof input === 'object' && input.hash) {
    hash = input.hash.replace(/^#/, '');
  }
  hash = hash.split('?')[0].trim().toLowerCase();
  if (hash === 'test-studio') return 'test-studio';
  return SUPPORTED_DASHBOARD_TABS.includes(hash) ? hash : DEFAULT_DASHBOARD_TAB;
}

export function switchDashboardTab(tabId, options = {}) {
  const targetTab = readDashboardTab(tabId);
  const views = options.views || {};
  const navItems = options.navItems || [];

  const isTestStudio = targetTab === 'test-studio' || targetTab === 'exams';

  for (const tab of SUPPORTED_DASHBOARD_TABS) {
    const view = views[tab];
    if (view) {
      if (tab === 'exams') {
        view.hidden = !isTestStudio;
      } else {
        view.hidden = tab !== targetTab;
      }
    }
  }
  if (views['test-studio']) {
    views['test-studio'].hidden = !isTestStudio;
  }

  for (const navItem of navItems) {
    if (!navItem) continue;
    const href = navItem.getAttribute('href') || '';
    const linkTab = href.replace(/^#/, '');
    const isActive = linkTab === targetTab || (isTestStudio && (linkTab === 'exams' || linkTab === 'test-studio'));
    if (isActive) {
      if (navItem.classList && typeof navItem.classList.add === 'function') {
        navItem.classList.add('active');
      }
      if (typeof navItem.setAttribute === 'function') {
        navItem.setAttribute('aria-current', 'page');
      }
    } else {
      if (navItem.classList && typeof navItem.classList.remove === 'function') {
        navItem.classList.remove('active');
      }
      if (typeof navItem.removeAttribute === 'function') {
        navItem.removeAttribute('aria-current');
      }
    }
  }

  if (typeof options.onTabChange === 'function') {
    options.onTabChange(targetTab);
  }
  return targetTab;
}

export function assignmentUrl(input, state) {
  const url = input instanceof URL ? new URL(input) : new URL(input);
  const keys = ['classId', 'assignmentId', 'attemptId', 'q', 'status', 'minScore', 'maxScore', 'skill', 'sortBy', 'sortDir', 'page', 'course', 'scope', 'classStatus', 'classQ'];
  for (const key of keys) {
    if (state[key] !== undefined && state[key] !== null && state[key] !== '' && (key !== 'page' || Number(state[key]) > 1)) {
      url.searchParams.set(key, String(state[key]));
    } else {
      url.searchParams.delete(key);
    }
  }
  return url;
}

export function resetDashboardState(state = {}) {
  state.classId = '';
  state.assignmentId = '';
  state.attemptId = '';
  state.q = '';
  state.status = '';
  state.minScore = '';
  state.maxScore = '';
  state.skill = '';
  state.sortBy = '';
  state.sortDir = '';
  state.page = 1;
  state.course = '';
  state.scope = '';
  state.classStatus = '';
  state.classQ = '';
  return state;
}

export function filterClasses(classes = [], { course = '', scope = '', classStatus = '', q = '', userRole = '', userClassIds = [] } = {}) {
  let list = Array.isArray(classes) ? [...classes] : [];

  // Exclude completed or cancelled classes
  list = list.filter(c => {
    const st = String(c.status || c.classStatus || '').toLowerCase();
    return st !== 'completed' && st !== 'cancelled';
  });

  // 1. Role-specific filters
  if (userRole === 'lead' && scope === 'my_classes') {
    const classIdSet = new Set((userClassIds || []).map(String));
    list = list.filter(c => {
      const cid = String(c.classId || c.class_id || '');
      return Boolean(c.isTeaching || c.is_teaching || classIdSet.has(cid));
    });
  } else if (course && course !== 'all') {
    const normCourse = String(course).replace(/^[^\d]*/, '').trim().toUpperCase();
    list = list.filter(c => {
      const cCode = String(c.courseCode || '').replace(/^[^\d]*/, '').trim().toUpperCase();
      return cCode === normCourse;
    });
  }

  // 2. Status filter
  if (classStatus && classStatus !== 'all') {
    list = list.filter(c => {
      const st = String(c.status || c.classStatus || '').toLowerCase();
      return st === classStatus.toLowerCase();
    });
  }

  // 3. Search query
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter(c => {
      const name = String(c.name || '').toLowerCase();
      const id = String(c.classId || '').toLowerCase();
      return name.includes(term) || id.includes(term);
    });
  }

  return list;
}

export function formatClassFilterCountLabel({ count = 0, course = '', scope = '', classStatus = '', userRole = '' } = {}) {
  let statusText = '';
  if (classStatus === 'on_going') statusText = ' đang học';
  else if (classStatus === 'pending') statusText = ' chờ mở';

  if (userRole === 'lead' && scope === 'my_classes') {
    return `${count} lớp bạn đang dạy${statusText}`;
  }

  if (course && course !== 'all') {
    const courseNum = String(course).replace(/^[^\d]*/, '');
    return `${count} lớp Khối ${courseNum || course}${statusText}`;
  }

  return `${count} lớp${statusText}`;
}

export function formatClassOptionLabel({ name, courseCode, assignmentCount }) {
  const normName = String(name || '').trim();
  const normCode = String(courseCode || '').trim();
  const count = Number(assignmentCount || 0);

  // If courseCode is the same as class name or looks like a class code (e.g. IC2283)
  if (normCode && normCode.toLowerCase() !== normName.toLowerCase()) {
    const courseNum = normCode.replace(/^[^\d]*/, '');
    const cleanCourse = courseNum ? `Khối ${courseNum}` : `Khối ${normCode}`;
    return `Lớp ${normName} · ${cleanCourse} · ${count} bài`;
  }
  return `Lớp ${normName} · ${count} bài`;
}

export function extractPhase(phase, title = '') {
  if (phase !== null && phase !== undefined && phase !== '') {
    const num = Number(phase);
    if (Number.isFinite(num)) return `Phase ${num}`;
  }
  if (typeof title === 'string' && title) {
    const match = title.match(/Phase\s*(\d+)/i);
    if (match) return `Phase ${match[1]}`;
  }
  return null;
}

export function formatAssignmentMeta({ className, courseCode, phase, title }) {
  const normClass = String(className || '').trim();
  let normCourse = String(courseCode || '').trim();

  // If courseCode is identical to className or is a class name, infer from title
  if (!normCourse || normCourse.toLowerCase() === normClass.toLowerCase()) {
    if (typeof title === 'string') {
      const match = title.match(/Khối\s*(\d+)/i);
      if (match) normCourse = match[1];
    }
  }

  const classLabel = normClass ? (normClass.startsWith('Lớp') ? normClass : `Lớp ${normClass}`) : '—';
  const courseLabel = normCourse && normCourse.toLowerCase() !== normClass.toLowerCase()
    ? (normCourse.startsWith('Khối') ? normCourse : `Khối ${normCourse}`)
    : '—';
  const phaseLabel = extractPhase(phase, title);

  return { classLabel, courseLabel, phaseLabel };
}

export function fixtureHeaders({ actorId }) {
  return { 'X-Teacher-Fixture-Id': actorId.trim() };
}

export function authLoginPath() {
  return '/api/teacher/auth/login';
}

export function authLogoutPath() {
  return '/api/teacher/auth/logout';
}

export function authMePath() {
  return '/api/teacher/auth/me';
}

export function authHeaders({ token = '', actorId = '' } = {}) {
  if (token && typeof token === 'string' && token.trim()) {
    return { 'Authorization': `Bearer ${token.trim()}` };
  }
  if (actorId && typeof actorId === 'string' && actorId.trim()) {
    return { 'X-Teacher-Fixture-Id': actorId.trim() };
  }
  return {};
}

export function teacherRoleLabel(role, courseCodes = []) {
  if (role === 'admin') return 'Quản trị viên (Toàn quyền)';
  if (role === 'lead') {
    const khoiList = courseCodes && courseCodes.length > 0 ? courseCodes.join(', ') : 'Khối';
    return `Trưởng bộ môn (Khối ${khoiList})`;
  }
  if (role === 'qm') return 'Quản lý chất lượng';
  return 'Giáo viên phụ trách lớp';
}

export function assignmentResultsPath(classId, assignmentId, options = {}) {
  const base = `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/results`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null && value !== '' && (key !== 'page' || Number(value) > 1)) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function assignmentExamModePath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam-mode`;
}

export function assignmentExamRoomPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/room`;
}

export function assignmentExamEventsPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/events`;
}

export function assignmentExamStartPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/start`;
}

export function assignmentExamExtendPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/extend`;
}

export function formatExamRoomStatus(status) {
  return ({ not_entered: 'Chưa vào', entered: 'Đã vào', ready: 'Sẵn sàng', in_progress: 'Đang làm', submitted: 'Đã nộp' })[status] || 'Chưa vào';
}

export function formatExamReadyCount({ readyCount = 0, totalCount = 0 } = {}) {
  return `${readyCount}/${totalCount} sẵn sàng`;
}

export function applyExamProgress(room, { studentRef, progress } = {}) {
  if (!room || !Array.isArray(room.students) || typeof studentRef !== 'string'
    || !Number.isInteger(progress?.answered) || !Number.isInteger(progress?.total)
    || progress.answered < 0 || progress.total < progress.answered) return room;
  const index = room.students.findIndex(student => student.studentRef === studentRef);
  if (index < 0) return room;
  return {
    ...room,
    students: room.students.map((student, studentIndex) =>
      studentIndex === index ? { ...student, progress: { answered: progress.answered, total: progress.total } } : student)
  };
}

export function applyExamIncident(room, { studentRef, incident, incidentCount } = {}) {
  const index = room?.students?.findIndex(student => student.studentRef === studentRef) ?? -1;
  if (index < 0 || !incident?.incidentId) return room;
  return {
    ...room,
    students: room.students.map((student, studentIndex) => {
      if (studentIndex !== index) return student;
      const others = (student.openIncidents || []).filter(item => item.incidentId !== incident.incidentId);
      return {
        ...student,
        incidentCount: Number.isInteger(incidentCount) ? incidentCount : student.incidentCount,
        openIncidents: incident.endedAt ? others : [...others, incident]
      };
    })
  };
}

export function formatExamProgress(progress) {
  if (!Number.isInteger(progress?.answered) || !Number.isInteger(progress?.total)
    || progress.answered < 0 || progress.total < progress.answered) return '—';
  return `${progress.answered}/${progress.total}`;
}

export function applyExamConnection(room, { studentRef, status } = {}) {
  if (!room || !Array.isArray(room.students) || typeof studentRef !== 'string'
    || !['connected', 'disconnected'].includes(status)) return room;
  const index = room.students.findIndex(student => student.studentRef === studentRef);
  if (index < 0) return room;
  return {
    ...room,
    students: room.students.map((student, studentIndex) =>
      studentIndex === index ? { ...student, connectionStatus: status } : student)
  };
}

export function formatExamConnectionStatus(status) {
  return ({ connected: 'Đang kết nối', disconnected: 'Mất kết nối' })[status] || '—';
}

export function attemptDetailPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}`;
}

export function manualGradingDraftPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/draft`;
}

export function manualGradingCompletePath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/complete`;
}

export function attemptPublishPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/publish`;
}

export function assignmentPublishAllPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/publish`;
}

export function assignmentRosterPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/roster`;
}

export function eligibleStudentsPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/eligible-students`;
}

export function studentTransferPath(classId, studentRef) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentRef)}/transfer`;
}

export function grantRetakePath(classId, assignmentId, studentRef) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/students/${encodeURIComponent(studentRef)}/retake`;
}

export function courseTestCatalogPath(apiBaseOrCourseId, courseIdOptional) {
  if (arguments.length === 1 && (typeof apiBaseOrCourseId === 'number' || !String(apiBaseOrCourseId).startsWith('http'))) {
    return `/api/teacher/course-test-catalog?courseId=${encodeURIComponent(apiBaseOrCourseId)}`;
  }
  const apiBase = String(apiBaseOrCourseId || '').replace(/\/+$/, '');
  const courseId = courseIdOptional !== undefined ? courseIdOptional : apiBaseOrCourseId;
  return `${apiBase}/api/teacher/course-test-catalog?courseId=${encodeURIComponent(courseId)}`;
}

export function renderCourseTestCatalogView(container, catalog = [], options = {}) {
  if (!container) return;
  const teacherRole = options.teacherRole || 'teacher';
  const selectedCourseId = Number(options.courseId || 1);

  if (teacherRole !== 'lead' && teacherRole !== 'admin') {
    container.innerHTML = `
      <div class="panel showcase-placeholder unauthorized-card">
        <div class="placeholder-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>Quyền hạn bị giới hạn</h3>
        <p>Chỉ Khối trưởng (Lead) hoặc Quản trị viên (Admin) mới có quyền truy cập Quản lý đề thi.</p>
      </div>
    `;
    return;
  }

  const courses = [
    { id: 1, name: 'Khối 03' },
    { id: 2, name: 'Khối 34' },
    { id: 3, name: 'Khối 45' }
  ];

  const courseButtons = courses.map(c => `
    <button type="button" class="btn-course-tab ${c.id === selectedCourseId ? 'active' : ''}" data-course-id="${c.id}">
      ${c.name}
    </button>
  `).join('');

  let tableHtml = '';
  if (!catalog || catalog.length === 0) {
    tableHtml = `
      <div class="empty-catalog-state">
        <p>Chưa có bài thi nào trong danh mục của khối này.</p>
      </div>
    `;
  } else {
    const rows = catalog.map(item => {
      const isPublished = item.status === 'published';
      const badgeClass = isPublished ? 'badge-published' : 'badge-draft';
      const badgeText = isPublished ? 'Đã công bố' : 'Bản nháp';
      const sessionLabel = `Buổi ${item.sessionNumber}`;
      const phaseBadge = item.phase ? `<span class="phase-pill">Phase ${item.phase}</span>` : '';

      return `
        <tr data-test-key="${item.testKey || ''}" data-test-id="${item.id || ''}">
          <td class="col-session">
            <strong>${sessionLabel}</strong>
            ${phaseBadge}
          </td>
          <td class="col-test-key"><code>${item.testKey || '—'}</code></td>
          <td class="col-title">
            <span class="test-title-text">${item.title || '—'}</span>
          </td>
          <td class="col-version">
            <span class="version-code" title="${item.formVersionId || ''}">${item.formVersionId ? item.formVersionId.slice(0, 8) + '...' : '—'}</span>
          </td>
          <td class="col-status">
            <span class="status-badge ${badgeClass}">${badgeText}</span>
          </td>
          <td class="col-actions">
            <button type="button" class="btn btn-secondary btn-sm btn-edit-test" data-test-key="${item.testKey || ''}" data-form-version-id="${item.formVersionId || ''}">
              Chỉnh sửa
            </button>
            ${!isPublished ? `
              <button type="button" class="btn btn-outline-danger btn-sm btn-delete-test-draft" data-test-key="${item.testKey || ''}" data-form-version-id="${item.formVersionId || ''}" title="Xóa bản nháp này">
                ${renderSvgIcon('trash', 'icon-inline')} Xóa
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    tableHtml = `
      <div class="catalog-table-wrapper">
        <table class="catalog-table">
          <thead>
            <tr>
              <th scope="col">Buổi / Phase</th>
              <th scope="col">Mã bài test</th>
              <th scope="col">Tên bài thi</th>
              <th scope="col">Phiên bản Form</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="test-studio-header">
      <div class="studio-title-wrap">
        <h2>Quản lý Đề thi (Test Studio)</h2>
        <p class="subtitle">Xem và quản lý lộ trình bài thi theo từng buổi của các khối đào tạo IZONE.</p>
      </div>
      <div class="studio-header-actions">
        <button type="button" class="btn btn-primary btn-add-test" id="btn-add-test">
          + Thêm bài thi mới
        </button>
      </div>
    </div>

    <div class="test-studio-course-bar">
      <div class="course-tabs-group" role="tablist" aria-label="Chọn khối">
        ${courseButtons}
      </div>
    </div>

    <div class="test-studio-content">
      ${tableHtml}
    </div>
  `;

  if (typeof options.onCourseChange === 'function') {
    const courseBtns = container.querySelectorAll('.btn-course-tab');
    courseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = Number(btn.getAttribute('data-course-id'));
        options.onCourseChange(cid);
      });
    });
  }

  if (typeof options.onAddTest === 'function') {
    const addBtn = container.querySelector('#btn-add-test');
    if (addBtn) {
      addBtn.addEventListener('click', options.onAddTest);
    }
  }

  if (typeof options.onEditTest === 'function') {
    const editBtns = container.querySelectorAll('.btn-edit-test');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const testKey = btn.getAttribute('data-test-key');
        const formVersionId = btn.getAttribute('data-form-version-id');
        options.onEditTest({ testKey, formVersionId });
      });
    });
  }

  if (typeof options.onDeleteDraft === 'function') {
    const delBtns = container.querySelectorAll('.btn-delete-test-draft');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const testKey = btn.getAttribute('data-test-key');
        const formVersionId = btn.getAttribute('data-form-version-id');
        if (!formVersionId) return;
        const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm('Bạn có chắc chắn muốn xóa bản nháp này không? Thao tác này không thể hoàn tác.')
          : true;
        if (confirmed) {
          options.onDeleteDraft({ testKey, formVersionId });
        }
      });
    });
  }
}

export function formDraftPath(apiBaseOrVersionId, versionIdOptional) {
  if (arguments.length === 0 || apiBaseOrVersionId === undefined) {
    return '/api/teacher/forms/draft';
  }
  if (arguments.length === 1) {
    if (typeof apiBaseOrVersionId === 'string' && apiBaseOrVersionId.startsWith('http')) {
      const cleanBase = apiBaseOrVersionId.replace(/\/+$/, '');
      return `${cleanBase}/api/teacher/forms/draft`;
    }
    return `/api/teacher/forms/draft/${encodeURIComponent(apiBaseOrVersionId)}`;
  }
  const cleanBase = String(apiBaseOrVersionId || '').replace(/\/+$/, '');
  return `${cleanBase}/api/teacher/forms/draft/${encodeURIComponent(versionIdOptional)}`;
}

export function formDetailPath(apiBaseOrVersionId, versionIdOptional) {
  if (arguments.length === 1) {
    if (typeof apiBaseOrVersionId === 'string' && apiBaseOrVersionId.startsWith('http')) {
      const cleanBase = apiBaseOrVersionId.replace(/\/+$/, '');
      return `${cleanBase}/api/teacher/forms`;
    }
    return `/api/teacher/forms/${encodeURIComponent(apiBaseOrVersionId)}`;
  }
  const cleanBase = String(apiBaseOrVersionId || '').replace(/\/+$/, '');
  return `${cleanBase}/api/teacher/forms/${encodeURIComponent(versionIdOptional)}`;
}

export function previewSandboxPath(apiBase = '') {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/preview-sandbox` : '/api/teacher/forms/preview-sandbox';
}

export function formPublishPath(apiBase = '') {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/publish` : '/api/teacher/forms/publish';
}

export function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function parseClozeBlanks(text) {
  if (!text || typeof text !== 'string') return [];
  const blanks = [];
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g;
  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1] || match[2]);
    blanks.push({
      number: num,
      index: match.index,
      length: match[0].length,
      rawMatch: match[0]
    });
  }
  return blanks;
}

export function renderInlineClozeMarkup(text, items = [], responses = {}, options = {}) {
  if (!text || typeof text !== 'string') return '';
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/g;
  let html = '';
  let last = 0;

  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1] || match[2]);
    const item = Array.isArray(items) ? (items.find(it => it.position === num) || items[num - 1]) : null;
    html += escapeHtml(text.slice(last, match.index)).replace(/\n/g, '<br/>');

    const itemId = item?.itemVersionId || `blank-${num}`;
    const userVal = escapeHtml(responses[itemId] || '');
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

export function renderTestBuilderView(container, formVersionData = {}, options = {}) {
  if (!container) return;

  const draftState = {
    formVersionId: formVersionData.id || formVersionData.formVersionId || generateUuid(),
    formTemplateId: formVersionData.formTemplateId || '',
    version: Number(formVersionData.version || 1),
    status: formVersionData.status || 'draft',
    title: formVersionData.title || formVersionData.publicDefinition?.title || 'Đề thi mới',
    durationMinutes: Number(formVersionData.durationMinutes || formVersionData.publicDefinition?.durationMinutes || 60),
    answerReleasePolicy: formVersionData.answerReleasePolicy || formVersionData.publicDefinition?.answerReleasePolicy || 'teacher_release',
    submissionCount: Number(formVersionData.submissionCount || 0),
    blocks: JSON.parse(JSON.stringify(formVersionData.publicDefinition?.blocks || formVersionData.blocks || [])),
    gradingKey: {
      items: JSON.parse(JSON.stringify(formVersionData.gradingKey?.items || {})),
      groups: JSON.parse(JSON.stringify(formVersionData.gradingKey?.groups || {}))
    }
  };

  if (!draftState.blocks.length) {
    const initialItemId = generateUuid();
    const initialExId = generateUuid();
    draftState.blocks.push({
      blockId: generateUuid(),
      checkpoint: 1,
      title: 'Phần 1: Khởi động',
      instructions: '',
      audioUrl: '',
      readingPassage: '',
      exercises: [
        {
          exerciseId: initialExId,
          exerciseNumber: 1,
          title: 'Bài tập 1: Khởi động',
          instructions: '',
          audioUrl: null,
          readingPassage: null,
          itemIds: [initialItemId]
        }
      ],
      items: [
        {
          itemFamilyId: generateUuid(),
          itemVersionId: initialItemId,
          position: 1,
          exerciseId: initialExId,
          exerciseTitle: 'Bài tập 1: Khởi động',
          prompt: 'Câu hỏi 1:',
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'multiple_choice',
          layoutType: 'grid_4',
          graderType: 'exact_option',
          required: true,
          maxScore: 1,
          options: [
            { id: 'A', label: 'Phương án A' },
            { id: 'B', label: 'Phương án B' },
            { id: 'C', label: 'Phương án C' },
            { id: 'D', label: 'Phương án D' }
          ],
          skillCodes: [],
          releasePolicy: 'inherit'
        }
      ]
    });
    draftState.gradingKey.items[initialItemId] = {
      graderType: 'exact_option',
      expectedOptionId: 'A'
    };
  }

  // Normalize exercises in each block for 3-level hierarchy (Block -> Exercise -> Item)
  for (const block of draftState.blocks) {
    if (!Array.isArray(block.exercises) || block.exercises.length === 0) {
      const defaultExId = generateUuid();
      block.exercises = [
        {
          exerciseId: defaultExId,
          exerciseNumber: 1,
          title: block.title ? `${block.title}` : 'Exercise 1',
          instructions: block.instructions || '',
          audioUrl: block.audioUrl || null,
          readingPassage: block.readingPassage || null,
          itemIds: (block.items || []).map(it => it.itemVersionId)
        }
      ];
    } else {
      block.exercises.forEach((ex, idx) => {
        ex.exerciseNumber = idx + 1;
        if (!ex.exerciseId) ex.exerciseId = generateUuid();
        if (!ex.title) ex.title = `Exercise ${idx + 1}`;
      });
    }

    const exIdMap = new Map(block.exercises.map(e => [e.exerciseId, e]));
    const firstEx = block.exercises[0];

    for (const itm of block.items || []) {
      if (!itm.exerciseId || !exIdMap.has(itm.exerciseId)) {
        itm.exerciseId = firstEx.exerciseId;
        itm.exerciseTitle = itm.exerciseTitle || firstEx.title;
      } else {
        itm.exerciseTitle = itm.exerciseTitle || exIdMap.get(itm.exerciseId)?.title;
      }
    }

    for (const ex of block.exercises) {
      ex.itemIds = (block.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
    }
  }

  let isDirty = false;
  function markAsDirty() {
    isDirty = true;
  }

  function resolveTargetExercise(block, btn) {
    if (!Array.isArray(block.exercises) || block.exercises.length === 0) {
      const defaultExId = generateUuid();
      block.exercises = [
        {
          exerciseId: defaultExId,
          exerciseNumber: 1,
          title: block.title ? `${block.title}` : 'Exercise 1',
          instructions: block.instructions || '',
          audioUrl: block.audioUrl || null,
          readingPassage: block.readingPassage || null,
          itemIds: (block.items || []).map(it => it.itemVersionId)
        }
      ];
    }
    const exId = btn ? btn.getAttribute('data-exercise-id') : null;
    const exIdxStr = btn ? btn.getAttribute('data-exercise-idx') : null;
    const exIdx = exIdxStr !== null && exIdxStr !== undefined && exIdxStr !== '' ? Number(exIdxStr) : null;
    if (exId) {
      const found = block.exercises.find(e => e.exerciseId === exId);
      if (found) return found;
    }
    if (exIdx !== null && block.exercises[exIdx]) {
      return block.exercises[exIdx];
    }
    return block.exercises[0];
  }

  function updatePromptPosition(prompt, newPos) {
    if (typeof prompt !== 'string') return prompt;
    let updated = prompt;
    if (/^Câu hỏi \d+(:?)/i.test(updated)) {
      updated = updated.replace(/^Câu hỏi \d+(:?)/i, `Câu hỏi ${newPos}$1`);
    } else if (/^Câu \d+([:.]?)/i.test(updated)) {
      updated = updated.replace(/^Câu \d+([:.]?)/i, `Câu ${newPos}$1`);
    } else if (/^Question \d+([:.]?)/i.test(updated)) {
      updated = updated.replace(/^Question \d+([:.]?)/i, `Question ${newPos}$1`);
    } else if (/^Điền vào ô trống câu \d+(:?)/i.test(updated)) {
      updated = updated.replace(/^Điền vào ô trống câu \d+(:?)/i, `Điền vào ô trống câu ${newPos}$1`);
    } else if (/^Từ vựng câu \d+/i.test(updated)) {
      updated = updated.replace(/^Từ vựng câu \d+/i, `Từ vựng câu ${newPos}`);
    } else if (/^Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi \d+(:?)/i.test(updated)) {
      updated = updated.replace(/^Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi \d+(:?)/i, `Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi ${newPos}$1`);
    } else if (/\(\d+\) __________/i.test(updated)) {
      updated = updated.replace(/\(\d+\) __________/i, `(${newPos}) __________`);
    }
    return updated;
  }

  function resequenceItemPositions() {
    let pos = 1;
    for (const b of draftState.blocks) {
      for (const itm of b.items || []) {
        itm.position = pos;
        if (itm.prompt) {
          itm.prompt = updatePromptPosition(itm.prompt, pos);
        }
        pos++;
      }
      for (const ex of b.exercises || []) {
        ex.itemIds = (b.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
      }
    }
  }

  // Ensure initial grading key entries exist
  for (const block of draftState.blocks) {
    for (const itm of block.items || []) {
      if (itm.interactionType === 'single_choice' && !draftState.gradingKey.items[itm.itemVersionId]) {
        draftState.gradingKey.items[itm.itemVersionId] = {
          graderType: 'exact_option',
          expectedOptionId: itm.options?.[0]?.id || 'A'
        };
      } else if (itm.interactionType === 'short_text' && !draftState.gradingKey.items[itm.itemVersionId]) {
        draftState.gradingKey.items[itm.itemVersionId] = {
          graderType: 'accepted_text',
          accepted: ['answer'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
      } else if (itm.interactionType === 'text_select_pair' && !draftState.gradingKey.items[itm.itemVersionId]) {
        draftState.gradingKey.items[itm.itemVersionId] = {
          graderType: 'accepted_text_exact_option',
          accepted: (itm.prompt && !/^Từ vựng câu \d+/i.test(itm.prompt)) ? [itm.prompt] : ['answer'],
          expectedOptionId: itm.options?.[0]?.id || 'opt_1',
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
      } else if (itm.graderType === 'rubric_async' && !draftState.gradingKey.items[itm.itemVersionId]) {
        draftState.gradingKey.items[itm.itemVersionId] = {
          graderType: 'rubric_async',
          rubricCode: 'rubric_translation_v1',
          rubricVersion: 1,
          rubric: {
            scoringVersion: 'rubric-translation-v1',
            maxScore: itm.maxScore || 4,
            criteria: [
              { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: (itm.maxScore || 4) / 2, requiredConcepts: [] },
              { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: (itm.maxScore || 4) / 2, requiredConcepts: [] }
            ]
          }
        };
      } else if (itm.graderType === 'unordered_group_slot' && itm.groupId && !draftState.gradingKey.groups[itm.groupId]) {
        draftState.gradingKey.groups[itm.groupId] = {
          graderType: 'unordered_group_slot',
          expectedOptionIds: (itm.options || []).slice(0, 2).map(o => o.id)
        };
      }
    }
  }

  function renderItemCard(item, itemIdx, block, blockIdx) {
      const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
      const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') && !isPronunciation;
      const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
      const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || block.layoutType === 'split_pane_matching') && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isSingleChoice = item.interactionType === 'single_choice' && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isMultiGroup = item.interactionType === 'multi_choice_group' && item.graderType === 'unordered_group_slot';
      const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isInlineCloze = item.interactionType === 'short_text' && item.layoutType === 'inline_cloze' && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isShortText = item.interactionType === 'short_text' && item.graderType !== 'rubric_async' && !isInlineCloze && !isPictorial && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isVocabPair = item.interactionType === 'text_select_pair';
      const isRubricAsync = item.graderType === 'rubric_async';
      const hasRedundantPrompt = isVocabPair || isPictorial || isPronunciation || isSentenceRewrite || isSentenceReorder || isErrorCorrection || isReadingMatching || isListeningOrder;

      const layout = item.layoutType || (item.options?.length === 3 ? 'grid_3' : (item.options?.length >= 4 ? 'grid_4' : 'grid_2'));
      const colsClass = layout === 'grid_3' ? 'grid-cols-3' : (layout === 'grid_4' ? 'grid-cols-4' : 'grid-cols-2');

      const itemKey = draftState.gradingKey.items[item.itemVersionId] || {};
      const groupKey = item.groupId ? (draftState.gradingKey.groups[item.groupId] || {}) : {};

      let specificHtml = '';

      if (isPronunciation) {
        const targetWord = item.targetWord || itemKey.targetWord || 'camera';
        const ipaTranscription = item.ipaTranscription || itemKey.ipaTranscription || '/ˈkæm.ər.ə/';
        const audioUrl = item.audioUrl || itemKey.audioUrl || '';
        const optionsList = item.options && item.options.length ? item.options : [
          { id: 'A', label: '/ˈkæm.ər.ə/' },
          { id: 'B', label: '/kəˈmɪər.ə/' },
          { id: 'C', label: '/ˈkæm.eɪ.rə/' }
        ];
        const expectedOptionId = itemKey.expectedOptionId || optionsList[0]?.id || 'A';

        const ipaButtonsHtml = COMMON_IPA_SYMBOLS.map(sym => `
          <button type="button" class="btn btn-secondary btn-sm btn-ipa-symbol" data-symbol="${escapeHtml(sym)}" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn ký tự phiên âm ${escapeHtml(sym)}">
            ${escapeHtml(sym)}
          </button>
        `).join('');

        const optionsHtml = optionsList.map(opt => `
          <div class="pronunciation-option-row">
            <label class="option-select-label" title="Chọn làm đáp án đúng">
              <input type="radio" name="pron_correct_${item.itemVersionId}" class="radio-pron-correct" value="${opt.id}" ${opt.id === expectedOptionId ? 'checked' : ''} data-correct="${opt.id}" />
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control form-control-sm input-pron-option-label" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Ký hiệu phiên âm hoặc từ cho phương án ${opt.id}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-pronunciation-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án này">✕</button>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-pronunciation-ipa">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cấu hình câu hỏi Phát âm & Phiên âm IPA (Pronunciation):</strong></span>
              <span class="badge badge-info">Bàn phím ký tự IPA 1-click & Audio</span>
            </div>

            <div class="pronunciation-grid-inputs" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:8px;">
              <div class="form-group">
                <label class="form-label"><strong>1. Từ / Cụm từ mục tiêu (Target Word):</strong></label>
                <input type="text" class="form-control input-pronunciation-word" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(targetWord)}" placeholder="Ví dụ: camera, generous, though..." />
              </div>
              <div class="form-group">
                <label class="form-label"><strong>2. File âm thanh mẫu (Audio Pronunciation URL - Tùy chọn):</strong></label>
                <input type="text" class="form-control input-pronunciation-audio" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(audioUrl)}" placeholder="https://assets.izone.edu.vn/audio/..." />
              </div>
            </div>

            <div class="form-group" style="margin-top:10px;">
              <label class="form-label"><strong>3. Ký hiệu phiên âm chuẩn quốc tế (IPA Transcription):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-ipa-transcription" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(ipaTranscription)}" placeholder="Ví dụ: /ˈkæm.ər.ə/" style="font-family: 'Consolas', 'Menlo', monospace; font-size: 1.05rem;" />
              </div>
            </div>

            <div class="ipa-symbol-keyboard-panel" style="margin-top:8px;">
              <div class="ipa-keyboard-header" style="font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:4px; text-transform:uppercase;">
                Bàn phím chèn nhanh ký tự IPA (Bấm để chèn vào ô phiên âm):
              </div>
              <div class="ipa-symbol-keyboard" style="display:flex; flex-wrap:wrap; gap:5px;">
                ${ipaButtonsHtml}
              </div>
            </div>

            <div class="ipa-phonetic-badge-wrap" style="margin-top:12px; padding:12px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
              <span class="ipa-preview-label" style="font-size:0.8rem; font-weight:700; color:#64748b; text-transform:uppercase;">Xem trước huy hiệu phiên âm (IPA Badge Preview):</span>
              <div class="ipa-phonetic-badge" style="margin-top:6px; display:inline-flex; align-items:center; padding:4px 14px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; font-family:'Consolas', 'Menlo', monospace; font-size:1.15rem; font-weight:700; color:#0f172a; letter-spacing:0.04em;">
                ${escapeHtml(formatIpaTranscription(ipaTranscription) || '/.../')}
              </div>
            </div>

            <div class="pronunciation-options-section" style="margin-top:14px;">
              <div class="template-header-bar">
                <span class="section-sublabel"><strong>Danh sách phương án phân biệt (Tích chọn đáp án đúng):</strong></span>
              </div>
              <div class="pronunciation-options-list" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
                ${optionsHtml}
              </div>
              <div class="options-actions" style="margin-top:8px;">
                <button type="button" class="btn btn-secondary btn-sm btn-add-pronunciation-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  + Thêm phương án IPA
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (isSentenceRewrite) {
        const keyword = item.keyword || itemKey.keyword || 'PREVENTED';
        const framePrefix = item.framePrefix ?? itemKey.framePrefix ?? 'His severe illness';
        const frameSuffix = item.frameSuffix ?? itemKey.frameSuffix ?? 'from going to the conference.';
        const targetAnswer = item.targetAnswer || (itemKey.accepted && itemKey.accepted[0]) || 'prevented him';
        const acceptedList = itemKey.accepted || [targetAnswer];

        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        specificHtml = `
          <div class="template-section template-sentence-transformation">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cấu hình câu biến đổi (Keyword Transformation):</strong></span>
              <span class="badge badge-info">Biến đổi câu giữ nguyên nghĩa</span>
            </div>

            <div class="form-group" style="margin-top: 8px;">
              <label class="form-label"><strong>1. Từ khóa bắt buộc (Keyword - Tự động in hoa):</strong></label>
              <input type="text" class="form-control input-transformation-keyword" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(keyword)}" placeholder="Ví dụ: PREVENTED, UNLESS, SO..." style="font-weight:700; text-transform:uppercase; letter-spacing:0.05em;" />
            </div>

            <div class="transformation-frame-inputs" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:10px;">
              <div class="form-group">
                <label class="form-label"><strong>2. Tiền tố khung câu (Frame Prefix):</strong></label>
                <input type="text" class="form-control input-frame-prefix" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(framePrefix)}" placeholder="Ví dụ: His severe illness" />
              </div>
              <div class="form-group">
                <label class="form-label"><strong>3. Hậu tố khung câu (Frame Suffix):</strong></label>
                <input type="text" class="form-control input-frame-suffix" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(frameSuffix)}" placeholder="Ví dụ: from going to the conference." />
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label"><strong>4. Đáp án mẫu trong chỗ trống (Target Answer):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-transformation-answer" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(targetAnswer)}" placeholder="Ví dụ: prevented him" />
                <button type="button" class="btn btn-secondary btn-generate-transformation-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động sinh các biến thể viết tắt/mở rộng">
                  ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể
                </button>
              </div>
            </div>

            <div class="transformation-frame-preview" style="margin-top: 12px; padding: 12px 16px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
              <div class="frame-preview-title" style="font-size:0.8rem; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase;">Xem trước khung câu hoàn chỉnh:</div>
              <div class="frame-preview-content" style="font-size:1rem; color:#1e293b;">
                <span class="frame-prefix-text" style="font-weight:600;">${escapeHtml(framePrefix || '')}</span>
                <span class="frame-blank-placeholder" style="display:inline-block; margin:0 4px; padding:2px 10px; background:#eff6ff; border-bottom:2px solid #3b82f6; color:#1d4ed8; font-weight:700;">[ ${escapeHtml(targetAnswer || '_____')} ]</span>
                <span class="frame-suffix-text" style="font-weight:600;">${escapeHtml(frameSuffix || '')}</span>
              </div>
            </div>

            <!-- Accepted variants chips -->
            <div class="variant-chips-container" style="margin-top: 12px;">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể đáp án được chấp nhận (${acceptedList.length}/20)</span>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-transformation-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể đáp án (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isSentenceReorder) {
        const tokens = item.tokens || itemKey.tokens || tokenizeSentence(item.targetSentence || 'She / has worked / at the company / for five years');
        const distractors = item.distractors || itemKey.distractors || [];
        const targetSentence = item.targetSentence || (itemKey.accepted && itemKey.accepted[0]) || tokens.join(' ');
        const rawTokensStr = tokens.join(' / ');
        const scrambled = scrambleTokens(tokens);

        const acceptedList = itemKey.accepted || [targetSentence];
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        const distractorChipsHtml = distractors.map((d, dIdx) => `
          <span class="distractor-chip" data-distractor="${escapeHtml(d)}" data-distractor-idx="${dIdx}">
            <span class="chip-text"><span class="distractor-symbol">×</span> ${escapeHtml(d)}</span>
            <button type="button" class="btn-remove-distractor-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-distractor-idx="${dIdx}" title="Xóa từ gây nhiễu">✕</button>
          </span>
        `).join('');

        const scrambledPreviewChips = [...scrambled, ...distractors].map((tok) => `
          <span class="token-chip ${distractors.includes(tok) ? 'token-distractor' : ''}">${escapeHtml(tok)}</span>
        `).join('');

        specificHtml = `
          <div class="template-section template-sentence-reorder">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cấu hình câu cần sắp xếp (Token Scramble):</strong></span>
              <span class="badge badge-info">Tự động xáo trộn từ/cụm từ</span>
            </div>

            <div class="form-group" style="margin-top: 8px;">
              <label class="form-label"><strong>1. Câu hoàn chỉnh mục tiêu (Target Sentence):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-target-sentence" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(targetSentence)}" placeholder="Nhập câu chuẩn hoàn chỉnh..." />
                <button type="button" class="btn btn-secondary btn-tokenize-sentence" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động phân rã câu thành các mảnh từ">
                  ${renderSvgIcon('zap', 'icon-inline')} Phân rã từ (Tokenize)
                </button>
              </div>
            </div>

            <div class="form-group" style="margin-top: 10px;">
              <label class="form-label"><strong>2. Các mảnh từ phân tách bởi dấu gạch chéo <code>/</code> hoặc ngoặc vuông <code>[ ]</code>:</strong></label>
              <input type="text" class="form-control input-raw-tokens" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawTokensStr)}" placeholder="She / has worked / at the company / for five years" />
              <div class="reorder-tokens-hint" style="font-size:0.78rem;color:#64748b;margin-top:4px;">
                Ví dụ: <code>She / has worked / at the company / for five years</code> hoặc <code>[We] [have decided] [to postpone]</code>.
              </div>
            </div>

            <!-- Scrambled preview pool -->
            <div class="scrambled-preview-box" style="margin-top: 10px; padding: 10px 14px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
              <div class="scrambled-title-bar" style="display:flex; justify-content:space-between; align-items:center;">
                <span class="preview-mini-label" style="font-size:0.76rem; font-weight:700; color:#475569; text-transform:uppercase;">Mô phỏng ngân hàng thẻ từ xáo trộn (${tokens.length + distractors.length} thẻ):</span>
                <span class="scramble-refresh-hint" style="font-size:0.75rem; color:#94a3b8;">Học viên bấm vào thẻ để ghép câu</span>
              </div>
              <div class="scrambled-tokens-pool" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px;">
                ${scrambledPreviewChips || '<em>Chưa có mảnh từ nào...</em>'}
              </div>
            </div>

            <!-- Distractor manager -->
            <div class="distractors-manager-box" style="margin-top: 12px;">
              <label class="form-label"><strong>3. Từ gây nhiễu (Distractor Tokens - Tùy chọn):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-add-distractor" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="Nhập từ gây nhiễu (không có trong câu đúng)..." />
                <button type="button" class="btn btn-secondary btn-sm btn-add-distractor-btn" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  + Thêm từ nhiễu
                </button>
              </div>
              <div class="distractor-chips-wrap" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;">
                ${distractorChipsHtml || '<span style="font-size:0.8rem;color:#94a3b8;">Chưa có từ gây nhiễu.</span>'}
              </div>
            </div>

            <!-- Accepted sentence variants -->
            <div class="variant-chips-container" style="margin-top: 12px;">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể câu được chấp nhận (${acceptedList.length}/20)</span>
                <button type="button" class="btn btn-secondary btn-sm btn-generate-reorder-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm câu biến thể (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isErrorCorrection) {
        const expectedErrors = itemKey.expectedErrors || ['she'];
        const expectedCorrections = itemKey.expectedCorrections || ['her'];
        const scoringRule = itemKey.scoringRule || item.scoringRule || 'split_points';

        const errorChipsHtml = expectedErrors.map(v => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-error-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        const correctionChipsHtml = expectedCorrections.map(v => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-correction-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        specificHtml = `
          <div class="template-section template-error-correction">
            <div class="template-header-bar">
              <span class="section-sublabel"><strong>Cặp dữ liệu tìm lỗi sai và sửa lại:</strong></span>
              <div class="scoring-rule-selector">
                <label class="form-label" style="margin: 0; font-size: 0.8rem; font-weight: 600;">Quy tắc chấm điểm:</label>
                <select class="form-select form-select-sm select-scoring-rule" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  <option value="split_points" ${scoringRule === 'split_points' ? 'selected' : ''}>Chia điểm (50% Lỗi sai + 50% Sửa lại)</option>
                  <option value="all_or_nothing" ${scoringRule === 'all_or_nothing' ? 'selected' : ''}>Trọn điểm (Đúng cả 2 mới có điểm)</option>
                </select>
              </div>
            </div>

            <div class="dual-input-grid">
              <!-- Error identification box -->
              <div class="dual-box error-box">
                <label class="form-label"><strong>1. Lỗi sai trong câu (Identified Error):</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-error-token" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(expectedErrors[0] || '')}" placeholder="Từ / cụm từ sai (ví dụ: she)..." />
                  <button type="button" class="btn btn-secondary btn-sm btn-generate-error-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động sinh biến thể cho lỗi sai">
                    ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể
                  </button>
                </div>
                <div class="variant-chips-container" style="margin-top: 8px;">
                  <div class="chips-meta-bar">
                    <span class="chips-count-badge">Biến thể lỗi sai (${expectedErrors.length}/20)</span>
                    <input type="text" class="form-control form-control-sm input-add-error-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể lỗi (Enter)..." />
                  </div>
                  <div class="variant-chips-wrap">
                    ${errorChipsHtml}
                  </div>
                </div>
              </div>

              <!-- Correction box -->
              <div class="dual-box correction-box">
                <label class="form-label"><strong>2. Phần sửa lại đúng (Correction):</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-correction-token" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(expectedCorrections[0] || '')}" placeholder="Từ / cụm từ sửa đúng (ví dụ: her)..." />
                  <button type="button" class="btn btn-secondary btn-sm btn-generate-correction-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động sinh biến thể cho phần sửa">
                    ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể
                  </button>
                </div>
                <div class="variant-chips-container" style="margin-top: 8px;">
                  <div class="chips-meta-bar">
                    <span class="chips-count-badge">Biến thể sửa đúng (${expectedCorrections.length}/20)</span>
                    <input type="text" class="form-control form-control-sm input-add-correction-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể sửa (Enter)..." />
                  </div>
                  <div class="variant-chips-wrap">
                    ${correctionChipsHtml}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (isReadingMatching) {
        const passageText = block.readingPassage || block.stimulusReadingPassage || item.readingPassage || '';
        const detectedParagraphs = extractParagraphLabels(passageText);
        const expectedId = itemKey.expectedOptionId || item.options?.[0]?.id || '';
        const optionsList = item.options || [];

        const optionsHtml = optionsList.map(opt => `
          <div class="matching-heading-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Chọn làm tiêu đề/đáp án đúng cho câu này">
              <input type="radio" name="radio_matching_correct_${item.itemVersionId}" class="radio-matching-correct" value="${opt.id}" ${opt.id === expectedId ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control form-control-sm matching-heading-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Nội dung Heading / Tiêu đề ${opt.id}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-matching-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án này">✕</button>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-reading-matching">
            <div class="split-pane-header-bar">
              <span class="badge badge-info split-pane-preview-badge">${renderSvgIcon('book', 'icon-inline')} Bố cục chia đôi màn hình (Split-Pane 2 cột: Bài đọc bên trái, Câu hỏi bên phải)</span>
              ${detectedParagraphs.length ? `<span class="badge badge-success">Phát hiện ${detectedParagraphs.length} đoạn văn: [${detectedParagraphs.join(', ')}]</span>` : ''}
            </div>

            <div class="form-group passage-input-group" style="margin-top: 8px;">
              <div class="passage-label-bar">
                <label class="form-label" style="margin: 0;"><strong>Văn bản bài đọc (Reading Passage):</strong></label>
                <button type="button" class="btn btn-secondary btn-sm btn-extract-paragraphs" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động nhận diện các đoạn văn Paragraph A, B, C...">
                  ${renderSvgIcon('search', 'icon-inline')} Quét nhãn đoạn văn
                </button>
              </div>
              <textarea class="form-control input-reading-passage" rows="8" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="Nhập văn bản bài đọc tại đây (Hỗ trợ nhãn Paragraph A:, [B], Section C...)...">${escapeHtml(passageText)}</textarea>
            </div>

            <div class="matching-headings-pool" style="margin-top: 12px;">
              <div class="template-header-bar">
                <span class="section-sublabel"><strong>Danh sách Headings / Tiêu đề lựa chọn (Tích chọn đáp án đúng):</strong></span>
              </div>
              <div class="matching-headings-list">
                ${optionsHtml}
              </div>
              <div class="options-actions" style="margin-top: 8px;">
                <button type="button" class="btn btn-secondary btn-sm btn-add-matching-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  + Thêm Heading mới
                </button>
              </div>
            </div>
          </div>
        `;
      } else if (isListeningOrder) {
        const events = item.events || [
          { label: 'A', rank: 1, text: 'Sự kiện A' },
          { label: 'B', rank: 2, text: 'Sự kiện B' },
          { label: 'C', rank: 3, text: 'Sự kiện C' },
          { label: 'D', rank: 4, text: 'Sự kiện D' },
          { label: 'E', rank: 5, text: 'Sự kiện E' }
        ];
        const audioUrl = item.audioUrl || block.audioUrl || '';
        const orderValidation = validateListeningOrderUniqueness(events);
        const sortedByRank = [...events].sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));

        const eventsHtml = events.map((ev, eIdx) => `
          <div class="listening-event-row" data-event-idx="${eIdx}">
            <div class="event-badge">${escapeHtml(ev.label || String.fromCharCode(65 + eIdx))}</div>
            <input type="text" class="form-control form-control-sm input-event-text" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-event-idx="${eIdx}" value="${escapeHtml(ev.text || '')}" placeholder="Nội dung sự kiện ${ev.label}..." />
            <div class="rank-selector-wrap">
              <label class="rank-label">Vị trí:</label>
              <select class="form-select form-select-sm select-event-rank" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-event-idx="${eIdx}">
                ${Array.from({ length: events.length }, (_, i) => i + 1).map(r => `
                  <option value="${r}" ${Number(ev.rank) === r ? 'selected' : ''}>Thứ ${r}</option>
                `).join('')}
              </select>
            </div>
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-event" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-event-idx="${eIdx}" title="Xóa sự kiện">✕</button>
          </div>
        `).join('');

        const previewBadges = sortedByRank.map(ev => `
          <div class="timeline-step">
            <span class="step-num">#${ev.rank || '?'}</span>
            <span class="step-card"><strong class="step-label">${ev.label}:</strong> ${escapeHtml(ev.text ? (ev.text.length > 28 ? ev.text.substring(0, 28) + '...' : ev.text) : '---')}</span>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-listening-order">
            <div class="form-group audio-input-group">
              <label class="form-label"><strong>File ghi âm Audio (URL / Path):</strong></label>
              <input type="text" class="form-control form-control-sm input-listening-audio" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(audioUrl)}" placeholder="assets/34/test-1/listening.mp3 hoặc https://..." />
            </div>

            <div class="template-header-bar" style="margin-top: 12px;">
              <span class="section-sublabel"><strong>Danh sách chuỗi sự kiện & Thứ tự chuẩn:</strong></span>
              <div class="validation-status-wrap">
                ${orderValidation.isValid 
                  ? `<span class="badge badge-success">✓ Thứ tự hợp lệ (${events.length} bước)</span>` 
                  : `<span class="badge badge-warning">⚠ Trùng hoặc thiếu thứ tự: ${orderValidation.duplicates.length ? `Trùng [#${orderValidation.duplicates.join(', ')}]` : ''} ${orderValidation.missingRanks.length ? `Thiếu [#${orderValidation.missingRanks.join(', ')}]` : ''}</span>`}
              </div>
            </div>

            <div class="listening-events-list">
              ${eventsHtml}
            </div>

            <div class="options-actions" style="margin-top: 8px;">
              <button type="button" class="btn btn-secondary btn-sm btn-add-listening-event" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                + Thêm sự kiện tiếp theo (${String.fromCharCode(65 + events.length)})
              </button>
            </div>

            <div class="timeline-preview-bar">
              <div class="timeline-preview-label">Trình tự mẫu (Chronological Timeline Preview):</div>
              <div class="timeline-steps-container">
                ${previewBadges}
              </div>
            </div>
          </div>
        `;
      } else if (isSingleChoice) {
        const expectedId = itemKey.expectedOptionId || item.options?.[0]?.id || 'A';
        const optionsHtml = (item.options || []).map((opt) => `
          <div class="option-item-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Chọn làm đáp án đúng">
              <input type="radio" name="radio_correct_${item.itemVersionId}" class="radio-correct" value="${opt.id}" ${opt.id === expectedId ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control option-label-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Phương án ${opt.id}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án">✕</button>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-single-choice">
            <div class="template-header-bar">
              <span class="section-sublabel">Các phương án lựa chọn (Tích tròn chọn đáp án đúng):</span>
              <div class="layout-selector-wrap">
                <span class="layout-title">Bố cục:</span>
                <select class="form-select form-select-sm select-layout" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  <option value="grid_2" ${layout === 'grid_2' ? 'selected' : ''}>2 cột (grid_2)</option>
                  <option value="grid_3" ${layout === 'grid_3' ? 'selected' : ''}>3 cột (grid_3)</option>
                  <option value="grid_4" ${layout === 'grid_4' ? 'selected' : ''}>4 cột (grid_4)</option>
                </select>
              </div>
            </div>
            <div class="builder-options-grid ${colsClass}">
              ${optionsHtml}
            </div>
            <div class="options-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-add-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                + Thêm phương án
              </button>
            </div>
          </div>
        `;
      } else if (isMultiGroup) {
        const expectedIds = groupKey.expectedOptionIds || ['A', 'B'];
        const groupIdVal = item.groupId || `group_${blockIdx + 1}`;
        const optionsHtml = (item.options || []).map((opt) => `
          <div class="option-item-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Tích chọn đáp án đúng cho nhóm">
              <input type="checkbox" class="checkbox-correct" value="${opt.id}" ${expectedIds.includes(opt.id) ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control option-label-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Phương án ${opt.id}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án">✕</button>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-multi-group">
            <div class="template-header-bar">
              <div class="group-config-wrap">
                <span class="badge-group-pill">Nhóm unordered_group_slot</span>
                <label class="group-id-label">Mã nhóm:
                  <input type="text" class="form-control form-control-sm input-group-id" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(groupIdVal)}" placeholder="group_1" />
                </label>
              </div>
              <div class="layout-selector-wrap">
                <span class="layout-title">Bố cục:</span>
                <select class="form-select form-select-sm select-layout" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  <option value="grid_2" ${layout === 'grid_2' ? 'selected' : ''}>2 cột (grid_2)</option>
                  <option value="grid_3" ${layout === 'grid_3' ? 'selected' : ''}>3 cột (grid_3)</option>
                  <option value="grid_4" ${layout === 'grid_4' ? 'selected' : ''}>4 cột (grid_4)</option>
                </select>
              </div>
            </div>
            <p class="template-help-text">Chấm độc lập thứ tự (unordered_group_slot): Học viên chọn đúng các phương án được tích bên dưới theo bất kỳ thứ tự nào đều được tính điểm.</p>
            <div class="builder-options-grid ${colsClass}">
              ${optionsHtml}
            </div>
            <div class="options-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-add-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                + Thêm phương án
              </button>
            </div>
          </div>
        `;
      } else if (isInlineCloze) {
        const acceptedList = itemKey.accepted || [''];
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        const livePreviewHtml = renderInlineClozeMarkup(item.prompt || '', [item], {}, { disabled: true });

        specificHtml = `
          <div class="template-section template-inline-cloze">
            <div class="cloze-editor-box">
              <div class="cloze-toolbar">
                <span class="cloze-tool-label"><strong>Soạn thảo nội dung chỗ trống (Inline Cloze):</strong></span>
                <button type="button" class="btn btn-secondary btn-sm btn-insert-blank-token" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn chỗ trống (${item.position}) __________">
                  + Chèn chỗ trống (${item.position}) __________
                </button>
              </div>
              <p class="cloze-help-text" style="font-size: 0.8rem; color: #64748b; margin: 4px 0 8px;">
                Nhập câu hoặc đoạn văn bản chứa token định dạng <code>(${item.position}) __________</code> hoặc <code>{{${item.position}}}</code>. Trình thi sẽ tự động nhúng ô nhập trực tiếp vào dòng chữ.
              </p>
            </div>

            <div class="cloze-live-preview-box" style="margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;">
              <span class="preview-mini-label" style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase;">Xem trước hiển thị nội tuyến:</span>
              <div class="cloze-preview-content" style="margin-top: 6px; line-height: 1.8;">
                ${livePreviewHtml || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>'}
              </div>
            </div>

            <div class="cloze-answers-config" style="margin-top: 12px;">
              <label class="form-label"><strong>Đáp án chuẩn cho chỗ trống (${item.position}):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-fitb-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(acceptedList[0] || '')}" placeholder="Nhập đáp án chuẩn cho chỗ trống..." />
                <button type="button" class="btn btn-secondary btn-generate-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
              </div>
              <div class="variant-chips-container" style="margin-top: 8px;">
                <div class="chips-meta-bar">
                  <span class="chips-count-badge">Các biến thể được chấp nhận (${acceptedList.length}/40)</span>
                  <div class="quick-add-variant">
                    <input type="text" class="form-control form-control-sm input-add-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                  </div>
                </div>
                <div class="variant-chips-wrap">
                  ${chipsHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (isPictorial) {
        const acceptedList = itemKey.accepted || [''];
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        const imgSrc = item.image || item.stimulusImageUrl || '';

        specificHtml = `
          <div class="template-section template-pictorial-vocab">
            <div class="pictorial-meta-grid">
              <div class="form-group pictorial-image-group">
                <label class="form-label"><strong>Ảnh minh họa (Image URL / Path):</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-pictorial-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(imgSrc)}" placeholder="assets/test 1/vocabulary/image1.png hoặc https://..." />
                </div>
                ${imgSrc ? `<div class="pictorial-thumb-preview"><img src="${escapeHtml(imgSrc)}" alt="Image Preview" onerror="this.style.display='none'" /></div>` : ''}
              </div>

              <div class="form-group pictorial-target-group">
                <label class="form-label"><strong>Từ / Cụm từ tiếng Anh chuẩn:</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-pictorial-target input-fitb-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(acceptedList[0] || '')}" placeholder="Nhập từ/cụm từ mẫu (ví dụ: school kids)..." />
                  <button type="button" class="btn btn-secondary btn-generate-hangman" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động tạo gợi ý Hangman từ từ mục tiêu">
                    ${renderSvgIcon('zap', 'icon-inline')} Sinh gợi ý Hangman
                  </button>
                </div>
              </div>
            </div>

            <div class="pictorial-hints-grid">
              <div class="form-group">
                <label class="form-label"><strong>Gợi ý chữ cái (Letter / Hangman hint):</strong></label>
                <input type="text" class="form-control input-pictorial-letter-hint" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(item.letterHint || '')}" placeholder="s _ _ _ _ _ k _ _ _" />
              </div>
              <div class="form-group">
                <label class="form-label"><strong>Gợi ý nghĩa tiếng Việt (Caption hint):</strong></label>
                <input type="text" class="form-control input-pictorial-caption" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(item.captionHint || '')}" placeholder="(độ tuổi đi học)" />
              </div>
            </div>

            <div class="variant-chips-container" style="margin-top: 10px;">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể được chấp nhận (${acceptedList.length}/40)</span>
                <button type="button" class="btn btn-secondary btn-sm btn-generate-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isShortText) {
        const acceptedList = itemKey.accepted || [''];
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        specificHtml = `
          <div class="template-section template-fitb">
            <div class="fitb-raw-box">
              <label class="form-label">Đáp án gốc (Nhập từ/câu mẫu để tự động mở rộng biến thể dấu câu, viết tắt, nháy đơn):</label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-fitb-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(acceptedList[0] || '')}" placeholder="Nhập đáp án chuẩn..." />
                <button type="button" class="btn btn-secondary btn-generate-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
              </div>
            </div>
            <div class="variant-chips-container">
              <div class="chips-meta-bar">
                <span class="chips-count-badge">Các biến thể được chấp nhận (${acceptedList.length}/40)</span>
                <div class="quick-add-variant">
                  <input type="text" class="form-control form-control-sm input-add-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                </div>
              </div>
              <div class="variant-chips-wrap">
                ${chipsHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isVocabPair) {
        const rawAccepted = itemKey.accepted || [];
        const filteredAccepted = rawAccepted.filter(v => v && !/^Từ vựng câu \d+/i.test(v));
        const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này">✕</button>
          </span>
        `).join('');

        const expectedOptId = itemKey.expectedOptionId || item.options?.[0]?.id || 'opt_1';
        const optionsList = item.options && item.options.length ? item.options : [
          { id: 'opt_1', label: 'Nghĩa phương án 1' },
          { id: 'opt_2', label: 'Nghĩa phương án 2' },
          { id: 'opt_3', label: 'Nghĩa phương án 3' },
          { id: 'opt_4', label: 'Nghĩa phương án 4' }
        ];

        const dropdownOptionsHtml = optionsList.map(opt => `
          <option value="${opt.id}" ${opt.id === expectedOptId ? 'selected' : ''}>
            [${opt.id}] ${escapeHtml(opt.label || '(Chưa nhập nghĩa)')}
          </option>
        `).join('');

        const optionsHtml = optionsList.map((opt) => `
          <div class="vocab-meaning-row ${opt.id === expectedOptId ? 'is-correct' : ''}" data-option-id="${opt.id}">
            <label class="option-select-label" title="Chọn làm nghĩa tiếng Việt đúng">
              <input type="radio" name="radio_vocab_correct_${item.itemVersionId}" class="radio-vocab-correct" value="${opt.id}" ${opt.id === expectedOptId ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${opt.id}</span>
            </label>
            <input type="text" class="form-control vocab-meaning-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Nghĩa tiếng Việt..." />
            <button type="button" class="btn btn-icon btn-sm btn-del-vocab-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa nghĩa này">✕</button>
          </div>
        `).join('');

        let hasPrevVocabItem = false;
        for (let p = itemIdx - 1; p >= 0; p--) {
          if (block.items[p] && block.items[p].interactionType === 'text_select_pair') {
            hasPrevVocabItem = true;
            break;
          }
        }
        const totalVocabItemsInBlock = (block.items || []).filter(it => it.interactionType === 'text_select_pair').length;

        const rawVocabVal = acceptedList[0] || (item.prompt && !/^Từ vựng câu \d+/i.test(item.prompt) ? item.prompt : '');

        specificHtml = `
          <div class="template-section template-vocab-pair">
            <div class="vocab-english-box">
              <label class="form-label"><strong>1. Từ tiếng Anh chuẩn (50% điểm):</strong></label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-vocab-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawVocabVal)}" placeholder="Nhập từ tiếng Anh chuẩn..." />
                <button type="button" class="btn btn-secondary btn-generate-vocab-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('zap', 'icon-inline')} Sinh biến thể tự động
                </button>
              </div>
              <div class="variant-chips-container" style="margin-top: 8px;">
                <div class="chips-meta-bar">
                  <span class="chips-count-badge">Các biến thể tiếng Anh được chấp nhận (${acceptedList.length}/40)</span>
                  <div class="quick-add-variant">
                    <input type="text" class="form-control form-control-sm input-add-vocab-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                  </div>
                </div>
                <div class="variant-chips-wrap">
                  ${chipsHtml}
                </div>
              </div>
            </div>

            <div class="vocab-options-box" style="margin-top: 14px;">
              <div class="template-header-bar vocab-options-header-bar">
                <label class="form-label" style="margin: 0;"><strong>2. Danh sách nghĩa tiếng Việt (50% điểm - Tích tròn nghĩa đúng):</strong></label>
              </div>

              <!-- Compact selector row -->
              <div class="vocab-compact-selector-row">
                <span style="font-size: 0.82rem; font-weight: 700; color: #334155; white-space: nowrap;">Nghĩa đúng câu này:</span>
                <select class="form-select form-select-sm select-vocab-correct-dropdown" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${dropdownOptionsHtml}
                </select>
                <button type="button" class="btn btn-secondary btn-sm btn-toggle-vocab-bank" data-target="vocab-bank-${blockIdx}-${itemIdx}">
                  Ngân hàng nghĩa (${optionsList.length}) ▼
                </button>
              </div>

              <!-- Collapsible Bank Details -->
              <div class="vocab-bank-collapsible" id="vocab-bank-${blockIdx}-${itemIdx}" style="display: none;">
                <div class="vocab-options-tools-bar" style="margin-bottom: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-secondary btn-sm btn-bulk-paste-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Dán nhanh nhiều nghĩa từ Excel hoặc Word">
                    ${renderSvgIcon('copy', 'icon-inline')} Dán nhanh danh sách nghĩa
                  </button>
                  ${hasPrevVocabItem ? `
                    <button type="button" class="btn btn-secondary btn-sm btn-copy-prev-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Sao chép toàn bộ danh sách nghĩa từ câu từ vựng liền trước">
                      ${renderSvgIcon('download', 'icon-inline')} Lấy nghĩa từ câu trước
                    </button>
                  ` : ''}
                  ${totalVocabItemsInBlock > 1 ? `
                    <button type="button" class="btn btn-secondary btn-sm btn-sync-vocab-options-to-block" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Áp dụng toàn bộ danh sách nghĩa này cho tất cả câu cặp từ vựng trong phần này">
                      ${renderSvgIcon('refresh', 'icon-inline')} Áp dụng cho cả phần này
                    </button>
                  ` : ''}
                </div>

                <!-- Collapsible Bulk Paste Box -->
                <div class="vocab-bulk-paste-panel" id="vocab-bulk-paste-${blockIdx}-${itemIdx}" style="display: none; margin-bottom: 10px;">
                  <div class="bulk-paste-caption">
                    <span>Nhập hoặc dán danh sách nghĩa tiếng Việt (Mỗi dòng là một nghĩa):</span>
                  </div>
                  <textarea class="form-control input-bulk-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="4" placeholder="hướng ngoại&#10;môi trường&#10;kiên cường, có khả năng phục hồi&#10;thân thiện, cởi mở"></textarea>
                  <div class="bulk-paste-actions">
                    <button type="button" class="btn btn-primary btn-sm btn-apply-bulk-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                      Áp dụng danh sách nghĩa
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm btn-cancel-bulk-vocab-options" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                      Hủy
                    </button>
                  </div>
                </div>

                <div class="vocab-bank-scrollable">
                  <div class="vocab-meaning-grid">
                    ${optionsHtml}
                  </div>
                </div>
                <div class="options-actions" style="margin-top: 8px;">
                  <button type="button" class="btn btn-secondary btn-sm btn-add-vocab-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                    + Thêm nghĩa tiếng Việt
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (isRubricAsync) {
        const rubricObj = itemKey.rubric || {
          scoringVersion: 'rubric-translation-v1',
          maxScore: item.maxScore || 4,
          criteria: [
            { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: (item.maxScore || 4) / 2, requiredConcepts: [] },
            { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: (item.maxScore || 4) / 2, requiredConcepts: [] }
          ]
        };
        const scoringVer = rubricObj.scoringVersion || 'rubric-translation-v1';
        const criteriaList = rubricObj.criteria || [];
        const criteriaHtml = criteriaList.map((crit, cIdx) => `
          <div class="rubric-criterion-card" data-criterion-idx="${cIdx}">
            <div class="criterion-card-header">
              <div class="criterion-header-left">
                <span class="criterion-id-badge">${escapeHtml(crit.id)}</span>
                <input type="text" class="form-control form-control-sm criterion-label-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" value="${escapeHtml(crit.label || '')}" placeholder="Tên tiêu chí..." />
              </div>
              <div class="criterion-header-right">
                <label class="form-label" style="margin:0;font-size:0.76rem;">Điểm:</label>
                <input type="number" class="form-control form-control-sm criterion-max-score-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" value="${crit.maxScore}" step="0.5" min="0" max="100" />
                <button type="button" class="btn btn-icon btn-sm btn-del-criterion" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" title="Xóa tiêu chí">✕</button>
              </div>
            </div>
            <div class="criterion-card-body">
              <label class="form-label" style="margin:0;font-size:0.75rem;color:#64748b;">Từ khóa / khái niệm bắt buộc (Phân tách bởi dấu phẩy):</label>
              <input type="text" class="form-control form-control-sm criterion-concepts-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" value="${escapeHtml((crit.requiredConcepts || []).join(', '))}" placeholder="keyword1, phrase2..." />
            </div>
          </div>
        `).join('');

        const promptGuidance = rubricObj.promptGuidance || '';

        specificHtml = `
          <div class="template-section template-rubric-async">
            <div class="rubric-preset-selector">
              <span class="preset-title">Mẫu Rubric gợi ý (Preset):</span>
              <select class="form-select form-select-sm select-rubric-preset" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                <option value="translation" ${scoringVer.includes('translation') ? 'selected' : ''}>Dịch thuật (Translation - 50% Meaning, 50% Grammar)</option>
                <option value="speaking" ${scoringVer.includes('speaking') ? 'selected' : ''}>Speaking dạng văn bản (40% Ý tưởng, 30% Từ vựng, 30% Ngữ pháp)</option>
                <option value="comprehension" ${scoringVer.includes('comprehension') ? 'selected' : ''}>Đọc hiểu Khối 03 (70% Comprehension, 30% Keywords)</option>
                <option value="custom" ${(!scoringVer.includes('translation') && !scoringVer.includes('speaking') && !scoringVer.includes('comprehension')) ? 'selected' : ''}>Tự thiết lập (Custom Rubric)</option>
              </select>
            </div>

            <div class="rubric-tabs-container">
              <div class="rubric-tabs-header">
                <button type="button" class="btn-rubric-tab active" data-tab="criteria" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  📋 Tiêu chí chấm điểm (${criteriaList.length})
                </button>
                <button type="button" class="btn-rubric-tab" data-tab="guidance" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  💡 Hướng dẫn Prompt nâng cao
                </button>
                <button type="button" class="btn-rubric-tab" data-tab="sandbox" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  🧪 Sandbox Chấm thử AI
                </button>
              </div>

              <div class="rubric-tab-content" style="margin-top: 10px;">
                <div class="rubric-tab-pane pane-criteria" id="pane-criteria-${blockIdx}-${itemIdx}">
                  <div class="rubric-criteria-list">
                    ${criteriaHtml}
                  </div>
                  <div class="criteria-actions" style="margin-top: 8px;">
                    <button type="button" class="btn btn-secondary btn-sm btn-add-criterion" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                      + Thêm tiêu chí (Criterion)
                    </button>
                  </div>
                </div>

                <div class="rubric-tab-pane pane-guidance" id="pane-guidance-${blockIdx}-${itemIdx}" style="display: none;">
                  <label class="form-label">Chỉ dẫn nâng cao dành cho AI Grader (Custom Prompt Instructions):</label>
                  <textarea class="form-control input-rubric-guidance" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="4" placeholder="Ví dụ: Chấp nhận các cách diễn đạt đồng nghĩa cho từ 'thành công'; trừ điểm nếu thiếu liên từ nối...">${escapeHtml(promptGuidance)}</textarea>
                </div>

                <div class="rubric-tab-pane pane-sandbox" id="pane-sandbox-${blockIdx}-${itemIdx}" style="display: none;">
                  <div class="rubric-sandbox-panel">
                    <p class="sandbox-desc">Nhập câu trả lời mẫu của học sinh để chạy thử nghiệm bộ chấm qua AI Gateway ngay lập tức (không lưu bài thi):</p>
                    <div class="sandbox-input-group">
                      <textarea class="form-control input-sandbox-sample" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="3" placeholder="Nhập câu trả lời mẫu của học viên để chấm thử..."></textarea>
                      <button type="button" class="btn btn-primary btn-sm btn-trigger-sandbox" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                        ${renderSvgIcon('zap', 'icon-inline')} Chấm thử AI
                      </button>
                    </div>
                    <div class="sandbox-results-container" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" style="display: none;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      const typeLabel = isPronunciation
        ? 'Phát âm (Pronunciation)'
        : (isSentenceRewrite
          ? 'Biến đổi câu (Transformation)'
          : (isSingleChoice
            ? 'Trắc nghiệm 1 đáp án (Single Choice)'
            : (isMultiGroup
              ? 'Nhóm chọn nhiều (Multi-Select Group)'
              : (isSentenceReorder
                ? 'Sắp xếp câu (Sentence Reorder)'
                : (isErrorCorrection
                  ? 'Tìm và sửa lỗi (Error Correction)'
                  : (isVocabPair
                    ? 'Cặp từ vựng (Vocabulary Pair - 50/50 Partial)'
                    : (isRubricAsync
                      ? 'Tự luận chấm AI (AI-Graded Rubric)'
                      : (isPictorial
                        ? 'Thẻ từ vựng qua ảnh (Pictorial Card)'
                        : (isInlineCloze
                          ? 'Điền từ nội tuyến (Inline Cloze)'
                          : 'Điền ô trống (Short Text)')))))))));

      return `
        <div class="builder-item-card" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-item-id="${item.itemVersionId}">
          <div class="builder-item-header">
            <div class="item-title-info">
              <button type="button" class="btn btn-icon btn-sm btn-toggle-item-collapse" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Thu gọn / Mở rộng câu hỏi" aria-label="Thu gọn hoặc mở rộng câu hỏi">▾</button>
              <span class="item-pos-pill">Câu ${item.position}</span>
              <span class="item-kind-pill ${item.interactionType}">${typeLabel}</span>
              <span class="item-prompt-preview-snippet">${escapeHtml((item.prompt || '').trim().substring(0, 55) + ((item.prompt || '').length > 55 ? '...' : ''))}</span>
            </div>
            <div class="item-header-controls">
              <button type="button" class="btn btn-icon btn-sm btn-move-item-up" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" ${itemIdx === 0 ? 'disabled' : ''} title="Di chuyển câu hỏi lên">↑</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-item-down" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" ${itemIdx === (block.items || []).length - 1 ? 'disabled' : ''} title="Di chuyển câu hỏi xuống">↓</button>
              <label class="item-score-label">Điểm:
                <input type="number" class="form-control form-control-sm item-max-score-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${item.maxScore || 1}" min="0" max="100" />
              </label>
              <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-delete-item" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Xóa câu hỏi này">✕</button>
            </div>
          </div>
          <div class="builder-item-body">
            ${!hasRedundantPrompt ? `
            <div class="form-group item-prompt-group">
              <div class="item-prompt-header-bar">
                <label class="form-label">Đề bài / Nội dung câu hỏi (Question Prompt):</label>
                <span class="prompt-char-count">${(item.prompt || '').length} ký tự</span>
              </div>
              <textarea class="form-control item-prompt-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="4" placeholder="Nhập đề bài, trích đoạn hoặc yêu cầu của câu hỏi...">${escapeHtml(item.prompt || '')}</textarea>
            </div>
            ` : ''}
            ${specificHtml}
          </div>
        </div>
      `;
  }

  function renderExerciseItems(block, blockIdx, exercise, exIdx) {
    const items = (block.items || []).filter(it => {
      if (it.exerciseId === exercise.exerciseId) return true;
      if (!it.exerciseId && exIdx === 0) {
        it.exerciseId = exercise.exerciseId;
        it.exerciseTitle = exercise.title || `Exercise ${exercise.exerciseNumber || 1}`;
        return true;
      }
      return false;
    });
    if (!items.length) {
      return `<div class="empty-items-notice">Chưa có câu hỏi nào trong bài tập này. Chọn một dạng câu hỏi bên dưới để thêm.</div>`;
    }
    return items.map(item => {
      const itemIdx = block.items.indexOf(item);
      return renderItemCard(item, itemIdx, block, blockIdx);
    }).join('');
  }

  function renderBlockExercises(block, blockIdx) {
    const exercises = block.exercises || [];
    return exercises.map((ex, exIdx) => {
      const exItems = (block.items || []).filter(it => it.exerciseId === ex.exerciseId);
      const isFirst = exIdx === 0;
      const isLast = exIdx === exercises.length - 1;
      const isOnly = exercises.length <= 1;

      return `
        <div class="builder-exercise-card" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
          <div class="builder-exercise-header">
            <div class="exercise-header-left">
              <button type="button" class="btn btn-icon btn-sm btn-toggle-exercise-collapse" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" title="Thu gọn / Mở rộng bài tập" aria-label="Thu gọn hoặc mở rộng bài tập" aria-expanded="true">▾</button>
              <span class="exercise-badge">Exercise ${ex.exerciseNumber || (exIdx + 1)}</span>
              <input type="text" class="exercise-title-input form-control form-control-sm" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" value="${escapeHtml(ex.title || '')}" placeholder="Tiêu đề bài tập (Ví dụ: Nghe từ và chọn nghĩa)..." />
              <span class="badge badge-info exercise-items-count">${exItems.length} câu hỏi</span>
            </div>
            <div class="exercise-header-actions">
              <button type="button" class="btn btn-icon btn-sm btn-move-exercise-up" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isFirst ? 'disabled' : ''} title="Di chuyển bài tập lên">↑</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-exercise-down" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isLast ? 'disabled' : ''} title="Di chuyển bài tập xuống">↓</button>
              <button type="button" class="btn btn-icon btn-sm btn-delete-exercise" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isOnly ? 'disabled' : ''} title="Xóa bài tập này">✕</button>
            </div>
          </div>
          <div class="builder-exercise-body">
            <div class="form-group exercise-field">
              <label class="form-label"><strong>Hướng dẫn làm bài tập (Exercise Instructions):</strong></label>
              <textarea class="form-control exercise-instructions-input" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" rows="2" placeholder="Ví dụ: Listen and note down the words/phrases you hear from the audio...">${escapeHtml(ex.instructions || '')}</textarea>
            </div>
            <div class="exercise-items-list block-items-list" data-exercise-id="${ex.exerciseId}">
              ${renderExerciseItems(block, blockIdx, ex, exIdx)}
            </div>
            <div class="exercise-add-item-bar block-add-item-bar">
              <span class="add-item-caption">+ Thêm câu hỏi vào Exercise ${ex.exerciseNumber || (exIdx + 1)}:</span>
              <div class="add-item-buttons">
                <button type="button" class="btn btn-secondary btn-sm btn-add-reading-matching" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Bài đọc chia đôi & Nối (Reading Split-Pane)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-listening-order" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Sắp xếp thứ tự nghe (Listening Order)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-error-correction" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Tìm và sửa lỗi (Error Correction)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-sentence-reorder" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Sắp xếp câu (Sentence Reorder)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-sentence-transformation" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Biến đổi câu (Transformation)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-pronunciation-choice" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Phát âm & Ký hiệu IPA (Pronunciation)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-single-choice" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Trắc nghiệm (Single Choice)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-multi-group" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Nhóm chọn nhiều (Multi-Select Group)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-fitb" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Điền ô trống (Short Text)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-inline-cloze" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Điền từ nội tuyến (Inline Cloze)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-pictorial" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Thẻ từ vựng qua ảnh (Pictorial)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-vocab-pair" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Cặp từ vựng (Vocabulary Pair)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-rubric-async" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Tự luận chấm AI (AI Rubric)
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderBlockItems(block, blockIdx) {
    return renderBlockExercises(block, blockIdx);
  }

  function render() {
    const isImmutable = draftState.submissionCount > 0;
    const isPublished = draftState.status === 'published';
    const statusBadgeClass = isPublished ? 'badge-published' : 'badge-draft';
    const statusBadgeText = isPublished ? 'Đã công bố' : 'Bản nháp';

    const blocksHtml = draftState.blocks.map((block, index) => {
      const isFirst = index === 0;
      const isLast = index === draftState.blocks.length - 1;
      const isOnly = draftState.blocks.length <= 1;
      const audioVal = block.audioUrl || block.stimulusAudioUrl || '';
      const readingVal = block.readingPassage || block.stimulusReadingPassage || '';
      const itemsCount = block.items?.length || 0;

      return `
        <div class="builder-block-card" data-block-id="${block.blockId}" data-index="${index}">
          <div class="builder-block-header">
            <button type="button" class="btn btn-icon btn-sm btn-toggle-block-collapse" data-index="${index}" title="Thu gọn / Mở rộng phần thi" aria-label="Thu gọn hoặc mở rộng phần thi" aria-expanded="true">▾</button>
            <div class="block-checkpoint-pill">Phần ${index + 1}</div>
            <input type="text" class="block-title-input form-control" data-index="${index}" value="${escapeHtml(block.title || '')}" placeholder="Tiêu đề phần thi..." />
            <div class="block-header-actions">
              <button type="button" class="btn btn-icon btn-sm btn-move-block-up" data-index="${index}" ${isFirst ? 'disabled' : ''} title="Di chuyển lên">↑</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-block-down" data-index="${index}" ${isLast ? 'disabled' : ''} title="Di chuyển xuống">↓</button>
              <button type="button" class="btn btn-icon btn-sm btn-delete-block" data-index="${index}" ${isOnly ? 'disabled' : ''} title="Xóa phần này">✕</button>
            </div>
          </div>
          <div class="builder-block-body">
            <div class="form-group block-field">
              <label class="form-label">Hướng dẫn phần thi (Instructions):</label>
              <textarea class="form-control block-instructions-input" data-index="${index}" rows="3" placeholder="Nhập hướng dẫn làm bài cho phần này...">${escapeHtml(block.instructions || '')}</textarea>
            </div>
            <div class="form-group block-field">
              <label class="form-label">File âm thanh (Audio URL / Path):</label>
              <input type="text" class="form-control block-audio-input" data-index="${index}" value="${escapeHtml(audioVal)}" placeholder="assets/34/test-1/listening.mp3 hoặc https://..." />
            </div>
            <div class="form-group block-field">
              <label class="form-label">Đoạn văn đọc hiểu (Reading Passage):</label>
              <textarea class="form-control block-reading-input" data-index="${index}" rows="8" placeholder="Dán văn bản đọc hiểu (nếu có)...">${escapeHtml(readingVal)}</textarea>
            </div>

            <div class="block-items-section">
              <div class="block-items-header-bar">
                <h4>Danh sách bài tập & câu hỏi (${itemsCount} câu · ${(block.exercises || []).length} bài tập)</h4>
              </div>
              <div class="block-exercises-container block-items-list" data-block-idx="${index}">
                ${renderBlockExercises(block, index)}
              </div>
              <div class="block-exercise-actions" style="margin-top: 14px;">
                <button type="button" class="btn btn-outline-primary btn-add-exercise" data-block-idx="${index}">
                  + Thêm bài tập (Exercise)
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="test-builder-workspace">
        <div class="test-builder-top-bar">
          <div class="builder-top-left">
            <button type="button" class="btn btn-secondary btn-sm btn-back-to-catalog" id="btn-back-to-catalog">
              ${renderSvgIcon('arrowLeft', 'icon-inline')} <span>Quay lại danh mục</span>
            </button>
            <div class="builder-status-tags">
              <span class="version-tag">Phiên bản: <strong>v${draftState.version}</strong></span>
              <span class="status-badge ${statusBadgeClass}">${statusBadgeText}</span>
              ${isImmutable
                ? `<span class="immutability-badge warning" title="Đã có học viên nộp bài — Chỉnh sửa sẽ tạo bản nháp mới v${draftState.version + 1}">${renderSvgIcon('lock', 'icon-inline')} Đã có ${draftState.submissionCount} bài nộp</span>`
                : `<span class="immutability-badge mutable" title="Chưa có học viên nộp bài — Sẽ lưu trực tiếp trên bản nháp v${draftState.version}">${renderSvgIcon('edit', 'icon-inline')} Chưa có bài nộp</span>`
              }
            </div>
          </div>
          <div class="builder-top-right">
            <span class="builder-status-msg" id="builder-status-msg" aria-live="polite"></span>
            <div class="builder-actions-group">
              <button type="button" class="btn btn-secondary btn-sm btn-preview-test" id="btn-preview-test" title="Xem trước giao diện bài thi của học sinh">
                ${renderSvgIcon('view', 'icon-inline')} <span class="btn-text">Xem trước bài thi</span>
              </button>
              ${!isPublished && !isImmutable ? `
                <button type="button" class="btn btn-outline-danger btn-sm btn-delete-draft-workspace" id="btn-delete-draft-workspace" title="Xóa bản nháp này">
                  ${renderSvgIcon('trash', 'icon-inline')} <span class="btn-text">Xóa bản nháp</span>
                </button>
              ` : ''}
              <button type="button" class="btn btn-primary btn-save-draft" id="btn-save-draft">
                ${renderSvgIcon('save', 'icon-inline')} <span class="btn-text">Lưu bản nháp</span>
              </button>
              <button type="button" class="btn btn-success btn-sm btn-publish-test" id="btn-publish-test" title="Công bố đề thi cho các lớp">
                ${renderSvgIcon('publish', 'icon-inline')} <span class="btn-text">Công bố đề thi</span>
              </button>
            </div>
          </div>
        </div>

        ${isImmutable ? `
          <div class="alert-notice alert-immutable">
            <div class="notice-icon">${renderSvgIcon('alert', 'icon-inline')}</div>
            <div class="notice-text">
              <strong>Bảo toàn tính bất biến (Content Immutability):</strong> Đề thi này đã có <strong>${draftState.submissionCount} bài nộp</strong>. Khi bạn lưu thay đổi, hệ thống sẽ tự động tạo một phiên bản nháp mới (<strong>v${draftState.version + 1}</strong>) để giữ nguyên vẹn kết quả và dữ liệu chấm điểm của các bài thi đã nộp.
            </div>
          </div>
        ` : ''}

        <div class="test-builder-main">
          <div class="builder-settings-card panel">
            <div class="settings-grid">
              <div class="form-group setting-title-group">
                <label class="form-label" for="builder-test-title">Tên bài thi:</label>
                <input type="text" id="builder-test-title" class="form-control" value="${escapeHtml(draftState.title)}" placeholder="Nhập tên bài thi..." />
              </div>
              <div class="form-group setting-duration-group">
                <label class="form-label" for="builder-test-duration">Thời lượng (phút):</label>
                <input type="number" id="builder-test-duration" class="form-control" value="${draftState.durationMinutes}" min="5" max="300" />
              </div>
              <div class="form-group setting-policy-group">
                <label class="form-label" for="builder-test-policy">Công bố đáp án:</label>
                <select id="builder-test-policy" class="form-select">
                  <option value="hidden" ${draftState.answerReleasePolicy === 'hidden' ? 'selected' : ''}>Ẩn đáp án (hidden)</option>
                  <option value="immediate" ${draftState.answerReleasePolicy === 'immediate' ? 'selected' : ''}>Hiện ngay khi nộp (immediate)</option>
                  <option value="teacher_release" ${draftState.answerReleasePolicy === 'teacher_release' ? 'selected' : ''}>Giáo viên công bố (teacher_release)</option>
                </select>
              </div>
            </div>
          </div>

          <div class="builder-blocks-section">
            <div class="blocks-section-header">
              <div class="blocks-title-wrap">
                <h3>Cấu trúc các phần thi (${draftState.blocks.length} phần)</h3>
                <p class="subtitle">Mỗi phần thi (Block) đại diện cho một chặng bài làm với âm thanh, bài đọc hoặc hướng dẫn riêng.</p>
              </div>
              <div class="blocks-header-actions-group">
                <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-collapse-all" title="Thu gọn toàn bộ phần thi và bài tập">
                  Thu gọn tất cả
                </button>
                <button type="button" class="btn btn-outline-secondary btn-sm" id="btn-expand-all" title="Mở rộng toàn bộ phần thi và bài tập">
                  Mở rộng tất cả
                </button>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-add-block">
                  + Thêm phần thi (Block)
                </button>
              </div>
            </div>

            <div class="builder-blocks-list" id="builder-blocks-list">
              ${blocksHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function syncInputs() {
    if (typeof container.querySelector !== 'function') return;
    const titleInput = container.querySelector('#builder-test-title');
    if (titleInput) draftState.title = titleInput.value.trim();

    const durationInput = container.querySelector('#builder-test-duration');
    if (durationInput) {
      const dur = Number(durationInput.value);
      if (Number.isFinite(dur) && dur > 0) draftState.durationMinutes = dur;
    }

    const policySelect = container.querySelector('#builder-test-policy');
    if (policySelect) draftState.answerReleasePolicy = policySelect.value;

    const blockCards = container.querySelectorAll('.builder-block-card');
    if (blockCards && typeof blockCards.forEach === 'function') {
      blockCards.forEach((bCard, bIdx) => {
        const block = draftState.blocks[bIdx];
        if (!block) return;

        const titleEl = bCard.querySelector('.block-title-input');
        if (titleEl) block.title = titleEl.value.trim();

        const instEl = bCard.querySelector('.block-instructions-input');
        if (instEl) block.instructions = instEl.value;

        const audioEl = bCard.querySelector('.block-audio-input');
        if (audioEl) {
          block.audioUrl = audioEl.value.trim() || null;
          block.stimulusAudioUrl = block.audioUrl;
        }

        const readingEl = bCard.querySelector('.block-reading-input');
        if (readingEl) {
          block.readingPassage = readingEl.value || null;
          block.stimulusReadingPassage = block.readingPassage;
        }

        const exCards = bCard.querySelectorAll('.builder-exercise-card');
        if (exCards && typeof exCards.forEach === 'function') {
          exCards.forEach((exCard, exIdx) => {
            const ex = block.exercises?.[exIdx];
            if (!ex) return;
            const exTitleEl = exCard.querySelector('.exercise-title-input');
            if (exTitleEl) ex.title = exTitleEl.value.trim();
            const exInstEl = exCard.querySelector('.exercise-instructions-input');
            if (exInstEl) ex.instructions = exInstEl.value;
          });
        }

        for (const ex of block.exercises || []) {
          for (const itm of block.items || []) {
            if (itm.exerciseId === ex.exerciseId) {
              itm.exerciseTitle = ex.title;
            }
          }
          ex.itemIds = (block.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
        }

        const itemCards = bCard.querySelectorAll('.builder-item-card');
        if (itemCards && typeof itemCards.forEach === 'function') {
          itemCards.forEach((iCard, iIdx) => {
            const item = block.items?.[iIdx];
            if (!item) return;

            const promptEl = iCard.querySelector('.item-prompt-input');
            if (promptEl) {
              item.prompt = promptEl.value.trim() || `Câu ${item.position || iIdx + 1}`;
            } else if (!item.prompt || !item.prompt.trim()) {
              item.prompt = `Câu ${item.position || iIdx + 1}`;
            }

            const scoreEl = iCard.querySelector('.item-max-score-input');
            if (scoreEl) {
              const sc = Number(scoreEl.value);
              if (Number.isFinite(sc) && sc >= 0) item.maxScore = sc;
            }

            const layoutEl = iCard.querySelector('.select-layout');
            if (layoutEl) item.layoutType = layoutEl.value;

            // Pronunciation sync
            if (item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card') {
              const wordInput = iCard.querySelector('.input-pronunciation-word');
              const audioInput = iCard.querySelector('.input-pronunciation-audio');
              const ipaInput = iCard.querySelector('.input-ipa-transcription');

              if (wordInput) {
                item.targetWord = wordInput.value.trim();
              }
              if (audioInput) {
                item.audioUrl = audioInput.value.trim();
              }
              if (ipaInput) {
                item.ipaTranscription = ipaInput.value.trim();
              }

              const radioChecked = iCard.querySelector('.radio-pron-correct:checked');
              const expectedId = radioChecked ? radioChecked.value : (item.options?.[0]?.id || 'A');

              const optInputs = iCard.querySelectorAll('.input-pron-option-label');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find(o => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });

              draftState.gradingKey.items[item.itemVersionId] = {
                graderType: 'exact_option',
                expectedOptionId: expectedId,
                targetWord: item.targetWord || '',
                ipaTranscription: item.ipaTranscription || ''
              };
            }

            // Single choice sync
            if (item.interactionType === 'single_choice' && item.pedagogicalTypeCode !== 'pronunciation_choice' && item.pedagogicalTypeCode !== 'pronunciation_word' && item.layoutType !== 'ipa_card') {
              const radioChecked = iCard.querySelector('.radio-correct:checked');
              if (radioChecked) {
                draftState.gradingKey.items[item.itemVersionId] = {
                  graderType: 'exact_option',
                  expectedOptionId: radioChecked.value
                };
              }
              const optInputs = iCard.querySelectorAll('.option-label-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find(o => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Multi group sync
            if (item.interactionType === 'multi_choice_group' && item.graderType === 'unordered_group_slot') {
              const groupIdInput = iCard.querySelector('.input-group-id');
              if (groupIdInput) {
                const gid = groupIdInput.value.trim();
                if (gid) item.groupId = gid;
              }
              const checkedBoxes = iCard.querySelectorAll('.checkbox-correct:checked');
              const checkedIds = Array.from(checkedBoxes).map(cb => cb.value);
              if (item.groupId && checkedIds.length >= 2) {
                draftState.gradingKey.groups[item.groupId] = {
                  graderType: 'unordered_group_slot',
                  expectedOptionIds: checkedIds
                };
              }
              const optInputs = iCard.querySelectorAll('.option-label-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find(o => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Short text sync
            if (item.interactionType === 'short_text' && item.pedagogicalTypeCode !== 'sentence_reorder' && item.layoutType !== 'token_scramble' && item.pedagogicalTypeCode !== 'sentence_rewrite' && item.layoutType !== 'keyword_transformation') {
              const chips = iCard.querySelectorAll('.variant-chip');
              const variants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              draftState.gradingKey.items[item.itemVersionId] = {
                graderType: 'accepted_text',
                accepted: variants.length ? variants : ['answer'],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            }

            // Sentence reorder sync
            if (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') {
              const rawTokensInput = iCard.querySelector('.input-raw-tokens');
              const targetSentInput = iCard.querySelector('.input-target-sentence');

              if (targetSentInput) {
                item.targetSentence = targetSentInput.value.trim();
              }

              if (rawTokensInput) {
                const rawVal = rawTokensInput.value.trim();
                if (rawVal) {
                  item.tokens = tokenizeSentence(rawVal);
                }
              }

              const distractorChips = iCard.querySelectorAll('.distractor-chip');
              item.distractors = Array.from(distractorChips).map(c => c.getAttribute('data-distractor')).filter(Boolean);

              const chips = iCard.querySelectorAll('.variant-chip.accepted-chip');
              const variants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              const targetSent = item.targetSentence || (item.tokens ? item.tokens.join(' ') : '');
              const acceptedList = variants.length ? variants : (targetSent ? [targetSent] : ['answer']);

              draftState.gradingKey.items[item.itemVersionId] = {
                graderType: 'accepted_text',
                accepted: acceptedList,
                tokens: item.tokens || [],
                distractors: item.distractors || [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            }

            // Sentence transformation sync
            if (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') {
              const kwInput = iCard.querySelector('.input-transformation-keyword');
              const prefixInput = iCard.querySelector('.input-frame-prefix');
              const suffixInput = iCard.querySelector('.input-frame-suffix');
              const ansInput = iCard.querySelector('.input-transformation-answer');

              if (kwInput) {
                item.keyword = kwInput.value.trim().toUpperCase();
              }
              if (prefixInput) {
                item.framePrefix = prefixInput.value.trim();
              }
              if (suffixInput) {
                item.frameSuffix = suffixInput.value.trim();
              }
              if (ansInput) {
                item.targetAnswer = ansInput.value.trim();
              }

              const chips = iCard.querySelectorAll('.variant-chip.accepted-chip');
              const variants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              const targetAns = item.targetAnswer || '';
              const acceptedList = variants.length ? variants : (targetAns ? [targetAns] : ['answer']);

              draftState.gradingKey.items[item.itemVersionId] = {
                graderType: 'accepted_text',
                keyword: item.keyword || '',
                framePrefix: item.framePrefix || '',
                frameSuffix: item.frameSuffix || '',
                accepted: acceptedList,
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            }

            // Error correction sync
            if (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') {
              const errorTokenInput = iCard.querySelector('.input-error-token');
              const correctionTokenInput = iCard.querySelector('.input-correction-token');
              const scoringRuleSelect = iCard.querySelector('.select-scoring-rule');

              const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'correction_pair',
                expectedErrors: ['she'],
                expectedCorrections: ['her'],
                scoringRule: 'split_points',
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };

              if (scoringRuleSelect) {
                currentKey.scoringRule = scoringRuleSelect.value;
                item.scoringRule = scoringRuleSelect.value;
              }

              const errorChips = iCard.querySelectorAll('.btn-remove-error-chip');
              const errVariants = Array.from(errorChips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              if (errVariants.length) {
                currentKey.expectedErrors = errVariants;
              } else if (errorTokenInput && errorTokenInput.value.trim()) {
                currentKey.expectedErrors = [errorTokenInput.value.trim()];
              }

              const corrChips = iCard.querySelectorAll('.btn-remove-correction-chip');
              const corrVariants = Array.from(corrChips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              if (corrVariants.length) {
                currentKey.expectedCorrections = corrVariants;
              } else if (correctionTokenInput && correctionTokenInput.value.trim()) {
                currentKey.expectedCorrections = [correctionTokenInput.value.trim()];
              }

              draftState.gradingKey.items[item.itemVersionId] = currentKey;
            }

            // Listening order sync
            if (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') {
              const audioInput = iCard.querySelector('.input-listening-audio');
              if (audioInput) {
                const audVal = audioInput.value.trim();
                item.audioUrl = audVal || null;
                item.stimulusAudioUrl = item.audioUrl;
              }
              const eventRows = iCard.querySelectorAll('.listening-event-row');
              if (eventRows.length && item.events) {
                eventRows.forEach(eRow => {
                  const eIdx = Number(eRow.getAttribute('data-event-idx'));
                  const ev = item.events[eIdx];
                  if (!ev) return;
                  const textIn = eRow.querySelector('.input-event-text');
                  if (textIn) ev.text = textIn.value.trim();
                  const rankSel = eRow.querySelector('.select-event-rank');
                  if (rankSel) ev.rank = Number(rankSel.value) || 1;
                });
                const sorted = [...item.events].sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));
                const expectedSeq = sorted.map(e => e.label);
                draftState.gradingKey.items[item.itemVersionId] = {
                  graderType: 'ordered_sequence',
                  expectedSequence: expectedSeq
                };
              }
            }

            // Reading matching sync
            if (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || block.layoutType === 'split_pane_matching') {
              const passageInput = iCard.querySelector('.input-reading-passage');
              if (passageInput) {
                const passageVal = passageInput.value;
                block.readingPassage = passageVal;
                block.stimulusReadingPassage = passageVal;
                item.readingPassage = passageVal;
              }
              const radioChecked = iCard.querySelector('.radio-matching-correct:checked');
              if (radioChecked) {
                draftState.gradingKey.items[item.itemVersionId] = {
                  graderType: 'exact_option',
                  expectedOptionId: radioChecked.value
                };
              }
              const optInputs = iCard.querySelectorAll('.matching-heading-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find(o => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Pictorial card sync
            if (item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary')) {
              const imgInput = iCard.querySelector('.input-pictorial-image');
              if (imgInput) {
                const imgVal = imgInput.value.trim();
                item.image = imgVal || null;
                item.stimulusImageUrl = imgVal || null;
              }
              const letterInput = iCard.querySelector('.input-pictorial-letter-hint');
              if (letterInput) item.letterHint = letterInput.value.trim() || null;
              const captionInput = iCard.querySelector('.input-pictorial-caption');
              if (captionInput) item.captionHint = captionInput.value.trim() || null;
            }

            // Vocabulary pair sync
            if (item.interactionType === 'text_select_pair') {
              const chips = iCard.querySelectorAll('.template-vocab-pair .variant-chip');
              const rawVariants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              const variants = Array.from(new Set(rawVariants.filter(v => !/^Từ vựng câu \d+/i.test(v)))).slice(0, 40);
              const dropdownVal = iCard.querySelector('.select-vocab-correct-dropdown')?.value;
              const radioChecked = iCard.querySelector('.radio-vocab-correct:checked');
              const expectedOptId = dropdownVal || (radioChecked ? radioChecked.value : (item.options?.[0]?.id || 'opt_1'));

              const rawWordInput = iCard.querySelector('.input-vocab-raw');
              const rawWordVal = rawWordInput ? rawWordInput.value.trim() : '';
              if (!variants.length) {
                if (rawWordVal && !/^Từ vựng câu \d+/i.test(rawWordVal)) {
                  variants.push(rawWordVal);
                } else if (item.prompt && !/^Từ vựng câu \d+/i.test(item.prompt)) {
                  variants.push(item.prompt);
                } else {
                  variants.push('answer');
                }
              }

              draftState.gradingKey.items[item.itemVersionId] = {
                graderType: 'accepted_text_exact_option',
                accepted: variants,
                expectedOptionId: expectedOptId,
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };

              const optInputs = iCard.querySelectorAll('.vocab-meaning-input');
              optInputs.forEach(optIn => {
                const optId = optIn.getAttribute('data-option-id');
                const optObj = item.options.find(o => o.id === optId);
                if (optObj) optObj.label = optIn.value.trim();
              });
            }

            // Rubric async sync
            if (item.graderType === 'rubric_async') {
              const currentKey = draftState.gradingKey.items[item.itemVersionId];
              if (currentKey && currentKey.rubric) {
                const critCards = iCard.querySelectorAll('.rubric-criterion-card');
                if (critCards && currentKey.rubric.criteria) {
                  critCards.forEach((cCard, cIdx) => {
                    const critObj = currentKey.rubric.criteria[cIdx];
                    if (!critObj) return;
                    const labelInput = cCard.querySelector('.criterion-label-input');
                    if (labelInput) critObj.label = labelInput.value.trim();

                    const scoreInput = cCard.querySelector('.criterion-max-score-input');
                    if (scoreInput) {
                      const sc = Number(scoreInput.value);
                      if (Number.isFinite(sc) && sc >= 0) critObj.maxScore = sc;
                    }

                    const conceptsInput = cCard.querySelector('.criterion-concepts-input');
                    if (conceptsInput) {
                      const raw = conceptsInput.value.trim();
                      critObj.requiredConcepts = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
                    }
                  });
                  // recompute total maxScore
                  const totalScore = currentKey.rubric.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
                  currentKey.rubric.maxScore = totalScore;
                  item.maxScore = totalScore;
                }

                const guidanceEl = iCard.querySelector('.input-rubric-guidance');
                if (guidanceEl) {
                  currentKey.rubric.promptGuidance = guidanceEl.value.trim();
                }
              }
            }
          });
        }
      });
    }
  }

  function getNextPosition() {
    let nextPos = 1;
    for (const b of draftState.blocks) {
      for (const itm of b.items || []) {
        if (typeof itm.position === 'number' && itm.position >= nextPos) {
          nextPos = itm.position + 1;
        }
      }
    }
    return nextPos;
  }

  function bindEvents() {
    if (typeof container.querySelector !== 'function') return;

    const backBtn = container.querySelector('#btn-back-to-catalog');
    if (backBtn && typeof options.onBack === 'function' && typeof backBtn.addEventListener === 'function') {
      backBtn.addEventListener('click', options.onBack);
    }

    // Add Exercise to block
    const addExerciseBtns = container.querySelectorAll('.btn-add-exercise');
    addExerciseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        if (!Array.isArray(block.exercises)) block.exercises = [];
        const nextExNum = block.exercises.length + 1;
        const newExId = generateUuid();
        block.exercises.push({
          exerciseId: newExId,
          exerciseNumber: nextExNum,
          title: `Bài tập ${nextExNum}`,
          instructions: '',
          audioUrl: null,
          readingPassage: null,
          itemIds: []
        });
        render();
      });
    });

    // Move Exercise Up
    const moveExUpBtns = container.querySelectorAll('.btn-move-exercise-up');
    moveExUpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const exIdx = Number(btn.getAttribute('data-exercise-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.exercises || exIdx <= 0) return;
        const temp = block.exercises[exIdx];
        block.exercises[exIdx] = block.exercises[exIdx - 1];
        block.exercises[exIdx - 1] = temp;
        block.exercises.forEach((ex, idx) => { ex.exerciseNumber = idx + 1; });
        const orderMap = new Map();
        block.exercises.forEach((ex, idx) => orderMap.set(ex.exerciseId, idx));
        (block.items || []).sort((a, b) => {
          const ordA = orderMap.get(a.exerciseId) ?? 999;
          const ordB = orderMap.get(b.exerciseId) ?? 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.position || 0) - (b.position || 0);
        });
        let pos = 1;
        for (const b of draftState.blocks) {
          for (const it of b.items || []) {
            it.position = pos++;
          }
        }
        render();
      });
    });

    // Move Exercise Down
    const moveExDownBtns = container.querySelectorAll('.btn-move-exercise-down');
    moveExDownBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const exIdx = Number(btn.getAttribute('data-exercise-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.exercises || exIdx >= block.exercises.length - 1) return;
        const temp = block.exercises[exIdx];
        block.exercises[exIdx] = block.exercises[exIdx + 1];
        block.exercises[exIdx + 1] = temp;
        block.exercises.forEach((ex, idx) => { ex.exerciseNumber = idx + 1; });
        const orderMap = new Map();
        block.exercises.forEach((ex, idx) => orderMap.set(ex.exerciseId, idx));
        (block.items || []).sort((a, b) => {
          const ordA = orderMap.get(a.exerciseId) ?? 999;
          const ordB = orderMap.get(b.exerciseId) ?? 999;
          if (ordA !== ordB) return ordA - ordB;
          return (a.position || 0) - (b.position || 0);
        });
        let pos = 1;
        for (const b of draftState.blocks) {
          for (const it of b.items || []) {
            it.position = pos++;
          }
        }
        render();
      });
    });

    // Delete Exercise
    const deleteExBtns = container.querySelectorAll('.btn-delete-exercise');
    deleteExBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const exIdx = Number(btn.getAttribute('data-exercise-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.exercises || block.exercises.length <= 1) return;
        const deletedEx = block.exercises[exIdx];
        block.exercises.splice(exIdx, 1);
        const survivorEx = block.exercises[Math.max(0, exIdx - 1)] || block.exercises[0];
        (block.items || []).forEach(it => {
          if (it.exerciseId === deletedEx.exerciseId) {
            it.exerciseId = survivorEx.exerciseId;
            it.exerciseTitle = survivorEx.title;
          }
        });
        block.exercises.forEach((ex, idx) => {
          ex.exerciseNumber = idx + 1;
          ex.itemIds = (block.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
        });
        render();
      });
    });

    const addBlockBtn = container.querySelector('#btn-add-block');
    if (addBlockBtn && typeof addBlockBtn.addEventListener === 'function') {
      addBlockBtn.addEventListener('click', () => {
        syncInputs();
        const nextIdx = draftState.blocks.length + 1;
        const nextPos = getNextPosition();
        const initialItemId = generateUuid();
        const initialExId = generateUuid();

        draftState.blocks.push({
          blockId: generateUuid(),
          checkpoint: nextIdx,
          title: `Phần ${nextIdx}`,
          instructions: '',
          audioUrl: null,
          readingPassage: null,
          stimulusAudioUrl: null,
          stimulusReadingPassage: null,
          exercises: [
            {
              exerciseId: initialExId,
              exerciseNumber: 1,
              title: `Bài tập 1: Phần ${nextIdx}`,
              instructions: '',
              audioUrl: null,
              readingPassage: null,
              itemIds: [initialItemId]
            }
          ],
          items: [
            {
              itemFamilyId: generateUuid(),
              itemVersionId: initialItemId,
              position: nextPos,
              exerciseId: initialExId,
              exerciseTitle: `Bài tập 1: Phần ${nextIdx}`,
              prompt: `Câu hỏi ${nextPos}:`,
              helpText: '',
              interactionType: 'single_choice',
              pedagogicalTypeCode: 'multiple_choice',
              layoutType: 'grid_4',
              graderType: 'exact_option',
              required: true,
              maxScore: 1,
              options: [
                { id: 'A', label: 'Phương án A' },
                { id: 'B', label: 'Phương án B' },
                { id: 'C', label: 'Phương án C' },
                { id: 'D', label: 'Phương án D' }
              ],
              skillCodes: [],
              releasePolicy: 'inherit'
            }
          ]
        });
        draftState.gradingKey.items[initialItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        };
        render();
      });
    }

    // Add Single Choice Question
    const addScBtns = container.querySelectorAll('.btn-add-single-choice');
    addScBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Câu hỏi ${nextPos}:`,
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'multiple_choice',
          layoutType: 'grid_4',
          graderType: 'exact_option',
          required: true,
          maxScore: 1,
          options: [
            { id: 'A', label: 'Phương án A' },
            { id: 'B', label: 'Phương án B' },
            { id: 'C', label: 'Phương án C' },
            { id: 'D', label: 'Phương án D' }
          ],
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Add Multi-Select Group Question
    const addMgBtns = container.querySelectorAll('.btn-add-multi-group');
    addMgBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const groupId = `group_${bIdx + 1}_${Date.now().toString(36)}`;
        const newItem1Id = generateUuid();
        const newItem2Id = generateUuid();
        block.items = block.items || [];
        const optionsList = [
          { id: 'A', label: 'Phương án A' },
          { id: 'B', label: 'Phương án B' },
          { id: 'C', label: 'Phương án C' },
          { id: 'D', label: 'Phương án D' },
          { id: 'E', label: 'Phương án E' }
        ];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItem1Id,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Chọn 2 đáp án chính xác (Vị trí 1):`,
          helpText: '',
          interactionType: 'multi_choice_group',
          pedagogicalTypeCode: 'multiple_choice_group',
          layoutType: 'grid_3',
          graderType: 'unordered_group_slot',
          groupId,
          required: true,
          maxScore: 1,
          options: JSON.parse(JSON.stringify(optionsList)),
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItem2Id,
          position: nextPos + 1,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Chọn 2 đáp án chính xác (Vị trí 2):`,
          helpText: '',
          interactionType: 'multi_choice_group',
          pedagogicalTypeCode: 'multiple_choice_group',
          layoutType: 'grid_3',
          graderType: 'unordered_group_slot',
          groupId,
          required: true,
          maxScore: 1,
          options: JSON.parse(JSON.stringify(optionsList)),
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.groups[groupId] = {
          graderType: 'unordered_group_slot',
          expectedOptionIds: ['A', 'B']
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Add Fill In The Blank Question
    const addFitbBtns = container.querySelectorAll('.btn-add-fitb');
    addFitbBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Điền vào ô trống câu ${nextPos}:`,
          helpText: '',
          interactionType: 'short_text',
          pedagogicalTypeCode: 'fill_in_the_blank',
          layoutType: 'default',
          graderType: 'accepted_text',
          required: true,
          maxScore: 1,
          options: [],
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'accepted_text',
          accepted: ['answer'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Add Inline Cloze Question
    const addInlineClozeBtns = container.querySelectorAll('.btn-add-inline-cloze');
    addInlineClozeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `The cruise departs from Miami and visits (${nextPos}) __________ Caribbean islands.`,
          helpText: '',
          interactionType: 'short_text',
          pedagogicalTypeCode: 'table_completion',
          layoutType: 'inline_cloze',
          graderType: 'accepted_text',
          required: true,
          maxScore: 1,
          options: [],
          skillCodes: ['listening'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'accepted_text',
          accepted: ['six'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Insert Blank Token into Cloze prompt
    const insertBlankBtns = container.querySelectorAll('.btn-insert-blank-token');
    insertBlankBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const token = `(${item.position}) __________`;
        if (!item.prompt.includes(token)) {
          item.prompt = item.prompt ? `${item.prompt} ${token}` : `Câu hỏi với ${token}`;
        }
        render();
      });
    });

    // Add Reading Split-Pane & Matching Question
    const addReadingMatchingBtns = container.querySelectorAll('.btn-add-reading-matching');
    addReadingMatchingBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        block.layoutType = 'split_pane_matching';
        if (!block.readingPassage) {
          block.readingPassage = 'Paragraph A: The introduction and context of the phenomenon...\n\nParagraph B: Analysis of technological implementations...\n\nParagraph C: Findings, evidence and experimental conclusions...';
          block.stimulusReadingPassage = block.readingPassage;
        }
        const defaultHeadings = [
          { id: 'i', label: 'i. The spy in the sky' },
          { id: 'ii', label: 'ii. The spread of technology' },
          { id: 'iii', label: 'iii. The limitations of cameras' },
          { id: 'iv', label: 'iv. The cost of cameras' },
          { id: 'v', label: 'v. Advantages and disadvantages' }
        ];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Paragraph B`,
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'reading_matching',
          layoutType: 'split_pane_matching',
          graderType: 'exact_option',
          required: true,
          maxScore: 1,
          readingPassage: block.readingPassage,
          options: defaultHeadings,
          skillCodes: ['reading'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'ii'
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Extract paragraph labels from reading passage
    const extractParaBtns = container.querySelectorAll('.btn-extract-paragraphs');
    extractParaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const passage = block.readingPassage || '';
        const labels = extractParagraphLabels(passage);
        if (labels.length) {
          alert(`Đã nhận diện thành công ${labels.length} đoạn văn trong bài đọc: [${labels.join(', ')}]`);
        } else {
          alert('Chưa tìm thấy nhãn đoạn văn dạng "Paragraph A" hoặc "[A]" trong bài đọc. Vui lòng thêm tiền tố nhãn vào các đoạn văn.');
        }
        render();
      });
    });

    // Add matching option button
    const addMatchingOptBtns = container.querySelectorAll('.btn-add-matching-option');
    addMatchingOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        item.options = item.options || [];
        const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
        const nextId = romanNumerals[item.options.length] || `h${item.options.length + 1}`;
        item.options.push({ id: nextId, label: `${nextId}. Tiêu đề mới` });
        render();
      });
    });

    // Delete matching option button
    const delMatchingOptBtns = container.querySelectorAll('.btn-del-matching-option');
    delMatchingOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item || !item.options || item.options.length <= 2) {
          alert('Mỗi câu hỏi ghép nối cần tối thiểu 2 phương án lựa chọn.');
          return;
        }
        item.options = item.options.filter(o => o.id !== optId);
        render();
      });
    });

    // Add Listening Order Question
    const addListeningOrderBtns = container.querySelectorAll('.btn-add-listening-order');
    addListeningOrderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        const defaultEvents = [
          { label: 'A', rank: 3, text: 'Sự kiện A' },
          { label: 'B', rank: 4, text: 'Sự kiện B' },
          { label: 'C', rank: 1, text: 'Sự kiện C' },
          { label: 'D', rank: 5, text: 'Sự kiện D' },
          { label: 'E', rank: 2, text: 'Sự kiện E' }
        ];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: 'Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:',
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'listening_order',
          layoutType: 'timeline_sequence',
          graderType: 'exact_option',
          required: true,
          maxScore: 5,
          audioUrl: block.audioUrl || 'assets/34/test-1/listening.mp3',
          events: defaultEvents,
          options: defaultEvents.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` })),
          skillCodes: ['listening'],
          releasePolicy: 'inherit'
        });
        const sorted = [...defaultEvents].sort((a, b) => a.rank - b.rank);
        draftState.gradingKey.items[newItemId] = {
          graderType: 'ordered_sequence',
          expectedSequence: sorted.map(e => e.label)
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Rank selector change for listening events
    const rankSelectors = container.querySelectorAll('.select-event-rank');
    rankSelectors.forEach(sel => {
      sel.addEventListener('change', () => {
        syncInputs();
        render();
      });
    });

    // Add event button
    const addEventBtns = container.querySelectorAll('.btn-add-listening-event');
    addEventBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        item.events = item.events || [];
        const nextLabel = String.fromCharCode(65 + item.events.length);
        const nextRank = item.events.length + 1;
        item.events.push({ label: nextLabel, rank: nextRank, text: `Sự kiện ${nextLabel}` });
        item.options = item.events.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` }));
        render();
      });
    });

    // Delete event button
    const delEventBtns = container.querySelectorAll('.btn-del-event');
    delEventBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const eIdx = Number(btn.getAttribute('data-event-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item || !item.events || item.events.length <= 2) {
          alert('Cần tối thiểu 2 sự kiện để tạo câu hỏi sắp xếp thứ tự.');
          return;
        }
        item.events.splice(eIdx, 1);
        item.events.forEach((ev, idx) => {
          ev.label = String.fromCharCode(65 + idx);
        });
        item.options = item.events.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` }));
        render();
      });
    });

    // Add Error Correction Question
    const addErrorCorrectionBtns = container.querySelectorAll('.btn-add-error-correction');
    addErrorCorrectionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: 'She sister is a good student.',
          helpText: '',
          interactionType: 'correction_pair',
          pedagogicalTypeCode: 'error_correction',
          layoutType: 'default',
          graderType: 'correction_pair',
          required: true,
          maxScore: 1,
          scoringRule: 'split_points',
          options: [],
          skillCodes: ['grammar'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'correction_pair',
          expectedErrors: ['she', 'She'],
          expectedCorrections: ['her', 'Her'],
          scoringRule: 'split_points',
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Generate Error Variants
    const genErrorVariantsBtns = container.querySelectorAll('.btn-generate-error-variants');
    genErrorVariantsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const input = card?.querySelector('.input-error-token');
        const raw = input?.value?.trim() || '';
        if (!raw) {
          alert('Vui lòng nhập từ/cụm từ lỗi trước khi sinh biến thể.');
          return;
        }
        const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
          graderType: 'correction_pair',
          expectedErrors: [],
          expectedCorrections: [],
          scoringRule: 'split_points'
        };
        currentKey.expectedErrors = expandSentenceVariants([raw]);
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    // Generate Correction Variants
    const genCorrVariantsBtns = container.querySelectorAll('.btn-generate-correction-variants');
    genCorrVariantsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const input = card?.querySelector('.input-correction-token');
        const raw = input?.value?.trim() || '';
        if (!raw) {
          alert('Vui lòng nhập từ/cụm từ sửa đúng trước khi sinh biến thể.');
          return;
        }
        const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
          graderType: 'correction_pair',
          expectedErrors: [],
          expectedCorrections: [],
          scoringRule: 'split_points'
        };
        currentKey.expectedCorrections = expandSentenceVariants([raw]);
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    // Manual add error variant on Enter
    const addErrInputs = container.querySelectorAll('.input-add-error-variant');
    addErrInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'correction_pair',
            expectedErrors: [],
            expectedCorrections: []
          };
          currentKey.expectedErrors = currentKey.expectedErrors || [];
          if (!currentKey.expectedErrors.includes(val)) {
            currentKey.expectedErrors.push(val);
          }
          draftState.gradingKey.items[item.itemVersionId] = currentKey;
          render();
        }
      });
    });

    // Manual add correction variant on Enter
    const addCorrInputs = container.querySelectorAll('.input-add-correction-variant');
    addCorrInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'correction_pair',
            expectedErrors: [],
            expectedCorrections: []
          };
          currentKey.expectedCorrections = currentKey.expectedCorrections || [];
          if (!currentKey.expectedCorrections.includes(val)) {
            currentKey.expectedCorrections.push(val);
          }
          draftState.gradingKey.items[item.itemVersionId] = currentKey;
          render();
        }
      });
    });

    // Remove error variant chip
    const removeErrChipBtns = container.querySelectorAll('.btn-remove-error-chip');
    removeErrChipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const variantToRemove = btn.getAttribute('data-variant');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey && currentKey.expectedErrors) {
          currentKey.expectedErrors = currentKey.expectedErrors.filter(v => v !== variantToRemove);
          if (!currentKey.expectedErrors.length) currentKey.expectedErrors = [''];
        }
        render();
      });
    });

    // Remove correction variant chip
    const removeCorrChipBtns = container.querySelectorAll('.btn-remove-correction-chip');
    removeCorrChipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const variantToRemove = btn.getAttribute('data-variant');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey && currentKey.expectedCorrections) {
          currentKey.expectedCorrections = currentKey.expectedCorrections.filter(v => v !== variantToRemove);
          if (!currentKey.expectedCorrections.length) currentKey.expectedCorrections = [''];
        }
        render();
      });
    });

    // Scoring rule selector change
    const scoringRuleSelectors = container.querySelectorAll('.select-scoring-rule');
    scoringRuleSelectors.forEach(sel => {
      sel.addEventListener('change', () => {
        syncInputs();
        render();
      });
    });

    // Add Sentence Reorder Question
    const addSentenceReorderBtns = container.querySelectorAll('.btn-add-sentence-reorder');
    addSentenceReorderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        const defaultTokens = ['She', 'has worked', 'at the company', 'for five years'];
        const defaultSentence = 'She has worked at the company for five years.';
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:',
          helpText: '',
          interactionType: 'short_text',
          pedagogicalTypeCode: 'sentence_reorder',
          layoutType: 'token_scramble',
          graderType: 'accepted_text',
          required: true,
          maxScore: 1,
          tokens: defaultTokens,
          distractors: [],
          targetSentence: defaultSentence,
          options: [],
          skillCodes: ['grammar'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'accepted_text',
          accepted: [defaultSentence],
          tokens: defaultTokens,
          distractors: [],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Add Sentence Transformation Question
    const addSentenceTransformationBtns = container.querySelectorAll('.btn-add-sentence-transformation');
    addSentenceTransformationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        const defaultKw = 'PREVENTED';
        const defaultPrefix = 'His severe illness';
        const defaultSuffix = 'from going to the conference.';
        const defaultAnswer = 'prevented him';
        const defaultPrompt = 'He could not go to the conference because he was severely ill.';
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: defaultPrompt,
          helpText: '',
          interactionType: 'short_text',
          pedagogicalTypeCode: 'sentence_rewrite',
          layoutType: 'keyword_transformation',
          graderType: 'accepted_text',
          required: true,
          maxScore: 1,
          keyword: defaultKw,
          framePrefix: defaultPrefix,
          frameSuffix: defaultSuffix,
          targetAnswer: defaultAnswer,
          options: [],
          skillCodes: ['grammar'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'accepted_text',
          keyword: defaultKw,
          framePrefix: defaultPrefix,
          frameSuffix: defaultSuffix,
          accepted: [defaultAnswer],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Add Pronunciation Choice Question
    const addPronunciationChoiceBtns = container.querySelectorAll('.btn-add-pronunciation-choice');
    addPronunciationChoiceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        const defaultWord = 'camera';
        const defaultIpa = '/ˈkæm.ər.ə/';
        const defaultOptions = [
          { id: 'A', label: '/ˈkæm.ər.ə/' },
          { id: 'B', label: '/kəˈmɪər.ə/' },
          { id: 'C', label: '/ˈkæm.eɪ.rə/' }
        ];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Choose the correct pronunciation for "${defaultWord}":`,
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'pronunciation_choice',
          layoutType: 'ipa_card',
          graderType: 'exact_option',
          required: true,
          maxScore: 0.5,
          targetWord: defaultWord,
          ipaTranscription: defaultIpa,
          audioUrl: '',
          options: defaultOptions,
          skillCodes: ['pronunciation'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A',
          targetWord: defaultWord,
          ipaTranscription: defaultIpa
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // IPA Symbol click to insert
    const ipaSymbolBtns = container.querySelectorAll('.btn-ipa-symbol');
    ipaSymbolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const symbol = btn.getAttribute('data-symbol');
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item || !symbol) return;
        const card = btn.closest('.builder-item-card');
        const ipaInput = card?.querySelector('.input-ipa-transcription');
        if (ipaInput) {
          const start = ipaInput.selectionStart ?? ipaInput.value.length;
          const end = ipaInput.selectionEnd ?? ipaInput.value.length;
          const val = ipaInput.value;
          ipaInput.value = val.slice(0, start) + symbol + val.slice(end);
          ipaInput.focus();
          const newPos = start + symbol.length;
          ipaInput.setSelectionRange?.(newPos, newPos);
          item.ipaTranscription = ipaInput.value.trim();
          const badge = card?.querySelector('.ipa-phonetic-badge');
          if (badge) {
            badge.textContent = formatIpaTranscription(item.ipaTranscription) || '/.../';
          }
          if (draftState.gradingKey.items[item.itemVersionId]) {
            draftState.gradingKey.items[item.itemVersionId].ipaTranscription = item.ipaTranscription;
          }
        }
      });
    });

    // Add Option to Pronunciation
    const addPronOptBtns = container.querySelectorAll('.btn-add-pronunciation-option');
    addPronOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nextId = alphabet[item.options.length] || `OPT${item.options.length + 1}`;
        item.options = item.options || [];
        item.options.push({ id: nextId, label: `/${item.targetWord || 'word'}/` });
        render();
      });
    });

    // Delete Option from Pronunciation
    const delPronOptBtns = container.querySelectorAll('.btn-del-pronunciation-option');
    delPronOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item && item.options && item.options.length > 2) {
          item.options = item.options.filter(o => o.id !== optId);
          render();
        } else {
          alert('Một câu hỏi lựa chọn phải có ít nhất 2 phương án.');
        }
      });
    });

    // Generate Sentence Transformation Variants
    const genTransformationVariantsBtns = container.querySelectorAll('.btn-generate-transformation-variants');
    genTransformationVariantsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const ans = item.targetAnswer || '';
        if (!ans) {
          alert('Vui lòng nhập đáp án mẫu trong chỗ trống trước khi sinh biến thể.');
          return;
        }
        const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
          graderType: 'accepted_text',
          accepted: [],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        const expanded = expandSentenceVariants([ans]);
        currentKey.accepted = Array.from(new Set([...(currentKey.accepted || []), ...expanded]));
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    // Add manual transformation variant on Enter
    const addTransformationVariantInputs = container.querySelectorAll('.input-add-transformation-variant');
    addTransformationVariantInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'accepted_text',
            accepted: [],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          currentKey.accepted = currentKey.accepted || [];
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
          }
        }
      });
    });

    // Tokenize Sentence
    const tokenizeBtns = container.querySelectorAll('.btn-tokenize-sentence');
    tokenizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const targetInput = card?.querySelector('.input-target-sentence');
        const rawTokensInput = card?.querySelector('.input-raw-tokens');
        const textToTokenize = (targetInput?.value?.trim() || rawTokensInput?.value?.trim() || item.targetSentence || '');
        if (!textToTokenize) {
          alert('Vui lòng nhập câu hoàn chỉnh hoặc chuỗi mảnh từ trước khi phân rã.');
          return;
        }
        item.tokens = tokenizeSentence(textToTokenize);
        if (targetInput && targetInput.value.trim()) {
          item.targetSentence = targetInput.value.trim();
        } else {
          item.targetSentence = item.tokens.join(' ');
        }
        const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
          graderType: 'accepted_text',
          accepted: [],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        currentKey.tokens = item.tokens;
        if (!currentKey.accepted || !currentKey.accepted.length) {
          currentKey.accepted = [item.targetSentence];
        }
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    // Add Distractor button click
    const addDistractorBtns = container.querySelectorAll('.btn-add-distractor-btn');
    addDistractorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const input = card?.querySelector('.input-add-distractor');
        const val = input?.value?.trim() || '';
        if (!val) return;
        item.distractors = item.distractors || [];
        if (!item.distractors.includes(val)) {
          item.distractors.push(val);
        }
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey) currentKey.distractors = item.distractors;
        render();
      });
    });

    // Add Distractor on Enter
    const addDistractorInputs = container.querySelectorAll('.input-add-distractor');
    addDistractorInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          item.distractors = item.distractors || [];
          if (!item.distractors.includes(val)) {
            item.distractors.push(val);
          }
          const currentKey = draftState.gradingKey.items[item.itemVersionId];
          if (currentKey) currentKey.distractors = item.distractors;
          render();
        }
      });
    });

    // Remove Distractor chip
    const removeDistractorChipBtns = container.querySelectorAll('.btn-remove-distractor-chip');
    removeDistractorChipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const dIdx = Number(btn.getAttribute('data-distractor-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item || !item.distractors) return;
        item.distractors.splice(dIdx, 1);
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey) currentKey.distractors = item.distractors;
        render();
      });
    });

    // Generate Sentence Reorder Variants
    const genReorderVariantsBtns = container.querySelectorAll('.btn-generate-reorder-variants');
    genReorderVariantsBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const target = item.targetSentence || (item.tokens ? item.tokens.join(' ') : '');
        if (!target) {
          alert('Vui lòng nhập câu hoàn chỉnh trước khi sinh biến thể.');
          return;
        }
        const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
          graderType: 'accepted_text',
          accepted: [],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        currentKey.accepted = expandSentenceVariants([target]);
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    function createSinglePictorialItem(bIdx, targetEx) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const nextPos = getNextPosition();
      const newItemId = generateUuid();
      block.items = block.items || [];
      block.items.push({
        itemFamilyId: generateUuid(),
        itemVersionId: newItemId,
        position: nextPos,
        exerciseId: targetEx.exerciseId,
        exerciseTitle: targetEx.title,
        prompt: `Từ vựng qua ảnh ${nextPos}`,
        helpText: '',
        interactionType: 'short_text',
        pedagogicalTypeCode: 'pictorial_vocabulary',
        layoutType: 'pictorial_card',
        graderType: 'accepted_text',
        required: true,
        maxScore: 1,
        image: `assets/test 1/vocabulary/image${nextPos}.png`,
        captionHint: '',
        letterHint: '',
        options: [],
        skillCodes: ['vocabulary'],
        releasePolicy: 'inherit'
      });
      draftState.gradingKey.items[newItemId] = {
        graderType: 'accepted_text',
        accepted: [],
        normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
      };
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    function openBatchPictorialModal(bIdx, targetEx) {
      if (typeof document === 'undefined') {
        createSinglePictorialItem(bIdx, targetEx);
        return;
      }
      const block = draftState.blocks[bIdx];
      if (!block) return;

      let modal = document.querySelector('#batch-pictorial-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'batch-pictorial-modal';
        modal.className = 'modal-batch-vocab-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-batch-vocab-card">
          <div class="modal-batch-vocab-header">
            <h3>⚡ Tạo hàng loạt câu hỏi Thẻ từ vựng qua ảnh</h3>
            <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng">✕</button>
          </div>
          <div class="modal-batch-vocab-body">
            <div class="alert-notice alert-info" style="margin: 0; padding: 10px 14px; font-size: 0.85rem;">
              Tạo nhanh các câu hỏi Thẻ từ vựng qua ảnh thuộc bài tập <strong>${escapeHtml(targetEx.title || 'Bài tập')}</strong>. Sau khi sinh hàng loạt, giáo viên sẽ điền hình ảnh, từ mục tiêu và sinh gợi ý Hangman trực tiếp trên từng câu.
            </div>
            <div class="form-group">
              <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
              <input type="number" class="form-control input-batch-pictorial-count" min="1" max="100" value="25" style="max-width: 160px; font-weight: 700;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Ví dụ: 25 câu hoặc 50 câu)</span>
            </div>
          </div>
          <div class="modal-batch-vocab-footer">
            <button type="button" class="btn btn-secondary btn-batch-single">
              + Chỉ tạo 1 câu
            </button>
            <button type="button" class="btn btn-primary btn-batch-confirm">
              ⚡ Tạo câu hỏi hàng loạt
            </button>
          </div>
        </div>
      `;

      const closeModal = () => {
        modal.style.display = 'none';
      };

      const closeBtn = modal.querySelector('.btn-close-batch-modal');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      const singleBtn = modal.querySelector('.btn-batch-single');
      if (singleBtn) {
        singleBtn.addEventListener('click', () => {
          closeModal();
          createSinglePictorialItem(bIdx, targetEx);
        });
      }

      const confirmBtn = modal.querySelector('.btn-batch-confirm');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const countInput = modal.querySelector('.input-batch-pictorial-count');
          const count = Math.max(1, Math.min(100, parseInt(countInput?.value, 10) || 25));

          block.items = block.items || [];
          const startingPos = getNextPosition();

          for (let i = 0; i < count; i++) {
            const currentPos = startingPos + i;
            const newItemId = generateUuid();

            block.items.push({
              itemFamilyId: generateUuid(),
              itemVersionId: newItemId,
              position: currentPos,
              exerciseId: targetEx.exerciseId,
              exerciseTitle: targetEx.title,
              prompt: `Từ vựng qua ảnh ${currentPos}`,
              helpText: '',
              interactionType: 'short_text',
              pedagogicalTypeCode: 'pictorial_vocabulary',
              layoutType: 'pictorial_card',
              graderType: 'accepted_text',
              required: true,
              maxScore: 1,
              image: `assets/test 1/vocabulary/image${currentPos}.png`,
              captionHint: '',
              letterHint: '',
              options: [],
              skillCodes: ['vocabulary'],
              releasePolicy: 'inherit'
            });

            draftState.gradingKey.items[newItemId] = {
              graderType: 'accepted_text',
              accepted: [],
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          }

          resequenceItemPositions();
          markAsDirty();
          closeModal();
          render();
        });
      }

      modal.style.display = 'flex';
    }

    // Add Pictorial Vocabulary Question
    const addPictorialBtns = container.querySelectorAll('.btn-add-pictorial');
    addPictorialBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        openBatchPictorialModal(bIdx, targetEx);
      });
    });

    // Generate Hangman Hint from target word
    const genHangmanBtns = container.querySelectorAll('.btn-generate-hangman');
    genHangmanBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const targetInput = card?.querySelector('.input-pictorial-target');
        const targetVal = targetInput?.value?.trim() || '';
        if (!targetVal) {
          alert('Vui lòng nhập từ hoặc cụm từ mục tiêu trước khi tạo gợi ý Hangman.');
          return;
        }
        item.letterHint = generateHangmanHint(targetVal);
        const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
          graderType: 'accepted_text',
          accepted: [],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        currentKey.accepted = expandSentenceVariants([targetVal]);
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    function createSingleVocabItem(bIdx, targetEx) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const nextPos = getNextPosition();
      const newItemId = generateUuid();
      block.items = block.items || [];

      // Check if there is an existing vocabulary pair in this block to clone meaning options
      let inheritedOptions = null;
      for (let p = block.items.length - 1; p >= 0; p--) {
        const prev = block.items[p];
        if (prev && prev.interactionType === 'text_select_pair' && prev.options && prev.options.length >= 2) {
          inheritedOptions = prev.options.map(o => ({ id: o.id, label: o.label }));
          break;
        }
      }

      const initialOptions = inheritedOptions || [
        { id: 'opt_1', label: 'Nghĩa phương án 1' },
        { id: 'opt_2', label: 'Nghĩa phương án 2' },
        { id: 'opt_3', label: 'Nghĩa phương án 3' },
        { id: 'opt_4', label: 'Nghĩa phương án 4' }
      ];

      block.items.push({
        itemFamilyId: generateUuid(),
        itemVersionId: newItemId,
        position: nextPos,
        exerciseId: targetEx.exerciseId,
        exerciseTitle: targetEx.title,
        prompt: `Từ vựng câu ${nextPos}`,
        helpText: '',
        interactionType: 'text_select_pair',
        pedagogicalTypeCode: 'vocabulary_pair',
        layoutType: 'default',
        graderType: 'accepted_text_exact_option',
        required: true,
        maxScore: 1,
        options: initialOptions,
        skillCodes: [],
        releasePolicy: 'inherit'
      });
      draftState.gradingKey.items[newItemId] = {
        graderType: 'accepted_text_exact_option',
        accepted: [],
        expectedOptionId: initialOptions[0].id,
        normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
      };
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    function openBatchVocabPairModal(bIdx, targetEx) {
      if (typeof document === 'undefined') {
        createSingleVocabItem(bIdx, targetEx);
        return;
      }
      const block = draftState.blocks[bIdx];
      if (!block) return;

      let inheritedOptions = null;
      for (let p = (block.items || []).length - 1; p >= 0; p--) {
        const prev = block.items[p];
        if (prev && prev.interactionType === 'text_select_pair' && prev.options && prev.options.length >= 2) {
          inheritedOptions = prev.options.map(o => o.label).filter(Boolean);
          break;
        }
      }

      let modal = document.querySelector('#batch-vocab-pair-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'batch-vocab-pair-modal';
        modal.className = 'modal-batch-vocab-overlay';
        document.body.appendChild(modal);
      }

      const defaultMeanings = inheritedOptions && inheritedOptions.length >= 2
        ? inheritedOptions.join('\n')
        : '';

      modal.innerHTML = `
        <div class="modal-batch-vocab-card">
          <div class="modal-batch-vocab-header">
            <h3>⚡ Tạo hàng loạt câu hỏi Cặp từ vựng</h3>
            <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng">✕</button>
          </div>
          <div class="modal-batch-vocab-body">
            <div class="alert-notice alert-info" style="margin: 0; padding: 10px 14px; font-size: 0.85rem;">
              Tạo nhanh nhiều câu hỏi cặp từ vựng thuộc bài tập <strong>${escapeHtml(targetEx.title || 'Bài tập')}</strong>. Toàn bộ các câu hỏi sẽ dùng chung danh sách nghĩa tiếng Việt trong ô dropdown.
            </div>
            <div class="form-group">
              <label class="form-label"><strong>1. Tổng số câu hỏi cần tạo:</strong></label>
              <input type="number" class="form-control input-batch-count" min="1" max="100" value="25" style="max-width: 160px; font-weight: 700;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Ví dụ: 25 câu hoặc 50 câu)</span>
            </div>
            <div class="form-group">
              <label class="form-label"><strong>2. Danh sách nghĩa tiếng Việt dùng chung (Mỗi dòng một nghĩa):</strong></label>
              <textarea class="form-control textarea-batch-meanings" rows="8" placeholder="hướng ngoại&#10;môi trường&#10;kiên cường, có khả năng phục hồi&#10;thân thiện, cởi mở&#10;...">${escapeHtml(defaultMeanings)}</textarea>
              <span style="font-size: 0.8rem; color: #64748b;">Gợi ý: Dán danh sách các nghĩa. Các câu hỏi tạo ra sẽ lần lượt nhận nghĩa đúng từ dòng 1 đến N.</span>
            </div>
          </div>
          <div class="modal-batch-vocab-footer">
            <button type="button" class="btn btn-secondary btn-batch-single">
              + Chỉ tạo 1 câu
            </button>
            <button type="button" class="btn btn-primary btn-batch-confirm">
              ⚡ Tạo câu hỏi hàng loạt
            </button>
          </div>
        </div>
      `;

      const closeModal = () => {
        modal.style.display = 'none';
      };

      const closeBtn = modal.querySelector('.btn-close-batch-modal');
      if (closeBtn) closeBtn.addEventListener('click', closeModal);

      // Single item creation
      const singleBtn = modal.querySelector('.btn-batch-single');
      if (singleBtn) {
        singleBtn.addEventListener('click', () => {
          closeModal();
          createSingleVocabItem(bIdx, targetEx);
        });
      }

      // Batch creation
      const confirmBtn = modal.querySelector('.btn-batch-confirm');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const countInput = modal.querySelector('.input-batch-count');
          const count = Math.max(1, Math.min(100, parseInt(countInput?.value, 10) || 25));
          const meaningsText = modal.querySelector('.textarea-batch-meanings')?.value?.trim() || '';

          let options = [];
          if (meaningsText) {
            const lines = meaningsText.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length >= 2) {
              options = lines.map((line, idx) => ({
                id: `meaning-${String(idx + 1).padStart(2, '0')}`,
                label: line
              }));
            }
          }

          if (!options.length) {
            if (inheritedOptions && inheritedOptions.length >= 2) {
              options = inheritedOptions.map((label, idx) => ({
                id: `meaning-${String(idx + 1).padStart(2, '0')}`,
                label
              }));
            } else {
              options = [
                { id: 'meaning-01', label: 'Nghĩa phương án 1' },
                { id: 'meaning-02', label: 'Nghĩa phương án 2' },
                { id: 'meaning-03', label: 'Nghĩa phương án 3' },
                { id: 'meaning-04', label: 'Nghĩa phương án 4' }
              ];
            }
          }

          block.items = block.items || [];
          const startingPos = getNextPosition();

          for (let i = 0; i < count; i++) {
            const currentPos = startingPos + i;
            const newItemId = generateUuid();
            const expectedOptId = options[i] ? options[i].id : options[0].id;

            block.items.push({
              itemFamilyId: generateUuid(),
              itemVersionId: newItemId,
              position: currentPos,
              exerciseId: targetEx.exerciseId,
              exerciseTitle: targetEx.title,
              prompt: `Từ vựng câu ${currentPos}`,
              helpText: '',
              interactionType: 'text_select_pair',
              pedagogicalTypeCode: 'vocabulary_pair',
              layoutType: 'default',
              graderType: 'accepted_text_exact_option',
              required: true,
              maxScore: 1,
              options: options.map(o => ({ id: o.id, label: o.label })),
              skillCodes: [],
              releasePolicy: 'inherit'
            });

            draftState.gradingKey.items[newItemId] = {
              graderType: 'accepted_text_exact_option',
              accepted: [],
              expectedOptionId: expectedOptId,
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          }

          resequenceItemPositions();
          markAsDirty();
          closeModal();
          render();
        });
      }

      modal.style.display = 'flex';
    }

    // Add Vocabulary Pair Question
    const addVocabPairBtns = container.querySelectorAll('.btn-add-vocab-pair');
    addVocabPairBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        openBatchVocabPairModal(bIdx, targetEx);
      });
    });

    // Add AI-Graded Open Text (rubric_async)
    const addRubricBtns = container.querySelectorAll('.btn-add-rubric-async');
    addRubricBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        const nextPos = getNextPosition();
        const newItemId = generateUuid();
        block.items = block.items || [];
        block.items.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: nextPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi ${nextPos}:`,
          helpText: '',
          interactionType: 'long_text',
          pedagogicalTypeCode: 'writing',
          layoutType: 'default',
          graderType: 'rubric_async',
          required: true,
          maxScore: 4,
          options: [],
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'rubric_async',
          rubricCode: 'rubric_translation_v1',
          rubricVersion: 1,
          rubric: {
            scoringVersion: 'rubric-translation-v1',
            maxScore: 4,
            criteria: [
              { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: 2, requiredConcepts: [] },
              { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: 2, requiredConcepts: [] }
            ]
          }
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    // Toggle Collapse / Expand Block Card
    const toggleBlockCollapseBtns = container.querySelectorAll('.btn-toggle-block-collapse');
    if (toggleBlockCollapseBtns && typeof toggleBlockCollapseBtns.forEach === 'function') {
      toggleBlockCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-block-card') : null;
            if (!card) return;
            const isCollapsed = card.classList.toggle('is-collapsed');
            btn.textContent = isCollapsed ? '▸' : '▾';
            btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
          });
        }
      });
    }

    // Toggle Collapse / Expand Exercise Card
    const toggleExerciseCollapseBtns = container.querySelectorAll('.btn-toggle-exercise-collapse');
    if (toggleExerciseCollapseBtns && typeof toggleExerciseCollapseBtns.forEach === 'function') {
      toggleExerciseCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-exercise-card') : null;
            if (!card) return;
            const isCollapsed = card.classList.toggle('is-collapsed');
            btn.textContent = isCollapsed ? '▸' : '▾';
            btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
          });
        }
      });
    }

    // Toggle Collapse / Expand Question Item Card
    const toggleCollapseBtns = container.querySelectorAll('.btn-toggle-item-collapse');
    if (toggleCollapseBtns && typeof toggleCollapseBtns.forEach === 'function') {
      toggleCollapseBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            const card = typeof btn.closest === 'function' ? btn.closest('.builder-item-card') : null;
            if (!card) return;
            const isCollapsed = card.classList.toggle('is-collapsed');
            btn.textContent = isCollapsed ? '▸' : '▾';
            btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
          });
        }
      });
    }

    // Bulk Collapse All
    const btnCollapseAll = typeof container.querySelector === 'function' ? container.querySelector('#btn-collapse-all') : null;
    if (btnCollapseAll && typeof btnCollapseAll.addEventListener === 'function') {
      btnCollapseAll.addEventListener('click', () => {
        const blocks = container.querySelectorAll('.builder-block-card');
        if (blocks && typeof blocks.forEach === 'function') {
          blocks.forEach(card => card.classList?.add('is-collapsed'));
        }
        const exercises = container.querySelectorAll('.builder-exercise-card');
        if (exercises && typeof exercises.forEach === 'function') {
          exercises.forEach(card => card.classList?.add('is-collapsed'));
        }
        const items = container.querySelectorAll('.builder-item-card');
        if (items && typeof items.forEach === 'function') {
          items.forEach(card => card.classList?.add('is-collapsed'));
        }

        const blockToggles = container.querySelectorAll('.btn-toggle-block-collapse');
        if (blockToggles && typeof blockToggles.forEach === 'function') {
          blockToggles.forEach(b => {
            b.textContent = '▸';
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const exToggles = container.querySelectorAll('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.textContent = '▸';
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const itemToggles = container.querySelectorAll('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.textContent = '▸';
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
      });
    }

    // Bulk Expand All
    const btnExpandAll = typeof container.querySelector === 'function' ? container.querySelector('#btn-expand-all') : null;
    if (btnExpandAll && typeof btnExpandAll.addEventListener === 'function') {
      btnExpandAll.addEventListener('click', () => {
        const blocks = container.querySelectorAll('.builder-block-card');
        if (blocks && typeof blocks.forEach === 'function') {
          blocks.forEach(card => card.classList?.remove('is-collapsed'));
        }
        const exercises = container.querySelectorAll('.builder-exercise-card');
        if (exercises && typeof exercises.forEach === 'function') {
          exercises.forEach(card => card.classList?.remove('is-collapsed'));
        }
        const items = container.querySelectorAll('.builder-item-card');
        if (items && typeof items.forEach === 'function') {
          items.forEach(card => card.classList?.remove('is-collapsed'));
        }

        const blockToggles = container.querySelectorAll('.btn-toggle-block-collapse');
        if (blockToggles && typeof blockToggles.forEach === 'function') {
          blockToggles.forEach(b => {
            b.textContent = '▾';
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const exToggles = container.querySelectorAll('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.textContent = '▾';
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const itemToggles = container.querySelectorAll('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.textContent = '▾';
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
      });
    }

    // Move Question Item Up
    const moveItemUpBtns = container.querySelectorAll('.btn-move-item-up');
    moveItemUpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.items || iIdx <= 0) return;
        const currentItem = block.items[iIdx];
        const prevItem = block.items[iIdx - 1];
        block.items[iIdx] = prevItem;
        block.items[iIdx - 1] = currentItem;
        if (prevItem.exerciseId && prevItem.exerciseId !== currentItem.exerciseId) {
          currentItem.exerciseId = prevItem.exerciseId;
          currentItem.exerciseTitle = prevItem.exerciseTitle;
        }
        resequenceItemPositions();
        render();
      });
    });

    // Move Question Item Down
    const moveItemDownBtns = container.querySelectorAll('.btn-move-item-down');
    moveItemDownBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (!block || !block.items || iIdx >= block.items.length - 1) return;
        const currentItem = block.items[iIdx];
        const nextItem = block.items[iIdx + 1];
        block.items[iIdx] = nextItem;
        block.items[iIdx + 1] = currentItem;
        if (nextItem.exerciseId && nextItem.exerciseId !== currentItem.exerciseId) {
          currentItem.exerciseId = nextItem.exerciseId;
          currentItem.exerciseTitle = nextItem.exerciseTitle;
        }
        resequenceItemPositions();
        render();
      });
    });

    // Delete Question Item
    const delItemBtns = container.querySelectorAll('.btn-delete-item');
    delItemBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const block = draftState.blocks[bIdx];
        if (block && block.items) {
          const [deletedItem] = block.items.splice(iIdx, 1);
          if (deletedItem?.itemVersionId) {
            delete draftState.gradingKey.items[deletedItem.itemVersionId];
          }
          resequenceItemPositions();
          render();
        }
      });
    });

    // Add Option to single/multi choice
    const addOptBtns = container.querySelectorAll('.btn-add-option');
    addOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nextId = alphabet[item.options.length] || `OPT${item.options.length + 1}`;
        item.options.push({ id: nextId, label: `Phương án ${nextId}` });
        render();
      });
    });

    // Delete Option
    const delOptBtns = container.querySelectorAll('.btn-del-option');
    delOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item && item.options && item.options.length > 2) {
          item.options = item.options.filter(o => o.id !== optId);
          render();
        } else {
          alert('Một câu hỏi lựa chọn phải có ít nhất 2 phương án.');
        }
      });
    });

    // Generate variants button for FITB
    const genVariantBtns = container.querySelectorAll('.btn-generate-variants');
    genVariantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const rawInput = card?.querySelector('.input-fitb-raw');
        const rawVal = rawInput?.value?.trim() || '';
        if (!rawVal) {
          alert('Vui lòng nhập đáp án chuẩn trước khi sinh biến thể.');
          return;
        }
        const generated = expandSentenceVariants([rawVal]);
        draftState.gradingKey.items[item.itemVersionId] = {
          graderType: 'accepted_text',
          accepted: generated,
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        render();
      });
    });

    // Remove single variant chip
    const removeChipBtns = container.querySelectorAll('.btn-remove-chip');
    removeChipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        const variantToRemove = btn.getAttribute('data-variant');
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey && Array.isArray(currentKey.accepted)) {
          currentKey.accepted = currentKey.accepted.filter(v => v !== variantToRemove);
          if (!currentKey.accepted.length) currentKey.accepted = ['answer'];
          render();
        }
      });
    });

    // Generate variants button for Vocab Pair
    const genVocabVariantBtns = container.querySelectorAll('.btn-generate-vocab-variants');
    genVocabVariantBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const rawInput = card?.querySelector('.input-vocab-raw');
        const rawVal = rawInput?.value?.trim() || '';
        if (!rawVal) {
          alert('Vui lòng nhập từ tiếng Anh chuẩn trước khi sinh biến thể.');
          return;
        }
        const generated = expandSentenceVariants([rawVal]);
        const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId || item.options?.[0]?.id || 'opt_1';
        draftState.gradingKey.items[item.itemVersionId] = {
          graderType: 'accepted_text_exact_option',
          accepted: generated,
          expectedOptionId: currentExpected,
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
        render();
      });
    });

    // Add manual variant input for Vocab Pair
    const addVocabVariantInputs = container.querySelectorAll('.input-add-vocab-variant');
    addVocabVariantInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId || item.options?.[0]?.id || 'opt_1';
          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'accepted_text_exact_option',
            accepted: [],
            expectedOptionId: currentExpected,
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            if (currentKey.accepted.length > 40) currentKey.accepted.pop();
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
          }
        }
      });
    });

    // Add Option to Vocab Pair
    const addVocabOptBtns = container.querySelectorAll('.btn-add-vocab-option');
    addVocabOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const nextNum = (item.options?.length || 0) + 1;
        const nextId = `opt_${nextNum}`;
        item.options = item.options || [];
        item.options.push({ id: nextId, label: `Nghĩa phương án ${nextNum}` });
        render();
      });
    });

    // Delete Option from Vocab Pair
    const delVocabOptBtns = container.querySelectorAll('.btn-del-vocab-option');
    delVocabOptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const optId = btn.getAttribute('data-option-id');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item && item.options && item.options.length > 2) {
          item.options = item.options.filter(o => o.id !== optId);
          // if deleted expected option, fallback to first option
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId;
          if (currentExpected === optId) {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = item.options[0]?.id || 'opt_1';
          }
          render();
        } else {
          alert('Một câu hỏi cặp từ vựng phải có ít nhất 2 nghĩa để lựa chọn.');
        }
      });
    });

    // Toggle Bulk Paste Panel for Vocab Options
    const toggleBulkVocabBtns = container.querySelectorAll('.btn-bulk-paste-vocab-options');
    toggleBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bIdx = btn.getAttribute('data-block-idx');
        const iIdx = btn.getAttribute('data-item-idx');
        const panel = container.querySelector(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        if (panel) {
          const isHidden = panel.style.display === 'none' || !panel.style.display;
          panel.style.display = isHidden ? 'block' : 'none';
          if (isHidden) {
            const ta = panel.querySelector('.input-bulk-vocab-options');
            if (ta) ta.focus();
          }
        }
      });
    });

    // Cancel Bulk Paste Panel
    const cancelBulkVocabBtns = container.querySelectorAll('.btn-cancel-bulk-vocab-options');
    cancelBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const bIdx = btn.getAttribute('data-block-idx');
        const iIdx = btn.getAttribute('data-item-idx');
        const panel = container.querySelector(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        if (panel) panel.style.display = 'none';
      });
    });

    // Apply Bulk Paste Vocab Options
    const applyBulkVocabBtns = container.querySelectorAll('.btn-apply-bulk-vocab-options');
    applyBulkVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const panel = container.querySelector(`#vocab-bulk-paste-${bIdx}-${iIdx}`);
        const ta = panel?.querySelector('.input-bulk-vocab-options');
        const rawText = ta ? ta.value : '';
        const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          item.options = lines.map((lbl, idx) => ({
            id: `opt_${idx + 1}`,
            label: lbl
          }));
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId;
          if (!item.options.some(o => o.id === currentExpected)) {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = item.options[0].id;
          }
          markAsDirty();
          render();
        } else {
          alert('Vui lòng nhập hoặc dán ít nhất 2 nghĩa tiếng Việt (mỗi dòng một nghĩa).');
        }
      });
    });

    // Copy Options from Preceding Vocab Pair Item
    const copyPrevVocabBtns = container.querySelectorAll('.btn-copy-prev-vocab-options');
    copyPrevVocabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;

        let prevItem = null;
        for (let p = iIdx - 1; p >= 0; p--) {
          const candidate = draftState.blocks[bIdx]?.items?.[p];
          if (candidate && candidate.interactionType === 'text_select_pair' && candidate.options && candidate.options.length >= 2) {
            prevItem = candidate;
            break;
          }
        }

        if (prevItem) {
          item.options = prevItem.options.map(o => ({ id: o.id, label: o.label }));
          const currentExpected = draftState.gradingKey.items[item.itemVersionId]?.expectedOptionId;
          if (!item.options.some(o => o.id === currentExpected)) {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = item.options[0].id;
          }
          markAsDirty();
          render();
        } else {
          alert('Không tìm thấy câu hỏi cặp từ vựng nào trước câu này để sao chép.');
        }
      });
    });

    // Sync Vocab Options across the whole Block
    const syncVocabToBlockBtns = container.querySelectorAll('.btn-sync-vocab-options-to-block');
    syncVocabToBlockBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const sourceItem = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!sourceItem || !sourceItem.options || sourceItem.options.length < 2) return;

        const block = draftState.blocks[bIdx];
        (block.items || []).forEach(it => {
          if (it.interactionType === 'text_select_pair' && it.itemVersionId !== sourceItem.itemVersionId) {
            it.options = sourceItem.options.map(o => ({ id: o.id, label: o.label }));
            const itKey = draftState.gradingKey.items[it.itemVersionId];
            if (itKey && !it.options.some(o => o.id === itKey.expectedOptionId)) {
              itKey.expectedOptionId = it.options[0].id;
            }
          }
        });

        markAsDirty();
        render();
      });
    });

    // Toggle Vocab Meaning Bank Collapsible
    const toggleVocabBankBtns = container.querySelectorAll('.btn-toggle-vocab-bank');
    toggleVocabBankBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const targetEl = container.querySelector('#' + targetId);
        if (targetEl) {
          const isHidden = targetEl.style.display === 'none';
          targetEl.style.display = isHidden ? 'block' : 'none';
          btn.textContent = isHidden ? btn.textContent.replace('▼', '▲') : btn.textContent.replace('▲', '▼');
        }
      });
    });

    // Select Vocab Correct Dropdown change
    const selectVocabDropdowns = container.querySelectorAll('.select-vocab-correct-dropdown');
    selectVocabDropdowns.forEach(sel => {
      sel.addEventListener('change', () => {
        const bIdx = Number(sel.getAttribute('data-block-idx'));
        const iIdx = Number(sel.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item) {
          if (!draftState.gradingKey.items[item.itemVersionId]) {
            draftState.gradingKey.items[item.itemVersionId] = {
              graderType: 'accepted_text_exact_option',
              accepted: [item.prompt || 'word'],
              expectedOptionId: sel.value,
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          } else {
            draftState.gradingKey.items[item.itemVersionId].expectedOptionId = sel.value;
          }
          markAsDirty();

          // Also synchronize radio button and highlight state in bank
          const itemCard = sel.closest('.item-card');
          if (itemCard) {
            const allRadios = itemCard.querySelectorAll('.radio-vocab-correct');
            allRadios.forEach(r => {
              r.checked = (r.value === sel.value);
            });
            const allRows = itemCard.querySelectorAll('.vocab-meaning-row');
            allRows.forEach(r => {
              if (r.getAttribute('data-option-id') === sel.value) {
                r.classList.add('is-correct');
              } else {
                r.classList.remove('is-correct');
              }
            });
          }
        }
      });
    });

    // Radio Vocab Correct change syncs back to dropdown
    const vocabRadios = container.querySelectorAll('.radio-vocab-correct');
    vocabRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        const itemCard = radio.closest('.item-card');
        if (itemCard) {
          const sel = itemCard.querySelector('.select-vocab-correct-dropdown');
          if (sel) sel.value = radio.value;
          const allRows = itemCard.querySelectorAll('.vocab-meaning-row');
          allRows.forEach(r => {
            if (r.getAttribute('data-option-id') === radio.value) {
              r.classList.add('is-correct');
            } else {
              r.classList.remove('is-correct');
            }
          });
        }
      });
    });

    // Add manual variant input
    const addVariantInputs = container.querySelectorAll('.input-add-variant');
    addVariantInputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (!val) return;
          syncInputs();
          const bIdx = Number(input.getAttribute('data-block-idx'));
          const iIdx = Number(input.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;
          const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
            graderType: 'accepted_text',
            accepted: [],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
          if (!currentKey.accepted.includes(val)) {
            currentKey.accepted.push(val);
            if (currentKey.accepted.length > 40) currentKey.accepted.pop();
            draftState.gradingKey.items[item.itemVersionId] = currentKey;
            render();
          }
        }
      });
    });

    // Preset switch handler
    const presetSelects = container.querySelectorAll('.select-rubric-preset');
    presetSelects.forEach(sel => {
      sel.addEventListener('change', () => {
        syncInputs();
        const bIdx = Number(sel.getAttribute('data-block-idx'));
        const iIdx = Number(sel.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const val = sel.value;
        const currentScore = item.maxScore || 4;

        if (val === 'translation') {
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_translation_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-translation-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: currentScore / 2, requiredConcepts: [] },
                { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: currentScore / 2, requiredConcepts: [] }
              ]
            }
          };
        } else if (val === 'speaking') {
          const s1 = Math.round(currentScore * 0.4 * 10) / 10;
          const s2 = Math.round(currentScore * 0.3 * 10) / 10;
          const s3 = Math.round((currentScore - s1 - s2) * 10) / 10;
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_speaking_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-speaking-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'idea', label: 'Ý tưởng & Phát triển (Idea Development)', maxScore: s1, requiredConcepts: [] },
                { id: 'vocabulary', label: 'Từ vựng & Diễn đạt (Vocabulary)', maxScore: s2, requiredConcepts: [] },
                { id: 'coherence', label: 'Ngữ pháp & Mạch lạc (Grammar & Coherence)', maxScore: s3, requiredConcepts: [] }
              ]
            }
          };
        } else if (val === 'comprehension') {
          const s1 = Math.round(currentScore * 0.7 * 10) / 10;
          const s2 = Math.round((currentScore - s1) * 10) / 10;
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_comprehension_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-comprehension-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'comprehension', label: 'Mức độ hiểu nội dung (Comprehension)', maxScore: s1, requiredConcepts: [] },
                { id: 'keywords', label: 'Từ khóa & Khái niệm cốt lõi (Keywords)', maxScore: s2, requiredConcepts: [] }
              ]
            }
          };
        }
        render();
      });
    });

    // Tab switch handler inside Rubric card
    const rubricTabs = container.querySelectorAll('.btn-rubric-tab');
    rubricTabs.forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.getAttribute('data-tab');
        const bIdx = tabBtn.getAttribute('data-block-idx');
        const iIdx = tabBtn.getAttribute('data-item-idx');
        const card = tabBtn.closest('.builder-item-card');
        if (!card) return;

        card.querySelectorAll('.btn-rubric-tab').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        const criteriaPane = card.querySelector(`#pane-criteria-${bIdx}-${iIdx}`);
        const guidancePane = card.querySelector(`#pane-guidance-${bIdx}-${iIdx}`);
        const sandboxPane = card.querySelector(`#pane-sandbox-${bIdx}-${iIdx}`);

        if (criteriaPane) criteriaPane.style.display = tab === 'criteria' ? 'flex' : 'none';
        if (guidancePane) guidancePane.style.display = tab === 'guidance' ? 'flex' : 'none';
        if (sandboxPane) sandboxPane.style.display = tab === 'sandbox' ? 'flex' : 'none';
      });
    });

    // Add Criterion handler
    const addCriterionBtns = container.querySelectorAll('.btn-add-criterion');
    addCriterionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (!currentKey || !currentKey.rubric) return;

        const nextNum = (currentKey.rubric.criteria?.length || 0) + 1;
        currentKey.rubric.criteria = currentKey.rubric.criteria || [];
        currentKey.rubric.criteria.push({
          id: `criterion_${nextNum}`,
          label: `Tiêu chí ${nextNum}`,
          maxScore: 1,
          requiredConcepts: []
        });
        const total = currentKey.rubric.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
        currentKey.rubric.maxScore = total;
        item.maxScore = total;
        render();
      });
    });

    // Delete Criterion handler
    const delCriterionBtns = container.querySelectorAll('.btn-del-criterion');
    delCriterionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const cIdx = Number(btn.getAttribute('data-criterion-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey && currentKey.rubric && currentKey.rubric.criteria && currentKey.rubric.criteria.length > 1) {
          currentKey.rubric.criteria.splice(cIdx, 1);
          const total = currentKey.rubric.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
          currentKey.rubric.maxScore = total;
          item.maxScore = total;
          render();
        } else {
          alert('Rubric phải có ít nhất 1 tiêu chí chấm điểm.');
        }
      });
    });

    // Trigger AI Sandbox handler
    const triggerSandboxBtns = container.querySelectorAll('.btn-trigger-sandbox');
    triggerSandboxBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (!currentKey || !currentKey.rubric) return;

        const card = btn.closest('.builder-item-card');
        const sampleTextarea = card?.querySelector('.input-sandbox-sample');
        const resultsContainer = card?.querySelector('.sandbox-results-container');
        const sampleAnswer = sampleTextarea?.value?.trim() || '';

        if (!sampleAnswer) {
          alert('Vui lòng nhập câu trả lời mẫu trước khi chấm thử.');
          return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Đang chấm AI...';
        if (resultsContainer) {
          resultsContainer.style.display = 'block';
          resultsContainer.innerHTML = '<div class="alert-notice"><div class="notice-text">Đang gửi yêu cầu đánh giá đến AI Gateway...</div></div>';
        }

        try {
          let sandboxResult;
          if (typeof options.onPreviewSandbox === 'function') {
            sandboxResult = await options.onPreviewSandbox({
              prompt: item.prompt,
              sampleAnswer,
              interactionType: item.interactionType,
              pedagogicalTypeCode: item.pedagogicalTypeCode,
              rubric: currentKey.rubric
            });
          } else {
            const apiRes = await fetch(previewSandboxPath(options.apiBase), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {})
              },
              body: JSON.stringify({
                prompt: item.prompt,
                sampleAnswer,
                interactionType: item.interactionType,
                pedagogicalTypeCode: item.pedagogicalTypeCode,
                rubric: currentKey.rubric
              })
            });
            sandboxResult = await apiRes.json();
          }

          if (!sandboxResult || !sandboxResult.ok) {
            throw new Error(sandboxResult?.message || 'Chấm thử AI thất bại.');
          }

          const criteriaRows = (sandboxResult.criteria || []).map(c => `
            <div class="sandbox-criterion-row">
              <span><strong>${escapeHtml(c.id || '')}:</strong> ${c.maxScore !== undefined ? `(${c.score}/${c.maxScore}đ)` : ''}</span>
              <span class="sandbox-criterion-score">${c.score}đ</span>
            </div>
          `).join('');

          const errorsRows = (sandboxResult.errors || []).map(err => `
            <div class="error-pill" style="color: #b91c1c; font-size: 0.78rem;">
              • <strong>${escapeHtml(err.code || '')}:</strong> ${escapeHtml(err.message || '')}
            </div>
          `).join('');

          if (resultsContainer) {
            resultsContainer.innerHTML = `
              <div class="sandbox-results-box">
                <div class="sandbox-score-summary">
                  <span>Điểm AI tạm tính:</span>
                  <span class="sandbox-score-badge">${sandboxResult.scoreEarned} / ${sandboxResult.maxScore}</span>
                </div>
                ${criteriaRows ? `<div class="sandbox-criteria-breakdown">${criteriaRows}</div>` : ''}
                ${errorsRows ? `<div class="sandbox-errors-breakdown">${errorsRows}</div>` : ''}
              </div>
            `;
          }
        } catch (err) {
          if (resultsContainer) {
            resultsContainer.innerHTML = `<div class="alert-notice alert-immutable"><div class="notice-text" style="color:#b91c1c;">Lỗi: ${escapeHtml(err.message || 'Không thể chấm thử')}</div></div>`;
          }
        } finally {
          btn.disabled = false;
          btn.textContent = '⚡ Chấm thử AI';
        }
      });
    });

    const upBtns = container.querySelectorAll('.btn-move-block-up');
    if (upBtns && typeof upBtns.forEach === 'function') {
      upBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (idx > 0) {
              const temp = draftState.blocks[idx];
              draftState.blocks[idx] = draftState.blocks[idx - 1];
              draftState.blocks[idx - 1] = temp;
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              render();
            }
          });
        }
      });
    }

    const downBtns = container.querySelectorAll('.btn-move-block-down');
    if (downBtns && typeof downBtns.forEach === 'function') {
      downBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (idx < draftState.blocks.length - 1) {
              const temp = draftState.blocks[idx];
              draftState.blocks[idx] = draftState.blocks[idx + 1];
              draftState.blocks[idx + 1] = temp;
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              render();
            }
          });
        }
      });
    }

    const delBtns = container.querySelectorAll('.btn-delete-block');
    if (delBtns && typeof delBtns.forEach === 'function') {
      delBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const idx = Number(btn.getAttribute('data-index'));
            if (draftState.blocks.length > 1) {
              draftState.blocks.splice(idx, 1);
              draftState.blocks.forEach((b, i) => { b.checkpoint = i + 1; });
              resequenceItemPositions();
              render();
            }
          });
        }
      });
    }

    const saveBtn = container.querySelector('#btn-save-draft');
    const statusMsg = container.querySelector('#builder-status-msg');
    if (saveBtn && typeof options.onSaveDraft === 'function' && typeof saveBtn.addEventListener === 'function') {
      saveBtn.addEventListener('click', async () => {
        syncInputs();
        saveBtn.disabled = true;
        saveBtn.innerHTML = `${renderSvgIcon('rotate', 'icon-inline spin')} <span>Đang lưu...</span>`;
        if (statusMsg) {
          statusMsg.className = 'builder-status-pill saving';
          statusMsg.innerHTML = `${renderSvgIcon('rotate', 'icon-inline spin')} <span>Đang lưu bản nháp...</span>`;
        }

        try {
          const payload = {
            formVersionId: draftState.formVersionId,
            title: draftState.title,
            durationMinutes: draftState.durationMinutes,
            answerReleasePolicy: draftState.answerReleasePolicy,
            blocks: draftState.blocks.map((b, i) => ({
              blockId: b.blockId,
              checkpoint: i + 1,
              title: b.title || `Phần ${i + 1}`,
              instructions: b.instructions || '',
              audioUrl: b.audioUrl || null,
              readingPassage: b.readingPassage || null,
              stimulusAudioUrl: b.audioUrl || null,
              stimulusReadingPassage: b.readingPassage || null,
              exercises: b.exercises || [],
              items: (b.items || []).map((itm, itmIdx) => ({
                ...itm,
                prompt: (typeof itm.prompt === 'string' && itm.prompt.trim()) ? itm.prompt.trim() : `Câu ${itm.position || itmIdx + 1}`
              }))
            })),
            gradingKey: draftState.gradingKey
          };

          // Ensure every item in gradingKey has non-empty accepted array if accepted_text
          const cleanGradingKey = JSON.parse(JSON.stringify(draftState.gradingKey || { items: {}, groups: {} }));
          for (const [k, itmKey] of Object.entries(cleanGradingKey.items || {})) {
            if (itmKey && (itmKey.graderType === 'accepted_text' || itmKey.graderType === 'accepted_text_exact_option')) {
              if (!Array.isArray(itmKey.accepted) || itmKey.accepted.length === 0 || itmKey.accepted.every(a => !String(a).trim())) {
                itmKey.accepted = ['answer'];
              } else {
                itmKey.accepted = itmKey.accepted.filter(a => String(a).trim());
                if (itmKey.accepted.length === 0) itmKey.accepted = ['answer'];
              }
            }
            if (itmKey && itmKey.graderType === 'exact_option' && !itmKey.expectedOptionId) {
              itmKey.expectedOptionId = 'A';
            }
            if (itmKey && itmKey.graderType === 'accepted_text_exact_option' && !itmKey.expectedOptionId) {
              itmKey.expectedOptionId = 'opt_1';
            }
          }
          payload.gradingKey = cleanGradingKey;
          draftState.gradingKey = cleanGradingKey;

          const res = await options.onSaveDraft(payload);
          const now = new Date();
          const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');

          if (res && res.forked) {
            draftState.formVersionId = res.formVersionId;
            draftState.version = res.version;
            draftState.submissionCount = 0;
            draftState.status = 'draft';
            render();
            const newStatusMsg = container.querySelector('#builder-status-msg');
            if (newStatusMsg) {
              newStatusMsg.className = 'builder-status-pill forked';
              newStatusMsg.innerHTML = `${renderSvgIcon('alert', 'icon-inline')} <span>Đã tạo bản nháp mới v${res.version} (bảo toàn đề cũ đã có bài nộp)</span>`;
            }
          } else {
            if (res && res.version) draftState.version = res.version;
            if (statusMsg) {
              statusMsg.className = 'builder-status-pill success';
              statusMsg.innerHTML = `${renderSvgIcon('check', 'icon-inline')} <span>Đã lưu bản nháp v${draftState.version} lúc ${timeStr}</span>`;
            }
          }
        } catch (err) {
          if (statusMsg) {
            statusMsg.className = 'builder-status-pill error';
            statusMsg.innerHTML = `${renderSvgIcon('alert', 'icon-inline')} <span>Lỗi khi lưu: ${escapeHtml(err.message || 'Không thể lưu bản nháp')}</span>`;
          }
        } finally {
          const activeSaveBtn = container.querySelector('#btn-save-draft');
          if (activeSaveBtn) {
            activeSaveBtn.disabled = false;
            activeSaveBtn.innerHTML = `${renderSvgIcon('save', 'icon-inline')} <span>Lưu bản nháp</span>`;
          }
        }
      });
    }

    // Candidate Simulation Modal
    function openCandidateSimulationModal() {
      syncInputs();
      let modal = document.querySelector('#candidate-simulation-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'candidate-simulation-modal';
        modal.className = 'candidate-simulation-overlay';
        document.body.appendChild(modal);
      }

      const blocks = draftState.blocks || [];
      const sectionsNavHtml = blocks.map((b, i) => `
        <button type="button" class="simulation-nav-pill ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
          Phần ${i + 1}: ${escapeHtml(b.title || `Phần ${i + 1}`)}
        </button>
      `).join('');

      const simulationBlocksHtml = blocks.map((b, bIdx) => {
        const audioUrl = b.audioUrl || b.stimulusAudioUrl || '';
        const reading = b.readingPassage || b.stimulusReadingPassage || '';
        const items = b.items || [];
        const exercises = (b.exercises && b.exercises.length > 0) ? b.exercises : [
          {
            exerciseId: b.blockId,
            exerciseNumber: 1,
            title: b.title || `Phần ${bIdx + 1}`,
            instructions: b.instructions || '',
            audioUrl,
            readingPassage: reading,
            itemIds: items.map(it => it.itemVersionId)
          }
        ];

        const renderSimQuestionCard = (item) => {
          const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
          const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.layoutType === 'keyword_transformation') && !isPronunciation;
          const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
          const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || b.layoutType === 'split_pane_matching') && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isSingleChoice = item.interactionType === 'single_choice' && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isMultiGroup = item.interactionType === 'multi_choice_group' && item.graderType === 'unordered_group_slot';
          const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isInlineCloze = item.interactionType === 'short_text' && item.layoutType === 'inline_cloze' && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isShortText = item.interactionType === 'short_text' && item.graderType !== 'rubric_async' && !isInlineCloze && !isPictorial && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
          const isVocabPair = item.interactionType === 'text_select_pair';
          const isRubricAsync = item.graderType === 'rubric_async';

          const layout = item.layoutType || (item.options?.length === 3 ? 'grid_3' : (item.options?.length >= 4 ? 'grid_4' : 'grid_2'));
          const colsClass = layout === 'grid_3' ? 'grid-cols-3' : (layout === 'grid_4' ? 'grid-cols-4' : 'grid-cols-2');

          let interactiveHtml = '';
          if (isPronunciation) {
            const formattedIpa = formatIpaTranscription(item.ipaTranscription || '');
            const audioSrc = item.audioUrl || '';
            interactiveHtml = `
              <div class="candidate-pronunciation-wrap" data-item-id="${item.itemVersionId}">
                <div class="candidate-ipa-display-dock">
                  <div class="candidate-ipa-badge">${escapeHtml(formattedIpa || '/.../')}</div>
                  ${audioSrc ? `
                    <button type="button" class="btn btn-sm btn-secondary candidate-ipa-audio-btn" data-audio-src="${escapeHtml(audioSrc)}" title="Nghe phát âm mẫu">
                      ${renderSvgIcon('audio', 'icon-inline')} Nghe phát âm
                    </button>
                    <audio src="${escapeHtml(audioSrc)}" class="ipa-inline-audio" style="display:none;"></audio>
                  ` : ''}
                </div>

                <div class="candidate-pron-options-grid ${colsClass}" style="margin-top: 10px;">
                  ${(item.options || []).map(opt => `
                    <label class="candidate-choice-label candidate-pron-option-label">
                      <input type="radio" name="sim_pron_${item.itemVersionId}" value="${opt.id}" />
                      <span class="choice-key">${opt.id}</span>
                      <span class="choice-text choice-ipa-text">${escapeHtml(opt.label || '')}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `;
          } else if (isSentenceRewrite) {
            const kw = (item.keyword || '').toUpperCase();
            interactiveHtml = `
              <div class="candidate-transformation-wrap" data-item-id="${item.itemVersionId}">
                <div class="transformation-keyword-row" style="margin-bottom: 8px;">
                  <span class="keyword-label" style="font-size:0.85rem; font-weight:600; color:#475569;">Từ khóa bắt buộc:</span>
                  <span class="keyword-badge-pill">${escapeHtml(kw)}</span>
                </div>
                <div class="candidate-frame-box">
                  <span class="frame-prefix-text">${escapeHtml(item.framePrefix || '')}</span>
                  <input type="text" class="form-control candidate-transformation-input" data-item-id="${item.itemVersionId}" placeholder="Nhập cụm từ khuyết..." />
                  <span class="frame-suffix-text">${escapeHtml(item.frameSuffix || '')}</span>
                </div>
              </div>
            `;
          } else if (isReadingMatching) {
            interactiveHtml = `
              <div class="candidate-matching-wrap">
                <label class="form-label" style="font-size:0.8rem;color:#64748b;margin-bottom:4px;">Chọn Heading / Tiêu đề phù hợp:</label>
                <select class="form-select form-select-sm matching-select candidate-choice-select" data-item-id="${item.itemVersionId}">
                  <option value="">-- Chọn Heading tương ứng --</option>
                  ${(item.options || []).map(opt => `
                    <option value="${escapeHtml(opt.id)}">${escapeHtml(opt.label || opt.id)}</option>
                  `).join('')}
                </select>
              </div>
            `;
          } else if (isListeningOrder) {
            const events = item.events || [];
            const audioSrc = item.audioUrl || audioUrl || '';
            interactiveHtml = `
              <div class="candidate-listening-order-wrap">
                ${audioSrc ? `
                  <div class="candidate-audio-dock">
                    <div class="audio-caption">🎧 Đoạn ghi âm câu hỏi:</div>
                    <audio controls src="${escapeHtml(audioSrc)}" class="sim-audio-player"></audio>
                  </div>
                ` : ''}

                <div class="candidate-events-pool">
                  <div class="events-pool-title">Các câu / sự kiện cần sắp xếp:</div>
                  <div class="events-pool-grid">
                    ${events.map(ev => `
                      <div class="event-pool-card" data-event-label="${escapeHtml(ev.label)}">
                        <span class="event-pool-badge">${escapeHtml(ev.label)}</span>
                        <span class="event-pool-text">${escapeHtml(ev.text || '')}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <div class="candidate-timeline-slots">
                  <div class="timeline-slots-title">Trình tự diễn ra theo thời gian:</div>
                  <div class="timeline-slots-grid">
                    ${events.map((_, idx) => `
                      <div class="timeline-slot-card" data-slot-index="${idx + 1}">
                        <div class="slot-badge">Thứ ${idx + 1}</div>
                        <select class="form-select form-select-sm candidate-sequence-select" data-slot="${idx + 1}">
                          <option value="">-- Chọn sự kiện --</option>
                          ${events.map(ev => `
                            <option value="${escapeHtml(ev.label)}">${escapeHtml(ev.label)}: ${escapeHtml(ev.text ? (ev.text.length > 30 ? ev.text.substring(0, 30) + '...' : ev.text) : '')}</option>
                          `).join('')}
                        </select>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          } else if (isSingleChoice) {
            interactiveHtml = `
              <div class="candidate-options-grid ${colsClass}">
                ${(item.options || []).map(opt => `
                  <label class="candidate-choice-label">
                    <input type="radio" name="sim_choice_${item.itemVersionId}" value="${opt.id}" />
                    <span class="choice-key">${opt.id}</span>
                    <span class="choice-text">${escapeHtml(opt.label || '')}</span>
                  </label>
                `).join('')}
              </div>
            `;
          } else if (isMultiGroup) {
            interactiveHtml = `
              <div class="candidate-options-grid ${colsClass}">
                ${(item.options || []).map(opt => `
                  <label class="candidate-choice-label">
                    <input type="checkbox" name="sim_multi_${item.itemVersionId}" value="${opt.id}" />
                    <span class="choice-key">${opt.id}</span>
                    <span class="choice-text">${escapeHtml(opt.label || '')}</span>
                  </label>
                `).join('')}
              </div>
            `;
          } else if (isPictorial) {
            const imgSrc = item.image || item.stimulusImageUrl || '';
            interactiveHtml = `
              <div class="candidate-pictorial-card">
                ${imgSrc ? `
                  <div class="candidate-pictorial-thumb">
                    <img src="${escapeHtml(imgSrc)}" alt="Câu ${item.position}" onerror="this.parentElement.style.display='none'" />
                  </div>
                ` : ''}
                <div class="candidate-pictorial-hints">
                  ${item.letterHint ? `<div class="pictorial-letter-hint">${escapeHtml(item.letterHint)}</div>` : ''}
                  ${item.captionHint ? `<div class="pictorial-caption-hint">${escapeHtml(item.captionHint)}</div>` : ''}
                </div>
                <div class="candidate-pictorial-input-wrap">
                  <input type="text" class="form-control candidate-pictorial-input" placeholder="Nhập từ hoàn chỉnh..." />
                </div>
              </div>
            `;
          } else if (isInlineCloze) {
            interactiveHtml = `
              <div class="candidate-inline-cloze-wrap" style="line-height: 2.2; font-size: 1.05rem;">
                ${renderInlineClozeMarkup(item.prompt || '', [item])}
              </div>
            `;
          } else if (isSentenceReorder) {
            const tokens = item.tokens || tokenizeSentence(item.targetSentence || '');
            const distractors = item.distractors || [];
            const allChips = scrambleTokens([...tokens, ...distractors]);
            interactiveHtml = `
              <div class="candidate-sentence-reorder-wrap" data-item-id="${item.itemVersionId}">
                <div class="candidate-token-bank-header">
                  <span class="token-bank-label">Ngân hàng từ / Cụm từ (Bấm vào thẻ để ghép câu):</span>
                </div>
                <div class="candidate-token-bank" data-item-id="${item.itemVersionId}">
                  ${allChips.map((tok, idx) => `
                    <button type="button" class="btn-token-chip" data-token="${escapeHtml(tok)}" data-token-id="t-${idx}">
                      ${escapeHtml(tok)}
                    </button>
                  `).join('')}
                </div>

                <div class="candidate-assembly-area" style="margin-top: 12px;">
                  <label class="form-label" style="font-size:0.8rem; font-weight:600; color:#334155;">Câu bạn ghép được (Có thể bấm thẻ phía trên hoặc gõ trực tiếp):</label>
                  <div class="assembly-input-wrap">
                    <input type="text" class="form-control candidate-reorder-input" data-item-id="${item.itemVersionId}" placeholder="Bấm các thẻ từ ở trên hoặc gõ câu hoàn chỉnh vào đây..." />
                    <button type="button" class="btn btn-secondary btn-sm btn-clear-assembly" data-item-id="${item.itemVersionId}" title="Xóa và ghép lại từ đầu">
                      ↺ Ghép lại
                    </button>
                  </div>
                </div>
              </div>
            `;
          } else if (isErrorCorrection) {
            interactiveHtml = `
              <div class="candidate-error-correction-grid">
                <div class="candidate-dual-box candidate-error-box">
                  <label class="form-label" style="font-size:0.8rem;font-weight:600;color:#b91c1c;">1. Lỗi sai trong câu (Error):</label>
                  <input type="text" class="form-control candidate-error-input" data-item-id="${item.itemVersionId}" placeholder="Từ/cụm từ sai..." />
                </div>
                <div class="candidate-dual-box candidate-correction-box">
                  <label class="form-label" style="font-size:0.8rem;font-weight:600;color:#15803d;">2. Sửa lại thành (Correction):</label>
                  <input type="text" class="form-control candidate-correction-input" data-item-id="${item.itemVersionId}" placeholder="Từ/cụm từ sửa đúng..." />
                </div>
              </div>
            `;
          } else if (isShortText) {
            interactiveHtml = `
              <div class="candidate-short-wrap">
                <input type="text" class="form-control candidate-short-input" placeholder="Gõ câu trả lời của bạn..." />
              </div>
            `;
          } else if (isVocabPair) {
            interactiveHtml = `
              <div class="candidate-vocab-pair-row">
                <div class="candidate-vocab-input-col">
                  <label class="candidate-field-label">1. Từ tiếng Anh nghe được (50% điểm):</label>
                  <input type="text" class="form-control candidate-vocab-text-input" placeholder="Nhập từ tiếng Anh nghe được..." />
                </div>
                <div class="candidate-vocab-select-col">
                  <label class="candidate-field-label">2. Nghĩa tiếng Việt tương ứng (50% điểm):</label>
                  <select class="form-select candidate-vocab-select">
                    <option value="">-- Chọn nghĩa tiếng Việt tương ứng --</option>
                    ${(item.options || []).map(opt => `
                      <option value="${opt.id}">${escapeHtml(opt.label || '')}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `;
          } else if (isRubricAsync) {
            interactiveHtml = `
              <div class="candidate-open-wrap">
                <textarea class="form-control candidate-open-textarea" rows="4" placeholder="Nhập bài luận hoặc câu trả lời tại đây..."></textarea>
                <div class="candidate-open-meta">
                  <span class="word-count-badge">Số từ: <strong>0</strong> từ</span>
                  <span class="scoring-info-badge">Điểm tối đa: ${item.maxScore || 4} điểm (Chấm AI)</span>
                </div>
              </div>
            `;
          }

          const promptDisplay = isPronunciation
            ? `${escapeHtml(item.prompt || `Chọn phiên âm / trọng âm đúng cho "${item.targetWord || 'từ'}"`)}`
            : (isSentenceRewrite
              ? `Hoàn thành câu thứ hai sao cho có nghĩa tương đương với câu gốc, sử dụng từ in hoa đã cho:<br/><blockquote class="transformation-prompt-quote">“${escapeHtml(item.prompt || '')}”</blockquote>`
              : (isSentenceReorder
                ? `Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:${item.prompt && item.prompt !== 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:' ? `<br/><blockquote class="reorder-prompt-quote">${escapeHtml(item.prompt)}</blockquote>` : ''}`
                : (isErrorCorrection
                  ? `Tìm lỗi sai trong câu sau và sửa lại cho đúng:<br/><blockquote class="correction-prompt-quote">“${escapeHtml(item.prompt || '')}”</blockquote>`
                  : (isReadingMatching
                    ? `Nối đoạn văn với tiêu đề phù hợp: <strong>${escapeHtml(item.prompt || 'Paragraph')}</strong>`
                    : (isListeningOrder
                      ? 'Nghe đoạn ghi âm và sắp xếp các sự kiện sau theo đúng thứ tự thời gian:'
                      : (isVocabPair
                        ? 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:'
                        : (isInlineCloze
                          ? 'Điền từ thích hợp vào chỗ trống trong đoạn văn hoặc bảng:'
                          : (isPictorial
                            ? 'Nhìn hình và hoàn thành từ vựng:'
                            : escapeHtml(item.prompt || '')))))))));

          return `
            <div class="candidate-question-card ${isPictorial ? 'card-pictorial' : ''}" data-item-id="${item.itemVersionId}">
              <div class="candidate-question-header">
                <span class="question-num-badge qnum">Câu ${item.position}</span>
                <span class="question-type-badge">${isPronunciation ? 'Phát âm' : (isSentenceRewrite ? 'Biến đổi câu' : (isSentenceReorder ? 'Sắp xếp câu' : (isErrorCorrection ? 'Tìm và sửa lỗi' : (isReadingMatching ? 'Ghép nối (Matching)' : (isListeningOrder ? 'Sắp xếp thứ tự' : (isSingleChoice ? 'Trắc nghiệm' : (isMultiGroup ? 'Chọn nhiều' : (isPictorial ? 'Từ vựng qua ảnh' : (isInlineCloze ? 'Điền từ nội tuyến' : (isShortText ? 'Điền từ' : (isVocabPair ? 'Cặp từ vựng' : 'Tự luận chấm AI')))))))))))}</span>
              </div>
              <div class="candidate-question-prompt">
                ${promptDisplay}
              </div>
              ${interactiveHtml}
            </div>
          `;
        };

        const exercisesHtml = exercises.map((ex, exIdx) => {
          const exItems = items.filter(it => it.exerciseId === ex.exerciseId || (!it.exerciseId && exIdx === 0));
          const exItemsList = exItems.length ? exItems : (exercises.length === 1 ? items : []);
          const exPoints = exItemsList.reduce((sum, it) => sum + (it.maxScore || 1), 0);
          const exAudioUrl = ex.audioUrl || (exercises.length === 1 ? audioUrl : '');
          const exReading = ex.readingPassage || (exercises.length === 1 ? reading : '');
          const exItemsHtml = exItemsList.map(renderSimQuestionCard).join('');

          const isSplitPane = exItemsList.some(it => it.pedagogicalTypeCode === 'reading_matching' || it.layoutType === 'split_pane_matching');

          if (isSplitPane && exReading) {
            return `
              <div class="exercise simulation-split-pane-exercise" data-exercise-id="${ex.exerciseId}">
                <div class="exercise-head sim-section-header">
                  <div>
                    <h3>${exercises.length > 1 ? `Exercise ${ex.exerciseNumber || (exIdx + 1)}: ` : ''}${escapeHtml(ex.title || `Bài tập ${ex.exerciseNumber || (exIdx + 1)}`)}</h3>
                    ${ex.instructions ? `<div class="sim-instructions"><p>${escapeHtml(ex.instructions)}</p></div>` : ''}
                  </div>
                  <span class="points">${exItemsList.length} ô trả lời · ${exPoints} điểm</span>
                </div>

                <div class="split-pane-mobile-toggle">
                  <button type="button" class="btn btn-sm btn-outline-primary active toggle-pane-btn" data-pane="reading" data-section="${bIdx}_${exIdx}">${renderSvgIcon('book', 'icon-inline')} Xem bài đọc</button>
                  <button type="button" class="btn btn-sm btn-outline-primary toggle-pane-btn" data-pane="questions" data-section="${bIdx}_${exIdx}">Xem câu hỏi ghép nối (${exItemsList.length})</button>
                </div>

                <div class="split-pane-reading" id="split-pane-${bIdx}_${exIdx}">
                  <div class="reading-passage-column active-pane" data-pane-type="reading">
                    <div class="reading-passage-sticky-header">
                      <span class="reading-title-badge">${renderSvgIcon('book', 'icon-inline')} Bài đọc hiểu (Reading Passage)</span>
                      <span class="reading-hint">Cuộn độc lập để tra cứu</span>
                    </div>
                    <div class="reading-passage-content">
                      ${escapeHtml(exReading).replace(/\n/g, '<br/>')}
                    </div>
                  </div>

                  <div class="matching-questions-column" data-pane-type="questions">
                    <div class="matching-column-header">
                      <span class="matching-title-badge">Danh sách câu hỏi ghép nối</span>
                    </div>
                    <div class="sim-questions-list matching-items-list">
                      ${exItemsHtml || '<div class="sim-empty-items">Chưa có câu hỏi trong bài tập này.</div>'}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }

          return `
            <div class="exercise" data-exercise-id="${ex.exerciseId}">
              <div class="exercise-head sim-section-header">
                <div>
                  <h3>${exercises.length > 1 ? `Exercise ${ex.exerciseNumber || (exIdx + 1)}: ` : ''}${escapeHtml(ex.title || `Bài tập ${ex.exerciseNumber || (exIdx + 1)}`)}</h3>
                  ${ex.instructions ? `<div class="sim-instructions"><p>${escapeHtml(ex.instructions)}</p></div>` : ''}
                </div>
                <span class="points">${exItemsList.length} ô trả lời · ${exPoints} điểm</span>
              </div>

              ${exAudioUrl ? `
                <div class="audio-dock sim-audio-dock">
                  <div class="audio-dock-controls">
                    <button type="button" class="btn btn-primary btn-sm btn-sim-audio-play">
                      ▶ Phát audio (nếu có)
                    </button>
                    <span class="audio-note">🔊 Đã mở khóa nội dung câu hỏi để kiểm tra đề.</span>
                  </div>
                  <audio controls src="${escapeHtml(exAudioUrl)}" class="sim-audio-player" style="display:none;"></audio>
                </div>
              ` : ''}

              ${exReading ? `
                <div class="sim-reading-dock">
                  <div class="reading-header">${renderSvgIcon('book', 'icon-inline')} Bài đọc hiểu:</div>
                  <div class="reading-content">${escapeHtml(exReading).replace(/\n/g, '<br/>')}</div>
                </div>
              ` : ''}

              <div class="sim-questions-list">
                ${exItemsHtml || '<div class="sim-empty-items">Chưa có câu hỏi trong bài tập này.</div>'}
              </div>
            </div>
          `;
        }).join('');

        return `
          <section class="simulation-section-card section-page ${bIdx === 0 ? 'active' : ''}" id="sim-block-${bIdx}">
            ${(b.instructions || audioUrl || reading) && exercises.length > 1 ? `
              <div class="sim-section-lead-head" style="margin-bottom:18px; padding:12px 16px; background:#f8fafc; border-left:4px solid #174266; border-radius:6px;">
                <h2 style="margin:0 0 6px 0; font-size:1.15rem; color:#174266;">Phần ${bIdx + 1}: ${escapeHtml(b.title || `Phần ${bIdx + 1}`)}</h2>
                ${b.instructions ? `<div class="sim-instructions"><p style="margin:0; color:#475569; font-size:0.9rem;">${escapeHtml(b.instructions)}</p></div>` : ''}
                ${audioUrl && !exercises.some(e => e.audioUrl) ? `
                  <div class="audio-dock sim-audio-dock" style="margin-top:10px;">
                    <div class="audio-dock-controls">
                      <button type="button" class="btn btn-primary btn-sm btn-sim-audio-play">▶ Phát audio phần thi</button>
                    </div>
                    <audio controls src="${escapeHtml(audioUrl)}" class="sim-audio-player" style="display:none;"></audio>
                  </div>
                ` : ''}
                ${reading && !exercises.some(e => e.readingPassage) ? `
                  <div class="sim-reading-dock" style="margin-top:10px;">
                    <div class="reading-header">${renderSvgIcon('book', 'icon-inline')} Bài đọc hiểu phần ${bIdx + 1}:</div>
                    <div class="reading-content">${escapeHtml(reading).replace(/\n/g, '<br/>')}</div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <div class="section-exercises-wrapper">
              ${exercisesHtml}
            </div>
          </section>
        `;
      }).join('');

      const totalItems = blocks.reduce((sum, b) => sum + (b.items || []).length, 0);

      modal.innerHTML = `
        <div class="candidate-simulation-shell candidate-simulation-dialog">
          <header class="topbar simulation-topbar simulation-top-header">
            <div class="topbar-inner">
              <div class="brand sim-title-area">
                <div class="brand-mark">IZ</div>
                <div class="brand-copy">
                  <div class="brand-title">IZONE · ${escapeHtml(draftState.title || 'Đề thi')}</div>
                  <div class="brand-sub">IZONE · CANDIDATE SIMULATION · Chế độ xem trước giáo viên</div>
                </div>
              </div>
              <div class="top-actions sim-meta-badges">
                <span class="preview-badge">Đang xem trước</span>
                <span class="meta-pill">${renderSvgIcon('clock', 'icon-inline')} ${draftState.durationMinutes} phút</span>
                <span class="meta-pill">${renderSvgIcon('book', 'icon-inline')} ${blocks.length} phần thi</span>
                <span class="meta-pill">${renderSvgIcon('lock', 'icon-inline')} v${draftState.version}</span>
                <button type="button" class="btn btn-secondary btn-sm" id="btn-close-simulation">${renderSvgIcon('close', 'icon-inline')} <span>Thoát xem trước</span></button>
              </div>
            </div>
          </header>

          <div class="section-nav-wrap">
            <nav class="section-nav simulation-nav-bar">
              ${blocks.map((b, i) => `
                <button type="button" class="section-tab simulation-nav-pill ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
                  <span>${escapeHtml(b.title || `Phần ${i + 1}`)}</span>
                  <span class="tab-count">${(b.exercises || []).length > 1 ? `${(b.exercises || []).length} bài tập · ` : ''}${(b.items || []).length} câu</span>
                </button>
              `).join('')}
            </nav>
          </div>

          <div class="exam-layout">
            <div class="main-column simulation-viewport">
              ${simulationBlocksHtml}
            </div>

            <aside class="side-panel">
              <div class="panel-card">
                <div class="progress-row">
                  <strong>Tiến độ làm bài</strong>
                  <span class="progress-ratio">0/${totalItems}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width: 0%;"></div>
                </div>
                <div class="section-list">
                  ${blocks.map((b, i) => `
                    <button type="button" class="side-section-btn ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
                      <span>${escapeHtml(b.title || `Phần ${i + 1}`)}</span>
                      <span class="side-count">0/${(b.items || []).length}</span>
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="panel-card">
                <strong>Lưu ý khi làm bài</strong>
                <p class="sim-notice-text">
                  Câu trả lời được lưu tự động. Chuyển phần không mất đáp án. Kiểm tra các ô chưa trả lời trước khi nộp bài.
                </p>
              </div>
            </aside>
          </div>

          <footer class="simulation-footer">
            <div class="footer-note">Đây là màn hình mô phỏng trực quan giao diện bài thi của thí sinh theo chuẩn IZONE. Mọi thao tác làm bài tại đây chỉ dùng để kiểm tra hiển thị.</div>
            <button type="button" class="btn btn-primary btn-sm" id="btn-close-simulation-footer">Hoàn tất kiểm tra</button>
          </footer>
        </div>
      `;

      modal.style.display = 'flex';

      const closeBtns = modal.querySelectorAll('#btn-close-simulation, #btn-close-simulation-footer');
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      });

      const allNavBtns = modal.querySelectorAll('.section-tab, .simulation-nav-pill, .side-section-btn');
      allNavBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-section-target');
          modal.querySelectorAll('.section-tab, .simulation-nav-pill').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-section-target') === targetId);
          });
          modal.querySelectorAll('.side-section-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-section-target') === targetId);
          });
          modal.querySelectorAll('.section-page, .simulation-section-card').forEach(sec => {
            sec.classList.toggle('active', sec.id === targetId);
          });
          const targetEl = modal.querySelector(`#${targetId}`);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

      const audioPlayBtns = modal.querySelectorAll('.btn-sim-audio-play');
      audioPlayBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const audioEl = btn.closest('.audio-dock')?.querySelector('audio');
          if (audioEl) {
            if (audioEl.paused) {
              audioEl.play().catch(() => {});
              btn.textContent = '⏸ Tạm dừng audio';
            } else {
              audioEl.pause();
              btn.textContent = '▶ Phát audio (nếu có)';
            }
          }
        });
      });

      const openTextareas = modal.querySelectorAll('.candidate-open-textarea');
      openTextareas.forEach(ta => {
        ta.addEventListener('input', () => {
          const text = ta.value.trim();
          const count = text ? text.split(/\s+/).filter(Boolean).length : 0;
          const countEl = ta.closest('.candidate-open-wrap')?.querySelector('.word-count-badge strong');
          if (countEl) countEl.textContent = count;
        });
      });

      // Mobile Split-Pane switcher handling
      const toggleBtns = modal.querySelectorAll('.toggle-pane-btn');
      toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const secIdx = btn.getAttribute('data-section');
          const targetPane = btn.getAttribute('data-pane');
          const containerSection = modal.querySelector(`#sim-block-${secIdx}`);
          if (!containerSection) return;

          containerSection.querySelectorAll('.toggle-pane-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const readingCol = containerSection.querySelector('.reading-passage-column');
          const questionsCol = containerSection.querySelector('.matching-questions-column');

          if (targetPane === 'reading') {
            readingCol?.classList.add('active-pane');
            questionsCol?.classList.remove('active-pane');
          } else {
            readingCol?.classList.remove('active-pane');
            questionsCol?.classList.add('active-pane');
          }
        });
      });

      // Sentence Reorder token assembling interactions
      const tokenChips = modal.querySelectorAll('.btn-token-chip');
      tokenChips.forEach(chip => {
        chip.addEventListener('click', () => {
          if (chip.classList.contains('is-used')) return;
          const wrap = chip.closest('.candidate-sentence-reorder-wrap');
          const input = wrap?.querySelector('.candidate-reorder-input');
          const token = chip.getAttribute('data-token');
          if (input && token) {
            const current = input.value.trim();
            input.value = current ? `${current} ${token}` : token;
            chip.classList.add('is-used');
          }
        });
      });

      const clearAssemblyBtns = modal.querySelectorAll('.btn-clear-assembly');
      clearAssemblyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const wrap = btn.closest('.candidate-sentence-reorder-wrap');
          const input = wrap?.querySelector('.candidate-reorder-input');
          if (input) input.value = '';
          wrap?.querySelectorAll('.btn-token-chip').forEach(c => c.classList.remove('is-used'));
        });
      });
    }

    // Smart Publishing Modal
    function openPublishingModal() {
      syncInputs();
      let modal = document.querySelector('#smart-publishing-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'smart-publishing-modal';
        modal.className = 'publishing-modal-overlay';
        document.body.appendChild(modal);
      }

      const availableClasses = options.classes || [];

      const classesListHtml = availableClasses.length > 0 ? availableClasses.map((cls) => `
        <label class="class-picker-row">
          <input type="checkbox" class="cb-publish-class" value="${cls.classId || cls.id}" checked />
          <span class="class-picker-name">${escapeHtml(cls.name || cls.className || `Lớp ${cls.classId}`)}</span>
          <span class="class-picker-code">${cls.courseCode ? `(${cls.courseCode})` : ''}</span>
        </label>
      `).join('') : `
        <div class="empty-classes-notice">Không tìm thấy danh sách lớp cụ thể. Bạn có thể sử dụng chế độ "Toàn bộ khối".</div>
      `;

      modal.innerHTML = `
        <div class="publishing-dialog">
          <header class="publishing-header">
            <div class="publishing-title-area">
              <span class="publish-badge">Smart Publishing Engine</span>
              <h3>Công bố đề thi — v${draftState.version}</h3>
              <p class="publish-test-title">${escapeHtml(draftState.title || '')}</p>
            </div>
            <button type="button" class="btn-close-publish-modal" id="btn-close-publish-modal">✕</button>
          </header>

          <div class="publishing-body">
            <div class="alert-notice alert-immutable">
              <div class="notice-icon">🛡️</div>
              <div class="notice-text">
                <strong>Cơ chế Roster Freezing (Bảo toàn kết quả):</strong>
                Hệ thống sẽ tự động quét trạng thái bài làm của từng lớp. Bất kỳ lớp nào đã có ít nhất 1 bài nộp (submission_count > 0) sẽ được <strong>BẢO VỆ và ĐÓNG BĂNG</strong>, giữ nguyên phiên bản đề cũ để bảo toàn dữ liệu điểm số.
              </div>
            </div>

            <div class="form-group publish-scope-group">
              <label class="scope-main-label">Phạm vi công bố đề thi:</label>
              <div class="scope-options">
                <label class="scope-radio-card">
                  <input type="radio" name="publish_scope" value="whole_course" checked id="radio-scope-whole" />
                  <div class="radio-card-content">
                    <div class="card-title">🌐 Toàn bộ khối (Mặc định)</div>
                    <div class="card-desc">Cập nhật đề thi chuẩn cho Danh mục bài test của khối và tự động áp dụng cho tất cả các lớp chưa có học sinh nộp bài.</div>
                  </div>
                </label>

                <label class="scope-radio-card">
                  <input type="radio" name="publish_scope" value="specific_classes" id="radio-scope-classes" />
                  <div class="radio-card-content">
                    <div class="card-title">🏫 Chỉ áp dụng cho các lớp được chọn</div>
                    <div class="card-desc">Chỉ cập nhật đề thi cho các lớp được chỉ định dưới đây (bỏ qua nếu lớp đã thi).</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="specific-classes-container" id="specific-classes-container" style="display: none;">
              <div class="classes-container-header">
                <span>Chọn danh sách lớp:</span>
                <div class="classes-actions">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all-classes">Chọn tất cả</button>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-deselect-all-classes">Bỏ chọn</button>
                </div>
              </div>
              <div class="classes-checkbox-grid">
                ${classesListHtml}
              </div>
            </div>

            <div class="publishing-error-msg" id="publishing-error-msg" style="display:none; color:#dc2626; font-size:13px; margin-top:8px;"></div>
          </div>

          <footer class="publishing-footer">
            <button type="button" class="btn btn-secondary" id="btn-cancel-publish">Hủy</button>
            <button type="button" class="btn btn-success" id="btn-confirm-publish">🚀 Tiến hành công bố</button>
          </footer>
        </div>
      `;

      modal.style.display = 'flex';

      const radioWhole = modal.querySelector('#radio-scope-whole');
      const radioClasses = modal.querySelector('#radio-scope-classes');
      const classesContainer = modal.querySelector('#specific-classes-container');

      radioWhole?.addEventListener('change', () => {
        if (classesContainer) classesContainer.style.display = 'none';
      });
      radioClasses?.addEventListener('change', () => {
        if (classesContainer) classesContainer.style.display = 'block';
      });

      const selectAllBtn = modal.querySelector('#btn-select-all-classes');
      const deselectAllBtn = modal.querySelector('#btn-deselect-all-classes');
      selectAllBtn?.addEventListener('click', () => {
        modal.querySelectorAll('.cb-publish-class').forEach(cb => { cb.checked = true; });
      });
      deselectAllBtn?.addEventListener('click', () => {
        modal.querySelectorAll('.cb-publish-class').forEach(cb => { cb.checked = false; });
      });

      const closeBtn = modal.querySelector('#btn-close-publish-modal');
      const cancelBtn = modal.querySelector('#btn-cancel-publish');
      [closeBtn, cancelBtn].forEach(b => {
        b?.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      });

      const confirmBtn = modal.querySelector('#btn-confirm-publish');
      const errorMsgEl = modal.querySelector('#publishing-error-msg');

      confirmBtn?.addEventListener('click', async () => {
        const scope = radioClasses?.checked ? 'specific_classes' : 'whole_course';
        let selectedClassIds = [];
        if (scope === 'specific_classes') {
          const checked = modal.querySelectorAll('.cb-publish-class:checked');
          selectedClassIds = Array.from(checked).map(cb => cb.value);
          if (selectedClassIds.length === 0) {
            if (errorMsgEl) {
              errorMsgEl.textContent = 'Vui lòng chọn ít nhất 1 lớp để công bố đề thi.';
              errorMsgEl.style.display = 'block';
            }
            return;
          }
        }

        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳ Đang công bố...';
        if (errorMsgEl) errorMsgEl.style.display = 'none';

        try {
          const publishPayload = {
            formVersionId: draftState.formVersionId,
            courseId: options.courseId || 34,
            scope,
            classIds: selectedClassIds
          };

          let result;
          if (typeof options.onPublish === 'function') {
            result = await options.onPublish(publishPayload);
          } else {
            const res = await fetch(formPublishPath(options.apiBase), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {})
              },
              body: JSON.stringify(publishPayload)
            });
            result = await res.json();
          }

          if (!result || !result.ok) {
            throw new Error(result?.message || 'Không thể công bố đề thi');
          }

          draftState.status = 'published';
          modal.style.display = 'none';
          render();
          openPublishReportDialog(result);
        } catch (err) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = '🚀 Tiến hành công bố';
          if (errorMsgEl) {
            errorMsgEl.textContent = 'Lỗi công bố: ' + (err.message || 'Lỗi mạng');
            errorMsgEl.style.display = 'block';
          }
        }
      });
    }

    // Execution Report Dialog
    function openPublishReportDialog(result = {}) {
      let modal = document.querySelector('#publish-report-dialog');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'publish-report-dialog';
        modal.className = 'publish-report-overlay';
        document.body.appendChild(modal);
      }

      const updated = result.updatedClasses || [];
      const skipped = result.skippedClasses || [];

      const updatedListHtml = updated.length > 0 ? `
        <div class="report-section-block success-block">
          <h4 class="report-block-title">✅ Các lớp đã cập nhật đề thi mới (${updated.length} lớp):</h4>
          <ul class="report-classes-list">
            ${updated.map(c => `
              <li class="report-class-item updated-item">
                <span class="class-name"><strong>${escapeHtml(c.className || `Lớp ${c.classId}`)}</strong></span>
                <span class="badge-status-pill success">Đã cập nhật</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : `
        <div class="report-section-block">
          <p class="empty-note">Không có lớp nào cần cập nhật đề thi.</p>
        </div>
      `;

      const skippedListHtml = skipped.length > 0 ? `
        <div class="report-section-block warning-block">
          <h4 class="report-block-title">🔒 Các lớp được bảo vệ & đóng băng (${skipped.length} lớp):</h4>
          <p class="skipped-help">Các lớp dưới đây đã có học sinh làm bài thi nên được bảo toàn nguyên vẹn đề gốc.</p>
          <ul class="report-classes-list">
            ${skipped.map(c => `
              <li class="report-class-item frozen-item">
                <span class="class-name"><strong>${escapeHtml(c.className || `Lớp ${c.classId}`)}</strong></span>
                <span class="badge-status-pill warning">Đóng băng (${c.submissionCount} bài nộp)</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : '';

      modal.innerHTML = `
        <div class="publish-report-dialog">
          <header class="report-header">
            <div class="report-title-area">
              <span class="report-badge">Smart Publishing Report</span>
              <h3>Báo cáo kết quả công bố đề thi</h3>
            </div>
            <button type="button" class="btn-close-report" id="btn-close-report-x">✕</button>
          </header>

          <div class="report-body">
            <div class="report-summary-cards">
              <div class="report-stat-card stat-success">
                <div class="stat-number">${result.updatedCount ?? updated.length}</div>
                <div class="stat-label">Lớp đã cập nhật đề mới</div>
              </div>
              <div class="report-stat-card stat-warning">
                <div class="stat-number">${result.skippedCount ?? skipped.length}</div>
                <div class="stat-label">Lớp đóng băng (đã thi)</div>
              </div>
              <div class="report-stat-card stat-info">
                <div class="stat-icon">${result.catalogUpdated ? '✅' : '—'}</div>
                <div class="stat-label">${result.catalogUpdated ? 'Đã cập nhật Catalog khối' : 'Không cập nhật Catalog'}</div>
              </div>
            </div>

            <div class="report-details-container">
              ${updatedListHtml}
              ${skippedListHtml}
            </div>
          </div>

          <footer class="report-footer">
            <button type="button" class="btn btn-primary" id="btn-close-report">Hoàn tất & Đóng</button>
          </footer>
        </div>
      `;

      modal.style.display = 'flex';

      const closeBtns = modal.querySelectorAll('#btn-close-report-x, #btn-close-report');
      closeBtns.forEach(b => {
        b.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      });
    }

    const previewBtn = container.querySelector('#btn-preview-test');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        openCandidateSimulationModal();
      });
    }

    const publishBtn = container.querySelector('#btn-publish-test');
    if (publishBtn) {
      publishBtn.addEventListener('click', () => {
        openPublishingModal();
      });
    }

    const deleteDraftBtn = container.querySelector('#btn-delete-draft-workspace');
    if (deleteDraftBtn) {
      deleteDraftBtn.addEventListener('click', () => {
        const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm('Bạn có chắc chắn muốn xóa bản nháp này không? Thao tác này không thể hoàn tác.')
          : true;
        if (confirmed && typeof options.onDeleteDraft === 'function') {
          options.onDeleteDraft({
            formVersionId: draftState.formVersionId,
            testKey: formVersionData.testKey || ''
          });
        }
      });
    }
  }

  render();
}


export function formatPublicationStatus(publication) {
  if (!publication || !publication.published) return 'Chưa công bố';
  return 'Đã công bố';
}

export function validateManualGradingScores(items, scores) {
  for (const item of items) {
    if (item.canGrade) {
      const val = scores[item.itemVersionId];
      if (item.needsReview && (val === undefined || val === null || val === '')) {
        return { valid: false, message: 'Còn câu cần duyệt chưa được chấm.' };
      }
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0 || num > item.maxScore) {
          return { valid: false, message: `Điểm câu ${item.position} không hợp lệ (0 - ${item.maxScore}).` };
        }
      }
    }
  }
  return { valid: true, message: '' };
}

export function formatDashboardScore(score) {
  if (!score) return '—';
  if (score.status === 'pending') return 'Chờ chấm';
  const value = `${score.earned}/${score.maximum}`;
  return score.status === 'provisional' ? `${value} · Tạm tính` : value;
}

export function resultStatusLabel(status) {
  return ({
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    retake_granted: 'Được phép làm lại',
    retaking: 'Đang làm lại',
    retake_expired: 'Quyền làm lại đã hết hạn',
    grading: 'Đang chấm',
    review_required: 'Cần duyệt',
    complete: 'Hoàn tất'
  })[status] || status;
}

export function attemptStatusLabel(status) {
  return ({
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    active: 'Đang làm',
    submitted: 'Đã nộp',
    superseded: 'Bị thay thế',
    expired: 'Hết hạn'
  })[status] || status;
}

export function verdictLabel(verdict) {
  return ({
    correct: 'Đúng',
    incorrect: 'Sai',
    partial: 'Đúng một phần',
    pending: 'Chờ chấm',
    manual_review: 'Cần duyệt',
    ungraded: 'Chưa chấm',
    not_submitted: 'Chưa nộp'
  })[verdict] || verdict;
}

export function formatAssignmentWindow(opensAt, closesAt, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  if (!opensAt && !closesAt) return 'Không giới hạn thời gian';
  const format = value => value ? new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone
  }).format(new Date(value)) : 'Không giới hạn';
  return `${format(opensAt)} → ${format(closesAt)} (${timeZone})`;
}

export function formatCurrentTime(date = new Date(), locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone
  }).format(date);
}

export function incidentTypeLabel(type) {
  return ({ left_exam: 'Rời khỏi bài thi', device_switch: 'Đổi thiết bị' })[type] || type || 'Sự cố';
}

export function formatIncidentDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [hours && `${hours} giờ`, minutes && `${minutes} phút`, remainder && `${remainder} giây`]
    .filter(Boolean).join(' ') || '0 giây';
}

export function formatIncidentTimeline(incidents = []) {
  const timestamp = value => value ? new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value)) : '—';
  return incidents.map(incident => ({
    incidentId: incident.incidentId,
    typeLabel: incidentTypeLabel(incident.type),
    startedAt: timestamp(incident.startedAt),
    endedAt: incident.endedAt ? timestamp(incident.endedAt) : 'Đang diễn ra',
    duration: formatIncidentDuration(incident.durationSeconds)
  }));
}

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
    if (prefix.includes('vocab')) return 'vocabulary';
    if (prefix.includes('listen')) return 'listening';
    if (prefix.includes('pronun')) return 'pronunciation';
    if (prefix.includes('read')) return 'reading';
    if (prefix.includes('writ') || prefix.includes('dịch') || prefix.includes('translat')) return 'writing';
    if (prefix.includes('speak')) return 'speaking';
    if (prefix.includes('gramm')) return 'grammar';
  }
  if (!code || typeof code !== 'string') return 'general';
  const clean = code.trim().toLowerCase();
  if (clean.includes('vocab')) return 'vocabulary';
  if (clean.includes('listen')) return 'listening';
  if (clean.includes('pronun')) return 'pronunciation';
  if (clean.includes('read')) return 'reading';
  if (clean.includes('writ') || clean.includes('translat')) return 'writing';
  if (clean.includes('speak')) return 'speaking';
  if (clean.includes('gramm')) return 'grammar';
  return clean;
}

export function extractAttemptSkills(items = []) {
  const skillMap = new Map();
  const sectionMap = new Map();
  let totalScoreEarned = 0;
  let totalMaxScore = 0;
  let totalNeedsReview = 0;

  for (const item of items) {
    const rawCode = item.primarySkill || '';
    const code = normalizeSkillCode(rawCode, item.sectionTitle || item.sectionId) || 'general';
    const scoreEarned = Number(item.scoreEarned) || 0;
    const maxScore = Number(item.maxScore) || 0;
    const needsReview = Boolean(item.needsReview);

    totalScoreEarned += scoreEarned;
    totalMaxScore += maxScore;
    if (needsReview) totalNeedsReview += 1;

    if (!skillMap.has(code)) {
      skillMap.set(code, {
        code,
        label: CANONICAL_SKILL_LABELS[code] || (code.charAt(0).toUpperCase() + code.slice(1)),
        totalItems: 0,
        needsReviewCount: 0,
        scoreEarned: 0,
        maxScore: 0
      });
    }
    const skillStat = skillMap.get(code);
    skillStat.totalItems += 1;
    skillStat.scoreEarned += scoreEarned;
    skillStat.maxScore += maxScore;
    if (needsReview) skillStat.needsReviewCount += 1;

    // Track Section
    const secId = item.sectionId || item.sectionTitle || `sec-${code}`;
    const secTitle = item.sectionTitle || (CANONICAL_SKILL_LABELS[code] ? `Phần ${CANONICAL_SKILL_LABELS[code]}` : 'Phần bài tập');
    if (!sectionMap.has(secId)) {
      sectionMap.set(secId, {
        id: secId,
        title: secTitle,
        skillCode: code,
        totalItems: 0,
        correctCount: 0,
        needsReviewCount: 0,
        scoreEarned: 0,
        maxScore: 0,
        items: []
      });
    }
    const secStat = sectionMap.get(secId);
    secStat.totalItems += 1;
    if (item.verdict === 'correct') secStat.correctCount += 1;
    if (needsReview) secStat.needsReviewCount += 1;
    secStat.scoreEarned = Math.round((secStat.scoreEarned + scoreEarned) * 100) / 100;
    secStat.maxScore = Math.round((secStat.maxScore + maxScore) * 100) / 100;
    secStat.items.push(item);
  }

  const skills = Array.from(skillMap.values());
  const sections = Array.from(sectionMap.values());
  const summary = {
    all: {
      code: 'all',
      label: 'Tất cả kỹ năng',
      totalItems: items.length,
      needsReviewCount: totalNeedsReview,
      scoreEarned: Math.round(totalScoreEarned * 100) / 100,
      maxScore: Math.round(totalMaxScore * 100) / 100
    }
  };

  for (const skill of skills) {
    summary[skill.code] = {
      ...skill,
      scoreEarned: Math.round(skill.scoreEarned * 100) / 100,
      maxScore: Math.round(skill.maxScore * 100) / 100
    };
  }

  return { skills, summary, sections };
}

export function formatCompactPrompt(item) {
  const options = Array.isArray(item.options) ? item.options : [];
  const optionsCount = options.length;
  const isExtensive = optionsCount > 4 || item.interactionType === 'text_select_pair';
  return {
    text: item.prompt || `Câu hỏi số ${item.position}`,
    optionsCount,
    hasExtensiveOptions: isExtensive
  };
}

export function resolveStudentAnswerDisplay(item) {
  if (item.studentAnswer === null || item.studentAnswer === undefined || item.studentAnswer === '') {
    return '(Chưa trả lời)';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(item.studentAnswer)) {
    return item.studentAnswer.map(ans => optMap.get(String(ans)) || String(ans)).join(', ');
  }

  const raw = String(item.studentAnswer);
  if (optMap.has(raw)) {
    return `${optMap.get(raw)} (${raw})`;
  }
  return raw;
}

export function resolveExpectedAnswerDisplay(item) {
  if (item.expectedAnswer === null || item.expectedAnswer === undefined || item.expectedAnswer === '') {
    return item.graderType === 'rubric_async' ? '(Chấm theo rubric)' : '—';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(item.expectedAnswer)) {
    return item.expectedAnswer.map(ans => optMap.get(String(ans)) || String(ans)).join(', ');
  }

  const raw = String(item.expectedAnswer);
  if (optMap.has(raw)) {
    return `${optMap.get(raw)} (${raw})`;
  }
  return raw;
}

export function getScoreTier(earned, maximum) {
  if (earned === null || earned === undefined || maximum === null || maximum === undefined || Number(maximum) <= 0) {
    return null;
  }
  const ratio = (Number(earned) / Number(maximum)) * 100;
  if (ratio >= 60) {
    return 'tier-yellow';
  }
  if (ratio >= 45) {
    return 'tier-red';
  }
  return 'tier-gray';
}

export function computeClassSkillSummary(payload) {
  const students = Array.isArray(payload?.students) ? payload.students : [];
  const skills = Array.isArray(payload?.skills) ? payload.skills : [];

  const totalStudents = students.length;
  const submittedStudents = students.filter(s => s.status !== 'not_started' && s.attemptId);
  const submittedCount = submittedStudents.length;

  const studentsWithTotal = students.filter(s => s.total && typeof s.total.earned === 'number' && Number(s.total.maximum) > 0);
  let totalAverage = null;
  if (studentsWithTotal.length > 0) {
    const sumEarned = studentsWithTotal.reduce((acc, s) => acc + Number(s.total.earned), 0);
    const avgEarned = Math.round((sumEarned / studentsWithTotal.length) * 10) / 10;
    const maxScore = Number(studentsWithTotal[0].total.maximum) || 100;
    totalAverage = {
      earned: avgEarned,
      maximum: maxScore,
      tier: getScoreTier(avgEarned, maxScore),
      studentCount: studentsWithTotal.length
    };
  }

  const skillSummaries = skills.map(skill => {
    const normCode = normalizeSkillCode(skill.code);
    const label = (CANONICAL_SKILL_LABELS[normCode] || CANONICAL_SKILL_LABELS[skill.code] || skill.code).toUpperCase();
    const withSkill = students.filter(s => s.skills?.[skill.code] && typeof s.skills[skill.code].earned === 'number' && Number(s.skills[skill.code].maximum) > 0);
    if (withSkill.length === 0) {
      return {
        code: skill.code,
        label,
        earned: null,
        maximum: skill.maximum,
        tier: null,
        studentCount: 0
      };
    }
    const sumEarned = withSkill.reduce((acc, s) => acc + Number(s.skills[skill.code].earned), 0);
    const avgEarned = Math.round((sumEarned / withSkill.length) * 10) / 10;
    const maxScore = Number(withSkill[0].skills[skill.code].maximum) || skill.maximum;
    return {
      code: skill.code,
      label,
      earned: avgEarned,
      maximum: maxScore,
      tier: getScoreTier(avgEarned, maxScore),
      studentCount: withSkill.length
    };
  });

  return {
    totalStudents,
    submittedCount,
    totalAverage,
    skills: skillSummaries
  };
}

export function formatCompactScore(score) {
  if (!score) return '—';
  if (score.status === 'pending') return 'Chờ chấm';
  if (score.earned === null || score.earned === undefined) return '—';
  const val = Number(score.earned);
  const formatted = Number.isInteger(val) ? String(val) : String(Math.round(val * 100) / 100);
  return score.status === 'provisional' ? `${formatted} (Tạm tính)` : formatted;
}

export function formatSubmissionTimestamp(dateStr, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone });
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone });
  return {
    time: timeFormatter.format(d),
    date: dateFormatter.format(d)
  };
}

export const AVATAR_PALETTES = [
  { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }, // Red / Crimson
  { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }, // Amber
  { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' }, // Green
  { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }, // Blue / Sky
  { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' }, // Purple
  { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' }, // Pink
  { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' }, // Teal
  { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' }  // Orange
];

export function getStudentInitials(name) {
  if (!name || typeof name !== 'string') return 'HV';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'HV';
  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  }
  const first = Array.from(words[0])[0] || '';
  const second = Array.from(words[1])[0] || '';
  return (first + second).toUpperCase();
}

export function getAvatarColor(nameOrId) {
  const str = String(nameOrId || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderAssignmentChipsView(container, {
  assignmentsList = [],
  selectedAssignmentId = '',
  isSwitching = false,
  onSelect = () => {},
  onToggleSwitch = () => {}
} = {}) {
  if (!container) return;
  container.replaceChildren();
  if (!assignmentsList || assignmentsList.length === 0) return;

  const selectedAssignment = assignmentsList.find(a => a.assignmentId === selectedAssignmentId);

  // Mode 1: An assignment is selected and NOT in expanded switching mode:
  // Render ONLY 1 card representing the active test, plus compact switcher button
  if (selectedAssignment && !isSwitching) {
    const focusContainer = document.createElement('div');
    focusContainer.className = 'assignment-focus-container';

    const chip = document.createElement('div');
    chip.className = 'assignment-chip selected assignment-active-focus';
    chip.dataset.assignmentId = selectedAssignment.assignmentId;
    chip.setAttribute('role', 'status');
    chip.setAttribute('aria-label', `Bài test đang chọn: ${selectedAssignment.title}`);

    const phaseLabel = extractPhase(selectedAssignment.phase, selectedAssignment.title);
    chip.innerHTML = `
      <div class="chip-header">
        <span class="active-badge">${renderSvgIcon('check', 'icon-inline')} Đang chọn</span>
        <span class="chip-meta">${escapeHtml(phaseLabel ? `${phaseLabel} · ${selectedAssignment.status}` : selectedAssignment.status)}</span>
      </div>
      <span class="chip-title">${escapeHtml(selectedAssignment.title)}</span>
    `;

    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.id = 'switch-assignment-btn';
    switchBtn.className = 'btn-switch-assignment';
    switchBtn.innerHTML = `
      ${renderSvgIcon('rotate', 'icon-inline')}
      <span>Đổi bài test (${assignmentsList.length} bài)</span>
    `;
    switchBtn.title = 'Xem và chọn bài kiểm tra khác trong lớp';
    switchBtn.addEventListener('click', () => {
      onToggleSwitch(true);
    });

    focusContainer.append(chip, switchBtn);
    container.append(focusContainer);
    return;
  }

  // Mode 2: Expanded switching mode (user clicked "Đổi bài test")
  if (selectedAssignment && isSwitching) {
    const switcherHeader = document.createElement('div');
    switcherHeader.className = 'assignment-switcher-header';
    switcherHeader.innerHTML = `
      <span class="switcher-title">${renderSvgIcon('book', 'icon-inline')} <span>Chọn bài test (${assignmentsList.length} bài)</span></span>
    `;
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close-switcher';
    closeBtn.id = 'close-switcher-btn';
    closeBtn.innerHTML = `
      ${renderSvgIcon('close', 'icon-inline')}
      <span>Đóng</span>
    `;
    closeBtn.addEventListener('click', () => {
      onToggleSwitch(false);
    });
    switcherHeader.append(closeBtn);
    container.append(switcherHeader);
  }

  // Mode 3: Render all cards (either no assignment selected, or expanded switching mode)
  const chipsList = document.createElement('div');
  chipsList.className = 'assignment-chips-list';

  for (const assignment of assignmentsList) {
    const isSelected = assignment.assignmentId === selectedAssignmentId;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `assignment-chip${isSelected ? ' selected' : ''}`;
    chip.dataset.assignmentId = assignment.assignmentId;

    const phaseLabel = extractPhase(assignment.phase, assignment.title);
    chip.innerHTML = `
      <span class="chip-title">${escapeHtml(assignment.title)}</span>
      <span class="chip-meta">${escapeHtml(phaseLabel ? `${phaseLabel} · ${assignment.status}` : assignment.status)}</span>
    `;
    chip.addEventListener('click', () => {
      onSelect(assignment.assignmentId);
    });
    chipsList.append(chip);
  }
  container.append(chipsList);
}

async function startDashboard() {
  const form = document.querySelector('#identity-form');
  const classFilterToolbar = document.querySelector('#class-filter-toolbar');
  const adminCourseFilters = document.querySelector('#admin-course-filters');
  const leadScopeFilters = document.querySelector('#lead-scope-filters');
  const classSearchInput = document.querySelector('#class-search-input');
  const classStatusFilter = document.querySelector('#class-status-filter');
  const classCountBadge = document.querySelector('#class-count-badge');
  const classSelect = document.querySelector('#class-select');
  const assignmentSelect = document.querySelector('#assignment-select');
  const selectedAssignmentCard = document.querySelector('#selected-assignment-card');
  const showcaseBadgeClass = document.querySelector('#showcase-badge-class');
  const showcaseTitle = document.querySelector('#showcase-title');
  const showcaseBlockBadge = document.querySelector('#showcase-block-badge');
  const showcasePhaseBadge = document.querySelector('#showcase-phase-badge');
  const showcaseStatusBadge = document.querySelector('#showcase-status-badge');
  const examModeToggle = document.querySelector('#exam-mode-toggle');
  const examModeStatusPill = document.querySelector('#exam-mode-status-pill');
  const examRoomOpenButton = document.querySelector('#exam-room-open');
  const examRoom = document.querySelector('#exam-room');
  const examRoomSummary = document.querySelector('#exam-room-summary');
  const examRoomMessage = document.querySelector('#exam-room-message');
  const examRoomStudents = document.querySelector('#exam-room-students');
  const examRoomStartButton = document.querySelector('#exam-room-start');
  const examRoomExtendButton = document.querySelector('#exam-room-extend');
  const examRoomExtensionMinutes = document.querySelector('#exam-room-extension-minutes');
  const examRoomRefreshButton = document.querySelector('#exam-room-refresh');
  const examRoomCloseButton = document.querySelector('#exam-room-close');
  const showcaseWindowText = document.querySelector('#showcase-window-text');
  const showcaseLinkBar = document.querySelector('#showcase-link-bar');
  const showcaseStudentUrl = document.querySelector('#showcase-student-url');
  const copyShowcaseLinkBtn = document.querySelector('#copy-showcase-link-btn');
  const openShowcaseLinkBtn = document.querySelector('#open-showcase-link-btn');
  const assignments = document.querySelector('#assignment-chips') || document.querySelector('#assignments');
  const results = document.querySelector('#results');
  const resultsContent = document.querySelector('#results-content');
  const assignmentHeading = document.querySelector('#assignment-heading');
  const assignmentMeta = document.querySelector('#assignment-meta');
  const status = document.querySelector('#status');
  const lastUpdated = document.querySelector('#last-updated');
  const refreshBtn = document.querySelector('#refresh-btn');
  const publishAllBtn = document.querySelector('#publish-all-btn');
  const classSkillSummary = document.querySelector('#class-skill-summary');
  const viewDashboard = document.querySelector('#view-dashboard');
  const viewGrading = document.querySelector('#view-grading');
  const viewExams = document.querySelector('#view-exams');
  const viewReports = document.querySelector('#view-reports');
  const navItems = Array.from(document.querySelectorAll('.navbar-menu .nav-item'));
  const goToGradingBtn = document.querySelector('#go-to-grading-btn');
  const gradingEmptyPlaceholder = document.querySelector('#grading-empty-placeholder');
  const gradingBackToDashboardBtn = document.querySelector('#grading-back-to-dashboard-btn');
  let currentResultsPayload = null;
  let currentAssignmentsList = [];
  let isSwitchingAssignment = false;
  let currentSelectedAssignment = null;
  let examRoomReturnToResults = false;

  function updateDashboardTab(tabId) {
    const activeTab = switchDashboardTab(tabId, {
      views: {
        dashboard: viewDashboard,
        grading: viewGrading,
        exams: viewExams,
        reports: viewReports
      },
      navItems,
      onTabChange: (newTab) => {
        if (newTab === 'grading') {
          if (state.assignmentId && state.classId) {
            if (results) results.hidden = false;
            if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = true;
          } else {
            if (results) results.hidden = true;
            if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = false;
          }
        }
        if (newTab === 'test-studio' || newTab === 'exams') {
          loadAndRenderTestStudio();
        }
      }
    });
    return activeTab;
  }

  let currentStudioCourseId = 1;
  async function loadAndRenderTestStudio(targetCourseId = currentStudioCourseId) {
    currentStudioCourseId = Number(targetCourseId || 1);
    const container = document.querySelector('#test-studio-container') || viewExams;
    if (!container) return;

    if (!currentTeacher && sessionToken) {
      container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang kiểm tra quyền hạn...</p></div>';
      return;
    }

    const teacherRole = currentTeacher ? currentTeacher.role : 'teacher';
    if (teacherRole !== 'lead' && teacherRole !== 'admin') {
      renderCourseTestCatalogView(container, [], { teacherRole, courseId: currentStudioCourseId });
      return;
    }

    try {
      container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải danh mục bài thi...</p></div>';
      const endpoint = courseTestCatalogPath(currentStudioCourseId);
      const res = await request(endpoint);
      const catalog = res.catalog || [];
      const handleDeleteDraft = async ({ formVersionId }) => {
        if (!formVersionId) return;
        try {
          container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang xóa bản nháp...</p></div>';
          const delRes = await request(formDraftPath(formVersionId), {
            method: 'DELETE'
          });
          if (delRes && delRes.success) {
            alert('Đã xóa bản nháp bài thi thành công.');
          }
          await loadAndRenderTestStudio(currentStudioCourseId);
        } catch (err) {
          alert('Lỗi xóa bản nháp: ' + (err.message || 'Lỗi kết nối'));
          await loadAndRenderTestStudio(currentStudioCourseId);
        }
      };

      renderCourseTestCatalogView(container, catalog, {
        teacherRole,
        courseId: currentStudioCourseId,
        onCourseChange: (newCid) => {
          loadAndRenderTestStudio(newCid);
        },
        onDeleteDraft: handleDeleteDraft,
        onAddTest: async () => {
          try {
            const courseNames = { 1: '03', 2: '34', 3: '45' };
            const courseCode = courseNames[currentStudioCourseId] || '03';
            const defaultTitle = `IZONE · Khối ${courseCode} · Đề thi mới`;
            container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang khởi tạo bản nháp bài thi mới...</p></div>';

            const postRes = await request(formDraftPath(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId: currentStudioCourseId,
                sessionNumber: 1,
                title: defaultTitle,
                durationMinutes: 60
              })
            });

            if (!postRes || !postRes.formVersionId) {
              throw new Error(postRes?.message || 'Không thể tạo bản nháp bài thi');
            }

            const detailRes = await request(formDetailPath(postRes.formVersionId));
            const relevantClasses = (state.classes || []).filter(c => {
              const rawCourse = String(c.courseCode || '').toLowerCase();
              return rawCourse.includes(String(currentStudioCourseId).toLowerCase());
            });

            const formObj = detailRes?.formVersion || detailRes?.form || {};
            renderTestBuilderView(container, {
              ...formObj,
              id: formObj.id || formObj.formVersionId || postRes.formVersionId,
              formVersionId: formObj.formVersionId || formObj.id || postRes.formVersionId,
              gradingKey: detailRes?.gradingKey || formObj.gradingKey,
              submissionCount: detailRes?.submissionCount || 0
            }, {
              teacherRole,
              courseId: currentStudioCourseId,
              classes: relevantClasses,
              onBack: () => {
                loadAndRenderTestStudio(currentStudioCourseId);
              },
              onDeleteDraft: handleDeleteDraft,
              onSaveDraft: async (updatedPayload) => {
                const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedPayload)
                });
                return putRes;
              },
              onPublish: async (publishPayload) => {
                const pubRes = await request(formPublishPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(publishPayload)
                });
                return pubRes;
              }
            });
          } catch (err) {
            alert('Lỗi khởi tạo bài thi: ' + (err.message || 'Lỗi kết nối'));
            loadAndRenderTestStudio(currentStudioCourseId);
          }
        },
        onEditTest: async ({ testKey, formVersionId }) => {
          if (!formVersionId) {
            alert('Bài thi này chưa liên kết với phiên bản form nào.');
            return;
          }
          try {
            container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải dữ liệu bài thi...</p></div>';
            const detailRes = await request(formDetailPath(formVersionId));
            const formObj = detailRes?.formVersion || detailRes?.form;
            if (!detailRes || !formObj) {
              throw new Error(detailRes?.message || 'Không tìm thấy dữ liệu bài thi');
            }
            const relevantClasses = (state.classes || []).filter(c => {
              const rawCourse = String(c.courseCode || '').toLowerCase();
              return rawCourse.includes(String(currentStudioCourseId).toLowerCase());
            });

            renderTestBuilderView(container, {
              ...formObj,
              id: formObj.id || formObj.formVersionId || formVersionId,
              formVersionId: formObj.formVersionId || formObj.id || formVersionId,
              gradingKey: detailRes?.gradingKey || formObj.gradingKey,
              testKey,
              submissionCount: detailRes?.submissionCount || 0
            }, {
              teacherRole,
              courseId: currentStudioCourseId,
              classes: relevantClasses,
              onBack: () => {
                loadAndRenderTestStudio(currentStudioCourseId);
              },
              onDeleteDraft: handleDeleteDraft,
              onSaveDraft: async (updatedPayload) => {
                const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedPayload)
                });
                return putRes;
              },
              onPublish: async (publishPayload) => {
                const pubRes = await request(formPublishPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(publishPayload)
                });
                return pubRes;
              }
            });
          } catch (err) {
            alert('Lỗi tải bài thi: ' + (err.message || 'Lỗi kết nối'));
            loadAndRenderTestStudio(currentStudioCourseId);
          }
        }
      });
    } catch (err) {
      container.innerHTML = `<div class="panel showcase-placeholder"><p class="alert-error">Không thể tải danh mục bài thi: ${err.message || 'Lỗi kết nối'}</p></div>`;
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const href = item.getAttribute('href') || '#dashboard';
      const cleanTab = readDashboardTab(href);
      const targetHash = '#' + cleanTab;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      updateDashboardTab(cleanTab);
    });
  });

  window.addEventListener('hashchange', () => {
    updateDashboardTab(window.location.hash);
  });

  if (goToGradingBtn) {
    goToGradingBtn.addEventListener('click', () => {
      window.location.hash = '#grading';
      updateDashboardTab('grading');
    });
  }

  if (gradingBackToDashboardBtn) {
    gradingBackToDashboardBtn.addEventListener('click', () => {
      window.location.hash = '#dashboard';
      updateDashboardTab('dashboard');
    });
  }

  function renderAssignmentChips(targetAssignmentId = state.assignmentId) {
    renderAssignmentChipsView(assignments, {
      assignmentsList: currentAssignmentsList,
      selectedAssignmentId: targetAssignmentId,
      isSwitching: isSwitchingAssignment,
      onSelect: (assignmentId) => {
        selectAssignment(assignmentId);
      },
      onToggleSwitch: (switching) => {
        isSwitchingAssignment = switching;
        renderAssignmentChips(state.assignmentId);
      }
    });
  }

  function selectAssignment(assignmentId) {
    state.assignmentId = assignmentId || '';
    state.attemptId = '';
    state.page = 1;
    setUrl();
    if (assignmentSelect) assignmentSelect.value = assignmentId || '';
    isSwitchingAssignment = false;
    renderAssignmentChips(assignmentId);

    const currentTab = readDashboardTab(window.location.hash);
    if (currentTab === 'grading') {
      if (assignmentId && state.classId) {
        if (results) results.hidden = false;
        if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = true;
      } else {
        if (results) results.hidden = true;
        if (gradingEmptyPlaceholder) gradingEmptyPlaceholder.hidden = false;
      }
    }

    if (assignmentId) {
      const activeAssignment = currentAssignmentsList.find(a => a.assignmentId === assignmentId);
      renderSelectedAssignmentShowcase(activeAssignment);
      if (state.classId) {
        loadResults(state.classId, assignmentId).catch(error => { status.textContent = error.message; });
      }
    } else {
      renderSelectedAssignmentShowcase(null);
      loadResults('', '').catch(() => {});
    }
  }

  const addStudentBtn = document.querySelector('#add-student-btn');
  const addStudentModal = document.querySelector('#add-student-modal');
  const addStudentForm = document.querySelector('#add-student-form');
  const eligibleStudentSelect = document.querySelector('#eligible-student-select');
  const addStudentRefInput = document.querySelector('#add-student-ref-input');
  const addStudentNameInput = document.querySelector('#add-student-name-input');
  const addStudentDiscInput = document.querySelector('#add-student-disc-input');
  const addStudentError = document.querySelector('#add-student-error');
  const cancelAddStudentBtn = document.querySelector('#cancel-add-student-btn');

  const grantRetakeModal = document.querySelector('#grant-retake-modal');
  const grantRetakeForm = document.querySelector('#grant-retake-form');
  const grantRetakeBtn = document.querySelector('#grant-retake-btn');
  const retakeStudentName = document.querySelector('#retake-student-name');
  const retakeStudentRefInput = document.querySelector('#retake-student-ref-input');
  const retakeReasonInput = document.querySelector('#retake-reason-input');
  const retakeAvailableFromInput = document.querySelector('#retake-available-from-input');
  const retakeExpiresAtInput = document.querySelector('#retake-expires-at-input');
  const cancelGrantRetakeBtn = document.querySelector('#cancel-grant-retake-btn');
  const grantRetakeError = document.querySelector('#grant-retake-error');

  const searchInput = document.querySelector('#search-input');
  const statusFilter = document.querySelector('#status-filter');
  const skillFilter = document.querySelector('#skill-filter');
  const minScoreInput = document.querySelector('#min-score-input');
  const maxScoreInput = document.querySelector('#max-score-input');
  const sortBySelect = document.querySelector('#sort-by-select');
  const sortDirSelect = document.querySelector('#sort-dir-select');
  const resetFiltersBtn = document.querySelector('#reset-filters-btn');
  const paginationInfo = document.querySelector('#pagination-info');
  const prevPageBtn = document.querySelector('#prev-page-btn');
  const nextPageBtn = document.querySelector('#next-page-btn');
  const attemptDetail = document.querySelector('#attempt-detail');
  const closeAttemptDetailBtn = document.querySelector('#close-attempt-detail-btn');
  const drawerBackdrop = document.querySelector('#drawer-backdrop');
  const detailHeading = document.querySelector('#detail-heading');
  const detailMeta = document.querySelector('#detail-meta');
  const detailScores = document.querySelector('#detail-scores');
  const detailIncidents = document.querySelector('#detail-incidents');
  const detailItems = document.querySelector('#detail-items');
  const detailAttemptHistory = document.querySelector('#detail-attempt-history');
  const detailGradingHistory = document.querySelector('#detail-grading-history');
  const attemptSkillTabs = document.querySelector('#attempt-skill-tabs');
  const skillSummaryCard = document.querySelector('#skill-summary-card');
  const detailItemsTable = document.querySelector('#detail-items-table');
  const detailItemsBody = document.querySelector('#detail-items-body');
  const itemContextModal = document.querySelector('#item-context-modal');
  const modalItemTitle = document.querySelector('#modal-item-title');
  const modalItemContent = document.querySelector('#modal-item-content');
  const closeItemModalBtn = document.querySelector('#close-item-modal-btn');
  let currentSkillTab = 'all';

  if (closeItemModalBtn && itemContextModal) {
    closeItemModalBtn.addEventListener('click', () => {
      itemContextModal.close();
    });
  }

  const saveDraftBtn = document.querySelector('#save-draft-btn');
  const completeGradingBtn = document.querySelector('#complete-grading-btn');
  const publishResultBtn = document.querySelector('#publish-result-btn');
  const draftStatusMsg = document.querySelector('#draft-status-msg');
  const conflictAlert = document.querySelector('#conflict-alert');
  const gradingActionsBar = document.querySelector('#grading-actions-bar');
  const assignmentLinkBar = document.querySelector('#assignment-link-bar');
  const assignmentStudentUrl = document.querySelector('#assignment-student-url');
  const copyStudentLinkBtn = document.querySelector('#copy-student-link-btn');
  const openStudentLinkBtn = document.querySelector('#open-student-link-btn');

  if (copyStudentLinkBtn) {
    copyStudentLinkBtn.addEventListener('click', async () => {
      const url = assignmentStudentUrl?.value;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const originalHtml = copyStudentLinkBtn.innerHTML;
        copyStudentLinkBtn.innerHTML = `${ICONS.check} <span>Đã sao chép!</span>`;
        setTimeout(() => { copyStudentLinkBtn.innerHTML = originalHtml; }, 2000);
      } catch {
        assignmentStudentUrl?.select();
        document.execCommand('copy');
      }
    });
  }

  if (copyShowcaseLinkBtn) {
    copyShowcaseLinkBtn.addEventListener('click', async () => {
      const url = showcaseStudentUrl?.value;
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        const originalHtml = copyShowcaseLinkBtn.innerHTML;
        copyShowcaseLinkBtn.innerHTML = `${ICONS.check} <span>Đã sao chép!</span>`;
        setTimeout(() => { copyShowcaseLinkBtn.innerHTML = originalHtml; }, 2000);
      } catch {
        showcaseStudentUrl?.select();
        document.execCommand('copy');
      }
    });
  }

  const showcaseQrBtn = document.querySelector('#showcase-qr-btn');
  if (showcaseQrBtn) {
    showcaseQrBtn.addEventListener('click', () => {
      const url = showcaseStudentUrl?.value;
      if (!url) return;
      let modal = document.querySelector('#qr-code-modal');
      if (!modal) {
        modal = document.createElement('dialog');
        modal.id = 'qr-code-modal';
        modal.className = 'qr-modal';
        document.body.append(modal);
      }
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=220x220&margin=10`;
      modal.innerHTML = `
        <div class="qr-modal-content">
          <div class="qr-modal-header">
            <h3>Mã QR phòng làm bài</h3>
            <button type="button" class="btn-close-qr" onclick="this.closest('dialog').close()"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
          <div class="qr-image-wrap">
            <img src="${qrApiUrl}" alt="Mã QR bài thi" width="220" height="220" style="border-radius: 8px;">
          </div>
          <p class="qr-modal-hint">Học viên quét mã để truy cập ngay vào bài kiểm tra.</p>
        </div>
      `;
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      }
    });
  }

  function renderSelectedAssignmentShowcase(assignment) {
    stopExamRoomEvents();
    currentExamRoom = null;
    const showcaseProgressText = document.querySelector('#showcase-progress-text');
    const showcaseProgressBar = document.querySelector('#showcase-progress-bar');
    if (!selectedAssignmentCard) return;
    if (!assignment) {
      currentSelectedAssignment = null;
      selectedAssignmentCard.hidden = true;
      if (showcaseProgressText) showcaseProgressText.textContent = '—';
      if (showcaseProgressBar) showcaseProgressBar.style.width = '0%';
      if (examRoom) examRoom.hidden = true;
      if (assignmentStudentUrl) assignmentStudentUrl.value = '';
      if (openStudentLinkBtn) openStudentLinkBtn.href = '#';
      if (assignmentLinkBar) assignmentLinkBar.hidden = true;
      if (showcaseStudentUrl) showcaseStudentUrl.value = '';
      if (openShowcaseLinkBtn) openShowcaseLinkBtn.href = '#';
      if (showcaseLinkBar) showcaseLinkBar.hidden = true;
      if (examRoomOpenButton) examRoomOpenButton.hidden = true;
      return;
    }

    selectedAssignmentCard.hidden = false;
    currentSelectedAssignment = assignment;
    if (examRoom) examRoom.hidden = true;
    if (examRoomOpenButton) examRoomOpenButton.hidden = !assignment.examMode;
    updateExamModeUI(assignment.examMode);
    const selectedClassOpt = classSelect?.selectedOptions?.[0];
    const currentClassName = assignment.className || (selectedClassOpt ? selectedClassOpt.text.split(' · ')[0].replace(/^Lớp\s*/, '') : '');

    const meta = formatAssignmentMeta({
      className: currentClassName,
      courseCode: assignment.courseCode,
      phase: assignment.phase,
      title: assignment.title
    });

    if (showcaseBadgeClass) showcaseBadgeClass.textContent = meta.classLabel;
    if (showcaseTitle) showcaseTitle.textContent = assignment.title;
    if (showcaseBlockBadge) showcaseBlockBadge.textContent = meta.courseLabel;
    if (showcasePhaseBadge) {
      if (meta.phaseLabel) {
        showcasePhaseBadge.textContent = meta.phaseLabel;
        showcasePhaseBadge.hidden = false;
      } else {
        showcasePhaseBadge.hidden = true;
      }
    }
    if (showcaseStatusBadge) {
      showcaseStatusBadge.textContent = assignment.status === 'published' ? 'Đang phát hành' : assignment.status;
    }
    if (showcaseWindowText) {
      showcaseWindowText.textContent = formatAssignmentWindow(assignment.opensAt, assignment.closesAt);
    }

    const studentUrl = localStudentUrl(assignment.studentUrl, currentLocation);
    if (studentUrl) {
      if (showcaseStudentUrl) showcaseStudentUrl.value = studentUrl;
      if (openShowcaseLinkBtn) openShowcaseLinkBtn.href = studentUrl;
      if (showcaseLinkBar) showcaseLinkBar.hidden = false;

      // Also sync legacy assignmentLinkBar
      if (assignmentStudentUrl) assignmentStudentUrl.value = studentUrl;
      if (openStudentLinkBtn) openStudentLinkBtn.href = studentUrl;
      if (assignmentLinkBar) assignmentLinkBar.hidden = false;
    } else {
      if (showcaseLinkBar) showcaseLinkBar.hidden = true;
      if (assignmentLinkBar) assignmentLinkBar.hidden = true;
    }
  }

  let currentAttemptDetail = null;

  const state = readDashboardState(location.href);
  Object.defineProperty(state, 'selectedAssignmentId', {
    get() { return this.assignmentId; },
    set(v) { this.assignmentId = v; },
    enumerable: false,
    configurable: true
  });

  // Sync inputs from initial state
  if (state.q) searchInput.value = state.q;
  if (state.status) statusFilter.value = state.status;
  if (state.minScore) minScoreInput.value = state.minScore;
  if (state.maxScore) maxScoreInput.value = state.maxScore;
  if (state.sortBy) sortBySelect.value = state.sortBy;
  if (state.sortDir) sortDirSelect.value = state.sortDir;

  const loginForm = document.querySelector('#login-form');
  const loginBtn = document.querySelector('#login-btn');
  const loginApiBase = document.querySelector('#login-api-base');
  const loginEmail = document.querySelector('#login-email');
  const loginPhone = document.querySelector('#login-phone');
  const togglePasswordBtn = document.querySelector('#toggle-password-btn');
  const loginError = document.querySelector('#login-error');
  const toggleFixtureBtn = document.querySelector('#toggle-fixture-btn');
  const teacherProfile = document.querySelector('#teacher-profile');
  const teacherProfileName = document.querySelector('#teacher-profile-name');
  const teacherProfileMeta = document.querySelector('#teacher-profile-meta');
  const teacherRoleBadge = document.querySelector('#teacher-role-badge');
  const roleBadgeWrap = document.querySelector('#role-badge-wrap');
  const roleInfoBtn = document.querySelector('#role-info-btn');
  const roleCapabilitiesPopover = document.querySelector('#role-capabilities-popover');
  const closeRolePopoverBtn = document.querySelector('#close-role-popover');
  const popoverRoleTitle = document.querySelector('#popover-role-title');
  const logoutBtn = document.querySelector('#logout-btn');

  let sessionToken = typeof sessionStorage !== 'undefined' ? (sessionStorage.getItem('izone_teacher_token') || '') : '';
  let examRoomEventsController = null;
  let currentExamRoom = null;

  const currentLocation = typeof window !== 'undefined' ? window.location : null;
  const currentHost = currentLocation?.hostname || '';
  const isTunnel = currentHost.includes('trycloudflare.com') || currentHost.includes('ngrok') || currentHost.includes('loca.lt');
  const isLocalHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(currentHost);
  const standardApiBase = defaultApiBase();

  if (loginApiBase) {
    if (isTunnel) {
      loginApiBase.value = currentLocation.origin;
    } else if (isLocalHost && (!loginApiBase.value || loginApiBase.value.includes('webtest.ducanhn.autos'))) {
      loginApiBase.value = 'http://127.0.0.1:8788';
    } else if (!loginApiBase.value || (!isLocalHost && loginApiBase.value.includes('localhost'))) {
      loginApiBase.value = standardApiBase;
    }
  }
  if (form?.elements?.apiBase) {
    if (isTunnel) {
      form.elements.apiBase.value = currentLocation.origin;
    } else if (isLocalHost && (!form.elements.apiBase.value || form.elements.apiBase.value.includes('webtest.ducanhn.autos'))) {
      form.elements.apiBase.value = 'http://127.0.0.1:8788';
    } else if (!form.elements.apiBase.value || (!isLocalHost && form.elements.apiBase.value.includes('localhost'))) {
      form.elements.apiBase.value = standardApiBase;
    }
  }

  const identity = () => ({ actorId: form?.elements?.actorId?.value || '' });
  const apiBase = () => (loginApiBase?.value || form?.elements?.apiBase?.value || standardApiBase).replace(/\/$/, '');
  const authHeader = () => authHeaders({ token: sessionToken, actorId: form?.elements?.actorId?.value });

  const request = async (path, options = {}) => {
    const headers = { ...authHeader(), ...(options.headers || {}) };
    const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && sessionToken) {
      handleLogout();
      if (loginError) {
        loginError.hidden = false;
        loginError.textContent = 'Phiên làm việc đã kết thúc hoặc không hợp lệ. Vui lòng đăng nhập lại.';
      }
      throw new Error(payload.message || 'Yêu cầu đăng nhập.');
    }
    if (!response.ok) throw new Error(payload.message || 'Không tải được dữ liệu.');
    return payload;
  };

  function fillIncidentTimeline(container, rawIncidents) {
    container.replaceChildren();
    const incidents = formatIncidentTimeline(rawIncidents || []);
    if (!incidents.length) {
      container.textContent = 'Không có sự cố được ghi nhận.';
      return;
    }
    const table = document.createElement('table');
    table.className = 'mini-table';
    table.innerHTML = '<thead><tr><th>Loại</th><th>Bắt đầu</th><th>Kết thúc</th><th>Thời lượng</th></tr></thead>';
    const body = document.createElement('tbody');
    for (const incident of incidents) {
      const row = document.createElement('tr');
      for (const value of [incident.typeLabel, incident.startedAt, incident.endedAt, incident.duration]) {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      }
      body.append(row);
    }
    table.append(body);
    container.append(table);
  }

  async function showExamRoomTimeline(student) {
    const panel = document.querySelector('#exam-room-timeline');
    if (!panel || !student.attemptId || !currentSelectedAssignment) return;
    panel.hidden = false;
    panel.querySelector('h3').textContent = `Timeline sự cố · ${student.name || 'Học viên'}`;
    const content = panel.querySelector('div');
    content.textContent = 'Đang tải timeline sự cố…';
    try {
      const payload = await request(attemptDetailPath(state.classId, currentSelectedAssignment.assignmentId, student.attemptId));
      fillIncidentTimeline(content, payload.incidents);
    } catch (error) {
      content.textContent = `Không tải được timeline sự cố: ${error.message}`;
    }
  }

  function renderExamRoom(room) {
    currentExamRoom = room;
    const roomStatus = ({ waiting: 'Đang chờ', running: 'Đang thi', ended: 'Đã kết thúc' })[room.status] || room.status;
    const deadline = room.deadlineAt ? ` · Hạn ${formatAssignmentWindow(room.deadlineAt, null).split(' → ')[0]}` : '';
    if (examRoomSummary) examRoomSummary.textContent = `${roomStatus} · ${formatExamReadyCount(room)}${deadline}`;
    if (examRoomStudents) {
      examRoomStudents.replaceChildren();
      for (const student of room.students || []) {
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const participation = document.createElement('td');
        const progress = document.createElement('td');
        const connection = document.createElement('td');
        const incidents = document.createElement('td');
        const device = document.createElement('td');
        name.textContent = student.name || '—';
        participation.textContent = formatExamRoomStatus(student.status);
        progress.textContent = formatExamProgress(student.progress);
        connection.textContent = formatExamConnectionStatus(student.connectionStatus);
        const incidentCount = Number(student.incidentCount) || 0;
        const openIncident = (student.openIncidents || []).length > 0;
        incidents.textContent = student.status === 'not_entered' ? '—' : `${incidentCount}${openIncident ? ' · đang rời bài' : ''}`;
        device.textContent = student.fullscreenUnsupported === true ? 'Không hỗ trợ toàn màn hình' : '—';
        // Tô đỏ mọi học viên đã có sự cố (không chỉ lúc đang rời bài) để giáo viên không bỏ sót.
        if (incidentCount > 0 || openIncident) {
          row.className = 'exam-incident-active';
          row.setAttribute('aria-label', `${student.name || 'Học viên'} có ${incidentCount} sự cố Exam Guard`);
        }
        row.append(name, participation, progress, connection, incidents, device);
        if (student.attemptId) {
          row.classList.add('exam-room-clickable');
          row.tabIndex = 0;
          row.title = 'Bấm để xem timeline sự cố';
          row.addEventListener('click', () => void showExamRoomTimeline(student));
          row.addEventListener('keydown', event => { if (event.key === 'Enter') void showExamRoomTimeline(student); });
        }
        examRoomStudents.append(row);
      }
    }
    if (examRoomStartButton) examRoomStartButton.disabled = room.status !== 'waiting';
    if (examRoomExtendButton) examRoomExtendButton.disabled = room.status !== 'running';
  }

  async function loadExamRoom() {
    if (!currentSelectedAssignment || !state.classId) return;
    if (examRoomMessage) examRoomMessage.textContent = 'Đang tải trạng thái Phòng thi…';
    const payload = await request(assignmentExamRoomPath(state.classId, currentSelectedAssignment.assignmentId));
    renderExamRoom(payload.room);
    if (examRoomMessage) examRoomMessage.textContent = '';
  }

  function stopExamRoomEvents() {
    examRoomEventsController?.abort();
    examRoomEventsController = null;
  }

  async function startExamRoomEvents() {
    stopExamRoomEvents();
    if (!sessionToken || !currentSelectedAssignment || !state.classId) return;
    const controller = new AbortController();
    examRoomEventsController = controller;
    const path = assignmentExamEventsPath(state.classId, currentSelectedAssignment.assignmentId);
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${apiBase()}${path}`, {
          headers: { Authorization: `Bearer ${sessionToken}`, Accept: 'text/event-stream' },
          signal: controller.signal
        });
        if (response.status === 401) {
          handleLogout();
          break;
        }
        if (!response.ok || !response.body) throw new Error('Không kết nối được luồng Phòng thi.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
          buffer = parsed.buffer;
          for (const message of parsed.events) {
            if (message.event === 'snapshot' && message.data.room) renderExamRoom(message.data.room);
            else if (message.event === 'exam.incident.opened' || message.event === 'exam.incident.closed') {
              currentExamRoom = applyExamIncident(currentExamRoom, message.data);
              if (currentExamRoom) renderExamRoom(currentExamRoom);
            } else if (message.event === 'exam.progress.updated') {
              currentExamRoom = applyExamProgress(currentExamRoom, message.data);
              if (currentExamRoom) renderExamRoom(currentExamRoom);
            } else if (message.event === 'exam.connection.changed') {
              currentExamRoom = applyExamConnection(currentExamRoom, message.data);
              if (currentExamRoom) renderExamRoom(currentExamRoom);
            } else if (message.event !== 'snapshot') await loadExamRoom();
          }
        }
      } catch (error) {
        if (controller.signal.aborted) break;
      }
      if (!controller.signal.aborted) {
        try { await loadExamRoom(); } catch { /* reconnect below; REST may recover with the stream */ }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  examRoomOpenButton?.addEventListener('click', async () => {
    if (!currentSelectedAssignment) return;
    examRoomReturnToResults = Boolean(results && !results.hidden);
    if (results) results.hidden = true;
    if (examRoom) examRoom.hidden = false;
    try { await loadExamRoom(); startExamRoomEvents(); }
    catch (error) { if (examRoomMessage) examRoomMessage.textContent = error.message; }
  });
  examRoomRefreshButton?.addEventListener('click', () => {
    loadExamRoom().catch(error => { if (examRoomMessage) examRoomMessage.textContent = error.message; });
  });
  examRoomCloseButton?.addEventListener('click', () => {
    stopExamRoomEvents();
    if (examRoom) examRoom.hidden = true;
    if (examRoomReturnToResults && results) results.hidden = false;
  });
  examRoomStartButton?.addEventListener('click', async () => {
    if (!currentSelectedAssignment) return;
    examRoomStartButton.disabled = true;
    try {
      await request(assignmentExamStartPath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      await loadExamRoom();
    } catch (error) {
      if (examRoomMessage) examRoomMessage.textContent = error.message;
      examRoomStartButton.disabled = false;
    }
  });
  examRoomExtendButton?.addEventListener('click', async () => {
    if (!currentSelectedAssignment) return;
    examRoomExtendButton.disabled = true;
    try {
      await request(assignmentExamExtendPath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: Number(examRoomExtensionMinutes?.value) })
      });
    } catch (error) {
      if (examRoomMessage) examRoomMessage.textContent = error.message;
      examRoomExtendButton.disabled = false;
      return;
    }
    loadExamRoom().catch(error => {
      if (examRoomMessage) examRoomMessage.textContent = `Đã gia hạn nhưng chưa tải lại được trạng thái: ${error.message}`;
    });
  });

  function updateExamModeUI(enabled) {
    const isEnabled = Boolean(enabled);
    if (examModeToggle) examModeToggle.checked = isEnabled;
    if (examModeStatusPill) {
      examModeStatusPill.textContent = isEnabled ? 'Đang bật' : 'Đang tắt';
      examModeStatusPill.className = `exam-mode-status-pill ${isEnabled ? 'active' : ''}`;
    }
  }

  examModeToggle?.addEventListener('change', async () => {
    if (!currentSelectedAssignment) return;
    examModeToggle.disabled = true;
    try {
      const payload = await request(assignmentExamModePath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: examModeToggle.checked })
      });
      currentSelectedAssignment.examMode = payload.examMode;
      updateExamModeUI(payload.examMode);
      if (examRoomOpenButton) examRoomOpenButton.hidden = !payload.examMode;
      if (!payload.examMode && examRoom) examRoom.hidden = true;
      status.textContent = payload.examMode ? 'Exam Mode đã bật. Học viên sẽ chờ giáo viên bắt đầu.' : 'Exam Mode đã tắt.';
    } catch (error) {
      updateExamModeUI(currentSelectedAssignment.examMode);
      status.textContent = error.message;
    } finally {
      examModeToggle.disabled = false;
    }
  });
  const setUrl = () => history.replaceState(null, '', assignmentUrl(location.href, state));

  function appendCell(row, value, className = '') {
    const cell = document.createElement('td');
    cell.className = className;
    cell.textContent = value;
    row.append(cell);
  }

  function renderClassSkillSummaryCards(container, payload) {
    container.replaceChildren();
    const summary = computeClassSkillSummary(payload);

    // 1. Class Total Average Card
    const totalCard = document.createElement('div');
    totalCard.className = 'class-summary-card card-total';
    totalCard.innerHTML = `
      <div class="summary-card-header">
        <span class="summary-card-title">Điểm trung bình lớp</span>
      </div>
      <div class="summary-card-score">${summary.totalAverage ? `${summary.totalAverage.earned}/${summary.totalAverage.maximum}` : '—'}</div>
      <div class="summary-card-meta">Đã nộp: ${summary.submittedCount}/${summary.totalStudents} học viên</div>
    `;
    container.append(totalCard);

    // 2. Skill Breakdown Cards
    for (const sk of summary.skills) {
      const card = document.createElement('div');
      card.className = 'class-summary-card';
      card.innerHTML = `
        <div class="summary-card-header">
          <span class="summary-card-title">${escapeHtml(sk.label)}</span>
        </div>
        <div class="summary-card-score">${sk.earned !== null ? `${sk.earned}/${sk.maximum}` : '—'}</div>
        <div class="summary-card-meta">${sk.studentCount} học viên có điểm</div>
      `;
      container.append(card);
    }
  }

  function renderResults(payload) {
    if (!payload || !payload.assignment) {
      if (results) results.hidden = true;
      if (resultsContent) resultsContent.replaceChildren();
      return;
    }
    currentResultsPayload = payload;
    resultsContent.replaceChildren();
    if (assignmentHeading) assignmentHeading.textContent = payload.assignment.title;
    if (assignmentMeta) {
      const meta = formatAssignmentMeta({
        className: payload.assignment.className,
        courseCode: payload.assignment.courseCode,
        phase: payload.assignment.phase,
        title: payload.assignment.title
      });
      const parts = [meta.classLabel, meta.courseLabel];
      if (meta.phaseLabel) parts.push(meta.phaseLabel);
      parts.push(`Phiên bản ${payload.assignment.formVersion}`);
      assignmentMeta.textContent = parts.join(' · ');
    }

    if (assignmentLinkBar) {
      const studentUrl = localStudentUrl(payload.assignment?.studentUrl, currentLocation);
      if (studentUrl) {
        assignmentLinkBar.hidden = false;
        if (assignmentStudentUrl) assignmentStudentUrl.value = studentUrl;
        if (openStudentLinkBtn) openStudentLinkBtn.href = studentUrl;
      } else {
        assignmentLinkBar.hidden = true;
      }
    }

    // Update showcase progress bar
    const showcaseProgressText = document.querySelector('#showcase-progress-text');
    const showcaseProgressBar = document.querySelector('#showcase-progress-bar');
    if (showcaseProgressText && showcaseProgressBar) {
      const students = payload.students || [];
      const totalStudents = students.length;
      const submittedStudents = students.filter(s => s.status === 'submitted' || s.attemptId).length;
      const pct = totalStudents > 0 ? Math.round((submittedStudents / totalStudents) * 100) : 0;
      showcaseProgressText.textContent = `${submittedStudents}/${totalStudents} học viên (${pct}%)`;
      showcaseProgressBar.style.width = `${pct}%`;
    }

    // Render Class Skill Performance Summary Bar
    if (classSkillSummary) {
      renderClassSkillSummaryCards(classSkillSummary, payload);
    }

    // Populate skill filter dropdown if needed
    if (skillFilter) {
      const currentSkill = skillFilter.value;
      skillFilter.replaceChildren(new Option('Tổng điểm', ''));
      for (const skill of payload.skills) {
        const normCode = normalizeSkillCode(skill.code);
        const label = CANONICAL_SKILL_LABELS[normCode] || skill.code.toUpperCase();
        skillFilter.add(new Option(`Kỹ năng: ${label}`, skill.code));
      }
      skillFilter.value = state.skill || currentSkill || '';
    }

    const maxTotal = payload.students.find(s => s.total?.maximum)?.total?.maximum
      || (payload.skills.length > 0 ? payload.skills.reduce((acc, s) => acc + (Number(s.maximum) || 0), 0) : 100);

    function createScoreHeader(label, maximum) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.className = 'th-score';
      th.innerHTML = `
        <div class="th-score-wrap">
          <span class="th-score-label">${escapeHtml(label)}</span>
          ${maximum ? `<span class="th-score-max">(/${escapeHtml(maximum)})</span>` : ''}
        </div>
      `;
      return th;
    }

    function createTextHeader(label) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      return th;
    }

    const scroll = document.createElement('div');
    scroll.className = 'results-scroll';
    const table = document.createElement('table');
    const head = document.createElement('thead');
    const headerRow = document.createElement('tr');

    headerRow.append(createTextHeader('Học viên'));
    headerRow.append(createTextHeader('Trạng thái'));
    headerRow.append(createScoreHeader('Tổng điểm', maxTotal));
    for (const skill of payload.skills) {
      const code = skill.code || '';
      const normCode = normalizeSkillCode(code);
      const label = CANONICAL_SKILL_LABELS[normCode] || (code.charAt(0).toUpperCase() + code.slice(1));
      headerRow.append(createScoreHeader(label, skill.maximum));
    }
    headerRow.append(createTextHeader('Sự cố'));
    headerRow.append(createTextHeader('Nộp lúc'));
    headerRow.append(createTextHeader('Thao tác'));
    head.append(headerRow);
    const body = document.createElement('tbody');

    const totalColumns = 5 + payload.skills.length;
    if (payload.students.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = totalColumns;
      emptyCell.className = 'empty-results';
      emptyCell.textContent = 'Không tìm thấy học viên nào phù hợp với bộ lọc.';
      emptyRow.append(emptyCell);
      body.append(emptyRow);
    } else {
      for (const student of payload.students) {
        const row = document.createElement('tr');

        // 1. Name Cell with Initials Avatar & Student Email (Stitch Gradebook Experience)
        const nameCell = document.createElement('td');
        nameCell.className = 'student-cell';
        const initials = getStudentInitials(student.name);
        const studentEmail = student.email || student.studentEmail || '';
        const avatarColor = getAvatarColor(studentEmail || student.name);

        nameCell.innerHTML = `
          <div class="student-cell-wrap">
            <div class="student-avatar" style="background-color: ${avatarColor.bg}; color: ${avatarColor.text}; border-color: ${avatarColor.border};" aria-hidden="true">${escapeHtml(initials)}</div>
            <div class="student-info">
              <span class="student-name">${escapeHtml(student.name)}</span>
              ${studentEmail ? `<span class="student-email">${escapeHtml(studentEmail)}</span>` : ''}
              ${student.leftClass ? `<span class="badge-left-class">Không còn trong lớp</span>` : ''}
            </div>
          </div>
        `;
        row.append(nameCell);

        // 2. Status Cell (wrapped in status-cell-wrap to prevent table cell collapse)
        const statusCell = document.createElement('td');
        const statusWrap = document.createElement('div');
        statusWrap.className = 'status-cell-wrap';
        const statusSpan = document.createElement('span');
        statusSpan.className = `result-status ${student.status}`;
        statusSpan.textContent = resultStatusLabel(student.status);
        const pubSpan = document.createElement('span');
        pubSpan.className = `badge-pub ${student.published ? 'is-pub' : ''}`;
        pubSpan.textContent = student.published ? 'Đã công bố' : 'Chưa công bố';
        statusWrap.append(statusSpan, pubSpan);
        statusCell.append(statusWrap);
        row.append(statusCell);

        // 3. Total Score Cell: Bold, larger text, direct tier text color, NO badge
        const totalCell = document.createElement('td');
        totalCell.className = 'score-cell';
        if (student.total && student.total.earned !== null && student.total.earned !== undefined) {
          const totalTier = getScoreTier(student.total.earned, student.total.maximum);
          const scoreVal = formatCompactScore(student.total);
          totalCell.innerHTML = `<span class="score-total ${totalTier || ''}">${escapeHtml(scoreVal)}</span>`;
        } else if (student.total?.status === 'pending') {
          totalCell.innerHTML = `<span class="score-total">Chờ chấm</span>`;
        } else {
          totalCell.innerHTML = `<span class="score-total">—</span>`;
        }
        row.append(totalCell);

        // 4. Per-Skill Score Cells: Standard normal font, only earned score number, NO tier badge
        for (const skill of payload.skills) {
          const skillCell = document.createElement('td');
          skillCell.className = 'score-cell';
          const skScore = student.skills?.[skill.code];
          const skVal = formatCompactScore(skScore);
          skillCell.innerHTML = `<span class="score-skill">${escapeHtml(skVal)}</span>`;
          row.append(skillCell);
        }

        const incidentCell = document.createElement('td');
        incidentCell.textContent = student.attemptId ? String(student.incidentCount ?? 0) : '—';
        row.append(incidentCell);

        // 5. Submitted At Cell: Two-line layout (Line 1: Time, Line 2: Date)
        const submittedCell = document.createElement('td');
        const ts = formatSubmissionTimestamp(student.submittedAt);
        if (ts) {
          submittedCell.innerHTML = `
            <div class="time-stamp-wrap">
              <span class="time-part">${escapeHtml(ts.time)}</span>
              <span class="date-part">${escapeHtml(ts.date)}</span>
            </div>
          `;
        } else {
          submittedCell.textContent = '—';
        }
        row.append(submittedCell);

        // 6. Action Cell
        const actionCell = document.createElement('td');
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'table-actions';
        if (student.attemptId) {
          const detailBtn = document.createElement('button');
          detailBtn.type = 'button';
          detailBtn.className = 'btn-secondary btn-sm btn-view-attempt';
          detailBtn.innerHTML = `${ICONS.view} <span>Xem bài</span>`;
          detailBtn.title = 'Xem chi tiết bài làm';
          detailBtn.addEventListener('click', () => {
            state.attemptId = student.attemptId;
            setUrl();
            loadAttemptDetail(state.classId, state.assignmentId, student.attemptId).catch(err => {
              status.textContent = err.message;
            });
          });
          actionsGroup.append(detailBtn);
        }
        const retakeBtn = document.createElement('button');
        retakeBtn.type = 'button';
        retakeBtn.className = 'btn-secondary btn-sm btn-retake';
        retakeBtn.innerHTML = `${ICONS.rotate} <span>Làm lại</span>`;
        retakeBtn.title = 'Cấp quyền làm lại bài thi';
        retakeBtn.addEventListener('click', () => {
          openGrantRetakeModal({
            studentRef: student.studentRef,
            studentName: student.name,
            discriminator: student.discriminator
          });
        });
        actionsGroup.append(retakeBtn);
        actionCell.append(actionsGroup);
        row.append(actionCell);

        body.append(row);
      }
    }
    table.append(head, body);
    scroll.append(table);
    resultsContent.append(scroll);

    // Update pagination controls
    const pagination = payload.pagination || { page: 1, pageSize: 25, totalItems: payload.students.length, totalPages: 1 };
    if (paginationInfo) {
      paginationInfo.textContent = `Trang ${pagination.page} / ${pagination.totalPages || 1} (Tổng cộng ${pagination.totalItems} học viên)`;
    }
    if (prevPageBtn) prevPageBtn.disabled = pagination.page <= 1;
    if (nextPageBtn) nextPageBtn.disabled = pagination.page >= pagination.totalPages || pagination.totalPages === 0;

    // Update last updated timestamp
    if (lastUpdated) {
      lastUpdated.textContent = `Cập nhật lúc ${formatCurrentTime()} (Asia/Ho_Chi_Minh)`;
    }

    results.hidden = false;
  }

  function renderAttemptDetail(payload) {
    if (!attemptDetail) return;
    if (detailHeading) {
      const email = payload.student.studentEmail || payload.student.email;
      detailHeading.textContent = `${payload.student.name}${email ? ' · ' + email : ''}`;
    }

    if (detailMeta) {
      detailMeta.replaceChildren();
      const badges = [
        `Lớp: ${payload.class.name} (${payload.class.courseCode})`,
        `Bài: ${payload.assignment.title}`,
        `Phiên bản đề: ${payload.attempt.formVersion}`,
        `Trạng thái: ${attemptStatusLabel(payload.attempt.status)}`,
        `Sự cố: ${payload.incidentCount ?? payload.incidents?.length ?? 0}`,
        `Bắt đầu: ${payload.attempt.startedAt ? formatAssignmentWindow(payload.attempt.startedAt, null).split(' → ')[0] : '—'}`,
        `Nộp lúc: ${payload.attempt.submittedAt ? formatAssignmentWindow(payload.attempt.submittedAt, null).split(' → ')[0] : 'Chưa nộp'}`
      ];
      for (const text of badges) {
        const badge = document.createElement('span');
        badge.className = 'meta-badge';
        badge.textContent = text;
        detailMeta.append(badge);
      }
      const pubBadge = document.createElement('span');
      pubBadge.className = `meta-badge ${payload.attempt.publication?.published ? 'badge-published' : 'badge-unpub'}`;
      pubBadge.textContent = payload.attempt.publication?.published
        ? `Đã công bố (${payload.attempt.publication.publishedBy || ''})`
        : 'Chưa công bố';
      detailMeta.append(pubBadge);

      if (payload.student.leftClass) {
        const leftBadge = document.createElement('span');
        leftBadge.className = 'meta-badge badge-left-class';
        leftBadge.textContent = 'Không còn trong lớp';
        detailMeta.append(leftBadge);
      }

      if (payload.retakeGrant) {
        const retakeBadge = document.createElement('span');
        retakeBadge.className = 'meta-badge';
        retakeBadge.style.background = '#f3e8ff';
        retakeBadge.style.color = '#6b21a8';
        retakeBadge.textContent = `Quyền làm lại: ${resultStatusLabel(payload.retakeGrant.status)}`;
        detailMeta.append(retakeBadge);
      }
    }


    if (detailScores) {
      detailScores.replaceChildren();
      const totalCard = document.createElement('div');
      totalCard.className = 'score-card total-card';
      totalCard.innerHTML = `<strong>Tổng điểm</strong><span class="score-val">${formatDashboardScore(payload.scores.total)}</span>`;
      detailScores.append(totalCard);

      for (const skill of payload.skills) {
        const skillScore = payload.scores.skills?.[skill.code];
        const card = document.createElement('div');
        card.className = 'score-card';
        card.innerHTML = `<strong>${skill.code.toUpperCase()}</strong><span class="score-val">${formatDashboardScore(skillScore)}</span>`;
        detailScores.append(card);
      }
    }

    if (detailIncidents) fillIncidentTimeline(detailIncidents, payload.incidents);

    if (detailAttemptHistory) {
      detailAttemptHistory.replaceChildren();
      if (payload.attemptHistory && payload.attemptHistory.length > 0) {
        const historyTable = document.createElement('table');
        historyTable.className = 'mini-table';
        historyTable.innerHTML = `
          <thead>
            <tr>
              <th>Lần làm bài</th>
              <th>Phiên bản đề</th>
              <th>Trạng thái</th>
              <th>Bắt đầu</th>
              <th>Nộp lúc</th>
            </tr>
          </thead>
        `;
        const hBody = document.createElement('tbody');
        for (const att of payload.attemptHistory) {
          const hRow = document.createElement('tr');
          if (att.isCurrent) hRow.className = 'current-attempt-row';
          const label = att.isCurrent ? `${att.attemptId.slice(0, 8)}… (Hiện tại)` : `${att.attemptId.slice(0, 8)}…`;
          hRow.innerHTML = `
            <td>${label}</td>
            <td>Phiên bản ${att.formVersion}</td>
            <td><span class="result-status ${att.status}">${attemptStatusLabel(att.status)}</span></td>
            <td>${att.startedAt ? formatAssignmentWindow(att.startedAt, null).split(' → ')[0] : '—'}</td>
            <td>${att.submittedAt ? formatAssignmentWindow(att.submittedAt, null).split(' → ')[0] : '—'}</td>
          `;
          hBody.append(hRow);
        }
        historyTable.append(hBody);
        detailAttemptHistory.append(historyTable);
      } else {
        detailAttemptHistory.textContent = 'Không có lịch sử lần làm nào khác.';
      }
    }

    if (detailGradingHistory) {
      detailGradingHistory.replaceChildren();
      if (payload.gradingHistory && payload.gradingHistory.length > 0) {
        const gTable = document.createElement('table');
        gTable.className = 'mini-table';
        gTable.innerHTML = `
          <thead>
            <tr>
              <th>Lượt chấm</th>
              <th>Phiên bản chấm</th>
              <th>Trạng thái</th>
              <th>Bắt đầu</th>
              <th>Hoàn tất</th>
            </tr>
          </thead>
        `;
        const gBody = document.createElement('tbody');
        for (const run of payload.gradingHistory) {
          const gRow = document.createElement('tr');
          gRow.innerHTML = `
            <td>${run.gradingRunId.slice(0, 8)}…</td>
            <td>v${run.graderVersion}</td>
            <td><span class="result-status ${run.status}">${resultStatusLabel(run.status)}</span></td>
            <td>${run.startedAt ? formatAssignmentWindow(run.startedAt, null).split(' → ')[0] : '—'}</td>
            <td>${run.completedAt ? formatAssignmentWindow(run.completedAt, null).split(' → ')[0] : '—'}</td>
          `;
          gBody.append(gRow);
        }
        gTable.append(gBody);
        detailGradingHistory.append(gTable);
      } else {
        detailGradingHistory.textContent = 'Chưa có thông tin lượt chấm.';
      }
    }

    currentAttemptDetail = payload;
    if (conflictAlert) {
      conflictAlert.hidden = true;
      conflictAlert.replaceChildren();
    }

    if (draftStatusMsg) {
      if (payload.manualGrading?.status === 'completed') {
        draftStatusMsg.textContent = 'Bài làm đã hoàn tất chấm điểm.';
        if (saveDraftBtn) saveDraftBtn.disabled = true;
        if (completeGradingBtn) completeGradingBtn.disabled = true;
      } else if (payload.manualGrading?.revision > 0) {
        draftStatusMsg.textContent = `Bản nháp phiên bản ${payload.manualGrading.revision} (lưu lúc ${payload.manualGrading.updatedAt ? formatAssignmentWindow(payload.manualGrading.updatedAt, null).split(' → ')[0] : '—'})`;
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        if (completeGradingBtn) completeGradingBtn.disabled = false;
      } else {
        draftStatusMsg.textContent = 'Chưa có bản nháp nào được lưu.';
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        if (completeGradingBtn) completeGradingBtn.disabled = false;
      }
    }

    if (gradingActionsBar) gradingActionsBar.hidden = false;

    function openItemContextModal(item) {
      if (!itemContextModal || !modalItemContent) return;
      if (modalItemTitle) {
        const skillLabel = item.primarySkill ? ` · ${item.primarySkill.toUpperCase()}` : '';
        modalItemTitle.textContent = `Câu ${item.position}${skillLabel}`;
      }
      modalItemContent.replaceChildren();

      // 1. Prompt Block
      const promptBlock = document.createElement('div');
      promptBlock.className = 'modal-ctx-block';
      promptBlock.innerHTML = `
        <h4>Đề bài / Yêu cầu chi tiết</h4>
        <div style="font-size: 0.95rem; line-height: 1.5; color: #1e293b; white-space: pre-wrap;">${escapeHtml(item.prompt || '—')}</div>
        ${item.helpText ? `<p style="margin: 6px 0 0; font-size: 0.88rem; color: #64748b; font-style: italic;">${escapeHtml(item.helpText)}</p>` : ''}
      `;
      modalItemContent.append(promptBlock);

      // 2. Options List (if options exist)
      if (Array.isArray(item.options) && item.options.length > 0) {
        const optBlock = document.createElement('div');
        optBlock.className = 'modal-ctx-block';
        const optTitle = document.createElement('h4');
        optTitle.textContent = `Danh sách lựa chọn / Từ vựng (${item.options.length})`;
        optBlock.append(optTitle);

        const ul = document.createElement('ul');
        ul.className = 'modal-options-list';
        for (const opt of item.options) {
          const li = document.createElement('li');
          const isSelected = item.studentAnswer === opt.id || (Array.isArray(item.studentAnswer) && item.studentAnswer.includes(opt.id));
          if (isSelected) li.className = 'is-selected';
          li.textContent = `${opt.id}: ${opt.label}${isSelected ? ' (Học viên chọn)' : ''}`;
          ul.append(li);
        }
        optBlock.append(ul);
        modalItemContent.append(optBlock);
      }

      // 3. Student Answer Block
      const ansBlock = document.createElement('div');
      ansBlock.className = 'modal-ctx-block';
      const ansStudent = resolveStudentAnswerDisplay(item);
      ansBlock.innerHTML = `
        <h4>Bài làm của học viên</h4>
        <div style="font-size: 0.95rem; font-weight: 600; color: #0f172a;">${escapeHtml(ansStudent)}</div>
      `;
      modalItemContent.append(ansBlock);

      // 4. Expected Answer & Feedback
      const expBlock = document.createElement('div');
      expBlock.className = 'modal-ctx-block';
      const ansExpected = resolveExpectedAnswerDisplay(item);
      const fbLines = [];
      if (item.feedback) {
        if (Number.isFinite(item.feedback.structureScore)) fbLines.push(`Điểm cấu trúc: ${item.feedback.structureScore}`);
        if (Number.isFinite(item.feedback.accuracyScore)) fbLines.push(`Điểm chính xác: ${item.feedback.accuracyScore}`);
        if (Array.isArray(item.feedback.evidence) && item.feedback.evidence.length > 0) fbLines.push(`Nhận xét: ${item.feedback.evidence.join('; ')}`);
        if (Array.isArray(item.feedback.errors) && item.feedback.errors.length > 0) fbLines.push(`Lỗi: ${item.feedback.errors.map(e => e.message || e.code).join(', ')}`);
      }
      expBlock.innerHTML = `
        <h4>Đáp án mẫu & Tiêu chí Rubric</h4>
        <div style="font-size: 0.95rem; font-weight: 600; color: #0369a1; margin-bottom: 6px;">${escapeHtml(ansExpected)}</div>
        ${fbLines.length > 0 ? `<p style="margin: 0; font-size: 0.88rem; color: #92400e; background: #fffbeb; padding: 8px 12px; border-radius: 6px;">${escapeHtml(fbLines.join(' · '))}</p>` : ''}
      `;
      modalItemContent.append(expBlock);

      itemContextModal.showModal();
    }

    function renderAttemptTableRows(tabCode = 'all') {
      if (!detailItemsBody || !currentAttemptDetail) return;
      detailItemsBody.replaceChildren();

      const items = currentAttemptDetail.items;
      const { sections } = extractAttemptSkills(items);
      const filteredSections = tabCode === 'all'
        ? sections
        : sections.filter(s => s.skillCode === tabCode);

      for (const section of filteredSections) {
        // Render Section Header Row
        const secTr = document.createElement('tr');
        secTr.className = 'section-header-row';
        secTr.innerHTML = `
          <td colspan="8">
            <div class="sec-header-wrap">
              <span class="sec-header-title">${ICONS.book} <span>${escapeHtml(section.title)}</span></span>
              <div class="sec-header-badges">
                <span class="sec-header-score">${section.scoreEarned}/${section.maxScore} điểm</span>
                <span class="sec-header-count">(${section.correctCount}/${section.totalItems} câu đúng)</span>
                ${section.needsReviewCount > 0 ? `<span class="sec-header-review">${section.needsReviewCount} câu cần duyệt</span>` : ''}
              </div>
            </div>
          </td>
        `;
        detailItemsBody.append(secTr);

        for (const item of section.items) {
          const tr = document.createElement('tr');
          if (item.needsReview) tr.className = 'row-needs-review';

          // 1. # Column (compact question number, no internal tech badges)
          const tdPos = document.createElement('td');
          tdPos.className = 'col-pos-cell';
          tdPos.innerHTML = `<span class="q-pos-num">#${item.position}</span>`;
          tr.append(tdPos);

          // 2. Prompt Column
          const tdPrompt = document.createElement('td');
          const compactPrompt = formatCompactPrompt(item);
          const optBtnHtml = compactPrompt.hasExtensiveOptions
            ? `<button type="button" class="prompt-opt-btn" data-item-id="${item.itemVersionId}">${ICONS.clipboard} <span>Xem danh sách từ (${compactPrompt.optionsCount})</span></button>`
            : '';
          tdPrompt.innerHTML = `
            <div class="prompt-compact">
              <div class="prompt-preview-text" title="${escapeHtml(compactPrompt.text)}">${escapeHtml(compactPrompt.text)}</div>
              ${item.helpText ? `<small style="color:#64748b; display:block;">${escapeHtml(item.helpText)}</small>` : ''}
              ${optBtnHtml}
            </div>
          `;
          tr.append(tdPrompt);

          // 3. Student Answer Column
          const tdStudent = document.createElement('td');
          const studentAnsDisplay = resolveStudentAnswerDisplay(item);
          tdStudent.innerHTML = `
            <div class="ans-display-cell">
              <div class="ans-student-val" title="${escapeHtml(studentAnsDisplay)}">${escapeHtml(studentAnsDisplay)}</div>
            </div>
          `;
          tr.append(tdStudent);

          // 4. Expected Answer Column
          const tdExpected = document.createElement('td');
          const expectedAnsDisplay = resolveExpectedAnswerDisplay(item);
          tdExpected.innerHTML = `
            <div class="ans-display-cell">
              <div class="ans-expected-val" title="${escapeHtml(expectedAnsDisplay)}">${escapeHtml(expectedAnsDisplay)}</div>
            </div>
          `;
          tr.append(tdExpected);

          // 5. Verdict Column
          const tdVerdict = document.createElement('td');
          tdVerdict.innerHTML = `<span class="verdict-badge ${item.verdict}">${verdictLabel(item.verdict)}</span>`;
          tr.append(tdVerdict);

          // 6. Score Column
          const tdScore = document.createElement('td');
          const currentScoreVal = item.draftScore !== null && item.draftScore !== undefined
            ? item.draftScore
            : (item.manualReview ? item.scoreEarned : (item.canGrade ? (item.draftScore ?? '') : item.scoreEarned));

          if (item.canGrade) {
            tdScore.innerHTML = `
              <div class="table-grade-score-wrap">
                <input type="number" step="any" min="0" max="${item.maxScore}" class="grade-score-input table-grade-input" data-item-id="${item.itemVersionId}" value="${currentScoreVal !== undefined ? currentScoreVal : ''}" placeholder="0-${item.maxScore}">
                <span>/${item.maxScore}</span>
              </div>
            `;
          } else {
            tdScore.innerHTML = `<div class="table-grade-score-wrap"><span>${item.scoreEarned}/${item.maxScore}</span></div>`;
          }
          tr.append(tdScore);

          // 7. Feedback Column
          const tdFeedback = document.createElement('td');
          const currentFeedbackVal = typeof item.draftFeedback === 'string'
            ? item.draftFeedback
            : (item.draftFeedback?.comment ?? (item.manualReview && typeof item.feedback === 'object' ? (item.feedback?.comment || '') : ''));

          if (item.canGrade) {
            tdFeedback.innerHTML = `
              <textarea class="grade-feedback-input table-feedback-input" data-item-id="${item.itemVersionId}" placeholder="Nhận xét...">${escapeHtml(currentFeedbackVal)}</textarea>
            `;
          } else {
            const commentText = item.feedback?.comment || '';
            tdFeedback.innerHTML = `<span style="font-size:0.82rem; color:#64748b;">${escapeHtml(commentText) || '—'}</span>`;
          }
          tr.append(tdFeedback);

          // 8. Action Column
          const tdAction = document.createElement('td');
          tdAction.innerHTML = `<button type="button" class="btn-inspect-item" data-item-id="${item.itemVersionId}">${ICONS.view} <span>Xem</span></button>`;
          tr.append(tdAction);

          detailItemsBody.append(tr);
        }
      }

      // Attach event listeners for prompt opt buttons and inspect item buttons
      detailItemsBody.querySelectorAll('.prompt-opt-btn, .btn-inspect-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const itm = items.find(i => i.itemVersionId === btn.dataset.itemId);
          if (itm) openItemContextModal(itm);
        });
      });

      // Attach auto-save listener on table score and feedback inputs
      const scoreInputs = detailItemsBody.querySelectorAll('.grade-score-input');
      const feedbackInputs = detailItemsBody.querySelectorAll('.grade-feedback-input');
      [...scoreInputs, ...feedbackInputs].forEach(inp => {
        inp.addEventListener('input', () => {
          const itm = items.find(i => i.itemVersionId === inp.dataset.itemId);
          if (itm) {
            if (inp.classList.contains('grade-score-input')) {
              itm.draftScore = inp.value.trim() !== '' ? Number(inp.value.trim()) : null;
            } else if (inp.classList.contains('grade-feedback-input')) {
              itm.draftFeedback = inp.value;
            }
          }
          clearTimeout(autoSaveTimeout);
          autoSaveTimeout = setTimeout(() => {
            saveManualGradingDraft(true).catch(() => {});
          }, 1500);
        });
      });
    }

    function renderSkillSummary(tabCode = 'all') {
      if (!skillSummaryCard || !currentAttemptDetail) return;
      const skillsData = extractAttemptSkills(currentAttemptDetail.items);
      const summary = skillsData.summary[tabCode] || skillsData.summary['all'];

      const titleText = tabCode === 'all'
        ? 'Tất cả kỹ năng'
        : `Kỹ năng ${summary.label || tabCode.toUpperCase()}`;

      skillSummaryCard.innerHTML = `
        <div class="skill-summary-title">${escapeHtml(titleText)} (${summary.totalItems} câu)</div>
        <div class="skill-summary-metrics">
          <span class="skill-summary-score">${summary.scoreEarned}/${summary.maxScore} điểm</span>
          ${summary.needsReviewCount > 0 ? `<span class="verdict-badge manual_review">${summary.needsReviewCount} câu cần duyệt</span>` : '<span class="verdict-badge correct">Đã chấm xong</span>'}
        </div>
      `;
    }

    function renderSkillTabs() {
      if (!attemptSkillTabs || !currentAttemptDetail) return;
      attemptSkillTabs.replaceChildren();

      const skillsData = extractAttemptSkills(currentAttemptDetail.items);
      const allSummary = skillsData.summary['all'];

      // 1. "All" tab button
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = `skill-tab-btn${currentSkillTab === 'all' ? ' active' : ''}`;
      allBtn.innerHTML = `
        <span>Tất cả</span>
        <span class="tab-count">${allSummary.totalItems}</span>
        ${allSummary.needsReviewCount > 0 ? `<span class="tab-review-pill">${allSummary.needsReviewCount} cần duyệt</span>` : ''}
      `;
      allBtn.addEventListener('click', () => {
        currentSkillTab = 'all';
        attemptSkillTabs.querySelectorAll('.skill-tab-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        renderSkillSummary('all');
        renderAttemptTableRows('all');
      });
      attemptSkillTabs.append(allBtn);

      // 2. Each skill tab button
      for (const skill of skillsData.skills) {
        const skillBtn = document.createElement('button');
        skillBtn.type = 'button';
        skillBtn.className = `skill-tab-btn${currentSkillTab === skill.code ? ' active' : ''}`;
        skillBtn.innerHTML = `
          <span>${escapeHtml(skill.label)}</span>
          <span class="tab-count">${skill.totalItems}</span>
          ${skill.needsReviewCount > 0 ? `<span class="tab-review-pill">${skill.needsReviewCount} cần duyệt</span>` : ''}
        `;
        skillBtn.addEventListener('click', () => {
          currentSkillTab = skill.code;
          attemptSkillTabs.querySelectorAll('.skill-tab-btn').forEach(b => b.classList.remove('active'));
          skillBtn.classList.add('active');
          renderSkillSummary(skill.code);
          renderAttemptTableRows(skill.code);
        });
        attemptSkillTabs.append(skillBtn);
      }
    }

    currentSkillTab = 'all';
    renderSkillTabs();
    renderSkillSummary(currentSkillTab);
    renderAttemptTableRows(currentSkillTab);

    // Keep detailItems container synchronized for compatibility
    if (detailItems) {
      detailItems.replaceChildren();
    }

    if (payload.manualGradingHistory && payload.manualGradingHistory.length > 0 && detailGradingHistory) {
      const mgHeader = document.createElement('h4');
      mgHeader.textContent = 'Lịch sử chấm của giảng viên';
      mgHeader.style.margin = '16px 0 6px';
      const mgTable = document.createElement('table');
      mgTable.className = 'mini-table';
      mgTable.innerHTML = `
        <thead>
          <tr>
            <th>Hành động</th>
            <th>Người thực hiện</th>
            <th>Phiên bản</th>
            <th>Thời gian</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
      `;
      const mgBody = document.createElement('tbody');
      for (const log of payload.manualGradingHistory) {
        const row = document.createElement('tr');
        const actionLabel = log.action === 'complete' ? 'Hoàn tất chấm' : 'Lưu nháp';
        row.innerHTML = `
          <td><span class="result-status ${log.action === 'complete' ? 'complete' : 'grading'}">${actionLabel}</span></td>
          <td>${log.actorEmail || '—'}</td>
          <td>v${log.revision}</td>
          <td>${log.createdAt ? formatAssignmentWindow(log.createdAt, null).split(' → ')[0] : '—'}</td>
          <td>${log.note || '—'}</td>
        `;
        mgBody.append(row);
      }
      mgTable.append(mgBody);
      detailGradingHistory.append(mgHeader, mgTable);
    }

    if (publishResultBtn) {
      if (payload.attempt.status === 'active') {
        publishResultBtn.disabled = true;
        publishResultBtn.title = 'Chưa thể công bố bài khi học viên chưa nộp';
      } else {
        publishResultBtn.disabled = false;
        publishResultBtn.title = '';
      }
      publishResultBtn.textContent = payload.attempt.publication?.published ? 'Công bố lại' : 'Công bố kết quả';
    }

    if (drawerBackdrop) drawerBackdrop.hidden = false;
    attemptDetail.hidden = false;
    attemptDetail.classList.add('drawer-open');
    if (results) results.hidden = false;
  }

  async function loadAttemptDetail(classId, assignmentId, attemptId) {
    if (!classId || !assignmentId || !attemptId) {
      if (attemptDetail) {
        attemptDetail.classList.remove('drawer-open');
        attemptDetail.hidden = true;
      }
      if (drawerBackdrop) drawerBackdrop.hidden = true;
      return;
    }
    status.textContent = 'Đang tải chi tiết bài làm…';
    const payload = await request(attemptDetailPath(classId, assignmentId, attemptId));
    renderAttemptDetail(payload);
    status.textContent = 'Đã mở chi tiết bài làm';
  }

  async function loadResults(classId, assignmentId) {
    if (!classId || !assignmentId) {
      results.hidden = true;
      resultsContent.replaceChildren();
      return;
    }
    status.textContent = 'Đang tải bảng kết quả…';
    const queryOptions = {
      q: state.q,
      status: state.status,
      minScore: state.minScore,
      maxScore: state.maxScore,
      skill: state.skill,
      sortBy: state.sortBy,
      sortDir: state.sortDir,
      page: state.page
    };
    const payload = await request(assignmentResultsPath(classId, assignmentId, queryOptions));
    renderResults(payload);
    status.textContent = 'Đã cập nhật bảng kết quả';
  }

  async function loadAssignments(classId, selectedAssignmentId = '') {
    assignments.replaceChildren();
    if (assignmentSelect) {
      assignmentSelect.replaceChildren(new Option('-- Chọn bài test --', ''));
      assignmentSelect.disabled = !classId;
    }
    renderSelectedAssignmentShowcase(null);
    currentAssignmentsList = [];
    await loadResults('', '');
    if (!classId) return;

    status.textContent = 'Đang tải bài được giao…';
    const payload = await request(`/api/teacher/classes/${encodeURIComponent(classId)}/assignments`);
    currentAssignmentsList = payload.assignments || [];
    let selectedExists = false;

    if (assignmentSelect) {
      assignmentSelect.disabled = false;
      for (const assignment of currentAssignmentsList) {
        const phaseLabel = extractPhase(assignment.phase, assignment.title);
        const optLabel = phaseLabel ? `${assignment.title} (${phaseLabel})` : assignment.title;
        const opt = new Option(optLabel, assignment.assignmentId);
        if (assignment.assignmentId === selectedAssignmentId) {
          opt.selected = true;
          selectedExists = true;
        }
        assignmentSelect.add(opt);
      }
    }

    renderAssignmentChips(selectedAssignmentId);

    status.textContent = `${currentAssignmentsList.length} bài được giao`;

    const activeAssignment = currentAssignmentsList.find(a => a.assignmentId === (selectedAssignmentId || state.assignmentId));
    if (activeAssignment) {
      renderSelectedAssignmentShowcase(activeAssignment);
    } else {
      renderSelectedAssignmentShowcase(null);
    }

    if (selectedExists) {
      await loadResults(classId, selectedAssignmentId);
      if (state.attemptId) {
        try {
          await loadAttemptDetail(classId, selectedAssignmentId, state.attemptId);
        } catch (err) {
          console.warn('Attempt detail not found:', err.message);
          state.attemptId = '';
          setUrl();
          const attemptContainer = document.querySelector('#attempt-detail');
          if (attemptContainer) {
            attemptContainer.classList.remove('drawer-open');
            attemptContainer.hidden = true;
          }
          if (drawerBackdrop) drawerBackdrop.hidden = true;
          if (loginError && loginError.textContent.includes('Không tìm thấy bài làm')) {
            loginError.hidden = true;
            loginError.textContent = '';
          }
        }
      }
    }
  }

  let rawClassesList = [];
  let currentTeacher = null;

  function updateFilterPillsUI() {
    if (adminCourseFilters) {
      const activeCourse = state.course || 'all';
      adminCourseFilters.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.course === activeCourse);
      });
    }
    if (leadScopeFilters) {
      const activeScope = state.scope || 'all';
      leadScopeFilters.querySelectorAll('.filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scope === activeScope);
      });
    }
    if (classStatusFilter) {
      classStatusFilter.value = state.classStatus || '';
    }
    if (classSearchInput) {
      classSearchInput.value = state.classQ || '';
    }
  }

  function renderFilteredClasses() {
    if (!classSelect) return;
    const userClassIds = currentTeacher?.classIds || [];
    const filtered = filterClasses(rawClassesList, {
      course: state.course,
      scope: state.scope,
      classStatus: state.classStatus,
      q: state.classQ,
      userRole: currentTeacher?.role,
      userClassIds
    });

    if (classCountBadge) {
      classCountBadge.textContent = formatClassFilterCountLabel({
        count: filtered.length,
        course: state.course,
        scope: state.scope,
        classStatus: state.classStatus,
        userRole: currentTeacher?.role
      });
    }

    classSelect.replaceChildren(new Option(filtered.length > 0 ? `-- Chọn lớp (${filtered.length}) --` : '-- Không có lớp phù hợp --', ''));
    for (const item of filtered) {
      classSelect.add(new Option(formatClassOptionLabel(item), item.classId));
    }

    const matchingClass = filtered.find(c => c.classId === state.classId);
    if (matchingClass) {
      classSelect.value = state.classId;
    } else {
      classSelect.value = '';
    }

    if (status) {
      status.textContent = `${filtered.length}/${rawClassesList.length} lớp phù hợp bộ lọc`;
    }
  }

  function setupClassFilterToolbar() {
    if (!classFilterToolbar || !currentTeacher) return;
    classFilterToolbar.hidden = false;

    const role = currentTeacher.role;
    if (role === 'admin' || role === 'qm') {
      if (adminCourseFilters) adminCourseFilters.hidden = false;
      if (leadScopeFilters) leadScopeFilters.hidden = true;
    } else if (role === 'lead') {
      if (adminCourseFilters) adminCourseFilters.hidden = true;
      if (leadScopeFilters) {
        leadScopeFilters.hidden = false;
        const allBtn = leadScopeFilters.querySelector('[data-scope="all"]');
        if (allBtn && currentTeacher.courseCodes?.length) {
          allBtn.innerHTML = `${ICONS.classes} <span>Toàn bộ khối</span>`;
        }
      }
    } else {
      if (adminCourseFilters) adminCourseFilters.hidden = true;
      if (leadScopeFilters) leadScopeFilters.hidden = true;
    }

    updateFilterPillsUI();
  }

  if (adminCourseFilters) {
    adminCourseFilters.addEventListener('click', event => {
      const pill = event.target.closest('.filter-pill');
      if (!pill) return;
      const course = pill.dataset.course || 'all';
      state.course = course === 'all' ? '' : course;
      setUrl();
      updateFilterPillsUI();
      renderFilteredClasses();
    });
  }

  if (leadScopeFilters) {
    leadScopeFilters.addEventListener('click', event => {
      const pill = event.target.closest('.filter-pill');
      if (!pill) return;
      const scope = pill.dataset.scope || 'all';
      state.scope = scope === 'all' ? '' : scope;
      setUrl();
      updateFilterPillsUI();
      renderFilteredClasses();
    });
  }

  if (classStatusFilter) {
    classStatusFilter.addEventListener('change', () => {
      state.classStatus = classStatusFilter.value;
      setUrl();
      renderFilteredClasses();
    });
  }

  let classSearchTimeout = null;
  if (classSearchInput) {
    classSearchInput.addEventListener('input', () => {
      state.classQ = classSearchInput.value.trim();
      clearTimeout(classSearchTimeout);
      classSearchTimeout = setTimeout(() => {
        setUrl();
        renderFilteredClasses();
      }, 250);
    });
  }

  async function loadClasses() {
    status.textContent = 'Đang kiểm tra quyền…';
    const payload = await request('/api/teacher/classes');
    if (payload.actor) {
      currentTeacher = { ...(currentTeacher || {}), ...payload.actor };
      if (Array.isArray(payload.actor.classIds) && payload.actor.classIds.length > 0) {
        currentTeacher.classIds = payload.actor.classIds;
      }
    }
    rawClassesList = payload.classes || [];
    setupClassFilterToolbar();
    renderFilteredClasses();
    await loadAssignments(classSelect.value, state.assignmentId);
  }

  // Filter and pagination event handlers
  function applyFilterChange() {
    state.page = 1;
    setUrl();
    loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
  }

  let searchTimeout = null;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(applyFilterChange, 300);
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      state.status = statusFilter.value;
      applyFilterChange();
    });
  }

  if (skillFilter) {
    skillFilter.addEventListener('change', () => {
      state.skill = skillFilter.value;
      applyFilterChange();
    });
  }

  if (minScoreInput) {
    minScoreInput.addEventListener('change', () => {
      state.minScore = minScoreInput.value;
      applyFilterChange();
    });
  }

  if (maxScoreInput) {
    maxScoreInput.addEventListener('change', () => {
      state.maxScore = maxScoreInput.value;
      applyFilterChange();
    });
  }

  if (sortBySelect) {
    sortBySelect.addEventListener('change', () => {
      state.sortBy = sortBySelect.value;
      applyFilterChange();
    });
  }

  if (sortDirSelect) {
    sortDirSelect.addEventListener('change', () => {
      state.sortDir = sortDirSelect.value;
      applyFilterChange();
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', () => {
      state.q = '';
      state.status = '';
      state.minScore = '';
      state.maxScore = '';
      state.skill = '';
      state.sortBy = '';
      state.sortDir = 'asc';
      state.page = 1;
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      if (skillFilter) skillFilter.value = '';
      if (minScoreInput) minScoreInput.value = '';
      if (maxScoreInput) maxScoreInput.value = '';
      if (sortBySelect) sortBySelect.value = '';
      if (sortDirSelect) sortDirSelect.value = 'asc';
      setUrl();
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
    });
  }

  let autoSaveTimeout = null;

  function showConflictAlert(msg) {
    if (!conflictAlert) return;
    conflictAlert.replaceChildren();
    const span = document.createElement('span');
    span.innerHTML = `${ICONS.alert} <span>${escapeHtml(msg)}</span>`;
    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'btn-secondary';
    reloadBtn.textContent = 'Tải lại bài làm';
    reloadBtn.addEventListener('click', () => {
      loadAttemptDetail(state.classId, state.assignmentId, state.attemptId).catch(err => {
        status.textContent = err.message;
      });
    });
    conflictAlert.append(span, reloadBtn);
    conflictAlert.hidden = false;
  }

  async function saveManualGradingDraft(silent = false) {
    if (!currentAttemptDetail) return;
    const itemsToSubmit = [];
    const feedbackMap = new Map();
    const scoresMap = {};

    // 1. Populate from items in memory
    for (const itm of currentAttemptDetail.items) {
      if (itm.canGrade) {
        const scoreVal = itm.draftScore !== null && itm.draftScore !== undefined
          ? itm.draftScore
          : (itm.manualReview && itm.scoreEarned !== null ? itm.scoreEarned : null);
        const feedbackVal = typeof itm.draftFeedback === 'string'
          ? itm.draftFeedback
          : (itm.draftFeedback?.comment ?? (itm.manualReview && typeof itm.feedback === 'object' ? (itm.feedback?.comment || '') : null));

        if (scoreVal !== null && scoreVal !== undefined) {
          scoresMap[itm.itemVersionId] = Number(scoreVal);
          itemsToSubmit.push({
            itemVersionId: itm.itemVersionId,
            scoreEarned: Number(scoreVal),
            feedback: feedbackVal || null
          });
        }
      }
    }

    // 2. Override with active inputs in DOM
    const scoreInputs = attemptDetail.querySelectorAll('.grade-score-input');
    const feedbackInputs = attemptDetail.querySelectorAll('.grade-feedback-input');
    feedbackInputs.forEach(input => {
      feedbackMap.set(input.dataset.itemId, input.value.trim());
    });
    scoreInputs.forEach(input => {
      const val = input.value.trim();
      if (val !== '') {
        const num = Number(val);
        scoresMap[input.dataset.itemId] = num;
        const existingIdx = itemsToSubmit.findIndex(it => it.itemVersionId === input.dataset.itemId);
        const itemObj = {
          itemVersionId: input.dataset.itemId,
          scoreEarned: num,
          feedback: feedbackMap.get(input.dataset.itemId) || null
        };
        if (existingIdx >= 0) {
          itemsToSubmit[existingIdx] = itemObj;
        } else {
          itemsToSubmit.push(itemObj);
        }
      }
    });

    for (const itm of currentAttemptDetail.items) {
      if (scoresMap[itm.itemVersionId] !== undefined) {
        const num = scoresMap[itm.itemVersionId];
        if (!Number.isFinite(num) || num < 0 || num > itm.maxScore) {
          if (!silent && status) status.textContent = `Điểm câu ${itm.position} không hợp lệ (0 - ${itm.maxScore}).`;
          return;
        }
      }
    }

    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang lưu nháp...';
    try {
      const response = await fetch(`${apiBase()}${manualGradingDraftPath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          baseRevision: currentAttemptDetail.manualGrading?.revision ?? 0,
          items: itemsToSubmit,
          note: 'Lưu nháp từ Dashboard'
        })
      });
      const payload = await response.json();
      if (response.status === 409) {
        showConflictAlert(payload.message || 'Xung đột: Bài làm đã được cập nhật bởi người khác.');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể lưu nháp.');
      }
      currentAttemptDetail.manualGrading.revision = payload.revision;
      currentAttemptDetail.manualGrading.status = 'draft';
      if (draftStatusMsg) {
        draftStatusMsg.textContent = `Đã lưu nháp lúc ${formatCurrentTime()} (phiên bản ${payload.revision})`;
      }
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi lưu nháp: ${err.message}`;
    }
  }

  async function completeManualGrading() {
    if (!currentAttemptDetail) return;
    const itemsToSubmit = [];
    const feedbackMap = new Map();
    const scoresMap = {};

    // 1. Populate from items in memory
    for (const itm of currentAttemptDetail.items) {
      if (itm.canGrade) {
        const scoreVal = itm.draftScore !== null && itm.draftScore !== undefined
          ? itm.draftScore
          : (itm.manualReview && itm.scoreEarned !== null ? itm.scoreEarned : null);
        const feedbackVal = typeof itm.draftFeedback === 'string'
          ? itm.draftFeedback
          : (itm.draftFeedback?.comment ?? (itm.manualReview && typeof itm.feedback === 'object' ? (itm.feedback?.comment || '') : null));

        if (scoreVal !== null && scoreVal !== undefined) {
          scoresMap[itm.itemVersionId] = Number(scoreVal);
          itemsToSubmit.push({
            itemVersionId: itm.itemVersionId,
            scoreEarned: Number(scoreVal),
            feedback: feedbackVal || null
          });
        }
      }
    }

    // 2. Override with active inputs in DOM
    const scoreInputs = attemptDetail.querySelectorAll('.grade-score-input');
    const feedbackInputs = attemptDetail.querySelectorAll('.grade-feedback-input');
    feedbackInputs.forEach(input => {
      feedbackMap.set(input.dataset.itemId, input.value.trim());
    });
    scoreInputs.forEach(input => {
      const val = input.value.trim();
      if (val !== '') {
        const num = Number(val);
        scoresMap[input.dataset.itemId] = num;
        const existingIdx = itemsToSubmit.findIndex(it => it.itemVersionId === input.dataset.itemId);
        const itemObj = {
          itemVersionId: input.dataset.itemId,
          scoreEarned: num,
          feedback: feedbackMap.get(input.dataset.itemId) || null
        };
        if (existingIdx >= 0) {
          itemsToSubmit[existingIdx] = itemObj;
        } else {
          itemsToSubmit.push(itemObj);
        }
      }
    });

    const validation = validateManualGradingScores(currentAttemptDetail.items, scoresMap);
    if (!validation.valid) {
      alert(validation.message);
      if (status) status.textContent = validation.message;
      return;
    }

    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang hoàn tất chấm...';
    try {
      const response = await fetch(`${apiBase()}${manualGradingCompletePath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          baseRevision: currentAttemptDetail.manualGrading?.revision ?? 0,
          items: itemsToSubmit,
          note: 'Xác nhận hoàn tất chấm'
        })
      });
      const payload = await response.json();
      if (response.status === 409) {
        showConflictAlert(payload.message || 'Xung đột: Bài làm đã được cập nhật bởi người khác.');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể hoàn tất chấm.');
      }
      alert('Đã hoàn tất chấm bài thành công!');
      await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi: ${err.message}`;
    }
  }

  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', () => {
      saveManualGradingDraft(false).catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  if (completeGradingBtn) {
    completeGradingBtn.addEventListener('click', () => {
      completeManualGrading().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  async function publishAttemptResult() {
    if (!state.classId || !state.assignmentId || !state.attemptId) return;
    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang công bố kết quả…';
    try {
      const response = await fetch(`${apiBase()}${attemptPublishPath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ note: 'Công bố kết quả' })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể công bố kết quả.');
      }
      alert('Đã công bố kết quả thành công!');
      if (draftStatusMsg) draftStatusMsg.textContent = `Đã công bố kết quả lúc ${formatCurrentTime()}`;
      await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi công bố: ${err.message}`;
    }
  }

  if (publishResultBtn) {
    publishResultBtn.addEventListener('click', () => {
      publishAttemptResult().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  function closeAttemptDetail() {
    if (attemptDetail) {
      attemptDetail.classList.remove('drawer-open');
      attemptDetail.hidden = true;
    }
    if (drawerBackdrop) {
      drawerBackdrop.hidden = true;
    }
    if (results) {
      results.hidden = false;
    }
    delete state.attemptId;
    setUrl();
    loadResults(state.classId, state.assignmentId).catch(() => {});
  }

  if (closeAttemptDetailBtn) {
    closeAttemptDetailBtn.addEventListener('click', closeAttemptDetail);
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', closeAttemptDetail);
  }
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && attemptDetail && !attemptDetail.hidden) {
      closeAttemptDetail();
    }
  });

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
    });
  }

  async function publishAllResults() {
    if (!state.classId || !state.assignmentId) return;
    const confirmed = confirm('Bạn có chắc chắn muốn công bố điểm cho toàn bộ học viên đã nộp bài trong bài được giao này không?');
    if (!confirmed) return;

    if (publishAllBtn) {
      publishAllBtn.disabled = true;
      publishAllBtn.textContent = 'Đang công bố…';
    }
    if (status) status.textContent = 'Đang công bố điểm cho toàn bộ học viên…';

    try {
      let success = false;
      let count = 0;
      let msg = '';
      try {
        const payload = await request(assignmentPublishAllPath(state.classId, state.assignmentId), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: 'Công bố toàn bộ kết quả' })
        });
        success = true;
        count = payload.publishedCount ?? 0;
        msg = payload.message || `Đã công bố kết quả cho ${count} học viên.`;
      } catch (batchErr) {
        // Fallback: If batch endpoint returned error or 404, fallback to individual publication
        const submittedStudents = (currentResultsPayload?.students || []).filter(
          s => s.attemptId && s.status === 'submitted' && !s.published
        );
        if (submittedStudents.length > 0) {
          await Promise.all(
            submittedStudents.map(s =>
              request(attemptPublishPath(state.classId, state.assignmentId, s.attemptId), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: 'Công bố kết quả' })
              })
            )
          );
          success = true;
          count = submittedStudents.length;
          msg = `Đã công bố kết quả cho ${count} học viên.`;
        } else if ((currentResultsPayload?.students || []).some(s => s.attemptId && s.status === 'submitted')) {
          msg = 'Tất cả học viên đã nộp bài đều đã được công bố điểm.';
          success = true;
        } else {
          throw batchErr;
        }
      }

      alert(msg || 'Đã công bố điểm cho toàn bộ học viên thành công!');
      if (status) status.textContent = msg || 'Đã công bố kết quả thành công.';
      await loadResults(state.classId, state.assignmentId);
    } catch (err) {
      alert(`Lỗi khi công bố điểm: ${err.message}`);
      if (status) status.textContent = `Lỗi công bố: ${err.message}`;
    } finally {
      if (publishAllBtn) {
        publishAllBtn.disabled = false;
        publishAllBtn.textContent = 'Công bố toàn bộ điểm';
      }
    }
  }

  if (publishAllBtn) {
    publishAllBtn.addEventListener('click', () => {
      publishAllResults().catch(err => {
        if (status) status.textContent = err.message;
      });
    });
  }

  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', async () => {
      if (!state.classId || !state.assignmentId) return;
      if (addStudentError) {
        addStudentError.hidden = true;
        addStudentError.textContent = '';
      }
      if (eligibleStudentSelect) {
        eligibleStudentSelect.replaceChildren(new Option('-- Chọn học viên --', ''));
        try {
          const res = await request(eligibleStudentsPath(state.classId, state.assignmentId));
          if (res.ok && Array.isArray(res.students)) {
            for (const s of res.students) {
              const opt = new Option(s.discriminator ? `${s.name} · ${s.discriminator}` : s.name, s.studentRef);
              opt.dataset.name = s.name;
              opt.dataset.discriminator = s.discriminator || '';
              opt.dataset.contactId = s.erpStudentContactId || '';
              eligibleStudentSelect.add(opt);
            }
          }
        } catch {
          // ignore error fetching eligible students
        }
      }
      if (addStudentRefInput) addStudentRefInput.value = '';
      if (addStudentNameInput) addStudentNameInput.value = '';
      if (addStudentDiscInput) addStudentDiscInput.value = '';
      if (typeof addStudentModal?.showModal === 'function') {
        addStudentModal.showModal();
      } else if (addStudentModal) {
        addStudentModal.hidden = false;
      }
    });
  }

  if (eligibleStudentSelect) {
    eligibleStudentSelect.addEventListener('change', () => {
      const selected = eligibleStudentSelect.selectedOptions[0];
      if (selected && selected.value) {
        if (addStudentRefInput) addStudentRefInput.value = selected.value;
        if (addStudentNameInput) addStudentNameInput.value = selected.dataset.name || '';
        if (addStudentDiscInput) addStudentDiscInput.value = selected.dataset.discriminator || '';
      }
    });
  }

  if (cancelAddStudentBtn) {
    cancelAddStudentBtn.addEventListener('click', () => {
      if (typeof addStudentModal?.close === 'function') {
        addStudentModal.close();
      } else if (addStudentModal) {
        addStudentModal.hidden = true;
      }
    });
  }

  if (addStudentForm) {
    addStudentForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!state.classId || !state.assignmentId) return;
      const studentRef = addStudentRefInput?.value.trim();
      const name = addStudentNameInput?.value.trim();
      const discriminator = addStudentDiscInput?.value.trim();
      if (!studentRef || !name) {
        if (addStudentError) {
          addStudentError.hidden = false;
          addStudentError.textContent = 'Vui lòng nhập đầy đủ mã định danh và tên học viên.';
        }
        return;
      }
      try {
        const response = await fetch(`${apiBase()}${assignmentRosterPath(state.classId, state.assignmentId)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({ studentRef, name, discriminator })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Không thể thêm học viên.');
        }
        if (typeof addStudentModal?.close === 'function') {
          addStudentModal.close();
        } else if (addStudentModal) {
          addStudentModal.hidden = true;
        }
        await loadResults(state.classId, state.assignmentId);
      } catch (err) {
        if (addStudentError) {
          addStudentError.hidden = false;
          addStudentError.textContent = err.message;
        }
      }
    });
  }

  function openGrantRetakeModal({ studentRef, studentName, discriminator }) {
    if (!state.classId || !state.assignmentId || !studentRef) return;
    if (grantRetakeError) {
      grantRetakeError.hidden = true;
      grantRetakeError.textContent = '';
    }
    if (retakeStudentName) {
      retakeStudentName.textContent = discriminator ? `${studentName} · ${discriminator}` : (studentName || studentRef);
    }
    if (retakeStudentRefInput) {
      retakeStudentRefInput.value = studentRef;
    }
    if (retakeReasonInput) {
      retakeReasonInput.value = '';
    }
    if (retakeAvailableFromInput) {
      retakeAvailableFromInput.value = '';
    }
    if (retakeExpiresAtInput) {
      const nowPlus24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pad = n => String(n).padStart(2, '0');
      const localIso = `${nowPlus24h.getFullYear()}-${pad(nowPlus24h.getMonth() + 1)}-${pad(nowPlus24h.getDate())}T${pad(nowPlus24h.getHours())}:${pad(nowPlus24h.getMinutes())}`;
      retakeExpiresAtInput.value = localIso;
    }
    if (typeof grantRetakeModal?.showModal === 'function') {
      grantRetakeModal.showModal();
    } else if (grantRetakeModal) {
      grantRetakeModal.hidden = false;
    }
  }

  if (grantRetakeBtn) {
    grantRetakeBtn.addEventListener('click', () => {
      if (!currentAttemptDetail) return;
      openGrantRetakeModal({
        studentRef: currentAttemptDetail.student.studentRef,
        studentName: currentAttemptDetail.student.name,
        discriminator: currentAttemptDetail.student.discriminator
      });
    });
  }

  if (cancelGrantRetakeBtn) {
    cancelGrantRetakeBtn.addEventListener('click', () => {
      if (typeof grantRetakeModal?.close === 'function') {
        grantRetakeModal.close();
      } else if (grantRetakeModal) {
        grantRetakeModal.hidden = true;
      }
    });
  }

  if (grantRetakeForm) {
    grantRetakeForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!state.classId || !state.assignmentId) return;
      const studentRef = retakeStudentRefInput?.value.trim();
      const reason = retakeReasonInput?.value.trim();
      const availableFromVal = retakeAvailableFromInput?.value;
      const expiresAtVal = retakeExpiresAtInput?.value;

      if (!studentRef || !reason || !expiresAtVal) {
        if (grantRetakeError) {
          grantRetakeError.hidden = false;
          grantRetakeError.textContent = 'Vui lòng điền đầy đủ lý do và hạn chót làm lại.';
        }
        return;
      }

      const availableFrom = availableFromVal ? new Date(availableFromVal).toISOString() : null;
      const expiresAt = new Date(expiresAtVal).toISOString();

      try {
        const response = await fetch(`${apiBase()}${grantRetakePath(state.classId, state.assignmentId, studentRef)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({ reason, availableFrom, expiresAt })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Không thể cấp quyền làm lại.');
        }
        if (typeof grantRetakeModal?.close === 'function') {
          grantRetakeModal.close();
        } else if (grantRetakeModal) {
          grantRetakeModal.hidden = true;
        }
        alert('Cấp quyền làm lại thành công!');
        await loadResults(state.classId, state.assignmentId);
        if (state.attemptId) {
          await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
        }
      } catch (err) {
        if (grantRetakeError) {
          grantRetakeError.hidden = false;
          grantRetakeError.textContent = err.message;
        }
      }
    });
  }


  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if ((state.page || 1) > 1) {
        state.page = (state.page || 1) - 1;
        setUrl();
        loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      state.page = (state.page || 1) + 1;
      setUrl();
      loadResults(state.classId, state.assignmentId).catch(error => { status.textContent = error.message; });
    });
  }

  function renderTeacherProfile(teacher) {
    if (!teacher) return;
    document.body.classList.remove('login-page');
    currentTeacher = teacher;
    setupClassFilterToolbar();
    if (teacherProfileName) teacherProfileName.textContent = teacher.name || teacher.email;
    const popoverUserName = document.querySelector('#popover-user-name');
    if (popoverUserName) popoverUserName.textContent = teacher.name || teacher.email;
    if (teacherProfileMeta) teacherProfileMeta.textContent = `${teacher.email} · SĐT: ${teacher.phone || '—'}`;
    const teacherProfileAvatar = document.querySelector('#teacher-profile-avatar');
    if (teacherProfileAvatar) {
      const name = (teacher.name || teacher.email || '').trim();
      const parts = name.split(/\s+/).filter(Boolean);
      let initials = 'GV';
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
      teacherProfileAvatar.textContent = initials;
    }
    if (teacherRoleBadge) {
      teacherRoleBadge.textContent = teacherRoleLabel(teacher.role, teacher.courseCodes);
      teacherRoleBadge.className = `role-badge ${teacher.role || 'teacher'}`;
    }
    if (loginForm) loginForm.hidden = true;
    if (teacherProfile) teacherProfile.hidden = false;
    if (loginError) loginError.hidden = true;

    const currentTab = readDashboardTab(window.location.hash);
    if (currentTab === 'test-studio' || currentTab === 'exams') {
      loadAndRenderTestStudio();
    }
  }

  function toggleRoleCapabilitiesPopover(show) {
    if (!roleCapabilitiesPopover) return;
    const shouldShow = typeof show === 'boolean' ? show : roleCapabilitiesPopover.hidden;
    roleCapabilitiesPopover.hidden = !shouldShow;
    if (roleInfoBtn) roleInfoBtn.setAttribute('aria-expanded', String(shouldShow));
    if (teacherRoleBadge) teacherRoleBadge.setAttribute('aria-expanded', String(shouldShow));
    if (shouldShow && currentTeacher) {
      const popoverUserName = document.querySelector('#popover-user-name');
      if (popoverUserName) popoverUserName.textContent = currentTeacher.name || currentTeacher.email;
      if (teacherRoleBadge) {
        teacherRoleBadge.textContent = teacherRoleLabel(currentTeacher.role, currentTeacher.courseCodes);
        teacherRoleBadge.className = `role-badge ${currentTeacher.role || 'teacher'}`;
      }
    }
  }

  if (roleInfoBtn) {
    roleInfoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRoleCapabilitiesPopover();
    });
  }

  if (teacherRoleBadge) {
    teacherRoleBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRoleCapabilitiesPopover();
    });
    teacherRoleBadge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleRoleCapabilitiesPopover();
      }
    });
  }

  if (closeRolePopoverBtn) {
    closeRolePopoverBtn.addEventListener('click', () => {
      toggleRoleCapabilitiesPopover(false);
    });
  }

  document.addEventListener('click', (e) => {
    if (roleCapabilitiesPopover && !roleCapabilitiesPopover.hidden) {
      if (!roleCapabilitiesPopover.contains(e.target) && !roleBadgeWrap?.contains(e.target)) {
        toggleRoleCapabilitiesPopover(false);
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && roleCapabilitiesPopover && !roleCapabilitiesPopover.hidden) {
      toggleRoleCapabilitiesPopover(false);
    }
  });

  function handleLogout() {
    stopExamRoomEvents();
    if (roleCapabilitiesPopover) roleCapabilitiesPopover.hidden = true;
    document.body.classList.add('login-page');
    sessionToken = '';
    currentTeacher = null;
    rawClassesList = [];
    if (classFilterToolbar) classFilterToolbar.hidden = true;
    if (classSearchInput) classSearchInput.value = '';
    if (classStatusFilter) classStatusFilter.value = '';
    if (classCountBadge) classCountBadge.textContent = '0 lớp';
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('izone_teacher_token');
      sessionStorage.removeItem('izone_teacher_profile');
    }
    if (teacherProfile) teacherProfile.hidden = true;
    if (loginForm) loginForm.hidden = false;
    if (classSelect) classSelect.replaceChildren(new Option('-- Chọn lớp --', ''));
    if (assignmentSelect) {
      assignmentSelect.replaceChildren(new Option('-- Chọn bài test --', ''));
      assignmentSelect.disabled = true;
    }
    if (selectedAssignmentCard) selectedAssignmentCard.hidden = true;
    currentAssignmentsList = [];
    if (results) results.hidden = true;
    if (resultsContent) resultsContent.replaceChildren();
    if (classSkillSummary) classSkillSummary.replaceChildren();
    if (attemptDetail) {
      attemptDetail.classList.remove('drawer-open');
      attemptDetail.hidden = true;
    }
    if (drawerBackdrop) drawerBackdrop.hidden = true;
    if (detailScores) detailScores.replaceChildren();
    if (detailItemsBody) detailItemsBody.replaceChildren();
    if (detailAttemptHistory) detailAttemptHistory.replaceChildren();
    if (detailGradingHistory) detailGradingHistory.replaceChildren();
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (skillFilter) skillFilter.value = '';
    if (minScoreInput) minScoreInput.value = '';
    if (maxScoreInput) maxScoreInput.value = '';
    if (sortBySelect) sortBySelect.value = 'submitted_at';
    if (sortDirSelect) sortDirSelect.value = 'desc';

    resetDashboardState(state);
    setUrl();
    if (status) status.textContent = 'Đã đăng xuất. Vui lòng đăng nhập lại.';
  }

  if (togglePasswordBtn && loginPhone) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = loginPhone.type === 'password';
      loginPhone.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      togglePasswordBtn.setAttribute('title', isPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
      togglePasswordBtn.setAttribute('aria-pressed', String(isPassword));
    });
  }

  if (loginPhone && loginForm) {
    loginPhone.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (typeof loginForm.requestSubmit === 'function') {
          loginForm.requestSubmit();
        } else {
          loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
        }
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (loginBtn.disabled) return;
      if (loginError) loginError.hidden = true;
      const email = loginEmail?.value.trim() || '';
      const phone = loginPhone?.value.trim() || '';
      if (!email || !phone) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = 'Vui lòng nhập đầy đủ Email và Số điện thoại.';
        }
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Đang đăng nhập…';
      loginForm.setAttribute('aria-busy', 'true');
      try {
        if (status) status.textContent = 'Đang xác thực tài khoản…';
        const response = await fetch(`${apiBase()}${authLoginPath()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, phone })
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Email hoặc số điện thoại không chính xác.');
        }

        sessionToken = payload.token;
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('izone_teacher_token', payload.token);
          sessionStorage.setItem('izone_teacher_profile', JSON.stringify(payload.teacher));
        }

        renderTeacherProfile(payload.teacher);
        await loadClasses();
      } catch (err) {
        if (loginError) {
          loginError.hidden = false;
          loginError.textContent = err.message;
        }
        if (status) status.textContent = `Lỗi đăng nhập: ${err.message}`;
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Đăng nhập';
        loginForm.removeAttribute('aria-busy');
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        if (sessionToken) {
          await fetch(`${apiBase()}${authLogoutPath()}`, {
            method: 'POST',
            headers: { ...authHeader() }
          }).catch(() => {});
        }
      } finally {
        handleLogout();
      }
    });
  }

  if (toggleFixtureBtn && form) {
    toggleFixtureBtn.addEventListener('click', () => {
      form.hidden = !form.hidden;
    });
  }

  // Restore session on load if present
  if (sessionToken) {
    const cachedProfile = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('izone_teacher_profile') : null;
    if (cachedProfile) {
      try {
        renderTeacherProfile(JSON.parse(cachedProfile));
      } catch {
        // ignore
      }
    }
    fetch(`${apiBase()}${authMePath()}`, { headers: { ...authHeader() } })
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          renderTeacherProfile(data.teacher);
          await loadClasses();
        } else {
          handleLogout();
        }
      })
      .catch(() => {});
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    document.body.classList.remove('login-page');
    loadClasses().catch(error => { status.textContent = error.message; });
  });

  classSelect.addEventListener('change', () => {
    state.classId = classSelect.value;
    state.assignmentId = '';
    state.attemptId = '';
    state.page = 1;
    setUrl();
    if (assignmentSelect) {
      assignmentSelect.value = '';
    }
    renderSelectedAssignmentShowcase(null);
    loadAssignments(classSelect.value).catch(error => { status.textContent = error.message; });
  });

  if (assignmentSelect) {
    assignmentSelect.addEventListener('change', () => {
      selectAssignment(assignmentSelect.value);
    });
  }

  // Light periodic polling every 30 seconds if visible and active
  setInterval(() => {
    if (!document.hidden && state.classId && state.assignmentId) {
      loadResults(state.classId, state.assignmentId).catch(() => {});
    }
  }, 30000);

  // Initialize view tab according to current URL hash
  if (typeof window !== 'undefined') {
    updateDashboardTab(window.location.hash || '#dashboard');
  }
}

if (typeof document !== 'undefined') startDashboard();
