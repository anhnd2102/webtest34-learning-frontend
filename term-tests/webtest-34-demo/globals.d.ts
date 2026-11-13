// Biến toàn cục do exam-guard.js gắn vào globalThis (nạp bằng thẻ <script> trước content-preview.mjs).
export {};

declare global {
  // eslint-disable-next-line no-var
  var isIosDevice: ((nav: { userAgent?: string, maxTouchPoints?: number }) => boolean) | undefined;
  // eslint-disable-next-line no-var
  var examGuardReducer: (
    state: { running: boolean, fullscreenSupported: boolean, ignoreFocusSignals: boolean, prompt?: boolean, superseded?: boolean, incidentId?: string, lastIncidentAt?: number },
    event: { type: 'device_superseded' | 'left_exam' | 'return_click', reason?: 'blur' | 'hidden' | 'fullscreen', at?: number, incidentId?: string }
  ) => {
    state: { running: boolean, fullscreenSupported: boolean, ignoreFocusSignals: boolean, prompt?: boolean, superseded?: boolean, incidentId?: string, lastIncidentAt?: number },
    commands: ({ type: 'open_incident' | 'close_incident', incidentId: string } | { type: 'pause_audio' | 'resume_audio' | 'request_fullscreen' })[]
  };
  // eslint-disable-next-line no-var
  var selfProctoringNotice: (selfProctoring: { exitLimit: number, exitCount?: number, autoSubmitted?: boolean }) => { level: 'info' | 'danger' | 'submitted', text: string };
}
