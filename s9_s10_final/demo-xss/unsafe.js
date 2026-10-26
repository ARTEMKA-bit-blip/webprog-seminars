// НАВМИСНО ВРАЗЛИВИЙ КОД — лише для демонстрації на семінарі 9.
const meetings = [
  { day: 'Вівторок', time: '15:40', topic: 'Практика верстки' },
  { day: 'Середа', time: '16:00',
    topic: '<img src=x onerror="document.body.style.background=\'#ffd6d6\';document.title=\'XSS\'">' },
];
const list = document.querySelector('#list');
list.innerHTML = meetings
  .map((m) => `<li>${m.day}, ${m.time} — ${m.topic}</li>`)
  .join('');
