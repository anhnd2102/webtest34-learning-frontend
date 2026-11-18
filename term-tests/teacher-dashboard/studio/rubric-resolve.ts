// NGUỒN: file .ts này; rubric-resolve.js do `npm run build` sinh ra.
//
// Dựng quy tắc chấm cho các thẻ Tự luận chấm AI kiểu mới lúc nhập (spec #91, GĐ 5): gọi backend (POST /rubric-presets/build)
// cho từng thẻ chờ; điểm câu và bảng trừ lỗi theo Khối là kết quả của backend. Hàm dựng được truyền vào nên kiểm thử không cần mạng.
export type Card = { [key: string]: any };
export type BuildRubric = (payload: Record<string, any>) => Promise<{ rubric?: Record<string, any> } & Record<string, any>>;
export interface RubricFailure { prompt: string, message: string }

const NO_BUILDER = 'Chưa kết nối được máy chủ nên không dựng được quy tắc chấm cho câu này.';

export async function resolveRubricCards(cards: Card[], build: BuildRubric | undefined): Promise<{ cards: Card[], failures: RubricFailure[] }> {
  const resolved: Card[] = [];
  const failures: RubricFailure[] = [];
  for (const card of cards) {
    if (!card.pendingRubric) { resolved.push(card); continue; }
    if (!build) { failures.push({ prompt: String(card.prompt ?? ''), message: NO_BUILDER }); continue; }
    try {
      const built = await build(card.pendingRubric);
      const rubric = built.rubric ?? built;
      const { pendingRubric: _pending, ...rest } = card;
      resolved.push({ ...rest, rubric, rubricCode: 'izone-rubric-v2', maxScore: rubric.maxScore ?? card.maxScore });
    } catch (error) {
      failures.push({ prompt: String(card.prompt ?? ''), message: (error as Error)?.message || 'Không dựng được quy tắc chấm.' });
    }
  }
  return { cards: resolved, failures };
}

// Cả bài tập/Phần: thẻ lỗi bị loại; bài tập trở thành rỗng vì lỗi thì bỏ.
export async function resolveExerciseRubrics<T extends { items: Card[] }>(exercises: T[], build: BuildRubric | undefined): Promise<{ exercises: T[], failures: RubricFailure[] }> {
  const out: T[] = [];
  const failures: RubricFailure[] = [];
  for (const exercise of exercises) {
    const outcome = await resolveRubricCards(exercise.items, build);
    failures.push(...outcome.failures);
    if (outcome.cards.length || !outcome.failures.length) out.push({ ...exercise, items: outcome.cards });
  }
  return { exercises: out, failures };
}

export function failuresMessage(failures: RubricFailure[]): string {
  if (!failures.length) return '';
  const lines = failures.slice(0, 5).map(failure => `- ${failure.prompt.slice(0, 60)}: ${failure.message}`);
  const more = failures.length > 5 ? `\n… và ${failures.length - 5} câu khác.` : '';
  return `Không dựng được quy tắc chấm cho ${failures.length} câu (các câu này chưa được nhập):\n${lines.join('\n')}${more}`;
}
