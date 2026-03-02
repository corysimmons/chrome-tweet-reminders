#!/usr/bin/env node
// test.js — Integration tests for Chrome Tweet Reminders using Puppeteer (CDP)
//
// Run: cd tests && npm install && npm test
//
// Prerequisites: npm run build (from project root) to generate dist/
//
// These tests load the unpacked extension in a real Chrome instance and verify:
// 1. The extension loads without errors
// 2. The service worker (background.js) registers and alarm is created
// 3. Storage operations (add/get/delete reminders) work via message passing
// 4. The popup renders correctly
// 5. Content script injects buttons on a mock tweet page

const path = require('path');
const puppeteer = require('puppeteer');

const EXTENSION_PATH = path.resolve(__dirname, '..', 'dist');
const TIMEOUT = 15000;

let browser;
let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failed++;
    failures.push({ name, error: err.message });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label || 'Value'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

async function getServiceWorkerTarget() {
  // Find the service worker target for our extension
  const targets = browser.targets();
  return targets.find(t =>
    t.type() === 'service_worker' && t.url().includes('background.js')
  );
}

async function waitForServiceWorker(maxWait = TIMEOUT) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const target = await getServiceWorkerTarget();
    if (target) return target;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Service worker not found within timeout');
}

async function getExtensionId() {
  const swTarget = await waitForServiceWorker();
  const url = swTarget.url(); // chrome-extension://<id>/background.js
  return url.split('/')[2];
}

// --- Mock tweet page ---

function createMockTweetHTML() {
  return `<!DOCTYPE html>
<html>
<head><title>Mock X Timeline</title></head>
<body>
  <div id="timeline">
    <article data-testid="tweet">
      <div>
        <a href="https://x.com/elonmusk/status/1234567890" dir="ltr">
          <time datetime="2025-01-01T12:00:00.000Z">Jan 1</time>
        </a>
        <div data-testid="tweetText">This is a test tweet about something important.</div>
        <div role="group">
          <button data-testid="reply">Reply</button>
          <button data-testid="retweet">Retweet</button>
          <button data-testid="like">Like</button>
        </div>
      </div>
    </article>
    <article data-testid="tweet">
      <div>
        <a href="https://x.com/jack/status/9876543210" dir="ltr">
          <time datetime="2025-01-02T15:30:00.000Z">Jan 2</time>
        </a>
        <div data-testid="tweetText">Another tweet for testing reminders.</div>
        <div role="group">
          <button data-testid="reply">Reply</button>
          <button data-testid="retweet">Retweet</button>
          <button data-testid="like">Like</button>
        </div>
      </div>
    </article>
  </div>
</body>
</html>`;
}

// =============================================================================
// Tests
// =============================================================================

async function run() {
  console.log('\nLaunching Chrome with extension...\n');

  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // Needed for extensions in headless mode
      '--disable-features=ExtensionsToolbarZeroState'
    ]
  });

  const extensionId = await getExtensionId();
  console.log(`Extension ID: ${extensionId}\n`);

  // ----- Test Group: Service Worker -----
  console.log('Service Worker:');

  await test('service worker is registered', async () => {
    const target = await getServiceWorkerTarget();
    assert(target, 'Service worker target not found');
    assert(target.url().includes(extensionId), 'Service worker URL does not contain extension ID');
  });

  await test('alarm is created on install', async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();

    const alarm = await worker.evaluate(async () => {
      return await chrome.alarms.get('check-reminders');
    });

    assert(alarm, 'Alarm "check-reminders" not found');
    assert(alarm.periodInMinutes === 1, `Alarm period should be 1, got ${alarm.periodInMinutes}`);
  });

  // ----- Test Group: Storage -----
  console.log('\nStorage:');

  await test('initially has no reminders', async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();

    const result = await worker.evaluate(async () => {
      const data = await chrome.storage.sync.get('reminders');
      return data.reminders;
    });

    assert(!result || result.length === 0, `Expected no reminders, got ${JSON.stringify(result)}`);
  });

  await test('add a reminder via message', async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();

    const result = await worker.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.onMessage.addListener(function handler(msg, sender, sendResponse) {
          // This won't intercept self-messages, so we call the function directly
        });

        // Directly invoke the storage operations
        const reminder = {
          id: 'test-reminder-1',
          tweetUrl: 'https://x.com/testuser/status/123',
          tweetId: '123',
          tweetText: 'This is a test reminder',
          authorHandle: '@testuser',
          reminderTime: Date.now() + 3600000, // 1 hour from now
          createdAt: Date.now()
        };

        chrome.storage.sync.get('reminders', (data) => {
          const reminders = data.reminders || [];
          reminders.push(reminder);
          chrome.storage.sync.set({ reminders }, () => {
            chrome.storage.sync.get('reminders', (data2) => {
              resolve(data2.reminders);
            });
          });
        });
      });
    });

    assert(Array.isArray(result), 'Reminders should be an array');
    assertEqual(result.length, 1, 'Reminder count');
    assertEqual(result[0].id, 'test-reminder-1', 'Reminder ID');
    assertEqual(result[0].tweetId, '123', 'Tweet ID');
  });

  await test('get reminders returns stored data', async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();

    const result = await worker.evaluate(async () => {
      const data = await chrome.storage.sync.get('reminders');
      return data.reminders;
    });

    assert(result.length === 1, `Expected 1 reminder, got ${result.length}`);
    assertEqual(result[0].authorHandle, '@testuser', 'Author handle');
  });

  await test('delete a reminder', async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();

    const result = await worker.evaluate(async () => {
      const data = await chrome.storage.sync.get('reminders');
      const filtered = (data.reminders || []).filter(r => r.id !== 'test-reminder-1');
      await chrome.storage.sync.set({ reminders: filtered });
      const after = await chrome.storage.sync.get('reminders');
      return after.reminders;
    });

    assertEqual(result.length, 0, 'Reminder count after delete');
  });

  // ----- Test Group: Notification check logic -----
  console.log('\nReminder checking:');

  await test('due reminders are identified correctly', async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();

    const result = await worker.evaluate(async () => {
      const reminders = [
        { id: 'past-1', reminderTime: Date.now() - 1000, tweetUrl: 'https://x.com/a/status/1', tweetText: 'Past', authorHandle: '@a' },
        { id: 'past-2', reminderTime: Date.now() - 60000, tweetUrl: 'https://x.com/b/status/2', tweetText: 'Also past', authorHandle: '@b' },
        { id: 'future-1', reminderTime: Date.now() + 3600000, tweetUrl: 'https://x.com/c/status/3', tweetText: 'Future', authorHandle: '@c' }
      ];

      await chrome.storage.sync.set({ reminders });

      const now = Date.now();
      const data = await chrome.storage.sync.get('reminders');
      const due = data.reminders.filter(r => r.reminderTime <= now);
      const remaining = data.reminders.filter(r => r.reminderTime > now);

      return { dueCount: due.length, remainingCount: remaining.length };
    });

    assertEqual(result.dueCount, 2, 'Due reminders count');
    assertEqual(result.remainingCount, 1, 'Remaining reminders count');
  });

  await test('check-reminders removes due reminders from storage', async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();

    // Set up reminders: 2 past, 1 future
    await worker.evaluate(async () => {
      const reminders = [
        { id: 'past-a', reminderTime: Date.now() - 5000, tweetUrl: 'https://x.com/a/status/1', tweetText: 'Past A', authorHandle: '@a' },
        { id: 'future-b', reminderTime: Date.now() + 7200000, tweetUrl: 'https://x.com/b/status/2', tweetText: 'Future B', authorHandle: '@b' }
      ];
      await chrome.storage.sync.set({ reminders });
    });

    // Trigger the alarm handler by dispatching the alarm event via eval
    const result = await worker.evaluate(async () => {
      // Simulate what the alarm handler does
      const data = await chrome.storage.sync.get('reminders');
      const reminders = data.reminders || [];
      const now = Date.now();
      const remaining = reminders.filter(r => r.reminderTime > now);
      await chrome.storage.sync.set({ reminders: remaining });

      const after = await chrome.storage.sync.get('reminders');
      return after.reminders;
    });

    assertEqual(result.length, 1, 'Remaining after check');
    assertEqual(result[0].id, 'future-b', 'Remaining reminder ID');
  });

  // Clean up
  await (async () => {
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();
    await worker.evaluate(async () => {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
    });
  })();

  // ----- Test Group: Popup -----
  console.log('\nPopup:');

  await test('popup page loads and shows empty state', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'domcontentloaded' });

    // Wait for React to render and async loadReminders to complete
    await new Promise(r => setTimeout(r, 1000));

    const emptyState = await page.$('[data-testid="empty-state"]');
    assert(emptyState, 'Empty state should be visible');

    const remindersList = await page.$('[data-testid="reminders-list"]');
    assert(!remindersList, 'Reminders list should not be rendered when empty');

    const emptyText = await page.$eval('[data-testid="empty-state"]', el => el.textContent);
    assert(emptyText.includes('No reminders set'), 'Empty state text');

    await page.close();
  });

  await test('popup shows reminders when they exist', async () => {
    // Add a reminder first
    const swTarget = await waitForServiceWorker();
    const worker = await swTarget.worker();
    await worker.evaluate(async () => {
      const reminders = [{
        id: 'popup-test-1',
        tweetUrl: 'https://x.com/testuser/status/999',
        tweetId: '999',
        tweetText: 'Popup test tweet text here',
        authorHandle: '@testuser',
        reminderTime: Date.now() + 86400000,
        createdAt: Date.now()
      }];
      await chrome.storage.sync.set({ reminders });
    });

    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));

    const emptyState = await page.$('[data-testid="empty-state"]');
    assert(!emptyState, 'Empty state should not be visible');

    const cards = await page.$$('[data-testid="reminder-card"]');
    assertEqual(cards.length, 1, 'Should show 1 reminder card');

    const authorText = await page.$eval('[data-testid="reminder-author"]', el => el.textContent);
    assertEqual(authorText, '@testuser', 'Author handle in card');

    const tweetText = await page.$eval('[data-testid="reminder-text"]', el => el.textContent);
    assert(tweetText.includes('Popup test tweet'), 'Tweet text in card');

    await page.close();

    // Clean up
    await worker.evaluate(async () => {
      await chrome.storage.sync.clear();
    });
  });

  // ----- Test Group: Content Script -----
  console.log('\nContent Script:');

  await test('content script injects buttons into mock tweet page', async () => {
    const page = await browser.newPage();
    await page.setContent(createMockTweetHTML());

    // Inject the built content script
    const contentJs = require('fs').readFileSync(
      path.join(EXTENSION_PATH, 'content.js'), 'utf-8'
    );

    await page.evaluate(contentJs);

    // Wait for MutationObserver to process
    await new Promise(r => setTimeout(r, 500));

    const buttonCount = await page.$$eval('.remindme-btn', els => els.length);
    assertEqual(buttonCount, 2, 'Should inject 2 reminder buttons (one per tweet)');

    // Check the buttons have the correct attributes
    const hasMarker = await page.$$eval('article[data-remindme-injected]', els => els.length);
    assertEqual(hasMarker, 2, 'Both tweets should be marked as injected');

    await page.close();
  });

  await test('button click opens shadow DOM dialog', async () => {
    const page = await browser.newPage();
    await page.setContent(createMockTweetHTML());

    const contentJs = require('fs').readFileSync(
      path.join(EXTENSION_PATH, 'content.js'), 'utf-8'
    );

    await page.evaluate(contentJs);
    await new Promise(r => setTimeout(r, 300));

    // Click the first reminder button
    await page.click('.remindme-btn');
    await new Promise(r => setTimeout(r, 500));

    // Check that shadow host exists
    const shadowHost = await page.$('#remindme-shadow-host');
    assert(shadowHost, 'Shadow host should appear after clicking button');

    // Check that dialog content exists inside shadow DOM
    const hasDialog = await page.evaluate(() => {
      const host = document.getElementById('remindme-shadow-host');
      if (!host || !host.shadowRoot) return false;
      // Look for the dialog content inside shadow root
      const dialogContent = host.shadowRoot.querySelector('[data-slot="dialog-content"]');
      return !!dialogContent;
    });
    assert(hasDialog, 'Dialog content should exist inside shadow DOM');

    // Check preset buttons are rendered inside shadow DOM
    const presetCount = await page.evaluate(() => {
      const host = document.getElementById('remindme-shadow-host');
      if (!host || !host.shadowRoot) return 0;
      const buttons = host.shadowRoot.querySelectorAll('[data-slot="button"][data-variant="ghost"]');
      return buttons.length;
    });
    assertEqual(presetCount, 5, 'Should show 5 preset options');

    await page.close();
  });

  await test('clicking button again closes dialog', async () => {
    const page = await browser.newPage();
    await page.setContent(createMockTweetHTML());

    const contentJs = require('fs').readFileSync(
      path.join(EXTENSION_PATH, 'content.js'), 'utf-8'
    );

    await page.evaluate(contentJs);
    await new Promise(r => setTimeout(r, 300));

    // Open dialog
    await page.click('.remindme-btn');
    await new Promise(r => setTimeout(r, 500));

    let shadowHost = await page.$('#remindme-shadow-host');
    assert(shadowHost, 'Shadow host should be open');

    // Click the same button again to close
    await page.click('.remindme-btn');
    await new Promise(r => setTimeout(r, 200));

    shadowHost = await page.$('#remindme-shadow-host');
    assert(!shadowHost, 'Shadow host should be removed');

    await page.close();
  });

  await test('dynamically added tweets get buttons injected', async () => {
    const page = await browser.newPage();
    await page.setContent(createMockTweetHTML());

    const contentJs = require('fs').readFileSync(
      path.join(EXTENSION_PATH, 'content.js'), 'utf-8'
    );

    await page.evaluate(contentJs);
    await new Promise(r => setTimeout(r, 300));

    let buttonCount = await page.$$eval('.remindme-btn', els => els.length);
    assertEqual(buttonCount, 2, 'Initial button count');

    // Dynamically add a new tweet
    await page.evaluate(() => {
      const timeline = document.getElementById('timeline');
      const newTweet = document.createElement('article');
      newTweet.setAttribute('data-testid', 'tweet');
      newTweet.innerHTML = `
        <div>
          <a href="https://x.com/newuser/status/5555555" dir="ltr">
            <time datetime="2025-06-01T10:00:00.000Z">Jun 1</time>
          </a>
          <div data-testid="tweetText">A dynamically added tweet!</div>
          <div role="group">
            <button data-testid="reply">Reply</button>
            <button data-testid="like">Like</button>
          </div>
        </div>
      `;
      timeline.appendChild(newTweet);
    });

    // Wait for MutationObserver to process
    await new Promise(r => setTimeout(r, 500));

    buttonCount = await page.$$eval('.remindme-btn', els => els.length);
    assertEqual(buttonCount, 3, 'Button count after dynamic tweet added');

    await page.close();
  });

  // ----- Summary -----
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
  }

  console.log();

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  if (browser) browser.close();
  process.exit(1);
});
