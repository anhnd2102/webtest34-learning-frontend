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
