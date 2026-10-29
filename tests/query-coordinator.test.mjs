import test from 'node:test';
import assert from 'node:assert/strict';
import { createQueryCoordinator } from '../term-tests/teacher-dashboard/shell/query-coordinator.js';

test('QueryCoordinator: generates increasing generations per scope', () => {
  const coordinator = createQueryCoordinator();
  const q1 = coordinator.begin('results');
  assert.equal(q1.id, 1);
  assert.equal(q1.isCurrent(), true);

  const q2 = coordinator.begin('results');
  assert.equal(q2.id, 2);
  assert.equal(q2.isCurrent(), true);
  assert.equal(q1.isCurrent(), false);
});

test('QueryCoordinator: scopes are isolated from each other', () => {
  const coordinator = createQueryCoordinator();
  const qRes = coordinator.begin('results');
  const qAssign = coordinator.begin('assignments');

  assert.equal(qRes.isCurrent(), true);
  assert.equal(qAssign.isCurrent(), true);

  const qRes2 = coordinator.begin('results');
  assert.equal(qRes.isCurrent(), false);
  assert.equal(qRes2.isCurrent(), true);
  assert.equal(qAssign.isCurrent(), true);
});

test('QueryCoordinator: aborts previous controller when new query begins', () => {
  const coordinator = createQueryCoordinator();
  const q1 = coordinator.begin('results');
  assert.equal(q1.signal?.aborted, false);

  const q2 = coordinator.begin('results');
  assert.equal(q1.signal?.aborted, true);
  assert.equal(q2.signal?.aborted, false);
});

test('QueryCoordinator: cancels and invalidates active query', () => {
  const coordinator = createQueryCoordinator();
  const q1 = coordinator.begin('results');
  coordinator.cancel('results');

  assert.equal(q1.isCurrent(), false);
  assert.equal(q1.signal?.aborted, true);
});

test('QueryCoordinator: dispose aborts and invalidates all scopes', () => {
  const coordinator = createQueryCoordinator();
  const q1 = coordinator.begin('results');
  const q2 = coordinator.begin('assignments');

  coordinator.dispose();

  assert.equal(q1.isCurrent(), false);
  assert.equal(q2.isCurrent(), false);
  assert.equal(q1.signal?.aborted, true);
  assert.equal(q2.signal?.aborted, true);

  // New begins return null or inactive after dispose
  const q3 = coordinator.begin('results');
  assert.equal(q3, null);
});

test('QueryCoordinator: respects lifecycle.isDisposed()', () => {
  let disposed = false;
  const mockLifecycle = {
    isDisposed() { return disposed; }
  };
  const coordinator = createQueryCoordinator(mockLifecycle);
  const q1 = coordinator.begin('results');
  assert.equal(q1.isCurrent(), true);

  disposed = true;
  assert.equal(q1.isCurrent(), false);
  assert.equal(coordinator.begin('results'), null);
});
