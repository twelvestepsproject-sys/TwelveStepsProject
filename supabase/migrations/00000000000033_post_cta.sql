-- An optional call-to-action button at the end of a post.
--
-- The client publishes the first chapter of each book as an article, and
-- wants a "buy the book" button under it. Post bodies render as plain text
-- (whitespace-pre-line, no HTML or Markdown), so a link cannot be written
-- into the body itself — it needs its own fields.
--
-- Both nullable: an ordinary blog post has no button, and the article page
-- renders one only when a URL is present. Two columns rather than one so
-- the label can differ per post — "לרכישת הספר" is not always right;
-- "להזמנה" or a specific retailer reads better sometimes.

alter table public.posts
  add column if not exists cta_label text,
  add column if not exists cta_url   text;

comment on column public.posts.cta_url is
  'Optional URL for a button under the article body. The button renders only when this is set.';
comment on column public.posts.cta_label is
  'Button text for cta_url. Falls back to a default label when empty.';
