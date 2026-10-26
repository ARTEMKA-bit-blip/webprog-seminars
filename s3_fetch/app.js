const list = document.querySelector('#events ul');
const status = document.querySelector('#status');
const filter = document.querySelector('#day-filter');
const hostsList = document.querySelector('#hosts ul');
const hostsStatus = document.querySelector('#hosts-status');

let meetings = [];

// Малює список із масиву (без нового fetch)
function render(items) {
  list.replaceChildren();
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = `${item.day}, ${item.time} — ${item.topic} (ведучий: ${item.host})`;
    list.append(li);
  }
}

// Блок 1: власний файл meetings.json
fetch('meetings.json')
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    meetings = data;
    const days = [...new Set(meetings.map((m) => m.day))];
    for (const day of days) filter.append(new Option(day, day));
    render(meetings);
    status.textContent = `Завантажено зустрічей: ${meetings.length}`;
  })
  .catch((error) => {
    status.textContent = `Не вдалося завантажити: ${error.message}`;
  });

// Фільтр за днем перебудовує список із завантажених даних
filter.addEventListener('change', () => {
  const day = filter.value;
  render(day ? meetings.filter((m) => m.day === day) : meetings);
});

// Блок 2: відкритий API JSONPlaceholder
fetch('https://jsonplaceholder.typicode.com/users?_limit=3')
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((users) => {
    for (const user of users) {
      const li = document.createElement('li');
      li.textContent = `${user.name} — ${user.email}`;
      hostsList.append(li);
    }
    hostsStatus.textContent = `Організаторів: ${users.length}`;
  })
  .catch((error) => {
    hostsStatus.textContent = `Не вдалося завантажити: ${error.message}`;
  });
