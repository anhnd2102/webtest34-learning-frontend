# Thống nhất màu Danger về #e11d48

Ngày 10/11/2026. Nhánh `fix/danger-color-unify`, baseline `ed29700`. Đây là thay đổi hình ảnh có chủ đích (theo quyết định của chủ dự án), không phải refactor thuần: màu `#dc2626` lịch sử được đổi sang màu Danger của `DESIGN_SYSTEM.md` (`#e11d48`, Rose 600).

## Thay đổi

- Token: `--izone-danger-legacy: #dc2626` (đợt trước) đổi thành `--izone-danger: #e11d48`.
- Dashboard (`styles/`), thay hex/rgba cứng bằng token hoặc giá trị tương đương:
  - `02-dashboard-grading.css`: `.score-total.tier-red`.
  - `03-studio-builder.css`: `.btn-outline-danger` (chữ), `.immutability-badge.warning` (chữ).
  - `06-publishing.css`: `.publishing-error-msg`, nền `#btn-final-publish.is-ready`, ba mốc `rgba(220, 38, 38, …)` của keyframes `pulse-ready` đổi thành `rgba(225, 29, 72, …)` để vòng xung khớp màu nút.
  - `08-studio-simulation-shell.css`: `.status-incorrect`.
- `webtest-34-demo/content-preview.mjs`: 3 chỗ gán `style.color` (trạng thái làm lại và kiểm tra âm thanh phía học viên) đổi `'#dc2626'` thành `'#e11d48'`; mã JS này không truy cập được token của dashboard.
- CSS revision `20261110-danger-unify1`; manifest và rule map tái tạo bằng `scripts/css-metadata.mjs`.

## Không đổi (để duyệt riêng)

Các sắc độ nhạt/đậm cùng họ màu đỏ vẫn giữ nguyên vì yêu cầu là màu `#dc2626`: viền `#fca5a5` của `.btn-outline-danger`, nền `#fef2f2`/viền `#fecaca` của `.immutability-badge.warning`, viền `#b91c1c` của nút `is-ready`, nền `#fee2e2` của trạng thái lỗi âm thanh. `DESIGN_SYSTEM.md` quy định Danger gồm nền `#fff1f2` và viền `#fecdd3`; nếu muốn thống nhất đầy đủ cần một đợt riêng.

## Phát hiện

`styles/08-studio-simulation-shell.css:1024` (`.status-incorrect`, nay dùng token) thực tế **không có hiệu lực**: `styles/11-analytics.css:829` định nghĩa lại `.status-incorrect` (`#991b1b` trên nền `#fee2e2`) với cùng độ ưu tiên và đứng sau. Đã đổi giá trị để không còn sót `#dc2626`, nhưng màu hiển thị của phần tử này không thay đổi.

## Xác minh

- `npm test`: 663/663 pass. Không test nào tham chiếu `#dc2626`.
- So sánh theo ánh xạ màu: chụp computed style toàn DOM trước (trên `ed29700`) và sau với các fixture publishing, builder (sandbox) và simulation ở 3 viewport (57 file). Thay `rgb(220, 38, 38)` bằng `rgb(225, 29, 72)` (và `rgba(220, 38, 38,` bằng `rgba(225, 29, 72,`) trong snapshot trước rồi so sánh với snapshot sau: **2094 thuộc tính chỉ khác nhau đúng theo ánh xạ đó, 0 khác biệt ngoài dự kiến**. Nghĩa là không có thuộc tính nào khác thay đổi.
- Fixture mới `DANGER_COLOR_CHECK=1` chèn phần tử probe cho các style mà fixture không render: kiểm computed `.tier-red`, `.immutability-badge.warning`, `.btn-outline-danger`, `.publishing-error-msg` đều `rgb(225, 29, 72)`; nút `is-ready` có nền `rgb(225, 29, 72)` và vẫn giữ viền `rgb(185, 28, 28)`.
- Smoke vòng đời đầy đủ: root và `/preview-base` × 3 viewport, 10 vòng mount/dispose mỗi lượt, 0 browser errors.
- Cập nhật `PUBLISHING_STATIC_STYLES_VERIFICATION.md`: token `--izone-danger-legacy` và quyết định "chờ thống nhất" đã được giải quyết bằng đợt này.

## Giới hạn

- Không đo tương phản màu (a11y) giữa `#e11d48` và các nền hiện có; `#e11d48` trên nền trắng đạt khoảng 4.6:1 theo công thức WCAG nhưng chưa kiểm trên từng nền thực tế.
- Phần tử học viên (`content-preview.mjs`) chỉ đổi giá trị chuỗi, chưa chụp trạng thái làm lại hết hạn trong trình duyệt.

Rollback: revert commit như một đơn vị.
