# Module map

## Nest feature modules

| Module | HTTP | Persistence | Notes |
| --- | --- | --- | --- |
| `DatabaseModule` | none | Drizzle pool | Global. Exports `DrizzleService` |
| `AuthModule` | `/auth/*` | `users`, enrollments, admins | Sets/clears cookie. Public except logout |
| `UsersModule` | none | `users` | `getUserPublicData` for nested `user` objects |
| `CoursesModule` | none | `courses`, enrollments, admins | `isUserEnrolledInCourse`, `isCourseAdmin` |
| `LecturesModule` | courses/lectures, search, media | `sections`, `lectures`, `lectureResources` | Admin writes; FTS; YT proxy |
| `AnnouncementsModule` | announcements + diff | `announcements` | Admin writes; body field `details` |
| `CommentsModule` | comments | `comments` | Count via DB trigger |
| `QuestionsModule` | general + lecture discussion, votes, search, diff | `questions` | FTS; votes via `VotesModule` |
| `RepliesModule` | replies, votes, diff | `replies` | Count via DB trigger; votes via `VotesModule` |
| `VotesModule` | none | `votes` | Idempotent upvote/downvote; partial unique indexes |
| `EventsModule` | Socket.IO | none | Gateway only; feature services emit |

`AppModule` only imports these. Leaf modules do not import each other in a cycle:
questions/replies/announcements/comments import `UsersModule` + `CoursesModule` + `EventsModule`.
Questions and replies also import `VotesModule`.

## Client features

| Folder | API slice | Query keys / tags | Sync |
| --- | --- | --- | --- |
| `features/auth` | `http()` login/register | none (cookie + `auth.user`) | n/a |
| `features/lectures` | RTK `lecturesApi` | `Sections`, `Lecture` | `lastFetched`, lectures/diff, sockets |
| `features/announcements` | RTK `announcementsApi` | `Announcements` | `lastFetched`, announcements/diff, sockets |
| `features/discussion` | RTK `discussionApi` | `Discussion`, `Replies` | `lastFetched`, questions/replies diff, sockets |

## Identity

Authenticated handlers read `@CurrentUser()` → `{ userId, courseId, role }`.
Course id in the JWT is the instance this frontend is bound to (`VITE_COURSE_ID`).
Do not accept `userId` from the body on authenticated routes.
