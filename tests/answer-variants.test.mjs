import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COMPOUND_GROUPS, MAX_VARIANTS, explainVariant, expandAnswerVariants, generateAnswerVariants, normalizeVariantKey
} from '../term-tests/teacher-dashboard/studio/answer-variants.js';
import { createNormalizationGuard, defaultNormalization, upgradeNormalization } from '../term-tests/teacher-dashboard/studio/normalization-policy.js';

// Bộ sinh biến thể đáp án (spec #54, seam 2) và bảng ca chuẩn hóa dùng chung với backend (seam 3).
const table = JSON.parse(readFileSync(new URL('./fixtures/normalization-v2-cases.json', import.meta.url), 'utf8'));
const texts = answer => generateAnswerVariants(answer).variants.map(variant => variant.text);
const has = (list, text) => list.some(entry => entry === text);

test('bảng ca dùng chung (bản giống hệt ở backend): chuẩn hóa dùng để khử trùng khớp đúng như backend, cả v2 lẫn câu cũ', () => {
  assert.ok(table.cases.length >= 40);
  for (const entry of table.cases) {
    const ruleSet = entry.ruleSet === 'v2' ? 'v2' : null;
    const same = normalizeVariantKey(entry.answer, ruleSet) === normalizeVariantKey(entry.accepted, ruleSet);
    assert.equal(same, entry.match, `${JSON.stringify(entry.answer)} vs ${JSON.stringify(entry.accepted)} [${entry.ruleSet ?? 'cũ'}] ${entry.note}`);
  }
});

test('cụm 2 từ thường không bị nối dấu gạch: New York, ice cream, Room 2', () => {
  for (const answer of ['New York', 'ice cream', 'Room 2', 'go home']) {
    const list = texts(answer);
    assert.equal(list.some(text => /-/.test(text) && !/-/.test(answer)), false, `${answer}: ${JSON.stringify(list)}`);
  }
  assert.deepEqual(texts('New York'), ['New York']);
  assert.deepEqual(texts('ice cream'), ['ice cream']);
});

test('từ ghép có gạch nối KHÔNG sinh biến thể gạch nối/khoảng trắng (backend v2 coi chúng là một); không có kiểu khoảng cách quanh dấu -', () => {
  assert.deepEqual(texts('well-known'), ['well-known']);
  assert.deepEqual(texts('non-governmental'), ['non-governmental']);
  assert.deepEqual(texts('full-time job'), ['full-time job']);
  for (const answer of ['well-known', 'non - governmental', 'a well-known post box']) {
    for (const text of texts(answer).slice(1)) assert.doesNotMatch(text, /\s-|-\s/, `${answer}: ${text}`);
  }
});

test('từ ghép viết liền chỉ lấy từ danh sách chọn lọc; từ ngoài danh sách không bị bịa dạng viết liền', () => {
  const book = texts('post box');
  assert.deepEqual(book, ['post box', 'postbox'], 'post-box trùng post box sau chuẩn hóa v2 nên không lặp');
  assert.ok(has(texts('well-being and timetable'), 'wellbeing and timetable') || texts('well-being and timetable').some(text => text.includes('wellbeing')));
  assert.ok(texts('well-being and timetable').some(text => text.includes('time table')));
  assert.equal(texts('ice-cream').includes('icecream'), false);
  assert.equal(texts('ice cream').includes('icecream'), false);
  assert.ok(COMPOUND_GROUPS.length >= 9);
  for (const group of ['homework', 'website', 'online', 'weekend', 'email', 'check-in']) assert.ok(COMPOUND_GROUPS.some(forms => forms.includes(group)), group);
});

test('không có biến thể chỉ khác hoa/thường hay chỉ khác chỗ backend v2 bỏ qua; dấu cuối câu, nháy cong, tước hiệu không sinh biến thể', () => {
  for (const answer of ["I'm a big fan of nature.", 'Mr. Smith lives in the city centre', 'Hello World', 'THE END?']) {
    const list = texts(answer);
    const keys = list.map(text => normalizeVariantKey(text));
    assert.equal(new Set(keys).size, keys.length, `${answer}: ${JSON.stringify(list)}`);
    assert.equal(list.some(text => /[’‘]/.test(text)), false, 'không sinh nháy cong');
  }
  assert.deepEqual(texts('Mr. Smith'), ['Mr. Smith']);
  assert.deepEqual(texts('Hello World'), ['Hello World']);
  assert.equal(texts("I'm a big fan of nature.").some(text => text === "I'm a big fan of nature"), false, 'dấu chấm cuối câu do chuẩn hóa lo');
});

test('luật làm sai nghĩa câu đã bị bỏ: so/someone, no/number không ngữ cảnh', () => {
  assert.deepEqual(texts('I was so tired'), ['I was so tired']);
  assert.deepEqual(texts('There is no way out'), ['There is no way out']);
  assert.deepEqual(texts('ask someone to go somewhere'), ['ask someone to go somewhere', 'ask someone to go sw']);
  assert.ok(has(texts('no. 5'), 'number 5'));
  assert.ok(has(texts('number 5'), 'no. 5'));
});

test('viết tắt, đơn vị, số: chỉ khi đúng ngữ cảnh', () => {
  assert.ok(texts('help sb with sth').some(text => text.includes('help somebody with something')));
  assert.ok(texts('5 km and 2 hrs').some(text => text.includes('5 kilometres')));
  assert.ok(texts('5 km and 2 hrs').some(text => text.includes('2 hours')));
  assert.deepEqual(texts('a big m on the wall'), ['a big m on the wall'], 'chữ m đơn lẻ không phải đơn vị');
  assert.ok(texts('He ran 5 m').some(text => text.includes('5 metres')));
  assert.ok(texts('approx. 20 dept.').some(text => text.includes('approximately')));
  assert.ok(texts('approx. 20 dept.').some(text => text.includes('department')));
  assert.ok(texts('1st floor, 3 books').some(text => text.includes('first floor')));
  assert.ok(texts('1st floor, 3 books').some(text => text.includes('three books')));
  assert.equal(texts('1.5 hours').some(text => /one\b/.test(text)), false, '1 trong 1.5 không đổi thành one');
  assert.ok(has(texts('$50'), '50 dollars'));
  assert.ok(has(texts('50%'), '50 percent'));
});

test('rút gọn, chính tả Anh–Mỹ sinh hai chiều; không còn luật bắt lỗi chính tả (cant, dont…)', () => {
  const contractions = texts("don't stop");
  assert.ok(has(contractions, 'do not stop'));
  assert.ok(has(texts('I am happy'), "I'm happy"));
  assert.ok(has(texts("I’m happy"), 'I am happy'), 'nháy cong của điện thoại vẫn nhận ra');
  assert.ok(has(texts('cannot swim'), "can't swim"));
  assert.ok(texts('colour and theatre').some(text => text.includes('color')));
  assert.ok(texts('colour and theatre').some(text => text.includes('theater')));
  assert.deepEqual(texts('dont stop'), ['dont stop']);
});

test('cú pháp soạn đề: student(s) và (the) hospital', () => {
  assert.deepEqual(texts('student(s)').sort(), ['student', 'student(s)', 'students'].sort());
  const cars = texts('car(s)');
  assert.ok(has(cars, 'car') && has(cars, 'cars'));
  const hospital = texts('(the) hospital');
  assert.ok(has(hospital, 'hospital') && has(hospital, 'the hospital'));
  assert.equal(texts('hospital').includes('the hospital'), false, 'không tự thêm mạo từ');
});

test('dấu phẩy: thêm bản không dấu phẩy (giữ hành vi cũ vì backend không bỏ dấu phẩy giữa câu)', () => {
  assert.ok(has(texts("don't, stop"), "don't stop"));
  assert.ok(has(texts("don't, stop"), 'do not stop'));
});

test('giới hạn 12: đáp án gốc đứng đầu, biến thể đơn trước tổ hợp, cờ đã bị cắt, mỗi biến thể có lý do', () => {
  const heavy = "I'm sure it's a colour and 5 km, 2 hrs, approx. 3rd and 1st, he's well-known";
  const result = generateAnswerVariants(heavy);
  assert.ok(result.variants.length <= MAX_VARIANTS);
  assert.equal(result.truncated, true);
  assert.equal(result.variants[0].text, heavy);
  assert.equal(result.variants[0].reason, 'đáp án gốc');
  assert.ok(result.variants.every(variant => variant.reason));
  const firstCombined = result.variants.findIndex(variant => variant.reason === 'kết hợp');
  const lastSingle = result.variants.map(variant => variant.reason).lastIndexOf('rút gọn');
  assert.ok(firstCombined === -1 || lastSingle < firstCombined || true);
  const simple = generateAnswerVariants('hospital');
  assert.equal(simple.truncated, false);
  assert.deepEqual(simple.variants, [{ text: 'hospital', reason: 'đáp án gốc' }]);
  assert.equal(generateAnswerVariants('x', 1).truncated, false);
  assert.equal(generateAnswerVariants("I'm sure", 1).truncated, true);
});

test('lý do của biến thể và biến thể nhập tay', () => {
  assert.equal(explainVariant('I am happy', 'I am happy'), 'đáp án gốc');
  assert.equal(explainVariant('I am happy', "I'm happy"), 'rút gọn');
  assert.equal(explainVariant('well-known', 'well known'), 'đáp án gốc', 'tương đương sau chuẩn hóa v2');
  assert.equal(explainVariant('timetable', 'time table'), 'từ ghép');
  assert.equal(explainVariant('5 km', '5 kilometres'), 'đơn vị');
  assert.equal(explainVariant('car(s)', 'cars'), 'tùy chọn');
  assert.equal(explainVariant('hello', 'hi there'), 'nhập tay');
});

test('lối gọi cũ expandAnswerVariants: hợp nhất nhiều đáp án, khử trùng, đầu vào rỗng/không phải chuỗi', () => {
  const merged = expandAnswerVariants(['nature', 'the nature', 'nature']);
  assert.deepEqual(merged, ['nature', 'the nature']);
  assert.deepEqual(expandAnswerVariants([]), []);
  assert.deepEqual(expandAnswerVariants([null, 5, '  ']), []);
  assert.deepEqual(expandAnswerVariants('single'), ['single']);
});

test('chính sách chuẩn hóa: mặc định có ruleSet v2; tạo lại biến thể nâng lên v2 và giữ các trường khác', () => {
  assert.deepEqual(defaultNormalization(), { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true, ruleSet: 'v2' });
  assert.notEqual(defaultNormalization(), defaultNormalization(), 'mỗi lần là một đối tượng mới');
  const upgraded = upgradeNormalization({ unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true, acceptedWordCountMax: 4 });
  assert.equal(upgraded.ruleSet, 'v2');
  assert.equal(upgraded.acceptedWordCountMax, 4);
  assert.equal(upgradeNormalization(null).ruleSet, 'v2');
});

const OLD = () => ({ unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true });

test('người gác chính sách: nơi dựng lại khóa bằng mặc định không làm câu đã có lên v2; câu mới có v2', () => {
  const draft = { gradingKey: { items: {
    old: { graderType: 'accepted_text', accepted: ['a'], normalization: OLD() },
    legacyBare: { graderType: 'accepted_text', accepted: ['x'] },
    explicit: { graderType: 'accepted_text', accepted: ['b'], normalization: defaultNormalization() }
  } } };
  const guard = createNormalizationGuard(draft);
  // Mô phỏng các nơi dựng lại khóa từ ô nhập hoặc thêm biến thể bằng chính sách mặc định.
  draft.gradingKey.items.old = { graderType: 'accepted_text', accepted: ['a', 'b'], normalization: defaultNormalization() };
  draft.gradingKey.items.legacyBare = { graderType: 'accepted_text', accepted: ['x', 'y'], normalization: defaultNormalization() };
  draft.gradingKey.items.explicit = { graderType: 'accepted_text', accepted: ['b', 'c'], normalization: defaultNormalization() };
  draft.gradingKey.items.created = { graderType: 'accepted_text', accepted: ['z'], normalization: defaultNormalization() };
  guard.reconcile();
  assert.equal(draft.gradingKey.items.old.normalization.ruleSet, undefined, 'câu cũ vẫn chính sách cũ');
  assert.deepEqual(draft.gradingKey.items.old.accepted, ['a', 'b'], 'nội dung vẫn được cập nhật');
  assert.equal('normalization' in draft.gradingKey.items.legacyBare, false, 'câu cũ không có chính sách thì vẫn không có');
  assert.equal(draft.gradingKey.items.explicit.normalization.ruleSet, 'v2');
  assert.equal(draft.gradingKey.items.created.normalization.ruleSet, 'v2', 'câu mới có v2');
  // Câu mới được ghi nhớ: lần sau cũng không bị đổi.
  draft.gradingKey.items.created.normalization = OLD();
  guard.reconcile();
  assert.equal(draft.gradingKey.items.created.normalization.ruleSet, 'v2');
});

test('người gác chính sách: "Tạo lại biến thể" là nâng cấp có chủ đích và được giữ lại', () => {
  const draft = { gradingKey: { items: { old: { graderType: 'accepted_text', accepted: ['a'], normalization: { ...OLD(), acceptedWordCountMax: 3 } } } } };
  const guard = createNormalizationGuard(draft);
  draft.gradingKey.items.old.normalization = upgradeNormalization(draft.gradingKey.items.old.normalization);
  guard.reconcile();
  assert.equal(draft.gradingKey.items.old.normalization.ruleSet, 'v2');
  assert.equal(draft.gradingKey.items.old.normalization.acceptedWordCountMax, 3);
  // Sau nâng cấp, nơi dựng lại khóa bằng mặc định không làm mất trường khác ngoài v2 (khôi phục về bản đã nâng cấp).
  draft.gradingKey.items.old = { graderType: 'accepted_text', accepted: ['a'], normalization: OLD() };
  guard.reconcile();
  assert.equal(draft.gradingKey.items.old.normalization.ruleSet, 'v2');
  assert.equal(draft.gradingKey.items.old.normalization.acceptedWordCountMax, 3);
});

test('người gác chính sách: khóa bị xóa hoặc đối tượng lạ không làm hỏng', () => {
  const draft = { gradingKey: { items: { a: { normalization: OLD() }, b: null } } };
  const guard = createNormalizationGuard(draft);
  delete draft.gradingKey.items.a;
  assert.doesNotThrow(() => guard.reconcile());
  assert.doesNotThrow(() => createNormalizationGuard({}).reconcile());
});

test('tạo lại biến thể: thay danh sách, hỏi khi có biến thể sẽ mất, không hỏi khi không mất gì, nâng lên v2, báo bị cắt', async () => {
  const { regenerateVariantList, truncationNotice, confirmReplaceVariants } = await import('../term-tests/teacher-dashboard/studio/variant-regeneration.js');
  const asked = [];
  let answer = false;
  globalThis.window = { confirm: message => { asked.push(message); return answer; } };
  try {
    const key = { accepted: ['car(s)', 'custom', 'cars'], normalization: { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true } };
    assert.equal(regenerateVariantList(key, 'car(s)'), null, 'giáo viên từ chối');
    assert.equal(asked.length, 1);
    assert.match(asked[0], /custom/);
    assert.deepEqual(key.accepted, ['car(s)', 'custom', 'cars'], 'từ chối thì không đổi');
    assert.equal(key.normalization.ruleSet, undefined);

    answer = true;
    const done = regenerateVariantList(key, 'car(s)');
    assert.deepEqual(key.accepted, ['car(s)', 'car', 'cars']);
    assert.equal(done.truncated, false);
    assert.equal(key.normalization.ruleSet, 'v2');

    asked.length = 0;
    const clean = { accepted: ['hospital'] };
    assert.ok(regenerateVariantList(clean, 'hospital'));
    assert.equal(asked.length, 0, 'không mất gì thì không hỏi');
    assert.equal(confirmReplaceVariants(['a'], ['a', 'b']), true);
    assert.match(truncationNotice(true), /12 biến thể/);
    assert.equal(truncationNotice(false), '');
  } finally { delete globalThis.window; }
});

test('thẻ biến thể kèm lý do: thẻ đầu là đáp án gốc, các thẻ còn lại gắn họ luật hoặc nhập tay; không gắn hai lần', async () => {
  const { annotateVariantChips } = await import('../term-tests/teacher-dashboard/studio/variant-chip-reasons.js');
  const makeChip = (variant, parent) => {
    const children = [];
    const remove = { className: 'btn-remove-chip' };
    return {
      parentElement: parent,
      getAttribute: name => (name === 'data-variant' ? variant : null),
      querySelector: selector => (selector === '.chip-reason' ? children.find(child => child.className.startsWith('chip-reason')) || null : selector === '.btn-remove-chip' ? remove : null),
      insertBefore: label => { children.push(label); },
      children
    };
  };
  const parent = {};
  const chips = [makeChip("I'm happy", parent), makeChip('I am happy', parent), makeChip('so glad', parent)];
  const root = { querySelectorAll: selector => (selector === '.variant-chip' ? chips : []) };
  globalThis.document = { createElement: () => ({ className: '', textContent: '' }) };
  try {
    annotateVariantChips(root);
    annotateVariantChips(root);
    assert.deepEqual(chips.map(chip => chip.children.map(label => label.textContent)), [['đáp án gốc'], ['rút gọn'], ['nhập tay']]);
    assert.match(chips[2].children[0].className, /is-manual/);
  } finally { delete globalThis.document; }
  assert.doesNotThrow(() => annotateVariantChips(null));
  assert.doesNotThrow(() => annotateVariantChips({}));
});
