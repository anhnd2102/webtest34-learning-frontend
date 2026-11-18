// NGUỒN: file .ts này; import-guide.js do `npm run build` sinh ra.
//
// Trung tâm "Mẫu và hướng dẫn" (spec #91, GĐ 2): nội dung sinh hoàn toàn từ registry nên không thể lệch bộ đọc.
// Chỉ dựng chuỗi HTML, không đụng DOM; hộp thoại và nút tải nằm ở batch-import.
import { escapeHtml } from '../ui/presentation.js';
import { COLUMNS, COLUMN_LABEL, FIELD_NOTES, TYPES } from './import-registry.js';
import { typeTemplateRecords } from './import-engine.js';
// Thuộc tính HTML: escape thêm xuống dòng để chép mẫu nhiều dòng qua data-sample.
const attr = (value) => escapeHtml(value).replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
function sampleText(spec) {
    const columns = COLUMNS.map(column => column.id).filter(id => spec.columns.includes(id));
    const header = columns.map(id => COLUMN_LABEL[id] || id);
    const rows = typeTemplateRecords(spec.code).map(record => columns.map(id => String(record[id] ?? '')));
    const quote = (value) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
    const csv = [header, ...rows].map(line => line.map(quote).join(',')).join('\n');
    return { header, rows, csv };
}
function typeSection(spec, focus) {
    const sample = sampleText(spec);
    const columns = COLUMNS.map(column => column.id).filter(id => spec.columns.includes(id));
    const columnRows = columns.map(id => {
        const note = spec.help.columnNotes[id] || FIELD_NOTES[id] || '';
        return `<tr><td>${escapeHtml(COLUMN_LABEL[id] || id)}</td><td>${spec.required.includes(id) ? 'Bắt buộc' : 'Tùy chọn'}</td><td>${escapeHtml(note)}</td></tr>`;
    }).join('');
    const exampleHead = sample.header.map(label => `<th>${escapeHtml(label)}</th>`).join('');
    const exampleRows = sample.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    const mistakes = spec.help.commonMistakes.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    return `<article class="guide-type${focus === spec.code ? ' is-focus' : ''}" id="guide-type-${spec.code}" data-guide-type="${spec.code}">
    <header class="guide-type-head">
      <div><h4 class="guide-type-title">${escapeHtml(spec.label)}</h4><span class="guide-type-family">${escapeHtml(spec.family)}</span></div>
      <button type="button" class="btn btn-secondary btn-sm btn-download-type-template" data-download-type="${spec.code}">Tải mẫu (.csv)</button>
    </header>
    <p class="guide-student"><strong>Học viên thấy:</strong> ${escapeHtml(spec.help.studentView)}</p>
    <div class="guide-table-wrap"><table class="guide-table"><thead><tr><th>Cột</th><th>Điền</th><th>Ý nghĩa</th></tr></thead><tbody>${columnRows}</tbody></table></div>
    <h5 class="guide-subtitle">Ví dụ đã điền sẵn</h5>
    <div class="guide-table-wrap"><table class="guide-table guide-example"><thead><tr>${exampleHead}</tr></thead><tbody>${exampleRows}</tbody></table></div>
    <button type="button" class="btn btn-xs btn-outline-secondary btn-copy-sample" data-sample-type="${spec.code}" data-sample="${attr(sample.csv)}">Chép mẫu</button>
    <h5 class="guide-subtitle">Lỗi thường gặp</h5>
    <ul class="guide-mistakes">${mistakes}</ul>
  </article>`;
}
export function guideHtml(options = {}) {
    const toc = TYPES.map(spec => `<button type="button" class="guide-toc-chip" data-guide-jump="${spec.code}">${escapeHtml(spec.label)}</button>`).join('');
    return `<div class="guide-body">
    <section class="guide-intro">
      <h4 class="guide-section-title">Ba cách tạo câu hỏi</h4>
      <ul class="guide-list">
        <li><strong>Từng câu:</strong> nhập trực tiếp từng câu trong Test Studio.</li>
        <li><strong>Hàng loạt:</strong> dán nhiều dòng copy từ Excel hoặc Google Sheets vào hộp thoại của dạng câu.</li>
        <li><strong>Tải CSV/Excel:</strong> tải file mẫu, điền rồi tải lên cho một dạng, cả Phần hoặc cả đề.</li>
      </ul>
      <h4 class="guide-section-title">Quy tắc chung của file</h4>
      <ul class="guide-list">
        <li>Dòng đầu là hàng tiêu đề; tên cột viết đúng như mẫu (hoa/thường không quan trọng).</li>
        <li>Lưu CSV dạng UTF-8 để giữ tiếng Việt có dấu; dấu phân tách có thể là dấu phẩy, dấu chấm phẩy hoặc tab.</li>
        <li>Ô có dấu phẩy hoặc xuống dòng phải đặt trong dấu ngoặc kép (Excel tự làm khi lưu CSV).</li>
        <li>Nhiều giá trị trong một ô (đáp án chấp nhận thêm, đáp án các chỗ trống) cách nhau bằng dấu <code>|</code>.</li>
        <li>Cột không dùng cho dạng câu đó để trống. Cột Điểm để trống thì dùng điểm mặc định trong hộp thoại.</li>
        <li>File theo mẫu cũ vẫn nhập được và được tự chuyển đổi; bảng xem trước báo rõ dòng nào Hợp lệ, Cảnh báo hay Lỗi.</li>
      </ul>
      <h4 class="guide-section-title">File cả Phần thi</h4>
      <p>File cả Phần có đúng các cột của từng dạng, thêm ba cột đầu: Bài tập, Hướng dẫn bài tập, Dạng câu. Một dạng trong một bài tập chính là file cả Phần bỏ ba cột đầu.</p>
      <ul class="guide-list">
        <li><strong>Thông tin Phần</strong> (tiêu đề, hướng dẫn, bài đọc dài, âm thanh): thêm một dòng có Dạng câu là "Thông tin Phần" (Bài tập = tiêu đề, Hướng dẫn bài tập = hướng dẫn, Đề bài = bài đọc, Âm thanh = bài nghe). Với Excel, dùng sheet "Thông tin Phần". Không điền thì nhập tay trong Test Studio.</li>
        <li><strong>Cả đề:</strong> nút "Nhập cả đề từ Excel" ở đầu danh sách Phần. Mỗi sheet là một Phần (tên sheet là tên Phần); sheet "Thông tin Phần" và "Hướng dẫn" không thành Phần. Đề có tối đa 10 Phần.</li>
        <li><strong>Ảnh và âm thanh:</strong> ghi đường dẫn hoặc link. Nếu chỉ ghi tên file (apple.png), hãy khai "Thư mục ảnh/âm thanh" trong hộp thoại nhập để hệ thống ghép đường dẫn.</li>
        <li><strong>Tự luận chấm AI theo Khối:</strong> trong hộp thoại Thêm câu hỏi, chọn Dạng chấm (6 dạng) và Khối trước thì form, bảng hàng loạt và file mẫu chỉ có các cột của dạng đó. Trong file có thể ghi riêng Dạng chấm và Khối từng dòng (03, 34, 45; để trống thì theo lựa chọn hoặc Khối của đề). Điểm từng yêu cầu, phần Grammar/Vocab và bảng trừ lỗi do hệ thống dựng lúc nhập, giống trình hướng dẫn từng câu; dòng nào hệ thống từ chối sẽ được báo và không nhập.</li>
        <li><strong>Sau khi nhập:</strong> câu trùng đề bài với câu đã có bị cảnh báo (vẫn nhập được); nút "Hoàn tác lần nhập này" hiện cho tới khi bạn sửa tiếp.</li>
      </ul>
      <div class="guide-downloads">
        <button type="button" class="btn btn-primary btn-sm btn-download-excel-template">Tải mẫu Excel (.xlsx)</button>
        <button type="button" class="btn btn-secondary btn-sm btn-download-block-template-guide">Tải mẫu cả Phần (.csv)</button>
      </div>
    </section>
    <nav class="guide-toc" aria-label="Chọn dạng câu">${toc}</nav>
    ${TYPES.map(spec => typeSection(spec, options.focus)).join('')}
  </div>`;
}
