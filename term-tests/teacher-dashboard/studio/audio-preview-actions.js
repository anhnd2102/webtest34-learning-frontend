import { renderSvgIcon } from '../ui/icons.js';
import { convertGoogleDriveAudioUrl } from './media.js';
export function bindAudioPreviewActions({ container }) {
    let currentPreviewAudio = null;
    let currentPreviewBtn = null;
    const previewAudioBtns = container.querySelectorAll('.btn-preview-audio');
    if (previewAudioBtns && typeof previewAudioBtns.forEach === 'function') {
        previewAudioBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const inputWrap = btn.closest('.audio-input-with-preview');
                const inputEl = inputWrap?.querySelector('input[type="text"]');
                if (!inputEl)
                    return;
                const rawUrl = inputEl.value.trim();
                if (!rawUrl) {
                    alert('Vui lòng nhập đường dẫn file âm thanh hoặc link Google Drive trước khi nghe thử.');
                    return;
                }
                const streamUrl = convertGoogleDriveAudioUrl(rawUrl);
                if (inputEl.value !== streamUrl) {
                    inputEl.value = streamUrl;
                }
                let playUrl = streamUrl;
                const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                    const fileId = driveMatch[1];
                    const isLocal = typeof window !== 'undefined' && (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost');
                    const apiBase = isLocal ? `${window.location.protocol}//${window.location.hostname}:8788` : '';
                    playUrl = `${apiBase}/api/teacher/media/drive-stream?id=${encodeURIComponent(fileId)}`;
                }
                if (currentPreviewAudio && !currentPreviewAudio.paused && currentPreviewBtn === btn) {
                    currentPreviewAudio.pause();
                    btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
                    return;
                }
                if (currentPreviewAudio) {
                    currentPreviewAudio.pause();
                    if (currentPreviewBtn) {
                        currentPreviewBtn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
                    }
                }
                if (typeof Audio !== 'undefined') {
                    currentPreviewAudio = new Audio(playUrl);
                    currentPreviewBtn = btn;
                    btn.innerHTML = `${renderSvgIcon('pause', 'icon-inline')} Tạm dừng`;
                    currentPreviewAudio.addEventListener('ended', () => {
                        btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
                    });
                    currentPreviewAudio.addEventListener('error', () => {
                        btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
                        alert('Không thể phát file âm thanh. Nếu dùng link Google Drive, vui lòng đảm bảo file đã được cài đặt quyền "Bất kỳ ai có đường liên kết đều có thể xem".');
                    });
                    currentPreviewAudio.play().catch(err => {
                        btn.innerHTML = `${renderSvgIcon('play', 'icon-inline')} Nghe thử`;
                        console.warn('Playback error:', err);
                    });
                }
            });
        });
    }
}
