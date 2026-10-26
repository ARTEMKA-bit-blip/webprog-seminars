Сервер мініпроєкту (семінари 5–6)
Запуск: npm install, потім npm run dev (або npm start). Сторінка: http://localhost:3000

Маршрути:
Метод   Адреса                    Тіло запиту                         Успіх         Помилки
GET     /api/meetings             — (?day=Четвер — фільтр за днем)    200           500
GET     /api/meetings/:id         —                                   200           404
POST    /api/meetings             day, time, topic, places            201 + об'єкт  400
PUT     /api/meetings/:id         day, time, topic, places            200 + об'єкт  400, 404
DELETE  /api/meetings/:id         —                                   204           404
POST    /api/registrations        meetingId, name                     201 + об'єкт  400, 404, 409
Інші /api/...                     —                                   —             404 {"error": ...}

Таблиця перевірки API:
Сценарій                          Запит                    Очікувано  Отримано
Створення з коректними даними     POST /api/meetings       201        201
Тема з двох символів, час 25:00   POST /api/meetings       400        400
Заміна наявної зустрічі           PUT /api/meetings/1      200        200
Заміна відсутньої зустрічі        PUT /api/meetings/99     404        404
Видалення наявної зустрічі        DELETE /api/meetings/7   204        204
Повторне видалення                DELETE /api/meetings/7   404        404
