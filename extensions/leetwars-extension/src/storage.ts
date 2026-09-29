declare const chrome: any;

type PersistedState = {
  jobs: unknown[];
  backendToken?: string;
  backendUrl?: string;
  leetcodeUsername?: string;
  email?: string;
  name?: string;
};

const STORAGE_KEY = "leetwars_extension_state_v1";

export async function loadState(): Promise<PersistedState> {
  const res = await chrome.storage.local.get(STORAGE_KEY);
  const raw = res?.[STORAGE_KEY];
  if (raw && typeof raw === "object") {
    return {
      jobs: Array.isArray((raw as any).jobs) ? (raw as any).jobs : [],
      backendToken: (raw as any).backendToken,
      backendUrl: (raw as any).backendUrl,
      leetcodeUsername: (raw as any).leetcodeUsername,
      email: (raw as any).email,
      name: (raw as any).name
    };
  }
  return { jobs: [] };
}

export async function saveState(next: Partial<PersistedState>): Promise<void> {
  const current = await loadState();
  const merged = { ...current, ...next };
  
  // Prevent storage bloat by capping jobs to the most recent 50
  if (merged.jobs && merged.jobs.length > 50) {
    merged.jobs = merged.jobs.slice(-50);
  }

  await chrome.storage.local.set({
    [STORAGE_KEY]: merged,
  });
}

