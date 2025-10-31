type CacheEntry = { value: any; expiresAt: number; key: string; userId?: string };

export class DslCacheService {
  private static instance: DslCacheService | null = null;
  private readonly maxTotalKeys: number;
  private readonly maxKeysPerUser: number;
  private store = new Map<string, CacheEntry>();
  private perUserCounts = new Map<string, number>();
  private hits = 0;
  private misses = 0;

  private constructor(maxTotalKeys: number, maxKeysPerUser: number) {
    this.maxTotalKeys = maxTotalKeys;
    this.maxKeysPerUser = maxKeysPerUser;
  }

  static getInstance(): DslCacheService {
    if (!DslCacheService.instance) {
      const maxTotal = Number(process.env.DSL_CACHE_MAX_KEYS || 1000);
      const maxPerUser = Number(process.env.DSL_CACHE_MAX_KEYS_PER_USER || 200);
      DslCacheService.instance = new DslCacheService(maxTotal, maxPerUser);
    }
    return DslCacheService.instance;
  }

  get(key: string): any | undefined {
    const now = Date.now();
    const hit = this.store.get(key);
    if (!hit) {
      this.misses++;
      return undefined;
    }
    if (hit.expiresAt <= now) {
      this.delete(key);
      this.misses++;
      return undefined;
    }
    // LRU: bump recency
    this.store.delete(key);
    this.store.set(key, hit);
    this.hits++;
    return hit.value;
  }

  set(key: string, value: any, ttlMs: number, userId?: string) {
    const now = Date.now();
    const entry: CacheEntry = { value, expiresAt: now + ttlMs, key, userId };
    // Per-user quota
    if (userId) {
      const cnt = this.perUserCounts.get(userId) || 0;
      if (cnt >= this.maxKeysPerUser) {
        // Evict oldest keys of this user
        for (const [k, e] of this.store) {
          if (e.userId === userId) {
            this.delete(k);
            break;
          }
        }
      }
    }
    // Total capacity
    if (this.store.size >= this.maxTotalKeys) {
      const oldestKey = this.store.keys().next().value as string | undefined;
      if (oldestKey) this.delete(oldestKey);
    }
    this.store.set(key, entry);
    if (userId) this.perUserCounts.set(userId, (this.perUserCounts.get(userId) || 0) + 1);
  }

  delete(key: string) {
    const e = this.store.get(key);
    if (!e) return;
    this.store.delete(key);
    if (e.userId) {
      const cnt = (this.perUserCounts.get(e.userId) || 0) - 1;
      if (cnt <= 0) this.perUserCounts.delete(e.userId);
      else this.perUserCounts.set(e.userId, cnt);
    }
  }

  size(): number {
    return this.store.size;
  }

  metrics() {
    const total = this.hits + this.misses;
    const hitRate = total ? this.hits / total : 0;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: this.store.size,
      perUserSizes: Array.from(this.perUserCounts.entries()).map(([userId, count]) => ({ userId, count })),
    };
  }
}