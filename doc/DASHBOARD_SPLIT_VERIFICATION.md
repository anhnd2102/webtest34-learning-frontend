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
