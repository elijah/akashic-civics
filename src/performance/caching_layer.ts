/**
 * Result Caching Layer
 *
 * Intermediate result caching with memoization, LRU eviction,
 * and disk persistence across runs. Avoids recomputation of
 * expensive statistical operations (baseline creation,
 * disconfirmation tests, etc.).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export const CACHE_DIR_NAME = 'cache';

export interface CacheEntry {
  timestamp: number;
  ttl: number;  // seconds
  size: number;
  filePath: string;
}

export interface CacheIndex {
  [key: string]: CacheEntry;
}

export interface CacheOptions {
  maxSize?: number;      // bytes, default 50MB
  defaultTtl?: number;   // seconds, default 24h
  persist?: boolean;      // disk cache, default true
}

export class CacheManager {
  private rootDir: string;
  private maxSize: number;
  private defaultTtl: number;
  private persist: boolean;
  private cacheDir: string;
  private index: CacheIndex;

  constructor(rootDir: string, options: CacheOptions = {}) {
    this.rootDir = path.resolve(rootDir);
    this.maxSize = options.maxSize ?? 50 * 1024 * 1024;
    this.defaultTtl = options.defaultTtl ?? 86400;
    this.persist = options.persist ?? true;
    this.cacheDir = path.join(this.rootDir, CACHE_DIR_NAME);
    this.index = this.loadIndex();
  }

  /** Generate a deterministic key from an input payload. */
  private keyFor(payload: unknown): string {
    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /** Lookup a cached value. Returns null if missing or expired. */
  lookup<T>(payload: unknown): T | null {
    const key = this.keyFor(payload);
    const entry = this.index[key];
    if (!entry) {
      return this.readFromDisk<T>(key);
    }

    const ageMs = Date.now() - entry.timestamp;
    if (ageMs > entry.ttl * 1000) {
      // expired
      this.removeEntry(key);
      return null;
    }
    return this.readFromDisk<T>(entry.filePath) ?? null;
  }

  /** Store a value in cache with the given TTL (seconds). */
  store<T>(payload: unknown, value: T, ttl?: number): void {
    const key = this.keyFor(payload);
    const effectiveTtl = ttl ?? this.defaultTtl;
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');

    this.ensureCacheDir();
    const filePath = path.join(this.cacheDir, `${key}.json`);

    if (this.persist) {
      fs.writeFileSync(filePath, serialized, 'utf8');
    }

    this.index[key] = { timestamp: Date.now(), ttl: effectiveTtl, size, filePath };
    this.saveIndex();
    this.pruneIfNeeded();
  }

  /** Invalidate (remove) a specific cached entry. */
  invalidate(payload: unknown): void {
    const key = this.keyFor(payload);
    this.removeEntry(key);
    this.saveIndex();
  }

  /** Clear the entire cache. */
  clear(): void {
    if (fs.existsSync(this.cacheDir)) {
      fs.rmSync(this.cacheDir, { recursive: true, force: true });
    }
    this.index = {};
    this.ensureCacheDir();
    fs.writeFileSync(this.indexPath(), JSON.stringify(this.index, null, 2), 'utf8');
  }

  /** Current number of cached entries. */
  size(): number {
    return Object.keys(this.index).length;
  }

  /** Approximate total bytes used by cached entries. */
  currentSize(): number {
    return Object.values(this.index).reduce((sum, e) => sum + e.size, 0);
  }

  private loadIndex(): CacheIndex {
    const indexPath = this.indexPath();
    if (fs.existsSync(indexPath)) {
      try {
        return JSON.parse(fs.readFileSync(indexPath, 'utf8')) as CacheIndex;
      } catch {
        return {};
      }
    }
    this.ensureCacheDir();
    return {};
  }

  private saveIndex(): void {
    this.ensureCacheDir();
    fs.writeFileSync(
      this.indexPath(),
      JSON.stringify(this.index, null, 2),
      'utf8'
    );
  }

  private indexPath(): string {
    return path.join(this.cacheDir, 'index.json');
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private readFromDisk<T>(filePath: string): T | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    } catch {
      return null;
    }
  }

  private removeEntry(key: string): void {
    const entry = this.index[key];
    if (entry?.filePath) {
      try {
        fs.unlinkSync(entry.filePath);
      } catch {
        // ignore
      }
    }
    delete this.index[key];
  }

  /** Evict oldest entries (LRU) until cache is under maxSize. */
  private pruneIfNeeded(): void {
    const entries = Object.entries(this.index);
    let totalSize = entries.reduce((sum, [, e]) => sum + e.size, 0);

    if (totalSize <= this.maxSize) return;

    // Sort by timestamp (oldest first - LRU eviction)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    for (const [key, entry] of entries) {
      if (totalSize <= this.maxSize) break;
      try {
        fs.unlinkSync(entry.filePath);
      } catch {
        // ignore
      }
      totalSize -= entry.size;
      delete this.index[key];
    }
    this.saveIndex();
  }
}

/** Convenience factory. */
export function createCacheManager(
  rootDir: string,
  options: CacheOptions = {}
): CacheManager {
  return new CacheManager(rootDir, options);
}

/** Memoized wrapper: caches results of a pure async function. */
export function memoize<TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  _options?: CacheOptions
): (...args: TArgs) => Promise<TReturn> {
  // Use a standalone in-memory cache to avoid key generation conflicts
  // between CacheManager's keyFor (which double-JSON-stringifies) and
  // the key generation here. Disk persistence can be added later.
  const cache = new Map<string, TReturn>();

  return async (...args: TArgs): Promise<TReturn> => {
    const key = JSON.stringify(
      args.map(a => (a instanceof Date ? a.toISOString() : a))
    );
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = await fn(...args);
    cache.set(key, result);
    return result;
  };
}
