"use client";
import React from "react";

import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing"
import Faqs from "@/components/Faqs"
import HomeCTA from "@/components/HomeCTA";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Hero />
        <Features />
        <Pricing />
        <Faqs />
        <HomeCTA />
      </div>
    </main>
  );
}
