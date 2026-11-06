import {
  escapeHtml
} from '../ui/presentation.js';
import {
  renderSvgIcon
} from '../ui/icons.js';
import {
  computeTestBuilderScoreSummary
} from './draft-model.js';

export function renderScoreSkillChipsHtml(skills = []) {
  return skills.map(skill => {
    const hasJump = typeof skill.firstBlockIdx === 'number';
    return `
      <div class="score-skill-chip skill-${escapeHtml(skill.code)}${hasJump ? ' has-jump' : ''}" ${hasJump ? `data-first-block-idx="${skill.firstBlockIdx}" role="button" tabindex="0"` : ''} title="${escapeHtml(skill.label)}: ${skill.score} điểm, ${skill.count} câu${hasJump ? ' (Bấm để nhảy đến phần này)' : ''}">
        <span class="skill-chip-dot"></span>
        <span class="skill-chip-name">${escapeHtml(skill.label)}</span>
        <span class="skill-chip-score"><strong>${skill.score}</strong> đ</span>
        <span class="skill-chip-count">(${skill.count} câu)</span>
      </div>
    `;
  }).join('');
}

export function renderBlockJumpTagsHtml(blocks = []) {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  return blocks.map((block, idx) => {
    const title = (block.title || `Phần ${idx + 1}`).trim();
    return `
      <button type="button" class="btn-block-jump-chip" data-block-idx="${idx}" title="Chuyển nhanh đến Phần ${idx + 1}: ${escapeHtml(title)}">
        <span class="block-jump-badge">Phần ${idx + 1}</span>
        <span class="block-jump-title">${escapeHtml(title)}</span>
      </button>
    `;
  }).join('');
}

export function renderBlocksNavCardHtml(blocks = []) {
  if (!Array.isArray(blocks) || blocks.length === 0) return '';
  return `
    <div class="builder-blocks-nav-card panel" id="builder-blocks-nav-card" aria-label="Điều hướng nhanh các phần thi">
      <div class="blocks-nav-header">
        <div class="blocks-nav-title-wrap">
          <h4 class="blocks-nav-title">${renderSvgIcon('layers', 'icon-inline')} Điều hướng nhanh các phần thi</h4>
          <p class="blocks-nav-subtitle">Bấm vào phần thi để cuộn nhanh đến nội dung chỉnh sửa</p>
        </div>
      </div>
      <div class="blocks-nav-chips">
        ${renderBlockJumpTagsHtml(blocks)}
      </div>
    </div>
  `;
}

export function renderScoreBreakdownBarHtml(draftState) {
  const blocks = (draftState && draftState.blocks) || [];
  const summary = computeTestBuilderScoreSummary(blocks);
  return `
    <div class="builder-score-breakdown-bar" id="builder-score-breakdown-bar">
      <div class="score-bar-main-row">
        <div class="score-bar-total-tile">
          <div class="score-total-icon">${renderSvgIcon('chart', 'icon-inline')}</div>
          <div class="score-total-info">
            <span class="score-total-label">Tổng điểm đề:</span>
            <div class="score-total-num-wrap">
              <span class="score-total-val">${summary.totalScore}</span>
              <span class="score-total-unit">điểm</span>
              <span class="score-total-questions-badge score-total-questions">${summary.totalQuestions} câu hỏi</span>
            </div>
          </div>
        </div>
        <div class="score-bar-divider"></div>
        <div class="score-bar-skills-wrap">
          <span class="score-skills-label">Phân bố kỹ năng:</span>
          <div class="score-skills-chips">
            ${renderScoreSkillChipsHtml(summary.skills)}
          </div>
        </div>
      </div>
    </div>
  `;
}
