# Builder/editor: chuyển inline styles tĩnh sang CSS

Chốt báo cáo ngày 08/11/2026; bằng chứng browser thu ngày 06/11/2026. Baseline `c4d3121`; nhánh `refactor/builder-inline-styles`, worktree `frontend-refactor-integration`. Không đưa các thay đổi chưa commit của checkout chính vào nhánh này.

## Phạm vi

- Bỏ 12 thuộc tính style hoàn toàn: Builder 14 → 9, question renderer 95 → 89, standalone rich editor 9 → 8. Bốn vị trí khác chỉ chuyển phần tĩnh, giữ inline `display` do JS điều khiển.
- Thanh thêm bài tập và footer chuyển phần dùng rule có scope `.test-builder-workspace` trong fragment 03.
- Ba loại input audio (phần, phát âm, listening order) nhận `flex: 1` qua CSS có scope. Các wrapper dùng lại `.audio-input-with-preview` đã có display/alignment/gap tương đương trong fragment 05, không tạo bản sao.
- Hint và cảnh báo audio nhận font/margin/color từ class; `display` cảnh báo Drive vẫn theo trạng thái draft và event handler hiện có.
- Content area và error popup dùng class chung trong fragment 09 cho cả inline-cloze, reading passage và standalone editor. Giữ inline `display: none` và thao tác hiển thị lỗi; CSS chỉ nhận position/padding/font/margin tĩnh.
- Thêm `--izone-text-muted: #64748b`, không đổi token đã có hoặc màu hiển thị. Không thêm `!important`, đổi event handler, API, ownership hoặc selector sự kiện.

Revision HTML/entry/12 imports: `20261106-builder-layout1`. Manifest checksum/line ranges và selector map được cập nhật; extraction provenance giữ nguyên. Có 1.618 selector, tăng 7 rule so với trước. Không thêm request CSS. Inventory inline styles được quét lại (495 vị trí lexical); số này bao gồm cả những chức năng đã thêm từ sau inventory cũ, không dùng chênh lệch với snapshot cũ làm số lượng cleanup.

## Kiểm chứng

- Toàn frontend trong worktree: **658 tests, 656 pass, 2 skip, 0 fail**. Hai skip do thiếu tài liệu design-system ở thư mục cha worktree, không tính là pass.
- Browser integration Chrome 156: 1440×900, 1024×768, 390×844, root và prefix, 10 vòng mount/dispose mỗi tổ hợp; pass, 0 browser errors. Bao gồm save/import/dirty navigation, rubric, retake, SSE và assessment cancellation.
- Fixture mới dùng hai phần và câu phát âm/inline-cloze, xác nhận next/previous, cảnh báo link Drive, thu gọn/mở bài tập và lỗi nhập URL ảnh không hợp lệ.
- Snapshot so sánh 23 thuộc tính computed styles trên toàn DOM: **45/45 giống nhau**. So ảnh bao phủ các state cũ, context và năm state Builder mới ở ba viewport. Kết quả pixel chi tiết ghi trong artifact `comparison.json`; không suy luận ảnh giống tuyệt đối chỉ từ computed styles.
- Lần capture cuối không chạy native drag giữa các state: **47/48 ảnh giống RGB hoàn toàn**. Ảnh `1024-builder-next-block.png` cùng kích thước, khác 10 pixel với độ lệch kênh tối đa 7; không khẳng định cả 48 ảnh giống tuyệt đối.
- Kiểm tra kéo thả riêng dùng drag handle thật: gõ IPA, thu gọn câu, kéo câu thứ hai lên trước câu thứ nhất, xác nhận draft đổi thứ tự và giữ chuỗi `/typed-value/` sau render. Chạy tách khỏi capture parity để trạng thái compositor/selection sau native drag không làm nhiễu các ảnh giao diện tiếp theo.
- Không xóa assertion CSS cũ. Test artifact phát hiện manifest cũ không khớp sau thay đổi, rồi pass khi cập nhật checksum/revision đúng nội dung hiện tại.
- Review Standards: 0 finding. Review Spec: 0 finding. Reviewer chạy riêng 10 tests editor/sanitizer/artifact, đều pass.

## Tái chạy và giới hạn

Artifacts local ở `C:/Users/OS/AppData/Local/Temp/builder-style-before/`, `builder-style-after/`, `builder-style-smoke/`, `builder-style-drag/`. Capture: `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 CSS_PARITY=1 CSS_CONTEXT_PARITY=1 BUILDER_STYLE_PARITY=1 ARTIFACT_DIR=<path> node tests/browser/dashboard-integration-smoke.mjs`. Thêm `BUILDER_DRAG_CHECK=1` khi kiểm hành vi kéo thả; lượt riêng ở cả ba viewport đã pass. Native drag không phải một phần của bài so pixel.

Không kiểm thử DB/API thật, Pages deployment hoặc hiệu năng mạng production; không sửa backend/Pages workflow. Overflow mobile và nợ design-system có sẵn không được sửa trong commit này. Các inline styles khác vẫn còn; không coi đây là hoàn thành cleanup toàn bộ Builder.

Rollback bằng revert commit như một đơn vị gồm template, CSS, revision, manifest và maps. Khi tích hợp cần giữ các chỉnh sửa Builder đang làm dở ở checkout chính; không reset/stash hoặc ghi đè chúng để ép merge.

## Đồng bộ ngày 08/11/2026

Cleanup được lưu riêng trong commit `98a31b1`. Sau khi sửa xóa bài tập được lưu thành `fd8220d` trên nhánh phát triển, ghép commit đó vào nhánh cleanup trong worktree riêng; `builder.js` và `index.html` tự merge, không xung đột. Suite sau đồng bộ: **660 tests, 658 pass, 2 skip, 0 fail** trong worktree. Các chỉnh sửa chưa commit của test xóa bài tập ở checkout chính không thuộc merge này. Snapshot parity phía trên so riêng cleanup với baseline `c4d3121`, không chứng nhận parity cho chức năng xóa mới.
