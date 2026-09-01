-- Seeds an editable privacy policy page.
--
-- `/privacy` used to be a hardcoded route rendering a "not published yet"
-- notice, with no way to put real text into it. That route is gone and the
-- slug is now served by /[slug] like any other page — but nothing would
-- exist at it until someone created the page by hand, and the link appears
-- in the footer, the cookie banner and the registration modal. Three 404s
-- on a site that asks for personal details is worse than a placeholder.
--
-- So the page is created here with a skeleton the editor fills in. The body
-- text is deliberately NOT a privacy policy: it is a structure with the
-- legal wording marked as missing. Inventing one on a mental-health site's
-- behalf is exactly what the original placeholder refused to do, and that
-- reasoning still holds — what changes is that there is now somewhere to
-- put the real text.
--
-- Idempotent, and safe on a database where an editor has already written
-- the real policy: the insert is skipped entirely if the slug exists.

do $$
declare
  v_page_id uuid;
begin
  if exists (select 1 from public.pages where slug = 'privacy') then
    return;
  end if;

  v_page_id := gen_random_uuid();

  insert into public.pages
    (id, slug, title, status, published_at, template,
     seo_title, seo_description, is_placeholder)
  values
    (v_page_id, 'privacy', 'מדיניות פרטיות', 'published', now(), 'default',
     'מדיניות פרטיות',
     'כיצד אנו אוספים, שומרים ומשתמשים במידע שנמסר באתר.',
     true);

  -- Three `about` blocks: that block has a real admin form (heading,
  -- subheading, a large body textarea) and renders with whitespace-pre-line,
  -- so paragraphs survive. One block per section keeps each part separately
  -- editable instead of one wall of text.
  insert into public.page_blocks (id, page_id, block_type, sort_order, is_visible, data)
  values
    (gen_random_uuid(), v_page_id, 'about', 1, true, jsonb_build_object(
      'icon', null,
      'heading', 'איזה מידע אנחנו אוספים',
      'subheading', 'עודכן לאחרונה: [תאריך]',
      'body', '[כאן ייכנס הנוסח המשפטי שלכם — יש להחליף את הטקסט הזה.]' || E'\n\n' ||
              'לדוגמה: פרטים שנמסרים בטופס יצירת קשר או בהרשמה לעדכונים — שם, טלפון וכתובת אימייל, וכן נתוני שימוש אנונימיים הנאספים אוטומטית.',
      'cta', null)),
    (gen_random_uuid(), v_page_id, 'about', 2, true, jsonb_build_object(
      'icon', null,
      'heading', 'כיצד נעשה שימוש במידע',
      'subheading', null,
      'body', '[נוסח לדוגמה — להחלפה.]' || E'\n\n' ||
              'המידע משמש למענה לפניות, לשליחת עדכונים למי שנרשם, ולשיפור השירות.',
      'cta', null)),
    (gen_random_uuid(), v_page_id, 'about', 3, true, jsonb_build_object(
      'icon', null,
      'heading', 'הזכויות שלכם ויצירת קשר',
      'subheading', null,
      'body', '[נוסח לדוגמה — להחלפה.]' || E'\n\n' ||
              'ניתן לפנות אלינו בכל עת לעיון במידע, לתיקונו או למחיקתו.',
      'cta', null));
end $$;
