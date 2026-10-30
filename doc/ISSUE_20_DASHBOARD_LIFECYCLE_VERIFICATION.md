# Issue #20 — Dashboard browser entry and mount/dispose lifecycle: implementation and verification

Ngày: 28/10/2026 (Asia/Ho_Chi_Minh). Spec: [Issue #20](https://github.com/anhnd2102/webtest34-learning-frontend/issues/20). Parent: [Issue #19](https://github.com/anhnd2102/webtest34-learning-frontend/issues/19).

Trạng thái: implemented locally, sẵn sàng commit vào nhánh `refactor/frontend-architecture-plan`. Mốc trước thay đổi: `ad358dfb243c1b7ff83ff30f7f51f4b8bed60715` (commit của #18).

---

## 1. Phạm vi và inventory tài nguyên shell/entry

Tách luồng khởi động trình duyệt và quản lý lifecycle của Teacher Dashboard khỏi `app.js` thành các module độc lập:
- [main.js](../term-tests/teacher-dashboard/main.js): Browser entry duy nhất, lắng nghe `DOMContentLoaded` hoặc chạy ngay nếu document đã ready, gọi `mountDashboard(document)`.
- [shell/dashboard.js](../term-tests/teacher-dashboard/shell/dashboard.js): Chứa `mountDashboard(root)`, khởi tạo state, auth, routing, UI shell và các view handler.
- [shell/lifecycle.js](../term-tests/teacher-dashboard/shell/lifecycle.js): Quản lý tài nguyên shell thông qua `AbortController`, theo dõi timeouts và intervals để hủy sạch khi dispose.
- [index.html](../term-tests/teacher-dashboard/index.html): Cập nhật thẻ script trỏ sang `./main.js?rev=20261028-dashboard-lifecycle-v1`.
- [app.js](../term-tests/teacher-dashboard/app.js): Đóng vai trò facade tương thích; giữ toàn bộ named exports cho 63 test suite và các consumer hiện có; loại bỏ hoàn toàn bootstrap tự động ở top level (`if (typeof document !== 'undefined') startDashboard()`).

### Inventory tài nguyên shell/entry và ranh giới sở hữu:

| Tài nguyên | Cơ chế quản lý | Hành vi khi dispose() |
| :--- | :--- | :--- |
| **DOM Listeners (Shell)** | `lifecycle.listen(target, type, cb)` gắn `signal: controller.signal` | Tự động hủy khi `controller.abort()` |
| **Window `hashchange`** | `lifecycle.listen(view, 'hashchange', ...)` | Hủy theo signal |
| **Window `beforeunload`** | `lifecycle.listen(view, 'beforeunload', ...)` bảo vệ nội dung bẩn khi có unsaved changes | Hủy theo signal; không chặn điều hướng sau dispose |
| **Search Debounce Timeout** | `lifecycle.timeout(cb, 300)` | Xóa khỏi queue, `clearTimeout` ngay lập tức |
| **Light Polling (30s)** | `lifecycle.interval(cb, 30000)` kiểm tra `!document.hidden && state.classId && state.assignmentId` | Xóa khỏi queue, `clearInterval` ngay lập tức |
| **Instance Registry** | `WeakMap<root, handle>` | Xóa binding của root khi dispose, cho phép remount |
| **Builder / SSE Resources** | Được đánh dấu thuộc ranh giới sở hữu của Test Builder và Exam Room | Không dispose non hoặc can thiệp sớm; xử lý ở các ticket tiếp theo (#21, #22, #23) |

Quy tắc phụ thuộc:
- `main.js` import `shell/dashboard.js`.
- `shell/dashboard.js` import `lifecycle.js` và các named exports từ `../app.js`.
- `app.js` **không** import ngược `shell/dashboard.js` hoặc `main.js`. Đảm bảo 100% không có dependency vòng (circular dependency).

---

## 2. Kiểm thử và xác minh hành vi (Test-First)

### Test mới bổ sung: [tests/dashboard-lifecycle.test.mjs](../tests/dashboard-lifecycle.test.mjs)

1. **Top-level Import Side-effect Guard (RED → GREEN)**:
   - Chạy child process độc lập import cả `app.js` và `shell/dashboard.js` với `globalThis.document` là Proxy ném lỗi nếu có bất kỳ property access nào, cùng mock `fetch`, `setTimeout`, `setInterval` ném lỗi nếu bị gọi ở top level.
   - Kết quả: PASS, cả hai file import an toàn tuyệt đối mà không gây tác dụng phụ.
2. **Search Debounce Cancellation**:
   - Sử dụng `t.mock.timers` kiểm tra debounce 300ms của ô tìm kiếm. Khi gọi `handle.dispose()`, timer đang chờ bị hủy và không kích hoạt request.
3. **Idempotent Mount & 10-Cycle Remount**:
   - Gọi `mountDashboard(document)` nhiều lần trên cùng root trả về cùng một active handle.
   - Chạy 10 vòng lặp mount → tương tác toggle/beforeunload → dispose → tương tác lại.
   - Xác nhận:
     - 1 click chỉ toggle 1 lần (không nhân đôi handler).
     - Active dashboard kích hoạt `defaultPrevented` khi có unsaved changes; sau dispose không còn chặn.
     - `dispose()` 2 lần liên tiếp an toàn (idempotent).
     - Không xóa listener của owner khác (kiểm tra `unrelatedClicks` giữ nguyên 20 lần).
4. **Polling 30s với Visibility & Scope Control**:
   - Kiểm tra request tại 29.999ms (chưa gọi) và 30.000ms (gọi đúng 1 lần).
   - Kiểm tra `document.hidden = true` chặn polling.
   - Sau `dispose()`, 60.000ms tiếp theo không phát sinh thêm request.
   - Remount tạo chu kỳ mới độc lập.

### Cập nhật các test suite đọc mã nguồn:
Các bài kiểm thử `tests/exam-room-ui.test.mjs`, `tests/exam-switch-dashboard.test.mjs`, `tests/incident-timeline.test.mjs`, `tests/teacher-dashboard.test.mjs` trước đây đọc trực tiếp `app.js` bằng `fs.readFile` để kiểm tra các đoạn mã shell. Đã cập nhật để đọc cả `app.js` và `shell/dashboard.js`.

### Kết quả Verification Matrix:

| Bộ kiểm thử | Kết quả | Ghi chú |
| :--- | :--- | :--- |
| `npm --prefix webtest34-learning-frontend test` | **494 pass, 0 fail, 0 skip** | Tăng từ 490 pass (#18) lên 494 pass |
| `npm --prefix webtest34-learning-platform/backend run check` | **Thành công** | Syntax check toàn bộ 46 file script |
| `npm --prefix webtest34-learning-platform/backend test` | **326 pass, 0 fail, 45 skip** | 371 tests; skip Postgres/private DB theo thiết kế |
| `npm --prefix webtest34-learning-platform/backend run contract` | **4 pass, 0 fail** | Route contract endpoints |
| `npm --prefix webtest34-learning-platform/backend run webtest34:types:check` | **Thành công** | 9 canonical pedagogical types & 6 legacy aliases |
| `node --check` syntax check | **Thành công** | 6/6 file liên quan (`main.js`, `dashboard.js`, `lifecycle.js`, `app.js`, tests) |

---

## 3. Bằng chứng kiểm thử trình duyệt thực tế (Browser Smoke Evidence)

Harness: [tests/browser/dashboard-lifecycle-smoke.mjs](../tests/browser/dashboard-lifecycle-smoke.mjs), chạy với Playwright và Chrome headless cục bộ (`$env:PLAYWRIGHT_MODULE = 'C:\Users\OS\.nuget\packages\microsoft.playwright\1.63.0\.playwright\package\index.mjs'`).

Kịch bản kiểm thử:
- Khởi động static server loopback port 18320 qua `serve.mjs`.
- Chặn toàn bộ network ngoài loopback; route mock API `/api/teacher/*` phục vụ dữ liệu tổng hợp (`auth/me`, `classes`, `assignments`, `results`).
- Kiểm tra cả 2 trường hợp: root `/` và project prefix `/preview-base/`.
- Mở URL đầy đủ tham số: `?classId=101&assignmentId=fixture-assignment&q=synthetic#grading`.
- Xác nhận UI khôi phục đầy đủ: lớp 101, bài fixture-assignment, từ khóa synthetic, tab `#grading`.
- Thực hiện 10 chu kỳ remount trong trình duyệt:
  - Kiểm tra WeakMap bảo vệ cùng handle.
  - Tương tác click toggle và hủy.
  - Kiểm tra `sessionStorage` của owner khác không bị xóa (`unrelated-fixture-value: preserve`).
  - Lắng nghe response và đếm số lượt request `reads.me`, `reads.classes` (đúng 1 lượt khôi phục session trên mỗi fresh mount).
- Kiểm tra module load: `main.js`, `shell/dashboard.js` đều trả về HTTP 200 với `content-type: application/javascript`.
- Kết quả: `{"status":"passed","report":[{"prefix":"/","cycles":10,"reads":{"me":11,"classes":11,"assignments":11,"results":11},"pageErrors":0,"javascriptModules":7},{"prefix":"/preview-base","cycles":10,"reads":{"me":11,"classes":11,"assignments":11,"results":11},"pageErrors":0,"javascriptModules":7}]}`
- **0 page errors**, **0 uncaught exceptions**.

---

## 4. Đánh giá Code Review hai trục (Two-Axis Review)

### Trục Standards:
- Tuân thủ chuẩn ESM native, tương thích hoàn toàn Node 24 và browser hiện đại.
- Cấu trúc hàm thuần, không dùng biến toàn cục rò rỉ.
- Sử dụng `WeakMap` liên kết lifecycle với root element, tránh memory leak khi DOM element bị thu hồi.
- Cơ chế `AbortController` tiêu chuẩn để hủy hàng loạt listener cùng lúc.
- Không phát sinh code smell hay anti-pattern.

### Trục Spec:
- Đáp ứng 100% 9/9 tiêu chí nghiệm thu của Issue #20:
  1. [x] Inventory tài nguyên shell/entry đầy đủ, phân định ranh giới với Builder/SSE.
  2. [x] Import facade/shell không đọc DOM hoặc đăng ký timer/network ở top level.
  3. [x] Entry browser `main.js` khởi động đúng 1 lần khi DOM ready, giữ URL/query/hash.
  4. [x] `mountDashboard` trả handle có `dispose()`, idempotent trên cùng root, an toàn khi dispose 2 lần.
  5. [x] `dispose()` dọn sạch listener/polling/timer do shell tạo, không chạm tài nguyên của owner khác.
  6. [x] Polling 30s giữ nguyên điều kiện visible/active, kiểm tra chính xác bằng mock timer.
  7. [x] Giữ toàn bộ named exports cho caller cũ; không có dependency vòng giữa `app.js`, `shell/dashboard.js`, và `main.js`.
  8. [x] Kiểm tra 10 vòng remount thành công cả ở unit test và browser smoke.
  9. [x] Browser smoke hoàn tất trên cả prefix root và preview-base.

---

## 5. Kế hoạch Rollback

Thay đổi được gói gọn trong 1 commit độc lập trên nhánh `refactor/frontend-architecture-plan`.
Nếu cần rollback:
```powershell
git -C webtest34-learning-frontend revert HEAD
```
Không có thay đổi cơ sở dữ liệu, schema, backend API hay cấu hình production nào cần hoàn nguyên.
