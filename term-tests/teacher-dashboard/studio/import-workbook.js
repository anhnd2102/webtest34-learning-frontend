// NGUỒN: file .ts này; import-workbook.js do `npm run build` sinh ra.
//
// Đọc file Excel nhiều sheet cho ba mức tải lên (spec #91, GĐ 4): một dạng, cả Phần, cả đề. Dữ liệu vào là danh sách sheet
// đã đổi sang CSV ({tên, csv}); việc mở file .xlsx nằm ở lớp giao diện. Không đụng DOM.
import { TYPES, resolveTypeCode } from './import-registry.js';
import { excelSheetName, parseDelimited, readImport } from './import-engine.js';
// Hợp đồng đề cho phép tối đa 10 Phần.
export const MAX_BLOCKS = 10;
const fold = (text) => String(text ?? '').normalize('NFC').toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
export function classifySheet(name) {
    const key = fold(name);
    if (key === 'thông tin phần' || key === 'thong tin phan')
        return 'info';
    if (key === 'hướng dẫn' || key === 'huong dan')
        return 'guide';
    // Khớp đúng tên dạng (không khớp gần đúng, để một Phần tên "Từ vựng 1" không bị coi là sheet dạng).
    if (TYPES.some(spec => fold(spec.label) === key || fold(excelSheetName(spec.label)) === key || fold(spec.code) === key))
        return 'type';
    return 'block';
}
const INFO_HEADERS = {
    'tiêu đề': 'title', 'title': 'title', 'tên phần': 'title',
    'hướng dẫn': 'instructions', 'instructions': 'instructions',
    'bài đọc': 'reading', 'reading': 'reading', 'reading passage': 'reading',
    'audio': 'audio', 'âm thanh': 'audio', 'audio url': 'audio'
};
export function parseInfoSheet(csv) {
    const rows = parseDelimited(csv);
    if (!rows.length)
        return [];
    const mapped = rows[0].cells.map(cell => INFO_HEADERS[fold(cell)]);
    const hasHeader = mapped.some(Boolean);
    const columns = hasHeader ? mapped : ['title', 'instructions', 'reading', 'audio'];
    return (hasHeader ? rows.slice(1) : rows).map(({ cells }) => {
        const info = { title: '', instructions: '', reading: '', audio: '' };
        columns.forEach((field, index) => { if (field)
            info[field] = String(cells[index] ?? '').trim(); });
        return info;
    });
}
const sheetsOfKind = (sheets, kind) => sheets.filter(sheet => classifySheet(sheet.name) === kind);
// Một dạng từ Excel: ưu tiên sheet đặt tên theo dạng, không có thì sheet đầu.
export function sheetForType(sheets, typeCode) {
    const spec = TYPES.find(candidate => candidate.code === typeCode);
    const named = sheets.find(sheet => classifySheet(sheet.name) === 'type' && (resolveTypeCode(sheet.name) === typeCode || (spec && fold(excelSheetName(spec.label)) === fold(sheet.name))));
    return named || sheets[0];
}
// Cả Phần từ Excel: sheet "Phần thi" (hoặc sheet Phần đầu tiên) + thông tin Phần từ sheet "Thông tin Phần" nếu có.
export function readBlockWorkbook(sheets, options = {}) {
    const blocks = sheetsOfKind(sheets, 'block');
    const chosen = blocks.find(sheet => fold(sheet.name) === 'phần thi') || blocks[0] || sheets[0];
    const read = readImport(chosen?.csv || '', { ...options, scope: 'block' });
    const infoSheet = sheetsOfKind(sheets, 'info')[0];
    const info = (infoSheet ? parseInfoSheet(infoSheet.csv)[0] : undefined) || read.blockInfo;
    return { sheetName: chosen?.name || '', read, ...(info ? { info } : {}) };
}
// Cả đề từ Excel: mỗi sheet Phần là một Phần (tên sheet là tên Phần); sheet hướng dẫn, sheet theo dạng và "Thông tin Phần" không thành Phần.
export function readTestWorkbook(sheets, options = {}) {
    const result = { blocks: [], notices: [], summary: { blocks: 0, ok: 0, warning: 0, error: 0, importable: 0 } };
    const blockSheets = sheetsOfKind(sheets, 'block');
    if (blockSheets.length > MAX_BLOCKS)
        result.notices.push(`Đề chỉ có tối đa ${MAX_BLOCKS} Phần; ${blockSheets.length - MAX_BLOCKS} sheet cuối bị bỏ qua.`);
    const infoSheet = sheetsOfKind(sheets, 'info')[0];
    const infoRows = infoSheet ? parseInfoSheet(infoSheet.csv) : [];
    for (const sheet of blockSheets.slice(0, MAX_BLOCKS)) {
        const read = readImport(sheet.csv, { ...options, scope: 'block' });
        // Ghép thông tin theo tiêu đề = tên sheet; file chỉ có một Phần thì lấy dòng đầu của sheet thông tin.
        const matched = infoRows.find(row => fold(row.title) === fold(sheet.name)) || (blockSheets.length === 1 ? infoRows[0] : undefined) || read.blockInfo;
        result.blocks.push({ title: sheet.name, sheetName: sheet.name, read, ...(matched ? { info: matched } : {}) });
        result.summary.ok += read.summary.ok;
        result.summary.warning += read.summary.warning;
        result.summary.error += read.summary.error;
    }
    result.summary.blocks = result.blocks.length;
    result.summary.importable = result.summary.ok + result.summary.warning;
    return result;
}
