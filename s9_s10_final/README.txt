МІНІПРОЄКТ «ЗАПИС НА ЗУСТРІЧ» (технології вебпрограмування, викл. Шовкун М.І.)
Автор: Крутінь Артем, група КК-КН-59
Стек: HTML, CSS, JavaScript (клієнт), Node.js + Express (сервер), JSON-файл як сховище.

1. ЗАПУСК
   Потрібен Node.js 20 або новіший.
   npm install        (перший раз; створює package-lock.json)
   npm start          (або npm run dev — перезапуск після змін)
   Сторінка: http://localhost:3000   (відкривати через сервер, не через file://)
   Після клонування репозиторію: npm ci, потім npm start.
   Змінні середовища (необов'язкові):
     PORT              порт (за замовчуванням 3000; на хостингу задає сервіс)
     ALLOWED_ORIGINS   дозволені джерела CORS через кому, напр. https://логін.github.io
     TRUST_PROXY=1     брати IP клієнта з X-Forwarded-For (хостинг за проксі)
     RATE_LIMIT        ліміт POST за хвилину з однієї IP (за замовчуванням 5)
     CSP=off           вимкнути CSP (лише для демонстрації семінару 9)

2. ЕКРАНИ КЛІЄНТА (односторінковий застосунок, маршрути за hash)
   #/list            Розклад: картки зустрічей, фільтр за днем, форма «Нова зустріч», «Видалити»
   #/register/:id    Запис: форма (зустріч, ім'я, email), чернетка в localStorage
   #/my              Мої зустрічі: заявки з цього браузера, кнопка «Скасувати»
   Невідомий маршрут відкриває «Розклад».
   Ключі localStorage: meetings:draft (чернетка), meetings:my (заявки; email не зберігається).

3. МАРШРУТИ API
   Метод   Адреса                    Тіло запиту (JSON)                  Успіх         Помилки
   GET     /api/meetings             —  (необов'язково ?day=Четвер)      200           500
   GET     /api/meetings/:id         —                                   200           404
   POST    /api/meetings             day, time (ГГ:ХХ), topic, places    201 + об'єкт  400, 413, 415, 429
   PUT     /api/meetings/:id         day, time, topic, places            200 + об'єкт  400, 404, 413, 415
   DELETE  /api/meetings/:id         —                                   204           404
   POST    /api/registrations        meetingId, name, email (необов.)    201 + об'єкт  400, 404, 409, 413, 415, 429
   DELETE  /api/registrations/:id    —                                   204           404
   Будь-яка інша адреса /api/...     —                                   —             404 {"error": "..."}
   Коди: 400 — дані не пройшли перевірку (масив errors); 404 — немає ресурсу;
   409 — немає вільних місць; 413 — тіло понад 10 КБ; 415 — не application/json;
   429 — понад 5 POST за хвилину (заголовок Retry-After); 500 — помилка сервера.

4. ПЕРЕВІРКА API (результати запусків)
   Сценарій                                   Запит                          Очікувано  Отримано
   Створення з коректними даними              POST /api/meetings             201        201
   Тема з двох символів, час 25:00            POST /api/meetings             400        400
   Заміна наявної зустрічі                    PUT /api/meetings/1            200        200
   Заміна відсутньої зустрічі                 PUT /api/meetings/99           404        404
   Видалення наявної зустрічі                 DELETE /api/meetings/7         204        204
   Повторне видалення                         DELETE /api/meetings/7         404        404
   Зустріч з id 99                            GET /api/meetings/99           404        404
   Невідомий маршрут                          GET /api/unknown               404        404 (JSON)
   Заявка з коректними даними                 POST /api/registrations        201        201
   Ім'я з однієї літери                       POST /api/registrations        400        400
   Відсутня зустріч                           POST /api/registrations        404        404
   Місць немає (зустріч №6, 2 місця, 3-тя)    POST /api/registrations        409        409

5. БЕЗПЕКА (семінар 9)
   Заходи захисту:
   - Дані виводяться через textContent / createElement; innerHTML та insertAdjacentHTML
     у клієнтському коді не використовуються (пошук у VS Code: Ctrl+Shift+F, innerHTML).
   - Заголовки відповіді: Content-Security-Policy (default-src 'self', object-src 'none',
     frame-ancestors 'none' тощо), X-Content-Type-Options: nosniff, X-Frame-Options: DENY,
     Referrer-Policy: no-referrer; заголовок X-Powered-By вимкнено.
   - Перевірка на сервері: тип, довжина, формат і діапазон кожного поля;
     символи < і > у текстових полях заборонені (400).
   - POST і PUT без Content-Type: application/json отримують 415; тіло понад 10 КБ — 413;
     обірваний JSON — 400; обробник помилок віддає JSON без деталей винятку.
   - CORS лише для джерел зі змінної ALLOWED_ORIGINS; значення * не застосовується; Vary: Origin.
   - Обмеження частоти: не більше 5 POST за хвилину з однієї IP, інакше 429 + Retry-After.
   - Секрети: у проєкті немає ключів; .env і node_modules у .gitignore.
   Таблиця перевірки:
   Сценарій                                       Очікувано              Отримано
   Тема з тегом img через POST                    400                    400
   Тема з тегом img у файлі даних                 Відображається як текст  (перевірено в браузері: див. demo-xss)
   POST з Content-Type: text/plain                415                    415
   POST з тілом 20 КБ                             413                    413
   fetch з http://localhost:4000 без дозволу      Заблоковано CORS       (папка other-origin)
   6-й POST за хвилину                            429 + Retry-After      429, Retry-After=60
   Вивід curl -I (вставити свій після запуску):
     curl.exe -I http://localhost:3000/
     curl.exe -I http://localhost:3000/api/meetings
   Очікувані заголовки: content-security-policy, referrer-policy: no-referrer,
   x-content-type-options: nosniff, x-frame-options: DENY; x-powered-by відсутній.
   Папка demo-xss містить НАВМИСНО вразливий приклад (innerHTML) для демонстрації;
   вона не входить до застосунку.

6. ДОСТУПНІСТЬ І АДАПТИВНІСТЬ (семінари 7–8)
   - Mobile-first: базові стилі для телефону, медіазапити min-width: 768px і 1200px наприкінці styles.css.
   - Flexbox: шапка, навігація, вміст картки. Grid: каркас .layout, список .cards (auto-fill, minmax).
   - Кожне поле має label; помилки зв'язані через aria-describedby; aria-invalid;
     повідомлення в role="status"; фокус на h1 нового екрана; aria-current у меню;
     кнопки й поля не нижче 44 px; видимий :focus-visible; посилання «Перейти до вмісту».
   - Кольори в CSS-змінних, темна тема через prefers-color-scheme: dark.
   Lighthouse (Accessibility, не нижче 90): додати знімок звіту після запуску.
   Виправлені зауваження: (вписати за результатами власного звіту Lighthouse).

7. ПУБЛІКАЦІЯ (семінар 10)
   Код готовий до хостингу: PORT з env, engines у package.json, .gitignore, package-lock.json.
   Варіант A (один сервіс): Render Web Service — Build: npm ci, Start: npm start.
   Варіант B: клієнт на GitHub Pages (файли public -> docs, у app.js const API = 'https://....onrender.com'),
   на Render: ALLOWED_ORIGINS=https://логін.github.io
   Увага: на безкоштовному тарифі Render файли data/*.json тимчасові (зникають після перезапуску).
   Адреса застосунку: (вписати після публікації)
   Варіант публікації: (A або B)
