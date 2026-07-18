import type { Post } from "@/lib/schemas";
import { categories } from "./categories";

const catByName = Object.fromEntries(categories.map((c) => [c.slug, c]));

/**
 * §5.5 / sample-content-review.md: ≥12 posts across ≥3 categories.
 * The sample review's locked fixtures (hapachad-lehatchil,
 * lifamim-tsarich-laatzor, hakol-mathil-bsicha, machshavot-al-hemshech,
 * tiuta-lo-gmura, sipur-echad-shel-shinuy) are reproduced verbatim below —
 * tone, dates, slugs, and body text are client-approved and must not
 * change. Additional posts extend the volume to comfortably exceed 12,
 * spread across 2025-11 .. 2026-06 with fixed ISO dates.
 *
 * Character-count extremes (measured programmatically, not eyeballed —
 * see the inline comment on each measured field):
 *  - hapachad-lehatchil.title: 80 chars (target 65–80 long ✓)
 *  - lifamim-tsarich-laatzor.title: 17 chars (target 15–20 short ✓)
 *  - lifamim-tsarich-laatzor.excerpt: 189 chars (target 200–240 — the
 *    sample review flagged this as "close but under"; kept verbatim since
 *    it's locked content, and a SEPARATE post below
 *    (`lehakshiv-lguf-tochnit`) is written fresh to actually land inside
 *    the 200–240 band so that extreme is genuinely exercised)
 *  - lehakshiv-lguf-tochnit.excerpt: 238 chars (target 200–240 long ✓)
 *  - maagal-tmicha-kehilati.title: 73 chars (target 65–80 long, second
 *    data point ✓)
 */
export const posts = [
  // ---- Locked sample fixtures, verbatim ----
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "hapachad-lehatchil",
    title:
      "הפחד להתחיל ולמה זה בעצם סימן טוב שמשהו חשוב עומד לקרות בחיים שלך, לא מכשול בדרך",
    excerpt: "הפחד לא אומר שמשהו לא בסדר. הוא אומר שמשהו חשוב עומד לקרות בקרוב.",
    body:
      "יש רגע שקורה לרוב האנשים שפונים אלינו: יושבים מול הדף הזה, מול הטופס הזה, ומשהו עוצר בדיוק לפני הצעד האחרון.\n\n" +
      "זו לא חולשה, וזה לא חוסר מוכנות. זה בדרך כלל סימן שמשהו כבר התעורר בפנים — הוא פשוט עוד לא בטוח שאפשר לסמוך על התהליך.\n\n" +
      "במכללת אשד פוגשים את השאלה הזו כל שבוע. אין הבטחה שהפחד ייעלם ביום הראשון. יש הבטחה שאף אחד לא צריך להתמודד איתו לבד.\n\n" +
      "מי שמזהה את עצמו בשורות האלה — זה הזמן לדבר איתנו, גם בלי תשובות מוכנות. מספיק שיש שאלה.",
    cover_image_id: null,
    category_id: catByName["tahalich-ishi"].id,
    category: catByName["tahalich-ishi"],
    author_id: null,
    published_at: "2025-11-03T09:00:00Z",
    reading_time: 4,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-11-03T09:00:00Z",
    updated_at: "2025-11-03T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "lifamim-tsarich-laatzor",
    title: "לפעמים צריך לעצור",
    excerpt:
      "יש תקופות שבהן הדרך הכי נכונה קדימה היא לא להאיץ, אלא לעצור לרגע ולשאול מה באמת קורה כאן, לפני שממשיכים לרוץ באותו כיוון מתוך הרגל ולא מתוך בחירה אמיתית, וזה כשלעצמו כבר צעד משמעותי בתהליך.",
    body:
      "עצירה היא לא ויתור. היא הזדמנות לבדוק אם הכיוון עדיין נכון.\n\n" +
      "לפעמים ההרגל לרוץ קדימה חזק יותר מהרצון האמיתי שלנו, ורק כשעוצרים לרגע אפשר לשמוע מה קורה מתחת לרעש.",
    cover_image_id: null,
    category_id: catByName["zugiyut-umishpacha"].id,
    category: catByName["zugiyut-umishpacha"],
    author_id: null,
    published_at: "2026-02-14T09:00:00Z",
    reading_time: 3,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-02-14T09:00:00Z",
    updated_at: "2026-02-14T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "hakol-mathil-bsicha",
    title: "הכל מתחיל בשיחה אחת",
    excerpt: "לפעמים השינוי הכי גדול מתחיל מהמשפט הכי קטן שאומרים בקול רם.",
    body:
      "אנשים רבים מגיעים אלינו אחרי חודשים, לפעמים שנים, שבהם המשפט הראשון לא נאמר.\n\n" +
      "לא כי אין מה לומר, אלא כי קשה למצוא את המילה הראשונה. במכללת אשד המפגש הראשון הוא בדיוק בשביל זה — למצוא ביחד את המילה הראשונה.",
    cover_image_id: null,
    category_id: catByName["tahalich-ishi"].id,
    category: catByName["tahalich-ishi"],
    author_id: null,
    published_at: "2026-02-14T14:30:00Z",
    reading_time: 5,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-02-14T14:30:00Z",
    updated_at: "2026-02-14T14:30:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    slug: "machshavot-al-hemshech",
    title: "מחשבות על המשך הדרך",
    excerpt:
      "רשומה שנקבעה לפרסום עתידי, ומיועדת לבדוק שרשומות עתידיות אינן מוצגות ברשימה הציבורית.",
    body:
      "רשומה זו קיימת כדי לוודא שסינון התאריך עובד באופן עצמאי מסינון הסטטוס: השדה status הוא 'published', אבל published_at הוא תאריך עתידי, ולכן הרשומה חייבת להיעדר מהרשימה הציבורית עד שהתאריך יגיע.",
    cover_image_id: null,
    category_id: catByName["kehila"].id,
    category: catByName["kehila"],
    author_id: null,
    published_at: "2027-01-01T09:00:00Z",
    reading_time: 2,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-06-01T09:00:00Z",
    updated_at: "2026-06-01T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    slug: "tiuta-lo-gmura",
    title: "טיוטה שעדיין לא הושלמה",
    excerpt:
      "רשומה בסטטוס טיוטה עם תאריך עבר — בודקת שסינון הסטטוס עובד באופן עצמאי מסינון התאריך, ושהאדמין עם includeDrafts כן רואה אותה.",
    body:
      "רשומה זו קיימת כדי לוודא שסינון הסטטוס עובד באופן עצמאי מסינון התאריך: published_at הוא תאריך עבר, אבל status הוא 'draft', ולכן הרשומה חייבת להיעדר מהרשימה הציבורית בכל מקרה, ולהופיע רק כש-includeDrafts מופעל.",
    cover_image_id: null,
    category_id: catByName["tahalich-ishi"].id,
    category: catByName["tahalich-ishi"],
    author_id: null,
    published_at: "2026-01-10T09:00:00Z",
    reading_time: 3,
    status: "draft",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-01-08T09:00:00Z",
    updated_at: "2026-01-08T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    slug: "sipur-echad-shel-shinuy",
    title: "סיפור אחד של שינוי",
    excerpt: "רשומה יחידה בקטגוריה הזו, במכוון — בודקת את התצוגה כשיש רק פריט אחד.",
    body:
      "לפעמים סיפור אחד מספיק כדי להבין שדרך מסוימת עובדת. זו הרשומה היחידה כרגע בקטגוריה 'קול הבוגרים' — במכוון, כדי לבדוק שהארכיון מציג נכון גם כשיש בו פריט בודד, ושדפדוף לא נשבר כשאין עמוד שני.",
    cover_image_id: null,
    category_id: catByName["kol-habogrim"].id,
    category: catByName["kol-habogrim"],
    author_id: null,
    published_at: "2026-04-20T09:00:00Z",
    reading_time: 6,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-04-20T09:00:00Z",
    updated_at: "2026-04-20T09:00:00Z",
  },

  // ---- Additional posts to reach the ≥12 minimum ----
  {
    id: "10000000-0000-4000-8000-000000000007",
    slug: "lehakshiv-lguf-tochnit",
    title: "להקשיב לגוף כשהמילים לא מספיקות",
    excerpt:
      "לפעמים אנחנו מחכים לרגע המושלם כדי להתחיל לטפל במה שמכביד עלינו, ומגלים שהרגע הזה לא מגיע מעצמו — הוא נבנה בהדרגה, מתוך החלטות קטנות שנראות לא משמעותיות בזמן אמת, אבל יחד יוצרות שינוי שאפשר להרגיש במבט לאחור, כשמסתכלים על הדרך שכבר עברנו.",
    body:
      "לא תמיד יש מילה מדויקת לתחושה. לפעמים הגוף יודע לפני שהראש מסכים.\n\n" +
      "בעבודה אישית לומדים גם לשים לב לאותות הפשוטים — נשימה, מתח בכתפיים, עייפות שלא עוברת — ולתת להם מקום בתהליך, לא רק למחשבות.",
    cover_image_id: null,
    category_id: catByName["tahalich-ishi"].id,
    category: catByName["tahalich-ishi"],
    author_id: null,
    published_at: "2025-11-20T09:00:00Z",
    reading_time: 4,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-11-20T09:00:00Z",
    updated_at: "2025-11-20T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    slug: "gvulot-bimshpacha",
    title: "איך שומרים על גבול בלי לאבד את הקשר",
    excerpt: "גבול ברור לא צריך להרחיק את מי שקרוב אלינו — הוא יכול דווקא לקרב.",
    body:
      "אחת השאלות הנפוצות ביותר שעולות בעבודה עם משפחות: איך אומרים 'לא' בלי שהקשר יישבר?\n\n" +
      "התשובה בדרך כלל לא נמצאת במילה עצמה, אלא באופן שבו היא נאמרת, ובעקביות שמאחוריה. גבול שמלווה בהסבר אמיתי נשמע אחרת מגבול שנזרק מתוך כעס.",
    cover_image_id: null,
    category_id: catByName["zugiyut-umishpacha"].id,
    category: catByName["zugiyut-umishpacha"],
    author_id: null,
    published_at: "2025-12-08T09:00:00Z",
    reading_time: 5,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2025-12-08T09:00:00Z",
    updated_at: "2025-12-08T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    slug: "maagal-tmicha-kehilati",
    title:
      "מה זה בעצם מעגל תמיכה קהילתי, ולמה כדאי להיות חלק ממנו גם כשהכל נראה בסדר",
    excerpt: "מעגל תמיכה הוא לא רק לרגעי משבר — הוא מקום שמחזיק גם כשהכול כרגע בסדר.",
    body:
      "קהילה טובה לא נמדדת רק ברגעי החירום שלה. היא נמדדת גם בשגרה — במפגש הקבוע, בשיחה הקצרה, בידיעה שיש למי לפנות גם כשאין משבר.\n\n" +
      "במכללת אשד מתקיימים מפגשי קהילה חודשיים, פתוחים לבוגרים ולתלמידים כאחד.",
    cover_image_id: null,
    category_id: catByName["kehila"].id,
    category: catByName["kehila"],
    author_id: null,
    published_at: "2026-01-05T09:00:00Z",
    reading_time: 4,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-01-05T09:00:00Z",
    updated_at: "2026-01-05T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    slug: "tafkid-hametapel-bmishpacha",
    title: "התפקיד של מי שמלווה משפחה בתהליך שינוי משותף",
    excerpt: "מי שמלווה משפחה לא פותר את הבעיה — הוא עוזר למשפחה למצוא את הפתרון שלה.",
    body:
      "תפקיד הליווי המשפחתי שונה מהותית מייעוץ פרטני. יש כאן כמה קולות בחדר, ולפעמים הם לא מסכימים.\n\n" +
      "העבודה היא ליצור מרחב שבו כל קול נשמע, ומשם לבנות יחד שפה משותפת חדשה.",
    cover_image_id: null,
    category_id: catByName["hachshara-miktsoit"].id,
    category: catByName["hachshara-miktsoit"],
    author_id: null,
    published_at: "2026-03-02T09:00:00Z",
    reading_time: 5,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-03-02T09:00:00Z",
    updated_at: "2026-03-02T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000011",
    slug: "rega-shel-shketh",
    title: "רגע של שקט",
    excerpt: "לפעמים הצעד הראשון בתהליך הוא פשוט לתת לעצמנו רגע של שקט אמיתי.",
    body:
      "בעולם שדורש תגובה מיידית לכל דבר, שקט הפך למשהו נדיר. וזה בדיוק המקום שממנו כדאי להתחיל.\n\n" +
      "לא צריך תשובות כדי לשבת בשקט. מספיק הרצון להאזין.",
    cover_image_id: null,
    category_id: catByName["gvulot-uvriut-nafshit"].id,
    category: catByName["gvulot-uvriut-nafshit"],
    author_id: null,
    published_at: "2026-03-25T09:00:00Z",
    reading_time: 2,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-03-25T09:00:00Z",
    updated_at: "2026-03-25T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000012",
    slug: "lachzor-latochnit-shuv",
    title: "לחזור לתוכנית אחרי הפסקה ארוכה",
    excerpt: "לחזור אחרי הפסקה זה לא להתחיל מאפס — זה להמשיך ממש מהמקום שבו עצרנו.",
    body:
      "מי שעוצר לאורך הדרך, מכל סיבה, לפעמים חושש לחזור — כאילו ההפסקה מוחקת את מה שכבר נבנה.\n\n" +
      "זה לא נכון. חזרה לתהליך אחרי הפסקה היא חלק לגיטימי מהדרך, לא כישלון בה.",
    cover_image_id: null,
    category_id: catByName["tahalich-ishi"].id,
    category: catByName["tahalich-ishi"],
    author_id: null,
    published_at: "2026-05-10T09:00:00Z",
    reading_time: 3,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-05-10T09:00:00Z",
    updated_at: "2026-05-10T09:00:00Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000013",
    slug: "siyum-vehatchala",
    title: "סיום והתחלה",
    excerpt: "כל סיום תהליך הוא גם התחלה של משהו אחר — לפעמים שקטה, לפעמים גדולה.",
    body:
      "סיום תוכנית לימודים או תהליך אישי מלווה תמיד בתערובת של גאווה וקצת חשש: ומה עכשיו?\n\n" +
      "התשובה משתנה מאדם לאדם, אבל השאלה עצמה היא סימן בריא — היא אומרת שהיה כאן משהו משמעותי שנגמר, ושמחכה לו המשך.",
    cover_image_id: null,
    category_id: catByName["tahalich-ishi"].id,
    category: catByName["tahalich-ishi"],
    author_id: null,
    published_at: "2026-06-15T09:00:00Z",
    reading_time: 3,
    status: "published",
    seo_title: null,
    seo_description: null,
    seo_canonical: null,
    seo_og_image_id: null,
    seo_noindex: false,
    is_placeholder: true,
    created_at: "2026-06-15T09:00:00Z",
    updated_at: "2026-06-15T09:00:00Z",
  },
] satisfies Post[];
