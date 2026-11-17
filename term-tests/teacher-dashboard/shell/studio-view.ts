// NGUỒN: file .ts này; studio-view.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { courseTestCatalogPath, formDraftPath, formDetailPath, formPublishPath, formPublishPreviewPath, previewSandboxPath, rubricPresetsPath, rubricPresetsBuildPath } from '../api/teacher.js';
import { hasActiveUnsavedChanges, clearActiveUnsavedChanges, openUnsavedChangesModal } from '../navigation/unsaved-changes.js';
import { openCreateTestModal, renderCourseTestCatalogView, filterClassesForCourse } from '../studio/catalog.js';
import type { AuthState, DashboardRequest, ScopeState } from './dashboard-state.js';
import type { QueryHandle } from './query-coordinator.js';

// Lỗi bắt được từ request/alert: chỉ đọc message và name.
type CaughtError = { message?: string, name?: string, status?: number };

export interface StudioViewParams {
  root: ParentNode;
  queryCoordinator: {
    begin(scopeKey: string): QueryHandle | null;
    cancel(scopeKey: string): void;
    isCurrent(scopeKey: string | null | undefined, id: number | undefined): boolean;
  };
  authState: AuthState;
  scopeState: ScopeState;
  form: HTMLFormElement | null;
  viewExams: HTMLElement | null;
  disposeOwnedBuilder: () => void;
  renderOwnedBuilder: (...args: any[]) => unknown;
  request: DashboardRequest;
}

export function createStudioView({ root, queryCoordinator, authState, scopeState, form, viewExams, disposeOwnedBuilder, renderOwnedBuilder, request }: StudioViewParams) {
  let currentStudioCourseId = 1;
  async function loadAndRenderTestStudio(targetCourseId: unknown = currentStudioCourseId): Promise<void> {
    disposeOwnedBuilder();
    queryCoordinator.cancel('testStudio');
    queryCoordinator.cancel('testStudioBuilder');
    currentStudioCourseId = Number(targetCourseId || 1);
    const container = root.querySelector<HTMLElement>('#test-studio-container') || viewExams;
    if (!container) return;

    if (!authState.currentTeacher && authState.sessionToken) {
      container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang kiểm tra quyền hạn...</p></div>';
      return;
    }

    const teacherRole = authState.currentTeacher ? authState.currentTeacher.role : 'teacher';
    if (teacherRole !== 'lead' && teacherRole !== 'admin') {
      renderCourseTestCatalogView(container, [], { teacherRole, courseId: currentStudioCourseId });
      return;
    }

    const query = queryCoordinator?.begin?.('testStudio');
    if (queryCoordinator && !query) return;

    try {
      container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải danh mục bài thi...</p></div>';
      const endpoint = courseTestCatalogPath(currentStudioCourseId);
      const res = await request(endpoint, { signal: query?.signal });
      if (query && !query.isCurrent()) return;
      const catalog = res.catalog || [];
      const handleDeleteDraft = async ({ formVersionId, title }: { formVersionId?: string, title?: string }) => {
        if (!formVersionId) return;
        try {
          container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang xóa bài thi...</p></div>';
          const delRes = await request(formDraftPath(formVersionId), {
            method: 'DELETE'
          });
          if (delRes && delRes.success) {
            alert(`Đã xóa bài thi ${title ? `"${title}" ` : ''}thành công.`);
          }
          await loadAndRenderTestStudio(currentStudioCourseId);
        } catch (error) {
          const err = error as CaughtError;
          alert('Lỗi xóa bài thi: ' + (err.message || 'Lỗi kết nối'));
          await loadAndRenderTestStudio(currentStudioCourseId);
        }
      };

      if (!scopeState.rawClassesList || scopeState.rawClassesList.length === 0) {
        try {
          const classPayload = await request('/api/teacher/classes');
          scopeState.rawClassesList = classPayload?.classes || [];
        } catch (_) {}
      }
      const relevantClasses = filterClassesForCourse(scopeState.rawClassesList, currentStudioCourseId);

      renderCourseTestCatalogView(container, catalog, {
        teacherRole,
        courseId: currentStudioCourseId,
        onCourseChange: (newCid: unknown) => {
          loadAndRenderTestStudio(newCid);
        },
        onDeleteDraft: handleDeleteDraft,
        onAddTest: () => {
          openCreateTestModal({
            courseId: currentStudioCourseId,
            catalog,
            onSubmit: async ({ courseId, sessionNumber, phase, title, durationMinutes }: Record<string, any>) => {
              try {
                container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang khởi tạo bản nháp bài thi mới...</p></div>';

                const postRes = await request(formDraftPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    courseId,
                    sessionNumber,
                    phase,
                    title,
                    durationMinutes
                  })
                });

                if (!postRes || !postRes.formVersionId) {
                  throw new Error(postRes?.message || 'Không thể tạo bản nháp bài thi');
                }

                const detailRes = await request(formDetailPath(postRes.formVersionId));

                const formObj = detailRes?.formVersion || detailRes?.form || {};
                renderOwnedBuilder(container, {
                  ...formObj,
                  id: formObj.id || formObj.formVersionId || postRes.formVersionId,
                  formVersionId: formObj.formVersionId || formObj.id || postRes.formVersionId,
                  phase,
                  sessionNumber,
                  gradingKey: detailRes?.gradingKey || formObj.gradingKey,
                  submissionCount: detailRes?.submissionCount || 0
                }, {
                  teacherRole,
                  courseId,
                  catalog,
                  classes: relevantClasses,
                  onBack: () => {
                    if (hasActiveUnsavedChanges()) {
                      openUnsavedChangesModal({
                        onDiscard: () => {
                          clearActiveUnsavedChanges();
                          loadAndRenderTestStudio(courseId);
                        }
                      });
                      return;
                    }
                    clearActiveUnsavedChanges();
                    loadAndRenderTestStudio(courseId);
                  },
                  onDeleteDraft: handleDeleteDraft,
                  onSaveDraft: async (updatedPayload: Record<string, any>) => {
                    const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updatedPayload)
                    });
                    return putRes;
                  },
                  onRubricPresets: async () => request(rubricPresetsPath(), { errorMessage: 'Không tải được danh sách dạng câu hỏi.' }),
                  onBuildRubric: async (rubricPayload: Record<string, any>) => request(rubricPresetsBuildPath(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rubricPayload),
                    errorMessage: 'Không dựng được cách chấm.'
                  }),
                  onPreviewSandbox: async (sandboxPayload: Record<string, any>) => {
                    return await request(previewSandboxPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(sandboxPayload),
                      errorMessage: 'Chấm thử AI thất bại.'
                    });
                  },
                  onPublishPreview: async (previewPayload: Record<string, any>) => {
                    return await request(formPublishPreviewPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(previewPayload)
                    });
                  },
                  onPublish: async (publishPayload: Record<string, any>) => {
                    const pubRes = await request(formPublishPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(publishPayload)
                    });
                    return pubRes;
                  }
                });
              } catch (error) {
                const err = error as CaughtError;
                alert('Lỗi khởi tạo bài thi: ' + (err.message || 'Lỗi kết nối'));
                loadAndRenderTestStudio(currentStudioCourseId);
              }
            }
          });
        },
        onEditTest: async ({ testKey, formVersionId }: { testKey?: string, formVersionId?: string }) => {
          if (!formVersionId) {
            alert('Bài thi này chưa liên kết với phiên bản form nào.');
            return;
          }
          const editQuery = queryCoordinator?.begin?.('testStudioBuilder');
          if (queryCoordinator && !editQuery) return;

          try {
            container.innerHTML = '<div class="panel showcase-placeholder"><p>Đang tải dữ liệu bài thi...</p></div>';
            const detailRes = await request(formDetailPath(formVersionId), { signal: editQuery?.signal });
            if (editQuery && (!editQuery.isCurrent() || queryCoordinator?.isCurrent?.('testStudio', query?.id) === false)) return;
            const formObj = detailRes?.formVersion || detailRes?.form;
            if (!detailRes || !formObj) {
              throw new Error(detailRes?.message || 'Không tìm thấy dữ liệu bài thi');
            }

            renderOwnedBuilder(container, {
              ...formObj,
              id: formObj.id || formObj.formVersionId || formVersionId,
              formVersionId: formObj.formVersionId || formObj.id || formVersionId,
              gradingKey: detailRes?.gradingKey || formObj.gradingKey,
              testKey,
              submissionCount: detailRes?.submissionCount || 0
            }, {
              teacherRole,
              courseId: currentStudioCourseId,
              catalog,
              classes: relevantClasses,
              onBack: () => {
                if (hasActiveUnsavedChanges()) {
                  openUnsavedChangesModal({
                    onDiscard: () => {
                      clearActiveUnsavedChanges();
                      loadAndRenderTestStudio(currentStudioCourseId);
                    }
                  });
                  return;
                }
                clearActiveUnsavedChanges();
                loadAndRenderTestStudio(currentStudioCourseId);
              },
              onDeleteDraft: handleDeleteDraft,
              onSaveDraft: async (updatedPayload: Record<string, any>) => {
                const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedPayload)
                });
                return putRes;
              },
              onRubricPresets: async () => request(rubricPresetsPath(), { errorMessage: 'Không tải được danh sách dạng câu hỏi.' }),
              onBuildRubric: async (rubricPayload: Record<string, any>) => request(rubricPresetsBuildPath(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rubricPayload),
                errorMessage: 'Không dựng được cách chấm.'
              }),
              onPreviewSandbox: async (sandboxPayload: Record<string, any>) => {
                return await request(previewSandboxPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(sandboxPayload),
                  errorMessage: 'Chấm thử AI thất bại.'
                });
              },
              onPublishPreview: async (previewPayload: Record<string, any>) => {
                return await request(formPublishPreviewPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(previewPayload)
                });
              },
              onPublish: async (publishPayload: Record<string, any>) => {
                const pubRes = await request(formPublishPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(publishPayload)
                });
                return pubRes;
              }
            });
          } catch (error) {
            const err = error as CaughtError;
            if (editQuery && (!editQuery.isCurrent() || queryCoordinator?.isCurrent?.('testStudio', query?.id) === false || err.name === 'AbortError')) return;
            alert('Lỗi tải bài thi: ' + (err.message || 'Lỗi kết nối'));
            loadAndRenderTestStudio(currentStudioCourseId);
          }
        }
      });
    } catch (error) {
      const err = error as CaughtError;
      if (query && (!query.isCurrent() || err.name === 'AbortError')) return;
      container.innerHTML = `<div class="panel showcase-placeholder"><p class="alert-error">Không thể tải danh mục bài thi: ${err.message || 'Lỗi kết nối'}</p></div>`;
    }
  }

  return { loadAndRenderTestStudio };
}
