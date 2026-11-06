import { normalizeSkillCode, CANONICAL_SKILL_LABELS } from '../ui/presentation.js';

export function teacherRoleLabel(role, courseCodes = []) {
  if (role === 'admin') return 'Quản trị viên (Toàn quyền)';
  if (role === 'lead') {
    const khoiList = courseCodes && courseCodes.length > 0 ? courseCodes.join(', ') : 'Khối';
    return `Trưởng bộ môn (Khối ${khoiList})`;
  }
  if (role === 'qm') return 'Quản lý chất lượng';
  return 'Giáo viên phụ trách lớp';
}

export function formatPublicationStatus(publication) {
  if (!publication || !publication.published) return 'Chưa công bố';
  return 'Đã công bố';
}

export function validateManualGradingScores(items, scores) {
  for (const item of items) {
    if (item.canGrade) {
      const val = scores[item.itemVersionId];
      if (item.needsReview && (val === undefined || val === null || val === '')) {
        return { valid: false, message: 'Còn câu cần duyệt chưa được chấm.' };
      }
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 0 || num > item.maxScore) {
          return { valid: false, message: `Điểm câu ${item.position} không hợp lệ (0 - ${item.maxScore}).` };
        }
      }
    }
  }
  return { valid: true, message: '' };
}

export function formatDashboardScore(score) {
  if (!score) return '—';
  if (score.status === 'pending') return 'Chờ chấm';
  const value = `${score.earned}/${score.maximum}`;
  return score.status === 'provisional' ? `${value} · Tạm tính` : value;
}

export function resultStatusLabel(status) {
  return ({
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    retake_granted: 'Được phép làm lại',
    retaking: 'Đang làm lại',
    retake_expired: 'Quyền làm lại đã hết hạn',
    grading: 'Đang chấm',
    review_required: 'Cần duyệt',
    complete: 'Hoàn tất'
  })[status] || status;
}

export function attemptStatusLabel(status) {
  return ({
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    active: 'Đang làm',
    submitted: 'Đã nộp',
    superseded: 'Bị thay thế',
    expired: 'Hết hạn'
  })[status] || status;
}

export function verdictLabel(verdict) {
  return ({
    correct: 'Đúng',
    incorrect: 'Sai',
    partial: 'Đúng một phần',
    pending: 'Chờ chấm',
    manual_review: 'Cần duyệt',
    ungraded: 'Chưa chấm',
    not_submitted: 'Chưa nộp'
  })[verdict] || verdict;
}

export function formatAssignmentWindow(opensAt, closesAt, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  if (!opensAt && !closesAt) return 'Không giới hạn thời gian';
  const format = value => value ? new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone
  }).format(new Date(value)) : 'Không giới hạn';
  return `${format(opensAt)} → ${format(closesAt)} (${timeZone})`;
}

export function formatCurrentTime(date = new Date(), locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone
  }).format(date);
}

export function incidentTypeLabel(type) {
  return ({ left_exam: 'Rời khỏi bài thi', device_switch: 'Đổi thiết bị' })[type] || type || 'Sự cố';
}

export function formatIncidentDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [hours && `${hours} giờ`, minutes && `${minutes} phút`, remainder && `${remainder} giây`]
    .filter(Boolean).join(' ') || '0 giây';
}

export function formatIncidentTimeline(incidents = []) {
  const timestamp = value => value ? new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(value)) : '—';
  return incidents.map(incident => ({
    incidentId: incident.incidentId,
    typeLabel: incidentTypeLabel(incident.type),
    startedAt: timestamp(incident.startedAt),
    endedAt: incident.endedAt ? timestamp(incident.endedAt) : 'Đang diễn ra',
    duration: formatIncidentDuration(incident.durationSeconds)
  }));
}

export function extractAttemptSkills(items = []) {
  const skillMap = new Map();
  const sectionMap = new Map();
  let totalScoreEarned = 0;
  let totalMaxScore = 0;
  let totalNeedsReview = 0;

  for (const item of items) {
    const rawCode = item.primarySkill || '';
    const code = normalizeSkillCode(rawCode, item.sectionTitle || item.sectionId) || 'general';
    const scoreEarned = Number(item.scoreEarned) || 0;
    const maxScore = Number(item.maxScore) || 0;
    const needsReview = Boolean(item.needsReview);

    totalScoreEarned += scoreEarned;
    totalMaxScore += maxScore;
    if (needsReview) totalNeedsReview += 1;

    if (!skillMap.has(code)) {
      skillMap.set(code, {
        code,
        label: CANONICAL_SKILL_LABELS[code] || (code.charAt(0).toUpperCase() + code.slice(1)),
        totalItems: 0,
        needsReviewCount: 0,
        scoreEarned: 0,
        maxScore: 0
      });
    }
    const skillStat = skillMap.get(code);
    skillStat.totalItems += 1;
    skillStat.scoreEarned += scoreEarned;
    skillStat.maxScore += maxScore;
    if (needsReview) skillStat.needsReviewCount += 1;

    // Track Section
    const secId = item.sectionId || item.sectionTitle || `sec-${code}`;
    const secTitle = item.sectionTitle || (CANONICAL_SKILL_LABELS[code] ? `Phần ${CANONICAL_SKILL_LABELS[code]}` : 'Phần bài tập');
    if (!sectionMap.has(secId)) {
      sectionMap.set(secId, {
        id: secId,
        title: secTitle,
        skillCode: code,
        totalItems: 0,
        correctCount: 0,
        needsReviewCount: 0,
        scoreEarned: 0,
        maxScore: 0,
        items: []
      });
    }
    const secStat = sectionMap.get(secId);
    secStat.totalItems += 1;
    if (item.verdict === 'correct') secStat.correctCount += 1;
    if (needsReview) secStat.needsReviewCount += 1;
    secStat.scoreEarned = Math.round((secStat.scoreEarned + scoreEarned) * 100) / 100;
    secStat.maxScore = Math.round((secStat.maxScore + maxScore) * 100) / 100;
    secStat.items.push(item);
  }

  const skills = Array.from(skillMap.values());
  const sections = Array.from(sectionMap.values());
  const summary = {
    all: {
      code: 'all',
      label: 'Tất cả kỹ năng',
      totalItems: items.length,
      needsReviewCount: totalNeedsReview,
      scoreEarned: Math.round(totalScoreEarned * 100) / 100,
      maxScore: Math.round(totalMaxScore * 100) / 100
    }
  };

  for (const skill of skills) {
    summary[skill.code] = {
      ...skill,
      scoreEarned: Math.round(skill.scoreEarned * 100) / 100,
      maxScore: Math.round(skill.maxScore * 100) / 100
    };
  }

  return { skills, summary, sections };
}

export function formatCompactPrompt(item) {
  const options = Array.isArray(item.options) ? item.options : [];
  const optionsCount = options.length;
  const isExtensive = optionsCount > 4 || item.interactionType === 'text_select_pair';
  return {
    text: item.prompt || `Câu hỏi số ${item.position}`,
    optionsCount,
    hasExtensiveOptions: isExtensive
  };
}

export function resolveStudentAnswerDisplay(item) {
  let ans = item.studentAnswer;
  if (typeof ans === 'string' && (ans.startsWith('{') || ans.startsWith('['))) {
    try { ans = JSON.parse(ans); } catch (_) {}
  }
  if (ans === null || ans === undefined || ans === '') {
    return '(Chưa trả lời)';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(ans)) {
    return ans.map(a => optMap.get(String(a)) || String(a)).join(', ');
  }

  if (typeof ans === 'object') {
    if ('error' in ans || 'correction' in ans) {
      const err = ans.error || '—';
      const corr = ans.correction || '—';
      return `Lỗi: ${err} → Sửa: ${corr}`;
    }

    const keys = Object.keys(ans).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    if (keys.length === 0) return '(Chưa trả lời)';

    const sub = item.subResults || item.feedback?.subResults || {};
    const parts = keys.map(k => {
      const val = ans[k];
      const text = (val === null || val === undefined || String(val).trim() === '') ? '—' : String(val).trim();
      const blankSub = sub[k];
      let statusMark = '';
      if (blankSub) {
        if (blankSub.verdict === 'correct') statusMark = ' [✓]';
        else if (blankSub.verdict === 'incorrect') statusMark = ' [✗]';
      }
      return `(${k}) ${text}${statusMark}`;
    });

    return parts.join(' · ');
  }

  const raw = String(ans);
  if (optMap.has(raw)) {
    return `${optMap.get(raw)} (${raw})`;
  }
  return raw;
}

export function resolveExpectedAnswerDisplay(item) {
  let exp = item.expectedAnswer;
  if (typeof exp === 'string' && (exp.startsWith('{') || exp.startsWith('['))) {
    try { exp = JSON.parse(exp); } catch (_) {}
  }
  if (exp === null || exp === undefined || exp === '') {
    if (item.clozeAnswers && Object.keys(item.clozeAnswers).length > 0) {
      const keys = Object.keys(item.clozeAnswers).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      return keys.map(k => {
        const v = item.clozeAnswers[k];
        const disp = Array.isArray(v?.accepted) ? v.accepted.join(' / ') : (Array.isArray(v) ? v.join(' / ') : String(v || ''));
        return `(${k}) ${disp}`;
      }).join(' · ');
    }
    return item.graderType === 'rubric_async' ? '(Chấm theo rubric)' : '—';
  }
  const options = Array.isArray(item.options) ? item.options : [];
  const optMap = new Map(options.map(o => [String(o.id), o.label]));

  if (Array.isArray(exp)) {
    return exp.map(ans => optMap.get(String(ans)) || String(ans)).join(', ');
  }

  if (typeof exp === 'object') {
    if ('error' in exp || 'correction' in exp) {
      return `Lỗi: ${exp.error || '—'} → Sửa: ${exp.correction || '—'}`;
    }

    const keys = Object.keys(exp).sort((a, b) => {
      const na = parseInt(a, 10);
      const nb = parseInt(b, 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    if (keys.length === 0) return '—';

    const parts = keys.map(k => {
      const v = exp[k];
      let disp = '';
      if (Array.isArray(v)) {
        disp = v.join(' / ');
      } else if (v && typeof v === 'object' && Array.isArray(v.accepted)) {
        disp = v.accepted.join(' / ');
      } else {
        disp = String(v ?? '');
      }
      return `(${k}) ${disp}`;
    });

    return parts.join(' · ');
  }

  const raw = String(exp);
  if (optMap.has(raw)) {
    return `${optMap.get(raw)} (${raw})`;
  }
  return raw;
}

export function getScoreTier(earned, maximum) {
  if (earned === null || earned === undefined || maximum === null || maximum === undefined || Number(maximum) <= 0) {
    return null;
  }
  const ratio = (Number(earned) / Number(maximum)) * 100;
  if (ratio >= 60) {
    return 'tier-yellow';
  }
  if (ratio >= 45) {
    return 'tier-red';
  }
  return 'tier-gray';
}

export function computeClassSkillSummary(payload) {
  const students = Array.isArray(payload?.students) ? payload.students : [];
  const skills = Array.isArray(payload?.skills) ? payload.skills : [];

  const totalStudents = students.length;
  const submittedStudents = students.filter(s => s.status !== 'not_started' && s.attemptId);
  const submittedCount = submittedStudents.length;

  const studentsWithTotal = students.filter(s => s.total && typeof s.total.earned === 'number' && Number(s.total.maximum) > 0);
  let totalAverage = null;
  if (studentsWithTotal.length > 0) {
    const sumEarned = studentsWithTotal.reduce((acc, s) => acc + Number(s.total.earned), 0);
    const avgEarned = Math.round((sumEarned / studentsWithTotal.length) * 10) / 10;
    const maxScore = Number(studentsWithTotal[0].total.maximum) || 100;
    totalAverage = {
      earned: avgEarned,
      maximum: maxScore,
      tier: getScoreTier(avgEarned, maxScore),
      studentCount: studentsWithTotal.length
    };
  }

  const skillSummaries = skills.map(skill => {
    const normCode = normalizeSkillCode(skill.code);
    const label = (CANONICAL_SKILL_LABELS[normCode] || CANONICAL_SKILL_LABELS[skill.code] || skill.code).toUpperCase();
    const withSkill = students.filter(s => s.skills?.[skill.code] && typeof s.skills[skill.code].earned === 'number' && Number(s.skills[skill.code].maximum) > 0);
    if (withSkill.length === 0) {
      return {
        code: skill.code,
        label,
        earned: null,
        maximum: skill.maximum,
        tier: null,
        studentCount: 0
      };
    }
    const sumEarned = withSkill.reduce((acc, s) => acc + Number(s.skills[skill.code].earned), 0);
    const avgEarned = Math.round((sumEarned / withSkill.length) * 10) / 10;
    const maxScore = Number(withSkill[0].skills[skill.code].maximum) || skill.maximum;
    return {
      code: skill.code,
      label,
      earned: avgEarned,
      maximum: maxScore,
      tier: getScoreTier(avgEarned, maxScore),
      studentCount: withSkill.length
    };
  });

  return {
    totalStudents,
    submittedCount,
    totalAverage,
    skills: skillSummaries
  };
}

export function formatCompactScore(score) {
  if (!score) return '—';
  if (score.status === 'pending') return 'Chờ chấm';
  if (score.earned === null || score.earned === undefined) return '—';
  const val = Number(score.earned);
  const formatted = Number.isInteger(val) ? String(val) : String(Math.round(val * 100) / 100);
  return score.status === 'provisional' ? `${formatted} (Tạm tính)` : formatted;
}

export function formatSubmissionTimestamp(dateStr, locale = 'vi-VN', timeZone = 'Asia/Ho_Chi_Minh') {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone });
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone });
  return {
    time: timeFormatter.format(d),
    date: dateFormatter.format(d)
  };
}

export const AVATAR_PALETTES = [
  { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' }, // Red / Crimson
  { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }, // Amber
  { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' }, // Green
  { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }, // Blue / Sky
  { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' }, // Purple
  { bg: '#fce7f3', text: '#9d174d', border: '#fbcfe8' }, // Pink
  { bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' }, // Teal
  { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' }  // Orange
];

export function getStudentInitials(name) {
  if (!name || typeof name !== 'string') return 'HV';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'HV';
  if (words.length === 1) {
    return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  }
  const first = Array.from(words[0])[0] || '';
  const second = Array.from(words[1])[0] || '';
  return (first + second).toUpperCase();
}

export function getAvatarColor(nameOrId) {
  const str = String(nameOrId || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}
