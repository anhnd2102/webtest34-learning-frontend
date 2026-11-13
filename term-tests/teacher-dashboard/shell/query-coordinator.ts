// NGUỒN: file .ts này; query-coordinator.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
// Generation and abort coordinator for dashboard read queries
export interface QueryHandle {
  id: number;
  signal: AbortSignal | undefined;
  isCurrent(): boolean;
}

interface QueryGeneration { id: number, controller: AbortController | null }

export function createQueryCoordinator(
  lifecycle: { isDisposed?: () => boolean } | null = null,
  AbortControllerImpl: typeof AbortController | undefined = globalThis.AbortController
) {
  const generations = new Map<string, QueryGeneration>();
  let nextGeneration = 0;
  let disposed = false;

  const isScopeDisposed = () => disposed || Boolean(lifecycle?.isDisposed?.());

  return {
    begin(scopeKey: string | null | undefined): QueryHandle | null {
      if (isScopeDisposed() || !scopeKey) return null;
      const prev = generations.get(scopeKey);
      if (prev?.controller) {
        try { prev.controller.abort(); } catch (_) {}
      }
      const id = ++nextGeneration;
      const controller = AbortControllerImpl ? new AbortControllerImpl() : null;
      const entry: QueryGeneration = { id, controller };
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
    isCurrent(scopeKey: string | null | undefined, id: number): boolean {
      if (isScopeDisposed() || !scopeKey) return false;
      return generations.get(scopeKey)?.id === id;
    },
    cancel(scopeKey: string | null | undefined): void {
      if (!scopeKey) return;
      const prev = generations.get(scopeKey);
      if (prev?.controller) {
        try { prev.controller.abort(); } catch (_) {}
      }
      generations.delete(scopeKey);
    },
    dispose(): void {
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
