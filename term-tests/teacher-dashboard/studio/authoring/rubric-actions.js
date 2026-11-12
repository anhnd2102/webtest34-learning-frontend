export function bindRubricActions({ container, draftState, render, syncInputs }) {
    // Preset switch handler
    const presetSelects = container.querySelectorAll('.select-rubric-preset');
    presetSelects.forEach(sel => {
      sel.addEventListener('change', () => {
        syncInputs();
        const bIdx = Number(sel.getAttribute('data-block-idx'));
        const iIdx = Number(sel.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const val = sel.value;
        const currentScore = item.maxScore || 4;

        if (val === 'translation') {
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_translation_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-translation-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'meaning', label: 'Ý nghĩa (Meaning)', maxScore: currentScore / 2, requiredConcepts: [] },
                { id: 'grammar', label: 'Ngữ pháp (Grammar)', maxScore: currentScore / 2, requiredConcepts: [] }
              ]
            }
          };
        } else if (val === 'speaking') {
          const s1 = Math.round(currentScore * 0.4 * 10) / 10;
          const s2 = Math.round(currentScore * 0.3 * 10) / 10;
          const s3 = Math.round((currentScore - s1 - s2) * 10) / 10;
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_speaking_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-speaking-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'idea', label: 'Ý tưởng & Phát triển (Idea Development)', maxScore: s1, requiredConcepts: [] },
                { id: 'vocabulary', label: 'Từ vựng & Diễn đạt (Vocabulary)', maxScore: s2, requiredConcepts: [] },
                { id: 'coherence', label: 'Ngữ pháp & Mạch lạc (Grammar & Coherence)', maxScore: s3, requiredConcepts: [] }
              ]
            }
          };
        } else if (val === 'comprehension') {
          const targetEx = draftState.blocks[bIdx]?.exercises?.find(e => e.exerciseId === item.exerciseId);
          if (targetEx) {
            targetEx.exerciseType = 'comprehension';
          }
          const s1 = Math.round(currentScore * 0.7 * 10) / 10;
          const s2 = Math.round((currentScore - s1) * 10) / 10;
          draftState.gradingKey.items[item.itemVersionId] = {
            graderType: 'rubric_async',
            rubricCode: 'rubric_comprehension_v1',
            rubricVersion: 1,
            rubric: {
              scoringVersion: 'rubric-comprehension-v1',
              maxScore: currentScore,
              criteria: [
                { id: 'comprehension', label: 'Mức độ hiểu nội dung (Comprehension)', maxScore: s1, requiredConcepts: [] },
                { id: 'keywords', label: 'Từ khóa & Khái niệm cốt lõi (Keywords)', maxScore: s2, requiredConcepts: [] }
              ]
            }
          };
        }
        render();
      });
    });

    // Tab switch handler inside Rubric card
    const rubricTabs = container.querySelectorAll('.btn-rubric-tab');
    rubricTabs.forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tab = tabBtn.getAttribute('data-tab');
        const bIdx = tabBtn.getAttribute('data-block-idx');
        const iIdx = tabBtn.getAttribute('data-item-idx');
        const card = tabBtn.closest('.builder-item-card');
        if (!card) return;

        card.querySelectorAll('.btn-rubric-tab').forEach(b => b.classList.remove('active'));
        tabBtn.classList.add('active');

        const criteriaPane = card.querySelector(`#pane-criteria-${bIdx}-${iIdx}`);
        const guidancePane = card.querySelector(`#pane-guidance-${bIdx}-${iIdx}`);
        const sandboxPane = card.querySelector(`#pane-sandbox-${bIdx}-${iIdx}`);

        if (criteriaPane) criteriaPane.hidden = tab !== 'criteria';
        if (guidancePane) guidancePane.hidden = tab !== 'guidance';
        if (sandboxPane) sandboxPane.hidden = tab !== 'sandbox';
      });
    });

    // Add Criterion handler
    const addCriterionBtns = container.querySelectorAll('.btn-add-criterion');
    addCriterionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (!currentKey || !currentKey.rubric) return;

        const nextNum = (currentKey.rubric.criteria?.length || 0) + 1;
        currentKey.rubric.criteria = currentKey.rubric.criteria || [];
        currentKey.rubric.criteria.push({
          id: `criterion_${nextNum}`,
          label: `Tiêu chí ${nextNum}`,
          maxScore: 1,
          requiredConcepts: []
        });
        const total = currentKey.rubric.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
        currentKey.rubric.maxScore = total;
        item.maxScore = total;
        render();
      });
    });

    // Delete Criterion handler
    const delCriterionBtns = container.querySelectorAll('.btn-del-criterion');
    delCriterionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        syncInputs();
        const bIdx = Number(btn.getAttribute('data-block-idx'));
        const iIdx = Number(btn.getAttribute('data-item-idx'));
        const cIdx = Number(btn.getAttribute('data-criterion-idx'));
        const item = draftState.blocks[bIdx]?.items?.[iIdx];
        if (!item) return;
        const currentKey = draftState.gradingKey.items[item.itemVersionId];
        if (currentKey && currentKey.rubric && currentKey.rubric.criteria && currentKey.rubric.criteria.length > 1) {
          currentKey.rubric.criteria.splice(cIdx, 1);
          const total = currentKey.rubric.criteria.reduce((sum, c) => sum + (c.maxScore || 0), 0);
          currentKey.rubric.maxScore = total;
          item.maxScore = total;
          render();
        } else {
          alert('Rubric phải có ít nhất 1 tiêu chí chấm điểm.');
        }
      });
    });
}
