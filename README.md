# WE ARE. — Signup Module

A self-contained, production-oriented signup system for WE ARE., built on
Supabase Auth + Postgres. It plugs into the existing WE ARE. site without
touching any other page, stylesheet, or script.

## 1. What this module does

- Renders a signup form (`signup.html`) matching the existing WE ARE.
  visual identity (same fonts, colors, and `.auth-shell` layout as
  `login.html`).
- Validates every field client-side (name, username format, email,
  password length, password confirmation, terms acceptance).
- Creates the account using **Supabase Auth** (`supabase.auth.signUp()`)
  — passwords are handled entirely by Supabase and are never seen by,
  or stored in, our own database.
- Automatically creates a matching row in `public.profiles` via a
  Postgres trigger, using the name/username passed at signup.
- Enforces Row Level Security so a user can only ever create, edit, or
  delete their *own* profile.
- Lays the groundwork for avatar uploads via a Supabase Storage bucket.

It does **not** implement login, feed, messaging, or any other feature —
only the signup/auth foundation those features will eventually sit on top
of.

## 2. File structure

```
signup.html                 the signup page
css/
  signup.css                 signup-page-only styles (does not touch css/styles.css)
js/
  supabase-config.js          your Supabase URL + anon key go here
  signup.js                   form validation + the actual signup call
sql/
  signup_schema.sql           profiles table, RLS policies, trigger, storage bucket
README.md                    this file
```

Nothing here overwrites `index.html`, `login.html`, `css/styles.css`,
`js/app.js`, or any page under `app/`. `signup.html` already existed in
the project, so its markup was extended in place (new fields added, its
old front-end-only demo script swapped for the real one) rather than
duplicated.

## 3. Create and configure a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
   (or use an existing one).
2. In **Authentication → Providers**, make sure **Email** sign-in is
   enabled.
3. Decide whether you want **email confirmations** on (Authentication →
   Settings). Both modes work with this code out of the box — see
   section 8 below.

## 4. Where to put the Supabase URL and key

Open `js/supabase-config.js` and fill in the two placeholders:

```js
export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'YOUR-SUPABASE-ANON-PUBLIC-KEY';
```

Both values come from **Project Settings → API** in your Supabase
dashboard:

- `SUPABASE_URL` — the **Project URL**.
- `SUPABASE_PUBLISHABLE_KEY` — the **anon / public** key (some newer
  Supabase dashboards label this "publishable key" — it's the same
  browser-safe key).

**Never** put the `service_role` / secret key here or in any other
frontend file — see the security section below.

## 5. Run `sql/signup_schema.sql`

In the Supabase dashboard, go to **SQL Editor → New query**, paste in
the contents of `sql/signup_schema.sql`, and run it. It's written to be
safely re-run (it uses `if not exists` / `drop policy if exists` /
`or replace` throughout), so re-running it after a small edit won't
duplicate anything.

This creates:

- `public.profiles` (id, full_name, username, bio, avatar_url,
  date_of_birth, created_at, updated_at), with a case-insensitive
  unique index on `username` and a format check
  (3–30 characters, letters/numbers/underscore only).
- Row Level Security policies: public read, and insert/update/delete
  restricted to the row's own owner (`auth.uid() = id`) — never
  `using (true)` for the write policies.
- A trigger (`on_auth_user_created`) that automatically inserts a
  `profiles` row whenever a new `auth.users` row is created, reading
  `full_name`/`username` out of `raw_user_meta_data`. It's
  `security definer` but is not exposed as a callable frontend
  function — only the trigger can invoke it.
- An `avatars` storage bucket with policies scoped to
  `avatars/{user_id}/...`, so users can only write inside their own
  folder, while avatar images remain publicly viewable.

## 6. How Supabase Auth works here

`js/signup.js` calls:

```js
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name, username } }
});
```

Supabase creates the row in the protected `auth.users` table (passwords
are hashed and stored by Supabase itself — this project never sees or
stores a plaintext or hashed password). The `full_name`/`username`
passed via `options.data` land in `auth.users.raw_user_meta_data`,
which the `handle_new_user()` trigger reads to populate
`public.profiles`. The frontend never inserts into `profiles` directly.

## 7. The connected flow

```
signup.html
     ↓
js/signup.js  (validate → supabase.auth.signUp())
     ↓
Supabase Auth  (auth.users row created, password hashed by Supabase)
     ↓
on_auth_user_created trigger  (sql/signup_schema.sql)
     ↓
public.profiles row created automatically
```

## 8. How email confirmation is handled

Supabase's `signUp()` response shape tells you which mode you're in:

- **Confirmations ON** (Supabase's default): `data.user` is returned
  but `data.session` is `null` until the user clicks the confirmation
  link in their email. `signup.js` detects this and shows "check your
  email" messaging, then redirects to `login.html?confirmEmail=1`.
- **Confirmations OFF**: `data.session` comes back immediately (the
  user is already signed in). `signup.js` shows a short success message
  and redirects to `login.html?welcome=1`.

Both query parameters are optional hooks — `login.html` doesn't need to
read them for signup to work, but if you'd like a "check your email"
or "welcome" banner on the login page later, those flags are already
there to key off of.

## 9. Connecting to the existing `login.html`

No changes to `login.html` were required. The signup page already links
to it (`Already on WE ARE.? Log in`), and `signup.js` redirects there on
success. When you build out real login logic, `login.html` will call
`supabase.auth.signInWithPassword()` against the same Supabase project
— it can reuse `js/supabase-config.js` as-is.

## 10. Security notes

- **Only the anon/publishable key ever goes in frontend code.** The
  `service_role` key bypasses Row Level Security entirely and must
  live only in a trusted server environment (a serverless function,
  your own backend, CI secrets) — never in this repository's
  client-facing files, never in a public Git history.
- **Passwords are never stored by this project.** Supabase Auth owns
  password storage and hashing; `public.profiles` has no password
  column.
- **RLS is enabled on `profiles` and on `storage.objects`** for the
  `avatars` bucket. Write policies check `auth.uid()` against the row
  owner — there is no `using (true)` on any insert/update/delete
  policy.
- **Frontend validation is a UX convenience, not the security
  boundary.** The real enforcement is the database constraints
  (`username_format`, `username_length`, the unique index) and the RLS
  policies, which apply no matter what the client sends.
- Rotate your anon key too if you ever suspect it (or, worse, a
  service_role key) has leaked — anon key rotation just means
  reconfiguring `supabase-config.js`; a leaked service_role key should
  be rotated immediately from the dashboard.

## 11. Deployment considerations

- This is a static site (no build step, no bundler) — `js/signup.js`
  is loaded as a native ES module (`<script type="module">`), and it
  imports the Supabase client straight from a CDN
  (`https://esm.sh/@supabase/supabase-js@2`). Any static host (Netlify,
  Vercel, GitHub Pages, S3 + CloudFront, etc.) works with no extra
  configuration.
- Because the config values live in a plain `.js` file rather than a
  server-side environment variable, treat `supabase-config.js` as
  public — that's fine, since it only ever contains the anon key.
- If you later add a backend/server component for anything that needs
  the `service_role` key (admin tooling, moderation, etc.), keep it in
  a completely separate, non-statically-served service.
- Consider turning on Supabase's rate limiting / CAPTCHA options for
  Auth in production to reduce signup abuse.
