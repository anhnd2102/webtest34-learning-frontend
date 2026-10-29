import assert from 'node:assert/strict';
import test from 'node:test';

const { studentResultsHtml, studentResultsBodyHtml, studentReviewHtml } = await import('../term-tests/webtest-34-demo/content-preview.mjs');

const definition = { blocks: [{ blockId: 'b1', items: [
  { itemVersionId: 'i1', interactionType: 'text_select_pair' },
  { itemVersionId: 'i2', interactionType: 'single_choice' },
  { itemVersionId: 'i3', interactionType: 'essay' }
] }] };
const item = (id, position, verdict, extra = {}) => ({ itemVersionId: id, position, verdict, scoreEarned: verdict === 'correct' ? 1 : 0, maxScore: 1, rawAnswer: 'ans', ...extra });
const render = (items, over = {}) => studentResultsHtml({
  result: { gradingStatus: 'complete', summary: { scoreFinal: true, scoreEarned: 1, maxScore: 3 }, items, ...over },
  definition, studentName: 'An', className: 'L1'
});

test('đếm đúng / đúng một phần / chưa đúng và hiện tổng điểm', () => {
  const html = render([item('i1', 1, 'correct'), item('i2', 2, 'partial'), item('i3', 3, 'incorrect')]);
  assert.match(html, /1\/3đ/);
  assert.match(html, /✓ 1 đúng/);
  assert.match(html, /◐ 1 đúng một phần/);
  assert.match(html, /✕ 1 chưa đúng/);
  assert.match(html, /Hoàn tất chấm điểm/);
});

test('câu cặp từ vựng bỏ mã nghĩa, dạng khác giữ nguyên', () => {
  const html = render([
    item('i1', 1, 'correct', { rawAnswer: 'adapt to,meaning-21' }),
    item('i2', 2, 'incorrect', { rawAnswer: 'yes, sir' })
  ]);
  assert.match(html, /<span class="">adapt to<\/span>/);
  assert.doesNotMatch(html, /meaning-21/);
  assert.match(html, /yes, sir/);
});

test('câu bỏ trống hiện "Chưa trả lời"', () => {
  assert.match(render([item('i2', 1, 'incorrect', { rawAnswer: '  ' })]), /is-empty">Chưa trả lời/);
});

test('đáp án đúng ẩn khi không có, hiện khi có (kể cả mảng)', () => {
  assert.doesNotMatch(render([item('i2', 1, 'correct')]), /Đáp án đúng/);
  assert.match(render([item('i2', 1, 'correct', { expectedAnswer: ['a', 'b'] })]), /Đáp án đúng<\/span><span class="sim-card-expected">a, b/);
});

test('lỗi Translation/Writing hiện danh sách, câu không lỗi không có khung', () => {
  const html = render([
    item('i3', 1, 'partial', { feedback: { errors: [{ message: 'Sai thì' }, { code: 'GRAMMAR' }] } }),
    item('i2', 2, 'correct')
  ]);
  assert.match(html, /Lỗi gặp phải \(2\)/);
  assert.match(html, /<li>Sai thì<\/li><li>GRAMMAR<\/li>/);
  assert.equal(html.match(/sim-card-errors/g).length, 1);
});

test('trạng thái chờ duyệt và câu đang chấm', () => {
  const html = render([item('i1', 1, 'manual_review')], { gradingStatus: 'manual_review', summary: { scoreFinal: false } });
  assert.match(html, /Chờ giảng viên duyệt/);
  assert.match(html, /… 1 đang chấm/);
  assert.match(html, /data-result-group="other"/);
});

test('câu sai và đúng một phần thuộc nhóm lọc "Chưa đúng"', () => {
  const html = render([item('i1', 1, 'correct'), item('i2', 2, 'partial'), item('i3', 3, 'incorrect')]);
  assert.equal(html.match(/data-result-group="wrong"/g).length, 2);
  assert.equal(html.match(/data-result-group="correct"/g).length, 1);
});

test('điểm từng phần: tổng theo phần, câu không thuộc phần nào rơi vào "Câu khác"', () => {
  const two = { blocks: [
    { title: 'Vocabulary', items: [{ itemVersionId: 'i1' }, { itemVersionId: 'i2' }] },
    { title: 'Speaking', items: [{ itemVersionId: 'i3' }] }
  ] };
  const html = studentResultsHtml({
    result: { items: [item('i1', 1, 'correct', { maxScore: 0.5, scoreEarned: 0.5 }), item('i2', 2, 'incorrect', { maxScore: 0.5 }), item('i3', 3, 'correct'), item('zz', 4, 'incorrect')] },
    definition: two, studentName: 'An', className: 'L1'
  });
  assert.match(html, /data-result-jump="sim-sec-0"[\s\S]*?Vocabulary[\s\S]*?0\.5\/1đ[\s\S]*?1\/2 câu đúng/);
  assert.match(html, /Speaking[\s\S]*?1\/1đ/);
  assert.match(html, /Câu khác/);
  assert.equal(html.match(/data-result-section/g).length, 3);
});

test('ghi chú đáp án theo answerRelease', () => {
  assert.match(render([item('i2', 1, 'incorrect')], { answerRelease: 'hidden' }), /Bài này không hiển thị đáp án đúng\./);
  assert.match(render([item('i2', 1, 'incorrect')], { answerRelease: 'partial' }), /Một số đáp án đúng chưa được/);
  assert.doesNotMatch(render([item('i2', 1, 'incorrect')], { answerRelease: 'released' }), /sim-notice/);
});

test('phần thân dùng chung cho màn Xem kết quả: có điểm, phần, bộ lọc, thẻ câu nhưng không có khung hộp thoại', () => {
  const html = studentResultsBodyHtml({
    result: { gradingStatus: 'complete', summary: { scoreFinal: true, scoreEarned: 1, maxScore: 3 }, items: [item('i1', 1, 'correct'), item('i2', 2, 'incorrect')] },
    definition, studentName: 'An', className: 'L1'
  });
  assert.match(html, /1\/3đ/);
  assert.match(html, /data-result-filter="wrong"/);
  assert.match(html, /data-result-group="correct"/);
  assert.doesNotMatch(html, /sim-results-dialog|btn-close-sim-results|btn-retest-simulation/);
  assert.match(render([item('i1', 1, 'correct')]), /sim-results-dialog[\s\S]*data-result-filter="all"[\s\S]*btn-retest-simulation/);
});

test('màn Xem kết quả: tiêu đề bài, giờ nộp và phần thân dùng chung, tiêu đề được escape', () => {
  const html = studentReviewHtml({
    header: { testTitle: 'Test <4>', submittedAt: '10:00:00 29/10/2026' },
    result: { gradingStatus: 'complete', summary: { scoreFinal: true, scoreEarned: 1, maxScore: 2 }, items: [item('i1', 1, 'correct'), item('i2', 2, 'incorrect')] },
    definition, studentName: 'An', className: 'L1'
  });
  assert.match(html, /Test &lt;4&gt;/);
  assert.match(html, /Nộp lúc: 10:00:00 29\/10\/2026/);
  assert.match(html, /data-result-filter="wrong"/);
  assert.doesNotMatch(html, /sim-results-dialog|btn-close-sim-results/);
});

test('không có câu nào thì báo đang cập nhật; dữ liệu được escape', () => {
  assert.match(render([]), /Đang cập nhật chi tiết/);
  const html = studentResultsHtml({ result: { items: [item('i2', 1, 'incorrect', { rawAnswer: '<img src=x>' })] }, definition, studentName: '<b>', className: '' });
  assert.doesNotMatch(html, /<img src=x>|<b>/);
});
