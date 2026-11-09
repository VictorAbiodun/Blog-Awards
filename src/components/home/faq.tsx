export const faqs = [
  {
    question: "Who can be nominated?",
    answer: "Upcoming and independent artists. Every artist is added and reviewed by an administrator before they appear publicly.",
  },
  {
    question: "How much does a vote cost?",
    answer: "Pricing is set per season and shown before you confirm. The sample price on this site is \u20a650 per vote.",
  },
  {
    question: "What happens to unused credits?",
    answer: "The policy for unused credits at the end of a season is stated before you fund your wallet. See the refund policy.",
  },
  {
    question: "Can I get a refund?",
    answer: "Refunds follow the published refund policy and applicable law. The refund page is linked in the footer.",
  },
  {
    question: "Are credits real money?",
    answer: "No. Credits are prepaid voting credits, not a bank deposit. They cannot be transferred or withdrawn as cash.",
  },
];

/** Big questions on the left, short answers on the right, all open. */
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-4 px-5 py-20 md:px-6 md:py-40">
      <h2 id="faq-title" className="mb-12 text-[26px] font-medium text-muted md:mb-20 md:text-[40px] md:leading-[1.1]">
        Questions
      </h2>
      <dl className="flex flex-col gap-12 md:gap-20">
        {faqs.map((item) => (
          <div key={item.question} className="flex flex-col gap-3 md:grid md:grid-cols-12 md:gap-x-6">
            <dt className="text-[28px] font-medium leading-[1.1] tracking-[-0.01em] md:col-span-6 md:text-[clamp(28px,2.8vw,40px)]">{item.question}</dt>
            <dd className="text-lg leading-[1.5] md:col-span-4 md:col-start-8 md:pt-2.5 md:text-xl">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
