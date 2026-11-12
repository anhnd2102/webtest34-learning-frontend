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
Còn tồn tại cùng lỗi (kiểm trên trình duyệt, chưa sửa): thêm bài tập (`.btn-add-exercise`), di chuyển câu hỏi lên/xuống và di chuyển bài tập lên/xuống không bật cờ thay đổi chưa lưu.
