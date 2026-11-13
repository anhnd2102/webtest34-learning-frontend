/** @returns {string} */
export function defaultApiBase() {
  return 'https://webtest.ducanhdev.com';
}

/**
 * @param {{ actorId: string }} identity
 * @returns {Record<string, string>}
 */
export function fixtureHeaders({ actorId }) {
  return { 'X-Teacher-Fixture-Id': actorId.trim() };
}

/** @returns {string} */
export function authLoginPath() {
  return '/api/teacher/auth/login';
}

/** @returns {string} */
export function authLogoutPath() {
  return '/api/teacher/auth/logout';
}

/** @returns {string} */
export function authMePath() {
  return '/api/teacher/auth/me';
}

/**
 * @param {{ token?: string, actorId?: string }} [identity]
 * @returns {Record<string, string>}
 */
export function authHeaders({ token = '', actorId = '' } = {}) {
  if (token && typeof token === 'string' && token.trim()) {
    return { 'Authorization': `Bearer ${token.trim()}` };
  }
  if (actorId && typeof actorId === 'string' && actorId.trim()) {
    return { 'X-Teacher-Fixture-Id': actorId.trim() };
  }
  return {};
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @param {Record<string, string | number | null | undefined>} [options] bộ lọc/phân trang; giá trị rỗng bị bỏ
 * @returns {string}
 */
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

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentResultsExportPath(classId, assignmentId) {
  return `${assignmentResultsPath(classId, assignmentId)}/export`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentExamModePath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam-mode`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentSelfProctoringPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/self-proctoring`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentExamRoomPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/room`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentExamEventsPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/events`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentExamStartPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/start`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentExamExtendPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/extend`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @param {string} attemptId
 * @returns {string}
 */
export function attemptDetailPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @param {string} attemptId
 * @returns {string}
 */
export function manualGradingDraftPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/draft`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @param {string} attemptId
 * @returns {string}
 */
export function manualGradingCompletePath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/complete`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @param {string} attemptId
 * @returns {string}
 */
export function attemptPublishPath(classId, assignmentId, attemptId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/publish`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentPublishAllPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/publish`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function assignmentRosterPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/roster`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @returns {string}
 */
export function eligibleStudentsPath(classId, assignmentId) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/eligible-students`;
}

/**
 * @param {string} classId
 * @param {string} studentRef
 * @returns {string}
 */
export function studentTransferPath(classId, studentRef) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentRef)}/transfer`;
}

/**
 * @param {string} classId
 * @param {string} assignmentId
 * @param {string} studentRef
 * @returns {string}
 */
export function grantRetakePath(classId, assignmentId, studentRef) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/students/${encodeURIComponent(studentRef)}/retake`;
}

/**
 * Một đối số: đường dẫn tương đối theo courseId; hai đối số: (apiBase, courseId).
 * @param {string | number} apiBaseOrCourseId
 * @param {string | number} [courseIdOptional]
 * @returns {string}
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
 * @param {string} [apiBaseOrVersionId]
 * @param {string} [versionIdOptional]
 * @returns {string}
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
  if (versionIdOptional === undefined) throw new TypeError('versionId là bắt buộc khi truyền cả apiBase.');
  return `${cleanBase}/api/teacher/forms/draft/${encodeURIComponent(versionIdOptional)}`;
}

/**
 * Một đối số: apiBase (http...) hoặc versionId; hai đối số: (apiBase, versionId).
 * @param {string} apiBaseOrVersionId
 * @param {string} [versionIdOptional]
 * @returns {string}
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
  if (versionIdOptional === undefined) throw new TypeError('versionId là bắt buộc khi truyền cả apiBase.');
  return `${cleanBase}/api/teacher/forms/${encodeURIComponent(versionIdOptional)}`;
}

/**
 * @param {string} [apiBase]
 * @returns {string}
 */
export function previewSandboxPath(apiBase = '') {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/preview-sandbox` : '/api/teacher/forms/preview-sandbox';
}

/**
 * @param {string} [apiBase]
 * @returns {string}
 */
export function formPublishPath(apiBase = '') {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/publish` : '/api/teacher/forms/publish';
}

/**
 * @param {string} [apiBase]
 * @returns {string}
 */
export function formPublishPreviewPath(apiBase = '') {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/publish-preview` : '/api/teacher/forms/publish-preview';
}
