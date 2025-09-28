// frontend/app/faq/page.tsx
"use client";

import React, { useRef, useState } from "react";

type FAQ = { q: string; a: string };

const FAQ_LIST: FAQ[] = [
  {
    q: "What is Depense?",
    a: "Depense is a simple expense tracker and bill-splitting tool that helps groups share costs, record payments and settle balances with ease.",
  },
  {
    q: "How do I invite people to a group?",
    a: "Create a group and add members by searching their email (or sharing the group id). Members will appear in the group and can add expenses.",
  },
  {
    q: "What payment options are supported?",
    a: "For the MVP, recording payments is manual. Later we&apos;ll add integrations (Stripe/Razorpay) for in-app payments and in-app settlement.",
  },
  {
    q: "How does simplify debts work?",
    a: "Toggle 'Simplify Debts' to reduce cross-payments. The app finds minimal transfers so fewer transactions are required. This doesn't remove expense records — it only suggests minimal transfers.",
  },
  {
    q: "What are the limits on the free plan?",
    a: "Basic (Free): 10 daily group expenses and 15 personal expenses per day — intended for casual users. Upgrade to Pro or Business for higher limits and exports.",
  },
];

function AccordionItem({ item }: { item: FAQ; idx: number }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const maxHeight =
    open && contentRef.current ? `${contentRef.current.scrollHeight}px` : "0px";

  return (
    <div id="faq" className="scroll-mt-24 bg-[var(--card-bg)] border border-[var(--surface-border)] rounded-lg overflow-hidden">
      <button
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
      >
        <div className="flex-1">
          <div className="text-base font-semibold" style={{ color: "var(--text)" }}>
            {item.q}
          </div>
        </div>

        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-transform duration-200 ${
            open ? "" : ""
          }`}
          aria-hidden
        >
          {open ? "-" : "+"}
        </div>
      </button>

      <div
        className="px-5 overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight }}
        aria-hidden={!open}
      >
        <div ref={contentRef} className="py-3 pb-5 text-sm muted" style={{ color: "var(--muted)" }}>
          {item.a}
        </div>
      </div>
    </div>
  );
}

export default function Faqs() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
          Frequently Asked Questions
        </h1>
        <p className="mt-3 muted max-w-2xl mx-auto" style={{ color: "var(--muted)" }}>
          Answers to common questions about Depense. Click any question to expand the answer.
        </p>
      </header>

      <section className="grid gap-4">
        {FAQ_LIST.map((f, i) => (
          <AccordionItem key={i} item={f} idx={i} />
        ))}
      </section>

      <section className="mt-10 text-sm muted">
        <div className="bg-[var(--card-bg)] border border-[var(--surface-border)] p-4 rounded-lg">
          <strong>Still have questions?</strong>
          <p className="mt-2" style={{ color: "var(--muted)" }}>
            Reach out via the Contact link in the footer or send a message — I’ll add answers to this page.
          </p>
        </div>
      </section>
    </main>
  );
}
