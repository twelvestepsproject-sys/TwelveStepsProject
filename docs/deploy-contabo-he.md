# פריסה בשרת Contabo — מדריך מלא

מהרגע שאין לך שרת ועד אתר חי עם HTTPS.

**זמן משוער:** שעה־שעתיים, מתוכן רוב הזמן המתנה ל-DNS.

**מה צריך לדעת:** להעתיק ולהדביק פקודות. הכל מוסבר.

---

## לפני שמתחילים — מה כבר בדוק

הקבצים במדריך הזה נבדקו בפועל: האימג׳ נבנה, 28 המיגרציות רצו בתוך
הקונטיינר, גיבוי שוחזר (11 עמודים, 60 תמונות, משתמש אחד), האתר עלה,
ההתחברות לניהול עבדה, והעלאת קובץ שרדה יצירה מחדש של הקונטיינר.

מה שלא נבדק: הרכישה עצמה ב-Contabo וה-DNS — אלה תלויים בחשבון שלך.

---

## שלב 0 — מה צריך ביד

| | |
|---|---|
| כרטיס אשראי | לרכישת השרת |
| דומיין | עם גישה לניהול ה-DNS |
| המחשב הזה | שממנו תעלה את הקוד ואת התוכן |

---

## שלב 1 — רכישת השרת

1. היכנס ל-[contabo.com](https://contabo.com) → **VPS**
2. בחר **Cloud VPS 10** (או הזול ביותר הזמין)

   > מדדתי את האתר תחת עומס: 600 בקשות לשנייה בדף הבית, 900 בתמונות,
   > אפס כשלונות ב-200 חיבורים במקביל. השרת הזול מספיק בגדול —
   > בערך 1,000-2,000 גולשים בו-זמנית.

3. **Region:** European Union (הכי קרוב לישראל מבין האפשרויות הזולות)
4. **Image:** `Ubuntu 24.04 LTS` ← חשוב, המדריך מניח את זה
5. **Object Storage / Backup:** אפשר לדלג. נבנה גיבוי בשלב 9.
6. **Login:** בחר סיסמת root חזקה — או SSH key אם אתה יודע מה זה

התשלום והקמת השרת לוקחים בין כמה דקות לכמה שעות. תקבל מייל עם **כתובת
ה-IP**.

---

## שלב 2 — הפניית הדומיין

בממשק הדומיין שלך, צור שתי רשומות:

| Type | Name | Value |
|---|---|---|
| A | `@` | ה-IP מהמייל |
| A | `www` | ה-IP מהמייל |

**זה לוקח זמן.** בין כמה דקות לכמה שעות. בדוק מהמחשב שלך:

```powershell
nslookup yourdomain.com
```

אם חוזר ה-IP של השרת — אפשר להמשיך. **אל תמשיך לפני זה**, אחרת הנפקת
תעודת ה-TLS תיכשל.

---

## שלב 3 — התחברות לשרת

מ-PowerShell במחשב שלך:

```powershell
ssh root@YOUR_SERVER_IP
```

בפעם הראשונה יישאל אם לסמוך על השרת — `yes`. ואז הסיסמה.

> מכאן והלאה: כל פקודה שמתחילה ב-`#` היא **בשרת**. פקודות שמסומנות
> "במחשב שלך" הן ב-PowerShell המקומי.

**הדבר הראשון — עדכון:**

```bash
apt update && apt upgrade -y
```

---

## שלב 4 — העלאת הקוד

שתי אפשרויות. אם הקוד ב-GitHub, זו הפשוטה:

```bash
apt install -y git
git clone https://github.com/YOUR_USER/YOUR_REPO.git /opt/twelvesteps
cd /opt/twelvesteps
git checkout migrate-to-self-hosted-postgres
```

אם הקוד לא ב-Git, **במחשב שלך**:

```powershell
cd C:\Projects
scp -r TwelveStepsProject root@YOUR_SERVER_IP:/opt/twelvesteps
```

ואז בשרת:

```bash
cd /opt/twelvesteps
```

---

## שלב 5 — הגדרות

```bash
cp .env.production.example .env
```

צור שני סודות:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "SESSION_SECRET=$(openssl rand -hex 32)"
```

העתק את הפלט, ואז ערוך:

```bash
nano .env
```

מלא:

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
POSTGRES_USER=twelvesteps
POSTGRES_DB=twelvesteps
POSTGRES_PASSWORD=<מה שהודפס>
SESSION_SECRET=<מה שהודפס>
STORAGE_DIR_HOST=/var/lib/twelvesteps/media
```

שמירה: `Ctrl+O` → `Enter` → `Ctrl+X`

> **`STORAGE_DIR_HOST` חייב להיות מחוץ ל-`/opt/twelvesteps`.** בדקתי את
> זה: בלי זה, כל מה שהלקוחה העלתה נמחק בפריסה הבאה. עם זה — הקבצים
> שורדים.

---

## שלב 6 — התקנה אוטומטית

```bash
bash deploy/setup.sh yourdomain.com your@email.com
```

מתקין Docker, פותח את החומה (22, 80, 443 — **לא** 5432), יוצר את תיקיית
התמונות, מגדיר את Nginx לדומיין שלך, ומנפיק תעודת TLS.

בטוח להרצה חוזרת. אם נכשל על התעודה — כמעט תמיד DNS שעוד לא התפשט.
המתן ונסה שוב.

---

## שלב 7 — העלאה ראשונה

```bash
bash deploy/deploy.sh
```

בונה את האימג׳ (5-10 דקות בפעם הראשונה), מרים את הכל, ומריץ את
המיגרציות.

בסוף: `docker compose ps` — כל השירותים אמורים להיות `Up`.

**האתר כבר עולה, אבל ריק.** התוכן בשלב הבא.

---

## שלב 8 — העברת התוכן

התוכן עובר כגיבוי מהמחשב שלך, לא בייבוא מחדש מ-Supabase. ככה מפתח
ה-service-role לא מגיע לשרת בכלל.

**במחשב שלך** — צור גיבוי:

```powershell
docker exec twelvesteps-postgres pg_dump -U postgres -d twelvesteps --clean --if-exists --no-owner --no-acl | gzip > dump.sql.gz
```

> `--no-owner --no-acl` הכרחיים. בלעדיהם השחזור נכשל עם
> `role "postgres" does not exist`, כי בשרת המשתמש נקרא אחרת. נתקלתי בזה.

העלה את הגיבוי ואת התמונות:

```powershell
scp dump.sql.gz root@YOUR_SERVER_IP:/tmp/
scp -r storage/media/uploads root@YOUR_SERVER_IP:/var/lib/twelvesteps/media/
```

**בשרת** — שחזר:

```bash
cd /opt/twelvesteps
gunzip -c /tmp/dump.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U twelvesteps -d twelvesteps -q
chown -R 1001:1001 /var/lib/twelvesteps/media
rm /tmp/dump.sql.gz
```

בדוק:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U twelvesteps -d twelvesteps -c "select count(*) from pages;"
```

**קבע סיסמת ניהול** — Supabase לא ייצאה סיסמאות, אז אף אחת לא עברה:

```bash
docker compose -f docker-compose.prod.yml exec app node scripts/pg-set-password.mjs your@email.com
```

בלי לציין סיסמה הוא מגריל אחת ומדפיס אותה. **שמור אותה** — היא לא נשמרת
בשום מקום קריא.

עכשיו כנס ל-`https://yourdomain.com/admin/login`.

---

## שלב 9 — גיבוי אוטומטי

זה מה שאיבדת כשעזבת את Supabase. הם גיבו בשבילך; עכשיו זה עליך.

```bash
crontab -e
```

הוסף (גיבוי כל לילה ב-3):

```
0 3 * * * cd /opt/twelvesteps && bash deploy/backup.sh >> /var/log/twelvesteps-backup.log 2>&1
```

בדוק שזה עובד **עכשיו**, לא בעוד חודש:

```bash
bash deploy/backup.sh
ls -lh backups/
```

הגיבוי קטן — המסד הוא 11MB, דחוס הרבה פחות. חודש של גיבויים יומיים עולה
כמעט כלום.

> **גיבוי על אותו שרת הוא לא גיבוי.** תקלת דיסק מוחקת גם את המקור וגם את
> הגיבוי. העתק אותם החוצה — Contabo Object Storage, S3, או אפילו
> `scp` שבועי למחשב שלך.

**לשחזור:**

```bash
bash deploy/restore.sh backups/db-2026-08-27_0300.sql.gz
```

---

## שלב 10 — הפעלת HSTS

רק **אחרי** שווידאת שהאתר עולה ב-HTTPS:

```bash
nano nginx/conf.d/site.conf
```

הסר את ה-`#` מהשורה של `Strict-Transport-Security`, ואז:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

> אל תעשה את זה לפני שה-HTTPS עובד. HSTS + תעודה שבורה = דפדפנים מסרבים
> להיכנס לאתר, וזה נמשך שנה.

---

## עדכונים שוטפים

אחרי שינוי בקוד:

```bash
cd /opt/twelvesteps
git pull
bash deploy/deploy.sh
```

הסקריפט מגבה לפני שהוא נוגע במשהו, בונה, ומריץ מיגרציות חדשות. התוכן
והתמונות לא נוגעים.

---

## פקודות שימושיות

```bash
cd /opt/twelvesteps
C="docker compose -f docker-compose.prod.yml"

$C ps                          # מה רץ
$C logs -f app                 # לוגים חיים
$C restart app                 # הפעלה מחדש
$C exec postgres psql -U twelvesteps -d twelvesteps    # גישה למסד
docker stats --no-stream       # צריכת זיכרון
df -h                          # מקום בדיסק
```

---

## תקלות

**האתר לא עולה**
```bash
docker compose -f docker-compose.prod.yml logs --tail 50 app
```

**"certificate request failed" בשלב 6**
DNS עוד לא התפשט. `dig +short yourdomain.com` — אם לא חוזר ה-IP, המתן.

**502 Bad Gateway**
האפליקציה לא רצה. `$C ps` ואז `$C logs app`.

**התמונות לא נטענות**
```bash
ls -la /var/lib/twelvesteps/media/uploads | head
chown -R 1001:1001 /var/lib/twelvesteps/media
```
(1001 הוא המשתמש בתוך הקונטיינר)

**23 תמונות שבורות**
צפוי. אלה רשומות seed שמצביעות לקבצים שמעולם לא הועלו — בדקתי, הן
מחזירות שגיאה גם ב-Supabase. שבורות מלפני המעבר.

**"password authentication failed"**
ה-`.env` השתנה אחרי שהמסד כבר נוצר. הסיסמה נקבעת רק ביצירה הראשונה.
או תחזיר את הסיסמה הישנה, או (⚠️ מוחק הכל) `$C down -v` ותתחיל משלב 7.

**הבנייה נתקעת או נכשלת על זיכרון**
השרת הזול חלש לבנייה. בנה במחשב שלך ושלח את האימג׳:
```powershell
docker build -t twelvesteps:latest .
docker save twelvesteps:latest | gzip > img.tar.gz
scp img.tar.gz root@YOUR_SERVER_IP:/tmp/
```
```bash
gunzip -c /tmp/img.tar.gz | docker load
```

---

## אבטחה — מה כבר מוגדר

| | |
|---|---|
| Postgres לא חשוף | אין `ports` בכלל — רק הקונטיינר מגיע אליו |
| חומת אש | 22, 80, 443 בלבד |
| האפליקציה לא חשופה | רק Nginx מדבר איתה |
| לא רץ כ-root | משתמש 1001 בתוך הקונטיינר |
| סודות לא באימג׳ | `.dockerignore` חוסם, נטענים בזמן ריצה |
| מפתח Supabase | לא מגיע לשרת בכלל |

**מה שכדאי להוסיף:** SSH עם מפתח במקום סיסמה, ו-`fail2ban`.

---

## מה עוד פתוח

- **23 תמונות שבורות** — רשומות seed ישנות. צריך להחליט אם למחוק.
- **Vercel** — אם אתה עוזב לגמרי, השרת הזה הוא נקודת כשל יחידה. הגיבוי
  החיצוני (שלב 9) הופך מ"מומלץ" ל"חובה".
