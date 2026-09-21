import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Scanit",
  description:
    "Scanit Terms of Service. Read the terms and conditions for using the Scanit barcode scanner and inventory management application.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const lastUpdated = "September 21, 2026";

  return (
    <main className="min-h-screen bg-slate-50 font-mono">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="7" fill="#1d77ff" />
              <path d="M7 14h14M14 7v14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <span className="font-bold text-lg text-slate-800">Scanit</span>
          </a>
          <span className="text-slate-400 text-sm ml-auto">Terms of Service</span>
        </div>
      </header>

      {/* Content */}
      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-10">Last updated: {lastUpdated}</p>

        <Section title="1. Acceptance of Terms">
          <p>
            By accessing or using Scanit at{" "}
            <a href="https://scanit.draurangzebabbas.com" className="text-blue-600 underline">
              scanit.draurangzebabbas.com
            </a>{" "}
            ("the App", "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to
            these Terms, do not use the Service.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            Scanit is a free web application that allows users to:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-700">
            <li>Scan product barcodes (UPC / EAN) using their device camera</li>
            <li>Record custom product attributes and inventory data</li>
            <li>Sync product photos to their own Google Drive folder</li>
            <li>Sync inventory records to their own Google Sheets spreadsheet</li>
          </ul>
          <p className="mt-3">
            The Service operates as a client-side application. All data is stored locally in your browser and synced
            directly to your personal Google account. Scanit does not operate any database or server that retains
            your personal or inventory data.
          </p>
        </Section>

        <Section title="3. Google Account Requirements">
          <p>
            To use the sync features of Scanit, you must sign in with a valid Google account. By signing in, you
            authorize Scanit to access the following on your behalf:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-700">
            <li>Your Google account email address and public profile</li>
            <li>Files created by Scanit in your Google Drive</li>
            <li>Google Sheets spreadsheets you configure with Scanit</li>
          </ul>
          <p className="mt-3">
            You may revoke this access at any time via{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Account Permissions
            </a>
            . Revoking access will prevent sync from working but will not delete any data already in your Google
            account.
          </p>
        </Section>

        <Section title="4. User Responsibilities">
          <p>You agree to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-700">
            <li>Use the Service only for lawful purposes</li>
            <li>Not attempt to reverse-engineer, copy, or redistribute the Service without permission</li>
            <li>Not use the Service to scan or manage counterfeit, illegal, or fraudulent product listings</li>
            <li>Maintain the security of your Google account credentials</li>
          </ul>
        </Section>

        <Section title="5. Intellectual Property">
          <p>
            The Scanit name, logo, and interface design are the property of the developer. The Service's source
            code may be made available under an open-source license where stated. These Terms do not grant you any
            rights to use the Scanit name, logo, or branding outside the Service itself.
          </p>
        </Section>

        <Section title="6. Disclaimer of Warranties">
          <p>
            The Service is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranties
            of any kind, either express or implied, including but not limited to:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-700">
            <li>Warranties of merchantability or fitness for a particular purpose</li>
            <li>Guarantees of uptime, availability, or error-free operation</li>
            <li>Accuracy of barcode data or product information retrieved via APIs</li>
          </ul>
          <p className="mt-3">
            We make no guarantees that the Service will always be available, uninterrupted, or free from bugs. Your
            use of the Service is at your own risk.
          </p>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            To the fullest extent permitted by applicable law, Scanit and its developer shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including but not limited to:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-slate-700">
            <li>Loss of data or inventory records</li>
            <li>Loss of profits or business opportunities</li>
            <li>Unauthorized access to your Google account</li>
          </ul>
          <p className="mt-3">
            Our total liability to you for any claim shall not exceed the amount you paid to use the Service in the
            12 months prior to the claim (which, since the Service is free, is $0).
          </p>
        </Section>

        <Section title="8. Third-Party Services">
          <p>
            Scanit integrates with Google APIs. Your use of Google services is governed by{" "}
            <a
              href="https://policies.google.com/terms"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google's Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://policies.google.com/privacy"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </a>
            . We are not responsible for the actions, content, or policies of Google or any other third-party service.
          </p>
        </Section>

        <Section title="9. Termination">
          <p>
            We reserve the right to suspend or terminate access to the Service at any time, with or without notice,
            for conduct that we believe violates these Terms or is otherwise harmful to other users, us, or third parties.
          </p>
          <p className="mt-3">
            You may stop using the Service at any time. Since we don't hold your data on our servers, no deletion
            request to us is required — simply clear your browser data and revoke Google access if you wish to remove
            all traces.
          </p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>
            We may update these Terms from time to time. We will indicate the revision date at the top of this page.
            Your continued use of the Service after any changes constitutes your acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These Terms are governed by and construed in accordance with applicable law. Any disputes shall be resolved
            in the jurisdiction where the developer is located.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>For any questions regarding these Terms, contact us at:</p>
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
