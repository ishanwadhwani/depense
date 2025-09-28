"use client";
import React from "react";
import { motion } from "framer-motion";

const plans = [
  {
    key: "basic",
    title: "Basic (Free)",
    price: "₹0",
    features: [
      "10 daily group expenses",
      "15 personal expenses per day",
      "Unlimited groups & members",
      "Essential settle & split features",
      "Community support",
    ],
    highlight: false,
    monthly: true,
    ctaLabel: "Choose plan",
  },
  {
    key: "pro",
    title: "Pro",
    price: "₹199",
    features: [
      "500 monthly group expenses",
      "Unlimited personal expenses",
      "Priority support",
      "Advanced reports & export",
      "Simplify debts with intelligent suggestions",
    ],
    highlight: true,
    monthly: true,
    ctaLabel: "Choose plan",
  },
  {
    key: "business",
    title: "Business",
    price: "₹699",
    features: [
      "Custom usage limits",
      "Team admin & roles",
      "CSV exports & integrations",
      "Priority SLA & onboarding",
      "Dedicated workspace",
    ],
    highlight: false,
    monthly: true,
    ctaLabel: "Choose plan",
  },
];

export default function Pricing() {
  return (
    <main id="pricing" className="max-w-6xl mx-auto px-4 py-12 scroll-mt-24">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Pricing that grows with you</h1>
        <p className="mt-2 muted max-w-2xl mx-auto">
          Start free and upgrade when you need more capacity and advanced
          features.
        </p>
      </header>

      <section className="mt-10 grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`card p-6 rounded-xl shadow-md border flex flex-col ${
              p.highlight ? "ring-2 ring-[var(--primary-600)]" : ""
            }`}
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                {p.highlight && (
                  <div className="text-xs px-2 py-1 rounded bg-[var(--primary-600)]/12 text-[var(--primary-600)]">
                    Popular
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div
                  className="text-3xl font-extrabold"
                  style={{ color: "var(--text)" }}
                >
                  {p.price}
                </div>
                <div className="mt-1 muted text-sm">
                  {p.monthly ? "per month" : null}
                </div>
              </div>

              <ul className="mt-4 space-y-3 text-sm">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="text-[var(--primary-600)]">●</div>
                    <div className="muted">{f}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <button
                className={`w-full p-2 rounded-md font-semibold cursor-pointer border border-[var(--surface-border)] hover:bg-[var(--primary-600)] hover:text-white`}
              >
                {p.ctaLabel}
              </button>
            </div>
          </motion.div>
        ))}
      </section>

      {/* <section className="mt-10 text-sm muted">
        <div className="card p-4">
          <strong>Notes:</strong> “Daily” limits for Basic are enforced in the
          backend for the MVP. We can change to monthly on request. All prices
          are illustrative — add checkout integration later (Stripe / Razorpay).
        </div>
      </section> */}
    </main>
  );
}
