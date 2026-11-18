// NGUỒN: file .ts này; normalization-policy.js do `npm run build` sinh ra.
//
// Chính sách chuẩn hóa đáp án trong khóa chấm (spec #54). MỘT nơi định nghĩa thay cho ~36 chỗ viết cứng.
// Câu tạo mới dùng ruleSet 'v2'; câu đã có (bản nháp đang soạn, đề đã phát hành được sao chép) giữ nguyên chính sách cũ cho tới khi
// giáo viên bấm "Tạo lại biến thể" cho câu đó (nút này gọi upgradeNormalization).
export interface NormalizationPolicy {
  unicode: 'NFKC';
  caseInsensitive: boolean;
  collapseWhitespace: boolean;
  acceptedWordCountMax?: number | null;
  ruleSet?: 'v2';
}

export function defaultNormalization(): NormalizationPolicy {
  return { unicode: 'NFKC', caseInsensitive: true, collapseWhitespace: true, ruleSet: 'v2' };
}

// Các chính sách do "Tạo lại biến thể" nâng cấp có chủ đích (khác với việc một nơi dựng lại khóa vô tình ghi chính sách mặc định).
const upgraded = new WeakSet<object>();

// "Tạo lại biến thể": nâng câu lên v2, giữ các trường khác của chính sách (ví dụ giới hạn số từ).
export function upgradeNormalization(existing: NormalizationPolicy | null | undefined): NormalizationPolicy {
  const policy: NormalizationPolicy = { ...defaultNormalization(), ...(existing || {}), ruleSet: 'v2' };
  upgraded.add(policy);
  return policy;
}

type DraftWithKeys = { gradingKey?: { items?: Record<string, any> } };
const copy = (policy: NormalizationPolicy | undefined): NormalizationPolicy | undefined => (policy ? { ...policy } : undefined);
const same = (a: NormalizationPolicy | undefined, b: NormalizationPolicy | undefined): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Người gác chính sách: ghi nhớ chính sách của từng câu lúc mở bản nháp (và lúc câu mới xuất hiện); nơi nào dựng lại khóa chấm
// bằng chính sách mặc định thì `reconcile` trả lại chính sách cũ cho câu đã có, trừ khi đó là nâng cấp có chủ đích.
// Nhờ vậy ~36 nơi tạo/dựng khóa chấm không cần biết chuyện phiên bản.
export function createNormalizationGuard(draftState: DraftWithKeys) {
  const registry = new Map<string, NormalizationPolicy | undefined>();
  const remember = () => {
    for (const [id, key] of Object.entries(draftState.gradingKey?.items || {})) {
      if (!registry.has(id)) registry.set(id, copy(key?.normalization));
    }
  };
  remember();
  return {
    reconcile(): void {
      for (const [id, key] of Object.entries(draftState.gradingKey?.items || {})) {
        if (!key || typeof key !== 'object') continue;
        const current: NormalizationPolicy | undefined = key.normalization;
        if (!registry.has(id)) { registry.set(id, copy(current)); continue; }
        if (current && upgraded.has(current)) { registry.set(id, copy(current)); continue; }
        const remembered = registry.get(id);
        if (same(current, remembered)) continue;
        if (remembered === undefined) delete key.normalization; else key.normalization = { ...remembered };
      }
    },
    policyOf(id: string): NormalizationPolicy | undefined { return registry.get(id); }
  };
}
