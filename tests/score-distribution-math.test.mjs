import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNaturalStep, buildHistogramBuckets } from '../term-tests/teacher-dashboard/shell/analytics/score-distribution.js';

test('calculateNaturalStep derives natural bucket step based on maxScore', () => {
  assert.equal(calculateNaturalStep(100), 10, '100 points scale should use step 10');
  assert.equal(calculateNaturalStep(90), 10, '90 points scale should use step 10');
  assert.equal(calculateNaturalStep(25), 5, '25 points scale should use step 5');
  assert.equal(calculateNaturalStep(10), 2, '10 points scale should use step 2');
  assert.equal(calculateNaturalStep(50), 5, '50 points scale should use step 5');
  assert.equal(calculateNaturalStep(0), 1, 'Edge case: 0 points fallback to 1');
});

test('buildHistogramBuckets creates contiguous intervals with correct boundary flags', () => {
  const buckets100 = buildHistogramBuckets(100, 10);
  assert.equal(buckets100.length, 10, '100 / 10 = 10 buckets');
  assert.deepEqual(buckets100[0], { min: 0, max: 10, label: '0 – 10', isLast: false });
  assert.deepEqual(buckets100[9], { min: 90, max: 100, label: '90 – 100', isLast: true });

  const buckets25 = buildHistogramBuckets(25, 5);
  assert.equal(buckets25.length, 5, '25 / 5 = 5 buckets');
  assert.equal(buckets25[0].min, 0);
  assert.equal(buckets25[0].max, 5);
  assert.equal(buckets25[4].min, 20);
  assert.equal(buckets25[4].max, 25);
  assert.equal(buckets25[4].isLast, true);

  const buckets90 = buildHistogramBuckets(90, 10);
  assert.equal(buckets90.length, 9, '90 / 10 = 9 buckets');
  assert.equal(buckets90[8].max, 90);
  assert.equal(buckets90[8].isLast, true);
});

