// Khai báo tạm cho các export của results/presentation.js mà module .ts đang dùng, để tsc không kiểm kiểu
// cả file JS 515 dòng chưa có kiểu. Xóa file này khi results/presentation chuyển sang .ts.
export function teacherRoleLabel(role?: string, courseCodes?: string[]): string;
export function getRoleCapabilities(role?: string, courseCodes?: string[]): { title: string, description: string }[];
export function formatIncidentTimeline(incidents?: unknown[]): { incidentId?: string, typeLabel: string, startedAt: string, endedAt: string, duration: string }[];
