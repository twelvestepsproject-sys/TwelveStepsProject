# הרצה מקומית עם Postgres

ענף: `migrate-to-self-hosted-postgres`

---

## התחלה מהירה

```bash
npm run setup:local
npm run dev
```

זהו. הפקודה הראשונה מרימה Postgres, יוצרת את הסכימה ומייבאת את כל התוכן
והתמונות. השנייה מריצה את האתר.

**דרישה יחידה:** Docker פועל.

---

## מה `npm run setup:local` עושה

| שלב | פעולה |
|---|---|
| 1 | מוודא ש-`.env.local` מכיל `DATABASE_URL` ו-`DATA_SOURCE` |
| 2 | מרים את Postgres ב-Docker |
| 3 | ממתין שהמסד יהיה מוכן |
| 4 | מריץ את 28 קבצי הסכימה |
| 5 | מייבא 311 שורות תוכן ו-33 תמונות מ-Supabase |

כל שלב **בטוח להרצה חוזרת** — מה שכבר בוצע פשוט מדולג.

שלב 5 דורש את פרטי Supabase ב-`.env.local`. בלעדיהם הסכימה עדיין נוצרת,
והסקריפט אומר זאת במפורש במקום להיכשל בשקט.

---

## פקודות

| פקודה | מה היא עושה |
|---|---|
| `npm run setup:local` | הקמה מלאה מאפס |
| `npm run db:up` | הפעלת Postgres |
| `npm run db:down` | עצירה (הנתונים נשמרים) |
| `npm run db:reset` | ⚠️ **מחיקת הכל** ובנייה מחדש של הסכימה |
| `npm run db:migrate` | הרצת מיגרציות חדשות בלבד |
| `npm run db:import` | ייבוא תוכן ותמונות מחדש |
| `npm run db:psql` | פתיחת psql על המסד |

---

## מעבר בין Supabase ל-Postgres

שורה אחת ב-`.env.local`:

```bash
DATA_SOURCE=postgres    # המסד המקומי
DATA_SOURCE=supabase    # הענן
```

צריך להפעיל מחדש את שרת הפיתוח אחרי שינוי.

**שתי המערכות פעילות במקביל** — Supabase לא נגעה, כך שהמעבר הפיך בכל רגע.

---

## בדיקה שזה באמת עובד

הדרך הבטוחה לוודא שהאתר קורא מ-Postgres ולא מהענן — לעצור את המסד:

```bash
docker stop twelvesteps-postgres
```

עכשיו `/search?q=בדיקה` יחזיר שגיאה 500. אחרי:

```bash
docker start twelvesteps-postgres
```

הוא יעבוד שוב.

**שים לב:** עמודים סטטיים ימשיכו להיטען מהמטמון גם כשהמסד כבוי — לכן
הבדיקה היא דווקא על דף החיפוש, שחייב לגשת למסד בכל בקשה.

---

## הצצה בנתונים

```bash
npm run db:psql
```

```sql
\dt                                  -- 27 טבלאות
select slug, status from pages;
select count(*) from page_blocks;    -- 104
\q
```

---

## תקלות נפוצות

**"Could not start the database"**
Docker לא רץ. הפעל את Docker Desktop ונסה שוב.

**"postgres did not become ready within 60s"**
```bash
docker compose logs postgres
```
לרוב: פורט 5432 תפוס על ידי Postgres אחר במחשב.

**האתר עולה אבל בלי תוכן**
הייבוא לא רץ. הרץ `npm run db:import`.

**התמונות שבורות**
צפוי בשלב זה — הגשת הקבצים מהדיסק עדיין לא הוטמעה. הקבצים כבר
הורדו ל-`storage/media/`.

---

## מה עדיין לא עובד

| | מצב |
|---|---|
| האתר הציבורי | ✅ עובד במלואו על Postgres |
| התחברות לאדמין | ⬜ עדיין דרך Supabase |
| הגשת תמונות | ⬜ עדיין מ-Supabase |

---

## הערה על 23 התמונות החסרות

הייבוא מדווח על 23 קבצים שלא נמצאו. אלה רשומות מנתוני ה-seed המקוריים
שמצביעות לנתיב שמעולם לא הועלה — **הן כבר שבורות באתר החי**. שום דבר
לא אבד במעבר.
