# Drizzle + Postgres

## How services get the database

```ts
@Injectable()
export class LecturesService {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }
}
```

`DrizzleService.db` is `NodePgDatabase<typeof schema>`. Schema tables and relations
are registered once in `database/schema.ts` and `database/relations.ts`.
Feature modules **do not** create pools or import `postgres()`.

## Files

- `backend/src/database/entities/*.ts` — table definitions (camelCase columns)
- `backend/src/database/schema.ts` — barrel of tables
- `backend/src/database/relations.ts` — `relations()`
- `backend/src/database/drizzle.service.ts` — pool + `drizzle()`
- `backend/src/database/database.module.ts` — `@Global()`, exports the service
- `backend/drizzle/0000_init.sql` — tables, generated tsvector columns, GIN, triggers

## Full-text search

```sql
search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(tags,''))
) STORED
```

Query (same cutoff as old MySQL `> 0.25`):

```sql
WHERE search_vector @@ plainto_tsquery('simple', $query)
  AND ts_rank(search_vector, plainto_tsquery('simple', $query)) > 0.25
ORDER BY ts_rank(...) DESC
```

## Migrations

```bash
cd backend
npm run drizzle:generate
npm run drizzle:migrate
```

`synchronize` is off. Apply SQL in `drizzle/` against Postgres.

## Env

```
DATABASE_URL=postgres://user:pass@localhost:5432/pro_learning_hub
```

`DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` still work if `DATABASE_URL` is unset.
