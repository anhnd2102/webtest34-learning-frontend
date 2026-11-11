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
| 5 | **Rich editor (popup bảng/ảnh, lỗi, textarea mã)** (đợt 5, xong) | 491, 512, 518, 535, 538, 1310, 1332, 1338, 1360, 1363 + `rich-editor.js` | **Rủi ro cao nhất**: `draft-inputs.js:25` đọc `vEl.style.display !== 'none'` để chọn nguồn lưu (editor trực quan hay mã HTML); `builder.js` 2944/2988 đọc cùng cờ. Lệch = lưu nhầm nội dung. Cần test hành vi chuyển chế độ → sửa → lưu trước khi chuyển. `builder.js` (2879, 2992, 2998, 3170) và `rich-editor.js` (206, 287, 293, 418) dường như bật/tắt cùng các phần tử; phải xác định đường nào đang chạy hoặc chuyển cả hai |

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

## Đợt 5: Rich editor (nhóm rủi ro cao)

Có **hai bộ nối dây song song** cho cùng loại editor, cộng một chỗ đọc ở `draft-inputs.js`:

- Editor trong Builder (đoạn văn đọc hiểu `.input-reading-passage` và đề bài `.item-prompt-input`): template ở `question-renderer.js` (10 vị trí), nối dây trong khối inline của `builder.js` (đóng popup, lỗi chung/lỗi ảnh, chuyển chế độ, bật/tắt bảng/ảnh, chèn ảnh, click ngoài đóng popup).
- `renderRichHtmlEditor` trong `rich-editor.js` (template 5 vị trí và nối dây riêng, xuất qua facade; hiện chỉ test và facade dùng).
- `draft-inputs.js:25` quyết định nguồn lưu theo `vEl.style.display !== 'none'`.

Cả ba chuyển **cùng một lượt**: template dùng `hidden`; mọi `style.display = ...` đổi sang `.hidden`; mọi chỗ đọc đổi sang `!el.hidden` (`isVisible` của popup, `isCodeVisible`/`isCurrentlyVisual` trong `builder.js`, `!vEl.hidden` trong `draft-inputs.js`); các guard `el && el.style` (chỉ để chịu mock) được gỡ. Kèm theo `.audio-drive-warning` trong `builder.js` (template có điều kiện và bộ cập nhật khi nhập link) vì cùng kiểu ẩn/hiện.

### Bảng `display` khi hiện và hai rule giữ nguyên giao diện

| Phần tử | JS cũ đặt | CSS gốc | Xử lý |
|---|---|---|---|
| Popup bảng/ảnh (`.rich-editor__popup`) | `grid` | `grid` | trùng, không cần rule |
| Lỗi chung (`.general-editor-error`) | `flex` | `flex` (`.rich-editor__error`) | trùng |
| Lỗi ảnh (`.popup-image-error`) | `block` | `flex` (`.rich-editor__error`) | **lệch** → `.rich-editor__error.popup-image-error:not([hidden]) { display: block; }` |
| Ô mã HTML (`.rich-editor__code`) | `block` | không đặt (textarea `inline-block`) | **lệch** (+4px chiều cao) → `.rich-editor__code:not([hidden]), .rich-editor-code:not([hidden]) { display: block; }` |
| Vùng trực quan (`.rich-editor-visual`) | `block` | `div` (block) | trùng |
| Cảnh báo link Drive (`.audio-drive-warning`) | `block` | không đặt (block) | trùng |

Hai chỗ lệch được **phát hiện bằng chính fixture trước khi thêm rule** (chạy bản đã đổi nhưng chưa có rule: `display: block -> flex` ở lỗi ảnh, `block -> inline-block` và +4px ở ô mã) rồi thêm rule ở fragment 12.

### Kiểm thử an toàn dữ liệu (nguồn lưu đúng editor đang hiển thị)

Viết **trước khi chuyển** và chạy xanh trên mã cũ:

- Fixture `richeditor` (nhiều bước, `isVisible()` từng bước) trên cả hai editor (đề bài cloze, đoạn văn đọc hiểu): mặc định chỉ vùng trực quan hiện; bật/tắt bảng và ảnh (nút bật hai lần = tắt); lỗi ảnh khi URL rỗng; mở lại xóa lỗi; mở popup này đóng popup kia; click ngoài đóng popup; chuyển sang mã HTML đóng popup, hiện ô mã, ẩn vùng trực quan; quay lại.
- Kịch bản lưu thật qua `onSaveDraft` (nút Lưu): (1) sửa ở chế độ trực quan rồi lưu → payload có nội dung trực quan; (2) chuyển sang mã HTML, sửa mã, lưu → payload có nội dung mã và **không** còn nội dung trực quan cũ; (3) quay lại trực quan thấy nội dung mã, sửa, lưu → payload có nội dung trực quan mới, **không** còn mã cũ; (4) sửa trực quan rồi chuyển sang mã HTML ngay (đồng bộ vào ô mã) và lưu → giữ bản mới nhất; (5) đoạn văn đọc hiểu lưu đúng ở cả hai chế độ.
- Test đơn vị `tests/draft-inputs-rich-editor-source.test.mjs` (mới): `syncInputs` chép trực quan → ô mã khi vùng trực quan hiện, và **không ghi đè ô mã** khi vùng trực quan ẩn (chế độ mã). Đỏ trên mã cũ (mock không có `style`), xanh sau thay đổi.
- Các test hiện có cập nhật mock từ `style.display` sang `hidden` (`test-studio-rich-html-editor`, `test-studio-inline-cloze-table-and-drive-preview`) và thêm assertion template (`hidden` cho ô mã, popup, vùng lỗi ở cả hai nguồn editor; không còn display inline) — **đỏ trên mã cũ, xanh sau thay đổi**.

### Xác minh đợt 5

- Fixture thêm nhóm `richeditor` và `audiowarn`. So với baseline từ worktree tạm tại `2f28172`: **42/42 computed snapshots giống baseline**; PNG: 40/42 trùng từng byte, 2 ảnh (`1024-rich-passage-table-menu`, `1024-rich-passage-code-mode`) lệch **đúng 1 pixel, 1/255**, cùng vị trí (426,4) — nhiễu khử răng cưa (đo bằng công cụ mới `tests/browser/png-diff.mjs`, đếm pixel bằng canvas của Chrome); computed không đổi. 0 browser errors.
- `npm test`: 675/675; `css-metadata check` khớp. **Smoke vòng đời builder** (`builder-lifecycle-smoke`: 10 vòng mount/dispose × 3 viewport, 0 lỗi) và **smoke tích hợp đầy đủ** (`dashboard-integration-smoke`, root và `/preview-base`) đều **đạt** — các lượt này đã chạy cho đợt 5 (chưa chạy lại cho các đợt 1–4 riêng lẻ).
- Inventory 105 → 54.

### Lưu ý khi viết fixture

Bấm chuột thật vào nút "Mã HTML" ngay sau khi mở menu bảng làm Playwright báo phần tử không hiển thị ở khung hẹp (bố cục thanh công cụ ở 390px); fixture kích hoạt sự kiện click trực tiếp (`dispatchEvent`) cho các nút chuyển chế độ và nút Lưu. Chưa điều tra nguyên nhân bố cục; không ảnh hưởng logic ẩn/hiện đang kiểm.

## Đợt 6: các chỗ còn lại ngoài bảng ban đầu

Mỗi nhóm một fixture riêng, một commit riêng. Baseline chạy một lần từ worktree tại `083bb01`.

### 6a. Thẻ khối đang chọn (`builder.js`)

- `style="display: block|none"` theo `isActiveBlock` → `hidden` (`${isActiveBlock ? '' : ' hidden'}`). Chỉ quyết định lúc render (mỗi lần chuyển Phần là render lại); không có JS bật/tắt và không có chỗ đọc `style.display`.
- Bảng `display`: `.builder-block-card` không đặt `display` (rule ở fragment 03 chỉ có nền/viền); inline `block` trùng `block` mặc định của `div`. Không cần rule bổ sung.
- Fixture `blocktab`: 3 Phần, chuyển bằng các chip điều hướng (`.btn-block-jump-chip`), khẳng định chỉ một Phần hiện ở mỗi bước. **9/9 computed snapshots giống baseline, 9/9 PNG trùng từng byte.**
- Test: `test-studio-block-tab-visibility.test.mjs` (mới) và `test-studio-move-exercise-between-blocks.test.mjs` (khẳng định cũ `style="display: block;"` đổi sang kiểm `hidden` trên đúng thẻ khối). Đỏ trên mã cũ, xanh sau thay đổi. Inventory 54 → 53.

### 6b. Nhóm ngữ cảnh chung của modal tạo câu Rubric hàng loạt (`authoring/rubric.js`)

- `updateCtxVisibility` đặt `ctxGroup.hidden = typeSel.value !== 'comprehension'` thay cho `style.display = 'block'|'none'`. Template không có trạng thái ẩn ban đầu (hàm được gọi ngay khi gắn), nên không đổi template.
- Bảng `display`: `#generic-batch-modal .batch-rubric-context-group` không đặt `display` (block mặc định), trùng `block` của JS cũ. Không cần rule bổ sung.
- Fixture `rubricmodal`: mở modal, chuyển tab "Tạo nhanh", đổi preset Hiểu bài đọc → Dịch → Hiểu bài đọc, đóng, mở lại; khẳng định `isVisible()` từng bước. **6/6 computed snapshots giống baseline.** Ảnh: lần chạy baseline đầu khác lần sau ~64 pixel (tối đa 3/255, hàng cuối modal) nên **ảnh sau thay đổi được so với lần chạy baseline thứ hai: 6/6 trùng khít** (đo bằng `tests/browser/png-diff.mjs`); chênh giữa hai lần chạy baseline là nhiễu render sẵn có.
- Không có test đơn vị riêng: hàm nằm trong closure của modal và đã có khẳng định hiển thị trong fixture (và `BATCH_MODALS_STYLE_PARITY` của smoke tích hợp). Inventory 53 → 51.

### 6c. Hàng "bài tập mốc" trong modal chuyển bài tập (`move-exercise-modal.js`)

- Trường hợp đặc biệt: hàng này **ẩn bằng CSS** (`#modal-move-exercise .move-layout-anchor-field { display: none; }`, do đợt tách CSS trước đưa style tĩnh ra fragment 06) rồi JS bật bằng inline `block`. Chuyển trọn gói: template thêm `hidden`; 5 chỗ `style.display` → `.hidden`; **xóa `display: none` khỏi rule CSS** (nếu để lại thì `hidden = false` chỉ gỡ thuộc tính và hàng không bao giờ hiện).
- Bảng `display`: hết `display: none` thì `.form-group` là `block` mặc định, trùng `block` của JS cũ.
- Fixture `moveex`: mở modal từ nút chuyển của Phần 1 (có Bài tập mốc khác), đổi vị trí chèn (cuối → trước bài tập → cuối → sau bài tập), đổi Phần đích (Phần 2 có bài tập), hủy; rồi mở lại từ Phần chỉ có đúng bài tập đang chuyển (không có bài tập mốc nào khác): hàng phải ẩn, chọn "sau bài tập" phải tự trả về "cuối". **15/15 computed snapshots giống baseline, 15/15 PNG trùng từng byte.**
- Test: `tests/move-exercise-anchor-row-visibility.test.mjs` (mới, 3 test kiểm hợp đồng trên mã nguồn vì modal cần DOM thật: template có `hidden`, JS chỉ dùng `.hidden` (3 lần ẩn, 2 lần hiện), rule CSS không còn `display`). Đỏ trên mã cũ (3/3), xanh sau thay đổi. Inventory 51 → 46.

## Phát hiện cần quyết định (chưa thay đổi)

- `index.html:442` `#assignment-link-bar` có cả `hidden` lẫn `style="display:none !important;"`, trong khi `results/view.js` (91–99) và `shell/dashboard.js` (827, 876–882, comment "legacy") vẫn bật/tắt `hidden`. Inline `!important` khiến phần tử **không bao giờ hiển thị**: có thể là UI cũ bị ẩn có chủ đích, hoặc mã chết chưa dọn. Không động vào trong lộ trình này; cần chủ sản phẩm xác nhận trước khi xóa.

## Giới hạn

- Đã xong cả năm nhóm trong bảng. Còn các chỗ `style.display` ngoài bảng: `batch-import.js` (modal/preview tạo hàng loạt), `move-exercise-modal.js`, `simulation.js` (modal mô phỏng, nút lọc), `authoring/rubric.js` (`ctxGroup`) và template ở `builder.js:478` (thẻ khối đang chọn: `style="display: block|none"` theo `isActiveBlock`, chỉ quyết định lúc render, không có JS bật/tắt; inline `block` đang thắng các rule `display` của `.builder-block-card` nên cần bảng `display` riêng trước khi đổi); chưa chuyển vì ngoài phạm vi các nhóm đã lập kế hoạch và vì mỗi nhóm cần fixture riêng.
- Chưa chạy lại smoke vòng đời `/preview-base`.
- Fixture hiện có nhóm `vocab`, `rubric`, `pictorial`, `publishing`, `vocabbatch`, `media`, `richeditor` và `audiowarn`; mỗi nhóm sau phải thêm kịch bản mở/đóng tương ứng (đặc biệt popup rich editor, lỗi ảnh Pictorial, sandbox).

Rollback: revert commit như một đơn vị.
