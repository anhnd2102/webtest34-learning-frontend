// NGUỒN: file .ts này; import-registry.js do `npm run build` sinh ra.
//
// Bộ định nghĩa dạng câu cho nhập CSV/Excel của Test Studio (spec #91, GĐ 1): MỘT nơi khai báo mọi dạng và mọi cột.
// Mẫu, hướng dẫn, bộ đọc, bộ ghi và bộ kiểm tra đều sinh từ đây nên không thể lệch nhau. Không đụng DOM.
export const OPTION_FIELDS = ['optA', 'optB', 'optC', 'optD', 'optE', 'optF', 'optG', 'optH'];
export const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
// Cột chuẩn theo thứ tự hiển thị trong mẫu. `label` là tiêu đề tiếng Việt; `aliases` là cách gọi khác được nhận (không phân biệt hoa thường/dấu cách/gạch dưới).
export const COLUMNS = [
    { id: 'exerciseTitle', label: 'Bài tập', aliases: ['exercise title', 'exercise_title', 'tiêu đề bài tập', 'tên bài tập'] },
    { id: 'exerciseInstructions', label: 'Hướng dẫn bài tập', aliases: ['exercise instructions', 'exercise_instructions', 'hướng dẫn làm bài'] },
    { id: 'type', label: 'Dạng câu', aliases: ['question type', 'question_type', 'loại câu', 'dạng'] },
    { id: 'prompt', label: 'Đề bài', aliases: ['prompt', 'question prompt', 'question_prompt', 'question', 'câu hỏi', 'đề', 'nội dung'] },
    { id: 'optA', label: 'Lựa chọn A', aliases: ['option a', 'option_a', 'phương án a', 'a'] },
    { id: 'optB', label: 'Lựa chọn B', aliases: ['option b', 'option_b', 'phương án b', 'b'] },
    { id: 'optC', label: 'Lựa chọn C', aliases: ['option c', 'option_c', 'phương án c', 'c'] },
    { id: 'optD', label: 'Lựa chọn D', aliases: ['option d', 'option_d', 'phương án d', 'd'] },
    { id: 'optE', label: 'Lựa chọn E', aliases: ['option e', 'option_e', 'phương án e', 'e'] },
    { id: 'optF', label: 'Lựa chọn F', aliases: ['option f', 'option_f', 'phương án f', 'f'] },
    { id: 'optG', label: 'Lựa chọn G', aliases: ['option g', 'option_g', 'phương án g', 'g'] },
    { id: 'optH', label: 'Lựa chọn H', aliases: ['option h', 'option_h', 'phương án h', 'h'] },
    { id: 'correct', label: 'Đáp án đúng', aliases: ['correct answer', 'correct_answer', 'answer', 'đáp án', 'đáp án chính'] },
    { id: 'accepted', label: 'Đáp án chấp nhận thêm', aliases: ['accepted variants', 'accepted_variants', 'đáp án khác', 'chấp nhận thêm'] },
    { id: 'explanation', label: 'Giải thích', aliases: ['explanation', 'giải thích đáp án'] },
    { id: 'points', label: 'Điểm', aliases: ['points', 'score', 'điểm số', 'max score', 'max_score'] },
    { id: 'image', label: 'Ảnh', aliases: ['image', 'image url', 'image_url', 'hình ảnh', 'tên ảnh'] },
    { id: 'hint', label: 'Gợi ý', aliases: ['hint', 'help text', 'help_text', 'nghĩa gợi ý', 'vietnamese meaning', 'vietnamese_meaning'] },
    { id: 'wrongPart', label: 'Từ sai', aliases: ['error part', 'error_part', 'phần sai', 'lỗi sai'] },
    { id: 'keyword', label: 'Từ khóa bắt buộc', aliases: ['mandatory keyword', 'mandatory_keyword', 'từ khóa', 'keyword'] },
    { id: 'targetSentence', label: 'Câu đích', aliases: ['target sentence with blank', 'target_sentence_with_blank', 'target sentence', 'câu đích có chỗ trống'] },
    { id: 'context', label: 'Ngữ cảnh', aliases: ['reference context', 'reference_context', 'context', 'bài đọc'] },
    { id: 'criterion1', label: 'Tiêu chí 1', aliases: ['criterion 1', 'criterion_1'] },
    { id: 'criterion2', label: 'Tiêu chí 2', aliases: ['criterion 2', 'criterion_2'] },
    { id: 'legacyPreset', label: 'Mã mẫu chấm cũ', aliases: ['preset type', 'preset_type'] }
];
export const COLUMN_LABEL = Object.fromEntries(COLUMNS.map(column => [column.id, column.label]));
const ex = (items) => items;
export const TYPES = [
    {
        code: 'single_choice', label: 'Trắc nghiệm một đáp án', family: 'Trắc nghiệm', defaultPoints: 1,
        columns: ['prompt', 'optA', 'optB', 'optC', 'optD', 'correct', 'explanation', 'points'],
        required: ['prompt', 'optA', 'optB', 'correct'],
        aliases: ['trắc nghiệm', 'trắc nghiệm đơn', 'trắc nghiệm một đáp án', 'trac nghiem', 'single choice', 'multiple choice', 'mcq'],
        legacy: { headers: ['Question_Prompt', 'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Correct_Answer', 'Explanation', 'Points'], order: ['prompt', 'optA', 'optB', 'optC', 'optD', 'correct', 'explanation', 'points'] },
        examples: ex([
            { prompt: 'The cruise departs ___ Miami every Monday.', optA: 'at', optB: 'from', optC: 'on', optD: 'in', correct: 'B', explanation: 'Cụm từ "depart from somewhere"', points: '1' },
            { prompt: 'She is interested ___ marine biology.', optA: 'in', optB: 'at', optC: 'on', correct: 'A', explanation: 'Cấu trúc "interested in something"', points: '1' }
        ]),
        help: {
            columnNotes: { optA: 'Tối thiểu 2 lựa chọn (A và B); C, D để trống nếu không dùng.', correct: 'Một chữ cái A–D trùng với lựa chọn đã điền.' },
            commonMistakes: ['Đáp án đúng ghi chữ không có trong các lựa chọn (ví dụ E khi chỉ có A–D).', 'Bỏ trống Lựa chọn A hoặc B.']
        }
    },
    {
        code: 'multi_select_group', label: 'Trắc nghiệm chọn nhiều đáp án', family: 'Trắc nghiệm', defaultPoints: 2,
        columns: ['prompt', 'optA', 'optB', 'optC', 'optD', 'optE', 'optF', 'correct', 'points'],
        required: ['prompt', 'optA', 'optB', 'correct'],
        aliases: ['trắc nghiệm nhóm', 'chọn nhiều', 'chọn nhiều đáp án', 'multi select group', 'multi group', 'multiple choice group'],
        legacy: { headers: ['Question_Prompt', 'Correct_Options', 'All_Options', 'Score'], order: ['prompt', 'correct', 'optionsList', 'points'] },
        examples: ex([
            { prompt: 'Which TWO activities are free of charge?', optA: 'Swimming pool', optB: 'Tennis court', optC: 'Fitness center', optD: 'Sauna', optE: 'Yoga class', correct: 'A, C', points: '2' }
        ]),
        help: {
            columnNotes: { correct: 'Các chữ cái đúng, cách nhau bằng dấu phẩy (ví dụ A, C). Điểm là tổng điểm cả câu.' },
            commonMistakes: ['Chỉ ghi một đáp án đúng (dạng này cần từ 2 đáp án đúng trở lên).', 'Ghi chữ cái ngoài các lựa chọn đã điền.']
        }
    },
    {
        code: 'fitb', label: 'Điền từ', family: 'Điền từ', defaultPoints: 1,
        columns: ['prompt', 'correct', 'accepted', 'points'],
        required: ['prompt', 'correct'],
        aliases: ['điền từ', 'dien tu', 'fitb', 'short text', 'điền từ ngắn'],
        legacy: { headers: ['Prompt', 'Target_Answer', 'Points'], order: ['prompt', 'correct', 'points'] },
        examples: ex([
            { prompt: 'The capital of France is ___.', correct: 'Paris', points: '1' },
            { prompt: 'She was born ___ 1995.', correct: 'in', accepted: 'during', points: '1' }
        ]),
        help: {
            columnNotes: { accepted: 'Các đáp án khác cũng được tính đúng, cách nhau bằng |.' },
            commonMistakes: ['Quên đánh dấu chỗ trống bằng ___ trong đề bài.']
        }
    },
    {
        code: 'inline_cloze', label: 'Điền từ nội tuyến (đoạn văn nhiều chỗ trống)', family: 'Điền từ', defaultPoints: 1,
        columns: ['prompt', 'correct', 'points'],
        required: ['prompt', 'correct'],
        aliases: ['điền từ nội tuyến', 'dien tu noi tuyen', 'inline cloze', 'cloze'],
        legacy: { headers: ['Prompt', 'Answers', 'Points'], order: ['prompt', 'correct', 'points'] },
        examples: ex([
            { prompt: 'The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________.', correct: 'six | Nassau', points: '1' }
        ]),
        help: {
            columnNotes: { prompt: 'Đoạn văn có các chỗ trống đánh số (1) ___, (2) ___ hoặc [1], [2].', correct: 'Đáp án từng chỗ trống theo thứ tự, cách nhau bằng |; nhiều cách viết cho một chỗ cách nhau bằng /.', points: 'Điểm cho mỗi chỗ trống.' },
            commonMistakes: ['Số đáp án ít hơn số chỗ trống.', 'Quên đánh số chỗ trống.']
        }
    },
    {
        code: 'vocabulary_pair', label: 'Từ vựng nối nghĩa', family: 'Từ vựng', defaultPoints: 1,
        columns: ['prompt', 'correct', 'points'],
        required: ['prompt', 'correct'],
        aliases: ['từ vựng', 'từ vựng nối nghĩa', 'tu vung', 'vocabulary pair', 'vocab pair', 'vocabulary'],
        legacy: { headers: ['English', 'Vietnamese'], order: ['prompt', 'correct'] },
        examples: ex([
            { prompt: 'destination', correct: 'điểm đến', points: '1' },
            { prompt: 'itinerary', correct: 'lịch trình chuyến đi', points: '1' }
        ]),
        help: { columnNotes: { prompt: 'Từ tiếng Anh.', correct: 'Nghĩa tiếng Việt.' }, commonMistakes: ['Hai từ khác nhau cùng một nghĩa dễ gây nhầm cho học viên.'] }
    },
    {
        code: 'pictorial_vocabulary', label: 'Từ vựng qua ảnh', family: 'Từ vựng', defaultPoints: 1,
        columns: ['image', 'correct', 'hint', 'accepted', 'points'],
        required: ['correct'],
        aliases: ['từ vựng qua ảnh', 'từ vựng ảnh', 'pictorial', 'pictorial vocabulary', 'image vocabulary'],
        legacy: { headers: ['Image_URL', 'Target_Word', 'Vietnamese_Meaning', 'Accepted_Variants', 'Score'], order: ['image', 'correct', 'hint', 'accepted', 'points'] },
        examples: ex([
            { image: 'apple.png', correct: 'apple', hint: 'quả táo', accepted: 'an apple | the apple', points: '1' },
            { image: 'camera.png', correct: 'camera', hint: 'máy ảnh', points: '1' }
        ]),
        help: {
            columnNotes: { image: 'Tên file ảnh (hoặc đường dẫn đầy đủ).', correct: 'Từ tiếng Anh học viên phải điền.', hint: 'Nghĩa tiếng Việt hiện làm gợi ý.' },
            commonMistakes: ['Thiếu ảnh: câu sẽ không có hình để học viên nhìn.']
        }
    },
    {
        code: 'pronunciation_choice', label: 'Phát âm / trọng âm', family: 'Trắc nghiệm', defaultPoints: 1,
        columns: ['prompt', 'optA', 'optB', 'optC', 'optD', 'correct', 'points'],
        required: ['prompt', 'optA', 'optB', 'correct'],
        aliases: ['phát âm', 'phat am', 'trọng âm', 'pronunciation', 'pronunciation choice'],
        legacy: { headers: ['Prompt', 'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Correct_Option', 'Score'], order: ['prompt', 'optA', 'optB', 'optC', 'optD', 'correct', 'points'] },
        examples: ex([
            { prompt: 'camera', optA: '/ˈkæm.ər.ə/', optB: '/kəˈmɪər.ə/', optC: '/ˈkæm.eɪ.rə/', correct: 'A', points: '1' },
            { prompt: 'Chọn từ có trọng âm khác', optA: 'develop', optB: 'remember', optC: 'understand', optD: 'consider', correct: 'C', points: '1' }
        ]),
        help: { columnNotes: { prompt: 'Một từ (hệ thống tự thêm câu dẫn) hoặc một câu hỏi đầy đủ.' }, commonMistakes: ['Đáp án đúng ghi chữ không có trong các lựa chọn.'] }
    },
    {
        code: 'error_correction', label: 'Tìm và sửa lỗi sai', family: 'Viết câu', defaultPoints: 1,
        columns: ['prompt', 'wrongPart', 'correct', 'accepted', 'explanation', 'points'],
        required: ['prompt', 'wrongPart', 'correct'],
        aliases: ['sửa lỗi', 'sửa lỗi sai', 'tìm và sửa lỗi sai', 'sua loi', 'error correction'],
        legacy: { headers: ['Original_Sentence', 'Error_Part', 'Correction', 'Accepted_Variants', 'Explanation'], order: ['prompt', 'wrongPart', 'correct', 'accepted', 'explanation'] },
        examples: ex([
            { prompt: 'There are much people on the ship.', wrongPart: 'much', correct: 'many', accepted: 'a lot of', explanation: 'Much dùng cho danh từ không đếm được', points: '1' },
            { prompt: 'He go to the port yesterday.', wrongPart: 'go', correct: 'went', explanation: 'Quá khứ đơn của go là went', points: '1' }
        ]),
        help: { columnNotes: { prompt: 'Câu có lỗi.', wrongPart: 'Từ/cụm sai, phải có trong đề bài.', correct: 'Cách sửa đúng.' }, commonMistakes: ['Từ sai không xuất hiện trong đề bài.']
        }
    },
    {
        code: 'sentence_transformation', label: 'Viết lại câu', family: 'Viết câu', defaultPoints: 1,
        columns: ['prompt', 'keyword', 'targetSentence', 'correct', 'accepted', 'points'],
        required: ['prompt', 'keyword', 'correct'],
        aliases: ['viết lại câu', 'viet lai cau', 'viết lại', 'sentence transformation', 'sentence rewrite', 'rewrite'],
        legacy: { headers: ['Original_Sentence', 'Mandatory_Keyword', 'Target_Sentence_With_Blank', 'Expected_Answer', 'Accepted_Variants'], order: ['prompt', 'keyword', 'targetSentence', 'correct', 'accepted'] },
        examples: ex([
            { prompt: 'It is not necessary for you to book now.', keyword: 'HAVE', targetSentence: 'You __________ tickets now.', correct: 'do not have to book', accepted: "don't have to book", points: '1' }
        ]),
        help: { columnNotes: { keyword: 'Từ khóa học viên bắt buộc dùng.', targetSentence: 'Câu đích có chỗ trống ____ cho phần học viên viết.', correct: 'Phần điền vào chỗ trống.' }, commonMistakes: ['Quên từ khóa bắt buộc.'] }
    },
    {
        code: 'sentence_reorder', label: 'Sắp xếp câu', family: 'Viết câu', defaultPoints: 1,
        columns: ['prompt', 'correct', 'hint', 'points'],
        required: ['prompt'],
        aliases: ['sắp xếp câu', 'sap xep cau', 'sentence reorder', 'reorder'],
        legacy: { headers: ['Sentence_Text', 'Score', 'Help_Text'], order: ['prompt', 'points', 'hint'] },
        examples: ex([
            { prompt: 'She / has worked / at the company / for five years', hint: 'Thì hiện tại hoàn thành', points: '1' },
            { prompt: 'They / will travel / to Japan / next summer', correct: 'They will travel to Japan next summer.', points: '1' }
        ]),
        help: { columnNotes: { prompt: 'Các từ/cụm từ cách nhau bằng dấu /.', correct: 'Câu hoàn chỉnh (để trống thì ghép theo thứ tự đã nhập).' }, commonMistakes: ['Chỉ có một cụm, không có dấu / ngăn cách.'] }
    },
    {
        code: 'listening_order', label: 'Nghe và sắp xếp thứ tự', family: 'Nghe', defaultPoints: 1,
        columns: ['prompt', 'correct', 'points'],
        required: ['prompt', 'correct'],
        aliases: ['sắp xếp nghe', 'nghe sắp xếp', 'sap xep nghe', 'listening order', 'listening sequence'],
        legacy: { headers: ['Event_Text', 'Correct_Order', 'Score'], order: ['prompt', 'correct', 'points'] },
        examples: ex([
            { prompt: 'Welcome aboard meeting at main lounge', correct: '1', points: '1' },
            { prompt: 'Safety drill and lifeboat inspection', correct: '2', points: '1' },
            { prompt: "Captain's dinner in dining hall", correct: '3', points: '1' }
        ]),
        help: { columnNotes: { prompt: 'Một sự kiện nghe được; các dòng liên tiếp trong cùng bài tập tạo thành một câu sắp xếp.', correct: 'Thứ tự đúng (1, 2, 3…).' }, commonMistakes: ['Hai sự kiện trùng thứ tự.'] }
    },
    {
        code: 'reading_matching', label: 'Ghép tiêu đề với đoạn văn', family: 'Đọc', defaultPoints: 1,
        columns: ['prompt', 'optA', 'optB', 'optC', 'optD', 'optE', 'optF', 'optG', 'optH', 'correct', 'points'],
        required: ['prompt', 'optA', 'optB', 'correct'],
        aliases: ['ghép nối', 'ghép nối đoạn văn', 'ghép tiêu đề', 'ghep noi', 'reading matching', 'matching headings', 'heading matching'],
        legacy: { headers: ['Paragraph_Label', 'Heading_Code', 'Heading_Text', 'Is_Correct', 'Score'], order: ['prompt', 'correct', 'optionsList', 'accepted', 'points'] },
        examples: ex([
            { prompt: 'Paragraph A', optA: 'The spy in the sky', optB: 'The spread of technology', optC: 'The limitations of cameras', correct: 'A', points: '1' },
            { prompt: 'Paragraph B', optA: 'The spy in the sky', optB: 'The spread of technology', optC: 'The limitations of cameras', correct: 'B', points: '1' }
        ]),
        help: { columnNotes: { prompt: 'Tên đoạn văn (Paragraph A…).', optA: 'Danh sách tiêu đề; lặp lại giống nhau ở mọi dòng của cùng bài tập.', correct: 'Chữ cái của tiêu đề đúng cho đoạn này.' }, commonMistakes: ['Danh sách tiêu đề ở các dòng không giống nhau.'] }
    },
    {
        code: 'rubric_async', label: 'Tự luận chấm AI', family: 'Viết / Tự luận', defaultPoints: 4,
        columns: ['prompt', 'context', 'points', 'criterion1', 'criterion2'],
        required: ['prompt'],
        aliases: ['tự luận', 'tự luận chấm ai', 'tu luan', 'rubric', 'rubric async', 'writing'],
        legacy: { headers: ['Prompt', 'Reference_Context', 'Max_Score', 'Preset_Type', 'Criterion_1', 'Criterion_2'], order: ['prompt', 'context', 'points', 'legacyPreset', 'criterion1', 'criterion2'] },
        examples: ex([
            { prompt: 'Translate into English: Chuyến tàu rời cảng lúc 8 giờ sáng.', points: '4', criterion1: 'Độ chính xác ý nghĩa', criterion2: 'Cấu trúc ngữ pháp' },
            { prompt: 'Summarize the main idea of Paragraph A in 50 words.', context: 'Đoạn trích thông tin bài đọc...', points: '4' }
        ]),
        help: { columnNotes: { context: 'Bài đọc/ngữ cảnh AI dùng để đối chiếu (học viên không thấy).', criterion1: 'Tiêu chí 1 (tùy chọn); điểm chia đôi giữa hai tiêu chí.' }, commonMistakes: ['Tự luận kiểu mới (6 dạng, từng Khối) sẽ có cột riêng ở giai đoạn sau.'] }
    }
];
export const TYPE_BY_CODE = Object.fromEntries(TYPES.map(spec => [spec.code, spec]));
const fold = (text) => String(text ?? '').normalize('NFC').toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
// Nhận tên dạng tiếng Việt, tiếng Anh hoặc mã cũ; không nhận ra thì trả undefined (không đoán).
export function resolveTypeCode(raw) {
    const key = fold(raw);
    if (!key)
        return undefined;
    for (const spec of TYPES) {
        if (fold(spec.code) === key || fold(spec.label) === key || spec.aliases.some(alias => fold(alias) === key))
            return spec.code;
    }
    // Dạng nhận gần đúng (giữ cách gọi của file cũ như "Trắc nghiệm nhóm (Multi Select)").
    // Chọn cách gọi dài nhất khớp (ví dụ "trắc nghiệm nhóm" thắng "trắc nghiệm").
    let best;
    for (const spec of TYPES) {
        for (const alias of spec.aliases) {
            const folded = fold(alias);
            if (folded.length > 5 && key.includes(folded) && (!best || folded.length > best.length))
                best = { code: spec.code, length: folded.length };
        }
    }
    return best?.code;
}
const GLOBAL_ALIAS = new Map();
for (const column of COLUMNS) {
    GLOBAL_ALIAS.set(fold(column.label), column.id);
    for (const alias of column.aliases) {
        // Tên một chữ cái (a, b…) chỉ nhận khi cả hàng tiêu đề đã rõ là bộ lựa chọn; tránh nhầm với cột khác.
        if (alias.length === 1)
            continue;
        if (!GLOBAL_ALIAS.has(fold(alias)))
            GLOBAL_ALIAS.set(fold(alias), column.id);
    }
}
// Tên cột cũ phụ thuộc dạng (ví dụ Target_Word = đáp án đúng của từ vựng qua ảnh): tra theo dạng trước, rồi tra chung.
export function resolveHeader(raw, typeCode) {
    const key = fold(raw);
    if (!key)
        return undefined;
    if (typeCode) {
        const spec = TYPE_BY_CODE[typeCode];
        const index = spec.legacy.headers.findIndex(header => fold(header) === key);
        if (index >= 0)
            return spec.legacy.order[index];
    }
    return GLOBAL_ALIAS.get(key);
}
export function isKnownHeader(raw) {
    if (GLOBAL_ALIAS.has(fold(raw)))
        return true;
    return TYPES.some(spec => spec.legacy.headers.some(header => fold(header) === fold(raw)));
}
