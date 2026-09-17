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
