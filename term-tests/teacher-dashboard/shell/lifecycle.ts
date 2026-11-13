// NGUỒN: file .ts này; lifecycle.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
// Internal resource ownership for a dashboard mount. Feature lifecycles remain separate.
export interface Lifecycle {
  onDispose(callback: () => void): void;
  listen(target: EventTarget | null | undefined, type: string, callback: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  timeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> | undefined;
  clearTimeout(id: ReturnType<typeof setTimeout> | undefined): void;
  interval(callback: () => void, delay: number): ReturnType<typeof setInterval> | undefined;
  dispose(): void;
  isDisposed(): boolean;
}

export function createLifecycle(AbortControllerImpl: typeof AbortController = globalThis.AbortController): Lifecycle {
  const controller = new AbortControllerImpl();
  const timeouts = new Set<ReturnType<typeof setTimeout>>();
  const intervals = new Set<ReturnType<typeof setInterval>>();
  const cleanups = new Set<() => void>();
  let disposed = false;
  return {
    onDispose(callback) {
      if (disposed) callback();
      else cleanups.add(callback);
    },
    listen(target, type, callback, options = {}) {
      if (disposed || !target) return;
      const settings = typeof options === 'boolean' ? { capture: options } : options;
      target.addEventListener(type, callback, { ...settings, signal: controller.signal });
    },
    timeout(callback, delay) {
      if (disposed) return;
      const id = setTimeout(() => {
        timeouts.delete(id);
        if (!disposed) callback();
      }, delay);
      timeouts.add(id);
      return id;
    },
    clearTimeout(id) {
      clearTimeout(id);
      if (id !== undefined) timeouts.delete(id);
    },
    interval(callback, delay) {
      if (disposed) return;
      const id = setInterval(() => { if (!disposed) callback(); }, delay);
      intervals.add(id);
      return id;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      for (const cleanup of cleanups) cleanup();
      cleanups.clear();
      for (const id of timeouts) clearTimeout(id);
      for (const id of intervals) clearInterval(id);
      timeouts.clear();
      intervals.clear();
    },
    isDisposed() {
      return disposed;
    }
  };
}
