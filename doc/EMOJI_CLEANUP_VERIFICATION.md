# Thay emoji màu bằng SVG đơn sắc trong Builder và luồng Công bố

Ngày 10/11/2026. Nhánh `fix/design-system-emoji`, baseline `df3ed47` (`feature/test-studio`). Đây là sửa lỗi tuân thủ Design System, không phải refactor thuần: DOM của các nút/trạng thái được đổi từ ký tự emoji sang icon SVG, nên không có so sánh parity computed style cho các phần tử này.

## Phạm vi (9 vị trí)

- `studio/builder.js`: nút sandbox chấm thử AI đang chạy `⏳ Đang chấm AI...` → icon `rotate` + class `spin` + nhãn (cùng mẫu với `draft-saving.js`).
- `studio/publishing.js`:
  - `⏳ Đang phân tích tác động...` và `⏳ Đang công bố...` → icon `rotate spin` + nhãn.
  - `📋 Điền tự động` → icon `clipboard`; `⬅ Quay lại` → icon `arrowLeft`.
  - `⚠️ Chưa khớp…` (2 chỗ) → icon `alert`; `✅ Tên bài test đã khớp…` → icon `check`.
  - Placeholder `🔍 Tìm kiếm mã lớp...` → `Tìm kiếm mã lớp...` (placeholder không chứa được SVG; ô tìm kiếm không đổi bố cục).
- Chữ hiển thị giữ nguyên. Không đổi logic, payload, điều kiện khóa nút công bố hay API.

## Xác minh

- `npm test`: 663/663 pass (gồm `design-system-compliance`).
- Fixture mới `PUBLISHING_UI_PARITY=1` điều khiển luồng thật bằng `onPublishPreview`/`onPublish` trả Promise do test giữ: bước 1 (chọn lớp), lỗi chưa chọn lớp, đang phân tích, bước 2 chưa khớp, đã khớp, đang công bố, lỗi công bố. Ở **mọi trạng thái** assert: không có ký tự emoji trong text, `placeholder`, `title`, `aria-label`, `value` của modal; icon SVG có mặt ở nút Quay lại, Điền tự động và dòng trạng thái; sau lỗi công bố nhãn nút được khôi phục và spinner được gỡ; sau dispose modal bị xóa khỏi DOM.
- Fixture sandbox (`BUILDER_STATIC_STYLE_PARITY`) bổ sung: giữ request bằng cổng Promise, assert nút đang tải có `svg.spin`, nhãn `Đang chấm AI`, không có emoji; sau phản hồi nhãn `Chấm thử AI` được khôi phục.
- Kiểm tra bằng mắt ảnh bước 2: icon clipboard, chevron quay lại, dấu check, cảnh báo hiển thị đúng căn chỉnh.
- Smoke vòng đời đầy đủ: root và `/preview-base` × 3 viewport, 10 vòng mount/dispose mỗi lượt, 0 browser errors, 13 CSS responses 200.
- Quét lại toàn dashboard: mã nguồn JS/HTML/CSS không còn emoji màu ngoài danh sách dưới đây.

## Còn lại có chủ đích (không thuộc đợt này)

- `studio/simulation.js:1249-1252` (`⏸ Tạm dừng audio`, `▶ Phát audio`): nút `.btn-sim-audio-play` do renderer canonical dựng, giao diện học viên dùng chung; cần đợt riêng kèm test candidate.
- `✓`, `✗`, `←`, `→`, `⇄` (U+2713/2717/2190/2192/21C4): ký tự chữ dạng dingbat/mũi tên, không phải emoji màu trong danh sách cấm; một số dùng trong chuỗi so khớp/phân tích dữ liệu (`content-import.js`, `results/presentation.js`).

## Phát hiện ngoài phạm vi: tên icon không tồn tại

`renderSvgIcon` trả chuỗi rỗng khi tên không có trong `ICONS`. Đã xác minh bằng cách gọi hàm thật: `move`, `play`, `pause`, `volume`, `info`, `arrow-right`, `eye`, `refresh` đều không tồn tại (đúng tên là `arrowRight`, không có `play/pause`…). Các nút liên quan (Tiếp tục ở bước 1 công bố, Nghe thử, Xem trước ảnh, Áp dụng cho cả phần này, nút chuyển bài tập…) hiện không hiển thị icon. Không sửa vì sẽ đổi giao diện; cần quyết định riêng về bộ icon.

## Giới hạn

- Bật cờ parity vẫn gặp assertion focus có sẵn của harness; fixture chạy ở chế độ `CAPTURE_ONLY`, lifecycle smoke chạy riêng.
- Chưa kiểm với API công bố/AI Gateway thật hay Pages deployment.
- Artifacts nằm trong scratchpad của phiên: `pub-try/`, `emoji-smoke/`, `emoji-assert/`.

Rollback: revert commit như một đơn vị.
