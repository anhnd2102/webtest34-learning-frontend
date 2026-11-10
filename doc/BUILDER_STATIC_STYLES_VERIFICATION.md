# Cleanup inline styles tĩnh trong Builder: khung ngữ cảnh Bài tập và lỗi sandbox

Ngày 10/11/2026. Nhánh `refactor/builder-static-styles`, baseline `6c1696f` (`chore/css-metadata-scripts`, xếp trên `feature/test-studio` sau khi đã merge hai đợt style trước).

## Phạm vi

- `studio/builder.js`: chuyển 7 style tĩnh sang fragment 07.
  - Khung "Ngữ cảnh bài đọc / Script tham chiếu chung cho AI" của Bài tập Đọc hiểu: khung ngoài, hàng tiêu đề, nhãn, badge "Ẩn với học viên", dòng gợi ý (5 vị trí; thêm class `exercise-reference-context-header`, `-badge`, `-hint`).
  - Phản hồi sandbox chấm thử AI: `.error-pill` trong danh sách lỗi và `.notice-text` của thông báo lỗi (2 vị trí; thêm class `sandbox-error-text`).
- Token đúng giá trị, không thêm token mới: `--izone-slate-bg` (#f8fafc), `--izone-slate-300` (#cbd5e1), `--izone-slate` (#1e293b), `--izone-text-muted` (#64748b), `--izone-danger-strong` (#b91c1c). Không `!important`, không đổi radius.
- Fragment 12 đã có `.exercise-reference-context-field:focus-within { … !important }`. Rule mới scope `.builder-exercise-body .exercise-reference-context-field`, nên `!important` khi focus vẫn thắng như khi còn inline; fixture kiểm cả trạng thái focus.
- **Loại khỏi batch có chủ đích**: dòng 478 (`display` của thẻ Phần theo tab đang chọn) và 503 (`display` của cảnh báo link Google Drive, phụ thuộc dữ liệu và được `warningEl.style.display` cập nhật ở dòng 831), cùng toàn bộ vị trí `property` (`style.display` do JS bật/tắt popup, tab, panel). Chuyển những vị trí này sang class sẽ đổi cách bật/tắt, không còn là refactor thuần.
- Không đổi DOM ngoài bỏ `style` và thêm class, không đổi điều kiện hiển thị, handler, payload hay grading.
- CSS revision `20261110-builder-static1`; manifest, rule map (1804 → 1811 rule) và inventory (216 → 209) được tái tạo bằng `scripts/css-metadata.mjs`.

## Xác minh

- `node --check studio/builder.js` pass (syntax check, không phải typecheck).
- `npm test`: **663 tests, 663 pass, 0 fail, 0 skip** (Node v24.19.0).
- Harness mới `BUILDER_STATIC_STYLE_PARITY=1`: mount Builder thật với một Bài tập Đọc hiểu có ngữ cảnh chung và một câu rubric AI. Chụp 4 trạng thái: mặc định, focus trong ô ngữ cảnh (kiểm `focus-within !important`), sandbox có `errors` (error pill), sandbox thất bại (`ok:false` → thông báo lỗi). Phản hồi sandbox được giả lập bằng `page.route`, không gọi API thật. Baseline chụp trên nhánh mới sau khi thêm fixture và trước khi sửa code; baseline xác nhận phần tử đích có trong snapshot với đúng màu cũ (`rgb(185, 28, 28)` ở cả hai vị trí lỗi).
- Parity trước/sau trên 1440×900, 1024×768, 390×844: **24/24 computed snapshots toàn DOM giống baseline** (23 thuộc tính, không loại phần tử) và **24/24 PNG giống từng byte**.
- Smoke tích hợp đầy đủ (không bật cờ parity): root và `/preview-base` × 3 viewport, mỗi lượt 10 vòng mount/dispose, 0 browser errors, 13 CSS responses 200/`text/css`.

## Giới hạn và ghi nhận

- Bật cờ parity vẫn gặp assertion focus có sẵn của harness; parity chạy ở chế độ `CAPTURE_ONLY`, lifecycle smoke chạy riêng.
- Chưa kiểm sandbox với API/AI Gateway thật, Pages deployment hay mọi tổ hợp rubric.
- Ngoài phạm vi, ghi nhận để xử lý riêng: `builder.js` đặt `btn.textContent = '⏳ Đang chấm AI...'` khi sandbox chạy. Emoji này vi phạm quy tắc Design System (cấm emoji màu, dùng SVG line icon). Không sửa trong đợt này để giữ nguyên hành vi.
- Artifacts nằm trong scratchpad của phiên: `bs-before/`, `bs-after/`, `bs-smoke/`.

Rollback: revert commit template/CSS/metadata như một đơn vị.
