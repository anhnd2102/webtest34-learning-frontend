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
| 2 | **Rubric panes + sandbox results + ngữ cảnh AI** (đợt 2, xong) | 1093, 1142, 1147, 1156 | `display` ban đầu của ngữ cảnh AI phụ thuộc dữ liệu |
| 3 | **Pictorial lỗi/ảnh xem trước** (đợt 3, xong) | 831, 832 | `pictorial.js` đặt `inline-block` nhưng CSS fragment 05 là `block`; `onerror` đặt `inline-block` nhưng fragment 09 là `inline-flex` — cần rule giữ giá trị |
| 4 | **Publishing (5), media (2), vocabulary.js (1)** (đợt 4, xong) | | modal đặt `flex`; `liveStatus`/`endedNotice` đặt `inline-flex` |
| 5 | Rich editor (popup bảng/ảnh, lỗi, textarea mã) | 491, 512, 518, 535, 538, 1310, 1332, 1338, 1360, 1363 + `rich-editor.js` | **Rủi ro cao nhất**: `draft-inputs.js:25` đọc `vEl.style.display !== 'none'` để chọn nguồn lưu (editor trực quan hay mã HTML); `builder.js` 2944/2988 đọc cùng cờ. Lệch = lưu nhầm nội dung. Cần test hành vi chuyển chế độ → sửa → lưu trước khi chuyển. `builder.js` (2879, 2992, 2998, 3170) và `rich-editor.js` (206, 287, 293, 418) dường như bật/tắt cùng các phần tử; phải xác định đường nào đang chạy hoặc chuyển cả hai |

## Đợt 1: Vocabulary bank + bulk paste

- `studio/question-renderer.js`: `#vocab-bank-*` và `#vocab-bulk-paste-*` từ `style="display: none;"` sang `hidden`.
- `studio/builder.js`: nút bật/tắt bulk (đọc `panel.hidden`, đảo, giữ focus vào textarea khi mở), nút Hủy (`panel.hidden = true`), nút bật/tắt bank (đọc/đảo `targetEl.hidden`). Giá trị hiện trước là `block`, và CSS không đặt `display` cho `.vocab-bank-collapsible`/`.vocab-bulk-paste-panel` nên giữ `block` mặc định của `div` — không cần rule bổ sung. Hành vi cũ `|| !panel.style.display` (coi inline rỗng là ẩn) không còn cần vì trạng thái ban đầu được khai báo bằng `hidden`.
- Test: `tests/test-studio-vocab-pair-meaning-bank.test.mjs` thêm 3 assertion (panel có `hidden`, không còn `display: none` inline). Đã kiểm **đỏ trên template cũ, xanh sau thay đổi**.
- Inventory 167 → 160.

### Xác minh

- Fixture mới `tests/browser/toggle-visibility-parity.mjs` (dùng chung cho các nhóm sau, chọn nhóm bằng `TOGGLE_GROUPS=vocab,...`): mount Builder thật với 2 câu Vocabulary, chạy kịch bản đóng → mở bank → mở bulk (kiểm focus textarea) → bulk toggle đóng/mở lại → Hủy → đóng bank → mở lại bank, khẳng định `isVisible()` từng bước và chụp computed style + ảnh ở các trạng thái đóng/mở. 4 trạng thái × 3 viewport. Bộ so sánh dùng chung: `node tests/browser/grading-modal-parity.mjs --compare <before> <after>`.
- **12/12 computed snapshots giống baseline.** 0 browser errors.
- PNG: 9/12 trùng từng byte; 3 ảnh trạng thái mở khác nhau. Chạy baseline lần hai cho thấy **baseline tự khác chính nó** ở các ảnh trạng thái mở (`1024-vocab-bank-open`, `1440-vocab-bulk-open` khác giữa hai lần chạy baseline; computed không đổi), nên đó là nhiễu render (nhiều khả năng khử răng cưa viền đứt nét/focus), không phải lệch do thay đổi. Chưa đo số pixel.
- `npm test`: 671/671 pass; `node scripts/css-metadata.mjs check` khớp (không đổi CSS).

## Đợt 2: Rubric panes, sandbox results, ngữ cảnh AI

- `question-renderer.js`: `#pane-guidance-*`, `#pane-sandbox-*` và `.sandbox-results-container` dùng `hidden`; `#ai-ref-group-*` dùng `hidden` có điều kiện (`${showItemContextInitially ? '' : ' hidden'}`) thay cho `style="display: block|none"`.
- `builder.js`: bộ chuyển tab rubric đặt `pane.hidden = tab !== '<tên>'` cho cả ba pane (trước đó đặt `flex`/`none`); chấm thử sandbox đặt `resultsContainer.hidden = false` (trước đó `block`).
- Bảng `display` khi hiện: `.rubric-tab-pane` đã có `display: flex` trong fragment 04 (trùng giá trị JS cũ `flex`); `.sandbox-results-container` và `.ai-reference-context-group` không đặt `display` nên là `block` mặc định của `div` (trùng `block` cũ). Không cần rule bổ sung.
- Nhóm này không có chỗ nào đọc `style.display` làm trạng thái; `#ai-ref-group-*` chỉ do template quyết định, không có JS bật/tắt sau đó.
- Test: `tests/test-studio-ai-rubric.test.mjs` thêm 6 assertion (ngữ cảnh riêng không ẩn, hai pane và kết quả sandbox có `hidden`, pane tiêu chí không ẩn, không còn inline display). Đã kiểm **đỏ trên template cũ, xanh sau thay đổi**.
- Inventory 160 → 152.

### Xác minh đợt 2

- Fixture `toggle-visibility-parity.mjs` thêm nhóm `rubric` (`TOGGLE_GROUPS=rubric`): 3 câu (ngữ cảnh kế thừa từ Bài tập → ẩn; comprehension không ngữ cảnh → hiện; có ngữ cảnh riêng → hiện), duyệt 3 tab (tiêu chí, hướng dẫn, chấm thử), khẳng định chỉ một pane hiện ở mỗi tab, chạy chấm thử sandbox (API giả lập bằng route) rồi kiểm kết quả hiện và còn hiện khi đổi tab. 7 trạng thái × 3 viewport.
- **21/21 computed snapshots giống baseline và 21/21 PNG trùng từng byte**; baseline chạy hai lần cũng trùng nhau (không nhiễu ở nhóm này). 0 browser errors.
- `npm test`: 671/671 pass; `css-metadata check` khớp.

## Đợt 3: Pictorial (ảnh xem trước + huy hiệu lỗi)

- `question-renderer.js`: `<img class="pictorial-preview-img">` dùng `hidden` khi chưa có `imgSrc`; huy hiệu `.pictorial-preview-error` dùng `hidden`. Hai handler nội tuyến trong template đổi sang `hidden`: `onerror` → `this.hidden = true` + hiện huy hiệu; `onload` → ẩn huy hiệu + `this.hidden = false`.
- `authoring/pictorial.js`: hai chỗ cập nhật xem trước (sự kiện nhập và nút "Xem trước ảnh") đặt `previewImg.hidden`/`previewErr.hidden` thay cho `style.display`.
- **Lệch `display` đúng như đã dự đoán, đã sửa**: JS cũ đặt huy hiệu lỗi `inline-block` (thắng `display: inline-flex` ở fragment 09), nên sau khi chỉ đổi sang `hidden` thì huy hiệu thành `flex`, cao thêm 17px (phát hiện bằng so sánh computed: `display: block -> flex`, `height: 82px -> 99px`). Thêm rule `.pictorial-thumb-preview .pictorial-preview-error:not([hidden]) { display: inline-block; }` ở fragment 12 để giữ nguyên. Ảnh xem trước không cần rule: JS cũ đặt `inline-block` nhưng ảnh là flex item (blockify thành `block`), trùng `display: block` của fragment 05.
- Test: `tests/test-studio-pictorial-vocab.test.mjs` thêm 5 assertion về `hidden`/handler (đã kiểm **đỏ trên template cũ, xanh sau thay đổi**); `tests/test-studio-inline-cloze-table-and-drive-preview.test.mjs` đổi mock từ `style.display` sang `hidden` (`mockImg.hidden === false`, `mockErr.hidden === true`).
- Inventory 152 → 142; rule map 1841 → 1842.

### Sửa lỗi huy hiệu ảnh trống (đợt 3b, thay đổi hành vi có chủ đích)

Lỗi có sẵn từ baseline: `<img src="">` phát sự kiện `error`, nên `onerror` hiện huy hiệu "Không thể tải ảnh" **cả ở thẻ chưa có ảnh** và ngay sau khi giáo viên xóa URL (JS gán `src = ''`). Đã sửa:

- `question-renderer.js`: không in thuộc tính `src` khi `imgSrc` rỗng (`${imgSrc ? ` src="..."` : ' hidden'}`).
- `authoring/pictorial.js`: hai chỗ xóa xem trước dùng `previewImg.removeAttribute('src')` thay cho `src = ''`.
- Test: `test-studio-pictorial-vocab.test.mjs` (thẻ trống không có `src`, thẻ có ảnh giữ `src`) và `test-studio-inline-cloze-table-and-drive-preview.test.mjs` (xóa URL gỡ `src`, ẩn ảnh, không hiện huy hiệu). Cả hai nhóm test **đỏ trên mã cũ, xanh sau thay đổi**. Lưu ý khi viết test: `renderTestBuilderView` lưu trạng thái theo id form, nên hai lần render cùng id trả về dữ liệu lần đầu; dùng id khác cho mỗi trường hợp.
- Fixture `pictorial` đổi khẳng định sang hành vi mới (huy hiệu ẩn ở thẻ trống và sau khi xóa; `src` bị gỡ).
- So sánh với baseline cũ: **12/12 trạng thái không liên quan giữ nguyên** (computed và PNG của câu có ảnh, nhập URL hợp lệ, URL lỗi, nút xem trước). **Chỉ 6 trạng thái "không ảnh" và "đã xóa" (3 viewport × 2) khác**, và khác biệt đúng là huy hiệu chuyển từ `display: block` sang `none`, thẻ co lại 86px (463px → 377px); không có thuộc tính nào khác đổi.
- `npm test`: 671/671 + test mới; `css-metadata check` khớp.

### Xác minh đợt 3

- Fixture `toggle-visibility-parity.mjs` thêm nhóm `pictorial` (`TOGGLE_GROUPS=pictorial`): câu có ảnh, câu không ảnh, nhập URL hợp lệ, nhập URL lỗi (404), xóa URL, nút xem trước. 6 trạng thái × 3 viewport; khẳng định `isVisible()` của ảnh và huy hiệu ở từng bước, bao gồm trạng thái ảnh lỗi mà các fixture trước chưa phủ.
- **18/18 computed snapshots giống baseline và 18/18 PNG trùng từng byte** tại thời điểm đợt 3 (sau khi thêm rule giữ `inline-block`; đợt 3b sau đó cố ý đổi 6 trạng thái, xem trên); baseline chạy hai lần trùng nhau 18/18. 0 browser errors.
- `npm test`: 671/671 pass; `css-metadata check` khớp.

## Đợt 4: Publishing, media (audio dock), vocabulary batch

- `publishing.js`: `#replace-subfields`, `#add-subfields`, `#specific-classes-container` (template có điều kiện: `${cond ? '' : ' hidden'}`), hai `#publishing-error-msg` (step 1 và 2) dùng `hidden`; mọi `style.display` bật/tắt (radio mục tiêu/phạm vi, lỗi, nút Đóng/Hủy, mở modal) đổi sang `.hidden`. Hai overlay `#smart-publishing-modal` và `#publish-report-dialog` cũng đổi (đóng = `hidden = true`, mở = `hidden = false`): CSS fragment 06 đã có `display: flex` cho cả hai overlay nên inline `flex` trước đó dư.
- `media.js`: `.audio-live-status`, `.audio-ended-notice` (`hidden`), nút "Bắt đầu nghe" ẩn bằng `.hidden = true` sau khi bấm; cả hai bộ dock (render và `initStrictCandidateAudioDocks`) đổi cùng lúc. Bảng `display`: `.strict-audio-body .audio-live-status/.audio-ended-notice` đã là `inline-flex` trong CSS, trùng giá trị JS cũ.
- `authoring/vocabulary.js`: `.vocab-preview-summary` (`hidden`; CSS không đặt display nên `block` mặc định, trùng JS cũ) và overlay `#batch-vocab-pair-modal` (CSS fragment 04 đã `flex`).
- Mọi `style.display` trong ba file đã chuyển hết (grep còn 0). Inventory 142 → 105.
- **Lệch `display` có chủ đích, đã xử lý**: `.specific-classes-container` có `display: flex` + `gap` trong CSS, nhưng JS cũ bật bằng radio với inline `block` — nên đường giáo viên thường thấy (bật bằng radio) là `block`, còn đường render lại bước 1 với phạm vi lớp đã chọn (nút Tiếp tục khi lỗi, Quay lại từ bước 2) là `flex`. Hai đường này vốn không nhất quán. Giữ nguyên đường thường thấy: thêm `.specific-classes-container:not([hidden]) { display: block; }` ở fragment 12. **Hệ quả: đường render lại đổi từ `flex` sang `block`** (danh sách lớp mất khoảng cách 10px, thấp hơn 20px) và nay giống đường bật bằng radio. Nếu muốn dùng thiết kế `flex + gap` cho cả hai thì xóa rule này và chấp nhận thay đổi giao diện đường chính.
- Test: `test-studio-smart-publishing.test.mjs` (5 assertion: ba panel và lỗi có `hidden`, panel mặc định hiện không `hidden`, không còn display inline) và `test-studio-google-drive-audio.test.mjs` (2 assertion). **Đỏ trên mã cũ (2 test), xanh sau thay đổi.**

### Xác minh đợt 4

- Fixture thêm ba nhóm: `publishing` (mở wizard, đổi mục tiêu thay thế/bổ sung, đổi phạm vi toàn khóa/lớp chọn hai lượt, lỗi chưa chọn lớp, đóng bằng X rồi mở lại, sang bước 2, lỗi công bố, Quay lại bước 1, công bố thành công → hộp báo cáo → đóng), `vocabbatch` (modal nhập từ: rỗng, dữ liệu sai, hỗn hợp, xóa, đóng/mở lại) và `media` (dock nghe: ban đầu, đang phát, kết thúc; WAV tổng hợp 0,3 giây phục vụ qua route, tăng `playbackRate` để kết thúc nhanh). Mỗi bước khẳng định `isVisible()`.
- So với baseline từ worktree tạm tại `4316e71`/`dc458b0`: **`media` 9/9 và `vocabbatch` 9/9 computed giống và PNG trùng từng byte; `publishing`: mọi trạng thái giống trừ hai trạng thái đi qua đường render lại (`step1-error`, `classes-after-back`) đúng như mô tả ở trên** (khác biệt chỉ là `display: flex -> block` và `height` −20px của `.specific-classes-container`). 0 browser errors.
- `npm test`: 673/673; `css-metadata check` khớp.

## Phát hiện cần quyết định (chưa thay đổi)

- `index.html:442` `#assignment-link-bar` có cả `hidden` lẫn `style="display:none !important;"`, trong khi `results/view.js` (91–99) và `shell/dashboard.js` (827, 876–882, comment "legacy") vẫn bật/tắt `hidden`. Inline `!important` khiến phần tử **không bao giờ hiển thị**: có thể là UI cũ bị ẩn có chủ đích, hoặc mã chết chưa dọn. Không động vào trong lộ trình này; cần chủ sản phẩm xác nhận trước khi xóa.

## Giới hạn

- Mới bốn nhóm (vocab, rubric, pictorial, publishing/media/vocabulary.js). Còn nhóm 5 (rich editor).
- Chưa chạy lại smoke vòng đời `/preview-base`.
- Fixture hiện có nhóm `vocab`, `rubric`, `pictorial`, `publishing`, `vocabbatch` và `media`; mỗi nhóm sau phải thêm kịch bản mở/đóng tương ứng (đặc biệt popup rich editor, lỗi ảnh Pictorial, sandbox).

Rollback: revert commit như một đơn vị.
