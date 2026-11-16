// Ánh xạ nhãn nhóm cục bộ và đáp án giữa nhãn hiển thị với mã lựa chọn của định nghĩa (tách từ content-preview.mjs).
// Các hàm dựng giao diện tĩnh từ đề dựng sẵn (groupBody, groupSections...) đã gỡ cùng chế độ xem thử.
// NGUỒN: file .ts này; group-render.js do `npm run build` sinh ra (xem text-utils.ts). Import nội bộ viết
// không có `?rev=`, bước build tự thêm rev dùng chung của shell học viên (cùng URL với import trong
// content-preview.mjs nên dùng chung một thể hiện module).
import { escape, optionId } from './text-utils.js';

export type FormOption = string | { id: string, label?: string };

// Nhãn nhóm cục bộ (tiêu đề, hướng dẫn) ghi đè lên định nghĩa lấy từ máy chủ, theo vị trí khối.
export interface LocalGroupLabelsForm { groups?: { title?: string, instructions?: string }[] }

export function withLocalGroupLabels<D extends { blocks?: { title?: string, instructions?: string }[] }>(
  definition: D | null | undefined,
  form: LocalGroupLabelsForm | null | undefined
): D | null | undefined {
  if (!definition || !Array.isArray(definition.blocks) || !Array.isArray(form?.groups)) return definition;
  const groups = form.groups;
  return {
    ...definition,
    blocks: definition.blocks.map((block, index) => {
      const local = groups[index];
      if (!local) return block;
      return {
        ...block,
        title: local.title || block.title,
        instructions: local.instructions || block.instructions
      };
    })
  };
}

export function mapAnswerToDefinitionValue(formItem: { options?: FormOption[] } | null | undefined, definitionItem: { options?: { id?: string }[] } | null | undefined, value: unknown): unknown {
  if (typeof value !== 'string' || !Array.isArray(formItem?.options) || !Array.isArray(definitionItem?.options)) return value;
  const localIndex = formItem.options.findIndex(option => optionId(option) === value);
  return localIndex < 0 ? value : (definitionItem.options[localIndex]?.id || value);
}

export function mapAnswerFromDefinitionValue(formItem: { options?: FormOption[] } | null | undefined, definitionItem: { options?: { id?: string }[] } | null | undefined, value: unknown): unknown {
  if (typeof value !== 'string' || !Array.isArray(formItem?.options) || !Array.isArray(definitionItem?.options)) return value;
  const definitionIndex = definitionItem.options.findIndex(option => option?.id === value);
  return definitionIndex < 0 ? value : optionId(formItem.options[definitionIndex]);
}
