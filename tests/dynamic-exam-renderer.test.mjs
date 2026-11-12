import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getItemSpanCount,
  getTotalItemCount,
  getAnsweredCount,
  formatOptionDisplayLetter,
  renderSectionNavPills,
  renderQuestionNavigator,
  renderSidePanel,
  renderDynamicExam,
  renderQuestionCard,
  initDynamicExamInteractions
} from '../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs';

test('dynamic-exam-renderer: computes total items and answered count accurately', () => {
  const definition = {
    title: 'IZONE · Khối 03 · Đề thi mới',
    blocks: [
      {
        title: 'LISTENING',
        items: [
          { itemVersionId: 'it-1', position: 1, interactionType: 'short_text' },
          { itemVersionId: 'it-2', position: 2, interactionType: 'long_text' }
        ]
      },
      {
        title: 'VOCABULARY',
        items: [
          { itemVersionId: 'it-3', position: 3, interactionType: 'text_select_pair' },
          { itemVersionId: 'it-4', position: 4, interactionType: 'text_select_pair' },
          { itemVersionId: 'it-5', position: 5, interactionType: 'single_choice' }
        ]
      }
    ]
  };

  assert.equal(getTotalItemCount(definition), 5);

  const answers = {
    'it-1': 'answer 1',
    'it-3': ['word', 'opt-1'],
    'it-4': ['', ''] // empty pair should not count
  };

  assert.equal(getAnsweredCount(definition, answers), 2);
});

test('dynamic-exam-renderer: getItemSpanCount handles inline cloze multi-blanks and timeline events', () => {
  const standardItem = { position: 1, interactionType: 'single_choice' };
  assert.equal(getItemSpanCount(standardItem), 1);

  const clozeItem = {
    position: 2,
    interactionType: 'short_text',
    layoutType: 'inline_cloze',
    prompt: 'Sentence with (1) _____ and (2) _____ and (3) _____ blanks.'
  };
  assert.equal(getItemSpanCount(clozeItem), 3);

  const listeningOrderItem = {
    position: 5,
    pedagogicalTypeCode: 'listening_order',
    events: ['Step A', 'Step B', 'Step C', 'Step D']
  };
  assert.equal(getItemSpanCount(listeningOrderItem), 4);
});

test('dynamic-exam-renderer: formatOptionDisplayLetter maps keys correctly', () => {
  assert.equal(formatOptionDisplayLetter('a', 0), 'A');
  assert.equal(formatOptionDisplayLetter('opt-b', 1), 'B');
  assert.equal(formatOptionDisplayLetter('', 2), 'C');
  assert.equal(formatOptionDisplayLetter('meaning-01', 0), 'A');
});

test('dynamic-exam-renderer: renderSectionNavPills outputs pill buttons with badges', () => {
  const definition = {
    blocks: [
      { title: 'Listening', items: [{ position: 1 }, { position: 2 }] },
      { title: 'Vocabulary', items: [{ position: 3 }] }
    ]
  };
  const html = renderSectionNavPills(definition, 0);
  assert.ok(html.includes('simulation-nav-pill'), 'Must include simulation-nav-pill');
  assert.ok(html.includes('Listening'), 'Must include section title');
  assert.ok(html.includes('2 câu'), 'Must include question count');
});

test('dynamic-exam-renderer: renderQuestionNavigator creates buttons with section target and answered state', () => {
  const definition = {
    blocks: [
      {
        title: 'Block 1',
        items: [
          { itemVersionId: 'q1', position: 1 },
          { itemVersionId: 'q2', position: 2 }
        ]
      }
    ]
  };
  const answers = { q1: 'done' };
  const html = renderQuestionNavigator(definition, answers);
  assert.ok(html.includes('btn-qnav answered'), 'q1 should have answered class');
  assert.ok(html.includes('data-section-target="sim-block-0"'), 'Should target sim-block-0');
  assert.ok(html.includes('data-pos="1"'), 'Should include data-pos');
});

test('dynamic-exam-renderer: renderSidePanel creates progress bar, section buttons, and navigator card', () => {
  const definition = {
    blocks: [
      {
        title: 'Phần 1',
        items: [{ itemVersionId: 'q1', position: 1 }]
      }
    ]
  };
  const sideHtml = renderSidePanel(definition, { answers: { q1: 'ok' } }, 0);
  assert.ok(sideHtml.includes('progress-ratio'), 'Must have progress ratio');
  assert.ok(sideHtml.includes('question-navigator-card'), 'Must have question-navigator-card');
  assert.ok(sideHtml.includes('question-navigator-grid'), 'Must have question-navigator-grid');
});

test('dynamic-exam-renderer: renderDynamicExam outputs HTML containing question cards and tables', () => {
  const container = {
    innerHTML: '',
    addEventListener: () => {},
    querySelectorAll: () => []
  };

  const definition = {
    title: 'Test Exam',
    blocks: [
      {
        title: 'VOCABULARY',
        items: [
          {
            itemVersionId: 'v1',
            position: 1,
            interactionType: 'text_select_pair',
            options: [{ id: 'opt-a', label: 'tháng hai' }]
          },
          {
            itemVersionId: 'p1',
            position: 2,
            interactionType: 'short_text',
            pedagogicalTypeCode: 'pictorial_vocabulary',
            layoutType: 'pictorial_card',
            letterHint: 'F_ _ _ _ _ _ _'
          }
        ]
      }
    ]
  };

  const state = { answers: {} };

  renderDynamicExam(definition, container, {
    state,
    activeSection: 'VOCABULARY',
    onAnswerChange: () => {}
  });

  assert.ok(container.innerHTML.includes('candidate-vocab-table'), 'Should include vocab table HTML');
  assert.ok(container.innerHTML.includes('candidate-pictorial-card'), 'Should include pictorial card HTML');
  assert.ok(container.innerHTML.includes('F_ _ _ _ _ _ _'), 'Should render letter hint');
});

test('dynamic-exam-renderer: mọi ô trả lời tắt kiểm tra chính tả và tự sửa/viết hoa', () => {
  // Dạng theo block (bảng từ vựng, thẻ hình, nhóm câu ngắn) dựng qua renderDynamicExam, mỗi dạng một block;
  // dạng từng câu gọi thẳng renderQuestionCard vì câu đứng một mình có thể bị gom vào nhóm câu ngắn.
  const blockItems = [
    { itemVersionId: 'v1', position: 1, interactionType: 'text_select_pair', options: [{ id: 'a', label: 'tháng hai' }] },
    { itemVersionId: 'p1', position: 2, interactionType: 'short_text', pedagogicalTypeCode: 'pictorial_vocabulary', layoutType: 'pictorial_card', letterHint: 'F_ _' },
    { itemVersionId: 's1', position: 3, interactionType: 'short_text', prompt: 'Câu 3?' }
  ];
  const cardItems = [
    { itemVersionId: 'c1', position: 5, interactionType: 'short_text', layoutType: 'inline_cloze', prompt: 'A (1) _____ b (2) _____.' },
    { itemVersionId: 'r1', position: 7, interactionType: 'short_text', pedagogicalTypeCode: 'sentence_rewrite', prompt: 'Viết lại.' },
    { itemVersionId: 'o1', position: 8, interactionType: 'short_text', pedagogicalTypeCode: 'sentence_reorder', prompt: 'a / b / c' },
    { itemVersionId: 'e1', position: 9, interactionType: 'correction_pair', prompt: 'Tìm lỗi.' },
    { itemVersionId: 'w1', position: 10, interactionType: 'long_text', prompt: 'Viết đoạn văn.' },
    { itemVersionId: 'x1', position: 11, interactionType: 'short_text', graderType: 'exact', prompt: 'Câu 11?' }
  ];
  const html = [
    ...blockItems.map(item => {
      const container = { innerHTML: '', addEventListener: () => {}, querySelectorAll: () => [] };
      renderDynamicExam({ title: 'Spellcheck', blocks: [{ title: 'A', items: [item] }] }, container, { state: { answers: {} }, activeSection: 'A', onAnswerChange: () => {} });
      return container.innerHTML;
    }),
    ...cardItems.map(item => renderQuestionCard(item, {}))
  ].join('');
  const fields = html.match(/<(?:input type="text"|textarea)(?=[\s>])[^>]*>/g) || [];
  for (const cls of ['candidate-vocab-text-input', 'candidate-pictorial-input', 'inline-fill-input', 'candidate-transformation-input',
    'candidate-reorder-input', 'candidate-error-input', 'candidate-correction-input', 'candidate-open-textarea']) {
    assert.ok(fields.some(f => f.includes(cls)), `thiếu ô ${cls} trong đề thử`);
  }
  for (const field of fields) {
    for (const attr of ['spellcheck="false"', 'autocorrect="off"', 'autocapitalize="none"']) {
      assert.ok(field.includes(attr), `thiếu ${attr}: ${field.slice(0, 80)}`);
    }
  }
});

test('dynamic-exam-renderer: convertGoogleDriveAudioUrl converts drive file link to stream endpoint', async () => {
  const { convertGoogleDriveAudioUrl } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const driveUrl = 'https://drive.google.com/file/d/1a2b3c4d5e6f/view?usp=sharing';
  const converted = convertGoogleDriveAudioUrl(driveUrl);
  assert.ok(converted.includes('drive-stream?id=1a2b3c4d5e6f'), 'Should contain stream endpoint and file id');

  const standardUrl = 'https://example.com/audio.mp3';
  assert.equal(convertGoogleDriveAudioUrl(standardUrl), standardUrl);
});

test('dynamic-exam-renderer: renderAudioDockHtml produces strict dock with play button (no play count badge, single listen)', async () => {
  const { renderAudioDockHtml } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  const html = renderAudioDockHtml('https://example.com/audio.mp3', 'Bài nghe Phần 1', 1);
  assert.ok(html.includes('strict-audio-dock'), 'Should include strict-audio-dock class');
  assert.ok(html.includes('btn-sim-audio-play'), 'Should include red play button');
  assert.equal(html.includes('data-listen-badge'), false, 'Should NOT include listen count badge');
  assert.equal(html.includes('Lượt:'), false, 'Should NOT display listen count text');
  assert.ok(html.includes('sim-audio-timeline'), 'Should include audio duration timeline');
});

test('dynamic-exam-renderer: renderInlineCloze preserves rich HTML markup without raw escaping', async () => {
  const { renderInlineCloze, renderQuestionCard, formatPedagogicalTypeLabel } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');

  const richClozeItem = {
    itemVersionId: 'cloze-1',
    position: 1,
    pedagogicalTypeCode: 'table_completion',
    layoutType: 'table_completion',
    interactionType: 'short_text',
    prompt: `I'm busy right now.<br><br>John (1) ........ (not/study) very hard. <div>What (2) ........ (he/do)?</div> Animals (3) ........ oxygen and&nbsp; (4) ........ carbon dioxide.`
  };

  const clozeHtml = renderInlineCloze(richClozeItem, { 'cloze-1': { 1: 'is not studying' } });

  // Must preserve real HTML tags, NOT turn into &lt;br&gt; or &lt;div&gt;
  assert.ok(!clozeHtml.includes('&lt;br&gt;'), 'Must NOT escape <br> to &lt;br&gt;');
  assert.ok(!clozeHtml.includes('&lt;div&gt;'), 'Must NOT escape <div> to &lt;div&gt;');
  assert.ok(!clozeHtml.includes('&lt;/div&gt;'), 'Must NOT escape </div> to &lt;/div&gt;');
  assert.ok(clozeHtml.includes('<br>'), 'Must retain literal <br> tag');
  assert.ok(clozeHtml.includes('<div>What'), 'Must retain literal <div> tag');
  assert.ok(clozeHtml.includes('and&nbsp;'), 'Must retain literal &nbsp;');
  assert.ok(clozeHtml.includes('cbt-blank-pill'), 'Must render modern blank pill');
  assert.ok(clozeHtml.includes('value="is not studying"'), 'Must render existing answer value');

  // Test question card span and pedagogical label
  const cardHtml = renderQuestionCard(richClozeItem, {});
  assert.ok(cardHtml.includes('Câu 1 – 4'), 'Should display question span Câu 1 – 4 for 4 blanks');
  assert.ok(cardHtml.includes('Điền từ vào đoạn văn'), 'Should format TABLE_COMPLETION to friendly Vietnamese');
  assert.ok(!cardHtml.includes('TABLE_COMPLETION'), 'Must not display technical database enum TABLE_COMPLETION');
});

test('dynamic-exam-renderer: formatPedagogicalTypeLabel maps technical codes to friendly Vietnamese', async () => {
  const { formatPedagogicalTypeLabel } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');

  assert.equal(formatPedagogicalTypeLabel({ pedagogicalTypeCode: 'table_completion' }), 'Điền từ vào đoạn văn');
  assert.equal(formatPedagogicalTypeLabel({ interactionType: 'single_choice' }), 'Trắc nghiệm 1 đáp án');
  assert.equal(formatPedagogicalTypeLabel({ interactionType: 'multi_choice_group' }), 'Trắc nghiệm chọn nhiều');
  assert.equal(formatPedagogicalTypeLabel({ pedagogicalTypeCode: 'sentence_rewrite' }), 'Viết lại câu');
  assert.equal(formatPedagogicalTypeLabel({ pedagogicalTypeCode: 'sentence_reorder' }), 'Sắp xếp câu');
  assert.equal(formatPedagogicalTypeLabel({ pedagogicalTypeCode: 'error_correction' }), 'Tìm & sửa lỗi sai');
  assert.equal(formatPedagogicalTypeLabel({ pedagogicalTypeCode: 'reading_matching' }), 'Ghép nối thông tin');
  assert.equal(formatPedagogicalTypeLabel({ pedagogicalTypeCode: 'listening_order' }), 'Sắp xếp thứ tự nghe');
  assert.equal(formatPedagogicalTypeLabel({ pedagogicalTypeCode: 'pictorial_vocabulary' }), 'Từ vựng qua ảnh');
  assert.equal(formatPedagogicalTypeLabel({ interactionType: 'text_select_pair' }), 'Cặp từ vựng');
  assert.equal(formatPedagogicalTypeLabel({ graderType: 'rubric_async' }), 'Tự luận');
});

test('dynamic-exam-renderer: renderQuestionCard outputs structured listening_order layout with event pool and timeline slots', async () => {
  const { renderQuestionCard } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');

  const listeningOrderItem = {
    itemVersionId: 'lo-item-1',
    position: 51,
    pedagogicalTypeCode: 'listening_order',
    layoutType: 'timeline_sequence',
    prompt: 'Nghe và sắp xếp thứ tự chuỗi hoạt động từ A đến E:',
    events: [
      { label: 'A', text: 'American families are changing from the way they used to be.' },
      { label: 'B', text: 'Many US marriages end in divorce.' },
      { label: 'C', text: 'The changing family types.' },
      { label: 'D', text: 'An explanation for the decrease.' },
      { label: 'E', text: 'The main difference is that families are smaller.' }
    ],
    audioUrl: 'https://example.com/audio.mp3'
  };

  const html = renderQuestionCard(listeningOrderItem, { 'lo-item-1': { 1: 'A', 2: 'E' } });

  assert.ok(html.includes('cbt-listening-order-wrap'), 'Must contain listening order wrap');
  assert.ok(html.includes('cbt-events-pool'), 'Must contain events pool');
  assert.ok(html.includes('American families are changing'), 'Must contain event text');
  assert.ok(html.includes('cbt-timeline-slots'), 'Must contain timeline slots');
  assert.ok(html.includes('Câu 51'), 'Must render slot for position 51');
  assert.ok(html.includes('Câu 55'), 'Must render slot for position 55');
  assert.ok(html.includes('Thứ 1'), 'Must render label for step 1');
  assert.ok(html.includes('Thứ 5'), 'Must render label for step 5');
  assert.ok(html.includes('cbt-sequence-select'), 'Must render sequence select dropdown');
  assert.ok(html.includes('is-selected-event'), 'Must mark selected events A and E as used in pool');
  assert.ok(!html.includes('Gõ câu trả lời của bạn...'), 'Must NOT fall back to short text input!');
});

test('dynamic-exam-renderer: đề đọc ghép dựng hai tab Bài đọc/Câu hỏi, mặc định mở Bài đọc', () => {
  const container = { innerHTML: '', addEventListener: () => {}, querySelectorAll: () => [] };
  const definition = {
    title: 'Reading',
    blocks: [{
      title: 'READING',
      readingPassage: '<p>Đoạn văn</p>',
      items: [{ itemVersionId: 'r1', position: 1, interactionType: 'single_choice', pedagogicalTypeCode: 'reading_matching', options: [{ id: 'a', text: 'A' }] }]
    }]
  };
  renderDynamicExam(definition, container, { state: { answers: {} }, activeSection: 'READING', onAnswerChange: () => {} });
  const html = container.innerHTML;
  assert.match(html, /class="split-pane-mobile-toggle" role="tablist"/);
  assert.match(html, /role="tab"[^>]*data-pane="reading"[^>]*aria-selected="true"/);
  assert.match(html, /role="tab"[^>]*data-pane="questions"[^>]*aria-selected="false"/);
  assert.match(html, /id="split-pane-0"[^>]*data-active-pane="reading"/);
  assert.ok(html.includes('Câu hỏi (1)'), 'tab Câu hỏi phải kèm số câu');
});

test('isKeyboardOpen phân biệt bàn phím với phóng to và thanh địa chỉ', async () => {
  const { isKeyboardOpen } = await import('../term-tests/webtest-34-demo/dynamic-exam-renderer.mjs');
  assert.equal(isKeyboardOpen({ height: 844, scale: 1 }, 844), false);
  assert.equal(isKeyboardOpen({ height: 500, scale: 1 }, 844), true, 'bàn phím che hơn 120px');
  assert.equal(isKeyboardOpen({ height: 422, scale: 2 }, 844), false, 'phóng to 2 lần không phải bàn phím');
  assert.equal(isKeyboardOpen({ height: 780, scale: 1 }, 844), false, 'thanh địa chỉ co giãn không phải bàn phím');
});

test('dynamic-exam-renderer: câu điền chỗ trống không bị gom thành câu trả lời ngắn (#39)', () => {
  const prompt = 'Fill in: The career (1) ........ and the money (2) ........ matter.';
  for (const extra of [
    { layoutType: 'table_completion' },
    { pedagogicalTypeCode: 'table_completion' },
    { pedagogicalTypeCode: 'inline_cloze' },
    {}
  ]) {
    const container = { innerHTML: '', addEventListener: () => {}, querySelectorAll: () => [] };
    const definition = { title: 'T', blocks: [{ title: 'Phần A', items: [
      { itemVersionId: 'c1', position: 1, interactionType: 'short_text', prompt, ...extra }
    ] }] };
    renderDynamicExam(definition, container, { state: { answers: {} }, activeSection: 'Phần A', onAnswerChange: () => {} });
    const html = container.innerHTML;
    const label = JSON.stringify(extra);
    assert.ok(html.includes('cbt-cloze-content'), `${label}: phải dựng thành điền chỗ trống`);
    assert.ok(!html.includes('candidate-short-qa'), `${label}: không được gom vào nhóm câu trả lời ngắn`);
    assert.equal(getItemSpanCount(definition.blocks[0].items[0]), 2, `${label}: đếm đúng số ô`);
  }
});

test('dynamic-exam-renderer: bản nháp cũ dạng chuỗi chỉ vào ô trống đầu, không mất khi sửa ô khác (#39)', () => {
  const item = { itemVersionId: 'c1', position: 1, interactionType: 'short_text', layoutType: 'table_completion',
    prompt: 'The career (1) ........ and the money (2) ........ matter.' };
  const html = renderQuestionCard(item, { c1: 'interesting' });
  const values = [...html.matchAll(/data-position="(\d+)" placeholder="" value="([^"]*)"/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(values, [['1', 'interesting'], ['2', '']]);

  // Học viên gõ vào ô (2): state phải giữ cả đáp án cũ ở ô (1).
  const blank = (pos, value) => ({
    value,
    classList: { contains: () => false },
    getAttribute: name => ({ 'data-item-id': 'c1', 'data-position': pos })[name] ?? null,
    closest: sel => (sel === '.inline-blank-wrapper' ? { classList: { toggle() {} } } : null)
  });
  const inputs = [blank('1', 'interesting'), blank('2', 'money')];
  const listeners = {};
  const root = {
    querySelectorAll: sel => (sel === '.inline-fill-input' ? inputs : []),
    querySelector: () => null,
    addEventListener: (name, fn) => { (listeners[name] ||= []).push(fn); }
  };
  const state = { answers: { c1: 'interesting' }, unlockedAudioBlocks: new Set() };
  const changes = [];
  initDynamicExamInteractions(root, { definition: { blocks: [] }, state, onAnswerChange: (id, v) => changes.push([id, v]) });
  listeners.input.forEach(fn => fn({ target: inputs[1] }));
  assert.deepEqual(state.answers.c1, { 1: 'interesting', 2: 'money' });
  assert.deepEqual(changes.at(-1), ['c1', { 1: 'interesting', 2: 'money' }]);
});
