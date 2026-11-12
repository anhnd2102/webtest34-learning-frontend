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

- **`submissionId` không ổn định khi nộp lại (mức độ thấp, đã đối chiếu backend).** `content-preview.mjs` sinh `createUuid()` mới ở mỗi lần bấm xác nhận nộp; đường prototype nội tuyến dùng một id cố định và xử lý `SUBMISSION_ALREADY_FINAL` bằng cách tải kết quả. Đối chiếu `webtest34-learning-platform/backend/src/learning-service.js` (`submit`, dòng ~610): khi lượt đã nộp, nếu **nội dung (hash câu trả lời) trùng** bản đã lưu thì máy chủ trả lại kết quả cũ (`replayed: true`) bất kể `submissionId`; chỉ khi nội dung **khác** và `submissionId` khác mới trả `SUBMISSION_ALREADY_FINAL`. Vì vậy cú nộp lại sau khi mất phản hồi vẫn an toàn nếu học viên không sửa đáp án giữa hai lần bấm. Hồi quy chỉ xảy ra khi học viên sửa đáp án sau lần nộp đầu đã được ghi nhận: lần nộp lại báo "Nộp bài không thành công" dù bài đã nộp (nội dung khác), và shell không có nhánh xử lý `SUBMISSION_ALREADY_FINAL`. Hiệu ứng phụ: nhánh lỗi gọi `queueServerDraft()`, nếu bài thực ra đã nộp thì bản nháp bị từ chối và học viên thấy cảnh báo lưu nháp. Smoke ghi `knownGaps.submissionIdStableAcrossRetry: false` (hành vi hiện tại, không phải lỗi dữ liệu).

## Chưa phủ

Audio (kiểm tra loa, checkpoint, resume), Exam Mode (phòng chờ, SSE, tín hiệu kết nối, Exam Guard, thiết bị bị thay), kết quả sau công bố (polling), các dạng câu hỏi ngoài chọn/điền/viết, di động, Wake Lock (đã có trong `candidate-mobile-smoke`).

## Smoke Exam Mode và Tự giám sát (bước 2 của lộ trình gỡ đường prototype)

`tests/browser/candidate-exam-mode-smoke.mjs`: Chrome thật, Learning API giả, toàn màn hình giả (headless không ổn định) và luồng SSE do test điều khiển. Chạy: `node tests/browser/candidate-exam-mode-smoke.mjs`. Mục tiêu: có bằng chứng hành vi cho Exam Mode của `content-preview.mjs` (mã học viên thật) trước khi gỡ đường prototype và chuyển các test đọc nguồn `index.html`.

Phủ:
1. Phòng chờ: chưa lộ đề; mở SSE `GET /attempts/events?deviceId=…` với `Authorization: Bearer <attemptToken>`; heartbeat gửi ngay và lặp mỗi 20 giây (đồng hồ giả); mọi lời gọi `/attempts/*` mang `deviceId`; nút "Tôi đã sẵn sàng" xin toàn màn hình trong cú bấm, gửi `/attempts/exam/ready`, báo lỗi và bật lại nút khi lỗi, hiện trạng thái sẵn sàng khi thành công.
2. Vào đề: nhận `exam.started` qua SSE thì dựng bài thi và gắn Exam Guard.
3. Exam Guard: rời cửa sổ (blur) mở đúng một sự cố `left_exam`, làm mờ đề, hai lần rời trong 2 giây gộp một sự cố, "Quay lại bài thi" đóng đúng sự cố đã mở; thoát toàn màn hình cũng mở sự cố; khi lần mở bị lỗi mạng thì mở lại (idempotent, cùng `incidentId`) trước khi đóng; `pagehide` rồi blur (tải lại/đóng tab) không tính là rời bài.
4. `exam.extended` qua SSE làm đồng hồ tăng.
5. SSE đứt thì tự kết nối lại; `device.superseded` khóa đề, báo "đang được mở ở máy khác", ẩn nút quay lại, dừng heartbeat.
6. Tự giám sát: banner luật "thoát quá N lần", đếm 1/2 theo phản hồi máy chủ, vượt giới hạn thì hiện thông báo tự nộp, sau đó không gửi sự cố nữa và trình duyệt không gọi `/attempts/submit` (máy chủ tự nộp).

Kiểm tra đột biến (đều bị bắt, đã hoàn nguyên): bỏ `if (pageUnloading) return;`; bỏ cửa sổ gộp sự cố 2 giây; bỏ bước mở lại sự cố trước khi đóng.

### Đối chiếu với các test đọc nguồn `index.html` (chuẩn bị bước chuyển test)

`tests/exam-room-ui.test.mjs` hai test đầu khẳng định trên mã nội tuyến của `index.html` (đường prototype): `examReadyButton` xin toàn màn hình, `examFullscreenReenter`, `#examGuardReturn` gửi `return_click`, `command.type === 'request_fullscreen'`, đúng 3 lần `requestFullscreen()`, `fullscreenchange`, `exam-waiting-error`. Tương đương trong shell thật (`#examReadyBtn`, `#examFullscreenReenter`, `#examGuardReturn`, `#examWaitingError`): đã có hành vi cho nút sẵn sàng, lỗi sẵn sàng, quay lại bài thi, `fullscreenchange`; **chưa có** hành vi cho nút "Vào chế độ thi" (vào lại toàn màn hình ở phòng chờ) và lệnh `request_fullscreen` khi bấm quay lại (xin toàn màn hình, thất bại thì mở sự cố mới). Cần thêm hai ca này trước khi xóa các test đọc nguồn.

### Chưa phủ
Audio (kiểm tra loa, checkpoint, resume, tạm dừng khi rời bài), thiết bị iOS (bỏ qua tín hiệu focus), kết quả sau công bố (polling), Exam Mode với lượt làm lại (`exam.retake`), nộp bài trong Exam Mode.

## Bước 3: chuyển test đọc nguồn `index.html` sang hành vi (12/11/2026)

Gỡ thử đường prototype (script nội tuyến và markup cũ) cho thấy 30 test đọc nguồn `index.html` phụ thuộc vào mã mà học viên thật không chạy. Mỗi test được xử lý như sau; bộ `npm test` còn 693 test, xanh trước và sau khi gỡ (trừ một test điều chỉnh ở bước 4).

| Test cũ (đọc nguồn đường prototype) | Xử lý | Bằng chứng hành vi thay thế |
| --- | --- | --- |
| `review-wiring.test.mjs` (11 test: Xem kết quả, polling, lỗi và Thử lại, chế độ xem, trạng thái lạ…) | Xóa file | `candidate-entry-review-smoke.mjs` (hợp đồng `/attempts/review` không `deviceId`, chưa nộp/chưa công bố/lỗi/Thử lại/trạng thái lạ, nhịp 15 giây, dừng khi quay lại) và `content-preview-review-wiring.test.mjs` có sẵn |
| `exam-mode-session.test.mjs` (3), `exam-device.test.mjs` (4) | Xóa file | `candidate-exam-mode-smoke.mjs` (SSE Bearer, `deviceId`, heartbeat, `exam.started/extended`, hết giờ tự nộp, thiết bị bị thay) và `candidate-flow-smoke.mjs` |
| `exam-room-ui.test.mjs` 2 test đầu (toàn màn hình, Exam Guard) | Xóa | `candidate-exam-mode-smoke.mjs` (nút sẵn sàng, vào lại toàn màn hình, quay lại bài thi, sự cố mở/đóng) |
| `teacher-dashboard.test.mjs` phòng chờ + thông báo quyền làm lại (phần HTML) | Xóa/rút gọn, giữ phần CSS | `candidate-exam-mode-smoke.mjs`, `candidate-entry-review-smoke.mjs` |
| `standalone-config.test.mjs` hợp đồng truy cập | Chuyển sang `content-preview.mjs` | còn kiểm `/api/learning${path}` và `/test-access/resolve` trên mã thật |
| `standalone-config.test.mjs` token dính ký tự thừa | Xóa | smoke lối vào (4 biến thể); **phát hiện lỗi thật, xem dưới** |
| `async-result.test.mjs` | 1 test chuyển sang `content-preview.mjs`; 1 test xóa (khôi phục kết quả từ `localStorage` chỉ có ở đường prototype) | smoke luồng học viên (bản nháp lấy từ máy chủ) |
| `candidate-audio-glyphs`, `course34-test2`, `exam-switch-dashboard` | Xóa phần chỉ kiểm đường prototype, giữ phần kiểm `content-preview.mjs` | — |

### Lỗi thật phát hiện khi chuyển test

Đường prototype làm sạch token bằng regex UUID (link dán qua chat hay dính `\`, `%5C`, `%20`); **shell thật không làm vậy**, nên học viên mở link như `#test=<uuid>\` gửi token sai lên `/test-access/resolve`. Smoke lối vào đỏ ở biến thể `\`, rồi sửa trong `content-preview.mjs` (giữ UUID khi có, nếu không giữ nguyên). Token không phải UUID (các token thử như `3401-…`) không đổi.

### Chưa có tương đương trong shell thật (ghi nhận, không chặn)

- Chặn chủ động mọi lời gọi `/attempts/*` sau khi thiết bị bị thay (`assertLearningAttemptNotSuperseded`): shell thật chỉ phản ứng khi máy chủ trả `EXAM_DEVICE_SUPERSEDED`, khóa đề và dừng heartbeat. Không mất dữ liệu.
- Khôi phục trạng thái đã nộp từ `localStorage` khi tải lại: shell thật không giữ trạng thái học viên trong trình duyệt; vào lại lượt thì lấy từ máy chủ.

## Bước 4: gỡ đường prototype nội tuyến (12/11/2026)

`term-tests/webtest-34-demo/index.html` từ 2.601 xuống ~475 dòng (−2.130): đã xóa script nội tuyến (~2.000 dòng: roster demo, kiểm tra âm thanh, đồng hồ, Exam Mode, nộp bài, xem kết quả của đường prototype) và toàn bộ markup chỉ script đó dùng (`#examHeader`, `#introScreen`, `#audioCheckScreen`, phần thi, `#submitModal`…). Shell thi thật không bị ảnh hưởng vì `content-preview.mjs` thay toàn bộ `document.body.innerHTML` khi mount.

Hành vi mới của `index.html`:
- Có token (`#test=…`) hoặc `?demoCourse=` / `?course=` (03, 34, 45): mount `content-preview.mjs` như trước (script đầu `<head>` bắt đầu nạp sớm; script cuối trang giữ nhánh báo lỗi "Không tải được đề demo…").
- Không có token: hiện `#noTokenNotice` ("Hãy mở bài thi bằng link của giáo viên"), không gọi API, không dựng bài thi. Trước đây trang chạy prototype không dùng được cho học viên thật (không roster demo, không token).

Kiểm chứng: `npm test` 693/693; bốn smoke học viên pass (`candidate-flow`, `candidate-exam-mode`, `candidate-entry-review`, `candidate-mobile`); smoke lối vào thêm ca "không token".

### Còn lại sau bước 4 (ghi nhận, chưa làm)
- Mã chết có thể gỡ tiếp: `config.test2.js` (`WEBTEST_34_TEST2_AUDIO`), `config.test4.js` (`WEBTEST_34_TEST4_AUDIO`), `test2-public.js` (`WEBTEST_34_TEST2_CONTENT`) chỉ do script đã gỡ đọc (không còn nơi nào tham chiếu các biến toàn cục này); các thẻ `<script>` vẫn nằm trong `<head>`, và `course34-test2.test.mjs` còn kiểm nội dung các file này. CSS của đường prototype trong thẻ `<style>` đầu `index.html` (`.intro`, `.topbar`, `.exam-*`…) chưa được lọc.
- `tests/e2e-exam-switch.browser.mjs` (E2E cần backend và PostgreSQL thật, mặc định bị bỏ qua) vẫn dùng id của đường prototype (`#studentSelect`, `#continueToAudio`, `#soundcheckBtn`, `#startExam`, `#examWaitingRoom`); với link `#test=` nó đã chạy shell thật (id khác) nên **đã lỗi thời trước bước 4**. Cần viết lại theo id thật (`#studentSelectInput`, `#startExamBtn`, `#examReadyBtn`…) khi có môi trường chạy; chưa sửa vì không chạy được ở đây.
- Mục tiêu tiếp theo của bước 7 là tách `content-preview.mjs` (2.465 dòng) từng khối, có bốn smoke học viên làm lưới an toàn.

## Bước 7, đợt tách 1: các khối cấp module của `content-preview.mjs` (13/11/2026)

`content-preview.mjs` 2.468 → ~1.860 dòng. Chuyển nguyên văn sang `term-tests/webtest-34-demo/candidate/`: `text-utils.js` (`escape`, `words`, `optionId`, `formatCandidateOptionLabel`), `learning-api.js` (draft, `learningRequestMethod/Body`, `examPhase`, banner Tự giám sát, đặt lại trạng thái lượt), `result-view.js` (dựng kết quả: `resultViewModel`, `studentResultsHtml`, `studentReviewHtml`, bộ lọc), `group-render.js` (nhóm câu hỏi, cloze, âm thanh: `groupBody`, `groupSections`, `resolveAudioUrl`). `content-preview.mjs` re-export đúng các tên cũ nên các test và nơi dùng không đổi.

- Mọi import nội bộ mang `?rev=20261113-split-a` giống nhau để trình duyệt dùng chung một thể hiện module và không dùng bản cache cũ; rev của `content-preview.mjs` (ba chỗ trong `index.html`) và `review-module.mjs` cũng được nâng, nên **bản sửa token ở `72add3c` chỉ tới học viên nhờ rev mới này** (rev cũ giữ nguyên thì trình duyệt có thể còn cache bản chưa sửa).
- `34-shared/review-module.mjs` trước đây import `resultViewModel` từ `content-preview.mjs` không kèm rev (nạp module thứ hai của cùng file); nay import thẳng `candidate/result-view.js`, bỏ chu trình.
- `group-render.js` dùng `ICONS` của `dynamic-exam-renderer.mjs`; import cùng URL (kể cả rev) với `content-preview.mjs` để không nạp hai bản. Công cụ tìm phụ thuộc chỉ quét khai báo cấp module nên bỏ sót import; lỗi `ICONS is not defined` lộ ra ở 6 test và được sửa trước khi commit.
- Kiểm chứng: `npm test` 693/693; bốn smoke học viên pass.
- Tiếp theo: các khối trong `mount()` (Exam Mode, xem kết quả, nộp bài, nháp, đồng hồ) phụ thuộc biến đóng của `mount`, cần owner state như đã làm ở dashboard.
