# Bước 3 — chia Builder theo workflow

Ngày: 04/11/2026. Phạm vi được duyệt trong REFACTOR_PLAN, triển khai từ `95c46ef` trên nhánh `refactor/studio-workflows` trong worktree riêng. Không sửa workspace chính.

## Interface và tiêu chí giữ nguyên

- Public seams: các named exports hiện có, mountBuilder/getDraft/dispose, editor/media helpers và luồng browser soạn → xem trước → lưu/công bố. Không thêm state store hoặc framework.
- app.js trở thành facade export tương thích; implementation import trực tiếp module sở hữu, không import ngược facade và không có circular dependency.
- Giữ DOM, CSS, request/payload và owner lifecycle đã xác minh ở #24. Dữ liệu tổng hợp; không production.

## Các đơn vị triển khai

- [x] Tách thao tác draft và các module độc lập: nội dung câu, icon/rich-content, editor/media, catalog, batch import, summary và navigation ownership. Dùng phân tích lexical scope để kiểm kê dependency; giữ thân hàm hiện tại. Kiểm module import độc lập + các test behavior đang có.
- [x] Tách preview/simulation và publishing thành workflow có interface nhỏ; truyền draft và các thao tác host cần thiết, không sao chép state hoặc tạo một context gồm mọi biến của Builder.
- [x] Chuyển Builder orchestration về module sở hữu, facade giữ đủ export cũ; cập nhật shell sang direct imports. Phần hiển thị kết quả/chấm và các helper dashboard có module riêng; không sửa SSE ownership đã tách ở bước 2.
- [x] Cập nhật các test source-contract cũ để theo implementation mới, giữ assertion; không thêm test source-text mới thay cho behavior.
- [x] Browser integration đầy đủ, preview/publish/editor behavior, toàn frontend và matrix backend; so ảnh baseline/final, kiểm dependency graph và module imports.
- [x] Review Standards/Spec độc lập, sửa phát hiện cần thiết, báo cáo và commit theo đơn vị có thể rollback.

Rollback: revert các commit của bước này theo thứ tự ngược, giữ đồng bộ facade/implementation/imports/tests. Không data/schema migration. Chưa push/merge/deploy.
