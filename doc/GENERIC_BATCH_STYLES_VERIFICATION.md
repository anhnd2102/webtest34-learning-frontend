# Cleanup modal nhập câu hỏi tổng quát

Ngày 08/11/2026. Baseline `41de13f`; nhánh `refactor/generic-batch-styles`.

## Phạm vi

- Chuyển 41 inline style attributes trong `openGenericBatchModal` sang 27 class `generic-layout-*`, scope bằng `#generic-batch-modal` trong fragment 06. Gồm cả HTML preview được dựng khi nhập CSV; gộp các bộ declaration giống nhau.
- Bảo toàn nội dung/DOM/data attributes, parser, giới hạn số câu, đồng bộ điểm hai chiều và callback import/tạo nhanh/tạo một câu. Giữ runtime display của overlay, tab và preview. Các wrapper và renderer preview chuyên biệt nằm ngoài phạm vi.
- Thêm ba token màu preview với giá trị cũ: error `#ef4444`, success `#10b981`, warning `#f59e0b`. Không đổi palette hiện có, kích thước/radius hoặc thêm `!important`.
- CSS revision `20261108-generic-batch1`; cập nhật manifest/hash/ranges, rule map và inventory, giữ extraction provenance. Không đổi workflow Pages/backend/dependencies.

## Xác minh

- Syntax check `node --check term-tests/teacher-dashboard/studio/batch-import.js`: pass; không phải typecheck.
- So toàn bộ JS với baseline sau khi bỏ đúng static presentation trong hàm và class mới: giống nhau. Không sửa logic/nội dung ngoài extraction.
- `npm test` worktree: 660 tests, 658 pass, 2 skip, 0 fail. Skip do worktree thiếu tài liệu design system ở thư mục cha.
- 30/30 ảnh RGB giống hoàn toàn; 30/30 computed snapshots giống nhau trên 1440×900, 1024×768, 390×844. Mỗi viewport gồm dashboard/Builder/dirty dialog/room và sáu trạng thái modal: CSV rỗng, lỗi, preview mặc định, tab tạo nhanh, preview custom và nhánh không CSV.
- So computed giữ toàn bộ phần tử và 23 thuộc tính, chỉ bỏ class mới `generic-layout-*` khỏi trường class. Chờ finite Web Animations kết thúc trước capture như fixture CSV/Quick Guide trước đó.
- Fixture dùng `parseMultiGroupCsv` thật: bốn dòng, mỗi dòng hai đáp án đúng sinh tám items; kèm dòng thiếu prompt để mở cảnh báo. Kiểm preview rút gọn ba items, custom renderer, đọc CSV UTF-8 BOM, dữ liệu giữ sau đổi tab, aria-selected/visibility, điểm đồng bộ hai chiều, stepper tăng/giảm, clamp min/max, điểm fallback và Enter confirm.
- Kiểm callback import giữ tám items và điểm mặc định 3.25; tạo một câu; tạo nhanh không CSV; extra config giữ giá trị. Header/cancel/Escape/backdrop đều đóng modal và không phát sinh callback. Bổ sung kiểm confirm CSV lỗi: alert, modal vẫn mở và không có callback; chạy lại 1440px pass (`generic-batch-invalid-confirm/`).
- Các lần hiệu chỉnh fixture baseline không sửa sản phẩm: parser chấp nhận một từ đơn làm prompt nên dùng dòng thiếu prompt cho invalid case; parser nhóm sinh một item mỗi đáp án; custom preview có nhiều em nên locator dùng first. Không coi các giả định fixture ban đầu là lỗi parser.
- Inventory còn 302 vị trí lexical trong phạm vi scan cũ; generic modal không còn static style attributes, nhưng runtime style và wrapper preview vẫn còn. Cleanup toàn bộ chưa hoàn tất.
- Full browser integration (không bật parity flag): root và `/preview-base` × ba viewport, tổng 60 vòng mount/dispose, pass, 0 browser errors. Giữ save/import/dirty navigation, keyboard focus, ownership, rubric, retake, SSE và assessment cancellation; 13 CSS responses 200/MIME CSS mỗi lượt.
- Review hai trục: Standards 0 hard violations/0 smell findings; Spec 0 findings. Hai reviewer chạy độc lập CSS artifact test, pass. Không cần sửa runtime sau review.

Artifacts: `C:/Users/OS/AppData/Local/Temp/generic-batch-before/`, `generic-batch-after/` (`comparison.json`), `generic-batch-invalid-confirm/`, `generic-batch-smoke/`. Capture bằng `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 GENERIC_BATCH_STYLE_PARITY=1 ARTIFACT_DIR=<path>` với `tests/browser/dashboard-integration-smoke.mjs`.

Chạy parity riêng với lifecycle smoke: parity thao tác focus qua nhiều modal nên không kết hợp với assertion focus của bước Stay trước đó. Lượt thử kết hợp dừng đúng tại assertion focus; không bỏ hoặc làm yếu assertion. Không kiểm API/DB thật, Excel engine, deployment hay performance production. Giữ nguyên file test xóa bài tập đang làm dở ở checkout chính. Rollback bằng revert commit template/CSS/metadata như một đơn vị.
