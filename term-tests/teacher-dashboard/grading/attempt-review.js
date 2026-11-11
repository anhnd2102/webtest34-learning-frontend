import { attemptStatusLabel, formatAssignmentWindow, resultStatusLabel, formatDashboardScore, resolveStudentAnswerDisplay, resolveExpectedAnswerDisplay, extractAttemptSkills, formatCompactPrompt, verdictLabel, formatCurrentTime, validateManualGradingScores } from '../results/presentation.js';
import { escapeHtml } from '../ui/presentation.js';
import { formatOptionDisplayLetter } from '../studio/question-content.js';
import { renderSvgIcon, ICONS } from '../ui/icons.js';
import { manualGradingDraftPath, manualGradingCompletePath, attemptPublishPath } from '../api/teacher.js';

export function createAttemptReview({ root, lifecycle, state, viewState, queryCoordinator, actions }) {
  const document = root.ownerDocument || root;
  const window = document.defaultView || globalThis.window;
  const currentLocation = window?.location;
  const { fillIncidentTimeline, loadAttemptDetail, apiBase, authHeader, setUrl, loadResults } = actions;
  const attemptDetail = root.querySelector('#attempt-detail');
  const detailHeading = root.querySelector('#detail-heading');
  const detailMeta = root.querySelector('#detail-meta');
  const detailScores = root.querySelector('#detail-scores');
  const detailIncidents = root.querySelector('#detail-incidents');
  const detailAttemptHistory = root.querySelector('#detail-attempt-history');
  const conflictAlert = root.querySelector('#conflict-alert');
  const draftStatusMsg = root.querySelector('#draft-status-msg');
  const saveDraftBtn = root.querySelector('#save-draft-btn');
  const completeGradingBtn = root.querySelector('#complete-grading-btn');
  const gradingActionsBar = root.querySelector('#grading-actions-bar');
  const itemContextModal = root.querySelector('#item-context-modal');
  const modalItemContent = root.querySelector('#modal-item-content');
  const modalItemTitle = root.querySelector('#modal-item-title');
  const detailItemsBody = root.querySelector('#detail-items-body');
  const skillSummaryCard = root.querySelector('#skill-summary-card');
  const attemptSkillTabs = root.querySelector('#attempt-skill-tabs');
  const detailItems = root.querySelector('#detail-items');
  const publishResultBtn = root.querySelector('#publish-result-btn');
  const drawerBackdrop = root.querySelector('#drawer-backdrop');
  const results = root.querySelector('#results');
  const status = root.querySelector('#status');

function renderAttemptDetail(payload) {
    if (!attemptDetail) return;
    if (detailHeading) {
      const email = payload.student.studentEmail || payload.student.email;
      detailHeading.textContent = `${payload.student.name}${email ? ' · ' + email : ''}`;
    }

    if (detailMeta) {
      detailMeta.replaceChildren();
      const badges = [
        `Lớp: ${payload.class.name} (${payload.class.courseCode})`,
        `Bài: ${payload.assignment.title}`,
        `Phiên bản đề: ${payload.attempt.formVersion}`,
        `Trạng thái: ${attemptStatusLabel(payload.attempt.status)}`,
        `Sự cố: ${payload.incidentCount ?? payload.incidents?.length ?? 0}`,
        `Bắt đầu: ${payload.attempt.startedAt ? formatAssignmentWindow(payload.attempt.startedAt, null).split(' → ')[0] : '—'}`,
        `Nộp lúc: ${payload.attempt.submittedAt ? formatAssignmentWindow(payload.attempt.submittedAt, null).split(' → ')[0] : 'Chưa nộp'}`
      ];
      for (const text of badges) {
        const badge = document.createElement('span');
        badge.className = 'meta-badge';
        badge.textContent = text;
        detailMeta.append(badge);
      }
      const pubBadge = document.createElement('span');
      pubBadge.className = `meta-badge ${payload.attempt.publication?.published ? 'badge-published' : 'badge-unpub'}`;
      pubBadge.textContent = payload.attempt.publication?.published
        ? `Đã công bố (${payload.attempt.publication.publishedBy || ''})`
        : 'Chưa công bố';
      detailMeta.append(pubBadge);

      if (payload.student.leftClass) {
        const leftBadge = document.createElement('span');
        leftBadge.className = 'meta-badge badge-left-class';
        leftBadge.textContent = 'Không còn trong lớp';
        detailMeta.append(leftBadge);
      }

      if (payload.retakeGrant) {
        const retakeBadge = document.createElement('span');
        retakeBadge.className = 'meta-badge badge-retake-grant';
        retakeBadge.textContent = `Quyền làm lại: ${resultStatusLabel(payload.retakeGrant.status)}`;
        detailMeta.append(retakeBadge);
      }
    }


    if (detailScores) {
      detailScores.replaceChildren();
      const totalCard = document.createElement('div');
      totalCard.className = 'score-card total-card';
      totalCard.innerHTML = `<strong>Tổng điểm</strong><span class="score-val">${formatDashboardScore(payload.scores.total)}</span>`;
      detailScores.append(totalCard);

      for (const skill of payload.skills) {
        const skillScore = payload.scores.skills?.[skill.code];
        const card = document.createElement('div');
        card.className = 'score-card';
        card.innerHTML = `<strong>${skill.code.toUpperCase()}</strong><span class="score-val">${formatDashboardScore(skillScore)}</span>`;
        detailScores.append(card);
      }
    }

    if (detailIncidents) fillIncidentTimeline(detailIncidents, payload.incidents);

    if (detailAttemptHistory) {
      detailAttemptHistory.replaceChildren();
      if (payload.attemptHistory && payload.attemptHistory.length > 0) {
        const historyTable = document.createElement('table');
        historyTable.className = 'mini-table';
        historyTable.innerHTML = `
          <thead>
            <tr>
              <th>Lần làm bài</th>
              <th>Phiên bản đề</th>
              <th>Trạng thái</th>
              <th>Bắt đầu</th>
              <th>Nộp lúc</th>
            </tr>
          </thead>
        `;
        const hBody = document.createElement('tbody');
        for (const att of payload.attemptHistory) {
          const hRow = document.createElement('tr');
          if (att.isCurrent) hRow.className = 'current-attempt-row';
          const label = att.isCurrent ? `${att.attemptId.slice(0, 8)}… (Hiện tại)` : `${att.attemptId.slice(0, 8)}…`;
          hRow.innerHTML = `
            <td>${label}</td>
            <td>Phiên bản ${att.formVersion}</td>
            <td><span class="result-status ${att.status}">${attemptStatusLabel(att.status)}</span></td>
            <td>${att.startedAt ? formatAssignmentWindow(att.startedAt, null).split(' → ')[0] : '—'}</td>
            <td>${att.submittedAt ? formatAssignmentWindow(att.submittedAt, null).split(' → ')[0] : '—'}</td>
          `;
          hBody.append(hRow);
        }
        historyTable.append(hBody);
        detailAttemptHistory.append(historyTable);
      } else {
        detailAttemptHistory.textContent = 'Không có lịch sử lần làm nào khác.';
      }
    }

    viewState.currentAttemptDetail = payload;
    if (conflictAlert) {
      conflictAlert.hidden = true;
      conflictAlert.replaceChildren();
    }

    if (draftStatusMsg) {
      if (payload.manualGrading?.status === 'completed') {
        draftStatusMsg.textContent = 'Bài làm đã hoàn tất chấm điểm.';
        if (saveDraftBtn) saveDraftBtn.disabled = true;
        if (completeGradingBtn) completeGradingBtn.disabled = true;
      } else if (payload.manualGrading?.revision > 0) {
        draftStatusMsg.textContent = `Bản nháp phiên bản ${payload.manualGrading.revision} (lưu lúc ${payload.manualGrading.updatedAt ? formatAssignmentWindow(payload.manualGrading.updatedAt, null).split(' → ')[0] : '—'})`;
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        if (completeGradingBtn) completeGradingBtn.disabled = false;
      } else {
        draftStatusMsg.textContent = 'Chưa có bản nháp nào được lưu.';
        if (saveDraftBtn) saveDraftBtn.disabled = false;
        if (completeGradingBtn) completeGradingBtn.disabled = false;
      }
    }

    if (gradingActionsBar) gradingActionsBar.hidden = false;

    function openItemContextModal(item) {
      if (!itemContextModal || !modalItemContent) return;
      if (modalItemTitle) {
        const skillLabel = item.primarySkill ? ` · ${item.primarySkill.toUpperCase()}` : '';
        modalItemTitle.textContent = `Câu ${item.position}${skillLabel}`;
      }
      modalItemContent.replaceChildren();

      // 1. Prompt Block
      const promptBlock = document.createElement('div');
      promptBlock.className = 'modal-ctx-block';
      promptBlock.innerHTML = `
        <h4>Đề bài / Yêu cầu chi tiết</h4>
        <div class="modal-ctx-prompt">${escapeHtml(item.prompt || '—')}</div>
        ${item.helpText ? `<p class="modal-ctx-help">${escapeHtml(item.helpText)}</p>` : ''}
      `;
      modalItemContent.append(promptBlock);

      // 2. Options List (if options exist)
      if (Array.isArray(item.options) && item.options.length > 0) {
        const optBlock = document.createElement('div');
        optBlock.className = 'modal-ctx-block';
        const optTitle = document.createElement('h4');
        optTitle.textContent = `Danh sách lựa chọn / Từ vựng (${item.options.length})`;
        optBlock.append(optTitle);

        const ul = document.createElement('ul');
        ul.className = 'modal-options-list';
        for (let optIdx = 0; optIdx < item.options.length; optIdx++) {
          const opt = item.options[optIdx];
          const li = document.createElement('li');
          const isSelected = item.studentAnswer === opt.id || (Array.isArray(item.studentAnswer) && item.studentAnswer.includes(opt.id));
          const isExpected = item.expectedAnswer === opt.id || item.expectedOptionId === opt.id || (Array.isArray(item.expectedOptionIds) && item.expectedOptionIds.includes(opt.id));
          const letter = formatOptionDisplayLetter(opt.id, optIdx);

          li.className = 'modal-options-item';
          if (isExpected) {
            li.classList.add('is-correct-key');
          } else if (isSelected) {
            li.classList.add('is-wrong-selection');
          }

          let badgeHtml = '';
          if (isExpected && isSelected) {
            badgeHtml = `<span class="opt-tag tag-correct">${renderSvgIcon('check', 'icon-inline')} <span>Đáp án đúng · Học viên chọn</span></span>`;
          } else if (isExpected) {
            badgeHtml = `<span class="opt-tag tag-expected">${renderSvgIcon('check', 'icon-inline')} <span>Đáp án chuẩn</span></span>`;
          } else if (isSelected) {
            badgeHtml = `<span class="opt-tag tag-wrong">${renderSvgIcon('close', 'icon-inline')} <span>Học viên chọn sai</span></span>`;
          }

          li.innerHTML = `<span class="opt-letter font-bold">${letter}.</span> <span class="opt-text">${escapeHtml(opt.label || opt.id)}</span> ${badgeHtml}`;
          ul.append(li);
        }
        optBlock.append(ul);
        modalItemContent.append(optBlock);
      }

      // 3. Student Answer Block
      const ansBlock = document.createElement('div');
      ansBlock.className = 'modal-ctx-block';
      const ansStudent = resolveStudentAnswerDisplay(item);
      ansBlock.innerHTML = `
        <h4>Bài làm của học viên</h4>
        <div class="modal-ctx-answer">${escapeHtml(ansStudent)}</div>
      `;
      modalItemContent.append(ansBlock);

      // 4. Expected Answer & Feedback
      const expBlock = document.createElement('div');
      expBlock.className = 'modal-ctx-block';
      const ansExpected = resolveExpectedAnswerDisplay(item);
      const fbLines = [];
      if (item.feedback) {
        if (Number.isFinite(item.feedback.structureScore)) fbLines.push(`Điểm cấu trúc: ${item.feedback.structureScore}`);
        if (Number.isFinite(item.feedback.accuracyScore)) fbLines.push(`Điểm chính xác: ${item.feedback.accuracyScore}`);
        if (Array.isArray(item.feedback.evidence) && item.feedback.evidence.length > 0) fbLines.push(`Nhận xét: ${item.feedback.evidence.join('; ')}`);
        if (Array.isArray(item.feedback.errors) && item.feedback.errors.length > 0) fbLines.push(`Lỗi: ${item.feedback.errors.map(e => e.message || e.code).join(', ')}`);
      }
      expBlock.innerHTML = `
        <h4>Đáp án mẫu & Tiêu chí Rubric</h4>
        <div class="modal-ctx-answer modal-ctx-answer-expected">${escapeHtml(ansExpected)}</div>
        ${fbLines.length > 0 ? `<p class="modal-ctx-feedback">${escapeHtml(fbLines.join(' · '))}</p>` : ''}
      `;
      modalItemContent.append(expBlock);

      // 5. Manual Grade Override Block
      const overrideBlock = document.createElement('div');
      overrideBlock.className = 'modal-ctx-block modal-override-block';
      const curScore = item.draftScore !== null && item.draftScore !== undefined
        ? item.draftScore
        : (item.manualReview ? item.scoreEarned : item.scoreEarned);
      const curFeedback = typeof item.draftFeedback === 'string'
        ? item.draftFeedback
        : (item.draftFeedback?.comment ?? (item.manualReview && typeof item.feedback === 'object' ? (item.feedback?.comment || '') : ''));

      overrideBlock.innerHTML = `
        <div class="modal-override-head">
          <h4>Chấm điểm / Điều chỉnh điểm</h4>
          ${item.isOverridden ? '<span class="badge-manual-override">Đã sửa tay</span>' : ''}
        </div>
        <div class="modal-override-score-row">
          <label class="modal-override-label">Điểm số:</label>
          <input type="number" step="any" min="0" max="${item.maxScore}" class="modal-override-score-input table-grade-input" value="${curScore !== null && curScore !== undefined ? curScore : ''}" placeholder="0-${item.maxScore}">
          <span class="modal-override-max">/ ${item.maxScore} điểm</span>
        </div>
        <div class="modal-override-feedback-row">
          <label class="modal-override-label modal-override-label-block">Nhận xét của giáo viên:</label>
          <textarea class="modal-override-feedback-input table-feedback-input" placeholder="Nhập nhận xét hoặc ghi chú sửa điểm...">${escapeHtml(curFeedback || '')}</textarea>
        </div>
        <div class="modal-override-actions">
          <button type="button" class="btn btn-sm btn-primary btn-modal-save-grade">${renderSvgIcon('check', 'icon-inline')} <span>Lưu điểm</span></button>
          ${item.isOverridden ? `<button type="button" class="btn btn-sm btn-outline-secondary btn-modal-reset-grade">${renderSvgIcon('rotate', 'icon-inline')} <span>Khôi phục điểm gốc (${item.originalScore !== null && item.originalScore !== undefined ? item.originalScore : item.scoreEarned}/${item.maxScore})</span></button>` : ''}
        </div>
      `;
      modalItemContent.append(overrideBlock);

      const modalScoreInp = overrideBlock.querySelector('.modal-override-score-input');
      const modalFeedbackInp = overrideBlock.querySelector('.modal-override-feedback-input');
      const modalSaveBtn = overrideBlock.querySelector('.btn-modal-save-grade');
      const modalResetBtn = overrideBlock.querySelector('.btn-modal-reset-grade');

      if (modalSaveBtn) {
        lifecycle.listen(modalSaveBtn, 'click', async () => {
          const rawScore = modalScoreInp.value.trim();
          if (rawScore === '') return;
          const num = Number(rawScore);
          if (!Number.isFinite(num) || num < 0 || num > item.maxScore) {
            alert(`Điểm số không hợp lệ (0 - ${item.maxScore})`);
            return;
          }
          item.draftScore = num;
          item.draftFeedback = modalFeedbackInp.value.trim();
          item.isOverridden = true;
          item.verdict = num >= item.maxScore ? 'correct' : (num > 0 ? 'partial' : 'incorrect');
          await saveManualGradingDraft(true);
          renderAttemptTableRows(viewState.currentSkillTab);
          itemContextModal.close();
        });
      }

      if (modalResetBtn) {
        lifecycle.listen(modalResetBtn, 'click', async () => {
          item._resetOverride = true;
          item.draftScore = null;
          item.draftFeedback = null;
          item.isOverridden = false;
          if (item.originalScore !== null && item.originalScore !== undefined) {
            item.scoreEarned = item.originalScore;
            item.verdict = item.scoreEarned >= item.maxScore ? 'correct' : (item.scoreEarned > 0 ? 'partial' : 'incorrect');
          }
          await saveManualGradingDraft(true);
          renderAttemptTableRows(viewState.currentSkillTab);
          itemContextModal.close();
        });
      }

      itemContextModal.showModal();
    }

    function renderAttemptTableRows(tabCode = 'all') {
      if (!detailItemsBody || !viewState.currentAttemptDetail) return;
      detailItemsBody.replaceChildren();

      const items = viewState.currentAttemptDetail.items;
      const { sections } = extractAttemptSkills(items);
      const filteredSections = tabCode === 'all'
        ? sections
        : sections.filter(s => s.skillCode === tabCode);

      for (const section of filteredSections) {
        // Render Section Header Row
        const secTr = document.createElement('tr');
        secTr.className = 'section-header-row';
        secTr.innerHTML = `
          <td colspan="8">
            <div class="sec-header-wrap">
              <span class="sec-header-title">${ICONS.book} <span>${escapeHtml(section.title)}</span></span>
              <div class="sec-header-badges">
                <span class="sec-header-score">${section.scoreEarned}/${section.maxScore} điểm</span>
                <span class="sec-header-count">(${section.correctCount}/${section.totalItems} câu đúng)</span>
                ${section.needsReviewCount > 0 ? `<span class="sec-header-review">${section.needsReviewCount} câu cần duyệt</span>` : ''}
              </div>
            </div>
          </td>
        `;
        detailItemsBody.append(secTr);

        for (const item of section.items) {
          const tr = document.createElement('tr');
          if (item.needsReview) tr.className = 'row-needs-review';

          // 1. # Column (compact question number, no internal tech badges)
          const tdPos = document.createElement('td');
          tdPos.className = 'col-pos-cell col-pos';
          tdPos.innerHTML = `<span class="q-pos-num">#${item.position}</span>`;
          tr.append(tdPos);

          // 2. Prompt Column
          const tdPrompt = document.createElement('td');
          const compactPrompt = formatCompactPrompt(item);
          const optBtnHtml = compactPrompt.hasExtensiveOptions
            ? `<button type="button" class="prompt-opt-btn" data-item-id="${item.itemVersionId}">${ICONS.clipboard} <span>Xem danh sách từ (${compactPrompt.optionsCount})</span></button>`
            : '';
          tdPrompt.innerHTML = `
            <div class="prompt-compact">
              <div class="prompt-preview-text" title="${escapeHtml(compactPrompt.text)}">${escapeHtml(compactPrompt.text)}</div>
              ${item.helpText ? `<small class="prompt-help-text">${escapeHtml(item.helpText)}</small>` : ''}
              ${optBtnHtml}
            </div>
          `;
          tr.append(tdPrompt);

          // 3. Student Answer Column
          const tdStudent = document.createElement('td');
          const studentAnsDisplay = resolveStudentAnswerDisplay(item);
          tdStudent.innerHTML = `
            <div class="ans-display-cell">
              <div class="ans-student-val" title="${escapeHtml(studentAnsDisplay)}">${escapeHtml(studentAnsDisplay)}</div>
            </div>
          `;
          tr.append(tdStudent);

          // 4. Expected Answer Column
          const tdExpected = document.createElement('td');
          const expectedAnsDisplay = resolveExpectedAnswerDisplay(item);
          tdExpected.innerHTML = `
            <div class="ans-display-cell">
              <div class="ans-expected-val" title="${escapeHtml(expectedAnsDisplay)}">${escapeHtml(expectedAnsDisplay)}</div>
            </div>
          `;
          tr.append(tdExpected);

          // 5. Verdict Column
          const tdVerdict = document.createElement('td');
          tdVerdict.className = 'col-verdict';
          tdVerdict.innerHTML = `<span class="verdict-badge ${item.verdict}">${verdictLabel(item.verdict)}</span>`;
          tr.append(tdVerdict);

          // 6. Score Column
          const tdScore = document.createElement('td');
          tdScore.className = 'col-score';
          const isAutomated = item.graderType !== 'rubric_async';
          const isInlineEditing = item._isEditingInline === true;
          const currentScoreVal = item.draftScore !== null && item.draftScore !== undefined
            ? item.draftScore
            : (item.manualReview ? item.scoreEarned : item.scoreEarned);

          if (!isAutomated || isInlineEditing) {
            tdScore.innerHTML = `
              <div class="col-score-cell">
                <div class="table-grade-score-wrap is-editing">
                  <input type="number" step="any" min="0" max="${item.maxScore}" class="grade-score-input table-grade-input" data-item-id="${item.itemVersionId}" value="${currentScoreVal !== undefined && currentScoreVal !== null ? currentScoreVal : ''}" placeholder="0-${item.maxScore}">
                  <span class="score-denom">/${item.maxScore}</span>
                  ${isAutomated ? `<button type="button" class="btn-cancel-edit-inline" data-item-id="${item.itemVersionId}" title="Đóng sửa inline">${ICONS.close}</button>` : ''}
                </div>
                ${item.isOverridden ? '<div class="badge-manual-override">Đã sửa tay</div>' : ''}
              </div>
            `;
          } else {
            tdScore.innerHTML = `
              <div class="col-score-cell">
                <div class="table-grade-score-wrap">
                  <span class="score-fraction">${currentScoreVal !== undefined && currentScoreVal !== null ? currentScoreVal : item.scoreEarned}/${item.maxScore}</span>
                  <button type="button" class="btn-edit-score-inline" data-item-id="${item.itemVersionId}" title="Sửa điểm câu này">${ICONS.edit} <span>Sửa</span></button>
                </div>
                ${item.isOverridden ? '<div class="badge-manual-override">Đã sửa tay</div>' : ''}
              </div>
            `;
          }
          tr.append(tdScore);

          // 7. Feedback Column
          const tdFeedback = document.createElement('td');
          tdFeedback.className = 'col-feedback';
          const currentFeedbackVal = typeof item.draftFeedback === 'string'
            ? item.draftFeedback
            : (item.draftFeedback?.comment ?? (item.manualReview && typeof item.feedback === 'object' ? (item.feedback?.comment || '') : ''));

          if (!isAutomated || isInlineEditing) {
            tdFeedback.innerHTML = `
              <textarea class="grade-feedback-input table-feedback-input" data-item-id="${item.itemVersionId}" placeholder="Nhận xét...">${escapeHtml(currentFeedbackVal)}</textarea>
            `;
          } else {
            const commentText = currentFeedbackVal || item.feedback?.comment || '';
            tdFeedback.innerHTML = `<span class="table-comment-text">${escapeHtml(commentText) || '—'}</span>`;
          }
          tr.append(tdFeedback);

          // 8. Action Column
          const tdAction = document.createElement('td');
          tdAction.className = 'col-action';
          tdAction.innerHTML = `<button type="button" class="btn-inspect-item" data-item-id="${item.itemVersionId}">${ICONS.view} <span>Xem</span></button>`;
          tr.append(tdAction);

          detailItemsBody.append(tr);
        }
      }

      // Attach event listeners for prompt opt buttons and inspect item buttons
      detailItemsBody.querySelectorAll('.prompt-opt-btn, .btn-inspect-item').forEach(btn => {
        lifecycle.listen(btn, 'click', () => {
          const itm = items.find(i => i.itemVersionId === btn.dataset.itemId);
          if (itm) openItemContextModal(itm);
        });
      });

      // Attach click listeners for inline edit and cancel buttons
      detailItemsBody.querySelectorAll('.btn-edit-score-inline').forEach(btn => {
        lifecycle.listen(btn, 'click', () => {
          const itm = items.find(i => i.itemVersionId === btn.dataset.itemId);
          if (itm) {
            itm._isEditingInline = true;
            renderAttemptTableRows(viewState.currentSkillTab);
            const inp = detailItemsBody.querySelector(`.grade-score-input[data-item-id="${itm.itemVersionId}"]`);
            if (inp) inp.focus();
          }
        });
      });

      detailItemsBody.querySelectorAll('.btn-cancel-edit-inline').forEach(btn => {
        lifecycle.listen(btn, 'click', () => {
          const itm = items.find(i => i.itemVersionId === btn.dataset.itemId);
          if (itm) {
            itm._isEditingInline = false;
            renderAttemptTableRows(viewState.currentSkillTab);
          }
        });
      });

      // Attach auto-save listener on table score and feedback inputs
      const scoreInputs = detailItemsBody.querySelectorAll('.grade-score-input');
      const feedbackInputs = detailItemsBody.querySelectorAll('.grade-feedback-input');
      [...scoreInputs, ...feedbackInputs].forEach(inp => {
        lifecycle.listen(inp, 'input', () => {
          const itm = items.find(i => i.itemVersionId === inp.dataset.itemId);
          if (itm) {
            if (inp.classList.contains('grade-score-input')) {
              const val = inp.value.trim();
              if (val !== '') {
                const num = Number(val);
                itm.draftScore = num;
                itm.isOverridden = true;
                if (Number.isFinite(num)) {
                  itm.verdict = num >= itm.maxScore ? 'correct' : (num > 0 ? 'partial' : 'incorrect');
                  const row = inp.closest('tr');
                  if (row) {
                    const badge = row.querySelector('.verdict-badge');
                    if (badge) {
                      badge.className = `verdict-badge ${itm.verdict}`;
                      badge.textContent = verdictLabel(itm.verdict);
                    }
                  }
                }
              } else {
                itm.draftScore = null;
              }
            } else if (inp.classList.contains('grade-feedback-input')) {
              itm.draftFeedback = inp.value;
            }
          }
          lifecycle.clearTimeout(viewState.autoSaveTimeout);
          viewState.autoSaveTimeout = lifecycle.timeout(() => {
            saveManualGradingDraft(true).catch(() => {});
          }, 1500);
        });
      });
    }

    function renderSkillSummary(tabCode = 'all') {
      if (!skillSummaryCard || !viewState.currentAttemptDetail) return;
      const skillsData = extractAttemptSkills(viewState.currentAttemptDetail.items);
      const summary = skillsData.summary[tabCode] || skillsData.summary['all'];

      const titleText = tabCode === 'all'
        ? 'Tất cả kỹ năng'
        : `Kỹ năng ${summary.label || tabCode.toUpperCase()}`;

      skillSummaryCard.innerHTML = `
        <div class="skill-summary-title">${escapeHtml(titleText)} (${summary.totalItems} câu)</div>
        <div class="skill-summary-metrics">
          <span class="skill-summary-score">${summary.scoreEarned}/${summary.maxScore} điểm</span>
          ${summary.needsReviewCount > 0 ? `<span class="verdict-badge manual_review">${summary.needsReviewCount} câu cần duyệt</span>` : '<span class="verdict-badge correct">Đã chấm xong</span>'}
        </div>
      `;
    }

    function renderSkillTabs() {
      if (!attemptSkillTabs || !viewState.currentAttemptDetail) return;
      attemptSkillTabs.replaceChildren();

      const skillsData = extractAttemptSkills(viewState.currentAttemptDetail.items);
      const allSummary = skillsData.summary['all'];

      // 1. "All" tab button
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className = `skill-tab-btn${viewState.currentSkillTab === 'all' ? ' active' : ''}`;
      allBtn.innerHTML = `
        <span>Tất cả</span>
        <span class="tab-count">${allSummary.totalItems}</span>
        ${allSummary.needsReviewCount > 0 ? `<span class="tab-review-pill">${allSummary.needsReviewCount} cần duyệt</span>` : ''}
      `;
      lifecycle.listen(allBtn, 'click', () => {
        viewState.currentSkillTab = 'all';
        attemptSkillTabs.querySelectorAll('.skill-tab-btn').forEach(b => b.classList.remove('active'));
        allBtn.classList.add('active');
        renderSkillSummary('all');
        renderAttemptTableRows('all');
      });
      attemptSkillTabs.append(allBtn);

      // 2. Each skill tab button
      for (const skill of skillsData.skills) {
        const skillBtn = document.createElement('button');
        skillBtn.type = 'button';
        skillBtn.className = `skill-tab-btn${viewState.currentSkillTab === skill.code ? ' active' : ''}`;
        skillBtn.innerHTML = `
          <span>${escapeHtml(skill.label)}</span>
          <span class="tab-count">${skill.totalItems}</span>
          ${skill.needsReviewCount > 0 ? `<span class="tab-review-pill">${skill.needsReviewCount} cần duyệt</span>` : ''}
        `;
        lifecycle.listen(skillBtn, 'click', () => {
          viewState.currentSkillTab = skill.code;
          attemptSkillTabs.querySelectorAll('.skill-tab-btn').forEach(b => b.classList.remove('active'));
          skillBtn.classList.add('active');
          renderSkillSummary(skill.code);
          renderAttemptTableRows(skill.code);
        });
        attemptSkillTabs.append(skillBtn);
      }
    }

    viewState.currentSkillTab = 'all';
    renderSkillTabs();
    renderSkillSummary(viewState.currentSkillTab);
    renderAttemptTableRows(viewState.currentSkillTab);

    // Keep detailItems container synchronized for compatibility
    if (detailItems) {
      detailItems.replaceChildren();
    }

    if (publishResultBtn) {
      if (payload.attempt.status === 'active') {
        publishResultBtn.disabled = true;
        publishResultBtn.title = 'Chưa thể công bố bài khi học viên chưa nộp';
      } else {
        publishResultBtn.disabled = false;
        publishResultBtn.title = '';
      }
      publishResultBtn.textContent = payload.attempt.publication?.published ? 'Công bố lại' : 'Công bố kết quả';
    }

    if (drawerBackdrop) drawerBackdrop.hidden = false;
    attemptDetail.hidden = false;
    attemptDetail.classList.add('drawer-open');
    if (results) results.hidden = false;
  }

function showConflictAlert(msg) {
    if (!conflictAlert) return;
    conflictAlert.replaceChildren();
    const span = document.createElement('span');
    span.innerHTML = `${ICONS.alert} <span>${escapeHtml(msg)}</span>`;
    const reloadBtn = document.createElement('button');
    reloadBtn.type = 'button';
    reloadBtn.className = 'btn-secondary';
    reloadBtn.textContent = 'Tải lại bài làm';
    lifecycle.listen(reloadBtn, 'click', () => {
      loadAttemptDetail(state.classId, state.assignmentId, state.attemptId).catch(err => {
        status.textContent = err.message;
      });
    });
    conflictAlert.append(span, reloadBtn);
    conflictAlert.hidden = false;
  }

async function saveManualGradingDraft(silent = false) {
    if (!viewState.currentAttemptDetail) return;
    const itemsToSubmit = [];
    const feedbackMap = new Map();
    const scoresMap = {};

    // 1. Populate from items in memory
    for (const itm of viewState.currentAttemptDetail.items) {
      if (itm._resetOverride) {
        itemsToSubmit.push({
          itemVersionId: itm.itemVersionId,
          scoreEarned: null,
          reset: true
        });
        delete itm._resetOverride;
        continue;
      }
      if (itm.canGrade) {
        const scoreVal = itm.draftScore !== null && itm.draftScore !== undefined
          ? itm.draftScore
          : (itm.manualReview && itm.scoreEarned !== null ? itm.scoreEarned : null);
        const feedbackVal = typeof itm.draftFeedback === 'string'
          ? itm.draftFeedback
          : (itm.draftFeedback?.comment ?? (itm.manualReview && typeof itm.feedback === 'object' ? (itm.feedback?.comment || '') : null));

        if (scoreVal !== null && scoreVal !== undefined) {
          scoresMap[itm.itemVersionId] = Number(scoreVal);
          itemsToSubmit.push({
            itemVersionId: itm.itemVersionId,
            scoreEarned: Number(scoreVal),
            feedback: feedbackVal || null
          });
        }
      }
    }

    // 2. Override with active inputs in DOM
    const scoreInputs = attemptDetail.querySelectorAll('.grade-score-input');
    const feedbackInputs = attemptDetail.querySelectorAll('.grade-feedback-input');
    feedbackInputs.forEach(input => {
      feedbackMap.set(input.dataset.itemId, input.value.trim());
    });
    scoreInputs.forEach(input => {
      const val = input.value.trim();
      if (val !== '') {
        const num = Number(val);
        scoresMap[input.dataset.itemId] = num;
        const existingIdx = itemsToSubmit.findIndex(it => it.itemVersionId === input.dataset.itemId);
        const itemObj = {
          itemVersionId: input.dataset.itemId,
          scoreEarned: num,
          feedback: feedbackMap.get(input.dataset.itemId) || null
        };
        if (existingIdx >= 0) {
          itemsToSubmit[existingIdx] = itemObj;
        } else {
          itemsToSubmit.push(itemObj);
        }
      }
    });

    for (const itm of viewState.currentAttemptDetail.items) {
      if (scoresMap[itm.itemVersionId] !== undefined) {
        const num = scoresMap[itm.itemVersionId];
        if (!Number.isFinite(num) || num < 0 || num > itm.maxScore) {
          if (!silent && status) status.textContent = `Điểm câu ${itm.position} không hợp lệ (0 - ${itm.maxScore}).`;
          return;
        }
      }
    }

    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang lưu nháp...';
    try {
      const response = await fetch(`${apiBase()}${manualGradingDraftPath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          baseRevision: viewState.currentAttemptDetail.manualGrading?.revision ?? 0,
          items: itemsToSubmit,
          note: 'Lưu nháp từ Dashboard'
        })
      });
      const payload = await response.json();
      if (response.status === 409) {
        showConflictAlert(payload.message || 'Xung đột: Bài làm đã được cập nhật bởi người khác.');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể lưu nháp.');
      }
      viewState.currentAttemptDetail.manualGrading.revision = payload.revision;
      viewState.currentAttemptDetail.manualGrading.status = 'draft';
      if (draftStatusMsg) {
        draftStatusMsg.textContent = `Đã lưu nháp lúc ${formatCurrentTime()} (phiên bản ${payload.revision})`;
      }
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi lưu nháp: ${err.message}`;
    }
  }

async function completeManualGrading() {
    if (!viewState.currentAttemptDetail) return;
    const itemsToSubmit = [];
    const feedbackMap = new Map();
    const scoresMap = {};

    // 1. Populate from items in memory
    for (const itm of viewState.currentAttemptDetail.items) {
      if (itm.canGrade) {
        const scoreVal = itm.draftScore !== null && itm.draftScore !== undefined
          ? itm.draftScore
          : (itm.manualReview && itm.scoreEarned !== null ? itm.scoreEarned : null);
        const feedbackVal = typeof itm.draftFeedback === 'string'
          ? itm.draftFeedback
          : (itm.draftFeedback?.comment ?? (itm.manualReview && typeof itm.feedback === 'object' ? (itm.feedback?.comment || '') : null));

        if (scoreVal !== null && scoreVal !== undefined) {
          scoresMap[itm.itemVersionId] = Number(scoreVal);
          itemsToSubmit.push({
            itemVersionId: itm.itemVersionId,
            scoreEarned: Number(scoreVal),
            feedback: feedbackVal || null
          });
        }
      }
    }

    // 2. Override with active inputs in DOM
    const scoreInputs = attemptDetail.querySelectorAll('.grade-score-input');
    const feedbackInputs = attemptDetail.querySelectorAll('.grade-feedback-input');
    feedbackInputs.forEach(input => {
      feedbackMap.set(input.dataset.itemId, input.value.trim());
    });
    scoreInputs.forEach(input => {
      const val = input.value.trim();
      if (val !== '') {
        const num = Number(val);
        scoresMap[input.dataset.itemId] = num;
        const existingIdx = itemsToSubmit.findIndex(it => it.itemVersionId === input.dataset.itemId);
        const itemObj = {
          itemVersionId: input.dataset.itemId,
          scoreEarned: num,
          feedback: feedbackMap.get(input.dataset.itemId) || null
        };
        if (existingIdx >= 0) {
          itemsToSubmit[existingIdx] = itemObj;
        } else {
          itemsToSubmit.push(itemObj);
        }
      }
    });

    const validation = validateManualGradingScores(viewState.currentAttemptDetail.items, scoresMap);
    if (!validation.valid) {
      alert(validation.message);
      if (status) status.textContent = validation.message;
      return;
    }

    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang hoàn tất chấm...';
    try {
      const response = await fetch(`${apiBase()}${manualGradingCompletePath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({
          baseRevision: viewState.currentAttemptDetail.manualGrading?.revision ?? 0,
          items: itemsToSubmit,
          note: 'Xác nhận hoàn tất chấm'
        })
      });
      const payload = await response.json();
      if (response.status === 409) {
        showConflictAlert(payload.message || 'Xung đột: Bài làm đã được cập nhật bởi người khác.');
        return;
      }
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể hoàn tất chấm.');
      }
      alert('Đã hoàn tất chấm bài thành công!');
      await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi: ${err.message}`;
    }
  }

async function publishAttemptResult() {
    if (!state.classId || !state.assignmentId || !state.attemptId) return;
    if (draftStatusMsg) draftStatusMsg.textContent = 'Đang công bố kết quả…';
    try {
      const response = await fetch(`${apiBase()}${attemptPublishPath(state.classId, state.assignmentId, state.attemptId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ note: 'Công bố kết quả' })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể công bố kết quả.');
      }
      alert('Đã công bố kết quả thành công!');
      if (draftStatusMsg) draftStatusMsg.textContent = `Đã công bố kết quả lúc ${formatCurrentTime()}`;
      await loadAttemptDetail(state.classId, state.assignmentId, state.attemptId);
    } catch (err) {
      if (draftStatusMsg) draftStatusMsg.textContent = `Lỗi công bố: ${err.message}`;
    }
  }

function closeAttemptDetail() {
    queryCoordinator.cancel('attemptDetail');
    if (attemptDetail) {
      attemptDetail.classList.remove('drawer-open');
      attemptDetail.hidden = true;
    }
    if (drawerBackdrop) {
      drawerBackdrop.hidden = true;
    }
    if (results) {
      results.hidden = false;
    }
    delete state.attemptId;
    setUrl();
    loadResults(state.classId, state.assignmentId).catch(() => {});
  }
  return { renderAttemptDetail, showConflictAlert, saveManualGradingDraft, completeManualGrading, publishAttemptResult, closeAttemptDetail };
}
