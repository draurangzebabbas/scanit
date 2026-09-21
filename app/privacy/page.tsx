import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Scanit",
  description:
    "Scanit Privacy Policy. Learn how Scanit handles your data — we store nothing on our servers. All data stays in your own Google Drive and Google Sheets.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const lastUpdated = "September 21, 2026";

  return (
    <main className="min-h-screen bg-slate-50 font-mono">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <img
              src="/Scanitlogo.webp"
              alt="Scanit Logo"
              width={28}
              height={28}
              className="rounded-lg object-cover border border-slate-200"
            />
            <span className="font-bold text-lg text-slate-800">Scanit</span>
          </a>
          <span className="text-slate-400 text-sm ml-auto">Privacy Policy</span>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: {lastUpdated}</p>

        <Section title="1. Overview">
          <p>
            Scanit ("we", "us", "our") is a free, open-source web application that enables you to scan barcodes and
            manage product inventory. This Privacy Policy explains how we handle your information when you use Scanit at{" "}
            <a href="https://scanit.draurangzebabbas.com" className="text-blue-600 underline">
              scanit.draurangzebabbas.com
            </a>
            .
          </p>
          <p className="mt-3 font-semibold text-slate-800">
            The short version: Scanit does not operate any backend servers. Your data lives entirely in your own browser
            and in your own Google account. We do not collect, store, sell, or share any personal data.
          </p>
        </Section>

        <Section title="2. Data We Access">
          <p>When you sign in with Google, Scanit requests access to the following Google APIs:</p>
          <ul className="list-disc list-inside mt-3 space-y-2 text-slate-700">
            <li>
              <strong>Google Account email &amp; profile</strong> — Used only to display your name and avatar in the
              app UI. This information is not transmitted to or stored on any server we operate.
            </li>
            <li>
              <strong>Google Drive (drive.file scope)</strong> — Used to upload product photos to a folder you
              choose in your own Google Drive. Scanit only accesses files it creates; it cannot read other files
              in your Drive.
            </li>
            <li>
              <strong>Google Sheets (spreadsheets scope)</strong> — Used to create or update a spreadsheet in your
              own Google account that stores your barcode scan inventory records. Scanit reads and writes only
              to the specific spreadsheet you configure.
            </li>
          </ul>
          <p className="mt-3 text-slate-700">
            All data written via these APIs remains in <strong>your personal Google account</strong>. We never copy,
            export, or retain your inventory data on any external servers.
          </p>
        </Section>

        <Section title="3. Data Stored Locally">
          <p>
            Scanit stores the following data locally in your browser (using IndexedDB / localStorage):
          </p>
          <ul className="list-disc list-inside mt-3 space-y-2 text-slate-700">
            <li>Your Google OAuth access token (so you stay signed in between sessions)</li>
            <li>Scanned product records pending sync</li>
            <li>Your Google Sheets and Drive folder configuration (IDs and URLs you enter)</li>
          </ul>
          <p className="mt-3 text-slate-700">
            This data never leaves your device except when syncing to your own Google account via Google APIs.
            Clearing your browser data removes all locally stored information.
          </p>
        </Section>

        <Section title="4. What We Do NOT Do">
          <ul className="list-disc list-inside mt-2 space-y-2 text-slate-700">
            <li>We do <strong>not</strong> operate any database or backend that stores your personal data</li>
            <li>We do <strong>not</strong> sell, rent, or share your information with third parties</li>
            <li>We do <strong>not</strong> use your data for advertising or analytics</li>
            <li>We do <strong>not</strong> have access to your historical Google Sheets or Drive files (only files Scanit itself creates)</li>
            <li>We do <strong>not</strong> share your OAuth tokens with any party other than Google</li>
          </ul>
        </Section>

        <Section title="5. Third-Party Services">
          <p>Scanit integrates with the following Google services under their respective terms:</p>
          <ul className="list-disc list-inside mt-3 space-y-2 text-slate-700">
            <li>
              <strong>Google Sign-In (OAuth 2.0)</strong> —{" "}
              <a href="https://policies.google.com/privacy" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                Google Privacy Policy
              </a>
            </li>
            <li>
              <strong>Google Drive API</strong> — governed by your Google account settings
            </li>
            <li>
              <strong>Google Sheets API</strong> — governed by your Google account settings
            </li>
          </ul>
          <p className="mt-3 text-slate-700">
            Scanit's use and transfer of information received from Google APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </Section>

        <Section title="6. Children's Privacy">
          <p>
            Scanit is not directed at children under the age of 13. We do not knowingly collect personal information
            from children. If you believe a child has used Scanit and provided personal data, please contact us at the
            email below and we will take appropriate action.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            All communication between Scanit and Google APIs is performed over HTTPS. Your OAuth access token is
            stored only in your browser's local storage and is never transmitted to any server we control.
          </p>
        </Section>

        <Section title="8. Revoking Access">
          <p>
            You can revoke Scanit's access to your Google account at any time by visiting{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account Permissions
            </a>{" "}
            and removing Scanit. This immediately invalidates all stored tokens.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date
            at the top of this page. Continued use of Scanit after any changes constitutes your acceptance of the
            updated policy.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p>
            If you have any questions about this Privacy Policy or your data, please contact us at:
          </p>
          <p className="mt-2">
            <a href="mailto:draurangzebabbas@gmail.com" className="text-blue-600 underline font-semibold">
              draurangzebabbas@gmail.com
            </a>
          </p>
        </Section>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-8 py-6">
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap gap-4 items-center justify-between text-sm text-slate-500">
          <span>© {new Date().getFullYear()} Scanit. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
            <a href="/" className="hover:underline">Back to App</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">{title}</h2>
      <div className="text-slate-700 leading-relaxed text-sm">{children}</div>
    </section>
  );
}
