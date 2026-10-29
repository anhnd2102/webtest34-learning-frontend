import { parseSseChunk } from './exam-room-sse.js';
import {
  portalTestsPath, portalLinkPath, portalSyncPreviewPath, portalSyncPath, portalSyncStatusPath,
  portalSyncErrorView, previewRowView, selectableRefs, syncRequestBody, syncConfirmMessage,
  syncResultView, retryRefs, linkedPortalTest, syncSummaryText, scaleWarningText, selectAllState, shouldReloadPreviewAfterSyncError
} from './portal-sync-view.js';

export function defaultApiBase() {
  return 'https://webtest.ducanhdev.com';
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
    [/(\b)cant(\b)/gi, "$1can't$2"],
    [/(\b)cant(\b)/gi, '$1cannot$2'],
    [/(\b)dont(\b)/gi, "$1don't$2"],
    [/(\b)dont(\b)/gi, '$1do not$2'],
    [/(\b)doesnt(\b)/gi, "$1doesn't$2"],
    [/(\b)doesnt(\b)/gi, '$1does not$2'],
    [/(\b)didnt(\b)/gi, "$1didn't$2"],
    [/(\b)didnt(\b)/gi, '$1did not$2'],
    [/(\b)wont(\b)/gi, "$1won't$2"],
    [/(\b)wont(\b)/gi, '$1will not$2'],
    [/(\b)isnt(\b)/gi, "$1isn't$2"],
    [/(\b)isnt(\b)/gi, '$1is not$2'],
    [/(\b)arent(\b)/gi, "$1aren't$2"],
    [/(\b)arent(\b)/gi, '$1are not$2'],
    [/(\b)wasnt(\b)/gi, "$1wasn't$2"],
    [/(\b)wasnt(\b)/gi, '$1was not$2'],
    [/(\b)werent(\b)/gi, "$1weren't$2"],
    [/(\b)werent(\b)/gi, '$1were not$2'],
    [/(\b)hasnt(\b)/gi, "$1hasn't$2"],
    [/(\b)hasnt(\b)/gi, '$1has not$2'],
    [/(\b)haven('t|’t)(\b)/gi, '$1have not$3'],
    [/(\b)have not(\b)/gi, "$1haven't$2"],
    [/(\b)havent(\b)/gi, "$1haven't$2"],
    [/(\b)havent(\b)/gi, '$1have not$2']
  ];

  // IELTS Number words <-> Digits (1..12 and ordinals)
  const numberPairs = [
    [/\b1st\b/gi, 'first'], [/\bfirst\b/gi, '1st'],
    [/\b2nd\b/gi, 'second'], [/\bsecond\b/gi, '2nd'],
    [/\b3rd\b/gi, 'third'], [/\bthird\b/gi, '3rd'],
    [/\b4th\b/gi, 'fourth'], [/\bfourth\b/gi, '4th'],
    [/\b5th\b/gi, 'fifth'], [/\bfifth\b/gi, '5th'],
    [/\b6th\b/gi, 'sixth'], [/\bsixth\b/gi, '6th'],
    [/\b7th\b/gi, 'seventh'], [/\bseventh\b/gi, '7th'],
    [/\b8th\b/gi, 'eighth'], [/\beighth\b/gi, '8th'],
    [/\b9th\b/gi, 'ninth'], [/\bninth\b/gi, '9th'],
    [/\b10th\b/gi, 'tenth'], [/\btenth\b/gi, '10th'],
    [/\b1\b/g, 'one'], [/\bone\b/gi, '1'],
    [/\b2\b/g, 'two'], [/\btwo\b/gi, '2'],
    [/\b3\b/g, 'three'], [/\bthree\b/gi, '3'],
    [/\b4\b/g, 'four'], [/\bfour\b/gi, '4'],
    [/\b5\b/g, 'five'], [/\bfive\b/gi, '5'],
    [/\b6\b/g, 'six'], [/\bsix\b/gi, '6'],
    [/\b7\b/g, 'seven'], [/\bseven\b/gi, '7'],
    [/\b8\b/g, 'eight'], [/\beight\b/gi, '8'],
    [/\b9\b/g, 'nine'], [/\bnine\b/gi, '9'],
    [/\b10\b/g, 'ten'], [/\bten\b/gi, '10'],
    [/\b11\b/g, 'eleven'], [/\beleven\b/gi, '11'],
    [/\b12\b/g, 'twelve'], [/\btwelve\b/gi, '12']
  ];

  // British vs American Spelling Pairs in IELTS
  const spellingPairs = [
    [/\bcolour\b/gi, 'color'], [/\bcolor\b/gi, 'colour'],
    [/\bfavourite\b/gi, 'favorite'], [/\bfavorite\b/gi, 'favourite'],
    [/\bflavour\b/gi, 'flavor'], [/\bflavor\b/gi, 'flavour'],
    [/\bhonour\b/gi, 'honor'], [/\bhonor\b/gi, 'honour'],
    [/\bneighbour\b/gi, 'neighbor'], [/\bneighbor\b/gi, 'neighbour'],
    [/\bhumour\b/gi, 'humor'], [/\bhumor\b/gi, 'humour'],
    [/\btheatre\b/gi, 'theater'], [/\btheater\b/gi, 'theatre'],
    [/\bcentre\b/gi, 'center'], [/\bcenter\b/gi, 'centre'],
    [/\bmetre\b/gi, 'meter'], [/\bmeter\b/gi, 'metre'],
    [/\blitre\b/gi, 'liter'], [/\bliter\b/gi, 'litre'],
    [/\borganise\b/gi, 'organize'], [/\borganize\b/gi, 'organise'],
    [/\borganised\b/gi, 'organized'], [/\borganized\b/gi, 'organised'],
    [/\borganisation\b/gi, 'organization'], [/\borganization\b/gi, 'organisation'],
    [/\brealise\b/gi, 'realize'], [/\brealize\b/gi, 'realise'],
    [/\brealised\b/gi, 'realized'], [/\brealized\b/gi, 'realised'],
    [/\brecognise\b/gi, 'recognize'], [/\brecognize\b/gi, 'recognise'],
    [/\banalyse\b/gi, 'analyze'], [/\banalyze\b/gi, 'analyse'],
    [/\bpractise\b/gi, 'practice'], [/\bpractice\b/gi, 'practise'],
    [/\blicence\b/gi, 'license'], [/\blicense\b/gi, 'licence'],
    [/\btravelling\b/gi, 'traveling'], [/\btraveling\b/gi, 'travelling'],
    [/\btravelled\b/gi, 'traveled'], [/\btraveled\b/gi, 'travelled'],
    [/\bcancelled\b/gi, 'canceled'], [/\bcanceled\b/gi, 'cancelled'],
    [/\bmodelling\b/gi, 'modeling'], [/\bmodeling\b/gi, 'modelling'],
    [/\bprogramme\b/gi, 'program'], [/\bprogram\b/gi, 'programme'],
    [/\bcatalogue\b/gi, 'catalog'], [/\bcatalog\b/gi, 'catalogue'],
    [/\bdialogue\b/gi, 'dialog'], [/\bdialog\b/gi, 'dialogue']
  ];

  // IELTS Pronoun / Context Abbreviations (sb -> somebody, sth -> something, so -> someone, sw -> somewhere)
  const pronounAbbrevPairs = [
    [/\bsb's\b/gi, "somebody's"], [/\bsomebody's\b/gi, "sb's"],
    [/\bsb\b/gi, 'somebody'], [/\bsomebody\b/gi, 'sb'],
    [/\bsth\b/gi, 'something'], [/\bsomething\b/gi, 'sth'],
    [/\bso\b/gi, 'someone'], [/\bsomeone\b/gi, 'so'],
    [/\bsw\b/gi, 'somewhere'], [/\bsomewhere\b/gi, 'sw']
  ];

  // IELTS Units of Measurement & Time
  const unitPairs = [
    [/\b(\d+)\s*kms?\b/gi, '$1 kilometres'],
    [/\b(\d+)\s*kilometres?\b/gi, '$1 km'],
    [/\b(\d+)\s*kilometers?\b/gi, '$1 km'],
    [/\b(\d+)\s*m\b/gi, '$1 metres'],
    [/\b(\d+)\s*metres?\b/gi, '$1 m'],
    [/\b(\d+)\s*meters?\b/gi, '$1 m'],
    [/\b(\d+)\s*cms?\b/gi, '$1 centimetres'],
    [/\b(\d+)\s*centimetres?\b/gi, '$1 cm'],
    [/\b(\d+)\s*centimeters?\b/gi, '$1 cm'],
    [/\b(\d+)\s*kgs?\b/gi, '$1 kilograms'],
    [/\b(\d+)\s*kilograms?\b/gi, '$1 kg'],
    [/\b(\d+)\s*hrs?\b/gi, '$1 hours'],
    [/\b(\d+)\s*hours?\b/gi, '$1 hr'],
    [/\b(\d+)\s*mins?\b/gi, '$1 minutes'],
    [/\b(\d+)\s*minutes?\b/gi, '$1 min'],
    [/\b(\d+)\s*secs?\b/gi, '$1 seconds'],
    [/\b(\d+)\s*seconds?\b/gi, '$1 sec'],
    [/\b(\d+)\s*wks?\b/gi, '$1 weeks'],
    [/\b(\d+)\s*weeks?\b/gi, '$1 wk'],
    [/\b(\d+)\s*yrs?\b/gi, '$1 years'],
    [/\b(\d+)\s*years?\b/gi, '$1 yr']
  ];

  // IELTS Form & Note Abbreviations
  const formAbbrevPairs = [
    [/\bapprox\.?\b/gi, 'approximately'], [/\bapproximately\b/gi, 'approx.'],
    [/\binfo\.?\b/gi, 'information'], [/\binformation\b/gi, 'info.'],
    [/\bdept\.?\b/gi, 'department'], [/\bdepartment\b/gi, 'dept.'],
    [/\btel\.?\b/gi, 'telephone'], [/\btelephone\b/gi, 'tel.'],
    [/\bno\.?\b/gi, 'number'], [/\bnumber\b/gi, 'no.'],
    [/\be\.g\.?\b/gi, 'for example'], [/\bfor example\b/gi, 'e.g.'],
    [/\bi\.e\.?\b/gi, 'that is'], [/\bthat is\b/gi, 'i.e.']
  ];

  // Compound Words (hyphen <-> space <-> solid)
  const compoundPairs = [
    [/\bwell-being\b/gi, 'wellbeing'], [/\bwellbeing\b/gi, 'well-being'],
    [/\btimetable\b/gi, 'time table'], [/\btime table\b/gi, 'timetable'],
    [/\bpostbox\b/gi, 'post box'], [/\bpost box\b/gi, 'postbox'],
    [/\bcheck-in\b/gi, 'check in'], [/\bcheck in\b/gi, 'check-in']
  ];

  // Currency & Percentage Symbols
  const symbolPairs = [
    [/\$(\d+)\b/g, '$1 dollars'],
    [/(\d+)\$/g, '$1 dollars'],
    [/£(\d+)\b/g, '$1 pounds'],
    [/(\d+)\s*%/g, '$1 percent'],
    [/(\d+)\s*percent\b/gi, '$1%'],
    [/(\d+)\s*per cent\b/gi, '$1%']
  ];

  // Pass 1: Raw string cleaning & structural variants (parentheses, hyphens)
  for (const s of list) {
    if (!s || typeof s !== 'string') continue;
    const clean = s.normalize('NFKC').trim().replace(/\s+/gu, ' ');
    if (!clean) continue;
    result.add(clean);

    // 1A. Parentheses handling:
    // Plural marker: "student(s)" -> "student", "students"
    if (/\(\s*s\s*\)/i.test(clean)) {
      result.add(clean.replace(/\(\s*s\s*\)/gi, '').replace(/\s+/gu, ' ').trim());
      result.add(clean.replace(/\(\s*s\s*\)/gi, 's').replace(/\s+/gu, ' ').trim());
    }
    // General optional brackets: "(the) hospital" -> "hospital", "the hospital"
    if (/\([^)]+\)/.test(clean)) {
      result.add(clean.replace(/\(([^)]+)\)/g, '').replace(/\s+/gu, ' ').trim());
      result.add(clean.replace(/\(([^)]+)\)/g, '$1').replace(/\s+/gu, ' ').trim());
    }

    // 1B. Hyphenation vs space: "full-time" <-> "full time"
    const words = clean.split(' ');
    if (/-/.test(clean)) {
      result.add(clean.replace(/(\w)-(\w)/g, '$1 $2'));
    } else if (clean.includes(' ') && words.length === 2) {
      result.add(clean.replace(/ /g, '-'));
    }
  }

  // Pass 2: Word substitutions (contractions, numbers, spelling, pronouns, units, abbreviations, compounds, symbols)
  const allSubPairs = [
    ...contractionPairs,
    ...numberPairs,
    ...spellingPairs,
    ...pronounAbbrevPairs,
    ...unitPairs,
    ...formAbbrevPairs,
    ...compoundPairs,
    ...symbolPairs
  ];

  for (let pass = 0; pass < 2; pass++) {
    const currentItems = Array.from(result);
    for (const item of currentItems) {
      for (const [pattern, replacement] of allSubPairs) {
        if (pattern.global) pattern.lastIndex = 0;
        if (pattern.test(item)) {
          if (pattern.global) pattern.lastIndex = 0;
          result.add(item.replace(pattern, replacement));
        }
      }
    }
  }

  // Pass 3: Periods and question marks
  const afterSubstitutions = Array.from(result);
  for (const item of afterSubstitutions) {
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

  // Pass 4: Commas
  const afterPeriods = Array.from(result);
  for (const item of afterPeriods) {
    if (item.includes(',')) {
      result.add(item.replace(/,/gu, '').replace(/\s+/gu, ' ').trim());
    }
  }

  // Pass 5: Apostrophes (' <-> ’)
  const afterCommas = Array.from(result);
  for (const item of afterCommas) {
    if (item.includes("'")) {
      result.add(item.replace(/'/gu, '’'));
    }
    if (item.includes('’')) {
      result.add(item.replace(/’/gu, "'"));
    }
  }

  return Array.from(result).filter(Boolean).slice(0, 60);
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

export function formatOptionDisplayLetter(optId, index = 0) {
  if (typeof optId === 'string') {
    const trimmed = optId.trim();
    const matchOptLetter = trimmed.match(/^opt_([a-zA-Z])$/i);
    if (matchOptLetter) return matchOptLetter[1].toUpperCase();
    const matchOptNum = trimmed.match(/^opt_([0-9]+)$/i);
    if (matchOptNum) {
      const num = parseInt(matchOptNum[1], 10);
      if (num >= 1 && num <= 26) return String.fromCharCode(64 + num);
    }
    if (/^[A-Za-z]$/.test(trimmed)) return trimmed.toUpperCase();
  }
  const safeIdx = typeof index === 'number' && index >= 0 ? index : 0;
  return String.fromCharCode(65 + safeIdx);
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
  close: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  chevronDown: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
  chevronUp: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>',
  chevronRight: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronLeft: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>',
  arrowUp: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>',
  arrowDown: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>',
  arrowRight: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  table: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M12 3v18"/></svg>',
  image: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
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
  trash: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
  upload: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  download: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  fileText: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  bold: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>',
  italic: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
  underline: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>',
  strike: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>',
  heading: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>',
  listUl: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  listOl: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
  alignLeft: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
  alignCenter: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>',
  alignRight: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>',
  removeFormat: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V4h16v3"/><path d="M5 20h6"/><path d="M13 4 8 20"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="21" y1="15" x2="15" y2="21"/></svg>',
  plusCircle: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  layers: '<svg class="icon-inline" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  chart: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  award: '<svg class="icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
};

export function renderSvgIcon(name, customClass = '') {
  const icon = ICONS[name];
  if (!icon) return '';
  if (!customClass) return icon;
  if (icon.includes('class="')) {
    return icon.replace('class="', `class="${customClass} `);
  }
  return icon.replace('<svg ', `<svg class="${customClass}" `);
}

export function parseVocabPairCsv(rawText = '') {
  const result = {
    validRows: [],
    invalidRows: []
  };

  if (!rawText || typeof rawText !== 'string') {
    return result;
  }

  const cleaned = rawText.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/);
  let checkedHeader = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let col1 = '';
    let col2 = '';

    if (line.includes('\t')) {
      const parts = line.split('\t');
      col1 = (parts[0] || '').trim();
      col2 = parts.slice(1).join('\t').trim();
    } else if (line.includes(',')) {
      const parts = line.split(',');
      col1 = (parts[0] || '').trim().replace(/^["']|["']$/g, '');
      col2 = parts.slice(1).join(',').trim().replace(/^["']|["']$/g, '');
    } else {
      col1 = trimmed;
      col2 = '';
    }

    if (!checkedHeader) {
      checkedHeader = true;
      const c1Low = col1.toLowerCase();
      const c2Low = col2.toLowerCase();
      if (
        (c1Low === 'english' && c2Low === 'vietnamese') ||
        (c1Low.includes('tiếng anh') && c2Low.includes('tiếng việt')) ||
        (c1Low === 'word' && c2Low === 'meaning') ||
        (c1Low === 'từ vựng' && c2Low === 'nghĩa')
      ) {
        return;
      }
    }

    if (col1 && col2) {
      result.validRows.push({ english: col1, vietnamese: col2 });
    } else {
      result.invalidRows.push({
        line: index + 1,
        raw: line,
        reason: !col2 ? 'Thiếu cột nghĩa tiếng Việt' : 'Thiếu cột từ tiếng Anh'
      });
    }
  });

  return result;
}

export function parseCsvRows(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return [];
  const cleaned = rawText.replace(/^\uFEFF/, '');
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  // Detect delimiter (default comma, fallback tab)
  const firstLine = cleaned.split(/\r?\n/)[0] || '';
  const delimiter = (!firstLine.includes(',') && firstLine.includes('\t')) ? '\t' : ',';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function generateSingleChoiceTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation,Points';
  const rows = [
    'The cruise departs ___ Miami every Monday.,at,from,on,in,B,Cụm từ "depart from somewhere",1',
    'She is interested ___ marine biology.,in,at,on,,A,Cấu trúc "interested in something",1',
    'The weather was ___ today.,good,bad,,,A,,1'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseSingleChoiceCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase());
  if (firstRow[0]?.includes('prompt') || firstRow[0]?.includes('question') || firstRow[1]?.includes('option')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const prompt = (row[0] || '').trim();
    const optA = (row[1] || '').trim();
    const optB = (row[2] || '').trim();
    const optC = (row[3] || '').trim();
    const optD = (row[4] || '').trim();
    const correctLetter = (row[5] || '').trim().toUpperCase();
    const explanation = (row[6] || '').trim();
    const rawScore = parseFloat(row[7]);
    const maxScore = !isNaN(rawScore) && rawScore > 0 ? rawScore : (defaultPoints || 1);

    if (!prompt || !optA || !optB || !correctLetter) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu đề bài, lựa chọn A/B hoặc đáp án đúng' });
      continue;
    }

    const options = [
      { id: 'opt_a', label: optA },
      { id: 'opt_b', label: optB }
    ];
    if (optC) options.push({ id: 'opt_c', label: optC });
    if (optD) options.push({ id: 'opt_d', label: optD });

    const layoutType = options.length === 2 ? 'grid_2' : (options.length === 3 ? 'grid_3' : 'grid_4');
    const letterMap = { A: 'opt_a', B: 'opt_b', C: 'opt_c', D: 'opt_d' };
    const expectedOptionId = letterMap[correctLetter] || 'opt_a';

    result.items.push({
      prompt,
      interactionType: 'single_choice',
      pedagogicalTypeCode: 'single_choice',
      layoutType,
      options,
      expectedOptionId,
      explanation,
      maxScore
    });
  }

  return result;
}

export function generateFitbTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Prompt,Target_Answer,Points';
  const rows = [
    'The capital of France is ___.,Paris,1',
    'Water freezes at ___ degrees Celsius.,0,1',
    'The Sun rises in the ___.,east,1',
    'She was born ___ 1995.,in,1',
    'He has lived in London ___ ten years.,for,1'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseFitbCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase());
  if (firstRow[0]?.includes('prompt') || firstRow[0]?.includes('đề') || firstRow[0]?.includes('câu') || firstRow[1]?.includes('answer') || firstRow[1]?.includes('đáp')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const prompt = (row[0] || '').trim();
    const targetAnswer = (row[1] || '').trim();
    const rawScore = parseFloat(row[2]);
    const maxScore = !isNaN(rawScore) && rawScore > 0 ? rawScore : (defaultPoints || 1);

    if (!prompt || !targetAnswer) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu đề bài hoặc đáp án đúng' });
      continue;
    }

    result.items.push({
      prompt,
      targetAnswer,
      maxScore
    });
  }

  return result;
}

export function isShortQaEligibleFor2Col(items) {
  if (!Array.isArray(items) || items.length <= 1) return false;
  return items.every(item => {
    const prompt = (item.prompt || '').trim();
    const clean = prompt.replace(/<[^>]+>/g, '').trim();
    const hasComplexHtml = /<(?:table|tbody|tr|td|th|img|figure|video|audio|blockquote|hr)\b/i.test(prompt);
    return clean.length > 0 && clean.length <= 100 && !hasComplexHtml;
  });
}

export function generateErrorCorrectionTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Original_Sentence,Error_Part,Correction,Accepted_Variants,Explanation';
  const rows = [
    'There are much people on the ship.,much,many,a lot of,Much dùng cho danh từ không đếm được',
    'He go to the port yesterday.,go,went,,Quá khứ đơn của go là went'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseErrorCorrectionCsv(rawText = '') {
  const rows = parseCsvRows(rawText);
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase());
  if (firstRow[0]?.includes('sentence') || firstRow[0]?.includes('câu') || firstRow[1]?.includes('error') || firstRow[1]?.includes('lỗi')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const originalSentence = (row[0] || '').trim();
    const errorPart = (row[1] || '').trim();
    const correction = (row[2] || '').trim();
    const variantsRaw = (row[3] || '').trim();
    const explanation = (row[4] || '').trim();

    if (!originalSentence || !errorPart || !correction) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu câu gốc, từ sai hoặc từ sửa đúng' });
      continue;
    }

    const accepted = [correction];
    if (variantsRaw) {
      variantsRaw.split(';').forEach(v => {
        const tr = v.trim();
        if (tr && !accepted.includes(tr)) accepted.push(tr);
      });
    }

    result.items.push({
      prompt: originalSentence,
      interactionType: 'error_correction',
      pedagogicalTypeCode: 'error_correction',
      targetWord: errorPart,
      accepted,
      explanation
    });
  }

  return result;
}

export function generateSentenceTransformationTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Original_Sentence,Mandatory_Keyword,Target_Sentence_With_Blank,Expected_Answer,Accepted_Variants';
  const rows = [
    "It is not necessary for you to book now.,HAVE,You __________ tickets now.,do not have to book,don't have to book",
    'The cruise is too expensive for us.,ENOUGH,We do not have __________ the cruise.,enough money for,enough funds for'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseSentenceTransformationCsv(rawText = '') {
  const rows = parseCsvRows(rawText);
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase());
  if (firstRow[0]?.includes('original') || firstRow[0]?.includes('sentence') || firstRow[1]?.includes('keyword') || firstRow[1]?.includes('từ khóa')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const originalSentence = (row[0] || '').trim();
    const keyword = (row[1] || '').trim().toUpperCase();
    const targetSentence = (row[2] || '').trim();
    const expectedAnswer = (row[3] || '').trim();
    const variantsRaw = (row[4] || '').trim();

    if (!originalSentence || !keyword || !expectedAnswer) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu câu gốc, từ khóa hoặc đáp án' });
      continue;
    }

    const accepted = [expectedAnswer];
    if (variantsRaw) {
      variantsRaw.split(';').forEach(v => {
        const tr = v.trim();
        if (tr && !accepted.includes(tr)) accepted.push(tr);
      });
    }

    result.items.push({
      prompt: originalSentence,
      interactionType: 'sentence_transformation',
      pedagogicalTypeCode: 'sentence_transformation',
      mandatoryKeyword: keyword,
      targetSentence: targetSentence || '(1) __________',
      accepted
    });
  }

  return result;
}

export function generateListeningOrderTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Section_Title,Event_Text,Correct_Order';
  const rows = [
    'Day 1 Itinerary,Welcome aboard meeting at main lounge,1',
    'Day 1 Itinerary,Safety drill and lifeboat inspection,2',
    "Day 1 Itinerary,Captain's dinner in dining hall,3",
    'Day 1 Itinerary,Evening musical performance on deck,4'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseListeningOrderCsv(rawText = '') {
  const rows = parseCsvRows(rawText);
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase());
  if (firstRow[0]?.includes('section') || firstRow[0]?.includes('title') || firstRow[1]?.includes('event')) {
    startIndex = 1;
  }

  const groups = new Map();

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const title = (row[0] || '').trim() || 'Bài nghe sắp xếp sự kiện';
    const text = (row[1] || '').trim();
    const rank = parseInt(row[2], 10);

    if (!text || isNaN(rank)) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu nội dung sự kiện hoặc thứ tự hợp lệ' });
      continue;
    }

    if (!groups.has(title)) {
      groups.set(title, []);
    }
    groups.get(title).push({ text, correctRank: rank });
  }

  groups.forEach((events, title) => {
    events.sort((a, b) => a.correctRank - b.correctRank);
    const listeningEvents = events.map((ev, idx) => ({
      id: `ev_${idx + 1}`,
      text: ev.text,
      correctRank: ev.correctRank
    }));

    result.items.push({
      prompt: title,
      interactionType: 'listening_order',
      pedagogicalTypeCode: 'listening_order',
      listeningEvents,
      maxScore: listeningEvents.length
    });
  });

  return result;
}

export function generateVocabPairTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'English,Vietnamese';
  const rows = [
    'destination,điểm đến',
    'itinerary,lịch trình chuyến đi',
    'resilient,kiên cường',
    'sustainable,bền vững',
    'environment,môi trường'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function batchGenerateExerciseVocabVariants(block, targetExercise, draftState) {
  if (!block || !Array.isArray(block.items) || !targetExercise || !draftState) return 0;
  const targetExerciseId = targetExercise.exerciseId;
  const vocabItems = block.items.filter(it => 
    it.exerciseId === targetExerciseId && it.interactionType === 'text_select_pair'
  );

  let updatedCount = 0;
  vocabItems.forEach(item => {
    const rawWord = (item.targetWord || item.prompt || '').trim();
    if (!rawWord) return;

    if (!draftState.gradingKey) draftState.gradingKey = { items: {} };
    if (!draftState.gradingKey.items) draftState.gradingKey.items = {};

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
    updatedCount++;
  });

  return updatedCount;
}

// Dashboard chạy local (run-local.sh) thì link học viên trỏ về static server local; production giữ nguyên link backend trả.
// `prod=1`: run-local.sh không chạy backend, nên trang học viên local phải gọi API production như dashboard.
// Khi dashboard kết nối với backend local (127.0.0.1:8788), link học viên kết nối trực tiếp với backend local (không thêm prod=1).
export function localStudentUrl(studentUrl, location, apiBase = '') {
  if (!studentUrl || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(location?.hostname || '')) return studentUrl;
  const url = new URL(studentUrl);
  const index = url.pathname.indexOf('/term-tests/');
  if (index < 0) return studentUrl;
  const isLocalApi = Boolean(apiBase && (apiBase.includes('127.0.0.1') || apiBase.includes('localhost')));
  if (isLocalApi) {
    url.searchParams.delete('prod');
  } else if (!url.searchParams.has('prod') && !apiBase) {
    url.searchParams.set('prod', '1');
  } else if (apiBase && (apiBase.includes('webtest.ducanhdev.com') || apiBase.includes('production'))) {
    url.searchParams.set('prod', '1');
  }
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

export function assignmentResultsExportPath(classId, assignmentId) {
  return `${assignmentResultsPath(classId, assignmentId)}/export`;
}

export function toggleExportXlsxButton(button, assignmentId) {
  if (button) button.hidden = !assignmentId;
}

function saveBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
}

// Dashboard xác thực bằng Bearer nên không dùng link trực tiếp: fetch → blob → tải xuống.
// Luôn xuất toàn bộ danh sách, không gửi tham số lọc/sắp xếp.
// onUnauthorized: 401 kết thúc phiên giống request() của dashboard.
export async function downloadResultsXlsx({ url, headers, button, status, fetchImpl = fetch, save = saveBlob, onUnauthorized = () => {} }) {
  const label = button.querySelector('span');
  const idleText = label.textContent;
  button.disabled = true;
  label.textContent = 'Đang xuất…';
  try {
    const response = await fetchImpl(url, { headers });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) onUnauthorized();
      throw new Error(payload.message || 'Không xuất được file xlsx.');
    }
    const filename = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') || '')?.[1] || 'KetQua.xlsx';
    save(await response.blob(), filename);
    // Chỉ xoá lỗi xuất cũ, giữ nguyên thông báo khác trên dòng trạng thái.
    if (status?.textContent.startsWith('Lỗi xuất xlsx')) status.textContent = '';
  } catch (error) {
    if (status) status.textContent = `Lỗi xuất xlsx: ${error.message}`;
  } finally {
    button.disabled = false;
    label.textContent = idleText;
  }
}

export function assignmentExamModePath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam-mode`;
}

export function assignmentSelfProctoringPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/self-proctoring`;
}

// Lý do toggle bị khoá, để giáo viên không phải đoán vì sao không bấm được.
export function examModeLockReason({ exitLimit, examMode, examSession } = {}) {
  // Server từ chối đổi Exam Mode khi phiên không còn ở trạng thái chờ (EXAM_SESSION_ALREADY_STARTED).
  if (examMode && examSession && examSession.status !== 'waiting') return 'Phiên thi đã bắt đầu nên không tắt được Exam Mode. Dùng "Chuyển sang Tự giám sát" sau khi hết hạn nộp.';
  return exitLimit === null || exitLimit === undefined ? '' : 'Bài đang bật Tự giám sát nên không bật được Exam Mode. Tắt Tự giám sát trước; nếu đã có học viên bắt đầu làm thì không tắt được nữa.';
}

export function selfProctoringLockReason({ examMode, examSession } = {}) {
  if (examMode) return 'Bài đang bật Exam Mode: tắt Exam Mode trước khi bật Tự giám sát.';
  if (examSession) return 'Bài đã chuyển từ Exam Mode sang Tự giám sát nên không đổi lại được; giới hạn thoát cố định.';
  return '';
}

export function selfProctoringRequestBody(enabled, rawLimit) {
  if (!enabled) return { exitLimit: null };
  const text = String(rawLimit ?? '').trim();
  if (!/^\d+$/.test(text)) throw new Error('Giới hạn thoát phải là số nguyên ≥ 0.');
  return { exitLimit: Number(text) };
}

// Chuyển Exam Mode đã kết thúc → Tự giám sát: một request duy nhất, N bắt buộc nhập, không có giá trị mặc định.
export function examSwitchRequestBody(rawLimit) {
  const text = String(rawLimit ?? '').trim();
  if (!/^\d+$/.test(text)) throw new Error('Giới hạn thoát phải là số nguyên ≥ 0.');
  return { enabled: false, switchTo: 'self-proctoring', exitLimit: Number(text) };
}

export function formatExamDeadline(iso, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return 'chưa xác định';
  const text = new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric', timeZone
  }).format(date);
  return `${text} (giờ Việt Nam, UTC+7)`;
}

// Khối chuyển chế độ chỉ dựa vào phiên thi do server trả về. Không so với Date.now() và không suy hạn 150 phút:
// việc cho chuyển hay không do server quyết định khi bấm; ở đây chỉ giải thích deadline cho giáo viên.
export function examSwitchView(assignment, { serverNow = null } = {}) {
  const session = assignment?.examSession;
  if (!assignment?.examMode || !session || !['running', 'ended'].includes(session.status)) return { visible: false };
  const deadline = formatExamDeadline(session.deadlineAt);
  const deadlineMs = Date.parse(session.deadlineAt);
  const serverNowMs = Date.parse(serverNow);
  let hint;
  if (session.status === 'ended') hint = 'Phiên thi đã kết thúc. Có thể chuyển sang Tự giám sát.';
  else if (!Number.isFinite(deadlineMs)) hint = 'Chưa xác định được hạn nộp của phiên thi; máy chủ sẽ từ chối chuyển cho đến khi có dữ liệu hợp lệ.';
  else if (Number.isFinite(serverNowMs) && serverNowMs >= deadlineMs) hint = `Phiên thi đã quá hạn nộp (${deadline}) theo đồng hồ máy chủ. Bấm chuyển để máy chủ chốt các bài còn dở và đổi chế độ.`;
  else hint = `Phiên thi đang diễn ra, hạn nộp ${deadline}. Chỉ chuyển được sau thời điểm này; máy chủ sẽ kiểm tra lại khi bạn bấm.`;
  return { visible: true, status: session.status, deadline, hint };
}

export function examSwitchErrorView(error) {
  const details = error?.details || {};
  switch (error?.code) {
    case 'EXAM_SESSION_STILL_RUNNING':
      return { text: `Phiên thi chưa kết thúc. Hạn nộp: ${formatExamDeadline(details.deadlineAt)}. Hãy chuyển sau thời điểm này.`, retryable: false };
    case 'EXAM_SETTLEMENT_PENDING':
      return { text: 'Hệ thống chưa chốt xong bài của phiên thi cũ nên chưa đổi chế độ. Chưa có gì bị thay đổi, hãy bấm Thử lại sau ít phút.', retryable: true };
    case 'INVALID_EXAM_DEADLINE':
    case 'INVALID_EXAM_SESSION':
      return { text: 'Không xác định được hạn nộp của phiên thi nên chưa thể chuyển. Hãy báo quản trị viên kiểm tra dữ liệu phiên thi.', retryable: false };
    case 'EXAM_SESSION_NOT_STARTED':
      return { text: 'Phiên thi chưa bắt đầu nên chưa thể chuyển sang Tự giám sát.', retryable: false };
    case 'SELF_PROCTORING_LOCKED':
      return { text: 'Bài đã chuyển sang Tự giám sát với giới hạn thoát khác, không thể đổi lại.', retryable: false };
    default:
      return { text: error?.message || 'Không chuyển được chế độ. Chưa có gì bị thay đổi, hãy thử lại.', retryable: true };
  }
}

export function examSwitchSuccessText(payload) {
  const limit = payload?.exitLimit;
  const lead = payload?.switched === false ? 'Bài đã ở Tự giám sát' : 'Đã chuyển sang Tự giám sát';
  return `${lead}: thoát quá ${limit} lần thì bài tự nộp. Chế độ mới chỉ áp dụng cho lượt làm bắt đầu từ bây giờ; điểm, lịch sử phiên thi và quyền làm lại được giữ nguyên, học viên đã nộp vẫn cần được cấp làm lại.`;
}

export function incidentCellText(student) {
  if (!student.attemptId) return '—';
  const count = student.incidentCount ?? 0;
  if (student.exitLimit === null || student.exitLimit === undefined) return String(count);
  return `${count}/${student.exitLimit}${student.autoSubmitted ? ' · Tự nộp do vượt giới hạn' : ''}`;
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

let activeUnsavedChangesGuard = null;

export function registerUnsavedChangesGuard(fn) {
  activeUnsavedChangesGuard = fn;
}

export function unregisterUnsavedChangesGuard(fn) {
  if (activeUnsavedChangesGuard === fn) {
    activeUnsavedChangesGuard = null;
  }
}

export function hasActiveUnsavedChanges() {
  try {
    return typeof activeUnsavedChangesGuard === 'function' ? Boolean(activeUnsavedChangesGuard()) : false;
  } catch (_) {
    return false;
  }
}

export function clearActiveUnsavedChanges() {
  activeUnsavedChangesGuard = null;
}

export function openUnsavedChangesModal({
  title = 'Các thay đổi chưa được lưu',
  subtitle = 'Bạn có các chỉnh sửa chưa lưu trong bài thi này',
  message = 'Nếu bạn thoát ra hoặc chuyển sang trang khác, tất cả các thay đổi vừa chỉnh sửa sẽ bị mất hoàn toàn.',
  stayText = 'Ở lại chỉnh sửa',
  discardText = 'Rời khỏi không lưu',
  onDiscard,
  onStay
} = {}) {
  if (typeof document === 'undefined') {
    const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(`${title}\n\n${message}`)
      : true;
    if (confirmed) {
      if (typeof onDiscard === 'function') onDiscard();
    } else {
      if (typeof onStay === 'function') onStay();
    }
    return;
  }

  let existing = document.querySelector('#modal-unsaved-changes');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const modal = document.createElement('div');
  modal.id = 'modal-unsaved-changes';
  modal.className = 'izone-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-unsaved-title');

  modal.innerHTML = `
    <div class="izone-modal-dialog modal-warning-dialog">
      <div class="izone-modal-header warning-header">
        <div class="modal-header-icon-warning">
          ${renderSvgIcon('alert', 'icon-lg')}
        </div>
        <div class="modal-title-wrap">
          <h3 id="modal-unsaved-title">${escapeHtml(title)}</h3>
          <p class="modal-subtitle">${escapeHtml(subtitle)}</p>
        </div>
        <button type="button" class="btn-close-modal" id="btn-close-unsaved-modal" aria-label="Đóng">&times;</button>
      </div>

      <div class="izone-modal-body">
        <div class="alert-warning-box">
          <div class="alert-warning-icon">${renderSvgIcon('alert', 'icon-inline')}</div>
          <div class="alert-warning-text">
            ${escapeHtml(message)}
          </div>
        </div>
        <p class="unsaved-hint-text">
          Hãy bấm <strong>"${escapeHtml(stayText)}"</strong> để tiếp tục lưu lại bài làm bằng nút <em>"Lưu bản nháp"</em> trước khi thoát.
        </p>
      </div>

      <div class="izone-modal-footer">
        <button type="button" class="btn btn-secondary" id="btn-stay-editing">
          ${renderSvgIcon('check', 'icon-inline')} ${escapeHtml(stayText)}
        </button>
        <button type="button" class="btn btn-danger" id="btn-discard-and-leave">
          ${renderSvgIcon('arrowRight', 'icon-inline')} ${escapeHtml(discardText)}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const closeModal = () => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  const btnStay = modal.querySelector('#btn-stay-editing');
  const btnDiscard = modal.querySelector('#btn-discard-and-leave');
  const btnClose = modal.querySelector('#btn-close-unsaved-modal');

  btnStay?.addEventListener('click', () => {
    closeModal();
    if (typeof onStay === 'function') onStay();
  });

  btnClose?.addEventListener('click', () => {
    closeModal();
    if (typeof onStay === 'function') onStay();
  });

  btnDiscard?.addEventListener('click', () => {
    closeModal();
    if (typeof onDiscard === 'function') onDiscard();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
      if (typeof onStay === 'function') onStay();
    }
  });

  btnStay?.focus();
}

export function openConfirmDeleteTestModal({ testKey, formVersionId, title, sessionNumber, phase, courseName, onConfirm }) {
  if (typeof document === 'undefined') return;
  let modal = document.querySelector('#modal-confirm-delete-test');
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }

  modal = document.createElement('div');
  modal.id = 'modal-confirm-delete-test';
  modal.className = 'izone-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-delete-title');

  const phaseText = phase ? `Phase ${phase}` : '—';
  const sessionText = sessionNumber ? `Buổi ${sessionNumber}` : '—';

  modal.innerHTML = `
    <div class="izone-modal-dialog modal-danger-dialog">
      <div class="izone-modal-header danger-header">
        <div class="modal-header-icon-danger">
          ${renderSvgIcon('trash', 'icon-lg')}
        </div>
        <div class="modal-title-wrap">
          <h3 id="modal-delete-title">Xác nhận xóa bài thi</h3>
          <p class="modal-subtitle">Thao tác này sẽ xóa vĩnh viễn đề thi khỏi hệ thống</p>
        </div>
        <button type="button" class="btn-close-modal" id="btn-close-delete-modal" aria-label="Đóng">&times;</button>
      </div>

      <div class="izone-modal-body">
        <div class="target-test-card">
          <div class="test-target-title">${escapeHtml(title || 'Bài thi')}</div>
          <div class="test-target-meta">
            <span class="meta-tag"><code>${escapeHtml(testKey || formVersionId || '—')}</code></span>
            <span class="meta-tag">${sessionText}</span>
            <span class="meta-tag">${phaseText}</span>
            ${courseName ? `<span class="meta-tag">${escapeHtml(courseName)}</span>` : ''}
          </div>
        </div>

        <div class="alert-danger-box">
          <div class="alert-danger-icon">${renderSvgIcon('alert', 'icon-inline')}</div>
          <div class="alert-danger-text">
            <strong>Cảnh báo nguy hiểm:</strong> Thao tác này sẽ xóa vĩnh viễn cấu trúc bài thi, các câu hỏi và đáp án liên quan. Hành động này <strong>KHÔNG THỂ HOÀN TÁC</strong>.
          </div>
        </div>

        <div class="confirmation-input-group">
          <label class="form-label" for="input-confirm-keyword">
            Vui lòng nhập chữ <strong class="danger-keyword">XÓA</strong> vào ô bên dưới để xác nhận:
          </label>
          <input type="text" id="input-confirm-keyword" class="form-control input-danger-confirm" placeholder="XÓA" autocomplete="off" />
        </div>
      </div>

      <div class="izone-modal-footer">
        <button type="button" class="btn btn-secondary" id="btn-cancel-delete">Hủy bỏ</button>
        <button type="button" class="btn btn-danger" id="btn-submit-delete" disabled>
          ${renderSvgIcon('trash', 'icon-inline')} Xác nhận xóa vĩnh viễn
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const inputKw = modal.querySelector('#input-confirm-keyword');
  const submitBtn = modal.querySelector('#btn-submit-delete');
  const cancelBtn = modal.querySelector('#btn-cancel-delete');
  const closeBtn = modal.querySelector('#btn-close-delete-modal');

  const closeModal = () => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  if (inputKw && submitBtn) {
    inputKw.addEventListener('input', () => {
      const val = inputKw.value.trim().toUpperCase();
      const isValid = (val === 'XÓA' || val === 'XOA');
      submitBtn.disabled = !isValid;
    });
    inputKw.focus();
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      closeModal();
      if (typeof onConfirm === 'function') {
        onConfirm({ formVersionId, testKey, title });
      }
    });
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

export function openCreateTestModal({ courseId, catalog = [], onSubmit, onCancel }) {
  if (typeof document === 'undefined') return;
  let modal = document.querySelector('#modal-create-test');
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }

  modal = document.createElement('div');
  modal.id = 'modal-create-test';
  modal.className = 'izone-modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'modal-create-title');

  const cid = Number(courseId || 1);
  const courseNames = { 1: '03', 2: '34', 3: '45' };
  const courseCode = courseNames[cid] || '34';

  const computeSuggested = (targetPhase) => {
    const list = Array.isArray(catalog) ? catalog : [];
    let relevant = list;
    if (targetPhase === 1) relevant = list.filter(it => Number(it.phase) === 1);
    else if (targetPhase === 2) relevant = list.filter(it => Number(it.phase) === 2);

    const maxSess = relevant.reduce((max, it) => Math.max(max, Number(it.sessionNumber) || 0), 0);
    const overallMaxSess = list.reduce((max, it) => Math.max(max, Number(it.sessionNumber) || 0), 0);
    const nextSess = maxSess > 0 ? (maxSess + 1) : (overallMaxSess + 1);
    const nextTestNum = relevant.length + 1;
    const phaseLabel = targetPhase ? ` (Phase ${targetPhase})` : '';
    const suggestedTitle = `IZONE · Khối ${courseCode}${phaseLabel} · Test ${nextTestNum}`;
    return { nextSess, suggestedTitle, nextTestNum };
  };

  const initialPhase = (cid === 2 || cid === 3) ? 1 : null;
  const initialData = computeSuggested(initialPhase);

  modal.innerHTML = `
    <div class="izone-modal-dialog modal-create-dialog">
      <div class="izone-modal-header">
        <div class="modal-header-icon-primary">
          ${renderSvgIcon('book', 'icon-lg')}
        </div>
        <div class="modal-title-wrap">
          <h3 id="modal-create-title">Khởi tạo bài thi mới</h3>
          <p class="modal-subtitle">Thiết lập lộ trình Buổi học và Giai đoạn (Phase) cho đề thi</p>
        </div>
        <button type="button" class="btn-close-modal" id="btn-close-create-modal" aria-label="Đóng">&times;</button>
      </div>

      <div class="izone-modal-body">
        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="create-course-select">Khối đào tạo:</label>
            <select id="create-course-select" class="form-select" disabled>
              <option value="1" ${cid === 1 ? 'selected' : ''}>Khối 03</option>
              <option value="2" ${cid === 2 ? 'selected' : ''}>Khối 34</option>
              <option value="3" ${cid === 3 ? 'selected' : ''}>Khối 45</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="create-phase-select">Giai đoạn (Phase):</label>
            <select id="create-phase-select" class="form-select">
              <option value="1" ${initialPhase === 1 ? 'selected' : ''}>Giai đoạn 1 (Phase 1)</option>
              <option value="2" ${initialPhase === 2 ? 'selected' : ''}>Giai đoạn 2 (Phase 2)</option>
              <option value="" ${initialPhase === null ? 'selected' : ''}>Không phân Phase (Đề tổng hợp)</option>
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-group">
            <label class="form-label" for="create-session-input">Buổi học (Session Number):</label>
            <input type="number" id="create-session-input" class="form-control" min="1" max="100" value="${initialData.nextSess}" required />
            <small class="form-hint">Số buổi học trong lộ trình đào tạo</small>
          </div>

          <div class="form-group">
            <label class="form-label" for="create-duration-input">Thời lượng làm bài (phút):</label>
            <input type="number" id="create-duration-input" class="form-control" min="5" max="300" value="60" required />
            <small class="form-hint">Thời gian đếm ngược thi chuẩn</small>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="create-title-input">Tên bài thi:</label>
          <input type="text" id="create-title-input" class="form-control" value="${escapeHtml(initialData.suggestedTitle)}" required placeholder="Ví dụ: IZONE · Khối 34 (Phase 1) · Test 5" />
          <small class="form-hint">Hiển thị trong phòng thi và bảng điểm học viên</small>
        </div>
      </div>

      <div class="izone-modal-footer">
        <button type="button" class="btn btn-secondary" id="btn-cancel-create">Hủy bỏ</button>
        <button type="button" class="btn btn-primary" id="btn-submit-create">
          + Khởi tạo bài thi
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const phaseSelect = modal.querySelector('#create-phase-select');
  const sessionInput = modal.querySelector('#create-session-input');
  const titleInput = modal.querySelector('#create-title-input');
  const durationInput = modal.querySelector('#create-duration-input');
  const submitBtn = modal.querySelector('#btn-submit-create');
  const cancelBtn = modal.querySelector('#btn-cancel-create');
  const closeBtn = modal.querySelector('#btn-close-create-modal');

  const closeModal = () => {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  };

  if (phaseSelect) {
    phaseSelect.addEventListener('change', () => {
      const pVal = phaseSelect.value ? Number(phaseSelect.value) : null;
      const data = computeSuggested(pVal);
      if (sessionInput) sessionInput.value = data.nextSess;
      if (titleInput) titleInput.value = data.suggestedTitle;
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const title = (titleInput?.value || '').trim();
      const sess = Number(sessionInput?.value);
      const dur = Number(durationInput?.value) || 60;
      const phase = phaseSelect?.value ? Number(phaseSelect.value) : null;

      if (!title) {
        alert('Vui lòng nhập tên bài thi.');
        titleInput?.focus();
        return;
      }
      if (!sess || sess <= 0) {
        alert('Vui lòng nhập số buổi học hợp lệ.');
        sessionInput?.focus();
        return;
      }

      closeModal();
      if (typeof onSubmit === 'function') {
        onSubmit({
          courseId: cid,
          phase,
          sessionNumber: sess,
          title,
          durationMinutes: dur
        });
      }
    });
  }

  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
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

  let cardsHtml = '';
  if (!catalog || catalog.length === 0) {
    cardsHtml = `
      <div class="empty-catalog-state">
        <svg class="empty-catalog-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <p>Chưa có bài thi nào trong danh mục của khối này.</p>
      </div>
    `;
  } else {
    const renderTestRows = (items) => {
      return items.map(item => {
        const isPublished = item.status === 'published';
        const badgeClass = isPublished ? 'badge-published' : 'badge-draft';
        const badgeText = isPublished ? 'Đã công bố' : 'Bản nháp';
        const sessionLabel = `Buổi ${item.sessionNumber}`;
        const phaseBadge = item.phase ? `<span class="phase-pill">Phase ${item.phase}</span>` : '<span class="text-muted">—</span>';
        const subCount = Number(item.submissionCount || 0);
        // Allow delete if 0 submissions (both drafts and published tests without submissions)
        const canDelete = subCount === 0;

        return `
          <div class="test-card test-row" data-test-key="${item.testKey || ''}" data-test-id="${item.id || ''}">
            <div class="col-session">
              <span class="session-badge">${sessionLabel}</span>
            </div>
            <div class="col-phase">
              ${phaseBadge}
            </div>
            <div class="col-title">
              <span class="test-card-title">${escapeHtml(item.title || '—')}</span>
            </div>
            <div class="col-meta">
              <div class="test-card-meta">
                <span class="meta-item test-key-tag">
                  ${renderSvgIcon('book', 'icon-inline')}
                  <code>${escapeHtml(item.testKey || '—')}</code>
                </span>
                <span class="meta-item version-tag" title="${item.formVersionId || ''}">
                  ${renderSvgIcon('lock', 'icon-inline')}
                  <span>${item.formVersionId ? item.formVersionId.slice(0, 8) + '...' : '—'}</span>
                </span>
              </div>
            </div>
            <div class="col-status">
              <span class="status-badge ${badgeClass}">${badgeText}</span>
              ${subCount > 0 ? `<span class="submission-count-tag" title="${subCount} học viên đã nộp bài">${subCount} bài nộp</span>` : ''}
            </div>
            <div class="col-actions">
              <div class="test-row-actions">
                <button type="button" class="btn btn-secondary btn-sm btn-edit-test" data-test-key="${item.testKey || ''}" data-form-version-id="${item.formVersionId || ''}">
                  ${renderSvgIcon('edit', 'icon-inline')} Chỉnh sửa
                </button>
                ${canDelete ? `
                  <button type="button" class="btn btn-outline-danger btn-sm btn-delete-test-draft btn-delete-test" data-test-key="${item.testKey || ''}" data-form-version-id="${item.formVersionId || ''}" data-title="${escapeHtml(item.title || '')}" data-session="${item.sessionNumber || ''}" data-phase="${item.phase || ''}" title="Xóa bài thi này">
                    ${renderSvgIcon('trash', 'icon-inline')} Xóa
                  </button>
                ` : `
                  <span class="action-locked" title="Đã có bài nộp — Không thể xóa">${renderSvgIcon('lock', 'icon-inline')}</span>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('');
    };

    const phase1Items = catalog.filter(it => Number(it.phase) === 1);
    const phase2Items = catalog.filter(it => Number(it.phase) === 2);
    const otherItems = catalog.filter(it => !it.phase || (Number(it.phase) !== 1 && Number(it.phase) !== 2));
    const hasPhases = phase1Items.length > 0 || phase2Items.length > 0;

    const renderPhaseTableGroup = (groupTitle, phaseTag, items) => {
      if (!items || items.length === 0) return '';
      return `
        <div class="test-phase-group">
          <div class="test-phase-header">
            <div class="phase-title-badge">
              ${phaseTag ? `<span class="phase-pill-large">${phaseTag}</span>` : ''}
              <h3 class="phase-group-heading">${groupTitle}</h3>
            </div>
            <span class="phase-count-pill">${items.length} bài thi</span>
          </div>
          <div class="test-table-wrapper">
            <div class="test-table-header">
              <div class="col-session">Buổi</div>
              <div class="col-phase">Phase</div>
              <div class="col-title">Tên bài thi</div>
              <div class="col-meta">Mã đề & Định danh</div>
              <div class="col-status">Trạng thái</div>
              <div class="col-actions">Thao tác</div>
            </div>
            <div class="test-table-body">
              ${renderTestRows(items)}
            </div>
          </div>
        </div>
      `;
    };

    if (hasPhases) {
      cardsHtml = `
        <div class="test-catalog-tables">
          ${renderPhaseTableGroup('Giai đoạn 1 · Nền tảng & Kỹ năng', 'Phase 1', phase1Items)}
          ${renderPhaseTableGroup('Giai đoạn 2 · Tăng tốc & Luyện thi', 'Phase 2', phase2Items)}
          ${renderPhaseTableGroup('Đề thi chung & Tổng hợp', (phase1Items.length > 0 || phase2Items.length > 0) ? 'Tổng hợp' : '', otherItems)}
        </div>
      `;
    } else {
      cardsHtml = `
        <div class="test-catalog-tables">
          ${renderPhaseTableGroup('Lộ trình các bài thi theo buổi', '', catalog)}
        </div>
      `;
    }
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
      ${cardsHtml}
    </div>
  `;

  if (typeof options.onCourseChange === 'function' && typeof container.querySelectorAll === 'function') {
    const courseBtns = container.querySelectorAll('.btn-course-tab');
    courseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = Number(btn.getAttribute('data-course-id'));
        options.onCourseChange(cid);
      });
    });
  }

  if (typeof options.onAddTest === 'function' && typeof container.querySelector === 'function') {
    const addBtn = container.querySelector('#btn-add-test');
    if (addBtn) {
      addBtn.addEventListener('click', options.onAddTest);
    }
  }

  if (typeof options.onEditTest === 'function' && typeof container.querySelectorAll === 'function') {
    const editBtns = container.querySelectorAll('.btn-edit-test');
    editBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const testKey = btn.getAttribute('data-test-key');
        const formVersionId = btn.getAttribute('data-form-version-id');
        options.onEditTest({ testKey, formVersionId });
      });
    });
  }

  if (typeof options.onDeleteDraft === 'function' && typeof container.querySelectorAll === 'function') {
    const delBtns = container.querySelectorAll('.btn-delete-test-draft, .btn-delete-test');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const testKey = btn.getAttribute('data-test-key');
        const formVersionId = btn.getAttribute('data-form-version-id');
        const title = btn.getAttribute('data-title');
        const sessionNumber = btn.getAttribute('data-session');
        const phase = btn.getAttribute('data-phase');
        if (!formVersionId) return;

        openConfirmDeleteTestModal({
          testKey,
          formVersionId,
          title,
          sessionNumber,
          phase,
          courseName: selectedCourseId === 1 ? 'Khối 03' : (selectedCourseId === 3 ? 'Khối 45' : 'Khối 34'),
          onConfirm: () => {
            options.onDeleteDraft({ testKey, formVersionId, title });
          }
        });
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

export function formPublishPreviewPath(apiBase = '') {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/publish-preview` : '/api/teacher/forms/publish-preview';
}

export function getCourseCodeFromCourseId(courseId) {
  const cid = Number(courseId);
  if (cid === 1 || courseId === '03' || courseId === 'course-03') return '03';
  if (cid === 3 || courseId === '45' || courseId === 'course-45') return '45';
  return '34';
}

export function filterClassesForCourse(classes = [], courseId) {
  const targetCode = getCourseCodeFromCourseId(courseId);
  const targetNum = targetCode === '03' ? 1 : (targetCode === '45' ? 3 : 2);
  return (classes || []).filter(c => {
    const rawCourse = String(c.courseCode || c.course_code || '').toLowerCase().replace(/^course-/, '');
    const cId = Number(c.courseId || c.course_id || 0);
    return rawCourse === targetCode || cId === targetNum || rawCourse.includes(targetCode);
  });
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

export function convertGoogleDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.includes('drive.google.com')) {
    let fileId = null;
    let resourceKey = null;

    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch) {
      fileId = fileDMatch[1];
    }

    if (!fileId) {
      const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch) {
        fileId = idParamMatch[1];
      }
    }

    const resKeyMatch = trimmed.match(/[?&]resourcekey=([a-zA-Z0-9_-]+)/);
    if (resKeyMatch) {
      resourceKey = resKeyMatch[1];
    }

    if (fileId) {
      let result = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
      if (resourceKey) {
        result += `&resourcekey=${resourceKey}`;
      }
      return result;
    }
  }

  return trimmed;
}

export function convertGoogleDriveAudioUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    let fileId = null;
    let resourceKey = null;

    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch) {
      fileId = fileDMatch[1];
    }

    if (!fileId) {
      const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch) {
        fileId = idParamMatch[1];
      }
    }

    const resKeyMatch = trimmed.match(/[?&]resourcekey=([a-zA-Z0-9_-]+)/);
    if (resKeyMatch) {
      resourceKey = resKeyMatch[1];
    }

    if (fileId) {
      let result = `https://docs.google.com/uc?export=download&id=${fileId}`;
      if (resourceKey) {
        result += `&resourcekey=${resourceKey}`;
      }
      return result;
    }
  }

  return trimmed;
}

export function renderStrictCandidateAudioDock(container, options = {}) {
  const rawUrl = options.audioUrl || '';
  let streamUrl = convertGoogleDriveAudioUrl(rawUrl);
  if (!streamUrl) return '';

  const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    let apiBase = '';
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === '127.0.0.1' || hostname === 'localhost';
      if (isLocal) {
        apiBase = (window.location.port === '8034' || window.location.port === '8788')
          ? ''
          : `${window.location.protocol}//${hostname}:8788`;
      } else if (hostname === 'webtest.ducanhdev.com') {
        apiBase = '';
      } else {
        apiBase = defaultApiBase();
      }
    }
    const cleanBase = apiBase ? apiBase.replace(/\/$/, '') : '';
    streamUrl = `${cleanBase}/api/teacher/media/drive-stream?id=${encodeURIComponent(fileId)}`;
  } else if (streamUrl.startsWith('assets/')) {
    streamUrl = `https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/${streamUrl}`;
  }

  const label = options.label || 'Bài nghe phần thi';
  const dockHtml = `
    <div class="strict-audio-dock candidate-audio-dock" data-audio-url="${escapeHtml(streamUrl)}">
      <div class="strict-audio-header">
        <span class="audio-badge">${renderSvgIcon('audio', 'icon-inline')} ${escapeHtml(label)}</span>
        <div class="audio-volume-control">
          <label class="volume-label" title="Âm lượng loa">
            ${renderSvgIcon('volume', 'icon-inline')}
          </label>
          <input type="range" class="candidate-audio-volume" min="0" max="1" step="0.05" value="1" aria-label="Âm lượng loa" />
          <output class="volume-output">100%</output>
        </div>
      </div>
      <div class="strict-audio-body">
        <button type="button" class="btn btn-primary btn-sm btn-start-listening">
          ${renderSvgIcon('play', 'icon-inline')} Bắt đầu nghe
        </button>
        <div class="audio-live-status" style="display:none;">
          <span class="dot"></span>
          <span class="status-text">Đang phát bài nghe…</span>
        </div>
        <div class="audio-ended-notice" style="display:none;">
          <span class="dot dot-ended" style="background:#12805c;"></span>
          <span class="audio-note">Đã phát xong · Audio chỉ được nghe một lần.</span>
        </div>
      </div>
      <audio class="audio-hidden-element" src="${escapeHtml(streamUrl)}" preload="none" style="position:absolute;width:1px;height:1px;opacity:0.001;pointer-events:none;"></audio>
    </div>
  `;

  if (container && typeof container === 'object') {
    container.innerHTML = dockHtml;
    const startBtn = container.querySelector('.btn-start-listening');
    const volumeInput = container.querySelector('.candidate-audio-volume');
    const volumeOutput = container.querySelector('.volume-output');
    const liveStatus = container.querySelector('.audio-live-status');
    const endedNotice = container.querySelector('.audio-ended-notice');
    const audioEl = container.querySelector('.audio-hidden-element');

    if (audioEl) {
      let hasStarted = false;
      let maxPlayedTime = 0;

      audioEl.muted = false;

      if (startBtn) {
        startBtn.addEventListener('click', async () => {
          if (hasStarted) return;
          hasStarted = true;
          startBtn.style.display = 'none';
          if (liveStatus) liveStatus.style.display = 'inline-flex';
          try {
            audioEl.muted = false;
            await audioEl.play();
          } catch (err) {
            console.error('Không thể tự động phát audio:', err);
          }
        });
      }

      if (volumeInput) {
        volumeInput.addEventListener('input', (e) => {
          const val = Number(e.target.value) || 0;
          audioEl.volume = val;
          audioEl.muted = false;
          if (volumeOutput) {
            volumeOutput.textContent = `${Math.round(val * 100)}%`;
          }
        });
      }

      if (typeof audioEl.addEventListener === 'function') {
        audioEl.addEventListener('timeupdate', () => {
          maxPlayedTime = Math.max(maxPlayedTime, audioEl.currentTime);
        });

        // Strict Exam Mode: Chặn dừng bài nghe (ngoại trừ khi kết thúc)
        audioEl.addEventListener('pause', () => {
          if (!audioEl.ended && hasStarted) {
            audioEl.play().catch(() => {});
          }
        });

        audioEl.addEventListener('ended', () => {
          if (liveStatus) liveStatus.style.display = 'none';
          if (endedNotice) endedNotice.style.display = 'inline-flex';
          if (startBtn) {
            startBtn.disabled = true;
          }
        });
      }
    }
  }

  return dockHtml;
}

export function initStrictCandidateAudioDocks(rootEl) {
  if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
  const docks = rootEl.querySelectorAll('.strict-audio-dock');
  docks.forEach(dock => {
    const startBtn = dock.querySelector('.btn-start-listening');
    const volumeInput = dock.querySelector('.candidate-audio-volume');
    const volumeOutput = dock.querySelector('.volume-output');
    const liveStatus = dock.querySelector('.audio-live-status');
    const endedNotice = dock.querySelector('.audio-ended-notice');
    const audioEl = dock.querySelector('.audio-hidden-element');

    if (!audioEl) return;
    let hasStarted = false;
    let maxPlayedTime = 0;

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        if (hasStarted) return;
        hasStarted = true;
        startBtn.style.display = 'none';
        if (liveStatus) liveStatus.style.display = 'inline-flex';
        try {
          await audioEl.play();
        } catch (err) {
          console.error('Không thể tự động phát audio:', err);
        }
      });
    }

    if (volumeInput) {
      volumeInput.addEventListener('input', (e) => {
        const val = Number(e.target.value) || 0;
        audioEl.volume = val;
        if (volumeOutput) {
          volumeOutput.textContent = `${Math.round(val * 100)}%`;
        }
      });
    }

    if (typeof audioEl.addEventListener === 'function') {
      audioEl.addEventListener('timeupdate', () => {
        maxPlayedTime = Math.max(maxPlayedTime, audioEl.currentTime);
      });

      // Strict Exam Mode: Chặn tua lại hoặc tua tiến
      audioEl.addEventListener('seeking', () => {
        if (Math.abs(audioEl.currentTime - maxPlayedTime) > 1.2) {
          audioEl.currentTime = maxPlayedTime;
        }
      });

      // Strict Exam Mode: Chặn dừng bài nghe (ngoại trừ khi kết thúc)
      audioEl.addEventListener('pause', () => {
        if (!audioEl.ended && hasStarted) {
          audioEl.play().catch(() => {});
        }
      });

      audioEl.addEventListener('ended', () => {
        if (liveStatus) liveStatus.style.display = 'none';
        if (endedNotice) endedNotice.style.display = 'inline-flex';
        if (startBtn) {
          startBtn.disabled = true;
        }
      });
    }
  });
}

export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (/^(?:javascript|data|file|http):/i.test(trimmed)) {
    return false;
  }

  if (/^https:\/\//i.test(trimmed)) {
    return true;
  }
  if (/^\/?assets\//i.test(trimmed)) {
    return true;
  }

  return false;
}

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

export function renderRichHtmlEditor(container, {
  value = '',
  onChange = null,
  placeholder = '',
  onInsertBlankToken = null
} = {}) {
  if (!container) return null;

  const sanitized = sanitizeRichContent(value || '');

  container.innerHTML = `
    <div class="rich-editor rich-html-editor-wrap">
      <div class="rich-editor__toolbar rich-editor-toolbar">
        <div class="rich-editor__toolbar-left toolbar-group">
          <!-- Heading Dropdown -->
          <div class="rich-editor__control control-heading-select">
            <select class="form-select form-select-sm select-format-heading" title="Chọn cấp độ tiêu đề">
              <option value="p">Đoạn văn (Normal)</option>
              <option value="h2">Tiêu đề lớn (H2)</option>
              <option value="h3">Tiêu đề mục (H3)</option>
              <option value="h4">Tiêu đề nhỏ (H4)</option>
            </select>
          </div>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Inline Formatting Actions -->
          <button type="button" class="btn-editor-action btn-format-bold" title="Tô đậm (Bold - Ctrl+B)">
            ${renderSvgIcon('bold', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-italic" title="In nghiêng (Italic - Ctrl+I)">
            ${renderSvgIcon('italic', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-underline" title="Gạch chân (Underline - Ctrl+U)">
            ${renderSvgIcon('underline', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-strike" title="Gạch ngang (Strikethrough)">
            ${renderSvgIcon('strike', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Lists -->
          <button type="button" class="btn-editor-action btn-format-ul" title="Danh sách dấu chấm (Bullet List)">
            ${renderSvgIcon('listUl', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-ol" title="Danh sách số (Numbered List)">
            ${renderSvgIcon('listOl', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Alignment -->
          <button type="button" class="btn-editor-action btn-format-align-left" title="Căn trái">
            ${renderSvgIcon('alignLeft', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-align-center" title="Căn giữa">
            ${renderSvgIcon('alignCenter', 'icon-inline')}
          </button>
          <button type="button" class="btn-editor-action btn-format-align-right" title="Căn phải">
            ${renderSvgIcon('alignRight', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Clear Formatting -->
          <button type="button" class="btn-editor-action btn-format-clear" title="Xóa toàn bộ định dạng">
            ${renderSvgIcon('removeFormat', 'icon-inline')}
          </button>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Table Control & Popup -->
          <div class="rich-editor__control dropdown-table-wrap">
            <button type="button" class="btn-editor-action btn-rich-insert-table" title="Chèn Bảng dữ liệu">
              ${renderSvgIcon('table', 'icon-inline')} <span>Chèn bảng</span> ${renderSvgIcon('chevronDown', 'icon-inline')}
            </button>
            <div class="rich-editor__popup table-presets-menu" style="display: none;">
              <strong>Tạo bảng nhanh</strong>
              <div class="rich-editor__table-options">
                <button type="button" class="btn-table-grid" data-rows="2" data-cols="2">2 cột × 2 dòng</button>
                <button type="button" class="btn-table-grid" data-rows="3" data-cols="3">3 cột × 3 dòng</button>
                <button type="button" class="btn-table-grid" data-rows="4" data-cols="2">2 cột × 4 dòng</button>
                <button type="button" class="btn-table-grid" data-rows="5" data-cols="4">4 cột × 5 dòng</button>
              </div>
              <small>Số dòng chưa tính dòng tiêu đề.</small>
              <div class="rich-editor__presets-section">
                <small>Mẫu sư phạm IELTS</small>
                <button type="button" class="btn-table-preset" data-preset="itinerary">Lịch trình chuyến đi (Itinerary)</button>
                <button type="button" class="btn-table-preset" data-preset="notes">Ghi chú bài nghe (Note Completion)</button>
                <button type="button" class="btn-table-preset" data-preset="vocabulary">Bảng từ vựng 4 cột (Vocabulary)</button>
              </div>
            </div>
          </div>

          <!-- Image Control & Popup -->
          <div class="rich-editor__control dropdown-image-wrap">
            <button type="button" class="btn-editor-action btn-rich-insert-image" title="Chèn ảnh (URL HTTPS hoặc Google Drive)">
              ${renderSvgIcon('image', 'icon-inline')} <span>Chèn ảnh</span>
            </button>
            <div class="rich-editor__popup image-insert-popup" style="display: none;">
              <label>
                Link ảnh
                <input type="url" class="input-image-link" placeholder="https://drive.google.com/file/d/..." />
              </label>
              <small>Ảnh Drive cần chia sẻ “Bất kỳ ai có đường liên kết”.</small>
              <div class="rich-editor__error popup-image-error" style="display: none; padding: 6px 10px; font-size: 12px; margin-top: 4px;"></div>
              <div class="rich-editor__actions">
                <button type="button" class="btn-confirm-insert-image">Chèn</button>
              </div>
            </div>
          </div>

          ${onInsertBlankToken ? `
            <button type="button" class="btn-editor-action btn-rich-insert-blank" title="Chèn chỗ trống tại vị trí con trỏ">
              + Chèn chỗ trống
            </button>
          ` : ''}
        </div>

        <div class="rich-editor__toolbar-right toolbar-group toolbar-mode-toggle">
          <button type="button" class="btn-editor-action btn-toggle-html-mode" title="Chuyển chế độ [Trực quan ⇄ Mã HTML]">
            &lt;/&gt; Mã HTML
          </button>
        </div>
      </div>

      <div class="rich-editor__content-area" style="position: relative;">
        <div class="rich-editor__content rich-editor-visual" contenteditable="true" spellcheck="false" data-placeholder="${escapeHtml(placeholder)}" role="textbox" aria-label="Nội dung bài" aria-multiline="true">${sanitized}</div>
        <textarea class="rich-editor__code rich-editor-code form-control" style="display: none;" rows="8">${escapeHtml(sanitized)}</textarea>
      </div>

      <div class="rich-editor__error general-editor-error" style="display: none;" role="alert"></div>

      <div class="rich-editor__footer">
        <span>Enter để xuống dòng. Shift+Enter để ngắt dòng mềm. Nhấp vào ô bảng để chỉnh sửa.</span>
      </div>
    </div>
  `;

  const visualEl = container.querySelector ? container.querySelector('.rich-editor-visual') : null;
  const codeEl = container.querySelector ? container.querySelector('.rich-editor-code') : null;
  const toggleBtn = container.querySelector ? container.querySelector('.btn-toggle-html-mode') : null;
  const tableBtn = container.querySelector ? container.querySelector('.btn-rich-insert-table') : null;
  const tableMenu = container.querySelector ? container.querySelector('.table-presets-menu') : null;
  const imageBtn = container.querySelector ? container.querySelector('.btn-rich-insert-image') : null;
  const imagePopup = container.querySelector ? container.querySelector('.image-insert-popup') : null;
  const imageLinkInput = container.querySelector ? container.querySelector('.input-image-link') : null;
  const confirmImageBtn = container.querySelector ? container.querySelector('.btn-confirm-insert-image') : null;
  const imageErrorEl = container.querySelector ? container.querySelector('.popup-image-error') : null;
  const generalErrorEl = container.querySelector ? container.querySelector('.general-editor-error') : null;
  const blankBtn = container.querySelector ? container.querySelector('.btn-rich-insert-blank') : null;

  // New Rich Text Controls
  const headingSelect = container.querySelector ? container.querySelector('.select-format-heading') : null;
  const boldBtn = container.querySelector ? container.querySelector('.btn-format-bold') : null;
  const italicBtn = container.querySelector ? container.querySelector('.btn-format-italic') : null;
  const underlineBtn = container.querySelector ? container.querySelector('.btn-format-underline') : null;
  const strikeBtn = container.querySelector ? container.querySelector('.btn-format-strike') : null;
  const ulBtn = container.querySelector ? container.querySelector('.btn-format-ul') : null;
  const olBtn = container.querySelector ? container.querySelector('.btn-format-ol') : null;
  const alignLeftBtn = container.querySelector ? container.querySelector('.btn-format-align-left') : null;
  const alignCenterBtn = container.querySelector ? container.querySelector('.btn-format-align-center') : null;
  const alignRightBtn = container.querySelector ? container.querySelector('.btn-format-align-right') : null;
  const clearBtn = container.querySelector ? container.querySelector('.btn-format-clear') : null;

  let savedRange = null;

  const saveSelection = () => {
    if (typeof window !== 'undefined' && window.getSelection) {
      const sel = window.getSelection();
      if (!visualEl || !sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (visualEl.contains && visualEl.contains(range.commonAncestorContainer)) {
        savedRange = range.cloneRange();
      }
    }
  };

  const closeAllPopups = () => {
    if (tableMenu && tableMenu.style) tableMenu.style.display = 'none';
    if (imagePopup && imagePopup.style) {
      imagePopup.style.display = 'none';
      if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
    }
  };

  const showError = (msg) => {
    if (generalErrorEl) {
      generalErrorEl.textContent = msg;
      if (generalErrorEl.style) generalErrorEl.style.display = 'flex';
      setTimeout(() => {
        if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
      }, 5000);
    }
  };

  const clearError = () => {
    if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
    if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
  };

  const syncToCode = () => {
    if (!visualEl) return;
    const raw = visualEl.innerHTML || '';
    const clean = sanitizeRichContent(raw);
    if (codeEl) codeEl.value = clean;
    if (typeof onChange === 'function') onChange(clean);
  };

  const syncToVisual = () => {
    if (!codeEl) return;
    const raw = codeEl.value || '';
    const clean = sanitizeRichContent(raw);
    if (visualEl) visualEl.innerHTML = clean;
    if (typeof onChange === 'function') onChange(clean);
  };

  const insertHtmlAtCursor = (htmlToInsert) => {
    if (!htmlToInsert) return;

    if (isCodeMode && codeEl) {
      const start = codeEl.selectionStart || codeEl.value.length;
      const end = codeEl.selectionEnd || codeEl.value.length;
      codeEl.value = codeEl.value.substring(0, start) + htmlToInsert + codeEl.value.substring(end);
      syncToVisual();
      return;
    }

    if (visualEl) {
      visualEl.focus?.();
      let range = savedRange;
      if (!range || (visualEl.contains && !visualEl.contains(range.commonAncestorContainer))) {
        if (typeof document !== 'undefined' && document.createRange) {
          range = document.createRange();
          range.selectNodeContents(visualEl);
          range.collapse(false);
        }
      }

      if (range && range.createContextualFragment) {
        range.deleteContents?.();
        const fragment = range.createContextualFragment(htmlToInsert);
        const lastNode = fragment.lastChild;
        range.insertNode?.(fragment);
        if (lastNode && range.setStartAfter) {
          range.setStartAfter(lastNode);
          range.collapse?.(true);
        }
        if (typeof window !== 'undefined' && window.getSelection) {
          const sel = window.getSelection();
          sel.removeAllRanges?.();
          sel.addRange?.(range);
          savedRange = range.cloneRange ? range.cloneRange() : range;
        }
      } else {
        visualEl.innerHTML += htmlToInsert;
      }
      syncToCode();
    }
  };

  let isCodeMode = false;

  if (toggleBtn) {
    toggleBtn.addEventListener?.('click', () => {
      isCodeMode = !isCodeMode;
      closeAllPopups();
      if (isCodeMode) {
        syncToCode();
        if (visualEl && visualEl.style) visualEl.style.display = 'none';
        if (codeEl && codeEl.style) codeEl.style.display = 'block';
        toggleBtn.classList?.add?.('active');
        toggleBtn.textContent = 'Trực quan';
      } else {
        syncToVisual();
        if (codeEl && codeEl.style) codeEl.style.display = 'none';
        if (visualEl && visualEl.style) visualEl.style.display = 'block';
        toggleBtn.classList?.remove?.('active');
        toggleBtn.textContent = '</> Mã HTML';
      }
    });
  }

  if (visualEl && visualEl.addEventListener) {
    visualEl.addEventListener('keyup', saveSelection);
    visualEl.addEventListener('mouseup', saveSelection);
    visualEl.addEventListener('input', syncToCode);
    visualEl.addEventListener('blur', syncToCode);

    // Advanced paste handler with DOMParser
    visualEl.addEventListener('paste', (event) => {
      const cd = event.clipboardData;
      if (!cd) return;

      const html = cd.getData?.('text/html');
      if (html && typeof DOMParser !== 'undefined') {
        const parsed = new DOMParser().parseFromString(html, 'text/html');
        const embeddedImages = Array.from(parsed.body.querySelectorAll('img')).filter(
          img => !/^https:/i.test(img.getAttribute('src') || '')
        );
        const hasImageFile = Array.from(cd.files || []).some(
          file => file.type && file.type.startsWith('image/')
        );

        if (embeddedImages.length || hasImageFile) {
          event.preventDefault?.();
          saveSelection();
          embeddedImages.forEach(img => img.remove());
          if (html) {
            insertHtmlAtCursor(parsed.body.innerHTML);
          } else {
            insertHtmlAtCursor(escapeHtml(cd.getData?.('text/plain') || ''));
          }
          showError('Hãy tải ảnh lên Google Drive rồi dùng nút “Chèn ảnh”.');
          return;
        }
      }

      if (cd.items) {
        for (let i = 0; i < cd.items.length; i++) {
          if (cd.items[i].type && cd.items[i].type.indexOf('image') !== -1) {
            event.preventDefault?.();
            showError('Hệ thống không hỗ trợ dán ảnh trực tiếp base64. Vui lòng dùng Google Drive.');
            return;
          }
        }
      }
    });

    visualEl.addEventListener('drop', (event) => {
      const hasImage = Array.from(event.dataTransfer?.files || []).some(
        file => file.type && file.type.startsWith('image/')
      );
      if (hasImage) {
        event.preventDefault?.();
        showError('Hãy dùng nút “Chèn ảnh” để nhập link ảnh.');
      }
    });
  }

  if (codeEl && codeEl.addEventListener) {
    codeEl.addEventListener('input', syncToVisual);
    codeEl.addEventListener('change', syncToVisual);
  }

  if (tableBtn && tableMenu) {
    tableBtn.addEventListener?.('mousedown', saveSelection);
    tableBtn.addEventListener?.('click', (e) => {
      e.stopPropagation?.();
      saveSelection();
      const isVisible = tableMenu.style?.display !== 'none';
      closeAllPopups();
      if (tableMenu.style) tableMenu.style.display = isVisible ? 'none' : 'grid';
    });

    const gridBtns = tableMenu.querySelectorAll?.('.btn-table-grid') || [];
    gridBtns.forEach?.(btn => {
      btn.addEventListener?.('click', (e) => {
        e.stopPropagation?.();
        const r = Number(btn.getAttribute('data-rows')) || 2;
        const c = Number(btn.getAttribute('data-cols')) || 2;
        closeAllPopups();
        const tblHtml = generateTableHtml(r, c) + '<p><br></p>';
        insertHtmlAtCursor(tblHtml);
      });
    });

    const presetBtns = tableMenu.querySelectorAll?.('.btn-table-preset') || [];
    presetBtns.forEach?.(btn => {
      btn.addEventListener?.('click', (e) => {
        e.stopPropagation?.();
        const preset = btn.getAttribute('data-preset');
        closeAllPopups();
        const tblHtml = generateTableHtml(null, null, preset) + '<p><br></p>';
        insertHtmlAtCursor(tblHtml);
      });
    });
  }

  if (imageBtn && imagePopup) {
    imageBtn.addEventListener?.('mousedown', saveSelection);
    imageBtn.addEventListener?.('click', (e) => {
      e.stopPropagation?.();
      saveSelection();
      const isVisible = imagePopup.style?.display !== 'none';
      closeAllPopups();
      if (imagePopup.style) {
        imagePopup.style.display = isVisible ? 'none' : 'grid';
        if (!isVisible && imageLinkInput) {
          imageLinkInput.value = '';
          clearError();
          setTimeout(() => imageLinkInput.focus?.(), 50);
        }
      }
    });

    const executeInsertImage = () => {
      const urlVal = imageLinkInput?.value?.trim() || '';
      if (!urlVal) {
        if (imageErrorEl) {
          imageErrorEl.textContent = 'Vui lòng nhập đường dẫn ảnh.';
          if (imageErrorEl.style) imageErrorEl.style.display = 'block';
        }
        return;
      }
      const converted = convertGoogleDriveImageUrl(urlVal);
      if (!validateImageUrl(converted)) {
        if (imageErrorEl) {
          imageErrorEl.textContent = 'Link không hợp lệ. Hãy dùng link HTTPS hoặc Google Drive.';
          if (imageErrorEl.style) imageErrorEl.style.display = 'block';
        }
        return;
      }
      const imgTag = `<img src="${escapeHtml(converted)}" alt="" />`;
      insertHtmlAtCursor(imgTag);
      closeAllPopups();
    };

    confirmImageBtn?.addEventListener?.('click', (e) => {
      e.stopPropagation?.();
      executeInsertImage();
    });

    imageLinkInput?.addEventListener?.('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault?.();
        executeInsertImage();
      }
    });
  }

  if (blankBtn && typeof onInsertBlankToken === 'function') {
    blankBtn.addEventListener?.('mousedown', saveSelection);
    blankBtn.addEventListener?.('click', () => {
      saveSelection();
      onInsertBlankToken(insertHtmlAtCursor);
    });
  }

  // Formatting commands execution
  const executeFormatCommand = (command, value = null) => {
    closeAllPopups();

    if (isCodeMode && codeEl) {
      const start = codeEl.selectionStart || 0;
      const end = codeEl.selectionEnd || 0;
      const selected = codeEl.value.substring(start, end);
      let replacement = selected;

      if (command === 'bold') replacement = `<strong>${selected}</strong>`;
      else if (command === 'italic') replacement = `<em>${selected}</em>`;
      else if (command === 'underline') replacement = `<u>${selected}</u>`;
      else if (command === 'strikeThrough') replacement = `<s>${selected}</s>`;
      else if (command === 'insertUnorderedList') replacement = `\n<ul>\n  <li>${selected || 'Mục danh sách'}</li>\n</ul>\n`;
      else if (command === 'insertOrderedList') replacement = `\n<ol>\n  <li>${selected || 'Mục danh sách'}</li>\n</ol>\n`;
      else if (command === 'formatBlock' && value) replacement = `\n<${value}>${selected}</${value}>\n`;
      else if (command === 'justifyLeft') replacement = `<div style="text-align: left;">${selected}</div>`;
      else if (command === 'justifyCenter') replacement = `<div style="text-align: center;">${selected}</div>`;
      else if (command === 'justifyRight') replacement = `<div style="text-align: right;">${selected}</div>`;
      else if (command === 'removeFormat') replacement = selected.replace(/<[^>]+>/g, '');

      codeEl.value = codeEl.value.substring(0, start) + replacement + codeEl.value.substring(end);
      syncToVisual();
      return;
    }

    if (visualEl) {
      visualEl.focus?.();
      if (typeof document !== 'undefined' && document.execCommand) {
        document.execCommand(command, false, value);
      }
      saveSelection();
      syncToCode();
    }
  };

  const bindFormatButton = (btn, command, value = null) => {
    if (!btn || typeof btn.addEventListener !== 'function') return;
    btn.addEventListener('mousedown', (e) => {
      e?.preventDefault?.();
    });
    btn.addEventListener('click', (e) => {
      e?.preventDefault?.();
      executeFormatCommand(command, value);
    });
  };

  bindFormatButton(boldBtn, 'bold');
  bindFormatButton(italicBtn, 'italic');
  bindFormatButton(underlineBtn, 'underline');
  bindFormatButton(strikeBtn, 'strikeThrough');
  bindFormatButton(ulBtn, 'insertUnorderedList');
  bindFormatButton(olBtn, 'insertOrderedList');
  bindFormatButton(alignLeftBtn, 'justifyLeft');
  bindFormatButton(alignCenterBtn, 'justifyCenter');
  bindFormatButton(alignRightBtn, 'justifyRight');
  bindFormatButton(clearBtn, 'removeFormat');

  if (headingSelect && typeof headingSelect.addEventListener === 'function') {
    headingSelect.addEventListener('mousedown', (e) => {
      saveSelection();
    });
    headingSelect.addEventListener('change', () => {
      const tag = headingSelect.value || 'p';
      executeFormatCommand('formatBlock', tag);
    });
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (e) => {
      if (!container.contains?.(e.target)) {
        closeAllPopups();
      }
    });
  }

  return {
    getValue: () => (isCodeMode && codeEl ? sanitizeRichContent(codeEl.value) : sanitizeRichContent(visualEl?.innerHTML || '')),
    setValue: (val) => {
      const clean = sanitizeRichContent(val || '');
      if (visualEl) visualEl.innerHTML = clean;
      if (codeEl) codeEl.value = clean;
    },
    insertHtml: insertHtmlAtCursor
  };
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

export function getItemSpanCount(item) {
  if (!item) return 1;
  const isListeningOrder = item.pedagogicalTypeCode === 'listening_order' ||
    item.layoutType === 'timeline_sequence' ||
    item.graderType === 'ordered_sequence' ||
    (Array.isArray(item.events) && item.events.length > 0);
  if (isListeningOrder) {
    return Math.max(1, Array.isArray(item.events) ? item.events.length : 1);
  }
  const isInlineCloze = item.pedagogicalTypeCode === 'inline_cloze' ||
    item.layoutType === 'inline_cloze' ||
    item.layoutType === 'inline_dropdown_table' ||
    (item.interactionType === 'short_text' && (
      (item.prompt && (/(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/.test(item.prompt))) ||
      (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0)
    ));
  if (isInlineCloze) {
    const blanksFromPrompt = parseClozeBlanks(item.prompt || '');
    const uniqueNums = new Set(blanksFromPrompt.map(b => Number(b.number)));
    if (item.clozeAnswers) {
      Object.keys(item.clozeAnswers).forEach(k => {
        const n = Number(k);
        if (!Number.isNaN(n)) uniqueNums.add(n);
        else uniqueNums.add(k);
      });
    }
    return Math.max(1, uniqueNums.size || blanksFromPrompt.length || 1);
  }
  return 1;
}

export function updatePromptPosition(prompt, newPos, span = 1) {
  if (typeof prompt !== 'string') return prompt;
  let updated = prompt;
  const posStr = (span > 1) ? `${newPos} – ${newPos + span - 1}` : `${newPos}`;
  if (/^Câu hỏi \d+(?:\s*[–\-]\s*\d+)?(:?)/i.test(updated)) {
    updated = updated.replace(/^Câu hỏi \d+(?:\s*[–\-]\s*\d+)?(:?)/i, `Câu hỏi ${posStr}$1`);
  } else if (/^Câu \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i.test(updated)) {
    updated = updated.replace(/^Câu \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i, `Câu ${posStr}$1`);
  } else if (/^Question \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i.test(updated)) {
    updated = updated.replace(/^Question \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i, `Question ${posStr}$1`);
  } else if (/^Điền vào ô trống câu \d+(?:\s*[–\-]\s*\d+)?(:?)/i.test(updated)) {
    updated = updated.replace(/^Điền vào ô trống câu \d+(?:\s*[–\-]\s*\d+)?(:?)/i, `Điền vào ô trống câu ${posStr}$1`);
  } else if (/^Từ vựng qua ảnh \d+/i.test(updated)) {
    updated = updated.replace(/^Từ vựng qua ảnh \d+/i, `Từ vựng qua ảnh ${newPos}`);
  } else if (/^Từ vựng câu \d+/i.test(updated)) {
    updated = updated.replace(/^Từ vựng câu \d+/i, `Từ vựng câu ${newPos}`);
  } else if (/^Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi \d+(:?)/i.test(updated)) {
    updated = updated.replace(/^Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi \d+(:?)/i, `Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi ${newPos}$1`);
  } else if (span === 1 && /\(\d+\) __________/i.test(updated)) {
    updated = updated.replace(/\(\d+\) __________/i, `(${newPos}) __________`);
  }
  return updated;
}

export function insertItemsIntoBlockExercise(block, targetEx, newItems) {
  if (!block) return;
  const itemsList = Array.isArray(newItems) ? newItems : (newItems ? [newItems] : []);
  if (!itemsList.length) return;
  block.items = block.items || [];

  for (const itm of itemsList) {
    if (targetEx) {
      itm.exerciseId = targetEx.exerciseId;
      itm.exerciseTitle = targetEx.title;
    }
  }

  if (!targetEx || !Array.isArray(block.exercises) || block.exercises.length <= 1) {
    block.items.push(...itemsList);
    return;
  }

  // 1. Check if targetEx already has items in block.items
  let lastItemIndex = -1;
  for (let i = block.items.length - 1; i >= 0; i--) {
    if (block.items[i].exerciseId === targetEx.exerciseId) {
      lastItemIndex = i;
      break;
    }
  }

  if (lastItemIndex !== -1) {
    block.items.splice(lastItemIndex + 1, 0, ...itemsList);
    return;
  }

  // 2. targetEx has no items yet in block.items:
  // Determine targetEx's position among block.exercises
  const targetExIdx = block.exercises.findIndex(e => e.exerciseId === targetEx.exerciseId);
  if (targetExIdx > 0) {
    let precedingLastIndex = -1;
    for (let p = targetExIdx - 1; p >= 0; p--) {
      const prevEx = block.exercises[p];
      for (let i = block.items.length - 1; i >= 0; i--) {
        if (block.items[i].exerciseId === prevEx.exerciseId) {
          precedingLastIndex = i;
          break;
        }
      }
      if (precedingLastIndex !== -1) break;
    }

    if (precedingLastIndex !== -1) {
      block.items.splice(precedingLastIndex + 1, 0, ...itemsList);
      return;
    }
  }

  // 3. If targetEx is the first exercise (index 0) and has no items yet,
  // or no preceding items found, check if there are succeeding exercises:
  if (targetExIdx !== -1) {
    for (let s = targetExIdx + 1; s < block.exercises.length; s++) {
      const nextEx = block.exercises[s];
      const firstNextIndex = block.items.findIndex(it => it.exerciseId === nextEx.exerciseId);
      if (firstNextIndex !== -1) {
        block.items.splice(firstNextIndex, 0, ...itemsList);
        return;
      }
    }
  }

  // Fallback: append to the end of block.items
  block.items.push(...itemsList);
}

export function reorderBlockItem(draftState, sourceBlockIdx, sourceItemIdx, targetBlockIdx, targetItemIdx, positionAbove = false, targetExerciseId = null) {
  const sourceBlock = draftState?.blocks?.[sourceBlockIdx];
  const targetBlock = draftState?.blocks?.[targetBlockIdx];
  if (!sourceBlock || !targetBlock || !sourceBlock.items || !targetBlock.items) return null;

  if (sourceBlockIdx === targetBlockIdx && sourceItemIdx === targetItemIdx) {
    return sourceBlock.items[sourceItemIdx] || null;
  }

  const [movedItem] = sourceBlock.items.splice(sourceItemIdx, 1);
  if (!movedItem) return null;

  let insertIdx = targetItemIdx;
  if (sourceBlockIdx === targetBlockIdx) {
    if (sourceItemIdx < targetItemIdx) {
      insertIdx = positionAbove ? targetItemIdx - 1 : targetItemIdx;
    } else {
      insertIdx = positionAbove ? targetItemIdx : targetItemIdx + 1;
    }
  } else {
    insertIdx = positionAbove ? targetItemIdx : targetItemIdx + 1;
  }

  insertIdx = Math.max(0, Math.min(targetBlock.items.length, insertIdx));

  if (targetExerciseId) {
    movedItem.exerciseId = targetExerciseId;
    const targetExObj = (targetBlock.exercises || []).find(ex => ex.exerciseId === targetExerciseId);
    if (targetExObj) {
      movedItem.exerciseTitle = targetExObj.title;
    }
  }

  targetBlock.items.splice(insertIdx, 0, movedItem);
  return movedItem;
}

export function moveItemToExercise(draftState, sourceBlockIdx, sourceItemIdx, targetBlockIdx, targetExerciseId) {
  const sourceBlock = draftState?.blocks?.[sourceBlockIdx];
  const targetBlock = draftState?.blocks?.[targetBlockIdx];
  if (!sourceBlock || !targetBlock || !sourceBlock.items) return null;

  const [movedItem] = sourceBlock.items.splice(sourceItemIdx, 1);
  if (!movedItem) return null;

  const targetExObj = (targetBlock.exercises || []).find(ex => ex.exerciseId === targetExerciseId);
  insertItemsIntoBlockExercise(targetBlock, targetExObj, movedItem);
  return movedItem;
}

export function openGenericBatchModal({
  title = 'Tạo câu hỏi hàng loạt',
  subtitle = '',
  defaultCount = 5,
  minCount = 1,
  maxCount = 50,
  defaultPoints = 1.0,
  extraConfigHtml = '',
  csvConfig = null,
  onConfirm,
  onSingle
} = {}) {
  if (typeof document === 'undefined') {
    if (typeof onSingle === 'function') onSingle({ count: 1, defaultPoints: defaultPoints || 1 });
    return null;
  }

  // Remove previous modal instance if already present to avoid dangling listeners
  let modal = document.querySelector('#generic-batch-modal');
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }

  modal = document.createElement('div');
  modal.id = 'generic-batch-modal';
  modal.className = 'modal-generic-batch-overlay modal-batch-vocab-overlay';
  document.body.appendChild(modal);

  modal.style.display = 'flex';

  const initialCount = Math.max(minCount, Math.min(maxCount, parseInt(defaultCount, 10) || minCount));
  const hasCsv = Boolean(csvConfig);

  modal.innerHTML = `
    <div class="modal-generic-batch-card modal-batch-vocab-card" style="max-width: 680px;" role="dialog" aria-modal="true" aria-labelledby="generic-batch-modal-title">
      <div class="modal-generic-batch-header modal-batch-vocab-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${hasCsv ? renderSvgIcon('fileText', 'icon-inline') : renderSvgIcon('plusCircle', 'icon-inline')}
          <h3 id="generic-batch-modal-title" style="margin: 0; font-size: 1.1rem; font-weight: 600;">${escapeHtml(title)}</h3>
        </div>
        <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
      </div>
      <div class="modal-generic-batch-body modal-batch-vocab-body" style="padding: 16px 20px;">
        ${subtitle ? `<div class="alert-notice alert-info" style="margin: 0 0 12px 0; padding: 10px 14px; font-size: 0.85rem;">${escapeHtml(subtitle)}</div>` : ''}

        ${hasCsv ? `
          <div class="modal-batch-tabs" role="tablist">
            <button type="button" class="modal-batch-tab-btn active" data-tab="csv" role="tab" aria-selected="true">
              ${renderSvgIcon('upload', 'icon-inline')} <span>Nhập từ CSV / Excel</span>
            </button>
            <button type="button" class="modal-batch-tab-btn" data-tab="stepper" role="tab" aria-selected="false">
              ${renderSvgIcon('plusCircle', 'icon-inline')} <span>Tạo nhanh câu trống</span>
            </button>
          </div>

          <div class="modal-batch-tab-panel active" data-panel="csv">
            <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-download-template">
                ${renderSvgIcon('download', 'icon-inline')} <span>Tải file mẫu CSV</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-trigger-csv-file">
                ${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file .CSV</span>
              </button>
              <input type="file" class="input-csv-file" accept=".csv,text/csv,text/plain,.tsv" style="display: none;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Hỗ trợ UTF-8 BOM, tab Excel hoặc dấu phẩy)</span>
            </div>

            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label" style="display: flex; justify-content: space-between; font-size: 0.875rem;">
                <strong>Dán các cột từ Excel / Sheets hoặc nội dung CSV:</strong>
                ${csvConfig.columnsHint ? `<span style="font-size: 0.8rem; color: #64748b;">${escapeHtml(csvConfig.columnsHint)}</span>` : ''}
              </label>
              <textarea class="form-control textarea-batch-csv" rows="7" placeholder="${escapeHtml(csvConfig.placeholder || 'Dán các dòng dữ liệu copy từ Excel hoặc file CSV...')}" style="font-family: monospace; font-size: 13px;"></textarea>
            </div>

            <div class="form-group" style="margin-top: 10px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <label class="form-label" style="margin: 0; font-size: 0.875rem;"><strong>Điểm mặc định mỗi câu:</strong></label>
              <input type="number" class="form-control input-batch-csv-points" min="0.25" max="100" step="0.25" value="${defaultPoints}" style="width: 85px; text-align: center; font-weight: 700; padding: 6px 10px;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Tự động áp dụng nếu dòng dữ liệu CSV không có điểm riêng)</span>
            </div>

            <div class="vocab-preview-summary csv-preview-summary" style="margin-top: 8px; font-size: 0.85rem; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; display: none;"></div>
          </div>

          <div class="modal-batch-tab-panel" data-panel="stepper" style="display: none;">
            <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 8px;">
              <div class="form-group batch-count-form-group">
                <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
                <div class="batch-count-stepper-wrap">
                  <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-down" title="Giảm 1 câu" aria-label="Giảm 1 câu">−</button>
                  <input type="number" class="form-control input-batch-count" min="${minCount}" max="${maxCount}" value="${initialCount}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                  <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-up" title="Tăng 1 câu" aria-label="Tăng 1 câu">+</button>
                </div>
                <span class="batch-count-hint" style="font-size: 0.8rem; color: #64748b;">(Tối thiểu ${minCount}, tối đa ${maxCount} câu)</span>
              </div>

              <div class="form-group batch-points-form-group">
                <label class="form-label"><strong>Điểm số mỗi câu:</strong></label>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <input type="number" class="form-control input-batch-points" min="0.25" max="100" step="0.25" value="${defaultPoints}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                  <span style="font-size: 0.9rem; font-weight: 600; color: #475569;">điểm</span>
                </div>
                <span class="batch-points-hint" style="font-size: 0.8rem; color: #64748b;">(Mặc định cho các câu được tạo)</span>
              </div>
            </div>
            ${extraConfigHtml ? `<div class="batch-extra-config">${extraConfigHtml}</div>` : ''}
          </div>
        ` : `
          <div style="display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 8px;">
            <div class="form-group batch-count-form-group">
              <label class="form-label"><strong>Tổng số câu hỏi cần tạo:</strong></label>
              <div class="batch-count-stepper-wrap">
                <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-down" title="Giảm 1 câu" aria-label="Giảm 1 câu">−</button>
                <input type="number" class="form-control input-batch-count" min="${minCount}" max="${maxCount}" value="${initialCount}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                <button type="button" class="btn btn-outline btn-batch-step btn-batch-step-up" title="Tăng 1 câu" aria-label="Tăng 1 câu">+</button>
              </div>
              <span class="batch-count-hint" style="font-size: 0.8rem; color: #64748b;">(Tối thiểu ${minCount}, tối đa ${maxCount} câu)</span>
            </div>

            <div class="form-group batch-points-form-group">
              <label class="form-label"><strong>Điểm số mỗi câu:</strong></label>
              <div style="display: flex; align-items: center; gap: 6px;">
                <input type="number" class="form-control input-batch-points" min="0.25" max="100" step="0.25" value="${defaultPoints}" style="width: 100px; text-align: center; font-weight: 700; font-size: 1.1rem;" />
                <span style="font-size: 0.9rem; font-weight: 600; color: #475569;">điểm</span>
              </div>
              <span class="batch-points-hint" style="font-size: 0.8rem; color: #64748b;">(Mặc định cho các câu được tạo)</span>
            </div>
          </div>
          ${extraConfigHtml ? `<div class="batch-extra-config">${extraConfigHtml}</div>` : ''}
        `}
      </div>
      <div class="modal-generic-batch-footer modal-batch-vocab-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; border-radius: 0 0 8px 8px;">
        <button type="button" class="btn btn-secondary btn-batch-single">
          + Chỉ tạo 1 câu thủ công
        </button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-close-batch-modal-btn">Hủy bỏ</button>
          ${hasCsv ? `
            <button type="button" class="btn btn-primary btn-batch-confirm btn-confirm-csv-import">
              ${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận nhập dữ liệu</span>
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-batch-confirm">Tạo ${initialCount} câu hỏi</button>
          `}
        </div>
      </div>
    </div>
  `;

  const countInput = modal.querySelector('.input-batch-count');
  const stepDownBtn = modal.querySelector('.btn-batch-step-down');
  const stepUpBtn = modal.querySelector('.btn-batch-step-up');
  const confirmBtn = modal.querySelector('.btn-batch-confirm');
  const singleBtn = modal.querySelector('.btn-batch-single');
  const closeBtn = modal.querySelector('.btn-close-batch-modal');
  const closeCancelBtn = modal.querySelector('.btn-close-batch-modal-btn');

  let activeTab = hasCsv ? 'csv' : 'stepper';

  const getSafeCount = () => {
    const raw = parseInt(countInput?.value, 10);
    if (isNaN(raw)) return minCount;
    return Math.max(minCount, Math.min(maxCount, raw));
  };

  const updateConfirmButton = (cnt) => {
    if (!confirmBtn) return;
    if (!hasCsv) {
      confirmBtn.textContent = `Tạo ${cnt} câu hỏi`;
    } else if (activeTab === 'csv') {
      confirmBtn.className = 'btn btn-primary btn-batch-confirm btn-confirm-csv-import';
      confirmBtn.innerHTML = `${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận nhập dữ liệu</span>`;
    } else {
      confirmBtn.className = 'btn btn-primary btn-batch-confirm';
      confirmBtn.innerHTML = `${renderSvgIcon('plusCircle', 'icon-inline')} <span>Tạo ${cnt} câu hỏi</span>`;
    }
  };

  if (hasCsv) {
    const tabBtns = modal.querySelectorAll('.modal-batch-tab-btn');
    const panels = modal.querySelectorAll('.modal-batch-tab-panel');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const targetTab = btn.getAttribute('data-tab');
        activeTab = targetTab;
        tabBtns.forEach(b => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        panels.forEach(p => {
          const isPanelActive = p.getAttribute('data-panel') === targetTab;
          p.classList.toggle('active', isPanelActive);
          p.style.display = isPanelActive ? 'block' : 'none';
        });
        updateConfirmButton(getSafeCount());
      });
    });
  }

  const handleStep = (delta) => {
    const cur = getSafeCount();
    const next = Math.max(minCount, Math.min(maxCount, cur + delta));
    if (countInput) countInput.value = next;
    updateConfirmButton(next);
  };

  if (stepDownBtn) {
    stepDownBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      handleStep(-1);
    });
  }

  if (stepUpBtn) {
    stepUpBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      handleStep(1);
    });
  }

  if (countInput) {
    countInput.addEventListener('input', () => {
      const val = parseInt(countInput.value, 10);
      if (!isNaN(val)) {
        const clamped = Math.max(minCount, Math.min(maxCount, val));
        updateConfirmButton(clamped);
      }
    });

    countInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.preventDefault) e.preventDefault();
        doConfirm();
      }
    });
  }

  let parsedItems = [];
  if (hasCsv) {
    const downloadBtn = modal.querySelector('.btn-download-template');
    if (downloadBtn && typeof csvConfig.getTemplateCsv === 'function') {
      downloadBtn.addEventListener('click', () => {
        const csvContent = csvConfig.getTemplateCsv();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', csvConfig.templateFileName || 'mau_cau_hoi.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }

    const triggerFileBtn = modal.querySelector('.btn-trigger-csv-file');
    const fileInput = modal.querySelector('.input-csv-file');
    const textarea = modal.querySelector('.textarea-batch-csv');
    const previewBox = modal.querySelector('.csv-preview-summary');

    const updatePreview = () => {
      if (!textarea || !previewBox) return;
      const val = textarea.value.trim();
      if (!val) {
        previewBox.style.display = 'none';
        return;
      }

      const parseFn = typeof csvConfig.parseCsv === 'function' ? csvConfig.parseCsv : () => ({ items: [] });
      const parsed = parseFn(val);
      parsedItems = parsed.items || [];
      previewBox.style.display = 'block';

      if (parsedItems.length === 0) {
        previewBox.innerHTML = `<span style="color: #ef4444; font-weight: 500;">Chưa tìm thấy câu hỏi hợp lệ nào. Vui lòng kiểm tra lại cấu trúc cột hoặc bấm “Tải file mẫu CSV” để xem định dạng chuẩn.</span>`;
      } else {
        let html = `<div style="color: #10b981; font-weight: 600; margin-bottom: 6px;">Tìm thấy ${parsedItems.length} câu hỏi hợp lệ.</div>`;
        if (parsed.invalidRows && parsed.invalidRows.length > 0) {
          html += `<div style="color: #f59e0b; font-size: 12px; margin-bottom: 6px;">Bỏ qua ${parsed.invalidRows.length} dòng không hợp lệ (Dòng: ${parsed.invalidRows.slice(0, 5).map(r => r.line).join(', ')}${parsed.invalidRows.length > 5 ? '...' : ''}).</div>`;
        }
        html += `<div class="csv-preview-items" style="max-height: 140px; overflow-y: auto; border-top: 1px dashed #cbd5e1; padding-top: 6px;">`;
        parsedItems.slice(0, 3).forEach((itm, idx) => {
          if (typeof csvConfig.renderPreviewRow === 'function') {
            html += `<div style="margin-bottom: 4px; font-size: 12px;">${csvConfig.renderPreviewRow(itm, idx + 1)}</div>`;
          } else {
            html += `<div style="margin-bottom: 4px; font-size: 12px;"><strong>Câu ${idx + 1}:</strong> ${escapeHtml(itm.prompt || '')}</div>`;
          }
        });
        if (parsedItems.length > 3) {
          html += `<div style="font-size: 11px; color: #64748b; font-style: italic;">... và ${parsedItems.length - 3} câu hỏi khác</div>`;
        }
        html += `</div>`;
        previewBox.innerHTML = html;
      }
    };

    if (triggerFileBtn && fileInput) {
      triggerFileBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          if (textarea) {
            textarea.value = evt.target.result || '';
            updatePreview();
          }
        };
        reader.readAsText(file, 'utf-8');
      });
    }

    if (textarea) {
      textarea.addEventListener('input', updatePreview);
    }
  }

  const pointsInput = modal.querySelector('.input-batch-points');
  const csvPointsInput = modal.querySelector('.input-batch-csv-points');

  if (pointsInput && csvPointsInput) {
    pointsInput.addEventListener('input', () => {
      csvPointsInput.value = pointsInput.value;
    });
    csvPointsInput.addEventListener('input', () => {
      pointsInput.value = csvPointsInput.value;
    });
  }

  const getSafePoints = () => {
    const pInput = activeTab === 'csv'
      ? (modal.querySelector('.input-batch-csv-points') || modal.querySelector('.input-batch-points'))
      : (modal.querySelector('.input-batch-points') || modal.querySelector('.input-batch-csv-points'));
    const raw = parseFloat(pInput?.value);
    if (isNaN(raw) || raw <= 0) return defaultPoints || 1.0;
    return Math.round(raw * 100) / 100;
  };

  let cleanupKeydown = null;

  const closeModal = () => {
    modal.style.display = 'none';
    if (cleanupKeydown) {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('keydown', cleanupKeydown);
      }
      cleanupKeydown = null;
    }
  };

  const doConfirm = () => {
    const finalCount = getSafeCount();
    const finalPoints = getSafePoints();
    const textarea = modal.querySelector('.textarea-batch-csv');
    const csvVal = textarea ? textarea.value.trim() : '';

    if (hasCsv && activeTab === 'csv' && csvVal) {
      if (parsedItems.length > 0 && typeof csvConfig.onImport === 'function') {
        closeModal();
        csvConfig.onImport(parsedItems, { defaultPoints: finalPoints });
        return;
      } else if (parsedItems.length === 0) {
        if (typeof alert === 'function') {
          alert('Dữ liệu CSV không hợp lệ hoặc chưa có câu hỏi nào. Vui lòng kiểm tra lại trước khi xác nhận.');
        } else if (typeof console !== 'undefined' && console.warn) {
          console.warn('Dữ liệu CSV không hợp lệ hoặc chưa có câu hỏi nào.');
        }
        return;
      }
    }

    closeModal();
    if (typeof onConfirm === 'function') {
      const resultObj = {
        count: finalCount,
        defaultPoints: finalPoints,
        modal,
        valueOf: () => finalCount,
        [Symbol.toPrimitive]: () => finalCount
      };
      onConfirm(resultObj, finalCount);
    }
  };

  const doSingle = () => {
    const finalPoints = getSafePoints();
    closeModal();
    if (typeof onSingle === 'function') {
      const resultObj = {
        count: 1,
        defaultPoints: finalPoints,
        modal,
        valueOf: () => 1,
        [Symbol.toPrimitive]: () => 1
      };
      onSingle(resultObj, 1);
    }
  };

  if (confirmBtn) {
    confirmBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      doConfirm();
    });
  }

  if (singleBtn) {
    singleBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      doSingle();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      closeModal();
    });
  }

  if (closeCancelBtn) {
    closeCancelBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      closeModal();
    });
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  cleanupKeydown = (e) => {
    if (e.key === 'Escape') {
      if (e.preventDefault) e.preventDefault();
      closeModal();
    }
  };
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('keydown', cleanupKeydown);
  }

  if (countInput) {
    setTimeout(() => {
      try {
        countInput.focus();
        countInput.select();
      } catch (_) {}
    }, 50);
  }

  return modal;
}

export function openCsvUploadModal(opts = {}) {
  const {
    title = 'Nhập câu hỏi từ file CSV',
    subtitle = '',
    templateFileName = 'mau_cau_hoi.csv',
    columnsHint = '',
    placeholder = '',
    getTemplateCsv = () => '',
    parseCsv = () => ({ items: [], invalidRows: [] }),
    renderPreviewRow = null,
    onImport = () => {},
    onSingle = null
  } = opts;

  return openGenericBatchModal({
    title,
    subtitle,
    defaultCount: 5,
    minCount: 1,
    maxCount: 50,
    csvConfig: {
      templateFileName,
      columnsHint,
      placeholder,
      getTemplateCsv,
      parseCsv,
      renderPreviewRow,
      onImport
    },
    onConfirm: ({ count }) => {},
    onSingle: typeof onSingle === 'function' ? onSingle : null
  });
}

export function computeTestBuilderScoreSummary(blocks = []) {
  let totalScore = 0;
  let totalQuestions = 0;
  const canonicalSkills = {
    listening: { code: 'listening', label: 'Listening', score: 0, count: 0, firstBlockIdx: null },
    reading: { code: 'reading', label: 'Reading', score: 0, count: 0, firstBlockIdx: null },
    writing: { code: 'writing', label: 'Writing', score: 0, count: 0, firstBlockIdx: null },
    speaking: { code: 'speaking', label: 'Speaking', score: 0, count: 0, firstBlockIdx: null }
  };
  const extraSkills = {};

  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  for (let bIdx = 0; bIdx < safeBlocks.length; bIdx++) {
    const block = safeBlocks[bIdx];
    const bTitle = block.title || '';
    for (const item of (block.items || [])) {
      const span = getItemSpanCount(item);
      const score = Number(item.maxScore) || 0;
      totalScore += score;
      totalQuestions += span;

      const rawSkill = (Array.isArray(item.skillCodes) && item.skillCodes[0]) || item.primarySkill || '';
      const normSkill = normalizeSkillCode(rawSkill, bTitle);

      if (canonicalSkills[normSkill]) {
        canonicalSkills[normSkill].score += score;
        canonicalSkills[normSkill].count += span;
        if (canonicalSkills[normSkill].firstBlockIdx === null) {
          canonicalSkills[normSkill].firstBlockIdx = bIdx;
        }
      } else {
        if (!extraSkills[normSkill]) {
          const lbl = CANONICAL_SKILL_LABELS[normSkill] || (normSkill.charAt(0).toUpperCase() + normSkill.slice(1));
          extraSkills[normSkill] = { code: normSkill, label: lbl, score: 0, count: 0, firstBlockIdx: bIdx };
        }
        extraSkills[normSkill].score += score;
        extraSkills[normSkill].count += span;
      }
    }
  }

  totalScore = Math.round(totalScore * 10) / 10;
  for (const k of Object.keys(canonicalSkills)) {
    canonicalSkills[k].score = Math.round(canonicalSkills[k].score * 10) / 10;
  }
  for (const k of Object.keys(extraSkills)) {
    extraSkills[k].score = Math.round(extraSkills[k].score * 10) / 10;
  }

  return {
    totalScore,
    totalQuestions,
    skills: [
      canonicalSkills.listening,
      canonicalSkills.reading,
      canonicalSkills.writing,
      canonicalSkills.speaking,
      ...Object.values(extraSkills).filter(s => s.count > 0 || s.score > 0)
    ]
  };
}

export function renderScoreSkillChipsHtml(skills = []) {
  return skills.map(skill => {
    const hasJump = typeof skill.firstBlockIdx === 'number';
    return `
      <div class="score-skill-chip skill-${escapeHtml(skill.code)}${hasJump ? ' has-jump' : ''}" ${hasJump ? `data-first-block-idx="${skill.firstBlockIdx}" role="button" tabindex="0"` : ''} title="${escapeHtml(skill.label)}: ${skill.score} điểm, ${skill.count} câu${hasJump ? ' (Bấm để nhảy đến phần này)' : ''}">
        <span class="skill-chip-dot"></span>
        <span class="skill-chip-name">${escapeHtml(skill.label)}</span>
        <span class="skill-chip-score"><strong>${skill.score}</strong> đ</span>
        <span class="skill-chip-count">(${skill.count} câu)</span>
      </div>
    `;
  }).join('');
}

export function renderBlockJumpTagsHtml(blocks = []) {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  return blocks.map((block, idx) => {
    const title = (block.title || `Phần ${idx + 1}`).trim();
    return `
      <button type="button" class="btn-block-jump-chip" data-block-idx="${idx}" title="Chuyển nhanh đến Phần ${idx + 1}: ${escapeHtml(title)}">
        <span class="block-jump-badge">Phần ${idx + 1}</span>
        <span class="block-jump-title">${escapeHtml(title)}</span>
      </button>
    `;
  }).join('');
}

export function renderBlocksNavCardHtml(blocks = []) {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  return `
    <div class="builder-blocks-nav-card panel" id="builder-blocks-nav-card" aria-label="Điều hướng nhanh các phần thi">
      <div class="blocks-nav-header">
        <div class="blocks-nav-title-wrap">
          <h4 class="blocks-nav-title">${renderSvgIcon('layers', 'icon-inline')} Điều hướng nhanh các phần thi</h4>
          <p class="blocks-nav-subtitle">Bấm vào phần thi để cuộn nhanh đến nội dung chỉnh sửa</p>
        </div>
      </div>
      <div class="blocks-nav-chips">
        ${renderBlockJumpTagsHtml(blocks)}
      </div>
    </div>
  `;
}

export function renderScoreBreakdownBarHtml(draftState) {
  const blocks = (draftState && draftState.blocks) || [];
  const summary = computeTestBuilderScoreSummary(blocks);
  return `
    <div class="builder-score-breakdown-bar" id="builder-score-breakdown-bar">
      <div class="score-bar-main-row">
        <div class="score-bar-total-tile">
          <div class="score-total-icon">${renderSvgIcon('chart', 'icon-inline')}</div>
          <div class="score-total-info">
            <span class="score-total-label">Tổng điểm đề:</span>
            <div class="score-total-num-wrap">
              <span class="score-total-val">${summary.totalScore}</span>
              <span class="score-total-unit">điểm</span>
              <span class="score-total-questions-badge score-total-questions">${summary.totalQuestions} câu hỏi</span>
            </div>
          </div>
        </div>
        <div class="score-bar-divider"></div>
        <div class="score-bar-skills-wrap">
          <span class="score-skills-label">Phân bố kỹ năng:</span>
          <div class="score-skills-chips">
            ${renderScoreSkillChipsHtml(summary.skills)}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderTestBuilderView(container, formVersionData = {}, options = {}) {
  if (!container) return;

  const matchedCatalogItem = Array.isArray(options.catalog)
    ? options.catalog.find(it => it.formVersionId === (formVersionData.id || formVersionData.formVersionId))
    : null;

  const draftState = {
    formVersionId: formVersionData.id || formVersionData.formVersionId || generateUuid(),
    formTemplateId: formVersionData.formTemplateId || '',
    version: Number(formVersionData.version || 1),
    status: formVersionData.status || 'draft',
    title: formVersionData.title || formVersionData.publicDefinition?.title || matchedCatalogItem?.title || 'Đề thi mới',
    phase: formVersionData.phase !== undefined
      ? formVersionData.phase
      : (formVersionData.publicDefinition?.phase !== undefined ? formVersionData.publicDefinition.phase : (matchedCatalogItem?.phase || null)),
    sessionNumber: formVersionData.sessionNumber || formVersionData.publicDefinition?.sessionNumber || matchedCatalogItem?.sessionNumber || null,
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
    if (typeof container?.querySelector === 'function') {
      const statusMsg = container.querySelector('#builder-status-msg');
      if (statusMsg && !statusMsg.classList.contains('saving') && !statusMsg.classList.contains('forked')) {
        statusMsg.className = 'builder-status-pill unsaved';
        statusMsg.innerHTML = `${renderSvgIcon('edit', 'icon-inline')} <span>Có thay đổi chưa lưu</span>`;
      }
    }
  }

  const unsavedGuardChecker = () => isDirty;
  registerUnsavedChangesGuard(unsavedGuardChecker);

  const collapsedCardKeys = new Set();

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

  function updatePromptPositionLocal(prompt, newPos, span = 1) {
    return updatePromptPosition(prompt, newPos, span);
  }

  function resequenceItemPositions() {
    const firstPos = draftState.blocks[0]?.items?.[0]?.position;
    let pos = (typeof firstPos === 'number' && firstPos > 2) ? firstPos : 1;
    for (const b of draftState.blocks) {
      for (const itm of b.items || []) {
        const span = getItemSpanCount(itm);
        itm.spanCount = span;
        itm.position = pos;
        if (itm.prompt) {
          itm.prompt = updatePromptPositionLocal(itm.prompt, pos, span);
        }
        pos += span;
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
      } else if (itm.interactionType === 'short_text') {
        const initialWord = itm.targetWord || ((itm.prompt && !/^Câu \d+/i.test(itm.prompt) && !/^Từ vựng qua ảnh \d+/i.test(itm.prompt)) ? itm.prompt : '');
        if (!draftState.gradingKey.items[itm.itemVersionId]) {
          draftState.gradingKey.items[itm.itemVersionId] = {
            graderType: 'accepted_text',
            accepted: initialWord ? [initialWord] : [],
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
        } else {
          const currentKey = draftState.gradingKey.items[itm.itemVersionId];
          if (Array.isArray(currentKey.accepted)) {
            currentKey.accepted = currentKey.accepted.filter(v => v !== 'answer' && v !== 'draft_placeholder');
            if (!currentKey.accepted.length && initialWord) {
              currentKey.accepted = [initialWord];
            }
          }
        }
      } else if (itm.interactionType === 'text_select_pair') {
        const initialWord = itm.targetWord || ((itm.prompt && !/^Từ vựng câu \d+/i.test(itm.prompt)) ? itm.prompt : '');
        if (!draftState.gradingKey.items[itm.itemVersionId]) {
          draftState.gradingKey.items[itm.itemVersionId] = {
            graderType: 'accepted_text_exact_option',
            accepted: initialWord ? [initialWord] : [],
            expectedOptionId: itm.options?.[0]?.id || 'opt_1',
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
        } else {
          const currentKey = draftState.gradingKey.items[itm.itemVersionId];
          if (Array.isArray(currentKey.accepted)) {
            currentKey.accepted = currentKey.accepted.filter(v => v !== 'answer' && v !== 'draft_placeholder');
            if (!currentKey.accepted.length && initialWord) {
              currentKey.accepted = [initialWord];
            }
          }
        }
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
      const isInlineCloze = (item.pedagogicalTypeCode === 'inline_cloze' || item.layoutType === 'inline_cloze' || (item.interactionType === 'short_text' && item.layoutType === 'inline_cloze')) && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isShortText = item.interactionType === 'short_text' && item.graderType !== 'rubric_async' && !isInlineCloze && !isPictorial && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
      const isVocabPair = item.interactionType === 'text_select_pair';
      const isRubricAsync = item.graderType === 'rubric_async';
      const hasRedundantPrompt = isVocabPair || isPictorial || isPronunciation || isSentenceRewrite || isSentenceReorder || isReadingMatching || isListeningOrder;

      let nextBlankNum = 1;
      if (isInlineCloze) {
        const detectedBlanks = parseClozeBlanks(item.prompt || '');
        const uniqueBlankNums = [];
        for (const b of detectedBlanks) {
          if (!uniqueBlankNums.includes(b.number)) uniqueBlankNums.push(b.number);
        }
        const maxBlankNum = uniqueBlankNums.length ? Math.max(...uniqueBlankNums) : (item.position || 1);
        nextBlankNum = uniqueBlankNums.length ? maxBlankNum + 1 : (item.position || 1);
      }

      const hasLongOption = (item.options || []).some(o => (o.label || '').length > 25);
      const layout = item.layoutType || (hasLongOption ? 'grid_1' : (item.options?.length === 3 ? 'grid_3' : (item.options?.length >= 4 ? 'grid_4' : 'grid_2')));
      const colsClass = layout === 'grid_1' ? 'grid-cols-1' : (layout === 'grid_3' ? 'grid-cols-3' : (layout === 'grid_4' ? 'grid-cols-4' : 'grid-cols-2'));

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
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-pronunciation-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án này" aria-label="Xóa phương án này">${renderSvgIcon('close', 'icon-inline')}</button>
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
                <div class="audio-input-with-preview" style="display:flex; gap:8px; align-items:center;">
                  <input type="text" class="form-control input-pronunciation-audio" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(audioUrl)}" placeholder="https://assets.izone.edu.vn/audio/... hoặc link Google Drive" style="flex:1;" />
                  <button type="button" class="btn btn-secondary btn-sm btn-preview-audio" data-target="pron" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Nghe thử file âm thanh">
                    ${renderSvgIcon('play', 'icon-inline')} Nghe thử
                  </button>
                </div>
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
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
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
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const distractorChipsHtml = distractors.map((d, dIdx) => `
          <span class="distractor-chip" data-distractor="${escapeHtml(d)}" data-distractor-idx="${dIdx}">
            <span class="chip-text"><span class="distractor-symbol">×</span> ${escapeHtml(d)}</span>
            <button type="button" class="btn-remove-distractor-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-distractor-idx="${dIdx}" title="Xóa từ gây nhiễu" aria-label="Xóa từ gây nhiễu">${renderSvgIcon('close', 'icon-inline')}</button>
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
            <button type="button" class="btn-remove-error-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const correctionChipsHtml = expectedCorrections.map(v => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-correction-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
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
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-matching-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án này" aria-label="Xóa phương án này">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `).join('');

        specificHtml = `
          <div class="template-section template-reading-matching">
            <div class="split-pane-header-bar">
              <span class="badge badge-info split-pane-preview-badge">${renderSvgIcon('book', 'icon-inline')} Bố cục chia đôi màn hình (Split-Pane 2 cột: Bài đọc bên trái, Câu hỏi bên phải)</span>
              ${detectedParagraphs.length ? `<span class="badge badge-success">Phát hiện ${detectedParagraphs.length} đoạn văn: [${detectedParagraphs.join(', ')}]</span>` : ''}
            </div>

            <div class="rich-editor rich-html-editor-wrap" style="margin-top: 8px;" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
              <div class="rich-editor__toolbar rich-editor-toolbar">
                <div class="rich-editor__toolbar-left toolbar-group">
                  <button type="button" class="btn btn-secondary btn-sm btn-extract-paragraphs" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Tự động nhận diện các đoạn văn Paragraph A, B, C...">
                    ${renderSvgIcon('search', 'icon-inline')} Quét nhãn đoạn văn
                  </button>
                  <div class="rich-editor__control control-heading-select">
                    <select class="form-select form-select-sm select-format-heading" title="Chọn cấp độ tiêu đề">
                      <option value="p">Đoạn văn (Normal)</option>
                      <option value="h2">Tiêu đề lớn (H2)</option>
                      <option value="h3">Tiêu đề mục (H3)</option>
                      <option value="h4">Tiêu đề nhỏ (H4)</option>
                    </select>
                  </div>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-bold" title="Tô đậm (Bold - Ctrl+B)">
                    ${renderSvgIcon('bold', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-italic" title="In nghiêng (Italic - Ctrl+I)">
                    ${renderSvgIcon('italic', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-underline" title="Gạch chân (Underline - Ctrl+U)">
                    ${renderSvgIcon('underline', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-strike" title="Gạch ngang (Strikethrough)">
                    ${renderSvgIcon('strike', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-ul" title="Danh sách dấu chấm (Bullet List)">
                    ${renderSvgIcon('listUl', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-ol" title="Danh sách số (Numbered List)">
                    ${renderSvgIcon('listOl', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-align-left" title="Căn trái">
                    ${renderSvgIcon('alignLeft', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-center" title="Căn giữa">
                    ${renderSvgIcon('alignCenter', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-right" title="Căn phải">
                    ${renderSvgIcon('alignRight', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <button type="button" class="btn-editor-action btn-format-clear" title="Xóa toàn bộ định dạng">
                    ${renderSvgIcon('removeFormat', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <div class="rich-editor__control dropdown-table-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-editor-action btn-rich-insert-table" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn Bảng dữ liệu">
                      ${renderSvgIcon('table', 'icon-inline')} <span>Chèn bảng</span> ${renderSvgIcon('chevronDown', 'icon-inline')}
                    </button>
                    <div class="rich-editor__popup table-presets-menu" style="display: none;">
                      <strong>Tạo bảng nhanh</strong>
                      <div class="rich-editor__table-options">
                        <button type="button" class="btn-table-grid" data-rows="2" data-cols="2">2 cột × 2 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="3" data-cols="3">3 cột × 3 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="4" data-cols="2">2 cột × 4 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="5" data-cols="4">4 cột × 5 dòng</button>
                      </div>
                      <small>Số dòng chưa tính dòng tiêu đề.</small>
                      <div class="rich-editor__presets-section">
                        <small>Mẫu sư phạm IELTS</small>
                        <button type="button" class="btn-table-preset" data-preset="itinerary">Lịch trình chuyến đi (Itinerary)</button>
                        <button type="button" class="btn-table-preset" data-preset="notes">Ghi chú bài nghe (Note Completion)</button>
                        <button type="button" class="btn-table-preset" data-preset="vocabulary">Bảng từ vựng 4 cột (Vocabulary)</button>
                      </div>
                    </div>
                  </div>
                  <div class="rich-editor__control dropdown-image-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-rich-insert-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn ảnh (URL HTTPS hoặc Google Drive)">
                      ${renderSvgIcon('image', 'icon-inline')} <span>Chèn ảnh</span>
                    </button>
                    <div class="rich-editor__popup image-insert-popup" style="display: none;">
                      <label>
                        Link ảnh
                        <input type="url" class="input-image-link" placeholder="https://drive.google.com/file/d/..." />
                      </label>
                      <small>Ảnh Drive cần chia sẻ “Bất kỳ ai có đường liên kết”.</small>
                      <div class="rich-editor__error popup-image-error" style="display: none; padding: 6px 10px; font-size: 12px; margin-top: 4px;"></div>
                      <div class="rich-editor__actions">
                        <button type="button" class="btn-confirm-insert-image">Chèn</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="rich-editor__toolbar-right toolbar-group">
                  <button type="button" class="btn btn-sm btn-ghost-subtle btn-toggle-html-mode" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chuyển chế độ [Trực quan ⇄ Mã HTML]">
                    &lt;/&gt; Mã HTML
                  </button>
                </div>
              </div>

              <div class="rich-editor__content-area" style="position: relative;">
                <div class="rich-editor__content rich-editor-visual" contenteditable="true" spellcheck="false" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">${sanitizeRichContent(passageText)}</div>
                <textarea class="rich-editor__code rich-editor-code form-control input-reading-passage" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="8" style="display: none;" placeholder="Nhập văn bản bài đọc tại đây (Hỗ trợ nhãn Paragraph A:, [B], Section C...)...">${escapeHtml(passageText)}</textarea>
              </div>

              <div class="rich-editor__error general-editor-error" style="display: none;" role="alert"></div>

              <div class="rich-editor__footer">
                Enter để xuống dòng. Shift+Enter để ngắt dòng mềm. Nhấp vào ô bảng để chỉnh sửa.
              </div>
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
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-event" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-event-idx="${eIdx}" title="Xóa sự kiện" aria-label="Xóa sự kiện">${renderSvgIcon('close', 'icon-inline')}</button>
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
              <div class="audio-input-with-preview" style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="form-control form-control-sm input-listening-audio" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(audioUrl)}" placeholder="assets/34/test-1/listening.mp3 hoặc link Google Drive" style="flex:1;" />
                <button type="button" class="btn btn-secondary btn-sm btn-preview-audio" data-target="item" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Nghe thử file âm thanh">
                  ${renderSvgIcon('play', 'icon-inline')} Nghe thử
                </button>
              </div>
            </div>

            <div class="template-header-bar" style="margin-top: 12px;">
              <span class="section-sublabel"><strong>Danh sách chuỗi sự kiện & Thứ tự chuẩn:</strong></span>
              <div class="validation-status-wrap">
                ${orderValidation.isValid 
                  ? `<span class="badge badge-success">${renderSvgIcon('check', 'icon-inline')} Thứ tự hợp lệ (${events.length} bước)</span>` 
                  : `<span class="badge badge-warning">${renderSvgIcon('alert', 'icon-inline')} Trùng hoặc thiếu thứ tự: ${orderValidation.duplicates.length ? `Trùng [#${orderValidation.duplicates.join(', ')}]` : ''} ${orderValidation.missingRanks.length ? `Thiếu [#${orderValidation.missingRanks.join(', ')}]` : ''}</span>`}
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
        const optionsHtml = (item.options || []).map((opt, optIdx) => {
          const letter = formatOptionDisplayLetter(opt.id, optIdx);
          return `
          <div class="option-item-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Chọn làm đáp án đúng">
              <input type="radio" name="radio_correct_${item.itemVersionId}" class="radio-correct" value="${opt.id}" ${opt.id === expectedId ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${letter}</span>
            </label>
            <input type="text" class="form-control option-label-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Phương án ${letter}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án" aria-label="Xóa phương án">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `;
        }).join('');

        specificHtml = `
          <div class="template-section template-single-choice">
            <div class="template-header-bar">
              <span class="section-sublabel">Các phương án lựa chọn (Tích tròn chọn đáp án đúng):</span>
              <div class="layout-selector-wrap">
                <span class="layout-title">Bố cục:</span>
                <select class="form-select form-select-sm select-layout" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  <option value="grid_1" ${layout === 'grid_1' ? 'selected' : ''}>1 cột (Xếp dọc - Phù hợp câu dài)</option>
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
        const optionsHtml = (item.options || []).map((opt, optIdx) => {
          const letter = formatOptionDisplayLetter(opt.id, optIdx);
          return `
          <div class="option-item-row" data-option-id="${opt.id}">
            <label class="option-select-label" title="Tích chọn đáp án đúng cho nhóm">
              <input type="checkbox" class="checkbox-correct" value="${opt.id}" ${expectedIds.includes(opt.id) ? 'checked' : ''} data-correct="${opt.id}">
              <span class="option-key-pill">${letter}</span>
            </label>
            <input type="text" class="form-control option-label-input" data-option-id="${opt.id}" value="${escapeHtml(opt.label || '')}" placeholder="Phương án ${letter}..." />
            <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-del-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa phương án" aria-label="Xóa phương án">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
        `;
        }).join('');

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
                  <option value="grid_1" ${layout === 'grid_1' ? 'selected' : ''}>1 cột (Xếp dọc - Phù hợp câu dài)</option>
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
        const detectedBlanks = parseClozeBlanks(item.prompt || '');
        const uniqueBlankNums = [];
        for (const b of detectedBlanks) {
          if (!uniqueBlankNums.includes(b.number)) {
            uniqueBlankNums.push(b.number);
          }
        }
        if (!uniqueBlankNums.length) {
          uniqueBlankNums.push(item.position || 1);
        }

        item.clozeAnswers = item.clozeAnswers || {};

        const blanksConfigHtml = uniqueBlankNums.map((bNum, idx) => {
          const bAnswer = item.clozeAnswers[bNum] || item.clozeAnswers[String(bNum)];
          let targetWord = bAnswer?.targetWord || (bAnswer?.accepted?.[0] || '');
          let accepted = bAnswer?.accepted || [];

          if (!targetWord && (uniqueBlankNums.length === 1 || idx === 0 || bNum === item.position)) {
            targetWord = item.targetWord || (itemKey.accepted?.[0] || '');
          }
          if (!accepted.length && (uniqueBlankNums.length === 1 || idx === 0 || bNum === item.position)) {
            accepted = itemKey.accepted || [];
          }

          const filteredAccepted = accepted.filter(v => v && v !== 'answer' && v !== 'draft_placeholder');
          const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
          const blankTargetVal = targetWord || (acceptedList[0] || '');

          const chipsHtml = acceptedList.map((v) => `
            <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
              <span class="chip-text">${escapeHtml(v)}</span>
              <button type="button" class="btn-remove-chip btn-remove-cloze-blank-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
            </span>
          `).join('');

          return `
            <div class="cloze-blank-config-card" data-blank-num="${bNum}" style="margin-top: 10px; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div class="cloze-blank-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                <span class="cloze-blank-badge" style="font-size: 0.85rem; font-weight: 700; color: #1e293b;">
                  Chỗ trống (${bNum})
                </span>
              </div>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-fitb-raw input-cloze-blank-target" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" value="${escapeHtml(blankTargetVal)}" placeholder="Nhập đáp án chuẩn cho chỗ trống (${bNum})..." />
                <button type="button" class="btn btn-secondary btn-sm btn-generate-variants btn-generate-cloze-blank-variants" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" title="Tự động sinh biến thể cho chỗ trống (${bNum})">
                  ${renderSvgIcon('zap', 'icon-inline')} Tự động sinh biến thể
                </button>
              </div>
              <div class="variant-chips-container" style="margin-top: 6px;">
                <div class="chips-meta-bar" style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <span class="chips-count-badge" style="font-size:0.75rem; color:#64748b;">Các biến thể được chấp nhận (${acceptedList.length}/40)</span>
                  <div class="quick-add-variant" style="flex:1; max-width:260px;">
                    <input type="text" class="form-control form-control-sm input-add-variant input-add-cloze-blank-variant" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-blank-num="${bNum}" placeholder="+ Thêm biến thể thủ công (Enter)..." />
                  </div>
                </div>
                <div class="variant-chips-wrap" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
                  ${chipsHtml}
                </div>
              </div>
            </div>
          `;
        }).join('');

        const maxBlankNum = uniqueBlankNums.length ? Math.max(...uniqueBlankNums) : (item.position || 1);
        const nextBlankNum = uniqueBlankNums.length ? maxBlankNum + 1 : (item.position || 1);
        const livePreviewHtml = renderInlineClozeMarkup(item.prompt || '', [item], {}, { disabled: true });

        specificHtml = `
          <div class="template-section template-inline-cloze">
            <div class="cloze-live-preview-box" style="margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px;">
              <span class="preview-mini-label" style="font-size: 0.76rem; font-weight: 700; color: #475569; text-transform: uppercase;">Xem trước hiển thị nội tuyến:</span>
              <div class="cloze-preview-content" style="margin-top: 6px; line-height: 1.75;">${livePreviewHtml || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>'}</div>
            </div>

            <div class="cloze-answers-config" style="margin-top: 12px;">
              <label class="form-label"><strong>Cấu hình đáp án chuẩn cho các chỗ trống (${uniqueBlankNums.length} chỗ trống):</strong></label>
              <div class="cloze-blanks-list">
                ${blanksConfigHtml}
              </div>
            </div>
          </div>
        `;
      } else if (isPictorial) {
        const rawAccepted = itemKey.accepted || [];
        const filteredAccepted = rawAccepted.filter(v => v && v !== 'answer' && v !== 'draft_placeholder' && !/^Từ vựng qua ảnh \d+/i.test(v));
        const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const rawTargetVal = item.targetWord || (acceptedList[0] || '') || (item.prompt && !/^Từ vựng qua ảnh \d+/i.test(item.prompt) ? item.prompt : '');
        const imgSrc = item.image || item.stimulusImageUrl || '';

        specificHtml = `
          <div class="template-section template-pictorial-vocab">
            <div class="pictorial-meta-grid">
              <div class="form-group pictorial-image-group">
                <label class="form-label"><strong>Ảnh minh họa (Image URL / Path / Google Drive Link):</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-pictorial-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(imgSrc)}" placeholder="assets/test 1/vocabulary/image1.png hoặc https://drive.google.com/..." />
                  <button type="button" class="btn btn-secondary btn-sm btn-preview-drive-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Xem trước ảnh hoặc chuyển đổi link Google Drive">
                    ${renderSvgIcon('eye', 'icon-inline')} Xem trước ảnh
                  </button>
                </div>
                <div class="pictorial-preview-wrap pictorial-thumb-preview" style="margin-top: 8px;">
                  <img class="pictorial-preview-img" src="${escapeHtml(imgSrc)}" alt="Image Preview" style="${imgSrc ? 'max-height: 180px; max-width: 100%; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain;' : 'display: none;'}" onerror="this.style.display='none'; const err = this.parentElement?.querySelector('.pictorial-preview-error'); if (err) err.style.display='inline-block';" onload="const err = this.parentElement?.querySelector('.pictorial-preview-error'); if (err) err.style.display='none'; this.style.display='inline-block';" />
                  <span class="pictorial-preview-error badge badge-warning" style="display: none; margin-top: 4px;">${renderSvgIcon('alert', 'icon-inline')} Không thể tải ảnh. Hãy kiểm tra lại link ảnh hoặc quyền chia sẻ công khai (Anyone with the link).</span>
                </div>
              </div>

              <div class="form-group pictorial-target-group">
                <label class="form-label"><strong>Từ / Cụm từ tiếng Anh chuẩn:</strong></label>
                <div class="fitb-input-group">
                  <input type="text" class="form-control input-pictorial-target input-fitb-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawTargetVal)}" placeholder="Nhập từ/cụm từ mẫu (ví dụ: school kids)..." />
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
        const rawAccepted = itemKey.accepted || [];
        const filteredAccepted = rawAccepted.filter(v => v && v !== 'answer' && v !== 'draft_placeholder');
        const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
          </span>
        `).join('');

        const rawFitbVal = item.targetWord || (acceptedList[0] || '') || (item.prompt && !/^Câu \d+/i.test(item.prompt) ? item.prompt : '');

        specificHtml = `
          <div class="template-section template-fitb">
            <div class="fitb-raw-box">
              <label class="form-label">Đáp án gốc (Nhập từ/câu mẫu để tự động mở rộng biến thể dấu câu, viết tắt, nháy đơn):</label>
              <div class="fitb-input-group">
                <input type="text" class="form-control input-fitb-raw" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${escapeHtml(rawFitbVal)}" placeholder="Nhập đáp án chuẩn..." />
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
        const filteredAccepted = rawAccepted.filter(v => v && !/^Từ vựng câu \d+/i.test(v) && v !== 'answer' && v !== 'draft_placeholder');
        const acceptedList = Array.from(new Set(filteredAccepted)).slice(0, 40);
        const chipsHtml = acceptedList.map((v) => `
          <span class="variant-chip accepted-chip" data-variant="${escapeHtml(v)}">
            <span class="chip-text">${escapeHtml(v)}</span>
            <button type="button" class="btn-remove-chip" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-variant="${escapeHtml(v)}" title="Xóa biến thể này" aria-label="Xóa biến thể này">${renderSvgIcon('close', 'icon-inline')}</button>
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
            <button type="button" class="btn btn-icon btn-sm btn-del-vocab-option" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-option-id="${opt.id}" title="Xóa nghĩa này" aria-label="Xóa nghĩa này">${renderSvgIcon('close', 'icon-inline')}</button>
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

        const rawVocabVal = item.targetWord || (acceptedList[0] || '') || (item.prompt && !/^Từ vựng câu \d+/i.test(item.prompt) ? item.prompt : '');

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
                <button type="button" class="btn btn-icon btn-sm btn-del-criterion" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-criterion-idx="${cIdx}" title="Xóa tiêu chí" aria-label="Xóa tiêu chí">${renderSvgIcon('close', 'icon-inline')}</button>
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
                  ${renderSvgIcon('clipboard', 'icon-inline')} Tiêu chí chấm điểm (${criteriaList.length})
                </button>
                <button type="button" class="btn-rubric-tab" data-tab="guidance" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('book', 'icon-inline')} Hướng dẫn Prompt nâng cao
                </button>
                <button type="button" class="btn-rubric-tab" data-tab="sandbox" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
                  ${renderSvgIcon('view', 'icon-inline')} Sandbox Chấm thử AI
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
          : (isSentenceReorder
            ? 'Sắp xếp câu (Sentence Reorder)'
            : (isErrorCorrection
              ? 'Tìm và sửa lỗi (Error Correction)'
              : (isReadingMatching
                ? 'Ghép nối (Reading Matching)'
                : (isListeningOrder
                  ? 'Sắp xếp thứ tự nghe (Listening Order)'
                  : (isSingleChoice
                    ? 'Trắc nghiệm 1 đáp án (Single Choice)'
                    : (isMultiGroup
                      ? 'Nhóm chọn nhiều (Multi-Select Group)'
                      : (isVocabPair
                        ? 'Cặp từ vựng (Vocabulary Pair - 50/50 Partial)'
                        : (isRubricAsync
                          ? 'Tự luận chấm AI (AI-Graded Rubric)'
                          : (isPictorial
                            ? 'Thẻ từ vựng qua ảnh (Pictorial Card)'
                            : (isInlineCloze
                              ? 'Điền từ nội tuyến (Inline Cloze)'
                              : 'Điền ô trống (Short Text)')))))))))));

      const kindClass = isListeningOrder
        ? 'listening_order'
        : (isReadingMatching
          ? 'reading_matching'
          : (isPictorial
            ? 'pictorial_vocabulary'
            : (isInlineCloze
              ? 'inline_cloze'
              : item.interactionType)));

      const spanCount = getItemSpanCount(item);
      item.spanCount = spanCount;
      let itemPosLabel = `Câu ${item.position}`;
      if (spanCount > 1) {
        const endPos = item.position + spanCount - 1;
        if (isListeningOrder) {
          itemPosLabel = `Câu ${item.position} – ${endPos} (${spanCount} bước sự kiện)`;
        } else if (isInlineCloze) {
          itemPosLabel = `Câu ${item.position} – ${endPos} (${spanCount} chỗ trống)`;
        } else {
          itemPosLabel = `Câu ${item.position} – ${endPos} (${spanCount} câu)`;
        }
      }

      const itemDisplayScore = isListeningOrder
        ? ((!item.maxScore || item.maxScore === 1) && item.events?.length ? item.events.length : (item.maxScore || 1))
        : (isInlineCloze
            ? ((!item.maxScore || item.maxScore === 1) && spanCount > 1 ? spanCount : (item.maxScore || 1))
            : (item.maxScore || 1));

      const itemCardKey = item.itemVersionId || `item-${blockIdx}-${itemIdx}`;
      const isItemCollapsed = collapsedCardKeys.has(itemCardKey);

      return `
        <div class="builder-item-card${isItemCollapsed ? ' is-collapsed' : ''}" draggable="false" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-item-id="${item.itemVersionId}" data-exercise-id="${item.exerciseId || ''}">
          <div class="builder-item-header">
            <div class="item-title-info">
              <span class="drag-handle item-drag-handle" title="Kéo thả để sắp xếp câu hỏi" aria-label="Kéo thả sắp xếp">⋮⋮</span>
              <button type="button" class="btn btn-icon btn-sm btn-toggle-item-collapse" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Thu gọn / Mở rộng câu hỏi" aria-label="Thu gọn hoặc mở rộng câu hỏi" aria-expanded="${isItemCollapsed ? 'false' : 'true'}">${isItemCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline')}</button>
              <span class="item-pos-pill${spanCount > 1 ? ' has-span' : ''}">${itemPosLabel}</span>
              <span class="item-kind-pill ${kindClass}">${typeLabel}</span>
              <span class="item-prompt-preview-snippet">${escapeHtml((item.prompt || '').trim().substring(0, 55) + ((item.prompt || '').length > 55 ? '...' : ''))}</span>
            </div>
            <div class="item-header-controls">
              <button type="button" class="btn btn-icon btn-sm btn-move-item-up" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" ${itemIdx === 0 ? 'disabled' : ''} title="Di chuyển câu hỏi lên" aria-label="Di chuyển câu hỏi lên">${renderSvgIcon('arrowUp', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-item-down" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" ${itemIdx === (block.items || []).length - 1 ? 'disabled' : ''} title="Di chuyển câu hỏi xuống" aria-label="Di chuyển câu hỏi xuống">${renderSvgIcon('arrowDown', 'icon-inline')}</button>
              <label class="item-score-label">Điểm:
                <input type="number" class="form-control form-control-sm item-max-score-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" value="${itemDisplayScore}" min="0" max="100" />
              </label>
              <button type="button" class="btn btn-icon btn-sm btn-ghost-subtle btn-delete-item" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Xóa câu hỏi này" aria-label="Xóa câu hỏi này">${renderSvgIcon('close', 'icon-inline')}</button>
            </div>
          </div>
          <div class="builder-item-body">
            ${!hasRedundantPrompt ? (isInlineCloze ? `
            <div class="rich-editor rich-html-editor-wrap item-prompt-group" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">
              <div class="rich-editor__toolbar rich-editor-toolbar">
                <div class="rich-editor__toolbar-left toolbar-group">
                  <!-- Heading Dropdown -->
                  <div class="rich-editor__control control-heading-select">
                    <select class="form-select form-select-sm select-format-heading" title="Chọn cấp độ tiêu đề">
                      <option value="p">Đoạn văn (Normal)</option>
                      <option value="h2">Tiêu đề lớn (H2)</option>
                      <option value="h3">Tiêu đề mục (H3)</option>
                      <option value="h4">Tiêu đề nhỏ (H4)</option>
                    </select>
                  </div>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Inline Formatting Actions -->
                  <button type="button" class="btn-editor-action btn-format-bold" title="Tô đậm (Bold - Ctrl+B)">
                    ${renderSvgIcon('bold', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-italic" title="In nghiêng (Italic - Ctrl+I)">
                    ${renderSvgIcon('italic', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-underline" title="Gạch chân (Underline - Ctrl+U)">
                    ${renderSvgIcon('underline', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-strike" title="Gạch ngang (Strikethrough)">
                    ${renderSvgIcon('strike', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Lists -->
                  <button type="button" class="btn-editor-action btn-format-ul" title="Danh sách dấu chấm (Bullet List)">
                    ${renderSvgIcon('listUl', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-ol" title="Danh sách số (Numbered List)">
                    ${renderSvgIcon('listOl', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Alignment -->
                  <button type="button" class="btn-editor-action btn-format-align-left" title="Căn trái">
                    ${renderSvgIcon('alignLeft', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-center" title="Căn giữa">
                    ${renderSvgIcon('alignCenter', 'icon-inline')}
                  </button>
                  <button type="button" class="btn-editor-action btn-format-align-right" title="Căn phải">
                    ${renderSvgIcon('alignRight', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <!-- Clear Formatting -->
                  <button type="button" class="btn-editor-action btn-format-clear" title="Xóa toàn bộ định dạng">
                    ${renderSvgIcon('removeFormat', 'icon-inline')}
                  </button>

                  <div class="toolbar-divider" aria-hidden="true"></div>

                  <div class="rich-editor__control dropdown-table-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-editor-action btn-rich-insert-table" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn Bảng dữ liệu">
                      ${renderSvgIcon('table', 'icon-inline')} <span>Chèn bảng</span> ${renderSvgIcon('chevronDown', 'icon-inline')}
                    </button>
                    <div class="rich-editor__popup table-presets-menu" style="display: none;">
                      <strong>Tạo bảng nhanh</strong>
                      <div class="rich-editor__table-options">
                        <button type="button" class="btn-table-grid" data-rows="2" data-cols="2">2 cột × 2 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="3" data-cols="3">3 cột × 3 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="4" data-cols="2">2 cột × 4 dòng</button>
                        <button type="button" class="btn-table-grid" data-rows="5" data-cols="4">4 cột × 5 dòng</button>
                      </div>
                      <small>Số dòng chưa tính dòng tiêu đề.</small>
                      <div class="rich-editor__presets-section">
                        <small>Mẫu sư phạm IELTS</small>
                        <button type="button" class="btn-table-preset" data-preset="itinerary">Lịch trình chuyến đi (Itinerary)</button>
                        <button type="button" class="btn-table-preset" data-preset="notes">Ghi chú bài nghe (Note Completion)</button>
                        <button type="button" class="btn-table-preset" data-preset="vocabulary">Bảng từ vựng 4 cột (Vocabulary)</button>
                      </div>
                    </div>
                  </div>

                  <div class="rich-editor__control dropdown-image-wrap">
                    <button type="button" class="btn btn-secondary btn-sm btn-rich-insert-image" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chèn ảnh (URL HTTPS hoặc Google Drive)">
                      ${renderSvgIcon('image', 'icon-inline')} <span>Chèn ảnh</span>
                    </button>
                    <div class="rich-editor__popup image-insert-popup" style="display: none;">
                      <label>
                        Link ảnh
                        <input type="url" class="input-image-link" placeholder="https://drive.google.com/file/d/..." />
                      </label>
                      <small>Ảnh Drive cần chia sẻ “Bất kỳ ai có đường liên kết”.</small>
                      <div class="rich-editor__error popup-image-error" style="display: none; padding: 6px 10px; font-size: 12px; margin-top: 4px;"></div>
                      <div class="rich-editor__actions">
                        <button type="button" class="btn-confirm-insert-image">Chèn</button>
                      </div>
                    </div>
                  </div>

                  <button type="button" class="btn btn-secondary btn-sm btn-insert-blank-token" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" data-next-num="${nextBlankNum}" title="Chèn chỗ trống (${nextBlankNum}) __________">
                    + Chèn chỗ trống (${nextBlankNum}) __________
                  </button>
                </div>

                <div class="rich-editor__toolbar-right toolbar-group">
                  <span class="prompt-char-count">${(item.prompt || '').length} ký tự</span>
                  <button type="button" class="btn btn-sm btn-ghost-subtle btn-toggle-html-mode" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" title="Chuyển chế độ [Trực quan ⇄ Mã HTML]">
                    &lt;/&gt; Mã HTML
                  </button>
                </div>
              </div>

              <div class="rich-editor__content-area" style="position: relative;">
                <div class="rich-editor__content rich-editor-visual" contenteditable="true" spellcheck="false" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}">${sanitizeRichContent(item.prompt || '')}</div>
                <textarea class="rich-editor__code rich-editor-code form-control item-prompt-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="4" style="display: none;" placeholder="Nhập đề bài hoặc đoạn văn chứa token (1) __________...">${escapeHtml(item.prompt || '')}</textarea>
              </div>

              <div class="rich-editor__error general-editor-error" style="display: none;" role="alert"></div>

              <div class="rich-editor__footer">
                Enter để xuống dòng. Shift+Enter để ngắt dòng mềm. Nhấp vào ô bảng để chỉnh sửa.
              </div>
            </div>
            ` : `
            <div class="form-group item-prompt-group">
              <div class="item-prompt-header-bar">
                <label class="form-label">${isErrorCorrection ? 'Câu văn gốc chứa lỗi sai (Original Sentence with Error):' : 'Đề bài / Nội dung câu hỏi (Question Prompt):'}</label>
                <span class="prompt-char-count">${(item.prompt || '').length} ký tự</span>
              </div>
              <textarea class="form-control item-prompt-input" data-block-idx="${blockIdx}" data-item-idx="${itemIdx}" rows="${isErrorCorrection ? 3 : 4}" placeholder="${isErrorCorrection ? 'Nhập câu văn chứa lỗi sai (ví dụ: There are much people in the classroom.)...' : 'Nhập đề bài, trích đoạn hoặc yêu cầu của câu hỏi...'}">${escapeHtml(item.prompt || '')}</textarea>
            </div>
            `) : ''}
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
      const exQuestionsCount = exItems.reduce((sum, itm) => sum + getItemSpanCount(itm), 0);
      const hasVariantItems = exItems.some(it => {
        const type = it.pedagogicalTypeCode || it.itemType;
        return ['vocabulary_pair', 'error_correction', 'sentence_transformation', 'sentence_reorder'].includes(type);
      });
      const isFirst = exIdx === 0;
      const isLast = exIdx === exercises.length - 1;
      const isOnly = exercises.length <= 1;

      const exCardKey = ex.exerciseId || `ex-${blockIdx}-${exIdx}`;
      const isExCollapsed = collapsedCardKeys.has(exCardKey);

      return `
        <div class="builder-exercise-card${isExCollapsed ? ' is-collapsed' : ''}" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
          <div class="builder-exercise-header">
            <div class="exercise-header-left">
              <button type="button" class="btn btn-icon btn-sm btn-toggle-exercise-collapse" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" title="Thu gọn / Mở rộng bài tập" aria-label="Thu gọn hoặc mở rộng bài tập" aria-expanded="${isExCollapsed ? 'false' : 'true'}">${isExCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline')}</button>
              <span class="exercise-badge">Exercise ${ex.exerciseNumber || (exIdx + 1)}</span>
              <input type="text" class="exercise-title-input form-control form-control-sm" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" value="${escapeHtml(ex.title || '')}" placeholder="Tiêu đề bài tập (Ví dụ: Nghe từ và chọn nghĩa)..." />
              <span class="badge badge-info exercise-items-count">${exQuestionsCount} câu hỏi</span>
            </div>
            <div class="exercise-header-actions">
              ${hasVariantItems ? `
                <button type="button" class="btn btn-secondary btn-sm btn-batch-generate-exercise-variants" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}" title="Tự động sinh biến thể đáp án cho toàn bộ câu hỏi trong bài tập này">
                  ${renderSvgIcon('zap', 'icon-inline')} <span>Sinh biến thể cả bài</span>
                </button>
              ` : ''}
              <button type="button" class="btn btn-icon btn-sm btn-move-exercise-up" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isFirst ? 'disabled' : ''} title="Di chuyển bài tập lên" aria-label="Di chuyển bài tập lên">${renderSvgIcon('arrowUp', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-exercise-down" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isLast ? 'disabled' : ''} title="Di chuyển bài tập xuống" aria-label="Di chuyển bài tập xuống">${renderSvgIcon('arrowDown', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-delete-exercise" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" ${isOnly ? 'disabled' : ''} title="Xóa bài tập này" aria-label="Xóa bài tập này">${renderSvgIcon('close', 'icon-inline')}</button>
            </div>
          </div>
          <div class="builder-exercise-body">
            <div class="form-group exercise-field">
              <label class="form-label"><strong>Hướng dẫn làm bài tập (Exercise Instructions):</strong></label>
              <textarea class="form-control exercise-instructions-input" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" rows="2" placeholder="Ví dụ: Listen and note down the words/phrases you hear from the audio...">${escapeHtml(ex.instructions || '')}</textarea>
            </div>
            <div class="exercise-items-list block-items-list" data-exercise-id="${ex.exerciseId}" data-block-idx="${blockIdx}">
              ${renderExerciseItems(block, blockIdx, ex, exIdx)}
            </div>
            <div class="exercise-add-item-bar block-add-item-bar">
              <span class="add-item-caption">+ Thêm câu hỏi vào Exercise ${ex.exerciseNumber || (exIdx + 1)}:</span>
              <div class="add-item-buttons">
                <button type="button" class="btn btn-secondary btn-sm btn-add-listening-order" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Sắp xếp thứ tự nghe (Listening Order)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-error-correction" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Tìm và sửa lỗi (Error Correction)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-sentence-reorder" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Sắp xếp câu (Sentence Reorder)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-single-choice" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Trắc nghiệm (Single Choice)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-multi-group" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
                  + Nhóm chọn nhiều (Multi-Select Group)
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-add-fitb btn-add-short-text" data-block-idx="${blockIdx}" data-exercise-idx="${exIdx}" data-exercise-id="${ex.exerciseId}">
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

    const totalExamQuestions = draftState.blocks.reduce((sum, b) => {
      return sum + (b.items || []).reduce((s, itm) => s + getItemSpanCount(itm), 0);
    }, 0);

    const blocksHtml = draftState.blocks.map((block, index) => {
      const isFirst = index === 0;
      const isLast = index === draftState.blocks.length - 1;
      const isOnly = draftState.blocks.length <= 1;
      const audioVal = block.audioUrl || block.stimulusAudioUrl || '';
      const readingVal = block.readingPassage || block.stimulusReadingPassage || '';
      const itemsCount = (block.items || []).reduce((sum, itm) => sum + getItemSpanCount(itm), 0);
      const blockCardKey = block.blockId || `b-${index}`;
      const isBlockCollapsed = collapsedCardKeys.has(blockCardKey);

      return `
        <div class="builder-block-card${isBlockCollapsed ? ' is-collapsed' : ''}" id="builder-block-${index}" data-block-id="${block.blockId}" data-index="${index}">
          <div class="builder-block-header">
            <button type="button" class="btn btn-icon btn-sm btn-toggle-block-collapse" data-index="${index}" title="Thu gọn / Mở rộng phần thi" aria-label="Thu gọn hoặc mở rộng phần thi" aria-expanded="${isBlockCollapsed ? 'false' : 'true'}">${isBlockCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline')}</button>
            <div class="block-checkpoint-pill">Phần ${index + 1}</div>
            <input type="text" class="block-title-input form-control" data-index="${index}" value="${escapeHtml(block.title || '')}" placeholder="Tiêu đề phần thi..." />
            <div class="block-header-actions">
              <button type="button" class="btn btn-icon btn-sm btn-move-block-up" data-index="${index}" ${isFirst ? 'disabled' : ''} title="Di chuyển lên" aria-label="Di chuyển lên">${renderSvgIcon('arrowUp', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-move-block-down" data-index="${index}" ${isLast ? 'disabled' : ''} title="Di chuyển xuống" aria-label="Di chuyển xuống">${renderSvgIcon('arrowDown', 'icon-inline')}</button>
              <button type="button" class="btn btn-icon btn-sm btn-delete-block" data-index="${index}" ${isOnly ? 'disabled' : ''} title="Xóa phần này" aria-label="Xóa phần này">${renderSvgIcon('close', 'icon-inline')}</button>
            </div>
          </div>
          <div class="builder-block-body">
            <div class="form-group block-field">
              <label class="form-label">Hướng dẫn phần thi (Instructions):</label>
              <textarea class="form-control block-instructions-input" data-index="${index}" rows="3" placeholder="Nhập hướng dẫn làm bài cho phần này...">${escapeHtml(block.instructions || '')}</textarea>
            </div>
            <div class="form-group block-field">
              <label class="form-label">File âm thanh (Audio URL / Path):</label>
              <div class="audio-input-with-preview" style="display:flex; gap:8px; align-items:center;">
                <input type="text" class="form-control block-audio-input" data-index="${index}" value="${escapeHtml(audioVal)}" placeholder="https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/... hoặc assets/34/test-1/listening.mp3" style="flex:1;" />
                <button type="button" class="btn btn-secondary btn-sm btn-preview-audio" data-target="block" data-index="${index}" title="Nghe thử file âm thanh">
                  ${renderSvgIcon('play', 'icon-inline')} Nghe thử
                </button>
              </div>
              <div class="form-hint audio-guide-hint" style="font-size:0.78rem; color:#64748b; margin-top:4px;">Chỉ sử dụng link âm thanh Cloudflare R2 (hoặc assets/). Không hỗ trợ link Google Drive cho bài nghe.</div>
              <div class="audio-drive-warning text-danger" style="${(audioVal.includes('drive.google.com') || audioVal.includes('docs.google.com')) ? 'display:block;' : 'display:none;'} color:var(--izone-primary, #db0829); font-size:0.8rem; margin-top:4px;">Hệ thống không hỗ trợ link Google Drive cho bài nghe. Vui lòng sử dụng link Cloudflare R2 hoặc assets/.</div>
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

    const savedWindowScrollY = (typeof window !== 'undefined')
      ? (window.scrollY ?? window.pageYOffset ?? (typeof document !== 'undefined' ? document.documentElement?.scrollTop : 0) ?? 0)
      : 0;
    const savedContainerScrollTop = container ? (container.scrollTop || 0) : 0;

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
              <span class="total-questions-tag">Tổng cộng: <strong>${totalExamQuestions} câu hỏi</strong></span>
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

        ${renderScoreBreakdownBarHtml(draftState)}

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
              <div class="form-group setting-phase-group">
                <label class="form-label" for="builder-test-phase">Giai đoạn (Phase):</label>
                <select id="builder-test-phase" class="form-select">
                  <option value="" ${!draftState.phase ? 'selected' : ''}>Không phân Phase (Tổng hợp)</option>
                  <option value="1" ${Number(draftState.phase) === 1 ? 'selected' : ''}>Phase 1</option>
                  <option value="2" ${Number(draftState.phase) === 2 ? 'selected' : ''}>Phase 2</option>
                </select>
              </div>
              <div class="form-group setting-session-group">
                <label class="form-label" for="builder-test-session">Buổi học (Session):</label>
                <input type="number" id="builder-test-session" class="form-control" value="${draftState.sessionNumber || ''}" min="1" placeholder="Ví dụ: 1" />
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

          ${renderBlocksNavCardHtml(draftState.blocks)}

          <div class="builder-blocks-section">
            <div class="blocks-section-header">
              <div class="blocks-title-wrap">
                <h3>Cấu trúc các phần thi (${draftState.blocks.length} phần · ${totalExamQuestions} câu hỏi)</h3>
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

    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: savedWindowScrollY, behavior: 'instant' });
    }
    if (container && typeof savedContainerScrollTop === 'number') {
      container.scrollTop = savedContainerScrollTop;
    }
  }

  function jumpToBlock(bIdx) {
    if (typeof container.querySelector !== 'function') return;
    const card = container.querySelector(`#builder-block-${bIdx}`) ||
                 container.querySelector(`.builder-block-card[data-index="${bIdx}"]`);
    if (!card) return;

    const block = draftState.blocks[bIdx];
    const blockCardKey = (block && block.blockId) || (card.getAttribute && card.getAttribute('data-block-id')) || `b-${bIdx}`;

    // 1. If block is collapsed, expand it so teacher can view/edit immediately
    if (card.classList && card.classList.contains('is-collapsed')) {
      card.classList.remove('is-collapsed');
      collapsedCardKeys.delete(blockCardKey);
      const toggleBtn = card.querySelector('.btn-toggle-block-collapse');
      if (toggleBtn) {
        toggleBtn.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
        if (typeof toggleBtn.setAttribute === 'function') {
          toggleBtn.setAttribute('aria-expanded', 'true');
        }
      }
    }

    // 2. Smoothly scroll into view
    if (typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 3. Highlight animation pulse
    if (card.classList) {
      card.classList.remove('block-target-highlight');
      if (typeof card.offsetWidth === 'number') {
        void card.offsetWidth;
      }
      card.classList.add('block-target-highlight');
      setTimeout(() => {
        if (card.classList) card.classList.remove('block-target-highlight');
      }, 1600);
    }
  }

  function updateScoreBreakdownBar() {
    const barEl = container.querySelector('#builder-score-breakdown-bar');
    const summary = computeTestBuilderScoreSummary(draftState.blocks);
    if (barEl) {
      const scoreValEl = barEl.querySelector('.score-total-val');
      if (scoreValEl) scoreValEl.textContent = summary.totalScore;
      const qValEl = barEl.querySelector('.score-total-questions');
      if (qValEl) qValEl.textContent = `${summary.totalQuestions} câu hỏi`;

      const chipsWrap = barEl.querySelector('.score-skills-chips');
      if (chipsWrap) {
        chipsWrap.innerHTML = renderScoreSkillChipsHtml(summary.skills);
      }

      const newSkillChips = barEl.querySelectorAll('.score-skill-chip[data-first-block-idx]');
      if (newSkillChips && typeof newSkillChips.forEach === 'function') {
        newSkillChips.forEach(chip => {
          if (typeof chip.addEventListener === 'function') {
            chip.addEventListener('click', (e) => {
              e.preventDefault();
              const bIdx = Number(chip.getAttribute('data-first-block-idx'));
              if (!isNaN(bIdx)) jumpToBlock(bIdx);
            });
          }
        });
      }
    }

    const navCardEl = container.querySelector('#builder-blocks-nav-card');
    if (navCardEl) {
      const chipsWrap = navCardEl.querySelector('.blocks-nav-chips');
      if (chipsWrap) {
        chipsWrap.innerHTML = renderBlockJumpTagsHtml(draftState.blocks);
      }
      const newJumpChips = navCardEl.querySelectorAll('.btn-block-jump-chip');
      if (newJumpChips && typeof newJumpChips.forEach === 'function') {
        newJumpChips.forEach(chip => {
          if (typeof chip.addEventListener === 'function') {
            chip.addEventListener('click', (e) => {
              e.preventDefault();
              const bIdx = Number(chip.getAttribute('data-block-idx'));
              if (!isNaN(bIdx)) jumpToBlock(bIdx);
            });
          }
        });
      }
    }

    const totalQTag = container.querySelector('.total-questions-tag strong');
    if (totalQTag) totalQTag.textContent = `${summary.totalQuestions} câu hỏi`;
  }

  function syncInputs() {
    if (typeof container.querySelector !== 'function') return;

    // Sync any active visual editors to their textareas
    const activeVisuals = container.querySelectorAll('.rich-html-editor-wrap');
    if (activeVisuals && typeof activeVisuals.forEach === 'function') {
      activeVisuals.forEach(wrap => {
        const vEl = wrap.querySelector ? wrap.querySelector('.rich-editor-visual') : null;
        const cEl = wrap.querySelector ? wrap.querySelector('.rich-editor-code, textarea') : null;
        if (vEl && cEl && vEl.style && vEl.style.display !== 'none') {
          cEl.value = sanitizeRichContent(vEl.innerHTML || '');
        }
      });
    }

    const titleInput = container.querySelector('#builder-test-title');
    if (titleInput) draftState.title = titleInput.value.trim();

    const phaseSelect = container.querySelector('#builder-test-phase');
    if (phaseSelect) {
      draftState.phase = phaseSelect.value ? Number(phaseSelect.value) : null;
    }

    const sessionInput = container.querySelector('#builder-test-session');
    if (sessionInput) {
      const sess = Number(sessionInput.value);
      if (Number.isFinite(sess) && sess > 0) draftState.sessionNumber = sess;
    }

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
          block.audioUrl = convertGoogleDriveAudioUrl(audioEl.value) || null;
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
            if (exTitleEl) {
              ex.title = exTitleEl.value.trim() || `Bài tập ${ex.exerciseNumber || exIdx + 1}`;
            } else if (!ex.title || !ex.title.trim()) {
              ex.title = `Bài tập ${ex.exerciseNumber || exIdx + 1}`;
            }
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
                item.audioUrl = convertGoogleDriveAudioUrl(audioInput.value);
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

            // Inline cloze sync
            if (item.interactionType === 'short_text' && item.layoutType === 'inline_cloze') {
              item.clozeAnswers = item.clozeAnswers || {};
              const blankCards = iCard.querySelectorAll('.cloze-blank-config-card');
              let primaryVariants = [];

              blankCards.forEach((bCard, bIdx) => {
                const bNum = Number(bCard.getAttribute('data-blank-num')) || (bIdx + 1);
                const bTargetInput = bCard.querySelector('.input-cloze-blank-target');
                const bVal = bTargetInput ? bTargetInput.value.trim() : '';

                item.clozeAnswers[bNum] = item.clozeAnswers[bNum] || { accepted: [] };
                if (bVal && !/^Câu \d+/i.test(bVal)) {
                  item.clozeAnswers[bNum].targetWord = bVal;
                }

                const bChips = bCard.querySelectorAll('.variant-chip');
                const rawBVariants = Array.from(bChips).map(c => c.getAttribute('data-variant')).filter(Boolean);
                let bVariants = Array.from(new Set(rawBVariants.filter(v => v !== 'answer' && v !== 'draft_placeholder'))).slice(0, 40);

                if (bVal && !/^Câu \d+/i.test(bVal) && !bVariants.includes(bVal)) {
                  bVariants = [bVal, ...bVariants];
                }

                if (!bVariants.length && item.clozeAnswers[bNum].targetWord) {
                  bVariants.push(item.clozeAnswers[bNum].targetWord);
                }

                item.clozeAnswers[bNum].accepted = bVariants;
                if (bIdx === 0) {
                  primaryVariants = bVariants;
                  if (bVal) item.targetWord = bVal;
                }
              });

              if (!primaryVariants.length && item.targetWord) {
                primaryVariants = [item.targetWord];
              }

              item.graderType = 'inline_cloze';
              draftState.gradingKey.items[item.itemVersionId] = {
                graderType: 'inline_cloze',
                blanks: item.clozeAnswers,
                accepted: primaryVariants.length ? primaryVariants : ['answer'],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            } else if (item.interactionType === 'short_text' && item.pedagogicalTypeCode !== 'sentence_reorder' && item.layoutType !== 'token_scramble' && item.pedagogicalTypeCode !== 'sentence_rewrite' && item.layoutType !== 'keyword_transformation') {
              const rawInput = iCard.querySelector('.input-fitb-raw, .input-pictorial-target');
              const rawVal = rawInput ? rawInput.value.trim() : '';

              if (rawVal && !/^Câu \d+/i.test(rawVal) && !/^Từ vựng qua ảnh \d+/i.test(rawVal)) {
                item.targetWord = rawVal;
              }

              const chips = iCard.querySelectorAll('.variant-chip');
              const rawVariants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              let variants = Array.from(new Set(rawVariants.filter(v => v !== 'answer' && v !== 'draft_placeholder'))).slice(0, 40);

              if (rawVal && !/^Câu \d+/i.test(rawVal) && !/^Từ vựng qua ảnh \d+/i.test(rawVal)) {
                if (!variants.includes(rawVal)) {
                  variants = [rawVal, ...variants];
                }
              }

              if (!variants.length) {
                if (item.targetWord && !/^Câu \d+/i.test(item.targetWord) && !/^Từ vựng qua ảnh \d+/i.test(item.targetWord)) {
                  variants.push(item.targetWord);
                } else if (item.prompt && !/^Câu \d+/i.test(item.prompt) && !/^Từ vựng qua ảnh \d+/i.test(item.prompt)) {
                  variants.push(item.prompt);
                }
              }

              draftState.gradingKey.items[item.itemVersionId] = {
                graderType: 'accepted_text',
                accepted: variants,
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
                const audVal = convertGoogleDriveAudioUrl(audioInput.value);
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
                item.graderType = 'ordered_sequence';
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
              const targetInput = iCard.querySelector('.input-pictorial-target, .input-fitb-raw');
              if (targetInput) {
                const targetVal = targetInput.value.trim();
                if (targetVal && !/^Từ vựng qua ảnh \d+/i.test(targetVal)) {
                  item.targetWord = targetVal;
                }
              }
              const imgInput = iCard.querySelector('.input-pictorial-image');
              if (imgInput) {
                const imgVal = imgInput.value.trim();
                const converted = convertGoogleDriveImageUrl(imgVal);
                item.image = converted || null;
                item.stimulusImageUrl = converted || null;
              }
              const letterInput = iCard.querySelector('.input-pictorial-letter-hint');
              if (letterInput) item.letterHint = letterInput.value.trim() || null;
              const captionInput = iCard.querySelector('.input-pictorial-caption');
              if (captionInput) item.captionHint = captionInput.value.trim() || null;
            }

            // Vocabulary pair sync
            if (item.interactionType === 'text_select_pair') {
              const rawWordInput = iCard.querySelector('.input-vocab-raw');
              const rawWordVal = rawWordInput ? rawWordInput.value.trim() : '';

              if (rawWordVal && !/^Từ vựng câu \d+/i.test(rawWordVal)) {
                item.targetWord = rawWordVal;
                item.prompt = rawWordVal;
              }

              const chips = iCard.querySelectorAll('.template-vocab-pair .variant-chip');
              const rawVariants = Array.from(chips).map(c => c.getAttribute('data-variant')).filter(Boolean);
              let variants = Array.from(new Set(rawVariants.filter(v => v !== 'answer' && v !== 'draft_placeholder' && !/^Từ vựng câu \d+/i.test(v)))).slice(0, 40);

              const dropdownVal = iCard.querySelector('.select-vocab-correct-dropdown')?.value;
              const radioChecked = iCard.querySelector('.radio-vocab-correct:checked');
              const expectedOptId = dropdownVal || (radioChecked ? radioChecked.value : (item.options?.[0]?.id || 'opt_1'));

              if (rawWordVal && !/^Từ vựng câu \d+/i.test(rawWordVal)) {
                if (!variants.includes(rawWordVal)) {
                  variants = [rawWordVal, ...variants];
                }
              }

              if (!variants.length) {
                if (item.targetWord && !/^Từ vựng câu \d+/i.test(item.targetWord)) {
                  variants.push(item.targetWord);
                } else if (item.prompt && !/^Từ vựng câu \d+/i.test(item.prompt)) {
                  variants.push(item.prompt);
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

    updateScoreBreakdownBar();
    if (isDirty && typeof container.querySelector === 'function') {
      const statusMsg = container.querySelector('#builder-status-msg');
      if (statusMsg && !statusMsg.classList.contains('saving') && !statusMsg.classList.contains('forked')) {
        statusMsg.className = 'builder-status-pill unsaved';
        statusMsg.innerHTML = `${renderSvgIcon('edit', 'icon-inline')} <span>Có thay đổi chưa lưu</span>`;
      }
    }
  }

  function getNextPosition() {
    let nextPos = 1;
    for (const b of draftState.blocks) {
      for (const itm of b.items || []) {
        const span = getItemSpanCount(itm);
        const endPos = (typeof itm.position === 'number') ? (itm.position + span) : nextPos;
        if (endPos >= nextPos) {
          nextPos = endPos;
        }
      }
    }
    return nextPos;
  }

  function bindEvents() {
    if (typeof container.querySelector !== 'function') return;

    // Live update Score Breakdown Bar and mark dirty when question or rubric criterion score changes
    if (typeof container.addEventListener === 'function') {
      container.addEventListener('input', (e) => {
        markAsDirty();
        if (e?.target?.classList?.contains('item-max-score-input') || e?.target?.classList?.contains('criterion-max-score-input')) {
          syncInputs();
        }
        if (e?.target?.classList?.contains('block-audio-input')) {
          const val = e.target.value || '';
          const parent = e.target.closest ? e.target.closest('.block-field') : null;
          const warningEl = parent && parent.querySelector ? parent.querySelector('.audio-drive-warning') : null;
          if (warningEl && warningEl.style) {
            const hasDrive = val.includes('drive.google.com') || val.includes('docs.google.com');
            warningEl.style.display = hasDrive ? 'block' : 'none';
          }
        }
      });

      container.addEventListener('change', () => {
        markAsDirty();
      });
    }

    const backBtn = container.querySelector('#btn-back-to-catalog');
    if (backBtn && typeof backBtn.addEventListener === 'function') {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isDirty) {
          openUnsavedChangesModal({
            onDiscard: () => {
              isDirty = false;
              unregisterUnsavedChangesGuard(unsavedGuardChecker);
              if (typeof options.onBack === 'function') options.onBack();
            },
            onStay: () => {
              // User chooses to stay and continue editing
            }
          });
          return;
        }
        unregisterUnsavedChangesGuard(unsavedGuardChecker);
        if (typeof options.onBack === 'function') options.onBack();
      });
    }

    // Quick jump to block via Block chips or Skill chips in Score Breakdown bar
    const blockJumpChips = container.querySelectorAll('.btn-block-jump-chip');
    if (blockJumpChips && typeof blockJumpChips.forEach === 'function') {
      blockJumpChips.forEach(chip => {
        if (typeof chip.addEventListener === 'function') {
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            const bIdx = Number(chip.getAttribute('data-block-idx'));
            if (!isNaN(bIdx)) jumpToBlock(bIdx);
          });
        }
      });
    }

    const skillChipsWithJump = container.querySelectorAll('.score-skill-chip[data-first-block-idx]');
    if (skillChipsWithJump && typeof skillChipsWithJump.forEach === 'function') {
      skillChipsWithJump.forEach(chip => {
        if (typeof chip.addEventListener === 'function') {
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            const bIdx = Number(chip.getAttribute('data-first-block-idx'));
            if (!isNaN(bIdx)) jumpToBlock(bIdx);
          });
        }
      });
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

    // Upload Vocab Pair CSV
    const uploadVocabCsvBtns = container.querySelectorAll('.btn-upload-vocab-csv');
    if (uploadVocabCsvBtns && typeof uploadVocabCsvBtns.forEach === 'function') {
      uploadVocabCsvBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block) return;
            const targetEx = resolveTargetExercise(block, btn);
            openBatchVocabPairModal(bIdx, targetEx);
          });
        }
      });
    }

    // Batch Generate Exercise Vocab Variants
    const batchGenVariantBtns = container.querySelectorAll('.btn-batch-generate-exercise-variants');
    if (batchGenVariantBtns && typeof batchGenVariantBtns.forEach === 'function') {
      batchGenVariantBtns.forEach(btn => {
        if (typeof btn.addEventListener === 'function') {
          btn.addEventListener('click', () => {
            syncInputs();
            const bIdx = Number(btn.getAttribute('data-block-idx'));
            const block = draftState.blocks[bIdx];
            if (!block) return;
            const targetEx = resolveTargetExercise(block, btn);
            const count = batchGenerateExerciseVocabVariants(block, targetEx, draftState);
            markAsDirty();
            render();
            if (typeof window !== 'undefined' && typeof window.alert === 'function') {
              window.alert(`Đã tự động sinh biến thể đáp án cho ${count} câu hỏi Cặp từ vựng.`);
            }
          });
        }
      });
    }

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

    let currentPreviewAudio = null;
    let currentPreviewBtn = null;

    const previewAudioBtns = container.querySelectorAll('.btn-preview-audio');
    if (previewAudioBtns && typeof previewAudioBtns.forEach === 'function') {
      previewAudioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const inputWrap = btn.closest('.audio-input-with-preview');
          const inputEl = inputWrap?.querySelector('input[type="text"]');
          if (!inputEl) return;
          const rawUrl = inputEl.value.trim();
          if (!rawUrl) {
            alert('Vui lòng nhập đường dẫn file âm thanh hoặc link Google Drive trước khi nghe thử.');
            return;
          }

          const streamUrl = convertGoogleDriveAudioUrl(rawUrl);
          if (inputEl.value !== streamUrl) {
            inputEl.value = streamUrl;
          }

          let playUrl = streamUrl;
          const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (driveMatch) {
            const fileId = driveMatch[1];
            const isLocal = typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
            const apiBase = isLocal ? `${window.location.protocol}//${window.location.hostname}:8788` : '';
            playUrl = `${apiBase}/api/teacher/media/drive-stream?id=${encodeURIComponent(fileId)}`;
          }

          if (currentPreviewAudio && !currentPreviewAudio.paused && currentPreviewBtn === btn) {
            currentPreviewAudio.pause();
            btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
            return;
          }

          if (currentPreviewAudio) {
            currentPreviewAudio.pause();
            if (currentPreviewBtn) {
              currentPreviewBtn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
            }
          }

          if (typeof Audio !== 'undefined') {
            currentPreviewAudio = new Audio(playUrl);
            currentPreviewBtn = btn;
            btn.innerHTML = `${renderSvgIcon('pause', 'icon-inline')} Tạm dừng`;

            currentPreviewAudio.addEventListener('ended', () => {
              btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
            });

            currentPreviewAudio.addEventListener('error', () => {
              btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
              alert('Không thể phát file âm thanh. Nếu dùng link Google Drive, vui lòng đảm bảo file đã được cài đặt quyền "Bất kỳ ai có đường liên kết đều có thể xem".');
            });

            currentPreviewAudio.play().catch(err => {
              btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
              console.warn('Playback error:', err);
            });
          }
        });
      });
    }

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

    function createBatchSingleChoice(bIdx, targetEx, count = 1, optionCount = 4, defaultPoints = 1) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const startingPos = getNextPosition();
      block.items = block.items || [];
      const batchItems = [];
      const safeOptCount = Math.max(2, Math.min(4, parseInt(optionCount, 10) || 4));
      const layout = safeOptCount === 2 ? 'grid_2' : (safeOptCount === 3 ? 'grid_3' : 'grid_4');

      for (let i = 0; i < count; i++) {
        const currentPos = startingPos + i;
        const newItemId = generateUuid();
        batchItems.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: currentPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Câu hỏi ${currentPos}:`,
          helpText: '',
          interactionType: 'single_choice',
          pedagogicalTypeCode: 'multiple_choice',
          layoutType: layout,
          graderType: 'exact_option',
          required: true,
          maxScore: defaultPoints || 1,
          options: Array.from({ length: safeOptCount }, (_, oIdx) => ({
            id: String.fromCharCode(65 + oIdx),
            label: ''
          })),
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A'
        };
      }

      insertItemsIntoBlockExercise(block, targetEx, batchItems);
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    // Add Single Choice Question (Opens CSV / Excel import popup with single item creation option)
    const addScBtns = container.querySelectorAll('.btn-add-single-choice');
    addScBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        triggerScCsvUpload(bIdx, targetEx);
      });
    });

    function triggerScCsvUpload(bIdx, targetEx) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      openGenericBatchModal({
        title: 'Trắc nghiệm (Multiple Choice)',
        subtitle: `Nhập danh sách câu hỏi Trắc nghiệm cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Hỗ trợ 2, 3 hoặc 4 phương án (A, B, C, D) và tự động ánh xạ đáp án đúng.`,
        defaultCount: 5,
        minCount: 1,
        maxCount: 50,
        defaultPoints: 1.0,
        csvConfig: {
          templateFileName: 'mau_trac_nghiem_don.csv',
          columnsHint: 'Cột: Đề bài | Phương án A | B | C | D | Đáp án đúng | Giải thích | Điểm',
          placeholder: 'The cruise departs ___ Miami.,at,from,on,in,B,Cụm từ depart from,1\nShe is interested ___ marine life.,in,at,on,,A,Interested in,1',
          getTemplateCsv: generateSingleChoiceTemplateCsv,
          parseCsv: parseSingleChoiceCsv,
          renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} — <em>Đáp án: ${escapeHtml(itm.expectedOptionId.toUpperCase().replace('OPT_', ''))}</em> (${itm.options.length} phương án, ${itm.maxScore || 1} điểm)`,
          onImport: (items, { defaultPoints = 1 } = {}) => {
            const startingPos = getNextPosition();
            const batchItems = [];
            items.forEach((parsed, idx) => {
              const newItemId = generateUuid();
              const itemScore = parsed.maxScore != null && !isNaN(parsed.maxScore) && parsed.maxScore > 0 ? parsed.maxScore : defaultPoints;
              batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: startingPos + idx,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: parsed.prompt,
                helpText: '',
                interactionType: 'single_choice',
                pedagogicalTypeCode: 'multiple_choice',
                layoutType: parsed.layoutType || 'grid_4',
                graderType: 'exact_option',
                required: true,
                maxScore: itemScore,
                options: parsed.options,
                explanation: parsed.explanation || '',
                skillCodes: [],
                releasePolicy: 'inherit'
              });
              draftState.gradingKey.items[newItemId] = {
                graderType: 'exact_option',
                expectedOptionId: parsed.expectedOptionId
              };
            });
            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            render();
          }
        },
        extraConfigHtml: `
          <div class="form-group batch-option-count-form-group" style="margin-top: 14px;">
            <label class="form-label"><strong>Số lượng phương án mỗi câu (khi tạo câu trống):</strong></label>
            <div class="batch-option-radios">
              <label class="batch-radio-label">
                <input type="radio" name="batch-single-choice-options" class="radio-batch-options" value="2" />
                <div class="batch-radio-text-wrap">
                  <span class="batch-radio-title">2 phương án</span>
                  <span class="batch-radio-sub">(A, B)</span>
                </div>
              </label>
              <label class="batch-radio-label">
                <input type="radio" name="batch-single-choice-options" class="radio-batch-options" value="3" />
                <div class="batch-radio-text-wrap">
                  <span class="batch-radio-title">3 phương án</span>
                  <span class="batch-radio-sub">(A, B, C)</span>
                </div>
              </label>
              <label class="batch-radio-label">
                <input type="radio" name="batch-single-choice-options" class="radio-batch-options" value="4" checked />
                <div class="batch-radio-text-wrap">
                  <span class="batch-radio-title">4 phương án</span>
                  <span class="batch-radio-sub">(A, B, C, D)</span>
                </div>
              </label>
            </div>
          </div>
        `,
        onConfirm: ({ count, defaultPoints = 1, modal }) => {
          let optCount = 4;
          if (modal) {
            const checked = modal.querySelector('input[name="batch-single-choice-options"]:checked') ||
                            modal.querySelector('.radio-batch-options:checked') ||
                            modal.querySelector('.select-batch-option-count');
            if (checked) optCount = parseInt(checked.value, 10) || 4;
          }
          createBatchSingleChoice(bIdx, targetEx, count, optCount, defaultPoints);
        },
        onSingle: ({ defaultPoints = 1, modal } = {}) => {
          let optCount = 4;
          if (modal) {
            const checked = modal.querySelector('input[name="batch-single-choice-options"]:checked') ||
                            modal.querySelector('.radio-batch-options:checked') ||
                            modal.querySelector('.select-batch-option-count');
            if (checked) optCount = parseInt(checked.value, 10) || 4;
          }
          createBatchSingleChoice(bIdx, targetEx, 1, optCount, defaultPoints);
        }
      });
    }

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
        const newGroupItems = [
          {
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
          },
          {
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
          }
        ];
        insertItemsIntoBlockExercise(block, targetEx, newGroupItems);
        draftState.gradingKey.groups[groupId] = {
          graderType: 'unordered_group_slot',
          expectedOptionIds: ['A', 'B']
        };
        resequenceItemPositions();
        markAsDirty();
        render();
      });
    });

    function createBatchFitb(bIdx, targetEx, count = 1, defaultPoints = 1) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const startingPos = getNextPosition();
      block.items = block.items || [];
      const batchItems = [];

      for (let i = 0; i < count; i++) {
        const currentPos = startingPos + i;
        const newItemId = generateUuid();
        batchItems.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: currentPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: `Điền vào ô trống câu ${currentPos}:`,
          helpText: '',
          interactionType: 'short_text',
          pedagogicalTypeCode: 'fill_in_the_blank',
          layoutType: 'default',
          graderType: 'accepted_text',
          required: true,
          maxScore: defaultPoints || 1,
          options: [],
          skillCodes: [],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'accepted_text',
          accepted: ['answer'],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
      }

      insertItemsIntoBlockExercise(block, targetEx, batchItems);
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    // Add Fill In The Blank Question (Opens CSV / Excel import popup with batch & single creation)
    const addFitbBtns = container.querySelectorAll('.btn-add-fitb, .btn-add-short-text');
    addFitbBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        triggerFitbBatchModal(bIdx, targetEx);
      });
    });

    function triggerFitbBatchModal(bIdx, targetEx) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      openGenericBatchModal({
        title: 'Điền ô trống (Short Text)',
        subtitle: `Nhập danh sách câu hỏi Điền từ ngắn vào ô trống cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Tự động sinh biến thể ngữ pháp và đáp án chấp nhận.`,
        defaultCount: 5,
        minCount: 1,
        maxCount: 50,
        defaultPoints: 1.0,
        csvConfig: {
          templateFileName: 'mau_dien_o_trong.csv',
          columnsHint: 'Cột: Đề bài | Đáp án đúng | Điểm',
          placeholder: 'The capital of France is ___.,Paris,1\nWater freezes at ___ degrees Celsius.,0,1\nThe Sun rises in the ___.,east,1',
          getTemplateCsv: generateFitbTemplateCsv,
          parseCsv: parseFitbCsv,
          renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} — <em>Đáp án: ${escapeHtml(itm.targetAnswer)}</em> (${itm.maxScore || 1} điểm)`,
          onImport: (items, { defaultPoints = 1 } = {}) => {
            const startingPos = getNextPosition();
            const batchItems = [];
            items.forEach((parsed, idx) => {
              const newItemId = generateUuid();
              const itemScore = parsed.maxScore != null && !isNaN(parsed.maxScore) && parsed.maxScore > 0 ? parsed.maxScore : defaultPoints;
              batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: startingPos + idx,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: parsed.prompt,
                helpText: '',
                interactionType: 'short_text',
                pedagogicalTypeCode: 'fill_in_the_blank',
                layoutType: 'default',
                graderType: 'accepted_text',
                required: true,
                maxScore: itemScore,
                options: [],
                skillCodes: [],
                releasePolicy: 'inherit'
              });
              draftState.gradingKey.items[newItemId] = {
                graderType: 'accepted_text',
                accepted: expandSentenceVariants([parsed.targetAnswer]),
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            });
            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            render();
          }
        },
        onConfirm: ({ count, defaultPoints = 1 }) => {
          createBatchFitb(bIdx, targetEx, count, defaultPoints);
        },
        onSingle: ({ defaultPoints = 1 } = {}) => {
          createBatchFitb(bIdx, targetEx, 1, defaultPoints);
        }
      });
    }

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
        const newItem = {
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
        };
        insertItemsIntoBlockExercise(block, targetEx, newItem);
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
        const detected = parseClozeBlanks(item.prompt || '');
        const maxNum = detected.length ? Math.max(...detected.map(b => b.number)) : 0;
        const nextNum = maxNum > 0 ? maxNum + 1 : (item.position || 1);
        const token = `(${nextNum}) __________`;
        item.prompt = item.prompt ? `${item.prompt} ${token}` : `Câu hỏi với ${token}`;
        item.clozeAnswers = item.clozeAnswers || {};
        if (!item.clozeAnswers[nextNum]) {
          item.clozeAnswers[nextNum] = { targetWord: '', accepted: [] };
        }
        item.maxScore = getItemSpanCount(item);
        resequenceItemPositions();
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
        const newItem = {
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
        };
        insertItemsIntoBlockExercise(block, targetEx, newItem);
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

    // Add Listening Order Question (Opens CSV / Excel import popup with single item creation option)
    const addListeningOrderBtns = container.querySelectorAll('.btn-add-listening-order');
    addListeningOrderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);

        const createSingleListeningOrder = () => {
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
          const newItem = {
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
            graderType: 'ordered_sequence',
            required: true,
            maxScore: 5,
            audioUrl: block.audioUrl || 'assets/34/test-1/listening.mp3',
            events: defaultEvents,
            options: defaultEvents.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` })),
            skillCodes: ['listening'],
            releasePolicy: 'inherit'
          };
          insertItemsIntoBlockExercise(block, targetEx, newItem);
          const sorted = [...defaultEvents].sort((a, b) => a.rank - b.rank);
          draftState.gradingKey.items[newItemId] = {
            graderType: 'ordered_sequence',
            expectedSequence: sorted.map(e => e.label)
          };
          resequenceItemPositions();
          markAsDirty();
          render();
        };

        openCsvUploadModal({
          title: 'Nhập bài tập Sắp xếp thứ tự nghe vào Exercise (CSV / Excel)',
          subtitle: `Nhập nhóm các sự kiện bài nghe cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Các sự kiện cùng mã nhóm (Group ID) sẽ được gom thành 1 câu hỏi sắp xếp thứ tự timeline.`,
          templateFileName: 'mau_sap_xep_thu_tu_nghe.csv',
          columnsHint: 'Cột: Mã nhóm | Đề bài | Nhãn (A-Z) | Thứ tự đúng (1-N) | Nội dung sự kiện | File Audio',
          placeholder: 'GROUP_1,Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:,A,3,Sự kiện A,assets/34/test-1/listening.mp3\nGROUP_1,Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:,B,4,Sự kiện B,assets/34/test-1/listening.mp3\nGROUP_1,Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:,C,1,Sự kiện C,assets/34/test-1/listening.mp3\nGROUP_1,Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:,D,5,Sự kiện D,assets/34/test-1/listening.mp3\nGROUP_1,Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:,E,2,Sự kiện E,assets/34/test-1/listening.mp3',
          getTemplateCsv: generateListeningOrderTemplateCsv,
          parseCsv: parseListeningOrderCsv,
          renderPreviewRow: (itm, idx) => `<strong>Nhóm ${idx}:</strong> ${escapeHtml(itm.prompt)} (${itm.listeningEvents.length} sự kiện nghe, điểm tối đa: ${itm.maxScore})`,
          onSingle: () => {
            createSingleListeningOrder();
          },
          onImport: (items) => {
            const startingPos = getNextPosition();
            const batchItems = [];
            items.forEach((parsed, idx) => {
              const newItemId = generateUuid();
              batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: startingPos + idx,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: parsed.prompt,
                helpText: '',
                interactionType: 'single_choice',
                pedagogicalTypeCode: 'listening_order',
                layoutType: 'timeline_sequence',
                graderType: 'ordered_sequence',
                required: true,
                maxScore: parsed.maxScore,
                audioUrl: parsed.audioUrl || block.audioUrl || 'assets/34/test-1/listening.mp3',
                events: parsed.listeningEvents,
                options: parsed.listeningEvents.map(e => ({ id: e.label, label: `Sự kiện ${e.label}` })),
                skillCodes: ['listening'],
                releasePolicy: 'inherit'
              });
              draftState.gradingKey.items[newItemId] = {
                graderType: 'ordered_sequence',
                expectedSequence: parsed.listeningEvents.map(e => e.label)
              };
            });
            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            render();
          }
        });
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
        item.maxScore = item.events.length;
        resequenceItemPositions();
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
        item.maxScore = item.events.length;
        resequenceItemPositions();
        render();
      });
    });

    function createBatchErrorCorrection(bIdx, targetEx, count = 1) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const startingPos = getNextPosition();
      block.items = block.items || [];
      const batchItems = [];

      for (let i = 0; i < count; i++) {
        const currentPos = startingPos + i;
        const newItemId = generateUuid();
        batchItems.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: currentPos,
          exerciseId: targetEx.exerciseId,
          exerciseTitle: targetEx.title,
          prompt: '',
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
          expectedErrors: [''],
          expectedCorrections: [''],
          scoringRule: 'split_points',
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
      }

      insertItemsIntoBlockExercise(block, targetEx, batchItems);
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    // Add Error Correction Question (Opens CSV / Excel import popup with single item creation option)
    const addErrorCorrectionBtns = container.querySelectorAll('.btn-add-error-correction');
    addErrorCorrectionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);

        openGenericBatchModal({
          title: 'Nhập câu hỏi Tìm và sửa lỗi vào Exercise (CSV / Excel)',
          subtitle: `Nhập danh sách câu hỏi Tìm và sửa lỗi cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Hỗ trợ nhập từ lỗi và các đáp án sửa đúng phân tách bằng dấu gạch đứng (|).`,
          defaultCount: 8,
          minCount: 1,
          maxCount: 50,
          csvConfig: {
            templateFileName: 'mau_tim_sua_loi_sai.csv',
            columnsHint: 'Cột: Đề bài câu | Từ/cụm từ lỗi | Các đáp án sửa đúng (|) | Giải thích',
            placeholder: 'She do not like swimming in cold weather.,do,does|doesn\'t,Chủ ngữ số ít đi với does\nI have seen him yesterday morning.,have seen,saw,Hành động có mốc thời gian quá khứ',
            getTemplateCsv: generateErrorCorrectionTemplateCsv,
            parseCsv: parseErrorCorrectionCsv,
            renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} [Lỗi: <span style="color:#ef4444;text-decoration:line-through;">${escapeHtml(itm.targetWord)}</span> → <span style="color:#10b981;">${escapeHtml(itm.accepted[0] || '')}</span>]`,
            onImport: (items) => {
              const startingPos = getNextPosition();
              const batchItems = [];
              items.forEach((parsed, idx) => {
                const newItemId = generateUuid();
                batchItems.push({
                  itemFamilyId: generateUuid(),
                  itemVersionId: newItemId,
                  position: startingPos + idx,
                  exerciseId: targetEx.exerciseId,
                  exerciseTitle: targetEx.title,
                  prompt: parsed.prompt,
                  helpText: '',
                  interactionType: 'error_correction',
                  pedagogicalTypeCode: 'error_correction',
                  layoutType: 'correction_inline',
                  graderType: 'accepted_text',
                  required: true,
                  maxScore: 1,
                  targetWord: parsed.targetWord,
                  explanation: parsed.explanation || '',
                  skillCodes: ['grammar'],
                  releasePolicy: 'inherit'
                });
                draftState.gradingKey.items[newItemId] = {
                  graderType: 'accepted_text',
                  accepted: parsed.accepted || [],
                  normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                };
              });
              insertItemsIntoBlockExercise(block, targetEx, batchItems);
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          },
          onConfirm: ({ count }) => {
            createBatchErrorCorrection(bIdx, targetEx, count);
          },
          onSingle: () => {
            createBatchErrorCorrection(bIdx, targetEx, 1);
          }
        });
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
        const generatedErrors = expandSentenceVariants([raw]);
        const prevErrors = Array.isArray(currentKey.expectedErrors) ? currentKey.expectedErrors : [];
        currentKey.expectedErrors = Array.from(new Set([...prevErrors, ...generatedErrors]));
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
        const generatedCorrections = expandSentenceVariants([raw]);
        const prevCorrections = Array.isArray(currentKey.expectedCorrections) ? currentKey.expectedCorrections : [];
        currentKey.expectedCorrections = Array.from(new Set([...prevCorrections, ...generatedCorrections]));
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

    function createBatchSentenceReorder(bIdx, targetEx, count = 1) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const startingPos = getNextPosition();
      block.items = block.items || [];
      const batchItems = [];
      const defaultTokens = ['She', 'has worked', 'at the company', 'for five years'];
      const defaultSentence = 'She has worked at the company for five years.';

      for (let i = 0; i < count; i++) {
        const currentPos = startingPos + i;
        const newItemId = generateUuid();
        batchItems.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: currentPos,
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
          tokens: [...defaultTokens],
          distractors: [],
          targetSentence: defaultSentence,
          options: [],
          skillCodes: ['grammar'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'accepted_text',
          accepted: [defaultSentence],
          tokens: [...defaultTokens],
          distractors: [],
          normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
        };
      }

      insertItemsIntoBlockExercise(block, targetEx, batchItems);
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    // Add Sentence Reorder Question
    const addSentenceReorderBtns = container.querySelectorAll('.btn-add-sentence-reorder');
    addSentenceReorderBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        openGenericBatchModal({
          title: 'Tạo hàng loạt câu hỏi Sắp xếp câu',
          subtitle: `Tạo nhanh các câu hỏi Sắp xếp từ/cụm từ thuộc bài tập ${targetEx.title || 'bài tập'}.`,
          defaultCount: 5,
          minCount: 1,
          maxCount: 50,
          onConfirm: ({ count }) => {
            createBatchSentenceReorder(bIdx, targetEx, count);
          },
          onSingle: () => {
            createBatchSentenceReorder(bIdx, targetEx, 1);
          }
        });
      });
    });

    function createBatchSentenceTransformation(bIdx, targetEx, count = 1) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const startingPos = getNextPosition();
      block.items = block.items || [];
      const batchItems = [];
      const defaultKw = 'PREVENTED';
      const defaultPrefix = 'His severe illness';
      const defaultSuffix = 'from going to the conference.';
      const defaultAnswer = 'prevented him';
      const defaultPrompt = 'He could not go to the conference because he was severely ill.';

      for (let i = 0; i < count; i++) {
        const currentPos = startingPos + i;
        const newItemId = generateUuid();
        batchItems.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: currentPos,
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
      }

      insertItemsIntoBlockExercise(block, targetEx, batchItems);
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    // Add Sentence Transformation Question (Opens CSV / Excel import popup with single item creation option)
    const addSentenceTransformationBtns = container.querySelectorAll('.btn-add-sentence-transformation');
    addSentenceTransformationBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);

        openGenericBatchModal({
          title: 'Nhập câu hỏi Biến đổi câu vào Exercise (CSV / Excel)',
          subtitle: `Nhập danh sách câu hỏi Biến đổi câu có từ gợi ý cho bài tập ${escapeHtml(targetEx.title || 'Bài tập')}. Hỗ trợ nhập từ khóa bắt buộc và các đáp án đúng phân tách bằng dấu gạch đứng (|).`,
          defaultCount: 5,
          minCount: 1,
          maxCount: 50,
          csvConfig: {
            templateFileName: 'mau_viet_lai_cau.csv',
            columnsHint: 'Cột: Câu gốc | Từ khóa bắt buộc | Câu gợi ý / Chỗ trống | Các phương án đúng (|) | Giải thích',
            placeholder: 'He could not go because of illness.,PREVENTED,His severe illness (1) __________ from going.,prevented him,Cấu trúc prevent someone from doing\nIt is not necessary for you to come.,NEED,You (1) __________ come tomorrow.,need not|do not need to|don\'t need to,Need not do sth',
            getTemplateCsv: generateSentenceTransformationTemplateCsv,
            parseCsv: parseSentenceTransformationCsv,
            renderPreviewRow: (itm, idx) => `<strong>Câu ${idx}:</strong> ${escapeHtml(itm.prompt)} [Từ khóa: <strong>${escapeHtml(itm.mandatoryKeyword)}</strong> → Đáp án: <em>${escapeHtml(itm.accepted[0] || '')}</em>]`,
            onImport: (items) => {
              const startingPos = getNextPosition();
              const batchItems = [];
              items.forEach((parsed, idx) => {
                const newItemId = generateUuid();
                batchItems.push({
                  itemFamilyId: generateUuid(),
                  itemVersionId: newItemId,
                  position: startingPos + idx,
                  exerciseId: targetEx.exerciseId,
                  exerciseTitle: targetEx.title,
                  prompt: parsed.prompt,
                  helpText: '',
                  interactionType: 'short_text',
                  pedagogicalTypeCode: 'sentence_rewrite',
                  layoutType: 'keyword_transformation',
                  graderType: 'accepted_text',
                  required: true,
                  maxScore: 1,
                  keyword: parsed.mandatoryKeyword,
                  framePrefix: '',
                  frameSuffix: '',
                  targetAnswer: parsed.accepted?.[0] || '',
                  targetSentence: parsed.targetSentence || '(1) __________',
                  options: [],
                  skillCodes: ['grammar'],
                  releasePolicy: 'inherit'
                });
                draftState.gradingKey.items[newItemId] = {
                  graderType: 'accepted_text',
                  keyword: parsed.mandatoryKeyword,
                  accepted: parsed.accepted || [],
                  normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
                };
              });
              insertItemsIntoBlockExercise(block, targetEx, batchItems);
              resequenceItemPositions();
              markAsDirty();
              render();
            }
          },
          onConfirm: ({ count }) => {
            createBatchSentenceTransformation(bIdx, targetEx, count);
          },
          onSingle: () => {
            createBatchSentenceTransformation(bIdx, targetEx, 1);
          }
        });
      });
    });

    function createBatchPronunciation(bIdx, targetEx, count = 1) {
      const block = draftState.blocks[bIdx];
      if (!block) return;
      const startingPos = getNextPosition();
      block.items = block.items || [];
      const batchItems = [];
      const defaultWord = 'camera';
      const defaultIpa = '/ˈkæm.ər.ə/';
      const defaultOptions = [
        { id: 'A', label: '/ˈkæm.ər.ə/' },
        { id: 'B', label: '/kəˈmɪər.ə/' },
        { id: 'C', label: '/ˈkæm.eɪ.rə/' }
      ];

      for (let i = 0; i < count; i++) {
        const currentPos = startingPos + i;
        const newItemId = generateUuid();
        batchItems.push({
          itemFamilyId: generateUuid(),
          itemVersionId: newItemId,
          position: currentPos,
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
          options: defaultOptions.map(o => ({ ...o })),
          skillCodes: ['pronunciation'],
          releasePolicy: 'inherit'
        });
        draftState.gradingKey.items[newItemId] = {
          graderType: 'exact_option',
          expectedOptionId: 'A',
          targetWord: defaultWord,
          ipaTranscription: defaultIpa
        };
      }

      insertItemsIntoBlockExercise(block, targetEx, batchItems);
      resequenceItemPositions();
      markAsDirty();
      render();
    }

    // Add Pronunciation Choice Question
    const addPronunciationChoiceBtns = container.querySelectorAll('.btn-add-pronunciation-choice, .btn-add-pronunciation');
    addPronunciationChoiceBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const block = draftState.blocks[bIdx];
        if (!block) return;
        const targetEx = resolveTargetExercise(block, btn);
        openGenericBatchModal({
          title: 'Tạo hàng loạt câu hỏi Phát âm & Ký hiệu IPA',
          subtitle: `Tạo nhanh các câu hỏi Phát âm & Ký hiệu IPA thuộc bài tập ${targetEx.title || 'bài tập'}.`,
          defaultCount: 5,
          minCount: 1,
          maxCount: 50,
          onConfirm: ({ count }) => {
            createBatchPronunciation(bIdx, targetEx, count);
          },
          onSingle: () => {
            createBatchPronunciation(bIdx, targetEx, 1);
          }
        });
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
        const generated = expandSentenceVariants([target]);
        const prevAccepted = Array.isArray(currentKey.accepted) ? currentKey.accepted : [];
        currentKey.accepted = Array.from(new Set([...prevAccepted, ...generated]));
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
      const newItem = {
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
      };
      insertItemsIntoBlockExercise(block, targetEx, newItem);
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
            <div style="display: flex; align-items: center; gap: 8px;">
              ${renderSvgIcon('plusCircle', 'icon-inline')}
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">Tạo hàng loạt câu hỏi Thẻ từ vựng qua ảnh</h3>
            </div>
            <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
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
              ${renderSvgIcon('plusCircle', 'icon-inline')} <span>Tạo câu hỏi hàng loạt</span>
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
          const batchItems = [];

          for (let i = 0; i < count; i++) {
            const currentPos = startingPos + i;
            const newItemId = generateUuid();

            batchItems.push({
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

          insertItemsIntoBlockExercise(block, targetEx, batchItems);

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
        const generated = expandSentenceVariants([targetVal]);
        const prevAccepted = Array.isArray(currentKey.accepted) ? currentKey.accepted : [];
        currentKey.accepted = Array.from(new Set([...prevAccepted, ...generated]));
        draftState.gradingKey.items[item.itemVersionId] = currentKey;
        render();
      });
    });

    // Pictorial Drive image conversion & preview listeners
    const pictorialImageInputs = container.querySelectorAll('.input-pictorial-image');
    pictorialImageInputs.forEach(input => {
      const updatePreview = () => {
        const raw = input.value ? input.value.trim() : '';
        const converted = convertGoogleDriveImageUrl(raw);
        if (converted !== raw) {
          input.value = converted;
        }
        const bIdx = Number(input.getAttribute('data-block-idx'));
        const iIdx = Number(input.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (item) {
          item.image = converted || null;
          item.stimulusImageUrl = converted || null;
        }
        const card = input.closest ? (input.closest('.builder-item-card') || input.parentElement?.parentElement) : null;
        const previewImg = card?.querySelector ? card.querySelector('.pictorial-preview-img') : null;
        const previewErr = card?.querySelector ? card.querySelector('.pictorial-preview-error') : null;
        if (previewImg) {
          if (converted) {
            previewImg.src = converted;
            previewImg.style.display = 'inline-block';
            if (previewErr) previewErr.style.display = 'none';
          } else {
            previewImg.src = '';
            previewImg.style.display = 'none';
            if (previewErr) previewErr.style.display = 'none';
          }
        }
      };
      input.addEventListener('input', updatePreview);
      input.addEventListener('change', updatePreview);
      input.addEventListener('paste', () => {
        setTimeout(updatePreview, 20);
      });
    });

    const previewDriveBtns = container.querySelectorAll('.btn-preview-drive-image');
    previewDriveBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest ? (btn.closest('.builder-item-card') || btn.parentElement?.parentElement) : null;
        const input = card?.querySelector ? card.querySelector('.input-pictorial-image') : null;
        if (input) {
          const raw = input.value ? input.value.trim() : '';
          const converted = convertGoogleDriveImageUrl(raw);
          if (converted !== raw) input.value = converted;
          const bIdx = Number(btn.getAttribute('data-block-idx'));
          const iIdx = Number(btn.getAttribute('data-item-idx'));
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (item) {
            item.image = converted || null;
            item.stimulusImageUrl = converted || null;
          }
          const previewImg = card?.querySelector ? card.querySelector('.pictorial-preview-img') : null;
          const previewErr = card?.querySelector ? card.querySelector('.pictorial-preview-error') : null;
          if (previewImg) {
            if (converted) {
              previewImg.src = converted;
              previewImg.style.display = 'inline-block';
              if (previewErr) previewErr.style.display = 'none';
            } else {
              previewImg.src = '';
              previewImg.style.display = 'none';
            }
          }
        }
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

      const newItem = {
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
      };
      insertItemsIntoBlockExercise(block, targetEx, newItem);
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
            <div style="display: flex; align-items: center; gap: 8px;">
              ${renderSvgIcon('fileText', 'icon-inline')}
              <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600;">Nhập Cặp từ vựng vào Exercise (CSV / Excel)</h3>
            </div>
            <button type="button" class="btn btn-icon btn-sm btn-ghost btn-close-batch-modal" title="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
          </div>
          <div class="modal-batch-vocab-body">
            <div class="alert-notice alert-info" style="margin: 0; padding: 10px 14px; font-size: 0.85rem;">
              Nhập danh sách từ vựng cho bài tập <strong>${escapeHtml(targetEx.title || 'Bài tập')}</strong>. Cột 2 (nghĩa tiếng Việt) sẽ tự động được gộp trùng, sắp xếp tăng dần A-Z tiếng Việt và ánh xạ chính xác vào đáp án.
            </div>

            <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-sm btn-download-template">
                ${renderSvgIcon('download', 'icon-inline')} <span>Tải file mẫu CSV</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-trigger-csv-file">
                ${renderSvgIcon('upload', 'icon-inline')} <span>Chọn file .CSV</span>
              </button>
              <input type="file" class="input-vocab-csv-file" accept=".csv,text/csv,text/plain" style="display:none;" />
              <span style="font-size: 0.8rem; color: #64748b;">(Hỗ trợ UTF-8 BOM, tab Excel hoặc dấu phẩy)</span>
            </div>

            <div class="form-group" style="margin-top: 12px;">
              <label class="form-label" style="display: flex; justify-content: space-between;">
                <strong>Dán 2 cột từ Excel / Sheets hoặc nội dung CSV:</strong>
                <span style="font-size: 0.8rem; color: #64748b;">Cột 1: Từ tiếng Anh | Cột 2: Nghĩa tiếng Việt</span>
              </label>
              <textarea class="form-control textarea-batch-vocab-csv" rows="8" placeholder="destination&#9;điểm đến&#10;itinerary&#9;lịch trình chuyến đi&#10;resilient&#9;kiên cường&#10;sustainable&#9;bền vững&#10;environment&#9;môi trường"></textarea>
            </div>

            <div class="vocab-preview-summary" style="margin-top: 8px; font-size: 0.85rem; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; display: none;"></div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
              <label class="batch-checkbox-row">
                <input type="checkbox" class="chk-auto-variants" checked />
                <span>Tự động sinh biến thể đáp án sau khi nhập (Apostrophe, contractions, NFKC)</span>
              </label>
              <label class="batch-checkbox-row">
                <input type="checkbox" class="chk-replace-existing" />
                <span>Xóa các câu từ vựng cũ trong bài tập này trước khi nhập (Mặc định: Thêm tiếp vào sau)</span>
              </label>
            </div>
          </div>
          <div class="modal-batch-vocab-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
            <button type="button" class="btn btn-secondary btn-batch-single">
              + Chỉ tạo 1 câu thủ công
            </button>
            <div style="display: flex; gap: 8px;">
              <button type="button" class="btn btn-secondary btn-close-batch-modal-btn">Hủy bỏ</button>
              <button type="button" class="btn btn-primary btn-batch-confirm">
                ${renderSvgIcon('check', 'icon-inline')} <span>Xác nhận nhập dữ liệu</span>
              </button>
            </div>
          </div>
        </div>
      `;

      const closeModal = () => {
        modal.style.display = 'none';
      };

      const closeBtns = modal.querySelectorAll('.btn-close-batch-modal, .btn-close-batch-modal-btn');
      closeBtns.forEach(btn => btn.addEventListener('click', closeModal));

      // Download CSV Template
      const downloadBtn = modal.querySelector('.btn-download-template');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          const csvContent = generateVocabPairTemplateCsv();
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', 'mau_cap_tu_vung.csv');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        });
      }

      // File Upload trigger
      const triggerFileBtn = modal.querySelector('.btn-trigger-csv-file');
      const fileInput = modal.querySelector('.input-vocab-csv-file');
      const textarea = modal.querySelector('.textarea-batch-vocab-csv');
      const previewBox = modal.querySelector('.vocab-preview-summary');

      const updatePreview = () => {
        if (!textarea || !previewBox) return;
        const val = textarea.value.trim();
        if (!val) {
          previewBox.style.display = 'none';
          return;
        }
        const parsed = parseVocabPairCsv(val);
        previewBox.style.display = 'block';
        if (parsed.validRows.length === 0) {
          previewBox.innerHTML = `<span style="color: #ef4444;">Chưa tìm thấy cặp từ vựng hợp lệ nào. Vui lòng kiểm tra định dạng dữ liệu (mỗi dòng gồm 2 cột cách nhau bằng Tab hoặc phẩy).</span>`;
        } else {
          let html = `<span style="color: #10b981; font-weight: 600;">Tìm thấy ${parsed.validRows.length} cặp từ vựng hợp lệ.</span> Sắp xếp A-Z tiếng Việt và tự động ánh xạ đáp án.`;
          if (parsed.invalidRows.length > 0) {
            html += `<br/><span style="color: #f59e0b;">Bỏ qua ${parsed.invalidRows.length} dòng không đủ 2 cột (Dòng: ${parsed.invalidRows.slice(0, 5).map(r => r.line).join(', ')}${parsed.invalidRows.length > 5 ? '...' : ''}).</span>`;
          }
          previewBox.innerHTML = html;
        }
      };

      if (triggerFileBtn && fileInput) {
        triggerFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            const text = evt.target.result;
            if (textarea) {
              textarea.value = text;
              updatePreview();
            }
          };
          reader.readAsText(file, 'utf-8');
        });
      }

      if (textarea) {
        textarea.addEventListener('input', updatePreview);
      }

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
          const val = textarea?.value?.trim() || '';
          const autoVariants = modal.querySelector('.chk-auto-variants')?.checked !== false;
          const replaceExisting = modal.querySelector('.chk-replace-existing')?.checked === true;

          const parsed = parseVocabPairCsv(val);

          if (parsed.validRows.length > 0) {
            if (replaceExisting) {
              block.items = (block.items || []).filter(it => !(it.exerciseId === targetEx.exerciseId && it.interactionType === 'text_select_pair'));
            }

            block.items = block.items || [];

            // Thu thập toàn bộ nghĩa tiếng Việt và sắp xếp tăng dần theo tiếng Việt (A-Z)
            const allVietnamese = Array.from(new Set(parsed.validRows.map(r => r.vietnamese))).sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));

            const options = allVietnamese.map((label, idx) => ({
              id: `meaning-${String(idx + 1).padStart(2, '0')}`,
              label
            }));

            const startingPos = getNextPosition();
            const batchItems = [];

            parsed.validRows.forEach((row, i) => {
              const currentPos = startingPos + i;
              const newItemId = generateUuid();
              const matchedOpt = options.find(o => o.label === row.vietnamese) || options[0];

              batchItems.push({
                itemFamilyId: generateUuid(),
                itemVersionId: newItemId,
                position: currentPos,
                exerciseId: targetEx.exerciseId,
                exerciseTitle: targetEx.title,
                prompt: row.english,
                targetWord: row.english,
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

              const acceptedVariants = autoVariants ? expandSentenceVariants([row.english]) : [row.english];

              draftState.gradingKey.items[newItemId] = {
                graderType: 'accepted_text_exact_option',
                accepted: acceptedVariants,
                expectedOptionId: matchedOpt.id,
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
            });

            insertItemsIntoBlockExercise(block, targetEx, batchItems);
            resequenceItemPositions();
            markAsDirty();
            closeModal();
            render();
            return;
          }

          // Fallback nếu không có nội dung CSV hợp lệ: tạo 1 câu đơn
          closeModal();
          createSingleVocabItem(bIdx, targetEx);
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
        const newItem = {
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
        };
        insertItemsIntoBlockExercise(block, targetEx, newItem);
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
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-index') : null) || (card.getAttribute && card.getAttribute('data-index')) || 0);
            const block = draftState.blocks[bIdx];
            const blockCardKey = (block && block.blockId) || (card.getAttribute && card.getAttribute('data-block-id')) || `b-${bIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(blockCardKey);
            } else {
              collapsedCardKeys.delete(blockCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
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
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-block-idx') : null) || (card.getAttribute && card.getAttribute('data-block-idx')) || 0);
            const eIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-exercise-idx') : null) || (card.getAttribute && card.getAttribute('data-exercise-idx')) || 0);
            const ex = draftState.blocks[bIdx]?.exercises?.[eIdx];
            const exCardKey = (ex && ex.exerciseId) || (card.getAttribute && card.getAttribute('data-exercise-id')) || `ex-${bIdx}-${eIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(exCardKey);
            } else {
              collapsedCardKeys.delete(exCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
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
            const bIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-block-idx') : null) || (card.getAttribute && card.getAttribute('data-block-idx')) || 0);
            const iIdx = Number((typeof btn.getAttribute === 'function' ? btn.getAttribute('data-item-idx') : null) || (card.getAttribute && card.getAttribute('data-item-idx')) || 0);
            const item = draftState.blocks[bIdx]?.items?.[iIdx];
            const itemCardKey = (item && item.itemVersionId) || (card.getAttribute && card.getAttribute('data-item-id')) || `item-${bIdx}-${iIdx}`;
            const isCollapsed = card.classList.toggle('is-collapsed');
            if (isCollapsed) {
              collapsedCardKeys.add(itemCardKey);
            } else {
              collapsedCardKeys.delete(itemCardKey);
            }
            btn.innerHTML = isCollapsed ? renderSvgIcon('chevronRight', 'icon-inline') : renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof btn.setAttribute === 'function') {
              btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
            }
          });
        }
      });
    }

    // Bulk Collapse All
    const btnCollapseAll = typeof container.querySelector === 'function' ? container.querySelector('#btn-collapse-all') : null;
    if (btnCollapseAll && typeof btnCollapseAll.addEventListener === 'function') {
      btnCollapseAll.addEventListener('click', () => {
        draftState.blocks.forEach((block, bIdx) => {
          collapsedCardKeys.add(block.blockId || `b-${bIdx}`);
          (block.exercises || []).forEach((ex, eIdx) => {
            collapsedCardKeys.add(ex.exerciseId || `ex-${bIdx}-${eIdx}`);
          });
          (block.items || []).forEach((item, iIdx) => {
            collapsedCardKeys.add(item.itemVersionId || `item-${bIdx}-${iIdx}`);
          });
        });

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
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const exToggles = container.querySelectorAll('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
        const itemToggles = container.querySelectorAll('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronRight', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'false');
          });
        }
      });
    }

    // Bulk Expand All
    const btnExpandAll = typeof container.querySelector === 'function' ? container.querySelector('#btn-expand-all') : null;
    if (btnExpandAll && typeof btnExpandAll.addEventListener === 'function') {
      btnExpandAll.addEventListener('click', () => {
        collapsedCardKeys.clear();

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
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const exToggles = container.querySelectorAll('.btn-toggle-exercise-collapse');
        if (exToggles && typeof exToggles.forEach === 'function') {
          exToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
        const itemToggles = container.querySelectorAll('.btn-toggle-item-collapse');
        if (itemToggles && typeof itemToggles.forEach === 'function') {
          itemToggles.forEach(b => {
            b.innerHTML = renderSvgIcon('chevronDown', 'icon-inline');
            if (typeof b.setAttribute === 'function') b.setAttribute('aria-expanded', 'true');
          });
        }
      });
    }

    // Prompt change listener for inline cloze and real-time counter
    const promptInputs = container.querySelectorAll('.item-prompt-input');
    promptInputs.forEach(promptEl => {
      promptEl.addEventListener('input', () => {
        const bIdx = Number(promptEl.getAttribute('data-block-idx'));
        const iIdx = Number(promptEl.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        item.prompt = promptEl.value;
        const itemCard = (typeof promptEl.closest === 'function') ? promptEl.closest('.builder-item-card') : (promptEl.parentElement || null);
        const charCountEl = itemCard?.querySelector ? itemCard.querySelector('.prompt-char-count') : null;
        if (charCountEl) {
          charCountEl.textContent = `${(promptEl.value || '').length} ký tự`;
        }
        markAsDirty();
      });

      promptEl.addEventListener('change', () => {
        const bIdx = Number(promptEl.getAttribute('data-block-idx'));
        const iIdx = Number(promptEl.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        syncInputs();
        if (item.layoutType === 'inline_cloze' || item.pedagogicalTypeCode === 'inline_cloze') {
          resequenceItemPositions();
          render();
        }
      });
    });

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

    // HTML5 Drag and Drop for Question Items (Drag Handle Isolated)
    const draggableItemCards = container.querySelectorAll('.builder-item-card');
    let draggedItemInfo = null;
    let isDragHandleActive = false;
    let activeDragCard = null;

    if (draggableItemCards && typeof draggableItemCards.forEach === 'function') {
      draggableItemCards.forEach(card => {
        if (typeof card.addEventListener !== 'function') return;

        const handle = card.querySelector ? card.querySelector('.item-drag-handle') : null;
        if (handle && typeof handle.addEventListener === 'function') {
          handle.addEventListener('mousedown', () => {
            isDragHandleActive = true;
            activeDragCard = card;
            if (typeof card.setAttribute === 'function') {
              card.setAttribute('draggable', 'true');
            }
          });

          const resetHandleState = () => {
            if (!draggedItemInfo) {
              isDragHandleActive = false;
              activeDragCard = null;
              if (typeof card.setAttribute === 'function') {
                card.setAttribute('draggable', 'false');
              }
            }
          };

          handle.addEventListener('mouseup', resetHandleState);
        }

        card.addEventListener('dragstart', (e) => {
          const targetTag = e.target?.tagName?.toLowerCase();
          const isInputOrControl = targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || targetTag === 'button';
          const isTargetFromHandle = (isDragHandleActive && activeDragCard === card) ||
            (e.target && typeof e.target.closest === 'function' && Boolean(e.target.closest('.item-drag-handle')));

          if (!isTargetFromHandle || isInputOrControl) {
            if (typeof e.preventDefault === 'function') {
              e.preventDefault();
            }
            return;
          }

          syncInputs();
          draggedItemInfo = {
            blockIdx: Number(card.getAttribute('data-block-idx')),
            itemIdx: Number(card.getAttribute('data-item-idx')),
            itemId: card.getAttribute('data-item-id'),
            exerciseId: card.getAttribute('data-exercise-id')
          };
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try {
              e.dataTransfer.setData('text/plain', card.getAttribute('data-item-id') || '');
            } catch (_) {}
          }
          if (card.classList && typeof card.classList.add === 'function') {
            card.classList.add('dragging');
          }
        });

        card.addEventListener('dragover', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

          const rect = typeof card.getBoundingClientRect === 'function' ? card.getBoundingClientRect() : null;
          const isTopHalf = rect ? ((e.clientY - rect.top) < (rect.height / 2)) : false;

          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
            if (isTopHalf) {
              card.classList.add('drop-target-above');
            } else {
              card.classList.add('drop-target-below');
            }
          }
        });

        card.addEventListener('dragleave', () => {
          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
          }
        });

        card.addEventListener('drop', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (typeof e.stopPropagation === 'function') e.stopPropagation();

          if (card.classList && typeof card.classList.remove === 'function') {
            card.classList.remove('drop-target-above', 'drop-target-below');
          }

          const sourceBlockIdx = draggedItemInfo.blockIdx;
          const sourceItemIdx = draggedItemInfo.itemIdx;
          const targetBlockIdx = Number(card.getAttribute('data-block-idx'));
          const targetItemIdx = Number(card.getAttribute('data-item-idx'));
          const targetExerciseId = card.getAttribute('data-exercise-id');

          const rect = typeof card.getBoundingClientRect === 'function' ? card.getBoundingClientRect() : null;
          const positionAbove = rect ? ((e.clientY - rect.top) < (rect.height / 2)) : false;

          reorderBlockItem(draftState, sourceBlockIdx, sourceItemIdx, targetBlockIdx, targetItemIdx, positionAbove, targetExerciseId);

          resequenceItemPositions();
          markAsDirty();
          render();
        });

        card.addEventListener('dragend', () => {
          draggedItemInfo = null;
          isDragHandleActive = false;
          activeDragCard = null;
          const allCards = container.querySelectorAll('.builder-item-card');
          if (allCards && typeof allCards.forEach === 'function') {
            allCards.forEach(c => {
              if (typeof c.setAttribute === 'function') {
                c.setAttribute('draggable', 'false');
              }
              if (c.classList && typeof c.classList.remove === 'function') {
                c.classList.remove('dragging', 'drop-target-above', 'drop-target-below');
              }
            });
          }
          const allLists = container.querySelectorAll('.exercise-items-list');
          if (allLists && typeof allLists.forEach === 'function') {
            allLists.forEach(l => {
              if (l.classList && typeof l.classList.remove === 'function') {
                l.classList.remove('drag-over-empty');
              }
            });
          }
        });
      });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('mouseup', () => {
        if (isDragHandleActive && !draggedItemInfo) {
          isDragHandleActive = false;
          if (activeDragCard && typeof activeDragCard.setAttribute === 'function') {
            activeDragCard.setAttribute('draggable', 'false');
          }
          activeDragCard = null;
        }
      });
    }

    // Drop onto empty exercise items container
    const exerciseLists = container.querySelectorAll('.exercise-items-list');
    if (exerciseLists && typeof exerciseLists.forEach === 'function') {
      exerciseLists.forEach(list => {
        if (typeof list.addEventListener !== 'function') return;

        list.addEventListener('dragover', (e) => {
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          if (list.classList && typeof list.classList.add === 'function') {
            list.classList.add('drag-over-empty');
          }
        });

        list.addEventListener('dragleave', () => {
          if (list.classList && typeof list.classList.remove === 'function') {
            list.classList.remove('drag-over-empty');
          }
        });

        list.addEventListener('drop', (e) => {
          if (e.target && typeof e.target.closest === 'function' && e.target.closest('.builder-item-card')) return;
          if (!draggedItemInfo) return;
          e.preventDefault();
          if (list.classList && typeof list.classList.remove === 'function') {
            list.classList.remove('drag-over-empty');
          }

          const targetExerciseId = list.getAttribute('data-exercise-id');
          const targetBlockIdx = Number(list.getAttribute('data-block-idx'));

          moveItemToExercise(draftState, draggedItemInfo.blockIdx, draggedItemInfo.itemIdx, targetBlockIdx, targetExerciseId);

          resequenceItemPositions();
          markAsDirty();
          render();
        });
      });
    }

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
        const blankNum = btn.getAttribute('data-blank-num');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const card = btn.closest('.builder-item-card');
        const blankCard = btn.closest('.cloze-blank-config-card');
        const rawInput = blankCard ? blankCard.querySelector('.input-cloze-blank-target') : card?.querySelector('.input-fitb-raw');
        const rawVal = rawInput?.value?.trim() || '';
        if (!rawVal) {
          alert('Vui lòng nhập đáp án chuẩn trước khi sinh biến thể.');
          return;
        }
        const generated = expandSentenceVariants([rawVal]);
        if (blankNum && item.layoutType === 'inline_cloze') {
          item.clozeAnswers = item.clozeAnswers || {};
          const prevAccepted = Array.isArray(item.clozeAnswers[blankNum]?.accepted) ? item.clozeAnswers[blankNum].accepted : [];
          const merged = Array.from(new Set([...prevAccepted, ...generated]));
          item.clozeAnswers[blankNum] = {
            targetWord: rawVal,
            accepted: merged
          };
          const detected = parseClozeBlanks(item.prompt || '');
          const firstNum = detected.length ? detected[0].number : (item.position || 1);
          if (Number(blankNum) === firstNum) {
            draftState.gradingKey.items[item.itemVersionId] = {
              graderType: 'accepted_text',
              accepted: merged,
              normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
            };
          }
        } else {
          const prevAccepted = Array.isArray(draftState.gradingKey.items[item.itemVersionId]?.accepted)
            ? draftState.gradingKey.items[item.itemVersionId].accepted
            : [];
          const merged = Array.from(new Set([...prevAccepted, ...generated]));
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'accepted_text',
            accepted: merged,
            normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
          };
        }
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
        const blankNum = btn.getAttribute('data-blank-num');
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        const variantToRemove = btn.getAttribute('data-variant');
        if (!item) return;
        if (blankNum && item.layoutType === 'inline_cloze') {
          item.clozeAnswers = item.clozeAnswers || {};
          if (item.clozeAnswers[blankNum] && Array.isArray(item.clozeAnswers[blankNum].accepted)) {
            item.clozeAnswers[blankNum].accepted = item.clozeAnswers[blankNum].accepted.filter(v => v !== variantToRemove);
          }
          const detected = parseClozeBlanks(item.prompt || '');
          const firstNum = detected.length ? detected[0].number : (item.position || 1);
          if (Number(blankNum) === firstNum) {
            const currentKey = draftState.gradingKey.items[item.itemVersionId];
            if (currentKey && Array.isArray(currentKey.accepted)) {
              currentKey.accepted = currentKey.accepted.filter(v => v !== variantToRemove);
            }
          }
          render();
          return;
        }
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
        const prevAccepted = Array.isArray(draftState.gradingKey.items[item.itemVersionId]?.accepted)
          ? draftState.gradingKey.items[item.itemVersionId].accepted
          : [];
        const merged = Array.from(new Set([...prevAccepted, ...generated]));
        draftState.gradingKey.items[item.itemVersionId] = {
          graderType: 'accepted_text_exact_option',
          accepted: merged,
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
          const blankNum = input.getAttribute('data-blank-num');
          const item = draftState.blocks[bIdx]?.items?.[iIdx];
          if (!item) return;

          if (blankNum && item.layoutType === 'inline_cloze') {
            item.clozeAnswers = item.clozeAnswers || {};
            item.clozeAnswers[blankNum] = item.clozeAnswers[blankNum] || { accepted: [] };
            if (!item.clozeAnswers[blankNum].accepted.includes(val)) {
              item.clozeAnswers[blankNum].accepted.push(val);
              if (item.clozeAnswers[blankNum].accepted.length > 40) item.clozeAnswers[blankNum].accepted.pop();
            }
            const detected = parseClozeBlanks(item.prompt || '');
            const firstNum = detected.length ? detected[0].number : (item.position || 1);
            if (Number(blankNum) === firstNum) {
              const currentKey = draftState.gradingKey.items[item.itemVersionId] || {
                graderType: 'accepted_text',
                accepted: [],
                normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true }
              };
              if (!currentKey.accepted.includes(val)) {
                currentKey.accepted.push(val);
                if (currentKey.accepted.length > 40) currentKey.accepted.pop();
                draftState.gradingKey.items[item.itemVersionId] = currentKey;
              }
            }
            render();
            return;
          }

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
          btn.innerHTML = `${renderSvgIcon('zap', 'icon-inline')} Chấm thử AI`;
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
            phase: draftState.phase,
            sessionNumber: draftState.sessionNumber,
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
            if (itmKey && itmKey.graderType === 'ordered_sequence') {
              if (!Array.isArray(itmKey.expectedSequence) || itmKey.expectedSequence.length === 0) {
                itmKey.expectedSequence = ['A', 'B', 'C', 'D', 'E'];
              }
            }
            if (itmKey && itmKey.graderType === 'correction_pair') {
              if (!Array.isArray(itmKey.expectedErrors) || itmKey.expectedErrors.length === 0) {
                itmKey.expectedErrors = ['error'];
              }
              if (!Array.isArray(itmKey.expectedCorrections) || itmKey.expectedCorrections.length === 0) {
                itmKey.expectedCorrections = ['correction'];
              }
              if (!itmKey.scoringRule) {
                itmKey.scoringRule = 'split_points';
              }
            }
          }
          payload.gradingKey = cleanGradingKey;
          draftState.gradingKey = cleanGradingKey;

          const res = await options.onSaveDraft(payload);
          isDirty = false;
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

        const formatSimulationPrompt = (promptText) => {
          if (!promptText || typeof promptText !== 'string') return '';
          const containsHtml = /<[a-z][\s\S]*>/i.test(promptText);
          if (containsHtml) {
            return sanitizeRichContent(promptText);
          }
          return escapeHtml(promptText).replace(/\n/g, '<br/>');
        };

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

          const hasLongOption = (item.options || []).some(o => (o.label || '').length > 25);
          const layout = item.layoutType || (hasLongOption ? 'grid_1' : (item.options?.length === 3 ? 'grid_3' : (item.options?.length >= 4 ? 'grid_4' : 'grid_2')));
          const colsClass = layout === 'grid_1' ? 'grid-cols-1' : (layout === 'grid_3' ? 'grid-cols-3' : (layout === 'grid_4' ? 'grid-cols-4' : 'grid-cols-2'));

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
                  ${(item.options || []).map((opt, optIdx) => `
                    <label class="candidate-choice-label candidate-pron-option-label">
                      <input type="radio" name="sim_pron_${item.itemVersionId}" value="${opt.id}" />
                      <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
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
                    ${renderStrictCandidateAudioDock(null, { audioUrl: audioSrc, label: 'Đoạn ghi âm câu hỏi' })}
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
                      <div class="timeline-slot-card" data-slot-index="${idx + 1}" data-position="${item.position + idx}" data-item-id="${item.itemVersionId}">
                        <div class="slot-badge">Câu ${item.position + idx} · Thứ ${idx + 1}</div>
                        <select class="form-select form-select-sm candidate-sequence-select" data-slot="${idx + 1}" data-position="${item.position + idx}" data-item-id="${item.itemVersionId}">
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
                ${(item.options || []).map((opt, optIdx) => `
                  <label class="candidate-choice-label">
                    <input type="radio" name="sim_choice_${item.itemVersionId}" value="${opt.id}" />
                    <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
                    <span class="choice-text">${escapeHtml(opt.label || '')}</span>
                  </label>
                `).join('')}
              </div>
            `;
          } else if (isMultiGroup) {
            interactiveHtml = `
              <div class="candidate-options-grid ${colsClass}">
                ${(item.options || []).map((opt, optIdx) => `
                  <label class="candidate-choice-label">
                    <input type="checkbox" name="sim_multi_${item.itemVersionId}" value="${opt.id}" />
                    <span class="choice-key">${formatOptionDisplayLetter(opt.id, optIdx)}</span>
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
                  <input type="text" class="form-control candidate-pictorial-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ hoàn chỉnh..." />
                </div>
              </div>
            `;
          } else if (isInlineCloze) {
            interactiveHtml = `<div class="candidate-inline-cloze-wrap">${renderInlineClozeMarkup(item.prompt || '', [item])}</div>`;
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
                      ${renderSvgIcon('rotate', 'icon-inline')} <span>Ghép lại</span>
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
                <input type="text" class="form-control candidate-short-input" data-item-id="${item.itemVersionId}" placeholder="Gõ câu trả lời của bạn..." />
              </div>
            `;
          } else if (isVocabPair) {
            interactiveHtml = `
              <div class="candidate-vocab-pair-row">
                <div class="candidate-vocab-input-col">
                  <label class="candidate-field-label">1. Từ tiếng Anh nghe được (50% điểm):</label>
                  <input type="text" class="form-control candidate-vocab-text-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ tiếng Anh nghe được..." />
                </div>
                <div class="candidate-vocab-select-col">
                  <label class="candidate-field-label">2. Nghĩa tiếng Việt tương ứng (50% điểm):</label>
                  <select class="form-select candidate-vocab-select" data-item-id="${item.itemVersionId}">
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
                <textarea class="form-control candidate-open-textarea" data-item-id="${item.itemVersionId}" rows="4" placeholder="Nhập bài luận hoặc câu trả lời tại đây..."></textarea>
                <div class="candidate-open-meta">
                  <span class="word-count-badge">Số từ: <strong>0</strong> từ</span>
                  <span class="scoring-info-badge">Điểm tối đa: ${item.maxScore || 4} điểm</span>
                </div>
              </div>
            `;
          }

          const formatSimulationPrompt = (promptText) => {
            if (!promptText || typeof promptText !== 'string') return '';
            const containsHtml = /<[a-z][\s\S]*>/i.test(promptText);
            if (containsHtml) {
              return sanitizeRichContent(promptText);
            }
            return escapeHtml(promptText).replace(/\n/g, '<br/>');
          };

          const promptDisplay = isPronunciation
            ? `${formatSimulationPrompt(item.prompt || `Chọn phiên âm / trọng âm đúng cho "${item.targetWord || 'từ'}"`)}`
            : (isSentenceRewrite
              ? `Hoàn thành câu thứ hai sao cho có nghĩa tương đương với câu gốc, sử dụng từ in hoa đã cho:<br/><blockquote class="transformation-prompt-quote">“${formatSimulationPrompt(item.prompt || '')}”</blockquote>`
              : (isSentenceReorder
                ? `Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:${item.prompt && item.prompt !== 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:' ? `<br/><blockquote class="reorder-prompt-quote">${formatSimulationPrompt(item.prompt)}</blockquote>` : ''}`
                : (isErrorCorrection
                  ? `Tìm lỗi sai trong câu sau và sửa lại cho đúng:<br/><blockquote class="correction-prompt-quote">“${formatSimulationPrompt(item.prompt || '')}”</blockquote>`
                  : (isReadingMatching
                    ? `Nối đoạn văn với tiêu đề phù hợp: <strong>${formatSimulationPrompt(item.prompt || 'Paragraph')}</strong>`
                    : (isListeningOrder
                      ? 'Nghe đoạn ghi âm và sắp xếp các sự kiện sau theo đúng thứ tự thời gian:'
                      : (isVocabPair
                        ? 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:'
                        : (isInlineCloze
                          ? (item.instructions || item.instruction || b?.instructions || 'Điền từ thích hợp vào chỗ trống trong đoạn văn hoặc bảng:')
                          : (isPictorial
                            ? 'Nhìn hình và hoàn thành từ vựng:'
                            : formatSimulationPrompt(item.prompt || '')))))))));

          if (isVocabPair) {
            return renderSimVocabPairTable([item]);
          }

          return `
            <div class="candidate-question-card ${isPictorial ? 'card-pictorial' : ''}" data-item-id="${item.itemVersionId}">
              <div class="candidate-question-header">
                <span class="question-num-badge qnum">Câu ${item.position}</span>
                <span class="question-type-badge">${isPronunciation ? 'Phát âm' : (isSentenceRewrite ? 'Biến đổi câu' : (isSentenceReorder ? 'Sắp xếp câu' : (isErrorCorrection ? 'Tìm và sửa lỗi' : (isReadingMatching ? 'Ghép nối (Matching)' : (isListeningOrder ? 'Sắp xếp thứ tự' : (isSingleChoice ? 'Trắc nghiệm' : (isMultiGroup ? 'Chọn nhiều' : (isPictorial ? 'Từ vựng qua ảnh' : (isInlineCloze ? 'Điền từ nội tuyến' : (isShortText ? 'Điền từ' : 'Tự luận'))))))))))}</span>
              </div>
              ${promptDisplay ? `<div class="candidate-question-prompt">${promptDisplay}</div>` : ''}
              ${interactiveHtml}
            </div>
          `;
        };

        const isVocabTargetWord = (text, itm) => {
          if (!text) return true;
          const t = text.trim();
          if (itm?.targetWord && itm.targetWord.trim().toLowerCase() === t.toLowerCase()) return true;
          if (/^Từ vựng( câu \d+)?$/i.test(t)) return true;
          const accepted = draftState?.gradingKey?.items?.[itm?.itemVersionId]?.accepted || [];
          if (accepted.some(a => String(a).trim().toLowerCase() === t.toLowerCase())) return true;
          if (!/(nghe|chọn|điền|nhập|nối|hoàn thành|bài tập|hướng dẫn|listen|write|note|choose|select|match|complete)/i.test(t) && t.split(/\s+/).length <= 5) {
            return true;
          }
          return false;
        };

        const renderSimVocabPairTable = (vocabItems) => {
          if (!vocabItems || !vocabItems.length) return '';
          const defaultPrompt = 'Nghe đoạn ghi âm, nhập từ/cụm từ tiếng Anh và chọn nghĩa tiếng Việt tương ứng:';
          let firstPrompt = defaultPrompt;
          const rawPrompt = (vocabItems[0]?.prompt || '').trim();
          if (rawPrompt && !isVocabTargetWord(rawPrompt, vocabItems[0])) {
            firstPrompt = rawPrompt;
          }

          return `
            <div class="candidate-vocab-table-container">
              <div class="candidate-vocab-table-intro">
                <div class="candidate-vocab-table-prompt">
                  ${escapeHtml(firstPrompt)}
                </div>
              </div>
              <div class="candidate-vocab-table">
                <div class="candidate-vocab-table-head">
                  <div class="vocab-th vocab-th-num">Câu</div>
                  <div class="vocab-th vocab-th-en">Từ tiếng Anh nghe được (50% điểm)</div>
                  <div class="vocab-th vocab-th-vi">Nghĩa tiếng Việt tương ứng (50% điểm)</div>
                </div>
                <div class="candidate-vocab-table-body">
                  ${vocabItems.map(item => `
                    <div class="candidate-vocab-table-row" data-item-id="${item.itemVersionId}">
                      <div class="vocab-td vocab-td-num">
                        <span class="vocab-row-num-badge qnum">Câu ${item.position}</span>
                      </div>
                      <div class="vocab-td vocab-td-en">
                        <input type="text" class="form-control candidate-vocab-text-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ nghe được..." autocomplete="off" />
                      </div>
                      <div class="vocab-td vocab-td-vi">
                        <select class="form-select candidate-vocab-select" data-item-id="${item.itemVersionId}">
                          <option value="">-- Chọn nghĩa tương ứng --</option>
                          ${(item.options || []).map(opt => `
                            <option value="${opt.id}">${escapeHtml(opt.label || '')}</option>
                          `).join('')}
                        </select>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        };

        const renderSimPictorialGroup = (pictorialItems) => {
          if (!pictorialItems || !pictorialItems.length) return '';
          const defaultPrompt = 'Dựa vào hình ảnh và gợi ý, hãy hoàn thành từ/cụm từ tương ứng:';
          let firstPrompt = defaultPrompt;
          const rawPrompt = (pictorialItems[0]?.prompt || '').trim();
          if (rawPrompt && !isVocabTargetWord(rawPrompt, pictorialItems[0]) && rawPrompt !== 'Nhìn hình và hoàn thành từ vựng:') {
            firstPrompt = rawPrompt;
          }

          return `
            <div class="candidate-pictorial-group-container">
              <div class="candidate-pictorial-group-intro">
                <div class="candidate-pictorial-group-prompt">
                  ${escapeHtml(firstPrompt)}
                </div>
              </div>
              <div class="candidate-pictorial-grid">
                ${pictorialItems.map(item => {
                  const imgSrc = item.image || item.stimulusImageUrl || '';
                  return `
                    <div class="candidate-pictorial-card" data-item-id="${item.itemVersionId}">
                      <div class="candidate-pictorial-card-header">
                        <span class="question-num-badge qnum">Câu ${item.position}</span>
                        <span class="question-type-badge">Từ vựng qua ảnh</span>
                      </div>
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
                        <input type="text" class="form-control candidate-pictorial-input" data-item-id="${item.itemVersionId}" placeholder="Nhập từ hoàn chỉnh..." autocomplete="off" />
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        };

        const renderSimShortQaGroup = (shortItems) => {
          if (!shortItems || !shortItems.length) return '';
          const is2Col = isShortQaEligibleFor2Col(shortItems);
          return `
            <div class="candidate-short-qa-container ${is2Col ? 'short-qa-2col' : ''}">
              ${shortItems.map(item => {
                const promptHtml = formatSimulationPrompt(item.prompt || '');
                return `
                <div class="candidate-short-qa-item" data-item-id="${item.itemVersionId}">
                  <div class="candidate-short-prompt-row">
                    <span class="candidate-short-qnum qnum">Câu ${item.position}</span>
                    <div class="candidate-short-prompt-text">${promptHtml}</div>
                  </div>
                  <div class="candidate-short-input-wrap">
                    <input type="text" class="form-control candidate-short-input" data-item-id="${item.itemVersionId}" placeholder="Nhập câu trả lời của bạn..." autocomplete="off" />
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          `;
        };

        const exercisesHtml = exercises.map((ex, exIdx) => {
          const exItems = items.filter(it => it.exerciseId === ex.exerciseId || (!it.exerciseId && exIdx === 0));
          const exItemsList = exItems.length ? exItems : (exercises.length === 1 ? items : []);
          const exPoints = exItemsList.reduce((sum, it) => sum + (it.maxScore || 1), 0);
          const exAudioUrl = ex.audioUrl || (exercises.length === 1 ? audioUrl : '');
          const exReading = ex.readingPassage || (exercises.length === 1 ? reading : '');

          const itemGroups = [];
          exItemsList.forEach(item => {
            const isPronunciation = item.pedagogicalTypeCode === 'pronunciation_choice' || item.pedagogicalTypeCode === 'pronunciation_word' || item.layoutType === 'ipa_card';
            const isSentenceRewrite = (item.pedagogicalTypeCode === 'sentence_rewrite' || item.pedagogicalTypeCode === 'sentence_transformation' || item.layoutType === 'keyword_transformation' || item.layoutType === 'sentence_rewrite') && !isPronunciation;
            const isSentenceReorder = (item.pedagogicalTypeCode === 'sentence_reorder' || item.layoutType === 'token_scramble') && !isSentenceRewrite && !isPronunciation;
            const isErrorCorrection = (item.interactionType === 'correction_pair' || item.pedagogicalTypeCode === 'error_correction' || item.graderType === 'correction_pair') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isReadingMatching = (item.pedagogicalTypeCode === 'reading_matching' || item.layoutType === 'split_pane_matching' || b.layoutType === 'split_pane_matching') && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isListeningOrder = (item.pedagogicalTypeCode === 'listening_order' || item.layoutType === 'timeline_sequence') && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isPictorial = item.interactionType === 'short_text' && (item.layoutType === 'pictorial_card' || item.pedagogicalTypeCode === 'pictorial_vocabulary') && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isInlineCloze = item.interactionType === 'short_text' && item.layoutType === 'inline_cloze' && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;
            const isVocab = item.interactionType === 'text_select_pair';
            const isShortText = item.interactionType === 'short_text' && item.graderType !== 'rubric_async' && !isInlineCloze && !isPictorial && !isListeningOrder && !isReadingMatching && !isErrorCorrection && !isSentenceReorder && !isSentenceRewrite && !isPronunciation;

            const lastGroup = itemGroups[itemGroups.length - 1];
            if (isVocab) {
              if (lastGroup && lastGroup.type === 'vocab_pair_group') {
                lastGroup.items.push(item);
              } else {
                itemGroups.push({ type: 'vocab_pair_group', items: [item] });
              }
            } else if (isPictorial) {
              if (lastGroup && lastGroup.type === 'pictorial_group') {
                lastGroup.items.push(item);
              } else {
                itemGroups.push({ type: 'pictorial_group', items: [item] });
              }
            } else if (isShortText) {
              if (lastGroup && lastGroup.type === 'short_qa_group') {
                lastGroup.items.push(item);
              } else {
                itemGroups.push({ type: 'short_qa_group', items: [item] });
              }
            } else {
              itemGroups.push({ type: 'single', item });
            }
          });

          const exItemsHtml = itemGroups.map(group => {
            if (group.type === 'vocab_pair_group') {
              return renderSimVocabPairTable(group.items);
            }
            if (group.type === 'pictorial_group') {
              return renderSimPictorialGroup(group.items);
            }
            if (group.type === 'short_qa_group') {
              return renderSimShortQaGroup(group.items);
            }
            return renderSimQuestionCard(group.item);
          }).join('');

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
                  ${renderStrictCandidateAudioDock(null, { audioUrl: exAudioUrl, label: `Bài nghe: ${ex.title || 'Bài tập'}` })}
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
                    ${renderStrictCandidateAudioDock(null, { audioUrl: audioUrl, label: `Bài nghe phần ${bIdx + 1}` })}
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

      const totalItems = blocks.reduce((sum, b) => sum + (b.items || []).reduce((s, it) => s + getItemSpanCount(it), 0), 0);

      const navigatorButtonsHtml = blocks.flatMap((b, bIdx) => {
        const items = b.items || [];
        return items.flatMap(item => {
          const span = getItemSpanCount(item);
          const isInlineCloze = item.pedagogicalTypeCode === 'inline_cloze' ||
            item.layoutType === 'inline_cloze' ||
            item.layoutType === 'inline_dropdown_table' ||
            (item.interactionType === 'short_text' && (
              (item.prompt && (/(?:\((\d+)\)\s*[_\.\u2026]{2,})|(?:\{\{(\d+)\}\})/.test(item.prompt))) ||
              (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0)
            ));
          const isListeningOrder = item.pedagogicalTypeCode === 'listening_order' ||
            item.layoutType === 'timeline_sequence' ||
            item.graderType === 'ordered_sequence' ||
            (Array.isArray(item.events) && item.events.length > 0);

          if (isInlineCloze && span > 1) {
            const detected = parseClozeBlanks(item.prompt || '');
            const uniqueNums = [];
            for (const d of detected) {
              if (!uniqueNums.includes(d.number)) uniqueNums.push(d.number);
            }
            if (item.clozeAnswers) {
              Object.keys(item.clozeAnswers).forEach(k => {
                const n = Number(k);
                if (!Number.isNaN(n) && !uniqueNums.includes(n)) uniqueNums.push(n);
              });
            }
            uniqueNums.sort((a, b) => a - b);
            const btns = [];
            for (let k = 0; k < span; k++) {
              const qPos = item.position + k;
              const blankNum = uniqueNums[k] ?? qPos;
              btns.push(`
                <button type="button" class="btn-qnav" data-pos="${qPos}" data-blank-pos="${blankNum}" data-item-id="${item.itemVersionId}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos} (Chỗ trống ${blankNum})">
                  <span class="qnav-num">${qPos}</span>
                </button>
              `);
            }
            return btns;
          }

          if (isListeningOrder && span > 1) {
            const btns = [];
            for (let k = 0; k < span; k++) {
              const qPos = item.position + k;
              const slotNum = k + 1;
              btns.push(`
                <button type="button" class="btn-qnav" data-pos="${qPos}" data-slot-num="${slotNum}" data-item-id="${item.itemVersionId}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos} (Bước thứ ${slotNum})">
                  <span class="qnav-num">${qPos}</span>
                </button>
              `);
            }
            return btns;
          }

          const qPos = item.position || 1;
          return [
            `
            <button type="button" class="btn-qnav" data-pos="${qPos}" data-item-id="${item.itemVersionId}" data-section-target="sim-block-${bIdx}" title="Câu ${qPos}">
              <span class="qnav-num">${qPos}</span>
            </button>
            `
          ];
        });
      }).join('');

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
              ${blocks.map((b, i) => {
                const bCount = (b.items || []).reduce((s, it) => s + getItemSpanCount(it), 0);
                return `
                <button type="button" class="section-tab simulation-nav-pill ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
                  <span>${escapeHtml(b.title || `Phần ${i + 1}`)}</span>
                  <span class="tab-count">${(b.exercises || []).length > 1 ? `${(b.exercises || []).length} bài tập · ` : ''}${bCount} câu</span>
                </button>
              `;
              }).join('')}
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
                  ${blocks.map((b, i) => {
                    const bCount = (b.items || []).reduce((s, it) => s + getItemSpanCount(it), 0);
                    return `
                    <button type="button" class="side-section-btn ${i === 0 ? 'active' : ''}" data-section-target="sim-block-${i}">
                      <span>${escapeHtml(b.title || `Phần ${i + 1}`)}</span>
                      <span class="side-count">0/${bCount}</span>
                    </button>
                  `;
                  }).join('')}
                </div>
              </div>

              <!-- Question Navigator Card -->
              <div class="panel-card question-navigator-card">
                <div class="navigator-header">
                  <strong>Bảng câu hỏi</strong>
                  <span class="navigator-summary" id="qnav-summary">${totalItems} câu</span>
                </div>
                <div class="question-navigator-grid">
                  ${navigatorButtonsHtml}
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
            <div class="footer-actions" style="display:flex; gap:10px; align-items:center;">
              <button type="button" class="btn btn-success btn-sm btn-submit-simulation" id="btn-submit-simulation">
                ${renderSvgIcon('check', 'icon-inline')} <span>Nộp bài & Chấm thử</span>
              </button>
              <button type="button" class="btn btn-primary btn-sm" id="btn-close-simulation-footer">Hoàn tất kiểm tra</button>
            </div>
          </footer>

          <!-- Simulation Results Modal -->
          <div class="simulation-results-modal" id="simulation-results-modal" style="display: none;">
            <div class="sim-results-dialog">
              <header class="sim-results-header">
                <div class="sim-results-title-wrap">
                  <span class="sim-results-badge">Kết quả mô phỏng</span>
                  <h3>Bảng tổng hợp chấm điểm</h3>
                </div>
                <button type="button" class="btn-close-sim-results" id="btn-close-sim-results" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
              </header>
              <div class="sim-results-body" id="sim-results-body"></div>
              <footer class="sim-results-footer">
                <button type="button" class="btn btn-secondary btn-sm" id="btn-retest-simulation">Xem lại trên bài thi</button>
                <button type="button" class="btn btn-primary btn-sm" id="btn-done-simulation-results">Đóng kết quả</button>
              </footer>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
      initStrictCandidateAudioDocks(modal);

      const closeBtns = modal.querySelectorAll('#btn-close-simulation, #btn-close-simulation-footer');
      closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      });

      const qnavBtns = modal.querySelectorAll('.btn-qnav');

      const filterNavigatorBySection = (targetSectionId) => {
        let visibleCount = 0;
        qnavBtns.forEach(btn => {
          const btnSection = btn.getAttribute ? btn.getAttribute('data-section-target') : null;
          const isMatch = !targetSectionId || btnSection === targetSectionId;
          if (btn.style) {
            btn.style.display = isMatch ? 'inline-flex' : 'none';
          }
          if (isMatch) visibleCount++;
        });
        const summaryEl = modal.querySelector('#qnav-summary');
        if (summaryEl) {
          summaryEl.textContent = `${visibleCount} câu`;
        }
      };

      const allNavBtns = modal.querySelectorAll('.section-tab, .simulation-nav-pill, .side-section-btn');
      allNavBtns.forEach(btn => {
        btn.addEventListener?.('click', () => {
          const targetId = btn.getAttribute('data-section-target');
          modal.querySelectorAll('.section-tab, .simulation-nav-pill').forEach(b => {
            b.classList?.toggle('active', b.getAttribute('data-section-target') === targetId);
          });
          modal.querySelectorAll('.side-section-btn').forEach(b => {
            b.classList?.toggle('active', b.getAttribute('data-section-target') === targetId);
          });
          modal.querySelectorAll('.section-page, .simulation-section-card').forEach(sec => {
            sec.classList?.toggle('active', sec.id === targetId);
          });
          filterNavigatorBySection(targetId);
          const targetEl = modal.querySelector(`#${targetId}`);
          if (targetEl && typeof targetEl.scrollIntoView === 'function') {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });

      // Question Navigator click-to-focus and section navigation
      qnavBtns.forEach(btn => {
        btn.addEventListener?.('click', () => {
          const targetSectionId = btn.getAttribute('data-section-target');
          const pos = btn.getAttribute('data-pos');
          const blankPos = btn.getAttribute('data-blank-pos');
          const slotNum = btn.getAttribute('data-slot-num');
          const itemId = btn.getAttribute('data-item-id');

          // 1. Activate target section tab if needed
          if (targetSectionId) {
            modal.querySelectorAll('.section-tab, .simulation-nav-pill').forEach(b => {
              b.classList?.toggle('active', b.getAttribute('data-section-target') === targetSectionId);
            });
            modal.querySelectorAll('.side-section-btn').forEach(b => {
              b.classList?.toggle('active', b.getAttribute('data-section-target') === targetSectionId);
            });
            modal.querySelectorAll('.section-page, .simulation-section-card').forEach(sec => {
              sec.classList?.toggle('active', sec.id === targetSectionId);
            });
            filterNavigatorBySection(targetSectionId);
          }

          // 2. Find target element
          let targetEl = null;
          if (blankPos || btn.hasAttribute?.('data-blank-pos')) {
            targetEl = modal.querySelector(`.inline-fill-input[data-position="${blankPos}"]`) ||
              modal.querySelector(`.inline-fill-input[data-position="${pos}"]`);
          } else if (slotNum || btn.hasAttribute?.('data-slot-num')) {
            targetEl = modal.querySelector(`.candidate-sequence-select[data-position="${pos}"]`) ||
              modal.querySelector(`[data-item-id="${itemId}"] .candidate-sequence-select[data-slot="${slotNum}"]`) ||
              modal.querySelector(`.candidate-sequence-select[data-slot="${slotNum}"]`);
          } else if (itemId) {
            const itemCard = modal.querySelector(`.candidate-question-card[data-item-id="${itemId}"]`) ||
              modal.querySelector(`.candidate-short-qa-item[data-item-id="${itemId}"]`) ||
              modal.querySelector(`[data-item-id="${itemId}"]`);
            if (itemCard) {
              targetEl = itemCard.querySelector('input:not([type="hidden"]), select, textarea') || itemCard;
            }
          }

          if (targetEl) {
            if (typeof targetEl.scrollIntoView === 'function') {
              targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (typeof targetEl.focus === 'function') {
              targetEl.focus();
            }
            targetEl.classList?.add('nav-focus-pulse');
            setTimeout(() => {
              targetEl.classList?.remove('nav-focus-pulse');
            }, 1200);
          }
        });
      });

      // Filter navigator initially for the first section
      filterNavigatorBySection('sim-block-0');

      // Update answered state on candidate input/change
      function updateAnsweredState() {
        qnavBtns.forEach(btn => {
          const pos = btn.getAttribute('data-pos');
          const blankPos = btn.getAttribute('data-blank-pos');
          const slotNum = btn.getAttribute('data-slot-num');
          const itemId = btn.getAttribute('data-item-id');

          let isAnswered = false;
          if (blankPos || btn.hasAttribute('data-blank-pos')) {
            const input = modal.querySelector(`.inline-fill-input[data-position="${blankPos || pos}"]`);
            if (input && input.value && input.value.trim().length > 0) {
              isAnswered = true;
            }
          } else if (slotNum || btn.hasAttribute('data-slot-num')) {
            const select = modal.querySelector(`.candidate-sequence-select[data-position="${pos}"]`) ||
              modal.querySelector(`[data-item-id="${itemId}"] .candidate-sequence-select[data-slot="${slotNum}"]`) ||
              modal.querySelector(`.candidate-sequence-select[data-slot="${slotNum}"]`);
            if (select && select.value && select.value.trim().length > 0) {
              isAnswered = true;
            }
          } else if (itemId) {
            const checkedRadio = modal.querySelector(`input[name="sim_choice_${itemId}"]:checked, input[name="sim_pron_${itemId}"]:checked`);
            if (checkedRadio) isAnswered = true;
            const checkedMulti = modal.querySelector(`input[name="sim_multi_${itemId}"]:checked`);
            if (checkedMulti) isAnswered = true;
            const textInput = modal.querySelector(`.candidate-transformation-input[data-item-id="${itemId}"], .candidate-reorder-input[data-item-id="${itemId}"], .candidate-open-textarea[data-item-id="${itemId}"], .candidate-pictorial-input[data-item-id="${itemId}"], .candidate-vocab-text-input[data-item-id="${itemId}"], .candidate-short-input[data-item-id="${itemId}"], .candidate-error-input[data-item-id="${itemId}"], .candidate-correction-input[data-item-id="${itemId}"]`);
            if (textInput && textInput.value && textInput.value.trim().length > 0) isAnswered = true;
            const selectEl = modal.querySelector(`.candidate-choice-select[data-item-id="${itemId}"], .candidate-vocab-select[data-item-id="${itemId}"]`);
            if (selectEl && selectEl.value && selectEl.value.trim().length > 0) isAnswered = true;
          }

          btn.classList.toggle('answered', isAnswered);
        });

        const answeredCount = modal.querySelectorAll('.btn-qnav.answered').length;
        const totalCount = qnavBtns.length || totalItems;
        const ratioEl = modal.querySelector('.progress-ratio');
        if (ratioEl) {
          ratioEl.textContent = `${answeredCount}/${totalCount}`;
        }
        const fillEl = modal.querySelector('.progress-fill');
        if (fillEl) {
          const pct = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
          fillEl.style.width = `${pct}%`;
        }
      }

      if (typeof modal.addEventListener === 'function') {
        modal.addEventListener('input', updateAnsweredState);
        modal.addEventListener('change', updateAnsweredState);
      }

      // Simulation Submission & Grading
      const submitSimBtn = modal.querySelector('#btn-submit-simulation');
      if (submitSimBtn) {
        submitSimBtn.addEventListener('click', () => {
          let totalAchieved = 0;
          let totalMax = 0;
          const details = [];

          const allItemsMap = new Map();
          for (const b of blocks) {
            for (const it of (b.items || [])) {
              allItemsMap.set(it.itemVersionId, it);
            }
          }

          const qnavButtons = modal.querySelectorAll('.btn-qnav');
          qnavButtons.forEach(btn => {
            const pos = Number(btn.getAttribute('data-pos'));
            const blankPos = btn.getAttribute('data-blank-pos');
            const slotNum = btn.getAttribute('data-slot-num') ? Number(btn.getAttribute('data-slot-num')) : null;
            const itemId = btn.getAttribute('data-item-id');
            const item = allItemsMap.get(itemId);
            const itemKey = draftState.gradingKey?.items?.[itemId] || {};

            let candidateAnswer = '';
            let correctAnswer = '';
            let isCorrect = false;
            let score = 0;
            let maxScore = 1;
            let typeLabel = 'Câu hỏi';

            if (blankPos !== null && blankPos !== undefined) {
              typeLabel = 'Điền từ nội tuyến';
              const input = modal.querySelector(`.inline-fill-input[data-position="${blankPos}"]`) ||
                modal.querySelector(`.inline-fill-input[data-position="${pos}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const bAnswer = item?.clozeAnswers?.[blankPos] || item?.clozeAnswers?.[String(blankPos)] || itemKey;
              const accepted = (bAnswer?.accepted && bAnswer.accepted.length > 0)
                ? bAnswer.accepted
                : (bAnswer?.targetWord ? [bAnswer.targetWord] : (itemKey.accepted || []));
              correctAnswer = accepted[0] || '—';
              isCorrect = accepted.some(acc => acc.trim().toLowerCase() === candidateAnswer.toLowerCase());
              score = isCorrect ? 1 : 0;
              maxScore = 1;
            } else if (slotNum !== null && slotNum !== undefined) {
              typeLabel = 'Thứ tự nghe';
              const select = modal.querySelector(`.candidate-sequence-select[data-position="${pos}"]`) ||
                modal.querySelector(`[data-item-id="${itemId}"] .candidate-sequence-select[data-slot="${slotNum}"]`) ||
                modal.querySelector(`.candidate-sequence-select[data-slot="${slotNum}"]`);
              candidateAnswer = select?.value?.trim() || '';
              const expectedSeq = itemKey.expectedSequence || (item?.events ? [...item.events].sort((a,b)=>a.rank-b.rank).map(e=>e.label) : []);
              const expectedLabel = expectedSeq[slotNum - 1] || '';
              correctAnswer = `Thứ ${slotNum}: ${expectedLabel}`;
              isCorrect = candidateAnswer !== '' && candidateAnswer.toUpperCase() === expectedLabel.toUpperCase();
              score = isCorrect ? 1 : 0;
              maxScore = 1;
            } else if (item?.interactionType === 'text_select_pair' || item?.pedagogicalTypeCode === 'vocabulary_pair') {
              typeLabel = 'Cặp từ vựng';
              const textInput = modal.querySelector(`.candidate-vocab-text-input[data-item-id="${itemId}"]`);
              const selectEl = modal.querySelector(`.candidate-vocab-select[data-item-id="${itemId}"]`);
              const textVal = textInput?.value?.trim() || '';
              const optId = selectEl?.value?.trim() || '';
              const optObj = (item?.options || []).find(o => String(o.id) === String(optId));
              const selectedOptLabel = optObj?.label || optId;

              if (textVal && selectedOptLabel) {
                candidateAnswer = `${textVal} · ${selectedOptLabel}`;
              } else if (textVal) {
                candidateAnswer = `${textVal} · (chưa chọn nghĩa)`;
              } else if (selectedOptLabel) {
                candidateAnswer = `(chưa nhập từ) · ${selectedOptLabel}`;
              } else {
                candidateAnswer = '';
              }

              const accepted = (itemKey.accepted && itemKey.accepted.length > 0)
                ? itemKey.accepted
                : (item?.targetWord ? [item.targetWord] : []);
              const expectedText = accepted[0] || item?.targetWord || '—';
              const expectedOptId = itemKey.expectedOptionId || '';
              const expOptObj = (item?.options || []).find(o => String(o.id) === String(expectedOptId));
              const expectedOptLabel = expOptObj?.label || expectedOptId || '—';
              correctAnswer = `${expectedText} · ${expectedOptLabel}`;

              const textCorrect = Boolean(textVal) && accepted.some(acc => acc.trim().toLowerCase() === textVal.toLowerCase());
              const optCorrect = Boolean(optId) && (expectedOptId ? optId === expectedOptId : true);

              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              const componentScore = maxScore / 2;
              score = (textCorrect ? componentScore : 0) + (optCorrect ? componentScore : 0);
              isCorrect = score === maxScore;
            } else if (item?.pedagogicalTypeCode === 'sentence_rewrite') {
              typeLabel = 'Biến đổi câu';
              const input = modal.querySelector(`.candidate-transformation-input[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const res = scoreTransformationAnswer(candidateAnswer, itemKey);
              isCorrect = res.isCorrect;
              score = res.score;
              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              correctAnswer = (itemKey.accepted || [])[0] || '—';
            } else if (item?.pedagogicalTypeCode === 'sentence_reorder') {
              typeLabel = 'Sắp xếp câu';
              const input = modal.querySelector(`.candidate-reorder-input[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const target = item?.targetSentence || (itemKey.accepted || [])[0] || '';
              correctAnswer = target;
              isCorrect = candidateAnswer.toLowerCase().replace(/[.!?]+$/, '').trim() === target.toLowerCase().replace(/[.!?]+$/, '').trim();
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.interactionType === 'correction_pair' || item?.pedagogicalTypeCode === 'error_correction' || item?.graderType === 'correction_pair') {
              typeLabel = 'Tìm và sửa lỗi';
              const errInput = modal.querySelector(`.candidate-error-input[data-item-id="${itemId}"]`);
              const corrInput = modal.querySelector(`.candidate-correction-input[data-item-id="${itemId}"]`);
              const errVal = errInput?.value?.trim() || '';
              const corrVal = corrInput?.value?.trim() || '';
              candidateAnswer = (errVal || corrVal) ? `${errVal || '(chưa nhập lỗi)'} -> ${corrVal || '(chưa sửa)'}` : '';
              const expErr = itemKey.expectedError || item?.expectedError || '';
              const expCorr = itemKey.expectedCorrection || (itemKey.accepted || [])[0] || item?.expectedCorrection || '';
              correctAnswer = `${expErr} -> ${expCorr}`;
              const errMatch = !expErr || errVal.toLowerCase() === expErr.toLowerCase();
              const corrMatch = !expCorr || (itemKey.accepted || [expCorr]).some(a => a.trim().toLowerCase() === corrVal.toLowerCase());
              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              const comp = maxScore / 2;
              score = (errMatch ? comp : 0) + (corrMatch ? comp : 0);
              isCorrect = score === maxScore;
            } else if (item?.pedagogicalTypeCode === 'reading_matching' || item?.layoutType === 'split_pane_matching') {
              typeLabel = 'Ghép nối (Matching)';
              const select = modal.querySelector(`.candidate-choice-select[data-item-id="${itemId}"]`);
              candidateAnswer = select?.value?.trim() || '';
              const expOpt = itemKey.expectedOptionId || item?.expectedOptionId || '';
              correctAnswer = expOpt || '—';
              isCorrect = candidateAnswer !== '' && candidateAnswer === expOpt;
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.interactionType === 'single_choice' || item?.pedagogicalTypeCode === 'pronunciation_choice' || item?.pedagogicalTypeCode === 'pronunciation_word') {
              typeLabel = 'Trắc nghiệm';
              const checked = modal.querySelector(`input[name="sim_choice_${itemId}"]:checked, input[name="sim_pron_${itemId}"]:checked`);
              candidateAnswer = checked?.value || '';
              const expOpt = itemKey.expectedOptionId || '';
              correctAnswer = expOpt;
              isCorrect = candidateAnswer !== '' && candidateAnswer === expOpt;
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.interactionType === 'multi_choice_group') {
              typeLabel = 'Chọn nhiều';
              const checkedEls = modal.querySelectorAll(`input[name="sim_multi_${itemId}"]:checked`);
              const selectedVals = Array.from(checkedEls).map(el => el.value);
              candidateAnswer = selectedVals.join(', ');
              const expectedOpts = itemKey.expectedOptionIds || (itemKey.expectedOptionId ? [itemKey.expectedOptionId] : []);
              correctAnswer = expectedOpts.join(', ');
              const matchCount = selectedVals.filter(v => expectedOpts.includes(v)).length;
              maxScore = Number(itemKey.maxScore || item?.maxScore) || 1;
              score = expectedOpts.length > 0 && selectedVals.length === expectedOpts.length && matchCount === expectedOpts.length ? maxScore : 0;
              isCorrect = score === maxScore;
            } else if (item?.pedagogicalTypeCode === 'pictorial_vocabulary' || item?.layoutType === 'pictorial_card') {
              typeLabel = 'Từ vựng qua ảnh';
              const input = modal.querySelector(`.candidate-pictorial-input[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const accepted = (itemKey.accepted && itemKey.accepted.length > 0) ? itemKey.accepted : (item?.targetWord ? [item.targetWord] : []);
              correctAnswer = accepted[0] || '—';
              isCorrect = accepted.some(acc => acc.trim().toLowerCase() === candidateAnswer.toLowerCase());
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            } else if (item?.graderType === 'rubric_async') {
              typeLabel = 'Tự luận (AI)';
              const input = modal.querySelector(`.candidate-open-textarea[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              correctAnswer = '(Chấm tự luận / AI)';
              score = candidateAnswer ? (item?.maxScore || 4) : 0;
              maxScore = item?.maxScore || 4;
              isCorrect = Boolean(candidateAnswer);
            } else {
              typeLabel = 'Điền từ';
              const input = modal.querySelector(`.candidate-short-input[data-item-id="${itemId}"], .candidate-open-textarea[data-item-id="${itemId}"]`);
              candidateAnswer = input?.value?.trim() || '';
              const accepted = (itemKey.accepted && itemKey.accepted.length > 0) ? itemKey.accepted : (item?.targetWord ? [item.targetWord] : []);
              correctAnswer = accepted[0] || '—';
              isCorrect = accepted.some(acc => acc.trim().toLowerCase() === candidateAnswer.toLowerCase());
              score = isCorrect ? (item?.maxScore || 1) : 0;
              maxScore = item?.maxScore || 1;
            }

            totalAchieved += score;
            totalMax += maxScore;

            btn.classList.remove('is-correct', 'is-incorrect');
            btn.classList.add(isCorrect ? 'is-correct' : 'is-incorrect');

            details.push({
              pos,
              typeLabel,
              candidateAnswer: candidateAnswer || '(Chưa trả lời)',
              correctAnswer,
              score,
              maxScore,
              isCorrect
            });
          });

          // Render summary breakdown
          const resultsModal = modal.querySelector('#simulation-results-modal');
          const resultsBody = modal.querySelector('#sim-results-body');
          if (resultsBody && resultsModal) {
            resultsBody.innerHTML = `
              <div class="sim-score-banner">
                <div class="score-banner-title">Tổng điểm đạt được:</div>
                <div class="score-banner-value">${totalAchieved}/${totalMax}đ</div>
                <div class="score-banner-sub">Đã chấm chi tiết toàn bộ ${details.length} câu hỏi theo bộ đáp án của đề thi.</div>
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
                    ${details.map(d => `
                      <tr class="${d.isCorrect ? 'row-correct' : (d.score > 0 ? 'row-partial' : 'row-incorrect')}">
                        <td><strong>Câu ${d.pos}</strong></td>
                        <td><span class="type-badge">${escapeHtml(d.typeLabel)}</span></td>
                        <td>${escapeHtml(d.candidateAnswer)}</td>
                        <td><span class="correct-badge">${escapeHtml(d.correctAnswer)}</span></td>
                        <td><strong>${d.score}/${d.maxScore}đ</strong></td>
                        <td>${d.isCorrect ? `<span class="status-correct">${renderSvgIcon('check', 'icon-inline')} Đúng</span>` : (d.score > 0 ? `<span class="status-partial" style="font-weight:700; color:#d97706;">Đúng 50%</span>` : `<span class="status-incorrect">${renderSvgIcon('close', 'icon-inline')} Chưa đúng</span>`)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
            resultsModal.style.display = 'flex';
          }
        });
      }

      // Close simulation results handlers
      const closeResultsBtns = modal.querySelectorAll('#btn-close-sim-results, #btn-done-simulation-results, #btn-retest-simulation');
      closeResultsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const resModal = modal.querySelector('#simulation-results-modal');
          if (resModal) resModal.style.display = 'none';
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

    // Smart Publishing Modal (2-Step Wizard & Safe Double-Check)
    function openPublishingModal() {
      syncInputs();
      let modal = document.querySelector('#smart-publishing-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'smart-publishing-modal';
        modal.className = 'publishing-modal-overlay';
        document.body.appendChild(modal);
      }

      let currentStep = 1;
      let purpose = 'replace_existing';
      const catalog = Array.isArray(options.catalog) ? options.catalog : [];
      let targetTestKey = draftState.testKey || (catalog[0] ? catalog[0].testKey : '');

      const courseNames = { 1: '03', 2: '34', 3: '45' };
      const currentCid = options.courseId || 2;
      const courseCode = courseNames[currentCid] || '34';
      const maxSession = catalog.reduce((max, it) => Math.max(max, Number(it.sessionNumber) || 0), 0);
      const nextSession = maxSession + 1;
      const defaultNewTitle = `IZONE · Khối ${courseCode} · Test ${nextSession}`;

      let newCatalogMeta = {
        sessionNumber: nextSession,
        phase: 1,
        testNumber: nextSession,
        title: draftState.title || defaultNewTitle
      };

      let scope = 'whole_course';
      const availableClasses = filterClassesForCourse(options.classes || [], currentCid);
      let selectedClassIds = availableClasses.map(c => String(c.classId || c.id));
      let searchQuery = '';
      let previewResult = null;
      let isPublishing = false;

      function renderModalContent() {
        if (currentStep === 1) {
          renderStep1();
        } else {
          renderStep2();
        }
      }

      function renderStep1() {
        const filteredClasses = availableClasses.filter(cls => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          const name = String(cls.name || cls.className || `Lớp ${cls.classId}`).toLowerCase();
          const code = String(cls.classId || cls.id || '').toLowerCase();
          return name.includes(q) || code.includes(q);
        });

        const classesListHtml = filteredClasses.length > 0 ? filteredClasses.map((cls) => {
          const cid = String(cls.classId || cls.id);
          const isChecked = selectedClassIds.includes(cid);
          const subCount = Number(cls.submissionCount || cls.submission_count || 0);
          const statusBadge = subCount > 0
            ? `<span class="badge-status-pill warning">${renderSvgIcon('lock', 'icon-inline')} Đã có bài nộp (${subCount})</span>`
            : `<span class="badge-status-pill neutral">Chưa thi</span>`;
          return `
            <label class="class-picker-row ${isChecked ? 'is-selected' : ''}">
              <input type="checkbox" class="cb-publish-class" value="${cid}" ${isChecked ? 'checked' : ''} />
              <div class="class-picker-info">
                <span class="class-picker-name">${escapeHtml(cls.name || cls.className || `Lớp ${cid}`)}</span>
                <span class="class-picker-code">${cls.courseCode ? `(${cls.courseCode})` : ''}</span>
              </div>
              <div class="class-picker-meta">${statusBadge}</div>
            </label>
          `;
        }).join('') : `
          <div class="empty-classes-notice">Không tìm thấy lớp học nào phù hợp${searchQuery ? ` với từ khóa "${escapeHtml(searchQuery)}"` : ''}.</div>
        `;

        const catalogOptionsHtml = catalog.length > 0 ? catalog.map(it => `
          <option value="${it.testKey}" ${it.testKey === targetTestKey ? 'selected' : ''}>
            ${escapeHtml(it.title || `Test ${it.sessionNumber}`)} (Buổi ${it.sessionNumber}${it.phase ? ` · Phase ${it.phase}` : ''})
          </option>
        `).join('') : `
          <option value="">${escapeHtml(draftState.title || 'Đề thi hiện tại')}</option>
        `;

        modal.innerHTML = `
          <div class="publishing-dialog publishing-wizard-dialog">
            <header class="publishing-header">
              <div class="publishing-title-area">
                <span class="publish-badge">Smart Publishing Engine</span>
                <h3>Công bố đề thi — v${draftState.version}</h3>
                <p class="publish-test-title">${escapeHtml(draftState.title || '')}</p>
              </div>
              <button type="button" class="btn-close-publish-modal" id="btn-close-publish-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
            </header>

            <div class="publishing-stepper">
              <div class="stepper-item is-active">
                <span class="stepper-num">1</span>
                <span class="stepper-label">Mục tiêu &amp; Phạm vi</span>
              </div>
              <div class="stepper-line"></div>
              <div class="stepper-item">
                <span class="stepper-num">2</span>
                <span class="stepper-label">Xác nhận an toàn</span>
              </div>
            </div>

            <div class="publishing-body">
              <div class="alert-notice alert-immutable">
                <div class="notice-icon">${renderSvgIcon('lock', 'icon-inline')}</div>
                <div class="notice-text">
                  <strong>Cơ chế Roster Freezing (Bảo toàn kết quả):</strong>
                  Hệ thống sẽ tự động quét trạng thái bài làm của từng lớp. Bất kỳ lớp nào đã có ít nhất 1 bài nộp (submission_count > 0) sẽ được <strong>BẢO VỆ và ĐÓNG BĂNG</strong>, giữ nguyên phiên bản đề cũ để bảo toàn dữ liệu điểm số.
                </div>
              </div>

              <!-- Section 1: Mục tiêu công bố -->
              <div class="form-group publish-section">
                <label class="publish-section-label">1. Mục tiêu công bố:</label>
                <div class="purpose-options">
                  <label class="purpose-radio-card ${purpose === 'replace_existing' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_purpose" value="replace_existing" ${purpose === 'replace_existing' ? 'checked' : ''} id="radio-purpose-replace" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('rotate', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Cập nhật thay thế cho bài test có sẵn trong lộ trình</div>
                        <div class="card-desc">Chỉ cập nhật đề thi cho bài test được chọn dưới đây. Các bài test khác trong lộ trình khối được giữ nguyên 100%.</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>

                  <div class="purpose-subfields" id="replace-subfields" style="${purpose === 'replace_existing' ? '' : 'display:none;'}">
                    <label class="subfield-label">Chọn bài test mục tiêu cần thay thế:</label>
                    <select class="form-control select-target-test" id="select-target-test">
                      ${catalogOptionsHtml}
                    </select>
                  </div>

                  <label class="purpose-radio-card ${purpose === 'add_new' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_purpose" value="add_new" ${purpose === 'add_new' ? 'checked' : ''} id="radio-purpose-add" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('plusCircle', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Bổ sung thành một bài test mới trong lộ trình của khối</div>
                        <div class="card-desc">Thêm bài test mới vào danh mục lộ trình của khối và tự động tạo bài tập cho học sinh các lớp được áp dụng.</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>

                  <div class="purpose-subfields" id="add-subfields" style="${purpose === 'add_new' ? '' : 'display:none;'}">
                    <div class="add-subfields-grid">
                      <div class="field-item">
                        <label>Buổi học (Session):</label>
                        <input type="number" class="form-control" id="input-new-session" value="${newCatalogMeta.sessionNumber}" min="1" />
                      </div>
                      <div class="field-item">
                        <label>Giai đoạn (Phase):</label>
                        <select class="form-control" id="select-new-phase">
                          <option value="1" ${newCatalogMeta.phase === 1 ? 'selected' : ''}>Phase 1</option>
                          <option value="2" ${newCatalogMeta.phase === 2 ? 'selected' : ''}>Phase 2</option>
                        </select>
                      </div>
                      <div class="field-item">
                        <label>Thứ tự test:</label>
                        <input type="number" class="form-control" id="input-new-testnum" value="${newCatalogMeta.testNumber}" min="1" />
                      </div>
                      <div class="field-item span-full">
                        <label>Tên bài test hiển thị:</label>
                        <input type="text" class="form-control" id="input-new-title" value="${escapeHtml(newCatalogMeta.title)}" placeholder="Nhập tên bài test..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 2: Phạm vi công bố -->
              <div class="form-group publish-section">
                <label class="publish-section-label">2. Phạm vi công bố đề thi:</label>
                <div class="scope-options">
                  <label class="scope-radio-card ${scope === 'whole_course' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_scope" value="whole_course" ${scope === 'whole_course' ? 'checked' : ''} id="radio-scope-whole" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('layers', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Toàn bộ khối (Mặc định)</div>
                        <div class="card-desc">Cập nhật đề thi chuẩn cho Danh mục bài test của khối và tự động áp dụng cho tất cả các lớp chưa có học sinh nộp bài.</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>

                  <label class="scope-radio-card ${scope === 'specific_classes' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_scope" value="specific_classes" ${scope === 'specific_classes' ? 'checked' : ''} id="radio-scope-classes" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('clipboard', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Chỉ áp dụng cho các lớp được chọn</div>
                        <div class="card-desc">Chỉ cập nhật đề thi cho các lớp được chỉ định dưới đây (bỏ qua nếu lớp đã thi).</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="specific-classes-container" id="specific-classes-container" style="${scope === 'specific_classes' ? '' : 'display: none;'}">
                <div class="classes-container-header">
                  <div class="classes-search-wrap">
                    <input type="text" class="form-control class-search-input" id="input-class-search" placeholder="🔍 Tìm kiếm mã lớp..." value="${escapeHtml(searchQuery)}" />
                  </div>
                  <div class="classes-actions">
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all-classes">Chọn tất cả</button>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-deselect-all-classes">Bỏ chọn</button>
                  </div>
                </div>
                <div class="classes-checkbox-grid" id="classes-checkbox-grid">
                  ${classesListHtml}
                </div>
                <div class="classes-selection-counter" style="font-size:12px; color:#64748b; margin-top:6px;">
                  Đã chọn <strong>${selectedClassIds.length}</strong> / ${availableClasses.length} lớp học.
                </div>
              </div>

              <div class="publishing-error-msg" id="publishing-error-msg" style="display:none; color:#dc2626; font-size:13px; margin-top:8px;"></div>
            </div>

            <footer class="publishing-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-publish">Hủy</button>
              <button type="button" class="btn btn-primary" id="btn-step1-next">
                <span>Tiếp tục</span> ${renderSvgIcon('arrow-right', 'icon-inline')}
              </button>
            </footer>
          </div>
        `;

        bindStep1Events();
      }

      function bindStep1Events() {
        const closeBtn = modal.querySelector('#btn-close-publish-modal');
        const cancelBtn = modal.querySelector('#btn-cancel-publish');
        [closeBtn, cancelBtn].forEach(b => {
          b?.addEventListener('click', () => {
            modal.style.display = 'none';
          });
        });

        // Purpose radio toggle
        const radioReplace = modal.querySelector('#radio-purpose-replace');
        const radioAdd = modal.querySelector('#radio-purpose-add');
        const replaceSubfields = modal.querySelector('#replace-subfields');
        const addSubfields = modal.querySelector('#add-subfields');

        radioReplace?.addEventListener('change', () => {
          purpose = 'replace_existing';
          if (replaceSubfields) replaceSubfields.style.display = 'block';
          if (addSubfields) addSubfields.style.display = 'none';
          modal.querySelectorAll('.purpose-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioReplace.closest('.purpose-radio-card')?.classList.add('is-selected');
        });

        radioAdd?.addEventListener('change', () => {
          purpose = 'add_new';
          if (replaceSubfields) replaceSubfields.style.display = 'none';
          if (addSubfields) addSubfields.style.display = 'block';
          modal.querySelectorAll('.purpose-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioAdd.closest('.purpose-radio-card')?.classList.add('is-selected');
        });

        const targetSelect = modal.querySelector('#select-target-test');
        targetSelect?.addEventListener('change', () => {
          targetTestKey = targetSelect.value;
        });

        modal.querySelector('#input-new-session')?.addEventListener('input', (e) => {
          newCatalogMeta.sessionNumber = Number(e.target.value) || 1;
        });
        modal.querySelector('#select-new-phase')?.addEventListener('change', (e) => {
          newCatalogMeta.phase = Number(e.target.value) || 1;
        });
        modal.querySelector('#input-new-testnum')?.addEventListener('input', (e) => {
          newCatalogMeta.testNumber = Number(e.target.value) || 1;
        });
        modal.querySelector('#input-new-title')?.addEventListener('input', (e) => {
          newCatalogMeta.title = e.target.value;
        });

        // Scope toggle
        const radioWhole = modal.querySelector('#radio-scope-whole');
        const radioClasses = modal.querySelector('#radio-scope-classes');
        const classesContainer = modal.querySelector('#specific-classes-container');

        radioWhole?.addEventListener('change', () => {
          scope = 'whole_course';
          if (classesContainer) classesContainer.style.display = 'none';
          modal.querySelectorAll('.scope-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioWhole.closest('.scope-radio-card')?.classList.add('is-selected');
        });

        radioClasses?.addEventListener('change', () => {
          scope = 'specific_classes';
          if (classesContainer) classesContainer.style.display = 'block';
          modal.querySelectorAll('.scope-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioClasses.closest('.scope-radio-card')?.classList.add('is-selected');
        });

        // Search classes
        const searchInput = modal.querySelector('#input-class-search');
        searchInput?.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          renderStep1();
          const newSearch = modal.querySelector('#input-class-search');
          if (newSearch) {
            newSearch.focus();
            newSearch.selectionStart = newSearch.selectionEnd = newSearch.value.length;
          }
        });

        // Class selection
        modal.querySelector('#btn-select-all-classes')?.addEventListener('click', () => {
          selectedClassIds = availableClasses.map(c => String(c.classId || c.id));
          renderStep1();
        });
        modal.querySelector('#btn-deselect-all-classes')?.addEventListener('click', () => {
          selectedClassIds = [];
          renderStep1();
        });

        modal.querySelectorAll('.cb-publish-class').forEach(cb => {
          cb.addEventListener('change', () => {
            const cid = cb.value;
            if (cb.checked) {
              if (!selectedClassIds.includes(cid)) selectedClassIds.push(cid);
              cb.closest('.class-picker-row')?.classList.add('is-selected');
            } else {
              selectedClassIds = selectedClassIds.filter(id => id !== cid);
              cb.closest('.class-picker-row')?.classList.remove('is-selected');
            }
            const counter = modal.querySelector('.classes-selection-counter');
            if (counter) counter.innerHTML = `Đã chọn <strong>${selectedClassIds.length}</strong> / ${availableClasses.length} lớp học.`;
          });
        });

        // Next to Step 2
        const nextBtn = modal.querySelector('#btn-step1-next');
        const errorMsgEl = modal.querySelector('#publishing-error-msg');

        nextBtn?.addEventListener('click', async () => {
          if (scope === 'specific_classes' && selectedClassIds.length === 0) {
            if (errorMsgEl) {
              errorMsgEl.textContent = 'Vui lòng chọn ít nhất 1 lớp học để công bố đề thi.';
              errorMsgEl.style.display = 'block';
            }
            return;
          }

          if (errorMsgEl) errorMsgEl.style.display = 'none';
          nextBtn.disabled = true;
          nextBtn.textContent = '⏳ Đang phân tích tác động...';

          try {
            const previewPayload = {
              formVersionId: draftState.formVersionId,
              courseId: currentCid,
              purpose,
              targetTestKey: purpose === 'replace_existing' ? targetTestKey : null,
              newCatalogMeta: purpose === 'add_new' ? newCatalogMeta : null,
              scope,
              classIds: scope === 'specific_classes' ? selectedClassIds : []
            };

            if (typeof options.onPublishPreview === 'function') {
              previewResult = await options.onPublishPreview(previewPayload);
            } else {
              try {
                const prevRes = await fetch(formPublishPreviewPath(options.apiBase), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {})
                  },
                  body: JSON.stringify(previewPayload)
                });
                if (prevRes.ok) {
                  previewResult = await prevRes.json();
                }
              } catch (_) {}
            }

            currentStep = 2;
            renderModalContent();
          } catch (err) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = `<span>Tiếp tục</span> ${renderSvgIcon('arrow-right', 'icon-inline')}`;
            if (errorMsgEl) {
              errorMsgEl.textContent = 'Lỗi phân tích: ' + (err.message || 'Lỗi kết nối');
              errorMsgEl.style.display = 'block';
            }
          }
        });
      }

      function renderStep2() {
        const targetCatalogItem = catalog.find(c => c.testKey === targetTestKey);
        const targetTitle = purpose === 'replace_existing'
          ? (previewResult?.targetTestTitle || targetCatalogItem?.title || draftState.title || 'Đề thi')
          : (newCatalogMeta.title || draftState.title || 'Đề thi mới');

        const totalChecked = previewResult?.totalChecked ?? (scope === 'whole_course' ? availableClasses.length : selectedClassIds.length);
        const updatedCount = previewResult?.updatedCount ?? (purpose === 'add_new' ? totalChecked : selectedClassIds.length);
        const skippedCount = previewResult?.skippedCount ?? 0;

        const targetTitleToMatch = targetTitle.trim();

        modal.innerHTML = `
          <div class="publishing-dialog publishing-wizard-dialog">
            <header class="publishing-header">
              <div class="publishing-title-area">
                <span class="publish-badge">Smart Publishing Engine</span>
                <h3>Xác nhận công bố đề thi</h3>
                <p class="publish-test-title">${escapeHtml(draftState.title || '')}</p>
              </div>
              <button type="button" class="btn-close-publish-modal" id="btn-close-publish-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
            </header>

            <div class="publishing-stepper">
              <div class="stepper-item is-completed">
                <span class="stepper-num">${renderSvgIcon('check', 'icon-inline')}</span>
                <span class="stepper-label">Mục tiêu &amp; Phạm vi</span>
              </div>
              <div class="stepper-line is-completed"></div>
              <div class="stepper-item is-active">
                <span class="stepper-num">2</span>
                <span class="stepper-label">Xác nhận an toàn</span>
              </div>
            </div>

            <div class="publishing-body">
              <!-- Bảng phân tích tác động (Impact Summary) -->
              <div class="impact-summary-card">
                <div class="impact-summary-header">
                  <span class="impact-summary-badge">Bảng phân tích tác động</span>
                  <h4>Kiểm tra tác động trước khi áp dụng:</h4>
                </div>
                <div class="impact-summary-grid">
                  <div class="impact-row">
                    <span class="impact-label">Mục tiêu công bố:</span>
                    <span class="impact-value">
                      ${purpose === 'replace_existing'
                        ? `Thay thế bài test: <strong>${escapeHtml(targetTitle)}</strong>`
                        : `Bổ sung bài test mới: <strong>${escapeHtml(targetTitle)}</strong> (Buổi ${newCatalogMeta.sessionNumber})`}
                    </span>
                  </div>
                  <div class="impact-row">
                    <span class="impact-label">Phạm vi áp dụng:</span>
                    <span class="impact-value">
                      ${scope === 'whole_course'
                        ? `Toàn bộ khối (Tổng số: <strong>${totalChecked}</strong> lớp)`
                        : `Chỉ áp dụng cho <strong>${selectedClassIds.length}</strong> lớp được chọn`}
                    </span>
                  </div>
                  <div class="impact-row">
                    <span class="impact-label">Lớp sẽ nhận đề mới:</span>
                    <span class="impact-value text-success">
                      <strong>${updatedCount} lớp</strong> ${purpose === 'add_new' ? '(sẽ được tạo bài tập mới)' : '(chưa có học sinh nộp bài)'}
                    </span>
                  </div>
                  ${skippedCount > 0 ? `
                    <div class="impact-row">
                      <span class="impact-label">Lớp được bảo vệ đóng băng:</span>
                      <span class="impact-value text-warning">
                        <strong>${skippedCount} lớp</strong> (đã có học sinh làm bài, giữ nguyên đề cũ)
                      </span>
                    </div>
                  ` : ''}
                  <div class="impact-row">
                    <span class="impact-label">Danh mục lộ trình khối:</span>
                    <span class="impact-value text-info">
                      ${scope === 'whole_course'
                        ? `Cập nhật lộ trình chuẩn của Khối ${courseCode}`
                        : `Chỉ gán bài riêng cho các lớp được chỉ định`}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Double-Check Xác nhận -->
              <div class="double-check-box">
                <div class="double-check-title">
                  ${renderSvgIcon('alert', 'icon-inline')}
                  <strong>XÁC NHẬN AN TOÀN (DOUBLE-CHECK)</strong>
                </div>
                <p class="double-check-desc">
                  Đây là quyết định thay đổi bài thi trực tiếp cho học sinh. Để xác nhận bạn hiểu rõ tác động trên, vui lòng nhập chính xác tên bài test dưới đây:
                </p>
                <div class="double-check-reference">
                  <span class="reference-label">Tên bài test cần xác nhận:</span>
                  <code class="reference-code" id="target-title-reference">${escapeHtml(targetTitleToMatch)}</code>
                </div>

                <div class="confirm-input-row">
                  <input type="text" class="form-control" id="input-confirm-title" placeholder="Nhập hoặc dán tên bài test vào đây..." autocomplete="off" />
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-auto-fill-confirm" title="Điền tự động">📋 Điền tự động</button>
                </div>
                <div class="confirm-match-status" id="confirm-match-status">
                  <span class="status-unmatched">⚠️ Chưa khớp tên bài test (nút công bố đang khóa)</span>
                </div>
              </div>

              <div class="publishing-error-msg" id="publishing-error-msg" style="display:none; color:#dc2626; font-size:13px; margin-top:8px;"></div>
            </div>

            <footer class="publishing-footer">
              <button type="button" class="btn btn-secondary" id="btn-step2-back">⬅ Quay lại</button>
              <button type="button" class="btn btn-danger" id="btn-final-publish" disabled>
                ${renderSvgIcon('publish', 'icon-inline')} <span>Xác nhận &amp; Công bố ngay</span>
              </button>
            </footer>
          </div>
        `;

        bindStep2Events(targetTitleToMatch);
      }

      function bindStep2Events(targetTitleToMatch) {
        const closeBtn = modal.querySelector('#btn-close-publish-modal');
        closeBtn?.addEventListener('click', () => {
          modal.style.display = 'none';
        });

        const backBtn = modal.querySelector('#btn-step2-back');
        backBtn?.addEventListener('click', () => {
          currentStep = 1;
          renderModalContent();
        });

        const inputEl = modal.querySelector('#input-confirm-title');
        const autoFillBtn = modal.querySelector('#btn-auto-fill-confirm');
        const statusEl = modal.querySelector('#confirm-match-status');
        const finalBtn = modal.querySelector('#btn-final-publish');
        const errorMsgEl = modal.querySelector('#publishing-error-msg');

        function checkMatch() {
          const val = (inputEl?.value || '').trim().toLowerCase();
          const target = targetTitleToMatch.toLowerCase();
          const isMatched = val === target && val.length > 0;
          if (isMatched) {
            if (statusEl) statusEl.innerHTML = '<span class="status-matched">✅ Tên bài test đã khớp chính xác. Bạn có thể tiến hành công bố.</span>';
            if (finalBtn) {
              finalBtn.disabled = false;
              finalBtn.classList.add('is-ready');
            }
          } else {
            if (statusEl) statusEl.innerHTML = '<span class="status-unmatched">⚠️ Chưa khớp tên bài test (nút công bố đang khóa)</span>';
            if (finalBtn) {
              finalBtn.disabled = true;
              finalBtn.classList.remove('is-ready');
            }
          }
        }

        inputEl?.addEventListener('input', checkMatch);
        autoFillBtn?.addEventListener('click', () => {
          if (inputEl) {
            inputEl.value = targetTitleToMatch;
            checkMatch();
          }
        });

        // Initialize state on render
        checkMatch();

        finalBtn?.addEventListener('click', async () => {
          if (finalBtn.disabled || isPublishing) return;
          isPublishing = true;
          finalBtn.disabled = true;
          finalBtn.textContent = '⏳ Đang công bố...';
          if (errorMsgEl) errorMsgEl.style.display = 'none';

          try {
            const publishPayload = {
              formVersionId: draftState.formVersionId,
              courseId: currentCid,
              purpose,
              targetTestKey: purpose === 'replace_existing' ? targetTestKey : null,
              newCatalogMeta: purpose === 'add_new' ? newCatalogMeta : null,
              scope,
              classIds: scope === 'specific_classes' ? selectedClassIds : []
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
            isDirty = false;
            modal.style.display = 'none';
            render();
            openPublishReportDialog(result);
          } catch (err) {
            isPublishing = false;
            finalBtn.disabled = false;
            finalBtn.innerHTML = `${renderSvgIcon('publish', 'icon-inline')} <span>Xác nhận &amp; Công bố ngay</span>`;
            if (errorMsgEl) {
              errorMsgEl.textContent = 'Lỗi công bố: ' + (err.message || 'Lỗi mạng');
              errorMsgEl.style.display = 'block';
            }
          }
        });
      }

      modal.style.display = 'flex';
      renderModalContent();
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
          <h4 class="report-block-title">${renderSvgIcon('check', 'icon-inline')} Các lớp đã cập nhật đề thi mới (${updated.length} lớp):</h4>
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
          <h4 class="report-block-title">${renderSvgIcon('lock', 'icon-inline')} Các lớp được bảo vệ & đóng băng (${skipped.length} lớp):</h4>
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
            <button type="button" class="btn-close-report" id="btn-close-report-x" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
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
                <div class="stat-icon">${result.catalogUpdated ? renderSvgIcon('check', 'icon-inline') : '—'}</div>
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
        if (typeof openConfirmDeleteTestModal === 'function' && typeof document !== 'undefined') {
          openConfirmDeleteTestModal({
            formVersionId: draftState.formVersionId,
            testKey: formVersionData.testKey || '',
            title: draftState.title || formVersionData.title || '',
            sessionNumber: draftState.sessionNumber || '',
            phase: draftState.phase || '',
            courseName: options.courseId === 1 ? 'Khối 03' : (options.courseId === 3 ? 'Khối 45' : 'Khối 34'),
            onConfirm: () => {
              isDirty = false;
              unregisterUnsavedChangesGuard(unsavedGuardChecker);
              if (typeof options.onDeleteDraft === 'function') {
                options.onDeleteDraft({
                  formVersionId: draftState.formVersionId,
                  testKey: formVersionData.testKey || '',
                  title: draftState.title || formVersionData.title || ''
                });
              }
            }
          });
        } else {
          const confirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm('Bạn có chắc chắn muốn xóa bài thi này không? Thao tác này không thể hoàn tác.')
            : true;
          if (confirmed) {
            isDirty = false;
            unregisterUnsavedChangesGuard(unsavedGuardChecker);
            if (typeof options.onDeleteDraft === 'function') {
              options.onDeleteDraft({
                formVersionId: draftState.formVersionId,
                testKey: formVersionData.testKey || '',
                title: draftState.title || formVersionData.title || ''
              });
            }
          }
        }
      });
    }

    // Rich HTML Editor interactive controls in builder item cards
    const richWraps = container.querySelectorAll('.rich-html-editor-wrap');
    if (richWraps && typeof richWraps.forEach === 'function') {
      richWraps.forEach(wrap => {
        const visualEl = wrap.querySelector ? wrap.querySelector('.rich-editor-visual') : null;
        const codeEl = wrap.querySelector ? wrap.querySelector('.rich-editor-code, textarea') : null;
        const toggleBtn = wrap.querySelector ? wrap.querySelector('.btn-toggle-html-mode') : null;
        const tableBtn = wrap.querySelector ? wrap.querySelector('.btn-rich-insert-table') : null;
        const tableMenu = wrap.querySelector ? wrap.querySelector('.table-presets-menu') : null;
        const imageBtn = wrap.querySelector ? wrap.querySelector('.btn-rich-insert-image') : null;
        const imagePopup = wrap.querySelector ? wrap.querySelector('.image-insert-popup') : null;
        const imageLinkInput = wrap.querySelector ? wrap.querySelector('.input-image-link') : null;
        const confirmImageBtn = wrap.querySelector ? wrap.querySelector('.btn-confirm-insert-image') : null;
        const imageErrorEl = wrap.querySelector ? wrap.querySelector('.popup-image-error') : null;
        const generalErrorEl = wrap.querySelector ? wrap.querySelector('.general-editor-error') : null;

        let savedRange = null;
        const saveSelection = () => {
          if (typeof window !== 'undefined' && window.getSelection) {
            const sel = window.getSelection();
            if (!visualEl || !sel?.rangeCount) return;
            const range = sel.getRangeAt(0);
            if (visualEl.contains && visualEl.contains(range.commonAncestorContainer)) {
              savedRange = range.cloneRange();
            }
          }
        };

        const closeAllPopups = () => {
          if (tableMenu && tableMenu.style) tableMenu.style.display = 'none';
          if (imagePopup && imagePopup.style) {
            imagePopup.style.display = 'none';
            if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
          }
        };

        const showError = (msg) => {
          if (generalErrorEl) {
            generalErrorEl.textContent = msg;
            if (generalErrorEl.style) generalErrorEl.style.display = 'flex';
            setTimeout(() => {
              if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
            }, 5000);
          }
        };

        const clearError = () => {
          if (generalErrorEl && generalErrorEl.style) generalErrorEl.style.display = 'none';
          if (imageErrorEl && imageErrorEl.style) imageErrorEl.style.display = 'none';
        };

        const syncToCode = () => {
          if (!visualEl || !codeEl) return;
          const clean = sanitizeRichContent(visualEl.innerHTML || '');
          codeEl.value = clean;
          markAsDirty();

          // Real-time sync to draftState and live preview
          const bIdx = wrap.getAttribute ? wrap.getAttribute('data-block-idx') : null;
          const iIdx = wrap.getAttribute ? wrap.getAttribute('data-item-idx') : null;
          if (bIdx !== null && iIdx !== null) {
            const blockIndex = Number(bIdx);
            const itemIndex = Number(iIdx);
            const item = draftState.blocks?.[blockIndex]?.items?.[itemIndex];
            if (item) {
              item.prompt = clean;
              const itemCard = (typeof wrap.closest === 'function') ? wrap.closest('.builder-item-card') : (wrap.parentElement || null);
              const previewEl = itemCard?.querySelector ? itemCard.querySelector('.cloze-preview-content') : null;
              if (previewEl) {
                previewEl.innerHTML = renderInlineClozeMarkup(clean, [item], {}, { disabled: true }) || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>';
              }
              const charCountEl = wrap.querySelector ? wrap.querySelector('.prompt-char-count') : null;
              if (charCountEl) {
                charCountEl.textContent = `${clean.length} ký tự`;
              }
            }
          }
        };

        const syncToVisual = () => {
          if (!visualEl || !codeEl) return;
          const clean = sanitizeRichContent(codeEl.value || '');
          visualEl.innerHTML = clean;
          markAsDirty();

          const bIdx = wrap.getAttribute ? wrap.getAttribute('data-block-idx') : null;
          const iIdx = wrap.getAttribute ? wrap.getAttribute('data-item-idx') : null;
          if (bIdx !== null && iIdx !== null) {
            const blockIndex = Number(bIdx);
            const itemIndex = Number(iIdx);
            const item = draftState.blocks?.[blockIndex]?.items?.[itemIndex];
            if (item) {
              item.prompt = clean;
              const itemCard = (typeof wrap.closest === 'function') ? wrap.closest('.builder-item-card') : (wrap.parentElement || null);
              const previewEl = itemCard?.querySelector ? itemCard.querySelector('.cloze-preview-content') : null;
              if (previewEl) {
                previewEl.innerHTML = renderInlineClozeMarkup(clean, [item], {}, { disabled: true }) || '<em>Chưa có nội dung văn bản chứa chỗ trống...</em>';
              }
            }
          }
        };

        const insertHtmlAtCursor = (htmlToInsert) => {
          if (!htmlToInsert) return;
          const isCodeVisible = codeEl && codeEl.style && codeEl.style.display !== 'none';
          if (isCodeVisible) {
            const start = codeEl.selectionStart || codeEl.value.length;
            const end = codeEl.selectionEnd || codeEl.value.length;
            codeEl.value = codeEl.value.substring(0, start) + htmlToInsert + codeEl.value.substring(end);
            syncToVisual();
            return;
          }
          if (visualEl) {
            visualEl.focus?.();
            let range = savedRange;
            if (!range || (visualEl.contains && !visualEl.contains(range.commonAncestorContainer))) {
              if (typeof document !== 'undefined' && document.createRange) {
                range = document.createRange();
                range.selectNodeContents(visualEl);
                range.collapse(false);
              }
            }

            if (range && range.createContextualFragment) {
              range.deleteContents?.();
              const fragment = range.createContextualFragment(htmlToInsert);
              const lastNode = fragment.lastChild;
              range.insertNode?.(fragment);
              if (lastNode && range.setStartAfter) {
                range.setStartAfter(lastNode);
                range.collapse?.(true);
              }
              if (typeof window !== 'undefined' && window.getSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges?.();
                sel.addRange?.(range);
                savedRange = range.cloneRange ? range.cloneRange() : range;
              }
            } else {
              visualEl.innerHTML += htmlToInsert;
            }
            syncToCode();
          }
        };

        if (toggleBtn && visualEl && codeEl && toggleBtn.addEventListener) {
          toggleBtn.addEventListener('click', () => {
            closeAllPopups();
            const isCurrentlyVisual = visualEl.style && visualEl.style.display !== 'none';
            if (isCurrentlyVisual) {
              syncToCode();
              if (visualEl.style) visualEl.style.display = 'none';
              if (codeEl.style) codeEl.style.display = 'block';
              toggleBtn.classList?.add?.('active');
              toggleBtn.textContent = 'Trực quan';
            } else {
              syncToVisual();
              if (codeEl.style) codeEl.style.display = 'none';
              if (visualEl.style) visualEl.style.display = 'block';
              toggleBtn.classList?.remove?.('active');
              toggleBtn.textContent = '</> Mã HTML';
            }
          });
        }

        if (visualEl && visualEl.addEventListener) {
          visualEl.addEventListener('keyup', saveSelection);
          visualEl.addEventListener('mouseup', saveSelection);
          visualEl.addEventListener('input', syncToCode);
          visualEl.addEventListener('blur', syncToCode);

          // Advanced paste handler with DOMParser
          visualEl.addEventListener('paste', (event) => {
            const cd = event.clipboardData;
            if (!cd) return;

            const html = cd.getData?.('text/html');
            if (html && typeof DOMParser !== 'undefined') {
              const parsed = new DOMParser().parseFromString(html, 'text/html');
              const embeddedImages = Array.from(parsed.body.querySelectorAll('img')).filter(
                img => !/^https:/i.test(img.getAttribute('src') || '')
              );
              const hasImageFile = Array.from(cd.files || []).some(
                file => file.type && file.type.startsWith('image/')
              );

              if (embeddedImages.length || hasImageFile) {
                event.preventDefault?.();
                saveSelection();
                embeddedImages.forEach(img => img.remove());
                if (html) {
                  insertHtmlAtCursor(parsed.body.innerHTML);
                } else {
                  insertHtmlAtCursor(escapeHtml(cd.getData?.('text/plain') || ''));
                }
                showError('Hãy tải ảnh lên Google Drive rồi dùng nút “Chèn ảnh”.');
                return;
              }
            }

            if (cd.items) {
              for (let i = 0; i < cd.items.length; i++) {
                if (cd.items[i].type && cd.items[i].type.indexOf('image') !== -1) {
                  event.preventDefault?.();
                  showError('Hệ thống không hỗ trợ dán ảnh trực tiếp base64. Vui lòng dùng Google Drive.');
                  return;
                }
              }
            }
          });

          visualEl.addEventListener('drop', (event) => {
            const hasImage = Array.from(event.dataTransfer?.files || []).some(
              file => file.type && file.type.startsWith('image/')
            );
            if (hasImage) {
              event.preventDefault?.();
              showError('Hãy dùng nút “Chèn ảnh” để nhập link ảnh.');
            }
          });
        }

        if (codeEl && codeEl.addEventListener) {
          codeEl.addEventListener('input', syncToVisual);
        }

        // Heading format dropdown
        const headingSelect = wrap.querySelector ? wrap.querySelector('.select-format-heading') : null;
        if (headingSelect && headingSelect.addEventListener) {
          headingSelect.addEventListener('change', () => {
            const tag = headingSelect.value;
            visualEl?.focus?.();
            if (typeof document !== 'undefined' && document.execCommand) {
              document.execCommand('formatBlock', false, tag === 'p' ? '<p>' : `<${tag}>`);
            }
            syncToCode();
          });
        }

        // Formatting action buttons (Bold, Italic, Underline, Strikethrough, Lists, Alignment, Clear)
        const formatBtnConfigs = [
          { sel: '.btn-format-bold', cmd: 'bold' },
          { sel: '.btn-format-italic', cmd: 'italic' },
          { sel: '.btn-format-underline', cmd: 'underline' },
          { sel: '.btn-format-strike', cmd: 'strikeThrough' },
          { sel: '.btn-format-ul', cmd: 'insertUnorderedList' },
          { sel: '.btn-format-ol', cmd: 'insertOrderedList' },
          { sel: '.btn-format-align-left', cmd: 'justifyLeft' },
          { sel: '.btn-format-align-center', cmd: 'justifyCenter' },
          { sel: '.btn-format-align-right', cmd: 'justifyRight' },
          { sel: '.btn-format-clear', cmd: 'removeFormat' }
        ];

        formatBtnConfigs.forEach(({ sel, cmd }) => {
          const btn = wrap.querySelector ? wrap.querySelector(sel) : null;
          if (btn && btn.addEventListener) {
            btn.addEventListener('mousedown', (e) => {
              e.preventDefault?.(); // Prevent loss of selection
            });
            btn.addEventListener('click', (e) => {
              e.preventDefault?.();
              visualEl?.focus?.();
              if (typeof document !== 'undefined' && document.execCommand) {
                document.execCommand(cmd, false, null);
              }
              syncToCode();
            });
          }
        });

        if (tableBtn && tableMenu && tableBtn.addEventListener) {
          tableBtn.addEventListener?.('mousedown', saveSelection);
          tableBtn.addEventListener('click', (e) => {
            e.stopPropagation?.();
            saveSelection();
            const isVisible = tableMenu.style?.display !== 'none';
            closeAllPopups();
            if (tableMenu.style) tableMenu.style.display = isVisible ? 'none' : 'grid';
          });

          const gridBtns = tableMenu.querySelectorAll?.('.btn-table-grid') || [];
          if (gridBtns.forEach) {
            gridBtns.forEach(btn => {
              btn.addEventListener?.('click', (e) => {
                e.stopPropagation?.();
                const r = Number(btn.getAttribute('data-rows')) || 2;
                const c = Number(btn.getAttribute('data-cols')) || 2;
                closeAllPopups();
                const tblHtml = generateTableHtml(r, c) + '<p><br></p>';
                insertHtmlAtCursor(tblHtml);
              });
            });
          }

          const presetBtns = tableMenu.querySelectorAll?.('.btn-table-preset') || [];
          if (presetBtns.forEach) {
            presetBtns.forEach(btn => {
              btn.addEventListener?.('click', (e) => {
                e.stopPropagation?.();
                const preset = btn.getAttribute('data-preset');
                closeAllPopups();
                const tblHtml = generateTableHtml(null, null, preset) + '<p><br></p>';
                insertHtmlAtCursor(tblHtml);
              });
            });
          }
        }

        if (imageBtn && imagePopup) {
          imageBtn.addEventListener?.('mousedown', saveSelection);
          imageBtn.addEventListener('click', (e) => {
            e.stopPropagation?.();
            saveSelection();
            const isVisible = imagePopup.style?.display !== 'none';
            closeAllPopups();
            if (imagePopup.style) {
              imagePopup.style.display = isVisible ? 'none' : 'grid';
              if (!isVisible && imageLinkInput) {
                imageLinkInput.value = '';
                clearError();
                setTimeout(() => imageLinkInput.focus?.(), 50);
              }
            }
          });

          const executeInsertImage = () => {
            const urlVal = imageLinkInput?.value?.trim() || '';
            if (!urlVal) {
              if (imageErrorEl) {
                imageErrorEl.textContent = 'Vui lòng nhập đường dẫn ảnh.';
                if (imageErrorEl.style) imageErrorEl.style.display = 'block';
              }
              return;
            }
            const converted = convertGoogleDriveImageUrl(urlVal);
            if (!validateImageUrl(converted)) {
              if (imageErrorEl) {
                imageErrorEl.textContent = 'Link không hợp lệ. Hãy dùng link HTTPS hoặc Google Drive.';
                if (imageErrorEl.style) imageErrorEl.style.display = 'block';
              }
              return;
            }
            const imgTag = `<img src="${escapeHtml(converted)}" alt="" />`;
            insertHtmlAtCursor(imgTag);
            closeAllPopups();
          };

          confirmImageBtn?.addEventListener?.('click', (e) => {
            e.stopPropagation?.();
            executeInsertImage();
          });

          imageLinkInput?.addEventListener?.('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault?.();
              executeInsertImage();
            }
          });
        }
      });
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('click', (e) => {
        const openMenus = container.querySelectorAll ? container.querySelectorAll('.table-presets-menu, .image-insert-popup') : [];
        if (openMenus.forEach) {
          openMenus.forEach(m => {
            if (!e.target || !m.contains?.(e.target)) {
              if (m.style) m.style.display = 'none';
            }
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
  let ans = item.studentAnswer;
  if (typeof ans === 'string' && (ans.startsWith('{') || ans.startsWith('['))) {
    try { ans = JSON.parse(ans); } catch (_) {}
  }
  if (ans === null || ans === undefined || ans === '') {
    return '(Chưa trả lời)';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(ans)) {
    return ans.map(a => optMap.get(String(a)) || String(a)).join(', ');
  }

  if (typeof ans === 'object') {
    if ('error' in ans || 'correction' in ans) {
      const err = ans.error || '—';
      const corr = ans.correction || '—';
      return `Lỗi: ${err} → Sửa: ${corr}`;
    }

    const keys = Object.keys(ans).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    if (keys.length === 0) return '(Chưa trả lời)';

    const sub = item.subResults || item.feedback?.subResults || {};
    const parts = keys.map(k => {
      const val = ans[k];
      const text = (val === null || val === undefined || String(val).trim() === '') ? '—' : String(val).trim();
      const blankSub = sub[k];
      let statusMark = '';
      if (blankSub) {
        if (blankSub.verdict === 'correct') statusMark = ' [✓]';
        else if (blankSub.verdict === 'incorrect') statusMark = ' [✗]';
      }
      return `(${k}) ${text}${statusMark}`;
    });

    return parts.join(' · ');
  }

  const raw = String(ans);
  if (optMap.has(raw)) {
    return `${optMap.get(raw)} (${raw})`;
  }
  return raw;
}

export function resolveExpectedAnswerDisplay(item) {
  let exp = item.expectedAnswer;
  if (typeof exp === 'string' && (exp.startsWith('{') || exp.startsWith('['))) {
    try { exp = JSON.parse(exp); } catch (_) {}
  }
  if (exp === null || exp === undefined || exp === '') {
    if (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0) {
      const keys = Object.keys(item.clozeAnswers).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      return keys.map(k => {
        const v = item.clozeAnswers[k];
        const disp = Array.isArray(v?.accepted) ? v.accepted.join(' / ') : (Array.isArray(v) ? v.join(' / ') : String(v || ''));
        return `(${k}) ${disp}`;
      }).join(' · ');
    }
    return item.graderType === 'rubric_async' ? '(Chấm theo rubric)' : '—';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(exp)) {
    return exp.map(ans => optMap.get(String(ans)) || String(ans)).join(', ');
  }

  if (typeof exp === 'object') {
    if ('error' in exp || 'correction' in exp) {
      return `Lỗi: ${exp.error || '—'} → Sửa: ${exp.correction || '—'}`;
    }

    const keys = Object.keys(exp).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    if (keys.length === 0) return '—';

    const parts = keys.map(k => {
      const v = exp[k];
      let disp = '';
      if (Array.isArray(v)) {
        disp = v.join(' / ');
      } else if (v && typeof v === 'object' && Array.isArray(v.accepted)) {
        disp = v.accepted.join(' / ');
      } else {
        disp = String(v ?? '');
      }
      return `(${k}) ${disp}`;
    });

    return parts.join(' · ');
  }

  const raw = String(exp);
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
  const selfProctoringToggle = document.querySelector('#self-proctoring-toggle');
  const examModeLockHint = document.querySelector('#exam-mode-lock-hint');
  const selfProctoringLockHint = document.querySelector('#self-proctoring-lock-hint');
  const selfProctoringLimit = document.querySelector('#self-proctoring-limit');
  const selfProctoringSave = document.querySelector('#self-proctoring-save');
  const examSwitchControls = document.querySelector('#exam-switch-controls');
  const examSwitchHint = document.querySelector('#exam-switch-hint');
  const examSwitchLimit = document.querySelector('#exam-switch-limit');
  const examSwitchButton = document.querySelector('#exam-switch-btn');
  const examSwitchMessage = document.querySelector('#exam-switch-message');
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
  const exportXlsxBtn = document.querySelector('#export-xlsx-btn');
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
  let currentServerNow = null;
  let isSwitchingAssignment = false;
  let currentSelectedAssignment = null;
  let examRoomReturnToResults = false;
  let rawClassesList = [];
  let currentTeacher = null;

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
      const handleDeleteDraft = async ({ formVersionId, title }) => {
        if (!formVersionId) return;
        try {
          container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang xóa bài thi...</p></div>';
          const delRes = await request(formDraftPath(formVersionId), {
            method: 'DELETE'
          });
          if (delRes && delRes.success) {
            alert(`Đã xóa bài thi ${title ? `"${title}" ` : ''}thành công.`);
          }
          await loadAndRenderTestStudio(currentStudioCourseId);
        } catch (err) {
          alert('Lỗi xóa bài thi: ' + (err.message || 'Lỗi kết nối'));
          await loadAndRenderTestStudio(currentStudioCourseId);
        }
      };

      if (!rawClassesList || rawClassesList.length === 0) {
        try {
          const classPayload = await request('/api/teacher/classes');
          rawClassesList = classPayload?.classes || [];
        } catch (_) {}
      }
      const relevantClasses = filterClassesForCourse(rawClassesList, currentStudioCourseId);

      renderCourseTestCatalogView(container, catalog, {
        teacherRole,
        courseId: currentStudioCourseId,
        onCourseChange: (newCid) => {
          loadAndRenderTestStudio(newCid);
        },
        onDeleteDraft: handleDeleteDraft,
        onAddTest: () => {
          openCreateTestModal({
            courseId: currentStudioCourseId,
            catalog,
            onSubmit: async ({ courseId, sessionNumber, phase, title, durationMinutes }) => {
              try {
                container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang khởi tạo bản nháp bài thi mới...</p></div>';

                const postRes = await request(formDraftPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    courseId,
                    sessionNumber,
                    phase,
                    title,
                    durationMinutes
                  })
                });

                if (!postRes || !postRes.formVersionId) {
                  throw new Error(postRes?.message || 'Không thể tạo bản nháp bài thi');
                }

                const detailRes = await request(formDetailPath(postRes.formVersionId));

                const formObj = detailRes?.formVersion || detailRes?.form || {};
                renderTestBuilderView(container, {
                  ...formObj,
                  id: formObj.id || formObj.formVersionId || postRes.formVersionId,
                  formVersionId: formObj.formVersionId || formObj.id || postRes.formVersionId,
                  phase,
                  sessionNumber,
                  gradingKey: detailRes?.gradingKey || formObj.gradingKey,
                  submissionCount: detailRes?.submissionCount || 0
                }, {
                  teacherRole,
                  courseId,
                  catalog,
                  classes: relevantClasses,
                  onBack: () => {
                    if (hasActiveUnsavedChanges()) {
                      openUnsavedChangesModal({
                        onDiscard: () => {
                          clearActiveUnsavedChanges();
                          loadAndRenderTestStudio(courseId);
                        }
                      });
                      return;
                    }
                    clearActiveUnsavedChanges();
                    loadAndRenderTestStudio(courseId);
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
                  onPublishPreview: async (previewPayload) => {
                    return await request(formPublishPreviewPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(previewPayload)
                    });
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
            }
          });
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
              catalog,
              classes: relevantClasses,
              onBack: () => {
                if (hasActiveUnsavedChanges()) {
                  openUnsavedChangesModal({
                    onDiscard: () => {
                      clearActiveUnsavedChanges();
                      loadAndRenderTestStudio(currentStudioCourseId);
                    }
                  });
                  return;
                }
                clearActiveUnsavedChanges();
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
              onPublishPreview: async (previewPayload) => {
                return await request(formPublishPreviewPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(previewPayload)
                });
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

  let isNavigatingProgrammatically = false;
  let previousHash = (typeof window !== 'undefined' ? window.location?.hash : '') || '#dashboard';

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const href = item.getAttribute('href') || '#dashboard';
      const cleanTab = readDashboardTab(href);
      const targetHash = '#' + cleanTab;

      if (hasActiveUnsavedChanges()) {
        openUnsavedChangesModal({
          onDiscard: () => {
            clearActiveUnsavedChanges();
            isNavigatingProgrammatically = true;
            if (window.location.hash !== targetHash) {
              window.location.hash = targetHash;
            }
            previousHash = targetHash;
            updateDashboardTab(cleanTab);
          },
          onStay: () => {
            // User chooses to stay
          }
        });
        return;
      }

      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
      previousHash = targetHash;
      updateDashboardTab(cleanTab);
    });
  });

  window.addEventListener('hashchange', () => {
    if (isNavigatingProgrammatically) {
      isNavigatingProgrammatically = false;
      previousHash = window.location.hash;
      return;
    }
    const newHash = window.location.hash;
    if (hasActiveUnsavedChanges()) {
      openUnsavedChangesModal({
        onDiscard: () => {
          clearActiveUnsavedChanges();
          previousHash = newHash;
          updateDashboardTab(newHash);
        },
        onStay: () => {
          isNavigatingProgrammatically = true;
          window.location.hash = previousHash;
        }
      });
      return;
    }
    previousHash = newHash;
    updateDashboardTab(newHash);
  });

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('beforeunload', (e) => {
      if (hasActiveUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  if (goToGradingBtn) {
    goToGradingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (hasActiveUnsavedChanges()) {
        openUnsavedChangesModal({
          onDiscard: () => {
            clearActiveUnsavedChanges();
            isNavigatingProgrammatically = true;
            window.location.hash = '#grading';
            previousHash = '#grading';
            updateDashboardTab('grading');
          }
        });
        return;
      }
      window.location.hash = '#grading';
      previousHash = '#grading';
      updateDashboardTab('grading');
    });
  }

  if (gradingBackToDashboardBtn) {
    gradingBackToDashboardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (hasActiveUnsavedChanges()) {
        openUnsavedChangesModal({
          onDiscard: () => {
            clearActiveUnsavedChanges();
            isNavigatingProgrammatically = true;
            window.location.hash = '#dashboard';
            previousHash = '#dashboard';
            updateDashboardTab('dashboard');
          }
        });
        return;
      }
      window.location.hash = '#dashboard';
      previousHash = '#dashboard';
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
      if (examSwitchControls) examSwitchControls.hidden = true;
      return;
    }

    selectedAssignmentCard.hidden = false;
    currentSelectedAssignment = assignment;
    if (examRoom) examRoom.hidden = true;
    // Phòng thi vẫn mở được sau khi đã chuyển chế độ để xem lại sự cố của phiên cũ.
    if (examRoomOpenButton) examRoomOpenButton.hidden = !(assignment.examMode || assignment.examSession);
    updateExamModeUI(assignment.examMode);
    updateSelfProctoringUI(assignment.exitLimit, assignment.examMode);
    renderExamSwitch(assignment);
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

    const currentApi = typeof apiBase === 'function' ? apiBase() : '';
    const studentUrl = localStudentUrl(assignment.studentUrl, currentLocation, currentApi);
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
    } else if (isLocalHost && (!loginApiBase.value || loginApiBase.value.includes('webtest.ducanhdev.com'))) {
      loginApiBase.value = 'http://127.0.0.1:8788';
    } else if (!loginApiBase.value || (!isLocalHost && loginApiBase.value.includes('localhost'))) {
      loginApiBase.value = standardApiBase;
    }
  }
  if (form?.elements?.apiBase) {
    if (isTunnel) {
      form.elements.apiBase.value = currentLocation.origin;
    } else if (isLocalHost && (!form.elements.apiBase.value || form.elements.apiBase.value.includes('webtest.ducanhdev.com'))) {
      form.elements.apiBase.value = 'http://127.0.0.1:8788';
    } else if (!form.elements.apiBase.value || (!isLocalHost && form.elements.apiBase.value.includes('localhost'))) {
      form.elements.apiBase.value = standardApiBase;
    }
  }

  const identity = () => ({ actorId: form?.elements?.actorId?.value || '' });
  const apiBase = () => (loginApiBase?.value || form?.elements?.apiBase?.value || standardApiBase).replace(/\/$/, '');
  const authHeader = () => authHeaders({ token: sessionToken, actorId: form?.elements?.actorId?.value });

  const endSession = () => {
    handleLogout();
    if (loginError) {
      loginError.hidden = false;
      loginError.textContent = 'Phiên làm việc đã kết thúc hoặc không hợp lệ. Vui lòng đăng nhập lại.';
    }
  };

  const request = async (path, options = {}) => {
    const headers = { ...authHeader(), ...(options.headers || {}) };
    const response = await fetch(`${apiBase()}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && sessionToken) {
      endSession();
      throw new Error(payload.message || 'Yêu cầu đăng nhập.');
    }
    if (!response.ok) {
      throw Object.assign(new Error(payload.message || 'Không tải được dữ liệu.'), {
        code: payload.error, details: payload.details, status: response.status
      });
    }
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

  function updateSelfProctoringUI(exitLimit, examMode) {
    const enabled = exitLimit !== null && exitLimit !== undefined;
    // Bài đã chuyển từ Exam Mode sang Tự giám sát: server khoá đổi N, nên khoá luôn các ô để không hứa điều server từ chối.
    const lockedAfterExam = !examMode && Boolean(currentSelectedAssignment?.examSession);
    if (selfProctoringToggle) { selfProctoringToggle.checked = enabled; selfProctoringToggle.disabled = Boolean(examMode) || lockedAfterExam; }
    if (selfProctoringLimit) { selfProctoringLimit.value = enabled ? String(exitLimit) : ''; selfProctoringLimit.disabled = !enabled || lockedAfterExam; }
    if (selfProctoringSave) selfProctoringSave.disabled = lockedAfterExam || (!enabled && !selfProctoringToggle?.checked);
    const examReason = examModeLockReason({ exitLimit, examMode, examSession: currentSelectedAssignment?.examSession });
    if (examModeToggle) examModeToggle.disabled = Boolean(examReason);
    const selfReason = selfProctoringLockReason({ examMode, examSession: currentSelectedAssignment?.examSession });
    if (examModeLockHint) { examModeLockHint.textContent = examReason; examModeLockHint.hidden = !examReason; }
    if (selfProctoringLockHint) { selfProctoringLockHint.textContent = selfReason; selfProctoringLockHint.hidden = !selfReason; }
  }

  // Khối "Chuyển sang Tự giám sát": hiện khi phiên thi đã bắt đầu; kết quả cuối cùng luôn đọc lại từ server.
  let examSwitchAssignmentId = '';
  let examSwitchBusy = false;
  function setExamSwitchMessage(text, level = 'info') {
    if (!examSwitchMessage) return;
    examSwitchMessage.textContent = text;
    examSwitchMessage.dataset.level = level;
  }
  function renderExamSwitch(assignment) {
    if (!examSwitchControls) return;
    if (assignment?.assignmentId !== examSwitchAssignmentId) {
      examSwitchAssignmentId = assignment?.assignmentId || '';
      setExamSwitchMessage('');
      if (examSwitchLimit) examSwitchLimit.value = '';
    }
    const view = examSwitchView(assignment, { serverNow: currentServerNow });
    examSwitchControls.hidden = !view.visible;
    if (!view.visible) return;
    examSwitchHint.textContent = view.hint;
    examSwitchButton.disabled = examSwitchBusy;
  }
  examSwitchButton?.addEventListener('click', async () => {
    const target = currentSelectedAssignment;
    if (!target || examSwitchBusy) return;
    let body;
    try { body = examSwitchRequestBody(examSwitchLimit.value); }
    catch (error) { setExamSwitchMessage(error.message, 'error'); examSwitchLimit.focus(); return; }
    examSwitchBusy = true;
    examSwitchButton.disabled = true;
    examSwitchLimit.disabled = true;
    setExamSwitchMessage('Đang chuyển chế độ…');
    let payload;
    try {
      payload = await request(assignmentExamModePath(state.classId, target.assignmentId), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
    } catch (error) {
      const view = examSwitchErrorView(error);
      setExamSwitchMessage(view.text, 'error');
      examSwitchButton.textContent = view.retryable ? 'Thử lại' : 'Chuyển sang Tự giám sát';
      examSwitchBusy = false;
      examSwitchLimit.disabled = false;
      examSwitchButton.disabled = false;
      return;
    }
    // Chỉ báo thành công sau khi đọc lại trạng thái từ server; reload cũng thấy đúng như vậy.
    examSwitchBusy = false;
    examSwitchLimit.disabled = false;
    examSwitchButton.textContent = 'Chuyển sang Tự giám sát';
    try {
      await loadAssignments(state.classId, target.assignmentId);
      setExamSwitchMessage(examSwitchSuccessText(payload), 'success');
      status.textContent = 'Đã chuyển sang Tự giám sát.';
    } catch (error) {
      setExamSwitchMessage(`Máy chủ đã nhận yêu cầu chuyển nhưng chưa tải lại được trạng thái mới: ${error.message}. Hãy tải lại trang để xác nhận.`, 'error');
      examSwitchButton.disabled = false;
    }
  });

  selfProctoringToggle?.addEventListener('change', () => {
    selfProctoringLimit.disabled = !selfProctoringToggle.checked;
    if (selfProctoringToggle.checked) selfProctoringLimit.focus();
    selfProctoringSave.disabled = false;
  });

  selfProctoringSave?.addEventListener('click', async () => {
    if (!currentSelectedAssignment) return;
    selfProctoringSave.disabled = true;
    try {
      const body = selfProctoringRequestBody(selfProctoringToggle.checked, selfProctoringLimit.value);
      const payload = await request(assignmentSelfProctoringPath(state.classId, currentSelectedAssignment.assignmentId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      currentSelectedAssignment.exitLimit = payload.exitLimit;
      status.textContent = payload.exitLimit === null ? 'Đã tắt Tự giám sát.' : `Đã bật Tự giám sát: thoát quá ${payload.exitLimit} lần thì bài tự nộp.`;
    } catch (error) {
      status.textContent = error.message;
    } finally {
      updateSelfProctoringUI(currentSelectedAssignment.exitLimit, currentSelectedAssignment.examMode);
    }
  });

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
      updateSelfProctoringUI(currentSelectedAssignment.exitLimit, payload.examMode);
      if (examRoomOpenButton) examRoomOpenButton.hidden = !payload.examMode;
      if (!payload.examMode && examRoom) examRoom.hidden = true;
      status.textContent = payload.examMode ? 'Exam Mode đã bật. Học viên sẽ chờ giáo viên bắt đầu.' : 'Exam Mode đã tắt.';
    } catch (error) {
      updateExamModeUI(currentSelectedAssignment.examMode);
      status.textContent = error.message;
    } finally {
      examModeToggle.disabled = Boolean(examModeLockReason(currentSelectedAssignment));
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

  // ---- Đồng bộ điểm Portal: chỉ hiển thị dữ liệu backend trả về, không tính điểm hay luật ở trình duyệt.
  const portalEl = id => document.querySelector(`#${id}`);
  const portal = { key: '', tests: [], link: null, preview: null, sync: new Map(), names: new Map(), lastSync: null, busy: false };

  function portalMessage(text) { portalEl('portal-sync-message').textContent = text || ''; }

  function portalCell(row, text, tone) {
    const cell = document.createElement('td');
    cell.textContent = text;
    if (tone) cell.className = `portal-tone-${tone}`;
    row.append(cell);
  }

  function renderPortalPreview() {
    const box = portalEl('portal-preview');
    const body = portalEl('portal-preview-rows');
    body.replaceChildren();
    const preview = portal.preview;
    box.hidden = !preview;
    if (!preview) return;
    for (const raw of preview.rows) {
      const view = previewRowView(raw);
      const result = portal.sync.has(raw.studentRef) ? syncResultView(portal.sync.get(raw.studentRef)) : null;
      const tr = document.createElement('tr');
      const pick = document.createElement('td');
      const box2 = document.createElement('input');
      box2.type = 'checkbox';
      box2.className = 'portal-pick';
      box2.value = raw.studentRef;
      box2.disabled = !view.selectable;
      box2.checked = view.selectable;
      box2.setAttribute('aria-label', `Chọn ${view.name}`);
      box2.addEventListener('change', updatePortalSyncButton);
      pick.append(box2);
      tr.append(pick);
      portalCell(tr, view.name);
      portalCell(tr, view.webtestText);
      portalCell(tr, view.portalText);
      portalCell(tr, view.reasonText ? `${view.statusLabel}: ${view.reasonText}` : view.statusLabel, view.tone);
      portalCell(tr, result ? [result.statusLabel, result.errorText].filter(Boolean).join(': ') : '', result?.tone);
      body.append(tr);
    }
    const writable = preview.mode === 'write';
    portalEl('portal-sync-btn').disabled = !writable;
    portalEl('portal-sync-btn').title = writable ? '' : 'Đang ở chế độ chỉ xem trước.';
    portalEl('portal-retry-btn').hidden = !retryRefs([...portal.sync.values()]).length;
    updatePortalSyncButton();
  }

  const pickedRefs = () => [...document.querySelectorAll('.portal-pick:checked')].map(i => i.value);

  function updatePortalSyncButton() {
    const count = pickedRefs().length;
    const btn = portalEl('portal-sync-btn');
    btn.textContent = count ? `Đồng bộ điểm Portal (${count})` : 'Đồng bộ điểm Portal';
    if (portal.preview?.mode === 'write') btn.disabled = !count || portal.busy;
    const all = portalEl('portal-select-all');
    const state = selectAllState(document.querySelectorAll('.portal-pick:not(:disabled)').length, count);
    Object.assign(all, state);
  }

  // Khóa nút thao tác trong lúc một thao tác Portal đang chạy.
  function applyPortalBusy() {
    for (const id of ['portal-unlink-btn', 'portal-preview-btn', 'portal-retry-btn', 'portal-reload-btn']) portalEl(id).disabled = portal.busy;
    portalEl('portal-link-btn').disabled = portal.busy || !portal.tests.some(t => !t.linkedAssignmentId);
    updatePortalSyncButton();
  }

  function resetPortal() {
    Object.assign(portal, { key: '', tests: [], link: null, preview: null, sync: new Map(), lastSync: null, pending: null });
    const section = portalEl('portal-sync');
    if (section) section.hidden = true;
  }

  function renderPortalLastSync() {
    const last = portal.lastSync;
    portalEl('portal-last-sync').textContent = last
      ? `Lần đồng bộ gần nhất: ${new Date(last.startedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · ${last.actorEmail} · ${syncSummaryText(last.summary)}`
      : '';
  }

  function renderPortalPanel() {
    const linked = portal.link;
    portalEl('portal-sync-link').hidden = !!linked;
    portalEl('portal-sync-linked').hidden = !linked;
    if (linked) portalEl('portal-linked-name').textContent = `${linked.name} (thang ${linked.maxScore})`;
    else {
      const select = portalEl('portal-test-select');
      select.replaceChildren();
      for (const t of portal.tests) {
        const option = document.createElement('option');
        option.value = String(t.portalClassTestId);
        option.textContent = `${t.name} (thang ${t.maxScore})${t.linkedAssignmentId ? ' — đã gắn với đợt khác' : ''}`;
        option.disabled = !!t.linkedAssignmentId;
        select.append(option);
      }
      portalEl('portal-link-btn').disabled = !portal.tests.some(t => !t.linkedAssignmentId);
    }
    renderPortalLastSync();
    renderPortalPreview();
    const warning = portalEl('portal-scale-warning');
    warning.textContent = scaleWarningText(portal.preview?.scaleWarning);
    warning.hidden = !warning.textContent;
    applyPortalBusy();
  }

  async function loadPortalLastSync(key) {
    const { sync } = await request(portalSyncStatusPath(state.classId, state.assignmentId));
    if (portal.key !== key) return;
    portal.lastSync = null;
    if (!sync) return;
    // Backend không trả họ tên trong vết; tên chỉ lấy từ bản xem trước đang hiển thị.
    const summary = {};
    for (const r of sync.rows) summary[r.status] = (summary[r.status] || 0) + 1;
    portal.lastSync = { ...sync, summary };
    for (const r of sync.rows) if (!portal.sync.has(r.studentRef)) portal.sync.set(r.studentRef, r);
  }

  // keepResults: giữ kết quả từng dòng của lần ghi vừa xong khi tải lại bản xem trước (vân tay mới).
  async function loadPortalPreview({ keepResults = false, message = '' } = {}) {
    const key = portal.key;
    portalMessage('Đang xem trước điểm Portal…');
    if (!keepResults) portal.sync = new Map();
    portal.preview = null;
    try {
      const { preview } = await request(portalSyncPreviewPath(state.classId, state.assignmentId));
      if (portal.key !== key) return;
      portal.preview = preview;
      await loadPortalLastSync(key);
      if (portal.key !== key) return;
      portalMessage(message || (preview.mode === 'write' ? '' : 'Chế độ chỉ xem trước: chưa thể ghi điểm sang Portal.'));
    } catch (error) {
      if (portal.key !== key) return;
      portalMessage(portalSyncErrorView(error).message);
    }
    renderPortalPanel();
  }

  async function loadPortalPanel() {
    const section = portalEl('portal-sync');
    if (!section) return;
    const key = `${state.classId}/${state.assignmentId}`;
    portal.key = key;
    portal.link = null; portal.preview = null; portal.tests = []; portal.sync = new Map(); portal.lastSync = null;
    portalEl('portal-sync-link').hidden = true;
    portalEl('portal-sync-linked').hidden = true;
    portalEl('portal-preview').hidden = true;
    portalEl('portal-reload-btn').hidden = true;
    portalEl('portal-last-sync').textContent = '';
    section.hidden = false;
    portalMessage('Đang tải bài test Portal…');
    try {
      const { portalTests } = await request(portalTestsPath(state.classId));
      if (portal.key !== key) return;
      portal.tests = Array.isArray(portalTests) ? portalTests : [];
      const linked = linkedPortalTest(portal.tests, state.assignmentId);
      portal.link = linked ? { name: linked.name, maxScore: linked.maxScore } : null;
      portalMessage(linked ? '' : 'Chưa gắn bài test Portal cho đợt giao bài này.');
      renderPortalPanel();
      if (linked) await loadPortalPreview();
    } catch (error) {
      if (portal.key !== key) return;
      const view = portalSyncErrorView(error);
      portalMessage(view.message);
      renderPortalPanel();
      portalEl('portal-sync-link').hidden = true;
      portalEl('portal-sync-linked').hidden = true;
      // Chỉ chế độ tắt mới ẩn hết điều khiển; lỗi khác cho tải lại và chọn lại đợt sẽ tự tải lại.
      if (!view.disabled) { portal.key = ''; portalEl('portal-reload-btn').hidden = false; }
    }
  }

  function ensurePortalPanel() {
    if (!state.classId || !state.assignmentId) { portalEl('portal-sync').hidden = true; portal.key = ''; return; }
    if (portal.key !== `${state.classId}/${state.assignmentId}`) loadPortalPanel();
  }

  async function runPortalAction(action) {
    if (portal.busy) return;
    portal.busy = true;
    applyPortalBusy();
    try { await action(); } catch (error) { portalMessage(portalSyncErrorView(error).message); } finally { portal.busy = false; applyPortalBusy(); }
  }

  async function doPortalSync(refs) {
    const preview = portal.preview;
    const key = portal.key;
    portalMessage('Đang ghi điểm sang Portal và đọc lại để xác nhận…');
    let sync;
    try {
      ({ sync } = await request(portalSyncPath(state.classId, state.assignmentId), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncRequestBody(preview.fingerprint, refs))
      }));
    } catch (error) {
      if (!shouldReloadPreviewAfterSyncError(error)) throw error;
      // Không giữ vân tay cũ: tải lại bản xem trước và kết quả lần đồng bộ gần nhất.
      const suffix = error.code === 'PORTAL_PREVIEW_STALE' ? '' : ' Kết quả ghi chưa rõ, hãy kiểm tra lại bên dưới.';
      await loadPortalPreview({ message: `${portalSyncErrorView(error).message}${suffix}` });
      return;
    }
    if (portal.key !== key) return;
    portal.sync = new Map(sync.rows.map(r => [r.studentRef, r]));
    const text = syncSummaryText(sync.summary);
    // Lần ghi vừa xong làm vân tay cũ hết hiệu lực: tải lại bản xem trước, giữ kết quả từng dòng.
    await loadPortalPreview({ keepResults: true, message: sync.stopped ? `Đã dừng: ${portalSyncErrorView({ code: sync.stopped }).message} ${text}` : text });
  }

  function askPortalConfirm(refs) {
    const dialog = portalEl('portal-sync-confirm');
    portalEl('portal-sync-confirm-text').textContent = syncConfirmMessage(refs.length);
    portal.pending = refs;
    dialog.showModal();
  }

  portalEl('portal-link-btn')?.addEventListener('click', () => runPortalAction(async () => {
    const id = Number(portalEl('portal-test-select').value);
    if (!id) return;
    await request(portalLinkPath(state.classId, state.assignmentId), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClassTestId: id })
    });
    portal.key = '';
    await loadPortalPanel();
  }));
  portalEl('portal-unlink-btn')?.addEventListener('click', () => runPortalAction(async () => {
    if (!window.confirm('Gỡ gắn bài test Portal khỏi đợt giao bài này?')) return;
    await request(portalLinkPath(state.classId, state.assignmentId), { method: 'DELETE' });
    portal.key = '';
    await loadPortalPanel();
  }));
  portalEl('portal-preview-btn')?.addEventListener('click', () => runPortalAction(loadPortalPreview));
  portalEl('portal-reload-btn')?.addEventListener('click', () => runPortalAction(loadPortalPanel));
  portalEl('portal-select-all')?.addEventListener('change', event => {
    document.querySelectorAll('.portal-pick:not(:disabled)').forEach(i => { i.checked = event.target.checked; });
    updatePortalSyncButton();
  });
  portalEl('portal-sync-btn')?.addEventListener('click', () => { const refs = pickedRefs(); if (refs.length) askPortalConfirm(refs); });
  portalEl('portal-retry-btn')?.addEventListener('click', () => runPortalAction(async () => {
    const wanted = new Set(retryRefs([...portal.sync.values()]));
    await loadPortalPreview();   // vân tay mới; chỉ dòng còn "Điền được" mới thử lại được
    const refs = selectableRefs(portal.preview?.rows || []).filter(r => wanted.has(r));
    if (refs.length) askPortalConfirm(refs); else portalMessage('Không còn dòng nào có thể thử lại.');
  }));
  portalEl('portal-sync-cancel')?.addEventListener('click', () => portalEl('portal-sync-confirm').close());
  portalEl('portal-sync-confirm-btn')?.addEventListener('click', event => {
    event.preventDefault();
    portalEl('portal-sync-confirm').close();
    runPortalAction(() => doPortalSync(portal.pending || []));
  });

  function renderResults(payload) {
    toggleExportXlsxButton(exportXlsxBtn, payload?.assignment ? state.assignmentId : '');
    if (!payload || !payload.assignment) {
      if (results) results.hidden = true;
      if (resultsContent) resultsContent.replaceChildren();
      return;
    }
    currentResultsPayload = payload;
    ensurePortalPanel();
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
      const currentApi = typeof apiBase === 'function' ? apiBase() : '';
      const studentUrl = localStudentUrl(payload.assignment?.studentUrl, currentLocation, currentApi);
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
        incidentCell.textContent = incidentCellText(student);
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
        for (let optIdx = 0; optIdx < item.options.length; optIdx++) {
          const opt = item.options[optIdx];
          const li = document.createElement('li');
          const isSelected = item.studentAnswer === opt.id || (Array.isArray(item.studentAnswer) && item.studentAnswer.includes(opt.id));
          const isExpected = item.expectedAnswer === opt.id || item.expectedOptionId === opt.id || (Array.isArray(item.expectedOptionIds) && item.expectedOptionIds.includes(opt.id));
          const letter = formatOptionDisplayLetter(opt.id, optIdx);

          li.className = 'modal-options-item';
          if (isExpected) {
            li.classList.add('is-correct-key');
          } else if (isSelected) {
            li.classList.add('is-wrong-selection');
          }

          let badgeHtml = '';
          if (isExpected && isSelected) {
            badgeHtml = `<span class="opt-tag tag-correct">${renderSvgIcon('check', 'icon-inline')} <span>Đáp án đúng · Học viên chọn</span></span>`;
          } else if (isExpected) {
            badgeHtml = `<span class="opt-tag tag-expected">${renderSvgIcon('check', 'icon-inline')} <span>Đáp án chuẩn</span></span>`;
          } else if (isSelected) {
            badgeHtml = `<span class="opt-tag tag-wrong">${renderSvgIcon('close', 'icon-inline')} <span>Học viên chọn sai</span></span>`;
          }

          li.innerHTML = `<span class="opt-letter font-bold">${letter}.</span> <span class="opt-text">${escapeHtml(opt.label || opt.id)}</span> ${badgeHtml}`;
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
    currentServerNow = payload.serverNow || null;
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

  rawClassesList = [];
  currentTeacher = null;

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

  if (exportXlsxBtn) {
    exportXlsxBtn.addEventListener('click', () => {
      if (!state.classId || !state.assignmentId) return;
      downloadResultsXlsx({
        url: `${apiBase()}${assignmentResultsExportPath(state.classId, state.assignmentId)}`,
        headers: authHeader(),
        button: exportXlsxBtn,
        status,
        onUnauthorized: () => { if (sessionToken) endSession(); }
      });
    });
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
    resetPortal();
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
