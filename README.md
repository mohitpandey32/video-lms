# Arcwell LMS

A polished, full-stack lecture workspace built with React, Express, Node.js, and MongoDB. It supports public Google Drive lecture URLs, direct video links, class-note PDFs, assignment PDFs, personal progress, and assignment submissions.

## Backend architecture

The Express API follows MVC with a small service layer:

```text
server/
├── config/       MongoDB connection and indexes
├── models/       Course, user, and progress data access
├── controllers/  Authentication, student, and admin request logic
├── routes/       API route definitions
├── middleware/   Authentication, authorization, and error handling
├── services/     Course-progress business logic
├── utils/        URL validation and Google Drive helpers
├── app.js        Express middleware and route composition
└── index.js      Database initialization and server startup
```

## Authentication and roles

- Login and student signup use MongoDB-backed server-side sessions with HTTP-only cookies.
- Passwords are hashed with bcrypt before storage.
- New signups always receive the `student` role.
- The requested administrator account is seeded for `pandeymohit998@gmail.com`; its password is stored only as a bcrypt hash.
- Students can view lectures, take notes, and submit assignments. Lecture and module management endpoints return `403` for student accounts.
- Administrators open into a separate course-management console and can switch to a student preview.

Set `MONGODB_URI`, `MONGODB_DB`, a strong `SESSION_SECRET`, and the deployed `CLIENT_ORIGIN` in the production environment. See `.env.example` for the complete list. Never commit `.env`.

Use **New lecture** in the top bar to add a titled video lesson to any course module. New lectures are persisted by the Express API, appear in the course outline, and open immediately after publishing.

To rename a module, open the course outline and use the pencil action beside its heading. Module edits are saved without changing the lectures inside it.

Each lecture has its own pencil action as well. Renaming a lecture updates both the course outline and the active player heading while preserving its video link and progress.

Administrators can open **Resources** beside any lecture to add or replace its public video URL, class-notes PDF URL, and assignment PDF URL. The same fields are available while creating a lecture. Published PDFs appear as lesson-resource links in the student player; all links must use HTTP or HTTPS and Drive files must allow public viewer access.

Students can switch lessons by clicking any lecture in the course outline. The active row, module label, lesson number, video, and PDF resources update together. Lectures without a published video open an intentional resources-only state instead of failing.

Course progress is calculated per user and persisted in MongoDB. Students can mark or unmark the current lecture, while direct video links complete automatically when playback ends. The percentage, completed count, progress bar, and lesson checkmarks update together; Google Drive videos use the manual completion control because embedded Drive playback does not expose completion events.

## MongoDB setup

Copy `.env.example` to `.env` and add your Atlas connection string. The LMS uses isolated collections so it does not conflict with other data in the same database:

- `lms_courses` for course modules, lectures, links, and assignments
- `lms_users` for accounts and roles
- `lms_progress` for per-student completion
- `lms_sessions` for persistent login sessions

To import the included JSON seed data once, run:

```bash
npm run migrate:mongo
```

The migration imports the existing course, modules, lectures, users, admin roles, and progress. Do not rerun it after editing live course data unless you intentionally want the bundled seed snapshot to replace matching records.

## Run locally

```bash
npm install
npm run migrate:mongo
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:4000`.

## Use a Google Drive video

1. Upload the video to Google Drive.
2. Open **Share** and change **General access** to **Anyone with the link**.
3. Copy the link.
4. In Arcwell, choose **Change video**, paste the URL, and save.

Drive videos use Google's embedded preview player. Direct `.mp4` and `.webm` links use Arcwell's custom player.

## Production

```bash
npm run build
npm start
```

The Express server serves the built React app on `http://localhost:4000` in production. Set all variables from `.env.example` in your hosting provider; local `.env` files are not uploaded automatically by most providers.
