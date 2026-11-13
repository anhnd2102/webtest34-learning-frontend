import { courseTestCatalogPath, formDraftPath, formDetailPath, formPublishPath, formPublishPreviewPath, previewSandboxPath } from '../api/teacher.js';
import { hasActiveUnsavedChanges, clearActiveUnsavedChanges, openUnsavedChangesModal } from '../navigation/unsaved-changes.js';
import { openCreateTestModal, renderCourseTestCatalogView, filterClassesForCourse } from '../studio/catalog.js';

export function createStudioView({ root, queryCoordinator, authState, scopeState, form, viewExams, disposeOwnedBuilder, renderOwnedBuilder, request }) {
  let currentStudioCourseId = 1;
  async function loadAndRenderTestStudio(targetCourseId = currentStudioCourseId) {
    disposeOwnedBuilder();
    queryCoordinator.cancel('testStudio');
    queryCoordinator.cancel('testStudioBuilder');
    currentStudioCourseId = Number(targetCourseId || 1);
    const container = root.querySelector('#test-studio-container') || viewExams;
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
      const handleDeleteDraft = async ({ formVersionId, title }) => {
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
        } catch (err) {
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
        onCourseChange: (newCid) => {
          loadAndRenderTestStudio(newCid);
        },
        onDeleteDraft: handleDeleteDraft,
        onAddTest: () => {
          openCreateTestModal({
            courseId: currentStudioCourseId,
            catalog,
            onSubmit: async ({ courseId, sessionNumber, phase, title, durationMinutes }) => {
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
                  onSaveDraft: async (updatedPayload) => {
                    const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(updatedPayload)
                    });
                    return putRes;
                  },
                  onPreviewSandbox: async (sandboxPayload) => {
                    return await request(previewSandboxPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(sandboxPayload),
                      errorMessage: 'Chấm thử AI thất bại.'
                    });
                  },
                  onPublishPreview: async (previewPayload) => {
                    return await request(formPublishPreviewPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(previewPayload)
                    });
                  },
                  onPublish: async (publishPayload) => {
                    const pubRes = await request(formPublishPath(), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(publishPayload)
                    });
                    return pubRes;
                  }
                });
              } catch (err) {
                alert('Lỗi khởi tạo bài thi: ' + (err.message || 'Lỗi kết nối'));
                loadAndRenderTestStudio(currentStudioCourseId);
              }
            }
          });
        },
        onEditTest: async ({ testKey, formVersionId }) => {
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
              onSaveDraft: async (updatedPayload) => {
                const putRes = await request(formDraftPath(updatedPayload.formVersionId), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedPayload)
                });
                return putRes;
              },
              onPreviewSandbox: async (sandboxPayload) => {
                return await request(previewSandboxPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(sandboxPayload),
                  errorMessage: 'Chấm thử AI thất bại.'
                });
              },
              onPublishPreview: async (previewPayload) => {
                return await request(formPublishPreviewPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(previewPayload)
                });
              },
              onPublish: async (publishPayload) => {
                const pubRes = await request(formPublishPath(), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(publishPayload)
                });
                return pubRes;
              }
            });
          } catch (err) {
            if (editQuery && (!editQuery.isCurrent() || queryCoordinator?.isCurrent?.('testStudio', query?.id) === false || err.name === 'AbortError')) return;
            alert('Lỗi tải bài thi: ' + (err.message || 'Lỗi kết nối'));
            loadAndRenderTestStudio(currentStudioCourseId);
          }
        }
      });
    } catch (err) {
      if (query && (!query.isCurrent() || err.name === 'AbortError')) return;
      container.innerHTML = `<div class="panel showcase-placeholder"><p class="alert-error">Không thể tải danh mục bài thi: ${err.message || 'Lỗi kết nối'}</p></div>`;
    }
  }

  return { loadAndRenderTestStudio };
}
