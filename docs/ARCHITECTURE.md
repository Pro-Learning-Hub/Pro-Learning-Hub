# ProLearningHub Architecture

This document describes the NestJS + React rewrite on `copilot/rebuild-with-nest-react-tailwind`.
The backend maps **1:1** to the original Express app in `Back-End/`. The frontend keeps
RTK Query and the timestamp / diff-sync / socket contract so bandwidth and offline
behavior stay the same. React Query can replace RTK later without changing APIs.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| API | NestJS 10, global prefix `api/v1` | Feature modules, guards, filters |
| Persistence | Drizzle ORM + Postgres | Typed schema, no extra repository layer |
| Auth | HttpOnly cookie JWT (`access_token`) | Session on the request, not `localStorage` |
| Realtime | Socket.IO rooms from the old app | Same event names and payloads |
| UI | React 19 + Vite + Tailwind v4 + shadcn (Radix) | Existing UI primitives |
| Client data | RTK Query + Zod parse | Keep lastFetched / lastSynced / sockets |

Legacy trees (`Back-End/`, `front-end/`, `DjangoServer/`) are reference only.

## Backend layout

```
backend/src/
  main.ts                         # prefix, cookies, ValidationPipe, filters
  app.module.ts                   # composition root only
  database/
    database.module.ts            # exports DrizzleService
    drizzle.service.ts            # db instance
    schema.ts                     # re-exports tables
    relations.ts                  # drizzle relations
    entities/*.ts                 # one table per file
  common/
    types/service-result.ts       # ServiceResult — services never throw HTTP
    http/map-service-result.ts    # controller mapping
    decorators/{public,roles,current-user}
    guards/{jwt-auth,roles}
    filters/{http-exception,drizzle-exception}
  auth/ lectures/ announcements/ comments/ questions/ replies/ users/ courses/ gateway/
```

One HTTP surface = one folder: `*.module.ts` (wiring), `*.controller.ts` (HTTP),
`*.service.ts` (domain + Drizzle), `dto/`. No extra repository files.

## Patterns (non-negotiable)

1. **Services never speak HTTP.** They return `ServiceResult<T>`. Controllers map
   `not_found → 404`, `validation_error → 400`, `conflict → 409`, `unauthorized → 401`,
   `forbidden → 403`. Empty lists are success.
2. **Auth is global.** `JwtAuthGuard` is `APP_GUARD`. Public routes use `@Public()`.
   Roles use `@Roles('admin')`. Identity comes from `@CurrentUser()`, never from body.
3. **One error JSON.** `{ statusCode, timestamp, path, message }`. Postgres unique
   (`23505`) → 409; check/not-null/FK (`23502`, `23503`, `23514`) → 400.
4. **Drizzle only through `DrizzleService`.** Feature services inject it. Schema and
   relations live under `database/`.
5. **Global prefix once.** Controllers do not repeat `api/v1`.
6. **Deletes** return `{ message }` for lectures, questions, and replies.
   Announcements return `{ success: true, message }`.
7. **Timestamps.** `lastFetched` / `lastSynced` stay `YYYY-MM-DD HH:mm:ss.sss` UTC
   so the client incremental sync is unchanged.

## Auth cookies

- Cookie name: `access_token`
- `HttpOnly`, `SameSite=Lax`, `Secure` in production, path `/`
- Login / register set the cookie **and** still return `accessToken` in JSON so the
  existing RTK/socket code keeps working during the cutover
- Logout clears the cookie
- JWT payload: `{ userId, courseId, role }` (same as Express)

## Postgres vs old MySQL

Column names stay **camelCase** to match the original tables and JSON.

| MySQL | Postgres |
| --- | --- |
| `FULLTEXT ... ngram` | `tsvector` generated columns + GIN |
| `DATETIME` | `timestamptz` |
| `INSERT IGNORE` | `ON CONFLICT DO NOTHING` |
| Triggers for counts / empty sections | Same triggers in SQL |

Full-text: `plainto_tsquery('simple', query)` against `searchVector`, relevance
threshold `0.25` (same cutoff as MySQL `NATURAL LANGUAGE MODE`).

## HTTP surface (1:1 with Express)

Prefix: `/api/v1`

### Auth (`/auth`) — public except logout

- `POST /login`, `/register`, `/oauth/google`, `/oauth/googleRegister`
- `POST /admin/login`, `/admin/oauth/google`
- `POST /logout` (auth)
- `GET /imagekit` (public)

### Lectures

- `GET /courses/:id/lectures?lastFetched`
- `GET /courses/:courseId/lectures/:lectureId?updatedAt` (304 when unchanged)
- `GET /courses/:id/sections_titles`
- `POST /courses/:id/lectures` (admin; body: name, description, tags[], section, youtubeLink, notesLink, slidesLink, demos, extras)
- `PUT /lectures/:id` (admin)
- `DELETE /lectures/:id` (admin)
- `POST /courses/:id/lectures/diff` `{ entries, lastSynced }`
- `GET /lectures/search?courseId&query`
- `GET /lectures/media?url&type`, `GET /lectures/transcript?url&format` (proxy to YT service)

### Announcements / comments

- `GET|POST /courses/:id/announcements` (create body: `{ title, details }`)
- `PUT|DELETE /announcements/:id`
- `POST /courses/:id/announcements/diff`
- `GET|POST /announcements/:id/comments`
- `PUT /comments/:id`, `DELETE /comments/:commentId`

### Questions / replies

- `GET|POST /courses/:id/general_discussion`
- `GET|POST /lectures/:id/discussion`
- `POST /questions/:id/vote` `{ action: 'upvote' | 'downvote' }`
- `PUT|DELETE /questions/:id`
- `POST /questions/diff`
- `GET /questions/search?courseId|lectureId&query`
- `GET|POST /questions/:id/replies`
- `POST /replies/:id/vote`
- `PUT|DELETE /replies/:id`
- `POST /questions/:questionId/replies/diff`

## Socket.IO (unchanged)

Handshake: `auth.token` (JWT). On connect, join `user-${userId}`.
Client emits `joinRoom` / `leaveRoom`.

Events (payloads match Express):

- announcements: `announcementCreated|Updated|Deleted`, `commentCreated|Edited|Deleted`
- lectures: `lectureCreated`, `sectionCreated`, `lectureUpdated`, `lectureDeleted`
- discussion: `generalDiscussionQuestionCreated|Edited|Deleted`, `lectureQuestionCreated|Edited|Deleted`, `questionUpvoteToggled`, `questionEdited`, `questionDeleted`
- replies: `replyCreated`, `replyUpdated`, `replyDeleted`, `replyUpvoteToggled`

Rooms: `announcements-${courseId}`, `comments-${announcementId}`, `sections-${courseId}`,
`lecture-${id}`, `generalDiscussion-${courseId}`, `lectureDiscussion-${lectureId}`,
`question-${questionId}`, `user-${userId}`.

## Frontend layout

```
frontend/src/
  lib/{http.ts, api.ts, socket.ts, utils.ts, schemas.ts}  # http() + Zod; RTK wraps http
  store/                                       # auth (user only), ui, sync, RTK api
  features/<name>/{pages,components,*ApiSlice}
  components/ui                                # shadcn only
```

- Pages stay thin. Data lives in RTK slices. Forms use `useForm` + `zodResolver` + shadcn `Form`.
- `http()` always `credentials: 'include'`. 401 clears session. 204 → `undefined`.
- Access token is **not** stored in `localStorage`. Socket gets the token from the
  login JSON once, then cookies carry HTTP.

## What stays for a later pass

- React Query instead of RTK Query
- Dropping `accessToken` from JSON once sockets read the cookie
- Next.js App Router (this UI is Vite + React Router)
