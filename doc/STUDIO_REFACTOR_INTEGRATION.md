# Đồng bộ main và refactor Test Studio

Ngày xác minh: 06/11/2026. Nhánh kết quả: `integration/studio-refactor`, worktree `../.worktrees/frontend-refactor-integration` tính từ frontend repo chính. Không đổi nhánh hoặc nội dung checkout chính; không push/merge vào main, không deploy.

## Mốc tích hợp

- Fetch origin trước khảo sát. `origin/main`: `09a6bc0` (bao gồm cải tiến candidate mobile/iPad #25).
- `main` local và `feature/test-studio` local/remote lúc khảo sát: `d0e328f`; đều là tổ tiên của `09a6bc0`.
- Nhánh cũ `origin/test-studio`: `0fd6274`; cũng đã nằm trong main, không có commit riêng cần ghép thêm.
- Refactor: `a308bb3`, kế thừa `95c46ef`. Merge base giữa refactor và main: `2a13447`.
- Nhánh tích hợp bắt đầu từ refactor và merge `origin/main`, giữ lịch sử cả hai phía; không cherry-pick lặp các commit đã có.

## Xử lý xung đột

Hai file xung đột là `app.js` và `shell/dashboard.js`. Các thay đổi main trong monolith được đối chiếu từng hunk và đưa vào module sở hữu:

| Chức năng main | Module sau tích hợp |
| --- | --- |
| Biến thể gạch nối/danh xưng | `studio/question-content.js` |
| Incident đang mở trong phòng thi | `exam-room/presentation.js` |
| Nhận diện bài Đọc hiểu Khối 03 | `studio/draft-model.js`, facade và Builder |
| Excel loader, quick guide, nhập file | `studio/batch-import.js` |
| Preset rubric và ngữ cảnh chung | `studio/authoring/rubric.js`, `studio/question-renderer.js`, `studio/builder.js` |
| Assessment subtabs, hiển thị phân tích câu hỏi và modal làm lại | `shell/dashboard.js` |
| Cột làm lại/gia hạn trong phòng thi | `exam-room/view.js`; callback do shell cung cấp |
| Results header | `results/view.js` |

Giữ owner của modal khi bổ sung returned modal cho rubric. Thêm imports của helpers mới tại nơi dùng, không import ngược facade. Giữ đủ **170 exports của main**. Không có dependency cycle mới trong 48 module ứng dụng được review.

CSS, HTML, vendor XLSX, template Excel, candidate renderer/mobile và workflow Pages được giữ đúng phiên bản `09a6bc0` (không có diff với origin/main ở các file này). Source-contract test của redesign được đổi sang helper đọc dependency graph; không xóa assertion.

## Lỗi kết hợp đã sửa

Assessment tabs mới đặt báo cáo trong `grading`, trong khi cơ chế cancellation cũ chỉ coi `reports` là host. Đồng thời đổi assignment hủy request nhưng không reset loading, có thể khiến tab kẹt spinner.

`cancelAssessmentQueries()` reset loading/error của cả hai báo cáo khi đổi assignment hoặc rời cả hai host. Chuyển giữa grading/reports giữ query đang chạy. Browser regression giữ response chờ để tái hiện: RED ở assertion request phải khởi động lại sau đổi assignment, rồi GREEN sau sửa. Kiểm tra cả distribution/items, đổi giữa hai assignment khác nhau, URL request thuộc assignment mới và rời/quay lại grading.

## Bằng chứng kiểm thử

- `npm test`: **641 tests, 639 pass, 2 skip, 0 fail**. Hai skip là design compliance thiếu tài liệu ở thư mục cha của worktree, không tính là pass.
- `RUN_ASSESSMENT_RACE=1 ARTIFACT_LABEL=integration-verified node tests/browser/dashboard-integration-smoke.mjs`: pass trên 1440×900, 1024×768, 390×844, mỗi viewport có root/prefix và 10 vòng mount/dispose; 0 browser errors. Kiểm tra thêm mở/đóng modal làm lại và tạo câu rubric comprehension từ modal, đổi preset/visibility, lưu ngữ cảnh chung vào draft.
- Sau khi tăng cường regression đổi giữa hai assignment khác nhau, chạy lại harness với `SMOKE_WIDTH=1440 SMOKE_ROOT_ONLY=1 ARTIFACT_LABEL=assessment-distinct-assignment`: pass, 0 browser errors.
- `PLAYWRIGHT_MODULE=<local Playwright> node tests/browser/candidate-mobile-smoke.mjs`: pass tại 360, 390, 768, 1024, 1440 px và các biến thể touch do harness định nghĩa. Bao gồm các kiểm tra autosave/retry của main.
- `git diff --check origin/main`: pass. Staged diff so với parent refactor có cảnh báo trailing whitespace vốn có trong HTML, analytics template và test mới của main; giữ nguyên các phần đó khi đồng bộ. Lexical scan không thấy dependency mới chưa bind ngoài browser globals và nợ có sẵn.
- Review Spec: 0 finding; Standards: 1 finding cancellation ở trên đã sửa và reviewer kiểm tra lại.

Artifacts browser nằm trong git directory của worktree: `verification/issue-24/integration-verified/` và `assessment-distinct-assignment/`. Các ảnh là bằng chứng smoke, không phải so sánh pixel với giao diện cũ vì main đã thay đổi giao diện. Không kiểm thử API/DB thật hoặc Pages deployment trong đợt tích hợp frontend này; không sửa backend.

Nợ có sẵn vẫn còn: nhánh inline-cloze trong `studio/content-import.js` tham chiếu `parseClozeBlanks` chưa bind. Cần ticket sửa riêng; smoke import không bao phủ nhánh này. Chưa chuyển TypeScript/framework, chưa tách CSS.

## Tiếp theo

Review/tích hợp nhánh này vào nhánh phát triển được chọn rồi tiếp tục phần CSS của roadmap. Nếu cần hủy riêng merge đồng bộ trên nhánh tích hợp, revert merge theo parent 1 để quay về refactor trước tích hợp; không reset hoặc sửa lịch sử các nhánh nguồn. Nếu main tiếp tục có commit mới, đồng bộ và xác minh lại trước khi đưa vào sử dụng.
