console.log('app.js підключено');

const joinBtn = document.querySelector('#join-btn');
const form = document.querySelector('#join-form');
const nameInput = document.querySelector('#name');
const message = document.querySelector('#message');
const list = document.querySelector('#events ul');
const goingBtn = document.querySelector('#going-btn');
const count = document.querySelector('#count');

// Дія 1: показ і приховування форми
joinBtn.addEventListener('click', () => {
  form.classList.toggle('hidden');
});

// Дія 2: форма без перезавантаження
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const userName = nameInput.value.trim();
  if (userName === '') {
    message.textContent = 'Вкажіть ім’я';
    return;
  }
  message.textContent = `Дякуємо, ${userName}!`;
  form.reset();
});

// Дія 3: список із масиву
const meetings = [
  { day: 'Вівторок', topic: 'Практика верстки' },
  { day: 'Четвер', topic: 'Розбір коду' },
  { day: 'Субота', topic: 'Мініхакатон' },
  { day: 'Середа', topic: 'Основи Git' },
];
for (const item of meetings) {
  const li = document.createElement('li');
  li.textContent = `${item.day} — ${item.topic}`;
  list.append(li);
}

// Дія на вибір: лічильник «Я піду»
let total = 0;
goingBtn.addEventListener('click', () => {
  total += 1;
  count.textContent = total;
});
