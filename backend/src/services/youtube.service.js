const env = require("../config/env");

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function searchYouTube({ q, maxResults = 10 }) {
  if (!env.YOUTUBE_API_KEY) {
    const error = new Error("YOUTUBE_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  const params = new URLSearchParams({
    key: env.YOUTUBE_API_KEY,
    part: "snippet",
    type: "video",
    q,
    maxResults: String(maxResults),
  });

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload.error?.message || "YouTube search failed");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

module.exports = { searchYouTube };
