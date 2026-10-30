/**
 * score-distribution.js
 * Core mathematical and statistical computation module for Teacher Dashboard Reports.
 * Authoritative, pure functional logic for histogram intervals, quartiles, and dispersion.
 */

/**
 * Determine a natural integer step for histogram buckets based on the test's maximum score.
 * Avoids awkward fractional divisions or overly dense/sparse bars.
 * 
 * @param {number} maxScore - Maximum possible score of the test or skill
 * @returns {number} Natural step size (e.g. 10 for 100/90 pts, 5 for 25/50 pts, 2 for 10 pts)
 */
export function calculateNaturalStep(maxScore) {
  const numericMax = Number(maxScore);
  if (!Number.isFinite(numericMax) || numericMax <= 0) return 1;

  if (numericMax <= 10) return 2;
  if (numericMax <= 30) return 5;
  if (numericMax <= 60) return 5;
  if (numericMax <= 120) return 10;
  return 20;
}

/**
 * Build histogram interval buckets [min, max) up to maxScore.
 * The final bucket is inclusive of maxScore: [min, max].
 * 
 * @param {number} maxScore - Maximum score (e.g. 100)
 * @param {number} [customStep] - Optional custom step; if omitted, calculates natural step
 * @returns {Array<{min: number, max: number, label: string, isLast: boolean}>}
 */
export function buildHistogramBuckets(maxScore, customStep = null) {
  const numericMax = Math.max(1, Math.round(Number(maxScore) || 100));
  const step = customStep && customStep > 0 ? customStep : calculateNaturalStep(numericMax);

  const buckets = [];
  let currentMin = 0;

  while (currentMin < numericMax) {
    const nextMax = Math.min(numericMax, currentMin + step);
    const isLast = nextMax >= numericMax;

    buckets.push({
      min: currentMin,
      max: nextMax,
      label: `${currentMin} – ${nextMax}`,
      isLast
    });

    currentMin = nextMax;
  }

  return buckets;
}

/**
 * Compute descriptive statistics: count, min, max, mean, median, standard deviation.
 * 
 * @param {Array<number>} rawScores - Array of raw score values
 * @returns {{
 *   count: number,
 *   min: number|null,
 *   max: number|null,
 *   mean: number|null,
 *   median: number|null,
 *   standardDeviation: number|null
 * }}
 */
export function calculateStatistics(rawScores = []) {
  if (!Array.isArray(rawScores)) {
    return { count: 0, min: null, max: null, mean: null, median: null, standardDeviation: null };
  }

  const validScores = rawScores
    .filter(val => val !== null && val !== undefined && val !== '' && Number.isFinite(Number(val)))
    .map(val => Number(val))
    .filter(val => val >= 0)
    .sort((a, b) => a - b);

  const n = validScores.length;
  if (n === 0) {
    return { count: 0, min: null, max: null, mean: null, median: null, standardDeviation: null };
  }

  const min = validScores[0];
  const max = validScores[n - 1];

  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const mean = Math.round((sum / n) * 10) / 10;

  // Calculate Median
  let median;
  const mid = Math.floor(n / 2);
  if (n % 2 !== 0) {
    median = validScores[mid];
  } else {
    median = Math.round(((validScores[mid - 1] + validScores[mid]) / 2) * 10) / 10;
  }

  // Calculate Population Standard Deviation (σ)
  const squaredDiffSum = validScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0);
  const standardDeviation = Math.round(Math.sqrt(squaredDiffSum / n) * 10) / 10;

  return {
    count: n,
    min,
    max,
    mean,
    median,
    standardDeviation
  };
}

/**
 * Distribute an array of students with scores into histogram buckets.
 * Respects interval boundaries: [min, max) for regular buckets, [min, max] for the final bucket.
 * 
 * @param {Array<{score: number, [key: string]: any}>} studentItems - List of student result objects
 * @param {number} maxScore - Maximum possible score
 * @param {number} [step] - Bucket step size
 * @returns {Array<{
 *   min: number,
 *   max: number,
 *   label: string,
 *   isLast: boolean,
 *   count: number,
 *   students: Array<any>
 * }>}
 */
export function distributeScoresToBuckets(studentItems = [], maxScore = 100, step = null) {
  const buckets = buildHistogramBuckets(maxScore, step).map(b => ({
    ...b,
    count: 0,
    students: []
  }));

  if (!Array.isArray(studentItems) || studentItems.length === 0 || buckets.length === 0) {
    return buckets;
  }

  const lastBucketIdx = buckets.length - 1;

  for (const item of studentItems) {
    const rawScore = typeof item === 'number' ? item : item?.score;
    if (rawScore === null || rawScore === undefined || rawScore === '') continue;
    const score = Number(rawScore);

    // Skip invalid scores (not submitted, pending, or NaN)
    if (!Number.isFinite(score) || score < 0) continue;

    // Match appropriate bucket
    let matchedIdx = -1;
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (i === lastBucketIdx) {
        // Last bucket is closed: [min, max]
        if (score >= bucket.min && score <= bucket.max) {
          matchedIdx = i;
          break;
        }
      } else {
        // Lower buckets are half-open: [min, max)
        if (score >= bucket.min && score < bucket.max) {
          matchedIdx = i;
          break;
        }
      }
    }

    // Safety fallback: if score exceeds maxScore due to rounding, assign to last bucket
    if (matchedIdx === -1 && score >= buckets[lastBucketIdx].max) {
      matchedIdx = lastBucketIdx;
    } else if (matchedIdx === -1 && score < buckets[0].min) {
      matchedIdx = 0;
    }

    if (matchedIdx !== -1) {
      buckets[matchedIdx].count++;
      buckets[matchedIdx].students.push(item);
    }
  }

  return buckets;
}
