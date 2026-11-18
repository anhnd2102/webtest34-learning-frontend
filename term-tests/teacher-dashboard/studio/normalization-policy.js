export function defaultNormalization() {
    return { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true, ruleSet: 'v2' };
}
// Các chính sách do "Tạo lại biến thể" nâng cấp có chủ đích (khác với việc một nơi dựng lại khóa vô tình ghi chính sách mặc định).
const upgraded = new WeakSet();
// "Tạo lại biến thể": nâng câu lên v2, giữ các trường khác của chính sách (ví dụ giới hạn số từ).
export function upgradeNormalization(existing) {
    const policy = { ...defaultNormalization(), ...(existing || {}), ruleSet: 'v2' };
    upgraded.add(policy);
    return policy;
}
const copy = (policy) => (policy ? { ...policy } : undefined);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
// Người gác chính sách: ghi nhớ chính sách của từng câu lúc mở bản nháp (và lúc câu mới xuất hiện); nơi nào dựng lại khóa chấm
// bằng chính sách mặc định thì `reconcile` trả lại chính sách cũ cho câu đã có, trừ khi đó là nâng cấp có chủ đích.
// Nhờ vậy ~36 nơi tạo/dựng khóa chấm không cần biết chuyện phiên bản.
export function createNormalizationGuard(draftState) {
    const registry = new Map();
    const remember = () => {
        for (const [id, key] of Object.entries(draftState.gradingKey?.items || {})) {
            if (!registry.has(id))
                registry.set(id, copy(key?.normalization));
        }
    };
    remember();
    return {
        reconcile() {
            for (const [id, key] of Object.entries(draftState.gradingKey?.items || {})) {
                if (!key || typeof key !== 'object')
                    continue;
                const current = key.normalization;
                if (!registry.has(id)) {
                    registry.set(id, copy(current));
                    continue;
                }
                if (current && upgraded.has(current)) {
                    registry.set(id, copy(current));
                    continue;
                }
                const remembered = registry.get(id);
                if (same(current, remembered))
                    continue;
                if (remembered === undefined)
                    delete key.normalization;
                else
                    key.normalization = { ...remembered };
            }
        },
        policyOf(id) { return registry.get(id); }
    };
}
