-- Adds the `certificates` and `syllabus_download` block types
-- (§5 blocks 31-32).
--
-- `certificates`: heading + intro + a row of certificate images (the
-- accreditation certificates shown on the psychotherapy pages). Distinct
-- from `photo_gallery`, which renders a `galleries` row and is a lightbox
-- gallery rather than a small, captioned credential display.
--
-- `syllabus_download`: a download button pointing at a syllabus file.
-- The href is free text rather than a media reference on purpose: the
-- media pipeline currently accepts images only (see ALLOWED_MIME in
-- app/api/admin/media-upload/route.ts, which also requires readable image
-- dimensions), so a PDF cannot be uploaded through it today. A plain URL
-- lets an editor point at Google Drive / Dropbox now, and keeps working
-- unchanged if PDF upload is added later.
--
-- Both store their values in `page_blocks.data`, validated on write by
-- their zod schemas in lib/schemas/blocks.ts — the jsonb column needs no
-- change, only the enum gains members.

alter type public.block_type add value if not exists 'certificates';
alter type public.block_type add value if not exists 'syllabus_download';
