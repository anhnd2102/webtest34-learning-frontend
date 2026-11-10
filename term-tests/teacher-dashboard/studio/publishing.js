import {
  trackBuilderModal
} from '../navigation/unsaved-changes.js';
import { filterClassesForCourse } from './catalog.js';
import { formPublishPreviewPath, formPublishPath } from '../api/teacher.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  escapeHtml
} from '../ui/presentation.js';

export function createPublishing({ draftState, builderOwner, syncInputs, options, render, markSaved }) {
function openPublishingModal() {
      syncInputs();
      let modal = document.querySelector('#smart-publishing-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'smart-publishing-modal';
        modal.className = 'publishing-modal-overlay';
        document.body.appendChild(modal);
      }
      trackBuilderModal(modal, builderOwner);

      let currentStep = 1;
      let purpose = 'replace_existing';
      const catalog = Array.isArray(options.catalog) ? options.catalog : [];
      let targetTestKey = draftState.testKey || (catalog[0] ? catalog[0].testKey : '');

      const courseNames = { 1: '03', 2: '34', 3: '45' };
      const currentCid = options.courseId || 2;
      const courseCode = courseNames[currentCid] || '34';
      const maxSession = catalog.reduce((max, it) => Math.max(max, Number(it.sessionNumber) || 0), 0);
      const nextSession = maxSession + 1;
      const defaultNewTitle = `IZONE · Khối ${courseCode} · Test ${nextSession}`;

      let newCatalogMeta = {
        sessionNumber: nextSession,
        phase: 1,
        testNumber: nextSession,
        title: draftState.title || defaultNewTitle
      };

      let scope = 'whole_course';
      const availableClasses = filterClassesForCourse(options.classes || [], currentCid);
      let selectedClassIds = availableClasses.map(c => String(c.classId || c.id));
      let searchQuery = '';
      let previewResult = null;
      let isPublishing = false;

      function renderModalContent() {
        if (currentStep === 1) {
          renderStep1();
        } else {
          renderStep2();
        }
      }

      function renderStep1() {
        const filteredClasses = availableClasses.filter(cls => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          const name = String(cls.name || cls.className || `Lớp ${cls.classId}`).toLowerCase();
          const code = String(cls.classId || cls.id || '').toLowerCase();
          return name.includes(q) || code.includes(q);
        });

        const classesListHtml = filteredClasses.length > 0 ? filteredClasses.map((cls) => {
          const cid = String(cls.classId || cls.id);
          const isChecked = selectedClassIds.includes(cid);
          const subCount = Number(cls.submissionCount || cls.submission_count || 0);
          const statusBadge = subCount > 0
            ? `<span class="badge-status-pill warning">${renderSvgIcon('lock', 'icon-inline')} Đã có bài nộp (${subCount})</span>`
            : `<span class="badge-status-pill neutral">Chưa thi</span>`;
          return `
            <label class="class-picker-row ${isChecked ? 'is-selected' : ''}">
              <input type="checkbox" class="cb-publish-class" value="${cid}" ${isChecked ? 'checked' : ''} />
              <div class="class-picker-info">
                <span class="class-picker-name">${escapeHtml(cls.name || cls.className || `Lớp ${cid}`)}</span>
                <span class="class-picker-code">${cls.courseCode ? `(${cls.courseCode})` : ''}</span>
              </div>
              <div class="class-picker-meta">${statusBadge}</div>
            </label>
          `;
        }).join('') : `
          <div class="empty-classes-notice">Không tìm thấy lớp học nào phù hợp${searchQuery ? ` với từ khóa "${escapeHtml(searchQuery)}"` : ''}.</div>
        `;

        const catalogOptionsHtml = catalog.length > 0 ? catalog.map(it => `
          <option value="${it.testKey}" ${it.testKey === targetTestKey ? 'selected' : ''}>
            ${escapeHtml(it.title || `Test ${it.sessionNumber}`)} (Buổi ${it.sessionNumber}${it.phase ? ` · Phase ${it.phase}` : ''})
          </option>
        `).join('') : `
          <option value="">${escapeHtml(draftState.title || 'Đề thi hiện tại')}</option>
        `;

        modal.innerHTML = `
          <div class="publishing-dialog publishing-wizard-dialog">
            <header class="publishing-header">
              <div class="publishing-title-area">
                <span class="publish-badge">Smart Publishing Engine</span>
                <h3>Công bố đề thi — v${draftState.version}</h3>
                <p class="publish-test-title">${escapeHtml(draftState.title || '')}</p>
              </div>
              <button type="button" class="btn-close-publish-modal" id="btn-close-publish-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
            </header>

            <div class="publishing-stepper">
              <div class="stepper-item is-active">
                <span class="stepper-num">1</span>
                <span class="stepper-label">Mục tiêu &amp; Phạm vi</span>
              </div>
              <div class="stepper-line"></div>
              <div class="stepper-item">
                <span class="stepper-num">2</span>
                <span class="stepper-label">Xác nhận an toàn</span>
              </div>
            </div>

            <div class="publishing-body">
              <div class="alert-notice alert-immutable">
                <div class="notice-icon">${renderSvgIcon('lock', 'icon-inline')}</div>
                <div class="notice-text">
                  <strong>Cơ chế Roster Freezing (Bảo toàn kết quả):</strong>
                  Hệ thống sẽ tự động quét trạng thái bài làm của từng lớp. Bất kỳ lớp nào đã có ít nhất 1 bài nộp (submission_count > 0) sẽ được <strong>BẢO VỆ và ĐÓNG BĂNG</strong>, giữ nguyên phiên bản đề cũ để bảo toàn dữ liệu điểm số.
                </div>
              </div>

              <!-- Section 1: Mục tiêu công bố -->
              <div class="form-group publish-section">
                <label class="publish-section-label">1. Mục tiêu công bố:</label>
                <div class="purpose-options">
                  <label class="purpose-radio-card ${purpose === 'replace_existing' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_purpose" value="replace_existing" ${purpose === 'replace_existing' ? 'checked' : ''} id="radio-purpose-replace" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('rotate', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Cập nhật thay thế cho bài test có sẵn trong lộ trình</div>
                        <div class="card-desc">Chỉ cập nhật đề thi cho bài test được chọn dưới đây. Các bài test khác trong lộ trình khối được giữ nguyên 100%.</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>

                  <div class="purpose-subfields" id="replace-subfields" style="${purpose === 'replace_existing' ? '' : 'display:none;'}">
                    <label class="subfield-label">Chọn bài test mục tiêu cần thay thế:</label>
                    <select class="form-control select-target-test" id="select-target-test">
                      ${catalogOptionsHtml}
                    </select>
                  </div>

                  <label class="purpose-radio-card ${purpose === 'add_new' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_purpose" value="add_new" ${purpose === 'add_new' ? 'checked' : ''} id="radio-purpose-add" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('plusCircle', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Bổ sung thành một bài test mới trong lộ trình của khối</div>
                        <div class="card-desc">Thêm bài test mới vào danh mục lộ trình của khối và tự động tạo bài tập cho học sinh các lớp được áp dụng.</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>

                  <div class="purpose-subfields" id="add-subfields" style="${purpose === 'add_new' ? '' : 'display:none;'}">
                    <div class="add-subfields-grid">
                      <div class="field-item">
                        <label>Buổi học (Session):</label>
                        <input type="number" class="form-control" id="input-new-session" value="${newCatalogMeta.sessionNumber}" min="1" />
                      </div>
                      <div class="field-item">
                        <label>Giai đoạn (Phase):</label>
                        <select class="form-control" id="select-new-phase">
                          <option value="1" ${newCatalogMeta.phase === 1 ? 'selected' : ''}>Phase 1</option>
                          <option value="2" ${newCatalogMeta.phase === 2 ? 'selected' : ''}>Phase 2</option>
                        </select>
                      </div>
                      <div class="field-item">
                        <label>Thứ tự test:</label>
                        <input type="number" class="form-control" id="input-new-testnum" value="${newCatalogMeta.testNumber}" min="1" />
                      </div>
                      <div class="field-item span-full">
                        <label>Tên bài test hiển thị:</label>
                        <input type="text" class="form-control" id="input-new-title" value="${escapeHtml(newCatalogMeta.title)}" placeholder="Nhập tên bài test..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Section 2: Phạm vi công bố -->
              <div class="form-group publish-section">
                <label class="publish-section-label">2. Phạm vi công bố đề thi:</label>
                <div class="scope-options">
                  <label class="scope-radio-card ${scope === 'whole_course' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_scope" value="whole_course" ${scope === 'whole_course' ? 'checked' : ''} id="radio-scope-whole" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('layers', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Toàn bộ khối (Mặc định)</div>
                        <div class="card-desc">Cập nhật đề thi chuẩn cho Danh mục bài test của khối và tự động áp dụng cho tất cả các lớp chưa có học sinh nộp bài.</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>

                  <label class="scope-radio-card ${scope === 'specific_classes' ? 'is-selected' : ''}">
                    <input type="radio" class="sr-only-radio" name="publish_scope" value="specific_classes" ${scope === 'specific_classes' ? 'checked' : ''} id="radio-scope-classes" />
                    <div class="tile-card-header">
                      <div class="tile-card-icon">${renderSvgIcon('clipboard', 'icon-tile')}</div>
                      <div class="tile-card-body">
                        <div class="card-title">Chỉ áp dụng cho các lớp được chọn</div>
                        <div class="card-desc">Chỉ cập nhật đề thi cho các lớp được chỉ định dưới đây (bỏ qua nếu lớp đã thi).</div>
                      </div>
                      <div class="tile-card-check">${renderSvgIcon('check', 'icon-check')}</div>
                    </div>
                  </label>
                </div>
              </div>

              <div class="specific-classes-container" id="specific-classes-container" style="${scope === 'specific_classes' ? '' : 'display: none;'}">
                <div class="classes-container-header">
                  <div class="classes-search-wrap">
                    <input type="text" class="form-control class-search-input" id="input-class-search" placeholder="Tìm kiếm mã lớp..." value="${escapeHtml(searchQuery)}" />
                  </div>
                  <div class="classes-actions">
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all-classes">Chọn tất cả</button>
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-deselect-all-classes">Bỏ chọn</button>
                  </div>
                </div>
                <div class="classes-checkbox-grid" id="classes-checkbox-grid">
                  ${classesListHtml}
                </div>
                <div class="classes-selection-counter" style="font-size:12px; color:#64748b; margin-top:6px;">
                  Đã chọn <strong>${selectedClassIds.length}</strong> / ${availableClasses.length} lớp học.
                </div>
              </div>

              <div class="publishing-error-msg" id="publishing-error-msg" style="display:none; color:#dc2626; font-size:13px; margin-top:8px;"></div>
            </div>

            <footer class="publishing-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-publish">Hủy</button>
              <button type="button" class="btn btn-primary" id="btn-step1-next">
                <span>Tiếp tục</span> ${renderSvgIcon('arrow-right', 'icon-inline')}
              </button>
            </footer>
          </div>
        `;

        bindStep1Events();
      }

      function bindStep1Events() {
        const closeBtn = modal.querySelector('#btn-close-publish-modal');
        const cancelBtn = modal.querySelector('#btn-cancel-publish');
        [closeBtn, cancelBtn].forEach(b => {
          b?.addEventListener('click', () => {
            modal.style.display = 'none';
          });
        });

        // Purpose radio toggle
        const radioReplace = modal.querySelector('#radio-purpose-replace');
        const radioAdd = modal.querySelector('#radio-purpose-add');
        const replaceSubfields = modal.querySelector('#replace-subfields');
        const addSubfields = modal.querySelector('#add-subfields');

        radioReplace?.addEventListener('change', () => {
          purpose = 'replace_existing';
          if (replaceSubfields) replaceSubfields.style.display = 'block';
          if (addSubfields) addSubfields.style.display = 'none';
          modal.querySelectorAll('.purpose-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioReplace.closest('.purpose-radio-card')?.classList.add('is-selected');
        });

        radioAdd?.addEventListener('change', () => {
          purpose = 'add_new';
          if (replaceSubfields) replaceSubfields.style.display = 'none';
          if (addSubfields) addSubfields.style.display = 'block';
          modal.querySelectorAll('.purpose-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioAdd.closest('.purpose-radio-card')?.classList.add('is-selected');
        });

        const targetSelect = modal.querySelector('#select-target-test');
        targetSelect?.addEventListener('change', () => {
          targetTestKey = targetSelect.value;
        });

        modal.querySelector('#input-new-session')?.addEventListener('input', (e) => {
          newCatalogMeta.sessionNumber = Number(e.target.value) || 1;
        });
        modal.querySelector('#select-new-phase')?.addEventListener('change', (e) => {
          newCatalogMeta.phase = Number(e.target.value) || 1;
        });
        modal.querySelector('#input-new-testnum')?.addEventListener('input', (e) => {
          newCatalogMeta.testNumber = Number(e.target.value) || 1;
        });
        modal.querySelector('#input-new-title')?.addEventListener('input', (e) => {
          newCatalogMeta.title = e.target.value;
        });

        // Scope toggle
        const radioWhole = modal.querySelector('#radio-scope-whole');
        const radioClasses = modal.querySelector('#radio-scope-classes');
        const classesContainer = modal.querySelector('#specific-classes-container');

        radioWhole?.addEventListener('change', () => {
          scope = 'whole_course';
          if (classesContainer) classesContainer.style.display = 'none';
          modal.querySelectorAll('.scope-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioWhole.closest('.scope-radio-card')?.classList.add('is-selected');
        });

        radioClasses?.addEventListener('change', () => {
          scope = 'specific_classes';
          if (classesContainer) classesContainer.style.display = 'block';
          modal.querySelectorAll('.scope-radio-card').forEach(c => c.classList.remove('is-selected'));
          radioClasses.closest('.scope-radio-card')?.classList.add('is-selected');
        });

        // Search classes
        const searchInput = modal.querySelector('#input-class-search');
        searchInput?.addEventListener('input', (e) => {
          searchQuery = e.target.value;
          renderStep1();
          const newSearch = modal.querySelector('#input-class-search');
          if (newSearch) {
            newSearch.focus();
            newSearch.selectionStart = newSearch.selectionEnd = newSearch.value.length;
          }
        });

        // Class selection
        modal.querySelector('#btn-select-all-classes')?.addEventListener('click', () => {
          selectedClassIds = availableClasses.map(c => String(c.classId || c.id));
          renderStep1();
        });
        modal.querySelector('#btn-deselect-all-classes')?.addEventListener('click', () => {
          selectedClassIds = [];
          renderStep1();
        });

        modal.querySelectorAll('.cb-publish-class').forEach(cb => {
          cb.addEventListener('change', () => {
            const cid = cb.value;
            if (cb.checked) {
              if (!selectedClassIds.includes(cid)) selectedClassIds.push(cid);
              cb.closest('.class-picker-row')?.classList.add('is-selected');
            } else {
              selectedClassIds = selectedClassIds.filter(id => id !== cid);
              cb.closest('.class-picker-row')?.classList.remove('is-selected');
            }
            const counter = modal.querySelector('.classes-selection-counter');
            if (counter) counter.innerHTML = `Đã chọn <strong>${selectedClassIds.length}</strong> / ${availableClasses.length} lớp học.`;
          });
        });

        // Next to Step 2
        const nextBtn = modal.querySelector('#btn-step1-next');
        const errorMsgEl = modal.querySelector('#publishing-error-msg');

        nextBtn?.addEventListener('click', async () => {
          if (scope === 'specific_classes' && selectedClassIds.length === 0) {
            if (errorMsgEl) {
              errorMsgEl.textContent = 'Vui lòng chọn ít nhất 1 lớp học để công bố đề thi.';
              errorMsgEl.style.display = 'block';
            }
            return;
          }

          if (errorMsgEl) errorMsgEl.style.display = 'none';
          nextBtn.disabled = true;
          nextBtn.innerHTML = `${renderSvgIcon('rotate', 'icon-inline spin')} <span>Đang phân tích tác động...</span>`;

          try {
            const previewPayload = {
              formVersionId: draftState.formVersionId,
              courseId: currentCid,
              purpose,
              targetTestKey: purpose === 'replace_existing' ? targetTestKey : null,
              newCatalogMeta: purpose === 'add_new' ? newCatalogMeta : null,
              scope,
              classIds: scope === 'specific_classes' ? selectedClassIds : []
            };

            if (typeof options.onPublishPreview === 'function') {
              previewResult = await options.onPublishPreview(previewPayload);
            } else {
              try {
                const prevRes = await fetch(formPublishPreviewPath(options.apiBase), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {})
                  },
                  body: JSON.stringify(previewPayload)
                });
                if (prevRes.ok) {
                  previewResult = await prevRes.json();
                }
              } catch (_) {}
            }

            currentStep = 2;
            renderModalContent();
          } catch (err) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = `<span>Tiếp tục</span> ${renderSvgIcon('arrow-right', 'icon-inline')}`;
            if (errorMsgEl) {
              errorMsgEl.textContent = 'Lỗi phân tích: ' + (err.message || 'Lỗi kết nối');
              errorMsgEl.style.display = 'block';
            }
          }
        });
      }

      function renderStep2() {
        const targetCatalogItem = catalog.find(c => c.testKey === targetTestKey);
        const targetTitle = purpose === 'replace_existing'
          ? (previewResult?.targetTestTitle || targetCatalogItem?.title || draftState.title || 'Đề thi')
          : (newCatalogMeta.title || draftState.title || 'Đề thi mới');

        const totalChecked = previewResult?.totalChecked ?? (scope === 'whole_course' ? availableClasses.length : selectedClassIds.length);
        const updatedCount = previewResult?.updatedCount ?? (purpose === 'add_new' ? totalChecked : selectedClassIds.length);
        const skippedCount = previewResult?.skippedCount ?? 0;

        const targetTitleToMatch = targetTitle.trim();

        modal.innerHTML = `
          <div class="publishing-dialog publishing-wizard-dialog">
            <header class="publishing-header">
              <div class="publishing-title-area">
                <span class="publish-badge">Smart Publishing Engine</span>
                <h3>Xác nhận công bố đề thi</h3>
                <p class="publish-test-title">${escapeHtml(draftState.title || '')}</p>
              </div>
              <button type="button" class="btn-close-publish-modal" id="btn-close-publish-modal" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
            </header>

            <div class="publishing-stepper">
              <div class="stepper-item is-completed">
                <span class="stepper-num">${renderSvgIcon('check', 'icon-inline')}</span>
                <span class="stepper-label">Mục tiêu &amp; Phạm vi</span>
              </div>
              <div class="stepper-line is-completed"></div>
              <div class="stepper-item is-active">
                <span class="stepper-num">2</span>
                <span class="stepper-label">Xác nhận an toàn</span>
              </div>
            </div>

            <div class="publishing-body">
              <!-- Bảng phân tích tác động (Impact Summary) -->
              <div class="impact-summary-card">
                <div class="impact-summary-header">
                  <span class="impact-summary-badge">Bảng phân tích tác động</span>
                  <h4>Kiểm tra tác động trước khi áp dụng:</h4>
                </div>
                <div class="impact-summary-grid">
                  <div class="impact-row">
                    <span class="impact-label">Mục tiêu công bố:</span>
                    <span class="impact-value">
                      ${purpose === 'replace_existing'
                        ? `Thay thế bài test: <strong>${escapeHtml(targetTitle)}</strong>`
                        : `Bổ sung bài test mới: <strong>${escapeHtml(targetTitle)}</strong> (Buổi ${newCatalogMeta.sessionNumber})`}
                    </span>
                  </div>
                  <div class="impact-row">
                    <span class="impact-label">Phạm vi áp dụng:</span>
                    <span class="impact-value">
                      ${scope === 'whole_course'
                        ? `Toàn bộ khối (Tổng số: <strong>${totalChecked}</strong> lớp)`
                        : `Chỉ áp dụng cho <strong>${selectedClassIds.length}</strong> lớp được chọn`}
                    </span>
                  </div>
                  <div class="impact-row">
                    <span class="impact-label">Lớp sẽ nhận đề mới:</span>
                    <span class="impact-value text-success">
                      <strong>${updatedCount} lớp</strong> ${purpose === 'add_new' ? '(sẽ được tạo bài tập mới)' : '(chưa có học sinh nộp bài)'}
                    </span>
                  </div>
                  ${skippedCount > 0 ? `
                    <div class="impact-row">
                      <span class="impact-label">Lớp được bảo vệ đóng băng:</span>
                      <span class="impact-value text-warning">
                        <strong>${skippedCount} lớp</strong> (đã có học sinh làm bài, giữ nguyên đề cũ)
                      </span>
                    </div>
                  ` : ''}
                  <div class="impact-row">
                    <span class="impact-label">Danh mục lộ trình khối:</span>
                    <span class="impact-value text-info">
                      ${scope === 'whole_course'
                        ? `Cập nhật lộ trình chuẩn của Khối ${courseCode}`
                        : `Chỉ gán bài riêng cho các lớp được chỉ định`}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Double-Check Xác nhận -->
              <div class="double-check-box">
                <div class="double-check-title">
                  ${renderSvgIcon('alert', 'icon-inline')}
                  <strong>XÁC NHẬN AN TOÀN (DOUBLE-CHECK)</strong>
                </div>
                <p class="double-check-desc">
                  Đây là quyết định thay đổi bài thi trực tiếp cho học sinh. Để xác nhận bạn hiểu rõ tác động trên, vui lòng nhập chính xác tên bài test dưới đây:
                </p>
                <div class="double-check-reference">
                  <span class="reference-label">Tên bài test cần xác nhận:</span>
                  <code class="reference-code" id="target-title-reference">${escapeHtml(targetTitleToMatch)}</code>
                </div>

                <div class="confirm-input-row">
                  <input type="text" class="form-control" id="input-confirm-title" placeholder="Nhập hoặc dán tên bài test vào đây..." autocomplete="off" />
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-auto-fill-confirm" title="Điền tự động">${renderSvgIcon('clipboard', 'icon-inline')} Điền tự động</button>
                </div>
                <div class="confirm-match-status" id="confirm-match-status">
                  <span class="status-unmatched">${renderSvgIcon('alert', 'icon-inline')} Chưa khớp tên bài test (nút công bố đang khóa)</span>
                </div>
              </div>

              <div class="publishing-error-msg" id="publishing-error-msg" style="display:none; color:#dc2626; font-size:13px; margin-top:8px;"></div>
            </div>

            <footer class="publishing-footer">
              <button type="button" class="btn btn-secondary" id="btn-step2-back">${renderSvgIcon('arrowLeft', 'icon-inline')} Quay lại</button>
              <button type="button" class="btn btn-danger" id="btn-final-publish" disabled>
                ${renderSvgIcon('publish', 'icon-inline')} <span>Xác nhận &amp; Công bố ngay</span>
              </button>
            </footer>
          </div>
        `;

        bindStep2Events(targetTitleToMatch);
      }

      function bindStep2Events(targetTitleToMatch) {
        const closeBtn = modal.querySelector('#btn-close-publish-modal');
        closeBtn?.addEventListener('click', () => {
          modal.style.display = 'none';
        });

        const backBtn = modal.querySelector('#btn-step2-back');
        backBtn?.addEventListener('click', () => {
          currentStep = 1;
          renderModalContent();
        });

        const inputEl = modal.querySelector('#input-confirm-title');
        const autoFillBtn = modal.querySelector('#btn-auto-fill-confirm');
        const statusEl = modal.querySelector('#confirm-match-status');
        const finalBtn = modal.querySelector('#btn-final-publish');
        const errorMsgEl = modal.querySelector('#publishing-error-msg');

        function checkMatch() {
          const val = (inputEl?.value || '').trim().toLowerCase();
          const target = targetTitleToMatch.toLowerCase();
          const isMatched = val === target && val.length > 0;
          if (isMatched) {
            if (statusEl) statusEl.innerHTML = `<span class="status-matched">${renderSvgIcon('check', 'icon-inline')} Tên bài test đã khớp chính xác. Bạn có thể tiến hành công bố.</span>`;
            if (finalBtn) {
              finalBtn.disabled = false;
              finalBtn.classList.add('is-ready');
            }
          } else {
            if (statusEl) statusEl.innerHTML = `<span class="status-unmatched">${renderSvgIcon('alert', 'icon-inline')} Chưa khớp tên bài test (nút công bố đang khóa)</span>`;
            if (finalBtn) {
              finalBtn.disabled = true;
              finalBtn.classList.remove('is-ready');
            }
          }
        }

        inputEl?.addEventListener('input', checkMatch);
        autoFillBtn?.addEventListener('click', () => {
          if (inputEl) {
            inputEl.value = targetTitleToMatch;
            checkMatch();
          }
        });

        // Initialize state on render
        checkMatch();

        finalBtn?.addEventListener('click', async () => {
          if (finalBtn.disabled || isPublishing) return;
          isPublishing = true;
          finalBtn.disabled = true;
          finalBtn.innerHTML = `${renderSvgIcon('rotate', 'icon-inline spin')} <span>Đang công bố...</span>`;
          if (errorMsgEl) errorMsgEl.style.display = 'none';

          try {
            const publishPayload = {
              formVersionId: draftState.formVersionId,
              courseId: currentCid,
              purpose,
              targetTestKey: purpose === 'replace_existing' ? targetTestKey : null,
              newCatalogMeta: purpose === 'add_new' ? newCatalogMeta : null,
              scope,
              classIds: scope === 'specific_classes' ? selectedClassIds : []
            };

            let result;
            if (typeof options.onPublish === 'function') {
              result = await options.onPublish(publishPayload);
            } else {
              const res = await fetch(formPublishPath(options.apiBase), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(options.authToken ? { Authorization: `Bearer ${options.authToken}` } : {})
                },
                body: JSON.stringify(publishPayload)
              });
              result = await res.json();
            }

            if (!result || !result.ok) {
              throw new Error(result?.message || 'Không thể công bố đề thi');
            }

            draftState.status = 'published';
            markSaved();
            modal.style.display = 'none';
            render();
            openPublishReportDialog(result);
          } catch (err) {
            isPublishing = false;
            finalBtn.disabled = false;
            finalBtn.innerHTML = `${renderSvgIcon('publish', 'icon-inline')} <span>Xác nhận &amp; Công bố ngay</span>`;
            if (errorMsgEl) {
              errorMsgEl.textContent = 'Lỗi công bố: ' + (err.message || 'Lỗi mạng');
              errorMsgEl.style.display = 'block';
            }
          }
        });
      }

      modal.style.display = 'flex';
      renderModalContent();
    }

function openPublishReportDialog(result = {}) {
      let modal = document.querySelector('#publish-report-dialog');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'publish-report-dialog';
        modal.className = 'publish-report-overlay';
        document.body.appendChild(modal);
      }
      trackBuilderModal(modal, builderOwner);

      const updated = result.updatedClasses || [];
      const skipped = result.skippedClasses || [];

      const updatedListHtml = updated.length > 0 ? `
        <div class="report-section-block success-block">
          <h4 class="report-block-title">${renderSvgIcon('check', 'icon-inline')} Các lớp đã cập nhật đề thi mới (${updated.length} lớp):</h4>
          <ul class="report-classes-list">
            ${updated.map(c => `
              <li class="report-class-item updated-item">
                <span class="class-name"><strong>${escapeHtml(c.className || `Lớp ${c.classId}`)}</strong></span>
                <span class="badge-status-pill success">Đã cập nhật</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : `
        <div class="report-section-block">
          <p class="empty-note">Không có lớp nào cần cập nhật đề thi.</p>
        </div>
      `;

      const skippedListHtml = skipped.length > 0 ? `
        <div class="report-section-block warning-block">
          <h4 class="report-block-title">${renderSvgIcon('lock', 'icon-inline')} Các lớp được bảo vệ & đóng băng (${skipped.length} lớp):</h4>
          <p class="skipped-help">Các lớp dưới đây đã có học sinh làm bài thi nên được bảo toàn nguyên vẹn đề gốc.</p>
          <ul class="report-classes-list">
            ${skipped.map(c => `
              <li class="report-class-item frozen-item">
                <span class="class-name"><strong>${escapeHtml(c.className || `Lớp ${c.classId}`)}</strong></span>
                <span class="badge-status-pill warning">Đóng băng (${c.submissionCount} bài nộp)</span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : '';

      modal.innerHTML = `
        <div class="publish-report-dialog">
          <header class="report-header">
            <div class="report-title-area">
              <span class="report-badge">Smart Publishing Report</span>
              <h3>Báo cáo kết quả công bố đề thi</h3>
            </div>
            <button type="button" class="btn-close-report" id="btn-close-report-x" aria-label="Đóng">${renderSvgIcon('close', 'icon-inline')}</button>
          </header>

          <div class="report-body">
            <div class="report-summary-cards">
              <div class="report-stat-card stat-success">
                <div class="stat-number">${result.updatedCount ?? updated.length}</div>
                <div class="stat-label">Lớp đã cập nhật đề mới</div>
              </div>
              <div class="report-stat-card stat-warning">
                <div class="stat-number">${result.skippedCount ?? skipped.length}</div>
                <div class="stat-label">Lớp đóng băng (đã thi)</div>
              </div>
              <div class="report-stat-card stat-info">
                <div class="stat-icon">${result.catalogUpdated ? renderSvgIcon('check', 'icon-inline') : '—'}</div>
                <div class="stat-label">${result.catalogUpdated ? 'Đã cập nhật Catalog khối' : 'Không cập nhật Catalog'}</div>
              </div>
            </div>

            <div class="report-details-container">
              ${updatedListHtml}
              ${skippedListHtml}
            </div>
          </div>

          <footer class="report-footer">
            <button type="button" class="btn btn-primary" id="btn-close-report">Hoàn tất & Đóng</button>
          </footer>
        </div>
      `;

      modal.style.display = 'flex';

      const closeBtns = modal.querySelectorAll('#btn-close-report-x, #btn-close-report');
      closeBtns.forEach(b => {
        b.addEventListener('click', () => {
          modal.style.display = 'none';
        });
      });
    }
  return openPublishingModal;
}
