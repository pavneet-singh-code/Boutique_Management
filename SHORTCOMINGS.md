# Fab_art Studio — Shortcomings to fix

The list of things that don't work well yet. We'll work through it next week.
Tick a box (`[x]`) when something is done.

**Last updated:** 21 Nov 2026

---

## 1. Your list

Write anything you notice here: what you tried, what happened, and what you expected.
One line is enough. Screenshots help.

- [ ]
- [ ]
- [ ]

---

## 2. Already known

### People and roles
- [ ] **A person can have only one role.** For example, someone can't be both *Uploader* and *Social media*.
  Today the role decides everything they can see, and it's checked on the server for every request.
  Fix: let a person have several roles and see everything any of their roles allows.
  This also needs the Team page to show tick boxes instead of one role choice.

### Orders and data
- [ ] **Order numbers aren't locked as unique yet.** Fix the duplicates and the missing number on
  **Settings → Order number check** until it says "All clear". Then run the last database upgrade (`0008`).
- [ ] **Old orders still ask "Were these delivered?"** Answer them on Home or Pending.
- [ ] **No saved measurements per customer.** Every order starts from scratch (ROADMAP section 9, idea 2).
- [ ] **When checking a scanned order, the scanned page isn't shown next to the fields**
  (ROADMAP section 9, idea 1).

### Photos
- [ ] **A real photo upload hasn't been confirmed yet** on the live app, with the Cloudinary key in Render.
  Test: add a photo to an order, and add one while creating an order.

### Calendar
- [ ] **Orders have dates but no times,** so the Week view has rows for deliveries / trials / work instead of hours.
  If trials have fixed times, we could add a time to trials and show them by hour.

### Hosting and speed
- [ ] **The app is slow after a quiet spell.** Render's free plan sleeps after about 15 minutes, so the first open
  takes 30–60 seconds. The fix is Render's paid plan (about $7/month), or a free "keep awake" ping
  (works, but bends Render's rules).
- [ ] **PDF scanning stops after about 20 scans a day** (Gemini's free limit). The fix is a paid Gemini key,
  which is cheap per scan.
- [ ] **The old PythonAnywhere site is still online.** It runs old code against an old copy of the data. Delete it
  (Web tab → Delete), so nobody uses it by mistake.

### On your PC
- [ ] **`Start-Boutique-App.bat` won't start.** The PC's own database copy needs the photos upgrade (`0007`).
  The live app is not affected.
- [ ] **`Backup-Boutique-DB.bat` still points to PythonAnywhere.** Delete `backup-config.txt` next to it, and
  enter the Render address the next time it asks.

### Quality
- [ ] **No automated tests.** Every change is checked by hand and with screenshots. A small set of tests for
  login, saving orders, bills and photos would catch mistakes before they go live.

### Open questions (ROADMAP section 11)
- [x] Should the uploader see all earnings and reports? **No** (21 Nov): the uploader sees order counts, what's
  still being made and who hasn't paid, but not money received, order values or the monthly / yearly reviews.
  (They still see amounts on single orders and bills, to make bills and record payments.)
- [ ] Should workers see customer names?
- [ ] Should the social media person see prices?
- [ ] Which platforms do you post on?

---

## 3. Done recently

- [x] Backend moved from PythonAnywhere to Render; data moved to Neon (13 Nov).
- [x] Photos on orders, through Cloudinary (21 Nov).
- [x] New design: round shapes, cocoa / warm grey colours, earthy status colours, new logo, new welcome page (21 Nov).
- [x] Week view in the calendar; photos while adding or uploading orders (21 Nov).
- [x] Phone tab bar scrolls and shows every screen, not only 5 (21 Nov).
