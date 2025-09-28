"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiMenu, HiX } from "react-icons/hi";
import { FiSun } from "react-icons/fi";
import { HiOutlineMoon } from "react-icons/hi";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Button from "@/components/ui/Button";

export default function Navbar() {
  const { isLoggedIn, isReady, logout, user } = useAuth();
  const { theme, toggle, isMounted } = useTheme();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);

  // navigation links
  const navAfter = [
    { name: "Groups", href: "/groups" },
    { name: "Expenses", href: "/expenses" },
    { name: "Profile", href: "/profile" },
  ];
  const navBefore = [
    { name: "Home", href: "/" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ];

  // lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur bg-[var(--glass)] shadow-soft border-b border-[var(--surface-border)]">
      <div className="w-full mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-primary">
            depense<span className="text-muted">.app</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-5 items-center">
            {(isLoggedIn ? navAfter : navBefore).map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-[var(--text)] hover:text-[var(--primary-600)] font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              onClick={toggle}
              title={isMounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : ""}
              className="mt-[2px] hover:text-[var(--primary-600)]"
            >
              {isMounted ? (theme === "dark" ? <FiSun size={18} /> : <HiOutlineMoon size={18} />) : null}
            </Button>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex gap-4 items-center">
            {!isReady ? null : !isLoggedIn ? (
              <>
                <Link href="/auth/login" className="text-sm text-[var(--primary-600)]">
                  Log In
                </Link>
                <Link href="/auth/signup" className="text-sm auth-btn">
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <span className="text-sm text-[var(--muted)]">Hi, {user?.name ?? "User"}</span>
                <button onClick={handleLogout} className="text-sm auth-btn">
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-2xl text-[var(--primary-600)] cursor-pointer"
            aria-label="Toggle Menu"
          >
            {menuOpen ? <HiX /> : <HiMenu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 bg-[var(--card-bg)]/30 opacity-80 transition-opacity duration-300"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Side Panel */}
            <aside
              className={`fixed inset-y-0 right-0 z-50 h-screen w-2/3 max-w-xs bg-[var(--card-bg)] shadow-lg transform transition-transform duration-300 ease-in-out
              ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4">
                <div className="font-semibold text-[var(--text)]">Menu</div>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close Menu"
                  className="text-2xl text-[var(--primary-600)] cursor-pointer"
                >
                  <HiX />
                </button>
              </div>
              <div className="w-[90%] mx-auto border-b border-[var(--primary)]/60" />

              {/* Links */}
              <nav className="px-4 py-6 overflow-y-auto h-full scroll-smooth">
                <div className="flex flex-col gap-4">
                  {(isLoggedIn ? navAfter : navBefore).map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="text-[var(--text)] hover:text-[var(--primary-600)] font-medium transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>

                {/* Bottom Section */}
                <div className="fixed bottom-2 w-[90%]">
                  <div className="border-t border-[var(--primary)]/60 pt-4" />

                  <div className="flex items-center justify-between gap-3">
                    {/* Theme + Greeting */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={toggle}
                        title={isMounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : ""}
                        className="hover:text-[var(--primary-600)]"
                      >
                        {isMounted ? (theme === "dark" ? <FiSun size={18} /> : <HiOutlineMoon size={18} />) : null}
                      </Button>
                      <span className="text-sm text-[var(--muted)]">
                        {isLoggedIn ? `Hi, ${user?.name ?? "User"}` : ""}
                      </span>
                    </div>

                    {/* Auth Buttons */}
                    {!isReady ? null : !isLoggedIn ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href="/auth/login"
                          onClick={() => setMenuOpen(false)}
                          className="text-sm text-[var(--primary-600)]"
                        >
                          Log In
                        </Link>
                        <Link
                          href="/auth/signup"
                          onClick={() => setMenuOpen(false)}
                          className="text-sm auth-btn"
                        >
                          Sign Up
                        </Link>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          handleLogout();
                          setMenuOpen(false);
                        }}
                        className="text-sm auth-btn"
                      >
                        Logout
                      </button>
                    )}
                  </div>
                </div>
              </nav>
            </aside>
          </>
        )}
      </div>
    </nav>
  );
}
