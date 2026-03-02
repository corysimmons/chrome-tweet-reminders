// content/main.ts — Injects "Remind Me" buttons into tweets on X/Twitter

import { extractTweetData } from "./extract";
import { mountDialog } from "./dialog";
import { showToast } from "./toaster";
import type { Reminder, TweetData } from "@/shared/types";

const BUTTON_MARKER = "data-remindme-injected";

// --- SVG Icons ---

const bellIconSVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
</svg>`;

const bellActiveIconSVG = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
</svg>`;

// --- Button active state ---

function markButtonActive(buttonEl: HTMLButtonElement, reminderTime: number) {
  buttonEl.classList.add("remindme-btn-active");
  buttonEl.style.color = "rgb(29, 155, 240)";
  buttonEl.innerHTML = bellActiveIconSVG;
  const date = new Date(reminderTime);
  buttonEl.title = `Reminder set for ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

// --- Set reminder ---

async function setReminder(
  tweetData: TweetData,
  reminderTime: number,
  buttonEl: HTMLButtonElement
) {
  const reminder: Reminder = {
    id: crypto.randomUUID(),
    tweetUrl: tweetData.tweetUrl!,
    tweetId: tweetData.tweetId!,
    tweetText: tweetData.tweetText,
    authorHandle: tweetData.authorHandle,
    reminderTime,
    createdAt: Date.now(),
  };

  try {
    await chrome.runtime.sendMessage({ type: "ADD_REMINDER", reminder });
    markButtonActive(buttonEl, reminderTime);
    showToast("Reminder set!");
  } catch (err) {
    console.error("Failed to set reminder:", err);
    showToast("Failed to set reminder");
  }
}

// --- Check existing reminders for a tweet ---

async function checkExistingReminder(
  buttonEl: HTMLButtonElement,
  tweetId: string | null
) {
  if (!tweetId) return;
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_REMINDERS_FOR_TWEET",
      tweetId,
    });
    if (response?.reminders?.length > 0) {
      markButtonActive(buttonEl, response.reminders[0].reminderTime);
    }
  } catch {
    // Service worker might not be ready yet, ignore
  }
}

// --- Button injection ---

function injectButton(articleEl: Element) {
  if (articleEl.hasAttribute(BUTTON_MARKER)) return;
  articleEl.setAttribute(BUTTON_MARKER, "true");

  // Find the action bar — it's the div[role="group"] inside the tweet
  const actionBar = articleEl.querySelector('[role="group"]');
  if (!actionBar) return;

  const tweetData = extractTweetData(articleEl);
  if (!tweetData.tweetUrl) return;

  // Create the reminder button container (matching X's action button structure)
  const container = document.createElement("div");
  Object.assign(container.style, {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  });

  const button = document.createElement("button");
  button.className = "remindme-btn";
  Object.assign(button.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    border: "none",
    background: "transparent",
    borderRadius: "50%",
    cursor: "pointer",
    color: "rgb(113, 118, 123)",
    transition: "color 0.15s ease, background-color 0.15s ease",
    padding: "0",
  });
  button.innerHTML = bellIconSVG;
  button.title = "Set a reminder for this tweet";
  button.setAttribute("aria-label", "Set reminder");

  button.addEventListener("mouseenter", () => {
    if (!button.classList.contains("remindme-btn-active")) {
      button.style.color = "rgb(29, 155, 240)";
      button.style.backgroundColor = "rgba(29, 155, 240, 0.1)";
    }
  });
  button.addEventListener("mouseleave", () => {
    if (!button.classList.contains("remindme-btn-active")) {
      button.style.color = "rgb(113, 118, 123)";
      button.style.backgroundColor = "transparent";
    }
  });

  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    // If shadow host already exists, close it
    const existingHost = document.getElementById("remindme-shadow-host");
    if (existingHost) {
      existingHost.remove();
      return;
    }

    mountDialog(
      tweetData,
      (timestamp) => setReminder(tweetData, timestamp, button),
      () => {} // onClose — dialog handles its own cleanup
    );
  });

  container.appendChild(button);
  actionBar.appendChild(container);

  // Check if this tweet already has a reminder
  checkExistingReminder(button, tweetData.tweetId);
}

// --- MutationObserver ---

function processTweets(root: Element | Document) {
  const tweets = root.querySelectorAll
    ? root.querySelectorAll(
        `article[data-testid="tweet"]:not([${BUTTON_MARKER}])`
      )
    : [];
  tweets.forEach(injectButton);
}

function startObserver() {
  // Process existing tweets
  processTweets(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;

        // Check if the added node itself is a tweet
        if (el.matches?.('article[data-testid="tweet"]')) {
          injectButton(el);
        }

        // Check children of the added node
        processTweets(el);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// --- Initialize ---

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startObserver);
} else {
  startObserver();
}
