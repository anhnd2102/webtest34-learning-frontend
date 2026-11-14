import type { DraftBlock, DraftExercise, DraftState } from './draft-model.js';

export function expandSentenceVariants(sentences: unknown = []): string[] {
  const list: unknown[] = Array.isArray(sentences) ? sentences : [sentences];
  const result = new Set<string>();

  const contractionPairs: [RegExp, string][] = [
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
  const numberPairs: [RegExp, string][] = [
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
  const spellingPairs: [RegExp, string][] = [
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
  const pronounAbbrevPairs: [RegExp, string][] = [
    [/\bsb's\b/gi, "somebody's"], [/\bsomebody's\b/gi, "sb's"],
    [/\bsb\b/gi, 'somebody'], [/\bsomebody\b/gi, 'sb'],
    [/\bsth\b/gi, 'something'], [/\bsomething\b/gi, 'sth'],
    [/\bso\b/gi, 'someone'], [/\bsomeone\b/gi, 'so'],
    [/\bsw\b/gi, 'somewhere'], [/\bsomewhere\b/gi, 'sw']
  ];

  // IELTS Units of Measurement & Time
  const unitPairs: [RegExp, string][] = [
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
  const formAbbrevPairs: [RegExp, string][] = [
    [/\bapprox\.?\b/gi, 'approximately'], [/\bapproximately\b/gi, 'approx.'],
    [/\binfo\.?\b/gi, 'information'], [/\binformation\b/gi, 'info.'],
    [/\bdept\.?\b/gi, 'department'], [/\bdepartment\b/gi, 'dept.'],
    [/\btel\.?\b/gi, 'telephone'], [/\btelephone\b/gi, 'tel.'],
    [/\bno\.?\b/gi, 'number'], [/\bnumber\b/gi, 'no.'],
    [/\be\.g\.?\b/gi, 'for example'], [/\bfor example\b/gi, 'e.g.'],
    [/\bi\.e\.?\b/gi, 'that is'], [/\bthat is\b/gi, 'i.e.']
  ];

  // Compound Words (hyphen <-> space <-> solid)
  const compoundPairs: [RegExp, string][] = [
    [/\bwell-being\b/gi, 'wellbeing'], [/\bwellbeing\b/gi, 'well-being'],
    [/\btimetable\b/gi, 'time table'], [/\btime table\b/gi, 'timetable'],
    [/\bpostbox\b/gi, 'post box'], [/\bpost box\b/gi, 'postbox'],
    [/\bcheck-in\b/gi, 'check in'], [/\bcheck in\b/gi, 'check-in']
  ];

  // Currency & Percentage Symbols
  const symbolPairs: [RegExp, string][] = [
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

    // 1B. Hyphenation vs space variants: "non-governmental", "non - governmental", "non -governmental", "non- governmental"
    const hyphenPattern = /(?<=[\p{L}\p{N}])\s*-\s*(?=[\p{L}\p{N}])/gu;
    const words = clean.split(' ');
    if (hyphenPattern.test(clean)) {
      result.add(clean.replace(hyphenPattern, '-'));
      result.add(clean.replace(hyphenPattern, ' - '));
      result.add(clean.replace(hyphenPattern, ' -'));
      result.add(clean.replace(hyphenPattern, '- '));
      result.add(clean.replace(hyphenPattern, ' '));
    } else if (clean.includes(' ') && words.length === 2 && !/\b(Mrs|Miss|Prof|Mr|Ms|Dr)\.?$/i.test(words[0])) {
      result.add(clean.replace(/ /g, '-'));
      result.add(clean.replace(/ /g, ' - '));
      result.add(clean.replace(/ /g, ' -'));
      result.add(clean.replace(/ /g, '- '));
    }

    // 1C. Honorific titles & dot/spacing variations: "Mr. A", "Mr.A", "Mr .A", "Mr . A", "Mr A"
    const titlePattern = /(?<!\d\s*)\b(Mrs|Miss|Prof|Mr|Ms|Dr)\s*\.?\s*([\p{L}\p{N}]+)\b/giu;
    if (titlePattern.test(clean)) {
      titlePattern.lastIndex = 0;
      result.add(clean.replace(titlePattern, '$1. $2'));
      titlePattern.lastIndex = 0;
      result.add(clean.replace(titlePattern, '$1.$2'));
      titlePattern.lastIndex = 0;
      result.add(clean.replace(titlePattern, '$1 .$2'));
      titlePattern.lastIndex = 0;
      result.add(clean.replace(titlePattern, '$1 . $2'));
      titlePattern.lastIndex = 0;
      result.add(clean.replace(titlePattern, '$1 $2'));
    }
  }

  // Pass 2: Word substitutions (contractions, numbers, spelling, pronouns, units, abbreviations, compounds, symbols)
  const allSubPairs: [RegExp, string][] = [
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

export function validateListeningOrderUniqueness(events: { rank?: unknown, [key: string]: any }[]) {
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

export function computeCorrectionScore(answer: any, gradingKey: Record<string, any> = {}) {
  const maxScore = Number(gradingKey.maxScore) || 1;
  if (!answer || typeof answer !== 'object') {
    return { score: 0, maxScore, isErrorCorrect: false, isCorrectionCorrect: false };
  }

  const rawError = String(answer.error || '').trim().toLowerCase();
  const rawCorrection = String(answer.correction || '').trim().toLowerCase();

  const expectedErrors = (gradingKey.expectedErrors || []).map((e: unknown) => String(e).trim().toLowerCase());
  const expectedCorrections = (gradingKey.expectedCorrections || []).map((c: unknown) => String(c).trim().toLowerCase());

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

export function tokenizeSentence(input: unknown): string[] {
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

export function scrambleTokens<T>(tokens: T[]): T[] {
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

export function scoreTransformationAnswer(studentAnswer: unknown, gradingKey?: Record<string, any> | null) {
  const maxScore = Number(gradingKey?.maxScore) || 1;
  if (!studentAnswer || typeof studentAnswer !== 'string') {
    return { score: 0, isCorrect: false };
  }
  const acceptedList = Array.isArray(gradingKey?.accepted) ? gradingKey.accepted : [];
  if (acceptedList.length === 0) {
    return { score: 0, isCorrect: false };
  }

  const norm = (str: string) => {
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

export function formatIpaTranscription(rawIpa: unknown): string {
  if (!rawIpa || typeof rawIpa !== 'string') return '';
  const trimmed = rawIpa.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && trimmed.endsWith('/') && trimmed.length > 2) {
    return trimmed;
  }
  const clean = trimmed.replace(/^\/+|\/+$/g, '').trim();
  return clean ? `/${clean}/` : '';
}

export function formatOptionDisplayLetter(optId: unknown, index = 0): string {
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

export function isShortQaEligibleFor2Col(items: { prompt?: string }[]): boolean {
  if (!Array.isArray(items) || items.length <= 1) return false;
  return items.every(item => {
    const prompt = (item.prompt || '').trim();
    const clean = prompt.replace(/<[^>]+>/g, '').trim();
    const hasComplexHtml = /<(?:table|tbody|tr|td|th|img|figure|video|audio|blockquote|hr)\b/i.test(prompt);
    return clean.length > 0 && clean.length <= 100 && !hasComplexHtml;
  });
}

export function batchGenerateExerciseVocabVariants(block: DraftBlock | null | undefined, targetExercise: DraftExercise | null | undefined, draftState: DraftState | null | undefined): number {
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

    let currentKey = draftState.gradingKey.items[item.itemVersionId!];
    if (!currentKey) {
      currentKey = {
        graderType: 'accepted_text_exact_option',
        accepted: [],
        expectedOptionId: (item.options && item.options[0]) ? item.options[0].id : ''
      };
      draftState.gradingKey.items[item.itemVersionId!] = currentKey;
    }

    const currentAccepted = Array.isArray(currentKey.accepted) ? currentKey.accepted.filter(Boolean) : [];
    const generatedVariants = expandSentenceVariants([rawWord]);

    const merged = Array.from(new Set([...currentAccepted, ...generatedVariants])).slice(0, 40);
    currentKey.accepted = merged;
    updatedCount++;
  });

  return updatedCount;
}
