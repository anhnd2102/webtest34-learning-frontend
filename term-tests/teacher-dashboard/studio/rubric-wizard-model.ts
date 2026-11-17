// NGUỒN: file .ts này; rubric-wizard-model.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
//
// Mô hình thuần của trình hướng dẫn tạo câu Tự luận chấm AI (spec #40). Không đụng DOM: nhận trạng thái người dùng nhập,
// dựng payload gửi backend (`POST /api/teacher/rubric-presets/build`), rồi dựng câu hỏi + rubric snapshot để lưu vào bản nháp.
// Mọi quy tắc chấm (bảng trừ lỗi, chỉ dẫn theo Khối, tổng điểm) nằm ở backend; ở đây chỉ chuẩn hóa dữ liệu nhập.

export type RubricLevel = '03' | '34' | '45';
export type RubricVariant = 'translation' | 'sentence_order' | 'reading_comprehension' | 'sentence_role' | 'speaking_text' | 'writing';

export interface RequirementDraft { label: string, maxScore: string, acceptedForms: string }

export interface QuestionDraft {
  prompt: string;
  requirements: RequirementDraft[];
  modelAnswers: string;
  promptGuidance: string;
  outline: string;
  vocabularyHints: string;
  role: string;
}

export interface WizardState {
  mode: 'create' | 'edit';
  variant: RubricVariant | null;
  level: RubricLevel;
  points: string;
  context: string;
  // true: dùng ngữ cảnh nhập riêng cho các câu này; false: dùng bài đọc của Phần (nếu Phần có).
  useOwnContext: boolean;
  languageScore: string;
  wordMin: string;
  sample: string;
  questions: QuestionDraft[];
}

// Dữ liệu từ GET /api/teacher/rubric-presets (chỉ khai báo trường dùng ở đây).
export interface PresetVariantInfo { variant: RubricVariant, family: string, label: string, description: string, levels: RubricLevel[], requirementKind: string, hasLanguage: boolean }
export interface PresetCatalog { families: { family: string, label: string }[], variants: PresetVariantInfo[], levels: { level: RubricLevel, label: string, description: string }[] }

export const VARIANT_EXAMPLES: Record<RubricVariant, string> = {
  translation: 'Dịch: "Tôi đặc biệt thích chạy bộ, bơi lội và đạp xe." Chấm theo cấu trúc "Particularly + enjoy + V-ing" và cấu trúc song song.',
  sentence_order: 'Từ cho sẵn: receive / an / any / It / without / injury / be / hard / sports / play. Chấm theo "it\'s + adj + to V" và "without + V-ing".',
  reading_comprehension: 'Câu hỏi: "Vì sao tác giả cho rằng thành phố đắt đỏ hơn?" Chấm theo từng ý chính học viên nêu được từ đoạn văn.',
  sentence_role: 'Câu 1 trong đoạn: "Một mặt, có những tranh luận đạo đức chống lại việc thí nghiệm trên động vật." Học viên nêu vai trò của câu.',
  speaking_text: 'Câu hỏi Speaking trả lời bằng văn bản: "Describe a place you like to visit." Chấm theo ý chính và một khoản ngôn ngữ nhỏ.',
  writing: 'Viết đoạn thân bài theo dàn ý: Topic sentence, Ý 1, Ý 2, Ý 3. Chấm Task achievement, Coherence, Grammar, Vocabulary.'
};

const FAMILY_BY_VARIANT: Record<RubricVariant, 'structured' | 'ideas' | 'writing'> = {
  translation: 'structured', sentence_order: 'structured', reading_comprehension: 'ideas', sentence_role: 'ideas', speaking_text: 'ideas', writing: 'writing'
};

const LEVEL_BY_COURSE: Record<string, RubricLevel> = { '1': '03', '2': '34', '3': '45' };
const WRITING_LEVELS: RubricLevel[] = ['34', '45'];

// Khối của đề gợi ý mức chấm mặc định; không rõ thì Khối 34. Người tạo đề vẫn đổi được cho từng câu.
export function suggestLevel(courseId: unknown): RubricLevel {
  return LEVEL_BY_COURSE[String(courseId ?? '')] || '34';
}

export function levelsForVariant(variant: RubricVariant | null): RubricLevel[] {
  return variant === 'writing' ? WRITING_LEVELS : ['03', '34', '45'];
}

const emptyRequirement = (): RequirementDraft => ({ label: '', maxScore: '', acceptedForms: '' });

export function emptyQuestion(variant: RubricVariant | null): QuestionDraft {
  const kind = variant ? FAMILY_BY_VARIANT[variant] : 'structured';
  const rows = kind === 'structured' ? 2 : (kind === 'ideas' && variant !== 'sentence_role' ? 2 : 0);
  return {
    prompt: '',
    requirements: Array.from({ length: rows }, emptyRequirement),
    modelAnswers: '',
    promptGuidance: '',
    outline: '',
    vocabularyHints: '',
    role: ''
  };
}

// Bài đọc của Phần dùng chung cho mọi câu trong Phần: nguồn duy nhất, nhập một lần ở ô Bài đọc của Phần.
// Backend tự ghép nó khi chấm nếu câu/bài tập không có ngữ cảnh riêng, nên không sao chép vào từng câu.
export function sharedContextFromBlock(block: { readingPassage?: string | null, stimulusReadingPassage?: string | null, referenceContext?: string | null } | null | undefined): string {
  const raw = block?.readingPassage || block?.stimulusReadingPassage || block?.referenceContext || '';
  return String(raw).replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Ngữ cảnh AI dùng để chấm thử: riêng (hoặc Phần không có bài đọc) thì lấy ô nhập, ngược lại lấy bài đọc của Phần.
export function effectiveContext(state: WizardState, sharedContext: string): string {
  return state.useOwnContext || !sharedContext ? state.context : sharedContext;
}

export function createWizardState({ variant = null, courseId }: { variant?: RubricVariant | null, courseId?: unknown } = {}): WizardState {
  let level = suggestLevel(courseId);
  if (!levelsForVariant(variant).includes(level)) level = '34';
  return {
    mode: 'create',
    variant,
    level,
    points: variant === 'writing' ? '15' : '4',
    context: '',
    useOwnContext: false,
    languageScore: '',
    wordMin: '',
    sample: '',
    questions: [emptyQuestion(variant)]
  };
}

// Đổi dạng giữa chừng: giữ đề bài đã nhập, làm lại hàng yêu cầu và sửa Khối nếu dạng mới không hỗ trợ.
export function changeVariant(state: WizardState, variant: RubricVariant): WizardState {
  const level = levelsForVariant(variant).includes(state.level) ? state.level : '34';
  const points = variant === 'writing' && state.points === '4' ? '15' : (variant !== 'writing' && state.points === '15' ? '4' : state.points);
  return { ...state, variant, level, points, questions: state.questions.map(question => ({ ...emptyQuestion(variant), prompt: question.prompt })) };
}

export const splitLines = (text: string): string[] => String(text || '').split(/\r?\n/u).map(line => line.trim()).filter(Boolean);
const forms = (text: string): string[] => String(text || '').split(/[;,|]/u).map(part => part.trim()).filter(Boolean);
const positive = (text: string): number | null => {
  const value = Number(String(text ?? '').trim().replace(',', '.'));
  return String(text ?? '').trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
};

export const ROLE_GUIDANCE_PREFIX = 'Vai trò đúng của câu: ';

export function buildRubricPayload(state: WizardState, question: QuestionDraft): Record<string, any> {
  const variant = state.variant!;
  const payload: Record<string, any> = { variant, level: state.level, maxScore: Number(String(state.points).replace(',', '.')) };
  const extraGuidance = question.promptGuidance.trim();

  if (variant === 'writing') {
    payload.outline = splitLines(question.outline);
    const minimum = positive(state.wordMin);
    if (minimum) payload.wordCount = { minimum: Math.round(minimum), scoreCapBelowMinimum: true };
    if (extraGuidance) payload.promptGuidance = extraGuidance;
    const answers = splitLines(question.modelAnswers);
    if (answers.length) payload.modelAnswers = answers;
    return payload;
  }

  if (variant === 'sentence_role') {
    payload.requirements = [{ label: 'Nêu đúng vai trò của câu' }];
    payload.modelAnswers = [question.role.trim()];
    payload.promptGuidance = [`${ROLE_GUIDANCE_PREFIX}${question.role.trim()}`, extraGuidance].filter(Boolean).join('\n');
    return payload;
  }

  payload.requirements = question.requirements
    .filter(row => row.label.trim())
    .map(row => {
      const requirement: Record<string, any> = { label: row.label.trim() };
      const score = positive(row.maxScore);
      if (score) requirement.maxScore = score;
      const accepted = forms(row.acceptedForms);
      if (accepted.length) requirement.acceptedForms = accepted;
      return requirement;
    });
  const answers = splitLines(question.modelAnswers);
  if (answers.length) payload.modelAnswers = answers;
  if (extraGuidance) payload.promptGuidance = extraGuidance;
  const language = String(state.languageScore).trim();
  if (language !== '' && Number.isFinite(Number(language.replace(',', '.'))) && Number(language.replace(',', '.')) >= 0) {
    payload.languageScore = Number(language.replace(',', '.'));
  }
  return payload;
}

// Mỗi dòng của đoạn văn thành một câu "Vai trò đúng của Câu N" (người tạo đề chỉ cần điền vai trò đúng).
export function questionsFromSentences(sentences: string[]): QuestionDraft[] {
  return sentences.map(text => text.trim()).filter(Boolean).map((text, index) => ({
    ...emptyQuestion('sentence_role'),
    prompt: `Vai trò đúng của Câu ${index + 1}. ${text} là:`
  }));
}

export interface CreatedItems { items: Record<string, any>[], gradingKeyItems: Record<string, any> }

export function itemsFromWizard(
  state: WizardState,
  rubrics: Record<string, any>[],
  { exerciseId, exerciseTitle, startPosition, newId }: { exerciseId: string, exerciseTitle: string, startPosition: number, newId: () => string }
): CreatedItems {
  const items: Record<string, any>[] = [];
  const gradingKeyItems: Record<string, any> = {};
  state.questions.forEach((question, index) => {
    const rubric = rubrics[index];
    const itemVersionId = newId();
    const item: Record<string, any> = {
      itemFamilyId: newId(),
      itemVersionId,
      position: startPosition + index,
      exerciseId,
      exerciseTitle,
      prompt: question.prompt.trim(),
      helpText: '',
      interactionType: 'long_text',
      pedagogicalTypeCode: 'writing',
      layoutType: 'default',
      graderType: 'rubric_async',
      required: true,
      maxScore: rubric.maxScore,
      options: [],
      skillCodes: [],
      releasePolicy: 'inherit',
      rubricVariant: state.variant
    };
    // Dàn ý và từ vựng gợi ý dành cho học viên nên nằm trong định nghĩa công khai; đáp án mẫu/vai trò đúng thì không.
    if (state.variant === 'writing') {
      item.studentOutline = splitLines(question.outline);
      const hints = splitLines(question.vocabularyHints);
      if (hints.length) item.vocabularyHints = hints;
    }
    items.push(item);
    gradingKeyItems[itemVersionId] = { graderType: 'rubric_async', rubricCode: 'izone-rubric-v2', rubricVersion: 1, rubric };
  });
  return { items, gradingKeyItems };
}

export function validateWizardStep(state: WizardState, step: number): string[] {
  const problems: string[] = [];
  if (step === 1) {
    if (!state.variant) problems.push('Hãy chọn một dạng câu hỏi.');
    return problems;
  }
  if (step === 2) {
    if (positive(state.points) === null) problems.push('Điểm mỗi câu phải là số lớn hơn 0.');
    state.questions.forEach((question, index) => {
      const label = state.questions.length > 1 ? `Câu ${index + 1}: ` : '';
      if (!question.prompt.trim()) problems.push(`${label}Chưa nhập đề bài.`);
      if (state.variant === 'writing') {
        if (!splitLines(question.outline).length) problems.push(`${label}Cần ít nhất một ý trong dàn ý.`);
      } else if (state.variant === 'sentence_role') {
        if (!question.role.trim()) problems.push(`${label}Chưa nhập vai trò đúng của câu.`);
      } else {
        const rows = question.requirements.filter(row => row.label.trim());
        if (!rows.length) problems.push(`${label}Cần ít nhất một yêu cầu bắt buộc.`);
        for (const row of rows) {
          if (row.maxScore.trim() !== '' && positive(row.maxScore) === null) problems.push(`${label}Điểm của "${row.label.trim()}" phải là số lớn hơn 0.`);
        }
      }
    });
    return problems;
  }
  if (step === 3) {
    if (!levelsForVariant(state.variant).includes(state.level)) problems.push(`Dạng này chưa có mức chấm cho Khối ${state.level}.`);
  }
  return problems;
}

// Đọc ngược rubric snapshot của một câu có sẵn để mở lại trình hướng dẫn (chế độ sửa).
export function draftFromItem(item: Record<string, any>, key: Record<string, any>, { courseId }: { courseId?: unknown } = {}): WizardState {
  const rubric = key?.rubric || {};
  const variant = rubric.variant as RubricVariant;
  const state = createWizardState({ variant, courseId });
  state.mode = 'edit';
  state.level = rubric.level || state.level;
  state.points = String(rubric.maxScore ?? item.maxScore ?? state.points);
  state.languageScore = rubric.language ? String(rubric.language.maxScore) : '';
  state.wordMin = rubric.wordCount?.minimum ? String(rubric.wordCount.minimum) : '';
  const question = emptyQuestion(variant);
  question.prompt = String(item.prompt || '');
  question.modelAnswers = (rubric.modelAnswers || []).join('\n');
  let guidance = String(rubric.promptGuidance || '');
  if (variant === 'sentence_role') {
    question.role = (rubric.modelAnswers || [])[0] || '';
    question.modelAnswers = '';
    guidance = guidance.split('\n').filter((line: string) => !line.startsWith(ROLE_GUIDANCE_PREFIX)).join('\n');
  }
  question.promptGuidance = guidance;
  if (variant === 'writing') {
    question.outline = (rubric.requirements || []).map((requirement: any) => requirement.label).join('\n');
    question.vocabularyHints = (item.vocabularyHints || []).join('\n');
  } else if (variant !== 'sentence_role') {
    question.requirements = (rubric.requirements || []).map((requirement: any) => ({
      label: String(requirement.label || ''),
      maxScore: String(requirement.maxScore ?? ''),
      acceptedForms: (requirement.acceptedForms || []).join('; ')
    }));
  }
  state.questions = [question];
  return state;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;
const LEVEL_NAME: Record<string, string> = { '03': 'Khối 03', '34': 'Khối 34', '45': 'Khối 45' };
const LEVEL_NOTE: Record<string, string> = {
  '03': 'mức chấm dễ hơn: cấu trúc nhận ra được là tính đạt, bảng trừ lỗi rộng hơn',
  '34': 'cấu trúc phải đúng dạng mới có điểm',
  '45': 'cấu trúc phải đúng dạng mới có điểm'
};

// Tóm tắt rubric trên thẻ câu hỏi bằng lời thường (chỉ định dạng trình bày; quy tắc chấm nằm ở backend).
export function summarizeRubricV2(rubric: Record<string, any>): string[] {
  const out: string[] = [];
  out.push(`${LEVEL_NAME[rubric.level] || 'Khối'}: ${LEVEL_NOTE[rubric.level] || ''}.`);
  const partial = (rubric.requirements || []).some((requirement: any) => requirement.mode === 'partial');
  for (const requirement of rubric.requirements || []) {
    const accepted = requirement.acceptedForms?.length ? ` (chấp nhận: ${requirement.acceptedForms.join(', ')})` : '';
    out.push(`"${requirement.label}"${accepted}: ${requirement.maxScore} điểm${partial ? ', có thể được nửa điểm' : ''}.`);
  }
  if (rubric.language) {
    const parts: string[] = [];
    let previous = -1;
    for (const tier of rubric.language.tiers || []) {
      const from = previous + 1;
      parts.push(`${from === tier.maxErrors ? tier.maxErrors : `${from}–${tier.maxErrors}`} lỗi: ${round2(tier.ratio * rubric.language.maxScore)} điểm`);
      previous = tier.maxErrors;
    }
    parts.push(`từ ${previous + 1} lỗi: 0 điểm`);
    out.push(`Grammar/Vocab tối đa ${rubric.language.maxScore} điểm — ${parts.join('; ')}.`);
  }
  for (const criterion of rubric.criteria || []) out.push(`${criterion.label}: tối đa ${criterion.maxScore} điểm do AI đánh giá.`);
  if (rubric.wordCount) out.push(`Số từ tối thiểu ${rubric.wordCount.minimum}.`);
  return out;
}
