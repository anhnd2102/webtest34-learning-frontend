const clone = (value) => JSON.parse(JSON.stringify(value ?? null));
export function snapshotDraft(draftState) {
    return { blocks: clone(draftState.blocks), gradingKey: clone(draftState.gradingKey) };
}
export function restoreDraft(draftState, snapshot) {
    draftState.blocks = clone(snapshot.blocks);
    draftState.gradingKey = clone(snapshot.gradingKey);
}
