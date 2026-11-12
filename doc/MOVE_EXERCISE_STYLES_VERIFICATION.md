# Cleanup modal chuyển bài tập

Ngày 09/11/2026. Baseline `a8e30ce`; nhánh `refactor/move-exercise-styles`.

## Phạm vi

- Chuyển 19 inline style attributes và 10 static overlay assignments trong `studio/move-exercise-modal.js` sang fragment 06: 14 class `move-layout-*` và một rule overlay. Rule nội dung scope bằng `#modal-move-exercise`.
- Giữ nguyên nội dung, DOM/data attributes, callbacks, ownership, lựa chọn Phần/vị trí chèn và thuật toán chuyển. Runtime display của hàng chọn bài tập mốc được giữ nguyên.
- Thêm hai token giữ màu cũ của note: `--izone-info-soft-border` (`#bfdbfe`) và `--izone-info-strong-text` (`#1e40af`). Các màu khác dùng token hiện có; không đổi radius/kích thước hoặc thêm `!important`.
- CSS revision `20261109-move-exercise1`; cập nhật manifest/hash/ranges, rule map và inventory; giữ extraction provenance. Không đổi workflow Pages, dependencies hay backend.

## Xác minh

- Syntax check `node --check term-tests/teacher-dashboard/studio/move-exercise-modal.js`: pass; không phải typecheck.
- So toàn bộ JS modal với baseline sau khi loại đúng static presentation và class mới: giống nhau. Không đổi thuật toán hay callback.
- 24/24 ảnh RGB và 24/24 computed snapshots khớp trên 1440×900, 1024×768, 390×844. Mỗi viewport gồm bốn trạng thái chung dashboard/Builder/dirty dialog/room và modal mặc định, chèn trước, chèn sau, Phần đích rỗng. So 23 thuộc tính trên toàn DOM; chỉ bỏ class mới `move-layout-*` khỏi trường class. Chờ finite Web Animations kết thúc trước capture.
- Fixture chọn Phần đích/vị trí, kiểm hàng bài tập mốc xuất hiện và tự chuyển về cuối Phần khi đích rỗng. Kiểm cancel/header/backdrop đều đóng, không gọi confirm.
- Callback đi qua `moveExerciseBetweenBlocks` thật cho chèn đầu/cuối/trước/sau và Phần rỗng. Kiểm đúng thứ tự bài tập, giữ hai câu hỏi con, toàn bộ item content trừ metadata vị trí/tên bài tập, grading key và điểm; vị trí liên tục trong fixture. Fixture giữ một câu đầu nguồn ở vị trí 1 và dùng spanCount hợp lệ, không thay policy giữ offset bắt đầu hiện có của model.
- Đi qua nút chuyển thật trong Builder: modal mở, confirm chuyển bài tập sang đầu Phần đích, render lại bài tập; giữ IDs hai câu hỏi, grading keys và maxScore 2 của mỗi câu. Lượt bổ sung kiểm Phần rỗng và keys/score chạy riêng trong `move-exercise-behavior/` trên ba viewport.
- `npm test` worktree: 660 tests, 658 pass, 2 skip, 0 fail. Hai skip do worktree thiếu tài liệu design system ở thư mục cha. Nhóm targeted artifact/move/navigation: 10/10 pass.
- Sửa assertion cũ trong `candidate-navigation-and-submission.test.mjs`: trước đây tìm `modal.style.position = 'fixed'` trên toàn bộ JS, vô tình dựa vào modal Move sau khi CSV/Guide đã chuyển sang CSS. Assertion mới kiểm `position: fixed` trong rule của từng overlay CSV, Guide và Move. Không bỏ kiểm tra cố định overlay hoặc thay kiểm grading keys.
- Inventory lexical còn 273 vị trí trong phạm vi scan cũ; static styles modal Move đã tách, runtime display còn lại. Cleanup toàn bộ chưa hoàn tất.
- Full browser integration: root và `/preview-base` × ba viewport, tổng 60 vòng mount/dispose, pass, 0 browser errors. Giữ save/import/dirty navigation, keyboard focus, ownership, rubric, retake, SSE và assessment cancellation; 13 CSS responses 200/MIME CSS mỗi lượt.
- Review hai trục: Standards 0 hard violations/0 smell findings; Spec 0 findings. Standards reviewer chạy riêng artifact/navigation 6/6 pass; Spec reviewer chạy artifact pass. Không sửa runtime sau review.

Artifacts local: `C:/Users/OS/AppData/Local/Temp/move-exercise-before/`, `move-exercise-after/` (`comparison.json`), `move-exercise-behavior/`, `move-exercise-smoke/`. Capture bằng `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 MOVE_EXERCISE_STYLE_PARITY=1 ARTIFACT_DIR=<path>` với `tests/browser/dashboard-integration-smoke.mjs`.

Parity/behavior chạy riêng với lifecycle smoke để không trộn thao tác focus của fixture vào assertion focus của luồng Stay. Không kiểm API/DB thật, production deployment/performance hoặc toàn bộ tổ hợp nội dung/đánh số; không đổi published content. Giữ nguyên file test xóa bài tập đang làm dở tại checkout chính. Rollback bằng revert commit template/CSS/metadata như một đơn vị.
