/* @flow */

/* based on https://github.com/SomeHats/cache-map */

class Entry<T> {
  value: T;
  setAt: number;

  constructor(value: T) {
    this.value = value;
    this.setAt = Date.now();
  }
}

class CacheMap<K, V> {
  ttl: number;
  map: Map<K, Entry<V>>;

  constructor(ttl: number, evictInterval?: number) {
    this.map = new Map();
    this.ttl = ttl;
    setInterval(() => this.evictExpired(), evictInterval || ttl / 5);
  }

  clear() {
    return this.map.clear();
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }

  get(key: K): ?V {
    const entry = this.map.get(key);
    return entry ? entry.value : undefined;
  }

  set(key: K, value: V): this {
    this.map.set(key, new Entry(value));
    return this;
  }

  evictExpired() {
    const evictBefore = Date.now() - this.ttl;

    // eslint-disable-next-line no-restricted-syntax
    for (const [key, { setAt }] of this.map.entries()) {
      if (setAt < evictBefore) {
        this.map.delete(key);
      } else {
        // Map#entries iterates in insertion order,
        // so as soon as we encounter something inserted
        // later than we care about, we can stop iterating
        break;
      }
    }
  }
}

export default CacheMap;
