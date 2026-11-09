import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="What we collect, why we collect it, and what we do not collect."
      decisions={["How long each kind of data is kept", "The contact for privacy requests", "Any analytics you decide to add", "Requirements under the Nigeria Data Protection Act that apply to you"]}
      sections={[
        {
          heading: "What we collect",
          body: <p>A display name, your email address, whether your account is active, and your wallet, payment and voting records. We ask for nothing else, because nothing else is needed to vote.</p>,
        },
        { heading: "What we do not collect", body: <p>We do not store your password in readable form, and we never see or store your card details. The payment provider handles those.</p> },
        { heading: "Why", body: <p>To run your account, keep your wallet balance correct, record your votes, prevent abuse, and answer your questions.</p> },
        { heading: "Who can see it", body: <p>Only the small team that administers the awards, and only for these purposes. Administrator actions on money and votes are recorded in an audit log.</p> },
        { heading: "Your choices", body: <p>You can change your display name and password in your account settings, and delete your account there. To ask a question about your data, contact us.</p> },
      ]}
    />
  );
}
