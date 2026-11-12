# Cleanup style phát âm/IPA

Ngày 08/11/2026. Baseline `1cd0c9f`; nhánh `refactor/ipa-styles`, worktree `frontend-refactor-integration`.

## Thay đổi

- Chuyển đủ **12 thuộc tính inline style** trong nhánh pronunciation của `studio/question-renderer.js` sang 12 rule có scope `.template-pronunciation-ipa` trong fragment 07.
- Bao gồm grid từ/audio, nhóm nhập phiên âm, bàn phím IPA, badge xem trước và danh sách/phím thêm phương án. Màu dùng các token hiện có với cùng giá trị; không thêm màu, đổi radius hoặc sửa handler.
- Giữ DOM/classes/data attributes, caret logic, selection đáp án, draft ownership và audio controller. Các template câu hỏi khác không thay đổi.
- Bảo toàn hai cột ở mobile: inline cũ thắng media rule một cột, nên CSS mới giữ ưu tiên tương đương. Đây là bảo toàn baseline, chưa sửa responsive của khu vực này.
- Capture đầu phát hiện font input bị `font: inherit` toàn cục ghi đè. Đã tăng specificity thành `.template-pronunciation-ipa .form-control.input-ipa-transcription`, khôi phục font Consolas/Menlo và 1.05rem; không thêm `!important`. Harness có assertion font-family và 16.8px để ngăn hồi quy trong môi trường baseline.

Revision HTML/CSS imports: `20261108-ipa-layout1`. Manifest cập nhật checksum/line ranges, giữ extraction provenance. Selector map có 1.630 selector; inventory inline cập nhật còn 483 vị trí lexical, giảm 12 so với snapshot cleanup trước. Không thay Pages workflow hoặc thêm request CSS.

## Kiểm chứng

- `npm test` trong worktree: **660 tests, 658 pass, 2 skip, 0 fail**. Hai skip vì thiếu tài liệu design-system ở thư mục cha của worktree, không tính là pass.
- **60/60 ảnh RGB giống hoàn toàn**, **57/57 snapshot computed styles giống nhau** tại 1440×900, 1024×768, 390×844. Snapshot kiểm 23 thuộc tính trên toàn DOM, gồm grid mobile, nhập/chèn IPA, symbol hover, thêm và xóa phương án.
- Browser fixture kiểm chèn ký tự tại vị trí con trỏ, vị trí caret sau chèn, cập nhật badge, giữ từ/phiên âm sau render, thay đáp án đúng rồi xóa phương án khác và kiểm grading key synthetic.
- Nút audio được kiểm bằng `Audio` giả lập: nhận hành động play/pause; không phát media hoặc gọi host ngoài. Đây không phải kiểm chứng codec, URL/audio thật hoặc quyền truy cập file.
- Kéo thả riêng ở ba viewport pass: đổi thứ tự qua drag handle, giữ IPA đang nhập sau render; collapse/expand và chuyển phần cũng pass. Sau fix font, chạy lại lượt font + drag tại 1440px, pass.
- Full integration với `RUN_ASSESSMENT_RACE=1`: sáu tổ hợp root/prefix × ba viewport, 10 vòng mount/dispose mỗi tổ hợp; pass, 0 browser errors, đủ 13 CSS response 200/MIME CSS.
- Standards và Spec không còn finding. Reviewer xác nhận selector sửa font thắng shorthand toàn cục; artifact/pronunciation tests độc lập 5/5 pass. Kết luận parity dựa vào capture cuối, không dùng lượt capture bị lệch font.

## Artifacts và tái chạy

Artifacts tại `C:/Users/OS/AppData/Local/Temp/ipa-style-before/`, `ipa-style-after/`, `ipa-style-drag/`, `ipa-style-font-and-drag/`, `ipa-style-smoke/`. Kết quả so ảnh/computed lưu `ipa-style-after/comparison.json`.

Capture chạy `tests/browser/dashboard-integration-smoke.mjs` với `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 CSS_PARITY=1 CSS_CONTEXT_PARITY=1 BUILDER_STYLE_PARITY=1 IPA_STYLE_PARITY=1 ARTIFACT_DIR=<path>`. Lượt kéo thả bật `BUILDER_DRAG_CHECK=1` và lưu riêng; không trộn native drag vào bài so pixel.

Không kiểm chứng API/DB thật, media thật, performance production hoặc Pages deployment. Không sửa file test xóa bài tập đang làm dở ở checkout chính. Rollback bằng revert commit gồm template/CSS/revision/manifest/maps như một đơn vị. Các nhóm vocabulary, sentence transformation và inline styles khác còn trong lộ trình.
