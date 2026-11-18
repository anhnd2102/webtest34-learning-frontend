// NGUỒN: file .ts này; card-to-item.js do `npm run build` sinh ra.
//
// MỘT chỗ biến thẻ câu hỏi do bộ đọc dựng (import-engine) thành câu hỏi trong bản nháp + đáp án chấm (spec #91, GĐ 3).
// Trước đây mỗi hộp thoại tự làm việc này (10 bản gần giống nhau) nên cùng một dạng nhập qua hai đường cho kết quả khác nhau.
// Hàm thuần: không đụng DOM, nhận hàm sinh id để kiểm thử được.
import { insertItemsIntoBlockExercise } from './draft-model.js';
import { expandSentenceVariants, generateHangmanHint } from './question-content.js';

export type Card = { [key: string]: any };
export interface ExerciseRef { exerciseId?: string, title?: string }
export interface CommitOptions {
  exercise: ExerciseRef;
  startPosition: number;
  newId: () => string;
  // Các câu đã có trong bài tập (để gộp bộ nghĩa của từ vựng nối nghĩa).
  existingItems?: Card[];
}
export interface CommitResult {
  items: Card[];
  gradingKeyItems: { [itemVersionId: string]: Card };
  groups: { [groupId: string]: Card };
  // Câu đã có bị đổi (từ vựng nối nghĩa: bộ lựa chọn nghĩa được gộp lại).
  updatedExisting: { itemVersionId: string, options: Card[], expectedOptionId: string }[];
}

const NORMALIZATION = { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true };

function buildItem(card: Card, options: CommitOptions, index: number): Card {
  const maxScore = card.maxScore != null && !Number.isNaN(card.maxScore) && card.maxScore > 0 ? card.maxScore : 1;
  const item: Card = {
    itemFamilyId: options.newId(),
    itemVersionId: options.newId(),
    position: options.startPosition + index,
    exerciseId: options.exercise.exerciseId,
    exerciseTitle: options.exercise.title,
    prompt: card.prompt,
    helpText: card.helpText || '',
    interactionType: card.interactionType || 'short_text',
    pedagogicalTypeCode: card.pedagogicalTypeCode || 'short_text',
    layoutType: card.layoutType || 'default',
    graderType: card.graderType || 'accepted_text',
    required: true,
    maxScore,
    options: card.options || [],
    skillCodes: [],
    releasePolicy: 'inherit'
  };
  if (card.explanation) item.explanation = card.explanation;
  const type = card.pedagogicalTypeCode;
  if (type === 'sentence_reorder') {
    item.tokens = card.tokens; item.distractors = card.distractors || []; item.targetSentence = card.targetSentence;
  } else if (type === 'sentence_rewrite') {
    item.mandatoryKeyword = card.mandatoryKeyword; item.targetSentence = card.targetSentence;
  } else if (type === 'error_correction' || card.interactionType === 'correction_pair' || card.graderType === 'correction_pair') {
    const errors = card.expectedErrors?.length ? card.expectedErrors : (card.targetWord ? [card.targetWord] : ['error']);
    const corrections = card.expectedCorrections?.length ? card.expectedCorrections : (card.accepted?.length ? card.accepted : ['correction']);
    Object.assign(item, { targetWord: card.targetWord || errors[0], expectedErrors: errors, expectedCorrections: corrections, accepted: corrections, scoringRule: card.scoringRule || 'split_points', interactionType: 'correction_pair', pedagogicalTypeCode: 'error_correction', graderType: 'correction_pair', layoutType: 'correction_inline' });
  } else if (type === 'pictorial_vocabulary') {
    Object.assign(item, { image: card.image, targetWord: card.targetWord, captionHint: card.captionHint || '', letterHint: generateHangmanHint(card.targetWord) });
  } else if (type === 'pronunciation_choice') {
    item.targetWord = card.targetWord || '';
  } else if (type === 'listening_order') {
    item.listeningEvents = card.listeningEvents || []; item.events = card.events || [];
  } else if (type === 'vocabulary_pair' || card.interactionType === 'text_select_pair') {
    Object.assign(item, { targetWord: card.targetWord || card.prompt, options: card.options || [], captionHint: card.captionHint || card.vietnameseMeaning || '', vietnameseMeaning: card.vietnameseMeaning || card.captionHint || '' });
  } else if (card.graderType === 'unordered_group_slot') {
    item.groupId = card.groupId;
  } else if (card.graderType === 'inline_cloze' || card.layoutType === 'inline_cloze') {
    item.clozeAnswers = card.clozeAnswers || {};
  }
  return item;
}

function gradingKeyFor(card: Card, item: Card, result: CommitResult): Card {
  const grader = card.graderType;
  if (grader === 'exact_option') {
    const key: Card = { graderType: 'exact_option', expectedOptionId: card.expectedOptionId || 'A' };
    if (card.pedagogicalTypeCode === 'listening_order') key.events = item.events;
    return key;
  }
  if (grader === 'rubric_async') {
    return {
      graderType: 'rubric_async', rubricCode: card.rubricCode || 'rubric_async_custom', rubricVersion: 1,
      rubric: card.rubric || { scoringVersion: 'rubric_async_custom', maxScore: item.maxScore, criteria: [
        { id: 'crit_1', label: 'Ý nghĩa & Nội dung', maxScore: item.maxScore / 2, requiredConcepts: [] },
        { id: 'crit_2', label: 'Ngữ pháp & Diễn đạt', maxScore: item.maxScore / 2, requiredConcepts: [] }
      ] }
    };
  }
  if (grader === 'accepted_text_exact_option' || card.interactionType === 'text_select_pair' || card.pedagogicalTypeCode === 'vocabulary_pair') {
    return { graderType: 'accepted_text_exact_option', accepted: expandSentenceVariants([item.targetWord || item.prompt || '']), expectedOptionId: card.expectedOptionId || item.options?.[0]?.id || 'meaning-01', normalization: NORMALIZATION };
  }
  if (grader === 'inline_cloze' || card.layoutType === 'inline_cloze') {
    return { graderType: 'inline_cloze', blanks: item.clozeAnswers, accepted: card.accepted || [item.targetWord || ''], normalization: NORMALIZATION };
  }
  if (grader === 'unordered_group_slot') {
    const expected = card.expectedOptionIds || [];
    if (card.groupId && !result.groups[card.groupId]) result.groups[card.groupId] = { graderType: 'unordered_group_slot', expectedOptionIds: expected };
    return { graderType: 'unordered_group_slot', groupId: card.groupId, expectedOptionIds: expected };
  }
  if (grader === 'correction_pair') {
    return { graderType: 'correction_pair', expectedErrors: item.expectedErrors, expectedCorrections: item.expectedCorrections, accepted: item.expectedCorrections, scoringRule: card.scoringRule || 'split_points', normalization: NORMALIZATION };
  }
  const key: Card = { graderType: 'accepted_text', accepted: card.accepted || [card.targetAnswer || ''], normalization: NORMALIZATION };
  if (card.pedagogicalTypeCode === 'sentence_reorder') { key.tokens = card.tokens; key.distractors = card.distractors || []; }
  else if (card.pedagogicalTypeCode === 'sentence_rewrite') key.keyword = card.mandatoryKeyword;
  return key;
}

// Từ vựng nối nghĩa: mọi câu trong bài tập dùng chung MỘT bộ lựa chọn nghĩa. Khi thêm câu mới vào bài tập đã có từ vựng,
// gộp bộ nghĩa cũ và mới rồi cập nhật cả câu cũ để đáp án vẫn trỏ đúng nghĩa.
function mergeVocabularyMeanings(result: CommitResult, existing: Card[]): void {
  const added = result.items.filter(item => item.pedagogicalTypeCode === 'vocabulary_pair');
  const old = existing.filter(item => item.pedagogicalTypeCode === 'vocabulary_pair' || item.interactionType === 'text_select_pair');
  if (!added.length || !old.length) return;
  const labelOf = (item: Card): string => {
    const options: Card[] = item.options || [];
    const expected = result.gradingKeyItems[item.itemVersionId]?.expectedOptionId;
    return item.vietnameseMeaning || item.captionHint || options.find(option => option.id === expected)?.label || '';
  };
  const oldLabels = new Map<string, string>(old.map(item => [item.itemVersionId, item.captionHint || item.vietnameseMeaning || '']));
  const meanings = Array.from(new Set([...old.map(item => oldLabels.get(item.itemVersionId) || ''), ...added.map(labelOf)].filter(Boolean)));
  meanings.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
  const options = meanings.map((label, index) => ({ id: `meaning-${String(index + 1).padStart(2, '0')}`, label }));
  const idOf = (label: string): string => options.find(option => option.label === label)?.id || options[0]?.id || '';
  for (const item of added) {
    item.options = options.map(option => ({ ...option }));
    result.gradingKeyItems[item.itemVersionId].expectedOptionId = idOf(labelOf(item));
  }
  for (const item of old) {
    result.updatedExisting.push({ itemVersionId: item.itemVersionId, options: options.map(option => ({ ...option })), expectedOptionId: idOf(oldLabels.get(item.itemVersionId) || '') });
  }
}

export function cardsToDraftItems(cards: Card[], options: CommitOptions): CommitResult {
  const result: CommitResult = { items: [], gradingKeyItems: {}, groups: {}, updatedExisting: [] };
  cards.forEach((card, index) => {
    const item = buildItem(card, options, index);
    result.items.push(item);
    result.gradingKeyItems[item.itemVersionId] = gradingKeyFor(card, item, result);
  });
  mergeVocabularyMeanings(result, options.existingItems || []);
  return result;
}

// Thêm thẻ câu hỏi vào một bài tập của bản nháp: dựng câu + đáp án chấm, khai nhóm chọn nhiều, cập nhật câu từ vựng cũ.
// Hộp thoại "Thêm câu hỏi" và nhập cả Phần dùng chung hàm này.
export function commitCardsToExercise({ draftState, block, exercise, cards, startPosition, newId }: {
  draftState: { gradingKey?: any };
  block: any;
  exercise: ExerciseRef;
  cards: Card[];
  startPosition: number;
  newId: () => string;
}): Card[] {
  const existingItems: Card[] = (block.items || []).filter((item: Card) => item.exerciseId === exercise.exerciseId);
  const result = cardsToDraftItems(cards, { exercise, startPosition, newId, existingItems });
  draftState.gradingKey = draftState.gradingKey || {};
  const key = draftState.gradingKey;
  key.items = key.items || {};
  Object.assign(key.items, result.gradingKeyItems);
  if (Object.keys(result.groups).length) {
    key.groups = key.groups || {};
    for (const [groupId, group] of Object.entries(result.groups)) if (!key.groups[groupId]) key.groups[groupId] = group;
  }
  for (const update of result.updatedExisting) {
    const item = existingItems.find(candidate => candidate.itemVersionId === update.itemVersionId);
    if (item) item.options = update.options;
    if (key.items[update.itemVersionId]) key.items[update.itemVersionId].expectedOptionId = update.expectedOptionId;
  }
  insertItemsIntoBlockExercise(block, exercise as any, result.items as any);
  return result.items;
}

// Thêm các bài tập đọc từ file vào một Phần: bài tập đánh số tiếp, câu có đáp án chấm. Chế độ 'overwrite' xóa bài tập
// và đáp án chấm cũ của Phần trước. Dùng chung cho nhập cả Phần và nhập cả đề.
export function appendExercisesToBlock({ draftState, block, exercises, getNextPosition, newId, mode = 'append' }: {
  draftState: { gradingKey?: any };
  block: any;
  exercises: { title?: string, instructions?: string, items: Card[] }[];
  getNextPosition: () => number;
  newId: () => string;
  mode?: 'append' | 'overwrite';
}): Card[] {
  if (mode === 'overwrite') {
    const keys = draftState.gradingKey?.items;
    for (const item of (block.items || []) as Card[]) if (item.itemVersionId && keys) delete keys[item.itemVersionId];
    block.exercises = [];
    block.items = [];
  }
  block.exercises = block.exercises || [];
  block.items = block.items || [];
  const created: Card[] = [];
  for (const parsed of exercises) {
    const exerciseNumber = block.exercises.length + 1;
    const exercise = { exerciseId: newId(), exerciseNumber, title: parsed.title || `Exercise ${exerciseNumber}`, instructions: parsed.instructions || '' };
    block.exercises.push(exercise);
    created.push(...commitCardsToExercise({ draftState, block, exercise, cards: parsed.items || [], startPosition: getNextPosition(), newId }));
  }
  return created;
}

// Thông tin cả Phần đọc từ file (dòng/sheet "Thông tin Phần"): chỉ ghi đè trường có giá trị trong file.
export function applyBlockInfo(block: any, info: { title?: string, instructions?: string, reading?: string, audio?: string }, options: { withTitle?: boolean } = {}): void {
  if (options.withTitle !== false && info.title) block.title = info.title;
  if (info.instructions) block.instructions = info.instructions;
  if (info.reading) { block.readingPassage = info.reading; block.stimulusReadingPassage = info.reading; }
  if (info.audio) { block.audioUrl = info.audio; block.stimulusAudioUrl = info.audio; }
}
