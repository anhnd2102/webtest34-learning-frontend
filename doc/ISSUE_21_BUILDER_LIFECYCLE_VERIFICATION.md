# Issue #21 — Builder lifecycle và bảo vệ nội dung chưa lưu khi điều hướng: implementation and verification

Ngày: 28/10/2026 (Asia/Ho_Chi_Minh). Spec: [Issue #21](https://github.com/anhnd2102/webtest34-learning-frontend/issues/21). Parent: [Issue #19](https://github.com/anhnd2102/webtest34-learning-frontend/issues/19). Blocked by: #20 (Resolved in `915bc91`).

Trạng thái: implemented locally, sẵn sàng commit vào nhánh `refactor/frontend-architecture-plan`.

---

## 1. Phạm vi và inventory tài nguyên Builder

Module hóa quản lý vòng đời của Test Builder và cơ chế unsaved changes guard:
- [term-tests/teacher-dashboard/studio/builder.js](../term-tests/teacher-dashboard/studio/builder.js): Module export chuẩn `mountBuilder` và `renderTestBuilderView`.
- [term-tests/teacher-dashboard/app.js](../term-tests/teacher-dashboard/app.js): Triển khai `mountBuilder(container, formVersionData, options)` trả handle `{ dispose(), hasUnsavedChanges(), getDraft() }`. Giữ `renderTestBuilderView` tương thích 100% bằng cách ủy quyền sang `mountBuilder`. Nâng cấp hệ thống Unsaved Changes Guard với định danh sở hữu (`owner identity`).
- [term-tests/teacher-dashboard/shell/dashboard.js](../term-tests/teacher-dashboard/shell/dashboard.js): Tích hợp điều hướng thống nhất (nav tabs, hashchange, onBack, beforeunload) bảo vệ nội dung chưa lưu.
- Tự động dọn dẹp builder cũ khi render lại danh mục bài thi (`renderCourseTestCatalogView`).

### Inventory tài nguyên Builder và ranh giới sở hữu:

| Tài nguyên | Cơ chế quản lý | Hành vi khi rerender hoặc dispose() |
| :--- | :--- | :--- |
| **DOM Listeners (Render-cycle)** | Thu thập vào mảng `renderCycleCleanups`: `input`, `change`, `mouseup`, `click` (drag-drop, rich editor formatting, insert buttons) | Rerender tháo listener chu kỳ trước; `dispose()` tháo sạch toàn bộ |
| **Global Document Listeners** | `document.addEventListener('mouseup', ...)` và `document.addEventListener('click', ...)` cho drag-drop và table/image popup | Gỡ bỏ qua cleanup callbacks trong `renderCycleCleanups` |
| **Unsaved Changes Guard** | `registerUnsavedChangesGuard(fn, owner)` với `owner = { id: uuid, formVersionId }` | `unregisterUnsavedChangesGuard(fn, owner)` chỉ gỡ guard khớp đúng owner; tránh race condition khi builder cũ dọn dẹp muộn |
| **Pending Modal Popups** | Quản lý modal xác nhận unsaved changes qua `openUnsavedChangesModal` | Kiểm tra modal hiện hữu; ngăn chặn chồng dialog (single modal dialog); nút ESC / Cancel giữ nguyên ngữ cảnh |
| **Rich HTML Editors** | Bộ công cụ rich editor, bảng, ảnh, math symbols gắn theo từng card câu hỏi | Dọn dẹp DOM và listener theo chu kỳ rerender |
| **Delayed Focus & Timers** | Timers phục vụ cuộn/focus câu hỏi vừa thêm | Quản lý nội bộ, không rò rỉ sau dispose |
| **Asynchronous Save Requests** | `onSaveDraft` gắn phiên bản `saveDirtyVersion` và cờ `isDisposed` | Request lưu giải quyết hoặc thất bại muộn sau khi builder đã dispose hoặc đã có chỉnh sửa mới sẽ bị bỏ qua, không ghi đè UI hay xóa nhầm dirty flag |
| **Native `beforeunload`** | Window listener trong `dashboard.js` kiểm tra `hasActiveUnsavedChanges()` | Tự động vô hiệu khi guard được tháo dỡ lúc `dispose()` |
| **Instance Registry** | `WeakMap<container, { handle, formVersionData, options }>` | Lưu active handle; mount lặp cùng data/options trả về handle hiện tại; mount data mới tự động `dispose()` instance cũ |

---

## 2. Kiểm thử và xác minh hành vi (Test-First)

### Test mới bổ sung: [tests/studio-builder-lifecycle.test.mjs](../tests/studio-builder-lifecycle.test.mjs)

1. **Idempotent Mount & Single Handle**:
   - Gọi `mountBuilder` liên tiếp trên cùng container với cùng cấu hình trả về cùng một instance handle duy nhất.
2. **`renderTestBuilderView` Delegation & Compatibility**:
   - `renderTestBuilderView` ủy quyền gọi `mountBuilder` và trả về handle hợp lệ gồm `{ dispose, hasUnsavedChanges, getDraft }`.
3. **Owner Identity & Late Cleanup Guard Protection**:
   - Builder A đăng ký guard với owner A. Sau đó Builder B mount và đăng ký guard với owner B.
   - Khi hàm cleanup của Builder A chạy muộn, nó chỉ unregister guard của owner A, không làm mất guard của owner B. `hasActiveUnsavedChanges()` vẫn trả về `true`.
4. **Single Modal Protection (Không chồng chéo Dialogs)**:
   - Gọi `openUnsavedChangesModal` nhiều lần liên tiếp khi modal đầu tiên đang mở.
   - Hệ thống phát hiện dialog đang mở, focus vào nút "Ở lại" (`#modal-btn-stay`) và không sinh thêm modal con đè lên màn hình.
5. **Late Save Resolution Protection**:
   - Kích hoạt lưu draft với request bất đồng bộ kéo dài.
   - Ngay lập tức gọi `handle.dispose()`.
   - Khi save request hoàn tất hoặc thất bại muộn, nó nhận biết instance đã bị dispose và không can thiệp vào UI hoặc trạng thái dirty của instance mới.
6. **10 Chu kỳ Mount → Dirty → Dispose Lặp liên tục**:
   - Thực thi 10 vòng lặp liên tiếp: mount builder → sửa tiêu đề (dirty) → xác nhận `hasActiveUnsavedChanges() === true` → gọi `dispose()` → xác nhận `hasActiveUnsavedChanges() === false` → remount vòng tiếp theo.
   - Toàn bộ 10 chu kỳ hoàn thành trơn tru, không rò rỉ guard, không gây ngoại lệ.

### Kết quả Verification Matrix:

| Bộ kiểm thử | Kết quả | Ghi chú |
| :--- | :--- | :--- |
| `npm --prefix webtest34-learning-frontend test` | **500 pass, 0 fail, 0 skip** | Tăng từ 494 pass (#20) lên 500 pass |
| `npm --prefix webtest34-learning-platform/backend run check` | **Thành công** | Syntax check toàn bộ 46 file script |
| `npm --prefix webtest34-learning-platform/backend test` | **326 pass, 0 fail, 45 skip** | 371 tests; skip Postgres/private DB theo thiết kế |
| `npm --prefix webtest34-learning-platform/backend run contract` | **4 pass, 0 fail** | Route contract endpoints |
| `npm --prefix webtest34-learning-platform/backend run webtest34:types:check` | **Thành công** | 9 canonical pedagogical types & 6 legacy aliases |
| `node --check` syntax check | **Thành công** | `builder.js`, `app.js`, `dashboard.js`, tests |

---

## 3. Bằng chứng kiểm thử trình duyệt thực tế (Browser Smoke Evidence)

Harness: [tests/browser/builder-lifecycle-smoke.mjs](../tests/browser/builder-lifecycle-smoke.mjs), chạy với Playwright và Chrome headless.

Kịch bản kiểm thử trên 3 độ phân giải tiêu chuẩn:
- **Desktop**: 1440 x 900
- **Tablet**: 1024 x 768
- **Mobile**: 390 x 844

Kết quả xác minh:
- Static loopback server phục vụ module `studio/builder.js` thành công với HTTP 200.
- Khởi tạo đề thi mẫu đa dạng: Single Choice, Inline Cloze, Reading Matching, Vocabulary Pair.
- Kích hoạt sửa đổi bẩn (`input` sự kiện vào `#builder-test-title`).
- Xác nhận Guard chặn điều hướng và mở dialog xác nhận chưa lưu.
- Tương tác chọn "Ở lại chỉnh sửa": modal đóng, nội dung nháp được bảo toàn nguyên vẹn, focus giữ nguyên.
- Kiểm tra trùng lặp mount: mount lại cùng data trả về đúng active handle ban đầu.
- Hoàn tất 10 chu kỳ remount và dispose liên tiếp trên mỗi viewport.
- **0 lỗi console (errorsCount = 0)**, **0 uncaught exceptions**.

Dữ liệu báo cáo JSON:
```json
{
  "status": "passed",
  "report": [
    { "viewport": "1440x900", "modulesLoaded": 8, "errorsCount": 0, "cyclesCompleted": 10 },
    { "viewport": "1024x768", "modulesLoaded": 8, "errorsCount": 0, "cyclesCompleted": 10 },
    { "viewport": "390x844", "modulesLoaded": 8, "errorsCount": 0, "cyclesCompleted": 10 }
  ]
}
```

---

## 4. Đánh giá Code Review hai trục (Two-Axis Review)

### Trục Standards:
- Tuân thủ nghiêm ngặt ESM native, tương thích Node 24 và browser runtime.
- Không sử dụng biến toàn cục độc hại; sử dụng `WeakMap` với container để tránh rò rỉ bộ nhớ.
- Hàm thuần và hàm factory có ranh giới rõ ràng; cơ chế disposer idempotent.
- Tuân thủ quy chuẩn thiết kế `DESIGN_SYSTEM.md`: Modal dùng token CSS `--izone-*`, icon SVG line nét mảnh, không emoji màu, typography chuẩn.

### Trục Spec:
- Đáp ứng đầy đủ 10/10 tiêu chí nghiệm thu của Issue #21:
  1. [x] Inventory tài nguyên Builder đầy đủ, không tách vội model/editor/simulation.
  2. [x] `mountBuilder` trả handle `{ dispose, hasUnsavedChanges, getDraft }`; `renderTestBuilderView` tương thích; mount lặp cùng root không remount; dispose idempotent.
  3. [x] Rerender tháo listener chu kỳ trước; dispose dọn sạch tài nguyên của owner mà không tự động lưu/xóa nội dung.
  4. [x] Unsaved guard có owner identity; cleanup của instance cũ không xóa nhầm guard của instance mới.
  5. [x] Nút quay lại, nav tabs, hashchange/back-forward và mở đề khác dùng chung cơ chế guard. Chọn ở lại giữ draft/focus/URL; chọn rời dispose rồi điều hướng một lần.
  6. [x] Chỉ một dialog xác nhận đang chờ; không chồng chéo dialog; không tự điều hướng sau khi chọn ở lại.
  7. [x] Native `beforeunload` bảo vệ nội dung bẩn trong khi builder mount và được giải phóng khi dispose.
  8. [x] Request lưu bất đồng bộ muộn không làm sai lệch UI hay xóa nhầm dirty flag của instance mới.
  9. [x] Đã có test lặp 10 chu kỳ mount/dirty/dispose, dirty navigation và deferred save.
  10. [x] Browser smoke hoàn tất trên 3 viewports (1440x900, 1024x768, 390x844); toàn bộ suite 500 test frontend pass.

---

## 5. Kế hoạch Rollback

Thay đổi được gói gọn trong 1 commit độc lập trên nhánh `refactor/frontend-architecture-plan`.
Nếu cần rollback:
```powershell
git -C webtest34-learning-frontend revert HEAD
```
Không ảnh hưởng cơ sở dữ liệu, schema, backend API hay canonical renderer của học viên.
