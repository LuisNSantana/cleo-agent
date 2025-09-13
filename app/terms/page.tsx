import type { Metadata } from "next";

const brand = "Cleo Agent";
const company = "Huminary Labs";
const contactEmail = "legal@huminarylabs.com";
const lastUpdated = "2025-09-13"; // ISO YYYY-MM-DD

export const metadata: Metadata = {
  title: `${brand} — Terms of Service`,
  description:
    `Public Terms of Service for ${brand}. Understand your rights and responsibilities when using the app, including acceptable use, subscriptions, intellectual property, disclaimers, and dispute resolution.`,
  robots: { index: true, follow: true },
  openGraph: {
    title: `${brand} — Terms of Service`,
    description: `Terms governing your use of ${brand}. Last updated ${lastUpdated}.`,
    type: "article",
  },
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-sm leading-6 text-zinc-900 dark:text-zinc-100">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
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
          These Terms of Service ("Terms") govern your access to and use of
          {" "}
          {brand} (the "Services"), provided by {company} ("we", "us"). By
          using the Services, you agree to be bound by these Terms. If you do
          not agree, do not use the Services.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Eligibility</h2>
        <p>
          You must be at least the age of majority in your jurisdiction to use
          the Services. If you use the Services on behalf of an organization,
          you represent that you have authority to bind that organization and
          agree to these Terms on its behalf.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Account & Security</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>You are responsible for maintaining the confidentiality of your credentials.</li>
          <li>You are responsible for activities occurring under your account.</li>
          <li>Notify us promptly of any unauthorized use or security breach.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Acceptable Use</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Do not misuse the Services, interfere with normal operation, or attempt unauthorized access.</li>
          <li>Do not upload or transmit unlawful, harmful, or infringing content.</li>
          <li>Respect third-party rights and all applicable laws and regulations.</li>
          <li>Do not attempt to re-identify individuals from anonymized data.</li>
          <li>Do not use the Services to create or distribute spam, malware, or abusive content.</li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">Third-Party Services & Integrations</h2>
        <p>
          The Services may integrate with third-party platforms and tools (e.g.,
          Supabase, Vercel, and others). Your use of third-party services is
          subject to their terms and privacy policies. We are not responsible
          for third-party services and do not warrant their performance.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Content</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Your Content: You retain ownership of content you submit. You grant
            us a non-exclusive, worldwide, royalty-free license to use,
            reproduce, display, and distribute your content solely to operate
            and improve the Services.
          </li>
          <li>
            Our Content: The Services, including software, UI, text, graphics,
            trademarks, and logos, are owned by {company} or its licensors and
            protected by intellectual property laws.
          </li>
          <li>
            Feedback: You may submit ideas or suggestions. You agree we may use
            them without restriction or compensation.
          </li>
        </ul>

        <h2 className="mt-8 text-2xl font-semibold">AI Features & Safety</h2>
        <p>
          AI-generated outputs may be inaccurate or incomplete. Use judgment and
          verify important information. You are responsible for how you use
          outputs. Do not rely on the Services for legal, medical, or other
          professional advice.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Subscriptions & Billing</h2>
        <p>
          If paid features are offered, subscription terms, pricing, and billing
          cycles will be disclosed at purchase. Fees are non-refundable except as
          required by law. We may change pricing with prior notice where
          required. Taxes may apply.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Termination</h2>
        <p>
          You may stop using the Services at any time. We may suspend or
          terminate access for violations of these Terms or to protect the
          Services or users. Upon termination, your right to use the Services
          ceases, but certain provisions survive (e.g., IP ownership, warranty
          disclaimers, limitations of liability, indemnification).
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Disclaimers</h2>
        <p>
          THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
          WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT
          WARRANT THE ACCURACY, RELIABILITY, OR AVAILABILITY OF THE SERVICES.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, {company} AND ITS AFFILIATES
          WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING FROM OR
          RELATED TO YOUR USE OF THE SERVICES, EVEN IF ADVISED OF THE
          POSSIBILITY. OUR AGGREGATE LIABILITY WILL NOT EXCEED THE AMOUNT YOU
          PAID (IF ANY) FOR THE SERVICES IN THE 12 MONTHS BEFORE THE CLAIM.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless {company}, its affiliates,
          and their officers, directors, employees, and agents from any claims,
          losses, liabilities, and expenses arising from your use of the
          Services or violation of these Terms.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Governing Law & Dispute Resolution</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction where
          {company} is established, without regard to conflict of laws. Disputes
          will be resolved in the courts located in that jurisdiction unless
          otherwise required by law. Where permitted, you and we waive the right
          to participate in class actions.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Changes to These Terms</h2>
        <p>
          We may modify these Terms from time to time. We will post updates with
          a revised “Last Updated” date. Continued use after changes constitutes
          acceptance of the updated Terms.
        </p>

        <h2 className="mt-8 text-2xl font-semibold">Contact</h2>
        <p>
          Questions about these Terms? Contact us at
          {" "}
          <a className="underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
        </p>
      </section>
    </main>
  );
}
