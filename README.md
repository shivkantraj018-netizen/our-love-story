
# Our Love Story — Vercel + Supabase

This is a no-code-after-setup romantic website with:

- Lovable-style purple/starry visual
- Public read-only site
- Private owner admin login
- Save buttons with visible saved status
- Add/edit/delete/reorder chapters
- Add/edit/delete 100 reasons
- Supabase Storage photo uploads
- Password change via Supabase Auth
- Realtime public updates

## 1) Set up Supabase

You already have the Supabase project connected.

Open your Supabase dashboard → SQL Editor → paste all of `schema.sql` → Run.

Then create your owner account:
1. Supabase → Authentication → Users
2. Add a user with the email/password you want for the private admin.
3. Copy the user's UUID.
4. Run:

```sql
insert into public.admins(user_id)
values ('PASTE-YOUR-USER-UUID-HERE');
```

That makes that login the owner/admin.

## 2) Test locally

You can open `index.html` directly for a quick visual check, but the most reliable local test is a simple static server.

In the project folder, with Python installed:

```bash
python -m http.server 8000
```

Then open:

- Public site: http://localhost:8000/
- Admin: http://localhost:8000/admin.html

## 3) Deploy to Vercel

Create a GitHub repository and upload all files in this folder, or deploy the folder directly with Vercel.

Your public website will be the root URL.
Your private admin page is:

`/admin.html`

## 4) Important

The Supabase anon/publishable key is intentionally used in the browser. Security comes from Supabase Auth + RLS.

NEVER put a service-role/secret key in this project.

## 5) What to customize

The first content is already seeded from your story:
- The day we met
- Our first date
- The first "I love you"
- The moment I trusted her
- Our son, Cholo
- Today
- 100 reasons

There is no Chapter 7.

You can add as many chapters as you want from the admin dashboard.


## Music upload

The admin dashboard now has **Upload / Replace Song**. Choose any browser-supported audio file (MP3, M4A, WAV, AAC, OGG, etc.). The file is stored in the `site-music` Supabase Storage bucket. Uploading another song removes the previous one automatically. You can also delete the current song.
