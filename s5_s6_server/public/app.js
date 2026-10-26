const list = document.querySelector('#events ul');
const status = document.querySelector('#status');
const meetingForm = document.querySelector('#meeting-form');
const message = document.querySelector('#message');
const joinForm = document.querySelector('#join-form');
const regSelect = document.querySelector('#reg-meeting');
const regMessage = document.querySelector('#reg-message');

// Спільна функція: заголовок, код 204, помилки сервера
async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const text = data.errors ? data.errors.join('; ') : data.error;
    throw new Error(text);
  }
  return data;
}

function show(el, text, type) {
  el.textContent = text;
  el.className = type;
}

async function loadMeetings() {
  try {
    const meetings = await api('/api/meetings');
    list.replaceChildren();
    regSelect.replaceChildren();
    for (const item of meetings) {
      const li = document.createElement('li');
      li.textContent = `${item.day}, ${item.time} — ${item.topic} (місць: ${item.places})`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Видалити';
      btn.addEventListener('click', () => removeMeeting(item.id));
      li.append(btn);
      list.append(li);
      regSelect.append(new Option(item.topic, item.id));
    }
    status.textContent = `Зустрічей: ${meetings.length}`;
  } catch (error) {
    status.textContent = `Не вдалося завантажити: ${error.message}`;
  }
}

async function removeMeeting(id) {
  try {
    await api(`/api/meetings/${id}`, { method: 'DELETE' });
    await loadMeetings();
  } catch (error) {
    show(message, `Не вдалося видалити: ${error.message}`, 'error');
  }
}

meetingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(meetingForm));
  try {
    const saved = await api('/api/meetings', { method: 'POST', body: JSON.stringify(data) });
    show(message, `Зустріч №${saved.id} додано`, 'ok');
    meetingForm.reset();
    await loadMeetings();
  } catch (error) {
    show(message, `Помилка: ${error.message}`, 'error');
  }
});

// Форма запису із семінару 4 тепер надсилає заявку на власний сервер
joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = joinForm.querySelector('button');
  const data = Object.fromEntries(new FormData(joinForm));
  button.disabled = true;
  try {
    const saved = await api('/api/registrations', { method: 'POST', body: JSON.stringify(data) });
    show(regMessage, `Заявку №${saved.id} прийнято, ${saved.name}!`, 'ok');
    joinForm.reset();
  } catch (error) {
    show(regMessage, `Не вдалося надіслати: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
});

loadMeetings();
