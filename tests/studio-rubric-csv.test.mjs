import test from 'node:test';
import assert from 'node:assert/strict';
import { readImport, typeTemplateCsv } from '../term-tests/teacher-dashboard/studio/import-engine.js';
import { parseRequirements, resolveRubricLevel, resolveRubricVariant } from '../term-tests/teacher-dashboard/studio/import-rubric.js';
import { resolveExerciseRubrics, resolveRubricCards } from '../term-tests/teacher-dashboard/studio/rubric-resolve.js';
import { cardsToDraftItems } from '../term-tests/teacher-dashboard/studio/card-to-item.js';
import { buildRubricPayload, createWizardState, emptyQuestion } from '../term-tests/teacher-dashboard/studio/rubric-wizard-model.js';

// Tự luận chấm AI kiểu mới trong CSV (spec #91, GĐ 5): cùng quy tắc và cùng payload với trình hướng dẫn; điểm do backend tính.
const HEAD = 'Đề bài,Ngữ cảnh,Dạng chấm,Khối,Điểm,Yêu cầu bắt buộc,Đáp án mẫu,Đáp án đúng,Gợi ý,Số từ tối thiểu,Điểm Grammar/Vocab,Hướng dẫn chấm thêm';
const row = fields => {
  const cells = { prompt: '', context: '', variant: '', level: '', points: '', requirements: '', sample: '', correct: '', hint: '', wordMin: '', language: '', guidance: '', ...fields };
  const quote = value => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return [cells.prompt, cells.context, cells.variant, cells.level, cells.points, cells.requirements, cells.sample, cells.correct, cells.hint, cells.wordMin, cells.language, cells.guidance].map(quote).join(',');
};
const read = (rows, options = {}) => readImport([HEAD, ...rows].join('\n'), { scope: 'type', typeCode: 'rubric_async', ...options });
const translation = extra => row({ prompt: 'Dịch: Tôi đặc biệt thích chạy bộ.', variant: 'Dịch Việt–Anh', level: '34', points: '4', requirements: 'Particularly + enjoy + V-ing (1.5) [particularly; especially] | Cấu trúc song song (1)', sample: 'I particularly enjoy running.', ...extra });

test('Dạng chấm và Khối: nhận tên tiếng Việt, mã, không dấu; Khối ghi nhiều kiểu', () => {
  assert.equal(resolveRubricVariant('Dịch Việt–Anh'), 'translation');
  assert.equal(resolveRubricVariant('dich viet anh'), 'translation');
  assert.equal(resolveRubricVariant('Điền sắp xếp và chia động từ'), 'sentence_order');
  assert.equal(resolveRubricVariant('Đọc hiểu'), 'reading_comprehension');
  assert.equal(resolveRubricVariant('Writing đọc hiểu'), 'sentence_role');
  assert.equal(resolveRubricVariant('Speaking dạng văn bản'), 'speaking_text');
  assert.equal(resolveRubricVariant('Viết đoạn/bài (Writing)'), 'writing');
  assert.equal(resolveRubricVariant('writing'), 'writing');
  assert.equal(resolveRubricVariant('không có'), undefined);
  assert.equal(resolveRubricLevel('34'), '34');
  assert.equal(resolveRubricLevel('Khối 03'), '03');
  assert.equal(resolveRubricLevel('3'), '03');
  assert.equal(resolveRubricLevel('45'), '45');
  assert.equal(resolveRubricLevel('Khối 7'), undefined);
  assert.equal(resolveRubricLevel(''), undefined);
});

test('yêu cầu bắt buộc: "tên (điểm) [cách viết chấp nhận]" cách nhau bằng |; ngoặc không phải điểm thì thuộc tên', () => {
  assert.deepEqual(parseRequirements('Particularly + enjoy + V-ing (1.5) [particularly; especially] | Cấu trúc song song (1đ) | It is + adj (to V)'), [
    { label: 'Particularly + enjoy + V-ing', maxScore: '1.5', acceptedForms: 'particularly; especially' },
    { label: 'Cấu trúc song song', maxScore: '1', acceptedForms: '' },
    { label: 'It is + adj (to V)', maxScore: '', acceptedForms: '' }
  ]);
  assert.deepEqual(parseRequirements(''), []);
  assert.deepEqual(parseRequirements('  |  '), []);
});

test('dòng tự luận kiểu mới: thẻ chờ dựng quy tắc chấm với payload GIỐNG HỆT trình hướng dẫn', () => {
  const result = read([translation({ language: '', guidance: 'Chấp nhận dấu gạch nối' })]);
  assert.equal(result.summary.error, 0, JSON.stringify(result.rows.map(item => item.messages)));
  const [card] = result.cards;
  assert.equal(card.graderType, 'rubric_async');
  assert.equal(card.rubricVariant, 'translation');
  assert.equal(card.maxScore, 4);

  const state = createWizardState({ variant: 'translation', courseId: 2 });
  state.level = '34'; state.points = '4';
  const question = { ...emptyQuestion('translation'), prompt: 'x', requirements: [
    { label: 'Particularly + enjoy + V-ing', maxScore: '1.5', acceptedForms: 'particularly; especially' },
    { label: 'Cấu trúc song song', maxScore: '1', acceptedForms: '' }
  ], modelAnswers: 'I particularly enjoy running.', promptGuidance: 'Chấp nhận dấu gạch nối' };
  assert.deepEqual(card.pendingRubric, buildRubricPayload(state, question));
  assert.equal(card.rubric, undefined, 'điểm và bảng trừ lỗi do backend dựng, frontend không tự tính');
});

test('Khối để trống dùng Khối mặc định của đề; điểm để trống dùng điểm mặc định của dạng chấm (Writing 15, còn lại 4)', () => {
  const noLevel = read([translation({ level: '', points: '' })], { defaultLevel: '03' });
  assert.equal(noLevel.cards[0].pendingRubric.level, '03');
  assert.equal(noLevel.cards[0].pendingRubric.maxScore, 4);
  assert.equal(read([translation({ level: '' })]).cards[0].pendingRubric.level, '34', 'không rõ thì Khối 34');
  const writing = read([row({ prompt: 'Essay', variant: 'writing', level: '45', requirements: 'Topic sentence | Ý 1' })]);
  assert.equal(writing.cards[0].pendingRubric.maxScore, 15);
});

test('lỗi theo cột: dạng chấm lạ, Khối lạ, Writing không có Khối 03, thiếu yêu cầu, điểm yêu cầu sai, tổng điểm vượt', () => {
  const cases = [
    [translation({ variant: 'Dạng lạ' }), 'Dạng chấm', /không nhận ra/],
    [translation({ level: '99' }), 'Khối', /không nhận ra/],
    [row({ prompt: 'E', variant: 'writing', level: '03', requirements: 'A' }), 'Khối', /Writing|chưa có mức chấm/i],
    [translation({ requirements: '' }), 'Yêu cầu bắt buộc', /ít nhất một yêu cầu/],
    [translation({ requirements: 'Một (0) | Hai (1)' }), 'Yêu cầu bắt buộc', /lớn hơn 0/],
    [translation({ points: '2', requirements: 'Một (1.5) | Hai (1)' }), 'Yêu cầu bắt buộc', /vượt/],
    [row({ prompt: 'R', variant: 'Đọc hiểu', level: '34', points: '4', requirements: 'Một (1) | Hai (1)' }), 'Yêu cầu bắt buộc', /phải bằng điểm của câu/],
    [row({ prompt: 'R', variant: 'Đọc hiểu', level: '34', points: '4', requirements: 'Một (3) | Hai (3)' }), 'Yêu cầu bắt buộc', /vượt điểm của câu/],
    [translation({ prompt: '' }), 'Đề bài', /Chưa điền|bắt buộc/]
  ];
  for (const [line, column, pattern] of cases) {
    const result = read([line]);
    assert.equal(result.rows[0].status, 'error', pattern.toString());
    assert.ok(result.rows[0].messages.some(message => message.column === column && pattern.test(message.text)), `${column}: ${JSON.stringify(result.rows[0].messages)}`);
    assert.equal(result.cards.length, 0);
  }
});

test('Writing: yêu cầu bắt buộc là dàn ý, Gợi ý là từ vựng, số từ tối thiểu; dàn ý/từ vựng nằm trong câu công khai, đáp án mẫu thì không', () => {
  const csv = row({ prompt: 'Explain difficulties of city life.', variant: 'Viết đoạn/bài (Writing)', level: '45', points: '15', requirements: 'Topic sentence | Ý 1: chi phí cao | Ý 2: xã hội', hint: 'migrate to | cost of living', wordMin: '120', sample: 'City life is hard. First, costs are high.' });
  const result = read([csv]);
  assert.equal(result.summary.error, 0, JSON.stringify(result.rows[0].messages));
  const card = result.cards[0];
  assert.deepEqual(card.studentOutline, ['Topic sentence', 'Ý 1: chi phí cao', 'Ý 2: xã hội']);
  assert.deepEqual(card.vocabularyHints, ['migrate to', 'cost of living']);
  assert.deepEqual(card.pendingRubric.outline, ['Topic sentence', 'Ý 1: chi phí cao', 'Ý 2: xã hội']);
  assert.deepEqual(card.pendingRubric.wordCount, { minimum: 120, scoreCapBelowMinimum: true });
  assert.deepEqual(card.pendingRubric.modelAnswers, ['City life is hard. First, costs are high.']);
});

test('Writing đọc hiểu: Đáp án đúng là vai trò đúng của câu; thiếu thì báo lỗi', () => {
  const ok = read([row({ prompt: 'Vai trò đúng của Câu 1. Một mặt… là:', variant: 'Writing đọc hiểu', level: '34', points: '2', correct: 'Nêu luận điểm phản đối', context: 'Passage' })]);
  assert.equal(ok.summary.error, 0, JSON.stringify(ok.rows[0].messages));
  assert.deepEqual(ok.cards[0].pendingRubric.modelAnswers, ['Nêu luận điểm phản đối']);
  assert.match(ok.cards[0].pendingRubric.promptGuidance, /Vai trò đúng của câu: Nêu luận điểm phản đối/);
  const missing = read([row({ prompt: 'Vai trò đúng của Câu 1.', variant: 'Writing đọc hiểu', level: '34' })]);
  assert.equal(missing.rows[0].status, 'error');
  assert.ok(missing.rows[0].messages.some(message => message.column === 'Đáp án đúng'));
});

test('Ngữ cảnh ghi riêng thì lưu trong câu; để trống thì dùng bài đọc của Phần (không sao chép)', () => {
  const own = read([translation({ context: 'Own passage' })]).cards[0];
  assert.equal(own.referenceContext, 'Own passage');
  const shared = read([translation({ context: '' })]).cards[0];
  assert.equal(shared.referenceContext, '');
});

test('dòng tự luận kiểu cũ (Mã mẫu chấm cũ hoặc không có Dạng chấm) vẫn nhận như trước, kèm cảnh báo khi có mã cũ', () => {
  const legacy = readImport('Prompt,Reference_Context,Max_Score,Preset_Type,Criterion_1,Criterion_2\nTranslate this,,4,translation,Ý nghĩa,Ngữ pháp', { scope: 'type', typeCode: 'rubric_async' });
  assert.equal(legacy.rows[0].status, 'warning');
  assert.equal(legacy.cards[0].rubric.criteria.length, 2);
  assert.equal(legacy.cards[0].pendingRubric, undefined);
  const plain = read([row({ prompt: 'Chỉ có đề bài', points: '4' })]);
  assert.equal(plain.cards[0].rubric.criteria.length, 2);
});

test('mẫu tải về của dạng tự luận dùng cột mới và mọi dòng ví dụ Hợp lệ', () => {
  const csv = typeTemplateCsv('rubric_async');
  assert.match(csv, /Dạng chấm/);
  assert.match(csv, /Yêu cầu bắt buộc/);
  const result = readImport(csv, { scope: 'type', typeCode: 'rubric_async' });
  assert.equal(result.format, 'unified');
  assert.equal(result.summary.error, 0, JSON.stringify(result.rows.map(item => item.messages)));
  assert.ok(result.summary.total >= 4);
  assert.ok(result.cards.every(card => card.pendingRubric), 'mọi ví dụ là kiểu mới');
});

test('dựng quy tắc chấm: gọi backend cho từng thẻ chờ, ghi rubric + điểm backend trả; thẻ khác giữ nguyên; lỗi từng thẻ được gom', async () => {
  const cards = [{ prompt: 'A', graderType: 'rubric_async', maxScore: 4, pendingRubric: { variant: 'translation', maxScore: 4 }, rubricVariant: 'translation' }, { prompt: 'B', graderType: 'exact_option' }, { prompt: 'C', graderType: 'rubric_async', maxScore: 4, pendingRubric: { variant: 'bad' } }];
  const calls = [];
  const outcome = await resolveRubricCards(cards, async payload => {
    calls.push(payload);
    if (payload.variant === 'bad') throw new Error('Dạng chấm không hợp lệ');
    return { rubric: { scoringVersion: 'izone-rubric-v2', variant: payload.variant, maxScore: 3.5, requirements: [], language: { maxScore: 1, tiers: [] } } };
  });
  assert.equal(calls.length, 2);
  assert.equal(outcome.cards.length, 2, 'thẻ lỗi bị loại');
  assert.equal(outcome.cards[0].rubric.maxScore, 3.5);
  assert.equal(outcome.cards[0].maxScore, 3.5, 'điểm câu theo backend');
  assert.equal(outcome.cards[0].rubricCode, 'izone-rubric-v2');
  assert.equal(outcome.cards[0].pendingRubric, undefined);
  assert.equal(outcome.cards[1].prompt, 'B');
  assert.deepEqual(outcome.failures.map(failure => [failure.prompt, failure.message]), [['C', 'Dạng chấm không hợp lệ']]);
});

test('dựng cả bài tập/Phần: thẻ lỗi bị loại, bài tập hết câu thì bỏ; không có hàm dựng thì mọi thẻ chờ thất bại rõ ràng', async () => {
  const exercises = [{ title: 'E1', items: [{ prompt: 'ok', graderType: 'rubric_async', pendingRubric: { variant: 'translation' } }, { prompt: 'bad', graderType: 'rubric_async', pendingRubric: { variant: 'bad' } }] }, { title: 'E2', items: [{ prompt: 'only bad', graderType: 'rubric_async', pendingRubric: { variant: 'bad' } }] }];
  const build = async payload => { if (payload.variant === 'bad') throw new Error('lỗi'); return { rubric: { maxScore: 4 } }; };
  const outcome = await resolveExerciseRubrics(exercises, build);
  assert.deepEqual(outcome.exercises.map(exercise => [exercise.title, exercise.items.length]), [['E1', 1]]);
  assert.equal(outcome.failures.length, 2);
  const none = await resolveRubricCards([{ prompt: 'x', graderType: 'rubric_async', pendingRubric: { variant: 'translation' } }], undefined);
  assert.equal(none.cards.length, 0);
  assert.match(none.failures[0].message, /chưa kết nối|không dựng được/i);
});

test('thẻ đã dựng thành câu: khóa chấm dùng quy tắc v2; dàn ý/từ vựng công khai; đáp án mẫu và vai trò đúng không lộ trong câu', () => {
  const card = {
    prompt: 'Essay', interactionType: 'long_text', pedagogicalTypeCode: 'writing', layoutType: 'default', graderType: 'rubric_async', maxScore: 15,
    rubricVariant: 'writing', rubricCode: 'izone-rubric-v2', referenceContext: '', studentOutline: ['Topic'], vocabularyHints: ['migrate to'],
    rubric: { scoringVersion: 'izone-rubric-v2', variant: 'writing', maxScore: 15, requirements: [], modelAnswers: ['SECRET MODEL ANSWER'] }
  };
  let n = 0;
  const result = cardsToDraftItems([card], { exercise: { exerciseId: 'e1' }, startPosition: 1, newId: () => `id${++n}` });
  const [item] = result.items;
  const key = result.gradingKeyItems[item.itemVersionId];
  assert.equal(key.rubricCode, 'izone-rubric-v2');
  assert.equal(key.rubric.modelAnswers[0], 'SECRET MODEL ANSWER');
  assert.equal(item.rubricVariant, 'writing');
  assert.deepEqual(item.studentOutline, ['Topic']);
  assert.deepEqual(item.vocabularyHints, ['migrate to']);
  assert.equal(JSON.stringify(item).includes('SECRET MODEL ANSWER'), false);
});

test('điểm yêu cầu theo đúng quy tắc backend: dạng có Grammar/Vocab cho phép tổng = điểm câu; có Điểm Grammar/Vocab thì phải cộng đúng', () => {
  assert.equal(read([translation({ requirements: 'Một (3) | Hai (1)' })]).rows[0].status, 'ok');
  const mismatch = read([translation({ language: '1.5', requirements: 'Một (2) | Hai (1)' })]);
  assert.equal(mismatch.rows[0].status, 'error');
  assert.match(mismatch.rows[0].messages[0].text, /phải bằng điểm của câu/);
  assert.equal(read([translation({ language: '1.5', requirements: 'Một (1.5) | Hai (1)' })]).rows[0].status, 'ok');
  assert.equal(read([translation({ requirements: 'Một (1) | Hai' })]).rows[0].status, 'ok', 'yêu cầu chưa ghi điểm thì chia phần còn lại');
});
