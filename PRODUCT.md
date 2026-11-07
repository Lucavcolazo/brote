# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Exactly two people: Luca and Giovanna, a couple. Each uses the app on their own phone, installed to the home screen as a PWA, several times a day: once to post what they ate, otherwise to check the partner's posts, the score and the store. Luca reads it in Spanish (Argentina), Giovanna usually in Brazilian Portuguese; each picks their language when choosing their profile.

## Product Purpose
Get both of them to eat fruit or vegetables every day. Each day each person posts a photo of the fruit/vegetable they ate; the partner checks it ("vale" / "no cuenta"). A day without a valid post gives 1 point to the other person. Points are spent in a shared store on rewards the couple defines themselves. Success: daily posting becomes a habit and the score stays a running, fun rivalry.

## Positioning
A private two-player rivalry, not a health tracker: the only audience is the partner, the only proof is the photo, and the only currency is a favor from the other person.

## Operating Context
- Phone only, one hand, quick sessions; posting happens at meals (camera or gallery).
- Push notifications drive visits: midday reminder, night "last call", day close at 08:00 with points (unreviewed posts auto-approve), partner posts and redemptions, Sunday 21:00 weekly summary.
- All dates are Argentina time. A day runs 00:00 to 00:00; only today can be logged. Reviews stay open until the 08:00 close.
- Photos are deleted the Wednesday after their week is summarized; meal data and points stay forever.

## Capabilities and Constraints
- Closed app: two fixed profiles (Luca, Giovanna) with password login; no sign-up.
- Languages: Spanish (es-AR) and Portuguese (pt-BR) for all UI and notifications.
- Store starts empty; all rewards are created, edited and removed by the couple.
- Weekly view shows day streaks for each person.
- Stack: React + Vite PWA on Vercel, Supabase (Postgres, Storage, Edge Functions, pg_cron), web push.

## Brand Commitments
- Name: Brote (confirmed).
- Light color theme only.
- No emojis anywhere in the interface; icons come from react-icons.
- No taglines or explanatory footnotes in the UI.
- Motion is required and must feel very smooth across the whole app.
- Tone: playful competition between the two of them (who is winning, streaks, friendly teasing).

## Evidence on Hand
No real photos or rewards yet. Demo mode uses synthetic sample data only.

## Product Principles
1. The score is the story: who is ahead, by how much and why is always one glance away.
2. Posting is the fastest path in the app: photo, type, done.
3. Proof over trust: the partner's photo check is what makes a day count.
4. Everything the couple owns (rewards, names) is theirs to edit; the app ships no content of its own.
5. Both languages are first-class, never a translation afterthought.
