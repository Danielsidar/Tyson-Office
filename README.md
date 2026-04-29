# Tyson Virtual Office 🏢

משרד דיגיטלי 2D פנימי לטייסון. עובדים נכנסים, יושבים בקוביה, ויכולים "לדפוק בדלת" של מישהו אחר כדי לפתוח שיחת וידאו.

## איך זה עובד

- **Frontend:** Next.js 16 + React + Tailwind v4
- **Backend:** Convex (presence, knocks, WebRTC signaling) — בלי DB מסורתי
- **Video:** WebRTC peer-to-peer (Convex משמש רק לסיגנלינג)

## הרצה ראשונה

זה דורש שני שלבים בפעם הראשונה (אחרי זה רק `npm run dev`):

### 1. אתחול Convex

הרץ בטרמינל:

```bash
npx convex dev
```

מה שיקרה:
1. ייפתח דפדפן עם בקשת login לחשבון Convex (חינמי).
2. תתבקש לבחור / ליצור פרויקט. צור חדש בשם `tyson-virtual-office`.
3. ה-CLI ייצור אוטומטית `.env.local` עם `NEXT_PUBLIC_CONVEX_URL=...`.
4. הוא יידחוף את הסכמה (presence/knocks/signals) ויישאר רץ.

**השאר את החלון הזה פתוח** - הוא ה-watcher שמסנכרן שינויים ב-`convex/*.ts` ל-deployment.

### 2. הרצת Next.js

בטרמינל **שני**:

```bash
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000).

## איך לבדוק

כדי לראות את הקסם של הזמן-אמת:
1. פתח את האתר בחלון רגיל - בחר שם ואווטאר → תיכנס למשרד.
2. פתח את האתר ב-**חלון גלישה בסתר** או דפדפן אחר - בחר שם אחר.
3. בחלון הראשון, לחץ על הקוביה של החלון השני → דפיקה בדלת.
4. בחלון השני - אישור → שיחת וידאו נפתחת.

## מבנה

```
app/
  page.tsx           ← מסך כניסה / משרד (state machine)
  layout.tsx         ← Convex provider + RTL
components/
  EntryScreen.tsx    ← בחירת שם + אווטאר
  Office.tsx         ← מרכיב הראשי (כותרת + מפה + knocks + שיחה)
  OfficeMap.tsx      ← הגריד עם הקוביות
  KnockToast.tsx     ← התראות דפיקה (נכנסת/יוצאת)
  VideoCall.tsx      ← מודאל שיחת וידאו עם פקדים
convex/
  schema.ts          ← presence / knocks / signals
  presence.ts        ← join / heartbeat / leave / list
  knocks.ts          ← knock / respond / list
  signals.ts         ← WebRTC offer/answer/ICE
lib/
  webrtc.ts          ← VideoPeer wrapper מעל RTCPeerConnection
```

## רעיונות להמשך

- חדר ישיבות אמיתי (3+ משתתפים, צריך SFU כמו LiveKit)
- שיתוף מסך
- "מטבח" וירטואלי - חלל פתוח לשיחות ספונטניות
- סטטוסים: בפגישה / אל תפריע / בהפסקה
- אינטגרציה עם ה-CRM של טייסון (להראות ליד מי כל אחד עובד)
- אווטארים שזזים על המפה (במקום מיקום קבוע)
