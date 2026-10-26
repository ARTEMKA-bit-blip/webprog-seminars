Міні-проєкт «Запис на зустріч»
Крутінь Артем, КК-КН-59 | Технології вебпрограмування, викл. Шовкун М.І.

ЩО ЦЕ
Сайт клубу: дивишся розклад зустрічей, записуєшся, дивишся свої записи.
Клієнт: HTML + CSS + JS. Сервер: Node.js + Express. Дані лежать у JSON-файлах.

ЯК ЗАПУСТИТИ
  npm install
  npm start
Далі відкриваєш http://localhost:3000 (через сервер, не через file://).
Потрібен Node.js 20+. Після клонування з гіта: npm ci і npm start.
Зупинити: Ctrl+C. Якщо пише «порт зайнятий» — десь вже крутиться інший сервер.

ЕКРАНИ
  #/list           розклад, фільтр по дню, форма «Нова зустріч», кнопка «Видалити»
  #/register/:id   запис (імʼя + email), чернетка не губиться після F5
  #/my             мої записи, можна скасувати
Невідомий адрес кидає на розклад.

API
  GET     /api/meetings (можна ?day=Четвер)    200
  GET     /api/meetings/:id                    200 / 404
  POST    /api/meetings                        201 / 400
  PUT     /api/meetings/:id                    200 / 400 / 404
  DELETE  /api/meetings/:id                    204 / 404
  POST    /api/registrations                   201 / 400 / 404 / 409 (місць нема)
  DELETE  /api/registrations/:id               204 / 404
  будь-що інше в /api/...                      404 (JSON)
Ще є: 413 (тіло більше 10 КБ), 415 (не JSON), 429 (більше 5 POST за хвилину).

БЕЗПЕКА
- Дані виводжу через textContent, innerHTML в клієнті нема.
- Заголовки: CSP, nosniff, X-Frame-Options, Referrer-Policy. X-Powered-By вимкнув.
- Сервер сам перевіряє все, що прийшло (довжина, формат, < і > заборонені).
- CORS тільки для сайтів зі змінної ALLOWED_ORIGINS.
- Ліміт: 5 POST на хвилину з однієї IP, далі 429 + Retry-After.
- Секретів у проєкті нема, .env і node_modules в .gitignore.
Перевірив: img-тема через POST — 400, text/plain — 415, тіло 20 КБ — 413,
6-й POST за хвилину — 429.

curl.exe -I http://localhost:3000/ показав:
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; object-src 'none';
    base-uri 'self'; form-action 'self'; frame-ancestors 'none'
(X-Powered-By нема, як і треба.)

ДОСТУПНІСТЬ І АДАПТИВ
- Mobile-first, брейкпоінти 768 і 1200 px, горизонтального скролу нема.
- Усі поля з label, помилки привʼязані через aria-describedby, є role="status",
  фокус видно, кнопки від 44 px, є темна тема.
- Lighthouse Accessibility: 26/26.

СКРІНШОТИ (папка screenshots)
  responsive-375 / 768 / 1280.png     адаптив
  spa-1..3                            три екрани
  s1-page, s2-page, s6-page           семінари 1, 2, 5-6
  s5-s6_404.png                       curl -i, 404
  s9-s10-200.png                      curl -I, заголовки
  5-6server.png, 9-10server.png       Lighthouse
  s9-xss-demo.png                     демо XSS (папка demo-xss, там навмисно вразливий код)

ПУБЛІКАЦІЯ
На хостинг не викладав, запускається локально (див. «Як запустити»).
Код до хостингу готовий: PORT береться з env, є engines і .gitignore.
