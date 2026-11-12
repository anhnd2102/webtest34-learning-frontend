# Smoke luồng học viên (bước 7, lưới an toàn)

Ngày 12/11/2026. `tests/browser/candidate-flow-smoke.mjs`: Chrome thật, Learning API giả có trạng thái (lưu bản nháp như máy chủ), 1440×900. Chạy: `node tests/browser/candidate-flow-smoke.mjs`. Không nằm trong `npm test`.

## Phát hiện về cấu trúc (đính chính kế hoạch)

Link thi thật (`index.html#test=<token>`) **không chạy script nội tuyến 2.000 dòng** của `index.html`: đoạn đầu trang thấy token trong fragment thì `import('./content-preview.mjs').mount(...)` và script nội tuyến thoát ngay (`isCandidateCbt`). Script nội tuyến (`index.html` dòng ~599–2593) chỉ chạy cho đường prototype cũ (không có token, không `demoCourse`). Mã học viên đang dùng là `content-preview.mjs` (2.465 dòng, module) cùng `dynamic-exam-renderer.mjs`, `exam-guard.js`. Vì vậy mục tiêu tách của bước 7 nên là `content-preview.mjs`; đường prototype nội tuyến cần quyết định riêng (còn dùng hay gỡ).

## Phủ

1. Token lấy từ fragment (`/test-access/resolve` mang đúng `testToken`); chọn đáp án và nhập chữ lưu nháp bằng `PATCH /attempts/draft` theo revision tăng dần, có `attemptToken`, hiện "Đã lưu máy chủ"; câu viết ở phần khác cũng được lưu.
2. Mở lại trang rồi vào lại lượt: đáp án chọn, đáp án điền và bài viết khôi phục từ bản nháp máy chủ (trình duyệt không giữ đáp án trong chế độ học viên).
3. Lỗi lưu nháp 500 và mất mạng: hiện "Lưu máy chủ thất bại" và "Chưa lưu được…", lần gõ sau lưu được bản mới nhất và xóa thông báo lỗi; lỗi lưu không tự nộp bài.
4. Nộp bài: bấm xác nhận nhiều lần chỉ gửi một `POST /attempts/submit`; có `submissionId`, bài làm; hiện "Nộp bài thành công", khóa ô nhập, nút "Đã nộp bài"; sau nộp không lưu nháp nữa (chờ 2,2 giây vượt quá thời gian debounce).
5. Mất kết nối khi nộp: báo "Nộp bài không thành công", không tự nộp lại, nút xác nhận bật lại, nộp lại được.
6. Hết giờ (đồng hồ giả của Playwright): tự nộp đúng một lần, có thông báo hết giờ, bài làm trước hạn nằm trong phần nộp.

Kiểm tra đột biến: bỏ `disabled = true` của nút xác nhận nộp thì mục 4 lỗi; bỏ `draftRevision += 1` thì mục 1 lỗi (`revision tăng dần: 0,0`). Cả hai đã hoàn nguyên.

## Khoảng trống đã biết (ghi lại, chưa sửa)

- **`submissionId` không ổn định khi nộp lại.** `content-preview.mjs` sinh `createUuid()` mới ở mỗi lần bấm xác nhận. Đường prototype nội tuyến dùng một `submissionId` cố định và xử lý `SUBMISSION_ALREADY_FINAL` bằng cách tải kết quả. Ở shell thật, nếu lần nộp đầu đã được máy chủ ghi nhận nhưng phản hồi bị mất, lần nộp lại có thể nhận lỗi "đã nộp" và học viên thấy "Nộp bài không thành công" dù bài đã nộp. Smoke ghi `knownGaps.submissionIdStableAcrossRetry: false`. Cần xác nhận hành vi backend (idempotency theo `submissionId` hay theo lượt) trước khi sửa.

## Chưa phủ

Audio (kiểm tra loa, checkpoint, resume), Exam Mode (phòng chờ, SSE, tín hiệu kết nối, Exam Guard, thiết bị bị thay), kết quả sau công bố (polling), các dạng câu hỏi ngoài chọn/điền/viết, di động, Wake Lock (đã có trong `candidate-mobile-smoke`).
