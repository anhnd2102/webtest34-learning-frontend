/**
 * @file item-analysis.js
 * @description Pure functions for computing item error statistics, sorting, and filtering for Teacher Dashboard Item Error Analysis.
 */

/**
 * Computes the error rate for a single test item.
 * Error rate is defined as (incorrect + partial + unanswered) / totalAttempts.
 * 
 * @param {Object} item
 * @param {number} [item.totalAttempts]
 * @param {number} [item.correctCount]
 * @param {number} [item.incorrectCount]
 * @param {number} [item.partialCount]
 * @param {number} [item.unansweredCount]
 * @returns {number} Float value in range [0, 1]
 */
export function computeItemErrorRate(item) {
  if (!item || !item.totalAttempts || item.totalAttempts <= 0) {
    return 0;
  }
  const incorrect = Number(item.incorrectCount) || 0;
  const partial = Number(item.partialCount) || 0;
  const unanswered = Number(item.unansweredCount) || 0;
  const errorCount = incorrect + partial + unanswered;
  const rate = errorCount / item.totalAttempts;
  return Math.min(Math.max(rate, 0), 1);
}

/**
 * Sorts items based on selected criteria without mutating input array.
 * 
 * Criteria options:
 * - 'error_rate_desc' (default): items with highest error rate first. Ties break by position ascending.
 * - 'position_asc': items in original test sequence (1..N).
 * - 'unanswered_desc': items with most blank/unanswered responses first. Ties break by position ascending.
 * 
 * @param {Array<Object>} items
 * @param {string} criteria
 * @returns {Array<Object>}
 */
export function sortItems(items, criteria = 'error_rate_desc') {
  if (!Array.isArray(items)) {
    return [];
  }

  const cloned = [...items];

  switch (criteria) {
    case 'position_asc':
      return cloned.sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));

    case 'unanswered_desc':
      return cloned.sort((a, b) => {
        const diff = (Number(b.unansweredCount) || 0) - (Number(a.unansweredCount) || 0);
        if (diff !== 0) return diff;
        return (Number(a.position) || 0) - (Number(b.position) || 0);
      });

    case 'error_rate_desc':
    default:
      return cloned.sort((a, b) => {
        const rateA = computeItemErrorRate(a);
        const rateB = computeItemErrorRate(b);
        const rateDiff = rateB - rateA;
        if (Math.abs(rateDiff) > 1e-6) {
          return rateDiff;
        }
        // If tied, prioritize item with higher absolute error count
        const errA = (Number(a.incorrectCount) || 0) + (Number(a.partialCount) || 0) + (Number(a.unansweredCount) || 0);
        const errB = (Number(b.incorrectCount) || 0) + (Number(b.partialCount) || 0) + (Number(b.unansweredCount) || 0);
        const errDiff = errB - errA;
        if (errDiff !== 0) return errDiff;

        // Tie-breaker: position ascending
        return (Number(a.position) || 0) - (Number(b.position) || 0);
      });
  }
}

/**
 * Filters items by skill code.
 * If skillCode is 'ALL', null, or empty, returns all items.
 * 
 * @param {Array<Object>} items
 * @param {string} [skillCode]
 * @returns {Array<Object>}
 */
export function filterItemsBySkill(items, skillCode) {
  if (!Array.isArray(items)) {
    return [];
  }
  if (!skillCode || skillCode === 'ALL') {
    return items;
  }
  const target = String(skillCode).trim().toUpperCase();
  return items.filter(item => {
    const itemSkill = String(item.skill || item.skillCode || '').trim().toUpperCase();
    return itemSkill === target;
  });
}

/**
 * Extracts a deduplicated and alphabetically sorted array of skill codes from items.
 * 
 * @param {Array<Object>} items
 * @returns {Array<string>}
 */
export function extractUniqueSkills(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  const set = new Set();
  for (const item of items) {
    const s = String(item.skill || item.skillCode || '').trim().toUpperCase();
    if (s) {
      set.add(s);
    }
  }
  return Array.from(set).sort();
}

/**
 * Cleans rich HTML or whitespace from item prompts for readable summary display.
 * Falls back to "Câu hỏi chưa có tiêu đề" if blank.
 * 
 * @param {string} prompt
 * @returns {string}
 */
export function formatItemPromptDisplay(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return 'Câu hỏi chưa có tiêu đề';
  }
  // Strip simple HTML tags for summary title
  const stripped = prompt
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return stripped || 'Câu hỏi chưa có tiêu đề';
}
