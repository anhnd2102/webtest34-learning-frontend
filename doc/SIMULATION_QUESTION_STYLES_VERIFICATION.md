# Cleanup Pronunciation và Sentence Transformation trong mô phỏng

Cập nhật: lỗi nút nghe IPA của baseline được xử lý ở đợt sau; xem `SIMULATION_IPA_AUDIO_FIX.md` về playback/lifecycle và giới hạn đã kiểm.

Ngày 09/11/2026. Baseline `07b8782`; nhánh `refactor/simulation-pronunciation-transformation`.

## Phạm vi

- Chuyển 4 static style attributes trong hai nhánh của `studio/simulation.js` sang fragment 07: audio IPA ẩn, margin options, margin hàng từ khóa và font/color nhãn từ khóa.
- Dùng class có sẵn, scope `#candidate-simulation-modal` và wrapper từng template. Giữ nguyên DOM/nội dung, điều kiện render, xử lý trả lời, grading và audio. Không đổi Reorder/Error Correction hoặc framework.
- Màu nhãn dùng token `--izone-slate-600` hiện có với giá trị cũ. Không thêm token, radius hoặc `!important`.
- CSS revision `20261109-simulation-question1`; cập nhật manifest/hash/ranges/rule map và inventory, giữ extraction provenance. Không đổi workflow Pages/backend/dependencies.

## Xác minh

- Syntax check simulation.js pass; không phải typecheck. `npm test` worktree: 660 tests, 658 pass, 2 skip, 0 fail. Hai skip do thiếu tài liệu design system ở thư mục cha worktree. Targeted artifact/transformation: 4/4 pass.
- Fixture Builder thật có một pronunciation và một sentence rewrite. Chọn đáp án bằng native check, nhập câu trả lời bằng fill trên 1440×900, 1024×768, 390×844; không gán đáp án qua DOM hoặc force click. Kiểm audio hidden, từ khóa uppercase, tiến độ 2/2, kết quả đúng 2/2đ và sai 0/2đ, giữ câu trả lời khi xem lại, đóng kết quả và mô phỏng.
- 24/24 computed snapshots toàn DOM giống baseline; giữ toàn bộ 23 thuộc tính, không normalize hoặc loại class. Chờ finite animation kết thúc trước capture.
- 22/24 PNG RGB giống hoàn toàn. Hai sai lệch mobile cùng kích thước ảnh: `390-room.png` có 596 pixel, maxChannel 1/255; `390-simulation-question-default.png` có 1.130 pixel, maxChannel 3/255. Không có sai lệch computed layout; lưu bounds và số liệu trong `pixel-diff.json`. Không chạy lại capture để chọn kết quả thuận lợi.
- Inventory lexical còn 261 vị trí; cleanup toàn bộ chưa hoàn tất.
- Full integration: root và `/preview-base` × ba viewport, tổng 60 vòng mount/dispose, pass, 0 browser errors. Giữ save/import/dirty navigation, focus, ownership, rubric, retake, SSE và assessment cancellation; 13 CSS responses 200/MIME CSS mỗi lượt.
- Review hai trục: Standards 0 hard violations/0 smell findings; Spec 0 findings. Cả hai reviewer chạy độc lập CSS artifact test pass; không sửa runtime sau review.

## Giới hạn audio được phát hiện

Trên baseline, nút `.candidate-ipa-audio-btn` có markup/data-audio-src nhưng không có handler phát audio trong module/dashboard. Fixture stub play trên audio tương ứng để quan sát: native click nút cho `playCalls: 0` ở cả ba viewport. Bản sau extraction giữ nguyên kết quả đó; không assert zero như một yêu cầu sản phẩm để khóa lỗi cũ.

Đợt này chỉ kiểm audio element ẩn, nút hiện diện/click được và bảo toàn hành vi baseline; không tuyên bố playback hoạt động. Sửa nút nghe IPA cần đợt bugfix riêng có regression test phát/đổi audio. Không dùng dữ liệu âm thanh riêng tư hoặc kiểm codec/network production.

Artifacts tại `C:/Users/OS/AppData/Local/Temp/simulation-question-before/`, `simulation-question-after/` (comparison/pixel-diff và play observations), `simulation-question-smoke/`. Capture bằng `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 SIMULATION_QUESTION_STYLE_PARITY=1 ARTIFACT_DIR=<path>` với `tests/browser/dashboard-integration-smoke.mjs`; chạy lifecycle smoke riêng để giữ assertion focus Stay.

Không kiểm API/DB thật, production deployment/performance hoặc mọi cấu hình câu hỏi. Giữ nguyên file test xóa bài tập đang sửa ở checkout chính. Rollback bằng revert commit template/CSS/metadata như một đơn vị.
