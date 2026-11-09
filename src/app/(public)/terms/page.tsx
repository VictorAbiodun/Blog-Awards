import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/legal-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      intro="The rules for using Blog Award 2.0, in plain language."
      decisions={["Name and address of the business running the awards", "Governing law and how disputes are handled", "Any withdrawal feature (none is planned)"]}
      sections={[
        { heading: "About Blog Award 2.0", body: <p>Blog Award 2.0 is an awards platform that celebrates upcoming and independent artists. Fans vote for approved nominees using prepaid voting credits.</p> },
        { heading: "Your account", body: <p>You need a free account, with a confirmed email, before you can fund a wallet or vote. Keep your login private. You are responsible for what happens on your account.</p> },
        {
          heading: "Voting credits",
          body: (
            <>
              <p>Voting credits are prepaid credits for voting only. They are not a bank deposit, they earn no interest, and they are not protected like bank deposits.</p>
              <p>Credits cannot be transferred between people and cannot be withdrawn as cash. Credits are added to your wallet only after your payment has been verified.</p>
            </>
          ),
        },
        {
          id: "voting-rules",
          heading: "Voting rules",
          body: (
            <>
              <p>The price of a vote is shown before you confirm, and the cost is taken from your wallet. Votes are final once confirmed.</p>
              <p>You can vote only while voting is open for the season. Every vote is linked to a wallet debit and recorded once. If an administrator ever corrects a vote or a balance, the correction is documented and recorded in an audit log.</p>
            </>
          ),
        },
        { heading: "Artists and nominees", body: <p>Administrators add and review every artist and all of their information. Artists do not have accounts and cannot approve their own nominations.</p> },
        { heading: "Payments", body: <p>Payments are handled by a third-party payment provider. We never see or store your card details.</p> },
        { heading: "Changes", body: <p>We may update these terms. The version that applies to a season is the one published when voting opens.</p> },
      ]}
    />
  );
}
