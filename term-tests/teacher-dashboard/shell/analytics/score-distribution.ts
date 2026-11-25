// NGUỒN: file .ts này; score-distribution.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
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
export function calculateNaturalStep(maxScore: unknown): number {
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
export interface HistogramBucket { min: number, max: number, label: string, isLast: boolean }

export function buildHistogramBuckets(maxScore: unknown, customStep: number | null = null): HistogramBucket[] {
  const numericMax = Math.max(1, Math.round(Number(maxScore) || 100));
  const step = customStep && customStep > 0 ? customStep : calculateNaturalStep(numericMax);

  const buckets: HistogramBucket[] = [];
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
export type ScoredStudent = number | { score?: unknown, [key: string]: unknown };

