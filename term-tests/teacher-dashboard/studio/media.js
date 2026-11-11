import { defaultApiBase } from '../api/teacher.js';
import {
  escapeHtml
} from '../ui/presentation.js';
import {
  renderSvgIcon
} from '../ui/icons.js';

export function convertGoogleDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.includes('drive.google.com')) {
    let fileId = null;
    let resourceKey = null;

    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch) {
      fileId = fileDMatch[1];
    }

    if (!fileId) {
      const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch) {
        fileId = idParamMatch[1];
      }
    }

    const resKeyMatch = trimmed.match(/[?&]resourcekey=([a-zA-Z0-9_-]+)/);
    if (resKeyMatch) {
      resourceKey = resKeyMatch[1];
    }

    if (fileId) {
      let result = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
      if (resourceKey) {
        result += `&resourcekey=${resourceKey}`;
      }
      return result;
    }
  }

  return trimmed;
}

export function convertGoogleDriveAudioUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    let fileId = null;
    let resourceKey = null;

    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch) {
      fileId = fileDMatch[1];
    }

    if (!fileId) {
      const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch) {
        fileId = idParamMatch[1];
      }
    }

    const resKeyMatch = trimmed.match(/[?&]resourcekey=([a-zA-Z0-9_-]+)/);
    if (resKeyMatch) {
      resourceKey = resKeyMatch[1];
    }

    if (fileId) {
      let result = `https://docs.google.com/uc?export=download&id=${fileId}`;
      if (resourceKey) {
        result += `&resourcekey=${resourceKey}`;
      }
      return result;
    }
  }

  return trimmed;
}

export function renderStrictCandidateAudioDock(container, options = {}) {
  const rawUrl = options.audioUrl || '';
  let streamUrl = convertGoogleDriveAudioUrl(rawUrl);
  if (!streamUrl) return '';

  const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    let apiBase = '';
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const isLocal = hostname === '127.0.0.1' || hostname === 'localhost';
      if (isLocal) {
        apiBase = (window.location.port === '8034' || window.location.port === '8788')
          ? ''
          : `${window.location.protocol}//${hostname}:8788`;
      } else if (hostname === 'webtest.ducanhdev.com') {
        apiBase = '';
      } else {
        apiBase = defaultApiBase();
      }
    }
    const cleanBase = apiBase ? apiBase.replace(/\/$/, '') : '';
    streamUrl = `${cleanBase}/api/teacher/media/drive-stream?id=${encodeURIComponent(fileId)}`;
  } else if (streamUrl.startsWith('assets/')) {
    streamUrl = `https://pub-2a60b39d70e14f98a922aaa8cb1f1dd2.r2.dev/${streamUrl}`;
  }

  const label = options.label || 'Bài nghe phần thi';
  const dockHtml = `
    <div class="strict-audio-dock candidate-audio-dock" data-audio-url="${escapeHtml(streamUrl)}">
      <div class="strict-audio-header">
        <span class="audio-badge">${renderSvgIcon('audio', 'icon-inline')} ${escapeHtml(label)}</span>
        <div class="audio-volume-control">
          <label class="volume-label" title="Âm lượng loa">
            ${renderSvgIcon('volume', 'icon-inline')}
          </label>
          <input type="range" class="candidate-audio-volume" min="0" max="1" step="0.05" value="1" aria-label="Âm lượng loa" />
          <output class="volume-output">100%</output>
        </div>
      </div>
      <div class="strict-audio-body">
        <button type="button" class="btn btn-primary btn-sm btn-start-listening">
          ${renderSvgIcon('play', 'icon-inline')} Bắt đầu nghe
        </button>
        <div class="audio-live-status" hidden>
          <span class="dot"></span>
          <span class="status-text">Đang phát bài nghe…</span>
        </div>
        <div class="audio-ended-notice" hidden>
          <span class="dot dot-ended" style="background:#12805c;"></span>
          <span class="audio-note">Đã phát xong · Audio chỉ được nghe một lần.</span>
        </div>
      </div>
      <audio class="audio-hidden-element" src="${escapeHtml(streamUrl)}" preload="none" style="position:absolute;width:1px;height:1px;opacity:0.001;pointer-events:none;"></audio>
    </div>
  `;

  if (container && typeof container === 'object') {
    container.innerHTML = dockHtml;
    const startBtn = container.querySelector('.btn-start-listening');
    const volumeInput = container.querySelector('.candidate-audio-volume');
    const volumeOutput = container.querySelector('.volume-output');
    const liveStatus = container.querySelector('.audio-live-status');
    const endedNotice = container.querySelector('.audio-ended-notice');
    const audioEl = container.querySelector('.audio-hidden-element');

    if (audioEl) {
      let hasStarted = false;
      let maxPlayedTime = 0;

      audioEl.muted = false;

      if (startBtn) {
        startBtn.addEventListener('click', async () => {
          if (hasStarted) return;
          hasStarted = true;
          startBtn.hidden = true;
          if (liveStatus) liveStatus.hidden = false;
          try {
            audioEl.muted = false;
            await audioEl.play();
          } catch (err) {
            console.error('Không thể tự động phát audio:', err);
          }
        });
      }

      if (volumeInput) {
        volumeInput.addEventListener('input', (e) => {
          const val = Number(e.target.value) || 0;
          audioEl.volume = val;
          audioEl.muted = false;
          if (volumeOutput) {
            volumeOutput.textContent = `${Math.round(val * 100)}%`;
          }
        });
      }

      if (typeof audioEl.addEventListener === 'function') {
        audioEl.addEventListener('timeupdate', () => {
          maxPlayedTime = Math.max(maxPlayedTime, audioEl.currentTime);
        });

        // Strict Exam Mode: Chặn dừng bài nghe (ngoại trừ khi kết thúc)
        audioEl.addEventListener('pause', () => {
          if (!audioEl.ended && hasStarted) {
            audioEl.play().catch(() => {});
          }
        });

        audioEl.addEventListener('ended', () => {
          if (liveStatus) liveStatus.hidden = true;
          if (endedNotice) endedNotice.hidden = false;
          if (startBtn) {
            startBtn.disabled = true;
          }
        });
      }
    }
  }

  return dockHtml;
}

export function initStrictCandidateAudioDocks(rootEl) {
  if (!rootEl || typeof rootEl.querySelectorAll !== 'function') return;
  const docks = rootEl.querySelectorAll('.strict-audio-dock');
  docks.forEach(dock => {
    const startBtn = dock.querySelector('.btn-start-listening');
    const volumeInput = dock.querySelector('.candidate-audio-volume');
    const volumeOutput = dock.querySelector('.volume-output');
    const liveStatus = dock.querySelector('.audio-live-status');
    const endedNotice = dock.querySelector('.audio-ended-notice');
    const audioEl = dock.querySelector('.audio-hidden-element');

    if (!audioEl) return;
    let hasStarted = false;
    let maxPlayedTime = 0;

    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        if (hasStarted) return;
        hasStarted = true;
        startBtn.hidden = true;
        if (liveStatus) liveStatus.hidden = false;
        try {
          await audioEl.play();
        } catch (err) {
          console.error('Không thể tự động phát audio:', err);
        }
      });
    }

    if (volumeInput) {
      volumeInput.addEventListener('input', (e) => {
        const val = Number(e.target.value) || 0;
        audioEl.volume = val;
        if (volumeOutput) {
          volumeOutput.textContent = `${Math.round(val * 100)}%`;
        }
      });
    }

    if (typeof audioEl.addEventListener === 'function') {
      audioEl.addEventListener('timeupdate', () => {
        maxPlayedTime = Math.max(maxPlayedTime, audioEl.currentTime);
      });

      // Strict Exam Mode: Chặn tua lại hoặc tua tiến
      audioEl.addEventListener('seeking', () => {
        if (Math.abs(audioEl.currentTime - maxPlayedTime) > 1.2) {
          audioEl.currentTime = maxPlayedTime;
        }
      });

      // Strict Exam Mode: Chặn dừng bài nghe (ngoại trừ khi kết thúc)
      audioEl.addEventListener('pause', () => {
        if (!audioEl.ended && hasStarted) {
          audioEl.play().catch(() => {});
        }
      });

      audioEl.addEventListener('ended', () => {
        if (liveStatus) liveStatus.hidden = true;
        if (endedNotice) endedNotice.hidden = false;
        if (startBtn) {
          startBtn.disabled = true;
        }
      });
    }
  });
}

export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (/^(?:javascript|data|file|http):/i.test(trimmed)) {
    return false;
  }

  if (/^https:\/\//i.test(trimmed)) {
    return true;
  }
  if (/^\/?assets\//i.test(trimmed)) {
    return true;
  }

  return false;
}
