import type { Metadata } from "next";

const brand = "Cleo Agent";
const company = "Huminary Labs";
const contactEmail = "legal@huminarylabs.com";
const supportEmail = "support@cleo-agent.com";
const lastUpdated = "2025-09-13"; // ISO YYYY-MM-DD

export const metadata: Metadata = {
  title: `${brand} — Privacy Policy`,
  description:
    `How ${brand} collects, uses, and protects your information. Learn about data we process, providers we use (like Supabase and Vercel), cookies, push notifications, your rights, and how to contact us.`,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${brand} — Privacy Policy`,
    description:
      `Privacy practices for ${brand}. Data handling, security, cookies, and your rights. Last updated ${lastUpdated}.`,
    type: "article",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-6 text-zinc-900 dark:text-zinc-100">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Last Updated: {new Date(lastUpdated).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <section className="space-y-4">
        <p>
          This Privacy Policy explains how {brand} ("we", "us", or "our"), a
          product of {company}, collects, uses, discloses, and safeguards your
          information when you use our application, websites, and related
          services (collectively, the "Services"). We are committed to
          protecting your privacy and handling your data responsibly.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Who We Are</h2>
        <p>
          {brand} helps you work with AI agents and tools. The Services are
          developed and operated by {company}. For privacy inquiries, contact us
          at <a className="underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Information We Collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account and Profile Information: name, email, authentication
            identifiers, and preferences if you create an account or sign in.
          </li>
          <li>
            Usage Data: interactions with the app (e.g., messages to agents,
            features used, settings), device information, app version, and
            diagnostic logs.
          </li>
          <li>
            Content You Provide: prompts, messages, files, task details, and
            other inputs you choose to share with agents or tools.
          </li>
          <li>
            Push Notification Data: your browser/device push subscription (e.g.,
            endpoint and keys) if you opt in. We use standard Web Push
            technology with VAPID keys.
          </li>
          <li>
            Cookies and Local Storage: we may use cookies and similar storage
            (e.g., localStorage, IndexedDB, service workers) for authentication,
            session continuity, preferences, and offline/PWA features.
          </li>
          <li>
            Third-Party Services: we rely on providers such as Supabase
            (database/auth), Vercel (hosting/deployment), and others to operate
            the Services. These providers may process limited personal data on
            our behalf as processors or sub-processors.
          </li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">How We Use Information</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide, maintain, and improve the Services and features.</li>
          <li>Authenticate users and secure accounts.</li>
          <li>Send service communications and optional push notifications.</li>
          <li>Understand usage to enhance performance and reliability.</li>
          <li>Comply with legal obligations and enforce our Terms.</li>
          <li>Prevent fraud, abuse, and security incidents.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Legal Bases (EEA/UK)</h2>
        <p>
          Where GDPR or UK GDPR applies, we process data under these legal
          bases: (i) performance of a contract (to provide the Services); (ii)
          legitimate interests (e.g., security, service improvement) balanced
          against your rights; (iii) consent (e.g., for optional push
          notifications or certain cookies); and (iv) legal obligations.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Sharing of Information</h2>
        <p>
          We do not sell personal information. We share data only as necessary
          to provide the Services, including with:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Service Providers/Processors: e.g., Supabase, Vercel, and other
            infrastructure, analytics, or communications vendors under
            agreements that require appropriate safeguards.
          </li>
          <li>
            Integrations You Authorize: when you connect third-party accounts or
            tools, we share data as needed to perform the integration you
            request.
          </li>
          <li>
            Legal and Safety: to comply with law, respond to lawful requests, or
            protect rights, property, users, or the public.
          </li>
          <li>
            Business Transfers: in a merger, acquisition, financing, or sale of
            assets, data may be transferred consistent with this Policy.
          </li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Data Retention</h2>
        <p>
          We retain personal data for as long as necessary to provide the
          Services, comply with legal obligations, resolve disputes, and enforce
          agreements. Retention periods vary by data type and purpose.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">International Transfers</h2>
        <p>
          We may process and store information in countries other than your own.
          Where required, we implement appropriate safeguards for international
          data transfers, such as contractual clauses, and take steps to ensure
          your data receives a comparable level of protection.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Security</h2>
        <p>
          We use reasonable technical and organizational measures designed to
          protect information from unauthorized access, loss, misuse, or
          alteration. No method of transmission or storage is fully secure; we
          cannot guarantee absolute security.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Your Rights</h2>
        <p>
          Depending on your location, you may have rights such as access,
          correction, deletion, portability, and objection to certain
          processing. To exercise rights or make a request, contact us at
          <a className="underline ml-1" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
        <p>
          California residents (CCPA/CPRA) may have additional rights regarding
          access, deletion, correction, and opting out of certain sharing.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Children’s Privacy</h2>
        <p>
          The Services are not directed to children under the age required by
          applicable law (e.g., 13 in the U.S., 16 in parts of the EEA). We do
          not knowingly collect personal information from children.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Third-Party Links</h2>
        <p>
          Our Services may link to third-party sites or services. This Policy
          does not apply to those third parties. Please review their privacy
          policies.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the
          updated version with a revised “Last Updated” date. Material changes
          may be communicated by additional notice.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Contact Us</h2>
        <p>
          Questions or concerns? Email <a className="underline" href={`mailto:${contactEmail}`}>{contactEmail}</a> or
          <a className="underline ml-1" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      </section>
    </main>
  );
}
