import { parseSseChunk } from '../exam-room-sse.js';

// One open room owns its stream, reader and reconnect delay.
export function createExamRoomSession({ isScopeCurrent, fetchStream, onMessage, refresh, onUnauthorized }) {
  const controller = new AbortController();
  let reader = null;
  let started = false;
  let timer = null;
  let finishDelay = null;
  const isCurrent = () => !controller.signal.aborted && isScopeCurrent();

  function cancelReader() {
    if (!reader) return;
    const current = reader;
    reader = null;
    try { Promise.resolve(current.cancel()).catch(() => {}); } catch { /* already closed */ }
  }

  function dispose() {
    controller.abort();
    cancelReader();
    if (timer !== null) clearTimeout(timer);
    timer = null;
    finishDelay?.();
    finishDelay = null;
  }

  function delayReconnect() {
    if (!isCurrent()) return Promise.resolve();
    return new Promise(resolve => {
      finishDelay = resolve;
      timer = setTimeout(() => {
        timer = null;
        finishDelay = null;
        resolve();
      }, 1000);
    });
  }

  async function start() {
    if (started || !isCurrent()) return;
    started = true;
    while (isCurrent()) {
      let connectionReader = null;
      try {
        const response = await fetchStream(controller.signal);
        if (response.body) {
          connectionReader = response.body.getReader();
          reader = connectionReader;
        }
        // A transport may resolve after abort; finally closes its unread body.
        if (!isCurrent()) return;
        if (response.status === 401) {
          onUnauthorized();
          dispose();
          return;
        }
        if (!response.ok || !connectionReader) throw new Error('Không kết nối được luồng Phòng thi.');
        const decoder = new TextDecoder();
        let buffer = '';
        while (isCurrent()) {
          const { done, value } = await connectionReader.read();
          if (!isCurrent() || done) break;
          const parsed = parseSseChunk(buffer, decoder.decode(value, { stream: true }));
          buffer = parsed.buffer;
          for (const message of parsed.events) {
            if (!isCurrent()) break;
            await onMessage(message);
          }
        }
      } catch {
        // Current owners refresh through REST before retrying the stream.
      } finally {
        cancelReader();
        try { connectionReader?.releaseLock(); } catch { /* pending transport read */ }
      }
      if (!isCurrent()) break;
      try { await refresh(); } catch { /* REST may recover on the next connection */ }
      if (!isCurrent()) break;
      await delayReconnect();
    }
  }

  return { start, dispose, isCurrent };
}
