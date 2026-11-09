# Cleanup khung mô phỏng làm bài

Cập nhật: lỗi overlap mobile được ghi nhận ở baseline trong báo cáo này đã được xử lý ở đợt sau; xem `SIMULATION_MOBILE_LAYOUT_FIX.md` để biết phạm vi native mouse/touch đã kiểm.

Ngày 09/11/2026. Baseline `f026aa7`; nhánh `refactor/simulation-shell-styles`.

## Phạm vi

- Chuyển 8 static style attributes trong `studio/simulation.js` sang fragment 08: khung giới thiệu Phần nhiều bài tập, tiêu đề/hướng dẫn, khoảng cách audio/reading dock, chiều rộng progress ban đầu, footer actions và trạng thái ẩn ban đầu của kết quả.
- Dùng selector có scope `#candidate-simulation-modal` và các class có sẵn; giữ nguyên DOM, nội dung, listener, state và thuật toán chấm. Runtime width tiến độ và display kết quả tiếp tục dùng inline styles để thắng CSS mặc định.
- Dùng ba token hiện có với màu cũ; không đổi palette, radius hoặc thêm `!important`. Không chuyển template câu hỏi hoặc phần chi tiết kết quả trong đợt này.
- CSS revision `20261109-simulation-shell1`; manifest/hash/ranges, rule map và inventory cập nhật, giữ extraction provenance. Không thay Pages workflow, dependencies hay backend.

## Xác minh

- Syntax check simulation.js pass; không phải typecheck. `npm test` worktree: 660 tests, 658 pass, 2 skip, 0 fail; skip do thiếu tài liệu design system ở thư mục cha worktree.
- Fixture gồm hai Phần, ba câu single choice, Phần đầu có hai bài tập và audio/reading chung. Kiểm chuyển Phần bằng tab và sidebar, question navigator, giữ đáp án sau chuyển Phần, tiến độ 1/3 → 3/3, submit kết quả 3/3đ, xem lại bài thi và đóng bằng header/footer. Không đổi nội dung đề thật hoặc private keys; dữ liệu hoàn toàn synthetic.
- Audio: kiểm volume 0.5, nút start gọi play một lần, phát sự kiện ended. `audio.play()` được stub trên phần tử trong fixture; không tuyên bố đã kiểm codec, nghe âm thanh thật hoặc playback/network production.
- Mobile 390px: baseline có bảng điều hướng che điểm bấm đáp án ở Phần thứ hai. Fixture dùng checked + bubbling change để kiểm state trả lời ở viewport này; desktop/tablet dùng check thật. Các nút điều hướng, audio, submit/đóng vẫn click thật. Đây là giới hạn UI sẵn có, không phải bằng chứng toàn bộ luồng mobile dùng được bằng chuột/chạm; chưa sửa trong extraction.
- Capture 1440×900, 1024×768, 390×844 gồm default, Phần thứ hai, hoàn thành và kết quả, cộng dashboard/Builder/dirty dialog/room. So toàn DOM 23 computed properties, không loại class hay thuộc tính. Capture chờ finite animations kết thúc; lần đầu hover đang chuyển tiếp gây sai lệch computed dù 24 ảnh giống nhau. Baseline chụp lại từ checkout `f026aa7` bằng cùng harness, không lấy code mới làm baseline.
- Inventory lexical còn 265 vị trí; phần template câu hỏi và runtime styles vẫn còn. Cleanup toàn bộ chưa hoàn tất.
- Kết quả capture ổn định: 24/24 ảnh RGB và 24/24 computed snapshots giống baseline. Không normalize hoặc bỏ qua thuộc tính khi so sánh.
- Full integration: root và `/preview-base` × ba viewport, tổng 60 vòng mount/dispose, pass, 0 browser errors; giữ kiểm save/import/dirty navigation, focus, ownership, rubric, retake, SSE và assessment cancellation. Đủ 13 CSS responses 200/MIME CSS mỗi lượt.
- Lượt behavior bổ sung `simulation-shell-behavior/` pass ba viewport, 0 browser errors: assert thông báo audio ended hiển thị, start disabled và đủ ba hàng kết quả. Không thêm điều chỉnh runtime.
- Review Standards: 0 hard violations/0 smell findings; Spec: 0 findings. Standards chạy artifact/simulation tests 6/6 pass, Spec chạy artifact pass. Kết quả computed ổn định được hoàn tất sau source review và ghi ở trên.

Artifacts: `C:/Users/OS/AppData/Local/Temp/simulation-shell-before/`, `simulation-shell-after/` (`comparison.json`), `simulation-shell-smoke/`. Capture bằng `CAPTURE_ONLY=1 CAPTURE_COMPUTED=1 SIMULATION_SHELL_PARITY=1 ARTIFACT_DIR=<path>` với `tests/browser/dashboard-integration-smoke.mjs`; chạy riêng với lifecycle smoke để không trộn focus fixture vào assertion Stay.

Không kiểm API/DB thật, production deployment/performance, mọi loại câu hỏi hoặc accessibility toàn bộ mô phỏng. Giữ nguyên file test xóa bài tập đang làm dở ở checkout chính. Rollback bằng revert commit template/CSS/metadata như một đơn vị.
