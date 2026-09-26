interface Entry<T> {
  value: T
  expiresAt: number
}

/** Minimal in-process TTL cache. No Redis, no database - per the project's
 * "avoid unnecessary infrastructure" rule, this is enough for a single
 * lightweight proxy instance caching rarely-changing reference data. */
export class TtlCache<T> {
  private store = new Map<string, Entry<T>>()

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  async getOrLoad(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.get(key)
    if (cached !== undefined) return cached
    const value = await loader()
    this.set(key, value)
    return value
  }
}
