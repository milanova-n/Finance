# Database migrations (Drizzle)

Schema is defined in TypeScript at `src/db/schema.ts`. Versioned SQL and Drizzle
metadata live in **`server/drizzle/`** (not in this folder). Apply migrations with the
npm scripts in `server/package.json`.

## Everyday workflow

1. Edit `src/db/schema.ts`.
2. Generate SQL from the diff:

   ```bash
   cd server
   npm run db:generate
   ```

3. Review the new file under `drizzle/` (e.g. `0001_add_something.sql`).
4. Apply to your database:

   ```bash
   npm run db:migrate
   ```

5. Commit `drizzle/*.sql` and `drizzle/meta/` together with your schema changes.

Requires `DATABASE_URL` in `.env` (see `.env.example`).

## Named migrations

By default, Drizzle Kit may pick a random suffix. Prefer explicit snake_case names:

```bash
npx drizzle-kit generate --name add_subscription_indexes
```

That produces `0001_add_subscription_indexes.sql` and updates `drizzle/meta/`.

Use short, verb-led names: `initial_schema`, `add_user_email_index`,
`drop_legacy_column`.

## What’s in `drizzle/meta/`

| File | Purpose |
|------|---------|
| `_journal.json` | Order and tags of migration files — do not delete |
| `0000_snapshot.json`, `0001_…` | Schema snapshot after each migration — used for the next diff |

These files belong in git with the matching `.sql` files.

## Other commands

```bash
npm run db:studio   # browse the database (Drizzle Studio)
```

`db:migrate` runs `scripts/migrate.mjs`, which applies any migration not yet recorded in
`drizzle.__drizzle_migrations` on your Postgres instance.