const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;
const MEETINGS_FILE = path.join(__dirname, 'data', 'meetings.json');
const REGISTRATIONS_FILE = path.join(__dirname, 'data', 'registrations.json');

// ---------- робота з файлами ----------
async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}
async function writeJson(file, data) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}
const readMeetings = () => readJson(MEETINGS_FILE);
const writeMeetings = (m) => writeJson(MEETINGS_FILE, m);
const readRegistrations = () => readJson(REGISTRATIONS_FILE);
const writeRegistrations = (r) => writeJson(REGISTRATIONS_FILE, r);

// ---------- перевірка даних ----------
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateMeeting(data = {}) {
  const errors = [];
  if (typeof data.topic !== 'string' || data.topic.trim().length < 3)
    errors.push('topic: щонайменше 3 символи');
  if (typeof data.day !== 'string' || data.day.trim() === '')
    errors.push('day: обов’язкове поле');
  if (!TIME.test(data.time ?? ''))
    errors.push('time: формат ГГ:ХХ');
  const places = Number(data.places);
  if (!Number.isInteger(places) || places < 1 || places > 100)
    errors.push('places: ціле число від 1 до 100');
  return errors;
}

function fields(data) {
  return {
    day: data.day.trim(),
    time: data.time,
    topic: data.topic.trim(),
    places: Number(data.places),
    host: typeof data.host === 'string' ? data.host.trim() : '',
  };
}

// ---------- проміжні обробники ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const serverError = (res, error, text) => {
  console.error(error);
  res.status(500).json({ error: text });
};

// ---------- GET ----------
app.get('/api/meetings', async (req, res) => {
  try {
    let meetings = await readMeetings();
    if (req.query.day) {
      meetings = meetings.filter((m) => m.day === req.query.day); // фільтр ?day=Четвер
    }
    res.json(meetings);
  } catch (error) {
    serverError(res, error, 'Не вдалося прочитати дані');
  }
});

app.get('/api/meetings/:id', async (req, res) => {
  try {
    const meetings = await readMeetings();
    const meeting = meetings.find((m) => m.id === Number(req.params.id));
    if (!meeting) {
      return res.status(404).json({ error: 'Зустріч не знайдено' });
    }
    res.json(meeting);
  } catch (error) {
    serverError(res, error, 'Не вдалося прочитати дані');
  }
});

// ---------- POST ----------
app.post('/api/meetings', async (req, res) => {
  const errors = validateMeeting(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  try {
    const meetings = await readMeetings();
    const id = meetings.reduce((max, m) => Math.max(max, m.id), 0) + 1;
    const meeting = { id, ...fields(req.body) };
    meetings.push(meeting);
    await writeMeetings(meetings);
    res.status(201).json(meeting);
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

// ---------- PUT ----------
app.put('/api/meetings/:id', async (req, res) => {
  const errors = validateMeeting(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  try {
    const meetings = await readMeetings();
    const index = meetings.findIndex((m) => m.id === Number(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Зустріч не знайдено' });
    }
    meetings[index] = { id: meetings[index].id, ...fields(req.body) };
    await writeMeetings(meetings);
    res.json(meetings[index]);
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

// ---------- DELETE ----------
app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const meetings = await readMeetings();
    const rest = meetings.filter((m) => m.id !== Number(req.params.id));
    if (rest.length === meetings.length) {
      return res.status(404).json({ error: 'Зустріч не знайдено' });
    }
    await writeMeetings(rest);
    res.status(204).end();
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

// ---------- заявки (домашнє завдання семінару 6) ----------
app.post('/api/registrations', async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2) {
    return res.status(400).json({ errors: ['name: щонайменше 2 символи'] });
  }
  try {
    const meetings = await readMeetings();
    const meetingId = Number(body.meetingId ?? body.meeting);
    const meeting = meetings.find((m) => m.id === meetingId);
    if (!meeting) {
      return res.status(404).json({ error: 'Зустріч не знайдено' });
    }
    const registrations = await readRegistrations();
    const taken = registrations.filter((r) => r.meetingId === meetingId).length;
    if (taken >= meeting.places) {
      return res.status(409).json({ error: 'Вільних місць немає' });
    }
    const id = registrations.reduce((max, r) => Math.max(max, r.id), 0) + 1;
    const registration = { id, meetingId, name };
    registrations.push(registration);
    await writeRegistrations(registrations);
    res.status(201).json(registration);
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

// ---------- невідомі маршрути /api/... ----------
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

app.listen(PORT, () => {
  console.log(`Сервер працює: http://localhost:${PORT}`);
});
