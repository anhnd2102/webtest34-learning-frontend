import { readDashboardCss } from './helpers/dashboard-css.mjs';
import test from 'node:test';
import { readDashboardSource } from './helpers/dashboard-source.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderScoreKpiCards,
  formatScoreFraction
} from '../term-tests/teacher-dashboard/shell/analytics/score-distribution-view.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '../term-tests/teacher-dashboard/index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

test('Teacher Dashboard Redesign: Top Navbar has only 3 sections and removes standalone #reports', () => {
  // Check that navbar contains exactly the 3 core items
  assert.match(indexHtml, /<a href="#dashboard" class="nav-item[^"]*">Teacher Dashboard<\/a>/);
  assert.match(indexHtml, /<a href="#test-studio" class="nav-item[^"]*">Quản lý bài thi<\/a>/);
  assert.match(indexHtml, /<a href="#grading" class="nav-item[^"]*">Chấm điểm &amp; Đánh giá<\/a>/);
  
  // Navbar menu must NOT have standalone #reports link
  const navbarMenuMatch = indexHtml.match(/<nav class="navbar-menu"[\s\S]*?<\/nav>/);
  assert.ok(navbarMenuMatch, 'navbar-menu must exist');
  assert.doesNotMatch(navbarMenuMatch[0], /href="#reports"/, 'Top navbar must not contain #reports');
});

test('Teacher Dashboard Redesign: Exam Room table header contains "Làm lại" column', () => {
  const examRoomTable = indexHtml.match(/<section id="exam-room"[\s\S]*?<\/section>/);
  assert.ok(examRoomTable, '#exam-room section must exist');
  assert.match(
    examRoomTable[0],
    /<th>Làm lại<\/th>/,
    'Exam Room table header must include <th>Làm lại</th>'
  );
});

test('Teacher Dashboard Redesign: view-grading contains Compact Assessment Header and 3 navigation tabs', () => {
  const viewGrading = indexHtml.match(/<div id="view-grading"[\s\S]*?<\/div> <!-- #view-grading -->/);
  assert.ok(viewGrading, '#view-grading container must exist');
  
  // Compact Assessment Header elements
  assert.match(viewGrading[0], /id="assessment-header"/, 'Must contain #assessment-header');
  assert.match(viewGrading[0], /id="assessment-back-btn"/, 'Must contain #assessment-back-btn');
  assert.match(viewGrading[0], /id="assessment-breadcrumb"/, 'Must contain #assessment-breadcrumb');
  assert.match(viewGrading[0], /class="assessment-nav-tabs"/, 'Must contain .assessment-nav-tabs');
  
  // 3 tabs: Phổ điểm, Chấm chi tiết, Phân tích câu hỏi
  assert.match(viewGrading[0], /data-assessment-tab="distribution"/, 'Must contain Phổ điểm tab');
  assert.match(viewGrading[0], /data-assessment-tab="details"/, 'Must contain Chấm chi tiết tab');
  assert.match(viewGrading[0], /data-assessment-tab="items"/, 'Must contain Phân tích câu hỏi tab');
  
  // Tab containers
  assert.match(viewGrading[0], /id="assessment-tab-distribution"/, 'Must contain #assessment-tab-distribution container');
  assert.match(viewGrading[0], /id="results"/, '#results must exist for detailed grading');
  assert.match(viewGrading[0], /id="assessment-tab-items"/, 'Must contain #assessment-tab-items container');
});

test('Teacher Dashboard Redesign: renderScoreKpiCards renders 6 KPI cards with click-to-filter and no Max/Min', () => {
  const rosterSummary = {
    totalRoster: 24,
    submitted: 20,
    officialGraded: 18,
    provisional: 2,
    pendingReview: 1,
    retaking: 1,
    notSubmitted: 2
  };
  const statistics = {
    count: 20,
    min: 40,
    max: 95,
    mean: 76.5,
    median: 80,
    standardDeviation: 11.2
  };
  const maxScore = 100;

  const html = renderScoreKpiCards(rosterSummary, statistics, maxScore);

  // 6 KPI cards
  assert.match(html, /Tổng số học viên/);
  assert.match(html, /24/);
  assert.match(html, /Điểm trung bình/);
  assert.match(html, /76.5\/100/);
  assert.match(html, /Có điểm chính thức/);
  assert.match(html, /18 \/ 24/);
  assert.match(html, /Chờ chấm \/ duyệt/);
  assert.match(html, /3 \/ 24/); // 1 pendingReview + 2 provisional = 3
  assert.match(html, /Chưa nộp bài/);
  assert.match(html, /2 \/ 24/);
  assert.match(html, /Đang làm lại/);
  assert.match(html, /1 \/ 24/);

  // Invariant: Must NOT contain Max or Min cards
  assert.doesNotMatch(html, /Điểm cao nhất/);
  assert.doesNotMatch(html, /Điểm thấp nhất/);

  // Click-to-filter attributes
  assert.match(html, /data-filter-status=""/);
  assert.match(html, /data-filter-status="complete"/);
  assert.match(html, /data-filter-status="review_required,grading"/);
  assert.match(html, /data-filter-status="not_started,in_progress"/);
  assert.match(html, /data-filter-status="retake_granted,retaking"/);

  // Design system invariant: No percentage signs or emojis
  assert.doesNotMatch(html, /%/);
  assert.doesNotMatch(html, /[\u{1F300}-\u{1F9FF}]/u);
});


test('Teacher Dashboard Redesign: Results table removes outer retake button and Drawer retains #grant-retake-btn', () => {
  const dashboardJsPath = path.join(__dirname, '../term-tests/teacher-dashboard/shell/dashboard.js');
  const dashboardJs = readDashboardSource();

  // Inside results rows rendering, retakeBtn is removed
  assert.doesNotMatch(
    dashboardJs,
    /actionsGroup\.append\(retakeBtn\)/,
    'Results table rows must NOT contain outer retake button'
  );

  // In Sliding Drawer attempt-detail, grant-retake-btn is preserved
  assert.match(
    indexHtml,
    /id="grant-retake-btn"/,
    'Drawer must preserve #grant-retake-btn'
  );
  assert.match(
    dashboardJs,
    /lifecycle\.listen\(grantRetakeBtn,\s*'click'/,
    'Drawer #grant-retake-btn click listener must be preserved'
  );
});

test('Teacher Dashboard Redesign: Exam Room rows render 7th column with retake button or badge+renew', () => {
  const dashboardJsPath = path.join(__dirname, '../term-tests/teacher-dashboard/shell/dashboard.js');
  const dashboardJs = readDashboardSource();

  // Exam Room row appends 7 cells including retake
  assert.match(
    dashboardJs,
    /row\.append\(name,\s*participation,\s*progress,\s*connection,\s*incidents,\s*device,\s*retake\)/,
    'Exam Room row must append retake cell as 7th column'
  );

  // Contains both active retake branch (badge + renew) and inactive branch (btn-retake)
  assert.match(dashboardJs, /retake-badge active/, 'Must render active retake badge');
  assert.match(dashboardJs, /btn-retake-renew/, 'Must render renew button when retake is active');
  assert.match(dashboardJs, /btn-secondary btn-sm btn-retake/, 'Must render retake button when retake is inactive');
});

test('Teacher Dashboard Redesign: styles.css contains required design system styles and hides link bar in grading', () => {
  const cssPath = path.join(__dirname, '../term-tests/teacher-dashboard/styles.css');
  const css = readDashboardCss();

  assert.match(css, /\.assessment-header/, 'Must define .assessment-header');
  assert.match(css, /\.assessment-nav-tabs/, 'Must define .assessment-nav-tabs');
  assert.match(css, /\.assessment-tab-btn\.active/, 'Must define .assessment-tab-btn.active');
  assert.match(css, /\.clickable-kpi-card/, 'Must define .clickable-kpi-card');
  assert.match(css, /\.retake-badge\.active/, 'Must define .retake-badge.active');
  assert.match(css, /\.btn-retake-renew/, 'Must define .btn-retake-renew');
  assert.doesNotMatch(css, /#view-grading\s+\.assignment-link-bar/, 'The legacy link bar is gone, so no rule hides it in view-grading');
});


test('Teacher Dashboard Assessment Tabs: hover and active styles use brand colors and items tab triggers item_analysis', () => {
  const cssPath = path.join(__dirname, '../term-tests/teacher-dashboard/styles.css');
  const css = readDashboardCss();
  const dashboardJsPath = path.join(__dirname, '../term-tests/teacher-dashboard/shell/dashboard.js');
  const dashboardJs = readDashboardSource();

  // Verify active style uses brand color, not black
  assert.match(
    css,
    /\.assessment-tab-btn\.active\s*\{[^}]*background:\s*var\(--izone-primary/,
    '.assessment-tab-btn.active must use brand color var(--izone-primary)'
  );
  assert.doesNotMatch(
    css,
    /\.assessment-tab-btn\.active\s*\{[^}]*background:\s*#0f172a/,
    '.assessment-tab-btn.active must not be black #0f172a'
  );

  // Verify hover style uses brand colors
  assert.match(
    css,
    /\.assessment-tab-btn:hover\s*\{[^}]*var\(--izone-soft-red/,
    '.assessment-tab-btn:hover must use soft brand tint'
  );

  // Verify dashboard.js renders assessmentTabItems and switches reportState.mode
  assert.match(
    dashboardJs,
    /(?:reportState|getReportState\(\))\.mode = 'item_analysis';/,
    'switchAssessmentTab must switch reportState.mode to item_analysis'
  );
  assert.match(
    dashboardJs,
    /assessmentTabItems\.innerHTML = renderItemAnalysisView/,
    'renderReportsView must populate assessmentTabItems'
  );
});
