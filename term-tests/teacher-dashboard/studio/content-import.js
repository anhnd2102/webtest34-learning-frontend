// CSV parsing and templates for Test Studio authoring; no DOM or application startup.

/**
 * Thẻ câu hỏi do importer sinh ra. Hình dạng khác nhau theo từng loại bài nên chỉ
 * khai báo là bản ghi mở; hợp đồng chi tiết nằm ở test từng parser.
 * @typedef {Record<string, any>} ImportCard
 */
/**
 * @typedef {{ line?: number, rowIndex?: number, row?: string[], raw?: string, reason: string }} InvalidRow
 */
/** @typedef {{ items: ImportCard[], invalidRows: InvalidRow[] }} ImportResult */

/** @param {string} [text] */
export function parseClozeBlanks(text) {
  if (!text || typeof text !== 'string') return [];
  /** @type {{ number: number, [key: string]: any }[]} */
  const blanks = [];
  const pattern = /(?:\((\d+)\)\s*[_\.\u2026]{1,})|(?:\[(\d+)\]\s*[_\.\u2026]*)|(?:\{\{(\d+)\}\})|(?:\((\d+)\))/g;
  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1] || match[2] || match[3] || match[4]);
    blanks.push({
      number: num,
      index: match.index,
      length: match[0].length,
      rawMatch: match[0]
    });
  }
  return blanks;
}

export function parseVocabPairCsv(rawText = '') {
  /** @type {{ validRows: ImportCard[], invalidRows: InvalidRow[] }} */
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
  /** @type {ImportResult} */
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
    /** @type {Record<string, string>} */
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
  /** @type {ImportResult} */
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
  /** @type {ImportResult} */
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
  /** @type {ImportResult} */
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
  const header = 'Event_Text,Correct_Order,Score';
  const rows = [
    'Welcome aboard meeting at main lounge,1,1',
    'Safety drill and lifeboat inspection,2,1',
    "Captain's dinner in dining hall,3,1",
    'Evening musical performance on deck,4,1'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseListeningOrderCsv(rawText = '') {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('event') || firstRow[0]?.includes('section') || firstRow[0]?.includes('title') || firstRow[0]?.includes('sự kiện') || firstRow[1]?.includes('order') || firstRow[1]?.includes('thứ tự')) {
    startIndex = 1;
  }

  // Detect format:
  // Legacy multi-group format: Section_Title, Event_Text, Correct_Order
  // New single-exercise format: Event_Text, Correct_Order, Score
  const isLegacy = firstRow[0]?.includes('section') || (rows[startIndex] && rows[startIndex].length >= 3 && !isNaN(parseInt(rows[startIndex][2], 10)) && isNaN(parseInt(rows[startIndex][1], 10)));

  if (isLegacy) {
    /** @type {Map<string, { text: string, correctRank: number }[]>} */
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

      let group = groups.get(title);
      if (!group) {
        group = [];
        groups.set(title, group);
      }
      group.push({ text, correctRank: rank });
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
  } else {
    // Single-exercise format: Event_Text, Correct_Order, Score
    const events = [];
    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      const text = (row[0] || '').trim();
      const rank = parseInt(row[1], 10);
      const score = (row[2] !== undefined && row[2] !== '' && !isNaN(parseFloat(row[2]))) ? parseFloat(row[2]) : 1;

      if (!text || isNaN(rank)) {
        result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu nội dung sự kiện hoặc thứ tự hợp lệ' });
        continue;
      }

      events.push({
        label: String.fromCharCode(65 + events.length),
        id: `ev_${events.length + 1}`,
        text,
        rank,
        correctRank: rank,
        score
      });
    }

    if (events.length > 0) {
      const totalScore = events.reduce((s, e) => s + (e.score || 1), 0);
      const listeningEvents = events.map(ev => ({
        id: ev.id,
        text: ev.text,
        correctRank: ev.correctRank,
        label: ev.label,
        score: ev.score
      }));

      result.items.push({
        prompt: 'Nghe và sắp xếp thứ tự các sự kiện theo đúng trình tự thời gian',
        interactionType: 'listening_order',
        pedagogicalTypeCode: 'listening_order',
        listeningEvents,
        events,
        maxScore: totalScore
      });
    }
  }

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


export function generateSentenceReorderTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Sentence_Text,Score,Help_Text';
  const rows = [
    '"She / has worked / at the company / for five years",1,"Thì hiện tại hoàn thành"',
    '"They / will travel / to Japan / next summer",1,"Thì tương lai đơn"',
    '"The book / which I bought yesterday / is interesting",1,"Mệnh đề quan hệ"'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseSentenceReorderCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('sentence') || firstRow[0]?.includes('câu') || firstRow[0]?.includes('text')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const rawSentence = (row[0] || '').trim();
    const rawScore = parseFloat(row[1]);
    const maxScore = !isNaN(rawScore) && rawScore > 0 ? rawScore : (defaultPoints || 1);
    const helpText = (row[2] || '').trim();

    if (!rawSentence) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu câu cần sắp xếp' });
      continue;
    }

    let tokens = [];
    if (rawSentence.includes('/')) {
      tokens = rawSentence.split('/').map(t => t.trim()).filter(Boolean);
    } else {
      tokens = rawSentence.split(/\s+/).map(t => t.trim()).filter(Boolean);
    }

    if (tokens.length < 2) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Câu cần ít nhất 2 từ hoặc cụm từ phân tách bởi dấu /' });
      continue;
    }

    const targetSentence = tokens.join(' ').replace(/\s+([.,!?;:])/g, '$1');

    result.items.push({
      prompt: 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:',
      helpText,
      interactionType: 'short_text',
      pedagogicalTypeCode: 'sentence_reorder',
      layoutType: 'token_scramble',
      graderType: 'accepted_text',
      tokens,
      distractors: [],
      targetSentence,
      accepted: [targetSentence],
      maxScore
    });
  }

  return result;
}

export function generatePronunciationTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Prompt,Option_A,Option_B,Option_C,Option_D,Correct_Option,Score';
  const rows = [
    'camera,/ˈkæm.ər.ə/,/kəˈmɪər.ə/,/ˈkæm.eɪ.rə/,,A,1',
    'generous,/ˈdʒen.ər.əs/,/dʒəˈner.əs/,/ˈdʒen.eɪ.rəs/,,A,1',
    'Chọn từ có trọng âm khác,develop,remember,understand,consider,C,1'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parsePronunciationCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('prompt') || firstRow[0]?.includes('từ') || firstRow[0]?.includes('word') || firstRow[1]?.includes('opt')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const rawPrompt = (row[0] || '').trim();
    const optA = (row[1] || '').trim();
    const optB = (row[2] || '').trim();
    const optC = (row[3] || '').trim();
    const optD = (row[4] || '').trim();
    const correctLetter = (row[5] || '').trim().toUpperCase();
    const rawScore = parseFloat(row[6]);
    const maxScore = !isNaN(rawScore) && rawScore > 0 ? rawScore : (defaultPoints || 1);

    if (!rawPrompt || !optA || !optB || !correctLetter) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu từ/đề bài, phương án A/B hoặc đáp án đúng' });
      continue;
    }

    const options = [
      { id: 'A', label: optA },
      { id: 'B', label: optB }
    ];
    if (optC) options.push({ id: 'C', label: optC });
    if (optD) options.push({ id: 'D', label: optD });

    const prompt = (rawPrompt.includes(' ') || rawPrompt.endsWith(':') || rawPrompt.endsWith('?'))
      ? rawPrompt
      : `Choose the correct pronunciation for "${rawPrompt}":`;

    const targetWord = !rawPrompt.includes(' ') ? rawPrompt : '';

    result.items.push({
      prompt,
      targetWord,
      interactionType: 'single_choice',
      pedagogicalTypeCode: 'pronunciation_choice',
      layoutType: 'ipa_card',
      graderType: 'exact_option',
      options,
      expectedOptionId: correctLetter,
      maxScore
    });
  }

  return result;
}

export function generatePictorialVocabTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Image_URL,Target_Word,Vietnamese_Meaning,Accepted_Variants,Score';
  const rows = [
    'assets/test 1/vocabulary/image1.png,apple,quả táo,an apple|the apple,1',
    'assets/test 1/vocabulary/image2.png,camera,máy ảnh,a camera|the camera,1',
    'assets/test 1/vocabulary/image3.png,lighthouse,ngọn hải đăng,a lighthouse,1'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parsePictorialVocabCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('image') || firstRow[0]?.includes('ảnh') || firstRow[1]?.includes('word') || firstRow[1]?.includes('từ')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const imageUrl = (row[0] || '').trim();
    const targetWord = (row[1] || '').trim();
    const vietnamese = (row[2] || '').trim();
    const variantsRaw = (row[3] || '').trim();
    const rawScore = parseFloat(row[4]);
    const maxScore = !isNaN(rawScore) && rawScore > 0 ? rawScore : (defaultPoints || 1);

    if (!targetWord) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu từ vựng mục tiêu (Target_Word)' });
      continue;
    }

    const accepted = [targetWord];
    if (variantsRaw) {
      variantsRaw.split(/[|;]/).forEach(v => {
        const tr = v.trim();
        if (tr && !accepted.includes(tr)) accepted.push(tr);
      });
    }

    result.items.push({
      prompt: targetWord,
      image: imageUrl,
      targetWord,
      captionHint: vietnamese,
      accepted,
      interactionType: 'short_text',
      pedagogicalTypeCode: 'pictorial_vocabulary',
      layoutType: 'pictorial_card',
      graderType: 'accepted_text',
      maxScore
    });
  }

  return result;
}

export function generateReadingMatchingTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Paragraph_Label,Heading_Code,Heading_Text,Is_Correct,Score';
  const rows = [
    'Paragraph A,i,The spy in the sky,true,1',
    'Paragraph A,ii,The spread of technology,false,0',
    'Paragraph A,iii,The limitations of cameras,false,0',
    'Paragraph B,ii,The spread of technology,true,1',
    'Paragraph B,iv,The cost of cameras,false,0',
    'Paragraph C,iii,The limitations of cameras,true,1'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseReadingMatchingCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('para') || firstRow[0]?.includes('đoạn') || firstRow[1]?.includes('code') || firstRow[1]?.includes('heading')) {
    startIndex = 1;
  }

  const headingOptionsMap = new Map();
  const paragraphMap = new Map();

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const paraLabel = (row[0] || '').trim();
    const headingCode = (row[1] || '').trim();
    const headingText = (row[2] || '').trim();
    const fourthCol = (row[3] || '').trim().toLowerCase();
    const fifthCol = (row[4] || '').trim();

    if (!paraLabel || !headingCode) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu tên đoạn văn hoặc mã tiêu đề' });
      continue;
    }

    const fullLabel = headingText ? `${headingCode}. ${headingText}` : headingCode;
    if (!headingOptionsMap.has(headingCode)) {
      headingOptionsMap.set(headingCode, { id: headingCode, label: fullLabel });
    }

    const isFormatA = fourthCol === 'true' || fourthCol === 'false' || fourthCol === '1' || fourthCol === '0';
    const isCorrect = isFormatA ? (fourthCol === 'true' || fourthCol === '1') : true;
    const rawScore = isFormatA ? parseFloat(fifthCol) : parseFloat(fourthCol);
    const score = !isNaN(rawScore) && rawScore > 0 ? rawScore : (defaultPoints || 1);

    if (!paragraphMap.has(paraLabel)) {
      paragraphMap.set(paraLabel, {
        prompt: paraLabel,
        expectedOptionId: isCorrect ? headingCode : null,
        maxScore: score
      });
    } else if (isCorrect) {
      const p = paragraphMap.get(paraLabel);
      p.expectedOptionId = headingCode;
      p.maxScore = score;
    }
  }

  const allHeadings = Array.from(headingOptionsMap.values());

  paragraphMap.forEach((pData) => {
    result.items.push({
      prompt: pData.prompt,
      interactionType: 'single_choice',
      pedagogicalTypeCode: 'reading_matching',
      layoutType: 'split_pane_matching',
      graderType: 'exact_option',
      options: allHeadings.map(h => ({ ...h })),
      expectedOptionId: pData.expectedOptionId || (allHeadings[0]?.id || 'i'),
      maxScore: pData.maxScore
    });
  });

  return result;
}

export function generateRubricAsyncTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Prompt,Reference_Context,Max_Score,Preset_Type,Criterion_1,Criterion_2';
  const rows = [
    '"Translate into English: Chuyến tàu rời cảng lúc 8 giờ sáng.",,4,translation,"Độ chính xác ý nghĩa (2đ)","Cấu trúc ngữ pháp (2đ)"',
    '"Từ ""innovative"" ở dòng 3 có nghĩa là gì?","Đoạn trích thông tin bài đọc...",4,comprehension,"Mức độ hiểu nội dung (2.8đ)","Từ khóa cốt lõi (1.2đ)"'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseRubricAsyncCsv(rawText = '', defaultPoints = 4) {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('prompt') || firstRow[0]?.includes('đề') || firstRow[0]?.includes('câu') || firstRow[1]?.includes('ref')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const prompt = (row[0] || '').trim();
    const referenceContext = (row[1] || '').trim();
    const rawScore = parseFloat(row[2]);
    const maxScore = !isNaN(rawScore) && rawScore > 0 ? rawScore : defaultPoints;
    const presetType = (row[3] || '').trim() || 'rubric_translation_v1';
    const crit1 = (row[4] || '').trim();
    const crit2 = (row[5] || '').trim();

    if (!prompt) {
      result.invalidRows.push({ line: i + 1, row, reason: 'Thiếu đề bài/câu hỏi tự luận' });
      continue;
    }

    const halfScore = Math.round((maxScore / 2) * 10) / 10;
    const criteria = [
      { id: 'crit_1', label: crit1 || 'Ý nghĩa & Nội dung (Meaning / Content)', maxScore: halfScore, requiredConcepts: [] },
      { id: 'crit_2', label: crit2 || 'Ngữ pháp & Từ vựng (Grammar & Lexical)', maxScore: Math.round((maxScore - halfScore) * 10) / 10, requiredConcepts: [] }
    ];

    result.items.push({
      prompt,
      referenceContext,
      helpText: referenceContext,
      interactionType: 'long_text',
      pedagogicalTypeCode: 'writing',
      layoutType: 'default',
      graderType: 'rubric_async',
      maxScore,
      rubricCode: presetType,
      rubricVersion: 1,
      rubric: {
        scoringVersion: presetType,
        maxScore,
        criteria
      }
    });
  }

  return result;
}

export function generateInlineClozeTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Prompt,Answers,Points';
  const rows = [
    '"The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________.",six | Nassau,1',
    '"Water boils at [1] degrees Celsius and freezes at [2] degrees.",100 | 0,1'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseInlineClozeCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('prompt') || firstRow[0]?.includes('câu hỏi') || firstRow[0]?.includes('đoạn văn') || firstRow[1]?.includes('answer') || firstRow[1]?.includes('đáp án') || firstRow[0]?.includes('exercise_title') || firstRow[2]?.includes('question_type')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    let prompt = '';
    let rawAnswer = '';
    let rawScore = NaN;

    if (row.length >= 5 && (row[2]?.toLowerCase().includes('cloze') || firstRow[2]?.includes('type') || firstRow[0]?.includes('exercise_title'))) {
      prompt = (row[3] || '').trim();
      rawAnswer = (row[4] || '').trim();
      rawScore = parseFloat(row[6] || row[5]);
    } else {
      prompt = (row[0] || '').trim();
      rawAnswer = (row[1] || '').trim();
      rawScore = parseFloat(row[2]);
    }

    const score = !isNaN(rawScore) && rawScore > 0 ? rawScore : defaultPoints;

    if (!prompt) {
      result.invalidRows.push({ line: i + 1, rowIndex: i + 1, reason: 'Thiếu đoạn văn / Prompt chứa ô trống' });
      continue;
    }

    const blanks = parseClozeBlanks(prompt);
    if (blanks.length === 0) {
      result.invalidRows.push({ line: i + 1, rowIndex: i + 1, reason: 'Không tìm thấy ký hiệu ô trống (1) _____ hoặc [1] trong Prompt' });
      continue;
    }

    const answersList = rawAnswer ? rawAnswer.split(/[|;]/).map(a => a.trim()) : [];
    /** @type {Record<number, { targetWord: string, accepted: string[] }>} */
    const clozeAnswers = {};
    /** @type {number[]} */
    const uniqueNums = [];
    for (const b of blanks) {
      if (!uniqueNums.includes(b.number)) uniqueNums.push(b.number);
    }

    uniqueNums.forEach((num, idx) => {
      const rawAns = answersList[idx] || '';
      const variants = rawAns ? rawAns.split(/[/]/).map(v => v.trim()).filter(Boolean) : [];
      const mainAns = variants[0] || rawAns;
      clozeAnswers[num] = {
        targetWord: mainAns,
        accepted: variants.length ? variants : (mainAns ? [mainAns] : [])
      };
    });

    const firstTarget = clozeAnswers[uniqueNums[0]]?.targetWord || answersList[0] || '';
    result.items.push({
      prompt,
      interactionType: 'short_text',
      pedagogicalTypeCode: 'inline_cloze',
      layoutType: 'inline_cloze',
      graderType: 'inline_cloze',
      clozeAnswers,
      targetWord: firstTarget,
      accepted: firstTarget ? [firstTarget] : [],
      maxScore: uniqueNums.length * score
    });
  }

  return result;
}

export function generateMultiGroupTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Question_Prompt,Correct_Options,All_Options,Score';
  const rows = [
    '"Which TWO activities are free of charge?","A, C","Swimming pool | Tennis court | Fitness center | Sauna | Yoga class",2',
    '"Which TWO languages does the guide speak?","B, D","French | English | German | Spanish | Italian",2'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function parseMultiGroupCsv(rawText = '', defaultPoints = 2) {
  const rows = parseCsvRows(rawText);
  /** @type {ImportResult} */
  const result = { items: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('prompt') || firstRow[0]?.includes('câu hỏi') || firstRow[1]?.includes('correct') || firstRow[1]?.includes('đáp án')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || (row.length === 1 && !row[0].trim())) continue;
    const prompt = (row[0] || '').trim();
    const rawAnswer = (row[1] || '').trim();
    const rawDetails = (row[2] || '').trim();
    const rawScore = parseFloat(row[3]);
    const score = !isNaN(rawScore) && rawScore > 0 ? rawScore : defaultPoints;

    if (!prompt) {
      result.invalidRows.push({ rowIndex: i + 1, reason: 'Thiếu đề bài câu hỏi' });
      continue;
    }

    const optsList = rawDetails ? rawDetails.split(/[|;]/).map(o => o.trim()).filter(Boolean) : [];
    const options = optsList.length >= 2
      ? optsList.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), label: opt }))
      : [
          { id: 'A', label: 'Phương án A' },
          { id: 'B', label: 'Phương án B' },
          { id: 'C', label: 'Phương án C' },
          { id: 'D', label: 'Phương án D' },
          { id: 'E', label: 'Phương án E' }
        ];

    /** @type {string[]} */

    let correctLetters = [];
    if (rawAnswer) {
      const tokens = rawAnswer.split(/[,|;\s]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
      tokens.forEach(tok => {
        if (/^[A-Z]$/.test(tok)) {
          if (!correctLetters.includes(tok)) correctLetters.push(tok);
        } else {
          const matched = options.find(o => o.label.toLowerCase() === tok.toLowerCase());
          if (matched && !correctLetters.includes(matched.id)) correctLetters.push(matched.id);
        }
      });
    }
    if (correctLetters.length === 0) {
      correctLetters = ['A', 'C'];
    }

    const slotCount = Math.max(correctLetters.length, 2);
    const groupId = `group_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const slotScore = score > 0 ? (score >= slotCount ? Math.round((score / slotCount) * 100) / 100 : score) : 1;

    for (let sIdx = 0; sIdx < slotCount; sIdx++) {
      result.items.push({
        prompt: sIdx === 0 ? prompt : `Chọn đáp án chính xác (Vị trí ${sIdx + 1}):`,
        interactionType: 'multi_choice_group',
        pedagogicalTypeCode: 'multiple_choice_group',
        layoutType: 'grid_3',
        graderType: 'unordered_group_slot',
        groupId,
        options: JSON.parse(JSON.stringify(options)),
        expectedOptionIds: correctLetters,
        required: true,
        maxScore: slotScore
      });
    }
  }

  return result;
}

export function generateBlockExercisesTemplateCsv() {
  const bom = '\uFEFF';
  const header = 'Exercise_Title,Exercise_Instructions,Question_Type,Prompt,Correct_Answer,Options_Or_Details,Score';
  const rows = [
    'Part 1: Grammar & Vocabulary,Chọn đáp án đúng nhất cho mỗi câu hỏi,single_choice,The cruise departs ___ Miami every Monday.,B,at | from | on | in,1',
    ',,single_choice,She is interested ___ marine biology.,A,in | at | on | with,1',
    ',,fitb,Water freezes at ___ degrees Celsius.,0,,1',
    ',,vocabulary_pair,destination,điểm đến,,1',
    ',,error_correction,We have two knife in the kitchen.,knife,knives,1',
    ',,sentence_transformation,It is not necessary to book in advance.,HAVE,You ___ in advance. | do not have to book,1',
    ',,sentence_reorder,"She / has worked / here / for five years",She has worked here for five years.,,1',
    'Part 2: Multiple Choice Group,Chọn các phương án chính xác,multi_select_group,Which TWO activities are free of charge?,A, C,Swimming pool | Tennis court | Fitness center | Sauna | Yoga class,2',
    'Part 3: Inline Cloze Passage,Điền từ thích hợp vào mỗi ô trống trong đoạn văn,inline_cloze,"The cruise departs from Miami and visits (1) __________ Caribbean islands before heading to (2) __________.",six | Nassau,,1',
    'Part 4: Listening Sequence,Nghe và sắp xếp các sự kiện theo trình tự thời gian,listening_order,Welcome aboard meeting at main lounge,1,,1',
    ',,listening_order,Safety drill and lifeboat inspection,2,,1',
    ',,listening_order,Captain\'s dinner in dining hall,3,,1',
    'Part 5: Reading Matching,Đọc đoạn văn và chọn tiêu đề phù hợp,reading_matching,Paragraph A,i,The spy in the sky | The spread of technology,1',
    ',,reading_matching,Paragraph B,ii,The spy in the sky | The spread of technology,1',
    'Part 6: Writing Assessment,Viết đoạn văn ngắn theo yêu cầu,rubric_async,Summarize the main idea of Paragraph A in 50 words.,,Ý chính đầy đủ (2đ) | Ngữ pháp chuẩn (2đ),4'
  ];
  return `${bom}${header}\r\n${rows.join('\r\n')}\r\n`;
}

export function normalizeQuestionType(raw = '') {
  const str = String(raw || '').trim().toLowerCase().replace(/[_-]/g, ' ');
  if (!str) return 'single_choice';
  if (str.includes('nhom') || str.includes('nhóm') || str.includes('multi group') || str.includes('multi select') || str.includes('multiple choice group') || str.includes('trac nghiem nhom') || str.includes('trắc nghiệm nhóm') || str.includes('chon nhieu') || str.includes('chọn nhiều')) {
    return 'multi_select_group';
  }
  if (str.includes('vocab') || str.includes('tu vung') || str.includes('từ vựng')) {
    if (str.includes('anh') || str.includes('ảnh') || str.includes('pictorial') || str.includes('image')) return 'pictorial_vocabulary';
    return 'vocabulary_pair';
  }
  if (str.includes('phat am') || str.includes('phát âm') || str.includes('pronun')) return 'pronunciation_choice';
  if (str.includes('matching') || str.includes('ghep noi') || str.includes('ghép nối') || str.includes('heading')) return 'reading_matching';
  if (str.includes('dien tu noi tuyen') || str.includes('điền từ nội tuyến') || str.includes('inline cloze') || str.includes('cloze')) return 'inline_cloze';
  if (str.includes('trac nghiem') || str.includes('trắc nghiệm') || str.includes('choice') || str === 'mcq') return 'single_choice';
  if (str.includes('dien tu') || str.includes('điền từ') || str.includes('fitb') || str.includes('short text')) return 'fitb';
  if (str.includes('sua loi') || str.includes('sửa lỗi') || str.includes('error correction')) return 'error_correction';
  if (str.includes('viet lai') || str.includes('viết lại') || str.includes('rewrite') || str.includes('transformation')) return 'sentence_transformation';
  if (str.includes('sap xep cau') || str.includes('sắp xếp câu') || str.includes('sentence reorder')) return 'sentence_reorder';
  if (str.includes('sap xep nghe') || str.includes('sắp xếp nghe') || str.includes('listening order')) return 'listening_order';
  if (str.includes('pictorial')) return 'pictorial_vocabulary';
  if (str.includes('tu luan') || str.includes('tự luận') || str.includes('rubric') || str.includes('writing')) return 'rubric_async';
  return 'single_choice';
}

export function parseBlockExercisesCsv(rawText = '', defaultPoints = 1) {
  const rows = parseCsvRows(rawText);
  /** @type {{ exercises: ImportCard[], invalidRows: InvalidRow[] }} */
  const result = { exercises: [], invalidRows: [] };
  if (!rows || rows.length === 0) return result;

  let startIndex = 0;
  const firstRow = rows[0].map(c => (c || '').toLowerCase().trim());
  if (firstRow[0]?.includes('exercise') || firstRow[0]?.includes('title') || firstRow[0]?.includes('bài tập') || firstRow[2]?.includes('type')) {
    startIndex = 1;
  }

  /** @type {Map<string, { instructions?: string, items: ImportCard[], [key: string]: any }>} */
  const exerciseMap = new Map();
  /** @type {(key: string, instructions: string) => { instructions?: string, items: ImportCard[], [key: string]: any }} */
  const ensureExercise = (key, instructions) => {
    let exercise = exerciseMap.get(key);
    if (!exercise) {
      exercise = { title: key, instructions: instructions || '', items: [] };
      exerciseMap.set(key, exercise);
    }
    return exercise;
  };
  /** @type {string | null} */
  let currentExKey = null;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const rawExTitle = (row[0] || '').trim();
    const rawExInst = (row[1] || '').trim();
    const rawType = (row[2] || '').trim();
    const rawPrompt = (row[3] || '').trim();
    let rawAnswer = (row[4] || '').trim();
    let rawDetails = (row[5] || '').trim();
    let rawScore = parseFloat(row[6]);

    // Fault tolerance: If unquoted comma in answer caused split into 8 columns (e.g. A, C)
    if (row.length >= 8 && /^[A-Za-z]$/.test(rawAnswer) && /^[A-Za-z]$/.test((row[5] || '').trim()) && (row[6] || '').includes('|')) {
      rawAnswer = `${rawAnswer}, ${(row[5] || '').trim()}`;
      rawDetails = (row[6] || '').trim();
      rawScore = parseFloat(row[7]);
    }

    const score = !isNaN(rawScore) && rawScore > 0 ? rawScore : (defaultPoints || 1);

    if (rawExTitle) {
      currentExKey = rawExTitle;
      const titled = ensureExercise(currentExKey, rawExInst);
      if (rawExInst && !titled.instructions) titled.instructions = rawExInst;
    }

    if (!currentExKey) currentExKey = 'Bài tập 1';

    const currentEx = ensureExercise(currentExKey, rawExInst);

    if (!rawPrompt && !rawAnswer) {
      continue;
    }

    const qType = normalizeQuestionType(rawType);

    if (qType === 'single_choice') {
      const optsList = rawDetails ? rawDetails.split(/[|;]/).map(o => o.trim()).filter(Boolean) : [];
      const options = optsList.length >= 2
        ? optsList.map((opt, idx) => ({ id: `opt_${String.fromCharCode(97 + idx)}`, label: opt }))
        : [
            { id: 'opt_a', label: 'Option A' },
            { id: 'opt_b', label: 'Option B' },
            { id: 'opt_c', label: 'Option C' },
            { id: 'opt_d', label: 'Option D' }
          ];
      const ansLetter = rawAnswer.toUpperCase() || 'A';
      const expectedOptionId = `opt_${ansLetter.toLowerCase()}`;

      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'single_choice',
        pedagogicalTypeCode: 'multiple_choice',
        layoutType: options.length === 2 ? 'grid_2' : (options.length === 3 ? 'grid_3' : 'grid_4'),
        graderType: 'exact_option',
        options,
        expectedOptionId,
        maxScore: score
      });
    } else if (qType === 'fitb') {
      const variants = rawDetails ? rawDetails.split(/[|;]/).map(v => v.trim()).filter(Boolean) : [];
      const accepted = [rawAnswer, ...variants].filter(Boolean);
      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'short_text',
        pedagogicalTypeCode: 'fitb',
        layoutType: 'default',
        graderType: 'accepted_text',
        targetAnswer: rawAnswer,
        accepted: Array.from(new Set(accepted)),
        maxScore: score
      });
    } else if (qType === 'vocabulary_pair') {
      const english = rawPrompt || rawDetails;
      const vietnamese = rawAnswer;
      currentEx.items.push({
        prompt: english,
        targetWord: english,
        vietnameseMeaning: vietnamese,
        captionHint: vietnamese,
        interactionType: 'text_select_pair',
        pedagogicalTypeCode: 'vocabulary_pair',
        layoutType: 'vocab_pair',
        graderType: 'accepted_text_exact_option',
        accepted: [english],
        options: [],
        expectedOptionId: '',
        maxScore: score
      });
    } else if (qType === 'multi_select_group') {
      const optsList = rawDetails ? rawDetails.split(/[|;]/).map(o => o.trim()).filter(Boolean) : [];
      const options = optsList.length >= 2
        ? optsList.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), label: opt }))
        : [
            { id: 'A', label: 'Phương án A' },
            { id: 'B', label: 'Phương án B' },
            { id: 'C', label: 'Phương án C' },
            { id: 'D', label: 'Phương án D' },
            { id: 'E', label: 'Phương án E' }
          ];

      /** @type {string[]} */

      let correctLetters = [];
      if (rawAnswer) {
        const tokens = rawAnswer.split(/[,|;\s]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
        tokens.forEach(tok => {
          if (/^[A-Z]$/.test(tok)) {
            if (!correctLetters.includes(tok)) correctLetters.push(tok);
          } else {
            const matched = options.find(o => o.label.toLowerCase() === tok.toLowerCase());
            if (matched && !correctLetters.includes(matched.id)) correctLetters.push(matched.id);
          }
        });
      }
      if (correctLetters.length === 0) {
        correctLetters = ['A', 'C'];
      }

      const slotCount = Math.max(correctLetters.length, 2);
      const groupId = `group_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const slotScore = score > 0 ? (score >= slotCount ? Math.round((score / slotCount) * 100) / 100 : score) : 1;

      for (let sIdx = 0; sIdx < slotCount; sIdx++) {
        currentEx.items.push({
          prompt: sIdx === 0 ? (rawPrompt || `Chọn ${slotCount} đáp án chính xác:`) : `Chọn đáp án chính xác (Vị trí ${sIdx + 1}):`,
          interactionType: 'multi_choice_group',
          pedagogicalTypeCode: 'multiple_choice_group',
          layoutType: 'grid_3',
          graderType: 'unordered_group_slot',
          groupId,
          options: JSON.parse(JSON.stringify(options)),
          expectedOptionIds: correctLetters,
          required: true,
          maxScore: slotScore
        });
      }
    } else if (qType === 'inline_cloze') {
      const answersList = rawAnswer ? rawAnswer.split(/[|;]/).map(a => a.trim()) : [];
      const blanks = parseClozeBlanks(rawPrompt || '');
      /** @type {Record<number, { targetWord: string, accepted: string[] }>} */
      const clozeAnswers = {};
      /** @type {number[]} */
      const uniqueNums = [];
      for (const b of blanks) {
        if (!uniqueNums.includes(b.number)) uniqueNums.push(b.number);
      }
      uniqueNums.forEach((num, idx) => {
        const rawAns = answersList[idx] || '';
        const variants = rawAns ? rawAns.split(/[/]/).map(v => v.trim()).filter(Boolean) : [];
        const mainAns = variants[0] || rawAns;
        clozeAnswers[num] = {
          targetWord: mainAns,
          accepted: variants.length ? variants : (mainAns ? [mainAns] : [])
        };
      });
      const firstTarget = clozeAnswers[uniqueNums[0]]?.targetWord || answersList[0] || '';
      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'short_text',
        pedagogicalTypeCode: 'inline_cloze',
        layoutType: 'inline_cloze',
        graderType: 'inline_cloze',
        clozeAnswers,
        targetWord: firstTarget,
        accepted: firstTarget ? [firstTarget] : [],
        maxScore: uniqueNums.length ? uniqueNums.length * score : score
      });
    } else if (qType === 'error_correction') {
      let errorPart = rawAnswer;
      let correction = rawDetails;

      if (!correction && (rawAnswer.includes('->') || rawAnswer.includes('=>') || rawAnswer.includes('→'))) {
        const arrowParts = rawAnswer.split(/->|=>|→/).map(p => p.trim());
        errorPart = arrowParts[0] || '';
        correction = arrowParts[1] || '';
      } else if (!errorPart && (rawDetails.includes('->') || rawDetails.includes('=>') || rawDetails.includes('→'))) {
        const arrowParts = rawDetails.split(/->|=>|→/).map(p => p.trim());
        errorPart = arrowParts[0] || '';
        correction = arrowParts[1] || '';
      }

      const promptLower = (rawPrompt || '').toLowerCase();
      const ansLower = (errorPart || '').toLowerCase();
      const detLower = (correction || '').toLowerCase();

      // Smart Auto-Detect:
      if (detLower && promptLower.includes(detLower) && !promptLower.includes(ansLower)) {
        const tmp = errorPart;
        errorPart = correction;
        correction = tmp;
      }

      const correctionVariants = correction ? correction.split(/[|/]/).map(c => c.trim()).filter(Boolean) : [];
      const mainCorrection = correctionVariants[0] || (correction ? correction.trim() : '');
      const finalCorrections = correctionVariants.length ? correctionVariants : (mainCorrection ? [mainCorrection] : []);
      const errorVariants = errorPart ? [errorPart.trim()] : [];

      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'correction_pair',
        pedagogicalTypeCode: 'error_correction',
        layoutType: 'correction_inline',
        graderType: 'correction_pair',
        targetWord: errorPart.trim(),
        expectedErrors: errorVariants,
        expectedCorrections: finalCorrections,
        accepted: finalCorrections,
        scoringRule: 'split_points',
        maxScore: score
      });
    } else if (qType === 'sentence_transformation') {
      const parts = rawDetails.split(/[|;]/).map(p => p.trim());
      const keyword = (parts[0] || 'KEYWORD').toUpperCase();
      const targetSentence = parts[1] || '(1) __________';
      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'short_text',
        pedagogicalTypeCode: 'sentence_rewrite',
        layoutType: 'keyword_transformation',
        graderType: 'accepted_text',
        mandatoryKeyword: keyword,
        targetSentence,
        accepted: [rawAnswer],
        maxScore: score
      });
    } else if (qType === 'sentence_reorder') {
      let tokens = [];
      if (rawPrompt.includes('/')) {
        tokens = rawPrompt.split('/').map(t => t.trim()).filter(Boolean);
      } else {
        tokens = rawPrompt.split(/\s+/).map(t => t.trim()).filter(Boolean);
      }
      const targetSentence = rawAnswer || tokens.join(' ');
      currentEx.items.push({
        prompt: 'Sắp xếp các từ/cụm từ sau thành câu hoàn chỉnh:',
        interactionType: 'short_text',
        pedagogicalTypeCode: 'sentence_reorder',
        layoutType: 'token_scramble',
        graderType: 'accepted_text',
        tokens,
        distractors: [],
        targetSentence,
        accepted: [targetSentence],
        helpText: rawDetails || '',
        maxScore: score
      });
    } else if (qType === 'listening_order') {
      const rank = parseInt(rawAnswer, 10) || (currentEx.items.filter(it => it.pedagogicalTypeCode === 'listening_order').length + 1);
      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'listening_order',
        pedagogicalTypeCode: 'listening_order',
        layoutType: 'timeline_sequence',
        graderType: 'exact_option',
        correctRank: rank,
        rank,
        text: rawPrompt,
        maxScore: score
      });
    } else if (qType === 'pictorial_vocabulary') {
      const variants = rawDetails ? rawDetails.split(/[|;]/).map(v => v.trim()).filter(Boolean) : [];
      currentEx.items.push({
        prompt: rawAnswer,
        image: rawPrompt,
        targetWord: rawAnswer,
        accepted: Array.from(new Set([rawAnswer, ...variants])),
        interactionType: 'short_text',
        pedagogicalTypeCode: 'pictorial_vocabulary',
        layoutType: 'pictorial_card',
        graderType: 'accepted_text',
        maxScore: score
      });
    } else if (qType === 'pronunciation_choice') {
      const opts = rawDetails ? rawDetails.split(/[|;]/).map(o => o.trim()).filter(Boolean) : ['/a/', '/b/'];
      const options = opts.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), label: opt }));
      currentEx.items.push({
        prompt: rawPrompt.includes(' ') ? rawPrompt : `Choose the correct pronunciation for "${rawPrompt}":`,
        targetWord: !rawPrompt.includes(' ') ? rawPrompt : '',
        interactionType: 'single_choice',
        pedagogicalTypeCode: 'pronunciation_choice',
        layoutType: 'ipa_card',
        graderType: 'exact_option',
        options,
        expectedOptionId: rawAnswer.toUpperCase() || 'A',
        maxScore: score
      });
    } else if (qType === 'reading_matching') {
      const headings = rawDetails ? rawDetails.split(/[|;]/).map(h => h.trim()).filter(Boolean) : ['Heading i', 'Heading ii'];
      const options = headings.map((h, idx) => {
        const id = `h_${idx + 1}`;
        return { id, label: h };
      });
      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'single_choice',
        pedagogicalTypeCode: 'reading_matching',
        layoutType: 'split_pane_matching',
        graderType: 'exact_option',
        options,
        expectedOptionId: rawAnswer || options[0]?.id || 'h_1',
        maxScore: score
      });
    } else if (qType === 'rubric_async') {
      const criteriaTexts = rawDetails ? rawDetails.split(/[|;]/).map(c => c.trim()).filter(Boolean) : [];
      const half = Math.round((score / 2) * 10) / 10;
      const criteria = criteriaTexts.length >= 2
        ? [
            { id: 'crit_1', label: criteriaTexts[0], maxScore: half, requiredConcepts: [] },
            { id: 'crit_2', label: criteriaTexts[1], maxScore: Math.round((score - half) * 10) / 10, requiredConcepts: [] }
          ]
        : [
            { id: 'crit_1', label: 'Ý nghĩa & Nội dung', maxScore: half, requiredConcepts: [] },
            { id: 'crit_2', label: 'Ngữ pháp & Diễn đạt', maxScore: Math.round((score - half) * 10) / 10, requiredConcepts: [] }
          ];

      currentEx.items.push({
        prompt: rawPrompt,
        referenceContext: rawAnswer,
        helpText: rawAnswer,
        interactionType: 'long_text',
        pedagogicalTypeCode: 'writing',
        layoutType: 'default',
        graderType: 'rubric_async',
        maxScore: score,
        rubricCode: 'rubric_async_custom',
        rubricVersion: 1,
        rubric: {
          scoringVersion: 'rubric_async_custom',
          maxScore: score,
          criteria
        }
      });
    } else {
      // Fallback short_text
      currentEx.items.push({
        prompt: rawPrompt,
        interactionType: 'short_text',
        pedagogicalTypeCode: 'short_text',
        layoutType: 'default',
        graderType: 'accepted_text',
        targetAnswer: rawAnswer,
        accepted: [rawAnswer],
        maxScore: score
      });
    }
  }

  // Finalize vocabulary_pair meaning options per exercise
  exerciseMap.forEach((ex) => {
    const vocabItems = ex.items.filter(it => it.pedagogicalTypeCode === 'vocabulary_pair' || it.interactionType === 'text_select_pair');
    if (vocabItems.length > 0) {
      const allMeanings = Array.from(new Set(vocabItems.map(it => it.vietnameseMeaning || it.captionHint).filter(Boolean)));
      allMeanings.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
      const options = allMeanings.map((m, idx) => ({
        id: `meaning-${String(idx + 1).padStart(2, '0')}`,
        label: m
      }));
      vocabItems.forEach(it => {
        it.options = options;
        const matchingOpt = options.find(o => o.label === (it.vietnameseMeaning || it.captionHint));
        if (matchingOpt) {
          it.expectedOptionId = matchingOpt.id;
        } else if (options.length > 0) {
          it.expectedOptionId = options[0].id;
        }
      });
    }
  });

  // Finalize listening_order if any: group into single listening_order exercise card if multiple events exist
  exerciseMap.forEach((ex) => {
    const listeningEvents = ex.items.filter(it => it.pedagogicalTypeCode === 'listening_order');
    if (listeningEvents.length > 1) {
      const nonListening = ex.items.filter(it => it.pedagogicalTypeCode !== 'listening_order');
      listeningEvents.sort((a, b) => a.correctRank - b.correctRank);
      const combinedCard = {
        prompt: ex.instructions || 'Nghe và sắp xếp thứ tự các sự kiện theo đúng trình tự thời gian',
        interactionType: 'listening_order',
        pedagogicalTypeCode: 'listening_order',
        layoutType: 'timeline_sequence',
        graderType: 'exact_option',
        listeningEvents: listeningEvents.map((ev, idx) => ({
          id: `ev_${idx + 1}`,
          label: String.fromCharCode(65 + idx),
          text: ev.text || ev.prompt,
          correctRank: ev.correctRank,
          score: ev.maxScore || 1
        })),
        events: listeningEvents.map((ev, idx) => ({
          id: `ev_${idx + 1}`,
          label: String.fromCharCode(65 + idx),
          text: ev.text || ev.prompt,
          correctRank: ev.correctRank,
          score: ev.maxScore || 1
        })),
        maxScore: listeningEvents.reduce((s, ev) => s + (ev.maxScore || 1), 0)
      };
      ex.items = [...nonListening, combinedCard];
    }
    result.exercises.push(ex);
  });

  return result;
}
