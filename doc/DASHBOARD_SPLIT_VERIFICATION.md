# Tách `shell/dashboard.js` theo owner state (bước 3, đợt dashboard)

Ngày 12/11/2026. Chỉ **di chuyển nguyên văn** các cụm vào module; không đổi API, payload, CSS hay hành vi. `shell/dashboard.js`: **2.863 → 1428 dòng**.

## Thiết kế owner state

Các biến `let` dùng chung vẫn nằm trong `initializeDashboard` (không có store thứ hai). Mỗi nhóm có một owner dạng accessor; module tách ra chỉ nhận owner cần dùng và không đọc/gán biến `let` trần.

| Owner | Biến | Ghi chú |
|---|---|---|
| `authState` | `sessionToken`, `currentTeacher` | token không rời khỏi sessionStorage/closure |
| `scopeState` | `rawClassesList`, `currentAssignmentsList`, `currentSelectedAssignment`, `currentServerNow`, `isSwitchingAssignment` | lớp/bài được giao đang xem |
| `examRoomState` | `examRoomSession`, `examRoomReturnToResults` | `currentExamRoom` vẫn ở `viewState` |
| `viewState` (có sẵn) | `currentResultsPayload`, `currentAttemptDetail`, `currentSkillTab`, `autoSaveTimeout`, `currentExamRoom` | |
| nội bộ module | `reportState` (module `reports`, truy cập ngoài qua `getReportState()`), `portal`, `currentStudioCourseId`, `examSwitch*`, `classSearchTimeout` | không còn là biến của shell |

## Module đã tách

| Module | Nội dung | Trả về |
|---|---|---|
| `portal-panel.js` | đồng bộ điểm Portal | `ensurePortalPanel`, `resetPortal` |
| `profile-panel.js` | hồ sơ giáo viên, popover vai trò | `renderTeacherProfile`, `toggleRoleCapabilitiesPopover` |
| `grant-retake.js` | modal và form cấp quyền làm lại | `openGrantRetakeModal` |
| `reports.js` | phân bố điểm, phân tích câu | `getReportState`, `loadScoreDistributionReport`, `loadItemAnalysisReport`, `renderReportsView`, `cancelAssessmentQueries` |
| `exam-controls.js` | chế độ thi, tự giám sát, chuyển bài thi | `updateExamModeUI`, `updateSelfProctoringUI`, `renderExamSwitch` |
| `studio-view.js` | danh mục Test Studio | `loadAndRenderTestStudio` |
| `publish-all.js` | công bố toàn bộ kết quả | `publishAllResults` |
| `exam-room-actions.js` | phòng thi: timeline sự cố, tải phòng, phiên SSE, 4 nút | `fillIncidentTimeline`, `showExamRoomTimeline`, `loadExamRoom`, `stopExamRoomEvents` |
| `add-student.js` | modal và form thêm học viên vào danh sách làm bài | `createAddStudent` (không trả giá trị) |
| `auth-session.js` | đăng nhập, đăng xuất, hiện/ẩn mật khẩu | `handleLogout` (truyền cho cụm phòng thi qua wrapper lazy) |
| `navigation.js` | tab dashboard, tab báo cáo, hash, cảnh báo thay đổi chưa lưu | `syncAssessmentHeaderMeta`, `switchAssessmentTab`, `updateDashboardTab` (owner `navState`) |
| `assignment-selection.js` | chip và chọn bài được giao | `renderAssignmentChips`, `selectAssignment` |
| `showcase.js` | thẻ bài được chọn, sao chép liên kết, mã QR | `renderSelectedAssignmentShowcase` |
| `assignments-loader.js` | tải bài được giao của lớp và khôi phục bài/bài làm theo URL | `loadAssignments` (cụm điều khiển thi nhận qua wrapper lazy) |
| `pagination.js` | nút trang trước/sau của bảng kết quả | `createPagination` |
| `results-filters.js` | ô tìm kiếm, bộ lọc, sắp xếp, đặt lại bộ lọc | `applyFilterChange` (báo cáo nhận qua wrapper lazy) |
| `class-directory.js` | lọc, danh sách và tải lớp | `loadClasses`, `renderFilteredClasses`, `setupClassFilterToolbar`, `updateFilterPillsUI` |

## An toàn

- Script dò phụ thuộc: tên dùng trong đoạn nhưng khai báo ngoài đoạn thành tham số; biến `let` chưa có owner làm việc tách dừng lại.
- Kiểm TDZ: mỗi factory phải được gọi **sau** mọi `const` mà nó nhận theo giá trị (ví dụ `request`); `createGrantRetake` được đặt trước `createExamRoomView` vì view nhận `openGrantRetakeModal` lúc khởi tạo.
- Một test đọc mã nguồn (`teacher-dashboard-redesign-tabs`) được cập nhật có chủ đích để chấp nhận `getReportState().mode`.

## Xác minh

- `npm test`: 688/688 sau mỗi commit.
- `dashboard-integration-smoke` pass (3 viewport); `exam-room-lifecycle-smoke` và `builder-lifecycle-smoke` pass.

## Giới hạn và phần còn lại

- **Vòng phụ thuộc phòng thi đã phá**: view cần `openGrantRetakeModal`, modal cần `loadExamRoom`, phòng thi cần `renderExamRoom` của view. Hai cạnh ngược (`loadExamRoom` → grant retake, `showExamRoomTimeline` → view) đi qua wrapper lazy `(...args) => loadExamRoom(...args)` / `student => showExamRoomTimeline(student)`; `createExamRoomActions` được gọi sau cả hai. `lifecycle.onDispose(stopExamRoomEvents)` cũng thành wrapper lazy (nếu truyền giá trị sẽ TDZ). Hai test đọc mã nguồn (`exam-room-ui`) được cập nhật để chấp nhận `viewState.currentExamRoom`. Đã dọn 40 import thừa trong `dashboard.js`.
- Còn trong `dashboard.js`: điều hướng/hash, chọn bài, showcase, `loadAssignments`, đăng nhập/đăng xuất, thêm học viên, phân trang, bootstrap.
- Smoke tích hợp chỉ chạm báo cáo 1 lần (`reports`), chưa kiểm sâu chuyển tab phân bố/phân tích câu và công bố toàn bộ; chưa có test browser bấm thật cho phần cấp quyền làm lại.
- `tests/browser/dashboard-lifecycle-smoke.mjs` vẫn lỗi `ERR_MODULE_NOT_FOUND` từ trước (chưa điều tra).

## Thống nhất `request` cho thao tác ghi (12/11/2026)

- `request` nhận thêm `errorMessage` (thông báo dự phòng, không gửi xuống fetch) và gắn `apiMessage` (message gốc của máy chủ) vào lỗi.
- Chuyển sang `request`: chấm nháp, hoàn tất chấm, công bố kết quả (`grading/attempt-review.js`), cấp quyền làm lại (`shell/grant-retake.js`), thêm học viên (`shell/add-student.js`). Xung đột 409 vẫn hiện cảnh báo (`err.status === 409`). Mỗi thao tác đúng một request, không thử lại.
- Thay đổi hành vi có chủ đích: phản hồi 401 giờ kết thúc phiên như các lời gọi đọc; lỗi không phải JSON hiện thông báo dự phòng thay vì lỗi cú pháp JSON.
- Lỗi tiềm ẩn đã sửa: `grant-retake.js` dùng `authHeader` nhưng không được truyền vào khi tách (công cụ tách bỏ sót `...authHeader()`), sẽ gây ReferenceError khi cấp quyền làm lại. Việc chuyển sang `request` loại bỏ phụ thuộc này.
- Chưa chuyển (có chủ đích): đăng nhập/đăng xuất/khôi phục phiên, SSE phòng thi, lời gọi studio dùng token/origin riêng.
- `dashboard-lifecycle-smoke` lỗi vì thiếu gói `playwright` trong môi trường, không phải lỗi mã.

## Smoke bấm thật `tests/browser/dashboard-actions-smoke.mjs` (12/11/2026)

Chrome thật, API giả, 1440×900. Chạy: `node tests/browser/dashboard-actions-smoke.mjs`. Kiểm: tìm kiếm gửi `q`, trang sau gửi `page=2` và cập nhật URL; thêm học viên (lỗi 400 giữ modal, thành công đóng modal, mỗi lần đúng một POST, có Bearer); chuyển hash `#dashboard` ↔ `#grading` kể cả nút Back của trình duyệt; cấp quyền làm lại từ phòng thi (một POST, không lỗi); đăng xuất (xóa token, hiện form) rồi đăng nhập lại (lưu token, tải lại lớp).
Kiểm tra đột biến: chèn lại lỗi `authHeader` chưa khai báo vào `grant-retake.js` thì smoke lỗi ở bước cấp quyền làm lại; đã hoàn nguyên.
Chưa phủ: công bố toàn bộ, chuyển tab báo cáo, chấm nháp/hoàn tất chấm trên trình duyệt (mới có test đơn vị), handler builder.

## Smoke bấm thật `tests/browser/dashboard-grading-smoke.mjs` (12/11/2026)

Chrome thật, API giả, 1440×900. Chạy: `node tests/browser/dashboard-grading-smoke.mjs`. Kiểm: mở bài làm; chấm nháp gặp xung đột 409 (hiện cảnh báo, không gửi lại) rồi lưu thành công (body có `baseRevision` và điểm, có Bearer); hoàn tất chấm (một POST, tải lại chi tiết); công bố một bài (một POST); công bố toàn bộ đường batch (một POST, không công bố từng bài) và đường dự phòng khi batch trả 404 (công bố từng bài đã nộp đúng một lần, nút được bật lại); chuyển ba tab báo cáo (phổ điểm, phân tích câu hỏi, chi tiết) và quay lại tab đã tải không gọi lại API.
Kiểm tra đột biến: đổi điều kiện `err.status === 409` của chấm nháp thì smoke lỗi; đã hoàn nguyên.
Quan sát: sau khi hoàn tất chấm, bấm công bố làm ô điểm mất focus và kích hoạt thêm một lần lưu nháp tự động (hành vi có sẵn, không đổi).

## Thống nhất client cho nhóm fetch còn lại (12/11/2026)

- `api/client.js` (`createApiRequest`) là nơi duy nhất gắn auth, parse JSON, xử lý 401 và chuẩn hóa lỗi; `dashboard.js` dùng nó thay cho hàm `request` nội tuyến. Tùy chọn mới: `anonymous` (không auth, 401 không phải hết phiên: đăng nhập) và `handleUnauthorized: false` (đăng xuất, khôi phục phiên).
- Khôi phục phiên: lỗi HTTP từ `/auth/me` (kể cả 401) đăng xuất âm thầm như trước; lỗi mạng hoặc bị hủy bị bỏ qua; lỗi khi hiển thị hồ sơ/tải lớp không làm mất phiên (ban đầu viết gộp sẽ đăng xuất nhầm khi tải lớp lỗi 500, đã tách).
- **Lỗi thật được sửa — chấm thử AI trong production không gửi token:** `studio-view.js` không truyền `onPreviewSandbox`, nên `sandbox-actions.js` rơi vào `fetch` dự phòng với `options.apiBase`/`options.authToken` đều undefined: gọi đường dẫn tương đối của chính trang (không phải API) và không có `Authorization`. Smoke `builder-media-smoke` thêm khẳng định `Bearer` và lỗi (`actual: `) trước khi sửa; nay `studio-view.js` truyền `onPreviewSandbox` qua `request`.
- Đã bỏ các nhánh `fetch` dự phòng trong `sandbox-actions.js` và `publishing.js` (xem trước/công bố vốn luôn được truyền callback). Thiếu callback thì báo lỗi rõ ("chưa được cấu hình") thay vì gọi ngầm không auth.
- Còn `fetch` trực tiếp: chỉ luồng SSE phòng thi (stream, Bearer riêng, kiểm bởi `exam-room-lifecycle-smoke`) và bản thân `api/client.js`.
- Kiểm chứng: `npm test` 713/713; chín smoke trình duyệt pass; kiểm tra đột biến: bỏ đăng xuất âm thầm khi khôi phục phiên lỗi thì smoke lỗi (đã hoàn nguyên).
