# Mô hình ẩn/hiện: chuyển `display: none` inline sang thuộc tính `hidden`

Ngày 11/11/2026. Baseline `2e84198` (`feature/test-studio`). Đợt 1 trong nhiều đợt (theo nhóm phần tử).

## Quy ước

- Phần tử ẩn ban đầu dùng thuộc tính `hidden`; JS bật/tắt bằng `el.hidden`, đọc trạng thái bằng `el.hidden`. Không dùng class ẩn thứ ba (tránh ba mô hình: inline, class, `hidden`).
- `styles/01-foundation.css:1` có `[hidden] { display: none !important; }`. Vì `!important` thắng inline, **mỗi phần tử phải chuyển trọn gói trong một commit**: template, mọi chỗ bật/tắt (`style.display = ...`), mọi chỗ đọc (`style.display === 'none'`). Chuyển template mà bỏ sót một chỗ `style.display = 'block'` thì phần tử không bao giờ hiện lại. Tìm theo class/id trên toàn `teacher-dashboard/`, không theo file.
- Trước mỗi nhóm: lập bảng `display` khi hiện (giá trị JS gán inline so với giá trị CSS sẽ áp dụng sau khi bỏ inline). Nếu khác nhau thì thêm rule CSS có scope giữ nguyên giá trị hiện tại, không chấp nhận lệch.

## Danh sách nhóm và thứ tự

| # | Nhóm | Vị trí template | Ghi chú rủi ro |
|---|---|---|---|
| 1 | **Vocabulary bank + bulk paste** (đợt này) | `question-renderer.js` 998, 1016 | Hai panel `div` block; xong |
| 2 | Rubric panes + sandbox results + ngữ cảnh AI | 1093, 1142, 1147, 1156 | `display` ban đầu của ngữ cảnh AI phụ thuộc dữ liệu |
| 3 | Pictorial lỗi/ảnh xem trước | 831, 832 | `pictorial.js` đặt `inline-block` nhưng CSS fragment 05 là `block`; `onerror` đặt `inline-block` nhưng fragment 09 là `inline-flex` — cần rule giữ giá trị |
| 4 | Publishing (5), media (2), vocabulary.js (1) | | modal đặt `flex`; `liveStatus`/`endedNotice` đặt `inline-flex` |
| 5 | Rich editor (popup bảng/ảnh, lỗi, textarea mã) | 491, 512, 518, 535, 538, 1310, 1332, 1338, 1360, 1363 + `rich-editor.js` | **Rủi ro cao nhất**: `draft-inputs.js:25` đọc `vEl.style.display !== 'none'` để chọn nguồn lưu (editor trực quan hay mã HTML); `builder.js` 2944/2988 đọc cùng cờ. Lệch = lưu nhầm nội dung. Cần test hành vi chuyển chế độ → sửa → lưu trước khi chuyển. `builder.js` (2879, 2992, 2998, 3170) và `rich-editor.js` (206, 287, 293, 418) dường như bật/tắt cùng các phần tử; phải xác định đường nào đang chạy hoặc chuyển cả hai |

## Đợt 1: Vocabulary bank + bulk paste

- `studio/question-renderer.js`: `#vocab-bank-*` và `#vocab-bulk-paste-*` từ `style="display: none;"` sang `hidden`.
- `studio/builder.js`: nút bật/tắt bulk (đọc `panel.hidden`, đảo, giữ focus vào textarea khi mở), nút Hủy (`panel.hidden = true`), nút bật/tắt bank (đọc/đảo `targetEl.hidden`). Giá trị hiện trước là `block`, và CSS không đặt `display` cho `.vocab-bank-collapsible`/`.vocab-bulk-paste-panel` nên giữ `block` mặc định của `div` — không cần rule bổ sung. Hành vi cũ `|| !panel.style.display` (coi inline rỗng là ẩn) không còn cần vì trạng thái ban đầu được khai báo bằng `hidden`.
- Test: `tests/test-studio-vocab-pair-meaning-bank.test.mjs` thêm 3 assertion (panel có `hidden`, không còn `display: none` inline). Đã kiểm **đỏ trên template cũ, xanh sau thay đổi**.
- Inventory 167 → 160.

### Xác minh

- Fixture mới `tests/browser/toggle-visibility-parity.mjs` (dùng chung cho các nhóm sau, chọn nhóm bằng `GROUPS=vocab,...`): mount Builder thật với 2 câu Vocabulary, chạy kịch bản đóng → mở bank → mở bulk (kiểm focus textarea) → bulk toggle đóng/mở lại → Hủy → đóng bank → mở lại bank, khẳng định `isVisible()` từng bước và chụp computed style + ảnh ở các trạng thái đóng/mở. 4 trạng thái × 3 viewport. Bộ so sánh dùng chung: `node tests/browser/grading-modal-parity.mjs --compare <before> <after>`.
- **12/12 computed snapshots giống baseline.** 0 browser errors.
- PNG: 9/12 trùng từng byte; 3 ảnh trạng thái mở khác nhau. Chạy baseline lần hai cho thấy **baseline tự khác chính nó** ở các ảnh trạng thái mở (`1024-vocab-bank-open`, `1440-vocab-bulk-open` khác giữa hai lần chạy baseline; computed không đổi), nên đó là nhiễu render (nhiều khả năng khử răng cưa viền đứt nét/focus), không phải lệch do thay đổi. Chưa đo số pixel.
- `npm test`: 671/671 pass; `node scripts/css-metadata.mjs check` khớp (không đổi CSS).

## Phát hiện cần quyết định (chưa thay đổi)

- `index.html:442` `#assignment-link-bar` có cả `hidden` lẫn `style="display:none !important;"`, trong khi `results/view.js` (91–99) và `shell/dashboard.js` (827, 876–882, comment "legacy") vẫn bật/tắt `hidden`. Inline `!important` khiến phần tử **không bao giờ hiển thị**: có thể là UI cũ bị ẩn có chủ đích, hoặc mã chết chưa dọn. Không động vào trong lộ trình này; cần chủ sản phẩm xác nhận trước khi xóa.

## Giới hạn

- Mới một nhóm. 29 vị trí template ban đầu `display: none` còn lại (xem bảng).
- Chưa chạy lại smoke vòng đời `/preview-base`.
- Fixture mới chỉ có nhóm `vocab`; mỗi nhóm sau phải thêm kịch bản mở/đóng tương ứng (đặc biệt popup rich editor, lỗi ảnh Pictorial, sandbox).

Rollback: revert commit như một đơn vị.
