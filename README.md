# Team Task Manager

A full-stack team task management web application built with Node.js, Express, MongoDB Atlas, and Vanilla JavaScript. Supports role-based access (Admin / Member), project management, kanban-style task tracking, and real-time dashboard statistics.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Seeded Test Accounts](#seeded-test-accounts)
- [API Reference](#api-reference)
  - [Auth](#auth)
  - [Projects](#projects)
  - [Tasks](#tasks)
- [Role Permissions](#role-permissions)
- [Screenshots](#screenshots)
- [License](#license)

---

## Features

- **Authentication** — JWT-based sign up and login with bcrypt password hashing
- **Role-based access** — ADMIN and MEMBER roles with different permissions
- **Projects** — Create projects, assign members, view all details in one page
- **Kanban board** — Tasks organized into TODO / IN_PROGRESS / DONE columns
- **Task management** — Create tasks, assign due dates, assign to members, update status
- **Dashboard stats** — Total, To Do, In Progress, Done, and Overdue task counts
- **Overdue detection** — Tasks past their due date and not done are flagged automatically
- **Admin controls** — Delete tasks and projects (cascades tasks on project delete)
- **No frameworks** — Pure Vanilla JS frontend, no React, Vue, or any SPA framework

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Runtime    | Node.js                                 |
| Framework  | Express.js                              |
| Database   | MongoDB Atlas (official `mongodb` driver — no Mongoose, no ORM) |
| Auth       | JSON Web Tokens (`jsonwebtoken`) + `bcryptjs` |
| Frontend   | Vanilla HTML + CSS + JavaScript         |
| Dev tool   | Nodemon                                 |

---

## Project Structure

```
task-manager/
├── src/
│   ├── index.js                  # Express entry point
│   ├── db.js                     # MongoDB connection (MongoClient)
│   ├── middleware/
│   │   └── auth.js               # JWT verify middleware + isAdmin guard
│   └── routes/
│       ├── auth.js               # /api/auth — signup, login, users list
│       ├── projects.js           # /api/projects — CRUD
│       └── tasks.js              # /api/tasks — CRUD + dashboard + overdue
├── public/
│   ├── index.html                # Login / Sign up page
│   ├── dashboard.html            # Dashboard (stats + projects + overdue table)
│   ├── project.html              # Project detail (kanban board)
│   ├── css/
│   │   └── style.css             # All styles — no external fonts or libraries
│   └── js/
│       ├── auth.js               # Login / signup logic
│       ├── dashboard.js          # Dashboard page logic
│       └── project.js            # Kanban page logic
├── seed.js                       # Clears DB and inserts demo data
├── .env.example                  # Environment variable template
├── .gitignore
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account with a cluster created
- Git

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/task-manager.git
cd task-manager

# 2. Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root by copying the example:

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
DATABASE_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority&appName=<appName>
DB_NAME=taskmanager
JWT_SECRET=your_long_random_secret_here
PORT=3000
```

| Variable       | Description                                                   |
|----------------|---------------------------------------------------------------|
| `DATABASE_URL` | Full MongoDB Atlas connection string                          |
| `DB_NAME`      | Name of the database to use inside your Atlas cluster         |
| `JWT_SECRET`   | Any long random string — used to sign and verify JWT tokens   |
| `PORT`         | Port the Express server listens on (default: 3000)            |

> **MongoDB Atlas tip:** Go to **Network Access** in your Atlas dashboard and add your IP address (or `0.0.0.0/0` to allow all IPs during development).

### Database Setup

Run the seed script once to create the collections and insert demo data:

```bash
npm run seed
```

Output:

```
Seed complete.
  ADMIN:  admin@test.com / admin123
  MEMBER: member@test.com / member123
```

> Re-running `npm run seed` at any time will **wipe all data** and start fresh.

### Running the App

**Development** (auto-restarts on file changes):

```bash
npm run dev
```

**Production:**

```bash
npm start
```

Then open your browser and visit:

```
http://localhost:3000
```

---

## Seeded Test Accounts

| Role   | Email           | Password  |
|--------|-----------------|-----------|
| ADMIN  | admin@test.com  | admin123  |
| MEMBER | member@test.com | member123 |

The seed also creates:
- 1 project — **Website Redesign** (both users as members)
- 3 tasks:
  - "Set up repository" — **DONE**
  - "Design landing page" — **IN_PROGRESS** (overdue)
  - "Write copy for hero section" — **TODO** (future due date)

---

## API Reference

All protected routes require the header:

```
Authorization: Bearer <token>
```

All error responses follow the shape:
```json
{ "error": "message" }
```

---

### Auth

#### `POST /api/auth/signup`
Create a new account.

**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123",
  "role": "MEMBER"
}
```
`role` accepts `ADMIN` or `MEMBER` (defaults to `MEMBER`).

**Response `201`:**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "MEMBER" }
}
```

---

#### `POST /api/auth/login`
Log in with existing credentials.

**Body:**
```json
{ "email": "jane@example.com", "password": "secret123" }
```

**Response `200`:**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "role": "MEMBER" }
}
```

---

#### `GET /api/auth/users` _(ADMIN only)_
Returns all users (passwords excluded). Used to populate member pickers.

---

### Projects

#### `GET /api/projects`
- **ADMIN** — returns all projects
- **MEMBER** — returns only projects where they are a member

#### `POST /api/projects` _(ADMIN only)_
**Body:**
```json
{ "name": "New Project", "memberIds": ["<userId>", "<userId>"] }
```

#### `GET /api/projects/:id`
Returns the project document with `tasks[]` and `members[]` populated. Members can only access projects they belong to.

#### `DELETE /api/projects/:id` _(ADMIN only)_
Deletes the project and all of its tasks.

---

### Tasks

#### `POST /api/tasks`
Create a task inside a project.

**Body:**
```json
{
  "title": "Write tests",
  "description": "Optional description",
  "dueDate": "2026-06-01",
  "projectId": "<projectId>",
  "assignedToId": "<userId>"
}
```

#### `PATCH /api/tasks/:id/status`
Update the status of a task.

**Body:**
```json
{ "status": "IN_PROGRESS" }
```
Accepted values: `TODO`, `IN_PROGRESS`, `DONE`

#### `DELETE /api/tasks/:id` _(ADMIN only)_

#### `GET /api/tasks/overdue`
Returns all tasks where `dueDate < now` and `status != DONE`.
Members see only tasks from their projects.

#### `GET /api/tasks/dashboard`
Returns aggregate counts for the current user's scope.

**Response:**
```json
{ "total": 10, "todo": 4, "inProgress": 3, "done": 2, "overdue": 1 }
```

---

## Role Permissions

| Action                     | ADMIN | MEMBER              |
|----------------------------|-------|---------------------|
| View own projects          | ✅    | ✅                  |
| View all projects          | ✅    | ❌                  |
| Create project             | ✅    | ❌                  |
| Delete project             | ✅    | ❌                  |
| Create task                | ✅    | ✅ (own projects)   |
| Update task status         | ✅    | ✅ (own projects)   |
| Delete task                | ✅    | ❌                  |
| View dashboard stats       | ✅    | ✅ (scoped to self) |
| View overdue tasks         | ✅    | ✅ (scoped to self) |
| List all users             | ✅    | ❌                  |

---

## License

MIT
