'use strict';

const API = '';                       // той самий сервер; для GitHub Pages тут повна адреса API
const DRAFT_KEY = 'meetings:draft';
const MY_KEY = 'meetings:my';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIMEOUT_MS = 5000;

const screens = document.querySelectorAll('[data-screen]');
const links = document.querySelectorAll('.site-header nav a');
const cards = document.querySelector('.cards');
const status = document.querySelector('#status');
const dayFilter = document.querySelector('#day-filter');
const meetingForm = document.querySelector('#meeting-form');
const message = document.querySelector('#message');
const form = document.querySelector('#reg-form');
const select = document.querySelector('#meeting');
const nameInput = document.querySelector('#name');
const emailInput = document.querySelector('#email');
const regMessage = document.querySelector('#reg-message');
const myList = document.querySelector('#my-list');
const myEmpty = document.querySelector('#my-empty');

let meetings = [];

// ---------- запити до API ----------
async function api(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(API + url, {
      ...options,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    if (response.status === 204) return null;
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.errors ? data.errors.join('; ') : data.error);
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Сервер не відповідає');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- сховище ----------
function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('localStorage недоступне', error);
  }
}

// ---------- допоміжне ----------
function setError(input, text) {
  document.getElementById(`${input.id}-error`).textContent = text;
  if (text) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}
function say(el, text, type) {
  el.textContent = text;
  el.className = type || '';
}
function makeCard(title, lines) {
  const li = document.createElement('li');
  li.className = 'card';
  const h = document.createElement('h2');
  h.textContent = title;
  li.append(h);
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line;
    li.append(p);
  }
  return li;
}

// ---------- екран «Розклад» ----------
function renderList() {
  const day = dayFilter.value;
  const shown = day ? meetings.filter((m) => m.day === day) : meetings;
  cards.replaceChildren();
  for (const item of shown) {
    const li = makeCard(item.topic, [
      `${item.day}, ${item.time}`,
      `Місць: ${item.places}${item.host ? ` · ведучий: ${item.host}` : ''}`,
    ]);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const link = document.createElement('a');
    link.className = 'button';
    link.href = `#/register/${item.id}`;
    link.textContent = 'Записатися';
    link.setAttribute('aria-label', `Записатися: ${item.topic}`);
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'secondary';
    del.textContent = 'Видалити';
    del.setAttribute('aria-label', `Видалити зустріч: ${item.topic}`);
    del.addEventListener('click', () => removeMeeting(item.id));
    actions.append(link, del);
    li.append(actions);
    cards.append(li);
  }
  status.textContent = `Зустрічей: ${shown.length}`;
}

function fillSelects() {
  const days = [...new Set(meetings.map((m) => m.day))];
  const current = dayFilter.value;
  dayFilter.replaceChildren(new Option('Усі дні', ''));
  for (const d of days) dayFilter.append(new Option(d, d));
  dayFilter.value = days.includes(current) ? current : '';
  const chosen = select.value;
  select.replaceChildren();
  for (const m of meetings) select.append(new Option(`${m.topic} (${m.day}, ${m.time})`, m.id));
  if (chosen) select.value = chosen;
}

async function loadMeetings() {
  try {
    meetings = await api('/api/meetings');
    fillSelects();
    renderList();
  } catch (error) {
    status.textContent = `Не вдалося завантажити: ${error.message}`;
  }
}

async function removeMeeting(id) {
  try {
    await api(`/api/meetings/${id}`, { method: 'DELETE' });
    await loadMeetings();
    say(message, 'Зустріч видалено', 'ok');
  } catch (error) {
    say(message, `Не вдалося видалити: ${error.message}`, 'error');
  }
}

dayFilter.addEventListener('change', renderList);

// Нова зустріч (перевірка на клієнті не замінює серверну)
meetingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const f = meetingForm.elements;
  const topicOk = f.topic.value.trim().length >= 3;
  setError(f.topic, topicOk ? '' : 'Тема: щонайменше 3 символи');
  setError(f.day, f.day.value.trim() ? '' : 'День: обов’язкове поле');
  setError(f.time, /^([01]\d|2[0-3]):[0-5]\d$/.test(f.time.value) ? '' : 'Час: формат ГГ:ХХ');
  const places = Number(f.places.value);
  setError(f.places, Number.isInteger(places) && places >= 1 && places <= 100 ? '' : 'Місць: ціле число від 1 до 100');
  const bad = meetingForm.querySelector('[aria-invalid="true"]');
  if (bad) { bad.focus(); return; }
  const button = meetingForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const saved = await api('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(meetingForm))),
    });
    say(message, `Зустріч №${saved.id} додано`, 'ok');
    meetingForm.reset();
    await loadMeetings();
  } catch (error) {
    say(message, `Помилка: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
});

// ---------- екран «Запис»: чернетка і перевірка ----------
function restoreDraft() {
  const draft = load(DRAFT_KEY, {});
  for (const [key, value] of Object.entries(draft)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  }
}
form.addEventListener('input', () => {
  save(DRAFT_KEY, Object.fromEntries(new FormData(form)));
});

function checkForm() {
  setError(nameInput, nameInput.value.trim().length < 2 ? 'Ім’я: щонайменше 2 символи' : '');
  setError(emailInput, EMAIL.test(emailInput.value) ? '' : 'Email: формат name@example.com');
  const invalid = form.querySelector('[aria-invalid="true"]');
  if (invalid) invalid.focus();
  return !invalid;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!checkForm()) return;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const saved = await api('/api/registrations', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const m = meetings.find((item) => item.id === saved.meetingId);
    // email у «Мої зустрічі» не зберігається
    const entry = { id: saved.id, topic: m.topic, day: m.day, time: m.time };
    save(MY_KEY, [...load(MY_KEY, []), entry]);
    localStorage.removeItem(DRAFT_KEY);
    form.reset();
    say(regMessage, `Заявку №${saved.id} прийнято`, 'ok');
  } catch (error) {
    say(regMessage, `Помилка: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
});

// ---------- екран «Мої зустрічі» ----------
function renderMy() {
  const mine = load(MY_KEY, []);
  myList.replaceChildren();
  myEmpty.hidden = mine.length > 0;
  for (const entry of mine) {
    const li = makeCard(entry.topic, [`${entry.day}, ${entry.time}`, `Заявка №${entry.id}`]);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'secondary';
    cancel.textContent = 'Скасувати';
    cancel.setAttribute('aria-label', `Скасувати заявку №${entry.id}`);
    cancel.addEventListener('click', () => cancelRegistration(entry.id));
    actions.append(cancel);
    li.append(actions);
    myList.append(li);
  }
}

async function cancelRegistration(id) {
  try {
    await api(`/api/registrations/${id}`, { method: 'DELETE' });
  } catch (error) {
    // 404: заявки вже немає на сервері — прибираємо й локальний запис
    if (!/не знайдено/.test(error.message)) {
      say(regMessage, `Не вдалося скасувати: ${error.message}`, 'error');
      return;
    }
  }
  save(MY_KEY, load(MY_KEY, []).filter((e) => e.id !== id));
  renderMy();
}

// Синхронізація вкладок
window.addEventListener('storage', (event) => {
  if (event.key === MY_KEY || event.key === null) renderMy();
});

// ---------- маршрутизатор ----------
function parseRoute() {
  const [name, param] = location.hash.replace(/^#\/?/, '').split('/');
  return { name: name || 'list', param };
}

function showScreen() {
  const route = parseRoute();
  const known = [...screens].some((s) => s.dataset.screen === route.name);
  const name = known ? route.name : 'list';
  for (const screen of screens) screen.hidden = screen.dataset.screen !== name;
  for (const link of links) {
    if (link.getAttribute('href') === `#/${name}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  if (name === 'register' && route.param) select.value = route.param;
  if (name === 'my') renderMy();
  const heading = document.querySelector(`[data-screen="${name}"] h1`);
  document.title = `${heading.textContent} · Зустрічі клубу`;
  heading.focus();
}
window.addEventListener('hashchange', showScreen);

// ---------- запуск ----------
async function init() {
  await loadMeetings();
  restoreDraft();      // після побудови select
  showScreen();        // екран визначається з hash і після F5
}
init();
