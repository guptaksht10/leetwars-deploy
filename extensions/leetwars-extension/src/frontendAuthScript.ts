declare const chrome: any;

async function fetchNextAuthSession() {
  try {
    const res = await fetch(`/api/auth/session?_t=${Date.now()}`, {
      headers: {
        "accept": "application/json"
      },
      cache: "no-store"
    });

    if (!res.ok) {
      return null;
    }

    const session = await res.json();
    // Return the session only if it actually has user data
    if (Object.keys(session).length > 0 && session.user && session.backendToken) {
      console.log("session", session)
      return session;
    }
    return null;
  } catch (err) {
    // console.error("LeetWars Extension: Error fetching NextAuth session", err);
    return null;
  }
}

let lastToken: string | null = null;

async function checkFrontendAuth() {
  const session = await fetchNextAuthSession();

  if (session && session.user && session.backendToken) {
    const { email, leetcode_username, name } = session.user;
    const backendToken = session.backendToken;

    // Determine backend URL based on where the user is logging in from
    let backendUrl = "http://localhost:5000/api/extensions";
    if (window.location.hostname.includes("leetwars.vercel.app")) {
      // Change this to your actual production Express backend URL
      backendUrl = "https://leet-wars-backend.vercel.app/api/extensions";
    }

    // Send the token and user data to the background script if changed
    if (backendToken !== lastToken) {
      lastToken = backendToken;
      chrome.runtime.sendMessage({
        type: "LEETWARS_AUTH_SYNC",
        payload: {
          email,
          leetcodeUsername: leetcode_username,
          name,
          backendToken,
          backendUrl
        }
      });
      console.log("LeetWars Extension: Auth synced successfully.");
    }
  } else {
    // If no valid session, notify background to clear auth state
    if (lastToken !== "") {
      lastToken = "";
      chrome.runtime.sendMessage({
        type: "LEETWARS_AUTH_SYNC",
        payload: null
      });
    }
  }
}

// Run immediately
checkFrontendAuth();

// Poll every 3 seconds to catch SPA login/logout state changes without a full page reload
setInterval(checkFrontendAuth, 3000);
