// vitest jsdom 환경에서 window.localStorage가 메서드 없는 빈 객체로 노출되는 이슈가 있어
// 테스트용으로 Map 기반 Storage 폴리필을 주입한다.
// (production 빌드에는 영향 없음 — vite.config.js의 setupFiles로만 로드됨)

class MapStorage {
  constructor() {
    this._store = new Map();
  }
  get length() {
    return this._store.size;
  }
  key(i) {
    return [...this._store.keys()][i] ?? null;
  }
  getItem(k) {
    return this._store.has(k) ? this._store.get(k) : null;
  }
  setItem(k, v) {
    this._store.set(String(k), String(v));
  }
  removeItem(k) {
    this._store.delete(String(k));
  }
  clear() {
    this._store.clear();
  }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: new MapStorage(),
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: new MapStorage(),
  });
}
