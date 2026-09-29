declare const chrome: any;

const BACKEND_BASE_URL = (globalThis as any).LEETWARS_BACKEND_BASE_URL || "http://localhost:5000/api/extensions";

/**
 * Extension will call backend with parsed submission outcome.
 * You said “separate endpoints for extensions” — this is that namespace.
 *
 * Expected backend to implement:
 *   POST {BACKEND_BASE_URL}/submit-result
 */
export async function postExtensionSubmissionResult(payload: {
  submissionId: number;
  submissionTimestampMs?: number;
  statusMsg?: string;
  statusCode?: number;
  accepted: boolean;

  leetcodeUsername?: string;
  questionId?: string;
  titleSlug?: string;

  payloadCheck?: unknown;
  payloadDetails?: unknown;
}): Promise<{ ok: boolean; ignored?: boolean; error?: string }> {
  // Auth strategy:
  // - We are not yet implementing extension login UI here.
  // - This assumes you will provide backend token via chrome.storage.local (later phase).
  const state = await chrome.storage.local.get("leetwars_extension_state_v1");
  const token = (state?.leetwars_extension_state_v1 as any)?.backendToken as string | undefined;
  
  // Use dynamically synced backendUrl if available, otherwise fallback to local
  const dynamicUrl = (state?.leetwars_extension_state_v1 as any)?.backendUrl as string | undefined;
  const baseUrl = dynamicUrl || BACKEND_BASE_URL;

  const url = `${baseUrl}/submit-result`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "omit",
  });

  // If backend returns 401 because token not provided yet, keep as non-ok.
  if (!res.ok) {
    let msg = `backend_http_${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
    } catch {
      // ignore
    }
    return { ok: false, error: msg };
  }

  const data = await res.json().catch(() => ({}));
  // Convention: backend responds { ok: true } or { ignored: true }
  if (data?.ignored) return { ok: true, ignored: true };
  if (data?.ok) return { ok: true };
  return { ok: true };
}

export async function fetchActiveContests(): Promise<any[]> {
  const state = await chrome.storage.local.get("leetwars_extension_state_v1");
  const token = (state?.leetwars_extension_state_v1 as any)?.backendToken as string | undefined;

  const dynamicUrl = (state?.leetwars_extension_state_v1 as any)?.backendUrl as string | undefined;
  const baseUrl = dynamicUrl || BACKEND_BASE_URL;

  if (!token) return [];

  const url = `${baseUrl}/active-contests`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return data.activeContests || [];
  } catch (err) {
    return [];
  }
}
