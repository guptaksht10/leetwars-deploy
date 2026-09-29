declare const chrome: any;

const LC_API_BASE = "https://leetcode.com";

function withLeetCodeOriginHeader() {
  // LeetCode expects auth cookies; extension runs on leetcode.com so cookies are sent.
  // We avoid hardcoding CSRF tokens; LeetCode endpoints used here are GETs.
  return {
    credentials: "include" as const,
    headers: {
      "content-type": "application/json",
    },
  };
}

export async function leetcodeCheckSubmission(submissionId: number): Promise<any> {
  const url = `${LC_API_BASE}/submissions/detail/${submissionId}/v2/check/`;
  const res = await fetch(url, { method: "GET", ...withLeetCodeOriginHeader() });
  if (!res.ok) throw new Error(`LeetCode check failed: ${res.status}`);
  return res.json();
}

export async function leetcodeFetchSubmissionDetails(submissionId: number): Promise<any> {
  // GraphQL endpoint used by LeetCode UI.
  // For robustness, we use /graphql and the same query shape you provided.
  const graphqlUrl = `${LC_API_BASE}/graphql`;

  const query = `
 query submissionDetails($submissionId: Int!) {
  submissionDetails(submissionId: $submissionId) {
   runtime
   runtimeDisplay
   runtimePercentile
   runtimeDistribution
   memory
   memoryDisplay
   memoryPercentile
   memoryDistribution
   code
   timestamp
   statusCode
   aiJudgeMessage
   isCompiledLang
   aiRecheckSubmitted
   user {
    username
    profile { realName userAvatar }
   }
   lang { name verboseName }
   question {
    questionId
    titleSlug
    hasFrontendPreview
   }
   notes
   flagType
   topicTags { tagId slug name }
   runtimeError
   compileError
   lastTestcase
   codeOutput
   expectedOutput
   totalCorrect
   totalTestcases
   fullCodeOutput
   testDescriptions
   testBodies
   testInfo
   stdOutput
  }
 }
 `;

  const res = await fetch(graphqlUrl, {
    method: "POST",
    ...withLeetCodeOriginHeader(),
    headers: {
      ...withLeetCodeOriginHeader().headers,
      // LeetCode often wants X-CSRFToken for mutations, but this is query; still many setups work without.
      // If needed, we can attempt to read csrftoken from cookies later.
    },
    body: JSON.stringify({
      query,
      variables: { submissionId },
      operationName: "submissionDetails",
    }),
  });

  if (!res.ok) throw new Error(`LeetCode graphql failed: ${res.status}`);
  const json = await res.json();
  return json;
}
