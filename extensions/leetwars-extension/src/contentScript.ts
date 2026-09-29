type SubmitDetectMessage =
  | { type: "LEETWARS_SUBMISSION_CAPTURED"; payload: { submissionId: number; submissionUrl?: string } };

declare const chrome: any;

window.addEventListener("message", (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  const data = event.data;
  if (data && data.type === "LEETWARS_SUBMISSION_RELAY") {
    console.log("LeetWars Content Script: Relaying submission", data.payload.submissionId);
    try {
      chrome.runtime.sendMessage({
        type: "LEETWARS_SUBMISSION_CAPTURED",
        payload: data.payload,
      });
    } catch (err) {
      console.error("LeetWars Content Script Error: Could not send message to background", err);
    }
  }
});
