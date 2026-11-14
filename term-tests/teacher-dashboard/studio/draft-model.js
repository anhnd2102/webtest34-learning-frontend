// NGUỒN: file .ts này; draft-model.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
import { normalizeSkillCode, CANONICAL_SKILL_LABELS } from '../ui/presentation.js';
import { parseClozeBlanks } from './content-import.js';
export { parseClozeBlanks };
export function pruneOrphanClozeKeys(item, itemKey = null) {
    if (!item || !item.prompt)
        return;
    const blanksFromPrompt = parseClozeBlanks(item.prompt || '');
    if (blanksFromPrompt.length === 0)
        return;
    const validNumbers = new Set(blanksFromPrompt.map(b => String(b.number)));
    if (item.clozeAnswers && typeof item.clozeAnswers === 'object') {
        for (const k of Object.keys(item.clozeAnswers)) {
            if (!validNumbers.has(String(k))) {
                delete item.clozeAnswers[k];
            }
        }
    }
    if (itemKey && itemKey.blanks && typeof itemKey.blanks === 'object') {
        for (const k of Object.keys(itemKey.blanks)) {
            if (!validNumbers.has(String(k))) {
                delete itemKey.blanks[k];
            }
        }
    }
}
export function getItemSpanCount(item) {
    if (!item)
        return 1;
    const isListeningOrder = item.pedagogicalTypeCode === 'listening_order' ||
        item.layoutType === 'timeline_sequence' ||
        item.graderType === 'ordered_sequence' ||
        (Array.isArray(item.events) && item.events.length > 0);
    if (isListeningOrder) {
        return Math.max(1, Array.isArray(item.events) ? item.events.length : 1);
    }
    const isInlineCloze = item.pedagogicalTypeCode === 'inline_cloze' ||
        item.layoutType === 'inline_cloze' ||
        item.layoutType === 'table_completion' ||
        item.layoutType === 'inline_dropdown_table' ||
        (item.interactionType === 'short_text' && ((item.prompt && (/(?:\((\d+)\)\s*[_.\u2026]{2,})|(?:\{\{(\d+)\}\})/.test(item.prompt))) ||
            (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0)));
    if (isInlineCloze) {
        const blanksFromPrompt = parseClozeBlanks(item.prompt || '');
        if (blanksFromPrompt.length > 0) {
            const uniqueNums = new Set(blanksFromPrompt.map(b => Number(b.number)));
            return Math.max(1, uniqueNums.size);
        }
        if (item.clozeAnswers && typeof item.clozeAnswers === 'object' && Object.keys(item.clozeAnswers).length > 0) {
            return Object.keys(item.clozeAnswers).length;
        }
        return 1;
    }
    return 1;
}
export function scaleRubricCriteriaScores(criteria, newTotalScore) {
    if (!Array.isArray(criteria) || criteria.length === 0)
        return criteria;
    const targetTotal = Math.round(Number(newTotalScore) * 100) / 100;
    if (targetTotal <= 0 || isNaN(targetTotal))
        return criteria;
    const currentSum = criteria.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
    const baseSum = currentSum > 0 ? currentSum : criteria.length;
    let allocatedSum = 0;
    return criteria.map((c, idx) => {
        if (idx === criteria.length - 1) {
            const remaining = Math.round((targetTotal - allocatedSum) * 100) / 100;
            return { ...c, maxScore: Math.max(0, remaining) };
        }
        const weight = currentSum > 0 ? ((Number(c.maxScore) || 0) / baseSum) : (1 / criteria.length);
        const score = Math.round((weight * targetTotal) * 100) / 100;
        allocatedSum += score;
        return { ...c, maxScore: score };
    });
}
export function isComprehensionExercise(exercise, block, gradingKey) {
    if (!exercise)
        return false;
    if (exercise.exerciseType === 'comprehension')
        return true;
    if (Boolean(exercise.referenceContext && exercise.referenceContext.trim()))
        return true;
    const items = (block?.items || []).filter(it => it.exerciseId === exercise.exerciseId);
    return items.some(it => {
        if (it.graderType !== 'rubric_async')
            return false;
        const key = gradingKey?.items?.[it.itemVersionId];
        const scoringVer = String(key?.rubric?.scoringVersion || it.rubricCode || '');
        return scoringVer.includes('comprehension') || it.rubricCode === 'rubric_comprehension_v1';
    });
}
export function findPrecedingClozeScript(draftState, currentBlockIdx) {
    if (!draftState || !Array.isArray(draftState.blocks))
        return '';
    for (let b = currentBlockIdx; b >= 0; b--) {
        const block = draftState.blocks[b];
        if (!block)
            continue;
        const clozeItem = (block.items || []).find(it => it.layoutType === 'inline_cloze' ||
            it.pedagogicalTypeCode === 'inline_cloze' ||
            it.pedagogicalTypeCode === 'table_completion' ||
            /(?:\(\d+\)\s*[_\.\u2026]{2,})|(?:\{\{\d+\}\})/i.test(it.prompt || ''));
        if (clozeItem && clozeItem.prompt) {
            return clozeItem.prompt
                .replace(/<[^>]+>/g, ' ')
                .replace(/(?:\(\d+\)\s*[_\.\u2026]{2,})|(?:\{\{\d+\}\})/g, '...')
                .replace(/\s+/g, ' ')
                .trim();
        }
        if (block.readingPassage || block.stimulusReadingPassage) {
            return (block.readingPassage || block.stimulusReadingPassage).trim();
        }
    }
    return '';
}
export function updatePromptPosition(prompt, newPos, span = 1) {
    if (typeof prompt !== 'string')
        return prompt;
    let updated = prompt;
    const posStr = (span > 1) ? `${newPos} – ${newPos + span - 1}` : `${newPos}`;
    if (/^Câu hỏi \d+(?:\s*[–\-]\s*\d+)?(:?)/i.test(updated)) {
        updated = updated.replace(/^Câu hỏi \d+(?:\s*[–\-]\s*\d+)?(:?)/i, `Câu hỏi ${posStr}$1`);
    }
    else if (/^Câu \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i.test(updated)) {
        updated = updated.replace(/^Câu \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i, `Câu ${posStr}$1`);
    }
    else if (/^Question \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i.test(updated)) {
        updated = updated.replace(/^Question \d+(?:\s*[–\-]\s*\d+)?([:.]?)/i, `Question ${posStr}$1`);
    }
    else if (/^Điền vào ô trống câu \d+(?:\s*[–\-]\s*\d+)?(:?)/i.test(updated)) {
        updated = updated.replace(/^Điền vào ô trống câu \d+(?:\s*[–\-]\s*\d+)?(:?)/i, `Điền vào ô trống câu ${posStr}$1`);
    }
    else if (/^Từ vựng qua ảnh \d+/i.test(updated)) {
        updated = updated.replace(/^Từ vựng qua ảnh \d+/i, `Từ vựng qua ảnh ${newPos}`);
    }
    else if (/^Từ vựng câu \d+/i.test(updated)) {
        updated = updated.replace(/^Từ vựng câu \d+/i, `Từ vựng câu ${newPos}`);
    }
    else if (/^Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi \d+(:?)/i.test(updated)) {
        updated = updated.replace(/^Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi \d+(:?)/i, `Dịch câu sau sang tiếng Anh hoặc trả lời câu hỏi ${newPos}$1`);
    }
    else if (span === 1 && /\(\d+\) __________/i.test(updated)) {
        updated = updated.replace(/\(\d+\) __________/i, `(${newPos}) __________`);
    }
    return updated;
}
export function insertItemsIntoBlockExercise(block, targetEx, newItems) {
    if (!block)
        return;
    const itemsList = Array.isArray(newItems) ? newItems : (newItems ? [newItems] : []);
    if (!itemsList.length)
        return;
    block.items = block.items || [];
    for (const itm of itemsList) {
        if (targetEx) {
            itm.exerciseId = targetEx.exerciseId;
            itm.exerciseTitle = targetEx.title;
        }
    }
    if (!targetEx || !Array.isArray(block.exercises) || block.exercises.length <= 1) {
        block.items.push(...itemsList);
        return;
    }
    // 1. Check if targetEx already has items in block.items
    let lastItemIndex = -1;
    for (let i = block.items.length - 1; i >= 0; i--) {
        if (block.items[i].exerciseId === targetEx.exerciseId) {
            lastItemIndex = i;
            break;
        }
    }
    if (lastItemIndex !== -1) {
        block.items.splice(lastItemIndex + 1, 0, ...itemsList);
        return;
    }
    // 2. targetEx has no items yet in block.items:
    // Determine targetEx's position among block.exercises
    const targetExIdx = block.exercises.findIndex(e => e.exerciseId === targetEx.exerciseId);
    if (targetExIdx > 0) {
        let precedingLastIndex = -1;
        for (let p = targetExIdx - 1; p >= 0; p--) {
            const prevEx = block.exercises[p];
            for (let i = block.items.length - 1; i >= 0; i--) {
                if (block.items[i].exerciseId === prevEx.exerciseId) {
                    precedingLastIndex = i;
                    break;
                }
            }
            if (precedingLastIndex !== -1)
                break;
        }
        if (precedingLastIndex !== -1) {
            block.items.splice(precedingLastIndex + 1, 0, ...itemsList);
            return;
        }
    }
    // 3. If targetEx is the first exercise (index 0) and has no items yet,
    // or no preceding items found, check if there are succeeding exercises:
    if (targetExIdx !== -1) {
        for (let s = targetExIdx + 1; s < block.exercises.length; s++) {
            const nextEx = block.exercises[s];
            const firstNextIndex = block.items.findIndex(it => it.exerciseId === nextEx.exerciseId);
            if (firstNextIndex !== -1) {
                block.items.splice(firstNextIndex, 0, ...itemsList);
                return;
            }
        }
    }
    // Fallback: append to the end of block.items
    block.items.push(...itemsList);
}
export function reorderBlockItem(draftState, sourceBlockIdx, sourceItemIdx, targetBlockIdx, targetItemIdx, positionAbove = false, targetExerciseId = null) {
    const sourceBlock = draftState?.blocks?.[sourceBlockIdx];
    const targetBlock = draftState?.blocks?.[targetBlockIdx];
    if (!sourceBlock || !targetBlock || !sourceBlock.items || !targetBlock.items)
        return null;
    if (sourceBlockIdx === targetBlockIdx && sourceItemIdx === targetItemIdx) {
        return sourceBlock.items[sourceItemIdx] || null;
    }
    const [movedItem] = sourceBlock.items.splice(sourceItemIdx, 1);
    if (!movedItem)
        return null;
    let insertIdx = targetItemIdx;
    if (sourceBlockIdx === targetBlockIdx) {
        if (sourceItemIdx < targetItemIdx) {
            insertIdx = positionAbove ? targetItemIdx - 1 : targetItemIdx;
        }
        else {
            insertIdx = positionAbove ? targetItemIdx : targetItemIdx + 1;
        }
    }
    else {
        insertIdx = positionAbove ? targetItemIdx : targetItemIdx + 1;
    }
    insertIdx = Math.max(0, Math.min(targetBlock.items.length, insertIdx));
    if (targetExerciseId) {
        movedItem.exerciseId = targetExerciseId;
        const targetExObj = (targetBlock.exercises || []).find(ex => ex.exerciseId === targetExerciseId);
        if (targetExObj) {
            movedItem.exerciseTitle = targetExObj.title;
        }
    }
    targetBlock.items.splice(insertIdx, 0, movedItem);
    return movedItem;
}
export function moveItemToExercise(draftState, sourceBlockIdx, sourceItemIdx, targetBlockIdx, targetExerciseId) {
    const sourceBlock = draftState?.blocks?.[sourceBlockIdx];
    const targetBlock = draftState?.blocks?.[targetBlockIdx];
    if (!sourceBlock || !targetBlock || !sourceBlock.items)
        return null;
    const [movedItem] = sourceBlock.items.splice(sourceItemIdx, 1);
    if (!movedItem)
        return null;
    const targetExObj = (targetBlock.exercises || []).find(ex => ex.exerciseId === targetExerciseId);
    insertItemsIntoBlockExercise(targetBlock, targetExObj, movedItem);
    return movedItem;
}
export function computeTestBuilderScoreSummary(blocks = []) {
    let totalScore = 0;
    let totalQuestions = 0;
    const canonicalSkills = {
        listening: { code: 'listening', label: 'Listening', score: 0, count: 0, firstBlockIdx: null },
        reading: { code: 'reading', label: 'Reading', score: 0, count: 0, firstBlockIdx: null },
        writing: { code: 'writing', label: 'Writing', score: 0, count: 0, firstBlockIdx: null },
        speaking: { code: 'speaking', label: 'Speaking', score: 0, count: 0, firstBlockIdx: null }
    };
    const extraSkills = {};
    const safeBlocks = Array.isArray(blocks) ? blocks : [];
    for (let bIdx = 0; bIdx < safeBlocks.length; bIdx++) {
        const block = safeBlocks[bIdx];
        const bTitle = block.title || '';
        for (const item of (block.items || [])) {
            const span = getItemSpanCount(item);
            const score = Number(item.maxScore) || 0;
            totalScore += score;
            totalQuestions += span;
            const rawSkill = (Array.isArray(item.skillCodes) && item.skillCodes[0]) || item.primarySkill || '';
            const normSkill = normalizeSkillCode(rawSkill, bTitle);
            if (canonicalSkills[normSkill]) {
                canonicalSkills[normSkill].score += score;
                canonicalSkills[normSkill].count += span;
                if (canonicalSkills[normSkill].firstBlockIdx === null) {
                    canonicalSkills[normSkill].firstBlockIdx = bIdx;
                }
            }
            else {
                if (!extraSkills[normSkill]) {
                    const lbl = CANONICAL_SKILL_LABELS[normSkill] || (normSkill.charAt(0).toUpperCase() + normSkill.slice(1));
                    extraSkills[normSkill] = { code: normSkill, label: lbl, score: 0, count: 0, firstBlockIdx: bIdx };
                }
                extraSkills[normSkill].score += score;
                extraSkills[normSkill].count += span;
            }
        }
    }
    totalScore = Math.round(totalScore * 10) / 10;
    for (const k of Object.keys(canonicalSkills)) {
        canonicalSkills[k].score = Math.round(canonicalSkills[k].score * 10) / 10;
    }
    for (const k of Object.keys(extraSkills)) {
        extraSkills[k].score = Math.round(extraSkills[k].score * 10) / 10;
    }
    return {
        totalScore,
        totalQuestions,
        skills: [
            canonicalSkills.listening,
            canonicalSkills.reading,
            canonicalSkills.writing,
            canonicalSkills.speaking,
            ...Object.values(extraSkills).filter(s => s.count > 0 || s.score > 0)
        ]
    };
}
export function resequenceItemPositions(draftState, options = {}) {
    if (!draftState || !Array.isArray(draftState.blocks))
        return;
    const forceStartAtOne = options.forceStartAtOne ?? false;
    const firstPos = draftState.blocks[0]?.items?.[0]?.position;
    let pos = (!forceStartAtOne && typeof firstPos === 'number' && firstPos > 2) ? firstPos : 1;
    for (const b of draftState.blocks) {
        for (const itm of b.items || []) {
            pruneOrphanClozeKeys(itm, draftState.gradingKey?.items?.[itm.itemVersionId]);
            const span = getItemSpanCount(itm);
            itm.spanCount = span;
            itm.position = pos;
            if (itm.prompt) {
                itm.prompt = updatePromptPosition(itm.prompt, pos, span);
            }
            pos += span;
        }
        for (const ex of b.exercises || []) {
            ex.itemIds = (b.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
        }
    }
}
export function moveExerciseBetweenBlocks(draftState, { sourceBlockIdx, exerciseId, targetBlockIdx, insertIndex = -1 }) {
    const sourceBlock = draftState?.blocks?.[sourceBlockIdx];
    const targetBlock = draftState?.blocks?.[targetBlockIdx];
    if (!sourceBlock || !targetBlock || !sourceBlock.exercises || !targetBlock.exercises)
        return false;
    // 1. Find and extract the exercise from sourceBlock
    const exIdx = sourceBlock.exercises.findIndex(e => e.exerciseId === exerciseId);
    if (exIdx === -1)
        return false;
    const [exerciseToMove] = sourceBlock.exercises.splice(exIdx, 1);
    // 2. Extract all items belonging to this exercise from sourceBlock.items
    sourceBlock.items = sourceBlock.items || [];
    const movedItems = [];
    const remainingSourceItems = [];
    sourceBlock.items.forEach(it => {
        if (it.exerciseId === exerciseId) {
            movedItems.push(it);
        }
        else {
            remainingSourceItems.push(it);
        }
    });
    sourceBlock.items = remainingSourceItems;
    // 3. Determine target exercise insert index
    targetBlock.exercises = targetBlock.exercises || [];
    let exInsertIdx = insertIndex;
    if (exInsertIdx < 0 || exInsertIdx > targetBlock.exercises.length) {
        exInsertIdx = targetBlock.exercises.length;
    }
    targetBlock.exercises.splice(exInsertIdx, 0, exerciseToMove);
    // 4. Determine item insert index in targetBlock.items
    targetBlock.items = targetBlock.items || [];
    let itemInsertIdx = targetBlock.items.length;
    if (exInsertIdx === 0) {
        itemInsertIdx = 0;
    }
    else if (exInsertIdx < targetBlock.exercises.length - 1) {
        const nextEx = targetBlock.exercises[exInsertIdx + 1];
        const firstNextItemIdx = targetBlock.items.findIndex(it => it.exerciseId === nextEx?.exerciseId);
        if (firstNextItemIdx !== -1) {
            itemInsertIdx = firstNextItemIdx;
        }
    }
    // 5. Update items metadata & insert into targetBlock
    movedItems.forEach(it => {
        it.exerciseTitle = exerciseToMove.title;
    });
    targetBlock.items.splice(itemInsertIdx, 0, ...movedItems);
    // 6. Resequence exercise numbers within both blocks
    sourceBlock.exercises.forEach((ex, idx) => {
        ex.exerciseNumber = idx + 1;
    });
    targetBlock.exercises.forEach((ex, idx) => {
        ex.exerciseNumber = idx + 1;
    });
    // 7. Global resequence of item positions
    resequenceItemPositions(draftState);
    return true;
}
export function deleteExerciseFromBlock(draftState, { blockIdx, exerciseIdx }) {
    if (!draftState || !Array.isArray(draftState.blocks))
        return false;
    const block = draftState.blocks[blockIdx];
    if (!block || !Array.isArray(block.exercises) || block.exercises.length <= 1)
        return false;
    if (exerciseIdx < 0 || exerciseIdx >= block.exercises.length)
        return false;
    const deletedEx = block.exercises[exerciseIdx];
    if (!deletedEx)
        return false;
    // 1. Remove deleted exercise
    block.exercises.splice(exerciseIdx, 1);
    // 2. Remove all child questions belonging to this exercise & clean up grading keys
    const remainingItems = [];
    (block.items || []).forEach(it => {
        if (it.exerciseId === deletedEx.exerciseId) {
            if (it.itemVersionId && draftState.gradingKey?.items) {
                delete draftState.gradingKey.items[it.itemVersionId];
            }
        }
        else {
            remainingItems.push(it);
        }
    });
    block.items = remainingItems;
    // 3. Update exercise numbers and itemIds for remaining exercises
    block.exercises.forEach((ex, idx) => {
        ex.exerciseNumber = idx + 1;
        ex.itemIds = (block.items || []).filter(it => it.exerciseId === ex.exerciseId).map(it => it.itemVersionId);
    });
    // 4. Global resequence of item positions
    const forceStartAtOne = blockIdx === 0 && exerciseIdx === 0;
    resequenceItemPositions(draftState, { forceStartAtOne });
    return true;
}
export function generateUuid() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
