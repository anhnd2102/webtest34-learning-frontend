import test from 'node:test';
import assert from 'node:assert/strict';
import { reportApiPath, formatScoreFraction, renderHistogramSvg, renderEmptyState, renderDrilldownTable, renderScoreDistributionView } from '../term-tests/teacher-dashboard/shell/analytics/score-distribution-view.js';

test('reportApiPath constructs valid teacher report endpoint URLs', () => {
  assert.equal(
    reportApiPath('101', 'assign-1'),
    '/api/teacher/classes/101/assignments/assign-1/report'
  );
  assert.equal(
    reportApiPath('101', 'assign-1', { includeProvisional: true }),
    '/api/teacher/classes/101/assignments/assign-1/report?includeProvisional=true'
  );
  assert.equal(
    reportApiPath('Lớp A', 'bài/1'),
    '/api/teacher/classes/L%E1%BB%9Bp%20A/assignments/b%C3%A0i%2F1/report'
  );
});

test('formatScoreFraction strictly formats achieved/max without %', () => {
  assert.equal(formatScoreFraction(80, 100), '80/100');
  assert.equal(formatScoreFraction(35.5, 50), '35.5/50');
  assert.equal(formatScoreFraction(0, 10), '0/10');
  assert.equal(formatScoreFraction(null, 100), '—');
  assert.equal(formatScoreFraction(undefined, 100), '—');
  assert.equal(formatScoreFraction('', 100), '—');
  
  // Design system invariant: Never contain percentage sign
  assert.doesNotMatch(formatScoreFraction(80, 100), /%/);
});

test('renderHistogramSvg generates accessible SVG with bars, labels and buckets', () => {
  const histogram = {
    step: 10,
    buckets: [
      { min: 0, max: 10, label: '0 – 10', count: 0, isLast: false, students: [] },
      { min: 10, max: 20, label: '10 – 20', count: 2, isLast: false, students: [{ score: 15 }] },
      { min: 20, max: 30, label: '20 – 30', count: 5, isLast: true, students: [] }
    ]
  };
  const svg = renderHistogramSvg(histogram, 30);

  assert.match(svg, /<svg/);
  assert.match(svg, /viewBox=/);
  assert.match(svg, /class="histogram-bar"/);
  assert.match(svg, /0 – 10/);
  assert.match(svg, /10 – 20/);
  assert.match(svg, /20 – 30/);
  // Count label for non-zero bucket
  assert.match(svg, />5</);
  // Data attributes for interactivity
  assert.match(svg, /data-bucket-idx="1"/);
  assert.match(svg, /data-count="2"/);
});

test('renderEmptyState produces clean prompt when no data or test is selected', () => {
  const empty = renderEmptyState('Vui lòng chọn Lớp và Bài thi');
  assert.match(empty, /Vui lòng chọn Lớp và Bài thi/);
  assert.match(empty, /<svg/);
  // Invariant: No emoji
  assert.doesNotMatch(empty, /[\u{1F300}-\u{1F9FF}]/u);
});

test('renderDrilldownTable displays student list with details and achieved/max fraction', () => {
  const bucket = {
    min: 60,
    max: 70,
    label: '60 – 70',
    count: 2,
    students: [
      { studentRef: 'stu-1', name: 'Nguyễn Văn A', email: 'a@test.com', score: 65 },
      { studentRef: 'stu-2', name: 'Trần Thị B', email: 'b@test.com', score: 68 }
    ]
  };

  const html = renderDrilldownTable(bucket, 100);
  assert.match(html, /60 – 70/);
  assert.match(html, /Nguyễn Văn A/);
  assert.match(html, /Trần Thị B/);
  assert.match(html, /65\/100/);
  assert.match(html, /68\/100/);
  assert.match(html, /btn-close-drilldown/);
  assert.doesNotMatch(html, /%/);
});

