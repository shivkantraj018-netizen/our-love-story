
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


## New romantic features in v3

- Handwritten-style Love Letter section with an admin-editable section name and letter.
- 100 Reasons are now individual animated envelopes. Tap an envelope to reveal the reason.
- "A Gift For You" animated gift box with editable poetry/message and an optional photo upload using Supabase Storage.
- "A Little Secret" heart button that reveals an editable secret message and creates a heart burst.
- The photo gallery now includes a larger auto-rotating spotlight memory.
- Clicking the final heart sends a heart/confetti burst.

No additional SQL is required for these settings because they use the existing `site_settings` table and existing `site-media` bucket. The new fields are created automatically when you save them from the admin panel.

## v4 upgrades
- Portrait-first public layout on phones and desktop; photos use contain-style display to avoid cropping.
- Gallery spotlight only appears when a photo is tapped, preventing the same photo from appearing twice by default.
- 100 Reasons are numbered envelopes with a flap/open animation; mobile uses a single column for readability.
- Viewer comments: public visitors can submit messages; only the authenticated admin can read/delete them.
- Editable comment-section title and romantic mini-game title/intro.
- Added a 20-second Catch My Heart game.

\n## v5 polish\n- 100 Reasons are numbered; no "Open me" label. Tapping a reason opens a larger envelope with a scrollable message area for long text.\n- Admin can edit the reasons eyebrow, title, and intro text.\n- Background music has a floating viewer mute/unmute control and starts after the first page interaction when the browser permits playback.\n- Photo cards are larger and show the whole image; tapping a photo opens a full-screen viewer.\n
## v6 navigation
Added a floating, scrollable section navigation bar so visitors can jump directly to Story, Photos, Letter, Reasons, Gift, Secret, Game, Notes, Song, or Ending. The active section is highlighted automatically while scrolling.

## v7 bug fix
Fixed duplicate HTML IDs introduced by the section navigation. This restores public rendering of the 100 Reasons and other sections while keeping the navigation bar.

## v8 public render fix
Fixed the missing music control element that was stopping public JavaScript from running, and restored the section navigation markup. No Supabase data or SQL changes are required.


## Master edit v10
Admin countdown display now preserves local date/time, a quick admin navigation bar and All Website Text editor were added, and the public site gained a richer hero, Love Letter interaction with generated paper-rustle sound, and heart/sparkle tap effects. New text settings are upserted from the admin panel, so no new SQL is required.


## v11 romantic envelope update
100 Reasons now use a sealed-envelope front with the number, flap animation, rising paper, scrollable handwritten message, and paper-rustle sound. The Love Letter uses a matching envelope/seal interaction. The existing Supabase data and admin editing remain unchanged.


## v14 quick fix
Locked photos are blurred more heavily, the wrong-password flow now shows a cute popup on each failed try with a cooldown after 3 tries, and the Love Letter text is darker for readability.


## v15
Added heart-shower tap animations across the public site, disabled text copying on the public page, made the photo lock use three customizable wrong-password messages with cooldown, added a customizable romantic hero note, and improved Love Letter contrast.


## v16
Added a theme engine with preset toggles, fireflies, a journey ribbon progress tracker, and fixed the gallery wrong-password messages so the first, second, and third attempts can each show a different customizable message.


## v17
Adds cinematic hero styling, shooting stars, Magic & Themes controls, and fixes the gallery password message rotation.


## v19
Fixes the three-message gallery lock rotation, applies themes directly to the page background, lowers animation load to reduce phone heat, and adds the toggleable Memory Sky ending effect.


## v21
Adds a separate playlist section, visible theme overlays, a real memory sky layer, and fixes the password message rotation with an explicit fail counter.
