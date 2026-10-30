// Generation and abort coordinator for dashboard read queries
export function createQueryCoordinator(lifecycle = null, AbortControllerImpl = globalThis.AbortController) {
  const generations = new Map();
  let nextGeneration = 0;
  let disposed = false;

  const isScopeDisposed = () => disposed || Boolean(lifecycle?.isDisposed?.());

  return {
    begin(scopeKey) {
      if (isScopeDisposed() || !scopeKey) return null;
      const prev = generations.get(scopeKey);
      if (prev?.controller) {
        try { prev.controller.abort(); } catch (_) {}
      }
      const id = ++nextGeneration;
      const controller = AbortControllerImpl ? new AbortControllerImpl() : null;
      const entry = { id, controller };
      generations.set(scopeKey, entry);

      return {
        id,
        signal: controller?.signal,
        isCurrent() {
          if (isScopeDisposed()) return false;
          return generations.get(scopeKey)?.id === id;
        }
      };
    },
    isCurrent(scopeKey, id) {
      if (isScopeDisposed() || !scopeKey) return false;
      return generations.get(scopeKey)?.id === id;
    },
    cancel(scopeKey) {
      if (!scopeKey) return;
      const prev = generations.get(scopeKey);
      if (prev?.controller) {
        try { prev.controller.abort(); } catch (_) {}
      }
      generations.delete(scopeKey);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const entry of generations.values()) {
        if (entry.controller) {
          try { entry.controller.abort(); } catch (_) {}
        }
      }
      generations.clear();
    }
  };
}
