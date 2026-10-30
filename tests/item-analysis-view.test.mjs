import test from 'node:test';
import assert from 'node:assert/strict';
import {
  itemAnalysisApiPath,
  renderReportModeSwitch,
  renderItemAnalysisControls,
  renderItemDistributionBar,
  renderItemCard,
  renderItemAnalysisView
} from '../term-tests/teacher-dashboard/shell/analytics/item-analysis-view.js';

test('itemAnalysisApiPath constructs valid items-analysis endpoint URLs', () => {
  assert.equal(
    itemAnalysisApiPath('c101', 'a202'),
    '/api/teacher/classes/c101/assignments/a202/items-analysis'
  );
  assert.equal(
    itemAnalysisApiPath('c101', 'a202', { includeProvisional: true }),
    '/api/teacher/classes/c101/assignments/a202/items-analysis?includeProvisional=true'
  );
  assert.equal(
    itemAnalysisApiPath('Lớp 1', 'Đề #1'),
    '/api/teacher/classes/L%E1%BB%9Bp%201/assignments/%C4%90%E1%BB%81%20%231/items-analysis'
  );
});

test('renderReportModeSwitch renders mode switcher tabs without emoji', () => {
  const html = renderReportModeSwitch('item_analysis');
  assert.match(html, /data-report-mode="distribution"/);
  assert.match(html, /data-report-mode="item_analysis"/);
  assert.match(html, /Phổ điểm lớp/);
  assert.match(html, /Phân tích câu hỏi/);
  assert.match(html, /class="[^"]*active[^"]*"[^>]*data-report-mode="item_analysis"/);
  
  // Design system invariant: No unicode emojis
  assert.doesNotMatch(html, /[\u{1F300}-\u{1F9FF}]/u);
});

test('renderItemAnalysisControls renders skill filter tabs and sorting buttons', () => {
  const html = renderItemAnalysisControls({
    skills: ['LISTENING', 'READING'],
    selectedSkill: 'LISTENING',
    sortCriteria: 'error_rate_desc',
    totalItems: 40
  });

  assert.match(html, /data-skill="ALL"/);
  assert.match(html, /data-skill="LISTENING"/);
  assert.match(html, /data-skill="READING"/);
  assert.match(html, /class="[^"]*active[^"]*"[^>]*data-skill="LISTENING"/);

  assert.match(html, /data-sort="error_rate_desc"/);
  assert.match(html, /data-sort="position_asc"/);
  assert.match(html, /data-sort="unanswered_desc"/);
  assert.match(html, /Sai nhiều nhất/);
  assert.match(html, /Thứ tự đề thi/);
  assert.match(html, /Bỏ trống nhiều nhất/);

  // Invariant: No emojis
  assert.doesNotMatch(html, /[\u{1F300}-\u{1F9FF}]/u);
});

test('renderItemDistributionBar generates color-coded bar segments', () => {
  const item = {
    totalAttempts: 20,
    correctCount: 10,
    partialCount: 2,
    incorrectCount: 6,
    unansweredCount: 2
  };
  const html = renderItemDistributionBar(item);

  assert.match(html, /item-dist-bar/);
  assert.match(html, /bar-segment-correct/);
  assert.match(html, /bar-segment-partial/);
  assert.match(html, /bar-segment-incorrect/);
  assert.match(html, /bar-segment-unanswered/);
});

test('renderItemCard renders card summary and expanded details with student list and expected answer', () => {
  const item = {
    itemVersionId: 'iv-101',
    position: 5,
    prompt: '<p>What is the main topic of the lecture?</p>',
    skill: 'LISTENING',
    maxScore: 1,
    totalAttempts: 10,
    correctCount: 4,
    partialCount: 1,
    incorrectCount: 3,
    unansweredCount: 2,
    errorRate: 0.6,
    expectedAnswer: 'B. Climate change impacts on coastal areas',
    commonWrongAnswers: [
      { answer: 'A. Urban migration', count: 2 },
      { answer: 'C. Deforestation', count: 1 }
    ],
    wrongStudents: [
      {
        studentRef: 'stu-01',
        name: 'Nguyễn Văn A',
        email: 'vana@test.com',
        scoreEarned: 0,
        maxScore: 1,
        verdict: 'incorrect',
        rawAnswer: 'A. Urban migration'
      },
      {
        studentRef: 'stu-02',
        name: 'Trần Thị B',
        email: 'thib@test.com',
        scoreEarned: 0.5,
        maxScore: 1,
        verdict: 'partial',
        rawAnswer: 'B (partial notes)'
      },
      {
        studentRef: 'stu-03',
        name: 'Lê Văn C',
        email: 'vanc@test.com',
        scoreEarned: 0,
        maxScore: 1,
        verdict: 'unanswered',
        rawAnswer: ''
      }
    ]
  };

  // Test collapsed state
  const collapsedHtml = renderItemCard(item, { isExpanded: false });
  assert.match(collapsedHtml, /Câu 5/);
  assert.match(collapsedHtml, /What is the main topic of the lecture\?/);
  assert.match(collapsedHtml, /LISTENING/);
  assert.match(collapsedHtml, /6\/10 học viên/);
  assert.doesNotMatch(collapsedHtml, /Climate change impacts on coastal areas/);

  // Test expanded state
  const expandedHtml = renderItemCard(item, { isExpanded: true });
  assert.match(expandedHtml, /Climate change impacts on coastal areas/);
  assert.match(expandedHtml, /A\. Urban migration/);
  assert.match(expandedHtml, /Nguyễn Văn A/);
  assert.match(expandedHtml, /Trần Thị B/);
  assert.match(expandedHtml, /Lê Văn C/);
  assert.match(expandedHtml, /0\/1/); // Score fraction
  assert.match(expandedHtml, /0\.5\/1/); // Score fraction
  assert.match(expandedHtml, /Chưa trả lời/);

  // Invariant: Do not expose studentRef UUID
  assert.doesNotMatch(expandedHtml, /stu-01/);
  assert.doesNotMatch(expandedHtml, /stu-02/);
  assert.doesNotMatch(expandedHtml, /stu-03/);

  // Design system invariant: No unicode emojis
  assert.doesNotMatch(expandedHtml, /[\u{1F300}-\u{1F9FF}]/u);
});

test('renderItemAnalysisView renders full container or empty state correctly', () => {
  const emptyHtml = renderItemAnalysisView({
    items: [],
    loading: false,
    selectedSkill: 'ALL',
    sortCriteria: 'error_rate_desc'
  });
  assert.match(emptyHtml, /Không có dữ liệu phân tích câu hỏi/);

  const populatedHtml = renderItemAnalysisView({
    items: [
      {
        itemVersionId: 'q1',
        position: 1,
        prompt: 'Sample Q1',
        skill: 'READING',
        totalAttempts: 5,
        correctCount: 5,
        partialCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        errorRate: 0,
        expectedAnswer: 'A',
        commonWrongAnswers: [],
        wrongStudents: []
      }
    ],
    loading: false,
    selectedSkill: 'ALL',
    sortCriteria: 'error_rate_desc'
  });
  assert.match(populatedHtml, /Sample Q1/);
  assert.match(populatedHtml, /Câu 1/);
  assert.doesNotMatch(populatedHtml, /[\u{1F300}-\u{1F9FF}]/u);
});
