# Cleanup inline styles tĩnh của modal chi tiết câu (chấm điểm)

Ngày 11/11/2026. Baseline `60a7db5` (`feature/test-studio`). CSS revision `20261111-grading-modal1`.

## Phạm vi

- `grading/attempt-review.js`: 17 vị trí chuyển sang class/token — badge "Quyền làm lại" (2 gán `style.*`), khối đề bài, gợi ý, bài làm học viên, đáp án mẫu, nhận xét rubric, toàn bộ khối "Chấm điểm / Điều chỉnh điểm" (tiêu đề, hàng điểm, nhãn, input, nút) và dòng `helpText` trong bảng chi tiết.
- CSS thêm cuối fragment 12; token mới ở fragment 01: `--izone-retake-grant-bg`, `--izone-retake-grant-text`, `--izone-expected-answer-text` (giữ nguyên hex cũ `#f3e8ff`, `#6b21a8`, `#0369a1`). Các màu còn lại dùng token có sẵn (`--izone-slate`, `--izone-slate-900`, `--izone-slate-600`, `--izone-text-muted`, `--izone-warning-bg`, `--izone-retake-active-text`). Không `!important`.
- Specificity: `.modal-override-block input.modal-override-score-input` (width 75px) phải thắng `input:not([type="checkbox"]):not([type="radio"]) { width: 100% }` ở fragment 01 (0,2,1) — xem mục Xác minh. `.modal-override-head h4` đặt sau `.modal-ctx-block h4` nên giữ `margin: 0`.
- Inventory 192 → 175; rule map 1821 → 1837.

## Xác minh

- Fixture mới `tests/browser/grading-modal-parity.mjs` (dữ liệu tổng hợp, không gọi API thật): mở tab Chấm điểm, drawer chi tiết bài làm, rồi modal chi tiết câu cho 2 câu (trắc nghiệm có lựa chọn và gợi ý; tự luận có feedback rubric, đã sửa tay, có nút khôi phục). Chụp computed style toàn bộ cây con và ảnh của `#detail-meta` (có badge Quyền làm lại), `#detail-items-body` (có dòng helpText) và `#modal-item-content` ở 1440, 1024, 390.
  - Chạy: `ARTIFACT_DIR=<dir> node tests/browser/grading-modal-parity.mjs`; so sánh: `node tests/browser/grading-modal-parity.mjs --compare <before> <after>`.
  - Baseline chạy từ worktree tạm tại `60a7db5` với `FRONTEND_ROOT=<worktree>`.
- **Fixture bắt được một lỗi thật ngay lần chạy đầu**: input điểm giãn từ 75px lên khoảng 485px (390px: 185px) vì rule `input:not(...)` (0,2,1) thắng selector ban đầu `.modal-override-block .modal-override-score-input` (0,2,0). `npm test` không phát hiện lỗi này. Đã sửa selector thành `input.modal-override-score-input` (0,2,1, đứng sau nên thắng).
- Sau sửa: **12/12 computed snapshots giống baseline và 12/12 PNG trùng từng byte** (3 viewport × detail-meta, detail-items, modal-choice, modal-overridden); 0 browser errors.
- `npm test`: 671/671 pass; `node scripts/css-metadata.mjs check` khớp.

## Giới hạn

- Chỉ kiểm hiển thị; chưa kiểm lưu điểm/khôi phục điểm thật (handler không đổi). Chưa chạy lại smoke vòng đời `/preview-base` cho đợt này.
- Fixture chỉ bao phủ 2 câu mẫu; các dạng câu khác dùng cùng khối markup nên cùng class, nhưng chưa có ảnh riêng.

Rollback: revert commit như một đơn vị.
