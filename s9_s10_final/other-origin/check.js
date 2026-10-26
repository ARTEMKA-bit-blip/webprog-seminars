const out = document.querySelector('#out');
const API = 'http://localhost:3000/api/meetings';
const lines = [];

async function run() {
  try {
    const r = await fetch(API);
    const data = await r.json();
    lines.push(`GET: ${r.status}, зустрічей: ${data.length}`);
  } catch (e) {
    lines.push(`GET: заблоковано CORS (${e.message})`);
  }
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day: 'Середа', time: '16:00', topic: 'Тест CORS', places: 5 }),
    });
    lines.push(`POST JSON: ${r.status}`);
  } catch (e) {
    lines.push(`POST JSON: заблоковано попередній запит OPTIONS (${e.message})`);
  }
  out.textContent = lines.join('\n');
}
run();
