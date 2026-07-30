
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  eyebrow text not null default 'CHAPTER',
  title text not null default 'New chapter',
  content text not null default '',
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.love_reasons (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text not null,
  caption text,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.chapters enable row level security;
alter table public.love_reasons enable row level security;
alter table public.gallery_items enable row level security;

drop policy if exists "public can read site_settings" on public.site_settings;
create policy "public can read site_settings" on public.site_settings for select using (true);

drop policy if exists "admins can write site_settings" on public.site_settings;
create policy "admins can write site_settings" on public.site_settings for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "public can read chapters" on public.chapters;
create policy "public can read chapters" on public.chapters for select using (visible=true or exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "admins can write chapters" on public.chapters;
create policy "admins can write chapters" on public.chapters for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "public can read reasons" on public.love_reasons;
create policy "public can read reasons" on public.love_reasons for select using (visible=true or exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "admins can write reasons" on public.love_reasons;
create policy "admins can write reasons" on public.love_reasons for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "public can read gallery" on public.gallery_items;
create policy "public can read gallery" on public.gallery_items for select using (visible=true or exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "admins can write gallery" on public.gallery_items;
create policy "admins can write gallery" on public.gallery_items for all to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "admins can read own admin row" on public.admins;
create policy "admins can read own admin row" on public.admins for select to authenticated using (user_id=auth.uid());

insert into public.site_settings(key,value) values
('heroTitle', '"Our Love Story ❤️"'),
('heroHeadline', '"Some people spend their whole life searching for someone who makes their heart feel at home."'),
('heroSubline', '"I found mine."'),
('finalTitle', '"In every lifetime, I would still choose you. ❤️"'),
('finalText', '"Thank you for being my favorite chapter of life."'),
('countdownTitle', '"Our next little forever"'),
('countdownAt', 'null'),
('musicTitle', '"A song for us"'),
('musicNote', '""'),
('musicUrl', '""')
on conflict(key) do nothing;

insert into public.chapters (eyebrow,title,content,sort_order) values
('THE DAY WE MET','Where it all began','Our story began in the most unexpected place — a stranger chat website. Neither of us knew that a random conversation would become one of the most meaningful parts of our lives.

From the very beginning, she was incredibly kind. We instantly clicked, and our conversations flowed so naturally that it felt like we had known each other forever. She patiently taught me how to communicate better, so I started calling her "Prof" because she was always teaching me something new. Since I had been studying medicine in the Philippines, she affectionately called me "Doc." It quickly became our little thing, and I loved it.

She asked for my Instagram, but I did not even have an account. So I created one just so we could stay connected. The moment I saw her profile picture, I was completely speechless. She was even more beautiful than I had imagined. That was the moment I quietly made a promise to myself — I wanted to win her heart.

Sometimes the most beautiful love stories begin with a simple hello from a stranger... and somehow that stranger becomes your favorite person. ❤️',0),
('OUR FIRST DATE','The day distance did not matter','Our first date did not happen at a fancy restaurant or a beautiful café. It happened through our phones, with miles between us but our hearts feeling closer than ever.

We laughed, talked for hours, and forgot about the distance. It was not about where we were. It was about who we were with.',1),
('THE FIRST “I LOVE YOU”','The words my heart already knew','I was the first one to say "I love you." It was only two days after we met.

It might sound crazy, but my feelings were real. Somewhere between our conversations and the moment I saw her, my heart had already chosen her.

She kept asking, "How can you love me when you do not even know me?" But love does not always follow rules. I had already fallen for her from the moment I saw her.

She told me she was hard to get — and she was right. I kept listening, staying, understanding, and giving my whole heart.

Then one day she finally said, "I love you... little little." That tiny sentence made me the happiest person in the world.

I would choose her again, every single time. ❤️',2),
('THE MOMENT I TRUSTED HER','When she stayed when life fell apart','When my degree in the Philippines became invalid in India, I had to leave a dream behind. Two years of my life suddenly felt wasted while my friends moved ahead.

I felt lost and lonely. I was scared that even she might leave because we were not going to meet when I had planned.

But she stayed.

She comforted me, listened to me, and gave me time to heal. She reminded me that I had not lost my future — I was simply taking a different path.

She believed in me when I struggled to believe in myself. That was the moment I realized I could trust her with my whole heart.

She became my safe place, my biggest supporter, and the light that guided me through one of the darkest chapters of my life. ❤️',3),
('OUR SON, CHOLO','The tiniest troublemaker in our family','Cholo is her baby, her son, and now our little son too.

I have never met him in person, but I already know so much about him. He scratches the floor, climbs onto her bed, scratches her skin, barks, sleeps like it is a full-time job, and somehow still manages to be adorable.

His funniest talent is stealing his mom’s socks and undergarments and running away like he just won the greatest treasure hunt ever. 😂

I cannot wait for the day I finally meet him. I already know he will probably inspect me, decide whether I am worthy of his mom, and then go right back to sleeping.

Until then, please give our little boy an extra hug from his dad. 🐾❤️',4),
('TODAY','The love we have now','Today, I can proudly say that I am loved by the most amazing girl I have ever known.

She listens to me, understands me, and stays beside me through every up and down. In my lowest moments she becomes my biggest source of strength.

Every day she becomes more beautiful in my eyes, and my love for her grows stronger. She calls me her husband, her baby, her patootie, and her sugar bunch. She shares everything with me, and I love being the person she trusts with her everyday life.

I am endlessly proud of the woman she is becoming. I am so lucky that I get to call her mine.

No matter what tomorrow brings, I will keep choosing her, loving her, and being grateful for her every single day. ❤️',5)
on conflict do nothing;

-- 100 reasons
insert into public.love_reasons(reason,sort_order) values
('Because your smile makes my day brighter.',0),
('Because your voice feels like home.',1),
('Because you believed in me when I could not believe in myself.',2),
('Because you stayed during my hardest days.',3),
('Because you always try to understand me.',4),
('Because you are kind to everyone.',5),
('Because you make me want to become a better man.',6),
('Because your laugh is my favorite sound.',7),
('Because you call me "Doc."',8),
('Because I love calling you "Prof."',9),
('Because you make distance feel smaller.',10),
('Because you never stop supporting me.',11),
('Because you are incredibly hardworking.',12),
('Because you inspire me every day.',13),
('Because you never let me feel alone.',14),
('Because you are beautiful inside and out.',15),
('Because your little habits are adorable.',16),
('Because your baby voice melts my heart.',17),
('Because your happiness becomes my happiness.',18),
('Because you care about the smallest things.',19),
('Because you are my safe place.',20),
('Because you trust me.',21),
('Because you share everything with me.',22),
('Because you are honest with me.',23),
('Because you are patient with me.',24),
('Because you make ordinary moments special.',25),
('Because your good morning texts make my day.',26),
('Because your goodnight texts help me sleep peacefully.',27),
('Because you always make me smile.',28),
('Because you make me laugh even when I am sad.',29),
('Because your eyes are beautiful.',30),
('Because you are my favorite notification.',31),
('Because you are the first person I want to tell everything to.',32),
('Because you make me feel loved.',33),
('Because you accept my flaws.',34),
('Because you encourage my dreams.',35),
('Because you are my biggest supporter.',36),
('Because you make every call feel too short.',37),
('Because I never get tired of talking to you.',38),
('Because you love Cholo so much.',39),
('Because seeing you with Cholo melts my heart.',40),
('Because you have the cutest expressions.',41),
('Because you tease me.',42),
('Because you make life more exciting.',43),
('Because you remember little details about me.',44),
('Because your heart is pure.',45),
('Because you are caring.',46),
('Because you are thoughtful.',47),
('Because you never gave up on us.',48),
('Because you always check if I am okay.',49),
('Because you celebrate my victories.',50),
('Because you comfort me after my failures.',51),
('Because you calm my overthinking.',52),
('Because you are stronger than you realize.',53),
('Because you are brave.',54),
('Because your dedication inspires me.',55),
('Because your kindness is endless.',56),
('Because you are gentle with my heart.',57),
('Because you forgive me.',58),
('Because you make every day worth living.',59),
('Because I can be myself around you.',60),
('Because your love feels genuine.',61),
('Because you always make time for me.',62),
('Because you make me feel important.',63),
('Because your happiness means everything to me.',64),
('Because you are my peace.',65),
('Because you are my comfort.',66),
('Because you are my best friend.',67),
('Because you are my favorite person.',68),
('Because your smile is contagious.',69),
('Because you are cute when you are sleepy.',70),
('Because you are adorable when you are angry.',71),
('Because you are cute even when you tease me.',72),
('Because I love hearing your stories.',73),
('Because every memory with you is precious.',74),
('Because you are worth every mile between us.',75),
('Because I love our late-night conversations.',76),
('Because I love dreaming about our future.',77),
('Because you are my greatest blessing.',78),
('Because your love changed me.',79),
('Because you make me believe in destiny.',80),
('Because you always motivate me.',81),
('Because you never stop caring.',82),
('Because you are the woman I admire most.',83),
('Because you make me feel lucky.',84),
('Because I admire your strength.',85),
('Because you are my favorite chapter of life.',86),
('Because every day I fall in love with you again.',87),
('Because you make forever sound beautiful.',88),
('Because I choose you every single day.',89),
('Because you are my home, no matter the distance.',90),
('Because you are my princess.',91),
('Because you are part of my future.',92),
('Because you are my forever.',93),
('Because loving you is the easiest thing I have ever done.',94),
('Because you make my life more beautiful.',95),
('Because you are the reason behind so many of my smiles.',96),
('Because I am proud of you.',97),
('Because I feel incredibly lucky to have you.',98),
('Because you are simply you — and that is more than enough for me. ❤️',99)
on conflict do nothing;

-- Public photo bucket
insert into storage.buckets(id,name,public) values ('site-media','site-media',true)
on conflict(id) do nothing;

drop policy if exists "public can view site media" on storage.objects;
create policy "public can view site media" on storage.objects for select using (bucket_id='site-media');

drop policy if exists "admins can upload site media" on storage.objects;
create policy "admins can upload site media" on storage.objects for insert to authenticated with check (bucket_id='site-media' and exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "admins can update site media" on storage.objects;
create policy "admins can update site media" on storage.objects for update to authenticated using (bucket_id='site-media' and exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (bucket_id='site-media' and exists(select 1 from public.admins a where a.user_id=auth.uid()));

drop policy if exists "admins can delete site media" on storage.objects;
create policy "admins can delete site media" on storage.objects for delete to authenticated using (bucket_id='site-media' and exists(select 1 from public.admins a where a.user_id=auth.uid()));

-- Enable realtime for the tables used by the public website.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='site_settings') then
    execute 'alter publication supabase_realtime add table public.site_settings';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chapters') then
    execute 'alter publication supabase_realtime add table public.chapters';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='love_reasons') then
    execute 'alter publication supabase_realtime add table public.love_reasons';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='gallery_items') then
    execute 'alter publication supabase_realtime add table public.gallery_items';
  end if;
end $$;


-- Dedicated public audio bucket for the current song.
insert into storage.buckets(id,name,public) values ('site-music','site-music',true)
on conflict(id) do nothing;

drop policy if exists "public can view site music" on storage.objects;
create policy "public can view site music"
on storage.objects
for select
using (bucket_id='site-music');

drop policy if exists "admins can upload site music" on storage.objects;
create policy "admins can upload site music"
on storage.objects
for insert to authenticated
with check (
  bucket_id='site-music'
  and exists(select 1 from public.admins a where a.user_id=auth.uid())
);

drop policy if exists "admins can update site music" on storage.objects;
create policy "admins can update site music"
on storage.objects
for update to authenticated
using (
  bucket_id='site-music'
  and exists(select 1 from public.admins a where a.user_id=auth.uid())
)
with check (
  bucket_id='site-music'
  and exists(select 1 from public.admins a where a.user_id=auth.uid())
);

drop policy if exists "admins can delete site music" on storage.objects;
create policy "admins can delete site music"
on storage.objects
for delete to authenticated
using (
  bucket_id='site-music'
  and exists(select 1 from public.admins a where a.user_id=auth.uid())
);

insert into public.site_settings(key,value) values
('musicName','""'),
('musicStoragePath','""')
on conflict(key) do nothing;

-- Viewer comments: public users may submit, only authenticated admins may read/delete.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Anonymous',
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
drop policy if exists "public can submit comments" on public.comments;
create policy "public can submit comments" on public.comments for insert to anon, authenticated with check (char_length(message) between 1 and 1000 and char_length(name) between 1 and 60);
drop policy if exists "admins can read comments" on public.comments;
create policy "admins can read comments" on public.comments for select to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid()));
drop policy if exists "admins can delete comments" on public.comments;
create policy "admins can delete comments" on public.comments for delete to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid()));
insert into public.site_settings(key,value) values ('commentTitle','"Your thoughts"'),('gameTitle','"Catch My Heart ❤️"'),('gameIntro','"You have 20 seconds. Catch as many hearts as you can."') on conflict(key) do nothing;

insert into public.site_settings(key,value) values
('reasonsEyebrow','"100 REASONS"'),
('reasonsTitle','"100 Reasons I Love You"'),
('reasonsIntro','"Tap a number to open it. Long messages can be scrolled inside the envelope. 💌"')
on conflict(key) do nothing;
