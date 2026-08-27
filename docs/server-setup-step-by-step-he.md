# הקמת השרת — צעד אחר צעד

**המצב שלך:** יש שרת, אתה בתוכו, אין עדיין דומיין.

**מה נעשה:** נרים את האתר עכשיו על כתובת ה-IP. כשיהיה דומיין — נוסיף
אותו בשתי פקודות, בלי לגעת בתוכן.

**זמן:** 20-30 דקות.

---

## איך לקרוא את המדריך

- כל מה שבתוך תיבה — **להעתיק ולהדביק**
- `# ...` בתוך פקודה זו הערה, לא חלק מהפקודה
- אם משהו נכשל — יש פרק תקלות בסוף

---

## שלב 1 — לוודא שאתה במקום הנכון

```bash
whoami
```

צריך לקבל `root`. אם לא, הוסף `sudo` לכל פקודה במדריך.

```bash
cat /etc/os-release | head -2
```

צריך לראות `Ubuntu`. אם זו הפצה אחרת — תגיד לי, הפקודות ישתנו.

---

## שלב 2 — עדכון המערכת

```bash
apt update && apt upgrade -y
```

לוקח 1-3 דקות. אם נשאלת על שמירת קבצי הגדרות — בחר את ברירת המחדל
(`keep the local version`).

---

## שלב 3 — התקנת Git

```bash
apt install -y git
```

---

## שלב 4 — הורדת הקוד

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/twelvestepsproject-sys/TwelveStepsProject.git twelvesteps
cd /opt/twelvesteps
```

**עכשיו מעבר לבראנץ הנכון** — זה קריטי:

```bash
git checkout migrate-to-self-hosted-postgres
```

בדיקה:

```bash
git branch --show-current
```

חייב להדפיס `migrate-to-self-hosted-postgres`.

> אם תישאר על `main` תקבל את הגרסה שעדיין מחוברת ל-Supabase, וכלום מזה
> לא יעבוד.

אם הריפו פרטי, Git יבקש שם משתמש וסיסמה. הסיסמה היא **Personal Access
Token** מגיטהאב (Settings → Developer settings → Tokens), לא סיסמת
החשבון.

---

## שלב 5 — יצירת קובץ ההגדרות

```bash
cp .env.production.example .env
```

צור שני סודות:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "SESSION_SECRET=$(openssl rand -hex 32)"
```

**העתק את שתי השורות שהודפסו** — תצטרך אותן עוד רגע.

פתח את הקובץ:

```bash
nano .env
```

מלא כך (הדבק את הסודות מלמעלה):

```bash
NEXT_PUBLIC_SITE_URL=http://YOUR_SERVER_IP
POSTGRES_USER=twelvesteps
POSTGRES_DB=twelvesteps
POSTGRES_PASSWORD=<הדבק>
SESSION_SECRET=<הדבק>
STORAGE_DIR_HOST=/var/lib/twelvesteps/media
```

לגלות את ה-IP שלך:

```bash
curl -s ifconfig.me; echo
```

**שמירה ב-nano:** `Ctrl+O` → `Enter` → `Ctrl+X`

בדיקה שהכל מלא:

```bash
grep -E "PASSWORD|SECRET|SITE_URL" .env
```

אסור שיהיה `=` ריק.

> `STORAGE_DIR_HOST` חייב להיות מחוץ ל-`/opt/twelvesteps`. בדקתי: בלי
> זה, כל מה שהלקוחה תעלה נמחק בפריסה הבאה.

---

## שלב 6 — התקנה אוטומטית

```bash
bash deploy/setup.sh --no-domain
```

מתקין Docker, פותח את חומת האש, ויוצר את תיקיית התמונות.

לוקח 2-5 דקות. בסוף יודפס `Setup complete (HTTP only)`.

> `--no-domain` אומר: התקן הכל, דלג על Nginx ו-TLS. נוסיף אותם כשיהיה
> דומיין.

---

## שלב 7 — הרמת האתר

```bash
bash deploy/deploy.sh --no-domain
```

**הפעם הראשונה לוקחת 5-15 דקות** — בונה את האפליקציה מאפס. זה נורמלי.

בסוף:

```
Deployed (HTTP only): http://YOUR_IP
```

בדיקה:

```bash
curl -I http://localhost
```

`HTTP/1.1 200 OK` = עובד.

**האתר עולה אבל ריק.** התוכן בשלב הבא.

---

## שלב 8 — העברת התוכן מהמחשב שלך

> ⚠️ **הפקודות בשלב הזה רצות במחשב שלך (PowerShell), לא בשרת.**

### 8א. יצירת גיבוי

ב-PowerShell במחשב:

```powershell
cd C:\Projects\TwelveStepsProject
docker compose up -d
docker exec twelvesteps-postgres pg_dump -U postgres -d twelvesteps --clean --if-exists --no-owner --no-acl | gzip > dump.sql.gz
```

בדוק שנוצר קובץ אמיתי:

```powershell
dir dump.sql.gz
```

צריך להיות בערך **60KB**. אם זה 20 בייט — המסד לא רץ, הרץ `docker compose up -d` ונסה שוב.

### 8ב. העלאה לשרת

```powershell
scp dump.sql.gz root@YOUR_SERVER_IP:/tmp/
scp -r storage/media/uploads root@YOUR_SERVER_IP:/var/lib/twelvesteps/media/
```

### 8ג. שחזור — חזרה לשרת

```bash
cd /opt/twelvesteps
gunzip -c /tmp/dump.sql.gz | docker compose -f docker-compose.prod.yml -f docker-compose.no-domain.yml exec -T postgres psql -U twelvesteps -d twelvesteps -q
```

הרשאות לתמונות:

```bash
chown -R 1001:1001 /var/lib/twelvesteps/media
```

מחיקת הגיבוי הזמני:

```bash
rm /tmp/dump.sql.gz
```

בדיקה:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.no-domain.yml exec postgres psql -U twelvesteps -d twelvesteps -c "select count(*) from pages;"
```

צריך להחזיר 11 (או כמה עמודים שיש לך).

---

## שלב 9 — סיסמת ניהול

Supabase לא ייצאה סיסמאות — אף אחת לא עברה. צריך לקבוע חדשה:

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.no-domain.yml exec app node scripts/pg-set-password.mjs aharon.reiss@gmail.com
```

הוא יגריל סיסמה חזקה ויציג אותה. **שמור אותה עכשיו** — היא לא נשמרת
בשום מקום קריא.

---

## שלב 10 — בדיקה

מהדפדפן במחשב שלך:

```
http://YOUR_SERVER_IP
```

בדוק:

- [ ] דף הבית עולה עם התוכן בעברית
- [ ] התמונות מוצגות
- [ ] `/hachsharot` עובד
- [ ] `/admin/login` — התחברות עם המייל והסיסמה משלב 9

> הדפדפן יזהיר "לא מאובטח" — נכון, זה HTTP בלי תעודה. יסתדר עם הדומיין.

---

## שלב 11 — גיבוי אוטומטי

זה מה שאיבדת כשעזבת את Supabase.

```bash
crontab -e
```

(אם נשאל איזה עורך — בחר `1` ל-nano)

הוסף בסוף:

```
0 3 * * * cd /opt/twelvesteps && bash deploy/backup.sh >> /var/log/twelvesteps-backup.log 2>&1
```

שמור ויציאה.

**בדוק שזה עובד עכשיו, לא בעוד חודש:**

```bash
cd /opt/twelvesteps
bash deploy/backup.sh
ls -lh backups/
```

> **גיבוי על אותו שרת הוא לא גיבוי.** תקלת דיסק מוחקת גם את המקור וגם
> את הגיבוי. פעם בשבוע העתק החוצה:
> ```powershell
> scp root@YOUR_SERVER_IP:/opt/twelvesteps/backups/*.gz C:\Backups\
> ```

---

## כשיהיה דומיין

שתי פקודות. **התוכן והתמונות לא נוגעים.**

### 1. הפניית ה-DNS

בממשק הדומיין:

| Type | Name | Value |
|---|---|---|
| A | `@` | ה-IP של השרת |
| A | `www` | ה-IP של השרת |

המתן עד שזה יתפשט (דקות עד שעות). בדוק בשרת:

```bash
dig +short yourdomain.com
```

**אל תמשיך לפני שזה מחזיר את ה-IP הנכון** — הנפקת התעודה תיכשל.

### 2. עדכון הכתובת

```bash
cd /opt/twelvesteps
nano .env
```

שנה ל:

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 3. הרצה

```bash
sudo bash deploy/setup.sh yourdomain.com your@email.com
bash deploy/deploy.sh
```

עכשיו האתר על `https://yourdomain.com` עם תעודה תקפה שמתחדשת לבד.

### 4. הפעלת HSTS — רק אחרי שווידאת שה-HTTPS עובד

```bash
nano nginx/conf.d/site.conf
```

הסר את ה-`#` מהשורה של `Strict-Transport-Security`, ואז:

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

> אל תעשה את זה לפני שבדקת. HSTS + תעודה שבורה = הדפדפן מסרב להיכנס
> לאתר, ולא ניתן לביטול מהיר.

---

## פקודות שימושיות

הגדר קיצור (בזמן שאין דומיין):

```bash
cd /opt/twelvesteps
alias dc='docker compose -f docker-compose.prod.yml -f docker-compose.no-domain.yml'
```

(אחרי שיהיה דומיין — בלי החלק של `no-domain`)

```bash
dc ps                 # מה רץ
dc logs -f app        # לוגים חיים (Ctrl+C ליציאה)
dc restart app        # הפעלה מחדש
dc down               # עצירה
docker stats --no-stream    # צריכת זיכרון
df -h                 # מקום בדיסק
```

---

## עדכון הקוד בעתיד

```bash
cd /opt/twelvesteps
git pull
bash deploy/deploy.sh --no-domain      # או בלי הדגל, אם כבר יש דומיין
```

מגבה לפני, בונה, ומריץ מיגרציות חדשות. התוכן לא נוגע.

---

## תקלות

**`git clone` מבקש סיסמה ונכשל**
הריפו פרטי. צור Personal Access Token בגיטהאב והשתמש בו כסיסמה.

**"Cannot connect to the Docker daemon"**
```bash
systemctl start docker
systemctl enable docker
```

**הבנייה נכשלת או נתקעת**
זיכרון. בדוק עם `free -h`. פתרון — הוסף swap:
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```
ונסה שוב.

**האתר לא נפתח מהדפדפן**
```bash
curl -I http://localhost      # עובד מבפנים?
ufw status                    # 80 פתוח?
```
אם `curl` עובד אבל מבחוץ לא — חומת אש. `ufw allow 80/tcp`.

**"no site_settings row exists"**
התוכן לא יובא. חזור לשלב 8.

**"password authentication failed"**
ה-`.env` השתנה אחרי שהמסד נוצר. הסיסמה נקבעת רק ביצירה הראשונה.
או תחזיר את הסיסמה הישנה, או (⚠️ **מוחק הכל**):
```bash
dc down -v
bash deploy/deploy.sh --no-domain
```
ואז שלב 8 מחדש.

**התמונות לא נטענות**
```bash
ls -la /var/lib/twelvesteps/media/uploads | head
chown -R 1001:1001 /var/lib/twelvesteps/media
```

**23 תמונות שבורות**
צפוי, לא תקלה. רשומות seed שמצביעות לקבצים שמעולם לא הועלו — בדקתי,
הן שבורות גם ב-Supabase עצמה.

---

## מה מוגדר מבחינת אבטחה

| | |
|---|---|
| Postgres לא חשוף לרשת | אין `ports` — רק הקונטיינר מגיע אליו |
| חומת אש | 22, 80, 443 בלבד |
| לא רץ כ-root | משתמש 1001 בתוך הקונטיינר |
| סודות לא באימג׳ | נטענים בזמן ריצה מ-`.env` |
| מפתח Supabase | לא מגיע לשרת בכלל |

**כדאי להוסיף בהמשך:** SSH עם מפתח במקום סיסמה, ו-`fail2ban`.
