# Tách handler khỏi closure `mountBuilder` (bước 3, đợt builder)

Ngày 12/11/2026. Chỉ **di chuyển nguyên văn**, không đổi hành vi, API, payload hay CSS. Baseline: `ed767ee`.

## Kết quả

`studio/builder.js`: **3.272 → ~1.000 dòng**. Các nhóm handler của `bindEvents` đã chuyển thành module `bindXxx({ ...phụ thuộc })`:

| Module | Nhóm handler |
|---|---|
| `studio/exercise-actions.js` | thêm/di chuyển/xóa bài tập, chuyển bài tập sang Phần khác, sinh biến thể hàng loạt |
| `studio/audio-preview-actions.js` | nghe thử audio |
| `studio/block-navigation-actions.js`, `block-jump-chips.js` | thêm Phần, Phần trước/sau, nhảy tới Phần |
| `studio/block-csv-import.js` | nhập CSV theo Phần |
| `studio/collapse-actions.js` | thu gọn/mở rộng thẻ, thu gọn/mở rộng tất cả |
| `studio/item-actions.js` | nhập đề câu, di chuyển/kéo thả/xóa câu hỏi |
| `studio/authoring/choice-variant-actions.js`, `variant-input-actions.js`, `vocabulary-actions.js`, `rubric-actions.js` | phương án, biến thể, Cặp từ vựng, tiêu chí rubric |
| `studio/cloze-script-actions.js` | kéo kịch bản cloze |
| `studio/sandbox-actions.js` | chấm thử AI (giữ nguyên `fetch` trực tiếp) |
| `studio/block-actions.js` | đổi chỗ/xóa Phần |
| `studio/toolbar-actions.js` | xem thử, công bố, xóa bản nháp |
| `studio/rich-editor-controls.js` | thanh công cụ rich editor trong thẻ câu hỏi |

## Cách giữ an toàn

- Biến `let` của closure không đi qua ranh giới dưới dạng giá trị: `setActiveBlockIdx`/`getActiveBlockIdx`, `isBuilderDisposed()`, `addCleanup(fn)` (thay cho `renderCycleCleanups.push`) và `markSaved()` (thay cho `isDirty = false`). Hành vi tương đương.
- Phụ thuộc của từng đoạn được dò bằng script (định danh dùng trong đoạn nhưng khai báo ngoài đoạn); import thừa ở `builder.js` đã được dọn.
- Giữ nguyên mọi guard `typeof x.addEventListener === 'function'` và `?.` cho DOM giả.

## Xác minh

- `npm test`: 688/688.
- `builder-lifecycle-smoke`: pass 3 viewport, mount/dispose 10 chu kỳ, 0 lỗi.
- `toggle-visibility-parity` (13 nhóm) so với `HEAD` của đợt CSS: **195/195 computed giống hệt**.
- `dashboard-integration-smoke`: pass.

## Giới hạn

- Test đơn vị dùng DOM giả; các handler chỉ được kiểm khi test có bấm đúng nút. Chưa có test browser bấm từng nút (thêm/xóa/di chuyển bài tập, kéo thả, sandbox thật).
- Request của sandbox, publish, chấm vẫn là `fetch` trực tiếp; thống nhất client/lỗi/auth là commit riêng sau (không retry cho thao tác ghi).
- `shell/dashboard.js`: mới tách khối đồng bộ Portal sang `shell/portal-panel.js` (`createPortalPanel({ root, lifecycle, state, request, document, window })` trả `{ ensurePortalPanel, resetPortal }`; 2.863 → 2.616 dòng). Phần còn lại (reports, grant retake, publish-all, exam switch, profile/role, loadClasses/loadAssignments) chưa tách vì dùng chung ~15 biến `let` bị gán lại; cần thiết kế owner state trước.
- `tests/browser/dashboard-lifecycle-smoke.mjs` hiện lỗi `ERR_MODULE_NOT_FOUND` ngay cả trên bản trước thay đổi (đã kiểm với git stash); chưa điều tra, không do đợt này.

## Smoke bấm thật `tests/browser/builder-actions-smoke.mjs` (12/11/2026)

Chrome thật, API giả, 1440×900. Chạy: `node tests/browser/builder-actions-smoke.mjs`. Kiểm bằng DOM dựng lại sau mỗi thao tác: thêm bài tập (`bindExerciseActions`), di chuyển câu hỏi lên/xuống (`bindItemActions`), thu gọn/mở rộng tất cả (`bindCollapseActions`), xóa câu hỏi, xóa bài tập có câu hỏi (từ chối xác nhận thì giữ nguyên, đồng ý thì xóa), thêm phần (`bindBlockNavigationActions`), di chuyển phần lên/xuống và xóa phần (`bindBlockReorderActions`, xác nhận xóa), rồi lưu nháp và kiểm `checkpoint` được đánh lại 1, 2.
Kiểm tra đột biến: bỏ `return` khi người dùng từ chối xác nhận xóa bài tập thì smoke lỗi; đã hoàn nguyên.
Chưa phủ: nhập CSV, từ vựng/rubric/biến thể lựa chọn, kịch bản cloze, xem trước âm thanh, sandbox, rich editor, kéo-thả câu hỏi.
Đã sửa (12/11/2026): nút xóa câu hỏi (`.btn-delete-item`) không gọi `markAsDirty`, nên xóa câu hỏi rồi rời trang không hiện cảnh báo thay đổi chưa lưu. Test `tests/builder-delete-item-dirty.test.mjs`; kiểm trên trình duyệt: sau khi xóa, bấm quay lại danh mục hiện hộp thoại thay đổi chưa lưu.
Đã sửa tiếp (12/11/2026): thêm bài tập, di chuyển bài tập lên/xuống và di chuyển câu hỏi lên/xuống cũng không gọi `markAsDirty`; test `tests/builder-reorder-dirty.test.mjs`, kiểm trên trình duyệt cả năm thao tác (kể cả xóa câu hỏi) đều hiện hộp thoại thay đổi chưa lưu khi quay lại danh mục.
Đã sửa tiếp (12/11/2026): các thao tác chỉnh nội dung câu hỏi cũng không bật cờ thay đổi chưa lưu: thêm/xóa phương án lựa chọn, xóa biến thể đáp án, sinh biến thể, thêm biến thể thủ công, thêm/xóa nghĩa và sinh biến thể của cặp từ vựng, đổi mẫu rubric, thêm/xóa tiêu chí rubric, lấy ngữ cảnh kịch bản cloze. Ba module (`choice-variant-actions`, `variant-input-actions`, `rubric-actions`) trước đây không nhận `markAsDirty`; `builder.js` giờ truyền vào. Test `tests/builder-authoring-dirty.test.mjs`; trên trình duyệt thêm phương án rồi quay lại danh mục hiện hộp thoại thay đổi chưa lưu.

## Smoke `tests/browser/builder-import-smoke.mjs` (12/11/2026)

Chrome thật, API giả. Chạy: `node tests/browser/builder-import-smoke.mjs`. Kiểm: nhập CSV theo phần (`bindBlockCsvImport` + modal): nút xác nhận bị khóa khi chưa có dữ liệu, xem trước "1 bài tập, 1 câu hỏi", huỷ không đổi gì và không làm bẩn bản nháp, xác nhận thì thêm bài tập và câu hỏi nối tiếp rồi bật cảnh báo thay đổi chưa lưu; kéo-thả câu hỏi (sự kiện HTML5 phát trực tiếp lên tay cầm và thẻ đích) đổi thứ tự, không mất câu và bật cảnh báo; thêm phương án lựa chọn bật cảnh báo.
Kiểm tra đột biến: bỏ `markAsDirty` của thêm phương án thì smoke lỗi; đã hoàn nguyên.
Chưa phủ trên trình duyệt: từ vựng/rubric (có test đơn vị `builder-authoring-dirty.test.mjs`), kịch bản cloze, xem trước âm thanh, sandbox, rich editor, modal chuyển bài tập.

## Smoke `tests/browser/builder-media-smoke.mjs` (12/11/2026)

Chrome thật, API giả, Audio giả. Chạy: `node tests/browser/builder-media-smoke.mjs`. Kiểm: xem trước âm thanh (URL rỗng thì cảnh báo, có URL thì phát một lần, nút đổi Nghe thử/Tạm dừng, bấm lần hai chỉ tạm dừng); rich editor của bài điền từ nội tuyến (gõ vào vùng soạn thảo, đổi sang chế độ HTML và sửa mã, chèn bảng, URL ảnh sai không chèn ảnh) cùng cảnh báo thay đổi chưa lưu; modal chuyển bài tập (huỷ không đổi gì và không làm bẩn, xác nhận chuyển sang Phần khác không mất bài tập và bật cảnh báo); chấm thử AI (sandbox: chưa nhập câu mẫu thì không gọi API, nhập thì đúng một POST với `sampleAnswer`, hiện `3 / 4`, nút được bật lại); lấy kịch bản cloze cho bài tập đọc hiểu (bật cảnh báo, kiểm riêng ở lần mở mới).
Kiểm tra đột biến: bỏ `markAsDirty` ở lấy kịch bản cloze thì smoke lỗi (lần đầu viết gộp chung với sandbox không bắt được vì thao tác trước đã làm bẩn bản nháp; đã tách riêng); đã hoàn nguyên.

Lỗi giao diện phát hiện (có sẵn, chưa sửa): sau khi sửa mã HTML của câu điền từ nội tuyến, **cú nhấp đầu tiên vào "Quay lại danh mục" bị nuốt** (cú nhấp thứ hai mới hiện hộp thoại thay đổi chưa lưu). Nguyên nhân khả dĩ: nhấn chuột làm ô mã mất focus, sự kiện `change` của prompt dựng lại builder giữa mousedown và mouseup nên nút bị thay thế trước khi `click` phát sinh. Không mất dữ liệu, chỉ phải nhấp hai lần; smoke bấm Tab để blur trước. Chưa kiểm cho các nút khác ngoài "Quay lại danh mục".
Chưa phủ: sandbox qua `fetch` trực tiếp (smoke dùng route giả cho API, không kiểm token), xem trước âm thanh với link Google Drive (hàm chuyển URL ghi lại giá trị ô nhập nhưng không bật dirty), dán/thả ảnh vào rich editor.
