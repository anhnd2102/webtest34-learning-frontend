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

### Đợt tách 2: Exam Mode ra `candidate/exam-mode.js` (13/11/2026)

`createExamMode({ apiBase, learningState, deviceId, apiRequest, createUuid, renderExamInterface })` chứa nguyên văn 248 dòng: toàn màn hình, Wake Lock, heartbeat, luồng SSE (`consumeExamEvents`/`connectExamEvents`), phòng chờ, sự cố rời bài, lệnh Exam Guard, `dispatchExamGuard`, `mountExamGuard`. Trả về `requestFullscreen, requestWakeLock, stopExamConnections, connectExamEvents, renderExamWaitingRoom, dispatchExamGuard, mountExamGuard` cùng hai accessor cho biến mà shell đọc/ghi từ ngoài (`audioHold` đọc, `wantWakeLock` đọc/ghi). `content-preview.mjs` còn ~1.600 dòng.
- `learningState` đổi từ `let` sang `const` (không bao giờ gán lại) để truyền thẳng làm phụ thuộc.
- `apiRequest` gọi `dispatchExamGuard` khi gặp `EXAM_DEVICE_SUPERSEDED` và đứng trước chỗ khởi tạo `createExamMode`; vẫn an toàn vì lời gọi chỉ xảy ra sau khi mount khởi tạo xong (không cần wrapper lazy).
- Đường import trong module mới sai lần đầu (`../teacher-dashboard/...` thay vì `../../teacher-dashboard/...`) làm chín file test không nạp được; công cụ tách chỉ sao chép đường import từ file nguồn nên không tự sửa đường tương đối.
- Ba test đọc nguồn của `exam-guard-renderer-wiring.test.mjs` nay đọc gộp `content-preview.mjs` và `candidate/exam-mode.js`.
- Kiểm chứng: `npm test` 693/693; `candidate-exam-mode-smoke` (toàn bộ Exam Mode), `candidate-flow-smoke`, `candidate-entry-review-smoke`, `candidate-mobile-smoke` pass.
- Còn trong `content-preview.mjs`: khối `if (isLearningMode)` (~520 dòng: roster, bắt đầu lượt, xem kết quả) và `renderExamInterface` (~850 dòng: bài thi, đồng hồ, nộp bài, nháp). Hai khối này nằm sâu hơn một cấp thụt lề nên công cụ tách hiện có chưa xử lý được; cần tách thủ công hoặc mở rộng công cụ.

### Đợt tách 3: màn đầu và màn xem kết quả (13/11/2026)

`candidate/intro-screen.js` (`createIntroScreen`: mã lớp, tải roster, chọn học viên và thông báo quyền làm lại, kiểm tra âm thanh, nút bắt đầu lượt; trả về `handleLoadRoster`) và `candidate/review-screen.js` (`createReviewScreen`: Xem kết quả, polling, Thử lại, quay lại) chuyển nguyên văn từ khối `if (isLearningMode)` của `mount()`. Sáu phần tử DOM của màn đầu (`classInput`, `loadBtn`, `classStatus`, `studentSelect`, `studentStatus`, `startBtn`) vẫn được `mount()` truy vấn rồi truyền vào, vì cả hai màn dùng chung `studentSelect`. `content-preview.mjs` còn ~1.220 dòng.
- Đường dẫn tương đối trong chuỗi `import()` của `review-module` đổi thành `../../34-shared/…` vì mã nay nằm trong `candidate/`; công cụ không tự sửa nên đã vá tay. Đây là loại lỗi mà smoke "Xem kết quả" bắt được (nó nạp `review-module` thật).
- Bảy test đọc nguồn được chỉnh để đọc gộp `content-preview.mjs` với `intro-screen.js`/`review-screen.js` (`content-preview-review-wiring`, `review-intro-wiring`, `standalone-config`, `async-result`, `exam-switch-dashboard`).
- Kiểm chứng: `npm test` 693/693; `candidate-entry-review-smoke` (roster, thông báo quyền làm lại, Xem kết quả), `candidate-flow-smoke`, `candidate-exam-mode-smoke`, `candidate-mobile-smoke` pass.
- Còn trong `content-preview.mjs`: `renderExamInterface` (~850 dòng: bài thi, đồng hồ, nộp bài, nháp). Chưa tách vì cần thêm smoke audio trước (audio chưa được phủ).

## Smoke âm thanh `tests/browser/candidate-audio-smoke.mjs` (13/11/2026)

Thẻ `<audio>` thật với file WAV im lặng do test phục vụ (2 giây và 30 giây; không giả lập trình phát). Chạy: `node tests/browser/candidate-audio-smoke.mjs`.

Phủ (shell thật: `dynamic-exam-renderer.mjs` khối nghe, `candidate/exam-mode.js` Exam Guard):
1. Cổng âm thanh: phần có bài nghe hiện thông báo "đề đang được ẩn", ô trả lời bị ẩn cho tới khi bài nghe bắt đầu phát; hiện "Còn 1 lượt nghe".
2. Bấm nghe: mở khóa đề (`data-audio-unlocked`), nút đổi "Tạm dừng", lượt đang nghe dở đã tính là dùng ("Còn 0 lượt nghe").
3. Tạm dừng giữa chừng: nút "Tiếp tục nghe", vẫn còn 0 lượt; tiếp tục được.
4. Nghe xong: khóa (nút ẩn, "Bài nghe đã khóa", `data-listens-count=1`), bấm lại qua DOM không phát lại.
5. Chuyển phần rồi quay lại: giữ trạng thái đã mở khóa.
6. Chỉ một bài phát cùng lúc (bài khác bị tạm dừng khi bài mới phát); file âm thanh lỗi (404) thì báo "Không thể phát file".
7. Tự giám sát: rời bài tạm dừng âm thanh đang phát, "Quay lại bài thi" cho phát tiếp.

Kiểm tra đột biến (bị bắt, đã hoàn nguyên): bỏ tạm dừng bài khác khi phát bài mới; bỏ tạm dừng âm thanh khi rời bài; bỏ mở khóa đề khi phát. Bỏ riêng điều kiện `listensCount >= maxListens` không làm smoke đỏ vì nút đã `disabled` sau khi nghe xong (hai lớp bảo vệ chồng nhau).

### Khoảng trống đã sửa (13/11/2026): tải lại trang làm mất khóa "chỉ nghe một lần"

Trước khi sửa, shell thật giữ lượt nghe trong bộ nhớ trang và không gọi `/attempts/audio/checkpoint` hay `/attempts/audio/resume` (chỉ đường prototype đã gỡ gọi); smoke tái hiện: nghe hết bài A, tải lại, vào lại lượt thì bài A lại còn 1 lượt. Đã nối tiến độ nghe vào backend có sẵn (không đổi backend):
- Mỗi dock mang `data-audio-key` (`blockId` cho bài nghe của phần, `itemVersionId` cho bài nghe của câu), khớp `^[A-Za-z0-9_-]{1,64}$` của schema backend.
- Khi phát, `dynamic-exam-renderer.mjs` báo mốc qua `onAudioProgress`: ngay lúc bắt đầu, mỗi 5 giây, khi tạm dừng, khi trang bị ẩn, và khi nghe xong (`completed: true`, vị trí = độ dài). `content-preview.mjs` gửi tuần tự theo từng bài nghe; lỗi chỉ ghi cảnh báo vì mốc sau sẽ thay thế.
- Trước khi dựng bài thi (`openExamInterface`), shell gọi `/attempts/audio/resume`: bài đã nghe xong thì khóa (nút ẩn, "Bài nghe đã khóa", lượt = 0), bài nghe dở thì tua tới vị trí đã lưu, nút "Tiếp tục nghe" và vẫn tính là đã dùng lượt; đề của phần có mốc luôn mở khóa. Không tải được tiến độ thì vẫn vào bài và coi như chưa nghe (không chặn thí sinh).
- Hai điểm cuối âm thanh dùng schema `.strict()` nên **không được kèm `deviceId`**: `learningRequestBody` bỏ `deviceId` cho `/attempts/audio/checkpoint` và `/attempts/audio/resume` (có test); mốc gửi với `keepalive` để sống sót khi trang bị ẩn.
- `enterRunningExam` (Exam Mode vào đề qua SSE) và màn đầu nay `await` dựng giao diện, vì dựng giao diện giờ chờ tiến độ nghe; Exam Guard vẫn gắn sau khi giao diện dựng xong.
- Smoke: kịch bản 8 (nghe xong, tải lại, vẫn khóa, đề còn mở, resume không kèm `deviceId`), 9 (nghe dở, tải lại, tiếp tục từ vị trí đã lưu), 10 (resume lỗi 500 vẫn vào được bài). Máy chủ giả của smoke áp đúng schema nghiêm ngặt và hỗ trợ Range như R2. Kiểm tra đột biến (bị bắt, đã hoàn nguyên): kèm lại `deviceId`, không nạp tiến độ, không báo mốc khi nghe xong.
- Giới hạn: khóa theo **lượt làm bài** (cùng `attemptToken`), nên học viên được cấp quyền làm lại có lượt mới và nghe lại; chưa kiểm với backend và PostgreSQL thật. Rev module nâng lên `20261113-audio-a`.

Điều kiện tiên quyết cho `renderExamInterface` đã đủ: ngoài smoke luồng học viên, Exam Mode, lối vào/xem kết quả, nay có smoke âm thanh.

### Đợt tách 4: `renderExamInterface` (13/11/2026)

`content-preview.mjs` còn 855 dòng (từ 2.468). Ba khối của `renderExamInterface` chuyển nguyên văn sang `candidate/`:
- `exam-timer.js` (`createExamTimer`): đếm ngược, tự bấm xác nhận nộp khi hết giờ; trả `display` và `stop()`.
- `draft-sync.js` (`createDraftSync`): gom và gửi bản nháp (debounce 1,5 giây, thử lại sau 15 giây khi lỗi tạm thời), trạng thái lưu; trả `queueServerDraft`, `persist`, `clearDraftTimer()`.
- `submit-flow.js` (`createSubmitFlow`): hộp thoại nộp, nộp lên máy chủ, hộp kết quả, `renderAiResultCard`, `pollLearningResult`, tự nộp do Tự giám sát; trả `pollLearningResult`.
Thay đổi văn bản duy nhất trong các khối: `examTimerInterval` → `examTimer.stop()` (2 chỗ) và `draftDebounceTimer` → `clearDraftTimer()` (1 chỗ), vì hai biến `let` nay nằm trong module khác.
- Thứ tự khởi tạo giữ nguyên (đồng hồ → nháp → nộp); trước đó các hàm này chỉ chạy sau khi giao diện dựng xong nên việc chuyển từ khai báo hàm (hoisting) sang `const` tại đúng vị trí cũ an toàn, và smoke xác nhận.
- Kiểm chứng: `npm test` 693/693; `candidate-flow` (nháp, nộp, hết giờ), `candidate-exam-mode`, `candidate-entry-review`, `candidate-audio`, `candidate-mobile` và `candidate-css-audit` (hộp xác nhận, sau nộp ở 5 viewport) pass.
- Phần còn lại của `renderExamInterface` (~470 dòng): dựng giao diện động, cỡ chữ, `update()` (tiến độ), đường xem thử tĩnh. Không tách thêm ở đợt này vì phần còn lại chủ yếu là dựng DOM gắn chặt với nhau và đã giảm dưới 1.000 dòng.
