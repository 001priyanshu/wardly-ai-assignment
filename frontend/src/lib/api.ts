import type { ClinicalBrief, SessionDetail, SessionListItem } from './types';
import { getUid } from './uid';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000';

function headers(extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-uid': getUid(),
    ...(extra ?? {}),
  };
}

export async function startSession(): Promise<{ sessionId: string }> {
  const res = await fetch(`${BASE}/api/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({}),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`startSession failed: ${res.status}`);
  return res.json();
}

export async function listSessions(): Promise<SessionListItem[]> {
  const res = await fetch(`${BASE}/api/sessions`, {
    headers: headers(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`listSessions failed: ${res.status}`);
  const data = (await res.json()) as { sessions: SessionListItem[] };
  return data.sessions;
}

export async function getSession(id: string): Promise<SessionDetail> {
  const res = await fetch(`${BASE}/api/sessions/${id}`, {
    headers: headers(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`getSession failed: ${res.status}`);
  return res.json();
}

export async function getBrief(id: string): Promise<{ markdown: string; json: ClinicalBrief }> {
  const res = await fetch(`${BASE}/api/sessions/${id}/brief`, {
    headers: headers(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`getBrief failed: ${res.status}`);
  return res.json();
}

export async function finalizeSession(
  id: string,
): Promise<{ markdown: string; json: ClinicalBrief }> {
  const res = await fetch(`${BASE}/api/sessions/${id}/finalize`, {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`finalize failed: ${res.status}`);
  return res.json();
}

export const apiBase = BASE;
