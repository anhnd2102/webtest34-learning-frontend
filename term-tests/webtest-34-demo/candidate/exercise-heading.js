// NGUỒN: file .ts này; exercise-heading.js do `npm run build` sinh ra (xem text-utils.ts).
//
// Đề bài của từng bài tập (exercise) trên màn làm bài của học viên: tiêu đề + hướng dẫn do người ra đề nhập,
// hiện ngay trước câu đầu tiên của bài tập. Không thay cho câu dẫn theo dạng câu của từng câu hỏi.
import { escape } from './text-utils.js?rev=20261125-clean-urls';
const DEFAULT_TITLE = /^(bài tập|exercise)\s*\d+$/iu;
const plain = (text) => escape(text).replace(/\n/g, '<br>');
// `renderText` mặc định chỉ escape; màn làm bài truyền bộ dựng nội dung đã làm sạch (hỗ trợ HTML an toàn).
export function exerciseHeadingHtml(exercise, exerciseCount, renderText = plain) {
    if (!exercise)
        return '';
    const title = String(exercise.title ?? '').trim();
    const instructions = String(exercise.instructions ?? '').trim();
    const isDefault = !title || DEFAULT_TITLE.test(title);
    // Nhiều bài tập thì đánh số để học viên biết đang ở đâu; một bài tập thì chỉ hiện tiêu đề do người ra đề đặt.
    const heading = exerciseCount > 1
        ? `Bài tập ${exercise.exerciseNumber ?? ''}${isDefault ? '' : `: ${title}`}`.trim()
        : (isDefault ? '' : title);
    if (!heading && !instructions)
        return '';
    return `<div class="cbt-exercise-heading">${heading ? `<h3 class="cbt-exercise-title">${escape(heading)}</h3>` : ''}${instructions ? `<div class="cbt-exercise-instructions">${renderText(instructions)}</div>` : ''}</div>`;
}
