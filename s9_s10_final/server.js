const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CSP_ENABLED = process.env.CSP !== 'off';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 5;   // POST за хвилину з однієї IP
const RATE_WINDOW_MS = 60 * 1000;

if (process.env.TRUST_PROXY) app.set('trust proxy', 1);    // IP клієнта з X-Forwarded-For на хостингу

const MEETINGS_FILE = path.join(__dirname, 'data', 'meetings.json');
const REGISTRATIONS_FILE = path.join(__dirname, 'data', 'registrations.json');

// ---------- файлове сховище (навчальне) ----------
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

// Черга запису: два запити не змінюють файл одночасно
let queue = Promise.resolve();
function exclusive(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

// ---------- перевірка даних ----------
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MARKUP = /[<>]/;

function validateMeeting(data = {}) {
  const errors = [];
  if (typeof data.topic !== 'string' || data.topic.trim().length < 3 || data.topic.length > 100)
    errors.push('topic: від 3 до 100 символів');
  if (typeof data.day !== 'string' || data.day.trim() === '' || data.day.length > 20)
    errors.push('day: від 1 до 20 символів');
  if (MARKUP.test(data.topic ?? '') || MARKUP.test(data.day ?? ''))
    errors.push('topic, day: символи < і > недопустимі');
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
    host: typeof data.host === 'string' ? data.host.trim().slice(0, 50).replace(/[<>]/g, '') : '',
  };
}

function validateRegistration(data = {}) {
  const errors = [];
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (name.length < 2 || name.length > 60)
    errors.push('name: від 2 до 60 символів');
  if (MARKUP.test(name))
    errors.push('name: символи < і > недопустимі');
  if (data.email !== undefined && data.email !== '' &&
      (typeof data.email !== 'string' || data.email.length > 100 || !EMAIL.test(data.email)))
    errors.push('email: формат name@example.com');
  return errors;
}

// ---------- заголовки безпеки (семінар 9) ----------
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  if (CSP_ENABLED) {
    res.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; " +
      "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  }
  next();
});

// ---------- CORS лише для дозволених джерел ----------
app.use('/api', (req, res, next) => {
  const origin = req.get('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set({ 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.status(204).end();
    }
  }
  next();
});

// ---------- обмеження частоти POST (домашнє завдання семінару 9) ----------
const hits = new Map();
app.use('/api', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const now = Date.now();
  const ip = req.ip || 'unknown';
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    const wait = Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000);
    res.set('Retry-After', String(wait));
    return res.status(429).json({ error: 'Забагато запитів, спробуйте пізніше' });
  }
  recent.push(now);
  hits.set(ip, recent);
  next();
});

// ---------- тип і розмір тіла ----------
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) {
    return res.status(415).json({ error: 'Очікується Content-Type: application/json' });
  }
  next();
});
app.use(express.json({ limit: '10kb' }));

// ---------- клієнт ----------
app.use(express.static(path.join(__dirname, 'public')));

const serverError = (res, error, text) => {
  console.error(error);
  res.status(500).json({ error: text });
};

// ---------- зустрічі ----------
app.get('/api/meetings', async (req, res) => {
  try {
    let meetings = await readMeetings();
    if (req.query.day) meetings = meetings.filter((m) => m.day === req.query.day);
    res.json(meetings);
  } catch (error) {
    serverError(res, error, 'Не вдалося прочитати дані');
  }
});

app.get('/api/meetings/:id', async (req, res) => {
  try {
    const meetings = await readMeetings();
    const meeting = meetings.find((m) => m.id === Number(req.params.id));
    if (!meeting) return res.status(404).json({ error: 'Зустріч не знайдено' });
    res.json(meeting);
  } catch (error) {
    serverError(res, error, 'Не вдалося прочитати дані');
  }
});

app.post('/api/meetings', async (req, res) => {
  const errors = validateMeeting(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });
  try {
    const meeting = await exclusive(async () => {
      const meetings = await readMeetings();
      const id = meetings.reduce((max, m) => Math.max(max, m.id), 0) + 1;
      const created = { id, ...fields(req.body) };
      meetings.push(created);
      await writeMeetings(meetings);
      return created;
    });
    res.status(201).json(meeting);
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

app.put('/api/meetings/:id', async (req, res) => {
  const errors = validateMeeting(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });
  try {
    const updated = await exclusive(async () => {
      const meetings = await readMeetings();
      const index = meetings.findIndex((m) => m.id === Number(req.params.id));
      if (index === -1) return null;
      meetings[index] = { id: meetings[index].id, ...fields(req.body) };
      await writeMeetings(meetings);
      return meetings[index];
    });
    if (!updated) return res.status(404).json({ error: 'Зустріч не знайдено' });
    res.json(updated);
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    const removed = await exclusive(async () => {
      const meetings = await readMeetings();
      const rest = meetings.filter((m) => m.id !== Number(req.params.id));
      if (rest.length === meetings.length) return false;
      await writeMeetings(rest);
      return true;
    });
    if (!removed) return res.status(404).json({ error: 'Зустріч не знайдено' });
    res.status(204).end();
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

// ---------- заявки ----------
app.post('/api/registrations', async (req, res) => {
  const errors = validateRegistration(req.body);
  if (errors.length > 0) return res.status(400).json({ errors });
  try {
    const result = await exclusive(async () => {
      const meetings = await readMeetings();
      const meetingId = Number(req.body.meetingId);
      const meeting = meetings.find((m) => m.id === meetingId);
      if (!meeting) return { status: 404, body: { error: 'Зустріч не знайдено' } };
      const registrations = await readRegistrations();
      const taken = registrations.filter((r) => r.meetingId === meetingId).length;
      if (taken >= meeting.places) return { status: 409, body: { error: 'Вільних місць немає' } };
      const id = registrations.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const registration = { id, meetingId, name: req.body.name.trim() };
      registrations.push(registration);
      await writeRegistrations(registrations);
      return { status: 201, body: registration };
    });
    res.status(result.status).json(result.body);
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

app.delete('/api/registrations/:id', async (req, res) => {
  try {
    const removed = await exclusive(async () => {
      const registrations = await readRegistrations();
      const rest = registrations.filter((r) => r.id !== Number(req.params.id));
      if (rest.length === registrations.length) return false;
      await writeRegistrations(rest);
      return true;
    });
    if (!removed) return res.status(404).json({ error: 'Заявку не знайдено' });
    res.status(204).end();
  } catch (error) {
    serverError(res, error, 'Не вдалося зберегти дані');
  }
});

// ---------- невідомі маршрути /api/... ----------
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

// ---------- обробник помилок (JSON, без деталей винятку) ----------
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  const text = { 400: 'Некоректний JSON', 413: 'Завеликий запит' }[status] ?? 'Помилка сервера';
  res.status(status).json({ error: text });
});

app.listen(PORT, () => {
  console.log(`Сервер працює: http://localhost:${PORT}`);
});
