// CSV parsing and templates for Test Studio authoring; no DOM or application startup.

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
