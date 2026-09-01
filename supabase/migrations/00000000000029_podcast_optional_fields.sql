-- An episode can now be a YouTube video on its own.
--
-- `spotify_url`, `description` and `duration` were all NOT NULL, which made
-- sense when a Spotify link was the only thing an episode could be. Since
-- migration 28 added `video_url`, an editor publishing a video has no
-- Spotify link to paste, may not want a description, and has no duration to
-- hand — but the form demanded all three.
--
-- Nothing in the public block depends on them: the platform button reads
-- `platform_cta` from the BLOCK's own settings, not from the episode, so an
-- episode without a Spotify link still renders correctly.
--
-- Existing rows keep their values; this only stops requiring new ones.

alter table public.podcast_episodes
  alter column spotify_url drop not null,
  alter column description drop not null,
  alter column duration    drop not null;

comment on column public.podcast_episodes.spotify_url is
  'Optional. An episode may be published as a YouTube video instead — see video_url.';
comment on column public.podcast_episodes.duration is
  'Optional length in seconds. Never formatted in the database.';
