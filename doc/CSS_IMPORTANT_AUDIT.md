# Kiểm toán `!important` trong các fragment CSS của Teacher Dashboard

Ngày 12/11/2026. Baseline `1ad9c8d` + công cụ `ebda2f9`. CSS revision `20261112-important-a`.

## Phạm vi và nguyên tắc

- Chỉ `styles/01–12` (**332** `!important` lúc bắt đầu; kế hoạch cũ nêu 243 là số ước lượng lúc khảo sát). `webtest-34-demo/dynamic-test.css` (285, renderer học viên) **không đụng** — thuộc bước 7, rủi ro cao hơn.
- Đợt này chỉ gỡ `!important` có bằng chứng là vô tác dụng. Không di chuyển rule, không đổi màu/token, không xóa selector "có vẻ không dùng".
- Loại trừ cứng: `[hidden] { display: none !important }` (mô hình ẩn/hiện) và mọi khai báo cùng nhóm longhand với style ghi bằng JS/inline.

## Công cụ

| Công cụ | Việc làm |
|---|---|
| `scripts/css-declarations.mjs` | Kiểm kê mọi khai báo (8.221) với khóa `fragment#thứ-tự-rule#thuộc-tính#nth`, cùng cách đếm rule như `rule-map.json`; `apply` ghi chỉnh sửa theo khóa (`strip-important`, `delete`) thay cho regex tay. Đã kiểm chứng với CSSOM của Chrome (`tests/browser/css-declarations-check.mjs`: 1841 rule, tập longhand `important` bằng nhau ở mọi rule) và có test đơn vị. |
| `scripts/css-important-audit.mjs` | `static`: phân tích tĩnh (đối thủ cùng longhand ở mọi fragment, ghi inline/JS, `@keyframes`). `merge`: gộp với kết quả đo thực nghiệm và phân loại từng khai báo. |
| `tests/browser/helpers/important-audit.mjs` | Đo thực nghiệm trong các fixture: với mỗi khai báo và mỗi trạng thái, tạm bỏ priority, so computed value của mọi longhand trên các phần tử khớp, rồi khôi phục. |
| `scripts/css-duplicates.mjs` | Tìm khai báo chết do bị khai báo trùng thắng (chưa áp dụng, xem cuối tài liệu). |

## Kết quả phân loại 332 khai báo

Đo trên **20 lượt chụp** (13 nhóm fixture `toggle-visibility-parity`, `grading-modal-parity`, `batch-import-parity`, smoke tích hợp mặc định và 15 cờ parity của smoke), mỗi lượt ở 3 viewport (1440, 1024, 390).

| Lớp | Số | Xử lý |
|---|---:|---|
| `strip:inert-observed` — khớp phần tử ở nhiều trạng thái, bỏ priority không đổi computed ở trạng thái nào | 92 | **Gỡ** |
| `strip:inert-static` — không khai báo/inline/animation nào khác đụng cùng longhand (`clip` ở `06-publishing.css`) | 1 | **Gỡ** |
| `keep:load-bearing` — bỏ priority làm đổi computed ở ít nhất một trạng thái (chủ yếu `width`, `height`, `margin`, `min/max-*`) | 24 | Giữ |
| `keep:protected-property` — cùng nhóm longhand với style ghi bằng JS/inline (`width`, `color`, `background`, `border`, `display`, `align-items`...) | 139 | Giữ (bảo thủ: so theo thuộc tính, không theo phần tử) |
| `keep:unobserved` — không bao giờ khớp, selector `:hover`/`:focus`/pseudo-element (35), `@media` không áp dụng (8), thuộc tính fixture tự ghi đè (4), không khớp (10) | 57 | Giữ |
| `keep:animated` — `@keyframes` trong fragment animate cùng longhand (`box-shadow`, `transform`); `!important` thắng animation | 18 | Giữ |
| `keep:hard-excluded` — `[hidden] { display: none !important }` | 1 | Giữ |

Sau thay đổi còn **239** `!important` ở `styles/01–12`.

Các thuộc tính đã gỡ: `padding`, `flex-shrink`, `box-sizing`, `min-width`, `min-height`, `gap`, `white-space`, `max-width`, `cursor`, `flex`, `line-height`, `flex-direction`, `word-break`, `vertical-align`, `overflow`, `z-index`, `max-height`, `user-select`, `accent-color`, `font-family`, `overflow-wrap`, `clip`, `flex-wrap`, `overflow-y`, `inset`, `backdrop-filter`, `border-collapse`. Phân bố: `01` 5, `03` 22, `04` 11, `05` 30, `06` 3, `08` 7, `12` 15; `02`, `07`, `09`, `10`, `11` không có khai báo nào đủ điều kiện gỡ.

Test cập nhật có chủ đích: `test-studio-inline-cloze.test.mjs` từng kiểm chuỗi `!important` của `.inline-blank-wrapper`/`.inline-blank-number`; nay vẫn kiểm các khai báo (`nowrap`, `flex-shrink: 0`, `keep-all`) nhưng không yêu cầu `!important` ở CSS dashboard (phần `dynamic-test.css` giữ nguyên).

## Xác minh

- `npm test`: 688/688.
- Lưới trước/sau cùng Chrome 157, 20 lượt (621 snapshot computed, 624 ảnh): computed **616/621 giống hệt** (băm FNV-1a trên toàn bộ computed property đã sắp xếp theo tên, cộng 23 thuộc tính đọc được). 5 snapshot còn lại đều là nhiễu phụ thuộc thời điểm chụp, đã chứng minh bằng chạy lại cùng CSS:
  - 3 trạng thái `guide-default` (overlay có `animation` 0.2s nên giá trị tức thời khác nhau) và `rich-*-image-popup` (focus đặt trễ 50ms) **tự khác nhau giữa hai lần chạy cùng một cây CSS**;
  - trạng thái `room` của `QUESTION_RENDERER`: ba lần chạy HEAD và hai lần chạy sau thay đổi giống hệt nhau (không lệch), nên lệch lúc đầu là một lần chạy baseline bất thường lúc tải cao.
- Ảnh PNG ở lưới đầy đủ: 556/624 trùng byte; 68 khác. Các nhóm có lệch lớn nhất đã chạy lại ít tải: shell mô phỏng 24/24, câu hỏi mô phỏng 24/24, nhập hàng loạt 15/15 ảnh **giống hệt HEAD**, trong khi chính HEAD tự lệch giữa hai lần chạy ở shell (2 ảnh, tối đa 78 pixel).

## Giới hạn (nói thẳng)

- **Bằng chứng Tier B chỉ phủ các trạng thái đã chụp** (3 viewport; không có hover/focus/disabled; không có dữ liệu thật). Một khai báo "inert-observed" có thể còn tác dụng ở trạng thái chưa chụp.
- **Chưa xác nhận lại ảnh từng nhóm** cho các nhóm còn lại trong 15 nhóm có ảnh lệch ở lưới đầy đủ (chỉ 3 nhóm lớn nhất được chạy lại ít tải): lượt kiểm chứng theo cặp bị máy dừng giữa chừng vì thiếu bộ nhớ. Chênh còn lại nhiều khả năng là nhiễu cùng loại, nhưng đây là suy luận, chưa đo.
- Các khai báo `keep:*` ở trên **không bị đánh giá là thừa**: 139 chỗ bảo thủ vì trùng thuộc tính với style inline/JS (có thể thu hẹp sau bằng phân tích theo phần tử), 57 chưa quan sát được, 18 thắng animation.
- Chrome tự cập nhật giữa phiên (156 → 157): baseline phải chạy cùng phiên bản với lượt so sánh (baseline chạy ở 156 đã bị loại bỏ).

## Bài học về harness

- Thứ tự liệt kê thuộc tính của `getComputedStyle` thay đổi giữa các lần chạy dù giá trị giống hệt; băm toàn bộ thuộc tính phải sắp xếp tên trước.
- Overlay có `animation` (ví dụ `.candidate-sim-overlay`) và focus đặt trễ làm ảnh/computed dao động; fixture nên chờ animation hoặc chụp sau khi ổn định nếu cần so ảnh tuyệt đối.
- Chạy nhiều Chrome song song làm tăng nhiễu và có thể làm cạn bộ nhớ; chạy ít song song hơn khi so ảnh.

## Còn lại (chưa làm)

- **116 khai báo chết do khai báo trùng thắng: ĐÃ GỠ** (13/11/2026, rev `20261112-duplicates-a`) cùng 13 rule rỗng còn lại; rule-map 1828 rule. Kiểm chứng: `npm test` 688/688; computed style của 195 snapshot (13 nhóm `toggle-visibility-parity`, 3 viewport) giống hệt HEAD.
- Thu hẹp 139 khai báo `keep:protected-property` theo từng phần tử thay vì từng thuộc tính.
- `dynamic-test.css` (285 `!important`): thuộc bước 7.
