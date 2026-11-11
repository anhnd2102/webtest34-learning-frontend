# Cleanup inline styles tĩnh của `studio/batch-import.js`

Ngày 11/11/2026. Baseline `ec9b8c5` (`feature/test-studio`). CSS revision `20261111-batch-import1`.

## Phạm vi

- Dòng preview CSV của modal Trắc nghiệm nhóm (`openMultiGroupBatchModal`) và Inline Cloze (`openInlineClozeBatchModal`): 4 vị trí `style="..."` → `.batch-preview-row-text`, `.batch-preview-row-meta`.
- Nút "Chép mẫu" trong hướng dẫn CSV: 4 gán `btn.style.color/fontWeight` → bật/tắt class `.is-copied`. Hành vi giữ nguyên (đặt "✓ Đã chép", trả lại sau 1500ms).
- CSS thêm cuối fragment 12, dùng token có sẵn: `--izone-context-action-hover` (`#047857`), `--izone-context-action` (`#15803d`). Không thêm token, không `!important`. `.btn.btn-copy-sample.is-copied` (0,3,0) thắng các rule hover của `.btn-outline-secondary`, như inline trước đây.
- Inventory 175 → 167; rule map 1837 → 1840.

## Giữ inline có chủ đích

Các `style.display` còn lại (mở/đóng modal, bật/tắt panel tab, hộp preview/lỗi) do JS điều khiển theo trạng thái; không chuyển trong đợt này. Ký tự `✓` trong "✓ Đã chép" là glyph chữ không màu, không thuộc quy tắc emoji; để nguyên.

## Xác minh

- Fixture mới `tests/browser/batch-import-parity.mjs` (dữ liệu tổng hợp): mở modal Trắc nghiệm nhóm và Inline Cloze, dán CSV mẫu để hiện dòng preview, mở hướng dẫn CSV và chụp 3 trạng thái nút Chép mẫu (mặc định, đã chép, đã khôi phục). 5 trạng thái × 3 viewport (1440, 1024, 390). So sánh bằng `node tests/browser/grading-modal-parity.mjs --compare <before> <after>`. Baseline chạy từ worktree tạm tại `ec9b8c5`.
- **15/15 computed snapshots giống baseline, 15/15 PNG trùng từng byte**; 0 browser errors. Trạng thái "đã chép" có màu `rgb(21, 128, 61)`, đậm 600, đúng giá trị inline cũ.
- `npm test`: 671/671 pass; `node scripts/css-metadata.mjs check` khớp.

## Giới hạn

- Chưa kiểm xác nhận nhập hàng loạt thật (chỉ preview và đóng modal); handler không đổi.
- `navigator.clipboard` được giả lập trong fixture.
- Chưa chạy lại smoke vòng đời `/preview-base`.

Rollback: revert commit như một đơn vị.
