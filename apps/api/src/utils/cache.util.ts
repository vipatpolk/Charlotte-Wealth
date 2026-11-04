export class AsyncSingleflight {
  private inFlight = new Map<string, Promise<any>>();

  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      return this.inFlight.get(key) as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  clear(): void {
    this.inFlight.clear();
  }
}

export class TTLCache {
  private store = new Map<string, { expiry: number; value: any }>();

  constructor(
    private defaultTtlSeconds = 60.0,
    private maxEntries = 2000,
  ) {}

  get<T>(key: string): T | null {
    const item = this.store.get(key);
    if (!item) return null;

    if (Date.now() / 1000 < item.expiry) {
      return item.value as T;
    }

    this.store.delete(key);
    return null;
  }

  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const now = Date.now() / 1000;
    const expiry = now + (ttlSeconds !== undefined ? ttlSeconds : this.defaultTtlSeconds);

    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      // Prune expired
      for (const [k, v] of this.store.entries()) {
        if (now >= v.expiry) {
          this.store.delete(k);
        }
      }

      if (this.store.size >= this.maxEntries) {
        let earliestKey = '';
        let earliestExp = Infinity;
        for (const [k, v] of this.store.entries()) {
          if (v.expiry < earliestExp) {
            earliestExp = v.expiry;
            earliestKey = k;
          }
        }
        if (earliestKey) {
          this.store.delete(earliestKey);
        }
      }
    }

    this.store.set(key, { expiry, value });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export const ttlCache = new TTLCache(60.0, 2000);
export const singleflight = new AsyncSingleflight();

