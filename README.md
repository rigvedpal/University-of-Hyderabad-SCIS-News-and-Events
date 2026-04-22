# SCIS News & Events Portal
## Full-stack version for the School of Computer and Information Sciences, University of Hyderabad

This project is now a working full-stack application:

- Frontend: `index.html` + `css/style.css` + `js/app.js`
- Backend: Node.js + Express
- Auth: JWT-based admin login
- Database: JSON file at `storage/events.db.json`

## Project structure

```text
scis-events/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── media/
│   └── uoh-campus.mp4
├── src/
│   ├── app.js
│   ├── config.js
│   ├── lib/
│   │   ├── db.js
│   │   ├── events.js
│   │   └── passwords.js
│   ├── middleware/
│   │   └── auth.js
│   └── routes/
│       ├── auth.js
│       └── events.js
├── storage/
│   └── events.db.json
├── server.js
├── package.json
└── .env.example
```

## How to run

1. Open a terminal in `D:\scis-events\scis-events`
2. Install dependencies if needed:

```powershell
npm install
```

3. Start the server:

```powershell
npm start
```

4. Open:

```text
http://127.0.0.1:3000
```

## Default admin login

Use these credentials for the built-in admin account:

- Username: `admin`
- Password: `scisadmin123`

Change this before real deployment by updating the user record in [storage/events.db.json](D:/scis-events/scis-events/storage/events.db.json) and setting your own `JWT_SECRET` in `.env`.

## Environment variables

Copy `.env.example` to `.env` if you want custom values.

Available settings:

- `PORT`
- `JWT_SECRET`
- `TOKEN_EXPIRES_IN`

## API endpoints

Public:

- `GET /api/health`
- `GET /api/events`
- `GET /api/events/filter?q=&cat=&time=`
- `GET /api/events/:id`
- `GET /api/events/stats`
- `GET /api/events/tags`

Protected:

- `POST /api/auth/login`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`

## Frontend behavior

- The existing hero video, ticker, filters, grid/list toggle, event modal, and highlight animation are preserved.
- Data now loads from the backend instead of `data/events.js`.
- Admin login enables:
  - adding events
  - editing events
  - deleting events
- All event changes persist in `storage/events.db.json`.

## Deployment notes

- Upload the full project except `node_modules` to the server.
- Run `npm install` on the server.
- Set a strong `JWT_SECRET`.
- Start with `npm start` or your process manager of choice.

## Verification completed

The following backend flows were verified locally:

- server health check
- event stats endpoint
- filtered event search
- JWT login
- create event
- update event
- delete event
