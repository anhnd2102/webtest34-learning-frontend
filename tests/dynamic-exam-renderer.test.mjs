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

