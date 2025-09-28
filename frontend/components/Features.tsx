"use client";
import React from "react";
import Image from "next/image";

import { useTheme } from "@/context/ThemeContext";
import light_graphs from "@/public/svgs/light_graphs.svg";
import dark_graphs from "@/public/svgs/dark_graphs.svg";
import light_bills from "@/public/svgs/light_bills.svg";
import dark_bills from "@/public/svgs/dark_bills.svg";
import light_insights from "@/public/svgs/light_insights.svg";
import dark_insights from "@/public/svgs/dark_insights.svg";
import light_recurring from "@/public/svgs/light_recurring.svg";
import dark_recurring from "@/public/svgs/dark_recurring.svg";

interface Feature {
  title: string;
  desc: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

export default function Features() {
  const { theme, isMounted } = useTheme();

  const features: Feature[] = [
    {
      title: "Visualize Spending",
      desc: "See exactly where every rupee goes with clear, easy-to-read tables.",
      icon: isMounted ? (
        theme === "dark" ? (
          <Image src={dark_graphs} alt="Graphs Icon" />
        ) : (
          <Image src={light_graphs} alt="Graphs Icon" />
        )
      ) : null,
      highlight: false,
    },
    {
      title: "Group Expense Tracking",
      desc: "Create groups, share bills and settle up easily with friends.",
      icon: isMounted ? (
        theme === "dark" ? (
          <Image src={dark_bills} alt="Graphs Icon" />
        ) : (
          <Image src={light_bills} alt="Bill Icon" />
        )
      ) : null,
      highlight: false,
    },
    {
      title: "Smart Insights",
      desc: "Automatic insights to help you save and optimize spending.",
      icon: isMounted ? (
        theme === "dark" ? (
          <Image src={dark_insights} alt="Graphs Icon" />
        ) : (
          <Image src={light_insights} alt="Bill Icon" />
        )
      ) : null,
      highlight: true,
    },
    {
      title: "Recurring Bills",
      desc: "Schedule recurring expenses and auto-add them to groups or personal ledger.",
      icon: isMounted ? (
        theme === "dark" ? (
          <Image src={dark_recurring} alt="Recurring Icon" />
        ) : (
          <Image src={light_recurring} alt="Recurring Icon" />
        )
      ) : null,
      highlight: true,
    },
  ];

  return (
    <section id="features" className="py-12 scroll-mt-24">
      <header className="text-center">
        <h1 className="text-3xl font-bold">Gain control of your money</h1>
        <p className="mt-2 muted max-w-2xl mx-auto">
          Create a group, add expenses, split equally or custom, and settle
          quickly.
        </p>
      </header>
      <div className="max-w-6xl mx-auto px-4">
        <div className="mt-8 grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center card p-3 md:p-5"
            >
              <div className="h-8 text-right self-end">
                {" "}
                {f.highlight && (
                  <div className="text-xs px-2 py-1 rounded bg-[var(--primary-600)]/12 text-[var(--primary-600)]">
                    Coming soon
                  </div>
                )}
              </div>
              <div className="h-[180px] w-[180px] rounded-md flex text-[var(--primary-600)]">
                {f.icon ?? <>✓</>}
              </div>
              <div className="w-full mt-4">
                <div className="flex flex-col items-start">
                  <div className="font-semibold">{f.title}</div>
                  <div className="mt-1 muted text-sm">{f.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
