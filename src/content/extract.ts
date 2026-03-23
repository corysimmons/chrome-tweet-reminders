import type { TweetData } from "@/shared/types";

export function extractTweetData(articleEl: Element): TweetData {
  // Extract tweet URL from the timestamp link
  const timeLink = articleEl.querySelector('a[href*="/status/"] time');
  const linkEl = timeLink?.closest("a") as HTMLAnchorElement | null;
  const tweetUrl = linkEl ? linkEl.href : null;

  // Extract tweet ID from URL
  const tweetId = tweetUrl?.match(/\/status\/(\d+)/)?.[1] || null;

  // Extract tweet text
  const textEl = articleEl.querySelector('[data-testid="tweetText"]');
  const tweetText = textEl?.textContent || "";

  // Extract author handle from the tweet URL
  const authorHandle = tweetUrl
    ? "@" + new URL(tweetUrl).pathname.split("/")[1]
    : "";

  return { tweetUrl, tweetId, tweetText, authorHandle };
}
