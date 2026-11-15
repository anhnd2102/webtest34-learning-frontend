// NGUỒN: file .ts này; teacher.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
export function defaultApiBase(): string {
  return 'https://webtest.ducanhdev.com';
}

export function fixtureHeaders({ actorId }: { actorId: string }): Record<string, string> {
  return { 'X-Teacher-Fixture-Id': actorId.trim() };
}

export function authLoginPath(): string {
  return '/api/teacher/auth/login';
}

export function authLogoutPath(): string {
  return '/api/teacher/auth/logout';
}

export function authMePath(): string {
  return '/api/teacher/auth/me';
}

export function authHeaders({ token = '', actorId = '' }: { token?: string, actorId?: string } = {}): Record<string, string> {
  if (token && typeof token === 'string' && token.trim()) {
    return { 'Authorization': `Bearer ${token.trim()}` };
  }
  if (actorId && typeof actorId === 'string' && actorId.trim()) {
    return { 'X-Teacher-Fixture-Id': actorId.trim() };
  }
  return {};
}

// options: bộ lọc/phân trang; giá trị rỗng bị bỏ
export function assignmentResultsPath(classId: string, assignmentId: string, options: Record<string, string | number | null | undefined> = {}): string {
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

export function assignmentResultsExportPath(classId: string, assignmentId: string): string {
  return `${assignmentResultsPath(classId, assignmentId)}/export`;
}

export function assignmentExamModePath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam-mode`;
}

export function assignmentSelfProctoringPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/self-proctoring`;
}

export function assignmentExamRoomPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/room`;
}

export function assignmentExamEventsPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/events`;
}

export function assignmentExamStartPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/start`;
}

export function assignmentExamExtendPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/exam/extend`;
}

export function attemptDetailPath(classId: string, assignmentId: string, attemptId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}`;
}

export function manualGradingDraftPath(classId: string, assignmentId: string, attemptId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/draft`;
}

export function manualGradingCompletePath(classId: string, assignmentId: string, attemptId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/manual-grading/complete`;
}

export function attemptPublishPath(classId: string, assignmentId: string, attemptId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/attempts/${encodeURIComponent(attemptId)}/publish`;
}

export function assignmentPublishAllPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/publish`;
}

export function assignmentRosterPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/roster`;
}

export function eligibleStudentsPath(classId: string, assignmentId: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/eligible-students`;
}

export function studentTransferPath(classId: string, studentRef: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentRef)}/transfer`;
}

export function grantRetakePath(classId: string, assignmentId: string, studentRef: string): string {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/assignments/${encodeURIComponent(assignmentId)}/students/${encodeURIComponent(studentRef)}/retake`;
}

/**
 * Một đối số: đường dẫn tương đối theo courseId; hai đối số: (apiBase, courseId).
 */
export function courseTestCatalogPath(apiBaseOrCourseId: string | number, courseIdOptional?: string | number): string {
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
export function formDraftPath(apiBaseOrVersionId?: string, versionIdOptional?: string): string {
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
 */
export function formDetailPath(apiBaseOrVersionId: string, versionIdOptional?: string): string {
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

export function previewSandboxPath(apiBase = ''): string {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/preview-sandbox` : '/api/teacher/forms/preview-sandbox';
}

export function formPublishPath(apiBase = ''): string {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/publish` : '/api/teacher/forms/publish';
}

export function formPublishPreviewPath(apiBase = ''): string {
  const cleanBase = String(apiBase || '').replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}/api/teacher/forms/publish-preview` : '/api/teacher/forms/publish-preview';
}
