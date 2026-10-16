import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readDashboardTab,
  switchDashboardTab,
  courseTestCatalogPath,
  renderCourseTestCatalogView
} from '../term-tests/teacher-dashboard/app.js';

test('readDashboardTab recognizes #test-studio and #exams', () => {
  assert.equal(readDashboardTab('#test-studio'), 'test-studio');
  assert.equal(readDashboardTab('#exams'), 'exams');
  assert.equal(readDashboardTab('test-studio'), 'test-studio');
  assert.equal(readDashboardTab('#dashboard'), 'dashboard');
  assert.equal(readDashboardTab('#grading'), 'grading');
  assert.equal(readDashboardTab('#invalid-route'), 'dashboard');
});

test('courseTestCatalogPath constructs canonical endpoint URL', () => {
  assert.equal(
    courseTestCatalogPath('http://localhost:3000', 1),
    'http://localhost:3000/api/teacher/course-test-catalog?courseId=1'
  );
  assert.equal(
    courseTestCatalogPath('https://api.izone.edu.vn', '34'),
    'https://api.izone.edu.vn/api/teacher/course-test-catalog?courseId=34'
  );
});

test('renderCourseTestCatalogView renders tests table and handles role access', () => {
  const container = { innerHTML: '' };

  // 1. Role: teacher -> renders unauthorized restriction
  renderCourseTestCatalogView(container, [], {
    teacherRole: 'teacher',
    courseId: 1
  });
  assert.ok(container.innerHTML.includes('không có quyền') || container.innerHTML.includes('Khối trưởng'));

  // 2. Role: lead -> renders catalog items with status badges
  const mockCatalog = [
    {
      id: 'c1',
      courseId: 1,
      testKey: '03-t1',
      sessionNumber: 1,
      phase: null,
      testNumber: 1,
      title: 'IZONE · Khối 03 · Test 1',
      formVersionId: '03010000-0000-4000-8000-000000000006',
      status: 'published'
    },
    {
      id: 'c2',
      courseId: 1,
      testKey: '03-t2',
      sessionNumber: 2,
      phase: null,
      testNumber: 2,
      title: 'IZONE · Khối 03 · Test 2',
      formVersionId: '03020000-0000-4000-8000-000000000006',
      status: 'draft'
    }
  ];

  renderCourseTestCatalogView(container, mockCatalog, {
    teacherRole: 'lead',
    courseId: 1
  });

  assert.ok(container.innerHTML.includes('IZONE · Khối 03 · Test 1'));
  assert.ok(container.innerHTML.includes('03-t1'));
  assert.ok(container.innerHTML.includes('Buổi 1'));
  assert.ok(container.innerHTML.includes('badge-published') || container.innerHTML.includes('Đã công bố'));
  assert.ok(container.innerHTML.includes('badge-draft') || container.innerHTML.includes('Bản nháp'));
});
