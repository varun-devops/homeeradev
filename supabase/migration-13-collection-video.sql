-- Migration 13 — looping video on collection and sub-collection cards.
--
-- Each card could only ever show a still. A short silent clip playing behind
-- the title gives the deck the movement it was designed around, and the
-- image stays required as the poster frame: it is what shows before the
-- clip has buffered, on a slow connection, and for anyone who has asked for
-- reduced motion.
--
-- Safe to re-run.

alter table public.collections
  add column if not exists video_url text;

alter table public.sub_collections
  add column if not exists video_url text;

comment on column public.collections.video_url is
  'Optional looping background clip. image_url remains the poster frame.';
comment on column public.sub_collections.video_url is
  'Optional looping background clip. image_url remains the poster frame.';
