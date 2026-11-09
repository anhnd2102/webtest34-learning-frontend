# Sửa bảng điều hướng che đáp án mô phỏng trên mobile

Ngày 09/11/2026. Baseline `70e1ea2`; nhánh `fix/simulation-mobile-overlap`.

## Lỗi và nguyên nhân

Ở viewport 390×844, chuyển sang Phần thứ hai rồi bấm đáp án bị `question-navigator-grid` chặn. Repro bằng `CAPTURE_ONLY=1 SIMULATION_SHELL_PARITY=1 SMOKE_WIDTH=390 ARTIFACT_DIR=<path> node tests/browser/dashboard-integration-smoke.mjs` sau khi bỏ workaround gán checked bằng DOM.

Đo layout trên baseline: `.exam-layout` một cột, cao khoảng 426px, grid rows `0px 428px`; `.main-column` vẫn cao khoảng 489px. Sidebar nằm ngay sau track 0px, nên phủ lên nội dung đang tràn khỏi track. Giả thuyết sticky được thử riêng bằng override `position: static`: vẫn thất bại. Chỉ đổi `grid-auto-rows: max-content` trong probe làm luồng bấm thật pass. Vì vậy sửa track sizing, không sửa z-index hay tắt pointer events/sticky để che triệu chứng.

## Thay đổi

- Tại breakpoint hiện có `max-width: 900px`, scope `#candidate-simulation-modal .exam-layout` và đặt `grid-auto-rows: max-content`. Các hàng nội dung và sidebar lấy chiều cao theo nội dung; vùng exam vẫn cuộn như cũ. Desktop hai cột giữ nguyên.
- Không đổi JS sản phẩm, grading, dữ liệu, DOM, màu, radius, audio controller hoặc quyền hạn. Không đổi workflow Pages/backend.
- Bỏ hoàn toàn nhánh checked/change bằng DOM khỏi fixture simulation. Dùng native `check()` hoặc `tap()` + assert checked; không dùng force click.
- Thêm assertion hình học: khi xếp một cột, sidebar phải bắt đầu sau đáy main content. Harness cho phép `SMOKE_VIEWPORTS` và `SMOKE_TOUCH=1` để kiểm quanh breakpoint.
- CSS revision `20261109-mobile-grid1`; cập nhật manifest/hash/ranges/rule map, giữ extraction provenance. Inventory styles không đổi vì không extraction thêm.

## Red → Green và verification

- Repro ban đầu trên baseline: native check câu i3 timeout, navigator chặn pointer events (`simulation-mobile-red.log`).
- Regression cuối chạy lại trên checkout baseline bằng `FRONTEND_ROOT`: fail tại assertion “Stacked navigator must follow the question content without overlapping it” (`simulation-mobile-regression-red.log`). Cùng fixture chạy code sửa pass; không ghi đè baseline.
- Native mouse flow pass trên 1440×900, 1024×768, 390×844 (`simulation-mobile-green/`).
- Touch emulation pass trên 360×800, 390×844, 768×1024, 900×900 và 901×900 (`simulation-mobile-touch/`). Dùng native tap cho đáp án; các control khác dùng Playwright click thật, không force. Kiểm tab/sidebar/question navigation, giữ đáp án, tiến độ 1/3 → 3/3, submit 3/3đ, ba hàng kết quả, xem lại, đóng header/footer. Các viewport ≤900 còn kiểm không overlap.
- Audio kiểm volume, start một lần, ended notice/start disabled; play được stub trong fixture. Không tuyên bố nghe audio thật/codec/network production hoặc kiểm thiết bị vật lý.
- Desktop/tablet: 16/16 ảnh RGB và 16/16 computed snapshots toàn DOM giống `70e1ea2`; mobile thay đổi có chủ đích. Không bỏ thuộc tính khi so sánh. File `simulation-mobile-green/desktop-comparison.json` lưu kết quả.
- `npm test` worktree: 660 tests, 658 pass, 2 skip, 0 fail. Hai skip do thiếu tài liệu design system ở thư mục cha worktree.
- Full browser integration: root và `/preview-base` × ba viewport, tổng 60 vòng mount/dispose, pass, 0 browser errors; giữ save/import/dirty navigation, focus, ownership, rubric, retake, SSE và assessment cancellation. Mỗi lượt có đủ 13 CSS responses 200/MIME CSS.
- Không còn probe CSS/diagnostic instrumentation trong harness; probe files chỉ ở C: temp. Rule sản phẩm sửa đúng một declaration trong media query.
- Review Standards: 0 hard violations/0 smell findings; Spec: 0 findings. Cả hai reviewer chạy độc lập artifact test pass; kết quả full lifecycle smoke ở trên do agent triển khai xác minh.

Artifacts nằm tại `C:/Users/OS/AppData/Local/Temp/simulation-mobile-*`. Touch command thêm `CAPTURE_ONLY=1 SIMULATION_SHELL_PARITY=1 SMOKE_TOUCH=1 SMOKE_VIEWPORTS='[{"width":360,"height":800},...]' ARTIFACT_DIR=<path>`. Lifecycle smoke chạy riêng với `RUN_ASSESSMENT_RACE=1`, không bật parity flag.

Không kiểm API/DB thật, production performance/deployment hoặc mọi template câu hỏi. Giữ nguyên file test xóa bài tập đang sửa tại checkout chính. Rollback bằng revert commit CSS/test/metadata. Lỗi này đã được ghi là giới hạn baseline trong `SIMULATION_SHELL_STYLES_VERIFICATION.md`; bản sửa hiện tại thay thế giới hạn đó cho các luồng/viewport đã kiểm.
