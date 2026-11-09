# Sửa nút nghe IPA trong mô phỏng

Ngày 09/11/2026. Baseline `3f6b5cb`; nhánh `fix/simulation-ipa-audio`.

## Vấn đề và thay đổi

Nút `.candidate-ipa-audio-btn` trước đây chỉ render markup, không có handler gọi audio.play. Regression tại UI mô phỏng thất bại trên baseline: bấm nút nhưng số lần play không tăng (`ipa-audio-red.log`). Các khả năng được đối chiếu là thiếu handler, selector không khớp và play bị reject; source chỉ có markup, đồng thời stub play không được gọi, nên nguyên nhân là thiếu binding.

- Module `studio/simulation-pronunciation-audio.js` quản lý playback IPA với interface `stop`/`dispose`. Nút chuyển giữa “Nghe phát âm” và “Dừng phát âm”, có aria-pressed; bấm lại để dừng, có thể nghe lại sau khi dừng/ended.
- Chỉ một IPA audio hoạt động trong controller. Chọn audio khác dừng/reset audio trước. Chuyển câu bằng navigator, chuyển Phần bằng tab/sidebar, submit và đóng mô phỏng dừng/reset IPA.
- Promise play bị reject hoặc media error hiển thị status tiếng Việt, cho phép thử lại. Generation guard bỏ qua kết quả promise đã lỗi thời, tránh ghi lỗi lên lần phát mới.
- Khi phần tử có `audio.error`, retry gọi `load()` trước `play()` để thực hiện lại resource selection/fetch; chỉ gọi lại play không xóa lỗi media tồn tại.
- Cleanup đăng ký theo builder owner: đóng thì dừng; rebuild/reuse modal dispose controller cũ trước khi render; dispose Builder dừng và gỡ listeners. Promise còn chờ không được khôi phục UI của modal mới.
- Không thay strict listening dock/giới hạn nghe một lần của bài nghe, grading, authority, dữ liệu đề thật hoặc backend. Thêm một span label và status role=status (hidden mặc định), dùng token màu; không dùng emoji hoặc đổi radius.
- Revision entry/CSS `20261109-ipa-audio1`; manifest/hash/ranges/rule map và inventory line offsets cập nhật, giữ provenance extraction. Không thêm stylesheet request hoặc sửa Pages workflow. Inventory vẫn 261 vị trí.

## Xác minh

- Red: `CAPTURE_ONLY=1 SIMULATION_QUESTION_STYLE_PARITY=1 SMOKE_WIDTH=390 ARTIFACT_DIR=<path> node tests/browser/dashboard-integration-smoke.mjs` thất bại trên baseline ở chờ playCalls=1. Cùng fixture sau sửa pass.
- Green cơ bản: pronunciation/transformation vẫn chọn đáp án và chấm đúng 2/2, sai 0/2; playback được gọi. Không giữ assertion playCalls=0 của lỗi cũ.
- `IPA_AUDIO_CHECK=1 CAPTURE_ONLY=1`: fixture Builder thật với ba IPA items/hai Phần, native button click. WAV PCM tổng hợp hai giây được decode/phát bởi HTMLMediaElement thật; kiểm !paused và currentTime tăng, bấm dừng reset về 0, đóng trong khi phát làm paused=true. Không dùng audio riêng tư hoặc production URL.
- Error/race test dùng stub media play/pause tại public browser seam: rejection và retry, lỗi media, đổi audio, question/section navigation, ended, submit, hai nút đóng, cùng-audio retry sau pending rejection, resolve/reject sau đóng/rebuild/dispose và không double bind sau mở lại. Kiểm aria/status, số lần play và pause; không force click hoặc gán state trả lời bằng DOM.
- Review Spec phát hiện retry thực chưa reload resource lỗi. Browser regression mới route local `synthetic-ipa-audio.wav` trả 503 lần đầu, sau đó WAV hợp lệ: bản chưa reload fail tại chờ currentTime tăng (`ipa-audio-retry-red.log`). Bản sửa cần phát lại được, error status ẩn và có ít nhất hai request. Requests được Playwright fulfill hoàn toàn local, không gọi dịch vụ bên ngoài.
- Lượt lifecycle cuối trên 1440×900, 1024×768, 390×844 có touch emulation: native tap đầu tiên vào nút phát, các control còn lại dùng click thật. Chỉ khẳng định browser emulation, không khẳng định loa/thiết bị vật lý.
- Syntax checks simulation và controller pass; không phải typecheck. `npm test` worktree: 660 tests, 658 pass, 2 skip, 0 fail; hai skip do worktree thiếu tài liệu design system ở thư mục cha.
- Full lifecycle integration: root và `/preview-base` × ba viewport, tổng 60 vòng mount/dispose, pass, 0 browser errors; giữ save/import/dirty navigation, focus, modal ownership, rubric, retake, SSE và assessment cancellation. Đủ 13 CSS responses 200/MIME CSS mỗi lượt.
- Final IPA lifecycle sau sửa retry: ba viewport pass, 0 browser errors; gồm playback WAV thật, 503→WAV recovery và toàn bộ error/race/cleanup nêu trên. Review Standards: 0 hard violations/0 smell findings. Review Spec: một P2 về reload resource lỗi đã sửa và được reviewer xác nhận resolved; không còn finding. Reviewer chạy độc lập syntax/artifact checks pass.

Artifacts: `C:/Users/OS/AppData/Local/Temp/ipa-audio-red/`, `ipa-audio-green/`, `ipa-audio-lifecycle-final/`, `ipa-audio-smoke/` và các log cùng prefix. Lượt cuối lưu screenshot trạng thái mặc định/lỗi và computed styles để QA; không tuyên bố visual identical vì label/status mới là thay đổi hành vi có chủ đích.

Không kiểm production audio URL/CORS/codec khác WAV, API/DB thật, thiết bị vật lý hoặc production deployment. Giữ nguyên file test xóa bài tập đang làm dở ở checkout chính. Rollback bằng revert commit controller/markup/CSS/metadata như một đơn vị. Giới hạn IPA không phát từ `SIMULATION_QUESTION_STYLES_VERIFICATION.md` được xử lý ở đợt này cho các luồng đã kiểm.
