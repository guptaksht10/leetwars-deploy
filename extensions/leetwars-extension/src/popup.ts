import { loadState } from "./storage.js";
import { fetchActiveContests } from "./backendClient.js";

declare const chrome: any;

const FRONTEND_URL = "https://leetwars.vercel.app/login";

document.addEventListener("DOMContentLoaded", async () => {
  const loadingDiv = document.getElementById("loading");
  const authDiv = document.getElementById("authenticated");
  const unauthDiv = document.getElementById("unauthenticated");
  const usernameSpan = document.getElementById("username");
  const loginBtn = document.getElementById("login-btn");
  const contestsLoading = document.getElementById("contests-loading");
  const contestsList = document.getElementById("contests-list");
  const logoutBtn = document.getElementById("logout-btn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "LEETWARS_AUTH_SYNC", payload: null });
      setTimeout(() => window.location.reload(), 100);
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: FRONTEND_URL });
    });
  }

  try {
    const state = await loadState();
    console.log("Extension state loaded:", state);
    
    if (loadingDiv) loadingDiv.classList.add("hidden");
    
    // Check if we have auth tokens saved
    const backendToken = (state as any).backendToken;
    const leetcodeUsername = (state as any).leetcodeUsername;
    const name = (state as any).name;
    const email = (state as any).email;

    if (backendToken) {
      if (logoutBtn) logoutBtn.classList.remove("hidden");
      if (authDiv) authDiv.classList.remove("hidden");
      if (usernameSpan) {
        if (leetcodeUsername) {
          usernameSpan.textContent = leetcodeUsername;
          usernameSpan.classList.add("success");
          usernameSpan.classList.remove("error");
        } else {
          usernameSpan.textContent = `No LC Username Set! (Logged in as ${name || email})`;
          usernameSpan.classList.remove("success");
          usernameSpan.classList.add("error");
        }
      }

      // Render jobs
      const jobsList = document.getElementById("jobs-list");
      if (jobsList) {
        const jobs = Array.isArray(state.jobs) ? state.jobs.slice().reverse() : [];
        if (jobs.length === 0) {
          jobsList.innerHTML = "<span style='color: #64748b;'>No submissions captured yet.</span>";
        } else {
          jobsList.innerHTML = jobs.map((j: any) => {
            const time = new Date(j.createdAtMs).toLocaleTimeString();
            let color = "#94a3b8"; // default
            if (j.status === "RECORDED") color = "#4ade80";
            if (j.status === "FAILED" || j.status === "IGNORED") color = "#f87171";
            if (j.status === "POLLING" || j.status === "CAPTURED") color = "#fbbf24";
            
            let extra = j.status;
            if (j.error) extra += ` - ${j.error}`;
            else if (j.titleSlug) extra += ` - ${j.titleSlug} (${j.accepted ? 'Accepted' : 'Failed'})`;

            return `<div class="job-item">
              <div class="job-header">
                <span class="job-id" style="color: ${color};">${j.submissionId}</span>
                <span class="job-time">${time}</span>
              </div>
              <div class="job-detail">${extra}</div>
            </div>`;
          }).join("");
        }
      }

      // Fetch and render active contests
      if (contestsList && contestsLoading) {
        try {
          const activeContests = await fetchActiveContests();
          contestsLoading.classList.add("hidden");

          if (activeContests.length === 0) {
            contestsList.innerHTML = "<span style='color: #64748b; font-size: 12px;'>No active contests found.</span>";
          } else {
            contestsList.innerHTML = activeContests.map((c: any) => {
              let timeLeftStr = "";
              if (c.end_time) {
                const endTimeMs = new Date(c.end_time).getTime();
                const nowMs = Date.now();
                const diffMs = endTimeMs - nowMs;
                if (diffMs > 0) {
                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  timeLeftStr = hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
                } else {
                  timeLeftStr = "Ended";
                }
              }

              return `
                <div class="contest-card">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div class="contest-name" style="margin-bottom: 0;">${c.name}</div>
                    ${timeLeftStr ? `<div style="font-size: 10px; color: #FBBF24; font-family: 'JetBrains Mono', monospace; font-weight: 600;">${timeLeftStr}</div>` : ''}
                  </div>
                  <div class="contest-stats">
                    <div class="stat-group">
                      <span>SCORE</span>
                      <span class="stat-val">${c.score}</span>
                    </div>
                    <div class="stat-group">
                      <span>PENALTY</span>
                      <span class="stat-val" style="color: #F87171;">${c.total_penalty}m</span>
                    </div>
                    <div class="stat-group">
                      <span>SOLVED</span>
                      <span class="stat-val" style="color: #38BDF8;">${c.accepted_count}/${c.total_problems}</span>
                    </div>
                  </div>
                  <div class="problem-list">
                    ${c.problems ? c.problems.map((p: any) => `
                      <div class="problem-item">
                        <span class="problem-slug" title="${p.slug}">${p.slug}</span>
                        <span class="problem-status status-${p.status}">${p.status.replace('_', ' ')}</span>
                      </div>
                    `).join('') : ''}
                  </div>
                </div>
              `;
            }).join("");
          }
        } catch (err) {
          contestsLoading.textContent = "Failed to load active contests.";
        }
      }

    } else {
      if (unauthDiv) unauthDiv.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error loading state:", error);
    if (loadingDiv) {
      loadingDiv.textContent = "Error loading extension state.";
    }
  }
});
