// popup.js — Dashboard logic for Chrome Tweet Reminders popup

document.addEventListener('DOMContentLoaded', () => {
  loadReminders();

  document.getElementById('check-now-btn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'CHECK_NOW' });
    loadReminders();
  });

  document.getElementById('export-btn').addEventListener('click', exportReminders);
  document.getElementById('import-btn').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importReminders);
});

async function loadReminders() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_REMINDERS' });
  const reminders = response?.reminders || [];

  const listEl = document.getElementById('reminders-list');
  const emptyEl = document.getElementById('empty-state');

  if (reminders.length === 0) {
    listEl.hidden = true;
    emptyEl.hidden = false;
    return;
  }

  listEl.hidden = false;
  emptyEl.hidden = true;

  // Sort by soonest first
  reminders.sort((a, b) => a.reminderTime - b.reminderTime);

  listEl.innerHTML = '';
  for (const reminder of reminders) {
    listEl.appendChild(createReminderCard(reminder));
  }
}

function createReminderCard(reminder) {
  const card = document.createElement('div');
  card.className = 'reminder-card';

  const isPast = reminder.reminderTime <= Date.now();
  if (isPast) card.classList.add('reminder-overdue');

  // Author and time
  const header = document.createElement('div');
  header.className = 'reminder-header';

  const author = document.createElement('span');
  author.className = 'reminder-author';
  author.textContent = reminder.authorHandle;

  const time = document.createElement('span');
  time.className = 'reminder-time';
  time.textContent = isPast ? 'Overdue' : formatRelativeTime(reminder.reminderTime);
  time.title = new Date(reminder.reminderTime).toLocaleString();

  header.appendChild(author);
  header.appendChild(time);

  // Tweet text
  const text = document.createElement('div');
  text.className = 'reminder-text';
  text.textContent = reminder.tweetText || '(no text)';

  // Actions
  const actions = document.createElement('div');
  actions.className = 'reminder-actions';

  const openBtn = document.createElement('a');
  openBtn.className = 'reminder-open';
  openBtn.href = reminder.tweetUrl;
  openBtn.target = '_blank';
  openBtn.textContent = 'Open tweet';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'reminder-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'DELETE_REMINDER', id: reminder.id });
    loadReminders();
  });

  actions.appendChild(openBtn);
  actions.appendChild(deleteBtn);

  card.appendChild(header);
  card.appendChild(text);
  card.appendChild(actions);

  return card;
}

function formatRelativeTime(timestamp) {
  const diff = timestamp - Date.now();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) {
    const months = Math.floor(days / 30);
    return `in ${months} month${months === 1 ? '' : 's'}`;
  }
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  if (hours > 0) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  if (minutes > 0) return `in ${minutes} min`;
  return 'very soon';
}

async function exportReminders() {
  const response = await chrome.runtime.sendMessage({ type: 'EXPORT_REMINDERS' });
  const reminders = response?.reminders || [];

  const blob = new Blob([JSON.stringify(reminders, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tweet-reminders-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

async function importReminders(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const reminders = JSON.parse(text);

    if (!Array.isArray(reminders)) {
      alert('Invalid file format. Expected a JSON array of reminders.');
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'IMPORT_REMINDERS',
      reminders
    });

    if (response?.success) {
      alert(`Imported ${response.imported} new reminder(s).`);
      loadReminders();
    }
  } catch (err) {
    alert('Failed to import: ' + err.message);
  }

  // Reset file input
  event.target.value = '';
}
