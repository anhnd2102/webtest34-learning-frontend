# Cleanup inline styles tĩnh trong luồng Công bố đề thi

Ngày 10/11/2026. Nhánh `refactor/publishing-static-styles`, baseline `c4d45ab` (commit thay emoji, `fix/design-system-emoji`).

## Phạm vi

- `studio/publishing.js`: chuyển 3 vị trí style tĩnh.
  - Bộ đếm lớp được chọn (`.classes-selection-counter`): đã có rule ở fragment 06 (`0.78rem`) nhưng bị inline đè bằng `12px`/`margin-top: 6px`. Sửa tại chỗ rule hiện có thành `12px`, `--izone-text-muted`, `margin-top: 6px` để giá trị tính toán không đổi; class chỉ dùng trong `publishing.js`.
  - Thông báo lỗi `#publishing-error-msg` (2 vị trí, bước 1 và bước 2): thêm rule `.publishing-error-msg` (màu, cỡ chữ, margin); **giữ `style="display:none;"` inline** vì JS bật/tắt.
- **Token mới duy nhất: `--izone-danger-legacy: #dc2626`** (fragment 01, cạnh nhóm `--izone-danger-*`). Lý do: `DESIGN_SYSTEM.md` quy định màu Danger là `#e11d48`, còn `#dc2626` là màu lịch sử chưa có token và đang dùng thẳng dạng hex ở 5 chỗ CSS khác (`02-dashboard-grading.css:897`, `03-studio-builder.css:363,434`, `06-publishing.css:606`, `08-studio-simulation-shell.css:1026`). Giữ nguyên giá trị để parity; tên `-legacy` và comment trong CSS đánh dấu cần quyết định thống nhất với `#e11d48` (hoặc `--izone-danger-strong`) trước khi gỡ. Không sửa 5 chỗ hex kia trong đợt này.
- `rich-editor.js`: **không có vị trí nào hợp lệ** nên không thay đổi. Toàn bộ là `display: none` do JS bật/tắt (popup bảng/ảnh, lỗi editor, textarea mã HTML) hoặc `text-align` nằm trong HTML nội dung được lưu (`justifyLeft/Center/Right`), đổi sang class sẽ làm mất định dạng của nội dung đã soạn. Tương tự các bảng mẫu `ui/rich-content.js`.
- Không đổi DOM ngoài bỏ `style`; không đổi logic công bố, payload hay API. CSS revision `20261110-publishing-static1`; rule map 1811 → 1812; inventory 209 → 208.

## Xác minh

- `npm test`: 663/663 pass (gồm `design-system-compliance`).
- Fixture `PUBLISHING_UI_PARITY=1` (7 trạng thái của wizard) chụp **hai lần** trên code baseline: 42 file giống hệt nhau từng byte giữa hai lần (spinner được đóng băng trước khi chụp), nên baseline ổn định.
- Parity trước/sau trên 1440×900, 1024×768, 390×844: **33/33 computed snapshots toàn DOM giống baseline** và **33/33 PNG giống từng byte**. Snapshot xác nhận đích: bộ đếm `rgb(100, 116, 139)` / `12px` / margin-top `6px`; thông báo lỗi `rgb(220, 38, 38)` / `13px` / margin-top `8px`, `display: none` ở bước 1 và `block` sau lỗi công bố, trước và sau đều giống hệt.
- Smoke vòng đời đầy đủ: root và `/preview-base` × 3 viewport, 10 vòng mount/dispose mỗi lượt, 0 browser errors, 13 CSS responses 200.

## Phân loại 208 vị trí inventory còn lại

| Nhóm | Số lượng | Xử lý |
| --- | ---: | --- |
| `style.display` / thuộc tính do JS điều khiển (`property`) | 117 | Chỉ chuyển được bằng cách đổi sang class bật/tắt, là thay đổi hành vi, cần phê duyệt riêng |
| `display:none/block/...` ban đầu của phần tử JS bật/tắt | 26 | Giữ inline (cùng lý do) |
| `style` chứa `${...}` phụ thuộc dữ liệu | 12 | Giữ inline hoặc đổi sang class điều kiện, là thay đổi hành vi |
| Markup nội dung được lưu (`rich-content`, `rich-editor`) | 7 | Giữ nguyên, thuộc dữ liệu người dùng |
| **Style tĩnh còn có thể chuyển** | **46** | Việc tiếp theo hợp lệ |

46 vị trí tĩnh còn lại tập trung ở: `grading/attempt-review.js` (15, modal chấm điểm của giáo viên), `studio/authoring/rubric.js` (8) và `pictorial.js` (5) (modal tạo hàng loạt), `studio/simulation.js` (6), `studio/batch-import.js` (4), `shell/analytics/score-distribution-view.js` (3), `studio/media.js` (2), còn lại rải rác. Nhận định trước đó rằng đợt "publishing + rich-editor" gồm khoảng 46 vị trí là sai vì đã tính cả `style.display` do JS điều khiển.

## Giới hạn

- Bật cờ parity vẫn gặp assertion focus có sẵn của harness; parity chạy ở chế độ `CAPTURE_ONLY`, lifecycle smoke chạy riêng.
- Chưa kiểm với API công bố thật hoặc Pages deployment; các hàm `onPublishPreview`/`onPublish` được giả lập.
- Artifacts nằm trong scratchpad của phiên: `pb-before1/`, `pb-before2/`, `pb-after/`, `pb-smoke/`.

Rollback: revert commit template/CSS/token/metadata như một đơn vị.
