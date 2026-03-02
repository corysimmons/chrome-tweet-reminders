// background/index.ts — Service worker for Chrome Tweet Reminders
// Handles alarms, notifications, storage management, and badge updates.

import type { Reminder } from "@/shared/types";

const ALARM_NAME = "check-reminders";
const ALARM_INTERVAL_MINUTES = 1;
const STORAGE_KEY = "reminders";

// --- Storage helpers ---

async function getReminders(): Promise<Reminder[]> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  } catch {
    // Fallback to local storage
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  }
}

async function saveReminders(reminders: Reminder[]): Promise<void> {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: reminders });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("QUOTA_BYTES")) {
      // Sync quota exceeded — fall back to local
      console.warn("sync quota exceeded, falling back to local storage");
      await chrome.storage.local.set({ [STORAGE_KEY]: reminders });
    } else {
      throw err;
    }
  }
}

// --- Badge ---

async function updateBadge(): Promise<void> {
  const reminders = await getReminders();
  const now = Date.now();
  const dueCount = reminders.filter((r) => r.reminderTime <= now).length;
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const dueTodayCount = reminders.filter(
    (r) => r.reminderTime <= todayEnd.getTime()
  ).length;
  const count = Math.max(dueCount, dueTodayCount);
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: "#1d9bf0" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// --- Alarm handler ---

async function checkReminders(): Promise<void> {
  const reminders = await getReminders();
  const now = Date.now();
  const due = reminders.filter((r) => r.reminderTime <= now);
  const remaining = reminders.filter((r) => r.reminderTime > now);

  for (const reminder of due) {
    await fireNotification(reminder);
  }

  if (due.length > 0) {
    await saveReminders(remaining);
  }

  await updateBadge();
}

async function fireNotification(reminder: Reminder): Promise<void> {
  const notificationId = `reminder-${reminder.id}`;
  chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `Reminder: ${reminder.authorHandle}`,
    message: reminder.tweetText || "Time to check this tweet!",
    buttons: [{ title: "Open Tweet" }, { title: "Snooze 1 hour" }],
    priority: 2,
    requireInteraction: true,
  });

  // Store the tweet URL so we can open it when notification is clicked
  await chrome.storage.local.set({
    [`notif-${notificationId}`]: {
      tweetUrl: reminder.tweetUrl,
      reminder: reminder,
    },
  });
}

// --- Event listeners ---

chrome.runtime.onInstalled.addListener(async () => {
  // Create the polling alarm
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 0.5, // First check in 30 seconds
    periodInMinutes: ALARM_INTERVAL_MINUTES,
  });
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  // Ensure alarm exists on browser startup
  const alarm = await chrome.alarms.get(ALARM_NAME);
  if (!alarm) {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: 0.5,
      periodInMinutes: ALARM_INTERVAL_MINUTES,
    });
  }
  await checkReminders();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await checkReminders();
  }
});

// Clicking the notification body opens the tweet
chrome.notifications.onClicked.addListener(async (notificationId) => {
  const data = await chrome.storage.local.get(`notif-${notificationId}`);
  const info = data[`notif-${notificationId}`];
  if (info?.tweetUrl) {
    chrome.tabs.create({ url: info.tweetUrl });
  }
  chrome.notifications.clear(notificationId);
  await chrome.storage.local.remove(`notif-${notificationId}`);
});

// Notification action buttons
chrome.notifications.onButtonClicked.addListener(
  async (notificationId, buttonIndex) => {
    const data = await chrome.storage.local.get(`notif-${notificationId}`);
    const info = data[`notif-${notificationId}`];

    if (buttonIndex === 0) {
      // "Open Tweet"
      if (info?.tweetUrl) {
        chrome.tabs.create({ url: info.tweetUrl });
      }
    } else if (buttonIndex === 1) {
      // "Snooze 1 hour"
      if (info?.reminder) {
        const snoozed: Reminder = {
          ...info.reminder,
          reminderTime: Date.now() + 60 * 60 * 1000,
        };
        const reminders = await getReminders();
        reminders.push(snoozed);
        await saveReminders(reminders);
      }
    }

    chrome.notifications.clear(notificationId);
    await chrome.storage.local.remove(`notif-${notificationId}`);
    await updateBadge();
  }
);

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ADD_REMINDER") {
    (async () => {
      const reminders = await getReminders();
      reminders.push(message.reminder);
      await saveReminders(reminders);
      await updateBadge();
      sendResponse({ success: true });
    })();
    return true; // async response
  }

  if (message.type === "GET_REMINDERS") {
    (async () => {
      const reminders = await getReminders();
      sendResponse({ reminders });
    })();
    return true;
  }

  if (message.type === "DELETE_REMINDER") {
    (async () => {
      const reminders = await getReminders();
      const filtered = reminders.filter((r) => r.id !== message.id);
      await saveReminders(filtered);
      await updateBadge();
      sendResponse({ success: true });
    })();
    return true;
  }

  if (message.type === "GET_REMINDERS_FOR_TWEET") {
    (async () => {
      const reminders = await getReminders();
      const found = reminders.filter((r) => r.tweetId === message.tweetId);
      sendResponse({ reminders: found });
    })();
    return true;
  }

  if (message.type === "CHECK_NOW") {
    checkReminders().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "EXPORT_REMINDERS") {
    (async () => {
      const reminders = await getReminders();
      sendResponse({ reminders });
    })();
    return true;
  }

  if (message.type === "IMPORT_REMINDERS") {
    (async () => {
      const existing = await getReminders();
      const existingIds = new Set(existing.map((r) => r.id));
      const newReminders = message.reminders.filter(
        (r: Reminder) => !existingIds.has(r.id)
      );
      const merged = [...existing, ...newReminders];
      await saveReminders(merged);
      await updateBadge();
      sendResponse({ success: true, imported: newReminders.length });
    })();
    return true;
  }
});

// Update badge when storage changes
chrome.storage.onChanged.addListener(() => {
  updateBadge();
});
