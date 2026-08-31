-- Podcast episodes could only ever be a Spotify link: the block rendered a
-- heading, the latest episode's title and description, and a button out to
-- the platform. The client asked to be able to show a YouTube video in that
-- spot instead.
--
-- Added alongside `spotify_url` rather than replacing it, so it is a choice
-- per episode instead of a site-wide switch: an episode with a video plays
-- inline, one without keeps the existing link-out button, and an episode
-- can carry both. Nullable with no default, so every existing row keeps
-- behaving exactly as it does today.

alter table public.podcast_episodes
  add column if not exists video_url text;

comment on column public.podcast_episodes.video_url is
  'Optional YouTube URL. When set, the podcast block embeds the video instead of only linking out to Spotify.';
