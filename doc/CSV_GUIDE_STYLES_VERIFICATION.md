# Cleanup CSV upload và Quick Guide

Ngày 08/11/2026. Baseline `1f24d8f`; nhánh `refactor/csv-guide-styles`.

## Phạm vi

- Chuyển 101 inline style attributes (89 dòng nguồn) và 22 static overlay property assignments trong `openCsvQuickGuideModal` / `openBlockCsvUploadModal` sang fragment 06. Gộp các bộ declaration giống nhau thành 41 class có tên `csv-layout-*`, cộng một rule overlay dùng chung.
- Giữ DOM, nội dung, data attributes và handlers; chỉ thêm class trình bày. Không sửa parser/import payload, ownership, clipboard callback, chế độ append/overwrite hoặc modal generic. Runtime styles ẩn/hiện preview/error và phản hồi chép mẫu được giữ nguyên.
- Màu dùng token với giá trị cũ; thêm token warning/danger còn thiếu. Bảo toàn radius, kích thước, font và bảng tràn trên màn hình nhỏ; không thiết kế lại UI trong đợt extraction.
- Revision CSS `20261108-csv-guide1`; cập nhật manifest/hash/ranges/selector map và inventory, giữ extraction provenance. Không thêm CSS request, không sửa workflow Pages hay backend.

## Xác minh

- `node --check term-tests/teacher-dashboard/studio/batch-import.js`: pass (syntax check, không phải typecheck).
- So toàn bộ JS với baseline sau khi loại đúng static presentation trong hai modal và class mới: giống nhau; không đổi nội dung/logic ngoài extraction.
- `npm test` trong worktree: 660 tests, 658 pass, 2 skip, 0 fail. Hai skip do thiếu tài liệu design system ở thư mục cha worktree.
- 30/30 ảnh RGB khớp hoàn toàn; 30/30 snapshot computed styles khớp trên 1440×900, 1024×768, 390×844. Mỗi viewport gồm dashboard, Builder, dirty dialog, room và sáu trạng thái CSV: rỗng, lỗi, preview, guide đầu/cuối, file+overwrite.
- So computed giữ nguyên mọi phần tử và 23 thuộc tính; chỉ bỏ class `csv-layout-*` mới thêm khỏi trường class để so DOM với baseline. Không bỏ thuộc tính style hoặc transform. Capture chờ finite Web Animations kết thúc trước khi đọc computed; lần đầu animation đang chạy gây sai lệch thời điểm dù ảnh khớp. Baseline chạy lại từ checkout `feature/test-studio` ở `1f24d8f` bằng cùng harness; không cập nhật baseline sang code mới.
- Fixture kiểm tra confirm disabled khi rỗng/lỗi, valid preview, đọc file CSV UTF-8 BOM, callback append/overwrite có một câu hỏi, cancel không import, chép đúng data-sample và đóng guide bằng nút header/footer/backdrop.
- Full browser integration: root và `/preview-base` × ba viewport, tổng 60 vòng mount/dispose; pass, 0 browser errors. Giữ kiểm tra save/import/dirty navigation, ownership, rubric, retake, SSE và assessment request cancellation; đủ 13 CSS responses 200/MIME CSS mỗi lượt. Một lần khởi động smoke trùng cổng capture đã dừng trước khi chạy; lượt xác minh hoàn tất dùng cổng 18325.
- Inventory giữ nguyên phạm vi lexical cũ, còn 343 vị trí (gồm attribute/property); đây là số dòng, không phải số declaration. Cleanup inline styles toàn bộ vẫn chưa hoàn tất.
- Review Standards: 0 finding. Review Spec phát hiện một thiếu sót verification: header-close click chưa có assertion ngay sau click, nên lần mở kế tiếp có thể che lỗi. Đã thêm assertion modal biến mất và chạy lại fixture 1440px thành công (`csv-guide-header-check/`). Artifact test được hai reviewer chạy độc lập, pass.

Artifacts: `C:/Users/OS/AppData/Local/Temp/csv-guide-before/`, `csv-guide-after/` (có `comparison.json`), `csv-guide-smoke/`. Chạy capture bằng `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 CSV_GUIDE_STYLE_PARITY=1 ARTIFACT_DIR=<path>` với `tests/browser/dashboard-integration-smoke.mjs`.

Không kiểm API/DB thật, Excel engine/network thật hoặc production deployment/performance. Clipboard dùng stub trong fixture; file đọc CSV thật bằng FileReader. Không sửa file test xóa bài tập đang làm dở ở checkout chính. Rollback bằng revert commit template/CSS/metadata như một đơn vị.
