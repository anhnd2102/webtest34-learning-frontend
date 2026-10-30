import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNaturalStep,
  buildHistogramBuckets,
  calculateStatistics,
  distributeScoresToBuckets
} from '../term-tests/teacher-dashboard/shell/analytics/score-distribution.js';

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

test('calculateStatistics returns null metrics on empty or invalid inputs', () => {
  const empty = calculateStatistics([]);
  assert.deepEqual(empty, {
    count: 0,
    min: null,
    max: null,
    mean: null,
    median: null,
    standardDeviation: null
  });

  const nulls = calculateStatistics([null, undefined, 'abc']);
  assert.equal(nulls.count, 0);
  assert.equal(nulls.mean, null);
});

test('calculateStatistics computes accurate metrics for odd and even sample sizes', () => {
  // Odd count: 5 scores
  const odd = calculateStatistics([50, 70, 80, 90, 100]);
  assert.equal(odd.count, 5);
  assert.equal(odd.min, 50);
  assert.equal(odd.max, 100);
  assert.equal(odd.mean, 78);
  assert.equal(odd.median, 80, 'Median of [50, 70, 80, 90, 100] is 80');

  // Even count: 4 scores
  const even = calculateStatistics([60, 70, 80, 90]);
  assert.equal(even.count, 4);
  assert.equal(even.min, 60);
  assert.equal(even.max, 90);
  assert.equal(even.mean, 75);
  assert.equal(even.median, 75, 'Median of [60, 70, 80, 90] is (70 + 80) / 2 = 75');

  // Single sample
  const single = calculateStatistics([85.5]);
  assert.equal(single.count, 1);
  assert.equal(single.min, 85.5);
  assert.equal(single.max, 85.5);
  assert.equal(single.mean, 85.5);
  assert.equal(single.median, 85.5);
  assert.equal(single.standardDeviation, 0);
});

test('distributeScoresToBuckets respects half-open intervals and includes maxScore in last bucket', () => {
  const students = [
    { studentRef: 's1', name: 'Student 0', score: 0 },
    { studentRef: 's2', name: 'Student 10', score: 10 },
    { studentRef: 's3', name: 'Student 15.5', score: 15.5 },
    { studentRef: 's4', name: 'Student 90', score: 90 },
    { studentRef: 's5', name: 'Student 99.9', score: 99.9 },
    { studentRef: 's6', name: 'Student 100', score: 100 }
  ];

  const buckets = distributeScoresToBuckets(students, 100);
  assert.equal(buckets.length, 10);

  // Bucket [0 - 10) contains s1 (score 0), but NOT s2 (score 10)
  assert.equal(buckets[0].count, 1);
  assert.equal(buckets[0].students[0].studentRef, 's1');

  // Bucket [10 - 20) contains s2 (score 10) and s3 (score 15.5)
  assert.equal(buckets[1].count, 2);
  assert.deepEqual(buckets[1].students.map(s => s.studentRef), ['s2', 's3']);

  // Bucket [90 - 100] is last bucket, contains s4 (90), s5 (99.9), and s6 (100)
  const lastBucket = buckets[9];
  assert.equal(lastBucket.count, 3);
  assert.deepEqual(lastBucket.students.map(s => s.studentRef), ['s4', 's5', 's6']);

  // Total count across all buckets must equal input count
  const totalInBuckets = buckets.reduce((sum, b) => sum + b.count, 0);
  assert.equal(totalInBuckets, students.length);
});

test('distributeScoresToBuckets safely ignores null or invalid scores', () => {
  const students = [
    { studentRef: 'valid', score: 75 },
    { studentRef: 'null-score', score: null },
    { studentRef: 'undefined-score', score: undefined },
    { studentRef: 'nan-score', score: NaN }
  ];

  const buckets = distributeScoresToBuckets(students, 100);
  const totalCount = buckets.reduce((acc, b) => acc + b.count, 0);
  assert.equal(totalCount, 1);
  assert.equal(buckets[7].count, 1);
  assert.equal(buckets[7].students[0].studentRef, 'valid');
});
