# Thay ký tự ▶/⏸ trong giao diện audio bằng icon SVG

Ngày 10/11/2026. Nhánh `fix/candidate-audio-glyphs`, baseline `6b6c09b` (`fix/missing-svg-icons`). Thay đổi hình ảnh có chủ đích theo quyết định của chủ dự án; đụng tới giao diện học viên nên có kiểm tra riêng.

## Phát hiện: handler giáo viên là mã chết

Đợt thay emoji trước nhận định nút `.btn-sim-audio-play` trong `studio/simulation.js` là giao diện học viên dùng chung. Nhận định đó **không đúng với `simulation.js`**: dock audio của mô phỏng do `renderStrictCandidateAudioDock` (`studio/media.js`) dựng với nút `.btn-start-listening`; không template nào của `simulation.js` tạo `.btn-sim-audio-play`. Kiểm tra ở runtime (fixture `SIMULATION_SHELL_PARITY`): dock có 1 audio dock và **0** nút `.btn-sim-audio-play`. Handler ở `simulation.js:1242-1255` (kèm `⏸ Tạm dừng audio` / `▶ Phát audio (nếu có)`) không bao giờ chạy, nên đã xóa. Lớp `.btn-sim-audio-play` thật sự thuộc renderer học viên (`dynamic-exam-renderer.mjs`), vốn đã dùng icon SVG và được test riêng.

## Thay đổi

- `studio/simulation.js`: xóa handler chết (16 dòng).
- `webtest-34-demo/index.html` (renderer canonical): nút `Bắt đầu phát audio · 1 lần` dùng SVG `play` nhúng tại chỗ (script inline cổ điển không truy cập `ICONS`); `.icon-inline` trong `dynamic-test.css` quy định kích thước/nét.
- `webtest-34-demo/content-preview.mjs`: nút `Phát audio (nếu có)` dùng `${ICONS.play}`.
- Đổi `?rev=` của `content-preview.mjs` trong `index.html` (3 chỗ) từ `20261106-draft-conflict-v1` sang `20261110-candidate-glyphs-v1` theo quy ước của repo. **Bổ sung cho commit màu Danger** (`9743572`) vốn cũng sửa `content-preview.mjs` nhưng chưa đổi rev, nên trình duyệt đã cache bản cũ có thể giữ màu `#dc2626` cho 3 trạng thái học viên cho tới khi hết cache.
- Harness: regex emoji của fixture mở rộng thêm khối hình học U+25A0–25FF (chứa `▶`), trước đó không bắt được ký tự này.

## Xác minh

- `tests/candidate-audio-glyphs.test.mjs` (3 test): nút bắt đầu audio ở `index.html` có SVG và không có ký tự `▶/⏸`; nút của `content-preview` render qua `groupSections` có SVG; `simulation.js` không còn `btn-sim-audio-play` hay ký tự play/pause. Đã chạy trên mã cũ: cả 3 thất bại; trên mã mới: pass.
- `npm test`: 671/671 pass.
- Smoke tích hợp đầy đủ (6 lượt × 10 vòng mount/dispose) 0 lỗi; fixture mô phỏng có assertion mới đếm `.btn-sim-audio-play` = 0 và chạy pass; `builder-lifecycle`, `dashboard-lifecycle` pass.
- `candidate-mobile-smoke` (giao diện học viên, 360–1440px): pass ở các lần chạy sau khi đổi rev. Có 1 lần thất bại `TimeoutError` ở `readingTabs` (`candidate-mobile-smoke.mjs:216`) ngay trong lượt chạy đầu sau khi đổi rev, sau đó 2 lần chạy liên tiếp đều pass; xem mục Giới hạn.

## Giới hạn

- Nút `audio-start-btn` ở `index.html` (luồng audio "1 lần" của renderer canonical) **không có test hành vi nào trong trình duyệt**: chỉ có test hợp đồng đọc mã nguồn. Tôi chưa chạy trang thật với token và audio, nên chưa xác nhận bằng mắt rằng icon hiển thị đúng kích thước ở đó. Rủi ro thấp (cùng `.icon-inline` đã dùng cho các nút khác trên trang) nhưng chưa được chứng minh.
- `candidate-mobile-smoke` có độ chập chờn (1 thất bại trong 4 lần chạy gần nhất, thất bại tại bước chờ tab Bài đọc); chưa xác định nguyên nhân gốc, chưa có bằng chứng thay đổi này gây ra.
- Chưa kiểm phát/dừng audio thật.

Rollback: revert commit như một đơn vị.
