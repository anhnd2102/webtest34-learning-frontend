# Cleanup Sentence Transformation/Reorder

Ngày 08/11/2026. Baseline `e9c075b`; nhánh `refactor/sentence-styles`, worktree `frontend-refactor-integration`.

## Phạm vi

- Chuyển **23 inline style attributes** của hai template trong `studio/question-renderer.js` sang 23 rule có scope trong fragment 07. Không đổi DOM/classes, handler, đáp án, tokenization hoặc thuật toán shuffle.
- Bao gồm keyword, prefix/suffix, target answer, frame preview, variant chips, token pool và distractor manager. Keyword có selector ba class để giữ font-weight trước shorthand `font: inherit` toàn cục.
- Giữ khoảng cách 8px/10px riêng cho các nhóm field trực tiếp bằng selector direct-child/adjacent; không áp margin cho field bên trong grid. Bảo toàn hai cột mobile từng được inline style ưu tiên hơn media rule cũ.
- Empty-distractor message dùng selector loại trừ `.distractor-chip`, tránh áp style placeholder lên chip thật.
- Thêm ba token màu khung đáp án, bằng các màu cũ `#eff6ff`, `#3b82f6`, `#1d4ed8`. Không đổi các token đã có, radius hoặc thêm `!important`.
- Revision entry/HTML/imports: `20261108-sentence-layout1`. Manifest, line ranges và selector map cập nhật, giữ extraction provenance; không thêm CSS request hoặc thay Pages workflow.

## Xác minh

- Frontend trong worktree: **660 tests, 658 pass, 2 skip, 0 fail**. Hai skip do thiếu tài liệu design-system ở thư mục cha worktree, không tính là pass.
- **27/27 ảnh RGB giống hoàn toàn**, **27/27 snapshot computed styles giống nhau** trên 1440×900, 1024×768 và 390×844. Kiểm 23 thuộc tính trên toàn DOM; gồm default, generated transformation, tokenized reorder, distractor và variants, cùng các state dashboard/Builder/dirty dialog/room.
- Fixture kiểm keyword uppercase, sửa frame prefix/suffix/answer, preview, sinh/thêm/xóa biến thể, phân rã câu, thêm/xóa distractor, sinh biến thể câu reorder và giữ dữ liệu sau render.
- Native drag chạy riêng tại ba viewport: thu gọn thẻ, đưa thẻ đích vào viewport, kéo thẻ reorder lên trước transformation qua handle thật; kiểm draft đổi thứ tự và giữ cả answer/target sentence. Không trộn native drag vào bài so pixel.
- `Math.random` chỉ được cố định trong fixture và khôi phục sau dispose để ảnh token shuffle tái lập được. Không thay randomness của sản phẩm hoặc khẳng định kiểm chứng phân phối ngẫu nhiên.
- Full browser integration: root/prefix × ba viewport, 10 vòng mount/dispose mỗi tổ hợp; pass, 0 browser errors. Giữ các kiểm tra import/save/dirty navigation, ownership, rubric, retake, SSE và assessment cancellation. Đủ 13 CSS responses 200/MIME CSS.
- Standards: 0 finding; Spec: 0 finding. Reviewer độc lập chạy 8 tests artifact/sentence, đều pass. Không bỏ assertion cũ.

## Kiểm kê còn lại

Inventory lexical còn **454 vị trí**, gồm cả style attributes và thao tác style bằng JS; không phải toàn bộ đều nên chuyển sang CSS. Selector map có 1.660 selector. Các file còn nhiều dòng nguồn chứa style gồm:

| File | Vị trí lexical kind `attribute` |
| --- | ---: |
| `studio/batch-import.js` | 136 |
| `studio/question-renderer.js` | 48 |
| `studio/move-exercise-modal.js` | 19 |
| `studio/simulation.js` | 18 |
| `studio/authoring/vocabulary.js` | 16 |

Đây là đếm theo dòng bằng regex, không phải CSS parser hay số declaration. Đợt tiếp theo có thể chọn riêng CSV/Quick Guide modal trong `batch-import.js`; tiếp tục giữ inline state động và so parity từng modal, không chuyển toàn bộ file trong một lần.

## Artifacts và giới hạn

Artifacts local: `C:/Users/OS/AppData/Local/Temp/sentence-style-before/`, `sentence-style-after/`, `sentence-style-drag/`, `sentence-style-smoke/`. So sánh lưu trong `sentence-style-after/comparison.json`.

Capture chạy `tests/browser/dashboard-integration-smoke.mjs` với `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 SENTENCE_STYLE_PARITY=1 ARTIFACT_DIR=<path>`. Lượt drag thêm `SENTENCE_DRAG_CHECK=1`, lưu thư mục khác.

Không kiểm API/DB thật, performance production, thuật toán grading mới hoặc deployment. Không sửa backend hay file test xóa bài tập đang làm dở ở checkout chính. Rollback bằng revert commit gồm template/CSS/revision/manifest/maps như một đơn vị. Cleanup toàn bộ inline styles vẫn chưa hoàn tất.
