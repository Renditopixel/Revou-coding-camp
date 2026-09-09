/* ============================================================
   LIFE DASHBOARD — app.js
   Features (MVP + Challenges):
     ✔ Live clock & date
     ✔ Time-based greeting
     ✔ Custom name in greeting        [Challenge]
     ✔ Focus timer (Start/Stop/Reset)
     ✔ Configurable Pomodoro time     [Challenge]
     ✔ To-do: add / edit / done / delete + LocalStorage
     ✔ Prevent duplicate tasks        [Challenge]
     ✔ Sort tasks                     [Challenge]
     ✔ Quick Links + LocalStorage
     ✔ Light / Dark mode toggle       [Challenge]
   ============================================================ */

'use strict';

/* ── Utilities ──────────────────────────────────────────────── */

const pad = (n) => String(n).padStart(2, '0');

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let _toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ================================================================
   1. CLOCK & DATE
   ================================================================ */
const clockEl = document.getElementById('clock');
const dateEl  = document.getElementById('date-display');

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function updateClock() {
  const now = new Date();
  clockEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  dateEl.textContent  = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

updateClock();
setInterval(updateClock, 1000);

/* ================================================================
   2. GREETING  (+ Challenge: custom name)
   ================================================================ */
const greetingEl = document.getElementById('greeting');
const nameInput  = document.getElementById('name-input');
const nameSaveBtn = document.getElementById('name-save');

function getGreetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

function renderGreeting() {
  const name = lsGet('userName', '');
  greetingEl.textContent = name ? `${getGreetingWord()}, ${name}!` : getGreetingWord();
  nameInput.value = name;
}

nameSaveBtn.addEventListener('click', () => {
  const val = nameInput.value.trim();
  lsSet('userName', val);
  renderGreeting();
  showToast(val ? `Name saved: "${val}" 👋` : 'Name cleared.');
});

nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameSaveBtn.click(); });

renderGreeting();
setInterval(renderGreeting, 60_000);

/* ================================================================
   3. FOCUS TIMER  (+ Challenge: configurable duration)
   ================================================================ */
const timerMinEl     = document.getElementById('timer-minutes');
const timerSecEl     = document.getElementById('timer-seconds');
const timerStatusEl  = document.getElementById('timer-status');
const startBtn       = document.getElementById('timer-start');
const stopBtn        = document.getElementById('timer-stop');
const resetBtn       = document.getElementById('timer-reset');
const pomodoroInput  = document.getElementById('pomodoro-minutes');
const pomodoroSetBtn = document.getElementById('pomodoro-set');

let timerDuration  = lsGet('pomodoroDuration', 25);
let timerRemaining = timerDuration * 60;
let timerInterval  = null;
let timerRunning   = false;

pomodoroInput.value = timerDuration;

function renderTimer() {
  timerMinEl.textContent = pad(Math.floor(timerRemaining / 60));
  timerSecEl.textContent = pad(timerRemaining % 60);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  timerRunning  = false;
}

function startTimer() {
  if (timerRunning || timerRemaining <= 0) return;
  timerRunning = true;
  timerStatusEl.textContent = 'Focus! 🎯';

  timerInterval = setInterval(() => {
    timerRemaining--;
    renderTimer();
    if (timerRemaining <= 0) {
      stopTimer();
      timerStatusEl.textContent = 'Session complete! Take a break. 🎉';
      showToast('⏰ Focus session done!');
    }
  }, 1000);
}

function resetTimer() {
  stopTimer();
  timerRemaining = timerDuration * 60;
  renderTimer();
  timerStatusEl.textContent = '';
}

pomodoroSetBtn.addEventListener('click', () => {
  const val = parseInt(pomodoroInput.value, 10);
  if (!val || val < 1 || val > 120) {
    showToast('Enter a value between 1 and 120 minutes.');
    return;
  }
  timerDuration = val;
  lsSet('pomodoroDuration', val);
  resetTimer();
  showToast(`Timer set to ${val} min ⏱️`);
});

pomodoroInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') pomodoroSetBtn.click(); });
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click',  () => { stopTimer(); timerStatusEl.textContent = 'Paused.'; });
resetBtn.addEventListener('click', resetTimer);

renderTimer();

/* ================================================================
   4. TO-DO LIST
      Challenges: prevent duplicates, sort tasks
   ================================================================ */
const todoInput  = document.getElementById('todo-input');
const todoAddBtn = document.getElementById('todo-add');
const todoListEl = document.getElementById('todo-list');
const todoEmptyEl = document.getElementById('todo-empty');
const todoSortEl  = document.getElementById('todo-sort');

/** @type {{ id: string, text: string, done: boolean }[]} */
let tasks = lsGet('tasks', []);

function saveTasks() { lsSet('tasks', tasks); }

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function getSortedTasks() {
  const mode = todoSortEl.value;
  const copy = [...tasks];
  if (mode === 'az')    return copy.sort((a, b) => a.text.localeCompare(b.text));
  if (mode === 'za')    return copy.sort((a, b) => b.text.localeCompare(a.text));
  if (mode === 'done')  return copy.sort((a, b) => Number(a.done) - Number(b.done));
  if (mode === 'undone') return copy.sort((a, b) => Number(b.done) - Number(a.done));
  return copy;
}

function renderTasks() {
  todoListEl.innerHTML = '';
  todoEmptyEl.style.display = tasks.length === 0 ? 'block' : 'none';

  getSortedTasks().forEach((task) => {
    const li = document.createElement('li');
    li.className = `todo-item${task.done ? ' done' : ''}`;
    li.dataset.id = task.id;

    li.innerHTML = `
      <input type="checkbox" class="todo-item__checkbox" ${task.done ? 'checked' : ''} aria-label="Mark done" />
      <span class="todo-item__text">${escapeHtml(task.text)}</span>
      <div class="todo-item__actions">
        <button class="btn btn--edit" title="Edit" aria-label="Edit task">✏️</button>
        <button class="btn btn--delete" title="Delete" aria-label="Delete task">Delete</button>
      </div>
    `;

    li.querySelector('.todo-item__checkbox').addEventListener('change', (e) => {
      const t = tasks.find((x) => x.id === task.id);
      if (t) { t.done = e.target.checked; saveTasks(); renderTasks(); }
    });

    li.querySelector('.btn--edit').addEventListener('click', () => startEditTask(li, task.id));

    li.querySelector('.btn--delete').addEventListener('click', () => {
      tasks = tasks.filter((x) => x.id !== task.id);
      saveTasks();
      renderTasks();
      showToast('Task deleted.');
    });

    todoListEl.appendChild(li);
  });
}

function startEditTask(li, id) {
  const task = tasks.find((x) => x.id === id);
  if (!task) return;

  const textSpan  = li.querySelector('.todo-item__text');
  const actionsEl = li.querySelector('.todo-item__actions');

  const editInput = document.createElement('input');
  editInput.type      = 'text';
  editInput.className = 'todo-item__edit-input';
  editInput.value     = task.text;
  editInput.maxLength = 100;
  textSpan.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  actionsEl.innerHTML = `
    <button class="btn btn--add" style="padding:4px 10px;font-size:0.78rem">Save</button>
    <button class="btn btn--edit" style="padding:4px 10px;font-size:0.78rem">Cancel</button>
  `;

  const [saveBtn, cancelBtn] = actionsEl.querySelectorAll('button');

  function commitEdit() {
    const newText = editInput.value.trim();
    if (!newText) { showToast('Task cannot be empty.'); return; }

    // Challenge: prevent duplicate on edit
    const dup = tasks.find((x) => x.id !== id && x.text.toLowerCase() === newText.toLowerCase());
    if (dup) { showToast('⚠️ That task already exists.'); return; }

    task.text = newText;
    saveTasks();
    renderTasks();
    showToast('Task updated.');
  }

  saveBtn.addEventListener('click', commitEdit);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  commitEdit();
    if (e.key === 'Escape') renderTasks();
  });
  cancelBtn.addEventListener('click', () => renderTasks());
}

function addTask() {
  const text = todoInput.value.trim();
  if (!text) { showToast('Please type a task first.'); return; }

  // Challenge: prevent duplicate tasks
  if (tasks.find((x) => x.text.toLowerCase() === text.toLowerCase())) {
    showToast('⚠️ That task already exists!');
    todoInput.select();
    return;
  }

  tasks.push({ id: genId(), text, done: false });
  saveTasks();
  renderTasks();
  todoInput.value = '';
  todoInput.focus();
}

todoAddBtn.addEventListener('click', addTask);
todoInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
todoSortEl.addEventListener('change', renderTasks);

renderTasks();

/* ================================================================
   5. QUICK LINKS
   ================================================================ */
const linkNameInput = document.getElementById('link-name');
const linkUrlInput  = document.getElementById('link-url');
const linkAddBtn    = document.getElementById('link-add');
const linksGridEl   = document.getElementById('links-grid');
const linksEmptyEl  = document.getElementById('links-empty');

// Default links (shown on first visit — matches screenshot)
const DEFAULT_LINKS = [
  { id: 'default-1', name: 'Google',   url: 'https://www.google.com' },
  { id: 'default-2', name: 'Gmail',    url: 'https://mail.google.com' },
  { id: 'default-3', name: 'Calendar', url: 'https://calendar.google.com' },
];

/** @type {{ id: string, name: string, url: string }[]} */
let links = lsGet('quickLinks', null);

// First visit: load defaults
if (links === null) {
  links = DEFAULT_LINKS;
  lsSet('quickLinks', links);
}

function saveLinks() { lsSet('quickLinks', links); }

function renderLinks() {
  linksGridEl.innerHTML = '';
  linksEmptyEl.style.display = links.length === 0 ? 'block' : 'none';

  links.forEach((link) => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';

    const anchor = document.createElement('a');
    anchor.href      = link.url;
    anchor.target    = '_blank';
    anchor.rel       = 'noopener noreferrer';
    anchor.className = 'link-chip__label';
    anchor.textContent = link.name;

    const delBtn = document.createElement('button');
    delBtn.className   = 'link-chip__delete';
    delBtn.textContent = '✕';
    delBtn.title       = `Remove ${link.name}`;
    delBtn.setAttribute('aria-label', `Remove ${link.name}`);
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      links = links.filter((x) => x.id !== link.id);
      saveLinks();
      renderLinks();
      showToast(`"${link.name}" removed.`);
    });

    chip.appendChild(anchor);
    chip.appendChild(delBtn);
    linksGridEl.appendChild(chip);
  });
}

function addLink() {
  const name = linkNameInput.value.trim();
  const raw  = linkUrlInput.value.trim();

  if (!name || !raw) { showToast('Fill in both the name and URL.'); return; }

  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try { new URL(url); } catch { showToast('Please enter a valid URL.'); return; }

  links.push({ id: genId(), name, url });
  saveLinks();
  renderLinks();
  linkNameInput.value = '';
  linkUrlInput.value  = '';
  linkNameInput.focus();
  showToast(`"${name}" added.`);
}

linkAddBtn.addEventListener('click', addLink);
linkUrlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addLink(); });

renderLinks();

/* ================================================================
   6. LIGHT / DARK MODE  (Challenge)
   ================================================================ */
const themeToggle = document.getElementById('theme-toggle');
const htmlEl      = document.documentElement;

const savedTheme = lsGet('theme', 'light');
htmlEl.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const next = htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  htmlEl.setAttribute('data-theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  lsSet('theme', next);
});
