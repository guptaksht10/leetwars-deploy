/**
 * This script runs in the MAIN world, meaning it shares the execution environment
 * with LeetCode. It can monkey-patch window.fetch.
 */

(function initSubmitInterception() {
  if ((window as any).__leetwars_fetch_patched) return;
  (window as any).__leetwars_fetch_patched = true;

  const isLeetCodeSubmitUrl = (url: string) => {
    return /\/problems\/[^/]+\/submit\/?$/.test(url);
  };

  const originalFetch = window.fetch;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overriddenFetch = (async (...args: any[]) => {
    const [resource, init] = args as [RequestInfo | URL, RequestInit?];
    const url = typeof resource === "string" ? resource : resource.toString();

    if (isLeetCodeSubmitUrl(url)) {
      const res = await originalFetch(resource as any, init as any);

      try {
        const cloned = res.clone();
        const data = await cloned.json();
        const submissionId = data?.submission_id;

        if (typeof submissionId === "number" || (typeof submissionId === "string" && submissionId.trim())) {
          const n = Number(submissionId);
          if (Number.isFinite(n)) {
            // Forward to ISOLATED world content script
            window.postMessage({
              type: "LEETWARS_SUBMISSION_RELAY",
              payload: { submissionId: n, submissionUrl: url },
            }, "*");
          }
        }
      } catch {
        // ignore
      }
      return res;
    }
    return originalFetch(resource, init);
  });

  window.fetch = overriddenFetch as unknown as typeof window.fetch;

  // XHR fallback
  const OriginalXHR = window.XMLHttpRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.XMLHttpRequest = function (this: any, ...rest: any[]) {
    const xhr = new (OriginalXHR as any)(...(rest as any));

    const originalOpen = xhr.open.bind(xhr);
    xhr.open = (method: string, url: string, async?: boolean, user?: string | null, password?: string | null) => {
      (xhr as any).__leetwars_submit_url__ = typeof url === "string" ? url : String(url);
      (xhr as any).__leetwars_method__ = method;
      return originalOpen(method, url, async as any, user as any, password as any);
    };

    xhr.addEventListener("load", () => {
      const url = (xhr as any).__leetwars_submit_url__;
      const method = (xhr as any).__leetwars_method__;
      if (method === "POST" && typeof url === "string" && isLeetCodeSubmitUrl(url)) {
        try {
          const bodyText = (xhr as any).responseText;
          if (!bodyText) return;
          const data = JSON.parse(bodyText);
          const submissionId = data?.submission_id;
          if (typeof submissionId === "number") {
            window.postMessage({
              type: "LEETWARS_SUBMISSION_RELAY",
              payload: { submissionId, submissionUrl: url },
            }, "*");
          }
        } catch {
          // ignore
        }
      }
    });

    return xhr;
  } as unknown as typeof XMLHttpRequest;
})();
