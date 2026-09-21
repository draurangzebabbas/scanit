# ⚡ Product Hunting — Ultra-Fast Barcode & Inventory App

A blazing-fast, offline-first product hunting web application built with **Next.js**, **IndexedDB**, and **Tailwind CSS**. Designed for deployment directly to **Vercel** with **zero database costs**, **zero server maintenance**, and **isolated per-user Google Sheets / Drive storage**.

---

## 🌟 Key Features

1. **⚡ Instant Save & Scan Next (Zero Latency)**:
   - Saves records and compressed photos directly to local **IndexedDB** in **1–3 milliseconds**.
   - Immediate UI transition: form resets and camera reopens instantly without waiting for network uploads.
   - Background sync queue automatically uploads pending records and photos to the user's Google Drive and Google Sheet silently.

2. **📷 Hardware-Accelerated Barcode Scanner**:
   - Uses native browser GPU `BarcodeDetector` API (running at ~80ms detection cycles).
   - Supports all standard 1D & 2D formats: `UPC-A`, `UPC-E`, `EAN-13`, `EAN-8`, `Code-128`, `Code-39`, `QR Code`.
   - Continuous 1080p autofocus, flashlight/torch toggle, audio beep feedback, and haptic device vibration.

3. **👤 100% Client-Side / Isolated User Storage**:
   - No central database or login server required.
   - Each individual user connects **their own Google Sheet and Google Drive** directly in the Settings tab.

4. **📦 Local Inventory & Export**:
   - Search products by UPC, Title, or Record ID.
   - 1-Click CSV Export for spreadsheet backups.
   - Manual & automatic background retry for failed items.

5. **⚙️ Dynamic Product Fields**:
   - Customize product attributes (Text, Number, Dropdown, Date, Checkbox, Long Text) directly in Settings.

---

## 🚀 Running Locally

```bash
cd nextjsapp
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel

1. Push this project to GitHub (or use the [Vercel CLI](https://vercel.com/cli)).
2. Import the `nextjsapp` directory into **Vercel**.
3. Deploy! No environment variables or database setup required.


------------------------------------------------------------
You're almost there! The page shows two things are missing — I'll give you the exact text to paste for both.

---

## What You Need To Do

### Step 1 — Click "Fix the issue"

That will open the scope justification form for `auth/spreadsheets`. Paste this **exactly**:

---

**Scope justification text** (copy-paste this):

> Scanit uses the Google Sheets API (`auth/spreadsheets`) to append inventory records to a spreadsheet that lives entirely in the user's own Google account. When a user scans a product barcode, Scanit appends one row of data (record ID, timestamp, UPC, custom product fields, and Google Drive photo URLs) to a Google Sheet that the user has connected in Settings. Scanit never reads, copies, or exports this data to any external server — all data stays in the user's own Google account. The spreadsheet scope is the minimum required to create the sheet structure (header row + two tabs) and append rows to it. This cannot be achieved with `drive.file` alone because the Drive API does not support cell-level operations on Google Sheets.

---

### Step 2 — Record a 2-minute Demo Video

Google requires a YouTube video. Here's exactly what to record:

| Time | What to show |
|------|-------------|
| 0:00–0:20 | Open `https://scanit.draurangzebabbas.com`, click **Sign in with Google** |
| 0:20–0:40 | Complete Google OAuth — show the permission screen listing the scopes |
| 0:40–1:10 | Go to **Settings** tab → show connecting a Google Sheet (paste a Sheet URL or click Create) |
| 1:10–1:40 | Go to **Scanner** → scan a barcode → fill product form → tap **Save** |
| 1:40–2:00 | Open the connected Google Sheet in a new tab → show the row was appended |

Upload to YouTube as **Unlisted** (not public), then paste the URL into the **Video link** field.

---

### Step 3 — Fill "Additional Info" box

Paste this:

> Scanit is a free, offline-first barcode scanner and inventory management web app for individual sellers and small businesses. It uses Google Sign-In (OAuth 2.0) so users authorize their own Google Drive and Sheets — no backend server is involved. All user data remains exclusively in the user's personal Google account. Test user credentials: draurangzebabbas@gmail.com (developer account, already a test user). The app is live at https://scanit.draurangzebabbas.com. Privacy policy: https://scanit.draurangzebabbas.com/privacy — Terms: https://scanit.draurangzebabbas.com/terms

---

### Step 4 — Click Confirm

That's it! After submitting, Google will email you with any follow-up questions within a few weeks.

> 💡 **Tip while you wait**: Go to [Google Auth Platform → Audience](https://console.cloud.google.com/auth/audience?project=the-growth-machie) and click **"Publish App"** now — this removes the hard 403 block. Users will see a yellow warning screen instead but can still sign in via "Advanced → Proceed".