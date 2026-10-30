// Internal resource ownership for a dashboard mount. Feature lifecycles remain separate.
export function createLifecycle(AbortControllerImpl = globalThis.AbortController) {
  const controller = new AbortControllerImpl();
  const timeouts = new Set();
  const intervals = new Set();
  const cleanups = new Set();
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
      timeouts.delete(id);
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
