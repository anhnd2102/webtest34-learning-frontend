# Cleanup inline styles tĩnh của modal tạo hàng loạt (AI Rubric, Single Choice)

Ngày 10/11/2026. Nhánh `refactor/batch-modals-static-styles`, baseline `5b06753` (`fix/candidate-audio-glyphs`).

## Phạm vi

- `studio/authoring/rubric.js`: 8 vị trí của phần cấu hình trong modal "Tạo câu hỏi Tự luận chấm AI": khối chọn dạng rubric, ô select, dòng gợi ý, khung ngữ cảnh chung, hàng tiêu đề, nhãn, badge "Ẩn với học viên", dòng chú thích.
- `studio/authoring/choice.js`: 1 vị trí (nhóm "Số lượng phương án mỗi câu").
- CSS thêm cuối fragment 07, scope `#generic-batch-modal`, dùng token có sẵn (`--izone-slate-bg`, `--izone-slate-300`, `--izone-slate`, `--izone-text-muted`); không thêm token, không `!important`.
- **Giữ inline có chủ đích**: `display` của `#batch-rubric-context-group` do `updateCtxVisibility` bật/tắt theo preset (chỉ hiện với "Đọc hiểu Khối 03").
- Inventory 208 → 199 (9 vị trí); rule map 1812 → 1821; CSS revision `20261110-batch-modals1`.

## Phát hiện: `openBatchPictorialModal` là mã chết

Kế hoạch ban đầu gồm 5 vị trí trong `studio/authoring/pictorial.js` (modal `#batch-pictorial-modal`). Fixture không mở được modal này vì **không có nơi nào gọi `openBatchPictorialModal`** (đã grep toàn repo): nút "Thẻ từ vựng qua ảnh" (`.btn-add-pictorial`) mở modal generic (`openGenericBatchModal`) chứ không phải hàm này. Vì chuyển style trong mã không bao giờ chạy là vô nghĩa và không kiểm chứng được, các thay đổi trong `pictorial.js` đã bị rút lại; 5 vị trí đó còn nguyên trong inventory. Hàm này nên được xóa như mã chết ở một đợt riêng.

## Xác minh

- `npm test`: 671/671 pass.
- Fixture mới `BATCH_MODALS_STYLE_PARITY=1`: mở modal bằng nút thật. Kiểm khối cấu hình rubric nằm sau tab CSV mặc định, hiện khi chuyển tab "Tạo nhanh", ẩn khi chọn preset Dịch thuật và hiện lại với Đọc hiểu; chụp 3 trạng thái (rubric đọc hiểu, rubric dịch thuật, single choice) ở 3 viewport. Fixture chờ 300ms trước mỗi lần chụp vì modal generic chuyển focus trễ.
- Độ ổn định baseline: chụp 3 lần trên mã cũ. Computed style ổn định tuyệt đối; PNG ổn định trừ `1024-batch-rubric-translation.png` dao động 6 pixel (tối đa 6/255) giữa các lần chụp baseline.
- Parity trước/sau: **21/21 computed snapshots toàn DOM giống baseline**; PNG: tất cả trùng từng byte, riêng ảnh dao động nói trên trùng khít với 2 trong 3 lần baseline (lệch 6 pixel so với lần còn lại, đúng bằng nhiễu của baseline).
- Smoke vòng đời đầy đủ: root và `/preview-base` × 3 viewport, 10 vòng mount/dispose mỗi lượt, 0 browser errors.

## Giới hạn

- Chưa kiểm xác nhận tạo câu hỏi hàng loạt thật (chỉ kiểm hiển thị và đóng modal).
- Bật cờ parity vẫn gặp assertion focus có sẵn của harness; parity chạy ở chế độ `CAPTURE_ONLY`.

Rollback: revert commit như một đơn vị.
