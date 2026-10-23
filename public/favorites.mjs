const KEY = 'mieru-bosai:favorites:v1';
// Store stable identifying fields as well as the legacy row ID, so reordered data
// never silently changes a saved region into another region.
const identity = p => JSON.stringify([p.name, p.prefecture, p.address || '']);
export function createFavorites(storage, places) {
  let saved = [], available = true;
  try {
    const raw = JSON.parse(storage.getItem(KEY) || '[]');
    if (Array.isArray(raw)) {
      const keys = new Set(raw.filter(x => x && typeof x.key === 'string').map(x => x.key));
      saved = places.filter(p => keys.has(identity(p)));
    }
  } catch { available = false; }
  return {
    all: () => [...saved],
    has: p => saved.some(x => identity(x) === identity(p)),
    available: () => available,
    toggle(p) {
      const exists = saved.some(x => identity(x) === identity(p));
      const next = exists ? saved.filter(x => identity(x) !== identity(p)) : [...saved, p];
      try {
        storage.setItem(KEY, JSON.stringify(next.map(x => ({id: x.id, key: identity(x)}))));
        saved = next;
        available = true;
        return true;
      } catch { available = false; return false; }
    }
  };
}
