// NGUỒN: file .ts này; import-undo.js do `npm run build` sinh ra.
//
// Hoàn tác lần nhập (spec #91, GĐ 4): chụp bản nháp (các Phần và đáp án chấm) ngay trước khi nhập và khôi phục lại khi cần.
// Chụp bằng sao chép sâu nên bản nháp đang sửa không làm đổi ảnh chụp, và ảnh chụp dùng lại được.
export interface DraftSnapshot { blocks: unknown, gradingKey: unknown }

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null)) as T;

export function snapshotDraft(draftState: { blocks?: unknown, gradingKey?: unknown }): DraftSnapshot {
  return { blocks: clone(draftState.blocks), gradingKey: clone(draftState.gradingKey) };
}

export function restoreDraft(draftState: { blocks?: unknown, gradingKey?: unknown }, snapshot: DraftSnapshot): void {
  draftState.blocks = clone(snapshot.blocks);
  draftState.gradingKey = clone(snapshot.gradingKey);
}
