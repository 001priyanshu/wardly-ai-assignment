const KEY = 'wardly_uid';

function generateUid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `uid-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function getUid(): string {
  if (typeof window === 'undefined') return '';
  let v = window.localStorage.getItem(KEY);
  if (!v) {
    v = generateUid();
    window.localStorage.setItem(KEY, v);
  }
  return v;
}
