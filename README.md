# Chrome Tweet Reminders

A Chrome extension that adds a "Remind me" button to every tweet on X (formerly Twitter). Set reminders and get desktop notifications when it's time to revisit a tweet. No accounts, no servers, no API keys — everything runs locally in your browser.

## Features

- **Reminder button on every tweet** — A bell icon appears in each tweet's action bar, right alongside reply/retweet/like
- **Quick time presets** — 1 hour, 4 hours, tomorrow morning, 1 week, 1 month
- **Custom date/time** — Pick any future date and time
- **Desktop notifications** — Get notified with the tweet text and author when your reminder fires
- **Click to open** — Click the notification to jump straight to the tweet
- **Snooze** — Not ready? Snooze a notification for 1 hour
- **Cross-device sync** — Reminders sync via your Google account (chrome.storage.sync)
- **Popup dashboard** — View, manage, and delete all pending reminders from the extension popup
- **Import/Export** — Back up your reminders as JSON
- **Badge count** — Extension icon shows count of due/today reminders
- **Visual indicator** — Tweets with existing reminders show an active (filled) bell icon
- **Dark theme** — Styled to match X's dark UI

## Installation

### From source (developer mode)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/user/chrome-tweet-reminders.git
   cd chrome-tweet-reminders
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Open Chrome and navigate to `chrome://extensions/`

4. Enable **Developer mode** (toggle in the top-right corner)

5. Click **Load unpacked** and select the `dist/` directory

6. Navigate to [x.com](https://x.com) — you should see bell icons on every tweet

### From Chrome Web Store

*(Not yet published)*

## Usage

### Setting a reminder

1. Browse X/Twitter as usual
2. Find a tweet you want to be reminded about
3. Click the **bell icon** (🔔) in the tweet's action bar
4. Choose a preset time or pick a custom date/time:
   - **1 hour** — reminder in 60 minutes
   - **4 hours** — reminder in 4 hours
   - **Tomorrow 9 AM** — next day at 9:00 AM local time
   - **1 week** — 7 days from now
   - **1 month** — 30 days from now
   - **Custom** — pick any date and time using the date/time picker
5. A toast notification confirms "Reminder set!" and the bell icon fills in blue

### When a reminder fires

- A desktop notification appears with the tweet author and text preview
- **Click the notification** to open the tweet in a new tab
- **Click "Snooze 1 hour"** to push the reminder back by an hour
- Fired reminders are automatically removed from storage

### Managing reminders

1. Click the Chrome Tweet Reminders extension icon in Chrome's toolbar
2. The popup shows all pending reminders sorted by due date:
   - **Author handle** and **relative time** ("in 3 days")
   - **Tweet text preview** (truncated)
   - **Open tweet** link to view the original tweet
   - **Delete** button to remove the reminder
3. Overdue reminders are highlighted with a red left border

### Import/Export

- **Export**: Click the download icon in the popup header to save all reminders as a JSON file
- **Import**: Click the upload icon and select a previously exported JSON file. Duplicate reminders (same ID) are skipped.

## How it works

### Architecture

```
┌──────────────────────────────────────────────────┐
│  X/Twitter tab (content script)                  │
│                                                  │
│  MutationObserver watches for new tweets         │
│       ↓                                          │
│  Injects bell button into each tweet's actions   │
│       ↓                                          │
│  User clicks → popover → picks time              │
│       ↓                                          │
│  Sends ADD_REMINDER message to background        │
└──────────────────┬───────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│  Service worker (background.js)                  │
│                                                  │
│  Stores reminder in chrome.storage.sync          │
│  chrome.alarms fires every minute            │
│       ↓                                          │
│  On alarm: check all reminders vs. current time  │
│       ↓                                          │
│  Due reminders → chrome.notifications.create     │
│  Remaining → saved back to storage               │
└──────────────────────────────────────────────────┘
```

### Storage

- **Primary**: `chrome.storage.sync` — syncs across devices via your Google account (100KB limit, ~500+ reminders)
- **Fallback**: `chrome.storage.local` — used if sync quota is exceeded (10MB limit)
- **Key**: `reminders` — an array of reminder objects

### Reminder object

```json
{
  "id": "a1b2c3d4-e5f6-...",
  "tweetUrl": "https://x.com/user/status/123456789",
  "tweetId": "123456789",
  "tweetText": "The first 280 characters of the tweet...",
  "authorHandle": "@user",
  "reminderTime": 1735689600000,
  "createdAt": 1735600000000
}
```

### Polling

A `chrome.alarms` alarm fires every 1 minute. When it fires, the service worker:

1. Reads all reminders from storage
2. Filters reminders where `reminderTime <= Date.now()`
3. Fires a desktop notification for each due reminder
4. Saves remaining (future) reminders back to storage
5. Updates the badge count

### Permissions

| Permission | Why |
|---|---|
| `storage` | Store reminders in chrome.storage.sync/local |
| `alarms` | Periodic polling for due reminders |
| `notifications` | Desktop notifications when reminders fire |
| `host_permissions: x.com, twitter.com` | Inject content script on X/Twitter |

## Development

### Tech stack

- **Vite** — Build tool with three separate configs (popup, background, content)
- **React 19** + **TypeScript** — UI components
- **Tailwind CSS v4** + **shadcn/ui** — Styling and UI components
- **Shadow DOM** — Content script UI isolation from X's page styles

### Project structure

```
chrome-tweet-reminders/
├── src/
│   ├── globals.css              # Tailwind + dark theme CSS vars
│   ├── shared/
│   │   ├── types.ts             # Reminder, MessageType, TweetData
│   │   ├── presets.ts           # Time preset definitions
│   │   └── format.ts            # formatRelativeTime
│   ├── lib/utils.ts             # cn() for shadcn
│   ├── components/ui/           # shadcn: button, card, dialog, calendar, etc.
│   ├── background/index.ts      # Service worker
│   ├── popup/
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Popup app
│   │   ├── ReminderCard.tsx     # Reminder card component
│   │   └── EmptyState.tsx       # Empty state component
│   └── content/
│       ├── main.ts              # MutationObserver + bell button injection
│       ├── extract.ts           # Tweet data extraction
│       ├── dialog.tsx           # Shadow DOM mount/unmount
│       ├── ReminderDialog.tsx   # Dialog with presets + DateTimePicker
│       └── DateTimePicker.tsx   # Calendar + time input
├── popup.html                   # Vite HTML entry
├── public/
│   ├── manifest.json            # Extension manifest (MV3)
│   └── icons/                   # Extension icons
├── vite.config.ts               # Popup build config
├── vite.background.config.ts    # Background build config
├── vite.content.config.ts       # Content script build config
├── tests/
│   ├── test.js                  # Integration tests (Puppeteer/CDP)
│   └── package.json
└── dist/                        # Built extension (load this in Chrome)
```

### Building

```bash
npm install
npm run build
```

This runs three Vite builds: popup (ES modules), background (IIFE), content script (IIFE with React + Tailwind).

### Running tests

Tests use Puppeteer to launch a real Chrome instance with the extension loaded, then verify behavior via the Chrome DevTools Protocol.

```bash
npm run build        # Build the extension first
cd tests
npm install
npm test
```

**Requirements:**
- Node.js 18+
- Chrome/Chromium installed (Puppeteer downloads its own if needed)

**What the tests cover:**

| Test | What it verifies |
|---|---|
| Service worker registration | background.js loads as a service worker |
| Alarm creation | `check-reminders` alarm is created on install |
| Storage: empty state | No reminders exist initially |
| Storage: add reminder | Writing a reminder to chrome.storage.sync |
| Storage: get reminders | Reading reminders back from storage |
| Storage: delete reminder | Removing a reminder from storage |
| Due reminder detection | Past reminders are correctly identified |
| Check removes due reminders | Only future reminders survive a check |
| Popup: empty state | Shows "No reminders set" when empty |
| Popup: shows reminders | Renders reminder cards with correct data |
| Content script: button injection | Bell buttons appear in mock tweet DOM |
| Content script: popover | Clicking bell opens time picker popover |
| Content script: toggle popover | Clicking bell again closes popover |
| Content script: MutationObserver | Dynamically added tweets get buttons |

### Regenerating icons

```bash
node scripts/generate-icons.js
```

This creates simple bell-shaped PNG icons at 16x16, 48x48, and 128x128 using pure Node.js (no dependencies). Replace these with custom-designed icons for production.

## Known limitations

- **X DOM changes**: X frequently changes their HTML structure. The content script uses `data-testid` selectors which are relatively stable but can break. If buttons stop appearing, the selectors in `content.js` may need updating.
- **1-minute polling**: Reminders are checked every minute (the MV3 minimum alarm interval), so notifications fire within ~1 minute of the scheduled time.
- **Service worker lifecycle**: Chrome can kill the service worker at any time. All state is persisted in storage and the alarm wakes the worker back up.
- **No mobile**: Chrome extensions don't run on mobile browsers.

## License

MIT
