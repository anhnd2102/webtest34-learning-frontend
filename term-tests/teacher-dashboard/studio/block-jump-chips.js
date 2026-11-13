// NGUỒN: file .ts này; block-jump-chips.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
export function bindBlockJumpChips({ container, jumpToBlock }) {
    // Quick jump to block via Block chips or Skill chips in Score Breakdown bar
    const blockJumpChips = container.querySelectorAll('.btn-block-jump-chip');
    if (blockJumpChips && typeof blockJumpChips.forEach === 'function') {
        blockJumpChips.forEach(chip => {
            if (typeof chip.addEventListener === 'function') {
                chip.addEventListener('click', (e) => {
                    e.preventDefault();
                    const bIdx = Number(chip.getAttribute('data-block-idx'));
                    if (!isNaN(bIdx))
                        jumpToBlock(bIdx);
                });
            }
        });
    }
    const skillChipsWithJump = container.querySelectorAll('.score-skill-chip[data-first-block-idx]');
    if (skillChipsWithJump && typeof skillChipsWithJump.forEach === 'function') {
        skillChipsWithJump.forEach(chip => {
            if (typeof chip.addEventListener === 'function') {
                chip.addEventListener('click', (e) => {
                    e.preventDefault();
                    const bIdx = Number(chip.getAttribute('data-first-block-idx'));
                    if (!isNaN(bIdx))
                        jumpToBlock(bIdx);
                });
            }
        });
    }
}
