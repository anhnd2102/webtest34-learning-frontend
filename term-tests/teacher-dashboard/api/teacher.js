// NGUỒN: file .ts này; teacher.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
export function defaultApiBase() {
    return 'https://webtest.izoneacademic.com';
}
export function fixtureHeaders({ actorId }) {
    return { 'X-Teacher-Fixture-Id': actorId.trim() };
}
export function authLoginPath() {
    return '/api/teacher/auth/login';
}
export function authLogoutPath() {
    return '/api/teacher/auth/logout';
}
export function authMePath() {
    return '/api/teacher/auth/me';
}
export function authHeaders({ token = '', actorId = '' } = {}) {
    if (token && typeof token === 'string' && token.trim()) {
        return { 'Authorization': `Bearer ${token.trim()}` };
    }
    if (actorId && typeof actorId === 'string' && actorId.trim()) {
        return { 'X-Teacher-Fixture-Id': actorId.trim() };
    }
    return {};
}
// options: bộ lọc/phân trang; giá trị rỗng bị bỏ
export function assignmentResultsPath(classId, assignmentId, options = {}) {
    const base = `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/results`;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && value !== null && value !== '' && (key !== 'page' || Number(value) > 1)) {
            params.set(key, String(value));
        }
    }
    const query = params.toString();
    return query ? `${base}?${query}` : base;
}
export function assignmentResultsExportPath(classId, assignmentId) {
    return `${assignmentResultsPath(classId, assignmentId)}/export`;
}
export function assignmentExamModePath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam-mode`;
}
export function assignmentSelfProctoringPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/self-proctoring`;
}
export function assignmentExamRoomPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/room`;
}
export function assignmentExamEventsPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/events`;
}
export function assignmentExamStartPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/start`;
}
export function assignmentExamExtendPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/extend`;
}
export function attemptDetailPath(classId, assignmentId, attemptId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}`;
}
export function manualGradingDraftPath(classId, assignmentId, attemptId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/draft`;
}
export function manualGradingCompletePath(classId, assignmentId, attemptId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/complete`;
}
export function attemptPublishPath(classId, assignmentId, attemptId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/publish`;
}
export function assignmentPublishAllPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/publish`;
}
export function assignmentRosterPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/roster`;
}
export function eligibleStudentsPath(classId, assignmentId) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/eligible-students`;
}
export function studentTransferPath(classId, studentRef) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentRef)}/transfer`;
}
export function grantRetakePath(classId, assignmentId, studentRef) {
    return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/students/${encodeURIComponent(studentRef)}/retake`;
}
/**
 * Một đối số: đường dẫn tương đối theo courseId; hai đối số: (apiBase, courseId).
 */
export function courseTestCatalogPath(apiBaseOrCourseId, courseIdOptional) {
    if (arguments.length === 1 && (typeof apiBaseOrCourseId === 'number' || !String(apiBaseOrCourseId).startsWith('http'))) {
        return `/api/teacher/course-test-catalog?courseId=${encodeURIComponent(apiBaseOrCourseId)}`;
    }
    const apiBase = String(apiBaseOrCourseId || '').replace(/\/+$/, '');
    const courseId = courseIdOptional !== undefined ? courseIdOptional : apiBaseOrCourseId;
    return `${apiBase}/api/teacher/course-test-catalog?courseId=${encodeURIComponent(courseId)}`;
}
/**
 * Không đối số: tạo bản nháp; một đối số: apiBase (http...) hoặc versionId; hai đối số: (apiBase, versionId).
 */
export function formDraftPath(apiBaseOrVersionId, versionIdOptional) {
    if (arguments.length === 0 || apiBaseOrVersionId === undefined) {
        return '/api/teacher/forms/draft';
    }
    if (arguments.length === 1) {
        if (typeof apiBaseOrVersionId === 'string' && apiBaseOrVersionId.startsWith('http')) {
            const cleanBase = apiBaseOrVersionId.replace(/\/+$/, '');
            return `${cleanBase}/api/teacher/forms/draft`;
        }
        return `/api/teacher/forms/draft/${encodeURIComponent(apiBaseOrVersionId)}`;
    }
    const cleanBase = String(apiBaseOrVersionId || '').replace(/\/+$/, '');
    if (versionIdOptional === undefined)
        throw new TypeError('versionId là bắt buộc khi truyền cả apiBase.');
    return `${cleanBase}/api/teacher/forms/draft/${encodeURIComponent(versionIdOptional)}`;
}
/**
 * Một đối số: apiBase (http...) hoặc versionId; hai đối số: (apiBase, versionId).
 */
export function formDetailPath(apiBaseOrVersionId, versionIdOptional) {
    if (arguments.length === 1) {
        if (typeof apiBaseOrVersionId === 'string' && apiBaseOrVersionId.startsWith('http')) {
            const cleanBase = apiBaseOrVersionId.replace(/\/+$/, '');
            return `${cleanBase}/api/teacher/forms`;
        }
        return `/api/teacher/forms/${encodeURIComponent(apiBaseOrVersionId)}`;
    }
    const cleanBase = String(apiBaseOrVersionId || '').replace(/\/+$/, '');
    if (versionIdOptional === undefined)
        throw new TypeError('versionId là bắt buộc khi truyền cả apiBase.');
    return `${cleanBase}/api/teacher/forms/${encodeURIComponent(versionIdOptional)}`;
}
export function previewSandboxPath(apiBase = '') {
    const cleanBase = String(apiBase || '').replace(/\/+$/, '');
    return cleanBase ? `${cleanBase}/api/teacher/forms/preview-sandbox` : '/api/teacher/forms/preview-sandbox';
}
export function rubricPresetsPath(apiBase = '') {
    const cleanBase = apiBase.replace(/\/+$/, '');
    return cleanBase ? `${cleanBase}/api/teacher/rubric-presets` : '/api/teacher/rubric-presets';
}
export function rubricPresetsBuildPath(apiBase = '') {
    return `${rubricPresetsPath(apiBase)}/build`;
}
export function formPublishPath(apiBase = '') {
    const cleanBase = String(apiBase || '').replace(/\/+$/, '');
    return cleanBase ? `${cleanBase}/api/teacher/forms/publish` : '/api/teacher/forms/publish';
}
export function formPublishPreviewPath(apiBase = '') {
    const cleanBase = String(apiBase || '').replace(/\/+$/, '');
    return cleanBase ? `${cleanBase}/api/teacher/forms/publish-preview` : '/api/teacher/forms/publish-preview';
}
// Cấp token xem trước ngắn hạn cho một đề đã xuất bản (POST, không ghi dữ liệu học viên).
export function formPreviewTokenPath(versionId) {
    return `/api/teacher/forms/${encodeURIComponent(versionId)}/preview-token`;
}
