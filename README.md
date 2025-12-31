# Classroom Backend API

Production-ready API for departments, subjects, classes, enrollments, and users with Better Auth.

## Contents

- Setup
- Auth and Roles
- Common Conventions
- Endpoints
- Seeding
- Video Flow Context

## Setup

### Requirements

- Node.js 18+
- Postgres (or Neon) connection string

### Environment

Create `.env`:

```
DATABASE_URL=postgres://user:password@host:port/db
BETTER_AUTH_SECRET=your_secret_here
FRONTEND_URL=http://localhost:3000
```

### Install and Run

```
npm install
npm run dev
```

### Base URL

```
http://localhost:8000
```

## Auth and Roles

### Better Auth

Mounted at `/api/auth/*`. Use cookie-based auth. Store cookies after sign-in and pass them on subsequent requests.

Important:

- Better Auth handler is mounted before `express.json()`.
- Use `-c` and `-b` in curl to persist cookies.

### Role Access

- admin: full access
- teacher: read all; write subjects/classes/enrollments
- student: read all; write enrollments only

Role matrix:

- `/api/users`: admin only
- `/api/departments`: admin write; all roles read
- `/api/subjects`: admin/teacher write; all roles read
- `/api/classes`: admin/teacher write; all roles read
- `/api/enrollments`: admin/teacher read/write; students create/join only

## Common Conventions

### Headers

Use JSON for request bodies:

```
Content-Type: application/json
```

### Pagination

List endpoints support:

- `page` (default: 1)
- `limit` (default: 10)

Response format:

```
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  }
}
```

### Errors

```
{ "error": "Message" }
```

### Authentication in curl

Sign in and store cookies:

```
curl -X POST http://localhost:8000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{ "email": "teacher1@classroom.test", "password": "Password123!" }' \
  -c cookie.txt
```

Use cookies on protected endpoints:

```
curl http://localhost:8000/api/subjects -b cookie.txt
```

## Endpoints

### Auth (Better Auth)

#### POST /api/auth/sign-up/email

Body:

```
{
  "email": "teacher1@classroom.test",
  "password": "Password123!",
  "name": "Teacher One",
  "role": "teacher",
  "imageCldPubId": "demo-image"
}
```

Example:

```
curl -X POST http://localhost:8000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher1@classroom.test",
    "password": "Password123!",
    "name": "Teacher One",
    "role": "teacher"
  }'
```

#### POST /api/auth/sign-in/email

Body:

```
{
  "email": "teacher1@classroom.test",
  "password": "Password123!"
}
```

Example:

```
curl -X POST http://localhost:8000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{ "email": "teacher1@classroom.test", "password": "Password123!" }' \
  -c cookie.txt
```

#### GET /api/auth/get-session

Example:

```
curl http://localhost:8000/api/auth/get-session -b cookie.txt
```

#### POST /api/auth/sign-out

Example:

```
curl -X POST http://localhost:8000/api/auth/sign-out -b cookie.txt
```

Other auth endpoints (if enabled in Better Auth):

- `/api/auth/list-sessions` (GET)
- `/api/auth/revoke-session` (POST)
- `/api/auth/revoke-sessions` (POST)
- `/api/auth/revoke-other-sessions` (POST)
- `/api/auth/account-info` (GET)
- `/api/auth/list-accounts` (GET)
- `/api/auth/refresh-token` (POST)
- `/api/auth/get-access-token` (POST)
- `/api/auth/send-verification-email` (POST)
- `/api/auth/verify-email` (GET)
- `/api/auth/request-password-reset` (POST)
- `/api/auth/reset-password/:token` (GET)
- `/api/auth/reset-password` (POST)
- `/api/auth/change-password` (POST)
- `/api/auth/change-email` (POST)
- `/api/auth/update-user` (POST)
- `/api/auth/delete-user` (POST)

### Users (Admin Only)

#### GET /api/users

Query:

- `role`: admin | teacher | student
- `search`: name search
- `page`, `limit`

Example:

```
curl "http://localhost:8000/api/users?role=teacher&page=1&limit=10" -b cookie.txt
```

#### GET /api/users/:id

Example:

```
curl http://localhost:8000/api/users/user_teacher_1 -b cookie.txt
```

#### POST /api/users

Body:

```
{
  "id": "user_teacher_3",
  "name": "Teacher Three",
  "email": "teacher3@classroom.test",
  "emailVerified": true,
  "role": "teacher"
}
```

Example:

```
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{ "id": "user_teacher_3", "name": "Teacher Three", "email": "teacher3@classroom.test", "role": "teacher" }' \
  -b cookie.txt
```

#### PUT /api/users/:id

Body:

```
{ "name": "Teacher One Updated" }
```

Example:

```
curl -X PUT http://localhost:8000/api/users/user_teacher_1 \
  -H "Content-Type: application/json" \
  -d '{ "name": "Teacher One Updated" }' \
  -b cookie.txt
```

#### DELETE /api/users/:id

Example:

```
curl -X DELETE http://localhost:8000/api/users/user_teacher_1 -b cookie.txt
```

### Departments

#### GET /api/departments

Query:

- `search`
- `page`, `limit`

Example:

```
curl "http://localhost:8000/api/departments?search=CS" -b cookie.txt
```

#### GET /api/departments/:id

Example:

```
curl http://localhost:8000/api/departments/1 -b cookie.txt
```

#### POST /api/departments (admin)

Body:

```
{
  "code": "BIO",
  "name": "Biology",
  "description": "Life sciences"
}
```

Example:

```
curl -X POST http://localhost:8000/api/departments \
  -H "Content-Type: application/json" \
  -d '{ "code": "BIO", "name": "Biology", "description": "Life sciences" }' \
  -b cookie.txt
```

#### PUT /api/departments/:id (admin)

Body:

```
{ "name": "Computer Science and Engineering" }
```

Example:

```
curl -X PUT http://localhost:8000/api/departments/1 \
  -H "Content-Type: application/json" \
  -d '{ "name": "Computer Science and Engineering" }' \
  -b cookie.txt
```

#### DELETE /api/departments/:id (admin)

Example:

```
curl -X DELETE http://localhost:8000/api/departments/1 -b cookie.txt
```

### Subjects

#### GET /api/subjects

Query:

- `search` (name/code)
- `department` (department name search)
- `page`, `limit`

Example:

```
curl "http://localhost:8000/api/subjects?search=CS&page=1&limit=10" -b cookie.txt
```

#### GET /api/subjects/:id

Example:

```
curl http://localhost:8000/api/subjects/1 -b cookie.txt
```

#### POST /api/subjects (admin/teacher)

Body:

```
{
  "departmentId": 1,
  "name": "Data Structures",
  "code": "CS210",
  "description": "Core data structures"
}
```

Example:

```
curl -X POST http://localhost:8000/api/subjects \
  -H "Content-Type: application/json" \
  -d '{ "departmentId": 1, "name": "Data Structures", "code": "CS210" }' \
  -b cookie.txt
```

#### PUT /api/subjects/:id (admin/teacher)

Body:

```
{ "name": "Intro to Programming Updated" }
```

Example:

```
curl -X PUT http://localhost:8000/api/subjects/1 \
  -H "Content-Type: application/json" \
  -d '{ "name": "Intro to Programming Updated" }' \
  -b cookie.txt
```

#### DELETE /api/subjects/:id (admin/teacher)

Example:

```
curl -X DELETE http://localhost:8000/api/subjects/1 -b cookie.txt
```

### Classes

#### GET /api/classes

Query:

- `search` (name/inviteCode)
- `subjectId`
- `teacherId`
- `status`: active | inactive | archived
- `page`, `limit`

Example:

```
curl "http://localhost:8000/api/classes?subjectId=1&page=1&limit=10" -b cookie.txt
```

#### GET /api/classes/invite/:code

Example:

```
curl http://localhost:8000/api/classes/invite/CS101A -b cookie.txt
```

#### GET /api/classes/:id

Example:

```
curl http://localhost:8000/api/classes/1 -b cookie.txt
```

#### POST /api/classes (admin/teacher)

Body:

```
{
  "name": "CS101 - Section C",
  "inviteCode": "CS101C",
  "subjectId": 1,
  "teacherId": "user_teacher_1",
  "description": "New section",
  "capacity": 30,
  "status": "active",
  "schedules": [
    { "day": "Tue", "startTime": "10:00", "endTime": "11:30" }
  ]
}
```

Example:

```
curl -X POST http://localhost:8000/api/classes \
  -H "Content-Type: application/json" \
  -d '{ "name": "CS101 - Section C", "inviteCode": "CS101C", "subjectId": 1, "teacherId": "user_teacher_1" }' \
  -b cookie.txt
```

#### PUT /api/classes/:id (admin/teacher)

Body:

```
{ "name": "CS101 - Section A Updated" }
```

Example:

```
curl -X PUT http://localhost:8000/api/classes/1 \
  -H "Content-Type: application/json" \
  -d '{ "name": "CS101 - Section A Updated" }' \
  -b cookie.txt
```

#### DELETE /api/classes/:id (admin/teacher)

Example:

```
curl -X DELETE http://localhost:8000/api/classes/1 -b cookie.txt
```

### Enrollments

#### GET /api/enrollments (admin/teacher)

Query:

- `classId`
- `studentId`
- `page`, `limit`

Example:

```
curl "http://localhost:8000/api/enrollments?classId=1" -b cookie.txt
```

#### GET /api/enrollments/:id (admin/teacher)

Example:

```
curl http://localhost:8000/api/enrollments/1 -b cookie.txt
```

#### POST /api/enrollments (admin/teacher/student)

Body:

```
{ "classId": 1 }
```

Note: `studentId` is taken from the authenticated user.

Example:

```
curl -X POST http://localhost:8000/api/enrollments \
  -H "Content-Type: application/json" \
  -d '{ "classId": 1 }' \
  -b cookie.txt
```

#### POST /api/enrollments/join (admin/teacher/student)

Body:

```
{ "inviteCode": "CS101A" }
```

Note: `studentId` is taken from the authenticated user.

Example:

```
curl -X POST http://localhost:8000/api/enrollments/join \
  -H "Content-Type: application/json" \
  -d '{ "inviteCode": "CS101A" }' \
  -b cookie.txt
```

#### PUT /api/enrollments/:id (admin/teacher)

Body:

```
{ "classId": 2 }
```

Example:

```
curl -X PUT http://localhost:8000/api/enrollments/1 \
  -H "Content-Type: application/json" \
  -d '{ "classId": 2 }' \
  -b cookie.txt
```

#### DELETE /api/enrollments/:id (admin/teacher)

Example:

```
curl -X DELETE http://localhost:8000/api/enrollments/1 -b cookie.txt
```

## Seeding

Seed demo data:

```
npm run seed
```

Data file:

```
src/seed/data.json
```
