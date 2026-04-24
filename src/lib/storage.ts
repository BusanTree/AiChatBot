export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Silently ignore storage quota or serialization errors.
  }
}

export function loadString(key: string, fallback = '') {
  return localStorage.getItem(key) ?? fallback
}

export function saveString(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore.
  }
}

export function removeKey(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore.
  }
}
