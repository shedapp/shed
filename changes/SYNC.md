# Switching sync on

1. Create a free project at supabase.com. In Project Settings → API copy the Project URL and the `anon` public key.
2. In the SQL editor run:

```sql
create table songs (id text primary key, user_id uuid not null default auth.uid(), data jsonb not null, updated bigint not null);
alter table songs enable row level security;
create policy "own songs" on songs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

3. Authentication → URL configuration: add the app's URL to the redirect list (the magic link returns there).
4. Put the two values in `src/sync.config.json` as `{"url": "...", "key": "..."}` and rebuild with `node src/build.js`.
