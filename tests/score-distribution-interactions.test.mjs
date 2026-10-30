import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderScoreDistributionView
} from '../term-tests/teacher-dashboard/shell/analytics/score-distribution-view.js';

function createMockContainer() {
  const listeners = new Map();
  const elementMap = new Map();

  function makeElement(tag = 'div', attrs = {}) {
    const el = {
      tagName: tag.toUpperCase(),
      attributes: { ...attrs },
      classList: {
        classes: new Set((attrs.class || '').split(' ').filter(Boolean)),
        contains(c) { return this.classes.has(c); },
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); }
      },
      getAttribute(k) { return el.attributes[k] || null; },
      setAttribute(k, v) { el.attributes[k] = String(v); },
      removeAttribute(k) { delete el.attributes[k]; },
      addEventListener(event, fn) {
        if (!listeners.has(el)) listeners.set(el, new Map());
        const elListeners = listeners.get(el);
        if (!elListeners.has(event)) elListeners.set(event, []);
        elListeners.get(event).push(fn);
      },
      dispatchEvent(event) {
        const elListeners = listeners.get(el)?.get(event.type) || [];
        for (const fn of elListeners) fn(event);
      },
      querySelector(selector) {
        return el.querySelectorAll(selector)[0] || null;
      },
      querySelectorAll(selector) {
        const matches = [];
        function walk(node) {
          if (!node || !node.attributes) return;
          if (selector.startsWith('#')) {
            const id = selector.slice(1);
            if (node.attributes.id === id) matches.push(node);
          } else if (selector.startsWith('.')) {
            const cls = selector.slice(1);
            if (node.classList?.contains(cls) || (node.attributes.class || '').includes(cls)) {
              matches.push(node);
            }
          } else if (node.tagName?.toLowerCase() === selector.toLowerCase()) {
            matches.push(node);
          }
          for (const child of (node.children || [])) {
            walk(child);
          }
        }
        walk(el);
        return matches;
      },
      children: [],
      innerHTML: ''
    };
    return el;
  }

  // Simple DOM parser for our generated HTML string in tests
  const container = {
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(val) {
      this._html = val;
    },
    querySelector(sel) {
      if (sel === '#report-toggle-provisional') {
        if (!this._html.includes('id="report-toggle-provisional"')) return null;
        const isChecked = this._html.includes('id="report-toggle-provisional" checked');
        return {
          checked: isChecked,
          addEventListener(evt, fn) {
            container._onToggle = fn;
          }
        };
      }
      if (sel === '.btn-export-excel') {
        if (!this._html.includes('btn-export-excel')) return null;
        return {
          addEventListener(evt, fn) { container._onExport = fn; }
        };
      }
      if (sel === '.btn-print-report') {
        if (!this._html.includes('btn-print-report')) return null;
        return {
          addEventListener(evt, fn) { container._onPrint = fn; }
        };
      }
      if (sel === '.btn-close-drilldown') {
        if (!this._html.includes('btn-close-drilldown')) return null;
        return {
          addEventListener(evt, fn) { container._onCloseDrilldown = fn; }
        };
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.skill-tab-btn') {
        const regex = /class="skill-tab-btn([^"]*)"\s+data-skill-code="([^"]*)"/g;
        const items = [];
        let m;
        while ((m = regex.exec(this._html)) !== null) {
          const code = m[2];
          items.push({
            getAttribute(k) { return k === 'data-skill-code' ? code : null; },
            addEventListener(evt, fn) {
              container[`_onSkill_${code}`] = fn;
            }
          });
        }
        return items;
      }
      if (sel === '.histogram-bucket-col') {
        const regex = /data-bucket-idx="(\d+)"\s+data-bucket-min="(\d+)"\s+data-bucket-max="(\d+)"\s+data-count="(\d+)"/g;
        const items = [];
        let m;
        while ((m = regex.exec(this._html)) !== null) {
          const idx = m[1];
          const min = m[2];
          const max = m[3];
          const count = m[4];
          items.push({
            getAttribute(k) {
              if (k === 'data-bucket-idx') return idx;
              if (k === 'data-bucket-min') return min;
              if (k === 'data-bucket-max') return max;
              if (k === 'data-count') return count;
              return null;
            },
            addEventListener(evt, fn) {
              container[`_onBucket_${idx}`] = fn;
            }
          });
        }
        return items;
      }
      return [];
    }
  };

  return container;
}

const fixtureReportData = {
  assignment: {
    assignmentId: 'assign-1',
    classId: '101',
    className: 'Lớp C34-A',
    title: 'Khối 34 · Phase 1 · Test 1',
    maxScore: 100
  },
  rosterSummary: {
    totalRoster: 20,
    submitted: 16,
    officialGraded: 14,
    provisional: 2,
    pendingReview: 1,
    retaking: 0,
    notSubmitted: 4
  },
  overall: {
    maxScore: 100,
    statistics: {
      count: 14,
      min: 45,
      max: 95,
      mean: 72.5,
      median: 75,
      standardDeviation: 12.1
    },
    histogram: {
      step: 10,
      buckets: [
        { min: 0, max: 10, label: '0 – 10', count: 0, students: [] },
        { min: 10, max: 20, label: '10 – 20', count: 0, students: [] },
        { min: 20, max: 30, label: '20 – 30', count: 0, students: [] },
        { min: 30, max: 40, label: '30 – 40', count: 0, students: [] },
        { min: 40, max: 50, label: '40 – 50', count: 2, students: [
          { studentRef: 's1', name: 'Học viên A', score: 45 },
          { studentRef: 's2', name: 'Học viên B', score: 48 }
        ] },
        { min: 50, max: 60, label: '50 – 60', count: 3, students: [] },
        { min: 60, max: 70, label: '60 – 70', count: 4, students: [] },
        { min: 70, max: 80, label: '70 – 80', count: 3, students: [] },
        { min: 80, max: 90, label: '80 – 90', count: 1, students: [] },
        { min: 90, max: 100, label: '90 – 100', count: 1, students: [
          { studentRef: 's10', name: 'Thủ khoa C', score: 95 }
        ] }
      ]
    }
  },
  skills: [
    {
      code: 'reading',
      name: 'Reading',
      maxScore: 50,
      statistics: { count: 14, min: 20, max: 50, mean: 37.5, median: 40, standardDeviation: 6.2 },
      histogram: {
        step: 5,
        buckets: [
          { min: 0, max: 5, label: '0 – 5', count: 0, students: [] },
          { min: 5, max: 10, label: '5 – 10', count: 0, students: [] },
          { min: 10, max: 15, label: '10 – 15', count: 0, students: [] },
          { min: 15, max: 20, label: '15 – 20', count: 0, students: [] },
          { min: 20, max: 25, label: '20 – 25', count: 2, students: [] },
          { min: 25, max: 30, label: '25 – 30', count: 3, students: [] },
          { min: 30, max: 35, label: '30 – 35', count: 3, students: [] },
          { min: 35, max: 40, label: '35 – 40', count: 4, students: [] },
          { min: 40, max: 45, label: '40 – 45', count: 1, students: [] },
          { min: 45, max: 50, label: '45 – 50', count: 1, students: [] }
        ]
      }
    },
    {
      code: 'listening',
      name: 'Listening',
      maxScore: 50,
      statistics: { count: 14, min: 25, max: 48, mean: 35.0, median: 35, standardDeviation: 5.8 },
      histogram: {
        step: 5,
        buckets: [
          { min: 0, max: 5, label: '0 – 5', count: 0, students: [] }
        ]
      }
    }
  ]
};

test('renderScoreDistributionView wires up provisional score toggle', () => {
  const container = createMockContainer();
  let toggledState = null;

  renderScoreDistributionView(container, {
    reportData: fixtureReportData,
    includeProvisional: false
  }, {
    onProvisionalToggle: (val) => { toggledState = val; }
  });

  assert.ok(container._onToggle);
  container._onToggle({ target: { checked: true } });
  assert.equal(toggledState, true);
});

test('renderScoreDistributionView switches active skill tabs dynamically', () => {
  const container = createMockContainer();
  let selectedSkill = null;

  renderScoreDistributionView(container, {
    reportData: fixtureReportData,
    activeSkill: 'overall'
  }, {
    onSkillChange: (skill) => { selectedSkill = skill; }
  });

  assert.match(container.innerHTML, /Toàn bài \(Overall\)/);
  assert.match(container.innerHTML, /Reading/);
  assert.match(container.innerHTML, /Listening/);

  assert.ok(container._onSkill_reading);
  container._onSkill_reading();
  assert.equal(selectedSkill, 'reading');
});

test('renderScoreDistributionView handles bucket selection and drilldown display', () => {
  const container = createMockContainer();
  let selectedBucketInfo = null;

  // Render with active bucket index 4 ([40 – 50])
  renderScoreDistributionView(container, {
    reportData: fixtureReportData,
    activeSkill: 'overall',
    activeBucketIndex: 4
  }, {
    onBucketClick: (info) => { selectedBucketInfo = info; }
  });

  // Drilldown card is visible with students in bucket 4
  assert.match(container.innerHTML, /Danh sách học viên khoảng điểm 40 – 50 pts/);
  assert.match(container.innerHTML, /Học viên A/);
  assert.match(container.innerHTML, /Học viên B/);
  assert.match(container.innerHTML, /45\/100/);

  // Clicking close drilldown calls onBucketClick with null/reset
  assert.ok(container._onCloseDrilldown);
  container._onCloseDrilldown();
  assert.deepEqual(selectedBucketInfo, { bucket: null, index: -1, skillCode: 'overall' });
});

test('renderScoreDistributionView triggers export and print actions', () => {
  const container = createMockContainer();
  let exportCalled = false;
  let printCalled = false;

  renderScoreDistributionView(container, {
    reportData: fixtureReportData
  }, {
    onExportExcel: () => { exportCalled = true; },
    onPrint: () => { printCalled = true; }
  });

  assert.ok(container._onExport);
  assert.ok(container._onPrint);

  container._onExport();
  assert.equal(exportCalled, true);

  container._onPrint();
  assert.equal(printCalled, true);
});
