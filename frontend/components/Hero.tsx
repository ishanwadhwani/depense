"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BsBriefcaseFill, BsFillCreditCardFill } from "react-icons/bs";

import { useAuth } from "@/context/AuthContext";

export default function Hero() {
  const { isLoggedIn } = useAuth();
  const ctaHref = isLoggedIn ? "/expenses" : "/auth/signup";

  return (
    <section className="py-14">
      <div className="w-full mx-auto grid lg:grid-cols-2 gap-8 items-center">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight"
            style={{ color: "var(--text)" }}
          >
            Depense — smart, simple expense sharing
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-lg muted max-w-xl"
          >
            Track personal expenses, split bills with friends, and settle up
            quickly. Clean UX and powerful features — built to help you spend
            less time accounting and more time living.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 flex gap-3"
          >
            <Link href={ctaHref} className="btn-primary">
              {isLoggedIn ? "Go to My Expenses" : "Get started — it's free"}
            </Link>

            <Link
              href="/#features"
              className="px-4 py-2 rounded-lg border border-[var(--surface-border)] hover:bg-[var(--card-bg)] transition"
            >
              Learn More →
            </Link>
          </motion.div>

          <div className="mt-6 flex gap-4 items-center text-sm muted">
            <div className="flex items-center gap-2">
              <div className="h-8 w-9 rounded-full bg-[var(--primary)] text-amber-50 flex items-center justify-center">
                <BsBriefcaseFill />
              </div>
              <div>Used by travellers & small businesses</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-9 rounded-full bg-[var(--primary)] text-amber-50 flex items-center justify-center">
                <BsFillCreditCardFill />
              </div>
              <div className="">
                No credit card required • Free forever for basic
              </div>
            </div>
          </div>
        </div>

        {/* Right: small illustrated cards / live preview */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="card p-4 shadow-lg"
          >
            <div className="text-sm muted">Group</div>
            <div className="mt-2 font-semibold text-lg">Weekend Trip</div>
            <div className="mt-3">
              <div className="flex justify-between text-xs muted">
                <div>Neelesh</div>
                <div className="text-positive font-semibold">+₹1109.80</div>
              </div>
              <div className="flex justify-between text-xs muted mt-1">
                <div>Sankalp</div>
                <div className="text-negative font-semibold">-₹170.00</div>
              </div>
            </div>
            <div className="mt-4 text-sm muted">
              Recent: Groceries • Fuel • Dinner
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 40, y: -20, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="absolute -right-6 -top-6 w-36 card p-3 shadow"
          >
            <div className="text-xs muted">Expenses</div>
            <div className="mt-1 font-semibold">₹3,520</div>
            <div className="text-xs muted">3 recent</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
