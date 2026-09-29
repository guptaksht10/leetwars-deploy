declare const chrome: any;

import { loadState, saveState } from "../storage.js";
import { leetcodeCheckSubmission, leetcodeFetchSubmissionDetails } from "../lcClient.js";
import { postExtensionSubmissionResult, fetchActiveContests } from "../backendClient.js";

type InboundMessage =
  | { type: "LEETWARS_SUBMISSION_CAPTURED"; payload: { submissionId: number; submissionUrl?: string } }
  | { type: "LEETWARS_AUTH_SYNC"; payload: { email: string; leetcodeUsername: string; name: string; backendToken: string; backendUrl?: string } | null };

type JobStatus = "CAPTURED" | "POLLING" | "SUCCESS_PARSED" | "RECORDED" | "IGNORED" | "FAILED";

type SubmissionJob = {
  submissionId: number;
  createdAtMs: number;
  status: JobStatus;
  attempts: number;
  lastPollAtMs?: number;

  // Parsed fields after SUCCESS
  accepted?: boolean;
  statusMsg?: string;
  statusCode?: number;
  submissionTimestampMs?: number;

  // GraphQL details
  leetcodeUsername?: string;
  titleSlug?: string;
  questionId?: string;

  // raw
  payloadCheck?: unknown;
  payloadDetails?: unknown;

  recordedAtMs?: number;
  error?: string;
};

const BACKGROUND_POLL_INTERVAL_MS = 1500;
const BACKEND_RATE_LIMIT_JITTER_MS = 250;

async function ensureJobExists(jobs: SubmissionJob[], submissionId: number) {
  const existing = jobs.find((j) => j.submissionId === submissionId);
  if (existing) return existing;
  const job: SubmissionJob = {
    submissionId,
    createdAtMs: Date.now(),
    status: "CAPTURED",
    attempts: 0,
  };
  jobs.push(job);
  return job;
}

let isProcessing = false;

async function backgroundLoopOnce() {
  if (isProcessing) return; // skip if already running — prevents scheduler + setTimeout overlap
  isProcessing = true;
  try {
  const state = await loadState();
  const jobs = state.jobs as SubmissionJob[];

  const activeJobs = jobs.filter((j) => j.status === "CAPTURED" || j.status === "POLLING");
  if (activeJobs.length === 0) return;

  for (const job of activeJobs) {
    try {
      job.status = job.status === "CAPTURED" ? "POLLING" : job.status;
      job.attempts += 1;
      job.lastPollAtMs = Date.now();

      const check = await leetcodeCheckSubmission(job.submissionId);
      job.payloadCheck = check;

      // Per your spec: stop polling only when state === "SUCCESS"
      const stateStr = check?.state;
      if (stateStr !== "SUCCESS") {
        await saveState({ jobs });
        continue;
      }

      const statusMsg = check?.status_msg;
      const statusCode = check?.status_code;
      job.statusMsg = typeof statusMsg === "string" ? statusMsg : undefined;
      job.statusCode = typeof statusCode === "number" ? statusCode : undefined;

      // Acceptance strictly by status_msg === "Accepted"
      const accepted = job.statusMsg === "Accepted";
      job.accepted = accepted;

      // Fetch authoritative timestamp + details via GraphQL
      const details = await leetcodeFetchSubmissionDetails(job.submissionId);
      job.payloadDetails = details;

      const submissionDetails = details?.data?.submissionDetails;
      const timestampSeconds = submissionDetails?.timestamp;
      if (typeof timestampSeconds === "number") {
        job.submissionTimestampMs = timestampSeconds * 1000;
      }

      const lcUsername = submissionDetails?.user?.username;
      if (typeof lcUsername === "string") job.leetcodeUsername = lcUsername;

      const questionId = submissionDetails?.question?.questionId;
      if (typeof questionId === "string" || typeof questionId === "number") job.questionId = String(questionId);

      const titleSlug = submissionDetails?.question?.titleSlug;
      if (typeof titleSlug === "string") job.titleSlug = titleSlug;

      // Check username match
      const loggedInLcUser = state.leetcodeUsername;

      // We skip match check if loggedInLcUser isn't available yet
      // but ideally we only send if they match.
      if (loggedInLcUser && lcUsername && loggedInLcUser !== lcUsername) {
        job.status = "IGNORED";
        job.error = `Username mismatch. Submitted by ${lcUsername}, logged in as ${loggedInLcUser}.`;
        await saveState({ jobs });
        continue;
      }

      job.status = "SUCCESS_PARSED";
      await saveState({ jobs });

      // Call backend extension endpoint (separate namespace)
      // NOTE: backend endpoint path is expected to be implemented server-side.
      // This call will be ignored/rejected if not configured.
      const result = await postExtensionSubmissionResult({
        submissionId: job.submissionId,
        submissionTimestampMs: job.submissionTimestampMs,
        statusMsg: job.statusMsg,
        statusCode: job.statusCode,
        accepted: job.accepted ?? false,
        leetcodeUsername: job.leetcodeUsername,
        questionId: job.questionId,
        titleSlug: job.titleSlug,
        payloadCheck: job.payloadCheck,
        payloadDetails: job.payloadDetails,
      });

      // If backend returns success, mark recorded. If backend says ignored, we keep IGNORED.
      if (result?.ignored) {
        job.status = "IGNORED";
      } else if (result?.ok) {
        job.status = "RECORDED";
        job.recordedAtMs = Date.now();
      } else {
        job.status = "FAILED";
        job.error = result?.error || "backend_failed";
      }

      // small jitter before continuing loop to reduce burst load
      await new Promise((r) => setTimeout(r, BACKEND_RATE_LIMIT_JITTER_MS));
      await saveState({ jobs });
    } catch (e) {
      job.status = "FAILED";
      job.error = e instanceof Error ? e.message : String(e);
      await saveState({ jobs });
    }
  }
  } finally {
    isProcessing = false;
  }
}

chrome.runtime.onMessage.addListener((message: InboundMessage) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "LEETWARS_SUBMISSION_CAPTURED") {
    const { submissionId, submissionUrl } = message.payload;
    const titleSlug = submissionUrl ? submissionUrl.match(/\/problems\/([^/]+)\/submit\/?$/)?.[1] : undefined;

    (async () => {
      // Validate if the problem is in any active contest
      if (titleSlug) {
        try {
          const activeContests = await fetchActiveContests();
          let isRelevant = false;
          for (const c of activeContests) {
            if (c.problems && c.problems.some((p: any) => p.slug === titleSlug)) {
              isRelevant = true;
              break;
            }
          }
          if (!isRelevant && activeContests.length > 0) {
            console.log(`LeetWars Extension: Ignored submission ${submissionId} for ${titleSlug} (not in active contests)`);
            return;
          }
        } catch (e) {
          // If fetch fails, proceed with capturing to avoid dropping valid submissions
        }
      }

      const state = await loadState();
      const jobs = state.jobs as SubmissionJob[];
      await ensureJobExists(jobs, submissionId);
      await saveState({ jobs });

      // kick loop soon
      setTimeout(() => backgroundLoopOnce(), 250);
    })().catch(() => { });
  } else if (message.type === "LEETWARS_AUTH_SYNC") {
    if (message.payload) {
      saveState({
        backendToken: message.payload.backendToken,
        backendUrl: message.payload.backendUrl,
        leetcodeUsername: message.payload.leetcodeUsername,
        email: message.payload.email,
        name: message.payload.name
      }).catch(() => { });
    } else {
      saveState({
        backendToken: undefined,
        leetcodeUsername: undefined,
        email: undefined,
        name: undefined
      }).catch(() => { });
    }
  }
});

// Polling scheduler (MV3 service worker)
async function scheduler() {
  while (true) {
    try {
      await backgroundLoopOnce();
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, BACKGROUND_POLL_INTERVAL_MS));
  }
}

// Start scheduler
scheduler().catch(() => { });
