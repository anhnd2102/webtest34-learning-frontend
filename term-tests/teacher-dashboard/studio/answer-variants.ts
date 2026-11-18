// NGUỒN: file .ts này; answer-variants.js do `npm run build` sinh ra.
//
// Bộ sinh biến thể đáp án (spec #54). Backend chuẩn hóa lúc chấm các khác biệt thuần kiểu gõ (hoa/thường, khoảng trắng, dấu - giữa hai chữ,
// dấu cuối câu, nháy cong, tước hiệu) bằng `normalization.ruleSet: 'v2'`; nơi này chỉ sinh biến thể KHÁC NGHĨA CHỮ: tùy chọn (s)/(the),
// rút gọn, số, chính tả Anh–Mỹ, đơn vị, viết tắt, ký hiệu, từ ghép chọn lọc, dấu phẩy. Hàm thuần, không đụng DOM.
//
// Biến thể là đáp án được CHẤM ĐÚNG nên mọi luật phải giữ nguyên nghĩa câu (không có luật đổi chữ thường thành chữ khác nghĩa).

export const MAX_VARIANTS = 12;

export interface Variant { text: string, reason: string }
export interface VariantResult { variants: Variant[], truncated: boolean }

export const REASON = {
  original: 'đáp án gốc',
  optional: 'tùy chọn',
  contraction: 'rút gọn',
  number: 'số',
  spelling: 'chính tả Anh–Mỹ',
  unit: 'đơn vị',
  abbreviation: 'viết tắt',
  symbol: 'ký hiệu',
  compound: 'từ ghép',
  comma: 'dấu phẩy',
  combined: 'kết hợp'
} as const;

// ---------------------------------------------------------------- chuẩn hóa dùng để KHỬ TRÙNG
// Phải trùng với `normalizeText` của backend (cả ruleSet v2 lẫn câu cũ); bảng ca dùng chung hai repo kiểm tra việc này.
const SPELLING_CANONICAL = new Map([
  ['color', 'colour'], ['colors', 'colours'], ['center', 'centre'], ['centers', 'centres'],
  ['theater', 'theatre'], ['theaters', 'theatres'], ['liter', 'litre'], ['liters', 'litres']
]);
const UNICODE_DASHES = /[‐-―−﹘﹣－]/gu;
const CURLY_APOSTROPHES = /[‘’‛ʼ`´]/gu;
const TITLE_ABBREVIATIONS = /\b(mrs|mr|ms|dr|prof|miss)(?!\p{L})\s*\.?\s*(?=\p{L})/giu;

export function normalizeVariantKey(value: unknown, ruleSet: 'v2' | null = 'v2'): string {
  let text = String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en');
  if (ruleSet === 'v2') {
    text = text
      .replace(UNICODE_DASHES, '-')
      .replace(CURLY_APOSTROPHES, "'")
      .replace(/(?<=\p{L})\s*-\s*(?=\p{L})/gu, ' ')
      .replace(TITLE_ABBREVIATIONS, '$1 ')
      .replace(/[.?!]+\s*$/u, '')
      .replace(/\s+/gu, ' ')
      .trim();
  }
  return SPELLING_CANONICAL.get(text) || text;
}

// ---------------------------------------------------------------- họ luật thay thế (hai chiều)
type Rule = [RegExp, string];

const CONTRACTIONS: Rule[] = [
  [/\bI'm\b/gi, 'I am'], [/\bI am\b/gi, "I'm"],
  [/\byou're\b/gi, 'you are'], [/\byou are\b/gi, "you're"],
  [/\bwe're\b/gi, 'we are'], [/\bwe are\b/gi, "we're"],
  [/\bthey're\b/gi, 'they are'], [/\bthey are\b/gi, "they're"],
  [/\bhe's\b/gi, 'he is'], [/\bhe is\b/gi, "he's"],
  [/\bshe's\b/gi, 'she is'], [/\bshe is\b/gi, "she's"],
  [/\bit's\b/gi, 'it is'], [/\bit is\b/gi, "it's"],
  [/\bdon't\b/gi, 'do not'], [/\bdo not\b/gi, "don't"],
  [/\bdoesn't\b/gi, 'does not'], [/\bdoes not\b/gi, "doesn't"],
  [/\bdidn't\b/gi, 'did not'], [/\bdid not\b/gi, "didn't"],
  [/\bcan't\b/gi, 'cannot'], [/\bcannot\b/gi, "can't"],
  [/\bwon't\b/gi, 'will not'], [/\bwill not\b/gi, "won't"],
  [/\bisn't\b/gi, 'is not'], [/\bis not\b/gi, "isn't"],
  [/\baren't\b/gi, 'are not'], [/\bare not\b/gi, "aren't"],
  [/\bwasn't\b/gi, 'was not'], [/\bwas not\b/gi, "wasn't"],
  [/\bweren't\b/gi, 'were not'], [/\bwere not\b/gi, "weren't"],
  [/\bhasn't\b/gi, 'has not'], [/\bhas not\b/gi, "hasn't"],
  [/\bhaven't\b/gi, 'have not'], [/\bhave not\b/gi, "haven't"]
];

const ORDINALS: [string, string][] = [['1st', 'first'], ['2nd', 'second'], ['3rd', 'third'], ['4th', 'fourth'], ['5th', 'fifth'], ['6th', 'sixth'], ['7th', 'seventh'], ['8th', 'eighth'], ['9th', 'ninth'], ['10th', 'tenth']];
const NUMBERS: [string, string][] = [['1', 'one'], ['2', 'two'], ['3', 'three'], ['4', 'four'], ['5', 'five'], ['6', 'six'], ['7', 'seven'], ['8', 'eight'], ['9', 'nine'], ['10', 'ten'], ['11', 'eleven'], ['12', 'twelve']];
const NUMBER_RULES: Rule[] = [...ORDINALS, ...NUMBERS].flatMap(([digits, word]): Rule[] => [
  // Số đứng riêng: không đụng 1 trong 1.5, 1,000 hay 2-3 (khoảng).
  [new RegExp(`(?<![\\d.,-])${digits}(?![\\d.,-])`, 'g'), word],
  [new RegExp(`\\b${word}\\b`, 'gi'), digits]
]);

const SPELLING_PAIRS: [string, string][] = [
  ['colour', 'color'], ['favourite', 'favorite'], ['flavour', 'flavor'], ['honour', 'honor'], ['neighbour', 'neighbor'], ['humour', 'humor'],
  ['theatre', 'theater'], ['centre', 'center'], ['metre', 'meter'], ['litre', 'liter'], ['organise', 'organize'], ['organised', 'organized'],
  ['organisation', 'organization'], ['realise', 'realize'], ['realised', 'realized'], ['recognise', 'recognize'], ['analyse', 'analyze'],
  ['practise', 'practice'], ['licence', 'license'], ['travelling', 'traveling'], ['travelled', 'traveled'], ['cancelled', 'canceled'],
  ['modelling', 'modeling'], ['programme', 'program'], ['catalogue', 'catalog'], ['dialogue', 'dialog']
];
const SPELLING_RULES: Rule[] = SPELLING_PAIRS.flatMap(([uk, us]): Rule[] => [[new RegExp(`\\b${uk}\\b`, 'gi'), us], [new RegExp(`\\b${us}\\b`, 'gi'), uk]]);

// Đơn vị chỉ khi đứng sau một số (chữ m đơn lẻ không bị hiểu nhầm).
const UNIT_PAIRS: [string, string, string][] = [
  ['kms?', 'kilometres', 'km'], ['kilometres?', 'km', 'km'], ['kilometers?', 'km', 'km'],
  ['m', 'metres', 'm'], ['metres?', 'm', 'm'], ['meters?', 'm', 'm'],
  ['cms?', 'centimetres', 'cm'], ['centimetres?', 'cm', 'cm'], ['centimeters?', 'cm', 'cm'],
  ['kgs?', 'kilograms', 'kg'], ['kilograms?', 'kg', 'kg'],
  ['hrs?', 'hours', 'hr'], ['hours?', 'hr', 'hr'],
  ['mins?', 'minutes', 'min'], ['minutes?', 'min', 'min'],
  ['secs?', 'seconds', 'sec'], ['seconds?', 'sec', 'sec'],
  ['wks?', 'weeks', 'wk'], ['weeks?', 'wk', 'wk'],
  ['yrs?', 'years', 'yr'], ['years?', 'yr', 'yr']
];
const UNIT_RULES: Rule[] = UNIT_PAIRS.map(([pattern, replacement]): Rule => [new RegExp(`\\b(\\d+)\\s*${pattern}\\b`, 'gi'), `$1 ${replacement}`]);

// Viết tắt chỉ khi đứng riêng; `no.` chỉ khi đứng trước một số.
const ABBREVIATION_RULES: Rule[] = [
  [/\bsb's\b/gi, "somebody's"], [/\bsomebody's\b/gi, "sb's"],
  [/\bsb\b/gi, 'somebody'], [/\bsomebody\b/gi, 'sb'],
  [/\bsth\b/gi, 'something'], [/\bsomething\b/gi, 'sth'],
  [/\bsw\b/gi, 'somewhere'], [/\bsomewhere\b/gi, 'sw'],
  [/\bapprox\.?(?=\s|$)/gi, 'approximately'], [/\bapproximately\b/gi, 'approx.'],
  [/\binfo\.?(?=\s|$)/gi, 'information'], [/\binformation\b/gi, 'info.'],
  [/\bdept\.?(?=\s|$)/gi, 'department'], [/\bdepartment\b/gi, 'dept.'],
  [/\btel\.?(?=\s|$)/gi, 'telephone'], [/\btelephone\b/gi, 'tel.'],
  [/\bno\.?(?=\s*\d)/gi, 'number'], [/\bnumber(?=\s*\d)/gi, 'no.'],
  [/\be\.g\.?/gi, 'for example'], [/\bfor example\b/gi, 'e.g.'],
  [/\bi\.e\.?/gi, 'that is'], [/\bthat is\b/gi, 'i.e.']
];

const SYMBOL_RULES: Rule[] = [
  [/\$(\d+)\b/g, '$1 dollars'], [/(\d+)\$/g, '$1 dollars'], [/£(\d+)\b/g, '$1 pounds'],
  [/(\d+)\s*%/g, '$1 percent'], [/(\d+)\s*percent\b/gi, '$1%'], [/(\d+)\s*per cent\b/gi, '$1%']
];

// Từ ghép viết liền: CHỈ từ danh sách chọn lọc này (không bịa dạng viết liền cho từ khác). Mỗi nhóm là các cách viết tương đương.
export const COMPOUND_GROUPS: string[][] = [
  ['well-being', 'wellbeing', 'well being'],
  ['timetable', 'time table', 'time-table'],
  ['postbox', 'post box', 'post-box'],
  ['check-in', 'check in', 'checkin'],
  ['email', 'e-mail', 'e mail'],
  ['weekend', 'week-end', 'week end'],
  ['online', 'on-line', 'on line'],
  ['website', 'web site', 'web-site'],
  ['homework', 'home work', 'home-work']
];
const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const COMPOUND_RULES: Rule[] = COMPOUND_GROUPS.flatMap(group => group.flatMap(form => group.filter(other => other !== form).map((other): Rule => [new RegExp(`(?<![\\p{L}-])${escapeRegex(form)}(?![\\p{L}-])`, 'giu'), other])));

// Dấu - giữa hai chữ cái → khoảng trắng (backend v2 coi hai dạng là một; dạng khoảng trắng vẫn cần cho câu cũ chưa lên v2 khi giáo viên đã bỏ nó).
const HYPHEN_BETWEEN_LETTERS = /(?<=\p{L})-(?=\p{L})/gu;

const FAMILIES: { reason: string, rules: Rule[] }[] = [
  { reason: REASON.contraction, rules: CONTRACTIONS },
  { reason: REASON.number, rules: NUMBER_RULES },
  { reason: REASON.spelling, rules: SPELLING_RULES },
  { reason: REASON.unit, rules: UNIT_RULES },
  { reason: REASON.abbreviation, rules: ABBREVIATION_RULES },
  { reason: REASON.symbol, rules: SYMBOL_RULES },
  { reason: REASON.compound, rules: COMPOUND_RULES }
];

function applyRule(text: string, [pattern, replacement]: Rule): string | null {
  pattern.lastIndex = 0;
  if (!pattern.test(text)) return null;
  pattern.lastIndex = 0;
  const next = text.replace(pattern, replacement).replace(/\s+/gu, ' ').trim();
  return next && next !== text ? next : null;
}

function singleSubstitutions(text: string): Variant[] {
  const out: Variant[] = [];
  for (const family of FAMILIES) for (const rule of family.rules) {
    const next = applyRule(text, rule);
    if (next) out.push({ text: next, reason: family.reason });
  }
  if (HYPHEN_BETWEEN_LETTERS.test(text)) out.push({ text: text.replace(HYPHEN_BETWEEN_LETTERS, ' '), reason: REASON.compound });
  HYPHEN_BETWEEN_LETTERS.lastIndex = 0;
  return out;
}

// Cú pháp soạn đề: "student(s)" → student, students; "(the) hospital" → hospital, the hospital.
function optionalSyntax(text: string): Variant[] {
  const out: Variant[] = [];
  const tidy = (value: string) => value.replace(/\s+/gu, ' ').trim();
  if (/\(\s*s\s*\)/i.test(text)) {
    out.push({ text: tidy(text.replace(/\(\s*s\s*\)/gi, '')), reason: REASON.optional }, { text: tidy(text.replace(/\(\s*s\s*\)/gi, 's')), reason: REASON.optional });
  }
  if (/\([^)]+\)/.test(text)) {
    out.push({ text: tidy(text.replace(/\(([^)]+)\)/g, '')), reason: REASON.optional }, { text: tidy(text.replace(/\(([^)]+)\)/g, '$1')), reason: REASON.optional });
  }
  return out.filter(variant => variant.text);
}

// Sinh biến thể của MỘT đáp án: đáp án gốc, rồi biến thể thay một họ luật, rồi tổ hợp nhiều họ, rồi dấu phẩy; khử trùng theo dạng
// chuẩn hóa v2 và cắt ở MAX_VARIANTS theo đúng thứ tự ưu tiên đó.
export function generateAnswerVariants(answer: unknown, limit = MAX_VARIANTS): VariantResult {
  // Nháy cong gõ từ điện thoại được đưa về nháy thẳng để các luật (I'm, don't…) nhận ra; backend v2 coi hai dạng là một.
  const original = typeof answer === 'string' ? answer.normalize('NFKC').replace(CURLY_APOSTROPHES, "'").trim().replace(/\s+/gu, ' ') : '';
  if (!original) return { variants: [], truncated: false };

  const seen = new Set<string>();
  const ordered: Variant[] = [];
  const add = (variant: Variant) => {
    const key = normalizeVariantKey(variant.text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    ordered.push(variant);
  };

  add({ text: original, reason: REASON.original });
  const base: Variant[] = [{ text: original, reason: REASON.original }, ...optionalSyntax(original)];
  for (const variant of base.slice(1)) add(variant);

  const singles: Variant[] = [];
  for (const variant of base) {
    for (const next of singleSubstitutions(variant.text)) { singles.push(next); add(next); }
  }
  // Tổ hợp: áp thêm một họ luật lên biến thể thay một họ (ví dụ "I'm 5 km" → "I am 5 km", rồi "I am five km").
  for (const variant of singles) {
    for (const next of singleSubstitutions(variant.text)) add({ text: next.text, reason: REASON.combined });
  }
  // Dấu phẩy: thêm bản không dấu phẩy cho mỗi biến thể có dấu phẩy.
  for (const variant of [...ordered]) {
    if (variant.text.includes(',')) add({ text: variant.text.replace(/,/gu, '').replace(/\s+/gu, ' ').trim(), reason: REASON.comma });
  }

  const truncated = ordered.length > limit;
  return { variants: ordered.slice(0, limit), truncated };
}

// Lối gọi cũ (mảng chuỗi): hợp nhất biến thể của từng đáp án, vẫn khử trùng theo dạng chuẩn hóa.
export function expandAnswerVariants(sentences: unknown = []): string[] {
  const list: unknown[] = Array.isArray(sentences) ? sentences : [sentences];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const sentence of list) {
    for (const variant of generateAnswerVariants(sentence).variants) {
      const key = normalizeVariantKey(variant.text);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(variant.text);
    }
  }
  return out;
}

// Lý do của một biến thể đã có trong danh sách (cho thẻ biến thể); biến thể không do bộ sinh tạo ra là "nhập tay".
export function explainVariant(answer: unknown, variant: string): string {
  const key = normalizeVariantKey(variant);
  if (key === normalizeVariantKey(answer)) return REASON.original;
  const found = generateAnswerVariants(answer, 1000).variants.find(candidate => normalizeVariantKey(candidate.text) === key);
  return found ? found.reason : 'nhập tay';
}
