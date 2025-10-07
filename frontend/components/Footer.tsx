"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaTwitter,
  FaGithub,
  FaEnvelope,
  FaArrowCircleUp,
} from "react-icons/fa";

export default function Footer() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });

  return (
    <>
      <footer className="w-full bg-[var(--card-bg)] border-t border-[var(--surface-border)]">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Link href="/" className="text-2xl font-bold text-[var(--text)]">
                depense<span className="text-[var(--muted)]">.app</span>
              </Link>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Simple expense splitting for real life. Track personal expenses,
                split group bills and settle up without the friction.
              </p>

              <div className="mt-2 flex items-center gap-3 text-sm">
                <a
                  href="mailto:hello@depense.app"
                  className="flex items-center gap-2 hover:text-[var(--primary-600)]"
                >
                  <FaEnvelope /> workforishanwadhwani@gmail.com
                </a>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://github.com/ishanwadhwani"
                  aria-label="GitHub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--primary-600)]"
                >
                  <FaGithub size={18} />
                </a>

                <a
                  href="https://x.com/Ishan75475294"
                  aria-label="X"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--primary-600)]"
                >
                  <FaTwitter size={18} />
                </a>
              </div>
            </div>

            <div className="flex gap-10 md:gap-20">
              <div>
                <h4 className="font-semibold mb-2 text-[var(--text)]">
                  Product
                </h4>
                <ul className="text-sm" style={{ color: "var(--muted)" }}>
                  <li className="py-1">
                    <Link
                      href="/#pricing"
                      className="hover:text-[var(--primary-600)]"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link
                      href="/#faq"
                      className="hover:text-[var(--primary-600)]"
                    >
                      FAQ
                    </Link>
                  </li>
                  {/* <li className="py-1">
                    <Link
                      href="/groups"
                      className="hover:text-[var(--primary-600)]"
                    >
                      Groups
                    </Link>
                  </li> */}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-[var(--text)]">
                  Company
                </h4>
                <ul className="text-sm" style={{ color: "var(--muted)" }}>
                  <li className="py-1">
                    <Link
                      href="/terms"
                      className="hover:text-[var(--primary-600)]"
                    >
                      Terms
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link
                      href="/privacy"
                      className="hover:text-[var(--primary-600)]"
                    >
                      Privacy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col justify-between">
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                <div>© {new Date().getFullYear()} Depense</div>
                <div className="mt-2">Made with care • v0.1</div>
              </div>
              <div
                className="mt-4 md:mt-0 text-sm"
                style={{ color: "var(--muted)" }}
              >
                <div>
                  Need help?{" "}
                  <a
                    href="mailto:hello@depense.app"
                    className="hover:text-[var(--primary-600)]"
                  >
                    Contact us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-[var(--surface-border)] bg-[var(--card-bg)]/80">
          <div
            className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between text-xs"
            style={{ color: "var(--muted)" }}
          >
            <div>Built for small groups & friends.</div>
            <div>Privacy • Terms</div>
          </div>
        </div>
      </footer>

      <button
        aria-label="Back to top"
        onClick={scrollToTop}
        className={`fixed right-5 bottom-8 z-[9999] flex items-center justify-center w-11 h-11 rounded-full shadow-lg transition-transform duration-200 ${
          showTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-6 pointer-events-none"
        } bg-[var(--primary-600)] text-white`}
      >
        <FaArrowCircleUp size={60} />
      </button>
    </>
  );
}
