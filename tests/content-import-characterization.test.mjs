import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCsvRows, parseVocabPairCsv, parseSingleChoiceCsv, parseFitbCsv,
  parseErrorCorrectionCsv, parseSentenceTransformationCsv, parseListeningOrderCsv,
  generateSingleChoiceTemplateCsv, generateFitbTemplateCsv,
  generateErrorCorrectionTemplateCsv, generateSentenceTransformationTemplateCsv,
  generateListeningOrderTemplateCsv, generateVocabPairTemplateCsv
} from '../term-tests/teacher-dashboard/app.js';

test('CSV rows preserve Unicode, escaped quotes, quoted newlines and trailing empty columns', () => {
  assert.deepEqual(parseCsvRows('\uFEFFTên,Mô tả,Cuối\r\n\r\n"An, Bình","Nói ""xin chào""\r\nrồi đi",\r\n , , \nCuối,dòng,'), [
    ['Tên', 'Mô tả', 'Cuối'],
    ['An, Bình', 'Nói "xin chào"\r\nrồi đi', ''],
    ['Cuối', 'dòng', '']
  ]);
});

test('CSV rows detect tabs from the first line and retain current handling of unfinished quotes', () => {
  assert.deepEqual(parseCsvRows('\uFEFFWord\tMeaning\r\n coast \t bờ biển \n'), [
    ['Word', 'Meaning'], ['coast', 'bờ biển']
  ]);
  // Characterization, not an endorsement of malformed CSV: no new validation in this refactor.
  assert.deepEqual(parseCsvRows('a,"unfinished\ntext'), [['a', 'unfinished\ntext']]);
  for (const input of [undefined, null, 42, {}, '', '\r\n , \n']) {
    assert.deepEqual(parseCsvRows(input), []);
  }
});

test('Vocabulary CSV retains header detection, physical invalid-row lines and its distinct delimiter rules', () => {
  assert.deepEqual(parseVocabPairCsv('\uFEFF\r\nWord,Meaning\r\ncoast,bờ biển, ven bờ\n\nmissing\n,thiếu từ\nhello\txin chào\tbạn'), {
    validRows: [
      { english: 'coast', vietnamese: 'bờ biển, ven bờ' },
      { english: 'hello', vietnamese: 'xin chào\tbạn' }
    ],
    invalidRows: [
      { line: 5, raw: 'missing', reason: 'Thiếu cột nghĩa tiếng Việt' },
      { line: 6, raw: ',thiếu từ', reason: 'Thiếu cột từ tiếng Anh' }
    ]
  });
  assert.deepEqual(parseVocabPairCsv(null), { validRows: [], invalidRows: [] });
});

test('Single choice keeps default scores, invalid-row numbering and current unknown-letter fallback', () => {
  const result = parseSingleChoiceCsv('Question_Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Answer,Explanation,Points\r\n\n"Bến, cảng?",Có,Không,,,B,"Ghi ""chú""",0\nThiếu,,,,,,,\nKhác,A,B,,,Z,,2.5', 0.75);
  assert.deepEqual(result, {
    items: [
      { prompt: 'Bến, cảng?', interactionType: 'single_choice', pedagogicalTypeCode: 'single_choice', layoutType: 'grid_2', options: [{ id: 'opt_a', label: 'Có' }, { id: 'opt_b', label: 'Không' }], expectedOptionId: 'opt_b', explanation: 'Ghi "chú"', maxScore: 0.75 },
      { prompt: 'Khác', interactionType: 'single_choice', pedagogicalTypeCode: 'single_choice', layoutType: 'grid_2', options: [{ id: 'opt_a', label: 'A' }, { id: 'opt_b', label: 'B' }], expectedOptionId: 'opt_a', explanation: '', maxScore: 2.5 }
    ],
    invalidRows: [{ line: 3, row: ['Thiếu', '', '', '', '', '', '', ''], reason: 'Thiếu đề bài, lựa chọn A/B hoặc đáp án đúng' }]
  });
});

test('Fill-in CSV keeps zero as an answer, score fallback and rejection details', () => {
  assert.deepEqual(parseFitbCsv('Prompt,Target_Answer,Points\nĐiền ___,0,-1\nThiếu,,2\nCuối ___,x,1.5', 0.5), {
    items: [{ prompt: 'Điền ___', targetAnswer: '0', maxScore: 0.5 }, { prompt: 'Cuối ___', targetAnswer: 'x', maxScore: 1.5 }],
    invalidRows: [{ line: 3, row: ['Thiếu', '', '2'], reason: 'Thiếu đề bài hoặc đáp án đúng' }]
  });
});

test('Correction and transformation CSV keep variant order, deduplication and fallback target', () => {
  assert.deepEqual(parseErrorCorrectionCsv('Original_Sentence,Error_Part,Correction,Accepted_Variants,Explanation\nHe go.,go,goes,goes; went ; ;went,Ghi chú\nThiếu,go,,,'), {
    items: [{ prompt: 'He go.', interactionType: 'error_correction', pedagogicalTypeCode: 'error_correction', targetWord: 'go', accepted: ['goes', 'went'], explanation: 'Ghi chú' }],
    invalidRows: [{ line: 3, row: ['Thiếu', 'go', '', '', ''], reason: 'Thiếu câu gốc, từ sai hoặc từ sửa đúng' }]
  });
  assert.deepEqual(parseSentenceTransformationCsv('Original_Sentence,Mandatory_Keyword,Target_Sentence_With_Blank,Expected_Answer,Accepted_Variants\nOriginal,have,,have to,have to; must;must\nMissing,,,,'), {
    items: [{ prompt: 'Original', interactionType: 'sentence_transformation', pedagogicalTypeCode: 'sentence_transformation', mandatoryKeyword: 'HAVE', targetSentence: '(1) __________', accepted: ['have to', 'must'] }],
    invalidRows: [{ line: 3, row: ['Missing', '', '', '', ''], reason: 'Thiếu câu gốc, từ khóa hoặc đáp án' }]
  });
});

test('Listening CSV keeps group insertion order, stable ranks, default title and parseInt behavior', () => {
  assert.deepEqual(parseListeningOrderCsv('Section_Title,Event_Text,Correct_Order\nTrip,Second,2\n,Default,1\nTrip,First,1\nTrip,Tied,1\nTrip,Missing,no\nOther,Numeric prefix,3x'), {
    items: [
      { prompt: 'Trip', interactionType: 'listening_order', pedagogicalTypeCode: 'listening_order', listeningEvents: [{ id: 'ev_1', text: 'First', correctRank: 1 }, { id: 'ev_2', text: 'Tied', correctRank: 1 }, { id: 'ev_3', text: 'Second', correctRank: 2 }], maxScore: 3 },
      { prompt: 'Bài nghe sắp xếp sự kiện', interactionType: 'listening_order', pedagogicalTypeCode: 'listening_order', listeningEvents: [{ id: 'ev_1', text: 'Default', correctRank: 1 }], maxScore: 1 },
      { prompt: 'Other', interactionType: 'listening_order', pedagogicalTypeCode: 'listening_order', listeningEvents: [{ id: 'ev_1', text: 'Numeric prefix', correctRank: 3 }], maxScore: 1 }
    ],
    invalidRows: [{ line: 6, row: ['Trip', 'Missing', 'no'], reason: 'Thiếu nội dung sự kiện hoặc thứ tự hợp lệ' }]
  });
});

test('All CSV templates retain Excel BOM, CRLF and usable sample rows', () => {
  for (const [generate, parse, count, collection] of [
    [generateSingleChoiceTemplateCsv, parseSingleChoiceCsv, 3, 'items'],
    [generateFitbTemplateCsv, parseFitbCsv, 5, 'items'],
    [generateErrorCorrectionTemplateCsv, parseErrorCorrectionCsv, 2, 'items'],
    [generateSentenceTransformationTemplateCsv, parseSentenceTransformationCsv, 2, 'items'],
    [generateListeningOrderTemplateCsv, parseListeningOrderCsv, 1, 'items'],
    [generateVocabPairTemplateCsv, parseVocabPairCsv, 5, 'validRows']
  ]) {
    const template = generate();
    assert.ok(template.startsWith('\uFEFF'));
    assert.ok(template.endsWith('\r\n'));
    assert.equal(template.replaceAll('\r\n', '').includes('\n'), false);
    assert.equal(parse(template)[collection].length, count);
    assert.deepEqual(parse(template).invalidRows, []);
  }
});
