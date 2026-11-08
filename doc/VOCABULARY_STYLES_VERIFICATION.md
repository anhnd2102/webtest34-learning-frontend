# Cleanup style Vocabulary Pair

Ngày 08/11/2026. Baseline `1345d7e`; nhánh `refactor/vocabulary-styles`, worktree `frontend-refactor-integration`.

## Phạm vi

- Bỏ **6 thuộc tính inline style tĩnh** của variant chips, khung nghĩa, nhãn tiêu đề, nhãn đáp án đúng, tools bar và thanh thêm nghĩa. Chuyển margin-bottom của bulk-paste panel sang CSS nhưng giữ inline `display: none` và các thao tác mở/đóng của JS.
- Thêm 7 rule có scope `.template-vocab-pair` trong fragment 04. Giữ giá trị cũ, gồm tools bar `display: flex; gap: 8px` thay vì để rule legacy `inline-flex; gap: 6px` thắng sau khi bỏ inline.
- Dùng token `--izone-text-body` bằng màu cũ `#334155`. Không đổi font, radius, selector sự kiện, DOM/classes, nội dung hoặc handler; không thêm `!important`.
- Revision entry/HTML/imports: `20261108-vocab-layout1`. Manifest cập nhật checksum/line ranges, giữ provenance extraction. Selector map có 1.637 selector, inventory inline còn 477 vị trí lexical. Không thêm request CSS hoặc đổi Pages workflow.

## Xác minh

- Frontend trong worktree: **660 tests, 658 pass, 2 skip, 0 fail**. Hai skip vì thiếu tài liệu design-system ở thư mục cha worktree; không tính là pass.
- **30/30 ảnh RGB giống hoàn toàn**, **30/30 snapshot computed styles giống nhau** tại 1440×900, 1024×768 và 390×844. Kiểm 23 thuộc tính trên toàn DOM ở dashboard/Builder/dirty dialog/room và các trạng thái vocabulary default, variants, bank, options, bulk, applied.
- Browser kiểm sinh biến thể, thêm/xóa biến thể thủ công, mở ngân hàng nghĩa, thêm/xóa nghĩa, chọn đáp án đúng và giữ lựa chọn sau render; bulk paste cancel/apply giữ đúng danh sách và grading key synthetic. Từ đang nhập vẫn được giữ.
- Native drag chạy riêng để tránh làm nhiễu capture parity. Fixture thu gọn hai thẻ, đưa thẻ đích vào giữa viewport rồi kéo qua drag handle; xác nhận draft đổi thứ tự và giữ từ `kept-word`.
- Lượt drag đầu chưa tạo `dragstart`: thẻ đích ở top `-11px`, Playwright cuộn đích trong lúc đang giữ chuột. Trace chỉ có mousedown/mouseup. Đưa cả hai thẻ vào viewport tạo đủ dragstart/drop và kiểm tra pass, không thay handler sản phẩm. Các trace chẩn đoán tạm không được đưa vào runtime hoặc harness cuối.
- Full browser integration: root/prefix × ba viewport, 10 vòng mount/dispose mỗi tổ hợp; pass, 0 browser errors. Bao gồm các luồng save/import/dirty navigation, rubric, retake, SSE và assessment cancellation. Đủ 13 CSS responses có status 200/MIME CSS.
- Review Standards: 0 finding; Spec: 0 finding. Reviewer độc lập chạy 8 tests artifact/vocabulary, đều pass. Không xóa assertion cũ.

## Artifacts và giới hạn

Artifacts local: `C:/Users/OS/AppData/Local/Temp/vocab-style-before/`, `vocab-style-after/`, `vocab-style-drag-final/`, `vocab-style-smoke/`. So pixel và computed JSON nằm trong `vocab-style-after/comparison.json`.

Capture dùng `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 VOCAB_STYLE_PARITY=1 ARTIFACT_DIR=<path> node tests/browser/dashboard-integration-smoke.mjs`. Lượt drag thêm `VOCAB_DRAG_CHECK=1`, lưu thư mục khác. Native drag không thuộc bài so pixel.

Không kiểm chứng API/DB thật, deployment, performance production hoặc CSV từ dữ liệu thật; không sửa backend hoặc file test đang làm dở ở checkout chính. Rollback bằng revert commit như một đơn vị gồm template/CSS/revision/manifest/maps. Sentence Transformation/Reorder và các nhóm inline khác còn trong lộ trình.
