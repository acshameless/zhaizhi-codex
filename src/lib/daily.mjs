export function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function pickDaily(items, date = new Date()) {
  if (!items.length) return null;
  return items[hashString(dateKey(date)) % items.length];
}

export function pickRotation(items, count) {
  if (items.length <= count) return [...items];
  const step = Math.floor(items.length / count);
  const out = [];
  for (let i = 0; i < items.length && out.length < count; i += step) {
    out.push(items[i]);
  }
  return out;
}
