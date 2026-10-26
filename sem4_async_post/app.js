const API = 'https://jsonplaceholder.typicode.com/posts';
const TIMEOUT_MS = 5000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const list = document.querySelector('#events ul');
const status = document.querySelector('#status');
const form = document.querySelector('#join-form');
const select = document.querySelector('#meeting');
const sendBtn = document.querySelector('#send-btn');
const message = document.querySelector('#message');
const myList = document.querySelector('#my-list');

let meetings = [];

// Завантаження зустрічей: async/await + try/catch
async function loadMeetings() {
  try {
    const response = await fetch('meetings.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    meetings = await response.json();
    for (const item of meetings) {
      const li = document.createElement('li');
      li.textContent = `${item.day}, ${item.time} — ${item.topic}`;
      list.append(li);
      select.append(new Option(item.topic, item.id)); // пункт списку у формі
    }
    status.textContent = `Завантажено зустрічей: ${meetings.length}`;
  } catch (error) {
    status.textContent = `Не вдалося завантажити: ${error.message}`;
  }
}

function showMessage(text, type) {
  message.textContent = text;
  message.className = type;
}

// POST із тайм-аутом 5 с через AbortController
async function postJson(url, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Сервер не відповідає');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// Список «Мої заявки»
function addMyRequest(saved, meeting) {
  const li = document.createElement('li');
  li.textContent = `Заявка №${saved.id}: ${meeting.topic} (${meeting.day}, ${meeting.time})`;
  myList.append(li);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // не перезавантажувати сторінку
  const name = form.elements.name.value.trim();
  const email = form.elements.email.value.trim();
  if (name.length < 2) {
    return showMessage('Введіть ім’я — щонайменше 2 літери', 'error');
  }
  if (!EMAIL.test(email)) {
    return showMessage('Email: формат name@example.com', 'error');
  }
  sendBtn.disabled = true;
  sendBtn.textContent = 'Надсилаємо…';
  try {
    const meetingId = Number(select.value);
    const saved = await postJson(API, { name, email, meetingId });
    const meeting = meetings.find((m) => m.id === meetingId);
    showMessage(`Заявку №${saved.id} прийнято, ${saved.name}!`, 'ok');
    addMyRequest(saved, meeting);
    form.reset();
  } catch (error) {
    showMessage(`Не вдалося надіслати: ${error.message}`, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Надіслати';
  }
});

loadMeetings();
