import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Refund policy" };

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refunds"
      intro="When you can get your money back, and what happens to credits you do not use."
      decisions={["Whether unspent credits are refundable, and for how long", "What happens to unused credits when a season ends", "How long a refund takes", "Any provider fees that are not returned"]}
      sections={[
        { heading: "How refunds work", body: <p>Refunds follow this policy and applicable law. Ask for one through the contact page. An administrator reviews it, and every approved refund is recorded with a reason in an audit log. Only verified payments can be refunded.</p> },
        { heading: "Votes are final", body: <p>Credits that have already been spent on votes cannot be returned, because votes are final once confirmed.</p> },
        { heading: "Unused credits", body: <p>This page states what happens to unused credits when a season ends. It is shown before you fund your wallet, so you always know before you pay.</p> },
        { heading: "Failed and pending payments", body: <p>If a payment fails, no credits are added and you are not charged for credits. A payment that is still pending is shown in your wallet history until the provider confirms it.</p> },
        { heading: "Not a bank deposit", body: <p>Voting credits are prepaid credits for voting only, not a bank deposit.</p> },
      ]}
    />
  );
}
