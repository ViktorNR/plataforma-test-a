// Limitador simple en memoria (suficiente para una sola instancia).
const hits = new Map<string, number[]>();

export function tooManyAttempts(key: string, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

export function clearAttempts(key: string) {
  hits.delete(key);
}
